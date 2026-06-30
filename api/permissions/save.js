const { supabase } = require('../_shared/supabase');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);

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
      .select('email,cargo,ativo')
      .ilike('email', userEmail)
      .eq('ativo', true)
      .maybeSingle();

    if (crmUserError || !crmUser || !ADMIN_ROLES.has(normalizeRole(crmUser.cargo))) {
      return sendJson(res, 403, { ok: false, error: 'Usuario sem permissao para salvar permissoes.' });
    }

    const payload = req.body && Object.keys(req.body).length ? req.body : await readBody(req);
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
