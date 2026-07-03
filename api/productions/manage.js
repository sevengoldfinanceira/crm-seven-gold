const { supabase } = require('../_shared/supabase');
const { getAuthorizedCrmUser } = require('../_shared/crm-authorization');
const { isDirectorCeo, getOpenProduction } = require('../_shared/commercial-productions');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };
const monthName = (month, year) => `${new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))).replace(/^./, c => c.toUpperCase())}/${year}`;
const monthRange = (month, year) => ({ starts_at: `${year}-${String(month).padStart(2, '0')}-01`, ends_at: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status, { ok: false, error: auth.error });
  const ceo = isDirectorCeo(auth.user);
  try {
    if (req.method === 'GET') {
      let query = supabase.from('commercial_productions').select('*').order('starts_at', { ascending: false });
      if (!ceo) query = query.eq('status', 'open').limit(1);
      const { data, error } = await query;
      if (error?.code === 'PGRST205') return send(res, 200, { ok: true, setupRequired: true, isDirectorCeo: ceo, productions: [] });
      if (error) return send(res, 500, { ok: false, error: error.message });
      return send(res, 200, { ok: true, isDirectorCeo: ceo, productions: data || [] });
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
    if (!ceo) return send(res, 403, { ok: false, error: 'Somente o DIRETOR-CEO pode gerenciar produções.' });
    const { action, production_id, lead_id } = req.body || {};
    if (action === 'close') {
      const { data, error } = await supabase.rpc('close_commercial_production', { target_id: production_id, actor_id: auth.user.auth_user_id });
      if (error) return send(res, 409, { ok: false, error: error.message });
      return send(res, 200, { ok: true, production: data });
    }
    if (action === 'start_next') {
      const open = await getOpenProduction();
      if (open.production) return send(res, 409, { ok: false, error: 'Já existe uma produção aberta.' });
      const { data: latest, error: latestError } = await supabase.from('commercial_productions').select('month,year').order('starts_at', { ascending: false }).limit(1).maybeSingle();
      if (latestError) return send(res, 500, { ok: false, error: latestError.message });
      const base = latest ? new Date(Date.UTC(latest.year, latest.month, 1)) : new Date();
      const month = base.getUTCMonth() + 1, year = base.getUTCFullYear();
      const range = monthRange(month, year);
      const { data, error } = await supabase.from('commercial_productions').insert({ name: monthName(month, year), month, year, ...range, status: 'open', created_by: auth.user.auth_user_id }).select('*').single();
      if (error) return send(res, 409, { ok: false, error: error.message });
      return send(res, 200, { ok: true, production: data });
    }
    if (action === 'copy_lead') {
      const open = await getOpenProduction();
      if (!open.production) return send(res, 409, { ok: false, error: 'Não existe produção aberta.' });
      const { data: source, error: sourceError } = await supabase.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (sourceError || !source) return send(res, 404, { ok: false, error: 'Lead original não encontrado.' });
      const { id, created_at, updated_at, ultima_interacao, locked_at, locked_reason, production_id: ignored, production_month: ignoredMonth, production_year: ignoredYear, ...copy } = source;
      const { data, error } = await supabase.from('leads').insert({ ...copy, status: 'lead_recebido', original_lead_id: id, created_by_email: auth.user.email, created_by_name: auth.user.nome || auth.user.email }).select('*').single();
      if (error) return send(res, 409, { ok: false, error: error.message });
      return send(res, 200, { ok: true, lead: data });
    }
    return send(res, 400, { ok: false, error: 'Ação inválida.' });
  } catch (error) { return send(res, 500, { ok: false, error: error.message }); }
};
