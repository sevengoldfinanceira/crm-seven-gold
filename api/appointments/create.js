const { supabase } = require('../_shared/supabase');
const { getAuthorizedCrmUser, canAccessLead } = require('../_shared/crm-authorization');

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return sendJson(res, authorization.status, { ok: false, error: authorization.error });
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
      return sendJson(res, 400, { ok: false, error: 'Campos obrigatórios ausentes.' });
    }

    if (leadId) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id,name,telefone,assigned_to_email,assigned_to_name')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError) return sendJson(res, 500, { ok: false, error: 'Erro ao validar o lead.' });
      if (!lead) return sendJson(res, 404, { ok: false, error: 'Lead não encontrado.' });
      if (!canAccessLead(authorization.user, lead)) {
        return sendJson(res, 403, { ok: false, error: 'Você não pode agendar este lead.' });
      }

      clientName = lead.name || clientName;
      clientPhone = String(lead.telefone || clientPhone || '').replace(/\D/g, '') || null;
      assignedEmail = lead.assigned_to_email || assignedEmail;
      assignedName = lead.assigned_to_name || assignedName;
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        lead_id: leadId,
        nome_cliente: clientName,
        telefone_cliente: clientPhone,
        usuario_id: authorization.user.auth_user_id,
        nome_usuario: assignedName,
        assigned_to_email: assignedEmail,
        assigned_to_name: assignedName,
        data_agendamento: appointmentDate,
        hora_agendamento: appointmentTime,
        observacao: String(payload.observacao || '').trim() || null,
        status: 'agendado',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Appointments API] Error inserting appointment:', error);
      return sendJson(res, 500, { ok: false, error: `Não foi possível salvar o agendamento: ${error.message || error.details || 'erro desconhecido'}` });
    }

    return sendJson(res, 200, { ok: true, appointment: data });
  } catch (error) {
    console.error('[Appointments API] Internal server error:', error);
    return sendJson(res, 500, { ok: false, error: `Erro interno ao salvar o agendamento: ${error.message || 'detalhes indisponíveis'}` });
  }
};
