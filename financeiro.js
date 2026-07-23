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

  const dateLabel = (value) => {
    if (!value) return "-";
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
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
  };

  const inPeriod = (movement) => {
    if (state.period === "todos") return true;
    const now = new Date();
    const date = new Date(`${movement.movement_date}T12:00:00`);
    if (state.period === "ano") return date.getFullYear() === now.getFullYear();
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
        if (movement.type === "entrada") acc.income += amount;
        else acc.expense += amount;
        if (movement.status === "pendente") acc.pending += amount;
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
    if (!table) return;
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
    if (!client || !table) return;
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

  // ==========================================
  // BORDERÔ DE COMISSÕES INTEGRATION
  // ==========================================
  
  let companySettings = null;
  let currentUserProfile = null;
  let currentBorderoDetail = null;
  let signaturePad = null;
  let activeBorderoTab = "transactions";

  const getHeaders = async () => {
    const client = getClient();
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  const setupTabNavigation = () => {
    document.querySelectorAll("[data-finance-tab]").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        const targetTab = tabBtn.dataset.financeTab;
        activeBorderoTab = targetTab;
        
        document.querySelectorAll("[data-finance-tab]").forEach(b => b.classList.remove("active"));
        tabBtn.classList.add("active");

        if (targetTab === "transactions") {
          document.getElementById("finance-transactions-tab-content").style.display = "block";
          document.getElementById("finance-borderos-tab-content").style.display = "none";
          loadMovements();
        } else {
          document.getElementById("finance-transactions-tab-content").style.display = "none";
          document.getElementById("finance-borderos-tab-content").style.display = "block";
          initBorderosDashboard();
        }
      });
    });
  };

  const formatCargoLabel = (cargo) => {
    if (!cargo) return "Colaborador";
    return String(cargo)
      .replace(/[-_]+/g, " ")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => {
        if (word === "ceo") return "CEO";
        if (word === "sdr") return "SDR";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  };

  const initBorderosDashboard = async () => {
    const client = getClient();
    const user = await waitForUser();
    if (!client || !user) return;

    // Load active profile cargo
    const { data: profile } = await client
      .from("crm_users")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    currentUserProfile = profile;
    const role = profile?.cargo ? String(profile.cargo).toLowerCase().trim() : "";
    const isManager = ["dono", "administrador", "diretor-ceo", "financeiro"].includes(role);

    // Show/hide action buttons based on privilege
    if (isManager) {
      document.getElementById("bordero-btn-new-modal").style.display = "inline-flex";
      document.getElementById("bordero-settings-btn").style.display = "inline-flex";
    }

    await loadCompanySettings();
    await loadSellersDropdown();
    await loadBorderosList();
  };

  const loadCompanySettings = async () => {
    const headers = await getHeaders();
    try {
      const res = await fetch("/api/finance/company-settings", { headers });
      const data = await res.json();
      if (data.ok && data.settings) {
        companySettings = data.settings;
        // Populate printable labels
        document.getElementById("bordero-company-name").textContent = companySettings.nome_fantasia;
        document.getElementById("bordero-company-razao").textContent = companySettings.razao_social;
        document.getElementById("bordero-company-cnpj").textContent = companySettings.cnpj;
        document.getElementById("bordero-company-address").textContent = companySettings.endereco;
        document.getElementById("bordero-company-phone").textContent = companySettings.telefone;
      }
    } catch (e) {
      console.error("Erro ao carregar dados da empresa", e);
    }
  };

  const loadSellersDropdown = async () => {
    const client = getClient();
    const { data: users, error } = await client
      .from("crm_users")
      .select("id, nome, email, cargo")
      .eq("ativo", true)
      .order("nome");

    if (error || !users) return;

    const filterSelect = document.getElementById("bordero-filter-seller");
    const generateSelect = document.getElementById("generate-select-seller");

    filterSelect.innerHTML = '<option value="">Filtrar Colaborador</option>';
    generateSelect.innerHTML = '<option value="">Selecione o Colaborador</option>';

    users.forEach(u => {
      const nameLabel = `${u.nome || u.email} (${formatCargoLabel(u.cargo)})`;
      
      const opt1 = document.createElement("option");
      opt1.value = u.id;
      opt1.textContent = nameLabel;
      filterSelect.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = u.id;
      opt2.textContent = nameLabel;
      generateSelect.appendChild(opt2);
    });
  };

  const loadBorderosList = async () => {
    const headers = await getHeaders();
    const filterSeller = document.getElementById("bordero-filter-seller").value;
    const filterStatus = document.getElementById("bordero-filter-status").value;

    let url = "/api/finance/borderos/list";
    const params = [];
    if (filterSeller) params.push(`seller_id=${filterSeller}`);
    if (filterStatus) params.push(`status=${filterStatus}`);
    if (params.length) url += `?${params.join("&")}`;

    const tbody = document.getElementById("bordero-list-table-body");
    tbody.innerHTML = '<tr><td colspan="6">Buscando borderôs...</td></tr>';

    try {
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!data.ok || !data.statements) {
        tbody.innerHTML = '<tr><td colspan="6">Nenhum borderô gerado ainda.</td></tr>';
        return;
      }

      const statements = data.statements;
      tbody.innerHTML = "";

      let totalCount = statements.length;
      let approvedSum = 0;
      let paidSum = 0;
      let pendingSum = 0;

      statements.forEach(stmt => {
        const netAmt = Number(stmt.net_amount);
        if (stmt.status === "paid") paidSum += netAmt;
        else if (["approved", "signed"].includes(stmt.status)) approvedSum += netAmt;
        else if (["draft", "pending_check", "pending_signature"].includes(stmt.status)) pendingSum += netAmt;

        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.innerHTML = `
          <td><strong>#${String(stmt.statement_number).padStart(6, '0')}</strong></td>
          <td>${stmt.seller_name}</td>
          <td>${formatCargoLabel(stmt.seller_cargo)}</td>
          <td>${dateLabel(stmt.period_start)} - ${dateLabel(stmt.period_end)}</td>
          <td><strong>${money(stmt.net_amount)}</strong></td>
          <td><span class="status-badge ${stmt.status}">${formatStatus(stmt.status)}</span></td>
        `;

        row.addEventListener("click", () => loadBorderoDetails(stmt.id));
        tbody.appendChild(row);
      });

      // Update statistics
      document.getElementById("bordero-stat-total").textContent = totalCount;
      document.getElementById("bordero-stat-approved").textContent = money(approvedSum);
      document.getElementById("bordero-stat-paid").textContent = money(paidSum);
      document.getElementById("bordero-stat-pending").textContent = money(pendingSum);

      if (statements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">Nenhum borderô correspondente encontrado.</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="6">Erro ao listar borderôs.</td></tr>';
    }
  };

  const formatStatus = (status) => {
    const map = {
      draft: "Elaboração",
      pending_check: "Conferência",
      approved: "Aprovado",
      pending_signature: "Aguardando Assinatura",
      signed: "Assinado",
      paid: "Pago",
      cancelled: "Cancelado"
    };
    return map[status] || status;
  };

  const loadBorderoDetails = async (id) => {
    const headers = await getHeaders();
    try {
      const res = await fetch(`/api/finance/borderos/list?id=${id}`, { headers });
      const data = await res.json();
      if (!data.ok || !data.statement) return;

      currentBorderoDetail = data.statement;
      const stmt = data.statement;
      const items = data.items || [];
      const adjustments = data.adjustments || [];
      const logs = data.logs || [];

      // Hide empty state, show viewer
      document.getElementById("bordero-empty-state").style.display = "none";
      document.getElementById("bordero-viewer").style.display = "block";

      // Header labels
      document.getElementById("bordero-detail-number").textContent = String(stmt.statement_number).padStart(6, '0');
      document.getElementById("bordero-detail-name").textContent = stmt.seller_name;
      document.getElementById("bordero-detail-cargo").textContent = formatCargoLabel(stmt.seller_cargo);
      document.getElementById("bordero-detail-period").textContent = `${dateLabel(stmt.period_start)} - ${dateLabel(stmt.period_end)}`;
      document.getElementById("bordero-detail-emitted").textContent = dateLabel(stmt.created_at?.slice(0, 10));

      const badge = document.getElementById("bordero-detail-status-badge");
      badge.className = `status-badge ${stmt.status}`;
      badge.textContent = formatStatus(stmt.status);

      // Render sales grid rows
      const salesTbody = document.getElementById("bordero-detail-sales-rows");
      salesTbody.innerHTML = "";
      items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${dateLabel(item.sale_date)}</td>
          <td>${item.client_name}</td>
          <td>${money(item.credit_amount)}</td>
          <td>${item.table_number}</td>
          <td><span style="font-size:0.7rem; color:#64748b;">${item.rule_applied}</span></td>
          <td style="text-align: right; font-weight:700; color: ${item.status === 'checked' ? '#16a34a' : '#d97706'}">${money(item.commission_amount)}</td>
        `;
        salesTbody.appendChild(tr);
      });

      // Render adjustments in totals block
      const adjustTbody = document.getElementById("bordero-summary-adjusts-rows");
      adjustTbody.innerHTML = "";
      
      const typeLabels = {
        bonus: "Bônus",
        advance: "Adiantamento",
        discount: "Desconto",
        chargeback: "Estorno",
        positive: "Ajuste Positivo",
        negative: "Ajuste Negativo"
      };

      adjustments.forEach(adj => {
        const isCredit = ['bonus', 'positive'].includes(adj.type);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="font-size:0.75rem;">${typeLabels[adj.type]} (${adj.reason}):</td>
          <td style="text-align: right; font-weight:600; color: ${isCredit ? '#16a34a' : '#dc2626'}">
            ${isCredit ? '+' : '-'}&nbsp;${money(adj.amount)}
          </td>
        `;
        adjustTbody.appendChild(tr);
      });

      // Bottom Totals
      document.getElementById("bordero-summary-sales-count").textContent = stmt.total_sales_count;
      document.getElementById("bordero-summary-credit-total").textContent = money(stmt.total_credit_amount);
      document.getElementById("bordero-summary-commission-approved").textContent = money(stmt.approved_commission);
      document.getElementById("bordero-summary-commission-pending").textContent = money(stmt.pending_commission);
      document.getElementById("bordero-summary-net-amount").textContent = money(stmt.net_amount);

      // Audit logs
      const logsBlock = document.getElementById("bordero-detail-logs-block");
      const logsList = document.getElementById("bordero-detail-logs-list");
      logsList.innerHTML = "";
      
      if (logs.length > 0) {
        logsBlock.style.display = "block";
        logs.forEach(log => {
          const div = document.createElement("div");
          div.className = "timeline-item";
          
          const paulTime = new Date(log.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
          div.innerHTML = `
            <strong>${log.user_name}</strong> · ${log.details} <br/>
            <span>${paulTime}</span>
          `;
          logsList.appendChild(div);
        });
      } else {
        logsBlock.style.display = "none";
      }

      // Handle Signature block
      const sigPendingSection = document.getElementById("bordero-signature-pending");
      const sigSignedSection = document.getElementById("bordero-signature-signed");
      sigPendingSection.style.display = "none";
      sigSignedSection.style.display = "none";

      const role = currentUserProfile?.cargo ? String(currentUserProfile.cargo).toLowerCase().trim() : "";
      const isOwner = String(stmt.seller_email).toLowerCase().trim() === String(currentUserProfile?.email).toLowerCase().trim();

      if (stmt.status === "approved") {
        if (isOwner) {
          sigPendingSection.style.display = "block";
          initSignatureCanvas();
        }
      } else if (stmt.status === "signed" || stmt.status === "paid") {
        sigSignedSection.style.display = "flex";
        document.getElementById("bordero-signed-img").src = stmt.signature_image || "";
        document.getElementById("bordero-signed-name").textContent = stmt.signature_name;
        document.getElementById("bordero-signed-cpf").textContent = stmt.signature_cpf;
        document.getElementById("bordero-signed-ip").textContent = stmt.signature_ip;
        
        const sigTime = new Date(stmt.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        document.getElementById("bordero-signed-date").textContent = sigTime;
      }

      // Action buttons permissions mapping
      const isManager = ["dono", "administrador", "diretor-ceo", "financeiro"].includes(role);
      
      // Default hide all status update buttons
      document.getElementById("bordero-action-approve").style.display = "none";
      document.getElementById("bordero-action-pay").style.display = "none";
      document.getElementById("bordero-action-adjust").style.display = "none";
      document.getElementById("bordero-action-cancel").style.display = "none";

      if (isManager) {
        if (["draft", "pending_check"].includes(stmt.status)) {
          document.getElementById("bordero-action-approve").style.display = "inline-flex";
          document.getElementById("bordero-action-adjust").style.display = "inline-flex";
        }
        if (["approved", "signed"].includes(stmt.status)) {
          document.getElementById("bordero-action-pay").style.display = "inline-flex";
        }
        if (stmt.status !== "paid" && stmt.status !== "cancelled") {
          document.getElementById("bordero-action-cancel").style.display = "inline-flex";
        }
      }
    } catch (e) {
      console.error("Erro ao carregar detalhes do borderô", e);
    }
  };

  const initSignatureCanvas = () => {
    const canvas = document.getElementById("signature-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    // Adjust canvas resolution
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
    };
    resizeCanvas();

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e) => {
      drawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    };

    const draw = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      drawing = false;
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    // Mouse Listeners
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Touch Listeners
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);

    // Clear Button
    const clearBtn = document.getElementById("signature-canvas-clear");
    clearBtn.onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    signaturePad = {
      isEmpty: () => {
        // Simple check if canvas contains non-background pixels
        const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        return !buffer.some(color => color !== 0);
      },
      toDataURL: () => canvas.toDataURL("image/png")
    };
  };

  // ==========================================
  // ACTION EVENT HANDLERS
  // ==========================================

  // Open settings
  document.getElementById("bordero-settings-btn")?.addEventListener("click", async () => {
    const dialog = document.getElementById("company-settings-dialog");
    const form = document.getElementById("company-settings-form");
    const status = document.getElementById("company-settings-status");
    
    status.textContent = "";
    if (companySettings) {
      form.elements.nome_fantasia.value = companySettings.nome_fantasia || "";
      form.elements.razao_social.value = companySettings.razao_social || "";
      form.elements.cnpj.value = companySettings.cnpj || "";
      form.elements.endereco.value = companySettings.endereco || "";
      form.elements.telefone.value = companySettings.telefone || "";
    }
    dialog.showModal();
  });

  document.getElementById("company-settings-cancel")?.addEventListener("click", () => {
    document.getElementById("company-settings-dialog").close();
  });

  document.getElementById("company-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const headers = await getHeaders();
    const form = e.target;
    const submitBtn = form.querySelector("button[type='submit']");
    const status = document.getElementById("company-settings-status");

    submitBtn.disabled = true;
    status.style.color = "#fff";
    status.textContent = "Salvando...";

    const payload = {
      nome_fantasia: form.elements.nome_fantasia.value,
      razao_social: form.elements.razao_social.value,
      cnpj: form.elements.cnpj.value,
      endereco: form.elements.endereco.value,
      telefone: form.elements.telefone.value
    };

    try {
      const res = await fetch("/api/finance/company-settings", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        companySettings = data.settings;
        status.style.color = "#10b981";
        status.textContent = "Alterações salvas com sucesso!";
        
        // Update printable area
        document.getElementById("bordero-company-name").textContent = companySettings.nome_fantasia;
        document.getElementById("bordero-company-razao").textContent = companySettings.razao_social;
        document.getElementById("bordero-company-cnpj").textContent = companySettings.cnpj;
        document.getElementById("bordero-company-address").textContent = companySettings.endereco;
        document.getElementById("bordero-company-phone").textContent = companySettings.telefone;

        setTimeout(() => {
          document.getElementById("company-settings-dialog").close();
        }, 800);
      } else {
        status.style.color = "#ef4444";
        status.textContent = data.error || "Erro ao salvar alterações.";
      }
    } catch (err) {
      status.style.color = "#ef4444";
      status.textContent = "Erro de conexão com o servidor.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Open Generate dialog
  document.getElementById("bordero-btn-new-modal")?.addEventListener("click", () => {
    const dialog = document.getElementById("bordero-generate-dialog");
    document.getElementById("generate-error-msg").style.display = "none";
    document.getElementById("bordero-generate-form").reset();
    dialog.showModal();
  });

  document.getElementById("bordero-generate-cancel")?.addEventListener("click", () => {
    document.getElementById("bordero-generate-dialog").close();
  });

  document.getElementById("bordero-generate-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const headers = await getHeaders();
    const form = e.target;
    const submitBtn = document.getElementById("bordero-generate-submit");
    const errMsg = document.getElementById("generate-error-msg");

    errMsg.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Calculando...";

    const payload = {
      seller_id: form.elements["generate-select-seller"].value,
      period_start: form.elements["generate-date-start"].value,
      period_end: form.elements["generate-date-end"].value
    };

    try {
      const res = await fetch("/api/finance/borderos/generate", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok && data.statement) {
        document.getElementById("bordero-generate-dialog").close();
        await loadBorderosList();
        await loadBorderoDetails(data.statement.id);
      } else {
        errMsg.textContent = data.error || "Erro ao gerar borderô.";
        errMsg.style.display = "block";
      }
    } catch (err) {
      errMsg.textContent = "Erro de conexão. Tente novamente.";
      errMsg.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gerar e Visualizar";
    }
  });

  // Approve action
  document.getElementById("bordero-action-approve")?.addEventListener("click", async () => {
    if (!currentBorderoDetail) return;
    if (confirm("Deseja aprovar as comissões deste borderô e enviá-lo para assinatura do colaborador?")) {
      const headers = await getHeaders();
      try {
        const res = await fetch("/api/finance/borderos/update-status", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: currentBorderoDetail.id, status: "approved" })
        });
        const data = await res.json();
        if (data.ok) {
          await loadBorderosList();
          await loadBorderoDetails(currentBorderoDetail.id);
        } else {
          alert(data.error || "Erro ao aprovar borderô.");
        }
      } catch (err) {
        alert("Erro de conexão.");
      }
    }
  });

  // Pay action
  document.getElementById("bordero-action-pay")?.addEventListener("click", async () => {
    if (!currentBorderoDetail) return;
    if (confirm("Deseja marcar este borderô como PAGO permanentemente?")) {
      const headers = await getHeaders();
      try {
        const res = await fetch("/api/finance/borderos/update-status", {
          method: "POST",
          headers,
          body: JSON.stringify({ id: currentBorderoDetail.id, status: "paid" })
        });
        const data = await res.json();
        if (data.ok) {
          await loadBorderosList();
          await loadBorderoDetails(currentBorderoDetail.id);
        } else {
          alert(data.error || "Erro ao liquidar borderô.");
        }
      } catch (err) {
        alert("Erro de conexão.");
      }
    }
  });

  // Cancel action
  document.getElementById("bordero-action-cancel")?.addEventListener("click", async () => {
    if (!currentBorderoDetail) return;
    const reason = prompt("Informe a justificativa do cancelamento deste borderô:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("A justificativa é obrigatória para cancelar.");
      return;
    }

    const headers = await getHeaders();
    try {
      const res = await fetch("/api/finance/borderos/update-status", {
        method: "POST",
        headers,
        body: JSON.stringify({ id: currentBorderoDetail.id, status: "cancelled", cancellation_reason: reason.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        await loadBorderosList();
        await loadBorderoDetails(currentBorderoDetail.id);
      } else {
        alert(data.error || "Erro ao cancelar borderô.");
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  });

  // Open adjustment modal
  document.getElementById("bordero-action-adjust")?.addEventListener("click", () => {
    const dialog = document.getElementById("bordero-adjust-dialog");
    document.getElementById("adjust-error-msg").style.display = "none";
    document.getElementById("bordero-adjust-form").reset();
    dialog.showModal();
  });

  document.getElementById("bordero-adjust-cancel")?.addEventListener("click", () => {
    document.getElementById("bordero-adjust-dialog").close();
  });

  document.getElementById("bordero-adjust-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentBorderoDetail) return;

    const headers = await getHeaders();
    const form = e.target;
    const errMsg = document.getElementById("adjust-error-msg");
    const submitBtn = form.querySelector("button[type='submit']");

    errMsg.style.display = "none";
    submitBtn.disabled = true;

    const payload = {
      statement_id: currentBorderoDetail.id,
      type: form.elements["adjust-type"].value,
      amount: form.elements["adjust-amount"].value,
      reason: form.elements["adjust-reason"].value
    };

    try {
      const res = await fetch("/api/finance/borderos/adjust", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        document.getElementById("bordero-adjust-dialog").close();
        await loadBorderosList();
        await loadBorderoDetails(currentBorderoDetail.id);
      } else {
        errMsg.textContent = data.error || "Erro ao salvar ajuste.";
        errMsg.style.display = "block";
      }
    } catch (err) {
      errMsg.textContent = "Erro de conexão.";
      errMsg.style.display = "block";
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Sign submit Simple Electronic Signature
  document.getElementById("bordero-sign-submit")?.addEventListener("click", async () => {
    if (!currentBorderoDetail) return;

    const nameInput = document.getElementById("signature-input-name").value.trim();
    const cpfInput = document.getElementById("signature-input-cpf").value.trim();
    const agreeCheck = document.getElementById("signature-checkbox-agree").checked;

    if (!nameInput || !cpfInput) {
      alert("Por favor, preencha seu nome completo e seu CPF.");
      return;
    }

    if (!agreeCheck) {
      alert("Você deve marcar a caixa declarando que está de acordo com as informações.");
      return;
    }

    if (!signaturePad || signaturePad.isEmpty()) {
      alert("Você deve desenhar sua assinatura no quadro.");
      return;
    }

    const submitBtn = document.getElementById("bordero-sign-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Assinando...";

    const signature_image = signaturePad.toDataURL();
    
    // Obtain client IP address
    let signature_ip = "IP Desconhecido";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      if (ipData?.ip) signature_ip = ipData.ip;
    } catch (err) {
      console.warn("Não foi possível detectar o IP. Proseguindo...");
    }

    const payload = {
      id: currentBorderoDetail.id,
      signature_name: nameInput,
      signature_cpf: cpfInput,
      signature_ip,
      signature_image
    };

    const headers = await getHeaders();
    try {
      const res = await fetch("/api/finance/borderos/sign", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        await loadBorderosList();
        await loadBorderoDetails(currentBorderoDetail.id);
      } else {
        alert(data.error || "Erro ao registrar assinatura.");
      }
    } catch (err) {
      alert("Erro ao registrar a assinatura eletrônica.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Registrar Assinatura Eletrônica";
    }
  });

  // Export PDF using html2pdf
  document.getElementById("bordero-action-pdf")?.addEventListener("click", () => {
    if (!currentBorderoDetail) return;
    const element = document.getElementById("bordero-print-area");
    
    const fileBase = `bordero-${String(currentBorderoDetail.statement_number).padStart(6, '0')}-${currentBorderoDetail.seller_name.replace(/\s+/g, '_')}`;

    // Styling print modifications inline temporarily
    const sheet = document.querySelector(".bordero-sheet");
    sheet.style.boxShadow = "none";
    sheet.style.border = "none";

    const opt = {
      margin:       10,
      filename:     `${fileBase}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).save().then(() => {
      // restore styles
      sheet.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.1)";
      sheet.style.border = "1px solid #e2e8f0";
    });
  });

  // Register filter event listeners
  document.getElementById("bordero-filter-seller")?.addEventListener("change", loadBorderosList);
  document.getElementById("bordero-filter-status")?.addEventListener("change", loadBorderosList);

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    setupTabNavigation();
    
    if (form?.elements.movement_date) {
      form.elements.movement_date.valueAsDate = new Date();
    }
    loadMovements();
  });
})();
