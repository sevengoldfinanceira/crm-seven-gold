const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser } = require('../../lib/server/crm-authorization');
const { isDirectorCeo, getOpenProduction, assertLeadMutable, isProductionSchemaError } = require('../../lib/server/commercial-productions');
const { ensureLeadIsNotDuplicateForSeller, normalizePhone, mapDuplicateDbError } = require('../../lib/server/lead-duplicates');

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(body)); };
const monthName = (month, year) => `${new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))).replace(/^./, c => c.toUpperCase())}/${year}`;
const monthRange = (month, year) => ({ starts_at: `${year}-${String(month).padStart(2, '0')}-01`, ends_at: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10) });

const CARRY_OVER_EXCLUDED = ['cancelado', 'venda_fechada'];
const PIPELINE_STATUSES = [
  'lead_recebido',
  'primeiro_contato',
  'agendamento',
  'cliente_em_loja',
  'proposta_enviada',
  'venda_fechada',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return send(res, 200, { ok: true });
  const auth = await getAuthorizedCrmUser(req);
  if (auth.error) return send(res, auth.status, { ok: false, error: auth.error });
  const ceo = isDirectorCeo(auth.user);
  try {
    if (req.method === 'GET') {
      let query = supabase.from('commercial_productions').select('*').order('starts_at', { ascending: false });
      if (!ceo) query = query.eq('status', 'open').limit(1);
      const { data, error } = await query;
      if (error?.code === 'PGRST205') return send(res, 200, { ok: true, setupRequired: true, isDirectorCeo: ceo, productions: [] });
      if (error) return send(res, 500, { ok: false, error: error.message });
      return send(res, 200, { ok: true, isDirectorCeo: ceo, productions: data || [] });
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'Method not allowed' });
    if (!ceo) return send(res, 403, { ok: false, error: 'Somente o DIRETOR-CEO pode gerenciar produções.' });

    const { action, production_id, lead_id } = req.body || {};

    if (action === 'preview_close') {
      if (!production_id) return send(res, 400, { ok: false, error: 'Produção não informada.' });
      const { data: prod, error: prodError } = await supabase.from('commercial_productions').select('*').eq('id', production_id).maybeSingle();
      if (prodError || !prod) return send(res, 404, { ok: false, error: 'Produção não encontrada.' });
      if (prod.status === 'closed') return send(res, 409, { ok: false, error: 'Produção já está encerrada.' });
      const { data: leads, error: leadsError } = await supabase.from('leads').select('id,status,telefone,assigned_to_email').eq('production_id', production_id);
      if (leadsError) return send(res, 500, { ok: false, error: leadsError.message });
      const allLeads = leads || [];
      const total = allLeads.length;
      const lixeira = allLeads.filter(l => l.status === 'cancelado').length;
      const vendaFechada = allLeads.filter(l => l.status === 'venda_fechada').length;
      const continuaveis = allLeads.filter(l => !CARRY_OVER_EXCLUDED.includes(l.status)).length;
      let duplicados = 0;
      const nextMonth = prod.month === 12 ? 1 : prod.month + 1;
      const nextYear = prod.month === 12 ? prod.year + 1 : prod.year;
      const { data: nextProd } = await supabase.from('commercial_productions').select('id').eq('year', nextYear).eq('month', nextMonth).maybeSingle();
      if (nextProd?.id) {
        const { data: nextLeads } = await supabase.from('leads').select('telefone,assigned_to_email,status').eq('production_id', nextProd.id).neq('status', 'cancelado');
        const nextKeys = new Set((nextLeads || []).map(l => {
          const phone = normalizePhone(l.telefone);
          const seller = String(l.assigned_to_email || '').trim().toLowerCase();
          return phone && seller ? `${seller}:${phone}` : null;
        }).filter(Boolean));
        const carryLeads = allLeads.filter(l => !CARRY_OVER_EXCLUDED.includes(l.status));
        duplicados = carryLeads.filter(l => {
          const phone = normalizePhone(l.telefone);
          const seller = String(l.assigned_to_email || '').trim().toLowerCase();
          return phone && seller && nextKeys.has(`${seller}:${phone}`);
        }).length;
      }
      return send(res, 200, { ok: true, preview: { production: prod, total, lixeira, vendaFechada, continuaveis, duplicados, seraoCriados: continuaveis - duplicados } });
    }

    if (action === 'close') {
      const { data, error } = await supabase.rpc('close_commercial_production', { target_id: production_id, actor_id: auth.user.auth_user_id });
      if (error) return send(res, 409, { ok: false, error: error.message });
      return send(res, 200, { ok: true, production: data });
    }

    if (action === 'start_next') {
      const open = await getOpenProduction();
      if (open.production) return send(res, 409, { ok: false, error: 'Já existe uma produção aberta.' });
      const { data: latest, error: latestError } = await supabase.from('commercial_productions').select('month,year').order('starts_at', { ascending: false }).limit(1).maybeSingle();
      if (latestError) return send(res, 500, { ok: false, error: latestError.message });
      const base = latest ? new Date(Date.UTC(latest.year, latest.month, 1)) : new Date();
      const month = base.getUTCMonth() + 1, year = base.getUTCFullYear();
      const range = monthRange(month, year);
      const { data, error } = await supabase.from('commercial_productions').insert({ name: monthName(month, year), month, year, ...range, status: 'open', created_by: auth.user.auth_user_id }).select('*').single();
      if (error) return send(res, 409, { ok: false, error: error.message });
      return send(res, 200, { ok: true, production: data });
    }

    if (action === 'copy_lead') {
      const open = await getOpenProduction();
      if (!open.production) return send(res, 409, { ok: false, error: 'Não existe produção aberta.' });
      const { data: source, error: sourceError } = await supabase.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (sourceError || !source) return send(res, 404, { ok: false, error: 'Lead original não encontrado.' });
      try {
        await ensureLeadIsNotDuplicateForSeller({
          supabase,
          phone: source.telefone,
          assignedToEmail: source.assigned_to_email,
        });
      } catch (duplicateError) {
        return send(res, duplicateError.status || 500, { ok: false, error: duplicateError.message });
      }
      const { id, created_at, updated_at, ultima_interacao, locked_at, locked_reason, production_id: ignored, production_month: ignoredMonth, production_year: ignoredYear, carried_from_lead_id: ignoredCarry1, carried_from_production_id: ignoredCarry2, is_carry_over: ignoredCarry3, carried_over_at: ignoredCarry4, ...copy } = source;
      const { data, error } = await supabase.from('leads').insert({ ...copy, original_lead_id: id, carried_from_lead_id: id, carried_from_production_id: source.production_id, is_carry_over: true, carried_over_at: new Date().toISOString(), created_by_email: auth.user.email, created_by_name: auth.user.nome || auth.user.email }).select('*').single();
      if (error) return send(res, 409, { ok: false, error: mapDuplicateDbError(error) || error.message });
      return send(res, 200, { ok: true, lead: data });
    }

    if (action === 'recover_trash') {
      const { data: source, error: sourceError } = await supabase.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (sourceError || !source) return send(res, 404, { ok: false, error: 'Lead não encontrado.' });
      if (source.status !== 'cancelado') return send(res, 409, { ok: false, error: 'Este lead não está na Lixeira.' });

      const mutable = await assertLeadMutable(lead_id);
      if (mutable.error) return send(res, mutable.status || 500, { ok: false, error: mutable.error });

      const { data: cancellationEvents, error: cancellationError } = await supabase
        .from('lead_activity_logs')
        .select('old_value,created_at')
        .eq('lead_id', lead_id)
        .in('action_type', ['status_changed', 'stage_changed'])
        .eq('new_value', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancellationError) return send(res, 500, { ok: false, error: cancellationError.message });

      const originStatus = String(cancellationEvents?.[0]?.old_value || '').trim();
      const restoredStatus = PIPELINE_STATUSES.includes(originStatus) ? originStatus : 'lead_recebido';
      const updateTime = new Date().toISOString();
      const targetAssigneeEmail = String(req.body?.assigned_to_email || source.assigned_to_email || '').trim().toLowerCase();
      let targetAssignee = null;
      if (req.body?.assigned_to_email && targetAssigneeEmail !== String(source.assigned_to_email || '').trim().toLowerCase()) {
        const { data: assignee, error: assigneeError } = await supabase
          .from('crm_users')
          .select('email,nome,cargo,ativo')
          .ilike('email', targetAssigneeEmail)
          .eq('ativo', true)
          .maybeSingle();
        if (assigneeError || !assignee) return send(res, 400, { ok: false, error: 'Responsável inválido ou inativo.' });
        targetAssignee = assignee;
      }

      try {
        await ensureLeadIsNotDuplicateForSeller({
          supabase,
          phone: source.telefone,
          assignedToEmail: targetAssigneeEmail,
          ignoreLeadId: lead_id,
          recovering: true,
        });
      } catch (duplicateError) {
        return send(res, duplicateError.status || 500, { ok: false, error: duplicateError.message });
      }

      const { data, error } = await supabase
        .from('leads')
        .update({
          status: restoredStatus,
          ...(targetAssignee ? {
            assigned_to_email: String(targetAssignee.email || '').trim().toLowerCase(),
            assigned_to_name: targetAssignee.nome || targetAssignee.email,
          } : {}),
          ultima_interacao: updateTime,
          updated_at: updateTime,
          updated_by_email: auth.user.email || null,
          updated_by_name: auth.user.nome || auth.user.email || null,
        })
        .eq('id', lead_id)
        .select('*')
        .single();
      if (error) return send(res, 409, { ok: false, error: mapDuplicateDbError(error) || error.message });

      const { error: historyError } = await supabase.from('lead_activity_logs').insert({
        lead_id,
        action_type: 'status_changed',
        action_label: 'Lead recuperado',
        description: `Lead recuperado da Lixeira para ${restoredStatus}.`,
        old_value: 'cancelado',
        new_value: restoredStatus,
        created_by_email: auth.user.email || null,
        created_by_name: auth.user.nome || auth.user.email || null,
        created_by_role: auth.user.cargo || null,
        created_at: updateTime,
      });
      if (historyError) console.error('[Productions] Erro ao registrar recuperação do lead:', historyError.message);

      return send(res, 200, { ok: true, lead: data });
    }

    if (action === 'recover_trash_as_new') {
      const { data: source, error: sourceError } = await supabase.from('leads').select('*').eq('id', lead_id).maybeSingle();
      if (sourceError || !source) return send(res, 404, { ok: false, error: 'Lead não encontrado.' });
      if (source.status !== 'cancelado') return send(res, 409, { ok: false, error: 'Este lead não está na Lixeira.' });
      if (source.trash_forwarded_lead_id || source.trash_forwarded_at) {
        return send(res, 409, { ok: false, error: 'Este lead da Lixeira já foi enviado como novo para outro vendedor.' });
      }

      const mutable = await assertLeadMutable(lead_id);
      if (mutable.error) return send(res, mutable.status || 500, { ok: false, error: mutable.error });

      const targetAssigneeEmail = String(req.body?.assigned_to_email || '').trim().toLowerCase();
      if (!targetAssigneeEmail) return send(res, 400, { ok: false, error: 'Informe o e-mail do novo vendedor.' });
      if (targetAssigneeEmail === String(source.assigned_to_email || '').trim().toLowerCase()) {
        return send(res, 400, { ok: false, error: 'Escolha outro vendedor para recuperar este lead como novo.' });
      }

      const { data: assignee, error: assigneeError } = await supabase
        .from('crm_users')
        .select('email,nome,cargo,ativo')
        .ilike('email', targetAssigneeEmail)
        .eq('ativo', true)
        .maybeSingle();
      if (assigneeError || !assignee) return send(res, 400, { ok: false, error: 'Responsável inválido ou inativo.' });

      try {
        await ensureLeadIsNotDuplicateForSeller({
          supabase,
          phone: source.telefone,
          assignedToEmail: assignee.email,
          ignoreLeadId: lead_id,
          recovering: true,
        });
      } catch (duplicateError) {
        return send(res, duplicateError.status || 500, { ok: false, error: duplicateError.message });
      }

      const updateTime = new Date().toISOString();
      const open = await getOpenProduction();
      const legacyMode = open.error && /commercial_productions|schema cache/i.test(open.error);
      if (open.error && !legacyMode) return send(res, 500, { ok: false, error: open.error });
      if (!open.production && !legacyMode) return send(res, 409, { ok: false, error: 'Não existe produção aberta.' });

      const originSellerName = source.assigned_to_name || source.assigned_to_email || 'vendedor';
      const {
        id,
        created_at,
        updated_at,
        ultima_interacao,
        locked_at,
        locked_reason,
        production_id,
        production_month,
        production_year,
        carried_from_lead_id,
        carried_from_production_id,
        is_carry_over,
        carried_over_at,
        trash_forwarded_to_email,
        trash_forwarded_to_name,
        trash_forwarded_at,
        trash_forwarded_lead_id,
        ...sourceCopy
      } = source;

      const insertPayload = {
        ...sourceCopy,
        status: 'lead_recebido',
        origin: `Lixeira de ${originSellerName}`,
        tags: [],
        original_lead_id: source.original_lead_id || id,
        assigned_to_email: String(assignee.email || '').trim().toLowerCase(),
        assigned_to_name: assignee.nome || assignee.email,
        created_by_email: auth.user.email || null,
        created_by_name: auth.user.nome || auth.user.email || null,
        updated_by_email: auth.user.email || null,
        updated_by_name: auth.user.nome || auth.user.email || null,
        ultima_interacao: updateTime,
        updated_at: updateTime,
        ...(open.production ? {
          production_id: open.production.id,
          production_month: open.production.month,
          production_year: open.production.year,
        } : {}),
      };

      let { data, error } = await supabase.from('leads').insert(insertPayload).select('*').single();
      if (error && open.production && isProductionSchemaError(error)) {
        const retryPayload = { ...insertPayload };
        ['production_id', 'production_month', 'production_year', 'original_lead_id'].forEach((field) => delete retryPayload[field]);
        const retry = await supabase.from('leads').insert(retryPayload).select('*').single();
        data = retry.data;
        error = retry.error;
      }
      if (error) return send(res, 409, { ok: false, error: mapDuplicateDbError(error) || error.message });

      const { error: sourceUpdateError } = await supabase
        .from('leads')
        .update({
          trash_forwarded_to_email: String(assignee.email || '').trim().toLowerCase(),
          trash_forwarded_to_name: assignee.nome || assignee.email,
          trash_forwarded_at: updateTime,
          trash_forwarded_lead_id: data.id,
          ultima_interacao: updateTime,
          updated_at: updateTime,
          updated_by_email: auth.user.email || null,
          updated_by_name: auth.user.nome || auth.user.email || null,
        })
        .eq('id', lead_id);
      if (sourceUpdateError) return send(res, 409, { ok: false, error: sourceUpdateError.message });

      const { error: historyError } = await supabase.from('lead_activity_logs').insert({
        lead_id,
        action_type: 'trash_forwarded_as_new',
        action_label: 'Lead enviado como novo',
        description: `Lead da Lixeira enviado como novo para ${assignee.nome || assignee.email}. Novo lead: ${data.id}.`,
        old_value: 'cancelado',
        new_value: String(data.id),
        created_by_email: auth.user.email || null,
        created_by_name: auth.user.nome || auth.user.email || null,
        created_by_role: auth.user.cargo || null,
        created_at: updateTime,
      });
      if (historyError) console.error('[Productions] Erro ao registrar recuperação como novo:', historyError.message);

      const { error: newHistoryError } = await supabase.from('lead_activity_logs').insert({
        lead_id: data.id,
        action_type: 'created_from_trash',
        action_label: 'Lead criado da Lixeira',
        description: `Lead criado a partir da Lixeira de ${originSellerName}.`,
        old_value: String(lead_id),
        new_value: 'lead_recebido',
        created_by_email: auth.user.email || null,
        created_by_name: auth.user.nome || auth.user.email || null,
        created_by_role: auth.user.cargo || null,
        created_at: updateTime,
      });
      if (newHistoryError) console.error('[Productions] Erro ao registrar origem do novo lead:', newHistoryError.message);

      return send(res, 200, { ok: true, lead: data });
    }

    return send(res, 400, { ok: false, error: 'Ação inválida.' });
  } catch (error) { return send(res, 500, { ok: false, error: error.message }); }
};
