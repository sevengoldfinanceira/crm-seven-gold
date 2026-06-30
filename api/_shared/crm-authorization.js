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

const TEAM_COORDINATOR_ROLES = new Set([
  'coordenador-comercial',
  'supervisor-comercial',
]);

const normalizeRole = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const aliases = {
    admin: 'administrador', administrator: 'administrador',
    owner: 'dono', proprietario: 'dono',
    'diretor-executivo': 'diretor-ceo', 'diretor-e-ceo': 'diretor-ceo',
    diretor: 'diretor-ceo', ceo: 'diretor-ceo',
  };
  return aliases[normalized] || normalized;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

async function getTeamMemberEmails(userEmail) {
  try {
    const { data: teamId } = await supabase.rpc('get_coordinated_team_id', { user_email: userEmail });
    if (!teamId) return [normalizeEmail(userEmail)];
    const { data: members } = await supabase.from('crm_team_members').select('user_id').eq('team_id', teamId);
    if (!members?.length) return [normalizeEmail(userEmail)];
    const { data: users } = await supabase.from('crm_users').select('email').in('id', members.map(m => m.user_id)).eq('ativo', true);
    const emails = (users || []).map(u => normalizeEmail(u.email)).filter(Boolean);
    if (!emails.includes(normalizeEmail(userEmail))) emails.push(normalizeEmail(userEmail));
    return emails;
  } catch (_) {
    return [normalizeEmail(userEmail)];
  }
}

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

  const normalizedRole = normalizeRole(crmUser.cargo);
  const canAccessAllLeads = FULL_LEAD_ACCESS_ROLES.has(normalizedRole);

  let teamMemberEmails = null;
  if (TEAM_COORDINATOR_ROLES.has(normalizedRole)) {
    teamMemberEmails = await getTeamMemberEmails(normalizeEmail(crmUser.email));
  }

  return {
    user: {
      ...crmUser,
      auth_user_id: authData.user.id,
      email: normalizeEmail(crmUser.email),
      canAccessAllLeads,
      teamMemberEmails,
    },
  };
}

function canAccessLead(crmUser, lead) {
  if (crmUser?.canAccessAllLeads) return true;
  const leadEmail = normalizeEmail(lead?.assigned_to_email);
  if (crmUser?.email && leadEmail === crmUser.email) return true;
  if (crmUser?.teamMemberEmails && crmUser.teamMemberEmails.includes(leadEmail)) return true;
  return false;
}

module.exports = {
  getAuthorizedCrmUser,
  canAccessLead,
  getTeamMemberEmails,
  normalizeRole,
  normalizeEmail,
  FULL_LEAD_ACCESS_ROLES,
  TEAM_COORDINATOR_ROLES,
};
