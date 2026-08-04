(function () {
  "use strict";

  const calculator = window.SevenGoldFinancing;
  const state = { products: [], results: [], selectedKey: null, input: null, clients: [], canManageRates: false, booted: false };
  const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const numberFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const states = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
  const numericProductFields = [
    "annual_interest_rate","max_financing_percent","min_property_value","max_property_value","min_financing_value","max_financing_value",
    "min_term_months","max_term_months","max_age_at_end","income_commitment_percent","appraisal_fee","registration_fee",
    "other_upfront_fees","monthly_fee","monthly_insurance_amount","monthly_insurance_percent"
  ];
  const arrayProductFields = ["amortization_systems","property_types","property_conditions","eligible_states","eligible_cities"];

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const brl = (value) => moneyFormatter.format(Number(value) || 0);
  const percent = (value, digits = 2) => `${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const safeHttpUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) { return ""; }
  };
  const formatDate = (value, withTime = false) => {
    if (!value) return "Não informada";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" });
  };
  const parseMoney = (value) => {
    if (typeof value === "number") return value;
    const normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    return Number(normalized) || 0;
  };
  const setMoney = (input, value) => { if (input) input.value = value === "" ? "" : brl(value); };

  async function token() {
    const { data } = await window.sevenGoldAuth.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Entre novamente.");
    return accessToken;
  }

  async function api(path, options = {}) {
    const accessToken = await token();
    const response = await fetch(`/api/financing/${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Não foi possível concluir a operação.");
      error.code = data.code;
      throw error;
    }
    return data;
  }

  function setupTabs() {
    $$('[data-fin-tab]').forEach((button) => button.addEventListener("click", () => {
      $$('[data-fin-tab]').forEach((item) => item.classList.toggle("active", item === button));
      $$('[data-fin-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.finPanel === button.dataset.finTab));
      if (button.dataset.finTab === "saved") loadSaved();
      if (button.dataset.finTab === "rates") renderRateList();
      window.lucide?.createIcons();
    }));
  }

  function setupMoneyInputs() {
    $$('[data-money]').forEach((input) => {
      input.addEventListener("input", () => {
        const digits = input.value.replace(/\D/g, "");
        input.value = digits ? brl(Number(digits) / 100) : "";
      });
    });
    const form = $("#financing-form");
    const property = form.elements.propertyValue;
    const entry = form.elements.downPayment;
    const financed = form.elements.financedAmount;
    const financedPercent = form.elements.financedPercent;
    let syncing = false;
    const sync = (source) => {
      if (syncing || parseMoney(property.value) <= 0) return;
      syncing = true;
      const values = calculator.calculateFinancedValues({
        propertyValue: parseMoney(property.value),
        downPayment: source === "entry" || source === "property" ? parseMoney(entry.value) : 0,
        financedAmount: source === "amount" ? parseMoney(financed.value) : 0,
        financedPercent: source === "percent" ? Number(financedPercent.value) : 0,
      });
      setMoney(entry, values.downPayment);
      setMoney(financed, values.financedAmount);
      financedPercent.value = values.financedPercent ? Number(values.financedPercent.toFixed(2)) : "";
      syncing = false;
    };
    property.addEventListener("change", () => sync("property"));
    entry.addEventListener("change", () => sync("entry"));
    financed.addEventListener("change", () => sync("amount"));
    financedPercent.addEventListener("input", () => sync("percent"));
    form.addEventListener("reset", () => setTimeout(() => {
      state.results = []; state.input = null; state.selectedKey = null; renderResults();
      form.elements.termMonths.value = 360;
    }, 0));
  }

  function readInput() {
    const form = $("#financing-form");
    const data = new FormData(form);
    const input = {
      propertyType: data.get("propertyType"), propertyCondition: data.get("propertyCondition"), state: data.get("state"),
      city: String(data.get("city") || "").trim(), simulationMode: data.get("simulationMode"), grossIncome: parseMoney(data.get("grossIncome")),
      propertyValue: parseMoney(data.get("propertyValue")), downPayment: parseMoney(data.get("downPayment")),
      financedPercent: Number(data.get("financedPercent")) || 0, financedAmount: parseMoney(data.get("financedAmount")),
      termMonths: Number(data.get("termMonths")) || 0, oldestProposerAge: Number(data.get("oldestProposerAge")) || 0,
      amortization: data.get("amortization"), clientId: data.get("clientId") || null,
    };
    const consistent = calculator.calculateFinancedValues(input);
    return { ...input, ...consistent };
  }

  function validateInput(input) {
    const errors = [];
    if (!input.state) errors.push("Selecione o estado do imóvel.");
    if (!input.city) errors.push("Informe a cidade do imóvel.");
    if (input.grossIncome <= 0) errors.push("Informe uma renda familiar válida.");
    if (input.propertyValue <= 0) errors.push("Informe o valor do imóvel.");
    if (input.financedAmount <= 0 || input.financedAmount > input.propertyValue) errors.push("O valor financiado deve ser maior que zero e não pode superar o imóvel.");
    if (input.downPayment < 0 || input.downPayment >= input.propertyValue) errors.push("A entrada deve ser menor que o valor do imóvel.");
    if (input.termMonths < 12 || input.termMonths > 600) errors.push("O prazo deve estar entre 12 e 600 meses.");
    if (input.oldestProposerAge < 18 || input.oldestProposerAge > 100) errors.push("Informe uma idade válida para o proponente mais velho.");
    return errors;
  }

  function systemsFor(product, requested) {
    const available = (product.amortization_systems || []).map((item) => String(item).toUpperCase());
    return (requested === "BOTH" ? ["SAC", "PRICE"] : [requested]).filter((item) => available.includes(item));
  }

  function solveAmountByIncome(input, product, system) {
    const maxByProperty = input.propertyValue * (Number(product.max_financing_percent) / 100);
    const max = Math.min(maxByProperty, Number(product.max_financing_value) || maxByProperty);
    let low = Math.max(0, Number(product.min_financing_value) || 0);
    let high = max;
    const monthlyRate = calculator.annualRateToMonthly(product.annual_interest_rate, product.rate_type);
    const options = { monthlyFee: product.monthly_fee, monthlyInsuranceAmount: product.monthly_insurance_amount, monthlyInsurancePercent: product.monthly_insurance_percent };
    const budget = input.grossIncome * (Number(product.income_commitment_percent || 30) / 100);
    for (let index = 0; index < 70; index += 1) {
      const middle = (low + high) / 2;
      if (middle <= 0) break;
      const result = system === "PRICE" ? calculator.calculatePrice(middle, monthlyRate, input.termMonths, options) : calculator.calculateSAC(middle, monthlyRate, input.termMonths, options);
      if (result.firstPayment <= budget) low = middle; else high = middle;
    }
    return Math.max(0, Math.floor(low * 100) / 100);
  }

  function runSimulation(event) {
    event.preventDefault();
    const input = readInput();
    const errors = validateInput(input);
    const errorBox = $("#fin-form-errors");
    errorBox.hidden = errors.length === 0;
    errorBox.innerHTML = errors.map((error) => `<div>• ${escapeHtml(error)}</div>`).join("");
    if (errors.length) return;

    const today = new Date();
    const results = [];
    state.products.filter((product) => {
      if (!product.active) return false;
      if (product.valid_from && new Date(`${product.valid_from}T00:00:00`) > today) return false;
      if (product.valid_until && new Date(`${product.valid_until}T23:59:59`) < today) return false;
      return true;
    }).forEach((product) => {
      systemsFor(product, input.amortization).forEach((system) => {
        const simulatedInput = { ...input };
        if (input.simulationMode === "INCOME") {
          simulatedInput.financedAmount = solveAmountByIncome(input, product, system);
          const values = calculator.calculateFinancedValues({ propertyValue: input.propertyValue, financedAmount: simulatedInput.financedAmount });
          Object.assign(simulatedInput, values);
        }
        const cityList = (product.eligible_cities || []).map((city) => String(city).toLocaleLowerCase("pt-BR"));
        if (cityList.length && !cityList.includes(input.city.toLocaleLowerCase("pt-BR"))) return;
        const result = calculator.simulateProduct(simulatedInput, product, system);
        if (result.compatible && (input.simulationMode !== "INCOME" || result.minimumIncome <= input.grossIncome + 0.01)) {
          results.push({ ...result, input: simulatedInput, key: `${product.id}:${system}` });
        }
      });
    });
    state.input = input;
    state.results = results;
    state.selectedKey = null;
    renderResults();
  }

  function resultSnapshot(result) {
    return {
      key: result.key, product_id: result.product.id, version: result.product.version, institution_name: result.product.institution_name,
      product_name: result.product.product_name, system: result.calculation.system, annual_rate: Number(result.product.annual_interest_rate),
      monthly_rate: result.calculation.monthlyRate * 100, indexer: result.product.indexer, financed_amount: result.input.financedAmount,
      down_payment: result.input.downPayment, first_payment: result.calculation.firstPayment, last_payment: result.calculation.lastPayment,
      minimum_income: result.minimumIncome, term_months: result.calculation.termMonths, cet: result.cet,
      source_name: result.product.source_name, source_url: result.product.source_url, updated_reference_at: result.product.updated_reference_at,
    };
  }

  function sortedResults() {
    const key = $("#fin-sort").value;
    const getters = {
      firstPayment: (item) => item.calculation.firstPayment,
      annualRate: (item) => Number(item.product.annual_interest_rate),
      cet: (item) => item.cet.available ? item.cet.annualPercent : Number.POSITIVE_INFINITY,
      minimumIncome: (item) => item.minimumIncome,
    };
    return [...state.results].sort((a, b) => getters[key](a) - getters[key](b));
  }

  function renderResults() {
    const list = $("#fin-result-list");
    const empty = $("#fin-results-empty");
    const toolbar = $("#fin-results-toolbar");
    const disclaimer = $("#fin-disclaimer");
    const summary = $("#fin-results-summary");
    if (!state.input) {
      list.innerHTML = ""; empty.hidden = false; toolbar.hidden = true; disclaimer.hidden = true;
      summary.textContent = "Preencha os dados para comparar as condições disponíveis.";
      return;
    }
    empty.hidden = state.results.length > 0;
    toolbar.hidden = state.results.length === 0;
    disclaimer.hidden = state.results.length === 0;
    if (!state.results.length) {
      empty.innerHTML = state.products.length
        ? '<i data-lucide="search-x"></i><h3>Nenhum produto compatível</h3><p>Revise valor, entrada, prazo, idade, localização e renda. As condições cadastradas não atendem a estes dados.</p>'
        : '<i data-lucide="database-zap"></i><h3>Nenhuma taxa real cadastrada</h3><p>Um administrador precisa cadastrar condições bancárias verificadas. O sistema não usa taxas fictícias.</p>';
      list.innerHTML = "";
      summary.textContent = "Nenhum produto disponível para os dados informados.";
      window.lucide?.createIcons();
      return;
    }
    summary.textContent = `${state.results.length} opção(ões) compatível(is), usando somente taxas cadastradas.`;
    list.innerHTML = sortedResults().map((result) => {
      const product = result.product;
      const calculation = result.calculation;
      const cetLabel = result.cet.available ? `${percent(result.cet.annualPercent)} a.a. (estimado)` : "Não disponível";
      const sourceUrl = safeHttpUrl(product.source_url);
      return `<article class="fin-result-card${state.selectedKey === result.key ? " selected" : ""}" data-result-key="${escapeHtml(result.key)}">
        <div class="fin-result-head"><div class="fin-result-bank"><span>${escapeHtml(product.institution_name.slice(0,2).toUpperCase())}</span><div><h3>${escapeHtml(product.institution_name)}</h3><p>${escapeHtml(product.product_name)}</p></div></div><div class="fin-source">Fonte: ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(product.source_name)}</a>` : escapeHtml(product.source_name)}<br>Atualizada em ${formatDate(product.updated_reference_at, true)}</div></div>
        <div class="fin-tags"><span class="fin-tag">${calculation.system}</span><span class="fin-tag">${escapeHtml(product.indexer || "Sem indexador informado")}</span><span class="fin-tag">${calculation.termMonths} meses</span></div>
        <div class="fin-result-metrics"><div class="fin-metric"><small>Taxa anual</small><strong>${percent(product.annual_interest_rate)}</strong></div><div class="fin-metric"><small>Taxa mensal equivalente</small><strong>${percent(calculation.monthlyRate*100,4)}</strong></div><div class="fin-metric"><small>CET anual</small><strong>${cetLabel}</strong></div><div class="fin-metric"><small>Valor financiado</small><strong>${brl(result.input.financedAmount)}</strong></div><div class="fin-metric"><small>Entrada</small><strong>${brl(result.input.downPayment)}</strong></div><div class="fin-metric"><small>Primeira parcela</small><strong>${brl(calculation.firstPayment)}</strong></div><div class="fin-metric"><small>Última parcela</small><strong>${brl(calculation.lastPayment)}</strong></div><div class="fin-metric"><small>Renda mínima</small><strong>${brl(result.minimumIncome)}</strong></div></div>
        <div class="fin-result-actions"><label class="fin-select-product"><input type="radio" name="selected-product" value="${escapeHtml(result.key)}" ${state.selectedKey === result.key ? "checked" : ""}/> Selecionar produto</label><button type="button" class="fin-link-button" data-result-detail="${escapeHtml(result.key)}">Ver evolução do saldo →</button></div>
      </article>`;
    }).join("");
    $$('input[name="selected-product"]', list).forEach((radio) => radio.addEventListener("change", () => { state.selectedKey = radio.value; renderResults(); }));
    $$('[data-result-detail]', list).forEach((button) => button.addEventListener("click", () => openDetails(button.dataset.resultDetail)));
    window.lucide?.createIcons();
  }

  function openDetails(key) {
    const result = state.results.find((item) => item.key === key);
    if (!result) return;
    $("#fin-detail-title").textContent = `${result.product.institution_name} — ${result.product.product_name}`;
    $("#fin-detail-subtitle").textContent = `${result.calculation.system} • ${result.calculation.termMonths} meses • versão ${result.product.version}`;
    $("#fin-detail-content").innerHTML = `<div class="fin-summary-grid"><div><small>Financiado</small><strong>${brl(result.input.financedAmount)}</strong></div><div><small>Total projetado</small><strong>${brl(result.calculation.totalPaid)}</strong></div><div><small>Juros projetados</small><strong>${brl(result.calculation.totalInterest)}</strong></div><div><small>Tarifas iniciais</small><strong>${brl(result.upfrontFees)}</strong></div></div><div class="fin-schedule"><table><thead><tr><th>Mês</th><th>Saldo inicial</th><th>Amortização</th><th>Juros</th><th>Seguros/tarifas</th><th>Parcela</th><th>Saldo final</th></tr></thead><tbody>${result.calculation.schedule.map((row) => `<tr><td>${row.month}</td><td>${brl(row.openingBalance)}</td><td>${brl(row.amortization)}</td><td>${brl(row.interest)}</td><td>${brl(row.extras)}</td><td><strong>${brl(row.payment)}</strong></td><td>${brl(row.balance)}</td></tr>`).join("")}</tbody></table></div>`;
    $("#fin-detail-dialog").showModal();
  }

  async function loadInitialData() {
    const warning = $("#fin-schema-warning");
    try {
      const [productsData, clientsData] = await Promise.all([api("products?include_inactive=true"), api("clients").catch(() => ({ clients: [] }))]);
      state.products = productsData.products || [];
      state.canManageRates = productsData.can_manage_rates === true;
      state.clients = clientsData.clients || [];
      $$('[data-rate-admin]').forEach((element) => { element.hidden = !state.canManageRates; });
      populateClients();
      warning.hidden = true;
    } catch (error) {
      state.products = [];
      warning.hidden = false;
      warning.textContent = error.message;
    }
  }

  function populateClients() {
    const select = $("#fin-client");
    select.innerHTML = '<option value="">Não vincular</option>' + state.clients.map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name || "Cliente sem nome")}${client.telefone ? ` — ${escapeHtml(client.telefone)}` : ""}</option>`).join("");
  }

  async function saveSimulation(event) {
    event.preventDefault();
    const name = String(new FormData($("#fin-save-form")).get("name") || "").trim();
    const status = $("#fin-save-status");
    if (!name) { status.textContent = "Informe um nome."; return; }
    const button = $("#fin-save-confirm");
    button.disabled = true; status.textContent = "Salvando...";
    try {
      const shown = state.results.map(resultSnapshot);
      const selected = state.selectedKey ? shown.find((item) => item.key === state.selectedKey) : null;
      await api("simulations", { method: "POST", body: JSON.stringify({ name, client_id: state.input.clientId, input_data: state.input, products_shown: shown, selected_product: selected }) });
      $("#fin-save-dialog").close();
      $("#fin-save-form").reset(); status.textContent = "";
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  }

  async function loadSaved() {
    const list = $("#fin-saved-list");
    list.innerHTML = '<div class="fin-loading">Carregando...</div>';
    try {
      const data = await api("simulations");
      if (!data.simulations?.length) { list.innerHTML = '<div class="fin-empty"><i data-lucide="bookmark"></i><h3>Nenhuma simulação salva</h3><p>Faça uma simulação e use o botão Salvar.</p></div>'; window.lucide?.createIcons(); return; }
      list.innerHTML = data.simulations.map((simulation) => `<article class="fin-saved-item"><div><h3>${escapeHtml(simulation.name)}</h3><p>${formatDate(simulation.created_at,true)} • ${simulation.client_name ? `Cliente: ${escapeHtml(simulation.client_name)} • ` : ""}${simulation.products_shown?.length || 0} produto(s) • ${simulation.selected_product ? `Selecionado: ${escapeHtml(simulation.selected_product.institution_name)}` : "Nenhum produto selecionado"}</p></div><div class="fin-item-actions"><button data-saved-view="${simulation.id}">Visualizar</button><button data-saved-delete="${simulation.id}">Excluir</button></div></article>`).join("");
      $$('[data-saved-view]', list).forEach((button) => button.addEventListener("click", () => viewSaved(data.simulations.find((item) => item.id === button.dataset.savedView))));
      $$('[data-saved-delete]', list).forEach((button) => button.addEventListener("click", async () => { if (!confirm("Excluir esta simulação salva?")) return; await api("simulations", { method: "DELETE", body: JSON.stringify({ id: button.dataset.savedDelete }) }); loadSaved(); }));
    } catch (error) { list.innerHTML = `<div class="fin-warning">${escapeHtml(error.message)}</div>`; }
  }

  function viewSaved(simulation) {
    $("#fin-detail-title").textContent = simulation.name;
    $("#fin-detail-subtitle").textContent = `Salva em ${formatDate(simulation.created_at,true)} • taxas preservadas por versão`;
    const products = simulation.products_shown || [];
    $("#fin-detail-content").innerHTML = products.length ? `<div class="fin-result-list">${products.map((item) => `<article class="fin-result-card${simulation.selected_product?.key === item.key ? " selected" : ""}"><div class="fin-result-head"><div class="fin-result-bank"><span>${escapeHtml(item.institution_name.slice(0,2).toUpperCase())}</span><div><h3>${escapeHtml(item.institution_name)}</h3><p>${escapeHtml(item.product_name)} • ${escapeHtml(item.system)} • versão ${item.version}</p></div></div><div class="fin-source">${formatDate(item.updated_reference_at,true)}</div></div><div class="fin-result-metrics"><div class="fin-metric"><small>Taxa anual</small><strong>${percent(item.annual_rate)}</strong></div><div class="fin-metric"><small>Financiado</small><strong>${brl(item.financed_amount)}</strong></div><div class="fin-metric"><small>Primeira parcela</small><strong>${brl(item.first_payment)}</strong></div><div class="fin-metric"><small>Renda mínima</small><strong>${brl(item.minimum_income)}</strong></div></div></article>`).join("")}</div>` : '<div class="fin-empty"><p>Nenhum produto foi preservado nesta simulação.</p></div>';
    $("#fin-detail-dialog").showModal();
  }

  function renderRateList() {
    const list = $("#fin-rate-list");
    if (!state.products.length) { list.innerHTML = '<div class="fin-empty"><i data-lucide="database"></i><h3>Nenhuma condição cadastrada</h3><p>Use o formulário para registrar a primeira condição real.</p></div>'; window.lucide?.createIcons(); return; }
    list.innerHTML = state.products.map((product) => `<article class="fin-rate-item"><div><h3>${escapeHtml(product.institution_name)} — ${escapeHtml(product.product_name)}</h3><p>${percent(product.annual_interest_rate)} a.a. • ${escapeHtml((product.amortization_systems||[]).join(" / "))} • versão ${product.version} • ${product.active ? "Ativa" : "Inativa"}<br>Fonte: ${escapeHtml(product.source_name)} • ${formatDate(product.updated_reference_at,true)}</p></div><div class="fin-item-actions"><button data-rate-edit="${product.id}">Editar</button>${product.active ? `<button data-rate-disable="${product.id}">Desativar</button>` : ""}</div></article>`).join("");
    $$('[data-rate-edit]', list).forEach((button) => button.addEventListener("click", () => editRate(state.products.find((item) => item.id === button.dataset.rateEdit))));
    $$('[data-rate-disable]', list).forEach((button) => button.addEventListener("click", async () => { if (!confirm("Desativar esta condição?")) return; await api("products", { method: "DELETE", body: JSON.stringify({ id: button.dataset.rateDisable }) }); await refreshProducts(); }));
  }

  function editRate(product) {
    const form = $("#fin-rate-form");
    Object.entries(product).forEach(([key,value]) => {
      const field = form.elements[key]; if (!field) return;
      if (field.type === "checkbox") field.checked = value === true;
      else if (field.multiple) [...field.options].forEach((option) => { option.selected = (value || []).includes(option.value); });
      else if (["fee_details","insurance_details"].includes(key)) field.value = JSON.stringify(value || {}, null, 2);
      else if (key === "updated_reference_at") field.value = String(value || "").slice(0,16);
      else if (Array.isArray(value)) field.value = value.join(", ");
      else field.value = value ?? "";
    });
    $("#fin-rate-form-title").textContent = "Editar condição";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetRateForm() {
    const form = $("#fin-rate-form"); form.reset(); form.elements.id.value = ""; form.elements.min_term_months.value = 12; form.elements.income_commitment_percent.value = 30;
    $("#fin-rate-form-title").textContent = "Nova condição real"; $("#fin-rate-status").textContent = "";
  }

  function ratePayload(form) {
    const data = new FormData(form); const payload = {};
    for (const [key,value] of data.entries()) payload[key] = value;
    numericProductFields.forEach((key) => { payload[key] = payload[key] === "" || payload[key] == null ? null : Number(payload[key]); });
    arrayProductFields.forEach((key) => { const field = form.elements[key]; payload[key] = field.multiple ? [...field.selectedOptions].map((option) => option.value) : String(field.value || "").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean); });
    ["fee_details","insurance_details"].forEach((key) => { payload[key] = JSON.parse(payload[key] || "{}"); });
    payload.cost_data_complete = form.elements.cost_data_complete.checked; payload.active = form.elements.active.checked;
    if (payload.updated_reference_at) payload.updated_reference_at = new Date(payload.updated_reference_at).toISOString();
    ["valid_from","valid_until","source_url","source_notes"].forEach((key) => { if (!payload[key]) payload[key] = null; });
    return payload;
  }

  async function saveRate(event) {
    event.preventDefault(); const form = event.currentTarget; const status = $("#fin-rate-status");
    try {
      const payload = ratePayload(form); const editing = Boolean(payload.id);
      await api("products", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      resetRateForm(); await refreshProducts(); status.textContent = "Condição salva com sucesso."; status.style.color = "var(--success)";
    } catch (error) { status.textContent = error instanceof SyntaxError ? "Os detalhes de tarifas e seguros precisam ser JSON válido." : error.message; status.style.color = "var(--danger)"; }
  }

  async function refreshProducts() {
    const data = await api("products?include_inactive=true"); state.products = data.products || []; renderRateList();
  }

  function bindEvents() {
    setupTabs(); setupMoneyInputs();
    $("#financing-form").addEventListener("submit", runSimulation);
    $("#fin-sort").addEventListener("change", renderResults);
    $("#fin-save-open").addEventListener("click", () => $("#fin-save-dialog").showModal());
    $("#fin-save-form").addEventListener("submit", saveSimulation);
    $("#fin-rate-form").addEventListener("submit", saveRate);
    $("#fin-rate-cancel").addEventListener("click", resetRateForm);
    $$('[data-close-detail]').forEach((button) => button.addEventListener("click", () => $("#fin-detail-dialog").close()));
    const stateSelect = $("#fin-state"); states.forEach((uf) => stateSelect.insertAdjacentHTML("beforeend", `<option value="${uf}">${uf}</option>`));
  }

  async function boot() {
    if (state.booted || !window.sevenGoldAuth || !calculator) return;
    state.booted = true; bindEvents(); await loadInitialData(); renderResults(); window.lucide?.createIcons();
  }

  document.addEventListener("crm-authorized", boot, { once: true });
  if (document.body.classList.contains("crm-authorized")) boot();
})();
