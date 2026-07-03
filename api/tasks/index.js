const { supabase } = require('../../lib/server/supabase');

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return send(res, 200, {});

  try {
    if (req.method === 'GET') {
      const { lead_id, status } = req.query;
      let query = supabase.from('tasks').select('*').order('scheduled_at', { ascending: true });
      if (lead_id) query = query.eq('lead_id', lead_id);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching tasks:', error);
        return send(res, 500, { ok: false, error: error.message });
      }
      return send(res, 200, { ok: true, tasks: data || [] });
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      await new Promise((resolve, reject) => {
        req.on('end', resolve);
        req.on('error', reject);
      });
      let payload;
      try { payload = JSON.parse(body); } catch (e) {
        return send(res, 400, { ok: false, error: 'Invalid JSON payload' });
      }
      const { lead_id, lead_nome, type, scheduled_at } = payload;
      if (!lead_id || !lead_nome || !type || !scheduled_at) {
        return send(res, 400, { ok: false, error: 'Campos obrigatórios ausentes' });
      }
      const { data: lead } = await supabase.from('leads').select('assigned_to_email, assigned_to_name').eq('id', lead_id).maybeSingle();
      const assigned_to_email = lead?.assigned_to_email || payload.assigned_to_email || null;
      const assigned_to_name = lead?.assigned_to_name || payload.assigned_to_name || null;
      const { data, error } = await supabase.from('tasks').insert({
        lead_id, lead_nome, lead_telefone: payload.lead_telefone || null, type, scheduled_at,
        title: payload.title || null, whatsapp_message: payload.whatsapp_message || null,
        internal_note: payload.internal_note || null, status: 'pending',
        assigned_to_email, assigned_to_name,
      }).select('*').single();
      if (error) {
        console.error('Error inserting task:', error);
        return send(res, 500, { ok: false, error: error.message });
      }
      return send(res, 200, { ok: true, task: data });
    }

    if (req.method === 'PATCH') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      await new Promise((resolve, reject) => {
        req.on('end', resolve);
        req.on('error', reject);
      });
      let payload;
      try { payload = JSON.parse(body); } catch (e) {
        return send(res, 400, { ok: false, error: 'Invalid JSON payload' });
      }
      const { id, status } = payload;
      if (!id || !status) {
        return send(res, 400, { ok: false, error: 'Campos obrigatórios ausentes' });
      }
      const { data, error } = await supabase.from('tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
      if (error) {
        console.error('Error updating task:', error);
        return send(res, 500, { ok: false, error: error.message });
      }
      return send(res, 200, { ok: true, task: data });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Internal server error in tasks handler:', err);
    return send(res, 500, { ok: false, error: 'Erro interno do servidor' });
  }
};
