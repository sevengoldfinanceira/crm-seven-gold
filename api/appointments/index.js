const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser, canAccessLead } = require('../../lib/server/crm-authorization');
const { assertLeadMutable } = require('../../lib/server/commercial-productions');

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return send(res, 200, {});

  try {
    if (req.method === 'GET') {
      const { start, end } = req.query || {};
      if (!start || !end) {
        return send(res, 400, { ok: false, error: 'start and end parameters are required' });
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
        return send(res, 500, { ok: false, error: 'Erro ao buscar agendamentos.' });
      }
      return send(res, 200, { ok: true, appointments: data || [] });
    }

    if (req.method === 'POST') {
      const authorization = await getAuthorizedCrmUser(req);
      if (authorization.error) {
        return send(res, authorization.status, { ok: false, error: authorization.error });
      }
      const payload = req.body || {};
      const leadId = String(payload.lead_id || '').trim() || null;
      const appointmentDate = String(payload.data_agendamento || '').trim();
      const appointmentTime = String(payload.hora_agendamento || '').trim();
      let clientName = String(payload.nome_cliente || '').trim();
      let clientPhone = String(payload.telefone_cliente || '').replace(/\D/g, '') || null;
      let assignedEmail = authorization.user.email;
      let assignedName = authorization.user.nome || authorization.user.email;

      if (!clientName || !appointmentDate || !appointmentTime) {
        return send(res, 400, { ok: false, error: 'Campos obrigatórios ausentes.' });
      }

      if (leadId) {
        const mutable = await assertLeadMutable(leadId);
        if (mutable.error) return send(res, mutable.status || 500, { ok: false, error: mutable.error });
        const { data: lead, error: leadError } = await supabase
          .from('leads').select('id,name,telefone,assigned_to_email,assigned_to_name').eq('id', leadId).maybeSingle();
        if (leadError) return send(res, 500, { ok: false, error: 'Erro ao validar o lead.' });
        if (!lead) return send(res, 404, { ok: false, error: 'Lead não encontrado.' });
        if (!canAccessLead(authorization.user, lead)) {
          return send(res, 403, { ok: false, error: 'Você não pode agendar este lead.' });
        }
        clientName = lead.name || clientName;
        clientPhone = String(lead.telefone || clientPhone || '').replace(/\D/g, '') || null;
        assignedEmail = lead.assigned_to_email || assignedEmail;
        assignedName = lead.assigned_to_name || assignedName;
      }

      const basePayload = {
        lead_id: leadId, nome_cliente: clientName, telefone_cliente: clientPhone,
        usuario_id: authorization.user.auth_user_id, nome_usuario: assignedName,
        data_agendamento: appointmentDate, hora_agendamento: appointmentTime,
        observacao: String(payload.observacao || '').trim() || null, status: 'agendado',
      };

      // Tentar inserir com assigned_to_* columns primeiro
      let result = await supabase.from('appointments').insert({
        ...basePayload, assigned_to_email: assignedEmail, assigned_to_name: assignedName,
      }).select('*').single();

      if (result.error && /assigned_to_(email|name)/i.test(result.error.message || '') && result.error.code === 'PGRST204') {
        console.warn('[Appointments API] Colunas assigned_to_* ausentes na tabela appointments; inserindo sem elas.');
        result = await supabase.from('appointments').insert(basePayload).select('*').single();
      }

      if (result.error) {
        console.error('[Appointments API] Error inserting appointment:', result.error);
        return send(res, 500, { ok: false, error: 'Não foi possível salvar o agendamento.' });
      }
      return send(res, 200, { ok: true, appointment: result.data });
    }

    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('[Appointments API] Internal server error:', error);
    return send(res, 500, { ok: false, error: 'Erro interno ao salvar o agendamento.' });
  }
};
