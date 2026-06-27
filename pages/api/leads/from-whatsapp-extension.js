const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { name, phone, stage, tags, notes, source, owner_id } = req.body;

    console.log('[from-whatsapp-extension] Requisição recebida');

    if (!name || !phone) {
      return res.status(400).json({
        ok: false,
        error: 'name e phone são obrigatórios',
      });
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');
    if (process.env.NODE_ENV !== 'production') {
      console.log('[from-whatsapp-extension] Telefone normalizado:', cleanedPhone);
    }

    const ownerId = owner_id || process.env.DEFAULT_OWNER_ID;
    if (!ownerId) {
      return res.status(400).json({
        ok: false,
        error: 'owner_id obrigatório. Configure DEFAULT_OWNER_ID no .env.',
      });
    }
    console.log('[from-whatsapp-extension] Owner ID:', ownerId);

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
      return res.status(409).json({
        ok: false,
        action: 'duplicate',
        error: 'Número já cadastrado no CRM. Edite esse lead diretamente no CRM ou use outro número para criar um novo cadastro.',
        lead: existingLead,
      });
    }
    const insertData = {
      name,
      telefone: cleanedPhone,
      status: stage || 'novo_lead',
      origin: source || 'whatsapp_web_extension',
      note: notes || '',
      owner_id: ownerId,
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
