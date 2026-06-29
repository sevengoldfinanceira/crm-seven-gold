const { supabase } = require('../_shared/supabase');

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
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Invalid JSON payload' }));
      }

      const { lead_id, nome_cliente, data_agendamento, hora_agendamento, observacao } = payload;

      if (!lead_id || !nome_cliente || !data_agendamento || !hora_agendamento) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Campos obrigatórios ausentes' }));
      }

      // Buscar informações do responsável do lead
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to_email, assigned_to_name')
        .eq('id', lead_id)
        .maybeSingle();

      const assigned_to_email = lead?.assigned_to_email || payload.assigned_to_email || null;
      const assigned_to_name = lead?.assigned_to_name || payload.assigned_to_name || null;

      // Inserir no Supabase usando service role (bypassa RLS)
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          lead_id,
          nome_cliente,
          telefone_cliente: payload.telefone_cliente || null,
          nome_usuario: payload.nome_usuario || 'Extensão WhatsApp',
          data_agendamento,
          hora_agendamento,
          observacao: observacao || null,
          status: 'agendado',
          assigned_to_email,
          assigned_to_name
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting appointment:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, appointment: data }));
    });
  } catch (err) {
    console.error('Internal server error in create appointment handler:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro interno do servidor' }));
  }
};
