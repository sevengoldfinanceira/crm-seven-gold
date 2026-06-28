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

  const ensureProfile = async (session) => {
    const user = session?.user;

    if (!user) {
      return;
    }

    const { data } = await client
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      return;
    }

    await client.from("profiles").insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      email: user.email,
      role: "vendedor",
    });
  };

  const getProfile = async (session) => {
    const user = session?.user;

    if (!user) {
      return null;
    }

    const { data } = await client
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    return data;
  };

  const checkPortalUserAuthorization = async (userEmail, userId) => {
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

    // Se nao estiver no crm_users, verifica se tem role de 'dono' ou 'administrador' na tabela profiles
    if (userId) {
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("[Portal Auth] Erro ao buscar profile:", profileError);
      }

      if (profile && (profile.role === "dono" || profile.role === "administrador")) {
        const newCrmUser = {
          email: normalizedEmail,
          nome: profile.full_name || normalizedEmail.split("@")[0],
          cargo: profile.role,
          ativo: true
        };

        const { data: insertedUser, error: insertError } = await client
          .from("crm_users")
          .insert(newCrmUser)
          .select("email, nome, cargo, ativo")
          .maybeSingle();

        if (insertError) {
          console.error("[Portal Auth] Erro ao registrar dono no crm_users:", insertError);
          return newCrmUser;
        }

        return insertedUser || newCrmUser;
      }
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
      return await checkPortalUserAuthorization(session?.user?.email, session?.user?.id);
    } catch (error) {
      console.error("[Portal Auth] Acesso bloqueado:", error);
      await client.auth.signOut();
      showPortalAccessDenied();
      return null;
    }
  };

  const normalizeSystemRole = (value) => {
    const role = String(value || "").trim().toLowerCase();
    const aliases = {
      admin: "administrador",
      administrator: "administrador",
      owner: "dono",
      proprietario: "dono",
      "diretor-ceo": "dono",
      diretor: "dono",
      ceo: "dono",
      "supervisor-comercial": "supervisor",
      "home office": "home_office",
      "home-office": "home_office",
    };
    return aliases[role] || role;
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
    document.body.innerHTML = `
      <main class="login-shell">
        <section class="login-panel" style="max-width: 560px; margin: auto;">
          <div class="login-form">
            <header>
              <p class="eyebrow">Acesso bloqueado</p>
              <h2>Seu perfil nao tem permissao para esta area.</h2>
            </header>
            <p class="login-note">
              Perfil atual: <strong>${role || "sem perfil"}</strong>. Se isso estiver errado, altere o cargo em Permissoes ou no Supabase.
            </p>
            <a class="login-button auth-link-button" href="${fallbackPage}">Voltar</a>
            <button class="google-button" type="button" data-logout data-logout-redirect="index.html">Sair da conta</button>
          </div>
        </section>
      </main>
    `;

    setupLogout();
  };

  const canAccessArea = async (role, area) => {
    if (!area || role === "dono") {
      return true;
    }

    const { data, error } = await client
      .from("app_permissions")
      .select("can_access")
      .eq("role", role)
      .eq("area", area)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return Boolean(data.can_access);
  };

  const cargoDisplayNames = {
    "diretor-ceo": "Diretor CEO",
    "supervisor-comercial": "Supervisor Comercial",
    "supervisor": "Supervisor",
    "home_office": "Home Office",
    "coordenador-comercial": "Coordenador Comercial",
    "vendedor": "Vendedor",
    "assistente-vendas": "Assistente de Vendas",
    "assistente_vendas": "Assistente de Vendas",
    "coordenador-posvenda": "Coordenador Pós-Venda",
    "analista-posvenda": "Analista Pós-Venda",
    "pos-vendas": "Pós-Vendas",
    "assistente-adm": "Assistente Administrativo",
    "analista-adm": "Analista Administrativo",
    "coordenador-adm": "Coordenador Administrativo",
    "financeiro": "Financeiro",
    "auxiliar-financeiro": "Auxiliar Financeiro",
    "coordenador-financeiro": "Coordenador Financeiro",
    "assistente-mkt": "Assistente de Marketing",
    "analista-mkt": "Analista de Marketing",
    "coordenador-mkt": "Coordenador de Marketing",
    "advogado-juridico": "Advogado Jurídico",
    "assistente-rh": "Assistente de RH",
    "analista-rh": "Analista de RH",
    "coordenador-rh": "Coordenador de RH",
  };

  const cargoHierarchy = [
    "diretor-ceo",
    "supervisor-comercial",
    "supervisor",
    "coordenador-comercial", "coordenador-adm", "coordenador-financeiro",
    "coordenador-mkt", "coordenador-rh", "coordenador-posvenda",
    "advogado-juridico",
    "analista-adm", "analista-mkt", "analista-rh", "analista-posvenda",
    "financeiro",
    "vendedor",
    "home_office",
    "pos-vendas",
    "assistente-vendas", "assistente-adm", "assistente-mkt", "assistente-rh",
    "auxiliar-financeiro",
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

  const applyRoleVisibility = (role, profile) => {
    document.querySelectorAll("[data-visible-roles]").forEach((element) => {
      const roles = parseRoles(element.dataset.visibleRoles);

      if (!roles.includes(role)) {
        element.hidden = true;
      }
    });

    let displayRole = role || "sem perfil";
    if (profile?.id) {
      const cargoKey = resolveCargoForUser(profile.id);
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

        await ensureProfile(data.session);
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

  const applyUserProfile = async (session, profile) => {
    const user = session?.user;
    const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || "Usuario";
    const firstName = name.trim().split(/\s+/)[0];
    const initial = firstName.charAt(0).toUpperCase();

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = name;
    });
    document.querySelectorAll("[data-user-first-name]").forEach((element) => {
      element.textContent = firstName;
    });
    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = user?.email || profile?.email || "";
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

    await ensureProfile(data.session);
    const profile = await getProfile(data.session);

    // Hide Google login button and its divider to simplify the form
    const googleBtn = form.querySelector("[data-google-login]");
    const divider = form.querySelector(".login-divider");
    if (googleBtn) googleBtn.style.display = "none";
    if (divider) divider.style.display = "none";

    // Update Header with user profile details
    const name = profile?.full_name || data.session.user.user_metadata?.full_name || data.session.user.email || "Usuário";
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
    await applyUserProfile(data.session, profile);

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
    await ensureProfile(session);
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

    await ensureProfile(session);
    const profile = await getProfile(session);
    const role = normalizeSystemRole(authorizedPortalUser.cargo || profile?.role || "vendedor");
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

    applyRoleVisibility(role, profile);
    await applyUserProfile(session, profile);
    if (permissionArea === "crm") {
      applyCrmUserIdentity(session.user, authorizedPortalUser, role);
      document.body.classList.add("crm-authorized");
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
