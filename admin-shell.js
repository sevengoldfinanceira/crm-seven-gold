(() => {
  const collapsedKey = "seven-gold-admin-sidebar-collapsed";
  const currentPage = window.location.pathname.split("/").pop() || "empresa.html";
  const area = document.body.dataset.permissionArea || currentPage.replace(".html", "");

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

  const createSidebar = () => {
    const sidebar = document.createElement("aside");
    sidebar.className = "company-sidebar unified-admin-sidebar";
    sidebar.innerHTML = `
      <div class="unified-sidebar-header">
        <a class="company-sidebar-brand" href="empresa.html" aria-label="Seven Gold">
          <img src="assets/logo-copa.png" alt="" />
          <span><strong>Seven Gold</strong><small>Empresa</small></span>
        </a>
        <button class="sidebar-toggle" type="button" aria-label="Recolher menu" title="Recolher ou expandir menu">
          <i data-lucide="menu"></i>
        </button>
      </div>
      <nav class="company-sidebar-nav" aria-label="Navegação da empresa">
        ${navigation
          .map(
            ([href, icon, label, key, roles]) => `
              <a href="${href}" class="${area === key ? "active" : ""}" title="${label}" ${roles ? `data-visible-roles="${roles}"` : ""}>
                <i data-lucide="${icon}"></i><span>${label}</span>
              </a>`
          )
          .join("")}
      </nav>
      <a class="unified-sidebar-profile" href="perfil.html?area=empresa">
        <span class="profile-avatar" data-user-avatar>U</span>
        <span><strong data-user-name>Usuário</strong><small data-user-role>Perfil</small></span>
      </a>
    `;
    return sidebar;
  };

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

    const applyCollapsed = (collapsed) => {
      layout.classList.toggle("sidebar-collapsed", collapsed);
      const button = sidebar.querySelector(".sidebar-toggle");
      button.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
    };

    applyCollapsed(localStorage.getItem(collapsedKey) === "true");
    sidebar.querySelector(".sidebar-toggle").addEventListener("click", () => {
      const collapsed = !layout.classList.contains("sidebar-collapsed");
      localStorage.setItem(collapsedKey, String(collapsed));
      applyCollapsed(collapsed);
    });

    renderIcons();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
