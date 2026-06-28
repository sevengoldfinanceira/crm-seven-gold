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
    const phone = req.query?.phone;

    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'phone query parameter is required' }));
    }

    const normalizedPhone = String(phone).replace(/\D/g, '');

    const { data, error } = await supabase
      .from('leads')
      .select('id, name, telefone, status, tags, note, origin, created_at, ultima_interacao, property_region, credit_value, down_payment_value, installment_value')
      .eq('telefone', normalizedPhone)
      .limit(1);

    if (error) {
      console.error('Error fetching lead by phone');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao buscar lead pelo telefone.' }));
    }

    if (!data || data.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, found: false, lead: null }));
    }

    const lead = data[0];
    const responsePayload = {
      ok: true,
      found: true,
      lead: {
        id: lead.id,
        name: lead.name,
        telefone: lead.telefone,
        status: lead.status,
        tags: lead.tags || [],
        note: lead.note,
        origin: lead.origin,
        created_at: lead.created_at,
        ultima_interacao: lead.ultima_interacao,
        property_region: lead.property_region,
        credit_value: lead.credit_value,
        down_payment_value: lead.down_payment_value,
        installment_value: lead.installment_value,
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(responsePayload));
  } catch (err) {
    console.error('Internal server error in by-phone handler');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro ao buscar lead pelo telefone.' }));
  }
};
