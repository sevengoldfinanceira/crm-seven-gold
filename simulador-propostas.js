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

    container.innerHTML = `
      <div class="simulador-container">
        <!-- Sub-tabs nav -->
        <nav class="simulador-tabs-nav">
          <button type="button" class="simulador-tab-btn active" data-subtab="simulacao">
            <i data-lucide="calculator"></i> Simulação
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
                <label for="sim-min-credit">Crédito Mínimo</label>
                <input type="text" id="sim-min-credit" class="simulador-input brl-mask" placeholder="R$ 200.000,00" />
              </div>

              <div class="simulador-form-group">
                <label for="sim-max-credit">Crédito Máximo</label>
                <input type="text" id="sim-max-credit" class="simulador-input brl-mask" placeholder="R$ 300.000,00" />
              </div>


              <div class="simulador-form-group">
                <label for="sim-max-first-inst">Entrada Máxima <span class="req">*</span></label>
                <input type="text" id="sim-max-first-inst" class="simulador-input brl-mask" placeholder="R$ 24.000,00" required />
              </div>

              <div class="simulador-form-group">
                <label for="sim-max-inst">Valor de Parcela Máxima <span class="req">*</span></label>
                <input type="text" id="sim-max-inst" class="simulador-input brl-mask" placeholder="R$ 1.850,00" required />
              </div>

              <div class="simulador-form-group" style="margin-top:4px; margin-bottom:6px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.82rem; color:#374151; font-weight:600;">
                  <input type="checkbox" id="sim-use-half-inst" style="width:16px; height:16px; accent-color:#d4af37; cursor:pointer;" />
                  Considerar Parcela Integral (100%)
                </label>
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
              <div class="simulador-sticky-top-bar">
                <div class="simulador-results-header">
                  <span class="simulador-results-count" id="sim-results-count-text">
                    Informe os limites do cliente ao lado para realizar a simulação.
                  </span>
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
                <div style="text-align:center; color:#9ca3af; padding:40px; border:1px dashed rgba(255,255,255,0.08); border-radius:16px;">
                  <i data-lucide="calculator" style="width:40px; height:40px; color:#d4af37; margin-bottom:12px;"></i>
                  <p style="margin:0; font-size:0.9rem; font-weight:600;">Preencha os valores de crédito e parcelas e clique em <strong>Buscar Propostas</strong>.</p>
                </div>
              </div>
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


      if (validList.length > 0) {
        countTextEl.innerHTML = `Encontradas <strong>${validList.length}</strong> propostas ideais dentro dos limites do cliente.`;
        toggleNearBtn.style.display = nearList.length > 0 ? 'inline-flex' : 'none';
        if (sortBar) sortBar.style.display = 'flex';
        renderProposalCards(validList, false);
      } else {
        // No strict valid matches, show near matches automatically with clear excess notice
        countTextEl.innerHTML = `Nenhuma proposta exata dentro do limite. Exibindo <strong>${nearList.length}</strong> opções próximas.`;
        toggleNearBtn.style.display = 'none';
        if (sortBar) sortBar.style.display = 'flex';
        renderProposalCards(nearList, true);
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
      const badgeText = nearItem ? "Opção Próxima" : (p.badge || `Rank #${idx + 1}`);
      const badgeClass = nearItem ? "near" : "";

      const rawTitle = p.product_name || 'AUTOCON PRIME';
      const cleanTitle = rawTitle
        .replace(/\s*-\s*(?:IMO|G\.|COD|A\d+|S\d+).*/gi, '')
        .replace(/Tabela\s*Nº.*/gi, '')
        .trim();

      return `
        <article class="proposal-item-card ${nearItem ? 'near-match' : ''}">
          <span class="proposal-badge ${badgeClass}">${badgeText}</span>
          
          <div class="proposal-card-header">
            <div class="proposal-rank-num">${idx + 1}</div>
            <div class="proposal-title-meta" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <h3 style="margin:0;">${cleanTitle}</h3>
              ${nearItem && p.excess_reason ? `
                <span class="near-match-warning-inline" style="display:inline-flex; align-items:center; gap:4px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); color:#dc2626; font-size:0.74rem; font-weight:700; padding:2px 8px; border-radius:10px;">
                  <i data-lucide="info" style="width:13px; height:13px; flex-shrink:0;"></i>
                  ${p.excess_reason}
                </span>
              ` : ''}
            </div>
          </div>

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
              <span>Parcela Integral</span>
              <strong style="color:#1d4ed8;">${formatCurrency(p.final_installment_value)}</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Parcela Reduzida 50%</span>
              <strong style="color:#059669;">${formatCurrency(p.final_installment_value * 0.5)}</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Prazo Total</span>
              <strong>${formatTermMonthsYears(p.total_term_months)}</strong>
            </div>

            <div class="proposal-spec-item">
              <span>Taxa Adm</span>
              <strong>${p.administration_fee_percentage}%</strong>
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
          openMontarPropostaFinal(selectedProposal);
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Open Montar Proposta Final Screen
  function openMontarPropostaFinal(proposal) {
    const container = document.getElementById('proposta-final-container');
    if (!container) return;

    // Retrieve logged in user info for consultant name
    const userNameEl = document.querySelector('[data-user-name]');
    const userEmailEl = document.querySelector('[data-user-email]');
    const userRoleEl = document.querySelector('[data-user-role]');
    
    const consultantName = (userNameEl && userNameEl.textContent.trim() !== 'Carregando...') ? userNameEl.textContent.trim() : 'Consultor Seven Gold';
    const consultantEmail = (userEmailEl && userEmailEl.textContent.trim() !== '...') ? userEmailEl.textContent.trim() : 'atendimento@sevengoldfinanceira.com.br';
    const consultantRole = (userRoleEl && userRoleEl.textContent.trim() !== '...') ? userRoleEl.textContent.trim() : 'Consultor Comercial';

    // Generate Protocol: SG-YYYY.MM.DD-NNN (ex: SG-2026.07.25-247)
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10).replace(/-/g,'.');
    const randomSeq = Math.floor(Math.random() * 900) + 100; // 100–999
    const protocolNumber = `SG-${dateStr}-${randomSeq}`;
    
    const validityDefault = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);

    const creditFormatted = formatCurrency(proposal.credit_value);
    const firstInstFormatted = formatCurrency(proposal.first_installment);
    const finalInstFormatted = formatCurrency(proposal.final_installment_value);
    const halfInstFormatted = formatCurrency(proposal.final_installment_value * 0.5);

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
        <div class="pf-header-bar" style="position:sticky; top:0; z-index:100; background:rgba(0,0,0,0.97); backdrop-filter:blur(10px); padding:16px 0; margin-bottom:24px; border-bottom:2px solid #C9A84C; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <span class="eyebrow" style="font-weight:700; color:#d4af37; font-size:0.75rem; text-transform:uppercase;">Montagem da Proposta Comercial</span>
            <h2 style="margin:4px 0 0; font-size:1.4rem; color:#C9A84C; font-weight:800;">Proposta Final — Protocolo ${protocolNumber}</h2>
          </div>
          <div class="pf-action-buttons" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button type="button" id="pf-btn-back" class="bordero-btn-secondary" style="padding:6px 12px; font-size:0.76rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); color:#ffffff; border:1px solid rgba(255,255,255,0.2);"><i data-lucide="arrow-left" style="width:14px; height:14px;"></i> Voltar à Simulação</button>
            <button type="button" id="pf-btn-draft" class="bordero-btn-secondary" style="padding:6px 12px; font-size:0.76rem; font-weight:700; border-radius:8px; display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); color:#ffffff; border:1px solid rgba(255,255,255,0.2);"><i data-lucide="save" style="width:14px; height:14px;"></i> Salvar Rascunho</button>
            <button type="button" id="pf-btn-pdf" class="bordero-btn-primary" style="padding:6px 12px; font-size:0.76rem; font-weight:700; border-radius:8px; background:#000000; color:#C9A84C; border:1px solid #C9A84C; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="file-text" style="width:14px; height:14px;"></i> Gerar PDF</button>
            <button type="button" id="pf-btn-print" class="bordero-btn-primary" style="padding:6px 12px; font-size:0.76rem; font-weight:800; border-radius:8px; background:#C9A84C; color:#000000; display:inline-flex; align-items:center; gap:6px;"><i data-lucide="printer" style="width:14px; height:14px;"></i> Imprimir Proposta</button>
          </div>
        </div>

        <div class="pf-content-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:start;">
          <!-- Left Column: Form + Summary Stacked -->
          <div class="pf-left-panel" style="display:flex; flex-direction:column; gap:20px;">
            <!-- Card 1: Complementary Form -->
            <div class="pf-form-card" style="background:#ffffff; border:1px solid #e7e1eb; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
              <h3 style="margin:0 0 16px; font-size:1.1rem; color:#150126; display:flex; align-items:center; gap:8px;"><i data-lucide="user-check" style="color:#e8b138; width:20px;"></i> Dados do Cliente & Lance</h3>

              <form id="pf-complementary-form" style="display:flex; flex-direction:column; gap:14px;">
                <div class="simulador-form-group">
                  <label for="pf-client-name">Nome Completo do Cliente <span class="req">*</span></label>
                  <input type="text" id="pf-client-name" class="simulador-input" placeholder="Ex: João da Silva" required />
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="simulador-form-group">
                    <label for="pf-client-cpf">CPF do Cliente</label>
                    <input type="text" id="pf-client-cpf" class="simulador-input" placeholder="000.000.000-00" />
                  </div>
                  <div class="simulador-form-group">
                    <label for="pf-client-phone">Telefone / WhatsApp</label>
                    <input type="text" id="pf-client-phone" class="simulador-input" placeholder="(00) 90000-0000" />
                  </div>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="simulador-form-group">
                    <label for="pf-property-type">Tipo de Bem</label>
                    <select id="pf-property-type" class="simulador-input">
                      <option value="Imóvel Residencial">Imóvel Residencial</option>
                      <option value="Imóvel Comercial">Imóvel Comercial</option>
                      <option value="Terreno / Construção">Terreno / Construção</option>
                      <option value="Automóvel / Veículo">Automóvel / Veículo</option>
                      <option value="Maquinário / Pesados">Maquinário / Pesados</option>
                    </select>
                  </div>
                  <div class="simulador-form-group">
                    <label for="pf-validity">Validade da Proposta</label>
                    <input type="date" id="pf-validity" class="simulador-input" value="${validityDefault}" />
                  </div>
                </div>

                <div style="background:#fafafa; border:1px solid #e2e8f0; border-radius:12px; padding:14px; margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <label for="pf-embedded-bid-range" style="font-weight:700; color:#0f172a; font-size:0.85rem; margin:0;">
                      <i data-lucide="sliders" style="width:14px; height:14px; color:#d4af37; vertical-align:middle;"></i> Lance Embutido / Pretendido (%)
                    </label>
                    <span id="pf-embedded-bid-badge" style="background:#000000; color:#C9A84C; font-weight:800; font-size:0.85rem; padding:3px 10px; border-radius:6px;">${proposal.fixed_bid_percentage || 30}%</span>
                  </div>

                  <input type="range" id="pf-embedded-bid-range" min="0" max="100" step="0.5" value="${proposal.fixed_bid_percentage || 30}" style="width:100%; accent-color:#d4af37; cursor:pointer; height:6px; margin-bottom:12px;" />

                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                      <label for="pf-embedded-bid" style="font-size:0.75rem; color:#64748b; font-weight:600;">Porcentagem (%)</label>
                      <input type="text" id="pf-embedded-bid" class="simulador-input" style="font-weight:700; text-align:center;" value="${proposal.fixed_bid_percentage || 30}%" />
                    </div>
                    <div>
                      <label for="pf-bid-amount" style="font-size:0.75rem; color:#64748b; font-weight:600;">Valor em R$ (Calculado)</label>
                      <input type="text" id="pf-bid-amount" class="simulador-input brl-mask" style="font-weight:800; color:#0A0A0A;" placeholder="R$ 0,00" value="${formatCurrency(proposal.credit_value * ((proposal.fixed_bid_percentage || 30) / 100))}" />
                    </div>
                  </div>

                  <label style="display:flex; align-items:center; gap:8px; margin-top:12px; font-size:0.78rem; color:#475569; font-weight:600; cursor:pointer; background:#fff; border:1px solid #cbd5e1; padding:8px 12px; border-radius:8px;">
                    <input type="checkbox" id="pf-show-percentage-toggle" style="width:16px; height:16px; accent-color:#d4af37; cursor:pointer;" />
                    <span>Exibir porcentagens (%) do lance na proposta final impressa</span>
                  </label>
                </div>

                <div class="simulador-form-group">
                  <label for="pf-notes">Observações / Condições Especiais</label>
                  <textarea id="pf-notes" class="simulador-input" rows="3" placeholder="Insira observações relevantes sobre o atendimento ou regras de contemplação..."></textarea>
                </div>
              </form>
            </div>

            <!-- Card 2: Live Summary -->
            <div class="pf-summary-card" style="background:#ffffff; border:1px solid #e7e1eb; border-radius:16px; padding:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
              <h3 style="margin:0 0 16px; font-size:1.1rem; color:#150126; display:flex; align-items:center; gap:8px;"><i data-lucide="file-badge" style="color:#e8b138; width:20px;"></i> Resumo Automático da Cota</h3>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem;">
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">ADMINISTRADORA</span>
                  <strong style="color:#150126;">Alpha Administradora de Consórcio Ltda.</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">PLANO / TABELA</span>
                  <strong style="color:#150126;">${proposal.product_name || 'AUTOCON PRIME'}</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">CRÉDITO / BEM</span>
                  <strong style="color:#150126; font-size:1rem; font-weight:800;">${creditFormatted}</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">ENTRADA / 1ª PARCELA</span>
                  <strong style="color:#150126;">${firstInstFormatted}</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">PARCELA INTEGRAL (100%)</span>
                  <strong style="color:#1d4ed8;">${finalInstFormatted}</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">PARCELA REDUZIDA (50%)</span>
                  <strong style="color:#059669;">${halfInstFormatted}</strong>
                </div>
                <div style="background:#f7f6f8; padding:10px 14px; border-radius:10px;">
                  <span style="color:#6f6878; font-size:0.72rem; display:block;">PRAZO TOTAL</span>
                  <strong style="color:#150126;">${formatTermMonthsYears(proposal.total_term_months)}</strong>
                </div>
              </div>

              <div style="margin-top:16px; background:rgba(232,177,56,0.1); border:1px solid rgba(232,177,56,0.3); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:6px;">
                <span style="font-size:0.75rem; font-weight:800; color:#150126; text-transform:uppercase;">CONSULTOR RESPONSÁVEL</span>
                <strong style="color:#150126; font-size:0.95rem;">${consultantName}</strong>
                <span style="color:#6f6878; font-size:0.8rem;">${consultantEmail} • ${consultantRole}</span>
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
      const notesVal = document.getElementById('pf-notes')?.value || 'Sem observações adicionais.';

      let lanceText = `${bidAmount}`;
      if (showPct) {
        lanceText += ` (${embeddedBid})`;
      }

      // Valor líquido para o imóvel = crédito - lance
      const bidNumeric = parseFloat(String(bidAmount).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      const netPropertyValue = Math.max((proposal.credit_value || 0) - bidNumeric, 0);
      const netPropertyFormatted = formatCurrency(netPropertyValue);

      const sheetEl = document.getElementById('proposta-final-a4-sheet');
      if (!sheetEl) return;

      sheetEl.innerHTML = `
        <div class="pf-a4-header" style="background:linear-gradient(135deg, #000000 0%, #111111 60%, #0A0A0A 100%); padding:20px 24px 18px; color:#ffffff; position:relative; overflow:hidden; border-radius:12px 12px 0 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2;">
            <div style="display:flex; align-items:center; gap:16px;">
              <img src="assets/icons/seven-gold-g7.png" alt="Seven Gold" style="width:48px; height:48px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />
              <div style="width:1.5px; height:36px; background:#E8B138;"></div>
              <div>
                <h2 style="margin:0; font-size:1.25rem; color:#E8B138; font-weight:800; letter-spacing:0.04em; line-height:1.2;">SEVEN GOLD FINANCEIRA</h2>
                <span style="font-size:0.72rem; color:#ffffff; font-weight:600; letter-spacing:0.05em; display:block; margin-top:2px;">PROPOSTA COMERCIAL DE CONSÓRCIO</span>
              </div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:4px; text-align:right; font-size:0.78rem;">
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                <i data-lucide="file-text" style="width:14px; height:14px; color:#ffffff; opacity:0.9;"></i>
                <span style="color:rgba(255,255,255,0.9); font-weight:500;">Protocolo:</span>
                <strong style="color:#ffffff; font-weight:700; font-family:monospace; letter-spacing:0.02em; white-space:nowrap;">${protocolNumber}</strong>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                <i data-lucide="calendar" style="width:14px; height:14px; color:#ffffff; opacity:0.9;"></i>
                <span style="color:rgba(255,255,255,0.9); font-weight:500;">Data:</span>
                <span style="color:#ffffff; font-weight:600;">${new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                <i data-lucide="shield-check" style="width:14px; height:14px; color:#E8B138;"></i>
                <span style="color:#E8B138; font-weight:600;">Validade:</span>
                <strong style="color:#E8B138; font-weight:700;">${validityVal}</strong>
              </div>
            </div>
          </div>

          <div style="position:absolute; bottom:0; left:0; right:0; height:6px; background:#E8B138;"></div>
          <div style="position:absolute; bottom:0; right:40px; border-style:solid; border-width:0 0 14px 18px; border-color:transparent transparent #E8B138 transparent;"></div>
        </div>

        <div class="pf-a4-body" style="padding:24px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
            <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:16px 18px;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #E8B138;">
                <div style="width:28px; height:28px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                  <i data-lucide="user" style="width:15px; height:15px;"></i>
                </div>
                <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.04em; text-transform:uppercase;">DADOS DO CONSULTOR</strong>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8rem; color:#706A78;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="user-check" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">Nome:</strong> ${consultantName}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="mail" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">E-mail:</strong> ${consultantEmail}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="briefcase" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">Cargo:</strong> ${consultantRole}</span>
                </div>
              </div>
            </div>

            <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:16px 18px;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #E8B138;">
                <div style="width:28px; height:28px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                  <i data-lucide="users" style="width:15px; height:15px;"></i>
                </div>
                <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.04em; text-transform:uppercase;">DADOS DO CLIENTE</strong>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; font-size:0.8rem; color:#706A78;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="contact" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">Nome:</strong> ${clientName}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="credit-card" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">CPF:</strong> ${clientCpf}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="phone" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">Telefone:</strong> ${clientPhone}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <i data-lucide="home" style="width:14px; height:14px; color:#B98220; flex-shrink:0;"></i>
                  <span><strong style="color:#17111F;">Tipo de Bem:</strong> ${propType}</span>
                </div>
              </div>
            </div>
          </div>

          <table style="width:100%; border-collapse:separate; border-spacing:0; margin-bottom:20px; font-size:0.84rem; border:1px solid #E4DEE8; border-radius:12px; overflow:hidden;">
            <thead>
              <tr style="background:#000000; color:#ffffff; text-align:left;">
                <th style="padding:12px 16px; width:50%; font-weight:700; font-size:0.82rem; letter-spacing:0.03em;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="file-text" style="width:16px; height:16px; color:#E8B138;"></i>
                    <span>ESPECIFICAÇÃO FINANCEIRA</span>
                  </div>
                </th>
                <th style="padding:12px 16px; width:50%; font-weight:700; font-size:0.82rem; letter-spacing:0.03em;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="dollar-sign" style="width:16px; height:16px; color:#E8B138;"></i>
                    <span>VALOR / DETALHE</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="building-2" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Administradora</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:700; color:#17111F;">Alpha Administradora de Consórcio Ltda.</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="credit-card" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor de Crédito</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#B98220; font-size:0.9rem;">${creditFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="home" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Valor do Imóvel</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#059669; font-size:0.9rem;">${netPropertyFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="coins" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Entrada / 1ª Parcela (Adesão)</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:700; color:#17111F; font-size:0.9rem;">${firstInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="trending-up" style="width:14px; height:14px; color:#1769E0;"></i>
                    <span>Valor da Parcela Integral (100%)</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#1769E0; font-size:0.9rem;">${finalInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="percent" style="width:14px; height:14px; color:#059669;"></i>
                    <span>Valor da Parcela Reduzida (50% Meia Parcela)</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:800; color:#059669; font-size:0.9rem;">${halfInstFormatted}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="calendar" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Prazo de Pagamento do Plano</span>
                  </div>
                </td>
                <td style="padding:10px 16px; border-bottom:1px solid #E4DEE8; font-weight:700; color:#17111F;">${formatTermMonthsYears(proposal.total_term_months)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px; background:#FAF9FB; color:#706A78; font-weight:500;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <i data-lucide="gavel" style="width:14px; height:14px; color:#B98220;"></i>
                    <span>Lance Embutido</span>
                  </div>
                </td>
                <td style="padding:10px 16px; font-weight:700; color:#17111F;">${lanceText}</td>
              </tr>
            </tbody>
          </table>

          <div style="background:#FAF9FB; border:1px solid #E4DEE8; border-radius:12px; padding:16px 20px; margin-bottom:20px; font-size:0.8rem;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
              <div style="width:26px; height:26px; border-radius:50%; background:#0A0A0A; display:flex; align-items:center; justify-content:center; color:#C9A84C; flex-shrink:0;">
                <i data-lucide="file-check" style="width:14px; height:14px;"></i>
              </div>
              <strong style="color:#0A0A0A; font-size:0.82rem; letter-spacing:0.03em; text-transform:uppercase;">OBSERVAÇÕES E CONDIÇÕES COMERCIAIS</strong>
            </div>
            
            <p style="margin:0 0 10px; color:#17111F; font-size:0.82rem;">${notesVal}</p>
            
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #E4DEE8; font-size:0.73rem; color:#706A78; font-weight:600; line-height:1.5;">
              <div>** Sujeito a análise e aprovação de crédito.</div>
              <div>** Esta proposta é uma simulação, não garantindo qualquer espécie de obrigação entre as partes.</div>
            </div>
          </div>

          <div class="pf-a4-footer" style="border-top:1.5px solid #E8B138; padding-top:14px; display:grid; grid-template-columns:1fr 1px 1fr; gap:16px; align-items:center; font-size:0.75rem; color:#706A78;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:36px; height:36px; border-radius:50%; background:#000000; display:flex; align-items:center; justify-content:center; border:1px solid #C9A84C; flex-shrink:0;">
                <img src="assets/icons/seven-gold-g7.png" alt="Seven Gold" style="width:24px; height:24px; object-fit:contain;" />
              </div>
              <div>
                <strong style="color:#C9A84C; font-size:0.82rem; display:block;">Seven Gold Financeira</strong>
                <div style="display:flex; align-items:center; gap:4px; color:#706A78; font-size:0.74rem;">
                  <i data-lucide="instagram" style="width:12px; height:12px; color:#C9A84C;"></i>
                  <span>Instagram: @sevengoldfinanceira</span>
                </div>
              </div>
            </div>

            <div style="background:#E4DEE8; height:36px;"></div>

            <div style="text-align:right; font-size:0.73rem; color:#706A78; display:flex; flex-direction:column; gap:2px;">
              <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                <i data-lucide="headphones" style="width:12px; height:12px; color:#C9A84C;"></i>
                <span>Atendimento Oficial • Todos os Direitos Reservados</span>
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
      const clampedPct = Math.min(Math.max(parseFloat(pct) || 0, 0), 100);
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
      if (moneyInput) {
        moneyInput.value = formatCurrency(valMoney);
      }

      if (creditVal > 0) {
        const calcPct = Math.min(Math.max((valMoney / creditVal) * 100, 0), 100);
        syncFromPercentage(calcPct, 'moneyInput');
      } else {
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

    // Attach listeners for live update of A4 sheet
    ['pf-client-name', 'pf-property-type', 'pf-bid-amount', 'pf-embedded-bid', 'pf-show-percentage-toggle', 'pf-validity', 'pf-notes'].forEach(id => {
      const inputEl = document.getElementById(id);
      if (inputEl) {
        inputEl.addEventListener('input', updateA4Sheet);
        inputEl.addEventListener('change', updateA4Sheet);
      }
    });

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

    document.getElementById('pf-btn-draft')?.addEventListener('click', () => {
      const draftData = {
        proposal,
        protocolNumber,
        clientName: document.getElementById('pf-client-name')?.value,
        clientCpf: document.getElementById('pf-client-cpf')?.value,
        clientPhone: document.getElementById('pf-client-phone')?.value,
        propertyType: document.getElementById('pf-property-type')?.value,
        bidAmount: document.getElementById('pf-bid-amount')?.value,
        embeddedBid: document.getElementById('pf-embedded-bid')?.value,
        validity: document.getElementById('pf-validity')?.value,
        notes: document.getElementById('pf-notes')?.value,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('seven_gold_proposal_draft', JSON.stringify(draftData));
      alert('Rascunho da Proposta Final salvo com sucesso!');
    });

    document.getElementById('pf-btn-pdf')?.addEventListener('click', () => {
      const element = document.getElementById('proposta-final-a4-sheet');
      if (!element) return;
      if (window.html2pdf) {
        const clientNameClean = (document.getElementById('pf-client-name')?.value || 'Cliente').replace(/\s+/g, '_');
        const opt = {
          margin: 10,
          filename: `Proposta_SevenGold_${protocolNumber}_${clientNameClean}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        window.html2pdf().from(element).set(opt).save();
      } else {
        window.print();
      }
    });

    document.getElementById('pf-btn-print')?.addEventListener('click', () => {
      window.print();
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
})();
