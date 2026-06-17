(function () {
  const head = document.querySelector("[data-permission-head]");
  const body = document.querySelector("[data-permission-body]");
  const userList = document.querySelector("[data-user-list]");
  const userSearch = document.querySelector("[data-user-search]");
  const statusEl = document.querySelector("[data-permission-status]");
  const saveButton = document.querySelector("[data-save-permissions]");
  const reloadButton = document.querySelector("[data-reload-permissions]");
  const auditLog = document.querySelector("[data-audit-log]");

  const roles = [
    { key: "dono", label: "Dono" },
    { key: "administrador", label: "Administrador" },
    { key: "coordenador", label: "Coordenador" },
    { key: "representante", label: "Representante" },
    { key: "vendedor", label: "Vendedor" },
    { key: "financeiro", label: "Financeiro" },
    { key: "marketing", label: "Marketing" },
    { key: "rh", label: "RH" },
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
    representante: ["crm", "comissoes", "documentos", "relatorios"],
    vendedor: ["crm", "comissoes", "documentos"],
    financeiro: ["empresa", "financeiro", "comissoes", "documentos", "relatorios"],
    marketing: ["empresa", "documentos", "relatorios"],
    rh: ["empresa", "documentos", "equipe", "organograma", "relatorios"],
  };

  const state = {
    permissions: new Map(),
    profiles: [],
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

    let active = 0;
    let blocked = 0;
    areas.forEach((area) => {
      roles.forEach((role) => {
        if (canAccess(role.key, area.key)) {
          active++;
        } else {
          blocked++;
        }
      });
    });
    statActive.textContent = active;
    statBlocked.textContent = blocked;
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
    const profiles = state.profiles.filter((profile) => {
      const text = `${profile.full_name || ""} ${profile.email || ""} ${profile.role || ""}`.toLowerCase();
      return !search || text.includes(search);
    });

    if (profiles.length === 0) {
      userList.innerHTML = '<p class="permission-note">Nenhum usuario encontrado.</p>';
      return;
    }

    profiles.forEach((profile) => {
      const row = document.createElement("div");
      row.className = "user-access-row";

      const copy = document.createElement("div");
      copy.className = "user-identity";

      const nameLabel = document.createElement("span");
      nameLabel.textContent = "Nome";

      const name = document.createElement("input");
      name.type = "text";
      name.value = profile.full_name || "";
      name.placeholder = "Nome da pessoa";
      name.dataset.userName = profile.id;

      const email = document.createElement("strong");
      email.textContent = profile.email || "sem email";

      copy.append(nameLabel, name, email);

      const select = document.createElement("select");
      select.dataset.userRole = profile.id;
      roles.forEach((role) => {
        const option = document.createElement("option");
        option.value = role.key;
        option.textContent = role.label;
        option.selected = role.key === profile.role;
        select.append(option);
      });

      row.append(copy, select);
      userList.append(row);
    });
  };

  const loadData = async () => {
    const client = getClient();
    if (!client) return;

    setStatus("Carregando permissoes...", "success");

    const [permissionsResult, profilesResult] = await Promise.all([
      client.from("app_permissions").select("role, area, can_access"),
      client.from("profiles").select("id, full_name, email, role").order("email", { ascending: true }),
    ]);

    state.permissions.clear();
    if (!permissionsResult.error) {
      (permissionsResult.data || []).forEach((item) => {
        state.permissions.set(permissionKey(item.role, item.area), Boolean(item.can_access));
      });
    }

    state.profiles = profilesResult.error ? [] : profilesResult.data || [];
    renderMatrix();
    renderUsers();

    if (permissionsResult.error || profilesResult.error) {
      setStatus("Crie a tabela app_permissions e ajuste as politicas no Supabase.");
      addAuditEntry("<strong>Erro</strong> ao carregar permissoes", "warning");
      return;
    }

    setStatus("Permissoes carregadas.", "success");
    addAuditEntry("<strong>Sistema</strong> Permissoes carregadas", "success");
  };

  const collectPermissions = () =>
    Array.from(document.querySelectorAll("[data-role][data-area]")).map((input) => ({
      role: input.dataset.role,
      area: input.dataset.area,
      can_access: input.checked,
    }));

  const collectProfileUpdates = () =>
    state.profiles.map((profile) => {
      const roleSelect = document.querySelector(`[data-user-role="${profile.id}"]`);
      const nameInput = document.querySelector(`[data-user-name="${profile.id}"]`);

      return {
        id: profile.id,
        role: roleSelect?.value || profile.role,
        full_name: nameInput?.value?.trim() || profile.full_name || profile.email,
      };
    });

  const saveData = async () => {
    const client = getClient();
    if (!client) return;

    saveButton.disabled = true;
    saveButton.innerHTML = '<i data-lucide="loader-2" style="width:16px;height:16px;animation:perm-spin 1s linear infinite;"></i> Salvando...';
    if (window.lucide) lucide.createIcons();
    setStatus("Salvando permissoes...", "success");

    const permissions = collectPermissions();
    const { error: permissionError } = await client
      .from("app_permissions")
      .upsert(permissions, { onConflict: "role,area" });

    const profileUpdates = collectProfileUpdates();
    for (const update of profileUpdates) {
      const current = state.profiles.find((profile) => profile.id === update.id);
      if (
        current &&
        (current.role !== update.role || (current.full_name || "") !== update.full_name)
      ) {
        const { error } = await client
          .from("profiles")
          .update({ role: update.role, full_name: update.full_name })
          .eq("id", update.id);
        if (error) {
          saveButton.disabled = false;
          saveButton.innerHTML = '<i data-lucide="save" style="width:16px;height:16px;"></i> Salvar permissoes';
          if (window.lucide) lucide.createIcons();
          setStatus("Nao consegui atualizar um usuario. Confira as politicas do Supabase.");
          addAuditEntry("<strong>Erro</strong> ao atualizar usuario", "warning");
          return;
        }
      }
    }

    saveButton.disabled = false;
    saveButton.innerHTML = '<i data-lucide="save" style="width:16px;height:16px;"></i> Salvar permissoes';
    if (window.lucide) lucide.createIcons();

    if (permissionError) {
      setStatus("Nao consegui salvar as permissoes. Confira a tabela app_permissions.");
      addAuditEntry("<strong>Erro</strong> ao salvar permissoes", "warning");
      return;
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
  userSearch?.addEventListener("input", () => {
    state.userSearch = userSearch.value;
    renderUsers();
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadData();
    initFilters();
  });
})();
