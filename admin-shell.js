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
        ["metas.html", "target", "Metas", "metas", "dono,administrador,coordenador"],
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
        ["marketing.html", "megaphone", "Marketing", "marketing", "dono,administrador,marketing"],
        ["documentos.html", "file-text", "Documentos", "documentos", ""],
      ],
    },
  ];

  const createTopbar = () => {
    const allItems = categories.flatMap((cat) => cat.items);
    const topbar = document.createElement("header");
    topbar.className = "empresa-topbar";
    topbar.innerHTML = `
      <a class="empresa-topbar-brand" href="empresa.html" aria-label="Seven Gold">
        <img src="assets/logo-copa.png" alt="" />
      </a>
      <nav class="empresa-topbar-nav" aria-label="Navegação da empresa">
        ${allItems
          .map(
            ([href, icon, label, key, roles]) =>
              `<a href="${href}" class="${area === key ? "active" : ""}" ${roles ? `data-visible-roles="${roles}"` : ""}><i data-lucide="${icon}"></i><span>${label}</span></a>`
          )
          .join("")}
      </nav>
      <div class="empresa-topbar-actions">
        <button class="topbar-action-btn notification-trigger" type="button" title="Notificações">
          <i data-lucide="bell"></i>
          <span class="notification-badge">3</span>
        </button>
        <button class="topbar-action-btn chat-trigger" type="button" title="Chat/Mensagens">
          <i data-lucide="message-square"></i>
        </button>
        <a href="perfil.html?area=empresa" class="empresa-topbar-profile" title="Perfil">
          <span class="empresa-topbar-avatar" data-user-avatar>U</span>
          <span class="empresa-topbar-user">
            <strong data-user-name>Usuário</strong>
            <small data-user-role>Administrador</small>
          </span>
        </a>
      </div>
    `;
    return topbar;
  };

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
            (cat, idx) => `
          <div class="menu-section">
            <span class="menu-section-title" data-category-index="${idx}">${cat.title}</span>
            ${cat.items
              .map(
                ([href, icon, label, key, roles]) => `
              <a href="${href}" class="menu-item${area === key ? " active" : ""}" title="${label}" draggable="false" ${roles ? `data-visible-roles="${roles}"` : ""}>
                <i data-lucide="grip-vertical" class="menu-drag-handle"></i>
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
          </div>
        </div>
        <div class="profile-actions">
          <a href="perfil.html?area=empresa" class="profile-action" title="Configurações"><i data-lucide="settings"></i></a>
          <button type="button" class="profile-action btn-edit-sidebar" title="Editar Menu"><i data-lucide="pencil"></i></button>
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

    const savedCategoryTitles = JSON.parse(localStorage.getItem("seven-gold-category-titles") || "{}");
    Object.entries(savedCategoryTitles).forEach(([idx, val]) => {
      if (categories[idx]) {
        categories[idx].title = val;
      }
    });

    const layout = findLayout();
    if (!layout) return;

    layout.classList.add("unified-admin-shell");
    const topbar = createTopbar();
    layout.prepend(topbar);
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
      document.body.classList.toggle("menu-open");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("drawer-open");
      overlay.classList.remove("active");
      document.body.classList.remove("menu-open");
    });

    // Injetar seletor de tema segmentado ao lado da busca global
    const searchForm = document.querySelector(".company-global-search");
    if (searchForm) {
      let searchWrapper = searchForm.parentElement.querySelector(".company-search-wrapper");
      if (!searchWrapper) {
        searchWrapper = document.createElement("div");
        searchWrapper.className = "company-search-wrapper";
        searchForm.before(searchWrapper);
        searchWrapper.appendChild(searchForm);
        
        const themeSegment = document.createElement("div");
        themeSegment.className = "top-theme-toggle-segment";
        themeSegment.innerHTML = `
          <button type="button" class="segment-btn" data-theme-val="light" title="Modo Claro">
            <i data-lucide="sun"></i>
          </button>
          <button type="button" class="segment-btn" data-theme-val="dark" title="Modo Escuro">
            <i data-lucide="moon"></i>
          </button>
        `;
        searchWrapper.appendChild(themeSegment);
        
        const updateSegmentActive = () => {
          const currentTheme = localStorage.getItem("seven-gold-theme") || "light";
          themeSegment.querySelectorAll(".segment-btn").forEach((btn) => {
            const isActive = btn.dataset.themeVal === currentTheme;
            btn.classList.toggle("active", isActive);
          });
        };
        
        updateSegmentActive();
        
        themeSegment.querySelectorAll(".segment-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const theme = btn.dataset.themeVal;
            localStorage.setItem("seven-gold-theme", theme);
            if (theme === "dark") {
              document.body.classList.add("theme-dark");
            } else {
              document.body.classList.remove("theme-dark");
            }
            updateSegmentActive();
            // Disparar evento para sincronizar outros switchers
            window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
          });
        });

        window.addEventListener("themechange", (e) => {
          updateSegmentActive();
        });
      }
    }

    renderIcons();

    const editBtn = sidebar.querySelector(".btn-edit-sidebar");
    const nav = sidebar.querySelector(".company-sidebar-nav");

    if (editBtn && nav) {
      editBtn.addEventListener("click", () => {
        const isEditing = sidebar.classList.toggle("sidebar-editing");
        editBtn.classList.toggle("active", isEditing);
        editBtn.setAttribute("title", isEditing ? "Salvar Menu" : "Editar Menu");
        
        if (isEditing) {
          editBtn.innerHTML = '<i data-lucide="check"></i>';
        } else {
          editBtn.innerHTML = '<i data-lucide="pencil"></i>';
        }
        renderIcons();

        const titles = nav.querySelectorAll(".menu-section-title");
        titles.forEach((title) => {
          title.contentEditable = isEditing ? "true" : "false";
          if (isEditing) {
            title.setAttribute("title", "Clique para editar o nome da categoria");
          } else {
            title.removeAttribute("title");
          }
        });
      });
    }

    if (nav) {
      let draggedItem = null;
      let dragClone = null;
      let startY = 0;
      let isDragging = false;
      let wasDragged = false;

      nav.addEventListener("blur", (e) => {
        const title = e.target.closest(".menu-section-title");
        if (!title) return;
        const idx = title.dataset.categoryIndex;
        const newTitle = title.textContent.trim() || "SEM NOME";
        
        const savedCategoryTitles = JSON.parse(localStorage.getItem("seven-gold-category-titles") || "{}");
        savedCategoryTitles[idx] = newTitle;
        localStorage.setItem("seven-gold-category-titles", JSON.stringify(savedCategoryTitles));
        
        if (categories[idx]) {
          categories[idx].title = newTitle;
        }
      }, true);

      nav.addEventListener("keydown", (e) => {
        const title = e.target.closest(".menu-section-title");
        if (title && e.key === "Enter") {
          e.preventDefault();
          title.blur();
        }
      });

      nav.addEventListener("dragstart", (e) => {
        if (e.target.closest(".menu-item")) {
          e.preventDefault();
        }
      });

      nav.addEventListener("pointerdown", (e) => {
        if (!sidebar.classList.contains("sidebar-editing")) return;
        if (e.button !== 0) return;
        const handle = e.target.closest(".menu-drag-handle");
        if (!handle) return;
        const item = handle.closest(".menu-item");
        if (!item) return;
        startY = e.clientY;
        isDragging = false;
        wasDragged = false;
        draggedItem = item;

        const onPointerMove = (ev) => {
          if (!draggedItem) return;
          const dy = Math.abs(ev.clientY - startY);
          if (!isDragging && dy > 5) {
            isDragging = true;
            draggedItem.classList.add("dragging");
            dragClone = draggedItem.cloneNode(true);
            dragClone.classList.add("drag-clone");
            dragClone.style.cssText = "position:fixed;pointer-events:none;z-index:9999;opacity:.85;width:" + draggedItem.offsetWidth + "px;margin:0;padding:0";
            document.body.appendChild(dragClone);
          }
          if (isDragging && dragClone) {
            dragClone.style.left = (ev.clientX + 14) + "px";
            dragClone.style.top = (ev.clientY - 16) + "px";
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const target = el ? el.closest(".menu-item") : null;
            const targetSec = el ? el.closest(".menu-section") : null;
            nav.querySelectorAll(".drag-over-top, .drag-over-bottom, .drag-over-section").forEach((cls) => cls.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-section"));
            if (target && target !== draggedItem) {
              const rect = target.getBoundingClientRect();
              const mid = rect.top + rect.height / 2;
              target.classList.add(ev.clientY < mid ? "drag-over-top" : "drag-over-bottom");
            } else if (targetSec && !targetSec.contains(draggedItem)) {
              targetSec.classList.add("drag-over-section");
            }
          }
        };

        const onPointerUp = (ev) => {
          document.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("pointerup", onPointerUp);
          document.removeEventListener("pointercancel", onPointerUp);

          if (isDragging && draggedItem) {
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const target = el ? el.closest(".menu-item") : null;
            const targetSec = el ? el.closest(".menu-section") : null;
            if (target && target !== draggedItem) {
              const rect = target.getBoundingClientRect();
              const mid = rect.top + rect.height / 2;
              if (ev.clientY < mid) {
                target.parentNode.insertBefore(draggedItem, target);
              } else {
                target.parentNode.insertBefore(draggedItem, target.nextSibling);
              }
            } else if (targetSec) {
              targetSec.appendChild(draggedItem);
            }
            draggedItem.classList.remove("dragging");
            nav.querySelectorAll(".drag-over-top, .drag-over-bottom, .drag-over-section").forEach((cls) => cls.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-section"));
            const order = [];
            nav.querySelectorAll(".menu-item").forEach((menuItem) => {
              const section = menuItem.closest(".menu-section");
              const sectionTitle = section ? section.querySelector(".menu-section-title")?.textContent : "";
              order.push({ href: menuItem.getAttribute("href"), section: sectionTitle });
            });
            localStorage.setItem("seven-gold-menu-order", JSON.stringify(order));
            wasDragged = true;
          } else if (draggedItem && !isDragging) {
            wasDragged = false;
          }

          if (dragClone) {
            dragClone.remove();
            dragClone = null;
          }
          draggedItem = null;
          isDragging = false;
        };

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerUp);
      }, { passive: false });

      nav.addEventListener("click", (e) => {
        if (e.target.closest(".menu-drag-handle")) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (wasDragged) {
          e.preventDefault();
          e.stopPropagation();
          wasDragged = false;
          return;
        }
      }, true);

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
