const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'PATCH') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const { phone, status } = req.body || {};

    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'O campo phone é obrigatório' }));
    }

    if (!status) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'O campo status é obrigatório' }));
    }

    const normalizedPhone = String(phone).replace(/\D/g, '');

    const { data: fetchLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, telefone')
      .eq('telefone', normalizedPhone)
      .limit(1);

    if (fetchError) {
      console.error('Error searching lead for stage update');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
    }

    if (!fetchLead || fetchLead.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Lead não encontrado.' }));
    }

    const leadId = fetchLead[0].id;
    const updateTime = new Date().toISOString();

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: status,
        ultima_interacao: updateTime
      })
      .eq('id', leadId)
      .select('id, name, telefone, status');

    if (updateError) {
      console.error('Error executing stage update on lead');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
    }

    const result = updatedLead[0];
    const responsePayload = {
      ok: true,
      lead: {
        id: result.id,
        name: result.name,
        telefone: result.telefone,
        status: result.status,
        updated_at: updateTime,
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(responsePayload));
  } catch (err) {
    console.error('Internal server error in update-stage handler');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
  }
};
