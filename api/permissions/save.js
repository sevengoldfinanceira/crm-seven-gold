const { supabase } = require('../_shared/supabase');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);
const TEAM_MANAGER_ROLES = new Set([
  ...ADMIN_ROLES,
  'coordenador-comercial',
  'supervisor-comercial',
  'coordenador',
  'supervisor',
  'coordenador-rh',
]);

const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-');

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

async function saveCrmUser(user) {
  const targetId = String(user?.id || '').trim();
  const nome = String(user?.nome || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  const cargo = normalizeRole(user?.cargo);
  const ativo = user?.ativo === true;

  if (!nome || !email || !cargo) {
    return { status: 400, error: 'Nome, e-mail e cargo são obrigatórios.' };
  }

  const { data: emailOwner, error: emailError } = await supabase
    .from('crm_users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (emailError) return { status: 500, error: emailError.message };
  if (targetId && emailOwner?.id && String(emailOwner.id) !== targetId) {
    return { status: 409, error: 'Este e-mail já pertence a outro usuário.' };
  }

  const resolvedId = targetId || emailOwner?.id || null;
  if (cargo === 'diretor-ceo') {
    let directorQuery = supabase.from('crm_users').select('id').eq('cargo', 'diretor-ceo');
    if (resolvedId) directorQuery = directorQuery.neq('id', resolvedId);
    const { data: otherDirector, error: directorError } = await directorQuery.limit(1);
    if (directorError) return { status: 500, error: directorError.message };
    if (otherDirector?.length) {
      return { status: 409, error: 'O cargo Diretor CEO já está vinculado a outro usuário.' };
    }
  }

  const userPayload = { nome, email, cargo, ativo, updated_at: new Date().toISOString() };
  const operation = resolvedId
    ? supabase.from('crm_users').update(userPayload).eq('id', resolvedId)
    : supabase.from('crm_users').insert(userPayload);
  const { data: savedUser, error: saveError } = await operation
    .select('id,email,nome,cargo,ativo,created_at,updated_at')
    .single();
  if (saveError) return { status: 500, error: saveError.message };
  return { status: 200, user: savedUser };
}

async function listCrmUserAvatars() {
  const { data: crmUsers, error: crmUsersError } = await supabase
    .from('crm_users')
    .select('id,email');
  if (crmUsersError) return { status: 500, error: crmUsersError.message };

  const authUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { status: 500, error: error.message };
    const users = data?.users || [];
    authUsers.push(...users);
    if (users.length < 1000) break;
    page += 1;
  }

  const authById = new Map(authUsers.map((user) => [String(user.id), user]));
  const authByEmail = new Map(
    authUsers.map((user) => [String(user.email || '').trim().toLowerCase(), user])
  );
  const resolvedUsers = (crmUsers || []).map((crmUser) => ({
    crmUser,
    authUser: authById.get(String(crmUser.id))
      || authByEmail.get(String(crmUser.email || '').trim().toLowerCase())
      || null,
  }));
  const avatarCandidates = resolvedUsers
    .filter(({ authUser }) => authUser?.id)
    .map(({ authUser }) => ({
      directory: `${authUser.id}/profile`,
      path: `${authUser.id}/profile/avatar.jpg`,
    }));

  const avatarChecks = await Promise.all(avatarCandidates.map(async (candidate) => {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .list(candidate.directory, { limit: 1, search: 'avatar.jpg' });
    if (error) {
      console.error('[permissions/save] avatar lookup error:', error);
      return null;
    }
    return (data || []).some((file) => file.name === 'avatar.jpg') ? candidate.path : null;
  }));
  const avatarPaths = avatarChecks.filter(Boolean);

  let signedUrls = [];
  if (avatarPaths.length) {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .createSignedUrls(avatarPaths, 60 * 60);
    if (error) console.error('[permissions/save] avatar signed URLs error:', error);
    signedUrls = data || [];
  }
  const customAvatarByPath = new Map(
    signedUrls.filter((item) => item?.signedUrl).map((item) => [item.path, item.signedUrl])
  );

  return {
    status: 200,
    avatars: resolvedUsers.map(({ crmUser, authUser }) => {
      const path = authUser?.id ? `${authUser.id}/profile/avatar.jpg` : '';
      const customAvatar = customAvatarByPath.get(path) || null;
      const googleAvatar = authUser?.user_metadata?.avatar_url
        || authUser?.user_metadata?.picture
        || null;
      return { id: crmUser.id, url: customAvatar || googleAvatar || null };
    }),
  };
}

async function manageCommercialTeams(action, data, crmUser) {
  const role = normalizeRole(crmUser.cargo);
  const isAdmin = ADMIN_ROLES.has(role) || role === 'coordenador-rh';
  if (!TEAM_MANAGER_ROLES.has(role)) {
    return { status: 403, error: 'Usuário sem permissão para gerenciar equipes.' };
  }

  if (action === 'list') {
    let teamsQuery = supabase
      .from('crm_teams')
      .select('id,name,coordinator_user_id,created_at,updated_at')
      .order('name');
    if (!isAdmin) teamsQuery = teamsQuery.eq('coordinator_user_id', crmUser.id);
    const { data: teams, error: teamsError } = await teamsQuery;
    if (teamsError) return { status: 500, error: teamsError.message };

    const teamIds = (teams || []).map((team) => team.id);
    let members = [];
    if (teamIds.length) {
      const { data: memberRows, error: membersError } = await supabase
        .from('crm_team_members')
        .select('id,team_id,user_id,created_at')
        .in('team_id', teamIds);
      if (membersError) return { status: 500, error: membersError.message };
      members = memberRows || [];
    }
    return { status: 200, teams: teams || [], members };
  }

  if (action === 'create') {
    const name = String(data?.name || '').trim();
    const coordinatorUserId = String(data?.coordinator_user_id || '').trim();
    if (!name || !coordinatorUserId) return { status: 400, error: 'Nome e gestor são obrigatórios.' };
    if (!isAdmin && coordinatorUserId !== String(crmUser.id)) {
      return { status: 403, error: 'Você só pode criar uma equipe sob sua responsabilidade.' };
    }

    const { data: team, error } = await supabase
      .from('crm_teams')
      .insert({ name, coordinator_user_id: coordinatorUserId, updated_at: new Date().toISOString() })
      .select('id,name,coordinator_user_id,created_at,updated_at')
      .single();
    if (error?.code === '23505') return { status: 409, error: 'Já existe uma equipe com esse nome.' };
    if (error) return { status: 500, error: error.message };
    return { status: 200, team };
  }

  const teamId = String(data?.team_id || '').trim();
  if (!teamId) return { status: 400, error: 'Equipe não informada.' };
  const { data: currentTeam, error: currentTeamError } = await supabase
    .from('crm_teams')
    .select('id,coordinator_user_id')
    .eq('id', teamId)
    .maybeSingle();
  if (currentTeamError) return { status: 500, error: currentTeamError.message };
  if (!currentTeam) return { status: 404, error: 'Equipe não encontrada.' };
  if (!isAdmin && String(currentTeam.coordinator_user_id) !== String(crmUser.id)) {
    return { status: 403, error: 'Você não pode alterar a equipe de outro gestor.' };
  }

  if (action === 'delete') {
    const { error } = await supabase.from('crm_teams').delete().eq('id', teamId);
    if (error) return { status: 500, error: error.message };
    return { status: 200, deleted: true };
  }

  if (action === 'save') {
    const coordinatorUserId = String(data?.coordinator_user_id || '').trim();
    const memberIds = [...new Set(Array.isArray(data?.member_ids) ? data.member_ids.map(String) : [])];
    if (!coordinatorUserId) return { status: 400, error: 'Gestor responsável não informado.' };
    if (!isAdmin && coordinatorUserId !== String(crmUser.id)) {
      return { status: 403, error: 'Você não pode transferir a equipe para outro gestor.' };
    }

    if (memberIds.length) {
      const { data: conflictingMembers, error: conflictError } = await supabase
        .from('crm_team_members')
        .select('user_id,team_id')
        .in('user_id', memberIds)
        .neq('team_id', teamId)
        .limit(1);
      if (conflictError) return { status: 500, error: conflictError.message };
      if (conflictingMembers?.length) {
        return { status: 409, error: 'Um dos colaboradores já pertence a outra equipe.' };
      }
    }

    const { error: teamError } = await supabase
      .from('crm_teams')
      .update({ coordinator_user_id: coordinatorUserId, updated_at: new Date().toISOString() })
      .eq('id', teamId);
    if (teamError) return { status: 500, error: teamError.message };

    const { error: deleteError } = await supabase.from('crm_team_members').delete().eq('team_id', teamId);
    if (deleteError) return { status: 500, error: deleteError.message };
    if (memberIds.length) {
      const { error: insertError } = await supabase.from('crm_team_members').insert(
        memberIds.map((userId) => ({ team_id: teamId, user_id: userId }))
      );
      if (insertError?.code === '23505') {
        return { status: 409, error: 'Um dos colaboradores já pertence a outra equipe.' };
      }
      if (insertError) return { status: 500, error: insertError.message };
    }
    return { status: 200, saved: true };
  }

  return { status: 400, error: 'Ação de equipe inválida.' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return sendJson(res, 401, { ok: false, error: 'Sessao nao enviada.' });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userEmail = userData?.user?.email?.trim().toLowerCase();
    if (userError || !userEmail) {
      return sendJson(res, 401, { ok: false, error: 'Sessao invalida.' });
    }

    const { data: crmUser, error: crmUserError } = await supabase
      .from('crm_users')
      .select('id,email,cargo,ativo')
      .ilike('email', userEmail)
      .eq('ativo', true)
      .maybeSingle();

    const payload = req.body && Object.keys(req.body).length ? req.body : await readBody(req);
    if (crmUserError || !crmUser) {
      return sendJson(res, 403, { ok: false, error: 'Usuário sem acesso ao CRM.' });
    }
    if (payload.team_action) {
      const result = await manageCommercialTeams(payload.team_action, payload.team_data, crmUser);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, ...result });
    }
    if (payload.list_user_avatars === true) {
      const result = await listCrmUserAvatars();
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, avatars: result.avatars });
    }
    if (!ADMIN_ROLES.has(normalizeRole(crmUser.cargo))) {
      return sendJson(res, 403, { ok: false, error: 'Usuario sem permissao para salvar permissoes.' });
    }
    if (payload.delete_user_id) {
      const deleteUserId = String(payload.delete_user_id).trim();
      if (!deleteUserId) return sendJson(res, 400, { ok: false, error: 'Usuário não informado.' });
      if (deleteUserId === String(crmUser.id)) {
        return sendJson(res, 400, { ok: false, error: 'Você não pode excluir o próprio usuário.' });
      }
      const { error: deleteUserError } = await supabase.from('crm_users').delete().eq('id', deleteUserId);
      if (deleteUserError) return sendJson(res, 500, { ok: false, error: deleteUserError.message });
      return sendJson(res, 200, { ok: true, deleted: true });
    }
    if (payload.user) {
      const result = await saveCrmUser(payload.user);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, user: result.user });
    }

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    if (!permissions.length) {
      return sendJson(res, 400, { ok: false, error: 'Nenhuma permissao enviada.' });
    }

    const now = new Date().toISOString();
    const rows = permissions
      .map((item) => ({
        cargo: String(item.cargo || '').trim(),
        area_key: String(item.area_key || '').trim(),
        area_label: String(item.area_label || item.area_key || '').trim(),
        permitido: Boolean(item.permitido),
        updated_at: now,
      }))
      .filter((item) => item.cargo && item.area_key && item.area_label);

    if (!rows.length) {
      return sendJson(res, 400, { ok: false, error: 'Permissoes invalidas.' });
    }

    const cargos = [...new Set(rows.map((item) => item.cargo))];
    const { error: deleteError } = await supabase
      .from('crm_role_permissions')
      .delete()
      .in('cargo', cargos);

    if (deleteError) {
      console.error('[permissions/save] delete error:', deleteError);
      return sendJson(res, 500, { ok: false, error: deleteError.message });
    }

    const { error: insertError } = await supabase
      .from('crm_role_permissions')
      .insert(rows);

    if (insertError) {
      console.error('[permissions/save] insert error:', insertError);
      return sendJson(res, 500, { ok: false, error: insertError.message });
    }

    return sendJson(res, 200, { ok: true, saved: rows.length });
  } catch (error) {
    console.error('[permissions/save] internal error:', error);
    return sendJson(res, 500, { ok: false, error: 'Erro interno ao salvar permissoes.' });
  }
};
