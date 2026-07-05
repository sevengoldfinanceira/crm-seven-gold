const DUPLICATE_ACTIVE_MESSAGE = 'Este vendedor já possui um lead com este telefone.';
const DUPLICATE_TRASH_MESSAGE = 'Este vendedor já possui este lead na lixeira. Recupere o lead em vez de cadastrar novamente.';
const DUPLICATE_RECOVER_MESSAGE = 'Este vendedor já possui um lead com este telefone. Não é possível recuperar como novo.';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length === 13) return digits.slice(2);
  return digits;
}

function getPhoneVariants(phone) {
  const normalized = normalizePhone(phone);
  const digits = String(phone || '').replace(/\D/g, '');
  const variants = new Set([digits, normalized].filter(Boolean));
  if (normalized && !normalized.startsWith('55')) variants.add(`55${normalized}`);
  return Array.from(variants);
}

function isSamePhone(a, b) {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return Boolean(left && right && left === right);
}

async function findDuplicateLeadForSeller({
  supabase,
  phone,
  assignedToEmail,
  ignoreLeadId = null,
}) {
  const sellerEmail = normalizeEmail(assignedToEmail);
  const normalizedPhone = normalizePhone(phone);
  if (!supabase || !sellerEmail || !normalizedPhone) return null;

  const variants = getPhoneVariants(phone);
  let query = supabase
    .from('leads')
    .select('id,name,telefone,status,assigned_to_email,assigned_to_name,created_at')
    .ilike('assigned_to_email', sellerEmail);

  if (variants.length) {
    query = query.in('telefone', variants);
  }

  const { data, error } = await query.limit(50);
  if (error) throw error;

  const ignoreId = ignoreLeadId ? String(ignoreLeadId) : null;
  const matches = (data || []).filter((lead) => {
    if (ignoreId && String(lead.id) === ignoreId) return false;
    return isSamePhone(lead.telefone, normalizedPhone);
  });

  return matches.find((lead) => lead.status !== 'cancelado') || matches[0] || null;
}

async function ensureLeadIsNotDuplicateForSeller(options = {}) {
  const duplicate = await findDuplicateLeadForSeller(options);
  if (!duplicate) return null;

  const error = new Error(
    duplicate.status === 'cancelado'
      ? DUPLICATE_TRASH_MESSAGE
      : options.recovering
        ? DUPLICATE_RECOVER_MESSAGE
        : DUPLICATE_ACTIVE_MESSAGE
  );
  error.status = 409;
  error.code = 'DUPLICATE_LEAD_FOR_SELLER';
  error.lead = duplicate;
  throw error;
}

function mapDuplicateDbError(error) {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (text.includes('unique_active_lead_per_seller_phone') || text.includes('duplicate_lead_for_seller')) {
    return DUPLICATE_ACTIVE_MESSAGE;
  }
  return null;
}

module.exports = {
  DUPLICATE_ACTIVE_MESSAGE,
  DUPLICATE_TRASH_MESSAGE,
  DUPLICATE_RECOVER_MESSAGE,
  normalizePhone,
  getPhoneVariants,
  findDuplicateLeadForSeller,
  ensureLeadIsNotDuplicateForSeller,
  mapDuplicateDbError,
};
