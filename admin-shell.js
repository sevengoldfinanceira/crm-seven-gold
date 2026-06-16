(() => {
  const collapsedKey = "seven-gold-admin-sidebar-collapsed";
  document.documentElement.dataset.adminSidebar =
    localStorage.getItem(collapsedKey) === "true" ? "collapsed" : "expanded";
  const currentPage = window.location.pathname.split("/").pop() || "empresa.html";
  const area = document.body.dataset.permissionArea || currentPage.replace(".html", "");

  const categories = [
    {
      title: "PRINCIPAL",
      items: [
        ["empresa.html", "house", "Painel", "empresa", ""],
        ["organograma.html", "network", "Organograma", "organograma", "dono,administrador,rh"],
        ["#metas", "target", "Metas", "metas", "dono,administrador,coordenador"],
      ],
    },
    {
      title: "GESTÃO",
      items: [
        ["equipe.html", "users", "Equipe", "equipe", "dono,administrador,rh"],
        ["permissoes.html", "lock-keyhole", "Permissões", "permissoes", "dono"],
        ["historia-dono.html", "crown", "História do Dono", "historia_dono", "dono"],
      ],
    },
    {
      title: "FINANCEIRO",
      items: [
        ["financeiro.html", "badge-dollar-sign", "Financeiro", "financeiro", "dono,administrador,financeiro"],
        ["comissoes.html", "percent", "Comissões", "comissoes", "dono,administrador,financeiro"],
        ["relatorios.html", "chart-column", "Relatórios", "relatorios", "dono,administrador,financeiro,marketing,rh"],
      ],
    },
    {
      title: "OPERACIONAL",
      items: [
        ["#marketing", "megaphone", "Marketing", "marketing", "dono,administrador,marketing"],
        ["documentos.html", "file-text", "Documentos", "documentos", ""],
      ],
    },
  ];

  const createSidebar = () => {
    const sidebar = document.createElement("aside");
    sidebar.className = "company-sidebar unified-admin-sidebar";
    sidebar.innerHTML = `
      <div class="unified-sidebar-header">
        <a class="company-sidebar-brand" href="empresa.html" aria-label="Seven Gold">
          <img src="assets/logo-copa.png" alt="" />
          <span class="brand-text">
            <strong class="brand-title">SEVEN GOLD</strong>
            <small class="brand-subtitle">PAINEL EMPRESA</small>
            <small class="brand-tagline">Gestão interna</small>
          </span>
        </a>
        <button class="sidebar-toggle" type="button" aria-label="Recolher menu" title="Recolher ou expandir menu">
          <i data-lucide="menu"></i>
        </button>
      </div>
      <nav class="company-sidebar-nav" aria-label="Navegação da empresa">
        ${categories
          .map(
            (cat) => `
          <div class="menu-section">
            <span class="menu-section-title">${cat.title}</span>
            ${cat.items
              .map(
                ([href, icon, label, key, roles]) => `
              <a href="${href}" class="menu-item${area === key ? " active" : ""}" title="${label}" ${roles ? `data-visible-roles="${roles}"` : ""}>
                <i data-lucide="${icon}"></i><span>${label}</span>
              </a>`
              )
              .join("")}
          </div>`
          )
          .join("")}
      </nav>
      <div class="sidebar-profile-card">
        <div class="profile-main">
          <span class="profile-avatar" data-user-avatar>U</span>
          <div class="profile-info">
            <div class="profile-name-row">
              <strong data-user-name>Usuário</strong>
              <span class="verified-badge"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#d4af37"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
            </div>
            <span class="profile-role" data-user-role>Perfil</span>
            <span class="profile-status"><span class="status-dot"></span>Online</span>
          </div>
        </div>
        <div class="profile-actions">
          <a href="perfil.html?area=empresa" class="profile-action" title="Configurações"><i data-lucide="settings"></i></a>
          <a href="painel.html" class="profile-action" title="Sair"><i data-lucide="log-out"></i></a>
        </div>
      </div>
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
      document.documentElement.dataset.adminSidebar = collapsed ? "collapsed" : "expanded";
      applyCollapsed(collapsed);
    });

    const hamburger = document.createElement("button");
    hamburger.className = "sidebar-hamburger";
    hamburger.setAttribute("aria-label", "Abrir menu");
    hamburger.innerHTML = '<i data-lucide="menu"></i>';
    document.body.appendChild(hamburger);

    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);

    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("drawer-open");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("drawer-open");
      overlay.classList.remove("active");
    });

    renderIcons();

    const nav = sidebar.querySelector(".company-sidebar-nav");
    if (nav) {
      let draggedItem = null;

      nav.addEventListener("mousedown", (e) => {
        const item = e.target.closest(".menu-item");
        if (!item) return;
        e.preventDefault();
      }, { passive: false });

      nav.addEventListener("dragstart", (e) => {
        const item = e.target.closest(".menu-item");
        if (!item) return;
        draggedItem = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
        item.dataset.savedHref = item.getAttribute("href");
        item.removeAttribute("href");
      });

      nav.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const target = e.target.closest(".menu-item");
        nav.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
        if (!target || target === draggedItem) return;
        const rect = target.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        target.classList.add(e.clientY < mid ? "drag-over-top" : "drag-over-bottom");
      });

      nav.addEventListener("dragleave", (e) => {
        const target = e.target.closest(".menu-item");
        if (target) target.classList.remove("drag-over-top", "drag-over-bottom");
      });

      nav.addEventListener("drop", (e) => {
        e.preventDefault();
        const target = e.target.closest(".menu-item");
        if (!target || target === draggedItem) return;
        const rect = target.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          target.parentNode.insertBefore(draggedItem, target);
        } else {
          target.parentNode.insertBefore(draggedItem, target.nextSibling);
        }
        nav.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
        const order = [];
        nav.querySelectorAll(".menu-item").forEach((item) => {
          const section = item.closest(".menu-section");
          const sectionTitle = section ? section.querySelector(".menu-section-title")?.textContent : "";
          order.push({ href: item.getAttribute("href") || item.dataset.savedHref, section: sectionTitle });
        });
        localStorage.setItem("seven-gold-menu-order", JSON.stringify(order));
      });

      nav.addEventListener("dragend", () => {
        if (draggedItem) {
          draggedItem.classList.remove("dragging");
          if (draggedItem.dataset.savedHref) {
            draggedItem.setAttribute("href", draggedItem.dataset.savedHref);
            delete draggedItem.dataset.savedHref;
          }
        }
        draggedItem = null;
        nav.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach((el) => {
          el.classList.remove("drag-over-top", "drag-over-bottom");
        });
      });

      nav.querySelectorAll(".menu-item").forEach((item) => {
        item.setAttribute("draggable", "true");
      });

      const savedOrder = JSON.parse(localStorage.getItem("seven-gold-menu-order") || "[]");
      if (savedOrder.length) {
        const allItems = {};
        nav.querySelectorAll(".menu-item").forEach((item) => {
          allItems[item.getAttribute("href")] = item;
        });
        savedOrder.forEach((entry) => {
          const item = allItems[entry.href];
          if (item) {
            const sections = nav.querySelectorAll(".menu-section");
            sections.forEach((sec) => {
              const title = sec.querySelector(".menu-section-title");
              if (title && title.textContent === entry.section) {
                sec.appendChild(item);
              }
            });
          }
        });
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
