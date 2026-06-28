const CLIENT_INFO_COLUMNS = [
  'property_region',
  'credit_value',
  'down_payment_value',
  'installment_value',
];

const BASIC_LEAD_COLUMNS = ['name', 'telefone', 'origin', 'note'];

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const parseOptionalMoney = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let normalized = raw.replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^\d,.-]/g, '');

  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

const normalizeLeadClientInfo = (payload = {}, { onlyPresent = false } = {}) => {
  const normalized = {};

  if (!onlyPresent || hasOwn(payload, 'property_region')) {
    normalized.property_region = String(payload.property_region ?? '').trim() || null;
  }
  if (!onlyPresent || hasOwn(payload, 'credit_value')) {
    normalized.credit_value = parseOptionalMoney(payload.credit_value);
  }
  if (!onlyPresent || hasOwn(payload, 'down_payment_value')) {
    normalized.down_payment_value = parseOptionalMoney(payload.down_payment_value);
  }
  if (!onlyPresent || hasOwn(payload, 'installment_value')) {
    normalized.installment_value = parseOptionalMoney(payload.installment_value);
  }

  return normalized;
};

const hasLeadClientInfo = (payload = {}) =>
  CLIENT_INFO_COLUMNS.some((column) => hasOwn(payload, column));

const hasBasicLeadInfo = (payload = {}) =>
  BASIC_LEAD_COLUMNS.some((column) => hasOwn(payload, column));

const normalizeBasicLeadInfo = (payload = {}) => {
  const normalized = {};
  if (hasOwn(payload, 'name')) normalized.name = String(payload.name ?? '').trim();
  if (hasOwn(payload, 'telefone')) normalized.telefone = String(payload.telefone ?? '').replace(/\D/g, '');
  if (hasOwn(payload, 'origin')) normalized.origin = String(payload.origin ?? '').trim();
  if (hasOwn(payload, 'note')) normalized.note = String(payload.note ?? '').trim();
  return normalized;
};

module.exports = {
  CLIENT_INFO_COLUMNS,
  hasBasicLeadInfo,
  hasLeadClientInfo,
  normalizeBasicLeadInfo,
  normalizeLeadClientInfo,
  parseOptionalMoney,
};
