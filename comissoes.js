(function () {
  const tabs = ['Tab 01','Tab 02','Tab 03','Tab 04','Tab 05','Tab 06','Tab 07'];
  const parcelHeaders = ['COD','1°','2°','3°','4°','5°','6°','7°','8°','9°','10°','11°','12°','13°','14°','15°','16°','17°','TOTAL'];

  const defaultLevels = [
    { id:'home-office', name:'Home Office', commission:['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'], file:'assets/comissoes/home-office.png' },
    { id:'assistente-vendas', name:'Assist. de Vendas', commission:['0,10%','0,13%','0,15%','0,17%','0,20%','0,23%','0,25%'], file:'documentos.html#assistente-vendas' },
    { id:'consultor-vendas', name:'Consultor de Vendas', commission:['0,55%','1,05%','1,55%','1,90%','2,05%','2,30%','2,55%'], file:'documentos.html#vendedor' },
    { id:'coordenador', name:'Coordenador', commission:['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'], file:'documentos.html#coordenador' },
    { id:'supervisor', name:'Supervisor', commission:['0,20%','0,30%','0,40%','0,50%','0,65%','0,75%','0,85%'], file:'documentos.html#supervisor' }
  ];

  const defaultStrategic = [
    { id:'representante-junior', name:'Representante Junior', file:'assets/comissoes/representante-junior.pdf', note:'Representante Junior recebe 50% das comissões, com MEI e pagamento direto pela administradora.',
      parcels:[[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null]] },
    { id:'representante-pleno', name:'Representante Pleno', file:'assets/comissoes/representante-pleno.pdf', note:'Representante Pleno recebe 100% das comissões, com CNPJ próprio e parceria direta.',
      parcels:[[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null]] },
    { id:'submaster', name:'Submaster', file:'assets/comissoes/comissao-submaster.jpeg', note:'O material também registra observação de pós-venda ABC Bank.',
      parcels:[[0.60,0.20,0.20,0.15,0.20,0.20,0.25,0.20,0.25,0.35,0.35,0.35,0.40,0.40,0.40,0.30,0.30],[1.00,0.20,0.20,0.20,0.30,0.30,0.30,0.35,0.35,0.30,0.40,0.40,0.40,0.30,null,null,null],[1.90,0.25,0.30,0.30,0.35,0.35,0.35,0.38,0.42,0.40,null,null,null,null,null,null,null],[2.50,0.25,0.35,0.35,0.30,0.35,0.35,0.45,0.15,null,null,null,null,null,null,null,null],[3.00,0.30,0.35,0.35,0.35,0.35,0.30,null,null,null,null,null,null,null,null,null,null],[3.70,0.25,0.30,0.30,0.35,0.10,null,null,null,null,null,null,null,null,null,null,null],[4.50,0.10,0.20,0.15,0.05,null,null,null,null,null,null,null,null,null,null,null,null]] }
  ];

  let levels = JSON.parse(JSON.stringify(defaultLevels));
  let strategic = JSON.parse(JSON.stringify(defaultStrategic));
  let allRules = [];
  let isEditing = false;

  const tableBody = document.querySelector('[data-commission-table-body]');
  const toggleBtn = document.querySelector('[data-toggle-edit]');
  const saveBtn = document.querySelector('[data-save-commissions]');
  const cancelBtn = document.querySelector('[data-cancel-edit]');
  const editStatus = document.querySelector('[data-edit-status]');

  const isAdmin = () => {
    const role = window.userRole || '';
    const n = window.normalizeRole ? window.normalizeRole(role) : role.toLowerCase().replace(/\s+/g, '-');
    return ['dono', 'administrador', 'diretor-ceo', 'admin'].includes(n);
  };

  const renderCommercialTable = () => {
    tableBody.innerHTML = tabs.map((tab, index) => {
      const cells = levels.map(level => {
        const val = level.commission[index];
        const rule = allRules.find(r => r.level_id === level.id && r.table_index === index);
        if (isEditing && rule) {
          return `<td><input type="text" class="inline-edit-input" data-rule-id="${rule.id}" value="${val}"></td>`;
        }
        return `<td><span class="commission-value-pill">${val}</span></td>`;
      }).join('');
      return `<tr${index===0?' class="featured-row"':''}><td><strong>${tab}</strong></td>${cells}</tr>`;
    }).join('');
    window.lucide?.createIcons();
  };

  const formatParcel = (val) => {
    if (val === null || val === undefined) return '';
    return val.toFixed(2).replace('.', ',');
  };

  const strategicTabs = document.querySelector('[data-strategic-tabs]');
  const selectStrategic = (id) => {
    const item = strategic.find(entry => entry.id === id) || strategic[0];
    strategicTabs.innerHTML = strategic.map(entry => `<button type="button" class="${entry.id===item.id?'active':''}" data-select-strategic="${entry.id}">${entry.name}</button>`).join('');
    document.querySelector('[data-strategic-title]').textContent = item.name;
    const strategicFile = document.querySelector('[data-strategic-file]'); strategicFile.dataset.intendedFile = item.file; strategicFile.setAttribute('aria-disabled', 'true');

    const head = document.querySelector('[data-strategic-head]');
    head.innerHTML = `<tr>${parcelHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;

    const body = document.querySelector('[data-strategic-body]');
    body.innerHTML = item.parcels.map((row, index) => {
      const total = row.reduce((sum, v) => sum + (v || 0), 0);
      const cells = row.map(v => `<td>${v !== null && v !== undefined ? `<span class="commission-value-pill">${formatParcel(v)}</span>` : ''}</td>`).join('');
      return `<tr class="${index===0?'featured-row':''}"><td><strong>${tabs[index]}</strong></td>${cells}<td><strong>${total.toFixed(2).replace('.', ',')}%</strong></td></tr>`;
    }).join('');

    document.querySelector('[data-strategic-note]').textContent = item.note;
  };

  const showArea = (area, trigger = null) => {
    document.querySelectorAll('[data-commission-panel]').forEach(panel => { const active = panel.dataset.commissionPanel === area; panel.hidden = !active; panel.classList.toggle('active', active); });
    const areaButtons = [...document.querySelectorAll('[data-commission-area]')];
    areaButtons.forEach(button => button.classList.remove('active'));
    (trigger || areaButtons.find(button => button.dataset.commissionArea === area))?.classList.add('active');
    if (area === 'strategic') selectStrategic(strategic[0].id);
  };

  const toggleEditMode = (on) => {
    isEditing = on;
    toggleBtn.hidden = on;
    saveBtn.hidden = !on;
    cancelBtn.hidden = !on;
    editStatus.hidden = !on;
    editStatus.textContent = on ? 'Editando valores...' : '';
    editStatus.classList.toggle('editing', on);
    const tableCard = document.querySelector('.commission-table-card');
    const dataTable = document.querySelector('.commission-data-table');
    if (tableCard) tableCard.classList.toggle('editing', on);
    if (dataTable) dataTable.classList.toggle('editing-mode', on);
    renderCommercialTable();
  };

  const saveAll = async () => {
    const client = window.sevenGoldAuth;
    if (!client) return;
    const inputs = tableBody.querySelectorAll('.inline-edit-input');
    const changes = [];
    inputs.forEach(input => {
      const ruleId = input.dataset.ruleId;
      const newVal = input.value.trim();
      if (ruleId && newVal) changes.push({ ruleId, newVal });
    });
    if (!changes.length) { toggleEditMode(false); return; }

    editStatus.textContent = `Salvando ${changes.length} alterações...`;
    saveBtn.disabled = true;

    for (const { ruleId, newVal } of changes) {
      const { error } = await client.from('commission_rules').update({ commission_value: newVal }).eq('id', ruleId);
      if (!error) {
        const rule = allRules.find(r => r.id === ruleId);
        if (rule) rule.commission_value = newVal;
        const level = levels.find(l => l.id === rule.level_id);
        if (level) level.commission[rule.table_index] = newVal;
      }
    }

    saveBtn.disabled = false;
    toggleEditMode(false);
  };

  const loadFromSupabase = async () => {
    const client = window.sevenGoldAuth;
    if (!client) return false;
    try {
      const { data, error } = await client.from('commission_rules').select('*').order('level_sort', { ascending: true }).order('table_index', { ascending: true });
      if (error || !data || !data.length) return false;
      allRules = data;

      const commercialRules = data.filter(r => r.category === 'commercial');
      if (commercialRules.length > 0) {
        const levelIds = [...new Set(commercialRules.map(r => r.level_id))];
        levels = levelIds.map(levelId => {
          const rules = commercialRules.filter(r => r.level_id === levelId).sort((a, b) => a.table_index - b.table_index);
          const def = defaultLevels.find(d => d.id === levelId);
          return { id: levelId, name: rules[0]?.level_name || def?.name || levelId, commission: rules.map(r => r.commission_value), file: def?.file || '' };
        });
      }

      const strategicRules = data.filter(r => r.category === 'strategic');
      if (strategicRules.length > 0) {
        const strategicIds = [...new Set(strategicRules.map(r => r.level_id))];
        strategic = strategicIds.map(levelId => {
          const rules = strategicRules.filter(r => r.level_id === levelId).sort((a, b) => a.table_index - b.table_index);
          const def = defaultStrategic.find(d => d.id === levelId);
          const parcels = rules.map(r => {
            const extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : (r.extra || {});
            return extra.parcels || [];
          });
          return { id: levelId, name: rules[0]?.level_name || def?.name || levelId, file: def?.file || '', note: def?.note || '', parcels };
        });
      }
      return true;
    } catch (e) {
      console.warn('Supabase unavailable:', e);
      return false;
    }
  };

  document.addEventListener('click', event => {
    if (event.target.closest('[data-toggle-edit]')) { toggleEditMode(true); return; }
    if (event.target.closest('[data-save-commissions]')) { saveAll(); return; }
    if (event.target.closest('[data-cancel-edit]')) { toggleEditMode(false); return; }
    const strategy = event.target.closest('[data-select-strategic]'); if (strategy) { selectStrategic(strategy.dataset.selectStrategic); return; }
    const area = event.target.closest('[data-commission-area]'); if (area) { showArea(area.dataset.commissionArea, area); return; }
    if (event.target.closest('[data-open-strategic]')) showArea('strategic');
    if (event.target.closest('[data-back-commercial]')) showArea('commercial');
  });

  const init = async () => {
    const checkAdmin = () => {
      if (isAdmin()) document.body.setAttribute('data-is-admin', 'true');
    };
    checkAdmin();
    setTimeout(checkAdmin, 500);
    await loadFromSupabase();
    renderCommercialTable();
    if (strategicTabs) selectStrategic(strategic[0].id);
  };

  init();
})();