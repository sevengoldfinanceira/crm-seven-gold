const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../lib/server/crm-authorization');
const { getOpenProduction, NO_OPEN_PRODUCTION, productionFields, isProductionSchemaError, stripProductionFields } = require('../../lib/server/commercial-productions');
const { normalizeLeadClientInfo } = require('../../lib/server/lead-client-info');
const { ensureLeadIsNotDuplicateForSeller, mapDuplicateDbError } = require('../../lib/server/lead-duplicates');

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status, { ok: false, error: auth.error });

  const open = await getOpenProduction();
  const legacyMode = open.error && /commercial_productions|schema cache/i.test(open.error);
  if (open.error && !legacyMode) return send(res, 500, { ok: false, error: open.error });
  if (!open.production && !legacyMode) return send(res, 409, { ok: false, error: NO_OPEN_PRODUCTION });

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const telefone = String(body.telefone || body.phone || '').replace(/\D/g, '');
  if (!name || telefone.length < 10) return send(res, 400, { ok: false, error: 'Nome e telefone válido são obrigatórios.' });

  const ownerName = auth.user.nome || auth.user.email;
  try {
    await ensureLeadIsNotDuplicateForSeller({
      supabase,
      phone: telefone,
      assignedToEmail: auth.user.email,
    });
  } catch (error) {
    return send(res, error.status || 500, { ok: false, error: error.message });
  }

  const payload = {
    name, telefone, status: 'lead_recebido',
    origin: String(body.origin || '').trim() || null,
    note: String(body.note || '').trim(),
    tags: Array.isArray(body.tags) ? body.tags : [],
    owner_id: auth.user.auth_user_id,
    assigned_to_email: auth.user.email,
    assigned_to_name: ownerName,
    created_by_email: auth.user.email,
    created_by_name: ownerName,
    ...normalizeLeadClientInfo(body),
    ...(open.production ? productionFields(open.production) : {}),
  };

  let { data, error } = await supabase.from('leads').insert(payload).select('*').single();
  if (error && open.production && isProductionSchemaError(error)) {
    const retry = await supabase.from('leads').insert(stripProductionFields(payload)).select('*').single();
    data = retry.data;
    error = retry.error;
  }
  if (error) return send(res, 409, { ok: false, error: mapDuplicateDbError(error) || error.message });
  return send(res, 200, { ok: true, lead: data });
};
