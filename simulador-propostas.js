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

    container.innerHTML = `
      <div class="simulador-container">
        <!-- Sub-tabs nav -->
        <nav class="simulador-tabs-nav">
          <button type="button" class="simulador-tab-btn active" data-subtab="simulacao">
            <i data-lucide="calculator"></i> Simulação
          </button>
          <button type="button" class="simulador-tab-btn" data-subtab="tabelas">
            <i data-lucide="table"></i> Tabelas Disponíveis
          </button>
          ${isAdminOrManager ? `
            <button type="button" class="simulador-tab-btn" data-subtab="configuracoes">
              <i data-lucide="settings"></i> Configurações e Importação (Admin)
            </button>
          ` : ''}
        </nav>

        <!-- Sub-tab 1: Simulação -->
        <div class="simulador-subtab-content" id="subtab-simulacao">
          <div class="simulador-main-grid">
            <!-- Left Form Filters -->
            <form class="simulador-filters-card" id="proposal-sim-form">
              <h2 class="simulador-filters-title"><i data-lucide="sliders-horizontal" style="color:#d4af37; width:18px;"></i> Limites do Cliente</h2>
              
              <div class="simulador-form-group">
                <label for="sim-desired-credit">Crédito Desejado</label>
                <input type="text" id="sim-desired-credit" class="simulador-input brl-mask" placeholder="R$ 250.000,00" />
              </div>

              <div class="simulador-form-group">
                <label for="sim-max-first-inst">Entrada / 1ª Parcela Máxima <span class="req">*</span></label>
                <input type="text" id="sim-max-first-inst" class="simulador-input brl-mask" placeholder="R$ 24.000,00" required />
              </div>

              <div class="simulador-form-group">
                <label for="sim-max-inst">Valor de Parcela Máxima <span class="req">*</span></label>
                <input type="text" id="sim-max-inst" class="simulador-input brl-mask" placeholder="R$ 1.850,00" required />
              </div>

              <!-- Optional Filters Toggle -->
              <details style="margin-top:4px;">
                <summary style="font-size:0.76rem; font-weight:700; color:#d4af37; cursor:pointer; user-select:none;">
                  Filtros Opcionais de Margem
                </summary>
                <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                  <div class="simulador-form-group">
                    <label for="sim-min-credit">Crédito Mínimo Aceitável</label>
                    <input type="text" id="sim-min-credit" class="simulador-input brl-mask" placeholder="R$ 200.000,00" />
                  </div>
                  <div class="simulador-form-group">
                    <label for="sim-max-credit">Crédito Máximo Aceitável</label>
                    <input type="text" id="sim-max-credit" class="simulador-input brl-mask" placeholder="R$ 300.000,00" />
                  </div>
                </div>
              </details>

              <div class="simulador-form-group priority-selector" style="margin-top:6px;">
                <label for="sim-priority">Prioridade da Busca</label>
                <select id="sim-priority" class="simulador-input" style="cursor:pointer;">
                  <option value="EQUILIBRIO">Melhor Equilíbrio (Recomendado)</option>
                  <option value="CREDITO_PROXIMO">Crédito mais próximo do desejado</option>
                  <option value="MAIOR_CREDITO">Maior crédito possível</option>
                  <option value="MENOR_ENTRADA">Menor entrada / 1ª parcela</option>
                  <option value="MENOR_TEMPORARIA">Menor parcela temporária</option>
                  <option value="MENOR_POSTERIOR">Menor parcela posterior</option>
                  <option value="MAIS_MESES_REDUZIDOS">Mais meses com parcela temporária reduzida</option>
                </select>
              </div>

              <div class="simulador-actions">
                <button type="submit" class="bordero-btn-primary" style="width:100%; justify-content:center;">
                  <i data-lucide="search"></i> Buscar Propostas
                </button>
                <button type="button" class="bordero-btn-secondary" id="sim-reset-btn" style="width:100%; justify-content:center;">
                  <i data-lucide="rotate-ccw"></i> Limpar Filtros
                </button>
              </div>
            </form>

            <!-- Right Results List -->
            <div class="simulador-results-container">
              <div class="simulador-results-header">
                <span class="simulador-results-count" id="sim-results-count-text">
                  Informe os limites do cliente ao lado para realizar a simulação.
                </span>
                <button type="button" class="bordero-btn-secondary" id="sim-toggle-near-btn" style="display:none;">
                  <i data-lucide="eye"></i> Mostrar Opções Próximas
                </button>
              </div>

              <div class="proposals-cards-list" id="sim-proposals-list">
                <!-- Simulation Results Cards injected dynamically -->
                <div style="text-align:center; color:#9ca3af; padding:40px; border:1px dashed rgba(255,255,255,0.08); border-radius:16px;">
                  <i data-lucide="calculator" style="width:40px; height:40px; color:#d4af37; margin-bottom:12px;"></i>
                  <p style="margin:0; font-size:0.9rem; font-weight:600;">Preencha os valores de crédito e parcelas e clique em <strong>Buscar Propostas</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-tab 2: Tabelas Disponíveis -->
        <div class="simulador-subtab-content" id="subtab-tabelas" style="display:none;">
          <div class="admin-card-box">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h2 style="color:#fff; font-size:1.1rem; margin:0; font-weight:800;">Tabelas Comerciais Ativas</h2>
              <button type="button" class="bordero-btn-secondary" id="sim-refresh-tables-btn"><i data-lucide="refresh-cw"></i> Atualizar Lista</button>
            </div>
            <div style="overflow-x:auto;">
              <table class="proposals-data-table" id="sim-tables-list-table">
                <thead>
                  <tr>
                    <th>Nº Tabela</th>
                    <th>Plano / Produto</th>
                    <th>Administradora</th>
                    <th>Prazo Total</th>
                    <th>Validade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="6" style="text-align:center; color:#9ca3af;">Carregando tabelas comerciais...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Sub-tab 3: Configurações e Importação (Admin) -->
        ${isAdminOrManager ? `
          <div class="simulador-subtab-content" id="subtab-configuracoes" style="display:none;">
            <div class="admin-proposals-panel">
              <!-- Upload PDF Box -->
              <div class="admin-card-box">
                <h2 style="color:#fff; font-size:1.1rem; margin:0; font-weight:800;"><i data-lucide="file-up" style="color:#d4af37; width:18px;"></i> Importar Nova Tabela Comercial (PDF)</h2>
                
                <div class="pdf-upload-dropzone" id="sim-pdf-dropzone">
                  <i data-lucide="upload-cloud" style="width:40px; height:40px; color:#d4af37;"></i>
                  <p style="font-size:0.9rem; font-weight:700; color:#fff; margin:0;">Clique aqui ou arraste o arquivo PDF da Tabela Comercial</p>
                  <span style="font-size:0.75rem; color:#9ca3af;">Suporta arquivos PDF comerciais originais de até 20MB com hash de validação SHA-256</span>
                  <input type="file" id="sim-pdf-file-input" accept=".pdf" style="display:none;" />
                </div>

                <div id="sim-upload-preview-area" style="display:none;">
                  <!-- Dynamic preview injected here -->
                </div>
              </div>

              <!-- Google Drive Sync Box -->
              <div class="admin-card-box">
                <h2 style="color:#fff; font-size:1.1rem; margin:0; font-weight:800;"><i data-lucide="folder-git2" style="color:#d4af37; width:18px;"></i> Sincronização Google Drive</h2>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                  <div class="simulador-form-group">
                    <label for="sim-drive-folder-id">ID ou Link da Pasta do Google Drive</label>
                    <input type="text" id="sim-drive-folder-id" class="simulador-input" placeholder="Ex: 1A2b3C4d5E6f7G8h9I" />
                  </div>
                  <div class="simulador-form-group">
                    <label for="sim-drive-account">Conta Autenticada Conectada</label>
                    <input type="text" id="sim-drive-account" class="simulador-input" value="admin@sevengold.com.br" readonly />
                  </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                  <span style="font-size:0.78rem; color:#9ca3af;">Última sincronização efetuada: <strong id="sim-drive-last-sync" style="color:#fff;">Hoje às 14:00</strong></span>
                  <button type="button" class="bordero-btn-primary" id="sim-drive-sync-now-btn"><i data-lucide="refresh-cw"></i> Sincronizar Agora</button>
                </div>
              </div>

              <!-- Audit History Table -->
              <div class="admin-card-box">
                <h2 style="color:#fff; font-size:1.1rem; margin:0; font-weight:800;"><i data-lucide="history" style="color:#d4af37; width:18px;"></i> Histórico de Importações e Versões</h2>
                <div style="overflow-x:auto;">
                  <table class="proposals-data-table" id="sim-audit-table">
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Origem</th>
                        <th>Versão</th>
                        <th>Tabelas</th>
                        <th>Status</th>
                        <th>Data Importação</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td colspan="7" style="text-align:center; color:#9ca3af;">Carregando histórico...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
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

        const targetSubtab = btn.dataset.subtab;
        document.querySelectorAll('.simulador-subtab-content').forEach(c => c.style.display = 'none');
        const activeContent = document.getElementById(`subtab-${targetSubtab}`);
        if (activeContent) activeContent.style.display = 'block';

        if (targetSubtab === 'tabelas') fetchActiveTablesList();
        if (targetSubtab === 'configuracoes') fetchAuditHistory();
      });
    });

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
        <div style="text-align:center; color:#9ca3af; padding:40px; border:1px dashed rgba(255,255,255,0.08); border-radius:16px;">
          <i data-lucide="calculator" style="width:40px; height:40px; color:#d4af37; margin-bottom:12px;"></i>
          <p style="margin:0; font-size:0.9rem; font-weight:600;">Filtros limpos com sucesso. Preencha os novos limites.</p>
        </div>
      `;
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
          const data = await resp.json();

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
              fetchActiveTablesList();
              fetchAuditHistory();
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
        const resData = await resp.json();
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
      desired_credit: document.getElementById('sim-desired-credit').value,
      maximum_first_installment: document.getElementById('sim-max-first-inst').value,
      maximum_installment: document.getElementById('sim-max-inst').value,
      minimum_credit: document.getElementById('sim-min-credit')?.value || '',
      maximum_credit: document.getElementById('sim-max-credit')?.value || '',
      ranking_priority: document.getElementById('sim-priority').value,
    };

    try {
      const resp = await fetch('/api/attendance/proposals/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

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

      if (validList.length > 0) {
        countTextEl.innerHTML = `Encontradas <strong>${validList.length}</strong> propostas ideais dentro dos limites rígidos do cliente.`;
        toggleNearBtn.style.display = nearList.length > 0 ? 'inline-flex' : 'none';
        renderProposalCards(validList, false);
      } else {
        // No strict valid matches, show near matches automatically with clear excess notice
        countTextEl.innerHTML = `Nenhuma proposta exata dentro do limite. Exibindo <strong>${nearList.length}</strong> opções próximas.`;
        toggleNearBtn.style.display = 'none';
        renderProposalCards(nearList, true);
      }

      if (toggleNearBtn) {
        toggleNearBtn.onclick = () => {
          renderProposalCards(nearList, true);
          countTextEl.innerHTML = `Exibindo <strong>${nearList.length}</strong> opções próximas que ultrapassam ligeiramente os limites.`;
        };
      }

    } catch (err) {
      listEl.innerHTML = `<div style="color:#ef4444; text-align:center;">Erro ao realizar busca: ${err.message}</div>`;
    }
  }

  // Render cards list HTML
  function renderProposalCards(proposals, isNearMatch = false) {
    const listEl = document.getElementById('sim-proposals-list');
    if (!listEl) return;

    listEl.innerHTML = proposals.map((p, idx) => {
      const badgeText = isNearMatch ? "Opção Próxima" : (p.badge || `Rank #${idx + 1}`);
      const badgeClass = isNearMatch ? "near" : "";

      return `
        <article class="proposal-item-card ${isNearMatch ? 'near-match' : ''}">
          <span class="proposal-badge ${badgeClass}">${badgeText}</span>
          
          <div class="proposal-card-header">
            <div class="proposal-rank-num">${idx + 1}</div>
            <div class="proposal-title-meta">
              <h3>${p.product_name} - Tabela Nº ${p.table_number}</h3>
              <p>${p.administrator_name} • Validade até <strong>${new Date(p.valid_until).toLocaleDateString('pt-BR')}</strong></p>
            </div>
          </div>

          ${isNearMatch && p.excess_reason ? `
            <div class="near-match-warning">
              <i data-lucide="info" style="width:16px; height:16px; flex-shrink:0;"></i>
              <span>${p.excess_reason}</span>
            </div>
          ` : ''}

          <!-- Metric Specs Grid -->
          <div class="proposal-specs-grid">
            <div class="proposal-spec-item">
              <span>Valor do Crédito</span>
              <strong class="highlight">${formatCurrency(p.credit_value)}</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Entrada / 1ª Parcela</span>
              <strong>${formatCurrency(p.first_installment)}</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Parcelas ${p.temporary_installment_start} a ${p.temporary_installment_end} (Temporária)</span>
              <strong style="color:#1d4ed8;">${formatCurrency(p.temporary_installment_value)} <span style="font-size:0.75rem; font-weight:600; color:#059669;">(Meia: ${formatCurrency(p.temporary_installment_value * 0.5)})</span></strong>
            </div>

            <div class="proposal-spec-item">
              <span>Parcelas ${p.final_installment_start} a ${p.final_installment_end} (Posterior)</span>
              <strong>${formatCurrency(p.final_installment_value)} <span style="font-size:0.75rem; font-weight:600; color:#059669;">(Meia: ${formatCurrency(p.final_installment_value * 0.5)})</span></strong>
            </div>

            <div class="proposal-spec-item">
              <span>Prazo Total</span>
              <strong>${p.total_term_months} Meses</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Taxa Adm / Grupo</span>
              <strong>${p.administration_fee_percentage}% • ${p.group_code || 'G-01'}</strong>
            </div>
          </div>

          <div class="proposal-card-footer">
            <span class="proposal-card-meta-text">Origem: ${p.source_file_name || 'Tabela_Comercial.pdf'} • Lance Fixo: ${p.fixed_bid_percentage || 30}%</span>
            <button type="button" class="bordero-btn-primary" data-action-select-proposal="${p.id}" style="padding:8px 16px; font-size:0.8rem;">
              <i data-lucide="check-circle"></i> Selecionar Proposta
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
          alert(`Proposta Tabela Nº ${selectedProposal.table_number} (Crédito ${formatCurrency(selectedProposal.credit_value)}) selecionada com sucesso e vinculada ao atendimento atual!`);
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Fetch active commercial tables
  async function fetchActiveTablesList() {
    const tableBody = document.querySelector('#sim-tables-list-table tbody');
    if (!tableBody) return;

    try {
      const resp = await fetch('/api/attendance/proposals/tables');
      const data = await resp.json();

      if (data.tables && data.tables.length > 0) {
        tableBody.innerHTML = data.tables.map(t => `
          <tr>
            <td><strong>${t.table_number}</strong></td>
            <td>${t.product_name}</td>
            <td>${t.administrator_name}</td>
            <td>${t.total_term_months} meses</td>
            <td>${new Date(t.valid_until).toLocaleDateString('pt-BR')}</td>
            <td><span style="color:#10b981; font-weight:700; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:4px;">ATIVO</span></td>
          </tr>
        `).join('');
      } else {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#9ca3af;">Nenhuma tabela comercial ativa cadastrada.</td></tr>`;
      }
    } catch (e) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">Erro ao carregar tabelas.</td></tr>`;
    }
  }

  // Fetch audit history
  async function fetchAuditHistory() {
    const tableBody = document.querySelector('#sim-audit-table tbody');
    if (!tableBody) return;

    try {
      const resp = await fetch('/api/attendance/proposals/imports');
      const data = await resp.json();

      if (data.imports && data.imports.length > 0) {
        tableBody.innerHTML = data.imports.map(i => `
          <tr>
            <td><strong>${i.source_file_name}</strong></td>
            <td><span style="font-size:0.72rem; background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">${i.source_type}</span></td>
            <td>${i.version}</td>
            <td>${i.valid_tables_count} tabelas (${i.proposal_rows_count} propostas)</td>
            <td><span style="color:#10b981; font-weight:700;">${i.status}</span></td>
            <td>${new Date(i.created_at).toLocaleDateString('pt-BR')}</td>
            <td><button type="button" class="bordero-btn-secondary" style="padding:4px 8px; font-size:0.72rem;">Auditado</button></td>
          </tr>
        `).join('');
      } else {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9ca3af;">Nenhum histórico de importação encontrado.</td></tr>`;
      }
    } catch (e) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">Erro ao carregar histórico.</td></tr>`;
    }
  }

  // Initialize
  const initSimulador = () => {
    // Check if we are in atendimento.html
    const hasServiceShell = document.querySelector('.service-shell');
    if (!hasServiceShell) return;

    // Listen for tab click in atendimento.html
    const simNavBtn = document.querySelector('[data-service-tab="simulador"]');
    if (simNavBtn) {
      simNavBtn.addEventListener('click', () => {
        renderSimulatorShell();
      });
    }

    if (window.location.hash === '#simulador') {
      renderSimulatorShell();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSimulador);
  } else {
    initSimulador();
  }
})();
