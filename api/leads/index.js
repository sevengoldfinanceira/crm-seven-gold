const assignees = require('../../lib/server/leads/assignees');
const byPhone = require('../../lib/server/leads/by-phone');
const create = require('../../lib/server/leads/create');
const deleteLead = require('../../lib/server/leads/delete');
const fromWhatsapp = require('../../lib/server/leads/from-whatsapp-extension');
const updateStage = require('../../lib/server/leads/update-stage');

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.includes('/assignees')) {
    return assignees(req, res);
  } else if (pathname.includes('/by-phone')) {
    return byPhone(req, res);
  } else if (pathname.includes('/create')) {
    return create(req, res);
  } else if (pathname.includes('/delete')) {
    return deleteLead(req, res);
  } else if (pathname.includes('/from-whatsapp-extension')) {
    return fromWhatsapp(req, res);
  } else if (pathname.includes('/update-stage')) {
    return updateStage(req, res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify({ ok: false, error: 'Endpoint não encontrado no módulo de leads.' }));
};
