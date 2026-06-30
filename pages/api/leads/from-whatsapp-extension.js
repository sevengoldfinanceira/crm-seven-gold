const { supabase } = require('../../../api/_shared/supabase');
const { normalizeLeadClientInfo } = require('../../../api/_shared/lead-client-info');
const { getAuthorizedCrmUser, canAccessLead } = require('../../../api/_shared/crm-authorization');

module.exports = async (req, res) => {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return res.status(authorization.status).json({ ok: false, error: authorization.error });
    }

    const { name, phone, tags, notes, source } = req.body;
    const owner_id = authorization.user.auth_user_id;
    const owner_email = authorization.user.email;
    const owner_name = authorization.user.nome || authorization.user.email;

    console.log('[from-whatsapp-extension] Requisição recebida');

    if (!name || !phone) {
      return res.status(400).json({
        ok: false,
        error: 'name e phone são obrigatórios',
      });
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
      return res.status(500).json({ ok: false, error: findError.message });
    }

    console.log('[from-whatsapp-extension] Lead existente encontrado:', existingLead ? existingLead.id : 'nenhum');

    if (existingLead) {
      console.log('[from-whatsapp-extension] Lead duplicado encontrado, retornando 409');
      const mayAccessExistingLead = canAccessLead(authorization.user, existingLead);
      return res.status(409).json({
        ok: false,
        action: 'duplicate',
        error: mayAccessExistingLead
          ? 'Número já cadastrado no CRM. Edite esse lead diretamente no CRM ou use outro número para criar um novo cadastro.'
          : 'Este número já está cadastrado e atribuído a outro responsável.',
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
      return res.status(500).json({ ok: false, error: insertError.message });
    }

    if (!newLead || !newLead.id) {
      console.error('[from-whatsapp-extension] Insert retornou lead inválido');
      return res.status(500).json({ ok: false, error: 'Falha ao criar lead: nenhum lead retornado' });
    }

    lead = newLead;

    console.log('[from-whatsapp-extension] Lead criado:', { id: lead.id });

    return res.status(200).json({ ok: true, lead });
  } catch (err) {
    console.error('[from-whatsapp-extension] Erro interno:', process.env.NODE_ENV !== 'production' ? err : err.message);
    return res.status(500).json({
      ok: false,
      error: err.message || 'Erro interno do servidor',
    });
  }
};
