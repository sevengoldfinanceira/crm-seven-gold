const { supabase } = require('../_shared/supabase');
const { getAuthorizedCrmUser } = require('../_shared/crm-authorization');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);

const normalizeRole = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\s_]+/g, '-');

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return sendJson(res, authorization.status, { ok: false, error: authorization.error });
    }
    if (!ADMIN_ROLES.has(normalizeRole(authorization.user.cargo))) {
      return sendJson(res, 403, { ok: false, error: 'Somente administradores podem editar usuários.' });
    }

    const targetId = String(req.body?.id || '').trim();
    const nome = String(req.body?.nome || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const cargo = normalizeRole(req.body?.cargo);
    const ativo = req.body?.ativo === true;

    if (!nome || !email || !cargo) {
      return sendJson(res, 400, { ok: false, error: 'Nome, e-mail e cargo são obrigatórios.' });
    }

    const { data: emailOwner, error: emailError } = await supabase
      .from('crm_users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (emailError) return sendJson(res, 500, { ok: false, error: emailError.message });
    if (targetId && emailOwner?.id && String(emailOwner.id) !== targetId) {
      return sendJson(res, 409, { ok: false, error: 'Este e-mail já pertence a outro usuário.' });
    }

    const resolvedId = targetId || emailOwner?.id || null;
    if (cargo === 'diretor-ceo') {
      let directorQuery = supabase.from('crm_users').select('id').eq('cargo', 'diretor-ceo');
      if (resolvedId) directorQuery = directorQuery.neq('id', resolvedId);
      const { data: otherDirector, error: directorError } = await directorQuery.limit(1);
      if (directorError) return sendJson(res, 500, { ok: false, error: directorError.message });
      if (otherDirector?.length) {
        return sendJson(res, 409, { ok: false, error: 'O cargo Diretor CEO já está vinculado a outro usuário.' });
      }
    }

    const payload = { nome, email, cargo, ativo, updated_at: new Date().toISOString() };
    const operation = resolvedId
      ? supabase.from('crm_users').update(payload).eq('id', resolvedId)
      : supabase.from('crm_users').insert(payload);
    const { data: savedUser, error: saveError } = await operation
      .select('id,email,nome,cargo,ativo,created_at,updated_at')
      .single();

    if (saveError) return sendJson(res, 500, { ok: false, error: saveError.message });
    return sendJson(res, 200, { ok: true, user: savedUser });
  } catch (error) {
    console.error('[users/save] internal error:', error);
    return sendJson(res, 500, { ok: false, error: 'Erro interno ao salvar usuário.' });
  }
};
