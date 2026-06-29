const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { lead_id, lead_nome, type, scheduled_at } = req.body;

    if (!lead_id || !lead_nome || !type || !scheduled_at) {
      return res.status(400).json({ ok: false, error: 'Campos obrigatórios ausentes' });
    }

    // Buscar informações do responsável do lead
    const { data: lead } = await supabase
      .from('leads')
      .select('assigned_to_email, assigned_to_name')
      .eq('id', lead_id)
      .maybeSingle();

    const assigned_to_email = lead?.assigned_to_email || req.body.assigned_to_email || null;
    const assigned_to_name = lead?.assigned_to_name || req.body.assigned_to_name || null;

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        lead_id,
        lead_nome,
        lead_telefone: req.body.lead_telefone || null,
        type,
        scheduled_at,
        title: req.body.title || null,
        whatsapp_message: req.body.whatsapp_message || null,
        internal_note: req.body.internal_note || null,
        status: 'pending',
        assigned_to_email,
        assigned_to_name
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error inserting task (pages):', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, task: data });
  } catch (err) {
    console.error('Internal server error in pages create task handler:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
};
