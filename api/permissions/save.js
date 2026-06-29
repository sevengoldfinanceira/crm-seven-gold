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
