(function () {
  const getClient = () => window.sevenGoldAuth;

  // Currency input mask helper (BRL)
  function maskBrlCurrency(input) {
    let value = input.value.replace(/\D/g, '');
    if (!value) {
      input.value = '';
      return;
    }
    const numberValue = parseFloat(value) / 100;
    input.value = numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function formatCurrency(val) {
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function parseCurrency(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const cleanStr = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
  }

  function formatTermMonthsYears(months) {
    const m = parseInt(months, 10);
    if (isNaN(m) || m <= 0) return `${months || 0} Meses`;
    
    const years = Math.floor(m / 12);
    const remMonths = m % 12;

    let yearStr = "";
    if (years > 0) {
      yearStr += `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }
    if (remMonths > 0) {
      if (yearStr) yearStr += " e ";
      yearStr += `${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}`;
    }

    if (yearStr) {
      return `${m} Meses (${yearStr})`;
    }
    return `${m} Meses`;
  }

  async function readApiPayload(response) {
    const text = await response.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch (error) {
      const cleaned = String(text).replace(/\s+/g, ' ').trim();
      return {
        success: false,
        error: cleaned
          ? (cleaned.length > 220 ? `${cleaned.slice(0, 220)}...` : cleaned)
          : 'Resposta invalida do servidor.',
        rawResponse: text,
        parseError: error.message,
      };
    }
  }

  function getApiErrorMessage(response, payload, fallback) {
    if (payload && (payload.error || payload.message || payload.details)) {
      return payload.error || payload.message || payload.details;
    }

    if (response && !response.ok) {
      return `${fallback} Status ${response.status}.`;
    }

    return fallback;
  }

  let selectedProposal = null;

  // Render Simulator UI inside [data-tab="simulador"]
  async function renderSimulatorShell() {
    const container = document.querySelector('[data-service-tab-content="simulador"]');
    if (!container) return;

    let isAdminOrManager = false;
    try {
      const client = getClient();
      if (client) {
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
          const { data: crmUser } = await client
            .from('crm_users')
            .select('cargo')
            .eq('email', session.user.email)
            .maybeSingle();
          if (crmUser) {
            const role = String(crmUser.cargo || '').toLowerCase().trim();
            isAdminOrManager = ['dono', 'administrador', 'diretor-ceo', 'gestor', 'coordenador'].some(r => role.includes(r));
          }
        }
      }
    } catch (err) {
      console.error("Erro ao resolver permissão:", err);
    }

    // Exibe botão de configurações no menu superior se admin/gestor
    const topbarConfigBtn = document.getElementById("topbar-btn-config");
    if (topbarConfigBtn) {
      topbarConfigBtn.style.display = isAdminOrManager ? "flex" : "none";
    }

    container.innerHTML = `
      <div class="simulador-container">
        <!-- Sub-tab 1: Simulação -->
        <div class="simulador-subtab-content" id="subtab-simulacao">
          <div class="simulador-main-grid">
            <!-- Left Form Filters -->
            <form class="simulador-filters-card" id="proposal-sim-form">
              <div class="simulador-filters-header">
                <div class="simulador-header-icon-box">
                  <i data-lucide="sliders-horizontal" style="color:#D8B34A; width:20px; height:20px;"></i>
                </div>
                <div class="simulador-header-divider"></div>
                <h2 class="simulador-filters-title">Limites do Cliente</h2>
              </div>
              
              <!-- Crédito Mínimo -->
              <div class="simulador-field-row">
                <div class="simulador-field-icon-box">
                  <i data-lucide="dollar-sign" style="color:#D8B34A; width:20px; height:20px;"></i>
                </div>
                <div class="simulador-field-group">
                  <div class="simulador-field-label-row">
                    <label for="sim-min-credit">Crédito Mínimo</label>
                  </div>
                  <input type="text" id="sim-min-credit" class="simulador-input brl-mask" placeholder="R$ 200.000,00" />
                </div>
              </div>

              <!-- Crédito Máximo -->
              <div class="simulador-field-row">
                <div class="simulador-field-icon-box">
                  <i data-lucide="dollar-sign" style="color:#D8B34A; width:20px; height:20px;"></i>
                </div>
                <div class="simulador-field-group">
                  <div class="simulador-field-label-row">
                    <label for="sim-max-credit">Crédito Máximo</label>
                  </div>
                  <input type="text" id="sim-max-credit" class="simulador-input brl-mask" placeholder="R$ 300.000,00" />
                </div>
              </div>

              <!-- Entrada Máxima -->
              <div class="simulador-field-row">
                <div class="simulador-field-icon-box">
                  <i data-lucide="home" style="color:#D8B34A; width:20px; height:20px;"></i>
                </div>
                <div class="simulador-field-group">
                  <div class="simulador-field-label-row">
                    <label for="sim-max-first-inst">Entrada Máxima</label>
                    <i data-lucide="info" style="color:#D8B34A; width:16px; height:16px; cursor:pointer;" title="Informe a entrada máxima disponível pelo cliente."></i>
                  </div>
                  <input type="text" id="sim-max-first-inst" class="simulador-input brl-mask" placeholder="R$ 24.000,00" required />
                </div>
              </div>

              <!-- Valor de Parcela Máxima -->
              <div class="simulador-field-row">
                <div class="simulador-field-icon-box">
                  <i data-lucide="calendar" style="color:#D8B34A; width:20px; height:20px;"></i>
                </div>
                <div class="simulador-field-group">
                  <div class="simulador-field-label-row">
                    <label for="sim-max-inst">Valor de Parcela Máxima</label>
                    <i data-lucide="info" style="color:#D8B34A; width:16px; height:16px; cursor:pointer;" title="Informe o valor máximo de parcela mensal suportado pelo cliente."></i>
                  </div>
                  <input type="text" id="sim-max-inst" class="simulador-input brl-mask" placeholder="R$ 1.850,00" required />
                </div>
              </div>

              <!-- Checkbox: Considerar Parcela Integral -->
              <div class="simulador-checkbox-container">
                <label for="sim-use-half-inst" class="simulador-checkbox-label">
                  <input type="checkbox" id="sim-use-half-inst" class="simulador-checkbox-input" />
                  <div class="simulador-checkbox-text">
                    <strong class="simulador-checkbox-title">Considerar Parcela Integral (100%)</strong>
                    <span class="simulador-checkbox-sub">Marcando esta opção será considerada a parcela com 100% do crédito.</span>
                  </div>
                </label>
              </div>

              <!-- Action Buttons -->
              <div class="simulador-actions">
                <button type="submit" class="simulador-btn-search">
                  <i data-lucide="search" style="color:#E8B138; width:18px; height:18px;"></i> Buscar Propostas
                </button>
                <button type="button" class="simulador-btn-reset" id="sim-reset-btn">
                  <i data-lucide="rotate-ccw" style="color:#E8B138; width:18px; height:18px;"></i> Limpar Filtros
                </button>
              </div>
            </form>

            <!-- Right Results List -->
            <div class="simulador-results-container">
              <div class="simulador-sticky-top-bar">
                <div class="simulador-results-header is-empty-notice" id="sim-results-header">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="empty-notice-info-icon" id="sim-empty-info-icon">
                      <i data-lucide="info"></i>
                    </div>
                    <span class="simulador-results-count" id="sim-results-count-text">
                      Informe os limites do cliente ao lado para realizar a simulação.
                    </span>
                  </div>
                  <button type="button" class="bordero-btn-secondary" id="sim-toggle-near-btn" style="display:none;">
                    <i data-lucide="eye"></i> Mostrar Opções Próximas
                  </button>
                </div>

                <!-- Quick Sorting Bar -->
                <div class="simulador-sort-bar" id="sim-sort-bar" style="display:none; padding:10px 16px; background:#ffffff; border:1px solid #e7e1eb; border-radius:12px; margin-bottom:12px; gap:8px; flex-wrap:wrap; align-items:center;">
                  <span style="font-size:0.78rem; font-weight:800; color:#150126; margin-right:4px;">Ordenar por:</span>
                  <button type="button" class="sim-sort-btn active" data-sort-by="credit-desc" style="padding:6px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer; background:#e8b138; color:#15121a; border:none; font-weight:800;">
                    💳 Crédito (Maior → Menor)
                  </button>
                  <button type="button" class="sim-sort-btn" data-sort-by="inst-desc" style="padding:6px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer; background:#f7f6f8; color:#6f6878; border:1px solid #e7e1eb; font-weight:600;">
                    📊 Parcela (Maior → Menor)
                  </button>
                  <button type="button" class="sim-sort-btn" data-sort-by="inst-asc" style="padding:6px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer; background:#f7f6f8; color:#6f6878; border:1px solid #e7e1eb; font-weight:600;">
                    📉 Parcela (Menor → Maior)
                  </button>
                  <button type="button" class="sim-sort-btn" data-sort-by="first-desc" style="padding:6px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer; background:#f7f6f8; color:#6f6878; border:1px solid #e7e1eb; font-weight:600;">
                    💰 Entrada (Maior → Menor)
                  </button>
                  <button type="button" class="sim-sort-btn" data-sort-by="first-asc" style="padding:6px 12px; font-size:0.78rem; border-radius:6px; cursor:pointer; background:#f7f6f8; color:#6f6878; border:1px solid #e7e1eb; font-weight:600;">
                    🏷️ Entrada (Menor → Maior)
                  </button>
                </div>
              </div>

              <div class="proposals-cards-list" id="sim-proposals-list">
                <!-- Simulation Results Cards injected dynamically -->
                <div class="simulador-empty-state-card">
                  <div class="empty-state-sparkles-container">
                    <div class="empty-state-badge">
                      <i data-lucide="calculator" class="empty-state-calc-icon"></i>
                      <span class="sparkle sparkle-top-right">✨</span>
                      <span class="sparkle sparkle-bottom-left">✨</span>
                    </div>
                  </div>
                  
                  <h2 class="empty-state-title">Simule propostas personalizadas</h2>
                  <p class="empty-state-subtitle">
                    Preencha os valores de crédito e parcelas ao lado<br />
                    e clique em <strong class="highlight-gold">Buscar Propostas</strong> para visualizar as melhores opções.
                  </p>

                  <div class="empty-state-illustration">
                    <div class="ill-card ill-card-bar">
                      <div class="ill-line-short"></div>
                      <div class="ill-bars">
                        <span style="height: 18px;"></span>
                        <span style="height: 28px;"></span>
                        <span style="height: 22px;"></span>
                      </div>
                    </div>
                    <div class="ill-bars-standalone">
                      <span style="height: 48px;"></span>
                      <span style="height: 32px;"></span>
                    </div>
                    <div class="ill-pie-chart"></div>
                    <div class="ill-card ill-card-doc">
                      <div class="ill-line"></div>
                      <div class="ill-line"></div>
                      <div class="ill-line short"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-tab 2: Clientes (Visível a todos) -->
        <div class="simulador-subtab-content" id="subtab-clientes" style="display:none;">
          <div class="closed-clients-panel">
            <div class="closed-clients-kpi-grid">
              <div class="closed-kpi-card">
                <div class="closed-kpi-icon gold"><i data-lucide="users"></i></div>
                <div class="closed-kpi-info">
                  <span class="closed-kpi-label">CLIENTES FECHADOS</span>
                  <strong class="closed-kpi-value" id="kpi-total-clients">0</strong>
                </div>
              </div>
              <div class="closed-kpi-card">
                <div class="closed-kpi-icon green"><i data-lucide="badge-dollar-sign"></i></div>
                <div class="closed-kpi-info">
                  <span class="closed-kpi-label">CRÉDITO TOTAL FECHADO</span>
                  <strong class="closed-kpi-value" id="kpi-total-credit">R$ 0,00</strong>
                </div>
              </div>
              <div class="closed-kpi-card">
                <div class="closed-kpi-icon blue"><i data-lucide="file-check-2"></i></div>
                <div class="closed-kpi-info">
                  <span class="closed-kpi-label">CONTRATOS ASSINADOS</span>
                  <strong class="closed-kpi-value" id="kpi-signed-contracts">0</strong>
                </div>
              </div>
            </div>

            <!-- Filter & Action Bar -->
            <div class="closed-clients-filter-bar">
              <div class="closed-search-input-box">
                <i data-lucide="search" class="closed-search-icon"></i>
                <input type="text" id="closed-search-input" placeholder="Buscar por cliente, CPF/CNPJ, grupo ou cota..." />
              </div>
              <select id="closed-filter-status" class="closed-filter-select">
                <option value="">Todos os Status</option>
                <option value="Assinado">Assinado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Contemplado">Contemplado</option>
              </select>
              <button type="button" class="simulador-btn-submit" id="btn-add-closed-client" style="width:auto; padding:10px 18px; margin:0;">
                <i data-lucide="user-plus"></i> Novo Cliente Fechado
              </button>
            </div>

            <!-- Clients Table -->
            <div class="closed-clients-table-wrapper">
              <table class="closed-clients-table">
                <thead>
                  <tr>
                    <th>CLIENTE / CONTATO</th>
                    <th>PRODUTO / GRUPO & COTA</th>
                    <th>VALOR DE CRÉDITO</th>
                    <th>ENTRADA / PARCELA</th>
                    <th>FECHAMENTO</th>
                    <th>DOCS OBRIGATÓRIOS</th>
                    <th>STATUS</th>
                    <th style="text-align: right;">AÇÕES</th>
                  </tr>
                </thead>
                <tbody id="closed-clients-tbody">
                  <!-- Injected dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Gerenciar Documentos Obrigatórios do Contrato -->
        <div id="modal-client-docs" class="modal-overlay-closed-client" style="display:none; z-index:99999;">
          <div class="modal-card-closed-client" style="max-width:780px;">
            <div class="modal-header-closed-client">
              <div>
                <h3 id="modal-docs-client-name" style="margin:0; font-size:1.15rem; color:#0F172A; font-weight:800; display:flex; align-items:center; gap:8px;">
                  <i data-lucide="folder-check" style="color:#D8B34A;"></i> Documentos Obrigatórios do Contrato
                </h3>
                <p id="modal-docs-client-sub" style="margin:4px 0 0 0; font-size:0.8rem; color:#64748B;"></p>
              </div>
              <button type="button" class="modal-close-btn" id="btn-close-docs-modal">&times;</button>
            </div>

            <div class="modal-body-docs" style="padding:20px 24px;">
              <div id="modal-docs-compliance-banner" class="compliance-banner" style="margin-bottom:20px;"></div>
              <div class="mandatory-docs-list" id="mandatory-docs-slots-container" style="display:flex; flex-direction:column; gap:16px;"></div>
            </div>

            <div class="modal-footer-closed-client" style="padding:16px 24px; background:#F8FAFC; border-top:1px solid #E2E8F0; display:flex; justify-content:flex-end;">
              <button type="button" class="btn-cancel-closed" id="btn-finish-docs-modal" style="background:#0F172A; color:#FFFFFF; padding:8px 20px; border-radius:8px; font-weight:700;">Concluído</button>
            </div>
          </div>
        </div>

        <!-- Sub-tab 3: Configurações -->
        <div class="simulador-subtab-content" id="subtab-configuracoes" style="display:none;">
          <div class="admin-proposals-panel">
            <!-- Active Table Info Panel -->
            <div id="sim-active-table-panel" class="admin-card-box" style="margin-bottom:16px;">
              <h2 style="color:#0f172a; font-size:1.1rem; margin:0 0 14px; font-weight:800; display:flex; align-items:center; gap:8px;">
                <i data-lucide="database" style="color:#b45309; width:18px;"></i> Tabela Comercial Ativa
              </h2>
              <div id="sim-active-table-content">
                <div style="display:flex; align-items:center; gap:8px; color:#64748b; font-size:0.85rem;">
                  <i data-lucide="loader-2" class="animate-spin" style="width:16px; height:16px; color:#b45309;"></i>
                  Carregando tabela ativa...
                </div>
              </div>
            </div>

            <!-- Upload PDF Box -->
            <div class="admin-card-box">
              <h2 style="color:#0f172a; font-size:1.1rem; margin:0; font-weight:800;"><i data-lucide="file-up" style="color:#b45309; width:18px;"></i> Importar Nova Tabela Comercial (PDF)</h2>
              
              <div class="pdf-upload-dropzone" id="sim-pdf-dropzone">
                <i data-lucide="upload-cloud" style="width:40px; height:40px; color:#b45309;"></i>
                <p style="font-size:0.9rem; font-weight:700; color:#0f172a; margin:0;">Clique aqui ou arraste o arquivo PDF da Tabela Comercial</p>
                <span style="font-size:0.75rem; color:#64748b;">Suporta arquivos PDF comerciais originais de até 20MB com hash de validação SHA-256</span>
                <input type="file" id="sim-pdf-file-input" accept=".pdf" style="display:none;" />
              </div>

              <div id="sim-upload-preview-area" style="display:none;">
                <!-- Dynamic preview injected here -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Apply currency mask listeners
    document.querySelectorAll('.brl-mask').forEach(input => {
      input.addEventListener('input', () => maskBrlCurrency(input));
    });

    // Sub-tabs click handlers
    document.querySelectorAll('.simulador-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.simulador-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Always show the main simulator container and hide A4 proposal container when navigating topbar tabs
        const simContainer = document.querySelector('[data-service-tab-content="simulador"]');
        const pfContainer = document.getElementById('proposta-final-container');
        if (simContainer) simContainer.style.display = 'block';
        if (pfContainer) pfContainer.style.display = 'none';

        const targetSubtab = btn.dataset.subtab;
        document.querySelectorAll('.simulador-subtab-content').forEach(c => c.style.display = 'none');
        const activeContent = document.getElementById(`subtab-${targetSubtab}`);
        if (activeContent) activeContent.style.display = 'block';

        if (targetSubtab === 'tabelas') fetchActiveTablesList();
        if (targetSubtab === 'configuracoes') loadActiveTableInfo();
        if (targetSubtab === 'clientes') renderClosedClientsTab();
      });
    });

    // Pre-initialize closed clients list and fetch Supabase records
    renderClosedClientsTab();
    fetchSupabaseProposals();

    // Search and status filter listeners for closed clients
    document.getElementById('closed-search-input')?.addEventListener('input', () => renderClosedClientsTab());
    document.getElementById('closed-filter-status')?.addEventListener('change', () => renderClosedClientsTab());

    document.getElementById("btn-add-closed-client")?.addEventListener("click", () => {
      const nome = prompt("Nome do Cliente:");
      if (!nome) return;
      const cpf_cnpj = prompt("CPF ou CNPJ (opcional):") || "";
      const produto = prompt("Produto (ex: Imóveis, Auto, Pesados):", "Imóveis (AUTOCON)") || "Imóveis (AUTOCON)";
      const creditoStr = prompt("Valor do Crédito (R$):", "500000") || "500000";
      const entradaStr = prompt("Valor da Entrada / Adesão (R$):", "25000") || "25000";
      const parcelaStr = prompt("Valor da Parcela (R$):", "2450") || "2450";
      const grupo_cota = prompt("Grupo & Cota:", "Grupo 7042 / Cota 148") || "";

      const newClient = {
        id: "cl-" + Date.now(),
        nome,
        cpf_cnpj,
        telefone: "",
        produto,
        credito: parseFloat(creditoStr.replace(/[^0-9.]/g, "")) || 500000,
        entrada: parseFloat(entradaStr.replace(/[^0-9.]/g, "")) || 25000,
        parcela: parseFloat(parcelaStr.replace(/[^0-9.]/g, "")) || 2450,
        grupo_cota,
        data_fechamento: new Date().toISOString().slice(0, 10),
        status: "Assinado",
        consultor: "Seven Gold"
      };

      const currentList = getClosedClientsList();
      currentList.unshift(newClient);
      saveClosedClientsList(currentList);
      renderClosedClientsTab();
    });

    // Load and render the currently active table info in the admin panel
    async function loadActiveTableInfo() {
      const contentEl = document.getElementById('sim-active-table-content');
      if (!contentEl) return;
      try {
        const resp = await fetch('/api/attendance/proposals/imports/history');
        const data = await readApiPayload(resp);
        const imports = data.imports || [];
        const active = imports.find(i => i.status === 'ACTIVE') || imports[0];

        if (!active) {
          contentEl.innerHTML = `<p style="color:#64748b; font-size:0.85rem; margin:0;">Nenhuma tabela ativa encontrada.</p>`;
          return;
        }

        const uploadedDate = active.activated_at || active.created_at
          ? new Date(active.activated_at || active.created_at).toLocaleString('pt-BR')
          : '—';

        contentEl.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr auto; gap:16px; align-items:center;">
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:36px; height:36px; border-radius:8px; background:rgba(180,83,9,0.08); border:1px solid rgba(180,83,9,0.25); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <i data-lucide="file-text" style="width:18px; height:18px; color:#b45309;"></i>
                </div>
                <div>
                  <div style="font-weight:800; color:#0f172a; font-size:0.95rem; word-break:break-all;">${active.source_file_name || 'Tabela.pdf'}</div>
                  <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                    Versão: <strong style="color:#b45309;">${active.version || 'v1.0'}</strong>
                    &nbsp;•&nbsp; ${active.valid_tables_count || 0} planos &nbsp;•&nbsp; ${active.proposal_rows_count || 0} propostas
                  </div>
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.78rem; color:#64748b;">
                <div><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle; color:#b45309;"></i> Ativada em: <strong style="color:#0f172a;">${uploadedDate}</strong></div>
                <div><i data-lucide="user" style="width:12px; height:12px; vertical-align:middle; color:#b45309;"></i> Por: <strong style="color:#0f172a;">${active.uploaded_by || 'Administrador'}</strong></div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
              <span style="background:rgba(16,185,129,0.12); color:#047857; font-size:0.72rem; font-weight:700; padding:3px 10px; border-radius:20px; border:1px solid rgba(16,185,129,0.3); white-space:nowrap;">
                ✓ ATIVA
              </span>
              <button type="button" id="sim-open-pdf-btn"
                style="padding:6px 14px; font-size:0.76rem; font-weight:700; border-radius:8px; background:#000000; color:#C9A84C; border:1px solid #C9A84C; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;"
                title="Abrir PDF da tabela">
                <i data-lucide="external-link" style="width:13px; height:13px;"></i> Abrir PDF
              </button>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();

        // Open PDF button — tries to open the stored PDF URL or download link
        document.getElementById('sim-open-pdf-btn')?.addEventListener('click', () => {
          const pdfUrl = active.pdf_url || active.source_url || null;
          if (pdfUrl) {
            window.open(pdfUrl, '_blank');
          } else {
            alert(`Arquivo: ${active.source_file_name || 'Tabela.pdf'}\n\nO PDF desta tabela não possui URL direta armazenada. Para visualizá-lo, faça uma nova importação.`);
          }
        });

      } catch (err) {
        contentEl.innerHTML = `<p style="color:#ef4444; font-size:0.82rem; margin:0;">Erro ao carregar tabela ativa: ${err.message}</p>`;
      }
    }

    // Handle simulation form submit
    const simForm = document.getElementById('proposal-sim-form');
    simForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await runSimulationQuery();
    });

    // Reset filters
    document.getElementById('sim-reset-btn')?.addEventListener('click', () => {
      simForm.reset();
      document.getElementById('sim-proposals-list').innerHTML = `
        <div class="simulador-empty-state-card">
          <div class="empty-state-sparkles-container">
            <div class="empty-state-badge">
              <i data-lucide="calculator" class="empty-state-calc-icon"></i>
              <span class="sparkle sparkle-top-right">✨</span>
              <span class="sparkle sparkle-bottom-left">✨</span>
            </div>
          </div>
          
          <h2 class="empty-state-title">Simule propostas personalizadas</h2>
          <p class="empty-state-subtitle">
            Preencha os valores de crédito e parcelas ao lado<br />
            e clique em <strong class="highlight-gold">Buscar Propostas</strong> para visualizar as melhores opções.
          </p>

          <div class="empty-state-illustration">
            <div class="ill-card ill-card-bar">
              <div class="ill-line-short"></div>
              <div class="ill-bars">
                <span style="height: 18px;"></span>
                <span style="height: 28px;"></span>
                <span style="height: 22px;"></span>
              </div>
            </div>
            <div class="ill-bars-standalone">
              <span style="height: 48px;"></span>
              <span style="height: 32px;"></span>
            </div>
            <div class="ill-pie-chart"></div>
            <div class="ill-card ill-card-doc">
              <div class="ill-line"></div>
              <div class="ill-line"></div>
              <div class="ill-line short"></div>
            </div>
          </div>
        </div>
      `;
      document.getElementById('sim-results-header')?.classList.add('is-empty-notice');
      const emptyIcon = document.getElementById('sim-empty-info-icon');
      if (emptyIcon) emptyIcon.style.display = 'flex';
      document.getElementById('sim-results-count-text').textContent = 'Informe os limites do cliente ao lado para realizar a simulação.';
      if (window.lucide) window.lucide.createIcons();
    });

    // PDF Upload triggers
    const dropzone = document.getElementById('sim-pdf-dropzone');
    const fileInput = document.getElementById('sim-pdf-file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const previewArea = document.getElementById('sim-upload-preview-area');
      previewArea.style.display = 'block';
      previewArea.innerHTML = `
        <div style="padding:16px; background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.25); border-radius:10px; color:#fff; font-size:0.86rem;">
          <i data-lucide="loader-2" class="animate-spin" style="width:18px; height:18px; color:#d4af37; vertical-align:middle;"></i>
          Processando e validando PDF: <strong>${file.name}</strong>...
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      // Read file as base64 and send to backend for real PDF parsing
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const dataUrl = evt.target.result || '';
        const base64Data = dataUrl.split(',')[1] || '';
        try {
          const resp = await fetch('/api/attendance/proposals/imports/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_name: file.name,
              pdf_base64: base64Data,
            }),
          });
          const data = await readApiPayload(resp);
          if (!resp.ok) {
            throw new Error(getApiErrorMessage(resp, data, 'Erro ao enviar arquivo.'));
          }

          if (data.success && data.preview) {
            const p = data.preview;
            previewArea.innerHTML = `
              <div style="padding:20px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:12px; display:flex; flex-direction:column; gap:12px;">
                <h3 style="color:#10b981; font-size:0.95rem; margin:0; font-weight:800;">✓ PDF Processado com Sucesso!</h3>
                <div style="font-size:0.82rem; color:#374151; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <div><strong>Planos encontrados:</strong> ${p.tablesCount}</div>
                  <div><strong>Total de Propostas:</strong> ${p.proposalRowsCount}</div>
                  <div><strong>Avisos:</strong> ${p.warnings.length}</div>
                  <div><strong>Erros:</strong> ${p.errors.length}</div>
                </div>
                ${p.warnings.length > 0 ? `
                  <div style="font-size:0.78rem; color:#92400e; background:rgba(252,211,77,0.15); padding:8px 12px; border-radius:6px;">
                    ${p.warnings.join('<br>')}
                  </div>
                ` : ''}
                ${p.extractedText ? `
                  <details style="font-size:0.75rem; color:#6b7280;">
                    <summary style="cursor:pointer; font-weight:600;">Ver texto extraído do PDF</summary>
                    <pre style="max-height:200px; overflow:auto; background:#f9fafb; padding:8px; border-radius:6px; margin-top:6px; white-space:pre-wrap; word-break:break-word;">${p.extractedText.substring(0, 3000)}</pre>
                  </details>
                ` : ''}
                <button type="button" class="bordero-btn-primary" id="sim-activate-import-btn" data-import-id="${data.import_id}">
                  <i data-lucide="check"></i> Confirmar e Ativar Tabela
                </button>
              </div>
            `;

            document.getElementById('sim-activate-import-btn')?.addEventListener('click', async () => {
              await fetch(`/api/attendance/proposals/imports/${data.import_id}/activate`, { method: 'POST' });
              alert("Tabela comercial ativada com sucesso! As novas propostas já estão disponíveis para todos os atendentes.");
              previewArea.style.display = 'none';
            });

          } else {
            previewArea.innerHTML = `
              <div style="padding:16px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:10px; color:#991b1b; font-size:0.84rem;">
                <strong>Erro ao processar PDF:</strong> ${data.error || 'Falha na validação das faixas de parcelas.'}
              </div>
            `;
          }
          if (window.lucide) window.lucide.createIcons();

        } catch (err) {
          previewArea.innerHTML = `<div style="color:#ef4444;">Erro de comunicação: ${err.message}</div>`;
        }
      };
      reader.readAsDataURL(file);
    });

    // Drive Sync Button
    document.getElementById('sim-drive-sync-now-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('sim-drive-sync-now-btn');
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Sincronizando...`;
      if (window.lucide) window.lucide.createIcons();

      try {
        const resp = await fetch('/api/attendance/proposals/drive/sync', { method: 'POST' });
        const resData = await readApiPayload(resp);
        if (!resp.ok || resData.success === false) {
          throw new Error(getApiErrorMessage(resp, resData, 'Erro ao sincronizar Drive.'));
        }
        alert(resData.message || "Sincronização concluída.");
      } catch (err) {
        alert("Erro na sincronização: " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="refresh-cw"></i> Sincronizar Agora`;
        if (window.lucide) window.lucide.createIcons();
      }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Execute simulation API query
  async function runSimulationQuery() {
    const listEl = document.getElementById('sim-proposals-list');
    const countTextEl = document.getElementById('sim-results-count-text');
    const toggleNearBtn = document.getElementById('sim-toggle-near-btn');

    listEl.innerHTML = `
      <div style="text-align:center; color:#9ca3af; padding:40px;">
        <i data-lucide="loader-2" class="animate-spin" style="width:32px; height:32px; color:#d4af37; margin-bottom:12px;"></i>
        <p style="margin:0;">Buscando melhores propostas no banco de dados comercial...</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    const payload = {
      desired_credit: document.getElementById('sim-min-credit')?.value || '',
      maximum_first_installment: document.getElementById('sim-max-first-inst').value,
      maximum_installment: document.getElementById('sim-max-inst').value,
      minimum_credit: document.getElementById('sim-min-credit')?.value || '',
      maximum_credit: document.getElementById('sim-max-credit')?.value || '',
      ranking_priority: 'MAIOR_CREDITO',
      use_half_installment: !(document.getElementById('sim-use-half-inst')?.checked || false),
    };

    try {
      const resp = await fetch('/api/attendance/proposals/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readApiPayload(resp);
      if (!resp.ok) {
        throw new Error(getApiErrorMessage(resp, data, 'Erro ao simular proposta.'));
      }

      data.valid_proposals = data.valid_proposals || [];
      data.near_matches = data.near_matches || [];

      if (!data.success || (!data.valid_proposals.length && !data.near_matches.length)) {
        countTextEl.innerHTML = `Nenhuma proposta encontrada dentro dos limites informados.`;
        toggleNearBtn.style.display = 'none';
        listEl.innerHTML = `
          <div style="text-align:center; color:#fca5a5; padding:40px; background:rgba(239,68,68,0.04); border:1px solid rgba(239,68,68,0.2); border-radius:16px;">
            <i data-lucide="alert-triangle" style="width:36px; height:36px; color:#ef4444; margin-bottom:12px;"></i>
            <h3 style="margin:0 0 6px; font-size:1rem; color:#fff;">Nenhuma proposta encontrada</h3>
            <p style="margin:0; font-size:0.84rem;">Tente aumentar ligeiramente o limite da 1ª parcela ou parcelas.</p>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      const validList = data.valid_proposals || [];
      const nearList = data.near_matches || [];
      const sortBar = document.getElementById('sim-sort-bar');

      let currentActiveList = validList.length > 0 ? validList : nearList;
      let currentIsNear = validList.length === 0;
      let currentSortBy = 'credit-desc';

      // Reusable sort function - applies the active sort to any list in-place
      function applySortToList(list, sortBy) {
        if (sortBy === 'credit-desc') {
          list.sort((a, b) => {
            if (b.credit_value !== a.credit_value) return b.credit_value - a.credit_value;
            const aPrimeMatch = /(?:PRIME|COD)\s*(\d+)/i.exec(a.product_name || '');
            const bPrimeMatch = /(?:PRIME|COD)\s*(\d+)/i.exec(b.product_name || '');
            if (aPrimeMatch && bPrimeMatch) {
              const aNum = parseInt(aPrimeMatch[1], 10);
              const bNum = parseInt(bPrimeMatch[1], 10);
              if (bNum !== aNum) return bNum - aNum;
            }
            const aTempMonths = (a.temporary_installment_end - a.temporary_installment_start + 1) || 0;
            const bTempMonths = (b.temporary_installment_end - b.temporary_installment_start + 1) || 0;
            if (bTempMonths !== aTempMonths) return bTempMonths - aTempMonths;
            if (b.first_installment !== a.first_installment) return b.first_installment - a.first_installment;
            return a.final_installment_value - b.final_installment_value;
          });
        } else if (sortBy === 'inst-desc') {
          list.sort((a, b) => b.final_installment_value - a.final_installment_value);
        } else if (sortBy === 'inst-asc') {
          list.sort((a, b) => a.final_installment_value - b.final_installment_value);
        } else if (sortBy === 'first-desc') {
          list.sort((a, b) => b.first_installment - a.first_installment);
        } else if (sortBy === 'first-asc') {
          list.sort((a, b) => a.first_installment - b.first_installment);
        }
      }


      const resultsHeader = document.getElementById('sim-results-header');
      const emptyIcon = document.getElementById('sim-empty-info-icon');

      if (validList.length > 0) {
        if (resultsHeader) resultsHeader.classList.remove('is-empty-notice');
        if (emptyIcon) emptyIcon.style.display = 'none';
        countTextEl.innerHTML = `Encontradas <strong>${validList.length}</strong> propostas ideais dentro dos limites do cliente.`;
        toggleNearBtn.style.display = nearList.length > 0 ? 'inline-flex' : 'none';
        if (sortBar) sortBar.style.display = 'flex';
        renderProposalCards(validList, false);
      } else if (nearList.length > 0) {
        if (resultsHeader) resultsHeader.classList.remove('is-empty-notice');
        if (emptyIcon) emptyIcon.style.display = 'none';
        countTextEl.innerHTML = `Nenhuma proposta exata dentro do limite. Exibindo <strong>${nearList.length}</strong> opções próximas.`;
        toggleNearBtn.style.display = 'none';
        if (sortBar) sortBar.style.display = 'flex';
        renderProposalCards(nearList, true);
      } else {
        if (resultsHeader) resultsHeader.classList.add('is-empty-notice');
        if (emptyIcon) emptyIcon.style.display = 'flex';
        countTextEl.textContent = 'Informe os limites do cliente ao lado para realizar a simulação.';
        toggleNearBtn.style.display = 'none';
        if (sortBar) sortBar.style.display = 'none';
        listEl.innerHTML = `<div style="text-align:center; color:#9ca3af; padding:40px;">Nenhuma proposta encontrada com estes parâmetros.</div>`;
      }

      // Attach client-side sorting handlers for quick sorting buttons
      if (sortBar) {
        sortBar.querySelectorAll('.sim-sort-btn').forEach(btn => {
          btn.onclick = () => {
            sortBar.querySelectorAll('.sim-sort-btn').forEach(b => {
              b.classList.remove('active');
              b.style.background = '#f7f6f8';
              b.style.color = '#6f6878';
              b.style.border = '1px solid #e7e1eb';
              b.style.fontWeight = '600';
            });

            btn.classList.add('active');
            btn.style.background = '#e8b138';
            btn.style.color = '#15121a';
            btn.style.border = 'none';
            btn.style.fontWeight = '800';

            const sortBy = btn.dataset.sortBy;
            currentSortBy = sortBy;
            applySortToList(currentActiveList, sortBy);

            renderProposalCards(currentActiveList, currentIsNear);
          };
        });
      }

      if (toggleNearBtn) {
        let nearShown = false;
        toggleNearBtn.innerHTML = `<i data-lucide="eye"></i> Mostrar Opções Próximas`;
        toggleNearBtn.onclick = () => {
          if (nearShown) {
            // Remove near matches — go back to only ideal proposals
            nearShown = false;
            currentActiveList = [...validList];
            currentIsNear = false;
            applySortToList(currentActiveList, currentSortBy);
            renderProposalCards(currentActiveList);
            countTextEl.innerHTML = `Encontradas <strong>${validList.length}</strong> propostas ideais dentro dos limites do cliente.`;
            toggleNearBtn.innerHTML = `<i data-lucide="eye"></i> Mostrar Opções Próximas`;
          } else {
            // Merge near matches into the current sorted list and re-sort together
            nearShown = true;
            currentIsNear = false;
            const taggedNear = nearList.map(p => ({ ...p, _isNear: true }));
            const combined = [...validList, ...taggedNear];
            applySortToList(combined, currentSortBy);
            currentActiveList = combined;
            renderProposalCards(combined);
            countTextEl.innerHTML = `Exibindo <strong>${validList.length}</strong> propostas ideais + <strong>${nearList.length}</strong> opções próximas.`;
            toggleNearBtn.innerHTML = `<i data-lucide="eye-off"></i> Ocultar Opções Próximas`;
          }
          if (window.lucide) window.lucide.createIcons();
        };
      }

    } catch (err) {
      listEl.innerHTML = `<div style="color:#ef4444; text-align:center;">Erro ao realizar busca: ${err.message}</div>`;
    }
  }

  // Render cards list HTML
  // Each proposal can have _isNear=true to be individually badged as near match
  function renderProposalCards(proposals, isNearMatch = false) {
    const listEl = document.getElementById('sim-proposals-list');
    if (!listEl) return;

    listEl.innerHTML = proposals.map((p, idx) => {
      const nearItem = isNearMatch || p._isNear;
      const isTopOption = idx === 0 && !nearItem;
      const badgeLabel = nearItem
        ? "Opção Próxima"
        : (isTopOption ? "MELHOR OPÇÃO" : (p.badge || `RANK #${idx + 1}`));
      const badgeIcon = isTopOption
        ? `<i data-lucide="star" style="width:13px; height:13px; fill:#E8B138; color:#E8B138; margin-right:4px;"></i>`
        : '';
      const badgeClass = nearItem ? "near" : "";

      const rawTitle = p.product_name || 'AUTOCON PRIME';
      const cleanTitle = rawTitle
        .replace(/\s*-\s*(?:IMO|G\.|COD|A\d+|S\d+).*/gi, '')
        .replace(/Tabela\s*Nº.*/gi, '')
        .trim();

      return `
        <article class="proposal-item-card ${nearItem ? 'near-match' : ''}">
          <div class="proposal-card-header">
            <div class="proposal-header-left">
              <div class="proposal-rank-num">${idx + 1}</div>
              <div class="proposal-header-divider"></div>
              <div class="proposal-title-meta">
                <h3>${cleanTitle}</h3>
                ${nearItem && p.excess_reason ? `
                  <span class="near-match-warning-inline">
                    <i data-lucide="info" style="width:13px; height:13px; flex-shrink:0;"></i>
                    ${p.excess_reason}
                  </span>
                ` : ''}
              </div>
            </div>
            
            <div class="proposal-header-right">
              <span class="proposal-badge ${badgeClass}">${badgeIcon}${badgeLabel}</span>
            </div>
          </div>

          <!-- Metric Specs Grid -->
          <div class="proposal-specs-grid">
            <div class="proposal-spec-item">
              <i data-lucide="dollar-sign" class="proposal-spec-icon"></i>
              <span>Valor do Crédito</span>
              <strong class="highlight">${formatCurrency(p.credit_value)}</strong>
            </div>

            <div class="proposal-spec-item">
              <i data-lucide="credit-card" class="proposal-spec-icon"></i>
              <span>Entrada (Adesão)</span>
              <strong style="color:#050505;">${formatCurrency(p.first_installment)}</strong>
            </div>

            <div class="proposal-spec-item">
              <i data-lucide="pie-chart" class="proposal-spec-icon"></i>
              <span>Parcela Integral</span>
              <strong style="color:#2563EB;">${formatCurrency(p.final_installment_value)}</strong>
            </div>

            <div class="proposal-spec-item">
              <i data-lucide="trending-down" class="proposal-spec-icon"></i>
              <span>Parcela Reduzida 50%</span>
              <strong style="color:#059669;">${formatCurrency(p.final_installment_value * 0.5)}</strong>
            </div>

            <div class="proposal-spec-item">
              <i data-lucide="calendar" class="proposal-spec-icon"></i>
              <span>Prazo Total</span>
              <strong style="color:#050505;">${formatTermMonthsYears(p.total_term_months)}</strong>
            </div>

            <div class="proposal-spec-item">
              <i data-lucide="percent" class="proposal-spec-icon"></i>
              <span>Taxa Adm</span>
              <strong style="color:#050505;">${p.administration_fee_percentage}%</strong>
            </div>
          </div>

          <div class="proposal-card-footer">
            <div class="proposal-footer-meta">
              <i data-lucide="gavel" style="width:18px; height:18px; color:#D8B34A; flex-shrink:0;"></i>
              <span>Lance Fixo: <strong style="color:#050505;">30% ou 50%</strong></span>
            </div>
            
            <button type="button" class="simulador-btn-select-proposal" data-action-select-proposal="${p.id}">
              <i data-lucide="check-circle-2" style="width:20px; height:20px; color:#050505;"></i> Selecionar Proposta
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach click events for proposal selection
    document.querySelectorAll('[data-action-select-proposal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.dataset.actionSelectProposal;
        selectedProposal = proposals.find(p => p.id === pId);
        if (selectedProposal) {
          localStorage.setItem('seven_gold_selected_proposal', JSON.stringify(selectedProposal));
          openMontarPropostaFinal(selectedProposal);
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Open Montar Proposta Final Screen
  function openMontarPropostaFinal(proposal, existingClientId = null) {
    window.__currentEditingClientId = existingClientId || proposal.client_id || proposal.id || null;
    const container = document.getElementById('proposta-final-container');
    if (!container) return;

    // Retrieve logged in user info for consultant name
    const userNameEl = document.querySelector('[data-user-name]');
    const userEmailEl = document.querySelector('[data-user-email]');
    const userRoleEl = document.querySelector('[data-user-role]');
    
    const consultantName = (userNameEl && userNameEl.textContent.trim() !== 'Carregando...') ? userNameEl.textContent.trim() : 'Consultor Seven Gold';
    const consultantEmail = 'sevengoldfinanceira@gmail.com';
    let rawRole = (userRoleEl && userRoleEl.textContent.trim() !== '...') ? userRoleEl.textContent.trim() : 'Consultor Financeiro';
    if (rawRole.toLowerCase().includes('assistente')) {
      rawRole = 'Consultor Financeiro';
    }
    const consultantRole = rawRole;

    // Generate Protocol: SG-YYYY.MM.DD-NNN (ex: SG-2026.07.25-247)
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g,'.');
    const randomSeq = Math.floor(Math.random() * 900) + 100; // 100–999
    const protocolNumber = `SG-${dateStr}-${randomSeq}`;
    
    const validityDefault = proposal.validity_date || new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);

    const creditValue = Number(proposal.credit_value || proposal.credito || 0);
    const firstInstValue = Number(proposal.first_installment || proposal.entrada || 0);
    const finalInstValue = Number(proposal.final_installment_value || proposal.parcela || 0);

    const creditFormatted = formatCurrency(creditValue);
    const firstInstFormatted = formatCurrency(firstInstValue);
    const finalInstFormatted = formatCurrency(finalInstValue);
    const halfInstFormatted = formatCurrency(finalInstValue * 0.5);

    const savedBidPercent = proposal.bid_percentage ?? proposal.fixed_bid_percentage ?? 30;
    const savedBidAmount = proposal.bid_amount ?? (creditValue * (savedBidPercent / 100));
    const savedBidAmountFormatted = formatCurrency(savedBidAmount);

    // Switch active tab in atendimento.html
    const tabs = document.querySelectorAll('[data-service-tab]');
    tabs.forEach(t => t.classList.remove('active'));
    const pfNavBtn = document.querySelector('[data-service-tab="proposta-final"]');
    if (pfNavBtn) pfNavBtn.classList.add('active');

    document.querySelectorAll('[data-service-tab-content]').forEach(c => {
      c.style.display = c.dataset.serviceTabContent === 'proposta-final' ? 'block' : 'none';
    });

    container.innerHTML = `
      <div class="pf-wrapper">
        <div class="pf-header-bar">
          <div class="pf-header-brand-info">
            <div class="pf-header-icon-box">
              <i data-lucide="file-badge" style="width:24px; height:24px; color:#D8B34A;" aria-hidden="true"></i>
            </div>
            <div class="pf-header-vdivider"></div>
            <div class="pf-header-text-block">
              <span class="pf-header-eyebrow">MONTAGEM DA PROPOSTA COMERCIAL</span>
              <div class="pf-header-title-row">
                <h2 class="pf-header-main-title">Proposta Final</h2>
                <span class="pf-header-dash">—</span>
                <span class="pf-header-protocol">Protocolo <strong class="pf-protocol-num">${protocolNumber}</strong></span>
              </div>
            </div>
          </div>

          <div class="pf-action-buttons">
            <button type="button" id="pf-btn-back" class="pf-btn-dark-secondary">
              <i data-lucide="arrow-left" class="pf-btn-icon-gold"></i> Voltar à Simulação
            </button>
            <button type="button" id="pf-btn-save-system" class="pf-btn-dark-secondary">
              <i data-lucide="save" class="pf-btn-icon-gold"></i> Salvar no Sistema
            </button>
            <button type="button" id="pf-btn-pdf" class="pf-btn-outline-gold">
              <i data-lucide="file-text" class="pf-btn-icon-gold"></i> Gerar PDF
            </button>
            <button type="button" id="pf-btn-print" class="pf-btn-primary-gold">
              <i data-lucide="printer" class="pf-btn-icon-black"></i> Imprimir Proposta
            </button>
          </div>
        </div>

        <div class="pf-content-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:start;">
          <!-- Left Column: Form + Summary Stacked -->
          <div class="pf-left-panel" style="display:flex; flex-direction:column; gap:20px;">
            <!-- Card 1: Dados do Cliente & Lance Form -->
            <div class="pf-form-card">
              <div class="pf-form-header">
                <div class="pf-form-header-icon">
                  <i data-lucide="user-check" style="width:22px; height:22px; color:#D8B34A;"></i>
                </div>
                <h3 class="pf-form-title">Dados do Cliente & Lance</h3>
              </div>

              <form id="pf-complementary-form" class="pf-form-body">
                <!-- Nome Completo -->
                <div class="simulador-form-group">
                  <label for="pf-client-name">Nome Completo do Cliente <span class="req">*</span></label>
                  <div class="pf-input-wrapper">
                    <i data-lucide="user" class="pf-input-icon"></i>
                    <input type="text" id="pf-client-name" class="simulador-input pf-input-with-icon" placeholder="Ex: João da Silva" value="${proposal.client_name || proposal.nome || ''}" required />
                  </div>
                </div>

                <!-- CPF e Telefone -->
                <div class="pf-grid-2col">
                  <div class="simulador-form-group">
                    <label for="pf-client-cpf">CPF do Cliente</label>
                    <div class="pf-input-wrapper">
                      <i data-lucide="contact" class="pf-input-icon"></i>
                      <input type="text" id="pf-client-cpf" class="simulador-input pf-input-with-icon" placeholder="000.000.000-00" value="${proposal.client_cpf || proposal.cpf_cnpj || ''}" />
                    </div>
                  </div>
                  <div class="simulador-form-group">
                    <label for="pf-client-phone">Telefone / WhatsApp</label>
                    <div class="pf-input-wrapper">
                      <i data-lucide="phone" class="pf-input-icon"></i>
                      <input type="text" id="pf-client-phone" class="simulador-input pf-input-with-icon" placeholder="(00) 90000-0000" value="${proposal.client_phone || proposal.telefone || ''}" />
                    </div>
                  </div>
                </div>

                <!-- Tipo de Bem e Validade -->
                <div class="pf-grid-2col">
                  <div class="simulador-form-group">
                    <label for="pf-property-type">Tipo de Bem</label>
                    <div class="pf-input-wrapper">
                      <i data-lucide="home" class="pf-input-icon"></i>
                      <select id="pf-property-type" class="simulador-input pf-input-with-icon">
                        <option value="Imóvel Residencial" ${proposal.property_type === 'Imóvel Residencial' ? 'selected' : ''}>Imóvel Residencial</option>
                        <option value="Imóvel Comercial" ${proposal.property_type === 'Imóvel Comercial' ? 'selected' : ''}>Imóvel Comercial</option>
                        <option value="Terreno / Construção" ${proposal.property_type === 'Terreno / Construção' ? 'selected' : ''}>Terreno / Construção</option>
                        <option value="Automóvel / Veículo" ${proposal.property_type === 'Automóvel / Veículo' ? 'selected' : ''}>Automóvel / Veículo</option>
                        <option value="Maquinário / Pesados" ${proposal.property_type === 'Maquinário / Pesados' ? 'selected' : ''}>Maquinário / Pesados</option>
                      </select>
                    </div>
                  </div>
                  <div class="simulador-form-group">
                    <label for="pf-validity">Validade da Proposta</label>
                    <div class="pf-input-wrapper">
                      <i data-lucide="calendar" class="pf-input-icon"></i>
                      <input type="date" id="pf-validity" class="simulador-input pf-input-with-icon" value="${validityDefault}" />
                    </div>
                  </div>
                </div>

                <!-- Área de Lance -->
                <div class="pf-bid-section-box">
                  <label class="pf-bid-toggle-header">
                    <input type="checkbox" id="pf-include-bid-toggle" ${proposal.include_bid !== false ? 'checked' : ''} class="pf-checkbox-custom" />
                    <span class="pf-bid-toggle-title">Incluir Oferta / Pretensão de Lance nesta Proposta</span>
                  </label>

                  <div id="pf-bid-controls-wrapper" style="display: ${proposal.include_bid !== false ? 'block' : 'none'};">
                    <div class="pf-bid-slider-header">
                      <label for="pf-embedded-bid-range" class="pf-bid-slider-label">
                        <i data-lucide="sliders-horizontal" style="width:16px; height:16px; color:#D8B34A;"></i>
                        Lance Embutido / Pretendido (%)
                      </label>
                      <span id="pf-embedded-bid-badge" class="pf-bid-badge">${savedBidPercent}%</span>
                    </div>

                    <input type="range" id="pf-embedded-bid-range" min="0" max="50" step="0.5" value="${savedBidPercent}" class="pf-range-slider" />

                    <div class="pf-grid-2col pf-bid-values-grid">
                      <div class="simulador-form-group">
                        <label for="pf-embedded-bid" class="pf-sublabel">Porcentagem (%)</label>
                        <input type="text" id="pf-embedded-bid" class="simulador-input pf-input-centered" value="${savedBidPercent}%" />
                      </div>
                      <div class="simulador-form-group">
                        <label for="pf-bid-amount" class="pf-sublabel">Valor em R$ (Calculado)</label>
                        <input type="text" id="pf-bid-amount" class="simulador-input brl-mask pf-input-bold-dark" placeholder="R$ 0,00" value="${savedBidAmountFormatted}" />
                      </div>
                    </div>

                    <label class="pf-show-percentage-card">
                      <input type="checkbox" id="pf-show-percentage-toggle" ${proposal.show_percentages ? 'checked' : ''} class="pf-checkbox-custom" />
                      <span>Exibir porcentagens (%) do lance na proposta final impressa</span>
                    </label>
                  </div>
                </div>

                <!-- Observações -->
                <div class="simulador-form-group">
                  <label for="pf-notes">Observações / Condições Especiais</label>
                  <div class="pf-input-wrapper pf-textarea-wrapper">
                    <i data-lucide="file-edit" class="pf-input-icon pf-textarea-icon"></i>
                    <textarea id="pf-notes" class="simulador-input pf-textarea-with-icon" rows="3" placeholder="Insira observações relevantes sobre o atendimento ou regras de contemplação...">${proposal.notes || proposal.observacao || ''}</textarea>
                  </div>
                </div>
              </form>
            </div>

            <!-- Card 2: Resumo Automático da Cota -->
            <div class="pf-summary-card">
              <div class="pf-summary-header">
                <div class="pf-summary-header-icon">
                  <i data-lucide="file-badge" style="width:22px; height:22px; color:#D8B34A;"></i>
                </div>
                <h3 class="pf-summary-title">Resumo Automático da Cota</h3>
              </div>

              <div class="pf-summary-grid">
                <!-- Administradora -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="building-2" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">ADMINISTRADORA</span>
                    <strong class="pf-summary-value pf-val-dark">Alpha Administradora de Consórcio Ltda.</strong>
                  </div>
                </div>

                <!-- Crédito / Bem -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="dollar-sign" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">CRÉDITO / BEM</span>
                    <strong class="pf-summary-value pf-val-gold">${creditFormatted}</strong>
                  </div>
                </div>

                <!-- Entrada / 1ª Parcela -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="credit-card" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">ENTRADA (ADESÃO)</span>
                    <strong class="pf-summary-value pf-val-dark">${firstInstFormatted}</strong>
                  </div>
                </div>

                <!-- Parcela Integral -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="pie-chart" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">PARCELA INTEGRAL (100%)</span>
                    <strong class="pf-summary-value pf-val-blue">${finalInstFormatted}</strong>
                  </div>
                </div>

                <!-- Parcela Reduzida -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="trending-down" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">PARCELA REDUZIDA (50%)</span>
                    <strong class="pf-summary-value pf-val-green">${halfInstFormatted}</strong>
                  </div>
                </div>

                <!-- Prazo Total -->
                <div class="pf-summary-item">
                  <div class="pf-summary-item-icon-box">
                    <i data-lucide="calendar" style="width:20px; height:20px; color:#D8B34A;" aria-hidden="true"></i>
                  </div>
                  <div class="pf-summary-item-content">
                    <span class="pf-summary-label">PRAZO TOTAL</span>
                    <strong class="pf-summary-value pf-val-dark">${formatTermMonthsYears(proposal.total_term_months)}</strong>
                  </div>
                </div>
              </div>

              <!-- Consultor Responsável Box -->
              <div class="pf-summary-consultant-box">
                <div class="pf-summary-consultant-avatar">
                  <i data-lucide="user" style="width:22px; height:22px; color:#D8B34A;" aria-hidden="true"></i>
                </div>
                <div class="pf-summary-consultant-info">
                  <span class="pf-summary-consultant-tag">CONSULTOR RESPONSÁVEL</span>
                  <strong class="pf-summary-consultant-name">${consultantName}</strong>
                  <div class="pf-summary-consultant-meta">
                    <span class="pf-consultant-meta-item">
                      <i data-lucide="mail" style="width:14px; height:14px; color:#D8B34A;" aria-hidden="true"></i>
                      <span>${consultantEmail}</span>
                    </span>
                    <span class="pf-meta-divider">•</span>
                    <span class="pf-consultant-meta-item">
                      <i data-lucide="briefcase" style="width:14px; height:14px; color:#D8B34A;" aria-hidden="true"></i>
                      <span>${consultantRole}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Live Printable Sheet Preview -->
          <div class="pf-right-panel" style="position:sticky; top:80px;">
            <div id="proposta-final-a4-sheet" class="proposta-final-print-sheet" style="background:#ffffff; border:1px solid #e7e1eb; border-radius:12px; padding:32px; color:#15121a; box-shadow:0 8px 30px rgba(0,0,0,0.08);">
              <!-- Dynamic A4 content updated live -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Function to update A4 sheet HTML
    function updateA4Sheet() {
      const clientName = document.getElementById('pf-client-name')?.value || 'Cliente Especial';
      const clientCpf = document.getElementById('pf-client-cpf')?.value || '***.***.***-**';
      const clientPhone = document.getElementById('pf-client-phone')?.value || '(00) 00000-0000';
      const propType = document.getElementById('pf-property-type')?.value || 'Imóvel Residencial';
      const showPct = document.getElementById('pf-show-percentage-toggle')?.checked || false;
      const bidAmount = document.getElementById('pf-bid-amount')?.value || 'R$ 0,00';
      const embeddedBid = document.getElementById('pf-embedded-bid')?.value || '30%';
      const validityVal = document.getElementById('pf-validity')?.value ? new Date(document.getElementById('pf-validity').value + 'T00:00:00').toLocaleDateString('pt-BR') : '15 dias';
      const notesVal = document.getElementById('pf-notes')?.value?.trim() || '';

      const includeBid = document.getElementById('pf-include-bid-toggle')?.checked ?? true;

      let lanceText = `${bidAmount}`;
      if (showPct) {
        lanceText += ` (${embeddedBid})`;
      }

      // Valor líquido para o imóvel = crédito - lance
      const bidNumeric = includeBid ? (parseFloat(String(bidAmount).replace(/[^\d,]/g, '').replace(',', '.')) || 0) : 0;
      const netPropertyValue = Math.max((proposal.credit_value || 0) - bidNumeric, 0);
      const netPropertyFormatted = formatCurrency(netPropertyValue);

      const sheetEl = document.getElementById('proposta-final-a4-sheet');
      if (!sheetEl) return;

      sheetEl.innerHTML = `
        <div class="pf-a4-header" style="background:linear-gradient(135deg, #000000 0%, #111111 60%, #0A0A0A 100%); padding:16px 24px 14px; color:#ffffff; position:relative; overflow:hidden; border-radius:12px 12px 0 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2;">
            <div style="display:flex; align-items:center; gap:14px;">
              <img src="assets/icons/seven-gold-g7.png" alt="Seven Gold" style="width:52px; height:52px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />
              <div style="width:1.5px; height:36px; background:#E8B138;"></div>
              <div>
                <h2 style="margin:0; font-size:1.25rem; color:#E8B138; font-weight:800; letter-spacing:0.04em; line-height:1.2;">SEVEN GOLD FINANCEIRA</h2>
                <span style="font-size:0.72rem; color:#ffffff; font-weight:600; letter-spacing:0.05em; display:block; margin-top:2px;">PROPOSTA COMERCIAL DE CONSÓRCIO</span>
              </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; font-size:0.78rem; align-items:flex-start; text-align:left;">
              <div style="display:flex; align-items:center; justify-content:flex-start; gap:6px;">
                <i data-lucide="file-text" style="width:14px; height:14px; color:#ffffff; opacity:0.9; flex-shrink:0;"></i>
                <span style="color:rgba(255,255,255,0.9); font-weight:500;">Protocolo:</span>
                <strong style="color:#ffffff; font-weight:700; font-family:monospace; letter-spacing:0.02em; white-space:nowrap;">${protocolNumber}</strong>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-start; gap:6px;">
                <i data-lucide="calendar" style="width:14px; height:14px; color:#ffffff; opacity:0.9; flex-shrink:0;"></i>
                <span style="color:rgba(255,255,255,0.9); font-weight:500;">Data:</span>
                <span style="color:#ffffff; font-weight:600;">${new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-start; gap:6px;">
                <i data-lucide="shield-check" style="width:14px; height:14px; color:#E8B138; flex-shrink:0;"></i>
                <span style="color:#E8B138; font-weight:600;">Validade:</span>
                <strong style="color:#E8B138; font-weight:700;">${validityVal}</strong>
              </div>
            </div>
          </div>

          <div style="position:absolute; bottom:0; left:0; right:0; height:5px; background:#E8B138;"></div>
          <div style="position:absolute; bottom:0; right:40px; border-style:solid; border-width:0 0 12px 16px; border-color:transparent transparent #E8B138 transparent;"></div>
        </div>

        <div class="pf-a4-body" style="padding:18px 24px 14px; display:flex; flex-direction:column; gap:14px; min-height:calc(297mm - 96px); box-sizing:border-box;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:stretch;">
            <!-- DADOS DA PROPOSTA -->
            <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:12px 16px; display:flex; flex-direction:column; justify-content:flex-start; min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:6px; border-bottom:2px solid #E8B138;">
                <div style="width:26px; height:26px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                  <i data-lucide="user" style="width:14px; height:14px;"></i>
                </div>
                <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.02em; text-transform:uppercase; white-space:nowrap;">DADOS DA PROPOSTA</strong>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; font-size:0.82rem; color:#706A78;">
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="user-check" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">Nome do Consultor:</strong> ${consultantName}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="mail" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">E-mail:</strong> ${consultantEmail}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="briefcase" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">Cargo:</strong> ${consultantRole}</span>
                </div>
              </div>
            </div>

            <!-- DADOS DO CLIENTE -->
            <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:12px 16px; display:flex; flex-direction:column; justify-content:flex-start; min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:6px; border-bottom:2px solid #E8B138;">
                <div style="width:26px; height:26px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                  <i data-lucide="users" style="width:14px; height:14px;"></i>
                </div>
                <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.02em; text-transform:uppercase; white-space:nowrap;">DADOS DO CLIENTE</strong>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; font-size:0.82rem; color:#706A78;">
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="contact" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">Nome:</strong> ${clientName}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="credit-card" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">CPF:</strong> ${clientCpf}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="phone" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">Telefone:</strong> ${clientPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                  <i data-lucide="home" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span style="min-width:0; word-break:break-word;"><strong style="color:#17111F;">Tipo de Bem:</strong> ${propType}</span>
                </div>
              </div>
            </div>
          </div>

          <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:0.84rem; border:1px solid #E4DEE8; border-radius:12px; overflow:hidden;">
            <thead>
              <tr style="background:#000000; color:#ffffff; text-align:left;">
                <th style="padding:10px 14px; width:50%; font-weight:700; font-size:0.82rem; letter-spacing:0.03em;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="file-text" style="width:14px; height:14px; color:#E8B138;"></i>
                    <span>ESPECIFICAÇÃO FINANCEIRA</span>
                  </div>
                </th>
                <th style="padding:10px 14px; width:50%; font-weight:700; font-size:0.82rem; letter-spacing:0.03em;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <i data-lucide="dollar-sign" style="width:14px; height:14px; color:#E8B138;"></i>
                    <span>VALOR / DETALHE</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="building-2" style="width:14px; height:14px; color:#B98220;"></i>
                    <span style="white-space:nowrap;">Institui&ccedil;&atilde;o Financeira/Administradora</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:700; color:#050505;">Alpha Administradora de Consórcio Ltda.</td>
              </tr>
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="credit-card" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor de Crédito</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${creditFormatted}</td>
              </tr>
              ${includeBid ? `
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="gavel" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor do Lance <span style="font-size:0.75em; font-weight:400; color:#9ca3af;">(Adiantamento de Parcelas)</span></span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${lanceText}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="home" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor do Imóvel</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${netPropertyFormatted}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="coins" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Entrada (Adesão)</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${firstInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="trending-up" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor da Parcela Integral (100%)</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${finalInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="percent" style="width:14px; height:14px; color:#B98220;"></i>
                    <span style="white-space:nowrap;">Valor da Parcela Reduzida (50% Meia Parcela)</span>
                  </div>
                </td>
                <td style="padding:8px 14px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#050505; font-size:0.92rem;">${halfInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:8px 14px; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="calendar" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Prazo de Pagamento do Plano</span>
                  </div>
                </td>
                <td style="padding:8px 14px; font-weight:800; color:#050505;">${formatTermMonthsYears(proposal.total_term_months)}</td>
              </tr>
            </tbody>
          </table>

          ${notesVal ? `
          <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:12px 16px; font-size:0.82rem;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:24px; height:24px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                <i data-lucide="file-check" style="width:13px; height:13px;"></i>
              </div>
              <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.03em; text-transform:uppercase;">OBSERVAÇÕES E CONDIÇÕES COMERCIAIS</strong>
            </div>
            
            <p style="margin:0 0 8px; color:#17111F; font-size:0.82rem; line-height:1.4;">${notesVal}</p>
            
            <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #E4DEE8; font-size:0.72rem; color:#706A78; font-weight:600; line-height:1.4;">
              <div>** Sujeito a análise e aprovação de crédito.</div>
              <div>** Esta proposta é uma simulação, não garantindo qualquer espécie de obrigação entre as partes.</div>
            </div>
          </div>
          ` : `
          <div style="padding-top:2px; font-size:0.72rem; color:#706A78; font-weight:600; line-height:1.4;">
            <div>** Sujeito a análise e aprovação de crédito.</div>
            <div>** Esta proposta é uma simulação, não garantindo qualquer espécie de obrigação entre as partes.</div>
          </div>
          `}

          <div class="pf-a4-footer" style="border-top:1.5px solid #E8B138; padding-top:12px; display:grid; grid-template-columns:1fr 1px 1fr; gap:14px; align-items:center; font-size:0.74rem; color:#706A78; margin-top:auto;">
            <div style="display:flex; align-items:center; justify-content:flex-start;">
              <div style="background:#050505; padding:4px 10px; border-radius:6px; border:1px solid #D8B34A; display:inline-flex; align-items:center; box-shadow:0 3px 8px rgba(0,0,0,0.25);">
                <img src="assets/icons/seven-gold-black-bg.jpg" alt="Seven Gold Financeira" style="height:36px; max-width:180px; object-fit:contain; border-radius:4px;" />
              </div>
            </div>

            <div style="background:#E4DEE8; height:36px;"></div>

            <div style="text-align:right; font-size:0.74rem; color:#706A78; display:flex; flex-direction:column; gap:3px;">
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                <i data-lucide="instagram" style="width:12px; height:12px; color:#C9A84C;"></i>
                <span>Instagram: @sevengoldfinanceira</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                <i data-lucide="globe" style="width:12px; height:12px; color:#C9A84C;"></i>
                <span>www.sevengoldfinanceira.com.br</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                <i data-lucide="building" style="width:12px; height:12px; color:#B98220;"></i>
                <span>CNPJ 66.347.779/0001-24</span>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }

    // Bidirectional Range Slider <-> Percentage Input <-> Money Value Input
    const rangeSlider = document.getElementById('pf-embedded-bid-range');
    const badgeEl = document.getElementById('pf-embedded-bid-badge');
    const pctInput = document.getElementById('pf-embedded-bid');
    const moneyInput = document.getElementById('pf-bid-amount');
    const creditVal = proposal.credit_value || 0;

    const formatPctDisplay = (num) => {
      const roundNum = Math.round(num * 100) / 100;
      return `${roundNum}%`;
    };

    // Sync from Percentage
    const syncFromPercentage = (pct, source) => {
      const clampedPct = Math.min(Math.max(parseFloat(pct) || 0, 0), 50);
      const displayPct = formatPctDisplay(clampedPct);

      if (rangeSlider && source !== 'slider') rangeSlider.value = clampedPct;
      if (badgeEl) badgeEl.textContent = displayPct;
      if (pctInput && source !== 'pctInput') pctInput.value = displayPct;

      if (moneyInput && creditVal > 0 && source !== 'moneyInput') {
        const calculatedBrl = creditVal * (clampedPct / 100);
        moneyInput.value = formatCurrency(calculatedBrl);
      }
      updateA4Sheet();
    };

    // Sync from Money
    const syncFromMoney = (rawVal) => {
      const digits = String(rawVal).replace(/\D/g, '');
      if (!digits) {
        syncFromPercentage(0, 'moneyInput');
        return;
      }
      const valMoney = parseFloat(digits) / 100;

      if (creditVal > 0) {
        const maxMoney = creditVal * 0.50; // Máximo 50%
        const clampedMoney = Math.min(valMoney, maxMoney);
        if (moneyInput) {
          moneyInput.value = formatCurrency(clampedMoney);
        }
        const calcPct = Math.min(Math.max((clampedMoney / creditVal) * 100, 0), 50);
        syncFromPercentage(calcPct, 'moneyInput');
      } else {
        if (moneyInput) {
          moneyInput.value = formatCurrency(valMoney);
        }
        updateA4Sheet();
      }
    };

    if (rangeSlider) {
      rangeSlider.addEventListener('input', (e) => {
        syncFromPercentage(e.target.value, 'slider');
      });
    }

    if (pctInput) {
      pctInput.addEventListener('input', (e) => {
        const raw = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
        const val = parseFloat(raw) || 0;
        syncFromPercentage(val, 'pctInput');
      });
    }

    if (moneyInput) {
      moneyInput.addEventListener('input', (e) => {
        syncFromMoney(e.target.value);
      });
    }

    // Live Formatters for CPF/CNPJ and Phone/WhatsApp
    const formatCpfCnpj = (val) => {
      const digits = String(val).replace(/\D/g, '').slice(0, 14);
      if (!digits) return '';
      if (digits.length <= 11) {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
      } else {
        if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      }
    };

    const formatPhone = (val) => {
      const digits = String(val).replace(/\D/g, '').slice(0, 11);
      if (!digits) return '';
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const cpfInputEl = document.getElementById('pf-client-cpf');
    if (cpfInputEl) {
      cpfInputEl.addEventListener('input', (e) => {
        e.target.value = formatCpfCnpj(e.target.value);
        updateA4Sheet();
      });
    }

    const phoneInputEl = document.getElementById('pf-client-phone');
    if (phoneInputEl) {
      phoneInputEl.addEventListener('input', (e) => {
        e.target.value = formatPhone(e.target.value);
        updateA4Sheet();
      });
    }

    // Toggle bid controls visibility based on pf-include-bid-toggle
    const toggleBidControlsVisibility = () => {
      const includeBid = document.getElementById('pf-include-bid-toggle')?.checked ?? true;
      const wrapper = document.getElementById('pf-bid-controls-wrapper');
      if (wrapper) {
        wrapper.style.display = includeBid ? 'block' : 'none';
      }
    };

    // Attach listeners for live update of A4 sheet
    ['pf-client-name', 'pf-property-type', 'pf-bid-amount', 'pf-embedded-bid', 'pf-show-percentage-toggle', 'pf-include-bid-toggle', 'pf-validity', 'pf-notes'].forEach(id => {
      const inputEl = document.getElementById(id);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          toggleBidControlsVisibility();
          updateA4Sheet();
        });
        inputEl.addEventListener('change', () => {
          toggleBidControlsVisibility();
          updateA4Sheet();
        });
      }
    });

    toggleBidControlsVisibility();
    updateA4Sheet();

    // Attach action button handlers
    document.getElementById('pf-btn-back')?.addEventListener('click', () => {
      const tabs = document.querySelectorAll('[data-service-tab]');
      tabs.forEach(t => t.classList.remove('active'));
      const simNavBtn = document.querySelector('[data-service-tab="simulador"]');
      if (simNavBtn) simNavBtn.classList.add('active');
      document.querySelectorAll('[data-service-tab-content]').forEach(c => {
        c.style.display = c.dataset.serviceTabContent === 'simulador' ? 'block' : 'none';
      });
    });

    document.getElementById('pf-btn-save-system')?.addEventListener('click', async () => {
      try {
        const clientName = (document.getElementById('pf-client-name')?.value || 'Cliente Não Informado').trim();
        const clientCpf = (document.getElementById('pf-client-cpf')?.value || '').trim();
        const clientPhone = (document.getElementById('pf-client-phone')?.value || '').trim();
        const notesVal = (document.getElementById('pf-notes')?.value || '').trim();
        const propType = (document.getElementById('pf-property-type')?.value || '').trim();
        const validityDate = (document.getElementById('pf-validity')?.value || '').trim();
        const includeBid = document.getElementById('pf-include-bid-toggle')?.checked ?? true;
        const bidPercent = parseFloat(document.getElementById('pf-embedded-bid-range')?.value || 30);
        const bidAmountStr = document.getElementById('pf-bid-amount')?.value || '';
        const bidAmount = parseCurrency(bidAmountStr) || ((proposal.credit_value || proposal.credito || 0) * (bidPercent / 100));
        const showPercentages = document.getElementById('pf-show-percentage-toggle')?.checked ?? false;

        const productName = proposal.product_name || proposal.produto || 'Imóveis (AUTOCON)';

        const todayStr = new Date().toISOString().slice(0, 10);
        const currentList = getClosedClientsList();

        const existingId = window.__currentEditingClientId;
        const existingClient = existingId ? currentList.find(c => String(c.id) === String(existingId)) : null;
        const clientId = existingClient ? existingClient.id : (existingId || ('cl-' + Date.now()));

        // Retain current editing ID for future saves in the same view session
        window.__currentEditingClientId = clientId;

        const updatedClientRecord = {
          id: clientId,
          nome: clientName,
          cpf_cnpj: clientCpf || 'N/A',
          telefone: clientPhone || 'N/A',
          produto: productName,
          credito: Number(proposal.credit_value || proposal.credito || 0),
          entrada: Number(proposal.first_installment || proposal.entrada || 0),
          parcela: Number(proposal.final_installment_value || proposal.parcela || 0),
          grupo_cota: (proposal.group_number && proposal.quota_number) 
            ? `Grupo ${proposal.group_number} / Cota ${proposal.quota_number}` 
            : (proposal.grupo_cota || 'G7-VIP'),
          data_fechamento: existingClient ? existingClient.data_fechamento : todayStr,
          status: existingClient ? existingClient.status : 'Assinado',
          consultor: consultantName || 'Seven Gold',
          observacao: notesVal,
          documentos_obrigatorios: existingClient ? (existingClient.documentos_obrigatorios || {}) : {},
          proposal_config: {
            ...proposal,
            client_id: clientId,
            client_name: clientName,
            client_cpf: clientCpf,
            client_phone: clientPhone,
            notes: notesVal,
            property_type: propType,
            validity_date: validityDate,
            include_bid: includeBid,
            bid_percentage: bidPercent,
            fixed_bid_percentage: bidPercent,
            bid_amount: bidAmount,
            show_percentages: showPercentages,
            consultant_name: consultantName
          }
        };

        if (existingClient) {
          const idx = currentList.findIndex(c => String(c.id) === String(clientId));
          if (idx !== -1) currentList[idx] = updatedClientRecord;
        } else {
          currentList.unshift(updatedClientRecord);
        }

        saveClosedClientsList(currentList);

        // Async sync to Supabase database
        saveProposalToSupabase(updatedClientRecord);

        alert(`✅ Todos os dados da proposta de "${clientName}" foram salvos no sistema e no Supabase!`);

        // Switch to Clientes subtab in topbar
        const clientesNavBtn = document.querySelector('[data-subtab="clientes"]');
        if (clientesNavBtn) {
          document.querySelectorAll('.simulador-tab-btn').forEach(b => b.classList.remove('active'));
          clientesNavBtn.classList.add('active');

          const simContainer = document.querySelector('[data-service-tab-content="simulador"]');
          const pfContainer = document.getElementById('proposta-final-container');
          if (simContainer) simContainer.style.display = 'block';
          if (pfContainer) pfContainer.style.display = 'none';

          document.querySelectorAll('.simulador-subtab-content').forEach(c => c.style.display = 'none');
          const activeContent = document.getElementById('subtab-clientes');
          if (activeContent) activeContent.style.display = 'block';

          renderClosedClientsTab();
        }
      } catch (err) {
        console.error("Erro ao salvar proposta:", err);
        alert("⚠️ Erro ao salvar a proposta no sistema. Por favor tente novamente.");
      }
    });

    // Helper to format document/print title: Proposta - Nome do Cliente - DD.MM
    const getFormattedPdfTitle = () => {
      const clientName = (document.getElementById('pf-client-name')?.value || 'Cliente').trim();
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `Proposta - ${clientName} - ${day}.${month}`;
    };

    document.getElementById('pf-btn-pdf')?.addEventListener('click', () => {
      const element = document.getElementById('proposta-final-a4-sheet');
      if (!element) return;
      const pdfTitle = getFormattedPdfTitle();
      if (window.html2pdf) {
        const opt = {
          margin: 0,
          filename: `${pdfTitle}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        window.html2pdf().from(element).set(opt).save();
      } else {
        const oldTitle = document.title;
        document.title = pdfTitle;
        window.print();
        setTimeout(() => { document.title = oldTitle; }, 1000);
      }
    });

    document.getElementById('pf-btn-print')?.addEventListener('click', () => {
      const pdfTitle = getFormattedPdfTitle();
      const oldTitle = document.title;
      document.title = pdfTitle;
      window.print();
      setTimeout(() => { document.title = oldTitle; }, 1000);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Fetch active commercial tables
  async function fetchActiveTablesList() {}
  async function fetchAuditHistory() {}

  // Initialize
  const initSimulador = () => {
    const hasSimulatorContainer = document.querySelector('[data-service-tab-content="simulador"]') || document.querySelector('.service-shell');
    if (!hasSimulatorContainer) return;

    // Render simulator UI directly on page load
    renderSimulatorShell();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSimulador);
  } else {
    initSimulador();
  }

  // --- MÓDULO DE CLIENTES FECHADOS & CONTRATOS ATIVOS ---
  const MANDATORY_DOC_TYPES = [
    {
      key: "direito_imagem",
      title: "Direito de Imagens",
      icon: "camera",
      description: "Termo de cessão e autorização de uso de imagem e voz.",
      accept: ".pdf,.jpg,.jpeg,.png"
    },
    {
      key: "recapitulacao_escrita",
      title: "Recapitulação Escrita",
      icon: "file-signature",
      description: "Documento assinado de recapitulação dos termos do consórcio.",
      accept: ".pdf,.doc,.docx"
    },
    {
      key: "recapitulacao_video",
      title: "Recapitulação em Vídeo",
      icon: "video",
      description: "Gravação de vídeo/áudio com a validação do contrato.",
      accept: "video/*,.mp4,.mov,.webm,.m4v"
    },
    {
      key: "lgpd",
      title: "Termo de Consentimento LGPD",
      icon: "shield-check",
      description: "Termo assinado de consentimento sob a Lei Geral de Proteção de Dados.",
      accept: ".pdf,.jpg,.jpeg,.png"
    }
  ];

  function getClientDocsCompliance(client) {
    const docs = client.documentos_obrigatorios || {};
    const mandatoryKeys = ["direito_imagem", "recapitulacao_escrita", "recapitulacao_video", "lgpd"];
    let attachedCount = 0;
    mandatoryKeys.forEach(k => {
      if (docs[k] && docs[k].anexado) attachedCount++;
    });
    return {
      attachedCount,
      total: 4,
      isComplete: attachedCount === 4
    };
  }

  const DEFAULT_CLOSED_CLIENTS = [
    {
      id: "cl-1",
      nome: "Carlos Eduardo Oliveira",
      cpf_cnpj: "123.456.789-00",
      telefone: "(11) 98765-4321",
      produto: "Imóveis (AUTOCON)",
      credito: 450000,
      entrada: 225000,
      parcela: 2150,
      grupo_cota: "Grupo 7042 / Cota 148",
      data_fechamento: "2026-07-24",
      status: "Assinado",
      consultor: "Seven Gold",
      documentos_obrigatorios: {
        direito_imagem: { anexado: true, arquivo_nome: "termo_imagem_carlos.pdf", data_upload: "2026-07-24T14:30:00Z" },
        recapitulacao_escrita: { anexado: true, arquivo_nome: "recapitulacao_escrita_carlos.pdf", data_upload: "2026-07-24T14:31:00Z" },
        recapitulacao_video: { anexado: true, arquivo_nome: "recapitulacao_video_carlos.mp4", data_upload: "2026-07-24T14:35:00Z" },
        lgpd: { anexado: true, arquivo_nome: "termo_lgpd_carlos.pdf", data_upload: "2026-07-24T14:32:00Z" }
      }
    },
    {
      id: "cl-2",
      nome: "Juliana Mendes Ribeiro",
      cpf_cnpj: "987.654.321-11",
      telefone: "(11) 97123-8899",
      produto: "Automóveis (AUTOCON)",
      credito: 180000,
      entrada: 90000,
      parcela: 890,
      grupo_cota: "Grupo 3012 / Cota 082",
      data_fechamento: "2026-07-20",
      status: "Em Análise",
      consultor: "Seven Gold",
      documentos_obrigatorios: {
        direito_imagem: { anexado: false, arquivo_nome: null, data_upload: null },
        recapitulacao_escrita: { anexado: true, arquivo_nome: "recapitulacao_juliana.pdf", data_upload: "2026-07-20T10:15:00Z" },
        recapitulacao_video: { anexado: false, arquivo_nome: null, data_upload: null },
        lgpd: { anexado: true, arquivo_nome: "termo_lgpd_juliana.pdf", data_upload: "2026-07-20T10:16:00Z" }
      }
    },
    {
      id: "cl-3",
      nome: "Transportadora Ouro Verde Ltda",
      cpf_cnpj: "12.345.678/0001-99",
      telefone: "(11) 3344-5566",
      produto: "Pesados & Maquinários",
      credito: 850000,
      entrada: 425000,
      parcela: 4100,
      grupo_cota: "Grupo 9050 / Cota 015",
      data_fechamento: "2026-07-15",
      status: "Contemplado",
      consultor: "Seven Gold",
      documentos_obrigatorios: {
        direito_imagem: { anexado: true, arquivo_nome: "termo_imagem_ouro_verde.pdf", data_upload: "2026-07-15T09:00:00Z" },
        recapitulacao_escrita: { anexado: true, arquivo_nome: "recapitulacao_escrita_ouro_verde.pdf", data_upload: "2026-07-15T09:05:00Z" },
        recapitulacao_video: { anexado: true, arquivo_nome: "recapitulacao_video_ouro_verde.mp4", data_upload: "2026-07-15T09:12:00Z" },
        lgpd: { anexado: true, arquivo_nome: "termo_lgpd_ouro_verde.pdf", data_upload: "2026-07-15T09:02:00Z" }
      }
    }
  ];

  function getClosedClientsList() {
    try {
      const stored = localStorage.getItem("seven_gold_closed_clients");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem("seven_gold_closed_clients", JSON.stringify(DEFAULT_CLOSED_CLIENTS));
    return DEFAULT_CLOSED_CLIENTS;
  }

  function saveClosedClientsList(list) {
    localStorage.setItem("seven_gold_closed_clients", JSON.stringify(list));
  }

  async function saveProposalToSupabase(clientRecord) {
    try {
      const client = getClient();
      if (!client) return;
      await client.from('crm_propostas').upsert({
        id: clientRecord.id,
        nome_cliente: clientRecord.nome,
        cpf_cnpj: clientRecord.cpf_cnpj,
        telefone: clientRecord.telefone,
        consultor: clientRecord.consultor,
        produto: clientRecord.produto,
        credito: clientRecord.credito,
        entrada: clientRecord.entrada,
        parcela: clientRecord.parcela,
        grupo_cota: clientRecord.grupo_cota,
        data_fechamento: clientRecord.data_fechamento,
        status: clientRecord.status,
        observacao: clientRecord.observacao,
        documentos_obrigatorios: clientRecord.documentos_obrigatorios,
        proposal_config: clientRecord.proposal_config
      });
    } catch (e) {
      console.warn("Aviso ao sincronizar proposta no Supabase:", e);
    }
  }

  async function fetchSupabaseProposals() {
    try {
      const client = getClient();
      if (!client) return;
      const { data, error } = await client.from('crm_propostas').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const supabaseClients = data.map(row => ({
          id: row.id || ('cl-' + Date.now()),
          nome: row.nome_cliente || row.nome || 'Cliente',
          cpf_cnpj: row.cpf_cnpj || 'N/A',
          telefone: row.telefone || 'N/A',
          produto: row.produto || 'Consórcio',
          credito: Number(row.credito || 0),
          entrada: Number(row.entrada || 0),
          parcela: Number(row.parcela || 0),
          grupo_cota: row.grupo_cota || 'G7-VIP',
          data_fechamento: row.data_fechamento || new Date().toISOString().slice(0, 10),
          status: row.status || 'Assinado',
          consultor: row.consultor || 'Seven Gold',
          observacao: row.observacao || '',
          documentos_obrigatorios: row.documentos_obrigatorios || {},
          proposal_config: row.proposal_config || null
        }));

        // Merge: retain all local proposals and overlay Supabase updates without discarding newly created local items
        const localList = getClosedClientsList();
        const mergedList = [...localList];

        supabaseClients.forEach(sbClient => {
          const idx = mergedList.findIndex(l => String(l.id) === String(sbClient.id));
          if (idx !== -1) {
            mergedList[idx] = { ...mergedList[idx], ...sbClient };
          } else {
            mergedList.push(sbClient);
          }
        });

        saveClosedClientsList(mergedList);
        renderClosedClientsTab();
      }
    } catch (e) {
      console.warn("Aviso ao carregar propostas do Supabase:", e);
    }
  }

  function renderClosedClientsTab() {
    const tbody = document.getElementById("closed-clients-tbody");
    if (!tbody) return;

    const searchVal = (document.getElementById("closed-search-input")?.value || "").toLowerCase().trim();
    const statusVal = document.getElementById("closed-filter-status")?.value || "";

    const allClients = getClosedClientsList();

    const filtered = allClients.filter(c => {
      const matchSearch = !searchVal || 
        c.nome.toLowerCase().includes(searchVal) || 
        (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(searchVal)) || 
        (c.grupo_cota && c.grupo_cota.toLowerCase().includes(searchVal));

      const matchStatus = !statusVal || c.status === statusVal;

      return matchSearch && matchStatus;
    });

    // Compute KPIs
    const totalClients = allClients.length;
    const totalCredit = allClients.reduce((acc, curr) => acc + Number(curr.credito || 0), 0);
    const signedCount = allClients.filter(c => c.status === "Assinado" || c.status === "Contemplado").length;

    const kpiClientsEl = document.getElementById("kpi-total-clients");
    const kpiCreditEl = document.getElementById("kpi-total-credit");
    const kpiSignedEl = document.getElementById("kpi-signed-contracts");

    if (kpiClientsEl) kpiClientsEl.textContent = totalClients;
    if (kpiCreditEl) kpiCreditEl.textContent = formatCurrency(totalCredit);
    if (kpiSignedEl) kpiSignedEl.textContent = signedCount;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:40px; color:#64748b;">
            Nenhum cliente fechado encontrado com estes filtros.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(client => {
      const initial = (client.nome || "C").charAt(0).toUpperCase();
      const statusClass = client.status === "Assinado" ? "badge-signed" : (client.status === "Contemplado" ? "badge-contemplated" : "badge-analysis");
      const compliance = getClientDocsCompliance(client);

      return `
        <tr>
          <td>
            <div class="closed-client-name-cell">
              <span class="closed-client-avatar">${initial}</span>
              <div class="closed-client-details">
                <strong class="closed-client-title">${client.nome}</strong>
                <span class="closed-client-sub">${client.cpf_cnpj || "CPF/CNPJ N/A"} • ${client.telefone || "Tel N/A"}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="closed-product-cell">
              <strong style="color:#0f172a; font-size:0.85rem;">${client.produto || "Consórcio"}</strong>
              <span style="color:#64748b; font-size:0.75rem;">${client.grupo_cota || "—"}</span>
            </div>
          </td>
          <td>
            <strong style="color:#10b981; font-weight:800; font-size:0.92rem;">${formatCurrency(client.credito)}</strong>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="color:#0f172a; font-size:0.82rem; font-weight:700;">Entrada: ${formatCurrency(client.entrada)}</span>
              <span style="color:#64748b; font-size:0.75rem;">Parcela: ${formatCurrency(client.parcela)}</span>
            </div>
          </td>
          <td style="color:#475569; font-size:0.82rem; font-weight:600;">
            ${client.data_fechamento ? new Date(client.data_fechamento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
          </td>
          <td>
            ${compliance.isComplete ? `
              <span class="doc-badge-status ready" title="Todos os 4 documentos obrigatórios estão anexados!">
                <i data-lucide="shield-check"></i> 4/4 OK
              </span>
            ` : `
              <span class="doc-badge-status warning" title="Pendências em documentos obrigatórios!">
                <i data-lucide="alert-triangle"></i> ${compliance.attachedCount}/4 Anexados
              </span>
            `}
          </td>
          <td>
            <span class="closed-status-badge ${statusClass}">${client.status || "Assinado"}</span>
          </td>
          <td style="text-align: right;">
            <div class="closed-actions-row">
              <button type="button" class="btn-closed-action docs" data-open-docs="${client.id}" title="Gerenciar Documentos Obrigatórios">
                <i data-lucide="folder-check"></i> Docs (${compliance.attachedCount}/4)
              </button>
              <button type="button" class="btn-closed-action a4" data-open-a4="${client.id}" title="Visualizar Proposta Final A4">
                <i data-lucide="file-text"></i> A4
              </button>
              <button type="button" class="btn-closed-action delete" data-delete-client="${client.id}" title="Excluir">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    if (window.lucide) window.lucide.createIcons();

    // Attach click listeners for action buttons in table
    tbody.querySelectorAll("[data-open-docs]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.openDocs;
        openClientDocsModal(id);
      };
    });

    tbody.querySelectorAll("[data-open-a4]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.openA4;
        const client = allClients.find(c => c.id === id);
        if (!client) return;

        const proposalPayload = client.proposal_config || {
          product_name: client.produto || "Imóveis (AUTOCON)",
          credit_value: Number(client.credito || 0),
          first_installment: Number(client.entrada || 0),
          final_installment_value: Number(client.parcela || 0),
          total_months: 180,
          bid_amount: Number(client.entrada || 0),
          bid_percentage: client.credito > 0 ? ((Number(client.entrada) / Number(client.credito)) * 100).toFixed(2) : "0",
          group_number: client.grupo_cota ? client.grupo_cota.split('/')[0] : '—',
          quota_number: client.grupo_cota ? client.grupo_cota.split('/')[1] : '—'
        };

        proposalPayload.client_id = client.id;
        proposalPayload.client_name = client.nome;
        proposalPayload.client_cpf = client.cpf_cnpj;
        proposalPayload.client_phone = client.telefone;
        proposalPayload.notes = client.observacao || '';
        proposalPayload.consultant_name = client.consultor;

        openMontarPropostaFinal(proposalPayload, client.id);
      };
    });

    tbody.querySelectorAll("[data-delete-client]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.deleteClient;
        if (!confirm("Deseja realmente remover este cliente fechado?")) return;
        const updated = allClients.filter(c => c.id !== id);
        saveClosedClientsList(updated);
        renderClosedClientsTab();
      };
    });
  }

  // --- MODAL DE GERENCIAMENTO DE DOCUMENTOS OBRIGATÓRIOS ---
  function openClientDocsModal(clientId) {
    const modal = document.getElementById("modal-client-docs");
    if (!modal) return;

    const allClients = getClosedClientsList();
    const client = allClients.find(c => c.id === clientId);
    if (!client) return;

    document.getElementById("modal-docs-client-name").innerHTML = `<i data-lucide="folder-check" style="color:#D8B34A;"></i> Documentos do Contrato: <strong>${client.nome}</strong>`;
    document.getElementById("modal-docs-client-sub").textContent = `CPF/CNPJ: ${client.cpf_cnpj || 'N/A'} • Produto: ${client.produto || 'Consórcio'}`;

    function renderModalContent() {
      const compliance = getClientDocsCompliance(client);
      const banner = document.getElementById("modal-docs-compliance-banner");
      const slotsContainer = document.getElementById("mandatory-docs-slots-container");

      if (compliance.isComplete) {
        banner.className = "compliance-banner success";
        banner.innerHTML = `<i data-lucide="check-circle-2"></i> <div><strong>Contrato Liberado para Envio!</strong> Todos os 4 documentos obrigatórios estão devidamente anexados.</div>`;
      } else {
        banner.className = "compliance-banner warning";
        banner.innerHTML = `<i data-lucide="alert-triangle"></i> <div><strong>Pendência de Documentos (${compliance.attachedCount}/4)</strong>: Anexe os ${4 - compliance.attachedCount} documento(s) restantes para poder enviar o contrato.</div>`;
      }

      if (!client.documentos_obrigatorios) {
        client.documentos_obrigatorios = {};
      }

      slotsContainer.innerHTML = MANDATORY_DOC_TYPES.map(docType => {
        const docState = client.documentos_obrigatorios[docType.key] || { anexado: false, arquivo_nome: null };
        const isAttached = docState.anexado;

        return `
          <div class="mandatory-doc-slot ${isAttached ? 'attached' : ''}">
            <div class="doc-slot-left">
              <div class="doc-slot-icon-box">
                <i data-lucide="${docType.icon}"></i>
              </div>
              <div class="doc-slot-info">
                <div class="doc-slot-title">
                  ${docType.title}
                  ${isAttached ? '<span style="color:#10b981; font-size:0.75rem; font-weight:800;">✓ Anexado</span>' : '<span style="color:#ef4444; font-size:0.75rem; font-weight:800;">• Pendente</span>'}
                </div>
                <div class="doc-slot-desc">${docType.description}</div>
                ${isAttached ? `<div class="doc-file-meta"><i data-lucide="paperclip"></i> ${docState.arquivo_nome || 'Arquivo anexado'}</div>` : ''}
              </div>
            </div>

            <div class="doc-slot-actions">
              ${isAttached ? `
                <button type="button" class="btn-action-doc open-pdf" data-open-pdf="${docType.key}" title="Abrir PDF / Visualizar Documento">
                  <i data-lucide="file-text"></i> Abrir PDF
                </button>
                <label class="btn-action-doc replace" title="Substituir por outro arquivo">
                  <i data-lucide="refresh-cw"></i> Substituir
                  <input type="file" accept="${docType.accept}" style="display:none;" data-upload-doc="${docType.key}" />
                </label>
                <button type="button" class="btn-action-doc remove" data-remove-doc="${docType.key}" title="Remover Documento">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : `
                <label class="btn-action-doc add">
                  <i data-lucide="plus-circle"></i> Adicionar Documento
                  <input type="file" accept="${docType.accept}" style="display:none;" data-upload-doc="${docType.key}" />
                </label>
              `}
            </div>
          </div>
        `;
      }).join("");

      if (window.lucide) window.lucide.createIcons();

      // Attach file input listeners (Add / Replace)
      slotsContainer.querySelectorAll("[data-upload-doc]").forEach(input => {
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const key = input.dataset.uploadDoc;
          if (!client.documentos_obrigatorios) client.documentos_obrigatorios = {};

          const fileBlobUrl = URL.createObjectURL(file);

          client.documentos_obrigatorios[key] = {
            anexado: true,
            arquivo_nome: file.name,
            arquivo_url: fileBlobUrl,
            data_upload: new Date().toISOString()
          };

          // Save updated client list
          const list = getClosedClientsList();
          const idx = list.findIndex(c => c.id === client.id);
          if (idx !== -1) list[idx] = client;
          saveClosedClientsList(list);

          renderModalContent();
          renderClosedClientsTab();
        };
      });

      // Abrir PDF button click
      slotsContainer.querySelectorAll("[data-open-pdf]").forEach(btn => {
        btn.onclick = () => {
          const key = btn.dataset.openPdf;
          const docType = MANDATORY_DOC_TYPES.find(d => d.key === key);
          const docState = client.documentos_obrigatorios[key];
          
          if (docState && docState.arquivo_url) {
            window.open(docState.arquivo_url, '_blank');
          } else {
            // Open a clean dedicated PDF viewer tab
            const win = window.open("", "_blank");
            if (!win) return;
            win.document.write(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>${docType.title} - ${client.nome}</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                    .pdf-card { background: #1E293B; border: 1.5px solid #D8B34A; border-radius: 20px; padding: 48px; max-width: 600px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.5); text-align: center; }
                    .badge { background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 16px; border-radius: 20px; font-weight: 800; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 20px; }
                    h1 { color: #D8B34A; font-size: 1.6rem; margin: 0 0 10px 0; font-weight: 800; }
                    .client-info { background: #0F172A; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #334155; text-align: left; }
                    .client-info div { margin-bottom: 8px; font-size: 0.88rem; color: #94A3B8; }
                    .client-info div strong { color: #FFFFFF; }
                    .footer-note { font-size: 0.75rem; color: #64748B; margin-top: 24px; }
                  </style>
                </head>
                <body>
                  <div class="pdf-card">
                    <span class="badge">✓ DOCUMENTO AUTENTICADO</span>
                    <h1>${docType.title}</h1>
                    <p style="color:#CBD5E1; font-size:0.95rem; margin-bottom:0;">${docType.description}</p>
                    
                    <div class="client-info">
                      <div>Cliente: <strong>${client.nome}</strong></div>
                      <div>CPF/CNPJ: <strong>${client.cpf_cnpj || 'N/A'}</strong></div>
                      <div>Nome do Arquivo: <strong style="color:#D8B34A;">${docState ? (docState.arquivo_nome || 'documento_oficial.pdf') : 'documento.pdf'}</strong></div>
                      <div>Status no Sistema: <strong style="color:#10B981;">Validado & Anexado ao Contrato</strong></div>
                    </div>

                    <p style="font-size:0.85rem; color:#94A3B8;">Este documento cumpre com todas as exigências do contrato Seven Gold CRM.</p>
                    <div class="footer-note">Setor de Compliance & Contratos • Seven Gold Financeira</div>
                  </div>
                </body>
              </html>
            `);
          }
        };
      });

      // Remove button click
      slotsContainer.querySelectorAll("[data-remove-doc]").forEach(btn => {
        btn.onclick = () => {
          const key = btn.dataset.removeDoc;
          if (!confirm("Deseja realmente remover este documento anexado?")) return;
          client.documentos_obrigatorios[key] = { anexado: false, arquivo_nome: null, data_upload: null };

          const list = getClosedClientsList();
          const idx = list.findIndex(c => c.id === client.id);
          if (idx !== -1) list[idx] = client;
          saveClosedClientsList(list);

          renderModalContent();
          renderClosedClientsTab();
        };
      });
    }

    renderModalContent();
    modal.style.display = "flex";

    document.getElementById("btn-close-docs-modal").onclick = () => { modal.style.display = "none"; };
    document.getElementById("btn-finish-docs-modal").onclick = () => { modal.style.display = "none"; };
  }
})();

