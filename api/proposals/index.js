/**
 * API Router for Proposal Simulator (/api/attendance/proposals/*)
 * Consolidated serverless endpoint to maintain Hobby plan serverless function limits.
 */

const crypto = require('crypto');
const { getActiveProposalOptions, checkDuplicateHash, createImportRecord, activateImport, getProposalSettings, updateProposalSettings, inMemoryStore } = require('../../lib/server/proposals/store');
const { rankProposals } = require('../../lib/server/proposals/ranking');
const { parseProposalPdfText } = require('../../lib/server/proposals/pdf-parser');
const { syncGoogleDriveFolder } = require('../../lib/server/proposals/drive-sync');

module.exports = async (req, res) => {
  // Set CORS and Content-Type headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // 1. Simulate / Search proposals endpoint
    if (pathname.includes('/simulate') || pathname.includes('/search')) {
      const body = req.body || {};
      const allOptions = await getActiveProposalOptions();
      const results = rankProposals(allOptions, body);

      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        valid_proposals: results.validProposals,
        near_matches: results.nearMatches,
        total_evaluated: results.totalEvaluated,
        valid_count: results.validCount,
      }));
    }

    // 2. List active tables endpoint
    if (pathname.includes('/tables') && !pathname.includes('/imports')) {
      const allOptions = await getActiveProposalOptions();
      const uniqueTables = {};
      allOptions.forEach(opt => {
        if (!uniqueTables[opt.table_number]) {
          uniqueTables[opt.table_number] = {
            table_number: opt.table_number,
            product_name: opt.product_name,
            administrator_name: opt.administrator_name,
            total_term_months: opt.total_term_months,
            valid_until: opt.valid_until,
            status: opt.status,
          };
        }
      });
      res.writeHead(200);
      return res.end(JSON.stringify({
        tables: Object.values(uniqueTables),
      }));
    }

    // 3. Import audit history
    if (pathname.includes('/imports/history') || pathname.includes('/imports/audit')) {
      res.writeHead(200);
      return res.end(JSON.stringify({
        imports: inMemoryStore.imports.slice(0, 50),
      }));
    }

    // 4. Upload & process PDF manual import endpoint
    if (pathname.includes('/imports/upload')) {
      const body = req.body || {};
      const fileName = body.file_name || 'tabela_comercial.pdf';
      const pdfBase64 = body.pdf_base64 || '';

      if (!pdfBase64) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Nenhum arquivo PDF foi enviado.' }));
      }

      // Decode base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Calculate SHA-256 hash from the actual PDF binary
      const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      // Check SHA-256 duplicate
      const duplicate = await checkDuplicateHash(hash);
      if (duplicate) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          error: 'Arquivo duplicado detectado! Uma tabela com a mesma assinatura SHA-256 já foi importada anteriormente.',
          duplicate_version: duplicate.version,
        }));
      }

      // Extract text from PDF binary
      // Use internal path to avoid pdf-parse test file loading bug on Vercel
      let rawText = '';
      let pageCount = 1;
      try {
        const pdfParse = require('pdf-parse/lib/pdf-parse.js');
        const pdfData = await pdfParse(pdfBuffer);
        rawText = pdfData.text || '';
        pageCount = pdfData.numpages || 1;
      } catch (pdfErr) {
        console.error('PDF parse error:', pdfErr);
        res.writeHead(400);
        return res.end(JSON.stringify({
          error: 'Não foi possível ler o PDF. Verifique se o arquivo não está corrompido ou protegido por senha.',
          details: pdfErr.message,
        }));
      }

      // Parse extracted text
      const parsed = parseProposalPdfText(rawText, fileName);
      parsed.extractedText = rawText;

      // Create pending import record
      const importRecord = await createImportRecord({
        source_type: 'UPLOAD',
        source_file_name: fileName,
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
      });

      res.writeHead(200);
      return res.end(JSON.stringify({
        success: parsed.success,
        import_id: importRecord.id,
        preview: parsed,
      }));
    }

    // 5. Activate version endpoint
    if (pathname.includes('/activate')) {
      const importIdMatch = pathname.match(/imports\/([^/]+)\/activate/);
      const importId = importIdMatch ? importIdMatch[1] : (req.body?.import_id || '');
      const result = await activateImport(importId, req.body?.activated_by || 'Administrador');

      res.writeHead(200);
      return res.end(JSON.stringify(result));
    }

    // 6. Settings
    if (pathname.includes('/settings')) {
      if (req.method === 'GET') {
        res.writeHead(200);
        return res.end(JSON.stringify(getProposalSettings()));
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        const updated = updateProposalSettings(req.body || {});
        res.writeHead(200);
        return res.end(JSON.stringify(updated));
      }
    }

    // 7. Google Drive Sync
    if (pathname.includes('/drive/sync')) {
      const settings = getProposalSettings();
      const result = await syncGoogleDriveFolder(settings.drive_folder_id);
      res.writeHead(200);
      return res.end(JSON.stringify(result));
    }

    // Default: not found
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint não encontrado.' }));

  } catch (err) {
    console.error('Proposal API unhandled error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    return res.end(JSON.stringify({
      error: 'Erro interno do servidor.',
      details: err.message
    }));
  }
};
