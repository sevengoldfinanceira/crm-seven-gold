const { supabase } = require('../_shared/supabase');
const {
  getAuthorizedCrmUser,
  normalizeRole,
  normalizeEmail,
  TEAM_COORDINATOR_ROLES,
} = require('../_shared/crm-authorization');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return sendJson(res, authorization.status, { ok: false, error: authorization.error });
    }

    const crmUser = authorization.user;
    const role = normalizeRole(crmUser.cargo);
    let query = supabase
      .from('leads')
      .select('id,name,origin,note,status,created_at,telefone,property_region,credit_value,down_payment_value,installment_value,tags,assigned_to_email,assigned_to_name,created_by_email,created_by_name,updated_by_email,updated_by_name')
      .order('created_at', { ascending: false });

    if (TEAM_COORDINATOR_ROLES.has(role)) {
      const teamEmails = (crmUser.teamMemberEmails || []).map(normalizeEmail).filter(Boolean);
      query = teamEmails.length
        ? query.in('assigned_to_email', teamEmails)
        : query.ilike('assigned_to_email', normalizeEmail(crmUser.email));
    } else if (!ADMIN_ROLES.has(role)) {
      query = query.ilike('assigned_to_email', normalizeEmail(crmUser.email));
    }

    const { data, error } = await query;
    if (error) {
      console.error('[CRM Leads] Erro ao listar leads:', error.message);
      return sendJson(res, 500, { ok: false, error: 'Não foi possível carregar os leads.' });
    }

    return sendJson(res, 200, { ok: true, leads: data || [] });
  } catch (error) {
    console.error('[CRM Leads] Erro interno:', error);
    return sendJson(res, 500, { ok: false, error: 'Erro interno ao carregar os leads.' });
  }
};
