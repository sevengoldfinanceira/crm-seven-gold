(function () {
  const head = document.querySelector("[data-permission-head]");
  const body = document.querySelector("[data-permission-body]");
  const userList = document.querySelector("[data-user-list]");
  const userSearch = document.querySelector("[data-user-search]");
  const statusEl = document.querySelector("[data-permission-status]");
  const saveButton = document.querySelector("[data-save-permissions]");
  const reloadButton = document.querySelector("[data-reload-permissions]");
  const auditLog = document.querySelector("[data-audit-log]");
  const addUserButton = document.querySelector("[data-add-user]");
  const userModal = document.querySelector("[data-user-modal]");
  const userForm = document.querySelector("[data-user-form]");
  const userFormStatus = document.querySelector("[data-user-form-status]");
  const userModalTitle = document.querySelector("[data-user-modal-title]");

  const roles = [
    { key: "dono", label: "Dono" },
    { key: "administrador", label: "Administrador" },
    { key: "supervisor", label: "Supervisor" },
    { key: "coordenador", label: "Coordenador" },
    { key: "vendedor", label: "Vendedor" },
    { key: "assistente_vendas", label: "Assistente de Vendas" },
    { key: "home_office", label: "Home Office" },
    { key: "financeiro", label: "Financeiro" },
    { key: "marketing", label: "Marketing" },
    { key: "rh", label: "RH" },
  ];

  const sectors = [
    {
      id: "diretoria",
      title: "Diretoria",
      roles: [
        { key: "diretor-ceo", label: "Diretor CEO" }
      ]
    },
    {
      id: "comercial",
      title: "Comercial",
      roles: [
        { key: "vendedor", label: "Vendedor" },
        { key: "assistente-vendas", label: "Assistente de Vendas" },
        { key: "supervisor-comercial", label: "Supervisor Comercial" },
        { key: "coordenador-comercial", label: "Coordenador Comercial" },
        { key: "home-office", label: "Home Office" }
      ]
    },
    {
      id: "posvenda",
      title: "Pós-Venda",
      roles: [
        { key: "coordenador-posvenda", label: "Coordenador de Pós-Venda" }
      ]
    },
    {
      id: "administrativo",
      title: "Administrativo",
      roles: [
        { key: "coordenador-adm", label: "Coordenador Administrativo" },
        { key: "administrador", label: "Administrador" }
      ]
    },
    {
      id: "financeiro",
      title: "Financeiro",
      roles: [
        { key: "coordenador-financeiro", label: "Coordenador Financeiro" }
      ]
    },
    {
      id: "marketing",
      title: "Marketing",
      roles: [
        { key: "coordenador-mkt", label: "Coordenador de Marketing" }
      ]
    },
    {
      id: "rh",
      title: "Recursos Humanos (RH)",
      roles: [
        { key: "coordenador-rh", label: "Coordenador de RH" }
      ]
    },
    {
      id: "juridico",
      title: "Jurídico",
      roles: [
        { key: "advogado-juridico", label: "Advogado Jurídico" }
      ]
    }
  ];

  const areaIcons = {
    crm: "git-branch",
    empresa: "building-2",
    financeiro: "banknote",
    comissoes: "percent",
    documentos: "file-text",
    equipe: "users",
    organograma: "network",
    relatorios: "bar-chart-3",
    historia_dono: "book-open",
    permissoes: "shield-check",
  };

  const areaFilters = {
    all: null,
    core: ["crm", "financeiro", "comissoes", "documentos"],
    management: ["empresa", "equipe", "organograma", "permissoes"],
    admin: ["permissoes", "empresa", "equipe"],
    data: ["relatorios", "financeiro", "comissoes"],
    content: ["documentos", "historia_dono", "marketing"],
  };

  const areas = [
    { key: "crm", label: "CRM / Pipeline" },
    { key: "empresa", label: "Empresa" },
    { key: "financeiro", label: "Financeiro" },
    { key: "comissoes", label: "Comissoes" },
    { key: "documentos", label: "Documentos" },
    { key: "equipe", label: "Equipe / Cargos" },
    { key: "organograma", label: "Organograma" },
    { key: "relatorios", label: "Relatorios" },
    { key: "historia_dono", label: "Historia do Dono" },
    { key: "permissoes", label: "Permissoes" },
  ];

  const defaultAccess = {
    dono: areas.map((area) => area.key),
    administrador: ["crm", "empresa", "financeiro", "comissoes", "documentos", "equipe", "organograma", "relatorios"],
    coordenador: ["crm", "comissoes", "documentos", "relatorios"],
    supervisor: ["crm", "comissoes", "documentos", "relatorios"],
    home_office: ["crm", "comissoes", "documentos"],
    vendedor: ["crm", "comissoes", "documentos"],
    financeiro: ["empresa", "financeiro", "comissoes", "documentos", "relatorios"],
    marketing: ["empresa", "documentos", "relatorios"],
    rh: ["empresa", "documentos", "equipe", "organograma", "relatorios"],
  };

  const state = {
    permissions: new Map(),
    users: [],
    userSearch: "",
    activeFilter: "all",
  };

  const getClient = () => window.sevenGoldAuth;

  const setStatus = (message, type = "error") => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  const addAuditEntry = (text, dotClass) => {
    if (!auditLog) return;
    const entry = document.createElement("div");
    entry.className = "perm-audit-entry";
    entry.innerHTML =
      '<div class="perm-audit-dot ' + dotClass + '"></div>' +
      '<div><div class="perm-audit-text">' + text + '</div>' +
      '<div class="perm-audit-time">Agora</div></div>';
    auditLog.prepend(entry);
    while (auditLog.children.length > 6) {
      auditLog.removeChild(auditLog.lastChild);
    }
  };

  const updateStats = () => {
    const statActive = document.querySelector("[data-stat-active]");
    const statBlocked = document.querySelector("[data-stat-blocked]");
    if (!statActive || !statBlocked) return;

    statActive.textContent = state.users.filter((user) => user.ativo === true).length;
    statBlocked.textContent = state.users.filter((user) => user.ativo !== true).length;
    const statRoles = document.querySelector("[data-stat-roles]");
    const statAreas = document.querySelector("[data-stat-areas]");
    if (statRoles) statRoles.textContent = roles.length;
    if (statAreas) statAreas.textContent = areas.length;
  };

  const permissionKey = (role, area) => `${role}:${area}`;

  const defaultCanAccess = (role, area) => role === "dono" || defaultAccess[role]?.includes(area);

  const canAccess = (role, area) => {
    if (role === "dono") return true;
    const key = permissionKey(role, area);
    return state.permissions.has(key) ? state.permissions.get(key) : defaultCanAccess(role, area);
  };

  const renderMatrix = () => {
    head.innerHTML = "<th>Area</th>";
    roles.forEach((role) => {
      const th = document.createElement("th");
      th.textContent = role.label;
      head.append(th);
    });

    body.innerHTML = "";
    const filterKeys = areaFilters[state.activeFilter];
    const filteredAreas = filterKeys
      ? areas.filter((a) => filterKeys.includes(a.key))
      : areas;

    filteredAreas.forEach((area) => {
      const row = document.createElement("tr");
      row.dataset.areaIcon = area.key;
      const label = document.createElement("th");

      const icon = areaIcons[area.key] || "circle";
      label.innerHTML =
        '<div class="perm-area-label">' +
        '<span class="perm-area-icon"><i data-lucide="' + icon + '"></i></span>' +
        area.label +
        '</div>';
      row.append(label);

      roles.forEach((role) => {
        const cell = document.createElement("td");
        const toggle = document.createElement("label");
        toggle.className = "permission-toggle";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = canAccess(role.key, area.key);
        input.disabled = role.key === "dono";
        input.dataset.role = role.key;
        input.dataset.area = area.key;

        const track = document.createElement("span");
        track.className = "perm-switch-track";

        const text = document.createElement("span");
        text.className = "perm-switch-label " + (input.checked ? "on-label" : "off-label");
        text.textContent = input.checked ? "Ativo" : "Off";

        input.addEventListener("change", () => {
          text.textContent = input.checked ? "Ativo" : "Off";
          text.className = "perm-switch-label " + (input.checked ? "on-label" : "off-label");
          state.permissions.set(permissionKey(role.key, area.key), input.checked);
          updateStats();
        });

        toggle.append(input, track, text);
        cell.append(toggle);
        row.append(cell);
      });

      body.append(row);
    });

    if (window.lucide) lucide.createIcons();
    updateStats();
  };

  const renderUsers = () => {
    userList.innerHTML = "";

    const search = state.userSearch.trim().toLowerCase();
    const users = state.users.filter((user) => {
      const text = `${user.nome || ""} ${user.email || ""} ${user.cargo || ""}`.toLowerCase();
      return !search || text.includes(search);
    });

    if (users.length === 0) {
      userList.innerHTML = '<p class="permission-note">Nenhum usuario encontrado.</p>';
      return;
    }

    users.forEach((user) => {
      const row = document.createElement("div");
      row.className = "user-access-row";

      const copy = document.createElement("div");
      copy.className = "user-identity";

      const name = document.createElement("strong");
      name.className = "perm-user-name";
      name.textContent = user.nome || "Sem nome";

      const email = document.createElement("span");
      email.className = "perm-user-email";
      email.textContent = user.email || "sem email";

      const meta = document.createElement("div");
      meta.className = "perm-user-meta";
      const role = document.createElement("span");
      role.className = "perm-user-role";
      const isMaster = user.email.toLowerCase().trim() === 'sevengoldfinanceira@gmail.com';
      const resolvedRoleLabel = (() => {
        if (isMaster) {
          return "Dono Master";
        }
        for (const sec of sectors) {
          const r = sec.roles.find(x => x.key === user.cargo);
          if (r) return r.label;
        }
        return roles.find((item) => item.key === user.cargo)?.label || user.cargo || "Sem cargo";
      })();
      role.textContent = resolvedRoleLabel;
      if (isMaster) {
        role.className = "perm-user-role master-role";
      }
      const status = document.createElement("span");
      status.className = `perm-user-status ${user.ativo ? "is-active" : "is-inactive"}`;
      status.textContent = user.ativo ? "Ativo" : "Inativo";
      meta.append(role, status);

      copy.append(name, email, meta);

      const actions = document.createElement("div");
      actions.className = "perm-user-actions";
      const activeToggle = document.createElement("button");
      activeToggle.type = "button";
      activeToggle.className = `perm-user-toggle ${user.ativo ? "is-active" : "is-inactive"}`;
      activeToggle.setAttribute("aria-label", user.ativo ? "Desativar usuario" : "Ativar usuario");
      activeToggle.innerHTML = `<span></span>`;
      
      if (isMaster) {
        activeToggle.disabled = true;
        activeToggle.style.opacity = "0.5";
        activeToggle.style.cursor = "not-allowed";
      } else {
        activeToggle.addEventListener("click", () => toggleUserStatus(user, activeToggle));
      }

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "perm-user-edit";
      editButton.innerHTML = '<i data-lucide="pencil"></i>';
      editButton.addEventListener("click", () => openUserModal(user));
      actions.append(activeToggle, editButton);

      row.append(copy, actions);
      userList.append(row);
    });
    if (window.lucide) lucide.createIcons();
  };

  const setUserFormStatus = (message = "", type = "error") => {
    if (!userFormStatus) return;
    userFormStatus.textContent = message;
    userFormStatus.dataset.type = type;
  };

  const updateCargoOptions = (sectorId, selectedCargo = "") => {
    const cargoSelect = userForm?.elements.cargo;
    if (!cargoSelect) return;
    cargoSelect.innerHTML = "";
    
    if (!sectorId) {
      cargoSelect.innerHTML = '<option value="">Selecione o setor primeiro</option>';
      return;
    }
    
    const sector = sectors.find(s => s.id === sectorId);
    if (sector) {
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Selecione o cargo";
      cargoSelect.appendChild(defaultOpt);

      sector.roles.forEach(r => {
        const opt = document.createElement("option");
        opt.value = r.key;
        opt.textContent = r.label;
        if (r.key === selectedCargo) {
          opt.selected = true;
        }
        cargoSelect.appendChild(opt);
      });
    }
  };

  if (userForm && userForm.elements.setor) {
    userForm.elements.setor.addEventListener("change", () => {
      updateCargoOptions(userForm.elements.setor.value);
    });
  }

  const openUserModal = (user = null) => {
    if (!userModal || !userForm) return;
    userForm.reset();
    setUserFormStatus("");
    userForm.elements.id.value = user?.id || "";
    userForm.elements.nome.value = user?.nome || "";
    userForm.elements.email.value = user?.email || "";
    
    if (user && user.cargo) {
      let userSectorId = "";
      for (const sec of sectors) {
        if (sec.roles.some(r => r.key === user.cargo)) {
          userSectorId = sec.id;
          break;
        }
      }
      userForm.elements.setor.value = userSectorId;
      updateCargoOptions(userSectorId, user.cargo);
    } else {
      userForm.elements.setor.value = "";
      updateCargoOptions("");
    }
    
    userForm.elements.ativo.checked = user ? user.ativo === true : true;
    if (userModalTitle) userModalTitle.textContent = user ? "Editar usuario" : "Adicionar usuario";
    userModal.showModal();
    userForm.elements.nome.focus();
  };

  const closeUserModal = () => userModal?.close();

  const toggleUserStatus = async (user, button) => {
    const client = getClient();
    if (!client || !user?.id) return;
    button.disabled = true;
    const nextActive = user.ativo !== true;
    const { data, error } = await client
      .from("crm_users")
      .update({ ativo: nextActive, updated_at: new Date().toISOString() })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      button.disabled = false;
      setStatus("Nao foi possivel alterar o acesso. Confira as politicas de crm_users.");
      addAuditEntry("<strong>Erro</strong> ao alterar acesso do usuario", "warning");
      return;
    }
    await loadData();
    setStatus(`Usuario ${nextActive ? "ativado" : "desativado"} com sucesso.`, "success");
    addAuditEntry(`<strong>Usuario</strong> ${nextActive ? "ativado" : "desativado"}`, nextActive ? "success" : "warning");
  };

  const saveUser = async (event) => {
    event.preventDefault();
    const client = getClient();
    if (!client || !userForm) return;

    const id = String(userForm.elements.id.value || "").trim();
    const nome = String(userForm.elements.nome.value || "").trim();
    const email = String(userForm.elements.email.value || "").trim().toLowerCase();
    const setor = String(userForm.elements.setor.value || "").trim();
    const cargo = String(userForm.elements.cargo.value || "").trim();
    const ativo = userForm.elements.ativo.checked;
    const submitButton = userForm.querySelector('button[type="submit"]');

    if (!nome || !email || !setor || !cargo) {
      setUserFormStatus("Preencha todos os campos obrigatórios (nome, e-mail, setor e cargo).");
      return;
    }

    let isValidCargo = false;
    for (const sec of sectors) {
      if (sec.roles.some(r => r.key === cargo)) {
        isValidCargo = true;
        break;
      }
    }
    if (!isValidCargo) {
      setUserFormStatus("Selecione um cargo valido.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setUserFormStatus("");

    const payload = { nome, email, cargo, ativo, updated_at: new Date().toISOString() };
    let error = null;

    const existing = await client
      .from("crm_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing.error) {
      error = existing.error;
    } else if (id && existing.data?.id && String(existing.data.id) !== id) {
      error = { message: "Este e-mail ja pertence a outro usuario." };
    } else {
      const targetId = id || existing.data?.id;
      const result = targetId
        ? await client.from("crm_users").update(payload).eq("id", targetId).select("id").maybeSingle()
        : await client.from("crm_users").insert(payload).select("id").maybeSingle();
      error = result.error || (!result.data ? { message: "O Supabase nao confirmou a gravacao." } : null);
    }

    submitButton.disabled = false;
    submitButton.textContent = "Salvar usuario";
    if (error) {
      setUserFormStatus(error.message || "Nao foi possivel salvar o usuario.");
      return;
    }

    closeUserModal();
    await loadData();
    setStatus("Usuario salvo com sucesso.", "success");
    addAuditEntry(`<strong>Usuario</strong> ${id ? "atualizado" : "adicionado"}`, "success");
  };

  const loadData = async () => {
    const client = getClient();
    if (!client) return;

    setStatus("Carregando permissoes...", "success");

    let permissionsResult = await client
      .from("crm_role_permissions")
      .select("cargo, area_key, area_label, permitido");

    const usersResult = await client
      .from("crm_users")
      .select("id, email, nome, cargo, ativo, created_at, updated_at")
      .order("created_at", { ascending: false });

    // Se a tabela estiver vazia, criar permissões padrão iniciais
    if (!permissionsResult.error && (!permissionsResult.data || permissionsResult.data.length === 0)) {
      const defaultRows = [];
      roles.forEach((role) => {
        areas.forEach((area) => {
          const permitido = role.key === "dono" || (defaultAccess[role.key]?.includes(area.key) || false);
          defaultRows.push({
            cargo: role.key,
            area_key: area.key,
            area_label: area.label,
            permitido: permitido,
          });
        });
      });
      const { data: insertedData, error: insertErr } = await client
        .from("crm_role_permissions")
        .insert(defaultRows)
        .select("cargo, area_key, area_label, permitido");
      
      if (!insertErr && insertedData) {
        permissionsResult = { data: insertedData, error: null };
      }
    }

    state.permissions.clear();
    if (!permissionsResult.error) {
      (permissionsResult.data || []).forEach((item) => {
        state.permissions.set(permissionKey(item.cargo, item.area_key), Boolean(item.permitido));
      });
    }

    state.users = usersResult.error ? [] : usersResult.data || [];
    renderMatrix();
    renderUsers();

    if (permissionsResult.error) {
      setStatus("Nao consegui carregar as permissoes: " + permissionsResult.error.message);
      addAuditEntry("<strong>Erro</strong> ao carregar permissoes", "warning");
      return;
    }
    if (usersResult.error) {
      setStatus("Nao consegui carregar os usuarios: " + usersResult.error.message);
      return;
    }

    setStatus("Permissoes carregadas.", "success");
    addAuditEntry("<strong>Sistema</strong> Permissoes carregadas", "success");
  };

  const collectPermissions = () =>
    Array.from(document.querySelectorAll("[data-role][data-area]")).map((input) => ({
      cargo: input.dataset.role,
      area_key: input.dataset.area,
      area_label: areas.find(a => a.key === input.dataset.area)?.label || input.dataset.area,
      permitido: input.checked,
      updated_at: new Date().toISOString(),
    }));

  const saveData = async () => {
    const client = getClient();
    if (!client) return;

    saveButton.disabled = true;
    saveButton.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;animation:perm-spin 1s linear infinite;"></i> Salvando...';
    if (window.lucide) lucide.createIcons();
    setStatus("Salvando permissoes...", "success");

    const permissions = collectPermissions();
    const { error: permissionError } = await client
      .from("crm_role_permissions")
      .upsert(permissions, { onConflict: "cargo,area_key" });

    saveButton.disabled = false;
    saveButton.innerHTML = '<i data-lucide="save" style="width:16px;height:16px;"></i> Salvar permissoes';
    if (window.lucide) lucide.createIcons();

    if (permissionError) {
      setStatus("Nao consegui salvar as permissoes: " + permissionError.message);
      addAuditEntry("<strong>Erro</strong> ao salvar permissoes", "warning");
      return;
    }

    // Clear permissions cache in sessionStorage so pages reload it fresh
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("crm-permissions-")) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("Error clearing permission cache:", e);
    }

    await loadData();
    setStatus("Permissoes salvas com sucesso.", "success");
    addAuditEntry("<strong>Permissoes</strong> salvas com sucesso", "success");
  };

  const initFilters = () => {
    const chips = document.querySelectorAll("[data-filter]");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        state.activeFilter = chip.dataset.filter;
        renderMatrix();
      });
    });

    const filterToggle = document.querySelector("[data-filter-toggle]");
    const extraChipsHTML =
      '<button type="button" class="perm-filter-chip" data-filter="admin">' +
      '<i data-lucide="shield" style="width:14px;height:14px;"></i> Admin' +
      '</button>' +
      '<button type="button" class="perm-filter-chip" data-filter="data">' +
      '<i data-lucide="trending-up" style="width:14px;height:14px;"></i> Dados' +
      '</button>' +
      '<button type="button" class="perm-filter-chip" data-filter="content">' +
      '<i data-lucide="file-stack" style="width:14px;height:14px;"></i> Conteudo' +
      '</button>';

    if (filterToggle) {
      let expanded = false;
      filterToggle.addEventListener("click", () => {
        const container = document.querySelector("[data-filter-chips]");
        if (!container) return;
        if (!expanded) {
          container.insertAdjacentHTML("beforeend", extraChipsHTML);
          expanded = true;
          filterToggle.style.display = "none";
          if (window.lucide) lucide.createIcons();
          container.querySelectorAll("[data-filter]").forEach((chip) => {
            chip.addEventListener("click", () => {
              container.querySelectorAll("[data-filter]").forEach((c) => c.classList.remove("is-active"));
              chip.classList.add("is-active");
              state.activeFilter = chip.dataset.filter;
              renderMatrix();
            });
          });
        }
      });
    }
  };

  saveButton?.addEventListener("click", saveData);
  reloadButton?.addEventListener("click", loadData);
  addUserButton?.addEventListener("click", () => openUserModal());
  userForm?.addEventListener("submit", saveUser);
  document.querySelectorAll("[data-close-user-modal]").forEach((button) => {
    button.addEventListener("click", closeUserModal);
  });
  userModal?.addEventListener("click", (event) => {
    if (event.target === userModal) closeUserModal();
  });
  userSearch?.addEventListener("input", () => {
    state.userSearch = userSearch.value;
    renderUsers();
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initFilters();
  });
})();
