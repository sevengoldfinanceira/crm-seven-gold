const { supabase } = require('../_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // -----------------------------------------------------------
  // GET - Validação do webhook (chamado pela Meta na configuração)
  // -----------------------------------------------------------
  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];

    console.log('[WhatsApp Webhook] GET verification', { mode, token });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(String(challenge));
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Token verification failed');
  }

  // -----------------------------------------------------------
  // POST - Receber mensagens e eventos do WhatsApp
  // -----------------------------------------------------------
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Ignorar status updates (mensagem entregue, lida, etc.)
      if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('EVENT_RECEIVED');
      }

      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      // Se não tiver mensagem de texto, apenas retorna OK
      if (!message || message.type !== 'text') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('EVENT_RECEIVED');
      }

      const telefone = message.from;
      const texto = message.text?.body || '';

      console.log('[WhatsApp Webhook] Mensagem recebida:', { telefone, texto });

      // -------------------------------------------------------
      // Buscar lead existente pelo telefone
      // -------------------------------------------------------
      const { data: existingLead, error: selectError } = await supabase
        .from('leads')
        .select('id')
        .eq('telefone', telefone)
        .maybeSingle();

      if (selectError) {
        console.error('[WhatsApp Webhook] Erro ao buscar lead:', selectError);
      }

      let leadId;

      if (existingLead) {
        // -------------------------------------------------------
        // Lead já existe: atualizar ultima_interacao e opt_in
        // -------------------------------------------------------
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            ultima_interacao: new Date().toISOString(),
            opt_in: true,
          })
          .eq('id', existingLead.id);

        if (updateError) {
          console.error('[WhatsApp Webhook] Erro ao atualizar lead:', updateError);
        }

        leadId = existingLead.id;
      } else {
        // -------------------------------------------------------
        // Lead novo: verificar owner_id antes de criar
        // -------------------------------------------------------
        const ownerId = process.env.WHATSAPP_DEFAULT_OWNER_ID;

        if (!ownerId) {
          console.warn('[WhatsApp Webhook] WHATSAPP_DEFAULT_OWNER_ID não configurado');
        } else {
          const { data: newLead, error: insertError } = await supabase
            .from('leads')
            .insert({
              telefone,
              owner_id: ownerId,
              interesse: 'Lead via WhatsApp',
              opt_in: true,
              ultima_interacao: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[WhatsApp Webhook] Erro ao criar lead:', insertError);
          }

          leadId = newLead?.id;
        }
      }

      // -------------------------------------------------------
      // Salvar mensagem recebida na tabela messages
      // -------------------------------------------------------
      if (leadId) {
        const { error: msgError } = await supabase.from('messages').insert({
          lead_id: leadId,
          telefone,
          direcao: 'entrada',
          mensagem: texto,
          origem: 'whatsapp',
        });

        if (msgError) {
          console.error('[WhatsApp Webhook] Erro ao salvar mensagem:', msgError);
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Erro inesperado:', err);
    }

    // Sempre retorna 200 para a Meta não reenviar
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('EVENT_RECEIVED');
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
};
