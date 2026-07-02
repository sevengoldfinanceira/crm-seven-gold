const { supabase } = require('../_shared/supabase');
const { hasBasicLeadInfo, hasLeadClientInfo, normalizeBasicLeadInfo, normalizeLeadClientInfo } = require('../_shared/lead-client-info');
const { getAuthorizedCrmUser, canAccessLead } = require('../_shared/crm-authorization');

const PIPELINE_SEQUENCE = [
  "lead_recebido",
  "primeiro_contato",
  "agendamento",
  "cliente_em_loja",
  "proposta_enviada",
  "venda_fechada"
];
const ALLOWED_STATUSES = [...PIPELINE_SEQUENCE, "cancelado"];

const getNextPipelineStatus = (status) => {
  const currentIndex = PIPELINE_SEQUENCE.indexOf(status);
  return currentIndex >= 0 ? PIPELINE_SEQUENCE[currentIndex + 1] || null : null;
};

const getPreviousPipelineStatus = (status) => {
  const currentIndex = PIPELINE_SEQUENCE.indexOf(status);
  return currentIndex > 0 ? PIPELINE_SEQUENCE[currentIndex - 1] : null;
};

const canMoveToPipelineStatus = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) return true;
  if (currentStatus === 'cancelado') return false;
  if (targetStatus === 'cancelado') return true;
  return targetStatus === getNextPipelineStatus(currentStatus);
};

const canGoBackPipelineStatus = (currentStatus) => {
  if (currentStatus === 'cancelado') return false;
  return getPreviousPipelineStatus(currentStatus) !== null;
};

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
    const goBack = payload.go_back === true || payload.goBack === true;
    const leadIdFromPayload = String(payload.lead_id || payload.leadId || '').trim();

    if (!phone && !leadIdFromPayload) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Informe o ID ou telefone do lead.' }));
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

    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    let fetchLeadQuery = supabase
      .from('leads')
      .select('id, name, telefone, status, assigned_to_email');
    fetchLeadQuery = leadIdFromPayload
      ? fetchLeadQuery.eq('id', leadIdFromPayload)
      : fetchLeadQuery.eq('telefone', normalizedPhone);
    const { data: fetchLead, error: fetchError } = await fetchLeadQuery.limit(1);

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
    if (Object.prototype.hasOwnProperty.call(payload, 'tags')) {
      updateData.tags = Array.isArray(payload.tags)
        ? payload.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
        : [];
    }
    if (status) {
      updateData.status = status;
      updateData.ultima_interacao = updateTime;
      updateData.updated_at = updateTime;
      updateData.updated_by_email = authorization.user.email || null;
      updateData.updated_by_name = authorization.user.nome || authorization.user.email || null;
    }

    if (!canAccessLead(authorization.user, fetchLead[0])) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Você não pode alterar leads atribuídos a outro responsável.' }));
    }

    const previousStatus = fetchLead[0].status;
    if (status && goBack) {
      if (!canGoBackPipelineStatus(previousStatus)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: false,
          error: 'Este lead não pode voltar uma etapa.',
        }));
      }
      const prevStatus = getPreviousPipelineStatus(previousStatus);
      if (status !== prevStatus) {
        const prevLabel = prevStatus ? prevStatus.replace(/_/g, ' ') : 'nenhuma etapa';
        res.writeHead(409, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: false,
          error: `A etapa anterior válida é: ${prevLabel}.`,
        }));
      }
    } else if (status && !canMoveToPipelineStatus(previousStatus, status)) {
      const nextStatus = getNextPipelineStatus(previousStatus);
      const nextLabel = nextStatus ? nextStatus.replace(/_/g, ' ') : 'nenhuma etapa';
      res.writeHead(409, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: false,
        error: previousStatus === 'cancelado'
          ? 'Um lead cancelado não pode retornar ao funil.'
          : `Este lead só pode avançar para a próxima etapa: ${nextLabel}, ou ser cancelado.`,
      }));
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

    if (status && previousStatus !== status && goBack) {
      const { data: forwardEvents, error: historyLookupError } = await supabase
        .from('lead_activity_logs')
        .select('id')
        .eq('lead_id', leadId)
        .in('action_type', ['status_changed', 'stage_changed'])
        .eq('old_value', status)
        .eq('new_value', previousStatus)
        .order('created_at', { ascending: false })
        .limit(1);

      let undoHistoryError = historyLookupError;
      if (!undoHistoryError && forwardEvents?.[0]?.id) {
        const { error: deleteHistoryError } = await supabase
          .from('lead_activity_logs')
          .delete()
          .eq('id', forwardEvents[0].id);
        undoHistoryError = deleteHistoryError;
      }

      if (undoHistoryError) {
        await supabase
          .from('leads')
          .update({ status: previousStatus, ultima_interacao: updateTime, updated_at: updateTime })
          .eq('id', leadId);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Não foi possível desfazer a etapa com segurança.' }));
      }
    } else if (status && previousStatus !== status) {
      const { error: historyError } = await supabase.from('lead_activity_logs').insert({
        lead_id: leadId,
        action_type: 'status_changed',
        action_label: 'Etapa alterada',
        description: `Etapa alterada de ${previousStatus || 'sem etapa'} para ${status}.`,
        old_value: previousStatus || null,
        new_value: status,
        created_by_email: authorization.user.email || null,
        created_by_name: authorization.user.nome || authorization.user.email || null,
        created_by_role: authorization.user.cargo || null,
        created_at: updateTime,
      });
      if (historyError) console.error('Error logging lead stage update');
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
