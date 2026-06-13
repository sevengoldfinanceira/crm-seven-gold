(function () {
  const board = document.querySelector("[data-role-board]");
  const expandButton = document.querySelector("[data-expand-roles]");
  const collapseButton = document.querySelector("[data-collapse-roles]");
  const rankLinks = Array.from(document.querySelectorAll(".rank-link"));

  const sectors = [
    {
      id: "diretoria",
      order: 1,
      title: "Diretoria",
      description: "Comando, decisao e acesso total.",
      roles: [
        {
          key: "diretor-ceo",
          title: "Diretor / CEO",
          functions: [
            "Definir direcao da empresa.",
            "Acompanhar financeiro, equipe e operacao.",
            "Aprovar permissoes, cargos e regras internas.",
          ],
        },
      ],
    },
    {
      id: "comercial",
      order: 2,
      title: "Comercial",
      description: "Atendimento, venda e conversao de leads.",
      roles: [
        {
          key: "supervisor",
          title: "Supervisor",
          functions: [
            "Acompanhar o desempenho do time comercial.",
            "Validar rotina, metas e prioridade dos atendimentos.",
            "Apoiar coordenadores em decisoes comerciais.",
          ],
        },
        {
          key: "coordenador",
          title: "Coordenador",
          functions: [
            "Distribuir leads e acompanhar retorno.",
            "Orientar vendedores sobre proposta e fechamento.",
            "Reportar resultados para a diretoria.",
          ],
        },
        {
          key: "vendedor",
          title: "Vendedor",
          functions: [
            "Atender leads do CRM.",
            "Registrar andamento e observacoes no pipeline.",
            "Enviar proposta e conduzir fechamento.",
          ],
        },
        {
          key: "assistente-vendas",
          title: "Assistente de Vendas",
          functions: [
            "Organizar dados iniciais do lead.",
            "Confirmar contato e documentos basicos.",
            "Encaminhar oportunidade para vendedor.",
          ],
        },
      ],
    },
    {
      id: "pos-venda",
      order: 3,
      title: "Pos-venda",
      description: "Acompanhamento depois do fechamento.",
      roles: [
        {
          key: "pos-vendas",
          title: "Pos-vendas",
          functions: [
            "Acompanhar cliente apos venda.",
            "Registrar pendencias e retornos.",
            "Acionar financeiro ou comercial quando necessario.",
          ],
        },
      ],
    },
    {
      id: "administrativo",
      order: 4,
      title: "Administrativo",
      description: "Organizacao interna e apoio operacional.",
      roles: [
        {
          key: "administrativo",
          title: "Administrativo",
          functions: [
            "Organizar processos internos.",
            "Controlar cadastros e arquivos administrativos.",
            "Apoiar diretoria, financeiro e equipe.",
          ],
        },
      ],
    },
    {
      id: "financeiro",
      order: 5,
      title: "Financeiro",
      description: "Controle de valores, contas e repasses.",
      roles: [
        {
          key: "financeiro-contador",
          title: "Financeiro / Contador",
          functions: [
            "Controlar entradas, saidas e caixa.",
            "Conferir comissoes, repasses e comprovantes.",
            "Manter documentos financeiros organizados.",
          ],
        },
      ],
    },
    {
      id: "juridico",
      order: 6,
      title: "Juridico",
      description: "Contratos, analises e seguranca legal.",
      roles: [
        {
          key: "advogado-juridico",
          title: "Advogado / Juridico",
          functions: [
            "Analisar contratos e documentos juridicos.",
            "Apoiar a diretoria em decisoes legais.",
            "Manter modelos e pareceres atualizados.",
          ],
        },
      ],
    },
    {
      id: "rh",
      order: 7,
      title: "RH",
      description: "Gestao de pessoas e documentacao.",
      roles: [
        {
          key: "rh",
          title: "RH",
          functions: [
            "Organizar dados e documentos da equipe.",
            "Acompanhar entrada, saida e mudanca de cargo.",
            "Apoiar regras internas e comunicados.",
          ],
        },
      ],
    },
    {
      id: "marketing",
      order: 8,
      title: "Marketing",
      description: "Campanhas, materiais e captacao.",
      roles: [
        {
          key: "marketing-cargo",
          title: "Marketing",
          functions: [
            "Criar campanhas e materiais de divulgacao.",
            "Acompanhar origem dos leads.",
            "Organizar identidade visual e criativos.",
          ],
        },
      ],
    },
  ];

  const getClient = () => window.sevenGoldAuth;
  const roleMap = new Map(sectors.flatMap((sector) => sector.roles.map((role) => [role.key, role])));

  const waitForUser = async () => {
    const client = getClient();

    if (!client) {
      return null;
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getUser();

      if (data.user) {
        return data.user;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  };

  const parseFunctions = (value) =>
    String(value || "")
      .split("\n")
      .map((item) => item.replace(/^\s*\d+[\).\-\s]+/, "").trim())
      .filter(Boolean);

  const createFunctionList = (functions) => {
    const list = document.createElement("ol");
    functions.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    return list;
  };

  const setCardStatus = (card, message, type = "error") => {
    const status = card.querySelector("[data-role-status]");
    status.textContent = message;
    status.dataset.type = type;
  };

  const saveRoleFunctions = async (card, roleKey, functions) => {
    const client = getClient();
    const user = await waitForUser();

    if (!client || !user) {
      setCardStatus(card, "Faca login novamente antes de salvar.");
      return;
    }

    const role = roleMap.get(roleKey);
    const saveButton = card.querySelector("[data-save-functions]");
    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";

    const { error } = await client.from("company_role_functions").upsert(
      {
        role_key: roleKey,
        role_title: role.title,
        functions,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role_key" }
    );

    saveButton.disabled = false;
    saveButton.textContent = "Salvar funcoes";

    if (error) {
      setCardStatus(card, "Nao consegui salvar. Confira se a tabela foi criada no Supabase.");
      return;
    }

    role.functions = functions;
    card.querySelector(".role-functions").replaceChildren(createFunctionList(functions));
    card.classList.remove("editing");
    setCardStatus(card, "Funcoes salvas com sucesso.", "success");
  };

  const createRoleCard = (role) => {
    const card = document.createElement("div");
    card.className = "job-card";
    card.dataset.roleKey = role.key;

    const head = document.createElement("div");
    head.className = "job-card-head";

    const title = document.createElement("h3");
    title.textContent = role.title;

    const actions = document.createElement("div");
    actions.className = "job-actions";

    const docsLink = document.createElement("a");
    docsLink.href = `documentos.html#${role.key}`;
    docsLink.textContent = "Ver documentos";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Editar funcoes";
    editButton.addEventListener("click", () => {
      card.classList.toggle("editing");
      setCardStatus(card, "");
    });

    actions.append(docsLink, editButton);
    head.append(title, actions);

    const functionsWrap = document.createElement("div");
    functionsWrap.className = "role-functions";
    functionsWrap.append(createFunctionList(role.functions));

    const editor = document.createElement("div");
    editor.className = "role-editor";

    const textarea = document.createElement("textarea");
    textarea.rows = 7;
    textarea.value = role.functions.map((item, index) => `${index + 1}. ${item}`).join("\n");

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.dataset.saveFunctions = "";
    saveButton.textContent = "Salvar funcoes";
    saveButton.addEventListener("click", () => {
      saveRoleFunctions(card, role.key, parseFunctions(textarea.value));
    });

    const status = document.createElement("p");
    status.className = "role-save-status";
    status.dataset.roleStatus = "";

    editor.append(textarea, saveButton, status);
    card.append(head, functionsWrap, editor);

    return card;
  };

  const renderSectors = () => {
    if (!board) {
      return;
    }

    board.innerHTML = "";

    sectors.forEach((sector) => {
      const section = document.createElement("article");
      section.className = "role-section";
      section.id = sector.id;

      const header = document.createElement("header");
      const order = document.createElement("span");
      order.textContent = sector.order;

      const copy = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = sector.title;
      const description = document.createElement("p");
      description.textContent = sector.description;
      copy.append(title, description);
      header.append(order, copy);

      const roleGrid = document.createElement("div");
      roleGrid.className = sector.roles.length > 1 ? "job-grid" : "";
      sector.roles.forEach((role) => roleGrid.append(createRoleCard(role)));

      section.append(header, roleGrid);
      board.append(section);
    });
  };

  const loadSavedFunctions = async () => {
    const client = getClient();

    if (!client) {
      renderSectors();
      return;
    }

    const { data } = await client
      .from("company_role_functions")
      .select("role_key, functions");

    (data || []).forEach((row) => {
      const role = roleMap.get(row.role_key);

      if (role && Array.isArray(row.functions) && row.functions.length > 0) {
        role.functions = row.functions;
      }
    });

    renderSectors();
  };

  rankLinks.forEach((link) => {
    link.addEventListener("click", () => {
      rankLinks.forEach((item) => item.classList.remove("active"));
      link.classList.add("active");
    });
  });

  expandButton?.addEventListener("click", () => {
    document.querySelectorAll(".job-card").forEach((card) => card.classList.add("editing"));
  });

  collapseButton?.addEventListener("click", () => {
    document.querySelectorAll(".job-card").forEach((card) => card.classList.remove("editing"));
  });

  document.addEventListener("DOMContentLoaded", loadSavedFunctions);
})();
