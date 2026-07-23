const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser, canAccessLead } = require('../../lib/server/crm-authorization');
const { assertLeadMutable } = require('../../lib/server/commercial-productions');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  if (!['POST', 'DELETE'].includes(req.method)) return send(res, 405, { ok: false, error: 'Method not allowed' });
  const auth = await getAuthorizedCrmUser(req); if (auth.error) return send(res, auth.status, { ok: false, error: auth.error });
  try {
    const requested = Array.isArray(req.body?.ids) ? req.body.ids : [req.query?.id || req.body?.id];
    const ids = requested.map(String).map(v => v.trim()).filter(Boolean);
    if (!ids.length) return send(res, 400, { ok: false, error: 'Informe ao menos um lead.' });
    const { data: leads, error: findError } = await supabase.from('leads').select('id,assigned_to_email').in('id', ids);
    if (findError) return send(res, 500, { ok: false, error: findError.message });
    if ((leads || []).length !== ids.length) return send(res, 404, { ok: false, error: 'Um ou mais leads não foram encontrados.' });
    for (const lead of leads) {
      if (!canAccessLead(auth.user, lead)) return send(res, 403, { ok: false, error: 'Você não pode excluir leads de outro responsável.' });
      const mutable = await assertLeadMutable(lead.id);
      if (mutable.error) return send(res, mutable.status || 500, { ok: false, error: mutable.error });
    }
    const deleteHistory = req.body?.delete_history === true;
    if (deleteHistory) {
      const userRole = auth.user?.cargo ? String(auth.user.cargo).toLowerCase().trim() : "";
      const isCeo = ["diretor-ceo", "dono"].includes(userRole);
      if (!isCeo) {
        return send(res, 403, { ok: false, error: 'Apenas o CEO ou dono pode remover o histórico completo.' });
      }
      await supabase.from('appointments').delete().in('lead_id', ids);
      await supabase.from('messages').delete().in('lead_id', ids);
      await supabase.from('sales').delete().in('lead_id', ids);
      await supabase.from('tasks').delete().in('lead_id', ids);
      await supabase.from('lead_history').delete().in('lead_id', ids);
    }
    const { data, error } = await supabase.from('leads').delete().in('id', ids).select('id');
    if (error) return send(res, 409, { ok: false, error: error.message });
    return send(res, 200, { ok: true, count: data?.length || 0 });
  } catch (error) { return send(res, 500, { ok: false, error: error.message }); }
};
