(function () {
  const form = document.querySelector("[data-finance-form]");
  const table = document.querySelector("[data-finance-table]");
  const message = document.querySelector("[data-finance-message]");
  const periodFilter = document.querySelector("[data-finance-period]");
  const searchInput = document.querySelector("[data-finance-search]");
  const typeFilter = document.querySelector("[data-finance-type]");
  const statusFilter = document.querySelector("[data-finance-status]");
  const incomeEl = document.querySelector("[data-total-income]");
  const expenseEl = document.querySelector("[data-total-expense]");
  const balanceEl = document.querySelector("[data-total-balance]");
  const pendingEl = document.querySelector("[data-total-pending]");

  const state = {
    movements: [],
    period: "mes",
    search: "",
    type: "todos",
    status: "todos",
  };

  const getClient = () => window.sevenGoldAuth;

  const waitForUser = async () => {
    const client = getClient();

    if (!client) {
      return null;
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getUser();

      if (data.user) {
        return data.user;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  };

  const money = (value) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value || 0));

  const dateLabel = (value) => {
    if (!value) {
      return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(`${value}T12:00:00`));
  };

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const setMessage = (text, type = "error") => {
    if (!message) {
      return;
    }

    message.textContent = text;
    message.dataset.type = type;
  };

  const inPeriod = (movement) => {
    if (state.period === "todos") {
      return true;
    }

    const now = new Date();
    const date = new Date(`${movement.movement_date}T12:00:00`);

    if (state.period === "ano") {
      return date.getFullYear() === now.getFullYear();
    }

    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const getFilteredMovements = () => {
    const search = normalize(state.search);

    return state.movements.filter((movement) => {
      const matchesPeriod = inPeriod(movement);
      const matchesType = state.type === "todos" || movement.type === state.type;
      const matchesStatus = state.status === "todos" || movement.status === state.status;
      const text = normalize(`${movement.description} ${movement.category}`);
      const matchesSearch = !search || text.includes(search);

      return matchesPeriod && matchesType && matchesStatus && matchesSearch;
    });
  };

  const updateSummary = (movements) => {
    const totals = movements.reduce(
      (acc, movement) => {
        const amount = Number(movement.amount || 0);

        if (movement.type === "entrada") {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }

        if (movement.status === "pendente") {
          acc.pending += amount;
        }

        return acc;
      },
      { income: 0, expense: 0, pending: 0 }
    );

    incomeEl.textContent = money(totals.income);
    expenseEl.textContent = money(totals.expense);
    balanceEl.textContent = money(totals.income - totals.expense);
    pendingEl.textContent = money(totals.pending);
  };

  const renderTable = () => {
    if (!table) {
      return;
    }

    const movements = getFilteredMovements();
    updateSummary(movements);
    table.innerHTML = "";

    if (movements.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="6">Nenhum lancamento encontrado.</td>';
      table.append(row);
      return;
    }

    movements.forEach((movement) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${dateLabel(movement.movement_date)}</td>
        <td>${movement.description}</td>
        <td>${movement.category}</td>
        <td><mark class="${movement.type}">${movement.type}</mark></td>
        <td><mark class="${movement.status}">${movement.status}</mark></td>
        <td class="${movement.type === "entrada" ? "money-in" : "money-out"}">${money(movement.amount)}</td>
      `;
      table.append(row);
    });
  };

  const loadMovements = async () => {
    const client = getClient();

    if (!client || !table) {
      return;
    }

    const { data, error } = await client
      .from("finance_movements")
      .select("id, description, amount, type, category, status, movement_date, created_at")
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      table.innerHTML = '<tr><td colspan="6">Tabela financeira ainda nao criada no Supabase.</td></tr>';
      return;
    }

    state.movements = data || [];
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

    const { error } = await client.from("finance_movements").insert({
      description: String(formData.get("description") || "").trim(),
      amount: Number(formData.get("amount") || 0),
      type: String(formData.get("type") || "entrada"),
      category: String(formData.get("category") || "Outros"),
      status: String(formData.get("status") || "pago"),
      movement_date: String(formData.get("movement_date") || ""),
      created_by: user.id,
    });

    submitButton.disabled = false;
    submitButton.textContent = "Salvar lancamento";

    if (error) {
      setMessage("Nao consegui salvar. Confira se a tabela foi criada no Supabase.");
      return;
    }

    form.reset();
    form.elements.movement_date.valueAsDate = new Date();
    setMessage("Lancamento salvo com sucesso.", "success");
    await loadMovements();
  });

  periodFilter?.addEventListener("change", () => {
    state.period = periodFilter.value;
    renderTable();
  });

  searchInput?.addEventListener("input", () => {
    state.search = searchInput.value;
    renderTable();
  });

  typeFilter?.addEventListener("change", () => {
    state.type = typeFilter.value;
    renderTable();
  });

  statusFilter?.addEventListener("change", () => {
    state.status = statusFilter.value;
    renderTable();
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (form?.elements.movement_date) {
      form.elements.movement_date.valueAsDate = new Date();
    }

    loadMovements();
  });
})();
