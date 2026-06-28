const { supabase } = require('../_shared/supabase');
const { normalizeLeadClientInfo } = require('../_shared/lead-client-info');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const { name, phone, tags, notes, source, owner_id } = req.body;

    console.log('[from-whatsapp-extension] Requisição recebida');

    if (!name || !phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({ ok: false, error: 'name e phone são obrigatórios' })
      );
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');


    const ownerId = owner_id || process.env.DEFAULT_OWNER_ID;
    if (!ownerId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({ ok: false, error: 'owner_id obrigatório. Configure DEFAULT_OWNER_ID no .env.' })
      );
    }


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
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: false,
          action: 'duplicate',
          error: 'Número já cadastrado no CRM. Edite esse lead diretamente no CRM ou use outro número para criar um novo cadastro.',
          lead: existingLead,
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
