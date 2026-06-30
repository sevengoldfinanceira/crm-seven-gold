(function () {
  const form = document.querySelector("[data-sale-form]");
  const table = document.querySelector("[data-sales-table]");
  const ranking = document.querySelector("[data-sales-ranking]");
  const message = document.querySelector("[data-sale-message]");
  const searchInput = document.querySelector("[data-report-search]");
  const periodFilter = document.querySelector("[data-report-period]");
  const monthFilter = document.querySelector("[data-report-month]");
  const personFilter = document.querySelector("[data-report-person]");
  const focusButton = document.querySelector("[data-focus-sale-form]");
  const creditEl = document.querySelector("[data-report-credit]");
  const moneyEl = document.querySelector("[data-report-money]");
  const quotaEl = document.querySelector("[data-report-quota]");
  const averageEl = document.querySelector("[data-report-average]");
  const startedEl = document.querySelector("[data-report-started]");
  const finishedEl = document.querySelector("[data-report-finished]");
  const salesCountEl = document.querySelector("[data-report-sales-count]");
  const ticketEl = document.querySelector("[data-report-ticket]");
  const sellerReport = document.querySelector("[data-seller-report]");
  const representativeReport = document.querySelector("[data-representative-report]");

  const state = {
    sales: [],
    search: "",
    period: "mes",
    month: "",
    person: "todos",
    leads: [],
    appointments: [],
    tasks: [],
  };

  const getClient = () => window.sevenGoldAuth;

  const waitForUser = async () => {
    const client = getClient();
    if (!client) return null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getUser();
      if (data.user) return data.user;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  };

  const normalizeRole = (role) =>
    String(role || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const canSeeAllCommercialRecords = (user) => {
    const role = normalizeRole(user?.cargo);
    return ["dono", "admin", "administrador", "coordenador", "supervisor"].includes(role);
  };

  const getCurrentCrmUser = () =>
    window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;

  const money = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value || 0));

  const dateLabel = (value) =>
    value
      ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`))
      : "-";

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const setMessage = (text, type = "error") => {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
  };

  const inPeriod = (sale) => {
    if (state.period === "todos") return true;
    const date = new Date(`${sale.sale_date}T12:00:00`);

    if (state.period === "ano") {
      const selectedYear = Number((state.month || "").slice(0, 4)) || new Date().getFullYear();
      return date.getFullYear() === selectedYear;
    }

    if (!state.month) return true;

    const [year, month] = state.month.split("-").map(Number);
    return date.getFullYear() === year && date.getMonth() === month - 1;
  };

  const filteredSales = () => {
    const search = normalize(state.search);

    return state.sales.filter((sale) => {
      const text = normalize(
        `${sale.client_name} ${sale.seller_name} ${sale.representative_name} ${sale.sale_table}`
      );
      const matchesSearch = !search || text.includes(search);
      const matchesPerson =
        state.person === "todos" ||
        sale.seller_name === state.person ||
        sale.representative_name === state.person;

      return matchesSearch && matchesPerson && inPeriod(sale);
    });
  };

  const updatePersonFilter = async () => {
    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    if (!seeAll) {
      if (personFilter) personFilter.style.display = "none";
      return;
    }

    const client = getClient();
    if (!client || !personFilter) return;

    const { data: users } = await client
      .from("crm_users")
      .select("nome, email, cargo, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    const current = personFilter.value;
    personFilter.innerHTML = '<option value="todos">Todos os vendedores</option>';
    if (users) {
      users.forEach((u) => {
        const cargoLabel = u.cargo ? u.cargo.toUpperCase() : "";
        const option = document.createElement("option");
        option.value = u.email;
        option.textContent = cargoLabel ? `${u.nome} — ${cargoLabel}` : u.nome;
        option.selected = u.email === current;
        personFilter.append(option);
      });
    }
  };

  const renderSummary = (sales) => {
    const totals = sales.reduce(
      (acc, sale) => {
        acc.credit += Number(sale.credit_amount || 0);
        acc.money += Number(sale.sale_amount || 0);
        acc.quotas += Number(sale.quota_count || 0);
        acc.started += sale.production_status === "iniciada" ? 1 : 0;
        acc.finished += sale.production_status === "finalizada" ? 1 : 0;
        return acc;
      },
      { credit: 0, money: 0, quotas: 0, started: 0, finished: 0 }
    );

    creditEl.textContent = money(totals.credit);
    moneyEl.textContent = money(totals.money);
    quotaEl.textContent = String(totals.quotas);
    averageEl.textContent = money(sales.length ? totals.credit / sales.length : 0);
    startedEl.textContent = String(totals.started);
    finishedEl.textContent = String(totals.finished);
    salesCountEl.textContent = String(sales.length);
    ticketEl.textContent = money(sales.length ? totals.money / sales.length : 0);
  };

  const renderTable = () => {
    const sales = filteredSales();
    renderSummary(sales);
    table.innerHTML = "";

    if (sales.length === 0) {
      table.innerHTML = '<tr><td colspan="9">Nenhuma venda encontrada.</td></tr>';
      renderRanking(sales);
      renderBreakdowns(sales);
      return;
    }

    sales.forEach((sale) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dateLabel(sale.sale_date)}</td>
        <td>${sale.client_name}</td>
        <td>${sale.seller_name}</td>
        <td>${sale.representative_name || "-"}</td>
        <td><mark>${sale.sale_table}</mark></td>
        <td>${money(sale.credit_amount)}</td>
        <td>${money(sale.sale_amount)}</td>
        <td>${sale.quota_count}</td>
        <td><mark>${sale.production_status === "finalizada" ? "Finalizada" : "Iniciada"}</mark></td>
      `;
      table.append(row);
    });

    renderRanking(sales);
    renderBreakdowns(sales);
  };

  const renderRanking = (sales) => {
    const totals = new Map();

    sales.forEach((sale) => {
      const seller = sale.seller_name || "Sem vendedor";
      const current = totals.get(seller) || { name: seller, credit: 0, sales: 0 };
      current.credit += Number(sale.credit_amount || 0);
      current.sales += 1;
      totals.set(seller, current);
    });

    const rows = Array.from(totals.values()).sort((a, b) => b.credit - a.credit);
    ranking.innerHTML = "";

    if (rows.length === 0) {
      ranking.innerHTML = '<p class="report-note">Sem vendas no filtro atual.</p>';
      return;
    }

    rows.slice(0, 8).forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "ranking-row";
      row.innerHTML = `
        <span>${index + 1}</span>
        <div>
          <strong>${item.name}</strong>
          <small>${item.sales} venda${item.sales === 1 ? "" : "s"}</small>
        </div>
        <mark>${money(item.credit)}</mark>
      `;
      ranking.append(row);
    });
  };

  const renderBreakdown = (target, sales, field, emptyText) => {
    const totals = new Map();

    sales.forEach((sale) => {
      const name = sale[field] || "Nao informado";
      const current = totals.get(name) || { name, credit: 0, money: 0, sales: 0, quotas: 0 };
      current.credit += Number(sale.credit_amount || 0);
      current.money += Number(sale.sale_amount || 0);
      current.quotas += Number(sale.quota_count || 0);
      current.sales += 1;
      totals.set(name, current);
    });

    const rows = Array.from(totals.values()).sort((a, b) => b.credit - a.credit);
    target.innerHTML = "";

    if (rows.length === 0) {
      target.innerHTML = `<p class="report-note">${emptyText}</p>`;
      return;
    }

    rows.forEach((item) => {
      const row = document.createElement("div");
      row.className = "report-person-row";
      row.innerHTML = `
        <strong>${item.name}</strong>
        <span>${item.sales} venda${item.sales === 1 ? "" : "s"} | ${item.quotas} cota${item.quotas === 1 ? "" : "s"}</span>
        <mark>${money(item.credit)}</mark>
        <small>${money(item.money)} recebido</small>
      `;
      target.append(row);
    });
  };

  const renderBreakdowns = (sales) => {
    renderBreakdown(sellerReport, sales, "seller_name", "Sem vendedor neste filtro.");
    renderBreakdown(representativeReport, sales, "representative_name", "Sem representante neste filtro.");
  };

  const loadSales = async () => {
    const client = getClient();
    if (!client) return;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    let query = client
      .from("sales_reports")
      .select("id, client_name, seller_name, representative_name, sale_table, credit_amount, sale_amount, quota_count, production_status, sale_date, created_at, assigned_to_email")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!seeAll && crmUser?.email) {
      query = query.eq("assigned_to_email", crmUser.email);
    } else if (state.person !== "todos") {
      query = query.eq("assigned_to_email", state.person);
    }

    const { data, error } = await query;

    if (error) {
      table.innerHTML = '<tr><td colspan="9">Tabela sales_reports ainda nao criada no Supabase.</td></tr>';
      return;
    }

    state.sales = data || [];
    renderTable();
  };

  const renderLeadsSummary = (leads) => {
    const total = leads.length;
    const recebidos = leads.filter((l) => l.status === "novo_lead").length;
    const atendimento = leads.filter((l) => l.status === "em_atendimento").length;
    const fechamento = leads.filter((l) => l.status === "fechamento").length;
    const conversao = leads.filter((l) => l.status === "concluido").length;
    const taxa = total > 0 ? ((conversao / total) * 100).toFixed(1) : "0";

    const el = (sel) => document.querySelector(sel);
    if (el("[data-report-total-leads]")) el("[data-report-total-leads]").textContent = total;
    if (el("[data-report-leads-recebidos]")) el("[data-report-leads-recebidos]").textContent = recebidos;
    if (el("[data-report-leads-atendimento]")) el("[data-report-leads-atendimento]").textContent = atendimento;
    if (el("[data-report-leads-fechamento]")) el("[data-report-leads-fechamento]").textContent = fechamento;
    if (el("[data-report-leads-conversao]")) el("[data-report-leads-conversao]").textContent = conversao;
    if (el("[data-report-leads-taxa]")) el("[data-report-leads-taxa]").textContent = `${taxa}%`;
  };

  const renderLeadsByStatus = (leads) => {
    const container = document.querySelector("[data-leads-by-status]");
    if (!container) return;

    const statusMap = {};
    leads.forEach((l) => {
      const status = l.status || "Nao informado";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    const entries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
    container.innerHTML = "";

    if (entries.length === 0) {
      container.innerHTML = '<p class="report-note">Nenhum lead encontrado.</p>';
      return;
    }

    entries.forEach(([status, count]) => {
      const row = document.createElement("div");
      row.className = "report-person-row";
      row.innerHTML = `<strong>${status}</strong><span>${count} lead${count === 1 ? "" : "s"}</span>`;
      container.append(row);
    });
  };

  const renderLeadsByOrigin = (leads) => {
    const container = document.querySelector("[data-leads-by-origin]");
    if (!container) return;

    const originMap = {};
    leads.forEach((l) => {
      const origin = l.origin || "Nao informado";
      originMap[origin] = (originMap[origin] || 0) + 1;
    });

    const entries = Object.entries(originMap).sort((a, b) => b[1] - a[1]);
    container.innerHTML = "";

    if (entries.length === 0) {
      container.innerHTML = '<p class="report-note">Nenhum lead encontrado.</p>';
      return;
    }

    entries.forEach(([origin, count]) => {
      const row = document.createElement("div");
      row.className = "report-person-row";
      row.innerHTML = `<strong>${origin}</strong><span>${count} lead${count === 1 ? "" : "s"}</span>`;
      container.append(row);
    });
  };

  const renderAppointmentsSummary = (appointments) => {
    const total = appointments.length;
    const agendados = appointments.filter((a) => a.status === "agendado").length;
    const concluidos = appointments.filter((a) => a.status === "concluido").length;

    const el = (sel) => document.querySelector(sel);
    if (el("[data-report-appt-total]")) el("[data-report-appt-total]").textContent = total;
    if (el("[data-report-appt-agendados]")) el("[data-report-appt-agendados]").textContent = agendados;
    if (el("[data-report-appt-concluidos]")) el("[data-report-appt-concluidos]").textContent = concluidos;
  };

  const renderTasksSummary = (tasks) => {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const done = tasks.filter((t) => t.status === "done").length;

    const el = (sel) => document.querySelector(sel);
    if (el("[data-report-tasks-pending]")) el("[data-report-tasks-pending]").textContent = pending;
    if (el("[data-report-tasks-done]")) el("[data-report-tasks-done]").textContent = done;
  };

  const loadLeadsSummary = async () => {
    const client = getClient();
    if (!client) return;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    let query = client.from("leads").select("id, name, telefone, status, origin, created_at, assigned_to_email");
    if (!seeAll && crmUser?.email) {
      query = query.eq("assigned_to_email", crmUser.email);
    } else if (state.person !== "todos") {
      query = query.eq("assigned_to_email", state.person);
    }

    const { data, error } = await query;
    if (error) return;

    const leads = data || [];
    state.leads = leads;
    renderLeadsSummary(leads);
    renderLeadsByStatus(leads);
    renderLeadsByOrigin(leads);
  };

  const loadAppointmentsSummary = async () => {
    const client = getClient();
    if (!client) return;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    let query = client.from("appointments").select("id, status, assigned_to_email");
    if (!seeAll && crmUser?.email) {
      query = query.eq("assigned_to_email", crmUser.email);
    } else if (state.person !== "todos") {
      query = query.eq("assigned_to_email", state.person);
    }

    const { data, error } = await query;
    if (error) return;

    state.appointments = data || [];
    renderAppointmentsSummary(data || []);
  };

  const loadTasksSummary = async () => {
    const client = getClient();
    if (!client) return;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    let query = client.from("tasks").select("id, status, assigned_to_email");
    if (!seeAll && crmUser?.email) {
      query = query.eq("assigned_to_email", crmUser.email);
    } else if (state.person !== "todos") {
      query = query.eq("assigned_to_email", state.person);
    }

    const { data, error } = await query;
    if (error) return;

    state.tasks = data || [];
    renderTasksSummary(data || []);
  };

  const calculatePacingStatus = (actual, target, monthStr) => {
    if (!target || target <= 0) return { label: "Sem meta definida", color: "var(--muted)" };

    const today = new Date();
    const [year, month] = monthStr.split("-").map(Number);
    const targetMonthDate = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let expectedProgress = 1.0; 
    
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const isFutureMonth = new Date(today.getFullYear(), today.getMonth(), 1) < targetMonthDate;

    if (isCurrentMonth) {
      expectedProgress = today.getDate() / daysInMonth;
    } else if (isFutureMonth) {
      expectedProgress = 0.0;
    }

    const realProgress = actual / target;

    if (realProgress >= expectedProgress) {
      return { label: "No ritmo", color: "#10b981" };
    } else if (realProgress >= (expectedProgress - 0.15)) {
      return { label: "Atenção", color: "#eab308" };
    } else {
      return { label: "Atrasado", color: "#ef4444" };
    }
  };

  const loadSalesGoals = async () => {
    const client = getClient();
    if (!client) return;

    const crmUser = getCurrentCrmUser();
    const role = normalizeRole(crmUser?.cargo);
    const isLeadOrAdmin = ["dono", "admin", "administrador", "coordenador", "supervisor"].includes(role);

    let query = client.from("crm_sales_goals").select("*");
    if (!isLeadOrAdmin && crmUser?.email) {
      query = query.eq("user_email", crmUser.email);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao carregar metas:", error);
      return;
    }

    state.goals = data || [];
    renderSalesGoalsList();
    renderPersonalGoalIfNeeded(crmUser);
  };

  const renderSalesGoalsList = () => {
    const sectionEl = document.getElementById("seller-goals-section");
    const tbodyEl = document.getElementById("seller-goals-tbody");
    if (!sectionEl || !tbodyEl) return;

    const crmUser = getCurrentCrmUser();
    const role = normalizeRole(crmUser?.cargo);
    const isLeadOrAdmin = ["dono", "admin", "administrador", "coordenador", "supervisor"].includes(role);
    const isAdmin = ["dono", "admin", "administrador"].includes(role);

    if (!isLeadOrAdmin) {
      sectionEl.style.display = "none";
      return;
    }

    sectionEl.style.display = "block";

    const formSideEl = document.getElementById("goals-admin-side");
    const actionsTh = document.getElementById("goals-actions-th");
    if (isAdmin) {
      if (formSideEl) formSideEl.style.display = "block";
      if (actionsTh) actionsTh.style.display = "";
    } else {
      if (formSideEl) formSideEl.style.display = "none";
      if (actionsTh) actionsTh.style.display = "none";
    }

    tbodyEl.innerHTML = "";
    if (state.goals.length === 0) {
      tbodyEl.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="padding: 16px; text-align: center; color: var(--muted);">Nenhuma meta cadastrada.</td></tr>`;
      return;
    }

    state.goals.forEach((g) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--line)";
      
      const formattedMonth = g.month ? g.month.split("-").reverse().join("/") : "";

      const userLeads = state.leads.filter(l => {
        if (l.assigned_to_email !== g.user_email || !l.created_at) return false;
        const leadDate = new Date(l.created_at);
        const leadMonth = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, "0")}`;
        return leadMonth === g.month;
      });
      const actualLeads = userLeads.length;
      const actualSales = userLeads.filter(l => l.status === "venda_fechada").length;

      const actualAppointments = state.appointments.filter(a => {
        if (a.assigned_to_email !== g.user_email || !a.data_agendamento) return false;
        return a.data_agendamento.startsWith(g.month) && a.status !== "cancelado";
      }).length;

      const pacingLeads = calculatePacingStatus(actualLeads, g.target_leads, g.month);
      const pacingAppts = calculatePacingStatus(actualAppointments, g.target_appointments, g.month);
      const pacingSales = calculatePacingStatus(actualSales, g.target_sales, g.month);

      tr.innerHTML = `
        <td style="padding: 12px;"><strong>${g.user_name || "Sem nome"}</strong><div style="font-size: 0.72rem; color: var(--muted);">${g.user_email}</div></td>
        <td style="padding: 12px; color: var(--ink);">${formattedMonth}</td>
        <td style="padding: 12px;">
          <div style="color: var(--ink); font-weight: 600;">${actualLeads} / ${g.target_leads}</div>
          <small style="color: ${pacingLeads.color}; font-weight: 700; font-size: 0.7rem;">${pacingLeads.label}</small>
        </td>
        <td style="padding: 12px;">
          <div style="color: var(--ink); font-weight: 600;">${actualAppointments} / ${g.target_appointments}</div>
          <small style="color: ${pacingAppts.color}; font-weight: 700; font-size: 0.7rem;">${pacingAppts.label}</small>
        </td>
        <td style="padding: 12px;">
          <div style="color: var(--ink); font-weight: 600;">${actualSales} / ${g.target_sales}</div>
          <small style="color: ${pacingSales.color}; font-weight: 700; font-size: 0.7rem;">${pacingSales.label}</small>
        </td>
        <td style="padding: 12px; color: var(--muted); font-size: 0.8rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${g.notes || ""}">${g.notes || "-"}</td>
        ${isAdmin ? `
          <td style="padding: 12px;">
            <button class="edit-goal-btn" data-id="${g.id}" style="border: none; background: transparent; color: var(--gold); font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0;">
              Editar
            </button>
          </td>
        ` : ""}
      `;

      if (isAdmin) {
        tr.querySelector(".edit-goal-btn")?.addEventListener("click", () => {
          editGoalFormFill(g);
        });
      }

      tbodyEl.appendChild(tr);
    });
  };

  const editGoalFormFill = (g) => {
    const formEl = document.getElementById("goal-form");
    if (!formEl) return;

    formEl.elements.goal_id.value = g.id || "";
    formEl.elements.user_email.value = g.user_email || "";
    formEl.elements.month.value = g.month || "";
    formEl.elements.target_leads.value = g.target_leads || 0;
    formEl.elements.target_appointments.value = g.target_appointments || 0;
    formEl.elements.target_sales.value = g.target_sales || 0;
    formEl.elements.notes.value = g.notes || "";
  };

  const loadCrmUsersForGoalSelect = async () => {
    const selectEl = document.getElementById("goal-user-select");
    if (!selectEl) return;

    const client = getClient();
    if (!client) return;

    const { data: users } = await client
      .from("crm_users")
      .select("nome, email, cargo, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    selectEl.innerHTML = '<option value="">Selecionar Vendedor</option>';
    if (users) {
      users.forEach((u) => {
        const cargoLabel = u.cargo ? u.cargo.toUpperCase() : "";
        const option = document.createElement("option");
        option.value = u.email;
        option.textContent = cargoLabel ? `${u.nome} — ${cargoLabel}` : u.nome;
        selectEl.appendChild(option);
      });
    }
  };

  const handleGoalFormSubmit = async (e) => {
    e.preventDefault();
    const formEl = document.getElementById("goal-form");
    if (!formEl) return;

    const client = getClient();
    if (!client) return;

    const submitBtn = formEl.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    const goalId = formEl.elements.goal_id.value;
    const userEmail = formEl.elements.user_email.value;
    const month = formEl.elements.month.value;
    const targetLeads = parseInt(formEl.elements.target_leads.value) || 0;
    const targetAppointments = parseInt(formEl.elements.target_appointments.value) || 0;
    const targetSales = parseInt(formEl.elements.target_sales.value) || 0;
    const notes = formEl.elements.notes.value || "";

    const selectEl = document.getElementById("goal-user-select");
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const userName = selectedOption ? selectedOption.textContent.split(" — ")[0] : "";

    const payload = {
      user_email: userEmail,
      user_name: userName,
      month,
      target_leads: targetLeads,
      target_appointments: targetAppointments,
      target_sales: targetSales,
      notes,
      updated_at: new Date().toISOString()
    };

    let response;
    if (goalId) {
      response = await client
        .from("crm_sales_goals")
        .update(payload)
        .eq("id", goalId);
    } else {
      response = await client
        .from("crm_sales_goals")
        .insert(payload);
    }

    if (submitBtn) submitBtn.disabled = false;

    if (response.error) {
      alert(`Erro ao salvar meta: ${response.error.message}`);
    } else {
      formEl.reset();
      formEl.elements.goal_id.value = "";
      alert("Meta salva com sucesso!");
      await loadSalesGoals();
      
      const activeSellerDetails = document.getElementById("seller-detail-section");
      if (activeSellerDetails && activeSellerDetails.style.display !== "none") {
        const infoText = document.getElementById("seller-detail-info")?.textContent || "";
        const emailMatch = infoText.match(/—\s*(.+)$/);
        const nameMatch = infoText.match(/^(.+?)\s*—/);
        if (emailMatch && nameMatch) {
          renderSellerDetailsBlock(emailMatch[1].trim(), nameMatch[1].trim());
        }
      }
    }
  };

  const renderSellerDetailsGoals = (email) => {
    const containerEl = document.getElementById("seller-detail-goals-container");
    if (!containerEl) return;

    const goal = state.goals.find(g => g.user_email === email && g.month === state.month);

    if (!goal) {
      containerEl.innerHTML = `
        <div style="padding: 16px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255, 255, 255, 0.02); text-align: center; color: var(--muted); font-size: 0.85rem;">
          Nenhuma meta cadastrada para este mês.
        </div>
      `;
      return;
    }

    const userLeads = state.leads.filter(l => {
      if (l.assigned_to_email !== email || !l.created_at) return false;
      const leadDate = new Date(l.created_at);
      const leadMonth = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, "0")}`;
      return leadMonth === state.month;
    });

    const actualLeads = userLeads.length;
    const actualSales = userLeads.filter(l => l.status === "venda_fechada").length;

    const userAppointments = state.appointments.filter(a => {
      if (a.assigned_to_email !== email || !a.data_agendamento) return false;
      return a.data_agendamento.startsWith(state.month) && a.status !== "cancelado";
    }).length;

    const pctLeads = goal.target_leads > 0 ? (actualLeads / goal.target_leads) * 100 : 0;
    const pctAppts = goal.target_appointments > 0 ? (userAppointments / goal.target_appointments) * 100 : 0;
    const pctSales = goal.target_sales > 0 ? (actualSales / goal.target_sales) * 100 : 0;

    const pacingLeads = calculatePacingStatus(actualLeads, goal.target_leads, goal.month);
    const pacingAppts = calculatePacingStatus(userAppointments, goal.target_appointments, goal.month);
    const pacingSales = calculatePacingStatus(actualSales, goal.target_sales, goal.month);

    containerEl.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase;">Meta de Leads</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingLeads.color};">${pacingLeads.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${actualLeads} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_leads}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctLeads)}%; height: 100%; background: var(--gold); border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: var(--gold); font-weight: 700;">${pctLeads.toFixed(0)}% concluído</span>
        </div>

        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: #8b5cf6; text-transform: uppercase;">Meta de Agendamentos</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingAppts.color};">${pacingAppts.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${userAppointments} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_appointments}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctAppts)}%; height: 100%; background: #8b5cf6; border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: #8b5cf6; font-weight: 700;">${pctAppts.toFixed(0)}% concluído</span>
        </div>

        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: #10b981; text-transform: uppercase;">Meta de Vendas</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingSales.color};">${pacingSales.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${actualSales} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_sales}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctSales)}%; height: 100%; background: #10b981; border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: #10b981; font-weight: 700;">${pctSales.toFixed(0)}% concluído</span>
        </div>
      </div>
      ${goal.notes ? `<div style="margin-top: 12px; font-size: 0.78rem; color: var(--muted); font-style: italic;">Obs: ${goal.notes}</div>` : ""}
    `;
  };

  const renderPersonalGoalIfNeeded = (crmUser) => {
    const containerEl = document.getElementById("seller-personal-goal-container");
    if (!containerEl) return;

    const role = normalizeRole(crmUser?.cargo);
    const isLeadOrAdmin = ["dono", "admin", "administrador", "coordenador", "supervisor"].includes(role);

    if (isLeadOrAdmin) {
      containerEl.style.display = "none";
      return;
    }

    containerEl.style.display = "block";
    
    // Render progress inside personal container
    const email = crmUser?.email || "";
    const goal = state.goals.find(g => g.user_email === email && g.month === state.month);

    if (!goal) {
      containerEl.innerHTML = `
        <h2 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 8px; color: var(--ink);">Minha Meta</h2>
        <div style="color: var(--muted); font-size: 0.85rem;">
          Nenhuma meta cadastrada para você neste mês (${state.month.split("-").reverse().join("/")}).
        </div>
      `;
      return;
    }

    const userLeads = state.leads.filter(l => {
      if (l.assigned_to_email !== email || !l.created_at) return false;
      const leadDate = new Date(l.created_at);
      const leadMonth = `${leadDate.getFullYear()}-${String(leadDate.getMonth() + 1).padStart(2, "0")}`;
      return leadMonth === state.month;
    });

    const actualLeads = userLeads.length;
    const actualSales = userLeads.filter(l => l.status === "venda_fechada").length;

    const userAppointments = state.appointments.filter(a => {
      if (a.assigned_to_email !== email || !a.data_agendamento) return false;
      return a.data_agendamento.startsWith(state.month) && a.status !== "cancelado";
    }).length;

    const pctLeads = goal.target_leads > 0 ? (actualLeads / goal.target_leads) * 100 : 0;
    const pctAppts = goal.target_appointments > 0 ? (userAppointments / goal.target_appointments) * 100 : 0;
    const pctSales = goal.target_sales > 0 ? (actualSales / goal.target_sales) * 100 : 0;

    const pacingLeads = calculatePacingStatus(actualLeads, goal.target_leads, goal.month);
    const pacingAppts = calculatePacingStatus(userAppointments, goal.target_appointments, goal.month);
    const pacingSales = calculatePacingStatus(actualSales, goal.target_sales, goal.month);

    containerEl.innerHTML = `
      <h2 style="font-size: 1.1rem; font-weight: 800; margin: 0 0 16px; color: var(--ink);">Minha Meta — ${state.month.split("-").reverse().join("/")}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase;">Meta de Leads</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingLeads.color};">${pacingLeads.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${actualLeads} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_leads}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctLeads)}%; height: 100%; background: var(--gold); border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: var(--gold); font-weight: 700;">${pctLeads.toFixed(0)}% concluído</span>
        </div>

        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: #8b5cf6; text-transform: uppercase;">Meta de Agendamentos</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingAppts.color};">${pacingAppts.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${userAppointments} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_appointments}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctAppts)}%; height: 100%; background: #8b5cf6; border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: #8b5cf6; font-weight: 700;">${pctAppts.toFixed(0)}% concluído</span>
        </div>

        <div class="lead-card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; cursor: default;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <span style="font-size: 0.72rem; font-weight: 700; color: #10b981; text-transform: uppercase;">Meta de Vendas</span>
            <span style="font-size: 0.72rem; font-weight: 700; color: ${pacingSales.color};">${pacingSales.label}</span>
          </div>
          <strong style="font-size: 1.5rem; font-weight: 800; color: var(--ink);">${actualSales} <span style="font-size: 1rem; font-weight: 500; color: var(--muted);">/ ${goal.target_sales}</span></strong>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
            <div style="width: ${Math.min(100, pctSales)}%; height: 100%; background: #10b981; border-radius: 3px;"></div>
          </div>
          <span style="font-size: 0.72rem; color: #10b981; font-weight: 700;">${pctSales.toFixed(0)}% concluído</span>
        </div>
      </div>
      ${goal.notes ? `<div style="margin-top: 12px; font-size: 0.78rem; color: var(--muted); font-style: italic;">Obs: ${goal.notes}</div>` : ""}
    `;
  };

  const renderSellerPerformance = async () => {
    const sectionEl = document.getElementById("seller-performance-section");
    const tbodyEl = document.getElementById("seller-performance-tbody");
    if (!sectionEl || !tbodyEl) return;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    if (!seeAll) {
      sectionEl.style.display = "none";
      return;
    }

    sectionEl.style.display = "block";
    tbodyEl.innerHTML = '<tr><td colspan="8" style="padding: 16px; text-align: center; color: var(--muted);">Carregando desempenho...</td></tr>';

    const client = getClient();
    if (!client) return;

    const { data: users, error } = await client
      .from("crm_users")
      .select("nome, email, cargo, ativo")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (error || !users) {
      tbodyEl.innerHTML = '<tr><td colspan="8" style="padding: 16px; text-align: center; color: #ef4444;">Erro ao carregar vendedores.</td></tr>';
      return;
    }

    const performanceData = users.map((u) => {
      const email = u.email;
      const userLeads = state.leads.filter(l => l.assigned_to_email === email);
      const totalLeads = userLeads.length;
      const activeLeads = userLeads.filter(l => ["primeiro_contato", "agendamento", "cliente_em_loja", "proposta_enviada"].includes(l.status)).length;
      const closedLeads = userLeads.filter(l => l.status === "venda_fechada").length;
      const userAppointments = state.appointments.filter(a => a.assigned_to_email === email).length;
      const userTasks = state.tasks.filter(t => t.assigned_to_email === email && t.status === "pending").length;
      const conversionRate = totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

      return {
        nome: u.nome,
        email: u.email,
        cargo: u.cargo,
        totalLeads,
        activeLeads,
        closedLeads,
        appointments: userAppointments,
        tasks: userTasks,
        conversionRate
      };
    });

    let filteredData = performanceData;
    if (state.person !== "todos") {
      filteredData = performanceData.filter(p => p.email === state.person);
    }

    filteredData.sort((a, b) => {
      if (b.closedLeads !== a.closedLeads) {
        return b.closedLeads - a.closedLeads;
      }
      if (b.conversionRate !== a.conversionRate) {
        return b.conversionRate - a.conversionRate;
      }
      return b.totalLeads - a.totalLeads;
    });

    tbodyEl.innerHTML = "";
    if (filteredData.length === 0) {
      tbodyEl.innerHTML = '<tr><td colspan="8" style="padding: 16px; text-align: center; color: var(--muted);">Nenhum vendedor encontrado.</td></tr>';
      return;
    }

    filteredData.forEach((item) => {
      const cargoLabel = item.cargo ? item.cargo.toUpperCase() : "";
      const displayCargo = cargoLabel ? ` — ${cargoLabel}` : "";
      
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--line)";
      tr.innerHTML = `
        <td style="padding: 12px;">
          <strong style="color: var(--ink);">${item.nome}</strong>
          <div style="color: var(--muted); font-size: 0.72rem; margin-top: 2px;">${displayCargo}</div>
        </td>
        <td style="padding: 12px; color: var(--ink);">${item.totalLeads}</td>
        <td style="padding: 12px; color: var(--ink);">${item.activeLeads}</td>
        <td style="padding: 12px; color: var(--ink);">${item.appointments}</td>
        <td style="padding: 12px;"><strong style="color: #10b981;">${item.closedLeads}</strong></td>
        <td style="padding: 12px;"><strong style="color: var(--gold);">${item.conversionRate.toFixed(1)}%</strong></td>
        <td style="padding: 12px; color: var(--ink);">${item.tasks}</td>
        <td style="padding: 12px;">
          <button class="view-seller-details-btn" data-email="${item.email}" data-nome="${item.nome}" style="border: none; background: transparent; color: var(--gold); font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0;">
            Ver detalhes
          </button>
        </td>
      `;

      const detailsBtn = tr.querySelector(".view-seller-details-btn");
      if (detailsBtn) {
        detailsBtn.addEventListener("click", () => {
          selectSellerForDetails(item.email, item.nome);
        });
      }

      tbodyEl.appendChild(tr);
    });
  };

  const selectSellerForDetails = async (email, nome) => {
    if (personFilter) {
      personFilter.value = email;
    }
    state.person = email;
    
    await Promise.all([
      loadSales(),
      loadLeadsSummary(),
      loadAppointmentsSummary(),
      loadTasksSummary(),
    ]);
    
    await renderSellerPerformance();
    renderSellerDetailsBlock(email, nome);
  };

  const renderSellerDetailsBlock = (email, nome) => {
    const sectionEl = document.getElementById("seller-detail-section");
    const infoEl = document.getElementById("seller-detail-info");
    const tbodyEl = document.getElementById("seller-detail-leads-tbody");
    if (!sectionEl || !infoEl || !tbodyEl) return;

    sectionEl.style.display = "block";
    infoEl.textContent = `${nome} — ${email}`;

    const userLeads = state.leads
      .filter(l => l.assigned_to_email === email)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);

    tbodyEl.innerHTML = "";
    if (userLeads.length === 0) {
      tbodyEl.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--muted);">Nenhum lead recente atribuído.</td></tr>';
      return;
    }

    userLeads.forEach((lead) => {
      const dateLabel = lead.created_at ? new Date(lead.created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }) : "Sem data";

      const statusLabelMap = {
        lead_recebido: "Lead Recebido",
        primeiro_contato: "Primeiro Contato",
        agendamento: "Agendamento",
        cliente_em_loja: "Cliente em Loja",
        proposta_enviada: "Proposta Enviada",
        venda_fechada: "Venda Fechada"
      };
      const statusText = statusLabelMap[lead.status] || lead.status || "Sem status";

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid var(--line)";
      tr.innerHTML = `
        <td style="padding: 12px; color: var(--ink); font-weight: 600;">${lead.name || "Sem nome"}</td>
        <td style="padding: 12px; color: var(--ink);">${lead.telefone || "Sem telefone"}</td>
        <td style="padding: 12px; color: var(--ink);">${statusText}</td>
        <td style="padding: 12px; color: var(--ink);">${lead.origin || "Sem origem"}</td>
        <td style="padding: 12px; color: var(--muted); font-size: 0.8rem;">${dateLabel}</td>
      `;
      tbodyEl.appendChild(tr);
    });
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const client = getClient();
    const user = await waitForUser();
    const formData = new FormData(form);
    const submitButton = form.querySelector("button[type='submit']");
    const crmUser = getCurrentCrmUser();

    if (!client || !user) {
      setMessage("Faca login novamente antes de salvar.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setMessage("");

    const { error } = await client.from("sales_reports").insert({
      client_name: String(formData.get("client_name") || "").trim(),
      seller_name: String(formData.get("seller_name") || "").trim(),
      representative_name: String(formData.get("representative_name") || "").trim(),
      sale_table: String(formData.get("sale_table") || "Tab 01"),
      credit_amount: Number(formData.get("credit_amount") || 0),
      sale_amount: Number(formData.get("sale_amount") || 0),
      quota_count: Number(formData.get("quota_count") || 1),
      production_status: String(formData.get("production_status") || "iniciada"),
      sale_date: String(formData.get("sale_date") || ""),
      created_by: user.id,
      assigned_to_email: crmUser?.email || user.email,
      assigned_to_name: crmUser?.nome || user.email,
    });

    submitButton.disabled = false;
    submitButton.textContent = "Salvar venda";

    if (error) {
      setMessage("Nao consegui salvar. Confira se a tabela sales_reports foi criada.");
      return;
    }

    form.reset();
    form.elements.sale_date.valueAsDate = new Date();
    form.elements.quota_count.value = 1;
    setMessage("Venda salva com sucesso.", "success");
    await loadSales();
  });

  searchInput?.addEventListener("input", () => {
    state.search = searchInput.value;
    renderTable();
  });

  periodFilter?.addEventListener("change", () => {
    state.period = periodFilter.value;
    renderTable();
  });

  monthFilter?.addEventListener("change", () => {
    state.month = monthFilter.value;
    state.period = "mes";
    periodFilter.value = "mes";
    renderTable();
  });

  personFilter?.addEventListener("change", async () => {
    state.person = personFilter.value;
    if (state.person === "todos") {
      const sectionEl = document.getElementById("seller-detail-section");
      if (sectionEl) sectionEl.style.display = "none";
    }
    const crmUser = getCurrentCrmUser();
    await Promise.all([
      loadSales(),
      loadLeadsSummary(),
      loadAppointmentsSummary(),
      loadTasksSummary(),
      loadSalesGoals(),
    ]);
    await renderSellerPerformance();
    if (crmUser) renderPersonalGoalIfNeeded(crmUser);
  });

  focusButton?.addEventListener("click", () => {
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.elements.client_name?.focus();
  });

  document.addEventListener("DOMContentLoaded", async () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    state.month = currentMonth;

    if (monthFilter) monthFilter.value = currentMonth;
    if (form?.elements.sale_date) form.elements.sale_date.valueAsDate = today;

    const crmUser = getCurrentCrmUser();
    const seeAll = canSeeAllCommercialRecords(crmUser);

    if (!seeAll && form?.elements.seller_name) {
      form.elements.seller_name.value = crmUser?.nome || "";
      form.elements.seller_name.readOnly = true;
    }

    await updatePersonFilter();
    await loadCrmUsersForGoalSelect();

    const urlParams = new URLSearchParams(window.location.search);
    const urlSellerEmail = urlParams.get("seller_email");
    const urlSellerName = urlParams.get("seller_name");

    if (urlSellerEmail) {
      state.person = urlSellerEmail;
      if (personFilter) {
        personFilter.value = urlSellerEmail;
      }
    }

    // Bind Goal Form Submit
    document.getElementById("goal-form")?.addEventListener("submit", handleGoalFormSubmit);

    // Bind Voltar para visão geral button click
    document.getElementById("clear-seller-selection-btn")?.addEventListener("click", async () => {
      if (personFilter) {
        personFilter.value = "todos";
      }
      state.person = "todos";
      
      const detailSec = document.getElementById("seller-detail-section");
      if (detailSec) detailSec.style.display = "none";
      
      // Clean query parameters from URL without reloading
      const url = new URL(window.location);
      url.searchParams.delete("seller_email");
      url.searchParams.delete("seller_name");
      window.history.replaceState({}, "", url);
      
      await Promise.all([
        loadSales(),
        loadLeadsSummary(),
        loadAppointmentsSummary(),
        loadTasksSummary(),
        loadSalesGoals(),
      ]);
      await renderSellerPerformance();
      if (crmUser) renderPersonalGoalIfNeeded(crmUser);
    });

    await Promise.all([
      loadSales(),
      loadLeadsSummary(),
      loadAppointmentsSummary(),
      loadTasksSummary(),
      loadSalesGoals(),
    ]);
    await renderSellerPerformance();
    
    if (urlSellerEmail) {
      renderSellerDetailsBlock(urlSellerEmail, urlSellerName || urlSellerEmail);
    } else if (crmUser) {
      renderPersonalGoalIfNeeded(crmUser);
    }
  });
})();
