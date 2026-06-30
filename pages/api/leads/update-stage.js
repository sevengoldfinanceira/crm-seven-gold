const { supabase } = require('../../../api/_shared/supabase');
const { hasBasicLeadInfo, hasLeadClientInfo, normalizeBasicLeadInfo, normalizeLeadClientInfo } = require('../../../api/_shared/lead-client-info');
const { getAuthorizedCrmUser, canAccessLead } = require('../../../api/_shared/crm-authorization');

const ALLOWED_STATUSES = [
  "lead_recebido",
  "primeiro_contato",
  "agendamento",
  "cliente_em_loja",
  "proposta_enviada",
  "venda_fechada"
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'PATCH') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
  }

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      res.writeHead(authorization.status, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: authorization.error }));
    }

    const payload = req.body || {};
    const { phone, status } = payload;

    if (!phone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'O campo phone é obrigatório' }));
    }

    if (!status && !hasLeadClientInfo(payload) && !hasBasicLeadInfo(payload)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Informe a etapa ou os dados do lead que serão atualizados.' }));
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Etapa inválida para o funil.' }));
    }

    const basicInfo = normalizeBasicLeadInfo(payload);
    if (Object.prototype.hasOwnProperty.call(basicInfo, 'name') && !basicInfo.name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'O nome do lead é obrigatório.' }));
    }
    if (Object.prototype.hasOwnProperty.call(basicInfo, 'telefone') && basicInfo.telefone.length < 10) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Telefone inválido.' }));
    }

    const normalizedPhone = String(phone).replace(/\D/g, '');

    const { data: fetchLead, error: fetchError } = await supabase
      .from('leads')
      .select('id, name, telefone, assigned_to_email')
      .eq('telefone', normalizedPhone)
      .limit(1);

    if (fetchError) {
      console.error('Error searching lead for stage update');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
    }

    if (!fetchLead || fetchLead.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Lead não encontrado.' }));
    }

    const leadId = fetchLead[0].id;
    const updateTime = new Date().toISOString();
    const updateData = {
      ...basicInfo,
      ...normalizeLeadClientInfo(payload, { onlyPresent: true }),
    };
    if (status) {
      updateData.status = status;
      updateData.ultima_interacao = updateTime;
    }

    if (!canAccessLead(authorization.user, fetchLead[0])) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Você não pode alterar leads atribuídos a outro responsável.' }));
    }

    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select('id, name, telefone, status, origin, note, property_region, credit_value, down_payment_value, installment_value, ultima_interacao');

    if (updateError) {
      console.error('Error executing stage update on lead');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
    }

    const result = updatedLead[0];
    const responsePayload = {
      ok: true,
      lead: {
        id: result.id,
        name: result.name,
        telefone: result.telefone,
        status: result.status,
        origin: result.origin,
        note: result.note,
        property_region: result.property_region,
        credit_value: result.credit_value,
        down_payment_value: result.down_payment_value,
        installment_value: result.installment_value,
        updated_at: result.ultima_interacao,
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(responsePayload));
  } catch (err) {
    console.error('Internal server error in update-stage handler');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: false, error: 'Erro ao atualizar etapa do lead.' }));
  }
};
