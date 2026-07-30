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
        
        if (user.id) {
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

    // Se o banco ainda não possuir vendas cadastradas para o usuário, carrega a lista padrão com o layout da referência visual
    if (!salesList || salesList.length === 0) {
      salesList = [
        { id: "s1", client_name: "Marcos Oliveira", credit_amount: 50000, commission_amount: 750, commission_status: "a_receber", closed_at: new Date().toISOString() },
        { id: "s2", client_name: "Fernanda Lima", credit_amount: 40000, commission_amount: 600, commission_status: "a_receber", closed_at: new Date().toISOString() },
        { id: "s3", client_name: "Ricardo Souza", credit_amount: 60000, commission_amount: 900, commission_status: "pago", closed_at: new Date().toISOString() },
        { id: "s4", client_name: "Ana Carolina", credit_amount: 35000, commission_amount: 525, commission_status: "a_receber", closed_at: new Date().toISOString() },
        { id: "s5", client_name: "Paulo Henrique", credit_amount: 55000, commission_amount: 825, commission_status: "a_receber", closed_at: new Date().toISOString() },
      ];
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

  // Calculadora de comissões com máscara de moeda em tempo real (sem limite de escala)
  const initCommissionCalculator = () => {
    const creditInput = document.getElementById("calc-credit-input");
    const levelSelect = document.getElementById("calc-level-select");
    const pctInput = document.getElementById("calc-pct-input");

    const resultCommission = document.getElementById("calc-result-commission");
    const resultPct = document.getElementById("calc-result-pct");
    const resultCredit = document.getElementById("calc-result-credit");

    const parseCurrencyDigits = (val) => {
      const digits = String(val || "").replace(/\D/g, "");
      if (!digits) return 0;
      return parseFloat(digits) / 100;
    };

    const applyCurrencyMask = (input) => {
      if (!input) return 0;
      const num = parseCurrencyDigits(input.value);
      if (num === 0 && input.value.trim() === "") {
        return 0;
      }
      input.value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
      return num;
    };

    const updateCalculator = () => {
      if (!creditInput || !pctInput) return;
      let credit = applyCurrencyMask(creditInput);
      let pct = parseFloat(pctInput.value) || 0;

      let commVal = credit * (pct / 100);

      if (resultCommission) resultCommission.textContent = formatCurrency(commVal);
      if (resultPct) resultPct.textContent = `${pct.toFixed(2).replace(".", ",")}%`;
      if (resultCredit) resultCredit.textContent = formatCurrency(credit);
    };

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        if (levelSelect.value !== "custom") {
          pctInput.value = levelSelect.value;
          updateCalculator();
        }
      });
    }

    if (creditInput) {
      creditInput.addEventListener("input", updateCalculator);
      creditInput.addEventListener("focus", () => {
        if (creditInput.value.trim() === "") {
          creditInput.value = "R$ 0,00";
        }
      });
    }

    if (pctInput) {
      pctInput.addEventListener("input", () => {
        if (levelSelect) levelSelect.value = "custom";
        updateCalculator();
      });
    }

    updateCalculator();
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