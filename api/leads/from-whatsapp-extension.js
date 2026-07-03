const { supabase } = require('../_shared/supabase');
const { normalizeLeadClientInfo } = require('../_shared/lead-client-info');
const { getAuthorizedCrmUser, canAccessLead } = require('../_shared/crm-authorization');
const { getOpenProduction, NO_OPEN_PRODUCTION, productionFields } = require('../_shared/commercial-productions');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      res.writeHead(authorization.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: authorization.error }));
    }

    const { name, phone, tags, notes, source } = req.body;
    const open = await getOpenProduction();
    const legacyMode = open.error && /commercial_productions|schema cache/i.test(open.error);
    if (open.error && !legacyMode) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: open.error }));
    }
    if (!open.production && !legacyMode) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: NO_OPEN_PRODUCTION }));
    }
    const owner_id = authorization.user.auth_user_id;
    const owner_email = authorization.user.email;
    const owner_name = authorization.user.nome || authorization.user.email;

    console.log('[from-whatsapp-extension] Requisição recebida');

    if (!name || !phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({ ok: false, error: 'name e phone são obrigatórios' })
      );
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');


    const ownerId = owner_id;


    const { data: existingLead, error: findError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', cleanedPhone)
      .maybeSingle();

    if (findError) {
      console.error('[from-whatsapp-extension] Erro ao buscar lead:', findError.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: findError.message }));
    }

    console.log('[from-whatsapp-extension] Lead existente encontrado:', existingLead ? existingLead.id : 'nenhum');

    if (existingLead) {
      console.log('[from-whatsapp-extension] Lead duplicado encontrado, retornando 409');
      const mayAccessExistingLead = canAccessLead(authorization.user, existingLead);
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: false,
          action: 'duplicate',
          error: mayAccessExistingLead
            ? 'Número já cadastrado no CRM. Edite esse lead diretamente no CRM ou use outro número para criar um novo cadastro.'
            : 'Este número já está cadastrado e atribuído a outro responsável.',
          lead: mayAccessExistingLead ? existingLead : null,
        })
      );
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

    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert(insertData)
      .select('*')
      .single();

    if (insertError) {
      console.error('[from-whatsapp-extension] Erro ao criar lead:', insertError.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: insertError.message }));
    }

    if (!newLead || !newLead.id) {
      console.error('[from-whatsapp-extension] Insert retornou lead inválido');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Falha ao criar lead: nenhum lead retornado' }));
    }

    lead = newLead;

    console.log('[from-whatsapp-extension] Lead criado:', { id: lead.id });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, lead }));
  } catch (err) {
    console.error('[from-whatsapp-extension] Erro interno:', process.env.NODE_ENV !== 'production' ? err : err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: err.message || 'Erro interno do servidor' }));
  }
};
