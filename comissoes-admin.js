(function () {
  const getClient = () => window.sevenGoldAuth;

  const loading = document.querySelector('[data-loading]');
  const errorEl = document.querySelector('[data-error]');
  const errorMsg = document.querySelector('[data-error-message]');
  const content = document.querySelector('[data-content]');
  const saveIndicator = document.querySelector('[data-save-indicator]');
  const commercialBody = document.getElementById('commercial-body');
  const strategicBody = document.getElementById('strategic-body');
  const strategicHead = document.getElementById('strategic-head');
  const strategicSelect = document.getElementById('strategic-level-select');
  const retryBtn = document.querySelector('[data-retry]');
  const resetBtn = document.querySelector('[data-reset-all]');

  let allRules = [];
  let activeTab = 'commercial';
  let activeStrategicLevel = 'representante-junior';
  let saveTimeout = null;

  const showLoading = () => { loading.hidden = false; errorEl.hidden = true; content.hidden = true; };
  const showError = (msg) => { loading.hidden = true; errorEl.hidden = false; errorMsg.textContent = msg; content.hidden = true; };
  const showContent = () => { loading.hidden = true; errorEl.hidden = true; content.hidden = false; };

  const flashSave = () => {
    saveIndicator.textContent = 'Salvando...';
    saveIndicator.classList.add('saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveIndicator.textContent = 'Salvo ✓';
      saveIndicator.classList.remove('saving');
      saveIndicator.classList.add('saved');
      setTimeout(() => saveIndicator.classList.remove('saved'), 2000);
    }, 600);
  };

  const loadData = async () => {
    showLoading();
    const client = getClient();
    if (!client) { showError('Cliente Supabase não inicializado.'); return; }
    const { data, error } = await client
      .from('commission_rules')
      .select('*')
      .order('level_sort', { ascending: true })
      .order('table_index', { ascending: true });
    if (error) { showError('Erro ao carregar: ' + error.message); return; }
    allRules = data || [];
    showContent();
    renderCurrentTab();
    window.lucide?.createIcons();
  };

  const renderCurrentTab = () => {
    if (activeTab === 'commercial') renderCommercial();
    else renderStrategic();
  };

  const renderCommercial = () => {
    const levels = [...new Set(allRules.filter(r => r.category === 'commercial').map(r => r.level_id))];
    commercialBody.innerHTML = levels.map(levelId => {
      const rules = allRules.filter(r => r.level_id === levelId).sort((a, b) => a.table_index - b.table_index);
      const name = rules[0]?.level_name || levelId;
      const cells = rules.map(r =>
        `<td><span class="admin-editable" data-id="${r.id}" data-field="commission_value" title="Clique para editar">${r.commission_value}</span></td>`
      ).join('');
      return `<tr><td class="admin-td-level"><strong>${name}</strong></td>${cells}<td class="admin-td-actions"><button type="button" class="admin-btn-icon" data-level-id="${levelId}" data-action="reset-level" title="Restaurar nível"><i data-lucide="rotate-ccw"></i></button></td></tr>`;
    }).join('');
    window.lucide?.createIcons();
  };

  const renderStrategic = () => {
    const rules = allRules.filter(r => r.category === 'strategic' && r.level_id === activeStrategicLevel).sort((a, b) => a.table_index - b.table_index);
    if (!rules.length) { strategicBody.innerHTML = '<tr><td colspan="8">Nenhum dado encontrado.</td></tr>'; return; }

    const hasAdhesion = rules.some(r => r.adhesion);
    const hasInstallments = rules.some(r => r.installments);
    const hasTotal = rules.some(r => r.total);

    let headers = '<tr><th>Tabela</th><th>Comissão</th>';
    if (hasAdhesion) headers += '<th>Adesão</th>';
    if (hasInstallments) headers += '<th>Parcelas</th>';
    if (hasTotal) headers += '<th>Total</th>';
    headers += '<th>Observação</th><th class="admin-th-actions">Ações</th></tr>';
    strategicHead.innerHTML = headers;

    strategicBody.innerHTML = rules.map(r => {
      const extra = r.extra || {};
      let row = `<tr><td class="admin-td-level"><strong>${r.table_label}</strong></td>`;
      row += `<td><span class="admin-editable" data-id="${r.id}" data-field="commission_value" title="Clique para editar">${r.commission_value}</span></td>`;
      if (hasAdhesion) row += `<td><span class="admin-editable" data-id="${r.id}" data-field="adhesion" title="Clique para editar">${r.adhesion || '—'}</span></td>`;
      if (hasInstallments) row += `<td><span class="admin-editable" data-id="${r.id}" data-field="installments" title="Clique para editar">${r.installments || '—'}</span></td>`;
      if (hasTotal) row += `<td><span class="admin-editable" data-id="${r.id}" data-field="total" title="Clique para editar">${r.total || '—'}</span></td>`;
      row += `<td><span class="admin-editable" data-id="${r.id}" data-field="extra" data-extra-field="observation" title="Clique para editar">${extra.observation || '—'}</span></td>`;
      row += `<td class="admin-td-actions"><button type="button" class="admin-btn-icon" data-rule-id="${r.id}" data-action="reset-single" title="Restaurar"><i data-lucide="rotate-ccw"></i></button></td></tr>`;
      return row;
    }).join('');
    window.lucide?.createIcons();
  };

  const startEdit = (el) => {
    if (el.classList.contains('editing')) return;
    const currentVal = el.textContent.trim();
    if (currentVal === '—') el.textContent = '';
    el.classList.add('editing');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentVal === '—' ? '' : currentVal;
    input.className = 'admin-edit-input';
    el.textContent = '';
    el.appendChild(input);
    input.focus();
    input.select();

    const finishEdit = async (save) => {
      el.classList.remove('editing');
      const newVal = input.value.trim() || '—';
      const id = el.dataset.id;
      const field = el.dataset.field;

      if (save && newVal !== currentVal) {
        if (field === 'extra') {
          const extraField = el.dataset.extraField;
          const rule = allRules.find(r => r.id === id);
          const extra = rule?.extra || {};
          extra[extraField] = newVal;
          await saveField(id, 'extra', extra);
        } else {
          await saveField(id, field, newVal);
        }
      } else {
        el.textContent = currentVal || '—';
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finishEdit(true); }
      if (e.key === 'Escape') { finishEdit(false); }
    });
    input.addEventListener('blur', () => finishEdit(true));
  };

  const saveField = async (id, field, value) => {
    const client = getClient();
    flashSave();
    const update = { [field]: value };
    const { error } = await client.from('commission_rules').update(update).eq('id', id);
    if (error) {
      console.error('Erro ao salvar:', error);
      saveIndicator.textContent = 'Erro ao salvar';
      saveIndicator.classList.add('error');
      setTimeout(() => saveIndicator.classList.remove('error'), 2000);
      loadData();
      return;
    }
    const rule = allRules.find(r => r.id === id);
    if (rule) rule[field] = value;
  };

  const resetLevel = async (levelId) => {
    if (!confirm(`Restaurar todos os valores de "${levelId}" para o padrão?`)) return;
    const defaults = getDefaultCommercialValues(levelId);
    if (!defaults) return;
    const client = getClient();
    flashSave();
    for (const [idx, val] of defaults.entries()) {
      const rule = allRules.find(r => r.level_id === levelId && r.table_index === idx);
      if (rule) {
        await client.from('commission_rules').update({ commission_value: val }).eq('id', rule.id);
        rule.commission_value = val;
      }
    }
    renderCurrentTab();
  };

  const resetAllCommercial = async () => {
    if (!confirm('Restaurar TODOS os valores comerciais para o padrão? Esta ação não pode ser desfeita.')) return;
    const client = getClient();
    flashSave();
    const commercialLevels = ['home-office', 'assistente-vendas', 'consultor-vendas', 'coordenador', 'supervisor'];
    for (const levelId of commercialLevels) {
      const defaults = getDefaultCommercialValues(levelId);
      if (!defaults) continue;
      for (const [idx, val] of defaults.entries()) {
        const rule = allRules.find(r => r.level_id === levelId && r.table_index === idx);
        if (rule) {
          await client.from('commission_rules').update({ commission_value: val }).eq('id', rule.id);
          rule.commission_value = val;
        }
      }
    }
    renderCurrentTab();
  };

  const getDefaultCommercialValues = (levelId) => {
    const defaults = {
      'home-office': ['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'],
      'assistente-vendas': ['0,10%','0,13%','0,15%','0,17%','0,20%','0,23%','0,25%'],
      'consultor-vendas': ['0,55%','1,05%','1,55%','1,90%','2,05%','2,30%','2,55%'],
      'coordenador': ['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'],
      'supervisor': ['0,20%','0,30%','0,40%','0,50%','0,65%','0,75%','0,85%']
    };
    return defaults[levelId] || null;
  };

  document.addEventListener('click', (e) => {
    const editable = e.target.closest('.admin-editable');
    if (editable) { startEdit(editable); return; }

    const tab = e.target.closest('[data-admin-tab]');
    if (tab) {
      activeTab = tab.dataset.adminTab;
      document.querySelectorAll('[data-admin-tab]').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => { p.hidden = true; p.classList.remove('active'); });
      document.querySelector(`[data-admin-panel="${activeTab}"]`).hidden = false;
      document.querySelector(`[data-admin-panel="${activeTab}"]`).classList.add('active');
      renderCurrentTab();
      return;
    }

    const resetLevelBtn = e.target.closest('[data-action="reset-level"]');
    if (resetLevelBtn) { resetLevel(resetLevelBtn.dataset.levelId); return; }

    const resetSingleBtn = e.target.closest('[data-action="reset-single"]');
    if (resetSingleBtn) {
      const ruleId = resetSingleBtn.dataset.ruleId;
      const rule = allRules.find(r => r.id === ruleId);
      if (rule && rule.category === 'commercial') {
        const defaults = getDefaultCommercialValues(rule.level_id);
        if (defaults) {
          const newVal = defaults[rule.table_index];
          saveField(ruleId, 'commission_value', newVal).then(() => renderCurrentTab());
        }
      }
      return;
    }

    if (e.target.closest('[data-reset-all]')) { resetAllCommercial(); return; }
    if (e.target.closest('[data-retry]')) { loadData(); return; }
  });

  if (strategicSelect) {
    strategicSelect.addEventListener('change', () => {
      activeStrategicLevel = strategicSelect.value;
      renderStrategic();
    });
  }

  loadData();
})();