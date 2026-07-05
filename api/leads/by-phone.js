const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser, canAccessLead } = require('../../lib/server/crm-authorization');
const { findDuplicateLeadForSeller, normalizePhone } = require('../../lib/server/lead-duplicates');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      res.writeHead(authorization.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: authorization.error }));
    }

    const phone = req.query?.phone;

    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'phone query parameter is required' }));
    }

    let lead = null;
    try {
      lead = await findDuplicateLeadForSeller({
        supabase,
        phone: normalizePhone(phone),
        assignedToEmail: authorization.user.email,
      });
    } catch (error) {
      console.error('Error fetching lead by phone');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao buscar lead pelo telefone.' }));
    }

    if (!lead) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, found: false, lead: null }));
    }

    if (!canAccessLead(authorization.user, lead)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        found: false,
        assigned_elsewhere: true,
        responsible: {
          name: lead.assigned_to_name || lead.created_by_name || 'Sem responsável',
          email: lead.assigned_to_email || lead.created_by_email || null,
        },
      }));
    }

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
        assigned_to_email: lead.assigned_to_email,
        assigned_to_name: lead.assigned_to_name,
        created_by_email: lead.created_by_email,
        created_by_name: lead.created_by_name,
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
