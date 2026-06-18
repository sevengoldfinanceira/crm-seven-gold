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
    "coordenador-comercial": "Coordenador Comercial",
    "vendedor": "Vendedor",
    "assistente-vendas": "Assistente de Vendas",
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
    "coordenador-comercial", "coordenador-adm", "coordenador-financeiro",
    "coordenador-mkt", "coordenador-rh", "coordenador-posvenda",
    "advogado-juridico",
    "analista-adm", "analista-mkt", "analista-rh", "analista-posvenda",
    "financeiro",
    "vendedor",
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
      if (element.classList.contains("saved-avatar")) {
        element.textContent = "";
      } else {
        element.textContent = initial;
      }
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
        savedCard.addEventListener("click", () => {
          window.location.href = getTarget(form);
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

    await ensureProfile(session);
    const profile = await getProfile(session);
    const role = profile?.role || "vendedor";
    const allowedRoles = parseRoles(document.body.dataset.allowedRoles);
    const permissionArea = document.body.dataset.permissionArea;
    const areaAccess = await canAccessArea(role, permissionArea);

    if (areaAccess === false) {
      showAccessDenied(document.body.dataset.deniedRedirect || "painel.html", role);
      return;
    }

    if (areaAccess === null && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      showAccessDenied(document.body.dataset.deniedRedirect || "painel.html", role);
      return;
    }

    applyRoleVisibility(role, profile);
    await applyUserProfile(session, profile);
  };

  const setupLogout = () => {
    document.querySelectorAll("[data-logout]").forEach((button) => {
      button.addEventListener("click", async () => {
        await client.auth.signOut();
        window.location.href = button.dataset.logoutRedirect || "index.html";
      });
    });
  };

  const initTheme = () => {
    if (!document.body || !document.body.matches("[data-require-auth]")) {
      return;
    }

    const savedTheme = localStorage.getItem("seven-gold-theme") || "light";
    if (savedTheme === "dark") {
      document.body.classList.add("theme-dark");
    } else {
      document.body.classList.remove("theme-dark");
    }

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "theme-fab";
    fab.title = "Alternar tema";
    fab.setAttribute("aria-label", "Alternar entre modo claro e escuro");

    const sunSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    const updateFab = (theme) => {
      fab.innerHTML = theme === "dark" ? sunSvg : moonSvg;
    };
    updateFab(savedTheme);

    fab.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("theme-dark");
      const theme = isDark ? "dark" : "light";
      localStorage.setItem("seven-gold-theme", theme);
      updateFab(theme);
      window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
    });

    window.addEventListener("themechange", (e) => {
      updateFab(e.detail);
    });

    document.body.appendChild(fab);
  };

  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();

    const handledCallback = await setupAuthCallbackPage();
    if (handledCallback) {
      return;
    }

    const callbackResult = await handleOAuthCallback();
    setupLoginForms();

    const redirectedAuthenticatedUser = await redirectAuthenticatedLoginPage();
    if (redirectedAuthenticatedUser) {
      return;
    }

    await setupProtectedPages(callbackResult.error);
    setupLogout();
  });
})();
