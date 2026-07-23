/**
 * API Router for Proposal Simulator (/api/attendance/proposals/*)
 * Consolidated serverless endpoint to maintain Hobby plan serverless function limits.
 */

const crypto = require('crypto');
const pdfParse = require('pdf-parse');
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
    res.writeHead(200);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // 1. Simulation query endpoint
    if (pathname.includes('/simulate') || pathname.endsWith('/proposals')) {
      const params = req.method === 'POST' ? (req.body || {}) : Object.fromEntries(url.searchParams);
      const allOptions = await getActiveProposalOptions();
      const rankingResults = rankProposals(allOptions, params);

      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        summary: {
          total_evaluated: rankingResults.totalEvaluated,
          valid_count: rankingResults.validCount,
          near_matches_count: rankingResults.nearMatches.length,
          priority_used: params.ranking_priority || 'EQUILIBRIO',
        },
        valid_proposals: rankingResults.validProposals,
        near_matches: rankingResults.nearMatches,
      }));
    }

    // 2. Active commercial tables list endpoint
    if (pathname.includes('/tables')) {
      const options = await getActiveProposalOptions();
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        count: options.length,
        tables: options,
      }));
    }

    // 3. Imports history & audit logs endpoint
    if (pathname.includes('/imports') && req.method === 'GET') {
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        imports: inMemoryStore.imports,
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

      // Extract text from PDF binary using pdf-parse
      let rawText = '';
      let pageCount = 1;
      try {
        const pdfData = await pdfParse(pdfBuffer);
        rawText = pdfData.text || '';
        pageCount = pdfData.numpages || 1;
      } catch (pdfErr) {
        res.writeHead(400);
        return res.end(JSON.stringify({
          error: 'Não foi possível ler o PDF. Verifique se o arquivo não está corrompido ou protegido por senha.',
          details: pdfErr.message,
        }));
      }

      // Parse extracted text
      const parsed = parseProposalPdfText(rawText, fileName);
      parsed.extractedText = rawText; // Send back for debug visibility

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
      const importId = pathname.split('/').slice(-2)[0] || req.body.import_id;
      const result = await activateImport(importId);
      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        message: 'Versão de tabela comercial ativada com sucesso.',
        result,
      }));
    }

    // 6. Google Drive sync endpoint
    if (pathname.includes('/drive/sync')) {
      const syncResult = await syncGoogleDriveFolder();
      res.writeHead(200);
      return res.end(JSON.stringify(syncResult));
    }

    // 7. Settings endpoints
    if (pathname.includes('/settings')) {
      if (req.method === 'PUT' || req.method === 'POST') {
        const updated = updateProposalSettings(req.body || {});
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, settings: updated }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, settings: getProposalSettings() }));
    }

    // Fallback 404
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Endpoint não encontrado no módulo de propostas.' }));

  } catch (err) {
    console.error("Erro na API de propostas:", err);
    res.writeHead(500);
    return res.end(JSON.stringify({ error: `Erro interno: ${err.message}` }));
  }
};
