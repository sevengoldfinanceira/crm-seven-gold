/**
 * Google Drive Synchronization Helper
 * Securely downloads PDF commercial tables from Google Drive file or folder links and parses them automatically.
 */

const { getProposalSettings, updateProposalSettings, createImportRecord, activateImport } = require('./store');
const { parseProposalPdfText } = require('./pdf-parser');
const crypto = require('crypto');

/**
 * Extracts target info (type: 'FILE' | 'FOLDER') from link or raw ID
 */
function extractGoogleDriveTarget(str) {
  if (!str) return null;
  const cleaned = String(str).trim();

  // Folder link
  const folderMatch = cleaned.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) {
    return { type: 'FOLDER', id: folderMatch[1] };
  }

  // Direct file links
  const fileDMatch = cleaned.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) {
    return { type: 'FILE', id: fileDMatch[1] };
  }

  const dMatch = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) {
    return { type: 'FILE', id: dMatch[1] };
  }

  const idMatch = cleaned.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return { type: 'FILE', id: idMatch[1] };
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(cleaned)) {
    return { type: 'FILE', id: cleaned };
  }

  return null;
}

/**
 * Legacy wrapper function
 */
function extractGoogleDriveFileId(str) {
  const target = extractGoogleDriveTarget(str);
  return target ? target.id : null;
}

/**
 * Downloads binary buffer for a single Google Drive file ID
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
 * Retrieves file IDs contained inside a public Google Drive folder
 */
async function getFileIdsFromFolder(folderId) {
  const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
  const resp = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!resp.ok) {
    throw new Error(`Não foi possível acessar a pasta do Google Drive (HTTP ${resp.status}). Verifique o compartilhamento.`);
  }

  const text = await resp.text();
  const fileDMatches = [...text.matchAll(/\/file\/d\/([a-zA-Z0-9_-]{20,})/g)].map(m => m[1]);
  const uniqueIds = [...new Set(fileDMatches)];

  if (uniqueIds.length === 0) {
    throw new Error('Nenhum arquivo PDF foi encontrado dentro da pasta fornecida. Certifique-se de que a pasta não está vazia e tem permissão pública.');
  }

  return uniqueIds;
}

/**
 * Syncs online PDF tables from Google Drive file or folder link
 */
async function syncGoogleDriveUrl(driveUrlInput, options = {}) {
  const settings = getProposalSettings();
  const targetUrl = driveUrlInput || settings.drive_file_url || '';
  const target = extractGoogleDriveTarget(targetUrl);
  const filterCategory = options.filter_category || settings.drive_filter_category || 'imoveis';

  if (!target) {
    return {
      success: false,
      message: 'Nenhum link ou ID válido do Google Drive foi fornecido. Cole o link de um arquivo PDF ou de uma pasta do Google Drive.',
    };
  }

  // Save/update settings
  updateProposalSettings({
    drive_file_url: targetUrl,
    drive_target_type: target.type,
    drive_file_id: target.id,
    drive_filter_category: filterCategory,
    last_sync_at: new Date().toISOString(),
  });

  try {
    let fileIdsToProcess = [];

    if (target.type === 'FOLDER') {
      fileIdsToProcess = await getFileIdsFromFolder(target.id);
    } else {
      fileIdsToProcess = [target.id];
    }

    let combinedTables = [];
    let combinedWarnings = [];
    let combinedErrors = [];
    let totalProposalRows = 0;
    let processedFilesCount = 0;
    let combinedRawText = '';
    let totalBytes = 0;

    for (const fileId of fileIdsToProcess) {
      try {
        const pdfBuffer = await downloadGoogleDriveBuffer(fileId);

        // Parse PDF text
        let rawText = '';
        try {
          const pdfParse = require('pdf-parse/lib/pdf-parse.js');
          const pdfData = await pdfParse(pdfBuffer);
          rawText = pdfData.text || '';
        } catch (pdfErr) {
          console.warn(`[Drive Sync] Não foi possível ler PDF ${fileId}:`, pdfErr.message);
          continue;
        }

        // If target is a folder and filter is set to imoveis (default), filter for Imóveis PDF
        if (target.type === 'FOLDER' && filterCategory === 'imoveis') {
          const isImoveisPdf = /\bIMO\b|\bIMOVEIS\b|\bIMÓVEIS\b|\bIMOBILI/i.test(rawText);
          if (!isImoveisPdf) {
            console.log(`[Drive Sync] Ignorando PDF ${fileId} pois não pertence à categoria Imóveis.`);
            continue;
          }
        }

        totalBytes += pdfBuffer.length;
        const fileName = `Tabela_Drive_${fileId.slice(0, 6)}.pdf`;
        const parsed = parseProposalPdfText(rawText, fileName);

        if (parsed.success && parsed.tables && parsed.tables.length > 0) {
          combinedTables.push(...parsed.tables);
          combinedWarnings.push(...parsed.warnings);
          totalProposalRows += parsed.proposalRowsCount;
          combinedRawText += `\n--- FILE ${fileId} ---\n` + rawText;
          processedFilesCount++;
        } else if (parsed.errors.length > 0) {
          combinedErrors.push(...parsed.errors);
        }
      } catch (fileErr) {
        console.warn(`[Drive Sync] Erro no arquivo ${fileId}:`, fileErr.message);
      }
    }

    if (processedFilesCount === 0 || combinedTables.length === 0) {
      return {
        success: false,
        message: 'Nenhuma tabela da categoria Selecionada (Imóveis Autocon) foi encontrada no Google Drive. Verifique se o arquivo está na pasta.',
      };
    }

    const hash = crypto.createHash('sha256').update(combinedRawText).digest('hex');

    const combinedMetadata = {
      success: true,
      tablesCount: combinedTables.length,
      proposalRowsCount: totalProposalRows,
      tables: combinedTables,
      warnings: combinedWarnings,
      errors: combinedErrors,
      extractedText: combinedRawText,
    };

    const sourceName = filterCategory === 'imoveis'
      ? 'Tabela Imóveis Autocon (Google Drive)'
      : target.type === 'FOLDER'
        ? `Pasta Google Drive (${processedFilesCount} PDF${processedFilesCount > 1 ? 's' : ''})`
        : `Tabela Google Drive (${target.id.slice(0, 6)})`;

    const importRecord = await createImportRecord({
      source_type: 'GOOGLE_DRIVE',
      source_file_name: sourceName,
      source_drive_file_id: target.id,
      source_drive_url: targetUrl,
      file_hash: hash,
      file_size: totalBytes,
      page_count: processedFilesCount,
      status: combinedErrors.length > 0 ? 'FAILED' : 'PENDING_REVIEW',
      valid_tables_count: combinedTables.length,
      proposal_rows_count: totalProposalRows,
      warning_count: combinedWarnings.length,
      error_count: combinedErrors.length,
      error_details: combinedErrors,
      raw_metadata: combinedMetadata,
      uploaded_by: 'Google Drive Sync',
    });

    // Auto activate sync
    await activateImport(importRecord.id, 'Google Drive Sync');

    return {
      success: true,
      updated: true,
      import_id: importRecord.id,
      file_id: target.id,
      drive_url: targetUrl,
      message: `Tabela de Imóveis Autocon sincronizada com sucesso! ${combinedTables.length} planos e ${totalProposalRows} propostas foram importados.`,
      preview: combinedMetadata,
    };

  } catch (err) {
    console.error('[Drive Sync Error]:', err);
    return {
      success: false,
      message: `Erro ao sincronizar com Google Drive: ${err.message}`,
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
  extractGoogleDriveTarget,
  extractGoogleDriveFileId,
  syncGoogleDriveUrl,
  syncGoogleDriveFolder,
};
