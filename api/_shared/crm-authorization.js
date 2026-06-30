const { supabase } = require('./supabase');

const FULL_LEAD_ACCESS_ROLES = new Set([
  'diretor-ceo',
  'dono',
  'admin',
  'administrador',
  'coordenador-comercial',
  'supervisor-comercial',
  'coordenador-posvenda',
  'coordenador-adm',
  'coordenador-financeiro',
  'coordenador-mkt',
  'coordenador-rh',
]);

const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

async function getAuthorizedCrmUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { error: 'Sessão não enviada.', status: 401 };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const email = normalizeEmail(authData?.user?.email);
  if (authError || !email) {
    return { error: 'Sessão inválida ou expirada.', status: 401 };
  }

  const { data: crmUser, error: crmUserError } = await supabase
    .from('crm_users')
    .select('id,email,nome,cargo,ativo')
    .ilike('email', email)
    .eq('ativo', true)
    .maybeSingle();

  if (crmUserError || !crmUser) {
    return { error: 'Usuário sem acesso ao CRM.', status: 403 };
  }

  return {
    user: {
      ...crmUser,
      auth_user_id: authData.user.id,
      email: normalizeEmail(crmUser.email),
      canAccessAllLeads: FULL_LEAD_ACCESS_ROLES.has(normalizeRole(crmUser.cargo)),
    },
  };
}

function canAccessLead(crmUser, lead) {
  if (crmUser?.canAccessAllLeads) return true;
  return Boolean(
    crmUser?.email &&
    normalizeEmail(lead?.assigned_to_email) === normalizeEmail(crmUser.email)
  );
}

module.exports = { getAuthorizedCrmUser, canAccessLead };
