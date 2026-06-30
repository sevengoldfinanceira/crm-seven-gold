(function () {
  const config = window.SEVEN_GOLD_SUPABASE;

  if (!config || !window.supabase) {
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  window.sevenGoldAuth = client;

  const showMessage = (form, message, type = "error") => {
    let messageEl = form.querySelector("[data-auth-message]");
    if (!messageEl) {
      messageEl = document.createElement("p");
      messageEl.setAttribute("data-auth-message", "");
      messageEl.className = "auth-message";
      form.appendChild(messageEl);
    }

    messageEl.textContent = message;
    messageEl.dataset.type = type;
  };

  const getTarget = (element) => element?.dataset.redirect || "painel.html";

  const checkPortalUserAuthorization = async (userEmail) => {
    if (!userEmail) {
      throw new Error("Nao foi possivel identificar o e-mail do usuario logado.");
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const { data: crmUser, error } = await client
      .from("crm_users")
      .select("email, nome, cargo, ativo")
      .eq("email", normalizedEmail)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("[Portal Auth] Erro ao validar usuario:", error);
    }

    if (crmUser) {
      return crmUser;
    }

    throw new Error("Usuario nao autorizado. Solicite acesso ao administrador.");
  };

  const showPortalAccessDenied = () => {
    document.body.innerHTML = `
      <main class="crm-access-denied">
        <section>
          <span class="crm-access-denied-icon" aria-hidden="true">!</span>
          <p class="eyebrow">Acesso bloqueado</p>
          <h1>Usuário não autorizado.</h1>
          <p>Solicite acesso ao administrador.</p>
          <a href="index.html">Voltar para o login</a>
        </section>
      </main>
    `;
  };

  const requirePortalAuthorization = async (session) => {
    try {
      return await checkPortalUserAuthorization(session?.user?.email);
    } catch (error) {
      console.error("[Portal Auth] Acesso bloqueado:", error);
      await client.auth.signOut();
      showPortalAccessDenied();
      return null;
    }
  };

  const normalizeSystemRole = (value) => {
    const role = String(value || "").trim().toLowerCase();
    const compactRole = role
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_]+/g, "-");
    const aliases = {
      admin: "administrador",
      administrator: "administrador",
      owner: "dono",
      proprietario: "dono",
      "diretor-ceo": "diretor-ceo",
      "diretor-executivo": "diretor-ceo",
      ceo: "diretor-ceo",
    };
    return aliases[compactRole] || compactRole;
  };

  const applyCrmUserIdentity = (sessionUser, crmUser, resolvedRole) => {
    const name = crmUser?.nome || sessionUser?.email || "Usuario";
    const role = resolvedRole || normalizeSystemRole(crmUser?.cargo) || "Usuario CRM";

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });
    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = sessionUser?.email || crmUser?.email || "";
    });
    document.querySelectorAll("[data-user-role]").forEach((element) => {
      element.textContent = role;
    });
  };

  const parseRoles = (value) =>
    (value || "")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

  const showAccessDenied = (fallbackPage, role) => {
    localStorage.setItem("seven-gold-permission-error", "Você não tem permissão para acessar esta área.");
    window.location.href = fallbackPage;
  };

  const normalizeRole = (role) => {
    return String(role || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_]+/g, "-");
  };

  const isAdminRole = (role) => {
    const normalized = normalizeRole(role);
    return ["diretor-ceo", "dono", "admin", "administrador"].includes(normalized);
  };

  let cachedPermissions = null;

  const loadCachedPermissions = async (userRole) => {
    const role = normalizeRole(userRole);
    
    try {
      const stored = sessionStorage.getItem(`crm-permissions-${role}`);
      if (stored) {
        cachedPermissions = JSON.parse(stored);
        return;
      }
    } catch (e) {
      console.warn("sessionStorage not available:", e);
    }

    try {
      const { data, error } = await client
        .from("crm_role_permissions")
        .select("area_key, permitido")
        .eq("cargo", role);

      if (!error && data) {
        cachedPermissions = {};
        data.forEach(item => {
          cachedPermissions[item.area_key] = item.permitido;
        });
        
        try {
          sessionStorage.setItem(`crm-permissions-${role}`, JSON.stringify(cachedPermissions));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Erro ao carregar permissões do Supabase:", err);
    }
  };

  const canAccessArea = (userRole, areaKey) => {
    if (!areaKey) {
      return true;
    }

    const role = normalizeRole(userRole);
    const normalizedArea = String(areaKey).trim().toLowerCase();

    // Todo usuário autenticado pode visualizar e editar apenas o próprio perfil.
    if (["perfil", "profile", "meu-perfil"].includes(normalizedArea)) {
      return true;
    }

    if (isAdminRole(role)) {
      return true;
    }

    if (cachedPermissions && typeof cachedPermissions[areaKey] === "boolean") {
      return cachedPermissions[areaKey];
    }

    const permissions = {
      "diretor-ceo": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro", "equipe", "equipes-desempenho", "relatorios", "financeiro", "marketing"],
      vendedor: ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro"],
      representante: ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro"],
      "assistente-vendas": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro"],
      "home-office": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro"],
      "coordenador-comercial": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro", "equipe", "equipes-desempenho", "relatorios"],
      "supervisor-comercial": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro", "equipe", "equipes-desempenho", "relatorios"],
      "coordenador-posvenda": ["dashboard", "pipeline", "calendario", "tarefas", "feed", "cadastro", "relatorios"],
      "coordenador-adm": ["dashboard", "cadastro", "equipe", "organograma", "relatorios"],
      "coordenador-financeiro": ["dashboard", "pipeline", "calendario", "cadastro", "financeiro", "relatorios"],
      "coordenador-mkt": ["dashboard", "pipeline", "calendario", "cadastro", "marketing", "feed"],
      "coordenador-rh": ["dashboard", "equipe", "organograma", "relatorios"],
      "advogado-juridico": ["dashboard", "cadastro"]
    };

    return permissions[role]?.includes(areaKey) || false;
  };

  window.normalizeRole = normalizeRole;
  window.isAdminRole = isAdminRole;
  window.canAccessArea = canAccessArea;
  window.loadCachedPermissions = loadCachedPermissions;

  const cargoDisplayNames = {
    "diretor-ceo": "Diretor CEO",
    "supervisor-comercial": "Supervisor Comercial",
    "home-office": "Home Office",
    "coordenador-comercial": "Coordenador Comercial",
    "vendedor": "Vendedor",
    "assistente-vendas": "Assistente de Vendas",
    "coordenador-posvenda": "Coordenador Pós-Venda",
    "coordenador-adm": "Coordenador Administrativo",
    "coordenador-financeiro": "Coordenador Financeiro",
    "coordenador-mkt": "Coordenador de Marketing",
    "advogado-juridico": "Advogado Jurídico",
    "coordenador-rh": "Coordenador de RH",
    "administrador": "Administrador",
  };

  const cargoHierarchy = [
    "diretor-ceo",
    "supervisor-comercial",
    "coordenador-comercial", "coordenador-adm", "coordenador-financeiro",
    "coordenador-mkt", "coordenador-rh", "coordenador-posvenda",
    "advogado-juridico",
    "vendedor",
    "home-office",
    "assistente-vendas",
  ];

  const resolveCargoForUser = (userId) => {
    try {
      const saved = localStorage.getItem("seven-gold-employee-roles");
      if (!saved) return null;
      const map = JSON.parse(saved);
      const funcs = map[userId];
      if (!funcs || funcs.length === 0) return null;
      if (funcs.length === 1) return funcs[0].roleKey;
      let best = funcs[0].roleKey;
      let bestIdx = cargoHierarchy.indexOf(best);
      if (bestIdx === -1) bestIdx = cargoHierarchy.length;
      for (let i = 1; i < funcs.length; i++) {
        const idx = cargoHierarchy.indexOf(funcs[i].roleKey);
        const compareIdx = idx === -1 ? cargoHierarchy.length : idx;
        if (compareIdx < bestIdx) {
          best = funcs[i].roleKey;
          bestIdx = compareIdx;
        }
      }
      return best;
    } catch {
      return null;
    }
  };

  const applyRoleVisibility = (role, sessionUser) => {
    const normalizedRole = normalizeRole(role);
    const hasFullAccess = isAdminRole(normalizedRole);

    document.querySelectorAll("[data-visible-roles]").forEach((element) => {
      const roles = parseRoles(element.dataset.visibleRoles).map(normalizeRole);

      if (!hasFullAccess && !roles.includes(normalizedRole)) {
        element.hidden = true;
        element.style.setProperty("display", "none", "important");
      } else {
        element.hidden = false;
        element.style.removeProperty("display");
      }
    });

    document.querySelectorAll("[data-permission-key]").forEach((element) => {
      const areaKey = element.dataset.permissionKey;
      if (!hasFullAccess && !canAccessArea(normalizedRole, areaKey)) {
        element.hidden = true;
        element.style.setProperty("display", "none", "important");
      } else {
        element.hidden = false;
        element.style.removeProperty("display");
      }
    });

    let displayRole = cargoDisplayNames[normalizedRole] || role || "sem perfil";
    if (sessionUser?.id) {
      const cargoKey = resolveCargoForUser(sessionUser.id);
      if (cargoKey && cargoDisplayNames[cargoKey]) {
        displayRole = cargoDisplayNames[cargoKey];
      }
    }

    document.querySelectorAll("[data-user-role]").forEach((element) => {
      element.textContent = displayRole;
    });
  };

  const setupLoginForms = () => {
    document.querySelectorAll("[data-auth-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = form.querySelector("button[type='submit']");
        const target = getTarget(form);
        const email = form.elements.email?.value?.trim();
        const password = form.elements.password?.value;

        if (!email || !password) {
          showMessage(form, "Preencha e-mail e senha.");
          return;
        }

        button.disabled = true;
        const buttonIcon = button.querySelector("i");
        if (buttonIcon) {
          button.innerHTML = `<i data-lucide="${buttonIcon.getAttribute("data-lucide")}"></i> Entrando...`;
          if (window.lucide) window.lucide.createIcons();
        } else {
          button.textContent = "Entrando...";
        }

        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          showMessage(form, "Login nao autorizado. Confira e-mail e senha.");
          button.disabled = false;
          if (buttonIcon) {
            button.innerHTML = `<i data-lucide="${buttonIcon.getAttribute("data-lucide")}"></i> ${form.dataset.buttonText || "Entrar no sistema"}`;
            if (window.lucide) window.lucide.createIcons();
          } else {
            button.textContent = form.dataset.buttonText || "Entrar";
          }
          return;
        }

        const portalUser = await requirePortalAuthorization(data.session);
        if (!portalUser) return;

        window.location.href = target;
      });
    });

    document.querySelectorAll("[data-google-login]").forEach((button) => {
      button.addEventListener("click", async () => {
        const target = getTarget(button);

        await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth-callback.html?next=${encodeURIComponent(target)}`,
          },
        });
      });
    });
  };

  const applyUserProfile = async (session, crmUser) => {
    const user = session?.user;
    const name = crmUser?.nome || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Usuario";
    const firstName = name.trim().split(/\s+/)[0];
    const initial = firstName.charAt(0).toUpperCase();

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });
    document.querySelectorAll("[data-user-first-name]").forEach((element) => {
      element.textContent = firstName;
    });
    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = user?.email || crmUser?.email || "";
    });
    document.querySelectorAll("[data-user-avatar]").forEach((element) => {
      element.textContent = initial;
      element.style.backgroundImage = "";
      element.classList.remove("has-user-photo");
    });

    const { data: avatar } = await client.storage
      .from("company-documents")
      .download(`${user.id}/profile/avatar.jpg`);

    const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const avatarUrl = avatar ? URL.createObjectURL(avatar) : (googleAvatar || null);

    if (avatarUrl) {
      document.querySelectorAll("[data-user-avatar]").forEach((element) => {
        element.style.backgroundImage = `url("${avatarUrl}")`;
        element.classList.add("has-user-photo");
        element.textContent = "";
      });
    }
  };

  const redirectAuthenticatedLoginPage = async () => {
    const form = document.querySelector("[data-auth-form]");

    if (!form || document.body.matches("[data-require-auth], [data-auth-callback]")) {
      return false;
    }

    // Set up "Usar outra conta" click handler and bottom link click handler
    const useOtherBtn = form.querySelector("[data-use-other-account]");
    if (useOtherBtn) {
      useOtherBtn.addEventListener("click", () => {
        const emailInput = form.querySelector("input[name='email']");
        if (emailInput) {
          emailInput.focus();
          emailInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    const bottomLink = form.querySelector("[data-focus-login-toggle]");
    if (bottomLink) {
      bottomLink.addEventListener("click", (e) => {
        e.preventDefault();
        const emailInput = form.querySelector("input[name='email']");
        if (emailInput) {
          emailInput.focus();
          emailInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    const { data } = await client.auth.getSession();

    if (!data.session) {
      return false;
    }

    const portalUser = await requirePortalAuthorization(data.session);
    if (!portalUser) return false;

    // Hide Google login button and its divider to simplify the form
    const googleBtn = form.querySelector("[data-google-login]");
    const divider = form.querySelector(".login-divider");
    if (googleBtn) googleBtn.style.display = "none";
    if (divider) divider.style.display = "none";

    // Update Header with user profile details
    const name = portalUser?.nome || data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.name || data.session.user.email || "Usuário";
    const firstName = name.trim().split(/\s+/)[0];
    const initial = firstName.charAt(0).toUpperCase();

    const headerAvatar = form.querySelector("[data-header-avatar]");

    if (headerAvatar) {
      headerAvatar.classList.add("is-logged-in");
    }

    // Update instructions text
    const instruction = form.querySelector("[data-login-instruction]");
    if (instruction) {
      instruction.textContent = "Escolha uma conta salva ou use seu e-mail e senha para acessar.";
    }

    // Show the active session card wrapper
    const wrapper = form.querySelector(".active-session-card-wrapper");
    if (wrapper) {
      wrapper.style.display = "grid";
      
      const savedCard = wrapper.querySelector(".saved-account-card");
      if (savedCard) {
        savedCard.addEventListener("click", async (event) => {
          if (event.target.closest("[data-logout]")) return;
          const target = getTarget(form);
          const portalUser = await requirePortalAuthorization(data.session);
          if (!portalUser) return;
          window.location.href = target;
        });
      }
    }

    // Populate user details asynchronously
    await applyUserProfile(data.session, portalUser);

    return true;
  };

  const showAuthBlock = (loginPage, detail = "") => {
    const debugInfo = [
      `URL: ${window.location.href}`,
      `Busca: ${window.location.search || "vazia"}`,
      `Hash: ${window.location.hash || "vazio"}`,
    ].join("\n");

    document.body.innerHTML = `
      <main class="login-shell">
        <section class="login-panel" style="max-width: 520px; margin: auto;">
          <div class="login-form">
            <header>
              <p class="eyebrow">Acesso nao confirmado</p>
              <h2>O login ainda nao foi validado.</h2>
            </header>
            <p class="login-note">
              Tente entrar novamente. Se o erro continuar, precisamos revisar o Redirect URL no Supabase e no Google.
            </p>
            ${detail ? `<p class="auth-message">${detail}</p>` : ""}
            <pre class="auth-debug">${debugInfo}</pre>
            <a class="login-button auth-link-button" href="${loginPage}">Voltar para o login</a>
          </div>
        </section>
      </main>
    `;
  };

  const waitForSession = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getSession();

      if (data.session) {
        return data.session;
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    return null;
  };

  const handleOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      return { session: null, error: "" };
    }

    const { data, error } = await client.auth.exchangeCodeForSession(code);

    if (!error) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return { session: data.session, error: "" };
    }

    return {
      session: null,
      error: error.message || "Erro desconhecido ao validar o login Google.",
    };
  };



  const setupAuthCallbackPage = async () => {
    if (!document.body.matches("[data-auth-callback]")) {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "painel.html";
    const callbackResult = await handleOAuthCallback();
    const session = callbackResult.session || (await waitForSession());

    if (!session) {
      showAuthBlock(
        "index.html",
        callbackResult.error || "O Supabase nao gravou a sessao apos o retorno do Google."
      );
      return true;
    }

    const portalUser = await requirePortalAuthorization(session);
    if (!portalUser) return true;
    window.location.href = next;
    return true;
  };

  const setupProtectedPages = async (oauthError = "") => {
    if (!document.body.matches("[data-require-auth]")) {
      return;
    }

    const loginPage = document.body.dataset.loginPage || "index.html";
    const session = await waitForSession();

    if (!session) {
      showAuthBlock(loginPage, oauthError);
      return;
    }

    const currentPage = window.location.pathname.split("/").pop();
    const profileArea = new URLSearchParams(window.location.search).get("area");
    const permissionArea = document.body.dataset.permissionArea ||
      (currentPage === "perfil.html" && profileArea === "crm" ? "crm" : "");
    const authorizedPortalUser = await requirePortalAuthorization(session);
    if (!authorizedPortalUser) return;

    const role = normalizeSystemRole(authorizedPortalUser.cargo || "vendedor");
    await loadCachedPermissions(role);
    window.currentUser = session.user;
    window.crmUser = authorizedPortalUser;
    window.userRole = role;
    window.sevenGoldCrmSession = {
      currentUser: session.user,
      crmUser: authorizedPortalUser,
      userRole: role,
    };
    window.sevenGoldPortalSession = window.sevenGoldCrmSession;
    const allowedRoles = parseRoles(document.body.dataset.allowedRoles);
    const areaAccess = permissionArea === "crm" ? true : await canAccessArea(role, permissionArea);

    if (areaAccess === false) {
      showAccessDenied(document.body.dataset.deniedRedirect || "painel.html", role);
      return;
    }

    if (permissionArea !== "crm" && areaAccess === null && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      showAccessDenied(document.body.dataset.deniedRedirect || "painel.html", role);
      return;
    }

    applyRoleVisibility(role, session.user);
    await applyUserProfile(session, authorizedPortalUser);
    if (permissionArea === "crm") {
      applyCrmUserIdentity(session.user, authorizedPortalUser, role);
      document.body.classList.add("crm-authorized");
      document.dispatchEvent(new CustomEvent("crm-authorized"));

      // Check if current hash is allowed for this role
      const hash = window.location.hash.replace("#", "") || "pipeline";
      if (!canAccessArea(role, hash)) {
        const allowedTabs = ["pipeline", "dashboard", "calendario", "tarefas", "feed"];
        const fallbackTab = allowedTabs.find(tab => canAccessArea(role, tab)) || "pipeline";
        window.location.hash = "#" + fallbackTab;
      }
    }
    document.body.classList.add("portal-authorized");
  };

  const setupLogout = () => {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        button.disabled = true;
        await client.auth.signOut();
        window.location.href = button.dataset.logoutRedirect || "index.html";
      });
    });
  };

  const initTheme = () => {
    if (!document.body || !document.body.matches("[data-require-auth]")) {
      return;
    }

    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "painel.html" || currentPage === "painel") {
      document.body.classList.add("theme-dark");
      return;
    }

    const savedTheme = localStorage.getItem("seven-gold-theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("theme-dark");
    } else {
      document.body.classList.remove("theme-dark");
    }

  };

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();

    const storedError = localStorage.getItem("seven-gold-permission-error");
    if (storedError) {
      localStorage.removeItem("seven-gold-permission-error");
      alert(storedError);
    }

    const handledCallback = await setupAuthCallbackPage();
    if (handledCallback) {
      return;
    }

    const callbackResult = await handleOAuthCallback();
    setupLoginForms();
    setupLogout();

    const redirectedAuthenticatedUser = await redirectAuthenticatedLoginPage();
    if (redirectedAuthenticatedUser) {
      return;
    }

    await setupProtectedPages(callbackResult.error);
  });
})();
