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

      const { lead_id, lead_nome, type, scheduled_at } = payload;

      if (!lead_id || !lead_nome || !type || !scheduled_at) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Campos obrigatórios ausentes' }));
      }

      // Buscar informações do responsável do lead
      const { data: lead } = await supabase
        .from('leads')
        .select('assigned_to_email, assigned_to_name, team_id')
        .eq('id', lead_id)
        .maybeSingle();

      const assigned_to_email = lead?.assigned_to_email || payload.assigned_to_email || null;
      const assigned_to_name = lead?.assigned_to_name || payload.assigned_to_name || null;
      const team_id = lead?.team_id || null;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          lead_id,
          lead_nome,
          lead_telefone: payload.lead_telefone || null,
          type,
          scheduled_at,
          title: payload.title || null,
          whatsapp_message: payload.whatsapp_message || null,
          internal_note: payload.internal_note || null,
          status: 'pending',
          assigned_to_email,
          assigned_to_name,
          team_id,
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error inserting task:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, task: data }));
    });
  } catch (err) {
    console.error('Internal server error in create task handler:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro interno do servidor' }));
  }
};
