const { supabase } = require('../../../api/_shared/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE' && req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const id = req.query?.id || req.body?.id;
    const ids = req.body?.ids;

    if (!id && (!ids || !Array.isArray(ids) || ids.length === 0)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'id ou ids (array) é obrigatório' }));
    }

    if (ids && Array.isArray(ids)) {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids)
        .select('*');

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, count: data?.length || 0 }));
    } else {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .select('*');

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      if (!data || data.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Lead não encontrado ou sem permissão' }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
