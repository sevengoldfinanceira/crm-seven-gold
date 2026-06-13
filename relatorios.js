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

  const updatePersonFilter = () => {
    const people = new Set();
    state.sales.forEach((sale) => {
      if (sale.seller_name) people.add(sale.seller_name);
      if (sale.representative_name) people.add(sale.representative_name);
    });

    const current = personFilter.value;
    personFilter.innerHTML = '<option value="todos">Todos</option>';
    Array.from(people)
      .sort()
      .forEach((person) => {
        const option = document.createElement("option");
        option.value = person;
        option.textContent = person;
        option.selected = person === current;
        personFilter.append(option);
      });
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

    const { data, error } = await client
      .from("sales_reports")
      .select("id, client_name, seller_name, representative_name, sale_table, credit_amount, sale_amount, quota_count, production_status, sale_date, created_at")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      table.innerHTML = '<tr><td colspan="9">Tabela sales_reports ainda nao criada no Supabase.</td></tr>';
      return;
    }

    state.sales = data || [];
    updatePersonFilter();
    renderTable();
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const client = getClient();
    const user = await waitForUser();
    const formData = new FormData(form);
    const submitButton = form.querySelector("button[type='submit']");

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

  personFilter?.addEventListener("change", () => {
    state.person = personFilter.value;
    renderTable();
  });

  focusButton?.addEventListener("click", () => {
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.elements.client_name?.focus();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    state.month = currentMonth;

    if (monthFilter) monthFilter.value = currentMonth;
    if (form?.elements.sale_date) form.elements.sale_date.valueAsDate = today;
    loadSales();
  });
})();
