const { supabase } = require('../../lib/server/supabase');
const { normalizeLeadClientInfo } = require('../../lib/server/lead-client-info');
const { getAuthorizedCrmUser, canAccessLead } = require('../../lib/server/crm-authorization');
const { getOpenProduction, NO_OPEN_PRODUCTION, productionFields, isProductionSchemaError, stripProductionFields } = require('../../lib/server/commercial-productions');
const { findDuplicateLeadForSeller, mapDuplicateDbError } = require('../../lib/server/lead-duplicates');

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

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
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return sendJson(res, authorization.status, { ok: false, error: authorization.error });
    }

    const { name, phone, tags, notes, source } = req.body;
    const open = await getOpenProduction();
    const legacyMode = open.error && /commercial_productions|schema cache/i.test(open.error);
    if (open.error && !legacyMode) {
      return sendJson(res, 500, { ok: false, error: open.error });
    }
    if (!open.production && !legacyMode) {
      return sendJson(res, 409, { ok: false, error: NO_OPEN_PRODUCTION });
    }
    const owner_id = authorization.user.auth_user_id;
    const owner_email = authorization.user.email;
    const owner_name = authorization.user.nome || authorization.user.email;

    console.log('[from-whatsapp-extension] Requisição recebida');

    if (!name || !phone) {
      return sendJson(res, 400, { ok: false, error: 'name e phone são obrigatórios' });
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');

    const ownerId = owner_id;

    let existingLead = null;
    try {
      existingLead = await findDuplicateLeadForSeller({
        supabase,
        phone: cleanedPhone,
        assignedToEmail: owner_email,
      });
    } catch (findError) {
      console.error('[from-whatsapp-extension] Erro ao buscar lead:', findError.message);
      return sendJson(res, 500, { ok: false, error: findError.message });
    }

    console.log('[from-whatsapp-extension] Lead existente do mesmo vendedor:', existingLead ? existingLead.id : 'nenhum');

    if (existingLead) {
      console.log('[from-whatsapp-extension] Lead duplicado encontrado, retornando 409');
      const mayAccessExistingLead = canAccessLead(authorization.user, existingLead);
      return sendJson(res, 409, {
        ok: false,
        action: 'duplicate',
        error: existingLead.status === 'cancelado'
          ? 'Este vendedor já possui este lead na lixeira. Recupere o lead em vez de cadastrar novamente.'
          : 'Este vendedor já possui um lead com este telefone.',
        lead: mayAccessExistingLead ? existingLead : null,
      });
    }
    const insertData = {
      name,
      telefone: cleanedPhone,
      status: 'lead_recebido',
      origin: source || 'whatsapp_web_extension',
      note: notes || '',
      owner_id: ownerId,
      assigned_to_email: owner_email || null,
      assigned_to_name: owner_name || null,
      created_by_email: owner_email || null,
      created_by_name: owner_name || null,
      ...(open.production ? productionFields(open.production) : {}),
      ...normalizeLeadClientInfo(req.body),
    };
    if (tags) insertData.tags = tags;

    let { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(insertData)
      .select('*')
      .single();

    if (insertError && open.production && isProductionSchemaError(insertError)) {
      const retry = await supabase
        .from('leads')
        .insert(stripProductionFields(insertData))
        .select('*')
        .single();
      newLead = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      console.error('[from-whatsapp-extension] Erro ao criar lead:', insertError.message);
      return sendJson(res, 500, { ok: false, error: mapDuplicateDbError(insertError) || insertError.message });
    }

    if (!newLead || !newLead.id) {
      console.error('[from-whatsapp-extension] Insert retornou lead inválido');
      return sendJson(res, 500, { ok: false, error: 'Falha ao criar lead: nenhum lead retornado' });
    }

    const lead = newLead;

    console.log('[from-whatsapp-extension] Lead criado:', { id: lead.id });

    return sendJson(res, 200, { ok: true, lead });
  } catch (err) {
    console.error('[from-whatsapp-extension] Erro interno:', process.env.NODE_ENV !== 'production' ? err : err.message);
    return sendJson(res, 500, { ok: false, error: err.message || 'Erro interno do servidor' });
  }
};
