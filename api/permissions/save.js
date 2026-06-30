const { supabase } = require('../_shared/supabase');

const ADMIN_ROLES = new Set(['diretor-ceo', 'dono', 'admin', 'administrador']);
const TEAM_MANAGER_ROLES = new Set([
  ...ADMIN_ROLES,
  'coordenador-comercial',
  'supervisor-comercial',
  'coordenador',
  'supervisor',
  'coordenador-rh',
]);

const normalizeRole = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-');

const getPreviousMonthKeys = (period, count = 6) => {
  const [year, month] = period.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
};

const getSaoPauloMonthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : '';
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  return res.end(JSON.stringify(payload));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

async function saveCrmUser(user) {
  const targetId = String(user?.id || '').trim();
  const nome = String(user?.nome || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  const cargo = normalizeRole(user?.cargo);
  const ativo = user?.ativo === true;

  if (!nome || !email || !cargo) {
    return { status: 400, error: 'Nome, e-mail e cargo são obrigatórios.' };
  }

  const { data: emailOwner, error: emailError } = await supabase
    .from('crm_users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (emailError) return { status: 500, error: emailError.message };
  if (targetId && emailOwner?.id && String(emailOwner.id) !== targetId) {
    return { status: 409, error: 'Este e-mail já pertence a outro usuário.' };
  }

  const resolvedId = targetId || emailOwner?.id || null;
  if (cargo === 'diretor-ceo') {
    let directorQuery = supabase.from('crm_users').select('id').eq('cargo', 'diretor-ceo');
    if (resolvedId) directorQuery = directorQuery.neq('id', resolvedId);
    const { data: otherDirector, error: directorError } = await directorQuery.limit(1);
    if (directorError) return { status: 500, error: directorError.message };
    if (otherDirector?.length) {
      return { status: 409, error: 'O cargo Diretor CEO já está vinculado a outro usuário.' };
    }
  }

  const userPayload = { nome, email, cargo, ativo, updated_at: new Date().toISOString() };
  const operation = resolvedId
    ? supabase.from('crm_users').update(userPayload).eq('id', resolvedId)
    : supabase.from('crm_users').insert(userPayload);
  const { data: savedUser, error: saveError } = await operation
    .select('id,email,nome,cargo,ativo,created_at,updated_at')
    .single();
  if (saveError) return { status: 500, error: saveError.message };
  return { status: 200, user: savedUser };
}

async function listCrmUserAvatars() {
  const { data: crmUsers, error: crmUsersError } = await supabase
    .from('crm_users')
    .select('id,email');
  if (crmUsersError) return { status: 500, error: crmUsersError.message };

  const authUsers = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { status: 500, error: error.message };
    const users = data?.users || [];
    authUsers.push(...users);
    if (users.length < 1000) break;
    page += 1;
  }

  const authById = new Map(authUsers.map((user) => [String(user.id), user]));
  const authByEmail = new Map(
    authUsers.map((user) => [String(user.email || '').trim().toLowerCase(), user])
  );
  const resolvedUsers = (crmUsers || []).map((crmUser) => ({
    crmUser,
    authUser: authById.get(String(crmUser.id))
      || authByEmail.get(String(crmUser.email || '').trim().toLowerCase())
      || null,
  }));
  const avatarCandidates = resolvedUsers
    .filter(({ authUser }) => authUser?.id)
    .map(({ authUser }) => ({
      directory: `${authUser.id}/profile`,
      path: `${authUser.id}/profile/avatar.jpg`,
    }));

  const avatarChecks = await Promise.all(avatarCandidates.map(async (candidate) => {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .list(candidate.directory, { limit: 1, search: 'avatar.jpg' });
    if (error) {
      console.error('[permissions/save] avatar lookup error:', error);
      return null;
    }
    return (data || []).some((file) => file.name === 'avatar.jpg') ? candidate.path : null;
  }));
  const avatarPaths = avatarChecks.filter(Boolean);

  let signedUrls = [];
  if (avatarPaths.length) {
    const { data, error } = await supabase.storage
      .from('company-documents')
      .createSignedUrls(avatarPaths, 60 * 60);
    if (error) console.error('[permissions/save] avatar signed URLs error:', error);
    signedUrls = data || [];
  }
  const customAvatarByPath = new Map(
    signedUrls.filter((item) => item?.signedUrl).map((item) => [item.path, item.signedUrl])
  );

  return {
    status: 200,
    avatars: resolvedUsers.map(({ crmUser, authUser }) => {
      const path = authUser?.id ? `${authUser.id}/profile/avatar.jpg` : '';
      const customAvatar = customAvatarByPath.get(path) || null;
      const googleAvatar = authUser?.user_metadata?.avatar_url
        || authUser?.user_metadata?.picture
        || null;
      return { id: crmUser.id, url: customAvatar || googleAvatar || null };
    }),
  };
}

async function updateOwnProfile(crmUser, profile) {
  const nome = String(profile?.nome || '').trim();
  if (!nome) return { status: 400, error: 'Informe o nome do perfil.' };

  const { data, error } = await supabase
    .from('crm_users')
    .update({ nome, updated_at: new Date().toISOString() })
    .eq('id', crmUser.id)
    .select('id,email,nome,cargo,ativo,updated_at')
    .single();
  if (error) return { status: 500, error: error.message };
  return { status: 200, user: data };
}

async function getCommercialSellerDetail(data, crmUser) {
  const role = normalizeRole(crmUser.cargo);
  const isAdmin = ADMIN_ROLES.has(role) || role === 'coordenador-rh';
  const isCoordinator = TEAM_MANAGER_ROLES.has(role) && !isAdmin;
  const sellerId = String(data?.seller_id || '').trim();
  const requestedMonth = /^\d{4}-\d{2}$/.test(String(data?.month || ''))
    ? String(data.month)
    : new Date().toISOString().slice(0, 7);
  if (!sellerId) return { status: 400, error: 'Vendedor não informado.' };

  const { data: seller, error: sellerError } = await supabase
    .from('crm_users')
    .select('id,email,nome,cargo,ativo')
    .eq('id', sellerId)
    .eq('ativo', true)
    .maybeSingle();
  if (sellerError) return { status: 500, error: sellerError.message };
  if (!seller) return { status: 404, error: 'Vendedor não encontrado.' };

  const { data: membership, error: membershipError } = await supabase
    .from('crm_team_members')
    .select('team_id,user_id')
    .eq('user_id', sellerId)
    .maybeSingle();
  if (membershipError) return { status: 500, error: membershipError.message };
  if (!membership) return { status: 404, error: 'Vendedor não pertence a uma equipe comercial.' };

  const { data: team, error: teamError } = await supabase
    .from('crm_teams')
    .select('id,name,coordinator_user_id')
    .eq('id', membership.team_id)
    .maybeSingle();
  if (teamError) return { status: 500, error: teamError.message };
  if (!team) return { status: 404, error: 'Equipe do vendedor não encontrada.' };

  if (!isAdmin && isCoordinator && String(team.coordinator_user_id) !== String(crmUser.id)) {
    return { status: 403, error: 'Você só pode visualizar vendedores da sua equipe.' };
  }
  if (!isAdmin && !isCoordinator && String(seller.id) !== String(crmUser.id)) {
    return { status: 403, error: 'Você só pode visualizar o próprio desempenho.' };
  }

  const months = getPreviousMonthKeys(requestedMonth);
  const oldestMonth = months[months.length - 1];
  const [year, month] = requestedMonth.split('-').map(Number);
  const rangeEnd = new Date(Date.UTC(year, month, 1, 3)).toISOString();
  const normalizedEmail = String(seller.email || '').trim().toLowerCase();
  const comparison = months.map((period) => ({
    month: period,
    leads: 0,
    appointments: 0,
    closings: 0,
    conversion_rate: 0,
    sold_value: 0,
    target_leads: 0,
    target_appointments: 0,
    target_sales: 0,
    goal_progress: 0,
  }));
  const comparisonByMonth = new Map(comparison.map((row) => [row.month, row]));

  const [goalsResult, leadsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('crm_sales_goals')
      .select('month,target_leads,target_appointments,target_sales')
      .eq('user_email', normalizedEmail)
      .in('month', months),
    supabase
      .from('leads')
      .select('id,name,telefone,status,created_at,updated_at,ultima_interacao,credit_value')
      .ilike('assigned_to_email', normalizedEmail)
      .gte('created_at', `${oldestMonth}-01T03:00:00.000Z`)
      .lt('created_at', rangeEnd)
      .order('created_at', { ascending: false }),
    supabase
      .from('appointments')
      .select('id,lead_id,usuario_id,status,data_agendamento,hora_agendamento')
      .eq('usuario_id', sellerId)
      .gte('data_agendamento', `${oldestMonth}-01`)
      .lt('data_agendamento', rangeEnd.slice(0, 10)),
  ]);

  if (goalsResult.error && goalsResult.error.code !== 'PGRST205') return { status: 500, error: goalsResult.error.message };
  if (leadsResult.error) return { status: 500, error: leadsResult.error.message };
  if (appointmentsResult.error) return { status: 500, error: appointmentsResult.error.message };

  (goalsResult.data || []).forEach((goal) => {
    const row = comparisonByMonth.get(goal.month);
    if (!row) return;
    row.target_leads = Number(goal.target_leads) || 0;
    row.target_appointments = Number(goal.target_appointments) || 0;
    row.target_sales = Number(goal.target_sales) || 0;
  });
  (leadsResult.data || []).forEach((lead) => {
    const row = comparisonByMonth.get(getSaoPauloMonthKey(lead.created_at));
    if (!row) return;
    row.leads += 1;
    if (lead.status === 'venda_fechada') {
      row.closings += 1;
      row.sold_value += Number(lead.credit_value) || 0;
    }
  });
  (appointmentsResult.data || []).forEach((appointment) => {
    if (appointment.status === 'cancelado') return;
    const row = comparisonByMonth.get(String(appointment.data_agendamento || '').slice(0, 7));
    if (row) row.appointments += 1;
  });
  comparison.forEach((row) => {
    row.conversion_rate = row.leads > 0 ? Number(((row.closings / row.leads) * 100).toFixed(1)) : 0;
    const progressParts = [
      [row.leads, row.target_leads],
      [row.appointments, row.target_appointments],
      [row.closings, row.target_sales],
    ].filter(([, target]) => target > 0);
    row.goal_progress = progressParts.length
      ? Number((progressParts.reduce((sum, [actual, target]) => sum + Math.min((actual / target) * 100, 100), 0) / progressParts.length).toFixed(1))
      : 0;
  });

  const currentMetrics = comparisonByMonth.get(requestedMonth) || comparison[0];
  const recentLeads = (leadsResult.data || [])
    .filter((lead) => getSaoPauloMonthKey(lead.created_at) === requestedMonth)
    .slice(0, 20);
  const recentLeadIds = recentLeads.map((lead) => lead.id);
  const activityByLead = new Map();
  const nextAppointmentByLead = new Map();

  if (recentLeadIds.length) {
    const today = new Date().toISOString().slice(0, 10);
    const [activitiesResult, nextAppointmentsResult] = await Promise.all([
      supabase
        .from('lead_activity_logs')
        .select('lead_id,action_label,description,created_at')
        .in('lead_id', recentLeadIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('appointments')
        .select('lead_id,data_agendamento,hora_agendamento,status')
        .in('lead_id', recentLeadIds)
        .gte('data_agendamento', today)
        .neq('status', 'cancelado')
        .order('data_agendamento', { ascending: true })
        .order('hora_agendamento', { ascending: true }),
    ]);
    if (!activitiesResult.error) {
      (activitiesResult.data || []).forEach((activity) => {
        if (!activityByLead.has(activity.lead_id)) activityByLead.set(activity.lead_id, activity);
      });
    }
    if (!nextAppointmentsResult.error) {
      (nextAppointmentsResult.data || []).forEach((appointment) => {
        if (!nextAppointmentByLead.has(appointment.lead_id)) nextAppointmentByLead.set(appointment.lead_id, appointment);
      });
    }
  }

  return {
    status: 200,
    seller: { ...seller, team_id: team.id, team_name: team.name },
    metrics: currentMetrics,
    comparison,
    recentLeads: recentLeads.map((lead) => {
      const activity = activityByLead.get(lead.id);
      const appointment = nextAppointmentByLead.get(lead.id);
      return {
        id: lead.id,
        name: lead.name || 'Lead sem nome',
        phone: lead.telefone || '',
        status: lead.status || '',
        created_at: lead.created_at,
        last_movement: activity?.action_label || activity?.description || '',
        last_movement_at: activity?.created_at || lead.ultima_interacao || lead.updated_at || '',
        next_appointment_date: appointment?.data_agendamento || '',
        next_appointment_time: appointment?.hora_agendamento || '',
      };
    }),
  };
}

async function manageCommercialTeams(action, data, crmUser) {
  const role = normalizeRole(crmUser.cargo);
  const isAdmin = ADMIN_ROLES.has(role) || role === 'coordenador-rh';

  if (action === 'seller_detail') {
    return getCommercialSellerDetail(data, crmUser);
  }

  if (action === 'list') {
    const isCoordinator = TEAM_MANAGER_ROLES.has(role) && !isAdmin;
    const requestedMonth = /^\d{4}-\d{2}$/.test(String(data?.month || ''))
      ? String(data.month)
      : new Date().toISOString().slice(0, 7);
    const [rangeYear, rangeMonth] = requestedMonth.split('-').map(Number);
    const rangeEnd = new Date(Date.UTC(rangeYear, rangeMonth, 1, 3)).toISOString();
    const comparisonMonths = getPreviousMonthKeys(requestedMonth);
    const comparisonRangeStart = `${comparisonMonths[comparisonMonths.length - 1]}-01T03:00:00.000Z`;

    let teamsQuery = supabase
      .from('crm_teams')
      .select('id,name,coordinator_user_id,photo_url,active,created_at,updated_at')
      .order('name');
    if (isCoordinator) {
      teamsQuery = teamsQuery.eq('coordinator_user_id', crmUser.id);
    } else if (!isAdmin) {
      const { data: ownMemberships, error: ownMembershipsError } = await supabase
        .from('crm_team_members')
        .select('team_id')
        .eq('user_id', crmUser.id);
      if (ownMembershipsError) return { status: 500, error: ownMembershipsError.message };
      const ownTeamIds = (ownMemberships || []).map((item) => item.team_id);
      if (!ownTeamIds.length) {
        return { status: 200, teams: [], members: [], leadCounts: {}, appointmentCounts: {}, sellerMetrics: {}, monthlyComparison: {}, teamAlerts: {} };
      }
      teamsQuery = teamsQuery.in('id', ownTeamIds);
    }
    const { data: teams, error: teamsError } = await teamsQuery;
    if (teamsError) return { status: 500, error: teamsError.message };

    const teamIds = (teams || []).map((team) => team.id);
    let members = [];
    if (teamIds.length) {
      const { data: memberRows, error: membersError } = await supabase
        .from('crm_team_members')
        .select('id,team_id,user_id,created_at')
        .in('team_id', teamIds);
      if (membersError) return { status: 500, error: membersError.message };
      members = memberRows || [];
      if (!isAdmin && !isCoordinator) {
        members = members.filter((item) => String(item.user_id) === String(crmUser.id));
      }
    }

    let leadCounts = {};
    let appointmentCounts = {};
    const sellerMetrics = {};
    const monthlyComparison = {};
    const teamAlerts = {};
    const visibleUserIds = [...new Set(members.map((item) => item.user_id))];
    if (teamIds.length && visibleUserIds.length) {
      const { data: visibleUsers, error: visibleUsersError } = await supabase
        .from('crm_users')
        .select('id,email,nome,cargo,ativo')
        .in('id', visibleUserIds)
        .eq('ativo', true);
      if (visibleUsersError) return { status: 500, error: visibleUsersError.message };

      const normalizedEmails = (visibleUsers || [])
        .map((user) => String(user.email || '').trim().toLowerCase())
        .filter(Boolean);
      if (!normalizedEmails.length) {
        return { status: 200, teams: teams || [], members, leadCounts, appointmentCounts, sellerMetrics, monthlyComparison, teamAlerts, month: requestedMonth };
      }
      const userByEmail = new Map((visibleUsers || []).map((user) => [String(user.email || '').trim().toLowerCase(), user]));
      const teamByUserId = new Map(members.map((item) => [String(item.user_id), item.team_id]));

      teamIds.forEach((teamId) => {
        teamAlerts[teamId] = [];
        monthlyComparison[teamId] = comparisonMonths.map((month) => ({
          month,
          leads: 0,
          appointments: 0,
          closings: 0,
          conversion_rate: 0,
          sold_value: 0,
          target_leads: 0,
          target_appointments: 0,
          target_sales: 0,
          goal_progress: 0,
        }));
      });
      const comparisonByTeamMonth = new Map();
      Object.entries(monthlyComparison).forEach(([teamId, rows]) => {
        rows.forEach((row) => comparisonByTeamMonth.set(`${teamId}:${row.month}`, row));
      });

      (visibleUsers || []).forEach((user) => {
        sellerMetrics[user.id] = {
          user_id: user.id,
          user_name: user.nome || '',
          user_email: String(user.email || '').trim().toLowerCase(),
          cargo: user.cargo || '',
          team_id: teamByUserId.get(String(user.id)) || null,
          target_leads: 0,
          target_appointments: 0,
          target_sales: 0,
          leads_actual: 0,
          appointments_actual: 0,
          closings_actual: 0,
          conversion_rate: 0,
          sold_value: 0,
        };
      });

      const { data: goals, error: goalsError } = await supabase
        .from('crm_sales_goals')
        .select('user_email,user_name,month,target_leads,target_appointments,target_sales')
        .in('month', comparisonMonths)
        .in('user_email', normalizedEmails);
      if (goalsError && goalsError.code !== 'PGRST205') return { status: 500, error: goalsError.message };
      (goals || []).forEach((goal) => {
        const user = userByEmail.get(String(goal.user_email || '').trim().toLowerCase());
        const metric = user ? sellerMetrics[user.id] : null;
        if (!metric) return;
        if (goal.month === requestedMonth) {
          metric.target_leads = Number(goal.target_leads) || 0;
          metric.target_appointments = Number(goal.target_appointments) || 0;
          metric.target_sales = Number(goal.target_sales) || 0;
        }
        const comparison = comparisonByTeamMonth.get(`${metric.team_id}:${goal.month}`);
        if (comparison) {
          comparison.target_leads += Number(goal.target_leads) || 0;
          comparison.target_appointments += Number(goal.target_appointments) || 0;
          comparison.target_sales += Number(goal.target_sales) || 0;
        }
      });

      const { data: leadRows, error: leadsError } = await supabase
        .from('leads')
        .select('id,name,assigned_to_email,status,created_at,updated_at,ultima_interacao,proximo_followup,credit_value')
        .in('assigned_to_email', normalizedEmails)
        .gte('created_at', comparisonRangeStart)
        .lt('created_at', rangeEnd);
      if (leadsError) return { status: 500, error: leadsError.message };
      (leadRows || []).forEach((lead) => {
        const user = userByEmail.get(String(lead.assigned_to_email || '').trim().toLowerCase());
        const metric = user ? sellerMetrics[user.id] : null;
        if (!metric) return;
        const recordMonth = getSaoPauloMonthKey(lead.created_at);
        const comparison = comparisonByTeamMonth.get(`${metric.team_id}:${recordMonth}`);
        if (comparison) comparison.leads += 1;
        if (recordMonth === requestedMonth) metric.leads_actual += 1;
        if (lead.status === 'venda_fechada') {
          if (comparison) {
            comparison.closings += 1;
            comparison.sold_value += Number(lead.credit_value) || 0;
          }
          if (recordMonth === requestedMonth) {
            metric.closings_actual += 1;
            metric.sold_value += Number(lead.credit_value) || 0;
          }
        }
        const teamId = metric.team_id;
        if (teamId && recordMonth === requestedMonth) leadCounts[teamId] = (leadCounts[teamId] || 0) + 1;
      });

      const { data: apptRows, error: appointmentsError } = await supabase
        .from('appointments')
        .select('lead_id,usuario_id,status,data_agendamento')
        .in('usuario_id', visibleUserIds)
        .gte('data_agendamento', `${comparisonMonths[comparisonMonths.length - 1]}-01`);
      if (appointmentsError) return { status: 500, error: appointmentsError.message };
      (apptRows || []).forEach((appointment) => {
        if (appointment.status === 'cancelado') return;
        const metric = sellerMetrics[appointment.usuario_id];
        if (!metric) return;
        const recordMonth = String(appointment.data_agendamento || '').slice(0, 7);
        const comparison = comparisonByTeamMonth.get(`${metric.team_id}:${recordMonth}`);
        if (comparison) comparison.appointments += 1;
        if (recordMonth === requestedMonth) metric.appointments_actual += 1;
        const teamId = metric.team_id;
        if (teamId && recordMonth === requestedMonth) appointmentCounts[teamId] = (appointmentCounts[teamId] || 0) + 1;
      });

      Object.values(sellerMetrics).forEach((metric) => {
        metric.conversion_rate = metric.leads_actual > 0
          ? Number(((metric.closings_actual / metric.leads_actual) * 100).toFixed(1))
          : 0;
      });

      Object.values(monthlyComparison).flat().forEach((row) => {
        row.conversion_rate = row.leads > 0 ? Number(((row.closings / row.leads) * 100).toFixed(1)) : 0;
        const progressParts = [
          [row.leads, row.target_leads],
          [row.appointments, row.target_appointments],
          [row.closings, row.target_sales],
        ].filter(([, target]) => target > 0);
        row.goal_progress = progressParts.length
          ? Number((progressParts.reduce((sum, [actual, target]) => sum + Math.min((actual / target) * 100, 100), 0) / progressParts.length).toFixed(1))
          : 0;
      });

      const getProgress = (metric) => {
        const parts = [
          [metric.leads_actual, metric.target_leads],
          [metric.appointments_actual, metric.target_appointments],
          [metric.closings_actual, metric.target_sales],
        ].filter(([, target]) => Number(target) > 0);
        return parts.length
          ? parts.reduce((sum, [actual, target]) => sum + Math.min((Number(actual) / Number(target)) * 100, 100), 0) / parts.length
          : 0;
      };
      const appendAlert = (teamId, alert) => {
        if (teamAlerts[teamId]) teamAlerts[teamId].push(alert);
      };
      const scheduledLeadIds = new Set((apptRows || [])
        .filter((appointment) => appointment.status !== 'cancelado' && appointment.data_agendamento >= `${requestedMonth}-01`)
        .map((appointment) => appointment.lead_id)
        .filter(Boolean));
      const leadsBySeller = new Map();
      (leadRows || []).forEach((lead) => {
        if (getSaoPauloMonthKey(lead.created_at) !== requestedMonth) return;
        const user = userByEmail.get(String(lead.assigned_to_email || '').trim().toLowerCase());
        if (!user) return;
        if (!leadsBySeller.has(user.id)) leadsBySeller.set(user.id, []);
        leadsBySeller.get(user.id).push(lead);
      });
      const periodEnd = new Date(rangeEnd);
      const alertReferenceDate = periodEnd < new Date() ? periodEnd : new Date();

      Object.values(sellerMetrics).forEach((metric) => {
        const progress = getProgress(metric);
        if ((metric.target_leads > 0 || metric.target_appointments > 0 || metric.target_sales > 0) && progress < 70) {
          appendAlert(metric.team_id, {
            id: `seller-goal-${metric.user_id}`,
            level: progress < 40 ? 'critical' : 'attention',
            title: 'Vendedor abaixo da meta',
            description: `${progress.toFixed(0)}% da meta atingida no período.`,
            seller_id: metric.user_id,
            seller_name: metric.user_name,
          });
        }
        if (metric.leads_actual > 0 && metric.appointments_actual === 0) {
          appendAlert(metric.team_id, {
            id: `seller-no-appointments-${metric.user_id}`,
            level: 'critical',
            title: 'Sem agendamentos',
            description: `${metric.leads_actual} lead(s) recebido(s), mas nenhum agendamento no período.`,
            seller_id: metric.user_id,
            seller_name: metric.user_name,
          });
        } else if (metric.leads_actual >= 5 && metric.appointments_actual / metric.leads_actual < 0.2) {
          appendAlert(metric.team_id, {
            id: `seller-low-appointments-${metric.user_id}`,
            level: 'attention',
            title: 'Poucos agendamentos',
            description: `${metric.leads_actual} leads e apenas ${metric.appointments_actual} agendamento(s).`,
            seller_id: metric.user_id,
            seller_name: metric.user_name,
          });
        }

        const sellerLeads = leadsBySeller.get(metric.user_id) || [];
        const stalledLeads = sellerLeads.filter((lead) => {
          const lastMovement = new Date(lead.ultima_interacao || lead.updated_at || lead.created_at);
          return !Number.isNaN(lastMovement.getTime())
            && Math.floor((alertReferenceDate - lastMovement) / 86400000) >= 7;
        });
        if (stalledLeads.length) {
          appendAlert(metric.team_id, {
            id: `seller-stalled-${metric.user_id}`,
            level: 'critical',
            title: 'Leads parados há 7 dias ou mais',
            description: `${stalledLeads.length} lead(s) sem movimentação recente.`,
            seller_id: metric.user_id,
            seller_name: metric.user_name,
          });
        }
        const leadsWithoutNextAction = sellerLeads.filter((lead) => {
          const followupDate = lead.proximo_followup ? new Date(lead.proximo_followup) : null;
          const hasFutureFollowup = followupDate && !Number.isNaN(followupDate.getTime()) && followupDate >= new Date(`${requestedMonth}-01T00:00:00`);
          return !hasFutureFollowup && !scheduledLeadIds.has(lead.id) && lead.status !== 'venda_fechada';
        });
        if (leadsWithoutNextAction.length) {
          appendAlert(metric.team_id, {
            id: `seller-no-next-action-${metric.user_id}`,
            level: 'attention',
            title: 'Leads sem próxima ação',
            description: `${leadsWithoutNextAction.length} lead(s) sem follow-up ou agendamento definido.`,
            seller_id: metric.user_id,
            seller_name: metric.user_name,
          });
        }
      });

      teamIds.forEach((teamId) => {
        const rows = monthlyComparison[teamId] || [];
        const current = rows[0];
        const previous = rows[1];
        const hasTeamGoal = current && (current.target_leads > 0 || current.target_appointments > 0 || current.target_sales > 0);
        if (hasTeamGoal && current.goal_progress < 70) {
          appendAlert(teamId, {
            id: `team-goal-${teamId}`,
            level: current.goal_progress < 40 ? 'critical' : 'attention',
            title: 'Equipe abaixo da meta geral',
            description: `${current.goal_progress.toFixed(0)}% da meta da equipe atingida no mês.`,
          });
        }
        if (current && previous) {
          const currentPerformance = previous.closings > 0 ? current.closings
            : previous.appointments > 0 ? current.appointments : current.leads;
          const previousPerformance = previous.closings > 0 ? previous.closings
            : previous.appointments > 0 ? previous.appointments : previous.leads;
          const drop = previousPerformance > 0 ? ((previousPerformance - currentPerformance) / previousPerformance) * 100 : 0;
          if (drop >= 20) {
            appendAlert(teamId, {
              id: `team-drop-${teamId}`,
              level: drop >= 40 ? 'critical' : 'attention',
              title: 'Queda de desempenho',
              description: `Desempenho ${drop.toFixed(0)}% abaixo do mês anterior.`,
            });
          }
        }
        if (!teamAlerts[teamId].length) {
          appendAlert(teamId, {
            id: `team-positive-${teamId}`,
            level: 'informative',
            title: 'Nenhum alerta encontrado',
            description: 'A equipe não possui alertas para este período.',
            positive: true,
          });
        }
      });
    }

    return { status: 200, teams: teams || [], members, leadCounts, appointmentCounts, sellerMetrics, monthlyComparison, teamAlerts, month: requestedMonth };
  }

  if (!TEAM_MANAGER_ROLES.has(role)) {
    return { status: 403, error: 'Usuário sem permissão para gerenciar equipes.' };
  }

  if (action === 'create') {
    const name = String(data?.name || '').trim();
    const coordinatorUserId = String(data?.coordinator_user_id || '').trim();
    if (!name || !coordinatorUserId) return { status: 400, error: 'Nome e gestor são obrigatórios.' };
    if (!isAdmin && coordinatorUserId !== String(crmUser.id)) {
      return { status: 403, error: 'Você só pode criar uma equipe sob sua responsabilidade.' };
    }

    const insertData = {
      name,
      coordinator_user_id: coordinatorUserId,
      updated_at: new Date().toISOString(),
    };
    if (data?.photo_url) insertData.photo_url = String(data.photo_url).trim();
    if (typeof data?.active === 'boolean') insertData.active = data.active;

    const { data: team, error } = await supabase
      .from('crm_teams')
      .insert(insertData)
      .select('id,name,coordinator_user_id,photo_url,active,created_at,updated_at')
      .single();
    if (error?.code === '23505') return { status: 409, error: 'Já existe uma equipe com esse nome.' };
    if (error) return { status: 500, error: error.message };
    return { status: 200, team };
  }

  const teamId = String(data?.team_id || '').trim();
  if (!teamId) return { status: 400, error: 'Equipe não informada.' };
  const { data: currentTeam, error: currentTeamError } = await supabase
    .from('crm_teams')
    .select('id,coordinator_user_id')
    .eq('id', teamId)
    .maybeSingle();
  if (currentTeamError) return { status: 500, error: currentTeamError.message };
  if (!currentTeam) return { status: 404, error: 'Equipe não encontrada.' };
  if (!isAdmin && String(currentTeam.coordinator_user_id) !== String(crmUser.id)) {
    return { status: 403, error: 'Você não pode alterar a equipe de outro gestor.' };
  }

  if (action === 'delete') {
    const { error } = await supabase.from('crm_teams').delete().eq('id', teamId);
    if (error) return { status: 500, error: error.message };
    return { status: 200, deleted: true };
  }

  if (action === 'save') {
    const coordinatorUserId = String(data?.coordinator_user_id || '').trim();
    const memberIds = [...new Set(Array.isArray(data?.member_ids) ? data.member_ids.map(String) : [])];
    if (!coordinatorUserId) return { status: 400, error: 'Gestor responsável não informado.' };
    if (!isAdmin && coordinatorUserId !== String(crmUser.id)) {
      return { status: 403, error: 'Você não pode transferir a equipe para outro gestor.' };
    }

    if (memberIds.length) {
      const { data: conflictingMembers, error: conflictError } = await supabase
        .from('crm_team_members')
        .select('user_id,team_id')
        .in('user_id', memberIds)
        .neq('team_id', teamId)
        .limit(1);
      if (conflictError) return { status: 500, error: conflictError.message };
      if (conflictingMembers?.length) {
        return { status: 409, error: 'Um dos colaboradores já pertence a outra equipe.' };
      }
    }

    const teamUpdateData = { coordinator_user_id: coordinatorUserId, updated_at: new Date().toISOString() };
    if (data?.photo_url !== undefined) teamUpdateData.photo_url = String(data.photo_url).trim() || null;
    if (typeof data?.active === 'boolean') teamUpdateData.active = data.active;

    const { error: teamError } = await supabase
      .from('crm_teams')
      .update(teamUpdateData)
      .eq('id', teamId);
    if (teamError) return { status: 500, error: teamError.message };

    const { error: deleteError } = await supabase.from('crm_team_members').delete().eq('team_id', teamId);
    if (deleteError) return { status: 500, error: deleteError.message };
    if (memberIds.length) {
      const { error: insertError } = await supabase.from('crm_team_members').insert(
        memberIds.map((userId) => ({ team_id: teamId, user_id: userId }))
      );
      if (insertError?.code === '23505') {
        return { status: 409, error: 'Um dos colaboradores já pertence a outra equipe.' };
      }
      if (insertError) return { status: 500, error: insertError.message };
    }
    return { status: 200, saved: true };
  }

  return { status: 400, error: 'Ação de equipe inválida.' };
}

const TEAM_GOAL_MANAGER_ROLES = new Set([
  'administrador', 'dono', 'diretor-ceo',
  'coordenador-comercial', 'supervisor-comercial',
  'coordenador', 'supervisor', 'coordenador-rh',
]);

async function manageTeamGoals(action, data, crmUser) {
  const role = normalizeRole(crmUser.cargo);
  const isAdmin = ADMIN_ROLES.has(role) || role === 'coordenador-rh';
  if (!TEAM_GOAL_MANAGER_ROLES.has(role)) {
    return { status: 403, error: 'Usuário sem permissão para gerenciar metas.' };
  }

  if (action === 'list') {
    const teamId = String(data?.team_id || '').trim();
    const month = parseInt(data?.month, 10);
    const year = parseInt(data?.year, 10);

    let query = supabase.from('team_goals').select('*').order('year', { ascending: false }).order('month', { ascending: false });

    if (teamId) {
      query = query.eq('team_id', teamId);
    } else if (!isAdmin) {
      const { data: myTeam } = await supabase
        .from('crm_teams')
        .select('id')
        .eq('coordinator_user_id', crmUser.id)
        .maybeSingle();
      if (myTeam) query = query.eq('team_id', myTeam.id);
      else return { status: 200, goals: [] };
    }

    if (month) query = query.eq('month', month);
    if (year) query = query.eq('year', year);

    const { data: goals, error } = await query;
    if (error) return { status: 500, error: error.message };
    return { status: 200, goals: goals || [] };
  }

  if (action === 'save') {
    const teamId = String(data?.team_id || '').trim();
    const month = parseInt(data?.month, 10);
    const year = parseInt(data?.year, 10);
    if (!teamId || !month || !year) return { status: 400, error: 'Equipe, mês e ano são obrigatórios.' };

    if (!isAdmin) {
      const { data: team } = await supabase
        .from('crm_teams')
        .select('id')
        .eq('id', teamId)
        .eq('coordinator_user_id', crmUser.id)
        .maybeSingle();
      if (!team) return { status: 403, error: 'Você não pode definir metas para esta equipe.' };
    }

    const goalData = {
      team_id: teamId,
      month,
      year,
      leads_goal: parseInt(data?.leads_goal, 10) || 0,
      appointments_goal: parseInt(data?.appointments_goal, 10) || 0,
      closings_goal: parseInt(data?.closings_goal, 10) || 0,
      conversion_goal: parseFloat(data?.conversion_goal) || 0,
      updated_at: new Date().toISOString(),
      created_by: crmUser.email,
    };

    const { data: existing } = await supabase
      .from('team_goals')
      .select('id')
      .eq('team_id', teamId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('team_goals').update(goalData).eq('id', existing.id);
      if (error) return { status: 500, error: error.message };
      return { status: 200, saved: true, goal_id: existing.id };
    }

    const { data: newGoal, error } = await supabase.from('team_goals').insert(goalData).select('id').single();
    if (error?.code === '23505') {
      const { data: existingRetry } = await supabase
        .from('team_goals')
        .select('id')
        .eq('team_id', teamId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();
      if (existingRetry) {
        const { error: updateError } = await supabase.from('team_goals').update(goalData).eq('id', existingRetry.id);
        if (updateError) return { status: 500, error: updateError.message };
        return { status: 200, saved: true, goal_id: existingRetry.id };
      }
    }
    if (error) return { status: 500, error: error.message };
    return { status: 200, saved: true, goal_id: newGoal.id };
  }

  if (action === 'delete') {
    const goalId = String(data?.goal_id || '').trim();
    if (!goalId) return { status: 400, error: 'Meta não informada.' };

    if (!isAdmin) {
      const { data: goal } = await supabase.from('team_goals').select('team_id').eq('id', goalId).maybeSingle();
      if (!goal) return { status: 404, error: 'Meta não encontrada.' };
      const { data: team } = await supabase
        .from('crm_teams')
        .select('id')
        .eq('id', goal.team_id)
        .eq('coordinator_user_id', crmUser.id)
        .maybeSingle();
      if (!team) return { status: 403, error: 'Você não pode excluir esta meta.' };
    }

    const { error } = await supabase.from('team_goals').delete().eq('id', goalId);
    if (error) return { status: 500, error: error.message };
    return { status: 200, deleted: true };
  }

  return { status: 400, error: 'Ação de meta inválida.' };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return sendJson(res, 401, { ok: false, error: 'Sessao nao enviada.' });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userEmail = userData?.user?.email?.trim().toLowerCase();
    if (userError || !userEmail) {
      return sendJson(res, 401, { ok: false, error: 'Sessao invalida.' });
    }

    const { data: crmUser, error: crmUserError } = await supabase
      .from('crm_users')
      .select('id,email,cargo,ativo')
      .ilike('email', userEmail)
      .eq('ativo', true)
      .maybeSingle();

    const payload = req.body && Object.keys(req.body).length ? req.body : await readBody(req);
    if (crmUserError || !crmUser) {
      return sendJson(res, 403, { ok: false, error: 'Usuário sem acesso ao CRM.' });
    }
    if (payload.team_action) {
      const result = await manageCommercialTeams(payload.team_action, payload.team_data, crmUser);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, ...result });
    }
    if (payload.team_goal_action) {
      const result = await manageTeamGoals(payload.team_goal_action, payload.team_goal_data, crmUser);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, ...result });
    }
    if (payload.list_user_avatars === true) {
      const result = await listCrmUserAvatars();
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, avatars: result.avatars });
    }
    if (payload.profile) {
      const result = await updateOwnProfile(crmUser, payload.profile);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, user: result.user });
    }
    if (!ADMIN_ROLES.has(normalizeRole(crmUser.cargo))) {
      return sendJson(res, 403, { ok: false, error: 'Usuario sem permissao para salvar permissoes.' });
    }
    if (payload.delete_user_id) {
      const deleteUserId = String(payload.delete_user_id).trim();
      if (!deleteUserId) return sendJson(res, 400, { ok: false, error: 'Usuário não informado.' });
      if (deleteUserId === String(crmUser.id)) {
        return sendJson(res, 400, { ok: false, error: 'Você não pode excluir o próprio usuário.' });
      }
      const { error: deleteUserError } = await supabase.from('crm_users').delete().eq('id', deleteUserId);
      if (deleteUserError) return sendJson(res, 500, { ok: false, error: deleteUserError.message });
      return sendJson(res, 200, { ok: true, deleted: true });
    }
    if (payload.user) {
      const result = await saveCrmUser(payload.user);
      if (result.error) return sendJson(res, result.status, { ok: false, error: result.error });
      return sendJson(res, 200, { ok: true, user: result.user });
    }

    const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
    if (!permissions.length) {
      return sendJson(res, 400, { ok: false, error: 'Nenhuma permissao enviada.' });
    }

    const now = new Date().toISOString();
    const rows = permissions
      .map((item) => ({
        cargo: String(item.cargo || '').trim(),
        area_key: String(item.area_key || '').trim(),
        area_label: String(item.area_label || item.area_key || '').trim(),
        permitido: Boolean(item.permitido),
        updated_at: now,
      }))
      .filter((item) => item.cargo && item.area_key && item.area_label);

    if (!rows.length) {
      return sendJson(res, 400, { ok: false, error: 'Permissoes invalidas.' });
    }

    const cargos = [...new Set(rows.map((item) => item.cargo))];
    const { error: deleteError } = await supabase
      .from('crm_role_permissions')
      .delete()
      .in('cargo', cargos);

    if (deleteError) {
      console.error('[permissions/save] delete error:', deleteError);
      return sendJson(res, 500, { ok: false, error: deleteError.message });
    }

    const { error: insertError } = await supabase
      .from('crm_role_permissions')
      .insert(rows);

    if (insertError) {
      console.error('[permissions/save] insert error:', insertError);
      return sendJson(res, 500, { ok: false, error: insertError.message });
    }

    return sendJson(res, 200, { ok: true, saved: rows.length });
  } catch (error) {
    console.error('[permissions/save] internal error:', error);
    return sendJson(res, 500, { ok: false, error: 'Erro interno ao salvar permissoes.' });
  }
};
