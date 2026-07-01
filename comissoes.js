(function () {
  const tabs = ['Tab 01','Tab 02','Tab 03','Tab 04','Tab 05','Tab 06','Tab 07'];

  const defaultLevels = [
    { id:'home-office', name:'Home Office', commission:['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'], file:'assets/comissoes/home-office.png' },
    { id:'assistente-vendas', name:'Assist. de Vendas', commission:['0,10%','0,13%','0,15%','0,17%','0,20%','0,23%','0,25%'], file:'documentos.html#assistente-vendas' },
    { id:'consultor-vendas', name:'Consultor de Vendas', commission:['0,55%','1,05%','1,55%','1,90%','2,05%','2,30%','2,55%'], file:'documentos.html#vendedor' },
    { id:'coordenador', name:'Coordenador', commission:['0,15%','0,25%','0,35%','0,45%','0,55%','0,65%','0,75%'], file:'documentos.html#coordenador' },
    { id:'supervisor', name:'Supervisor', commission:['0,20%','0,30%','0,40%','0,50%','0,65%','0,75%','0,85%'], file:'documentos.html#supervisor' }
  ];

  const defaultStrategic = [
    { id:'representante-junior', name:'Representante Junior', file:'assets/comissoes/representante-junior.pdf', headers:['Tabela','Adesão','Parcelas','Total Pleno','Total Junior'], rows:[['Tab 01','0,40%','4,50%','5,30%','2,65%'],['Tab 02','0,70%','3,60%','5,00%','2,50%'],['Tab 03','1,25%','2,50%','5,00%','2,50%'],['Tab 04','1,35%','2,20%','4,90%','2,45%'],['Tab 05','1,50%','1,80%','4,80%','2,40%'],['Tab 06','1,75%','1,20%','4,70%','2,35%'],['Tab 07','2,00%','0,50%','4,50%','2,25%']], note:'Representante Junior recebe 50% das comissões, com MEI e pagamento direto pela administradora.' },
    { id:'representante-pleno', name:'Representante Pleno', file:'assets/comissoes/representante-pleno.pdf', headers:['Tabela','Adesão','Parcelas','Total Pleno'], rows:[['Tab 01','0,80%','4,50%','5,30%'],['Tab 02','1,40%','3,60%','5,00%'],['Tab 03','2,50%','2,50%','5,00%'],['Tab 04','2,70%','2,20%','4,90%'],['Tab 05','3,00%','1,80%','4,80%'],['Tab 06','3,50%','1,20%','4,70%'],['Tab 07','4,00%','0,50%','4,50%']], note:'Representante Pleno recebe 100% das comissões, com CNPJ próprio e parceria direta.' },
    { id:'submaster', name:'Submaster', file:'assets/comissoes/comissao-submaster.jpeg', headers:['Tabela','Quando a venda fechar','Comissão','Observação'], rows:tabs.map((tab,index)=>[tab,`Venda fechada na tabela ${index+1}`,['0,50%','1,00%','1,50%','1,85%','2,00%','2,25%','2,50%'][index],'Imposto 10% sobre comissão']), note:'O material também registra observação de pós-venda ABC Bank.' }
  ];

  let levels = JSON.parse(JSON.stringify(defaultLevels));
  let strategic = JSON.parse(JSON.stringify(defaultStrategic));

  const tableBody = document.querySelector('[data-commission-table-body]');

  const renderCommercialTable = () => {
    tableBody.innerHTML = tabs.map((tab, index) => {
      const cells = levels.map(level => `<td><span class="commission-value-pill">${level.commission[index]}</span></td>`).join('');
      return `<tr${index===0?' class="featured-row"':''}><td><strong>${tab}</strong></td>${cells}</tr>`;
    }).join('');
    window.lucide?.createIcons();
  };

  const strategicTabs=document.querySelector('[data-strategic-tabs]');
  const selectStrategic=(id)=>{
    const item=strategic.find(entry=>entry.id===id)||strategic[0];
    strategicTabs.innerHTML=strategic.map(entry=>`<button type="button" class="${entry.id===item.id?'active':''}" data-select-strategic="${entry.id}">${entry.name}</button>`).join('');
    document.querySelector('[data-strategic-title]').textContent=item.name;
    const strategicFile=document.querySelector('[data-strategic-file]'); strategicFile.dataset.intendedFile=item.file; strategicFile.setAttribute('aria-disabled','true');
    document.querySelector('[data-strategic-head]').innerHTML=`<tr>${item.headers.map(header=>`<th>${header}</th>`).join('')}</tr>`;
    document.querySelector('[data-strategic-body]').innerHTML=item.rows.map((row,index)=>`<tr class="${index===0?'featured-row':''}">${row.map((cell,column)=>`<td>${column===0?`<strong>${cell}</strong>`:cell}</td>`).join('')}</tr>`).join('');
    document.querySelector('[data-strategic-note]').textContent=item.note;
  };

  const showArea=(area, trigger=null)=>{
    document.querySelectorAll('[data-commission-panel]').forEach(panel=>{const active=panel.dataset.commissionPanel===area; panel.hidden=!active; panel.classList.toggle('active',active);});
    const areaButtons=[...document.querySelectorAll('[data-commission-area]')];
    areaButtons.forEach(button=>button.classList.remove('active'));
    (trigger||areaButtons.find(button=>button.dataset.commissionArea===area))?.classList.add('active');
    if(area==='strategic') selectStrategic(strategic[0].id);
  };

  const loadFromSupabase = async () => {
    const client = window.sevenGoldAuth;
    if (!client) return false;
    try {
      const { data, error } = await client
        .from('commission_rules')
        .select('*')
        .order('level_sort', { ascending: true })
        .order('table_index', { ascending: true });
      if (error || !data || !data.length) return false;

      const commercialRules = data.filter(r => r.category === 'commercial');
      if (commercialRules.length > 0) {
        const levelIds = [...new Set(commercialRules.map(r => r.level_id))];
        levels = levelIds.map(levelId => {
          const rules = commercialRules.filter(r => r.level_id === levelId).sort((a, b) => a.table_index - b.table_index);
          const def = defaultLevels.find(d => d.id === levelId);
          return {
            id: levelId,
            name: rules[0]?.level_name || def?.name || levelId,
            commission: rules.map(r => r.commission_value),
            file: def?.file || ''
          };
        });
      }

      const strategicRules = data.filter(r => r.category === 'strategic');
      if (strategicRules.length > 0) {
        const strategicIds = [...new Set(strategicRules.map(r => r.level_id))];
        strategic = strategicIds.map(levelId => {
          const rules = strategicRules.filter(r => r.level_id === levelId).sort((a, b) => a.table_index - b.table_index);
          const def = defaultStrategic.find(d => d.id === levelId);
          const extra = rules[0]?.extra || {};
          const hasAdhesion = rules.some(r => r.adhesion);
          const hasInstallments = rules.some(r => r.installments);
          const hasTotal = rules.some(r => r.total);

          let headers = ['Tabela'];
          if (hasAdhesion) headers.push('Adesão');
          if (hasInstallments) headers.push('Parcelas');
          if (hasTotal) headers.push('Total');
          if (levelId === 'representante-junior') headers.push('Total Junior');
          if (levelId === 'submaster') headers.push('Observação');
          if (def && headers.length <= 2) headers = def.headers;

          const rows = rules.map(r => {
            const rowExtra = r.extra || {};
            let row = [r.table_label];
            if (hasAdhesion) row.push(r.adhesion || '—');
            if (hasInstallments) row.push(r.installments || '—');
            if (hasTotal) row.push(r.total || '—');
            if (levelId === 'representante-junior') row.push(extra.total_junior || rowExtra.total_junior || '—');
            if (levelId === 'submaster') row.push(rowExtra.observation || '—');
            return row;
          });

          return {
            id: levelId,
            name: rules[0]?.level_name || def?.name || levelId,
            file: def?.file || '',
            headers,
            rows,
            note: def?.note || ''
          };
        });
      }
      return true;
    } catch (e) {
      console.warn('Supabase unavailable, using defaults:', e);
      return false;
    }
  };

  document.addEventListener('click',event=>{
    const strategy=event.target.closest('[data-select-strategic]'); if(strategy){selectStrategic(strategy.dataset.selectStrategic); return;}
    const area=event.target.closest('[data-commission-area]'); if(area){showArea(area.dataset.commissionArea,area); return;}
    if(event.target.closest('[data-open-strategic]')) showArea('strategic');
    if(event.target.closest('[data-back-commercial]')) showArea('commercial');
  });

  loadFromSupabase().then(() => {
    renderCommercialTable();
    if (strategicTabs) selectStrategic(strategic[0].id);
    const checkAdmin = () => {
      const role = window.userRole || '';
      const normalized = window.normalizeRole ? window.normalizeRole(role) : role.toLowerCase().replace(/\s+/g, '-');
      if (['dono', 'administrador', 'diretor-ceo', 'admin'].includes(normalized)) {
        document.body.setAttribute('data-is-admin', 'true');
      }
    };
    checkAdmin();
    setTimeout(checkAdmin, 500);
  });
})();