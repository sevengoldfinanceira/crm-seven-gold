const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { lead_id, status } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (lead_id) {
      query = query.eq('lead_id', lead_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks (pages):', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, tasks: data || [] });
  } catch (err) {
    console.error('Internal server error in pages list tasks handler:', err);
    return res.status(500).json({ ok: false, error: 'Erro interno do servidor' });
  }
};
