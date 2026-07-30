const { supabase } = require('../../lib/server/supabase');
const { getAuthorizedCrmUser, normalizeEmail, normalizeRole } = require('../../lib/server/crm-authorization');

const ORGANIZATION_IDS = {
  appointments: 'seven_gold',
  closed_clients: 'seven_gold_sales_weekly',
};
const DEFAULT_TARGETS = {
  appointments: 10,
  closed_clients: 1,
};
const MODES = new Set(Object.keys(ORGANIZATION_IDS));
const PARTICIPANT_ROLES = new Set([
  'coordenador-comercial',
  'supervisor-comercial',
  'vendedor',
  'assistente-vendas',
  'home-office',
]);
const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(body));
};

const normalizeName = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const getSaoPauloDateKey = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
};

const getSaoPauloDayRange = (dateKey) => ({
  start: new Date(`${dateKey}T03:00:00.000Z`).toISOString(),
  end: new Date(new Date(`${dateKey}T03:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000).toISOString(),
});

const getSaoPauloWeekRange = (dateKey) => {
  const anchor = new Date(`${dateKey}T12:00:00.000Z`);
  const daysSinceMonday = (anchor.getUTCDay() + 6) % 7;
  const startDate = new Date(anchor);
  startDate.setUTCDate(anchor.getUTCDate() - daysSinceMonday);
  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 7);
  const startKey = startDate.toISOString().slice(0, 10);
  const endKey = endDate.toISOString().slice(0, 10);
  return {
    startKey,
    endKey,
    start: new Date(`${startKey}T03:00:00.000Z`).toISOString(),
    end: new Date(`${endKey}T03:00:00.000Z`).toISOString(),
  };
};

const getClientKey = ({ leadId, phone, name }) => {
  if (leadId) return `lead:${leadId}`;
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits) return `phone:${digits}`;
  const normalizedName = normalizeName(name);
  return normalizedName ? `name:${normalizedName}` : '';
};

const addPoint = (pointsByUser, userId, clientKey, pointAt) => {
  if (!userId || !clientKey || !pointAt) return;
  if (!pointsByUser.has(userId)) pointsByUser.set(userId, new Map());
  const userPoints = pointsByUser.get(userId);
  const previousPoint = userPoints.get(clientKey);
  if (!previousPoint || pointAt < previousPoint) userPoints.set(clientKey, pointAt);
};

const sortParticipants = (participants) => participants.sort((left, right) => {
  const countDifference = Number(right.count || 0) - Number(left.count || 0);
  if (countDifference) return countDifference;
  const leftTime = left.completion_at || left.latest_point_at || '';
  const rightTime = right.completion_at || right.latest_point_at || '';
  if (leftTime && rightTime && leftTime !== rightTime) return leftTime.localeCompare(rightTime);
  if (leftTime && !rightTime) return -1;
  if (!leftTime && rightTime) return 1;
  return String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR');
});

const loadParticipants = async () => {
  const { data, error } = await supabase
    .from('crm_users')
    .select('id,nome,email,cargo,ativo')
    .eq('ativo', true);
  if (error) throw error;
  return (data || [])
    .filter((user) => PARTICIPANT_ROLES.has(normalizeRole(user.cargo)))
    .map((user) => ({
      user_id: user.id,
      name: user.nome || user.email || 'Vendedor',
      email: normalizeEmail(user.email),
      role: user.cargo || '',
    }));
};

const loadAuthUserIdsByEmail = async () => {
  const result = new Map();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return result;
  (data?.users || []).forEach((user) => {
    const email = normalizeEmail(user.email);
    if (email) result.set(email, user.id);
  });
  return result;
};

const loadAppointmentPoints = async (participants, dateKey) => {
  const { start, end } = getSaoPauloDayRange(dateKey);
  const baseFields = 'lead_id,telefone_cliente,nome_cliente,usuario_id,nome_usuario,status,created_at';
  let result = await supabase
    .from('appointments')
    .select(`${baseFields},assigned_to_email,assigned_to_name`)
    .gte('created_at', start)
    .lt('created_at', end);

  if (result.error && /assigned_to_(email|name)/i.test(result.error.message || '')) {
    result = await supabase
      .from('appointments')
      .select(baseFields)
      .gte('created_at', start)
      .lt('created_at', end);
  }
  if (result.error) throw result.error;

  const authUserIdsByEmail = await loadAuthUserIdsByEmail();
  const byEmail = new Map();
  const byName = new Map();
  const byAuthId = new Map();
  participants.forEach((participant) => {
    if (participant.email) {
      byEmail.set(participant.email, participant);
      const authUserId = authUserIdsByEmail.get(participant.email);
      if (authUserId) byAuthId.set(authUserId, participant);
    }
    const name = normalizeName(participant.name);
    if (name && !byName.has(name)) byName.set(name, participant);
  });

  const pointsByUser = new Map();
  (result.data || []).forEach((appointment) => {
    const status = String(appointment.status || '').trim().toLowerCase();
    if (['cancelado', 'cancelled', 'deleted', 'excluido'].includes(status)) return;
    const participant = byEmail.get(normalizeEmail(appointment.assigned_to_email))
      || byAuthId.get(String(appointment.usuario_id || ''))
      || byName.get(normalizeName(appointment.assigned_to_name || appointment.nome_usuario));
    if (!participant) return;
    const clientKey = getClientKey({
      leadId: appointment.lead_id,
      phone: appointment.telefone_cliente,
      name: appointment.nome_cliente,
    });
    addPoint(pointsByUser, String(participant.user_id), clientKey, String(appointment.created_at || ''));
  });
  return pointsByUser;
};

const loadSalesPoints = async ({ startKey, endKey, start, end }) => {
  const fields = 'seller_id,lead_id,client_name,client_phone,checked_at,closed_at,closed_time,created_at,status';
  const [checkedThisWeek, legacyChecked] = await Promise.all([
    supabase
      .from('sales')
      .select(fields)
      .eq('organization_id', ORGANIZATION_IDS.appointments)
      .eq('status', 'checked')
      .gte('checked_at', start)
      .lt('checked_at', end),
    supabase
      .from('sales')
      .select(fields)
      .eq('organization_id', ORGANIZATION_IDS.appointments)
      .eq('status', 'checked')
      .is('checked_at', null)
      .gte('closed_at', startKey)
      .lt('closed_at', endKey),
  ]);
  if (checkedThisWeek.error) throw checkedThisWeek.error;
  if (legacyChecked.error) throw legacyChecked.error;

  const pointsByUser = new Map();
  [...(checkedThisWeek.data || []), ...(legacyChecked.data || [])].forEach((sale) => {
    const pointAt = sale.checked_at
      || (sale.closed_at ? `${sale.closed_at}T${sale.closed_time || '00:00:00'}-03:00` : sale.created_at);
    const pointDateKey = pointAt ? getSaoPauloDateKey(pointAt) : '';
    if (!pointDateKey || pointDateKey < startKey || pointDateKey >= endKey) return;
    const clientKey = getClientKey({
      leadId: sale.lead_id,
      phone: sale.client_phone,
      name: sale.client_name,
    });
    addPoint(pointsByUser, String(sale.seller_id || ''), clientKey, String(pointAt));
  });
  return pointsByUser;
};

const buildParticipants = (participants, pointsByUser, target) => sortParticipants(
  participants.map((participant) => {
    const pointTimes = Array.from(pointsByUser.get(String(participant.user_id))?.values() || []).sort();
    const count = pointTimes.length;
    return {
      ...participant,
      count,
      progress: Math.min(100, Number(((count / target) * 100).toFixed(1))),
      missing: Math.max(0, target - count),
      latest_point_at: pointTimes[count - 1] || null,
      completion_at: target > 0 && count >= target ? pointTimes[target - 1] || null : null,
    };
  })
);

const loadRaceRows = async (dateKey) => {
  const { data, error } = await supabase
    .from('appointment_races')
    .select('*')
    .in('organization_id', Object.values(ORGANIZATION_IDS))
    .lte('race_date', dateKey)
    .order('race_date', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

const getTargets = (rows) => ({
  appointments: Math.max(1, Number(
    rows.find((row) => row.organization_id === ORGANIZATION_IDS.appointments)?.target
      || DEFAULT_TARGETS.appointments
  )),
  closed_clients: DEFAULT_TARGETS.closed_clients,
});

const buildRaceState = async (mode) => {
  const todayDateKey = getSaoPauloDateKey();
  const salesWeek = getSaoPauloWeekRange(todayDateKey);
  const dayRange = getSaoPauloDayRange(todayDateKey);
  const period = mode === 'closed_clients'
    ? { raceDate: salesWeek.startKey, start: salesWeek.start, end: salesWeek.end }
    : { raceDate: todayDateKey, ...dayRange };
  const [participants, rows] = await Promise.all([loadParticipants(), loadRaceRows(todayDateKey)]);
  const targets = getTargets(rows);
  const target = targets[mode];
  const pointsByUser = mode === 'closed_clients'
    ? await loadSalesPoints(salesWeek)
    : await loadAppointmentPoints(participants, todayDateKey);
  const rankedParticipants = buildParticipants(participants, pointsByUser, target);
  const storedRace = rows.find((row) => (
    row.organization_id === ORGANIZATION_IDS[mode] && row.race_date === period.raceDate
  )) || null;
  const winner = storedRace?.status === 'cancelled'
    ? null
    : rankedParticipants
      .filter((participant) => participant.count >= target && participant.completion_at)
      .sort((left, right) => left.completion_at.localeCompare(right.completion_at))[0] || null;
  const status = storedRace?.status === 'cancelled' ? 'cancelled' : winner ? 'finished' : 'active';

  return {
    race: {
      ...(storedRace || {}),
      id: storedRace?.id || `${ORGANIZATION_IDS[mode]}:${period.raceDate}`,
      organization_id: ORGANIZATION_IDS[mode],
      race_date: period.raceDate,
      race_mode: mode,
      period_type: mode === 'closed_clients' ? 'week' : 'day',
      period_starts_at: period.start,
      period_ends_at: period.end,
      target,
      selected_target: target,
      appointment_target: targets.appointments,
      closed_clients_target: targets.closed_clients,
      status,
      winner_user_id: winner?.user_id || null,
      won_at: winner?.completion_at || null,
    },
    participants: rankedParticipants,
    server_now: new Date().toISOString(),
    race_date: period.raceDate,
  };
};

const upsertRace = async ({ organizationId, raceDate, target, status, createdBy }) => {
  const { error } = await supabase
    .from('appointment_races')
    .upsert({
      organization_id: organizationId,
      race_date: raceDate,
      target,
      status,
      winner_user_id: null,
      won_at: null,
      created_by: createdBy || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,race_date' });
  if (error) throw error;
};

const handleAdminAction = async (req, authorization) => {
  if (!ADMIN_ROLES.has(normalizeRole(authorization.user.cargo))) {
    return { status: 403, body: { ok: false, error: 'Apenas administradores podem configurar a corrida.' } };
  }

  const payload = req.body || {};
  const action = String(payload.action || '');
  const mode = MODES.has(payload.mode) ? payload.mode : 'appointments';
  const appointmentTarget = Number.parseInt(payload.appointment_target, 10);
  const requiresAppointmentTarget = action === 'save_targets' || mode === 'appointments';
  if (requiresAppointmentTarget && (!Number.isInteger(appointmentTarget) || appointmentTarget <= 0)) {
    return { status: 400, body: { ok: false, error: 'Informe uma meta de agendamentos maior que zero.' } };
  }

  const todayDateKey = getSaoPauloDateKey();
  const salesWeek = getSaoPauloWeekRange(todayDateKey);
  const raceDate = mode === 'closed_clients' ? salesWeek.startKey : todayDateKey;
  const createdBy = authorization.user.auth_user_id;
  if (action === 'save_targets') {
    await upsertRace({
      organizationId: ORGANIZATION_IDS.appointments,
      raceDate: todayDateKey,
      target: appointmentTarget,
      status: 'active',
      createdBy,
    });
  } else if (action === 'restart') {
    await upsertRace({
      organizationId: ORGANIZATION_IDS[mode],
      raceDate,
      target: mode === 'closed_clients' ? DEFAULT_TARGETS.closed_clients : appointmentTarget,
      status: 'active',
      createdBy,
    });
  } else if (action === 'cancel') {
    await upsertRace({
      organizationId: ORGANIZATION_IDS[mode],
      raceDate,
      target: mode === 'closed_clients' ? DEFAULT_TARGETS.closed_clients : appointmentTarget,
      status: 'cancelled',
      createdBy,
    });
  } else {
    return { status: 400, body: { ok: false, error: 'Ação inválida.' } };
  }

  return { status: 200, body: { ok: true } };
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return send(res, 200, {});
  if (!supabase) return send(res, 503, { ok: false, error: 'Supabase não configurado.' });

  try {
    const authorization = await getAuthorizedCrmUser(req);
    if (authorization.error) {
      return send(res, authorization.status, { ok: false, error: authorization.error });
    }

    if (req.method === 'GET') {
      const mode = MODES.has(req.query?.mode) ? req.query.mode : 'appointments';
      return send(res, 200, { ok: true, state: await buildRaceState(mode) });
    }
    if (req.method === 'POST') {
      const result = await handleAdminAction(req, authorization);
      return send(res, result.status, result.body);
    }
    return send(res, 405, { ok: false, error: 'Método não permitido.' });
  } catch (error) {
    console.error('[Race API] Error:', error);
    return send(res, 500, { ok: false, error: 'Não foi possível processar a corrida.' });
  }
};
