const mapCargoToCommissionLevelId = (cargo) => {
  if (!cargo) return null;
  const clean = String(cargo).toLowerCase().trim().replace(/[-_]+/g, ' ');
  if (clean.includes('home') || clean.includes('office')) return 'home-office';
  if (clean.includes('assistente')) return 'assistente-vendas';
  if (clean.includes('supervisor')) return 'supervisor';
  if (clean.includes('coordenador')) return 'coordenador';
  if (clean.includes('junior')) return 'representante-junior';
  if (clean.includes('pleno')) return 'representante-pleno';
  if (clean.includes('submaster')) return 'submaster';
  if (clean.includes('consultor') || clean.includes('vendedor')) return 'consultor-vendas';
  return null;
};

const parseCommissionRate = (value) => {
  if (value === null || value === undefined) return 0;
  let normalized = String(value)
    .replace('%', '')
    .replace(/\s+/g, '')
    .trim();
  normalized = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const percent = Number.parseFloat(normalized);
  return Number.isFinite(percent) && percent > 0 ? percent / 100 : 0;
};

module.exports = {
  mapCargoToCommissionLevelId,
  parseCommissionRate,
};
