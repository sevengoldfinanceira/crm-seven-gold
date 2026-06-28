const { supabase } = require('../_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const { start, end } = req.query || {};

    if (!start || !end) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'start and end parameters are required' }));
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('id, lead_id, nome_cliente, telefone_cliente, usuario_id, nome_usuario, data_agendamento, hora_agendamento, observacao, status, created_at, updated_at')
      .gte('data_agendamento', start)
      .lte('data_agendamento', end)
      .neq('status', 'cancelado')
      .order('data_agendamento', { ascending: true })
      .order('hora_agendamento', { ascending: true });

    if (error) {
      console.error('[Appointments API] Error querying database');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao buscar agendamentos.' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, appointments: data || [] }));
  } catch (err) {
    console.error('[Appointments API] Internal server error');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro interno do servidor.' }));
  }
};
