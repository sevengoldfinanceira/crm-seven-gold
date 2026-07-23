const companySettings = require('../../lib/server/finance/company-settings');
const generateBordero = require('../../lib/server/finance/generate');
const listBorderos = require('../../lib/server/finance/list');
const updateStatus = require('../../lib/server/finance/update-status');
const adjustBordero = require('../../lib/server/finance/adjust');
const signBordero = require('../../lib/server/finance/sign');

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.includes('/company-settings')) {
    return companySettings(req, res);
  } else if (pathname.includes('/borderos/generate')) {
    return generateBordero(req, res);
  } else if (pathname.includes('/borderos/list')) {
    return listBorderos(req, res);
  } else if (pathname.includes('/borderos/update-status')) {
    return updateStatus(req, res);
  } else if (pathname.includes('/borderos/adjust')) {
    return adjustBordero(req, res);
  } else if (pathname.includes('/borderos/sign')) {
    return signBordero(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ error: 'Endpoint nao encontrado no modulo financeiro.' }));
};
