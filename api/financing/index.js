const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser, canAccessLead, normalizeRole } = require('../../lib/server/crm-authorization');

const RATE_ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador', 'coordenador-financeiro']);
const PRODUCT_FIELDS = [
  'institution_name', 'product_name', 'annual_interest_rate', 'rate_type', 'indexer',
  'amortization_systems', 'max_financing_percent', 'min_property_value', 'max_property_value',
  'min_financing_value', 'max_financing_value', 'min_term_months', 'max_term_months',
  'max_age_at_end', 'income_commitment_percent', 'property_types', 'property_conditions',
  'eligible_states', 'eligible_cities', 'appraisal_fee', 'registration_fee', 'other_upfront_fees',
  'monthly_fee', 'monthly_insurance_amount', 'monthly_insurance_percent', 'fee_details',
  'insurance_details', 'cost_data_complete', 'source_name', 'source_url', 'source_notes',
  'updated_reference_at', 'valid_from', 'valid_until', 'active'
];

const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
};
const schemaMissing = (error) => ['42P01', 'PGRST204', 'PGRST205'].includes(error?.code);
const schemaError = (res) => send(res, 503, {
  ok: false,
  code: 'FINANCING_SCHEMA_NOT_READY',
  error: 'O banco do módulo ainda não foi preparado. Execute sql/008-real-estate-financing.sql no Supabase.'
});
const cleanText = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const cleanArray = (value) => Array.isArray(value)
  ? [...new Set(value.map((item) => cleanText(item, 100).toUpperCase()).filter(Boolean))]
  : [];
const pickProduct = (body, userEmail, existingVersion = 0) => {
  const product = {};
  PRODUCT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) product[field] = body[field];
  });
  ['institution_name', 'product_name', 'rate_type', 'indexer', 'source_name', 'source_url', 'source_notes'].forEach((field) => {
    if (field in product) product[field] = cleanText(product[field], field === 'source_notes' ? 1500 : 300);
  });
  ['amortization_systems', 'property_types', 'property_conditions', 'eligible_states', 'eligible_cities'].forEach((field) => {
    if (field in product) product[field] = cleanArray(product[field]);
  });
  product.updated_by_email = userEmail;
  if (existingVersion) product.version = existingVersion + 1;
  product.updated_at = new Date().toISOString();
  return product;
};

function validateProduct(product, partial = false) {
  const required = ['institution_name', 'product_name', 'annual_interest_rate', 'max_financing_percent', 'max_term_months', 'max_age_at_end', 'source_name', 'updated_reference_at'];
  if (!partial) {
    const missing = required.filter((field) => product[field] === undefined || product[field] === null || product[field] === '');
    if (missing.length) return `Preencha os campos obrigatórios: ${missing.join(', ')}.`;
  }
  if (product.annual_interest_rate != null && Number(product.annual_interest_rate) < 0) return 'A taxa anual não pode ser negativa.';
  if (product.max_financing_percent != null && (Number(product.max_financing_percent) <= 0 || Number(product.max_financing_percent) > 100)) return 'O percentual máximo deve estar entre 0 e 100.';
  if (product.income_commitment_percent != null && (Number(product.income_commitment_percent) <= 0 || Number(product.income_commitment_percent) > 100)) return 'O comprometimento de renda deve estar entre 0 e 100.';
  if (product.valid_from && product.valid_until && product.valid_until < product.valid_from) return 'A validade final não pode ser anterior à inicial.';
  if (product.source_url) {
    try {
      const source = new URL(product.source_url);
      if (!['http:', 'https:'].includes(source.protocol)) return 'A URL da fonte deve usar HTTP ou HTTPS.';
    } catch (_) {
      return 'A URL da fonte é inválida.';
    }
  }
  if (product.amortization_systems && !product.amortization_systems.every((item) => ['SAC', 'PRICE'].includes(item))) return 'Sistema de amortização inválido.';
  return null;
}

async function listProducts(req, res, auth, url) {
  const admin = RATE_ADMIN_ROLES.has(normalizeRole(auth.user.cargo));
  let query = supabase.from('financing_rate_products').select('*').order('institution_name').order('product_name');
  if (!admin || url.searchParams.get('include_inactive') !== 'true') query = query.eq('active', true);
  const { data, error } = await query;
  if (schemaMissing(error)) return schemaError(res);
  if (error) return send(res, 500, { ok: false, error: 'Não foi possível carregar as condições bancárias.' });
  return send(res, 200, { ok: true, products: data || [], can_manage_rates: admin });
}

async function manageProduct(req, res, auth) {
  if (!RATE_ADMIN_ROLES.has(normalizeRole(auth.user.cargo))) return send(res, 403, { ok: false, error: 'Somente perfis administrativos podem alterar taxas.' });
  const body = req.body || {};
  if (req.method === 'POST') {
    const product = pickProduct(body, auth.user.email);
    product.created_by_email = auth.user.email;
    const validation = validateProduct(product);
    if (validation) return send(res, 400, { ok: false, error: validation });
    const { data, error } = await supabase.from('financing_rate_products').insert(product).select('*').single();
    if (schemaMissing(error)) return schemaError(res);
    if (error) return send(res, 400, { ok: false, error: error.message });
    return send(res, 201, { ok: true, product: data });
  }
  const id = cleanText(body.id, 80);
  if (!id) return send(res, 400, { ok: false, error: 'Produto não informado.' });
  const { data: current, error: currentError } = await supabase.from('financing_rate_products').select('version').eq('id', id).maybeSingle();
  if (schemaMissing(currentError)) return schemaError(res);
  if (currentError || !current) return send(res, 404, { ok: false, error: 'Produto não encontrado.' });
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('financing_rate_products').update({ active: false, version: current.version + 1, updated_by_email: auth.user.email, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return send(res, 400, { ok: false, error: error.message });
    return send(res, 200, { ok: true });
  }
  const product = pickProduct(body, auth.user.email, current.version);
  delete product.id;
  const validation = validateProduct(product, true);
  if (validation) return send(res, 400, { ok: false, error: validation });
  const { data, error } = await supabase.from('financing_rate_products').update(product).eq('id', id).select('*').single();
  if (error) return send(res, 400, { ok: false, error: error.message });
  return send(res, 200, { ok: true, product: data });
}

async function listClients(res, auth) {
  let query = supabase.from('leads').select('id,name,telefone,assigned_to_email,assigned_to_name').order('name').limit(250);
  if (!auth.user.canAccessAllLeads) {
    const emails = auth.user.teamMemberEmails?.length ? auth.user.teamMemberEmails : [auth.user.email];
    query = emails.length > 1 ? query.in('assigned_to_email', emails) : query.ilike('assigned_to_email', emails[0]);
  }
  const { data, error } = await query;
  if (error) return send(res, 500, { ok: false, error: 'Não foi possível carregar os clientes.' });
  return send(res, 200, { ok: true, clients: data || [] });
}

async function simulations(req, res, auth) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('financing_simulations').select('*').eq('created_by_auth_id', auth.user.auth_user_id).order('created_at', { ascending: false }).limit(100);
    if (schemaMissing(error)) return schemaError(res);
    if (error) return send(res, 500, { ok: false, error: 'Não foi possível carregar as simulações.' });
    return send(res, 200, { ok: true, simulations: data || [] });
  }
  const body = req.body || {};
  if (req.method === 'POST') {
    const name = cleanText(body.name, 120);
    if (!name) return send(res, 400, { ok: false, error: 'Informe um nome para salvar a simulação.' });
    let clientName = null;
    const clientId = cleanText(body.client_id, 100) || null;
    if (clientId) {
      const { data: lead, error } = await supabase.from('leads').select('id,name,assigned_to_email').eq('id', clientId).maybeSingle();
      if (error || !lead || !canAccessLead(auth.user, lead)) return send(res, 403, { ok: false, error: 'Cliente indisponível para este usuário.' });
      clientName = lead.name;
    }
    const shown = Array.isArray(body.products_shown) ? body.products_shown.slice(0, 100) : [];
    const record = {
      name,
      created_by_auth_id: auth.user.auth_user_id,
      created_by_email: auth.user.email,
      created_by_name: auth.user.nome || auth.user.email,
      client_id: clientId,
      client_name: clientName,
      input_data: body.input_data || {},
      products_shown: shown,
      selected_product: body.selected_product || null,
      rate_versions: shown.map((item) => ({ product_id: item.product_id || item.id, version: item.version })).filter((item) => item.product_id),
    };
    const { data, error } = await supabase.from('financing_simulations').insert(record).select('*').single();
    if (schemaMissing(error)) return schemaError(res);
    if (error) return send(res, 400, { ok: false, error: error.message });
    return send(res, 201, { ok: true, simulation: data });
  }
  const id = cleanText(body.id, 80);
  if (!id) return send(res, 400, { ok: false, error: 'Simulação não informada.' });
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('financing_simulations').delete().eq('id', id).eq('created_by_auth_id', auth.user.auth_user_id);
    if (error) return send(res, 400, { ok: false, error: error.message });
    return send(res, 200, { ok: true });
  }
  const { data, error } = await supabase.from('financing_simulations').update({ selected_product: body.selected_product || null, updated_at: new Date().toISOString() }).eq('id', id).eq('created_by_auth_id', auth.user.auth_user_id).select('*').maybeSingle();
  if (error) return send(res, 400, { ok: false, error: error.message });
  if (!data) return send(res, 404, { ok: false, error: 'Simulação não encontrada.' });
  return send(res, 200, { ok: true, simulation: data });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (!supabase) return send(res, 503, { ok: false, error: 'Supabase não configurado.' });
  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status || 401, { ok: false, error: auth.error });
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.includes('/products')) {
      if (req.method === 'GET') return listProducts(req, res, auth, url);
      if (['POST', 'PATCH', 'DELETE'].includes(req.method)) return manageProduct(req, res, auth);
    }
    if (url.pathname.includes('/clients') && req.method === 'GET') return listClients(res, auth);
    if (url.pathname.includes('/simulations') && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return simulations(req, res, auth);
    return send(res, 404, { ok: false, error: 'Endpoint não encontrado no módulo de financiamento.' });
  } catch (error) {
    console.error('[Financing API]', error);
    return send(res, 500, { ok: false, error: 'Erro interno no módulo de financiamento.' });
  }
};
