const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];

    console.log('[WhatsApp Webhook] GET verification', { mode, token });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Token verification failed');
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
        return res.status(200).send('EVENT_RECEIVED');
      }

      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (!message || message.type !== 'text') {
        return res.status(200).send('EVENT_RECEIVED');
      }

      const telefone = message.from;
      const texto = message.text?.body || '';

      console.log('[WhatsApp Webhook] Mensagem recebida:', { telefone, texto });

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
        const ownerId = process.env.WHATSAPP_DEFAULT_OWNER_ID;

        if (!ownerId) {
          console.warn('[WhatsApp Webhook] WHATSAPP_DEFAULT_OWNER_ID não configurado');
        } else {
          const { data: newLead, error: insertError } = await supabase
            .from('leads')
          .insert({
            name: `WhatsApp ${telefone}`,
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

    return res.status(200).send('EVENT_RECEIVED');
  }

  res.status(405).send('Method not allowed');
};
