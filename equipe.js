(function () {
  // Sector definitions
  let sectors = [
    {
      id: "diretoria",
      title: "Diretoria",
      icon: "crown",
      description: "Comando principal da empresa",
      roles: [
        { key: "diretor-ceo", title: "Diretor / CEO", sub: "Dono" }
      ]
    },
    {
      id: "comercial",
      title: "Comercial",
      icon: "trending-up",
      description: "Vendas, atendimento e leads",
      roles: [
        { key: "supervisor-comercial", title: "Supervisor", sub: "Acompanhamento" },
        { key: "coordenador-comercial", title: "Coordenador", sub: "Gestão comercial" },
        { key: "vendedor", title: "Vendedor", sub: "Negociação" },
        { key: "assistente-vendas", title: "Assistente de Vendas", sub: "Pré-atendimento" }
      ]
    },
    {
      id: "pos-venda",
      title: "Pós-venda",
      icon: "message-circle",
      description: "Relacionamento pós venda",
      roles: [
        { key: "coordenador-posvenda", title: "Coordenador", sub: "Gestão de pós-venda" },
        { key: "analista-posvenda", title: "Analista", sub: "Fidelização" },
        { key: "pos-vendas", title: "Suporte ao cliente", sub: "Atendimento pós-venda" }
      ]
    },
    {
      id: "administrativo",
      title: "Administrativo",
      icon: "briefcase",
      description: "Rotina interna e organização",
      roles: [
        { key: "assistente-adm", title: "Assistente Adm.", sub: "Rotinas internas" },
        { key: "analista-adm", title: "Analista Adm.", sub: "Processos" },
        { key: "coordenador-adm", title: "Coordenador Adm.", sub: "Gestão de processos" }
      ]
    },
    {
      id: "financeiro",
      title: "Financeiro",
      icon: "dollar-sign",
      description: "Caixa, contabilidade e repasses",
      roles: [
        { key: "financeiro", title: "Financeiro", sub: "Gestão financeira" },
        { key: "auxiliar-financeiro", title: "Auxiliar Financeiro", sub: "Apoio financeiro" },
        { key: "coordenador-financeiro", title: "Coord. Financeiro", sub: "Gestão de caixa" }
      ]
    },
    {
      id: "marketing",
      title: "Marketing",
      icon: "megaphone",
      description: "Campanhas e captação",
      roles: [
        { key: "assistente-mkt", title: "Assistente Mkt.", sub: "Conteúdo" },
        { key: "analista-mkt", title: "Auxilista Mkt.", sub: "Campanhas" },
        { key: "coordenador-mkt", title: "Coord. Marketing", sub: "Gestão de tráfego" }
      ]
    },
    {
      id: "juridico",
      title: "Jurídico",
      icon: "scale",
      description: "Contratos e conformidade legal",
      roles: [
        { key: "advogado-juridico", title: "Advogado / Jurídico", sub: "Legal" }
      ]
    },
    {
      id: "rh",
      title: "RH",
      icon: "users",
      description: "Gestão de pessoas e clima",
      roles: [
        { key: "assistente-rh", title: "Assistente de RH", sub: "DP" },
        { key: "analista-rh", title: "Analista de RH", sub: "Recrutamento" },
        { key: "coordenador-rh", title: "Coordenador de RH", sub: "Gestão de pessoas" }
      ]
    }
  ];

  // Drag and drop state variables
  let draggedSectorId = null;
  let draggedRoleKey = null;
  let draggedRoleOriginSectorId = null;
  const removedRolesKey = "seven-gold-removed-roles";
  const sharedRolesKey = "seven-gold-team-roles-snapshot";

  const loadRemovedRoles = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(removedRolesKey) || "[]"));
    } catch (error) {
      console.warn("Nao foi possivel carregar cargos removidos:", error);
      return new Set();
    }
  };

  const saveRemovedRoles = (removedRoles) => {
    localStorage.setItem(removedRolesKey, JSON.stringify([...removedRoles]));
  };

  const slugifyRoleKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const saveRolesSnapshotToLocalStorage = () => {
    const snapshot = sectors.map((sector) => ({
      id: sector.id,
      title: sector.title,
      roles: sector.roles.map((role) => ({
        key: role.key,
        title: role.title,
        sub: role.sub || "",
      })),
    }));
    localStorage.setItem(sharedRolesKey, JSON.stringify(snapshot));
  };

  const applyRolesSnapshotFromLocalStorage = () => {
    try {
      const snapshot = JSON.parse(localStorage.getItem(sharedRolesKey) || "[]");
      if (!Array.isArray(snapshot) || snapshot.length === 0) return;

      snapshot.forEach((savedSector) => {
        const sector = sectors.find((item) => item.id === savedSector.id);
        if (!sector || !Array.isArray(savedSector.roles)) return;

        const knownRoles = new Map(sector.roles.map((role) => [role.key, role]));
        sector.roles = savedSector.roles.map((savedRole) => {
          const knownRole = knownRoles.get(savedRole.key);
          return knownRole
            ? { ...knownRole, title: savedRole.title || knownRole.title, sub: savedRole.sub || knownRole.sub || "" }
            : { key: savedRole.key, title: savedRole.title || savedRole.key, sub: savedRole.sub || "" };
        });
      });
    } catch (error) {
      console.warn("Nao foi possivel carregar snapshot de cargos:", error);
    }
  };

  // Persist order to localStorage
  const saveOrderToLocalStorage = () => {
    // 1. Sector IDs (excluding diretoria)
    const otherSectorsIds = sectors.filter(s => s.id !== "diretoria").map(s => s.id);
    localStorage.setItem("seven-gold-sectors-order", JSON.stringify(otherSectorsIds));

    // 2. Roles mapping per sector
    const rolesMap = {};
    sectors.forEach(sec => {
      rolesMap[sec.id] = sec.roles.map(r => r.key);
    });
    localStorage.setItem("seven-gold-roles-order", JSON.stringify(rolesMap));
    saveRolesSnapshotToLocalStorage();
  };

  // Load and apply saved order from localStorage
  const applySavedOrder = () => {
    const removedRoles = loadRemovedRoles();
    if (removedRoles.size > 0) {
      sectors.forEach(sec => {
        sec.roles = sec.roles.filter(role => !removedRoles.has(role.key));
      });
    }

    // 1. Reorder sectors if customized
    const savedSectorsOrder = localStorage.getItem("seven-gold-sectors-order");
    if (savedSectorsOrder) {
      try {
        const orderIds = JSON.parse(savedSectorsOrder);
        const diretoriaSec = sectors.find(s => s.id === "diretoria");
        const otherSecs = sectors.filter(s => s.id !== "diretoria");
        
        otherSecs.sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        
        sectors.length = 0;
        if (diretoriaSec) sectors.push(diretoriaSec);
        sectors.push(...otherSecs);
      } catch (e) {
        console.error("Error applying saved sectors order:", e);
      }
    }

    // 2. Reorder/Re-map roles if customized
    const savedRolesOrder = localStorage.getItem("seven-gold-roles-order");
    if (savedRolesOrder) {
      try {
        const rolesMap = JSON.parse(savedRolesOrder); // { sectorId: [roleKey, ...] }
        
        // Collect all role objects from current structure to avoid losing metadata
        const allRolesByKey = new Map();
        const originalSectorOfRole = new Map();
        sectors.forEach(sec => {
          sec.roles.forEach(role => {
            allRolesByKey.set(role.key, role);
            originalSectorOfRole.set(role.key, sec.id);
          });
        });

        // Rebuild role arrays for each sector
        sectors.forEach(sec => {
          const keys = rolesMap[sec.id];
          if (Array.isArray(keys)) {
            const newRoles = [];
            keys.forEach(k => {
              if (allRolesByKey.has(k)) {
                newRoles.push(allRolesByKey.get(k));
                allRolesByKey.delete(k); // consumed
              }
            });
            sec.roles = newRoles;
          }
        });

        // Put back any roles that weren't consumed (safety backup for newly defined roles)
        allRolesByKey.forEach((roleObj, key) => {
          if (removedRoles.has(key)) return;
          const origSectorId = originalSectorOfRole.get(key) || "comercial";
          const sec = sectors.find(s => s.id === origSectorId);
          if (sec) {
            sec.roles.push(roleObj);
          }
        });
      } catch (e) {
        console.error("Error applying saved roles order:", e);
      }
    }
  };

  // Roles Metadata mapping
  const rolesData = {
    "diretor-ceo": {
      desc: "Dono da empresa, com acesso total ao sistema e visão completa da operação.",
      access: ["CRM", "Empresa", "Financeiro", "Permissões", "Documentos", "Relatórios"],
      files: ["Estatuto Social", "Acordo de Sócios", "Planejamento Estratégico"],
      commission: "Campo reservado para regra de comissão ou retirada.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 16:42"
    },
    "supervisor-comercial": {
      desc: "Supervisiona as ligações, qualidade de atendimento, fluxos de leads e auxilia na capacitação da equipe.",
      access: ["CRM", "Empresa", "Documentos", "Relatórios"],
      files: ["Manual de processos comerciais", "Script de Vendas", "Metas de Conversão"],
      commission: "Comissão de 0.3% sobre o faturamento global da equipe sob supervisão.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Ontem, 17:30"
    },
    "coordenador-comercial": {
      desc: "Responsável por acompanhar as metas da equipe comercial, dar suporte aos vendedores e reportar à diretoria.",
      access: ["CRM", "Empresa", "Documentos", "Relatórios"],
      files: ["Planilhas de metas mensais", "Relatórios comerciais", "Contratos de parceria"],
      commission: "Comissão de 0.5% sobre o faturamento global da equipe comercial.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 14:02"
    },
    "vendedor": {
      desc: "Responsável por apresentar propostas comerciais, negociar condições e realizar o fechamento das vendas.",
      access: ["CRM", "Documentos"],
      files: ["Modelos de propostas", "Tabela de preços de consórcio", "Regras de descontos"],
      commission: "Comissão padrão de 2.0% sobre o valor total da venda faturada.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 10:15"
    },
    "assistente-vendas": {
      desc: "Responsável pelo primeiro contato com leads, triagem inicial, qualificação e agendamento de reuniões.",
      access: ["CRM", "Documentos"],
      files: ["Script de pré-atendimento", "Regras de qualificação de leads", "Termos de uso"],
      commission: "Comissão de 0.5% sobre o valor das vendas qualificadas e fechadas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 11:20"
    },
    "coordenador-posvenda": {
      desc: "Gerencia a área de atendimento pós-venda, resolvendo incidentes complexos e acompanhando a retenção.",
      access: ["CRM", "Documentos", "Relatórios"],
      files: ["Pesquisa de satisfação consolidada", "Relatórios de cancelamentos"],
      commission: "Comissão sobre métricas de satisfação (NPS) e retenção.",
      lastEdit: "Jonatã atualizou",
      lastTime: "Há 1 semana"
    },
    "analista-posvenda": {
      desc: "Analisa índices de satisfação dos clientes pós-assinatura, atende reclamações e ajuda na retenção de leads.",
      access: ["CRM", "Documentos"],
      files: ["Manual do NPS", "Checklist pós-venda"],
      commission: "Bônus mensal baseado no atingimento de metas de NPS da equipe.",
      lastEdit: "Jonatã atualizou",
      lastTime: "Há 4 dias"
    },
    "pos-vendas": {
      desc: "Responsável por dar assistência aos clientes pós-assinatura de contrato, tirar dúvidas e acompanhar a fidelização.",
      access: ["CRM", "Documentos"],
      files: ["Checklist de boas-vindas", "Formulário de satisfação (NPS)", "Termos de garantia"],
      commission: "Bônus mensal por atingimento de meta de NPS e índice de retenção.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 2 dias"
    },
    "assistente-adm": {
      desc: "Responsável pela rotina administrativa geral, compras de insumos da empresa, controle de ponto e arquivamento.",
      access: ["Empresa", "Documentos"],
      files: ["Documentação fiscal de fornecedores", "Inventário patrimonial", "Controle de contas de consumo"],
      commission: "Remuneração fixa conforme acordo de CLT. Sem comissão de vendas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 1 semana"
    },
    "analista-adm": {
      desc: "Responsável pela modelagem e auditoria de processos internos, fluxogramas de atividades e controles de qualidade.",
      access: ["Empresa", "Documentos", "Relatórios"],
      files: ["Manual de conduta interno, organograma detalhado, fluxogramas de processos"],
      commission: "Remuneração fixa conforme acordo de CLT. Sem comissão de vendas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 3 dias"
    },
    "coordenador-adm": {
      desc: "Coordena a área administrativa e de processos internos, garantindo a eficiência operacional e compliance da empresa.",
      access: ["Empresa", "Documentos", "Relatórios", "Permissões"],
      files: ["Planejamento estratégico anual", "Contratos corporativos com prestadores"],
      commission: "Participação nos Lucros e Resultados (PLR) conforme atingimento de metas operacionais.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 4 dias"
    },
    "financeiro": {
      desc: "Responsável por contas a pagar e receber, fluxo de caixa diário e conciliação bancária da empresa.",
      access: ["Financeiro", "Documentos"],
      files: ["Extratos bancários, comprovantes de pagamento, planilhas de fluxo de caixa"],
      commission: "Remuneração fixa conforme CLT. Sem comissão de vendas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 09:45"
    },
    "auxiliar-financeiro": {
      desc: "Dá suporte no lançamento de notas fiscais, cobrança de clientes inadimplentes e conciliação de comprovantes.",
      access: ["Financeiro", "Documentos"],
      files: ["Relatório de cobrança, arquivos de notas fiscais de entrada, recibos de despesas"],
      commission: "Remuneração fixa conforme CLT. Sem comissão de vendas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Ontem, 14:15"
    },
    "coordenador-financeiro": {
      desc: "Responsável por relatórios consolidados de faturamento, conciliação de comissões de parceiros e planejamento tributário.",
      access: ["Financeiro", "Empresa", "Documentos", "Relatórios"],
      files: ["Demonstrações financeiras mensais, planejamento tributário anual"],
      commission: "Remuneração fixa mais PLR semestral por performance e redução de despesas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 16:30"
    },
    "assistente-mkt": {
      desc: "Cria posts para as redes sociais, escreve cópias de anúncios e cuida do design das mídias da empresa.",
      access: ["Marketing", "Documentos"],
      files: ["Banco de imagens, calendário editorial de posts, manual de identidade visual"],
      commission: "Bônus por crescimento de engajamento orgânico nas redes sociais.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Ontem, 11:40"
    },
    "analista-mkt": {
      desc: "Analisa métricas de anúncios, cria novas campanhas de captação de leads e monitora o custo por lead (CPL).",
      access: ["Marketing", "Documentos", "Relatórios"],
      files: ["Planilhas de gastos de anúncios, relatórios de conversão de landing pages"],
      commission: "Bônus trimestral atrelado ao volume de leads qualificados gerados e CPL ideal.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 1 dia"
    },
    "coordenador-mkt": {
      desc: "Gere o orçamento de tráfego pago da empresa nas principais plataformas e define a estratégia de branding.",
      access: ["Marketing", "Empresa", "Documentos", "Relatórios"],
      files: ["Planejamento de investimentos in tráfego, relatórios consolidados de marketing"],
      commission: "Participação nos lucros com base no ROI (Retorno sobre Investimento) das campanhas.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 15:10"
    },
    "advogado-juridico": {
      desc: "Analisar contratos e documentos jurídicos, apoiar a diretoria em decisões legais e manter modelos atualizados.",
      access: ["Financeiro", "Documentos", "Relatórios"],
      files: ["Modelos de contratos", "Auditoria de processos cíveis", "Normas regulatórias"],
      commission: "Remuneração fixa conforme acordo de honorários/CLT.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Há 3 dias"
    },
    "assistente-rh": {
      desc: "Responsável por agendar entrevistas, coletar documentos para novas contratações e controlar os benefícios.",
      access: ["Empresa", "Documentos"],
      files: ["Fichas de novos funcionários, formulários de benefícios corporativos"],
      commission: "Remuneração fixa de acordo com a CLT.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Ontem, 15:40"
    },
    "analista-rh": {
      desc: "Processa a folha de pagamento, gerencia férias, rescisões e cuida das obrigações sindicais e legais do RH.",
      access: ["Empresa", "Documentos", "Relatórios"],
      files: ["Planilhas de controle de folha, convenção coletiva dos colaboradores"],
      commission: "Remuneração fixa de acordo com a CLT.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 11:42"
    },
    "coordenador-rh": {
      desc: "Gere o setor de Recursos Humanos, planeja treinamentos internos, políticas de cargos e salários e avaliações de desempenho.",
      access: ["Empresa", "Documentos", "Relatórios", "Permissões"],
      files: ["Plano de cargos e salários consolidado, avaliações de desempenho anuais"],
      commission: "PLR anual vinculada ao índice de retenção de talentos (turnover baixo) e engajamento da equipe.",
      lastEdit: "Jonatã atualizou este cargo",
      lastTime: "Hoje, 16:35"
    }
  };

  // State Management
  const state = {
    profiles: [],
    commercialTeams: [],
    commercialTeamMembers: [],
    commercialTeamsLoaded: false,
    leadCounts: {},
    appointmentCounts: {},
    sellerMetrics: {},
    teamPeriod: "",
    functions: new Map(), // role_key -> array of string
    selectedItem: null, // { type: 'sector'|'role', id: string, sectorId: string }
    activeTab: 'hierarquia',
    searchQuery: ''
  };

  // Selectors
  const searchInput = document.getElementById("eq-search-input");
  const sectorsRow = document.getElementById("eq-sectors-row");
  const listTableBody = document.getElementById("eq-list-table-body");
  const roleBoard = document.querySelector("[data-role-board]");
  const sidebarPlaceholder = document.getElementById("eq-sidebar-placeholder");
  const sidebarContent = document.getElementById("eq-sidebar-content");

  // Helper function to resolve profile roles to hierarchy role keys
  const getRoleKeyForProfile = (profileRole) => {
    if (!profileRole) return 'vendedor';
    const cleanRole = profileRole.toLowerCase().trim();
    if (cleanRole === 'dono') return 'diretor-ceo';
    if (cleanRole === 'administrador') return 'coordenador-adm';
    if (cleanRole === 'coordenador') return 'coordenador-comercial';

    // Direct search
    for (const sec of sectors) {
      for (const r of sec.roles) {
        if (r.key === cleanRole) {
          return r.key;
        }
      }
    }

    // Fallbacks
    if (cleanRole.includes('vendedor')) return 'vendedor';
    if (cleanRole.includes('financeiro')) return 'financeiro';
    if (cleanRole.includes('rh')) return 'coordenador-rh';
    if (cleanRole.includes('marketing')) return 'coordenador-mkt';
    if (cleanRole.includes('adm') || cleanRole.includes('administrativo')) return 'analista-adm';
    if (cleanRole.includes('pos-venda') || cleanRole.includes('posvenda')) return 'pos-vendas';

    return 'vendedor';
  };

  const getClient = () => window.sevenGoldAuth;

  const refreshIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Employee roles/functions helpers
  const loadEmployeeFunctionsMap = () => {
    const saved = localStorage.getItem("seven-gold-employee-roles");
    return saved ? JSON.parse(saved) : {};
  };

  const saveEmployeeFunctionsMap = (map) => {
    localStorage.setItem("seven-gold-employee-roles", JSON.stringify(map));
  };

  const roleFunctionsLocalKey = "seven-gold-role-functions";

  const loadRoleFunctionsLocalMap = () => {
    try {
      return JSON.parse(localStorage.getItem(roleFunctionsLocalKey) || "{}");
    } catch (error) {
      console.warn("Nao foi possivel carregar funcoes locais:", error);
      return {};
    }
  };

  const saveRoleFunctionsLocal = (roleKey, funcs) => {
    const map = loadRoleFunctionsLocalMap();
    map[roleKey] = funcs;
    localStorage.setItem(roleFunctionsLocalKey, JSON.stringify(map));
  };

  const getEmployeeFunctions = (profile) => {
    const map = loadEmployeeFunctionsMap();
    const roleKey = getRoleKeyForProfile(profile.role);
    const sectorObj = sectors.find(s => s.roles.some(r => r.key === roleKey));
    const sectorId = sectorObj ? sectorObj.id : "comercial";
    const savedFunctions = Array.isArray(map[profile.id]) ? map[profile.id] : [];
    const currentPrimary = savedFunctions.find((item) => item.primary);

    if (!currentPrimary || currentPrimary.roleKey !== roleKey) {
      const secondaryFunctions = savedFunctions.filter((item) => !item.primary && item.roleKey !== roleKey);
      map[profile.id] = [{ sectorId, roleKey, primary: true }, ...secondaryFunctions];
      saveEmployeeFunctionsMap(map);
    }

    return map[profile.id];
  };

  const saveEmployeeFunctions = (profileId, funcs) => {
    const map = loadEmployeeFunctionsMap();
    map[profileId] = funcs;
    saveEmployeeFunctionsMap(map);
    
    // Keep main role key synchronized with primary function to ensure backward compatibility
    const primaryFunc = funcs.find(f => f.primary) || funcs[0];
    const profile = state.profiles.find(p => p.id === profileId);
    if (profile && primaryFunc) {
      profile.role = primaryFunc.roleKey;
    }
  };

  const commercialMemberRoles = new Set(["vendedor", "assistente-vendas", "home-office"]);
  const commercialCoordinatorRoles = new Set([
    "coordenador-comercial",
    "supervisor-comercial",
    "coordenador",
    "supervisor",
  ]);

  const setTeamStatus = (message, type = "info") => {
    const status = document.getElementById("eq-team-status");
    if (!status) return;
    status.textContent = message || "";
    status.style.color = type === "error" ? "#ef4444" : type === "success" ? "#16a34a" : "#64748b";
  };

  const getCommercialCoordinators = () => state.profiles.filter((profile) => {
    const rawRole = String(profile.role || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
    const roleKey = getRoleKeyForProfile(profile.role);
    return profile.status === "ativo" && (
      commercialCoordinatorRoles.has(rawRole) || commercialCoordinatorRoles.has(roleKey)
    );
  });

  const getCommercialMembers = () => state.profiles.filter((profile) =>
    profile.status === "ativo" && commercialMemberRoles.has(getRoleKeyForProfile(profile.role))
  );

  const populateTeamCoordinatorSelect = () => {
    const select = document.getElementById("eq-team-coordinator");
    if (!select) return;
    select.innerHTML = '<option value="">Selecione coordenador ou supervisor</option>';
    getCommercialCoordinators().forEach((profile) => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = `${profile.full_name} — ${getRoleKeyForProfile(profile.role).toUpperCase()}`;
      select.appendChild(option);
    });
  };

  const callCommercialTeamsApi = async (action, data = {}) => {
    const client = getClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente no CRM.");

    const response = await fetch("/api/permissions/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ team_action: action, team_data: data }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || "Não foi possível salvar a equipe.");
    }
    return result;
  };

  const loadCommercialTeams = async () => {
    const client = getClient();
    if (!client) {
      setTeamStatus("Conexão com o Supabase indisponível.", "error");
      return false;
    }

    setTeamStatus("Carregando equipes...");
    let result;
    try {
      result = await callCommercialTeamsApi("list", { month: state.teamPeriod });
    } catch (error) {
      console.error("Erro ao carregar equipes comerciais:", error);
      setTeamStatus(error.message, "error");
      state.commercialTeamsLoaded = false;
      return false;
    }

    state.commercialTeams = result.teams || [];
    state.commercialTeamMembers = result.members || [];
    state.leadCounts = result.leadCounts || {};
    state.appointmentCounts = result.appointmentCounts || {};
    state.sellerMetrics = result.sellerMetrics || {};
    state.commercialTeamsLoaded = true;
    setTeamStatus("");
    renderCommercialTeams();
    return true;
  };

  const formatTeamPeriod = (period) => {
    if (!/^\d{4}-\d{2}$/.test(period || "")) return "Mês atual";
    const [year, month] = period.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date(year, month - 1, 1));
  };

  const getMetricStatus = (actual, target) => {
    const safeTarget = Number(target) || 0;
    const safeActual = Number(actual) || 0;
    if (safeTarget > 0 && safeActual >= safeTarget) {
      return { key: "hit", label: "Meta batida" };
    }
    if (safeTarget > 0 && safeActual >= safeTarget * 0.8) {
      return { key: "near", label: "Próximo da meta" };
    }
    return { key: "below", label: "Abaixo da meta" };
  };

  const getGoalProgress = (metric) => {
    const goals = [
      [metric.leads_actual, metric.target_leads],
      [metric.appointments_actual, metric.target_appointments],
      [metric.closings_actual, metric.target_sales],
    ].filter(([, target]) => Number(target) > 0);
    if (!goals.length) return 0;
    return goals.reduce((total, [actual, target]) => total + Math.min((Number(actual) / Number(target)) * 100, 100), 0) / goals.length;
  };

  const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

  const createTeamSummary = (metrics) => {
    const summary = metrics.reduce((total, metric) => ({
      sellers: total.sellers + 1,
      leads: total.leads + (Number(metric.leads_actual) || 0),
      appointments: total.appointments + (Number(metric.appointments_actual) || 0),
      closings: total.closings + (Number(metric.closings_actual) || 0),
      soldValue: total.soldValue + (Number(metric.sold_value) || 0),
    }), { sellers: 0, leads: 0, appointments: 0, closings: 0, soldValue: 0 });
    const conversion = summary.leads > 0 ? (summary.closings / summary.leads) * 100 : 0;
    const values = [
      ["Vendedores", summary.sellers, "users"],
      ["Leads no mês", summary.leads, "user-plus"],
      ["Agendamentos", summary.appointments, "calendar-check"],
      ["Fechamentos", summary.closings, "badge-check"],
      ["Conversão", `${conversion.toFixed(1)}%`, "chart-no-axes-combined"],
      ["Valor vendido", formatCurrency(summary.soldValue), "circle-dollar-sign"],
    ];
    const box = document.createElement("div");
    box.className = "eq-team-summary-grid";
    values.forEach(([label, value, icon]) => {
      const item = document.createElement("div");
      item.className = "eq-team-summary-item";
      const iconBox = document.createElement("span");
      iconBox.className = "eq-team-summary-icon";
      iconBox.innerHTML = `<i data-lucide="${icon}"></i>`;
      const text = document.createElement("div");
      const title = document.createElement("span");
      title.textContent = label;
      const amount = document.createElement("strong");
      amount.textContent = String(value);
      text.append(title, amount);
      item.append(iconBox, text);
      box.appendChild(item);
    });
    return box;
  };

  const createSellerPerformanceCard = (metric) => {
    const item = document.createElement("article");
    item.className = "eq-seller-performance";

    const statusCandidates = [
      getMetricStatus(metric.leads_actual, metric.target_leads),
      getMetricStatus(metric.appointments_actual, metric.target_appointments),
      getMetricStatus(metric.closings_actual, metric.target_sales),
    ];
    const overallStatus = statusCandidates.find((status) => status.key === "below")
      || statusCandidates.find((status) => status.key === "near")
      || statusCandidates[0];

    const values = [
      ["Leads", metric.leads_actual, metric.target_leads],
      ["Agendamentos", metric.appointments_actual, metric.target_appointments],
      ["Fechamentos", metric.closings_actual, metric.target_sales],
    ];

    const profile = state.profiles.find((item) => String(item.id) === String(metric.user_id));
    const progress = getGoalProgress(metric);
    const header = document.createElement("header");
    header.className = "eq-seller-performance-head";
    const avatar = document.createElement("div");
    avatar.className = "eq-ranking-avatar";
    const initial = String(metric.user_name || metric.user_email || "V").trim().charAt(0).toUpperCase();
    const initialText = document.createElement("span");
    initialText.textContent = initial;
    avatar.appendChild(initialText);
    if (profile?.avatar_url) {
      const image = document.createElement("img");
      image.src = profile.avatar_url;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove());
      avatar.appendChild(image);
    }
    const identity = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = metric.user_name || metric.user_email || "Vendedor";
    const email = document.createElement("small");
    email.textContent = profile ? getRoleKeyForProfile(profile.role).replace(/-/g, " ") : (metric.cargo || "Vendedor").replace(/[-_]/g, " ");
    identity.append(name, email);
    const status = document.createElement("span");
    status.className = `eq-performance-status is-${overallStatus.key}`;
    status.textContent = overallStatus.label;
    const identityWrap = document.createElement("div");
    identityWrap.className = "eq-ranking-identity";
    identityWrap.append(avatar, identity);
    header.append(identityWrap, status);
    item.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "eq-seller-metrics-grid";
    values.forEach(([label, actual, target]) => {
      const metricStatus = getMetricStatus(actual, target);
      const cell = document.createElement("div");
      cell.className = "eq-seller-metric";
      const metricLabel = document.createElement("span");
      metricLabel.textContent = label;
      const metricValue = document.createElement("strong");
      metricValue.textContent = `${Number(actual) || 0} / ${Number(target) || 0}`;
      const metricHint = document.createElement("small");
      metricHint.className = `is-${metricStatus.key}`;
      metricHint.textContent = metricStatus.label;
      cell.append(metricLabel, metricValue, metricHint);
      grid.appendChild(cell);
    });

    const conversion = document.createElement("div");
    conversion.className = "eq-seller-metric eq-seller-conversion";
    const conversionLabel = document.createElement("span");
    conversionLabel.textContent = "Taxa de conversão";
    const conversionValue = document.createElement("strong");
    conversionValue.textContent = `${Number(metric.conversion_rate || 0).toFixed(1)}%`;
    conversion.append(conversionLabel, conversionValue);
    grid.appendChild(conversion);
    item.appendChild(grid);

    const progressBox = document.createElement("div");
    progressBox.className = "eq-ranking-progress";
    const progressLabel = document.createElement("div");
    const progressTitle = document.createElement("span");
    progressTitle.textContent = "Meta atingida";
    const progressValue = document.createElement("strong");
    progressValue.textContent = `${progress.toFixed(0)}%`;
    progressLabel.append(progressTitle, progressValue);
    const progressTrack = document.createElement("div");
    progressTrack.className = "eq-ranking-progress-track";
    const progressFill = document.createElement("span");
    progressFill.style.width = `${Math.min(progress, 100)}%`;
    progressTrack.appendChild(progressFill);
    progressBox.append(progressLabel, progressTrack);
    item.appendChild(progressBox);
    return item;
  };

  const renderCommercialTeams = () => {
    const container = document.getElementById("eq-commercial-teams-list");
    if (!container) return;
    container.replaceChildren();

    if (!state.commercialTeams.length) {
      const empty = document.createElement("div");
      empty.className = "eq-team-empty";
      empty.textContent = "Nenhuma equipe comercial cadastrada.";
      container.appendChild(empty);
      return;
    }

    const coordinators = getCommercialCoordinators();
    const members = getCommercialMembers();
    const memberTeamMap = new Map(state.commercialTeamMembers.map((item) => [item.user_id, item.team_id]));

    state.commercialTeams.forEach((team) => {
      const coordinator = state.profiles.find((profile) => profile.id === team.coordinator_user_id);
      const teamMemberIds = new Set(
        state.commercialTeamMembers.filter((item) => item.team_id === team.id).map((item) => item.user_id)
      );
      const memberCount = teamMemberIds.size;
      const leadCount = state.leadCounts?.[team.id] || 0;
      const apptCount = state.appointmentCounts?.[team.id] || 0;
      const isActive = team.active !== false;

      const card = document.createElement("article");
      card.className = "eq-team-card" + (isActive ? "" : " eq-team-card-inactive");

      const head = document.createElement("div");
      head.className = "eq-team-card-head";
      const titleBox = document.createElement("div");
      titleBox.className = "eq-team-card-title-box";

      const avatarBox = document.createElement("div");
      avatarBox.className = "eq-team-card-avatar";
      if (team.photo_url) {
        const img = document.createElement("img");
        img.src = team.photo_url;
        img.alt = team.name;
        img.onerror = () => { avatarBox.classList.add("eq-team-avatar-fallback"); avatarBox.innerHTML = `<span>${team.name.charAt(0).toUpperCase()}</span>`; };
        avatarBox.appendChild(img);
      } else {
        avatarBox.classList.add("eq-team-avatar-fallback");
        avatarBox.innerHTML = `<span>${team.name.charAt(0).toUpperCase()}</span>`;
      }

      const textBox = document.createElement("div");
      textBox.className = "eq-team-card-text";
      const title = document.createElement("h3");
      title.textContent = team.name;
      const subtitle = document.createElement("p");
      subtitle.textContent = `Gestor: ${coordinator?.full_name || "Não definido"}`;
      textBox.append(title, subtitle);
      titleBox.append(avatarBox, textBox);

      const badges = document.createElement("div");
      badges.className = "eq-team-badges";
      badges.innerHTML = `
        <span class="eq-team-badge eq-badge-members" title="Membros"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${memberCount}</span>
        <span class="eq-team-badge eq-badge-leads" title="Leads"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 12h-6l-2 3"/><path d="M22 8l-2-3"/></svg> ${leadCount}</span>
        <span class="eq-team-badge ${isActive ? "eq-badge-active" : "eq-badge-inactive"}" title="Status">${isActive ? "Ativa" : "Inativa"}</span>
      `;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "eq-team-delete";
      removeButton.textContent = "Excluir";
      removeButton.addEventListener("click", () => deleteCommercialTeam(team));
      head.append(titleBox, badges, removeButton);
      card.appendChild(head);

      const visibleMetrics = [...teamMemberIds]
        .map((userId) => state.sellerMetrics?.[userId])
        .filter(Boolean)
        .sort((left, right) =>
          getGoalProgress(right) - getGoalProgress(left)
          || Number(right.conversion_rate || 0) - Number(left.conversion_rate || 0)
          || Number(right.closings_actual || 0) - Number(left.closings_actual || 0)
        );

      const dashboard = document.createElement("section");
      dashboard.className = "eq-team-dashboard";
      const dashboardTitle = document.createElement("div");
      dashboardTitle.className = "eq-team-dashboard-title";
      dashboardTitle.innerHTML = `<div><strong>Painel da equipe comercial</strong><span>${formatTeamPeriod(state.teamPeriod)}</span></div>`;
      dashboard.append(dashboardTitle, createTeamSummary(visibleMetrics));
      card.appendChild(dashboard);

      const coordinatorLabel = document.createElement("label");
      coordinatorLabel.className = "eq-team-card-field";
      coordinatorLabel.append("Gestor responsável");
      const coordinatorSelect = document.createElement("select");
      coordinators.forEach((profile) => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = `${profile.full_name} — ${getRoleKeyForProfile(profile.role).toUpperCase()}`;
        option.selected = profile.id === team.coordinator_user_id;
        coordinatorSelect.appendChild(option);
      });
      coordinatorLabel.appendChild(coordinatorSelect);
      card.appendChild(coordinatorLabel);

      const photoLabel = document.createElement("label");
      photoLabel.className = "eq-team-card-field";
      photoLabel.append("Foto da equipe (URL)");
      const photoInput = document.createElement("input");
      photoInput.type = "url";
      photoInput.className = "eq-team-photo-input";
      photoInput.value = team.photo_url || "";
      photoInput.placeholder = "URL da imagem (opcional)";
      photoLabel.appendChild(photoInput);
      card.appendChild(photoLabel);

      const activeLabel = document.createElement("label");
      activeLabel.className = "eq-team-card-field eq-team-active-toggle";
      const activeCheckbox = document.createElement("input");
      activeCheckbox.type = "checkbox";
      activeCheckbox.checked = isActive;
      activeCheckbox.className = "eq-team-active-checkbox";
      const activeText = document.createElement("span");
      activeText.textContent = "Equipe ativa";
      activeLabel.append(activeCheckbox, activeText);
      card.appendChild(activeLabel);

      const membersLabel = document.createElement("div");
      membersLabel.className = "eq-team-card-field";
      membersLabel.append("Membros da equipe");
      const membersBox = document.createElement("div");
      membersBox.className = "eq-team-members";

      members.forEach((profile) => {
        const linkedTeamId = memberTeamMap.get(profile.id);
        const optionLabel = document.createElement("label");
        optionLabel.className = "eq-team-member-option";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = profile.id;
        checkbox.checked = teamMemberIds.has(profile.id);
        checkbox.disabled = Boolean(linkedTeamId && linkedTeamId !== team.id);
        const description = document.createElement("span");
        description.textContent = profile.full_name;
        const details = document.createElement("small");
        details.textContent = checkbox.disabled
          ? `${profile.email} — já pertence a outra equipe`
          : `${profile.email} — ${getRoleKeyForProfile(profile.role).toUpperCase()}`;
        description.appendChild(details);
        optionLabel.append(checkbox, description);
        membersBox.appendChild(optionLabel);
      });

      membersLabel.appendChild(membersBox);
      card.appendChild(membersLabel);

      const performanceBox = document.createElement("section");
      performanceBox.className = "eq-team-performance";
      const performanceTitle = document.createElement("div");
      performanceTitle.className = "eq-team-performance-title";
      performanceTitle.innerHTML = `<strong>Ranking de vendedores</strong><span>Melhor desempenho primeiro</span>`;
      performanceBox.appendChild(performanceTitle);

      if (!visibleMetrics.length) {
        const emptyMetrics = document.createElement("p");
        emptyMetrics.className = "eq-team-performance-empty";
        emptyMetrics.textContent = "Nenhum vendedor com dados disponível nesta equipe.";
        performanceBox.appendChild(emptyMetrics);
      } else {
        visibleMetrics.forEach((metric, index) => {
          const rankingRow = document.createElement("div");
          rankingRow.className = "eq-ranking-row";
          const position = document.createElement("strong");
          position.className = "eq-ranking-position";
          position.textContent = `${index + 1}º`;
          rankingRow.append(position, createSellerPerformanceCard(metric));
          performanceBox.appendChild(rankingRow);
        });
      }
      card.insertBefore(performanceBox, coordinatorLabel);

      const actions = document.createElement("div");
      actions.className = "eq-team-card-actions";
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "eq-btn-gold";
      saveButton.textContent = "Salvar equipe";
      saveButton.addEventListener("click", () => saveCommercialTeam(team, coordinatorSelect, membersBox, saveButton, photoInput, activeCheckbox));
      actions.appendChild(saveButton);
      card.appendChild(actions);
      container.appendChild(card);
    });
  };

  const createCommercialTeam = async (event) => {
    event.preventDefault();
    const client = getClient();
    const nameInput = document.getElementById("eq-team-name");
    const coordinatorSelect = document.getElementById("eq-team-coordinator");
    const photoInput = document.getElementById("eq-team-photo");
    const name = nameInput?.value.trim();
    const coordinatorUserId = coordinatorSelect?.value;
    const photoUrl = photoInput?.value.trim() || null;
    if (!client || !name || !coordinatorUserId) {
      setTeamStatus("Informe o nome e o coordenador da equipe.", "error");
      return;
    }

    setTeamStatus("Criando equipe...");
    try {
      await callCommercialTeamsApi("create", { name, coordinator_user_id: coordinatorUserId, photo_url: photoUrl });
    } catch (error) {
      await loadCommercialTeams();
      setTeamStatus(error.message, "error");
      return;
    }

    event.currentTarget.reset();
    setTeamStatus("Equipe criada com sucesso.", "success");
    await loadCommercialTeams();
  };

  const saveCommercialTeam = async (team, coordinatorSelect, membersBox, saveButton, photoInput, activeCheckbox) => {
    const client = getClient();
    if (!client || !coordinatorSelect.value) return;
    const selectedMemberIds = [...membersBox.querySelectorAll('input[type="checkbox"]:checked')].map((item) => item.value);
    saveButton.disabled = true;
    setTeamStatus(`Salvando ${team.name}...`);

    try {
      await callCommercialTeamsApi("save", {
        team_id: team.id,
        coordinator_user_id: coordinatorSelect.value,
        member_ids: selectedMemberIds,
        photo_url: photoInput?.value.trim() || null,
        active: activeCheckbox?.checked !== false,
      });

      setTeamStatus("Equipe atualizada com sucesso.", "success");
      await loadCommercialTeams();
    } catch (error) {
      setTeamStatus(`Erro ao salvar equipe: ${error.message}`, "error");
    } finally {
      saveButton.disabled = false;
    }
  };

  const deleteCommercialTeam = async (team) => {
    if (!confirm(`Excluir a equipe "${team.name}"? Os colaboradores ficarão sem equipe.`)) return;
    try {
      await callCommercialTeamsApi("delete", { team_id: team.id });
    } catch (error) {
      setTeamStatus(`Erro ao excluir equipe: ${error.message}`, "error");
      return;
    }
    setTeamStatus("Equipe excluída.", "success");
    await loadCommercialTeams();
  };

  const removeRole = async (roleKey) => {
    const sectorObj = sectors.find(s => s.roles.some(r => r.key === roleKey));
    const roleObj = sectorObj?.roles.find(r => r.key === roleKey);
    if (!sectorObj || !roleObj) return;

    if (sectorObj.id === "diretoria" || roleKey === "diretor-ceo") {
      alert("O cargo principal da diretoria não pode ser removido.");
      return;
    }

    const linkedMembers = getProfilesForRole(roleKey);
    const message = linkedMembers.length > 0
      ? `Remover o cargo "${roleObj.title}"?\n\n${linkedMembers.length} colaborador(es) vinculado(s) ficarão sem esse cargo.`
      : `Remover o cargo "${roleObj.title}"?`;

    if (!confirm(message)) return;

    const removedRoles = loadRemovedRoles();
    removedRoles.add(roleKey);
    saveRemovedRoles(removedRoles);

    sectorObj.roles = sectorObj.roles.filter(role => role.key !== roleKey);
    state.functions.delete(roleKey);
    delete rolesData[roleKey];

    const employeeMap = loadEmployeeFunctionsMap();
    Object.keys(employeeMap).forEach(profileId => {
      const remainingFuncs = (employeeMap[profileId] || []).filter(func => func.roleKey !== roleKey);
      if (remainingFuncs.length > 0 && !remainingFuncs.some(func => func.primary)) {
        remainingFuncs[0].primary = true;
      }
      employeeMap[profileId] = remainingFuncs;
      const profile = state.profiles.find(item => String(item.id) === String(profileId));
      const primaryFunc = remainingFuncs.find(func => func.primary) || remainingFuncs[0];
      if (profile && primaryFunc) {
        profile.role = primaryFunc.roleKey;
      }
    });
    saveEmployeeFunctionsMap(employeeMap);
    saveOrderToLocalStorage();
    saveRolesSnapshotToLocalStorage();

    if (state.selectedItem?.type === "role" && state.selectedItem.id === roleKey) {
      state.selectedItem = null;
    }

    document.querySelectorAll(`[data-role-key="${roleKey}"]`).forEach((element) => {
      element.remove();
    });
    document.querySelectorAll(`[data-role-link-key="${roleKey}"]`).forEach((element) => {
      element.remove();
    });

    // Atualiza a tela imediatamente; a limpeza remota roda em segundo plano.
    renderOrganograma();
    renderRolesAndFunctions();
    renderListView();
    renderSidebarDetails();
    renderSummaryCards();
    applySearch();
    refreshIcons();

    const client = getClient();
    if (client) {
      client
        .from("company_role_functions")
        .delete()
        .eq("role_key", roleKey)
        .then(({ error }) => {
          if (error) {
            console.warn("Nao foi possivel remover funcoes do cargo no Supabase:", error);
          }
        })
        .catch((error) => {
          console.warn("Nao foi possivel remover funcoes do cargo no Supabase:", error);
        });
    }
  };

  const getSectorColorClass = (sectorId) => {
    const clean = sectorId.toLowerCase().replace("-", "");
    if (clean === "administrativo" || clean === "admin") return "eq-sec-bg-admin";
    if (clean === "diretoria") return "eq-sec-bg-comercial"; // fallback
    return `eq-sec-bg-${clean}`;
  };

  const renderEmployeeRolesChips = (profile) => {
    const funcs = getEmployeeFunctions(profile);
    const sortedFuncs = [...funcs].sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));
    
    const limit = 2;
    const visibleFuncs = sortedFuncs.slice(0, limit);
    const remainingCount = sortedFuncs.length - limit;
    
    let html = `<div class="eq-chips-container" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; max-width: 450px;">`;
    
    visibleFuncs.forEach(f => {
      const secObj = sectors.find(s => s.id === f.sectorId);
      const roleObj = secObj?.roles.find(r => r.key === f.roleKey);
      const sectorTitle = secObj ? secObj.title : f.sectorId;
      const roleTitle = roleObj ? roleObj.title : f.roleKey;
      
      const chipText = `${sectorTitle} / ${roleTitle}`;
      if (f.primary) {
        html += `<span class="eq-role-chip primary" title="Função Principal">${chipText} <span class="eq-chip-badge-gold">Principal</span></span>`;
      } else {
        html += `<span class="eq-role-chip" title="Função Vinculada">${chipText}</span>`;
      }
    });
    
    if (remainingCount > 0) {
      html += `<span class="eq-role-chip-more" data-colab-id="${profile.id}" title="Ver todas as funções no painel lateral">+${remainingCount} ${remainingCount === 1 ? 'função' : 'funções'}</span>`;
    }
    
    html += `</div>`;
    return html;
  };

  // Load active collaborators from Supabase crm_users
  const loadProfiles = async () => {
    const client = getClient();
    localStorage.removeItem("seven-gold-profiles-local");
    if (!client) {
      state.profiles = [];
      return false;
    }

    try {
      const { data: users, error } = await client
        .from("crm_users")
        .select("id, nome, email, cargo, ativo")
        .order("nome", { ascending: true });
      if (error) throw error;

      let avatarsById = new Map();
      try {
        const avatarResult = await callCrmUserApi({ list_user_avatars: true });
        avatarsById = new Map(
          (avatarResult.avatars || []).map((avatar) => [String(avatar.id), avatar.url || null])
        );
      } catch (avatarError) {
        console.warn("Não foi possível carregar as fotos dos colaboradores:", avatarError);
      }

      state.profiles = (users || []).map((user) => ({
        id: user.id,
        full_name: user.nome,
        email: user.email,
        role: user.cargo || "vendedor",
        status: user.ativo ? "ativo" : "inativo",
        avatar_url: avatarsById.get(String(user.id)) || null,
      }));
      state.profiles.forEach((profile) => getEmployeeFunctions(profile));
      return true;
    } catch (error) {
      console.error("Erro ao carregar crm_users:", error);
      state.profiles = [];
      return false;
    }
  };

  const escapeAvatarAttribute = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const renderProfileAvatar = (profile, style = "") => {
    const initial = String(profile?.full_name || "?").trim().charAt(0).toUpperCase() || "?";
    const image = profile?.avatar_url
      ? `<img src="${escapeAvatarAttribute(profile.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : "";
    return `<div class="eq-avatar${image ? " has-user-photo" : ""}"${style ? ` style="${style}"` : ""}><span>${initial}</span>${image}</div>`;
  };

  document.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement && event.target.matches(".eq-avatar img")) {
      event.target.closest(".eq-avatar")?.classList.remove("has-user-photo");
      event.target.remove();
    }
  }, true);

  const callCrmUserApi = async (body) => {
    const client = getClient();
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Sessão expirada. Entre novamente no CRM.");

    const response = await fetch("/api/permissions/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(result.error || "Não foi possível salvar o colaborador.");
    }
    return result;
  };

  const saveProfiles = async () => {
    if (!getClient()) return false;

    try {
      for (const profile of state.profiles) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);
        const previousId = profile.id;
        const result = await callCrmUserApi({
          user: {
            id: isUuid ? profile.id : null,
            nome: profile.full_name,
            email: String(profile.email || "").trim().toLowerCase(),
            cargo: profile.role || "vendedor",
            ativo: profile.status === "ativo",
          },
        });
        if (result.user?.id) {
          profile.id = result.user.id;
          if (String(previousId) !== String(profile.id)) {
            const functionsMap = loadEmployeeFunctionsMap();
            if (functionsMap[previousId]) {
              functionsMap[profile.id] = functionsMap[previousId];
              delete functionsMap[previousId];
              saveEmployeeFunctionsMap(functionsMap);
            }
          }
        }
      }
      await loadProfiles();
      return true;
    } catch (err) {
      console.error("Erro ao sincronizar crm_users:", err);
      return false;
    }
  };

  // Load functions from company_role_functions
  const loadSavedFunctions = async () => {
    const client = getClient();
    state.functions.clear();

    if (client) {
      const { data, error } = await client
        .from("company_role_functions")
        .select("role_key, functions");
      if (!error && data) {
        data.forEach(item => {
          if (Array.isArray(item.functions)) {
            state.functions.set(item.role_key, item.functions);
          }
        });
      }
    }

    const localFunctions = loadRoleFunctionsLocalMap();
    Object.entries(localFunctions).forEach(([roleKey, funcs]) => {
      if (Array.isArray(funcs)) {
        state.functions.set(roleKey, funcs);
      }
    });

    // Set defaults from static metadata if not in DB
    sectors.forEach(sec => {
      sec.roles.forEach(role => {
        if (!state.functions.has(role.key)) {
          // Set standard defaults
          let def = [];
          if (role.key === 'diretor-ceo') def = ["Definir direção da empresa.", "Acompanhar financeiro, equipe e operação.", "Aprovar permissões, cargos e regras internas."];
          else if (role.key === 'vendedor') def = ["Atender leads do CRM.", "Negociar com clientes.", "Apresentar propostas.", "Registrar andamento dos atendimentos.", "Reportar resultados ao coordenador."];
          else if (role.key === 'coordenador-comercial') def = ["Distribuir leads e acompanhar retorno.", "Orientar vendedores sobre propostas e fechamentos.", "Reportar resultados para a diretoria."];
          else if (role.key === 'supervisor-comercial') def = ["Acompanhar o desempenho do time comercial.", "Validar rotina, metas e prioridade dos atendimentos.", "Apoiar coordenadores em decisões comerciais."];
          else if (role.key === 'assistente-vendas') def = ["Organizar dados iniciais do lead.", "Confirmar contato e documentos básicos.", "Encaminhar oportunidade para vendedor."];
          else def = [`Responsabilidade 1 do cargo ${role.title}.`, `Responsabilidade 2 do cargo ${role.title}.`, `Reportar andamento de metas do setor.`];
          state.functions.set(role.key, def);
        }
      });
    });
  };

  // Get profiles grouped by role
  const getProfilesForRole = (roleKey) => {
    return state.profiles.filter(p => {
      const funcs = getEmployeeFunctions(p);
      return funcs.some(f => f.roleKey === roleKey);
    });
  };

  // Get total members in a sector
  const getMembersInSector = (sector) => {
    const sectorRoleKeys = sector.roles.map(r => r.key);
    const uniqueProfiles = state.profiles.filter(p => {
      const funcs = getEmployeeFunctions(p);
      return funcs.some(f => sectorRoleKeys.includes(f.roleKey));
    });
    return uniqueProfiles.length;
  };

  // Render summary cards
  const renderSummaryCards = () => {
    document.getElementById("sum-sectors-count").textContent = sectors.length;
    
    let rolesCount = 0;
    sectors.forEach(s => rolesCount += s.roles.length);
    document.getElementById("sum-roles-count").textContent = rolesCount;

    document.getElementById("sum-members-count").textContent = state.profiles.length;
    document.getElementById("sum-levels-count").textContent = "5"; // Fixed level hierarchy
  };

  // Render Organograma View (Aba 1)
  const renderOrganograma = () => {
    if (!sectorsRow) return;
    sectorsRow.innerHTML = "";

    // Diretoria Card (Jonatã)
    const dirCard = document.querySelector("[data-dir-card]");
    if (dirCard) {
      const dirRoleKey = 'diretor-ceo';
      const dirMembers = getProfilesForRole(dirRoleKey);
      
      const ceoProfile = dirMembers[0] || { full_name: "Jonatã", avatar_url: null };
      const ceoName = ceoProfile.full_name;
      document.getElementById("dir-name").textContent = ceoName;
      const dirAvatar = document.getElementById("dir-avatar");
      dirAvatar.innerHTML = `<span>${ceoName.charAt(0).toUpperCase()}</span>${ceoProfile.avatar_url ? `<img src="${escapeAvatarAttribute(ceoProfile.avatar_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}`;
      dirAvatar.classList.toggle("has-user-photo", Boolean(ceoProfile.avatar_url));
      dirCard.querySelector(".eq-profile-tag").textContent = `${dirMembers.length} ${dirMembers.length === 1 ? 'pessoa' : 'pessoas'}`;

      // Reset selection state
      dirCard.classList.remove("selected");
      if (state.selectedItem && state.selectedItem.id === dirRoleKey) {
        dirCard.classList.add("selected");
      }

      // Add click listener
      dirCard.onclick = (e) => {
        e.stopPropagation();
        selectItem('role', dirRoleKey, 'diretoria');
      };
    }

    // Other sectors
    sectors.forEach(sector => {
      if (sector.id === "diretoria") return; // Diretoria is on top

      const sectorMembersCount = getMembersInSector(sector);

      const sectorCard = document.createElement("article");
      sectorCard.className = `eq-sector-card`;
      sectorCard.dataset.sectorId = sector.id;
      if (state.selectedItem && state.selectedItem.type === 'sector' && state.selectedItem.id === sector.id) {
        sectorCard.classList.add("selected");
      }

      sectorCard.innerHTML = `
        <header class="eq-sector-header">
          <i data-lucide="grip-vertical" class="eq-drag-handle" title="Arraste para mover setor"></i>
          <div class="eq-sec-icon eq-sec-bg-${sector.id.replace("-", "")}">
            <i data-lucide="${sector.icon || 'folder'}"></i>
          </div>
          <div class="eq-sector-title-wrapper">
            <h4>${sector.title}</h4>
            <span>${sector.description}</span>
          </div>
          <span class="eq-sector-count">${sectorMembersCount}</span>
        </header>
        <div class="eq-sector-roles">
          ${sector.roles.map(role => {
            const roleMembers = getProfilesForRole(role.key);
            const isRoleSelected = state.selectedItem && state.selectedItem.type === 'role' && state.selectedItem.id === role.key;
            return `
              <button class="eq-role-pill ${isRoleSelected ? 'selected' : ''}" data-role-key="${role.key}" draggable="true" type="button">
                <div class="eq-role-pill-grip" title="Arraste para mover cargo">
                  <i data-lucide="grip-vertical"></i>
                </div>
                <div class="eq-role-pill-info">
                  <strong>${role.title}</strong>
                  <span>${roleMembers.length} ${roleMembers.length === 1 ? 'pessoa' : 'pessoas'}</span>
                </div>
                <i data-lucide="chevron-right"></i>
              </button>
            `;
          }).join("")}
        </div>
        <button class="eq-sec-add-role-btn" type="button">+ Adicionar cargo</button>
      `;

      // Event listener for clicking sector itself
      sectorCard.addEventListener("click", (e) => {
        if (e.target.closest(".eq-role-pill") || e.target.closest(".eq-sec-add-role-btn") || e.target.closest(".eq-drag-handle")) return;
        selectItem('sector', sector.id);
      });

      // Event listener for clicking role pills inside sector
      sectorCard.querySelectorAll(".eq-role-pill").forEach(pill => {
        pill.addEventListener("click", (e) => {
          if (e.target.closest(".eq-role-pill-grip")) return;
          e.stopPropagation();
          const rKey = pill.getAttribute("data-role-key");
          selectItem('role', rKey, sector.id);
        });
      });

      // Event listener for adding cargo
      sectorCard.querySelector(".eq-sec-add-role-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openNewRoleModal(sector.id);
      });

      // --- Sector Drag and Drop Events (to reorder sectors) ---
      sectorCard.setAttribute("draggable", "true");
      
      sectorCard.addEventListener("dragstart", (e) => {
        if (e.target.closest(".eq-role-pill")) {
          // If we drag from a role pill, prevent the sector card from initiating drag
          return;
        }
        draggedSectorId = sector.id;
        draggedRoleKey = null;
        sectorCard.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      sectorCard.addEventListener("dragend", () => {
        draggedSectorId = null;
        sectorCard.classList.remove("dragging");
        document.querySelectorAll(".eq-sector-card").forEach(c => {
          c.classList.remove("drag-over");
          c.classList.remove("drag-over-sector");
        });
      });

      sectorCard.addEventListener("dragover", (e) => {
        if (draggedSectorId && draggedSectorId !== sector.id) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          sectorCard.classList.add("drag-over");
        } else if (draggedRoleKey) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          sectorCard.classList.add("drag-over-sector");
        }
      });

      sectorCard.addEventListener("dragleave", () => {
        sectorCard.classList.remove("drag-over");
        sectorCard.classList.remove("drag-over-sector");
      });

      sectorCard.addEventListener("drop", (e) => {
        if (draggedSectorId && draggedSectorId !== sector.id) {
          e.preventDefault();
          const fromIndex = sectors.findIndex(s => s.id === draggedSectorId);
          const toIndex = sectors.findIndex(s => s.id === sector.id);
          if (fromIndex !== -1 && toIndex !== -1) {
            const [draggedSec] = sectors.splice(fromIndex, 1);
            sectors.splice(toIndex, 0, draggedSec);
            saveOrderToLocalStorage();
            renderOrganograma();
          }
        } else if (draggedRoleKey) {
          e.preventDefault();
          const targetSectorId = sector.id;
          
          let draggedRoleObj = null;
          let originSector = null;
          for (const sec of sectors) {
            const idx = sec.roles.findIndex(r => r.key === draggedRoleKey);
            if (idx !== -1) {
              originSector = sec;
              [draggedRoleObj] = sec.roles.splice(idx, 1);
              break;
            }
          }
          
          if (draggedRoleObj) {
            sector.roles.push(draggedRoleObj);
            saveOrderToLocalStorage();
            
            renderSummaryCards();
            renderOrganograma();
            
            if (state.selectedItem && state.selectedItem.type === 'role' && state.selectedItem.id === draggedRoleKey) {
              state.selectedItem.sectorId = targetSectorId;
              renderSidebarDetails();
            } else if (state.selectedItem && state.selectedItem.type === 'sector' && (state.selectedItem.id === targetSectorId || state.selectedItem.id === originSector?.id)) {
              renderSidebarDetails();
            }
          }
        }
      });

      // --- Role Pills Drag and Drop Events (to reorder roles or move across sectors) ---
      sectorCard.querySelectorAll(".eq-role-pill").forEach(pill => {
        const rKey = pill.getAttribute("data-role-key");
        
        pill.addEventListener("dragstart", (e) => {
          draggedRoleKey = rKey;
          draggedRoleOriginSectorId = sector.id;
          draggedSectorId = null;
          pill.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.stopPropagation(); // prevent parent sector from dragging
        });

        pill.addEventListener("dragend", () => {
          draggedRoleKey = null;
          draggedRoleOriginSectorId = null;
          pill.classList.remove("dragging");
          document.querySelectorAll(".eq-role-pill").forEach(p => p.classList.remove("drag-over-top", "drag-over-bottom"));
          document.querySelectorAll(".eq-sector-card").forEach(c => c.classList.remove("drag-over-sector"));
        });

        pill.addEventListener("dragover", (e) => {
          if (draggedRoleKey) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            
            const rect = pill.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            if (relativeY < rect.height / 2) {
              pill.classList.add("drag-over-top");
              pill.classList.remove("drag-over-bottom");
            } else {
              pill.classList.add("drag-over-bottom");
              pill.classList.remove("drag-over-top");
            }
          }
        });

        pill.addEventListener("dragleave", () => {
          pill.classList.remove("drag-over-top", "drag-over-bottom");
        });

        pill.addEventListener("drop", (e) => {
          if (draggedRoleKey) {
            e.preventDefault();
            e.stopPropagation();
            
            const targetSectorId = sector.id;
            
            let draggedRoleObj = null;
            let originSector = null;
            for (const sec of sectors) {
              const idx = sec.roles.findIndex(r => r.key === draggedRoleKey);
              if (idx !== -1) {
                originSector = sec;
                [draggedRoleObj] = sec.roles.splice(idx, 1);
                break;
              }
            }
            
            if (draggedRoleObj) {
              const targetRoleIndex = sector.roles.findIndex(r => r.key === rKey);
              
              const rect = pill.getBoundingClientRect();
              const relativeY = e.clientY - rect.top;
              const insertAfter = relativeY >= rect.height / 2;
              const insertIndex = insertAfter ? targetRoleIndex + 1 : targetRoleIndex;
              
              sector.roles.splice(insertIndex, 0, draggedRoleObj);
              saveOrderToLocalStorage();
              
              renderSummaryCards();
              renderOrganograma();
              
              if (state.selectedItem && state.selectedItem.type === 'role' && state.selectedItem.id === draggedRoleKey) {
                state.selectedItem.sectorId = targetSectorId;
                renderSidebarDetails();
              } else if (state.selectedItem && state.selectedItem.type === 'sector' && (state.selectedItem.id === targetSectorId || state.selectedItem.id === originSector?.id)) {
                renderSidebarDetails();
              }
            }
          }
        });
      });

      sectorsRow.appendChild(sectorCard);
    });

    refreshIcons();
  };

  // Render list view of roles & functions (Aba 2)
  const renderRolesAndFunctions = () => {
    if (!roleBoard) return;
    roleBoard.innerHTML = "";

    sectors.forEach(sector => {
      const article = document.createElement("article");
      article.className = "role-section";
      article.id = `functions-${sector.id}`;

      article.innerHTML = `
        <header style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <span style="font-weight: 800; background: #d4af37; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
            ${sector.title.charAt(0)}
          </span>
          <div>
            <h2 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a;">${sector.title}</h2>
            <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0 0;">${sector.description}</p>
          </div>
        </header>
        <div class="job-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
          ${sector.roles.map(role => {
            const funcList = state.functions.get(role.key) || [];
            const roleMembers = getProfilesForRole(role.key);
            const membersNames = roleMembers.map(m => m.full_name).join(", ");
            const membersText = roleMembers.length === 0
              ? "Sem colaboradores"
              : `Colaboradores: ${roleMembers.length > 2 ? `${roleMembers.slice(0, 2).map(m => m.full_name).join(", ")} +${roleMembers.length - 2}` : membersNames}`;

            return `
              <div class="job-card" data-role-key="${role.key}" ${sector.id !== "diretoria" ? 'draggable="true"' : ''} style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #ffffff;">
                <div class="job-card-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                  <h3 style="font-size: 0.9rem; font-weight: 700; margin: 0; color: #0f172a;">${role.title}</h3>
                  <div class="job-actions" style="display: flex; gap: 8px; font-size: 0.75rem;">
                    <a href="documentos.html?setor=${sector.id}&cargo=${role.key}" class="ver-docs-link" style="color: #d4af37; font-weight: 600; text-decoration: none;">Documentos</a>
                    <button type="button" class="btn-edit-funcs" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-weight: 600;">Editar</button>
                    ${sector.id !== "diretoria" ? `<button type="button" class="eq-job-delete-role" data-role-delete="${role.key}" title="Remover cargo" aria-label="Remover cargo ${role.title}"><i data-lucide="trash-2"></i></button>` : ""}
                  </div>
                </div>
                
                <div class="role-functions">
                  <ol style="margin: 0; padding-left: 16px; font-size: 0.8rem; color: #475569; line-height: 1.4;">
                    ${funcList.map(item => `<li>${item}</li>`).join("")}
                  </ol>
                  <div style="margin-top: 10px; font-size: 0.72rem; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <i data-lucide="users" style="width: 12px; height: 12px; color: #d4af37;"></i>
                    <span>${membersText}</span>
                  </div>
                </div>
                
                <div class="role-editor" style="display: none; margin-top: 12px;">
                  <textarea rows="6" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; font-size: 0.8rem; font-family: inherit; resize: vertical;">${funcList.map((item, index) => `${index + 1}. ${item}`).join("\n")}</textarea>
                  <div class="role-editor-actions">
                    <button type="button" class="btn-save-funcs">Salvar funções</button>
                    <button type="button" class="btn-delete-func">Excluir função</button>
                  </div>
                  <span class="role-save-status" style="font-size: 0.7rem; margin-left: 8px;"></span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      // Bind edit and save buttons inside card
      article.querySelectorAll(".job-card").forEach(card => {
        const roleKey = card.getAttribute("data-role-key");
        const editBtn = card.querySelector(".btn-edit-funcs");
        const deleteBtn = card.querySelector(".eq-job-delete-role");
        const saveBtn = card.querySelector(".btn-save-funcs");
        const deleteFuncBtn = card.querySelector(".btn-delete-func");
        const editor = card.querySelector(".role-editor");
        const viewArea = card.querySelector(".role-functions");
        const textarea = card.querySelector("textarea");
        const statusSpan = card.querySelector(".role-save-status");

        const parseFunctionsFromEditor = () => textarea.value
          .split("\n")
          .map(item => item.replace(/^\s*\d+[\).\-\s]+/, "").trim())
          .filter(Boolean);

        const renderFunctionsPreview = (parsedFuncs) => {
          viewArea.innerHTML = `
            <ol style="margin: 0; padding-left: 16px; font-size: 0.8rem; color: #475569; line-height: 1.4;">
              ${parsedFuncs.map(item => `<li>${item}</li>`).join("")}
            </ol>
            ${parsedFuncs.length === 0 ? '<p style="margin: 8px 0 0; color: #94a3b8; font-size: 0.75rem;">Nenhuma função cadastrada.</p>' : ''}
          `;
        };

        const persistRoleFunctions = async (parsedFuncs) => {
          saveRoleFunctionsLocal(roleKey, parsedFuncs);

          const client = getClient();
          if (!client) return true;

          try {
            const { error } = await client
              .from("company_role_functions")
              .upsert(
                {
                  role_key: roleKey,
                  functions: parsedFuncs
                },
                { onConflict: "role_key" }
              );

            if (error) {
              console.warn("Funcoes salvas localmente; Supabase recusou a gravacao:", error);
            }
          } catch (error) {
            console.warn("Funcoes salvas localmente; Supabase indisponivel:", error);
          }

          return true;
        };

        const applyFunctionsUpdate = (parsedFuncs) => {
          state.functions.set(roleKey, parsedFuncs);
          renderFunctionsPreview(parsedFuncs);
          renderSidebarDetails();
          refreshIcons();
        };

        // --- Drag events for job cards ---
        if (sector.id !== "diretoria") {
          card.addEventListener("dragstart", (e) => {
            if (e.target.closest("textarea, button, a")) {
              e.preventDefault();
              return;
            }
            draggedRoleKey = roleKey;
            draggedRoleOriginSectorId = sector.id;
            draggedSectorId = null;
            card.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
          });

          card.addEventListener("dragend", () => {
            draggedRoleKey = null;
            draggedRoleOriginSectorId = null;
            card.classList.remove("dragging");
            document.querySelectorAll(".job-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
            document.querySelectorAll(".role-section").forEach(s => s.classList.remove("drag-over-sector"));
          });

          card.addEventListener("dragover", (e) => {
            if (draggedRoleKey) {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              
              const rect = card.getBoundingClientRect();
              const relativeY = e.clientY - rect.top;
              if (relativeY < rect.height / 2) {
                card.classList.add("drag-over-top");
                card.classList.remove("drag-over-bottom");
              } else {
                card.classList.add("drag-over-bottom");
                card.classList.remove("drag-over-top");
              }
            }
          });

          card.addEventListener("dragleave", () => {
            card.classList.remove("drag-over-top", "drag-over-bottom");
          });

          card.addEventListener("drop", (e) => {
            if (draggedRoleKey) {
              e.preventDefault();
              e.stopPropagation();
              
              let draggedRoleObj = null;
              for (const sec of sectors) {
                const idx = sec.roles.findIndex(r => r.key === draggedRoleKey);
                if (idx !== -1) {
                  [draggedRoleObj] = sec.roles.splice(idx, 1);
                  break;
                }
              }
              
              if (draggedRoleObj) {
                const targetRoleIndex = sector.roles.findIndex(r => r.key === roleKey);
                const rect = card.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const insertAfter = relativeY >= rect.height / 2;
                const insertIndex = insertAfter ? targetRoleIndex + 1 : targetRoleIndex;
                
                sector.roles.splice(insertIndex, 0, draggedRoleObj);
                saveOrderToLocalStorage();
                
                renderSummaryCards();
                renderRolesAndFunctions();
              }
            }
          });
        }

        editBtn.addEventListener("click", () => {
          if (editor.style.display === "none") {
            editor.style.display = "block";
            viewArea.style.display = "none";
            editBtn.textContent = "Cancelar";
          } else {
            editor.style.display = "none";
            viewArea.style.display = "block";
            editBtn.textContent = "Editar";
            const list = state.functions.get(roleKey) || [];
            textarea.value = list.map((item, index) => `${index + 1}. ${item}`).join("\n");
          }
        });

        deleteBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          removeRole(deleteBtn.dataset.roleDelete);
        });

        deleteFuncBtn?.addEventListener("click", async () => {
          const lines = textarea.value.split("\n");
          const selectedText = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();

          if (selectedText) {
            textarea.setRangeText("", textarea.selectionStart, textarea.selectionEnd, "start");
          } else {
            let lastFilledIndex = -1;
            for (let index = lines.length - 1; index >= 0; index -= 1) {
              if (lines[index].trim()) {
                lastFilledIndex = index;
                break;
              }
            }
            if (lastFilledIndex === -1) return;
            lines.splice(lastFilledIndex, 1);
            textarea.value = lines.join("\n").trim();
          }

          const parsedFuncs = parseFunctionsFromEditor();
          textarea.value = parsedFuncs.map((item, index) => `${index + 1}. ${item}`).join("\n");
          applyFunctionsUpdate(parsedFuncs);

          deleteFuncBtn.disabled = true;
          statusSpan.textContent = "Função removida e atualizada.";
          statusSpan.dataset.type = "";
          statusSpan.style.color = "#dc2626";
          textarea.focus();

          const success = await persistRoleFunctions(parsedFuncs);
          deleteFuncBtn.disabled = false;
          if (!success) {
            statusSpan.style.color = "red";
            statusSpan.textContent = "Removida na tela, mas houve erro ao salvar no Supabase.";
            return;
          }

          statusSpan.style.color = "green";
          statusSpan.textContent = "Função removida e salva.";
          setTimeout(() => { statusSpan.textContent = ""; }, 2000);
        });

        saveBtn.addEventListener("click", async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = "Salvando...";
          statusSpan.textContent = "";

          const parsedFuncs = parseFunctionsFromEditor();
          applyFunctionsUpdate(parsedFuncs);
          const success = await persistRoleFunctions(parsedFuncs);

          saveBtn.disabled = false;
          saveBtn.textContent = "Salvar funções";

          if (success) {
            editor.style.display = "none";
            viewArea.style.display = "block";
            editBtn.textContent = "Editar";
            statusSpan.style.color = "green";
            statusSpan.textContent = "Salvo!";
            setTimeout(() => { statusSpan.textContent = ""; }, 2000);
          } else {
            statusSpan.style.color = "red";
            statusSpan.textContent = "Erro ao salvar no Supabase.";
          }
        });
      });

      // --- Drag events for the sector section (to drop a card directly into this sector) ---
      if (sector.id !== "diretoria") {
        article.addEventListener("dragover", (e) => {
          if (draggedRoleKey) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            article.classList.add("drag-over-sector");
          }
        });

        article.addEventListener("dragleave", () => {
          article.classList.remove("drag-over-sector");
        });

        article.addEventListener("drop", (e) => {
          if (draggedRoleKey) {
            e.preventDefault();
            
            let draggedRoleObj = null;
            for (const sec of sectors) {
              const idx = sec.roles.findIndex(r => r.key === draggedRoleKey);
              if (idx !== -1) {
                [draggedRoleObj] = sec.roles.splice(idx, 1);
                break;
              }
            }
            
            if (draggedRoleObj) {
              sector.roles.push(draggedRoleObj);
              saveOrderToLocalStorage();
              
              renderSummaryCards();
              renderRolesAndFunctions();
            }
          }
        });
      }

      roleBoard.appendChild(article);
    });
  };

  // Helper to determine if collaborator has documents
  const hasDocuments = (profile) => {
    // Simulated rule: profiles with IDs '1', '2', '4', '8' have documents
    return ['1', '2', '4', '8'].includes(profile.id);
  };

  const listFilters = {
    search: '',
    sector: 'todos',
    role: 'todos',
    status: 'todos',
  };

  const populateFilterCargos = (sectorId = 'todos') => {
    const cargoSelect = document.getElementById("filter-role");
    if (!cargoSelect) return;

    cargoSelect.innerHTML = '<option value="todos">Todos os cargos</option>';
    
    let rolesToPopulate = [];
    if (sectorId === 'todos') {
      rolesToPopulate = sectors.flatMap(s => s.roles);
    } else {
      const sectorObj = sectors.find(s => s.id === sectorId);
      if (sectorObj) {
        rolesToPopulate = sectorObj.roles;
      }
    }

    const seen = new Set();
    rolesToPopulate.forEach(role => {
      if (!seen.has(role.key)) {
        seen.add(role.key);
        const opt = document.createElement("option");
        opt.value = role.key;
        opt.textContent = role.title;
        cargoSelect.appendChild(opt);
      }
    });
  };

  const updateListSummary = (filteredProfiles) => {
    const totalEl = document.getElementById("summary-total");
    const activeEl = document.getElementById("summary-active");
    const noDocsEl = document.getElementById("summary-no-docs");
    const noRoleEl = document.getElementById("summary-no-role");

    if (!totalEl) return;

    totalEl.textContent = `${filteredProfiles.length} de ${state.profiles.length}`;
    activeEl.textContent = filteredProfiles.filter(p => p.status !== 'inativo').length;
    noDocsEl.textContent = filteredProfiles.filter(p => !hasDocuments(p)).length;

    const allRoleKeys = new Set(sectors.flatMap(s => s.roles).map(r => r.key));
    const noRoleCount = filteredProfiles.filter(p => !p.role || !allRoleKeys.has(getRoleKeyForProfile(p.role))).length;
    noRoleEl.textContent = noRoleCount;
  };

  const applyListFilters = () => {
    const query = listFilters.search.toLowerCase().trim();
    const sector = listFilters.sector;
    const role = listFilters.role;
    const status = listFilters.status;

    const filtered = state.profiles.filter(p => {
      const funcs = getEmployeeFunctions(p);

      const matchesSearch = !query || 
                            p.full_name.toLowerCase().includes(query) || 
                            p.email.toLowerCase().includes(query) ||
                            funcs.some(f => {
                              const secObj = sectors.find(s => s.id === f.sectorId);
                              const roleObj = secObj?.roles.find(r => r.key === f.roleKey);
                              return (secObj && secObj.title.toLowerCase().includes(query)) ||
                                     (roleObj && roleObj.title.toLowerCase().includes(query));
                            });
      const matchesSector = sector === 'todos' || funcs.some(f => f.sectorId === sector);
      const matchesRole = role === 'todos' || funcs.some(f => f.roleKey === role);
      const matchesStatus = status === 'todos' || 
                            (status === 'ativo' && p.status !== 'inativo') || 
                            (status === 'inativo' && p.status === 'inativo');

      return matchesSearch && matchesSector && matchesRole && matchesStatus;
    });

    renderListView(filtered);
    updateListSummary(filtered);
  };

  // Render list view of users (Aba 3)
  const renderListView = (profilesList = null) => {
    if (!listTableBody) return;
    listTableBody.innerHTML = "";

    const listToRender = profilesList || state.profiles;

    listToRender.forEach(p => {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      
      const isActive = p.status !== "inativo";
      const statusBadge = isActive 
        ? `<span class="eq-status-badge eq-status-active" style="background: rgba(16, 185, 129, 0.08); color: #10b981; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600;">Ativo</span>`
        : `<span class="eq-status-badge eq-status-inactive" style="background: rgba(239, 68, 68, 0.08); color: #ef4444; padding: 4px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 600;">Inativo</span>`;

      const hasDocs = hasDocuments(p);
      const docHtml = hasDocs 
        ? `<a href="documentos.html?colaborador=${encodeURIComponent(p.full_name)}" style="color: #d4af37; font-weight: 600; text-decoration: none; font-size: 0.8rem;">Ver documentos (8)</a>`
        : `<span style="color: #94a3b8; font-weight: 500; font-size: 0.8rem;">Sem documentos</span>`;

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${renderProfileAvatar(p)}
            <div>
              <strong style="display: block; font-size: 0.85rem;">${p.full_name}</strong>
              <small style="color: #64748b; font-size: 0.75rem;">${p.email}</small>
            </div>
          </div>
        </td>
        <td>
          ${renderEmployeeRolesChips(p)}
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          ${docHtml}
        </td>
        <td style="text-align: right; position: relative;">
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <button class="eq-btn-outline btn-edit-colab" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.75rem; border: 1.5px solid #d4af37; color: #d4af37; border-radius: 6px; background: #fff; font-weight: 600; cursor: pointer;" type="button">Editar</button>
            <button class="eq-folder-menu-btn colab-row-menu-btn" data-id="${p.id}" type="button">
              <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
            </button>
            <div class="eq-context-menu" style="display: none; min-width: 140px; right: 0; top: 32px;">
              <button type="button" class="delete btn-delete-colab" data-id="${p.id}"><i data-lucide="trash-2"></i> Excluir</button>
            </div>
          </div>
        </td>
      `;

      // Row click selects collaborator and displays sidebar details
      tr.addEventListener("click", (e) => {
        if (e.target.closest("button") || e.target.closest("a") || e.target.closest(".eq-context-menu")) return;
        selectItem('colaborador', p.id);
      });

      // Edit click opens modal
      tr.querySelector(".btn-edit-colab").addEventListener("click", (e) => {
        e.stopPropagation();
        openEditColabModal(p.id);
      });

      // Three vertical dots menu
      const menuBtn = tr.querySelector(".colab-row-menu-btn");
      const ctxMenu = tr.querySelector(".eq-context-menu");
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".eq-context-menu").forEach(el => {
          if (el !== ctxMenu) el.style.display = "none";
        });
        ctxMenu.style.display = ctxMenu.style.display === "flex" ? "none" : "flex";
      });

      // Delete action inside context menu
      tr.querySelector(".btn-delete-colab").addEventListener("click", async (e) => {
        e.stopPropagation();
        ctxMenu.style.display = "none";
        if (confirm(`Tem certeza de que deseja excluir o colaborador "${p.full_name}"?`)) {
          try {
            await callCrmUserApi({ delete_user_id: p.id });
          } catch (error) {
            alert(`Não foi possível excluir o colaborador: ${error.message}`);
            return;
          }
          state.profiles = state.profiles.filter(item => item.id !== p.id);
          
          // Clear employee roles mapping
          const map = loadEmployeeFunctionsMap();
          delete map[p.id];
          saveEmployeeFunctionsMap(map);

          if (state.selectedItem && state.selectedItem.type === 'colaborador' && state.selectedItem.id === p.id) {
            state.selectedItem = null;
            renderSidebarDetails();
          }

          renderSummaryCards();
          renderListView();
          if (state.activeTab === 'hierarquia') renderOrganograma();
        }
      });

      // Bind click on remaining count chip to select collaborator
      tr.querySelector(".eq-role-chip-more")?.addEventListener("click", (e) => {
        e.stopPropagation();
        selectItem('colaborador', p.id);
      });

      listTableBody.appendChild(tr);
    });
  };

  // Perform search / filtering on the active view
  const performSearch = () => {
    state.searchQuery = searchInput.value || '';
    if (state.activeTab === 'lista') {
      renderListView();
    } else if (state.activeTab === 'hierarquia') {
      const query = state.searchQuery.toLowerCase().trim();
      document.querySelectorAll(".eq-sector-card").forEach(card => {
        const sectorId = card.getAttribute("data-sector-id");
        const sectorObj = sectors.find(s => s.id === sectorId);
        if (!sectorObj) return;

        let sectorMatches = sectorObj.title.toLowerCase().includes(query) || sectorObj.description.toLowerCase().includes(query);
        let roleMatches = false;

        card.querySelectorAll(".eq-role-pill").forEach(pill => {
          const roleKey = pill.getAttribute("data-role-key");
          const roleObj = sectorObj.roles.find(r => r.key === roleKey);
          if (!roleObj) return;

          const members = getProfilesForRole(roleKey);
          const nameMatches = members.some(m => m.full_name.toLowerCase().includes(query));

          if (roleObj.title.toLowerCase().includes(query) || nameMatches) {
            pill.style.display = "flex";
            roleMatches = true;
          } else {
            pill.style.display = "none";
          }
        });

        if (query === '' || sectorMatches || roleMatches) {
          card.style.display = "block";
          if (query !== '' && !roleMatches) {
            card.querySelectorAll(".eq-role-pill").forEach(p => p.style.display = "flex");
          }
        } else {
          card.style.display = "none";
        }
      });
    } else if (state.activeTab === 'funcoes') {
      const query = state.searchQuery.toLowerCase().trim();
      document.querySelectorAll(".role-section").forEach(sec => {
        let secMatches = sec.querySelector("h2").textContent.toLowerCase().includes(query);
        let cardMatches = false;

        sec.querySelectorAll(".job-card").forEach(card => {
          const roleKey = card.getAttribute("data-role-key");
          const titleText = card.querySelector("h3").textContent.toLowerCase();
          const funcs = state.functions.get(roleKey) || [];
          const funcsText = funcs.join(" ").toLowerCase();

          if (titleText.includes(query) || funcsText.includes(query)) {
            card.style.display = "block";
            cardMatches = true;
          } else {
            card.style.display = "none";
          }
        });

        if (query === '' || secMatches || cardMatches) {
          sec.style.display = "block";
          if (query !== '' && !cardMatches) {
            sec.querySelectorAll(".job-card").forEach(c => c.style.display = "block");
          }
        } else {
          sec.style.display = "none";
        }
      });
    }
  };

  // Toggle dynamic Sidebar Details (Right column)
  const selectItem = (type, id, sectorId = null) => {
    state.selectedItem = { type, id, sectorId };
    
    // Highlight selections visually
    document.querySelectorAll(".eq-sector-card").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".eq-role-pill").forEach(p => p.classList.remove("selected"));
    const dirCard = document.querySelector("[data-dir-card]");
    if (dirCard) dirCard.classList.remove("selected");

    if (type === 'sector') {
      const card = document.querySelector(`.eq-sector-card[data-sector-id="${id}"]`);
      if (card) card.classList.add("selected");
    } else if (type === 'role') {
      if (id === 'diretor-ceo') {
        if (dirCard) dirCard.classList.add("selected");
      } else {
        const pill = document.querySelector(`.eq-role-pill[data-role-key="${id}"]`);
        if (pill) {
          pill.classList.add("selected");
        }
      }
    }

    renderSidebarDetails();
  };

  // Render Sidebar Details Panel
  const renderSidebarDetails = () => {
    let activePlaceholder = sidebarPlaceholder;
    let activeContent = sidebarContent;

    if (state.activeTab === 'lista') {
      activePlaceholder = document.getElementById("eq-list-sidebar-placeholder") || sidebarPlaceholder;
      activeContent = document.getElementById("eq-list-sidebar-content") || sidebarContent;
    }

    if (!activePlaceholder || !activeContent) return;

    if (!state.selectedItem) {
      activePlaceholder.style.display = "flex";
      activeContent.style.display = "none";
      return;
    }

    activePlaceholder.style.display = "none";
    activeContent.style.display = "block";

    const { type, id, sectorId } = state.selectedItem;

    if (type === 'sector') {
      const sectorObj = sectors.find(s => s.id === id);
      if (!sectorObj) return;

      const sectorMembersCount = getMembersInSector(sectorObj);
      const rolesCount = sectorObj.roles.length;

      // Find first coordinator/manager as responsable
      const leadRole = sectorObj.roles[0];
      const leadProfiles = leadRole ? getProfilesForRole(leadRole.key) : [];
      const managerName = leadProfiles[0]?.full_name || "Não definido";

      activeContent.innerHTML = `
        <div class="eq-sidebar-header" style="position: relative; padding-bottom: 16px;">
          <button type="button" id="btn-close-sidebar" style="position: absolute; top: 0; right: 0; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8;"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
          <div class="eq-sidebar-title-box" style="margin-top: 10px;">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0;">${sectorObj.title}</h2>
            <span class="eq-sidebar-tag eq-tag-sector" style="background: rgba(99, 102, 241, 0.08); color: #6366f1; font-weight: 600; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">Setor selecionado</span>
          </div>
        </div>

        <div style="margin-top: 14px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Descrição</h4>
          <p style="font-size: 0.78rem; line-height: 1.4; margin: 0; color: #475569;">${sectorObj.description}</p>
        </div>

        <div style="margin-top: 14px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Resumo</h4>
          <ul style="margin: 0; padding-left: 14px; font-size: 0.78rem; display: flex; flex-direction: column; gap: 4px; color: #475569;">
            <li><strong>Total de cargos:</strong> ${rolesCount}</li>
            <li><strong>Total de colaboradores:</strong> ${sectorMembersCount}</li>
            <li><strong>Nível hierárquico:</strong> Nível 2 (Abaixo da Diretoria)</li>
            <li><strong>Responsável:</strong> ${managerName}</li>
          </ul>
        </div>

        <div class="eq-side-actions" style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
          <button class="eq-btn-side-dark" id="side-btn-ver-funcs" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; background: #0f172a; color: #fff; border: none;">
            <i data-lucide="list"></i> Ver funções do setor
          </button>
          <a href="documentos.html?setor=${id}" class="eq-btn-side-outline" style="text-decoration: none; box-sizing: border-box; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff;">
            <i data-lucide="folder-open"></i> Ver documentos do setor
          </a>
          <button class="eq-btn-side-outline" id="side-shortcut-edit" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff; cursor: pointer;">
            <i data-lucide="edit"></i> Editar setor
          </button>
          <button class="eq-btn-side-dashed" id="side-btn-add-role-sector" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1px dashed #cbd5e1; background: transparent; cursor: pointer; color: #64748b;">
            + Adicionar cargo
          </button>
        </div>

        <div style="margin-top: 16px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Cargos do setor</h4>
          <div class="eq-side-list" style="display: flex; flex-direction: column; gap: 6px;">
            ${sectorObj.roles.map(role => {
              const members = getProfilesForRole(role.key);
              return `
                <div class="eq-side-list-item side-role-item-link" data-role-link-key="${role.key}" style="cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                  <div class="eq-side-list-item-left">
                    <strong style="font-size: 0.8rem; color: #0f172a; display: block;">${role.title}</strong>
                    <span style="font-size: 0.72rem; color: #64748b;">${members.length} ${members.length === 1 ? 'pessoa' : 'pessoas'}</span>
                  </div>
                  <i data-lucide="chevron-right" style="color: #94a3b8; font-size: 0.7rem;"></i>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;

      // Binds
      activeContent.querySelector("#btn-close-sidebar").onclick = () => {
        state.selectedItem = null;
        renderSidebarDetails();
      };

      activeContent.querySelectorAll(".side-role-item-link").forEach(link => {
        link.addEventListener("click", () => {
          const rKey = link.getAttribute("data-role-link-key");
          selectItem('role', rKey, id);
        });
      });

      activeContent.querySelector("#side-btn-ver-funcs")?.addEventListener("click", () => {
        switchTab('funcoes');
        const element = document.getElementById(`functions-${id}`);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      });

      activeContent.querySelector("#side-shortcut-edit")?.addEventListener("click", () => {
        openEditSectorModal(id);
      });

      activeContent.querySelector("#side-btn-add-role-sector")?.addEventListener("click", () => {
        openNewRoleModal(id);
      });

    } else if (type === 'role') {
      const roleObj = sectors.flatMap(s => s.roles).find(r => r.key === id);
      if (!roleObj) return;

      const sectorObj = sectors.find(s => s.roles.some(r => r.key === id));
      const sectorId = sectorObj ? sectorObj.id : "comercial";

      const members = getProfilesForRole(id);
      const functionsList = state.functions.get(id) || [];

      activeContent.innerHTML = `
        <div class="eq-sidebar-header" style="position: relative; padding-bottom: 16px;">
          <button type="button" id="btn-close-sidebar" style="position: absolute; top: 0; right: 0; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8;"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
          <div class="eq-sidebar-title-box" style="margin-top: 10px;">
            <h2 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0;">${roleObj.title}</h2>
            <span class="eq-sidebar-tag eq-tag-role" style="background: rgba(212, 175, 55, 0.08); color: #b58d16; font-weight: 600; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">Cargo selecionado</span>
          </div>
        </div>

        <div style="margin-top: 12px; font-size: 0.78rem; color: #475569;">
          <strong>Setor:</strong> <span>${sectorObj ? sectorObj.title : 'Diretoria'}</span>
        </div>

        <div style="margin-top: 14px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Funções</h4>
          <ol class="eq-functions-list" style="margin: 0; padding-left: 16px; font-size: 0.78rem; color: #475569; line-height: 1.4;">
            ${functionsList.map(func => `<li>${func}</li>`).join("")}
            ${functionsList.length === 0 ? '<li style="list-style:none; margin-left:-16px; color:#94a3b8;">Nenhuma função cadastrada.</li>' : ''}
          </ol>
        </div>

        <div style="margin-top: 14px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Colaboradores vinculados</h4>
          <div class="eq-side-list" style="display: flex; flex-direction: column; gap: 6px;">
            ${members.map(m => `
              <div class="eq-side-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                <div class="eq-side-list-item-left">
                  <strong style="font-size: 0.8rem; color: #0f172a; display: block;">${m.full_name}</strong>
                  <span style="font-size: 0.72rem; color: #64748b;">${m.email}</span>
                </div>
                ${renderProfileAvatar(m, "width: 32px; height: 32px; font-size: 0.85rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #cbd5e1; color: #475569;")}
              </div>
            `).join("")}
            ${members.length === 0 ? '<p style="color:#94a3b8; font-size:0.75rem; margin: 0; font-style: italic;">Nenhum colaborador vinculado.</p>' : ''}
          </div>
        </div>

        <div style="margin-top: 14px;">
          <h4 class="eq-side-section-title" style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 6px;">Documentos relacionados</h4>
          <a href="documentos.html?setor=${sectorId}&cargo=${id}" class="eq-btn-side-outline" style="text-decoration: none; width: 100%; box-sizing: border-box; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff;">
            <i data-lucide="file-text"></i> Ver documentos do cargo
          </a>
        </div>

        <div class="eq-side-actions" style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
          <button class="eq-btn-side-dark" id="side-btn-edit-funcs" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; background: #0f172a; color: #fff; border: none;">
            <i data-lucide="edit-3"></i> Editar funções
          </button>
          <button class="eq-btn-side-outline" id="side-btn-add-colab" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff; cursor: pointer;">
            <i data-lucide="user-plus"></i> Adicionar colaborador
          </button>
          <button class="eq-btn-side-outline" id="side-btn-edit-role" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff; cursor: pointer;">
            <i data-lucide="edit"></i> Editar cargo
          </button>
          ${sectorId !== "diretoria" && id !== "diretor-ceo" ? `<button class="eq-btn-side-delete" id="side-btn-delete-role" type="button">
            <i data-lucide="trash-2"></i> Remover cargo
          </button>` : ""}
        </div>
      `;

      // Binds
      activeContent.querySelector("#btn-close-sidebar").onclick = () => {
        state.selectedItem = null;
        renderSidebarDetails();
      };

      activeContent.querySelector("#side-btn-edit-funcs")?.addEventListener("click", () => {
        switchTab('funcoes');
        const element = document.querySelector(`.job-card[data-role-key="${id}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          element.querySelector(".btn-edit-funcs")?.click();
        }
      });

      activeContent.querySelector("#side-btn-add-colab")?.addEventListener("click", () => {
        openAddColabModal(sectorId, id);
      });

      activeContent.querySelector("#side-btn-edit-role")?.addEventListener("click", () => {
        openEditRoleModal(id);
      });

      activeContent.querySelector("#side-btn-delete-role")?.addEventListener("click", () => {
        removeRole(id);
      });

    } else if (type === 'colaborador') {
      const profile = state.profiles.find(p => p.id === id);
      if (!profile) return;

      const funcs = getEmployeeFunctions(profile);
      const isActive = profile.status !== "inativo";

      const activeSidebarTab = state.activeSidebarTab || 'detalhes';

      activeContent.innerHTML = `
        <div class="eq-sidebar-header" style="position: relative; padding-bottom: 16px;">
          <button type="button" id="btn-close-sidebar" style="position: absolute; top: 0; right: 0; background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8;"><i data-lucide="x" style="width: 18px; height: 18px;"></i></button>
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
            ${renderProfileAvatar(profile, "width: 44px; height: 44px; font-size: 1.1rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #cbd5e1; color: #475569;")}
            <div>
              <h2 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin: 0;">${profile.full_name}</h2>
              <span class="eq-sidebar-tag" style="background: ${isActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; color: ${isActive ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
                ${isActive ? 'Colaborador ativo' : 'Colaborador inativo'}
              </span>
            </div>
          </div>
        </div>

        <div class="eq-sidebar-tabs" style="display: flex; border-bottom: 1.5px solid #e2e8f0; margin-bottom: 16px; gap: 16px;">
          <button type="button" class="eq-sidebar-tab-btn ${activeSidebarTab === 'detalhes' ? 'active' : ''}" data-sidebar-tab="detalhes" style="background:none; border:none; padding:8px 0; font-size:0.8rem; font-weight:600; color:${activeSidebarTab === 'detalhes' ? '#d4af37' : '#64748b'}; cursor:pointer; position:relative;">Detalhes</button>
          <button type="button" class="eq-sidebar-tab-btn ${activeSidebarTab === 'documentos' ? 'active' : ''}" data-sidebar-tab="documentos" style="background:none; border:none; padding:8px 0; font-size:0.8rem; font-weight:600; color:${activeSidebarTab === 'documentos' ? '#d4af37' : '#64748b'}; cursor:pointer; position:relative;">Documentos</button>
        </div>

        <div id="sidebar-tab-pane-content" style="margin-top: 14px;">
          <!-- Populated below -->
        </div>

        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <button class="eq-btn-side-dark" id="side-btn-edit-colab" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; background: #fff; border: 1.5px solid #d4af37; color: #d4af37; font-weight: 700; padding: 10px; border-radius: 8px; cursor: pointer;">
            <i data-lucide="edit"></i> Editar colaborador
          </button>
        </div>
      `;

      const pane = activeContent.querySelector("#sidebar-tab-pane-content");

      if (activeSidebarTab === 'detalhes') {
        pane.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 class="eq-side-section-title" style="margin: 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Funções Vinculadas</h4>
            <button type="button" id="side-btn-add-role-shortcut" style="background: none; border: none; font-size: 0.75rem; font-weight: 600; color: #d4af37; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Adicionar função
            </button>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${funcs.map(f => {
              const secObj = sectors.find(s => s.id === f.sectorId);
              const roleObj = secObj?.roles.find(r => r.key === f.roleKey);
              const sectorTitle = secObj ? secObj.title : f.sectorId;
              const roleTitle = roleObj ? roleObj.title : f.roleKey;
              const sectorIcon = secObj ? secObj.icon : "folder";
              
              const bgClass = getSectorColorClass(f.sectorId);
              
              return `
                <div class="eq-sidebar-function-card" data-sector-id="${f.sectorId}" data-role-key="${f.roleKey}" style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; position: relative;">
                  <div class="eq-sidebar-function-card-left" style="display: flex; align-items: center; gap: 12px;">
                    <div class="eq-sidebar-function-icon-box ${bgClass}" style="width: 32px; height: 32px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                      <i data-lucide="${sectorIcon}" style="width: 16px; height: 16px;"></i>
                    </div>
                    <div class="eq-sidebar-function-text" style="display: flex; flex-direction: column;">
                      <span style="font-size: 0.7rem; color: #64748b;">${sectorTitle}</span>
                      <strong style="font-size: 0.82rem; color: #0f172a; font-weight: 700;">${roleTitle}</strong>
                    </div>
                  </div>
                  <div class="eq-sidebar-function-right" style="display: flex; align-items: center; gap: 8px;">
                    ${f.primary ? `<span class="eq-chip-badge-gold" style="font-size: 0.6rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #d4af37; color: #ffffff; text-transform: uppercase;">Principal</span>` : ''}
                    <button type="button" class="eq-folder-menu-btn side-role-menu-btn" data-sector-id="${f.sectorId}" data-role-key="${f.roleKey}">
                      <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
                    </button>
                    <div class="eq-context-menu" style="display: none; min-width: 160px; right: 12px; top: 32px; position: absolute; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); flex-direction: column; padding: 4px; z-index: 50;">
                      ${!f.primary ? `<button type="button" class="set-primary-role" data-sector-id="${f.sectorId}" data-role-key="${f.roleKey}" style="background: none; border: none; padding: 6px 8px; font-size: 0.74rem; font-weight: 600; color: #475569; text-align: left; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px;"><i data-lucide="star" style="width:14px; height:14px;"></i> Definir como principal</button>` : ''}
                      <a href="documentos.html?setor=${f.sectorId}&cargo=${f.roleKey}&colaborador=${encodeURIComponent(profile.full_name)}" class="view-role-docs" style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 0.74rem; font-weight: 600; color: #475569; text-decoration: none;"><i data-lucide="file-text" style="width: 14px; height: 14px;"></i> Ver documentos</a>
                      ${funcs.length > 1 ? `<button type="button" class="delete remove-role" data-sector-id="${f.sectorId}" data-role-key="${f.roleKey}" style="background: none; border: none; padding: 6px 8px; font-size: 0.74rem; font-weight: 600; color: #ef4444; text-align: left; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i> Remover função</button>` : ''}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;

        pane.querySelectorAll(".side-role-menu-btn").forEach(btn => {
          const card = btn.closest(".eq-sidebar-function-card");
          const menu = card.querySelector(".eq-context-menu");
          btn.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll(".eq-context-menu").forEach(el => {
              if (el !== menu) el.style.display = "none";
            });
            menu.style.display = menu.style.display === "flex" ? "none" : "flex";
          };
        });

        pane.querySelectorAll(".set-primary-role").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const secId = btn.dataset.sectorId;
            const rKey = btn.dataset.roleKey;
            
            const updatedFuncs = funcs.map(f => ({
              ...f,
              primary: f.sectorId === secId && f.roleKey === rKey
            }));
            
            saveEmployeeFunctions(profile.id, updatedFuncs);
            saveProfiles();
            renderOrganograma();
            renderListView();
            renderSidebarDetails();
          };
        });

        pane.querySelectorAll(".remove-role").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const secId = btn.dataset.sectorId;
            const rKey = btn.dataset.roleKey;
            
            const removed = funcs.find(f => f.sectorId === secId && f.roleKey === rKey);
            let updatedFuncs = funcs.filter(f => !(f.sectorId === secId && f.roleKey === rKey));
            
            if (removed && removed.primary && updatedFuncs.length > 0) {
              updatedFuncs[0].primary = true;
            }
            
            saveEmployeeFunctions(profile.id, updatedFuncs);
            saveProfiles();
            renderOrganograma();
            renderListView();
            renderSidebarDetails();
          };
        });

        pane.querySelector("#side-btn-add-role-shortcut").onclick = () => {
          openQuickRoleModal(profile.id);
        };

      } else {
        pane.innerHTML = `
          <h4 class="eq-side-section-title" style="margin: 0 0 10px 0; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">Documentação</h4>
          <p style="font-size: 0.78rem; line-height: 1.4; margin-bottom: 12px; color: #475569;">Visualizar todos os documentos vinculados ao colaborador.</p>
          
          <a href="documentos.html?colaborador=${encodeURIComponent(profile.full_name)}" class="eq-btn-side-outline" style="text-decoration: none; width: 100%; box-sizing: border-box; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; border: 1.5px solid #cbd5e1; color: #475569; background: #fff;">
            <i data-lucide="file-text"></i> Ver todos os documentos (${hasDocuments(profile) ? '8' : '0'})
          </a>
        `;
      }

      activeContent.querySelector("#btn-close-sidebar").onclick = () => {
        state.selectedItem = null;
        renderSidebarDetails();
      };

      activeContent.querySelectorAll(".eq-sidebar-tab-btn").forEach(btn => {
        btn.onclick = () => {
          state.activeSidebarTab = btn.dataset.sidebarTab;
          renderSidebarDetails();
        };
      });

      activeContent.querySelector("#side-btn-edit-colab").onclick = () => {
        openColabModal(profile.id);
      };
    }

    refreshIcons();
  };

  // Switch between Left Main tabs
  const switchTab = (tabName) => {
    state.activeTab = tabName;

    // Toggle active classes on tab buttons
    document.querySelectorAll(".eq-tab-btn").forEach(btn => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Toggle tab pane visibility
    document.getElementById("pane-hierarquia").style.display = tabName === 'hierarquia' ? 'block' : 'none';
    document.getElementById("pane-funcoes").style.display = tabName === 'funcoes' ? 'block' : 'none';
    document.getElementById("pane-lista").style.display = tabName === 'lista' ? 'block' : 'none';
    document.getElementById("pane-equipes").style.display = tabName === 'equipes' ? 'block' : 'none';

    // Sidebar toggles
    const mainGrid = document.querySelector(".eq-main-grid");
    const detailsSidebarContent = document.getElementById("eq-sidebar-content");
    const detailsSidebarPlaceholder = document.getElementById("eq-sidebar-placeholder");
    const listFiltersSidebar = document.getElementById("list-filters-sidebar");
    const sidebar = document.getElementById("eq-sidebar");

    if (tabName === 'hierarquia') {
      // Show sidebar with Details layout
      if (mainGrid) mainGrid.classList.remove("hide-sidebar");
      if (sidebar) sidebar.style.display = "block";
      if (listFiltersSidebar) listFiltersSidebar.style.display = "none";
      
      // Show details placeholder or active content
      if (state.selectedItem) {
        if (detailsSidebarPlaceholder) detailsSidebarPlaceholder.style.display = "none";
        if (detailsSidebarContent) detailsSidebarContent.style.display = "block";
      } else {
        if (detailsSidebarPlaceholder) detailsSidebarPlaceholder.style.display = "flex";
        if (detailsSidebarContent) detailsSidebarContent.style.display = "none";
      }
      
      renderOrganograma();
    } else if (tabName === 'funcoes') {
      // Hide right sidebar completely, making cargos board 100% width
      if (mainGrid) mainGrid.classList.add("hide-sidebar");
      if (sidebar) sidebar.style.display = "none";
      
      renderRolesAndFunctions();
    } else if (tabName === 'lista') {
      // Hide the main right sidebar completely, making the main content area 100% width
      if (mainGrid) mainGrid.classList.add("hide-sidebar");
      if (sidebar) sidebar.style.display = "none";
      if (listFiltersSidebar) listFiltersSidebar.style.display = "block";

      // Reset and apply filters for the list
      populateFilterCargos('todos');
      applyListFilters();
    } else if (tabName === 'equipes') {
      if (mainGrid) mainGrid.classList.add("hide-sidebar");
      if (sidebar) sidebar.style.display = "none";
      if (listFiltersSidebar) listFiltersSidebar.style.display = "none";
      populateTeamCoordinatorSelect();
      if (!state.commercialTeamsLoaded) loadCommercialTeams();
      else renderCommercialTeams();
    }

    performSearch(); // Reapply search filter if any
    renderSidebarDetails();
  };

  // Drag-scroll for hierarchical sectors container
  const setupDragScroll = () => {
    const container = document.getElementById("eq-sectors-scroll");
    if (!container) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener("mousedown", (e) => {
      if (e.target.closest("button, a, input, select, .eq-sector-card, .eq-role-pill")) return;
      isDown = true;
      container.classList.add("active");
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener("mouseleave", () => {
      isDown = false;
      container.classList.remove("active");
    });

    container.addEventListener("mouseup", () => {
      isDown = false;
      container.classList.remove("active");
    });

    container.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    });
  };

  // Modals & Flows
  const openNewSectorModal = () => {
    const name = prompt("Nome do novo setor:");
    if (!name) return;
    const desc = prompt("Descrição curta do setor:");
    alert(`Setor "${name}" criado com sucesso! (Fluxo visual simulado)`);
  };

  const openNewRoleModal = (sectorId = "comercial") => {
    const sectorObj = sectors.find((sector) => sector.id === sectorId) || sectors.find((sector) => sector.id === "comercial");
    if (!sectorObj) return;

    const title = prompt("Nome do novo cargo:");
    if (!title) return;

    const baseKey = slugifyRoleKey(title);
    if (!baseKey) {
      alert("Digite um nome valido para o cargo.");
      return;
    }

    const allRoleKeys = new Set(sectors.flatMap((sector) => sector.roles.map((role) => role.key)));
    let roleKey = baseKey;
    let suffix = 2;
    while (allRoleKeys.has(roleKey)) {
      roleKey = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const removedRoles = loadRemovedRoles();
    removedRoles.delete(roleKey);
    saveRemovedRoles(removedRoles);

    const newRole = {
      key: roleKey,
      title: title.trim(),
      sub: prompt("Descricao curta do cargo (opcional):")?.trim() || "Novo cargo",
    };

    sectorObj.roles.push(newRole);
    rolesData[roleKey] = {
      desc: `Responsabilidades do cargo ${newRole.title}.`,
      access: ["Empresa", "Documentos"],
      files: [],
      commission: "Campo reservado para regra de comissão.",
      lastEdit: "Cargo criado agora",
      lastTime: "Agora",
    };

    if (!state.functions.has(roleKey)) {
      state.functions.set(roleKey, [
        `Responsabilidade 1 do cargo ${newRole.title}.`,
        `Responsabilidade 2 do cargo ${newRole.title}.`,
        "Reportar andamento de metas do setor.",
      ]);
      saveRoleFunctionsLocal(roleKey, state.functions.get(roleKey));
    }

    saveOrderToLocalStorage();
    saveRolesSnapshotToLocalStorage();

    renderSummaryCards();
    renderOrganograma();
    renderRolesAndFunctions();
    renderListView();
    renderSidebarDetails();
    populateFilterCargos(listFilters.sector || "todos");
    applySearch();
    refreshIcons();
    selectItem("role", roleKey, sectorObj.id);
  };

  const openColabModal = (profileId = null) => {
    const modal = document.getElementById("colab-modal");
    const formEl = document.getElementById("colab-form");
    const modalTitle = document.getElementById("colab-modal-title");
    const rolesContainer = document.getElementById("modal-roles-container");
    
    if (!modal || !formEl || !rolesContainer) return;
    
    modal.style.display = "flex";
    formEl.reset();
    rolesContainer.innerHTML = "";
    
    let tempRolesList = []; // Holds temporary roles array during editing
    
    const renderModalRolesList = () => {
      rolesContainer.innerHTML = "";
      
      if (tempRolesList.length === 0) {
        rolesContainer.innerHTML = `<p style="color:#94a3b8; font-size:0.75rem; margin:0; font-style:italic;">Nenhuma função vinculada.</p>`;
        return;
      }
      
      tempRolesList.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "modal-role-row";
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 1fr auto auto";
        row.style.gap = "10px";
        row.style.alignItems = "end";
        row.style.padding = "10px";
        row.style.border = "1px solid #e2e8f0";
        row.style.borderRadius = "8px";
        row.style.background = "#f8fafc";
        row.style.marginBottom = "8px";
        
        // 1. Setor Selector wrapper
        const secWrapper = document.createElement("div");
        secWrapper.style.display = "flex";
        secWrapper.style.flexDirection = "column";
        secWrapper.style.gap = "4px";
        
        const secLabel = document.createElement("span");
        secLabel.textContent = "Setor *";
        secLabel.style.fontSize = "0.72rem";
        secLabel.style.fontWeight = "600";
        secLabel.style.color = "#475569";
        secWrapper.appendChild(secLabel);
        
        const secSelect = document.createElement("select");
        secSelect.style.width = "100%";
        secSelect.style.padding = "6px 8px";
        secSelect.style.fontSize = "0.78rem";
        secSelect.style.borderRadius = "6px";
        secSelect.style.border = "1px solid #cbd5e1";
        secSelect.style.background = "#fff";
        secSelect.style.color = "#0f172a";
        
        sectors.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.id;
          opt.textContent = s.title;
          secSelect.appendChild(opt);
        });
        secSelect.value = item.sectorId;
        secWrapper.appendChild(secSelect);
        
        // 2. Cargo Selector wrapper
        const roleWrapper = document.createElement("div");
        roleWrapper.style.display = "flex";
        roleWrapper.style.flexDirection = "column";
        roleWrapper.style.gap = "4px";
        
        const roleLabel = document.createElement("span");
        roleLabel.textContent = "Cargo *";
        roleLabel.style.fontSize = "0.72rem";
        roleLabel.style.fontWeight = "600";
        roleLabel.style.color = "#475569";
        roleWrapper.appendChild(roleLabel);
        
        const roleSelect = document.createElement("select");
        roleSelect.style.width = "100%";
        roleSelect.style.padding = "6px 8px";
        roleSelect.style.fontSize = "0.78rem";
        roleSelect.style.borderRadius = "6px";
        roleSelect.style.border = "1px solid #cbd5e1";
        roleSelect.style.background = "#fff";
        roleSelect.style.color = "#0f172a";
        
        const updateRolesDropdown = () => {
          roleSelect.innerHTML = "";
          const chosenSectorId = secSelect.value;
          const sectorObj = sectors.find(s => s.id === chosenSectorId);
          if (sectorObj) {
            sectorObj.roles.forEach(r => {
              const opt = document.createElement("option");
              opt.value = r.key;
              opt.textContent = r.title;
              roleSelect.appendChild(opt);
            });
          }
        };
        
        secSelect.onchange = () => {
          item.sectorId = secSelect.value;
          updateRolesDropdown();
          item.roleKey = roleSelect.value;
        };
        
        updateRolesDropdown();
        roleSelect.value = item.roleKey;
        roleSelect.onchange = () => {
          item.roleKey = roleSelect.value;
        };
        roleWrapper.appendChild(roleSelect);
        
        // 3. Primary Switch wrapper
        const switchLabelWrapper = document.createElement("div");
        switchLabelWrapper.style.display = "flex";
        switchLabelWrapper.style.flexDirection = "column";
        switchLabelWrapper.style.gap = "6px";
        switchLabelWrapper.style.alignItems = "center";
        switchLabelWrapper.style.paddingBottom = "4px";
        
        const switchLabel = document.createElement("span");
        switchLabel.textContent = "Função principal";
        switchLabel.style.fontSize = "0.72rem";
        switchLabel.style.fontWeight = "600";
        switchLabel.style.color = "#475569";
        switchLabelWrapper.appendChild(switchLabel);
        
        const switchWrapper = document.createElement("label");
        switchWrapper.className = "eq-switch";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.primary;
        
        const slider = document.createElement("span");
        slider.className = "eq-slider";
        
        checkbox.onchange = () => {
          if (checkbox.checked) {
            tempRolesList.forEach((r, idx) => {
              r.primary = (idx === index);
            });
          } else {
            // Force active at least one
            checkbox.checked = true;
          }
          renderModalRolesList();
        };
        
        switchWrapper.appendChild(checkbox);
        switchWrapper.appendChild(slider);
        switchLabelWrapper.appendChild(switchWrapper);
        
        // 4. Delete button (Trash icon)
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.style.background = "none";
        delBtn.style.border = "none";
        delBtn.style.color = "#ef4444";
        delBtn.style.cursor = "pointer";
        delBtn.style.padding = "8px 4px";
        delBtn.style.display = "flex";
        delBtn.style.alignItems = "center";
        delBtn.style.justifyContent = "center";
        delBtn.style.alignSelf = "end";
        delBtn.style.paddingBottom = "6px";
        delBtn.innerHTML = `<i data-lucide="trash-2" style="width: 18px; height: 18px;"></i>`;
        
        delBtn.onclick = () => {
          const removedPrimary = item.primary;
          tempRolesList.splice(index, 1);
          if (removedPrimary && tempRolesList.length > 0) {
            tempRolesList[0].primary = true;
          }
          renderModalRolesList();
        };
        
        // Assemble row
        row.appendChild(secWrapper);
        row.appendChild(roleWrapper);
        row.appendChild(switchLabelWrapper);
        row.appendChild(delBtn);
        
        rolesContainer.appendChild(row);
      });
      
      refreshIcons();
    };
    
    if (profileId) {
      // Edit Mode
      const profile = state.profiles.find(p => p.id === profileId);
      if (!profile) return;
      
      modalTitle.innerHTML = `<i data-lucide="edit" style="color: #d4af37;"></i> Editar colaborador`;
      formEl.elements.colabId.value = profile.id;
      formEl.elements.colabName.value = profile.full_name;
      formEl.elements.colabEmail.value = profile.email;
      formEl.elements.colabStatus.value = profile.status === "inativo" ? "inativo" : "ativo";
      
      // Load current functions
      const currentFuncs = getEmployeeFunctions(profile);
      tempRolesList = currentFuncs.map(f => ({ ...f }));
      
    } else {
      // Add Mode
      modalTitle.innerHTML = `<i data-lucide="user-plus" style="color: #d4af37;"></i> Adicionar colaborador`;
      formEl.elements.colabId.value = "";
      formEl.elements.colabName.value = "";
      formEl.elements.colabEmail.value = "";
      formEl.elements.colabStatus.value = "ativo";
      
      // Add one default function
      tempRolesList = [
        {
          sectorId: "comercial",
          roleKey: "vendedor",
          primary: true
        }
      ];
    }
    
    renderModalRolesList();
    
    // Add role button inside modal
    document.getElementById("btn-modal-add-role").onclick = () => {
      const sectorObj = sectors[0];
      const roleKey = sectorObj ? sectorObj.roles[0]?.key : "vendedor";
      
      const duplicate = tempRolesList.some(r => r.sectorId === sectorObj.id && r.roleKey === roleKey);
      if (duplicate && tempRolesList.length > 0) {
        alert("Esta função já está vinculada. Modifique a função existente.");
        return;
      }
      
      tempRolesList.push({
        sectorId: sectorObj.id,
        roleKey: roleKey,
        primary: tempRolesList.length === 0
      });
      renderModalRolesList();
    };
    
    // Form submission
    formEl.onsubmit = async (e) => {
      e.preventDefault();
      
      const idVal = formEl.elements.colabId.value;
      const nameVal = formEl.elements.colabName.value.trim();
      const emailVal = formEl.elements.colabEmail.value.trim();
      const statusVal = formEl.elements.colabStatus.value;
      
      if (tempRolesList.length === 0) {
        alert("O colaborador deve possuir pelo menos uma função vinculada.");
        return;
      }
      
      const seenCombinations = new Set();
      let hasDuplicates = false;
      tempRolesList.forEach(r => {
        const key = `${r.sectorId}-${r.roleKey}`;
        if (seenCombinations.has(key)) {
          hasDuplicates = true;
        }
        seenCombinations.add(key);
      });
      
      if (hasDuplicates) {
        alert("Não é permitido adicionar a mesma combinação de setor e cargo duas vezes.");
        return;
      }
      
      const primaryCount = tempRolesList.filter(r => r.primary).length;
      if (primaryCount === 0 && tempRolesList.length > 0) {
        tempRolesList[0].primary = true;
      } else if (primaryCount > 1) {
        let foundFirst = false;
        tempRolesList.forEach(r => {
          if (r.primary) {
            if (foundFirst) r.primary = false;
            foundFirst = true;
          }
        });
      }
      
      if (idVal) {
        // Edit Mode saving
        const profile = state.profiles.find(p => p.id === idVal);
        if (profile) {
          profile.full_name = nameVal;
          profile.email = emailVal;
          profile.status = statusVal;
          
          saveEmployeeFunctions(profile.id, tempRolesList);
        }
      } else {
        // Add Mode saving
        const newId = `colab-${Date.now()}`;
        const newProfile = {
          id: newId,
          full_name: nameVal,
          email: emailVal,
          status: statusVal,
          role: tempRolesList.find(r => r.primary)?.roleKey || "vendedor"
        };
        state.profiles.push(newProfile);
        saveEmployeeFunctions(newId, tempRolesList);
      }
      
      const saved = await saveProfiles();
      if (!saved) {
        await loadProfiles();
        alert("Não foi possível salvar o colaborador no Supabase. Nenhuma alteração foi confirmada.");
        return;
      }
      modal.style.display = "none";
      
      // Refresh UI
      renderSummaryCards();
      if (state.activeTab === 'hierarquia') renderOrganograma();
      else if (state.activeTab === 'lista') {
        populateFilterCargos('todos');
        applyListFilters();
      }
      
      if (state.selectedItem) {
        renderSidebarDetails();
      }
      
      alert(idVal ? "Colaborador atualizado com sucesso!" : "Colaborador criado com sucesso!");
    };
    
    document.getElementById("btn-close-colab-modal").onclick = () => {
      modal.style.display = "none";
    };
    document.getElementById("btn-cancel-colab").onclick = () => {
      modal.style.display = "none";
    };
  };

  const openQuickRoleModal = (profileId) => {
    const modal = document.getElementById("quick-role-modal");
    const formEl = document.getElementById("quick-role-form");
    if (!modal || !formEl) return;
    
    modal.style.display = "flex";
    formEl.reset();
    
    const secSelect = formEl.elements.quickSector;
    const roleSelect = formEl.elements.quickRole;
    
    secSelect.innerHTML = "";
    sectors.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.title;
      secSelect.appendChild(opt);
    });
    
    const updateRolesList = () => {
      roleSelect.innerHTML = "";
      const chosenSectorId = secSelect.value;
      const sectorObj = sectors.find(s => s.id === chosenSectorId);
      if (sectorObj) {
        sectorObj.roles.forEach(r => {
          const opt = document.createElement("option");
          opt.value = r.key;
          opt.textContent = r.title;
          roleSelect.appendChild(opt);
        });
      }
    };
    
    secSelect.onchange = updateRolesList;
    updateRolesList();
    
    formEl.onsubmit = async (e) => {
      e.preventDefault();
      const sectorId = secSelect.value;
      const roleKey = roleSelect.value;
      const isPrimary = formEl.elements.quickPrimary.checked;
      
      const profile = state.profiles.find(p => p.id === profileId);
      if (!profile) return;
      
      const funcs = getEmployeeFunctions(profile);
      
      const duplicate = funcs.some(f => f.sectorId === sectorId && f.roleKey === roleKey);
      if (duplicate) {
        alert("Este colaborador já possui esta função vinculada.");
        return;
      }
      
      let updatedFuncs = [...funcs];
      if (isPrimary) {
        updatedFuncs = updatedFuncs.map(f => ({ ...f, primary: false }));
      }
      
      updatedFuncs.push({
        sectorId,
        roleKey,
        primary: isPrimary || updatedFuncs.length === 0
      });
      
      saveEmployeeFunctions(profile.id, updatedFuncs);
      const saved = await saveProfiles();
      if (!saved) {
        await loadProfiles();
        alert("Não foi possível salvar a função principal no Supabase.");
        return;
      }
      
      modal.style.display = "none";
      renderOrganograma();
      renderListView();
      renderSidebarDetails();
    };
    
    document.getElementById("btn-close-quick-role").onclick = () => {
      modal.style.display = "none";
    };
    document.getElementById("btn-cancel-quick-role").onclick = () => {
      modal.style.display = "none";
    };
    
    refreshIcons();
  };

  const openAddColabModal = (sectorId = null, roleKey = null) => {
    openColabModal();
    
    if (sectorId || roleKey) {
      const modal = document.getElementById("colab-modal");
      const rolesContainer = document.getElementById("modal-roles-container");
      if (modal && rolesContainer) {
        const secSelect = rolesContainer.querySelector("select");
        if (secSelect) {
          if (sectorId) secSelect.value = sectorId;
          secSelect.dispatchEvent(new Event('change'));
          const roleSelect = rolesContainer.querySelectorAll("select")[1];
          if (roleSelect && roleKey) {
            roleSelect.value = roleKey;
            roleSelect.dispatchEvent(new Event('change'));
          }
        }
      }
    }
  };

  const openEditColabModal = (profileId) => {
    renderListView();
  };

  const openEditSectorModal = (sectorId) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const newTitle = prompt("Editar nome do setor:", sector.title);
    if (newTitle) sector.title = newTitle;
    const newDesc = prompt("Editar descrição curta:", sector.description);
    if (newDesc) sector.description = newDesc;

    alert("Setor atualizado!");
    renderOrganograma();
    renderSidebarDetails();
  };

  const openEditRoleModal = (roleKey) => {
    const role = sectors.flatMap(s => s.roles).find(r => r.key === roleKey);
    if (!role) return;
    const newTitle = prompt("Editar nome do cargo:", role.title);
    if (newTitle) role.title = newTitle;
    alert("Cargo atualizado!");
    renderOrganograma();
    renderSidebarDetails();
  };

  // Bind initial page load
  const init = async () => {
    const now = new Date();
    state.teamPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const teamMonthSelect = document.getElementById("eq-team-filter-month");
    const teamYearSelect = document.getElementById("eq-team-filter-year");
    const applyTeamFilterButton = document.getElementById("eq-team-apply-filter");
    const currentMonthButton = document.getElementById("eq-team-current-month");

    if (teamMonthSelect && teamYearSelect) {
      const currentYear = now.getFullYear();
      for (let year = currentYear + 1; year >= currentYear - 5; year -= 1) {
        const option = document.createElement("option");
        option.value = String(year);
        option.textContent = String(year);
        teamYearSelect.appendChild(option);
      }
      teamMonthSelect.value = String(now.getMonth() + 1).padStart(2, "0");
      teamYearSelect.value = String(currentYear);

      const applySelectedTeamPeriod = async () => {
        const nextPeriod = `${teamYearSelect.value}-${teamMonthSelect.value}`;
        if (!/^\d{4}-\d{2}$/.test(nextPeriod)) return;
        state.teamPeriod = nextPeriod;
        applyTeamFilterButton.disabled = true;
        currentMonthButton.disabled = true;
        try {
          if (state.activeTab === "equipes") await loadCommercialTeams();
        } finally {
          applyTeamFilterButton.disabled = false;
          currentMonthButton.disabled = false;
        }
      };

      applyTeamFilterButton?.addEventListener("click", applySelectedTeamPeriod);
      currentMonthButton?.addEventListener("click", async () => {
        const today = new Date();
        teamMonthSelect.value = String(today.getMonth() + 1).padStart(2, "0");
        teamYearSelect.value = String(today.getFullYear());
        await applySelectedTeamPeriod();
      });
    }

    // 1. Setup Tab switching click listeners
    document.querySelectorAll(".eq-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    // 2. Setup Top right actions
    document.querySelector(".btn-new-sector")?.addEventListener("click", openNewSectorModal);
    document.querySelector(".btn-new-role")?.addEventListener("click", () => openNewRoleModal("comercial"));
    document.getElementById("btn-new-colab-header")?.addEventListener("click", () => openColabModal());
    document.getElementById("eq-team-create-form")?.addEventListener("submit", createCommercialTeam);
    setupTeamGoalsListeners();
    showTeamGoalsButton();

    // 3. Setup Bottom quick actions strip
    document.querySelector(".btn-action-add-member")?.addEventListener("click", () => openAddColabModal());
    document.querySelector(".btn-action-transfer")?.addEventListener("click", () => {
      const email = prompt("Digite o e-mail do colaborador a transferir:");
      if (!email) return;
      const targetRole = prompt("Digite a chave do novo cargo (ex: coordenador-comercial):");
      if (!targetRole) return;

      const profile = state.profiles.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
      if (profile) {
        const sectorObj = sectors.find(s => s.roles.some(r => r.key === targetRole));
        const sectorId = sectorObj ? sectorObj.id : "comercial";

        const updatedFuncs = [
          {
            sectorId: sectorId,
            roleKey: targetRole,
            primary: true
          }
        ];
        saveEmployeeFunctions(profile.id, updatedFuncs);
        saveProfiles();

        alert(`Colaborador ${profile.full_name} transferido para ${targetRole}!`);
        renderOrganograma();
        renderListView();
      } else {
        alert("Colaborador não encontrado.");
      }
    });

    document.querySelector(".btn-action-manage-roles")?.addEventListener("click", () => {
      switchTab('funcoes');
    });

    document.querySelector(".btn-action-docs")?.addEventListener("click", () => {
      window.location.href = "documentos.html";
    });

    // 4. Setup search keyup listener
    searchInput?.addEventListener("input", performSearch);

    // 5. Expand / Collapse all actions in Aba 2
    document.getElementById("btn-expand-all")?.addEventListener("click", () => {
      document.querySelectorAll(".job-card").forEach(card => {
        const editor = card.querySelector(".role-editor");
        const viewArea = card.querySelector(".role-functions");
        const editBtn = card.querySelector(".btn-edit-funcs");
        if (editor && viewArea && editBtn) {
          editor.style.display = "block";
          viewArea.style.display = "none";
          editBtn.textContent = "Cancelar";
        }
      });
    });

    document.getElementById("btn-collapse-all")?.addEventListener("click", () => {
      document.querySelectorAll(".job-card").forEach(card => {
        const editor = card.querySelector(".role-editor");
        const viewArea = card.querySelector(".role-functions");
        const editBtn = card.querySelector(".btn-edit-funcs");
        if (editor && viewArea && editBtn) {
          editor.style.display = "none";
          viewArea.style.display = "block";
          editBtn.textContent = "Editar";
        }
      });
    });

    // 5.5 Setup List Sidebar Filter listeners
    const filterSearch = document.getElementById("filter-search");
    const filterSector = document.getElementById("filter-sector");
    const filterRole = document.getElementById("filter-role");
    const filterStatus = document.getElementById("filter-status");
    const btnClearFilters = document.getElementById("btn-clear-filters");
    const btnAddColabList = document.getElementById("btn-add-colab-list");

    const onFilterChange = () => {
      listFilters.search = filterSearch ? filterSearch.value : '';
      listFilters.sector = filterSector ? filterSector.value : 'todos';
      listFilters.role = filterRole ? filterRole.value : 'todos';
      listFilters.status = filterStatus ? filterStatus.value : 'todos';
      applyListFilters();
    };

    filterSearch?.addEventListener("input", onFilterChange);
    filterSector?.addEventListener("change", (e) => {
      populateFilterCargos(e.target.value);
      onFilterChange();
    });
    filterRole?.addEventListener("change", onFilterChange);
    filterStatus?.addEventListener("change", onFilterChange);

    btnClearFilters?.addEventListener("click", () => {
      if (filterSearch) filterSearch.value = '';
      if (filterSector) filterSector.value = 'todos';
      populateFilterCargos('todos');
      if (filterRole) filterRole.value = 'todos';
      if (filterStatus) filterStatus.value = 'todos';
      listFilters.search = '';
      listFilters.sector = 'todos';
      listFilters.role = 'todos';
      listFilters.status = 'todos';
      applyListFilters();
    });

    btnAddColabList?.addEventListener("click", () => {
      openAddColabModal();
    });

    // 6. Fetch profiles and functions
    await loadProfiles();
    populateTeamCoordinatorSelect();
    await loadSavedFunctions();
    applyRolesSnapshotFromLocalStorage();
    applySavedOrder();
    saveRolesSnapshotToLocalStorage();

    // 7. Render summary metric counts
    renderSummaryCards();

    // 8. Render active view
    switchTab('hierarquia');

    // 9. Setup Drag scroll support
    setupDragScroll();
  };

  window.addEventListener("focus", async () => {
    const modalOpen = [...document.querySelectorAll(".eq-modal")].some((modal) => modal.style.display !== "none");
    if (modalOpen) return;
    const loaded = await loadProfiles();
    if (!loaded) return;
    populateTeamCoordinatorSelect();
    renderSummaryCards();
    if (state.activeTab === "hierarquia") renderOrganograma();
    if (state.activeTab === "lista") applyListFilters();
    if (state.activeTab === "equipes") renderCommercialTeams();
    renderSidebarDetails();
  });

  const callTeamGoalsApi = async (action, data) => {
    const { data: { session } } = await window.supabaseClient?.auth.getSession() || {};
    const token = session?.access_token;
    if (!token) throw new Error("Sessao expirada.");
    const resp = await fetch("/api/permissions/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ team_goal_action: action, team_goal_data: data }),
    });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.error || "Erro ao salvar meta.");
    return json;
  };

  const openTeamGoalsModal = async () => {
    const modal = document.getElementById("team-goals-modal");
    if (!modal) return;

    const teamSelect = document.getElementById("tg-team-select");
    const yearSelect = document.getElementById("tg-year");
    const monthSelect = document.getElementById("tg-month");

    teamSelect.innerHTML = '<option value="">Carregando equipes...</option>';
    state.commercialTeams.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      teamSelect.appendChild(opt);
    });

    yearSelect.innerHTML = "";
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
    monthSelect.value = new Date().getMonth() + 1;

    document.getElementById("tg-goal-id").value = "";
    document.getElementById("tg-team-id").value = "";
    document.getElementById("tg-leads-goal").value = "0";
    document.getElementById("tg-appointments-goal").value = "0";
    document.getElementById("tg-closings-goal").value = "0";
    document.getElementById("tg-conversion-goal").value = "0";
    document.getElementById("tg-status").innerHTML = "";
    document.getElementById("tg-delete-btn").style.display = "none";

    const isAdmin = window.isAdminRole?.(window.currentCrmUser?.cargo);
    if (!isAdmin && state.commercialTeams.length === 1) {
      teamSelect.value = state.commercialTeams[0].id;
      teamSelect.disabled = true;
    } else {
      teamSelect.disabled = false;
    }

    modal.style.display = "flex";
    if (typeof lucide !== "undefined") lucide.createIcons();
  };

  const loadGoalForTeamAndMonth = async () => {
    const teamId = document.getElementById("tg-team-select").value;
    const month = parseInt(document.getElementById("tg-month").value, 10);
    const year = parseInt(document.getElementById("tg-year").value, 10);
    if (!teamId || !month || !year) return;

    try {
      const result = await callTeamGoalsApi("list", { team_id: teamId, month, year });
      const goals = result.goals || [];
      if (goals.length) {
        const g = goals[0];
        document.getElementById("tg-goal-id").value = g.id;
        document.getElementById("tg-leads-goal").value = g.leads_goal || 0;
        document.getElementById("tg-appointments-goal").value = g.appointments_goal || 0;
        document.getElementById("tg-closings-goal").value = g.closings_goal || 0;
        document.getElementById("tg-conversion-goal").value = g.conversion_goal || 0;
        document.getElementById("tg-status").innerHTML = '<span style="color: #6b7280;">Meta encontrada e carregada.</span>';
        document.getElementById("tg-delete-btn").style.display = "";
      } else {
        document.getElementById("tg-goal-id").value = "";
        document.getElementById("tg-leads-goal").value = "0";
        document.getElementById("tg-appointments-goal").value = "0";
        document.getElementById("tg-closings-goal").value = "0";
        document.getElementById("tg-conversion-goal").value = "0";
        document.getElementById("tg-status").innerHTML = '<span style="color: #6b7280;">Nenhuma meta definida para este mes.</span>';
        document.getElementById("tg-delete-btn").style.display = "none";
      }
    } catch (err) {
      document.getElementById("tg-status").innerHTML = `<span style="color: #dc2626;">${err.message}</span>`;
    }
  };

  const saveTeamGoal = async (event) => {
    event.preventDefault();
    const statusEl = document.getElementById("tg-status");
    const teamId = document.getElementById("tg-team-select").value;
    const month = parseInt(document.getElementById("tg-month").value, 10);
    const year = parseInt(document.getElementById("tg-year").value, 10);
    if (!teamId || !month || !year) {
      statusEl.innerHTML = '<span style="color: #dc2626;">Selecione equipe, mes e ano.</span>';
      return;
    }

    try {
      statusEl.innerHTML = '<span style="color: #6b7280;">Salvando...</span>';
      await callTeamGoalsApi("save", {
        team_id: teamId,
        month,
        year,
        leads_goal: parseInt(document.getElementById("tg-leads-goal").value, 10) || 0,
        appointments_goal: parseInt(document.getElementById("tg-appointments-goal").value, 10) || 0,
        closings_goal: parseInt(document.getElementById("tg-closings-goal").value, 10) || 0,
        conversion_goal: parseFloat(document.getElementById("tg-conversion-goal").value) || 0,
      });
      statusEl.innerHTML = '<span style="color: #16a34a;">Meta salva com sucesso!</span>';
      setTimeout(() => { statusEl.innerHTML = ""; }, 2000);
    } catch (err) {
      statusEl.innerHTML = `<span style="color: #dc2626;">${err.message}</span>`;
    }
  };

  const deleteTeamGoal = async () => {
    const goalId = document.getElementById("tg-goal-id").value;
    if (!goalId) return;
    if (!confirm("Tem certeza que deseja excluir esta meta?")) return;

    const statusEl = document.getElementById("tg-status");
    try {
      statusEl.innerHTML = '<span style="color: #6b7280;">Excluindo...</span>';
      await callTeamGoalsApi("delete", { goal_id: goalId });
      statusEl.innerHTML = '<span style="color: #16a34a;">Meta excluida!</span>';
      document.getElementById("tg-goal-id").value = "";
      document.getElementById("tg-leads-goal").value = "0";
      document.getElementById("tg-appointments-goal").value = "0";
      document.getElementById("tg-closings-goal").value = "0";
      document.getElementById("tg-conversion-goal").value = "0";
      document.getElementById("tg-delete-btn").style.display = "none";
    } catch (err) {
      statusEl.innerHTML = `<span style="color: #dc2626;">${err.message}</span>`;
    }
  };

  const setupTeamGoalsListeners = () => {
    document.getElementById("eq-team-goals-btn")?.addEventListener("click", openTeamGoalsModal);
    document.getElementById("team-goals-form")?.addEventListener("submit", saveTeamGoal);
    document.getElementById("btn-close-team-goals-modal")?.addEventListener("click", () => {
      document.getElementById("team-goals-modal").style.display = "none";
    });
    document.getElementById("btn-cancel-team-goals")?.addEventListener("click", () => {
      document.getElementById("team-goals-modal").style.display = "none";
    });
    document.getElementById("tg-delete-btn")?.addEventListener("click", deleteTeamGoal);
    document.getElementById("tg-team-select")?.addEventListener("change", loadGoalForTeamAndMonth);
    document.getElementById("tg-month")?.addEventListener("change", loadGoalForTeamAndMonth);
    document.getElementById("tg-year")?.addEventListener("change", loadGoalForTeamAndMonth);
  };

  const showTeamGoalsButton = () => {
    const btn = document.getElementById("eq-team-goals-btn");
    if (!btn) return;
    const user = window.currentCrmUser;
    if (!user) return;
    const role = window.normalizeRole?.(user.cargo) || "";
    const isAdmin = window.isAdminRole?.(user.cargo);
    const teamManagerRoles = ["coordenador-comercial", "supervisor-comercial", "coordenador", "supervisor", "coordenador-rh"];
    if (isAdmin || teamManagerRoles.includes(role)) {
      btn.style.display = "";
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
