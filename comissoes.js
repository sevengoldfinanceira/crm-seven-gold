(function () {
  const formatCurrency = (value) => {
    const val = Number(value) || 0;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Obter usuário logado de forma segura
  const getCurrentUser = () => {
    if (window.currentCrmUser) return window.currentCrmUser;
    if (window.sevenGoldCrmSession?.crmUser) return window.sevenGoldCrmSession.crmUser;
    try {
      const stored = localStorage.getItem("sevenGoldCrmSession");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.crmUser) return parsed.crmUser;
      }
    } catch (e) {}
    return null;
  };

  // Filtrar vendas pelo período selecionado
  const filterSalesByPeriod = (sales, period) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return sales.filter((sale) => {
      if (!sale.closed_at && !sale.created_at) return true;
      const date = new Date(sale.closed_at || sale.created_at);
      if (isNaN(date.getTime())) return true;

      if (period === "este_mes") {
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      } else if (period === "mes_passado") {
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getFullYear() === prevYear && date.getMonth() === prevMonth;
      } else if (period === "ultimos_3_meses") {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return date >= ninetyDaysAgo;
      } else if (period === "este_ano") {
        return date.getFullYear() === currentYear;
      } else if (period === "todo_periodo") {
        return true;
      }
      return true;
    });
  };

  // Carregar vendas do vendedor logado e calcular comissões
  const loadSellerCommissions = async () => {
    const period = document.getElementById("period-filter")?.value || "este_mes";
    const user = getCurrentUser();

    const client = window.sevenGoldAuth || window.supabaseClient || (typeof window.getClient === "function" ? window.getClient() : null);

    let salesList = [];

    // Busca vendas reais do Supabase para o vendedor logado
    if (client && user) {
      try {
        let query = client.from("sales").select("*").order("closed_at", { ascending: false });
        
        const isValidId = (val) => Boolean(val && val !== "undefined" && val !== "null");
        if (isValidId(user.id)) {
          query = query.or(`seller_id.eq.${user.id},attendant_id.eq.${user.id}`);
        } else if (user.email) {
          query = query.eq("seller_email", user.email);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          salesList = data;
        }
      } catch (err) {
        console.warn("[Comissões] Erro ao buscar vendas no Supabase:", err);
      }
    }

    const filteredSales = filterSalesByPeriod(salesList, period);

    let salesCount = filteredSales.length;
    let totalSold = 0;
    let pendingCommissionTotal = 0;

    const tableBody = document.getElementById("sales-table-body");
    if (tableBody) tableBody.innerHTML = "";

    if (filteredSales.length === 0) {
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: #64748B;">Nenhuma venda encontrada para o período selecionado.</td></tr>`;
      }
    } else {
      filteredSales.forEach((sale) => {
        const creditVal = Number(sale.credit_amount || sale.valor_credito || sale.valor || 0);
        totalSold += creditVal;

        let commPct = Number(sale.commission_percentage || sale.comissao_pct || 1.5);
        let commVal = Number(sale.commission_amount || sale.valor_comissao || (creditVal * (commPct / 100)));

        const isPaid = (sale.commission_status === "paid" || sale.commission_status === "pago" || sale.status === "paid" || sale.status === "pago");

        if (!isPaid) {
          pendingCommissionTotal += commVal;
        }

        if (tableBody) {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td class="client-cell">${escapeHtml(sale.client_name || sale.cliente || "Cliente")}</td>
            <td>${formatCurrency(creditVal)}</td>
            <td>${formatCurrency(commVal)}</td>
            <td>
              <span class="status-pill ${isPaid ? "pago" : "a-receber"}">
                • ${isPaid ? "Pago" : "A receber"}
              </span>
            </td>
          `;
          tableBody.appendChild(tr);
        }
      });
    }

    // Atualiza cards de resumo e totais
    const salesCountEl = document.getElementById("stat-sales-count");
    if (salesCountEl) salesCountEl.textContent = salesCount;

    const salesTotalEl = document.getElementById("stat-sales-total");
    if (salesTotalEl) salesTotalEl.textContent = `${formatCurrency(totalSold)} vendidos`;

    const commissionPendingEl = document.getElementById("stat-commission-pending");
    if (commissionPendingEl) commissionPendingEl.textContent = formatCurrency(pendingCommissionTotal);

    const tableTotalEl = document.getElementById("table-total-receber");
    if (tableTotalEl) tableTotalEl.textContent = formatCurrency(pendingCommissionTotal);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Calculadora ligada à matriz de sete tabelas configurada no administrativo.
  const initCommissionCalculator = () => {
    const card = document.querySelector("[data-commission-calculator]");
    const creditInput = document.getElementById("calc-credit-input");
    const profileField = document.getElementById("calc-profile-field");
    const profileSelect = document.getElementById("calc-profile-select");
    const tableSelect = document.getElementById("calc-table-select");
    const resultCommission = document.getElementById("calc-result-commission");
    const resultPct = document.getElementById("calc-result-pct");
    const resultCredit = document.getElementById("calc-result-credit");
    const statusEl = document.getElementById("calc-status");
    if (!card || !creditInput || !profileField || !profileSelect || !tableSelect
      || !resultCommission || !resultPct || !resultCredit || !statusEl) return;

    const parseCurrencyDigits = (val) => {
      const digits = String(val || "").replace(/\D/g, "");
      if (!digits) return 0;
      const number = Number.parseFloat(digits) / 100;
      return Number.isFinite(number) && number > 0 ? number : 0;
    };

    const applyCurrencyMask = (input) => {
      if (!input) return 0;
      const num = parseCurrencyDigits(input.value);
      if (num === 0) {
        input.value = "";
        return 0;
      }
      input.value = formatCurrency(num);
      return num;
    };

    const formatPercent = (value) => {
      const percent = Number(value || 0);
      if (!Number.isFinite(percent) || percent < 0) return "--";
      return `${percent.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
    };

    const setStatus = (message = "", type = "") => {
      statusEl.textContent = message;
      statusEl.dataset.type = type;
    };

    const clearResult = () => {
      resultCommission.textContent = "--";
      resultPct.textContent = "--";
      resultCredit.textContent = formatCurrency(parseCurrencyDigits(creditInput.value));
    };

    const updateCalculator = () => {
      const credit = parseCurrencyDigits(creditInput.value);
      const selectedOption = tableSelect.selectedOptions?.[0];
      const percent = Number(selectedOption?.dataset.percent || 0);
      resultCredit.textContent = formatCurrency(credit);

      if (!credit || !tableSelect.value || !Number.isFinite(percent) || percent < 0) {
        resultCommission.textContent = "--";
        resultPct.textContent = "--";
        return;
      }

      resultCommission.textContent = formatCurrency(Number((credit * (percent / 100)).toFixed(2)));
      resultPct.textContent = formatPercent(percent);
    };

    const renderProfileOptions = (result) => {
      const options = result.options || {};
      const levels = Array.isArray(options.levels) ? options.levels : [];
      const sellers = Array.isArray(options.sellers) ? options.sellers : [];
      profileField.hidden = result.canChooseProfile !== true;

      if (profileField.hidden) {
        profileSelect.innerHTML = "";
        profileSelect.disabled = true;
        return;
      }

      profileSelect.innerHTML = '<option value="">Selecione um cargo</option>';
      if (levels.length) {
        levels.forEach((level) => {
          const option = document.createElement("option");
          option.value = `level:${level.id}`;
          option.textContent = level.name;
          profileSelect.appendChild(option);
        });
      }

      profileSelect.value = result.selection?.value || "";
      profileSelect.disabled = levels.length === 0;
    };

    const loadTables = async (profileValue = "") => {
      if (card.dataset.loading === "true") return;
      const client = window.sevenGoldAuth;
      if (!client) {
        tableSelect.innerHTML = '<option value="">Selecione uma tabela</option>';
        tableSelect.disabled = true;
        setStatus("Não foi possível carregar as tabelas agora.", "error");
        clearResult();
        return;
      }

      try {
        card.dataset.loading = "true";
        const previousOrder = tableSelect.selectedOptions?.[0]?.dataset.order || "";
        tableSelect.disabled = true;
        profileSelect.disabled = true;
        tableSelect.innerHTML = '<option value="">Carregando tabelas...</option>';
        setStatus("Carregando percentuais do administrativo...");
        clearResult();

        const { data: sessionData } = await client.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) throw new Error("Sessão não encontrada.");

        const params = new URLSearchParams();
        const [profileType, profileId] = String(profileValue || "").split(":");
        if (profileType === "level" && profileId) params.set("target_level_id", profileId);
        if (profileType === "user" && profileId) params.set("target_user_id", profileId);
        const query = params.toString();
        const response = await fetch(`/api/finance/commission-tables${query ? `?${query}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) {
          throw new Error(result.error || "Não consegui carregar as tabelas de comissão.");
        }

        renderProfileOptions(result);
        const tables = Array.isArray(result.tables) ? result.tables : [];
        tableSelect.innerHTML = '<option value="">Selecione uma tabela</option>';
        tables.forEach((table) => {
          const option = document.createElement("option");
          option.value = table.id;
          option.dataset.order = String(table.order);
          option.dataset.percent = String(table.percentage);
          option.textContent = `${table.name} - ${formatPercent(table.percentage)}`;
          tableSelect.appendChild(option);
        });

        if (previousOrder) {
          const matchingOption = Array.from(tableSelect.options)
            .find((option) => option.dataset.order === previousOrder);
          if (matchingOption) tableSelect.value = matchingOption.value;
        }

        tableSelect.disabled = tables.length === 0;
        profileSelect.disabled = profileField.hidden || profileSelect.options.length <= 1;
        const levelName = result.level?.name || "seu cargo";
        setStatus(
          tables.length === 7
            ? `Percentuais de ${levelName} carregados.`
            : `${tables.length} de 7 tabelas configuradas para ${levelName}.`,
          tables.length === 7 ? "success" : "error"
        );
        updateCalculator();
      } catch (error) {
        console.error("[Comissões] Erro ao carregar tabelas:", error);
        tableSelect.innerHTML = '<option value="">Selecione uma tabela</option>';
        tableSelect.disabled = true;
        profileSelect.disabled = profileField.hidden || profileSelect.options.length <= 1;
        setStatus(error.message || "Não foi possível carregar as tabelas.", "error");
        clearResult();
      } finally {
        delete card.dataset.loading;
      }
    };

    if (card.dataset.ready !== "true") {
      card.dataset.ready = "true";
      creditInput.addEventListener("input", updateCalculator);
      creditInput.addEventListener("blur", () => {
        applyCurrencyMask(creditInput);
        updateCalculator();
      });
      tableSelect.addEventListener("change", updateCalculator);
      profileSelect.addEventListener("change", () => loadTables(profileSelect.value));
    }

    applyCurrencyMask(creditInput);
    loadTables();
  };

  // Alternância de abas global
  window.switchCommissionSubTab = (target) => {
    const btns = document.querySelectorAll("[data-tab-target], [data-crm-tab-target]");
    btns.forEach((b) => {
      const btnTarget = b.getAttribute("data-tab-target") || b.getAttribute("data-crm-tab-target");
      if (btnTarget === target) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    const pComm = document.getElementById("panel-commissions");
    const pHist = document.getElementById("panel-history");
    const pCalc = document.getElementById("panel-calculator");

    if (pComm) pComm.style.display = target === "commissions" ? "block" : "none";
    if (pHist) pHist.style.display = target === "history" ? "block" : "none";
    if (pCalc) pCalc.style.display = target === "calculator" ? "block" : "none";

    const crmPComm = document.getElementById("crm-panel-commissions");
    const crmPHist = document.getElementById("crm-panel-history");
    const crmPCalc = document.getElementById("crm-panel-calculator");

    if (crmPComm) crmPComm.style.display = target === "commissions" ? "block" : "none";
    if (crmPHist) crmPHist.style.display = target === "history" ? "block" : "none";
    if (crmPCalc) crmPCalc.style.display = target === "calculator" ? "block" : "none";
  };

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab-target], [data-crm-tab-target]");
    if (!btn) return;
    const target = btn.getAttribute("data-tab-target") || btn.getAttribute("data-crm-tab-target");
    if (target) {
      window.switchCommissionSubTab(target);
    }
  });

  const init = () => {
    initCommissionCalculator();

    const periodFilter = document.getElementById("period-filter");
    if (periodFilter) {
      periodFilter.addEventListener("change", loadSellerCommissions);
    }

    loadSellerCommissions();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("crm-authorized", () => {
    loadSellerCommissions();
  });
})();
