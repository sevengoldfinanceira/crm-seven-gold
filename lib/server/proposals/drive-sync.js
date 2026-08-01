/**
 * Google Drive Synchronization Helper
 * Securely downloads PDF commercial tables from Google Drive links and parses them automatically.
 */

const { getProposalSettings, updateProposalSettings, createImportRecord, activateImport } = require('./store');
const { parseProposalPdfText } = require('./pdf-parser');
const crypto = require('crypto');

/**
 * Extracts Google Drive file ID from various link formats or raw ID string.
 */
function extractGoogleDriveFileId(str) {
  if (!str) return null;
  const cleaned = String(str).trim();
  const matchD = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD) return matchD[1];
  const matchId = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId) return matchId[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(cleaned)) return cleaned;
  return null;
}

/**
 * Downloads binary buffer from Google Drive file ID
 */
async function downloadGoogleDriveBuffer(fileId) {
  const primaryUrl = `https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`;
  let resp = await fetch(primaryUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  });

  if (!resp.ok) {
    throw new Error(`Google Drive respondeu com HTTP ${resp.status}`);
  }

  let arrayBuffer = await resp.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  // Handle virus scan warning page or confirm token page if returned as HTML
  const textPreview = buffer.toString('utf-8', 0, 800);
  if (textPreview.includes('Virus scan warning') || textPreview.includes('confirm=')) {
    const matchConfirm = textPreview.match(/confirm=([a-zA-Z0-9_-]+)/);
    const confirmToken = matchConfirm ? matchConfirm[1] : 't';
    const confirmUrl = `https://docs.google.com/uc?export=download&id=${fileId}&confirm=${confirmToken}`;
    resp = await fetch(confirmUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });
    buffer = Buffer.from(await resp.arrayBuffer());
  }

  return buffer;
}

/**
 * Syncs online PDF table from Google Drive link
 */
async function syncGoogleDriveUrl(driveUrlInput, options = {}) {
  const settings = getProposalSettings();
  const targetUrl = driveUrlInput || settings.drive_file_url || '';
  const fileId = extractGoogleDriveFileId(targetUrl);

  if (!fileId) {
    return {
      success: false,
      message: 'Nenhum link ou ID válido do Google Drive foi fornecido.',
    };
  }

  // Save/update settings
  updateProposalSettings({
    drive_file_url: targetUrl,
    drive_file_id: fileId,
    last_sync_at: new Date().toISOString(),
  });

  try {
    const pdfBuffer = await downloadGoogleDriveBuffer(fileId);

    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Parse PDF text
    let rawText = '';
    let pageCount = 1;
    try {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const pdfData = await pdfParse(pdfBuffer);
      rawText = pdfData.text || '';
      pageCount = pdfData.numpages || 1;
    } catch (pdfErr) {
      console.error('[Drive Sync] Erro ao ler PDF:', pdfErr);
      return {
        success: false,
        message: 'O arquivo baixado do Google Drive não pôde ser lido como PDF. Verifique as permissões de compartilhamento no Google Drive (deve estar como "Qualquer pessoa com o link").',
      };
    }

    const fileName = `Tabela_GoogleDrive_${fileId.slice(0, 6)}.pdf`;
    const parsed = parseProposalPdfText(rawText, fileName);
    parsed.extractedText = rawText;

    const importRecord = await createImportRecord({
      source_type: 'GOOGLE_DRIVE',
      source_file_name: fileName,
      source_drive_file_id: fileId,
      source_drive_url: targetUrl,
      file_hash: hash,
      file_size: pdfBuffer.length,
      page_count: pageCount,
      status: parsed.errors.length > 0 ? 'FAILED' : 'PENDING_REVIEW',
      valid_tables_count: parsed.tablesCount,
      proposal_rows_count: parsed.proposalRowsCount,
      warning_count: parsed.warnings.length,
      error_count: parsed.errors.length,
      error_details: parsed.errors,
      raw_metadata: parsed,
      uploaded_by: 'Google Drive Sync',
    });

    // Auto activate sync
    await activateImport(importRecord.id, 'Google Drive Sync');

    return {
      success: true,
      updated: true,
      import_id: importRecord.id,
      file_id: fileId,
      drive_url: targetUrl,
      message: `Tabela do Google Drive sincronizada e ativada com sucesso! (${parsed.tablesCount} planos, ${parsed.proposalRowsCount} propostas)`,
      preview: parsed,
    };

  } catch (err) {
    console.error('[Drive Sync Error]:', err);
    return {
      success: false,
      message: `Erro ao baixar tabela do Google Drive: ${err.message}. Certifique-se de que o arquivo está compartilhado como "Qualquer pessoa com o link".`,
    };
  }
}

/**
 * Legacy folder sync wrapper
 */
async function syncGoogleDriveFolder(userEmail = 'admin@sevengold.com.br') {
  return syncGoogleDriveUrl();
}

module.exports = {
  extractGoogleDriveFileId,
  syncGoogleDriveUrl,
  syncGoogleDriveFolder,
};
