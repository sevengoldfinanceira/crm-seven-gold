const { supabase } = require('./supabase');

const NO_OPEN_PRODUCTION = 'Não existe produção aberta. Peça ao Diretor-CEO para iniciar uma nova produção.';
const CLOSED_PRODUCTION = 'Não é possível alterar lead de uma produção encerrada.';
const isDirectorCeo = (user) => {
  const role = String(user?.cargo || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return role === 'diretor-ceo' || role === 'diretor-e-ceo';
};

async function getOpenProduction() {
  const { data, error } = await supabase.from('commercial_productions').select('*').eq('status', 'open').order('starts_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return { error: error.message };
  return { production: data || null };
}

async function getProduction(id) {
  if (!id) return getOpenProduction();
  const { data, error } = await supabase.from('commercial_productions').select('*').eq('id', id).maybeSingle();
  if (error) return { error: error.message };
  return { production: data || null };
}

async function getLeadProduction(leadId) {
  const { data, error } = await supabase.from('leads').select('id,production_id,commercial_productions(id,name,status,month,year)').eq('id', leadId).maybeSingle();
  if (error && ['PGRST204', 'PGRST205'].includes(error.code)) {
    const legacy = await supabase.from('leads').select('id').eq('id', leadId).maybeSingle();
    if (legacy.error) return { error: legacy.error.message };
    return { lead: legacy.data, production: null, legacyMode: true };
  }
  if (error) return { error: error.message };
  return { lead: data, production: data?.commercial_productions || null };
}

async function assertLeadMutable(leadId) {
  const result = await getLeadProduction(leadId);
  if (result.error) return result;
  if (!result.lead) return { error: 'Lead não encontrado.', status: 404 };
  if (result.production?.status === 'closed') return { error: CLOSED_PRODUCTION, status: 409 };
  return result;
}

const productionFields = (p) => ({ production_id: p.id, production_month: p.month, production_year: p.year });

module.exports = { NO_OPEN_PRODUCTION, CLOSED_PRODUCTION, isDirectorCeo, getOpenProduction, getProduction, getLeadProduction, assertLeadMutable, productionFields };
