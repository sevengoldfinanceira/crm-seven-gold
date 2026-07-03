const { supabase } = require('../../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../../lib/server/crm-authorization');
const { assertLeadMutable } = require('../../../lib/server/commercial-productions');

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (!['GET', 'PATCH'].includes(req.method)) {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return sendJson(res, authorization.status, { ok: false, error: authorization.error });
    }
    if (!authorization.user.canAccessAllLeads) {
      return sendJson(res, 403, { ok: false, error: 'Somente gestores podem alterar o responsável.' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('crm_users')
        .select('id,nome,email,cargo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) return sendJson(res, 500, { ok: false, error: error.message });
      return sendJson(res, 200, { ok: true, users: data || [] });
    }

    const leadId = String(req.body?.lead_id || '').trim();
    const assigneeEmail = String(req.body?.assigned_to_email || '').trim().toLowerCase();
    if (!leadId || !assigneeEmail) {
      return sendJson(res, 400, { ok: false, error: 'Lead e responsável são obrigatórios.' });
    }
    const mutable = await assertLeadMutable(leadId);
    if (mutable.error) return sendJson(res, mutable.status || 500, { ok: false, error: mutable.error });

    const { data: assignee, error: assigneeError } = await supabase
      .from('crm_users')
      .select('id,nome,email,cargo')
      .ilike('email', assigneeEmail)
      .eq('ativo', true)
      .maybeSingle();

    if (assigneeError || !assignee) {
      return sendJson(res, 400, { ok: false, error: 'Responsável inválido ou inativo.' });
    }

    const updateData = {
      assigned_to_email: assignee.email,
      assigned_to_name: assignee.nome || assignee.email,
      updated_by_email: authorization.user.email,
      updated_by_name: authorization.user.nome || authorization.user.email,
      updated_at: new Date().toISOString(),
    };

    const { data: lead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select('id,assigned_to_email,assigned_to_name')
      .maybeSingle();

    if (updateError) return sendJson(res, 500, { ok: false, error: updateError.message });
    if (!lead) return sendJson(res, 404, { ok: false, error: 'Lead não encontrado.' });
    return sendJson(res, 200, { ok: true, lead });
  } catch (error) {
    console.error('[leads/assignees] internal error:', error);
    return sendJson(res, 500, { ok: false, error: 'Erro interno ao atualizar responsável.' });
  }
};