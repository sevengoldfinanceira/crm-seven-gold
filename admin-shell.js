(() => {
  const collapsedKey = "seven-gold-admin-sidebar-collapsed";
  document.documentElement.dataset.adminSidebar =
    localStorage.getItem(collapsedKey) === "true" ? "collapsed" : "expanded";
  const currentPage = window.location.pathname.split("/").pop() || "empresa.html";
  const area = document.body.dataset.permissionArea || currentPage.replace(".html", "");

  // ── Navegação flat (mantida para compatibilidade) ─────────────────────────
  const navigation = [
    ["empresa.html", "house", "Painel", "empresa", ""],
    ["organograma.html", "network", "Organograma", "organograma", "dono,administrador,rh"],
    ["financeiro.html", "badge-dollar-sign", "Financeiro", "financeiro", "dono,administrador,financeiro"],
    ["comissoes.html", "percent", "Comissões", "comissoes", "dono,administrador,financeiro"],
    ["equipe.html", "users", "Equipe", "equipe", "dono,administrador,rh"],
    ["#marketing", "megaphone", "Marketing", "marketing", "dono,administrador,marketing"],
    ["documentos.html", "file-text", "Documentos", "documentos", ""],
    ["relatorios.html", "chart-column", "Relatórios", "relatorios", "dono,administrador,financeiro,marketing,rh"],
    ["permissoes.html", "lock-keyhole", "Permissões", "permissoes", "dono"],
    ["#metas", "target", "Metas", "metas", "dono,administrador,coordenador"],
    ["historia-dono.html", "crown", "História do Dono", "historia_dono", "dono"],
  ];

  // ── Navegação agrupada por categoria ──────────────────────────────────────
  const navGroups = [
    {
      label: "PRINCIPAL",
      items: [
        ["empresa.html", "house", "Painel", "empresa", ""],
        ["organograma.html", "network", "Organograma", "organograma", "dono,administrador,rh"],
        ["#metas", "target", "Metas", "metas", "dono,administrador,coordenador"],
      ],
    },
    {
      label: "GESTÃO",
      items: [
        ["equipe.html", "users", "Equipe", "equipe", "dono,administrador,rh"],
        ["permissoes.html", "lock-keyhole", "Permissões", "permissoes", "dono"],
        ["historia-dono.html", "crown", "História do Dono", "historia_dono", "dono"],
      ],
    },
    {
      label: "FINANCEIRO",
      items: [
        ["financeiro.html", "badge-dollar-sign", "Financeiro", "financeiro", "dono,administrador,financeiro"],
        ["comissoes.html", "percent", "Comissões", "comissoes", "dono,administrador,financeiro"],
        ["relatorios.html", "chart-column", "Relatórios", "relatorios", "dono,administrador,financeiro,marketing,rh"],
      ],
    },
    {
      label: "OPERACIONAL",
      items: [
        ["#marketing", "megaphone", "Marketing", "marketing", "dono,administrador,marketing"],
        ["documentos.html", "file-text", "Documentos", "documentos", ""],
      ],
    },
  ];

  const renderNavItem = ([href, icon, label, key, roles]) => `
    <a href="${href}"
       class="psb-nav-item company-sidebar-nav-item${area === key ? " active" : ""}"
       title="${label}"
       ${roles ? `data-visible-roles="${roles}"` : ""}>
      <span class="psb-nav-icon"><i data-lucide="${icon}"></i></span>
      <span class="psb-nav-label">${label}</span>
    </a>`;

  const renderNavGroup = ({ label, items }) => `
    <div class="psb-nav-group">
      <span class="psb-group-label">${label}</span>
      ${items.map(renderNavItem).join("")}
    </div>`;

  // ── Criação do sidebar premium ────────────────────────────────────────────
  const createSidebar = () => {
    const sidebar = document.createElement("aside");
    sidebar.className = "company-sidebar unified-admin-sidebar psb";
    sidebar.innerHTML = `
      <!-- ── Topo: Logo + Brand ── -->
      <div class="psb-header">
        <a class="company-sidebar-brand psb-brand" href="empresa.html" aria-label="Ir para o painel Seven Gold">
          <div class="psb-logo-wrap">
            <img class="psb-logo-img" src="assets/logo-copa.png" alt="Seven Gold" />
          </div>
          <div class="psb-brand-text">
            <strong>SEVEN GOLD</strong>
            <span>PAINEL EMPRESA</span>
            <small>Gestão interna</small>
          </div>
        </a>
        <button class="sidebar-toggle psb-toggle" type="button"
                aria-label="Recolher menu" title="Recolher ou expandir menu">
          <i data-lucide="menu"></i>
        </button>
      </div>

      <!-- ── Navegação categorizada ── -->
      <nav class="company-sidebar-nav psb-nav" aria-label="Navegação da empresa">
        ${navGroups.map(renderNavGroup).join("")}
      </nav>

      <!-- ── Rodapé: Card de Perfil ── -->
      <div class="psb-footer">
        <div class="psb-profile-card">
          <a class="psb-avatar-link" href="perfil.html?area=empresa" title="Ver perfil">
            <span class="profile-avatar psb-avatar" data-user-avatar>U</span>
            <span class="psb-online-dot" title="Online"></span>
          </a>
          <div class="psb-profile-info">
            <strong class="psb-profile-name" data-user-name>Usuário</strong>
            <small class="psb-profile-role" data-user-role>Perfil</small>
          </div>
          <div class="psb-profile-actions">
            <a href="perfil.html?area=empresa" class="psb-action-btn" title="Configurações">
              <i data-lucide="settings"></i>
            </a>
            <button type="button" class="psb-action-btn psb-logout-btn" title="Sair" id="psb-logout-btn">
              <i data-lucide="log-out"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    return sidebar;
  };

  // ── Render de ícones Lucide ───────────────────────────────────────────────
  const renderIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js";
    script.addEventListener("load", () => window.lucide?.createIcons());
    document.head.append(script);
  };

  // ── Detecta o layout correto ──────────────────────────────────────────────
  const findLayout = () => {
    const companyLayout = document.querySelector(".company-dashboard-shell");
    if (companyLayout) {
      companyLayout.querySelector(".company-sidebar")?.remove();
      return companyLayout;
    }
    const historyLayout = document.querySelector(".history-dashboard-shell");
    if (historyLayout) {
      historyLayout.querySelector(".history-sidebar")?.remove();
      return historyLayout;
    }
    const profileLayout = document.querySelector(".profile-dashboard-shell");
    if (profileLayout) {
      profileLayout.querySelectorAll(".profile-context-sidebar").forEach((item) => item.remove());
      return profileLayout;
    }
    const content = document.querySelector("body > main");
    if (!content) return null;
    const layout = document.createElement("div");
    content.before(layout);
    layout.append(content);
    return layout;
  };

  // ── Botão flutuante de Tema (FAB) ─────────────────────────────────────────
  const setupThemeToggle = () => {
    const THEME_KEY = "seven-gold-theme";
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") document.body.classList.add("theme-dark");

    const isDark = () => document.body.classList.contains("theme-dark");

    const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const sunSVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

    const btn = document.createElement("button");
    btn.className = "theme-fab";
    btn.setAttribute("aria-label", "Alternar modo claro/escuro");
    btn.setAttribute("title", "Alternar tema");
    btn.innerHTML = isDark() ? sunSVG : moonSVG;

    btn.addEventListener("click", () => {
      document.body.classList.toggle("theme-dark");
      const dark = isDark();
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
      btn.innerHTML = dark ? sunSVG : moonSVG;
      btn.classList.remove("theme-fab--pop");
      void btn.offsetWidth;
      btn.classList.add("theme-fab--pop");
    });

    document.body.append(btn);
  };

  // ── Inicialização principal ───────────────────────────────────────────────
  const initialize = () => {
    if (!document.body.matches("[data-unified-admin]")) return;
    if (currentPage === "perfil.html" && new URLSearchParams(window.location.search).get("area") === "crm") {
      return;
    }

    const layout = findLayout();
    if (!layout) return;

    layout.classList.add("unified-admin-shell");
    const sidebar = createSidebar();
    layout.prepend(sidebar);

    // Collapsed state
    const applyCollapsed = (collapsed) => {
      layout.classList.toggle("sidebar-collapsed", collapsed);
      const button = sidebar.querySelector(".sidebar-toggle");
      if (button) button.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
    };

    applyCollapsed(localStorage.getItem(collapsedKey) === "true");

    sidebar.querySelector(".sidebar-toggle")?.addEventListener("click", () => {
      const collapsed = !layout.classList.contains("sidebar-collapsed");
      localStorage.setItem(collapsedKey, String(collapsed));
      document.documentElement.dataset.adminSidebar = collapsed ? "collapsed" : "expanded";
      applyCollapsed(collapsed);
    });

    // Logout button
    sidebar.querySelector("#psb-logout-btn")?.addEventListener("click", async () => {
      try {
        if (window.sevenGoldAuth?.auth?.signOut) {
          await window.sevenGoldAuth.auth.signOut();
        }
      } catch (_) { /* ignore */ }
      window.location.href = "index.html";
    });

    renderIcons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initialize();
      setupThemeToggle();
    });
  } else {
    initialize();
    setupThemeToggle();
  }

})();
