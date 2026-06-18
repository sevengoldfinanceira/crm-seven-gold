(function () {
  const grid = document.querySelector("[data-document-grid]");
  const form = document.querySelector("[data-document-form]");
  const statusEl = document.querySelector("[data-document-status]");
  const searchInput = document.querySelector("[data-document-search]");
  
  // Upper Filter Selects
  const typeFilterUpper = document.getElementById("filter-type-upper");
  const sortFilterUpper = document.getElementById("filter-sort-upper");
  
  // Left Sidebar Filters
  const sectorButtons = Array.from(document.querySelectorAll("[data-sector-filter]"));
  const categoryFilter = document.getElementById("filter-category");
  const typeFilter = document.getElementById("filter-type");
  const roleFilter = document.getElementById("filter-role");
  const dateFilter = document.getElementById("filter-date");
  const btnClearAllFilters = document.getElementById("btn-clear-all-filters");
  
  // Form elements
  const fileInput = document.getElementById("file-input");
  const dropZone = document.getElementById("drop-zone");
  const dropZoneText = document.getElementById("drop-zone-text");
  const formFolderSelect = document.getElementById("form-folder-select");
  const editFileInfo = document.getElementById("edit-file-info");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");
  const btnSubmitDoc = document.getElementById("btn-submit-doc");
  const formTitle = document.getElementById("form-title");
  
  // Modals & Shortcuts
  const btnNewFolder = document.getElementById("btn-new-folder");
  const btnCreateFolderShortcut = document.getElementById("btn-create-folder-shortcut");
  const newFolderModal = document.getElementById("new-folder-modal");
  const btnCloseFolderModal = document.getElementById("btn-close-folder-modal");
  const btnCancelFolder = document.getElementById("btn-cancel-folder");
  const newFolderForm = document.getElementById("new-folder-form");

  const bucketName = "company-documents";
  const urlParams = new URLSearchParams(window.location.search);
  const paramSector = urlParams.get("setor");
  const paramCargo = urlParams.get("cargo");
  const paramColaborador = urlParams.get("colaborador");

  // Default folders list mapping
  const defaultFolders = [
    // Diretoria
    { id: "dir-contratos", name: "Contratos", sector: "Diretoria", description: "Contratos e acordos societários." },
    { id: "dir-internos", name: "Documentos internos", sector: "Diretoria", description: "Atas, deliberações e comunicados." },
    { id: "dir-procuracoes", name: "Procurações", sector: "Diretoria", description: "Procurações outorgadas pela diretoria." },
    { id: "dir-regras", name: "Regras da empresa", sector: "Diretoria", description: "Políticas internas e compliance." },
    // Comercial
    { id: "com-contratos", name: "Contratos", sector: "Comercial", description: "Contratos com clientes e parceiros." },
    { id: "com-scripts", name: "Scripts de venda", sector: "Comercial", description: "Roteiros de atendimento e quebra de objeções." },
    { id: "com-videos", name: "Vídeos", sector: "Comercial", description: "Vídeos de treinamentos e pitches." },
    { id: "com-modelos", name: "Modelos de proposta", sector: "Comercial", description: "Apresentações e propostas comerciais." },
    { id: "com-regras", name: "Regras comerciais", sector: "Comercial", description: "Políticas de comissionamento e descontos." },
    // Financeiro
    { id: "fin-comprovantes", name: "Comprovantes", sector: "Financeiro", description: "Comprovantes de pagamento e tributos." },
    { id: "fin-comissoes", name: "Comissões", sector: "Financeiro", description: "Planilhas de comissionamento da equipe." },
    { id: "fin-repasses", name: "Repasses", sector: "Financeiro", description: "Controle de repasses de parceiros." },
    { id: "fin-relatorios", name: "Relatórios", sector: "Financeiro", description: "Fluxo de caixa e balancetes." },
    // Marketing
    { id: "mkt-artes", name: "Artes", sector: "Marketing", description: "Criativos, banners e posts para redes sociais." },
    { id: "mkt-campanhas", name: "Campanhas", sector: "Marketing", description: "Planejamentos de lançamentos e tráfego." },
    { id: "mkt-videos", name: "Vídeos", sector: "Marketing", description: "Vídeos promocionais e anúncios." },
    { id: "mkt-logos", name: "Logos", sector: "Marketing", description: "Manual de marca e arquivos vetoriais." },
    { id: "mkt-materiais", name: "Materiais de anúncio", sector: "Marketing", description: "Cópias, briefings e criativos de anúncios." },
    // Pós-venda
    { id: "pos-atendimento", name: "Atendimento", sector: "Pós-venda", description: "Modelos de mensagens e respostas rápidas." },
    { id: "pos-relatos", name: "Relatos de clientes", sector: "Pós-venda", description: "Depoimentos, NPS e feedbacks." },
    { id: "pos-comprovantes", name: "Comprovantes", sector: "Pós-venda", description: "Comprovantes de quitações e pós-venda." },
    { id: "pos-documentos", name: "Documentos de acompanhamento", sector: "Pós-venda", description: "Planilhas de onboarding e acompanhamento." },
    // RH
    { id: "rh-contratos", name: "Contratos", sector: "RH", description: "Contratos de trabalho, admissão e estágio." },
    { id: "rh-pessoais", name: "Documentos pessoais", sector: "RH", description: "Arquivos de identificação dos colaboradores." },
    { id: "rh-treinamentos", name: "Treinamentos", sector: "RH", description: "Manuais de onboarding e capacitação." },
    { id: "rh-regras", name: "Regras internas", sector: "RH", description: "Regulamento interno de conduta." },
    // Jurídico
    { id: "jur-contratos", name: "Contratos", sector: "Jurídico", description: "Minutas de contratos e acordos de confidencialidade." },
    { id: "jur-termos", name: "Termos", sector: "Jurídico", description: "Termos de uso e políticas de privacidade." },
    { id: "jur-procuracoes", name: "Procurações", sector: "Jurídico", description: "Procurações judiciais e extrajudiciais." },
    { id: "jur-documentos", name: "Documentos legais", sector: "Jurídico", description: "Processos, alvarás e licenças." },
    // Administrativo
    { id: "adm-procedimentos", name: "Procedimentos", sector: "Administrativo", description: "Pops (Procedimento Operacional Padrão) e rotinas." },
    { id: "adm-modelos", name: "Modelos", sector: "Administrativo", description: "Papel timbrado, recibos e minutas adm." },
    { id: "adm-arquivos", name: "Arquivos internos", sector: "Administrativo", description: "Controle patrimonial e insumos." }
  ];

  const state = {
    documents: [],
    folders: [],
    expandedFolders: new Set(),
    activeFolderId: "todos", // selected folder filter
    sector: paramSector || "todos",
    category: "todos",
    type: "todos",
    roleKey: paramCargo || "",
    date: "todos",
    search: paramColaborador || "",
    sortBy: "recentes",
    editingDocId: null,
  };

  const getClient = () => window.sevenGoldAuth;

  // Normalize comparisons
  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Normalize sector to match comparison keys
  const normSec = (name) => {
    if (!name) return "";
    return name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const formatDate = (value) => {
    if (!value) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(value));
  };

  const getFileSizeStr = (doc) => {
    const size = localStorage.getItem("seven-gold-doc-size-" + doc.file_path);
    if (size) {
      const bytes = parseInt(size, 10);
      if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
      return (bytes / 1024).toFixed(0) + " KB";
    }
    const seed = doc.id ? doc.id.charCodeAt(0) % 5 + 1 : 2;
    return (seed * 115) + " KB";
  };

  const refreshIcons = () => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  };

  // Wait for user login authentication
  const waitForUser = async () => {
    const client = getClient();
    if (!client) return null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getUser();
      if (data.user) return data.user;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  const setStatus = (message, type = "error") => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  // Load folders state
  const loadFolders = () => {
    let saved = localStorage.getItem("seven-gold-document-folders");
    if (!saved) {
      localStorage.setItem("seven-gold-document-folders", JSON.stringify(defaultFolders));
      state.folders = defaultFolders;
    } else {
      state.folders = JSON.parse(saved);
    }
  };

  // Save folders state
  const saveFolders = () => {
    localStorage.setItem("seven-gold-document-folders", JSON.stringify(state.folders));
  };

  // Populate dynamic select element for Folder in Document Upload form
  const populateFormFolders = () => {
    if (!formFolderSelect) return;
    formFolderSelect.innerHTML = "";
    
    const selectedSector = form.elements.sector.value;
    const filteredFolders = state.folders.filter(f => normSec(f.sector) === normSec(selectedSector));
    
    if (filteredFolders.length === 0) {
      formFolderSelect.innerHTML = `<option value="">Sem pasta</option>`;
      return;
    }

    filteredFolders.forEach(folder => {
      const option = document.createElement("option");
      option.value = folder.id;
      option.textContent = folder.name;
      formFolderSelect.appendChild(option);
    });
  };

  // Update Summary Counts in metric cards
  const updateSummaryCards = () => {
    // 1. Total docs
    document.getElementById("sum-docs-count").textContent = state.documents.length;
    
    // 2. Pastas
    document.getElementById("sum-folders-count").textContent = state.folders.length;

    // 3. Setores com documentos
    const sectorsWithDocs = new Set(state.documents.map(d => normSec(d.sector)));
    document.getElementById("sum-sectors-count").textContent = sectorsWithDocs.size;

    // 4. Sem vínculo
    const unlinked = state.documents.filter(d => !d.sector || d.sector === "" || d.sector.toLowerCase() === "todos").length;
    document.getElementById("sum-unlinked-count").textContent = unlinked;
  };

  // Count files per sector and update sidebar counts
  const updateSidebarCounts = () => {
    const counts = state.documents.reduce((acc, doc) => {
      acc.todos += 1;
      const normalizedSector = normSec(doc.sector);
      acc[normalizedSector] = (acc[normalizedSector] || 0) + 1;
      return acc;
    }, { todos: 0 });

    document.querySelectorAll("[data-sector-count]").forEach((element) => {
      const sector = element.dataset.sectorCount;
      const mappedKey = normSec(sector);
      const val = mappedKey === "todos" ? counts.todos : (counts[mappedKey] || 0);
      element.textContent = `${val} ${val === 1 ? "doc" : "docs"}`;
    });
  };

  // Filters calculation
  const getFilteredDocuments = () => {
    const search = normalize(state.search);

    return state.documents.filter((doc) => {
      // Sector filter
      const matchesSector = state.sector === "todos" || normSec(doc.sector) === normSec(state.sector);
      
      // Category filter
      const matchesCategory = state.category === "todos" || doc.category === state.category;
      
      // Document Type filter
      const matchesType = state.type === "todos" || doc.document_type === state.type;
      
      // Role filter
      const matchesRole = !state.roleKey || state.roleKey === "todos" || doc.role_key === state.roleKey;
      
      // Date filter
      let matchesDate = true;
      if (state.date !== "todos") {
        const docDate = new Date(doc.created_at);
        const now = new Date();
        const diffMs = now - docDate;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (state.date === "hoje" && diffDays > 1) matchesDate = false;
        else if (state.date === "semana" && diffDays > 7) matchesDate = false;
        else if (state.date === "mes" && diffDays > 30) matchesDate = false;
        else if (state.date === "ano" && diffDays > 365) matchesDate = false;
      }

      // Search bar query (search title, category, type, folder, or file name)
      const folderId = localStorage.getItem("seven-gold-doc-folder-" + doc.file_path) || doc.folder_id || "";
      const folderObj = state.folders.find(f => f.id === folderId);
      const folderName = folderObj ? folderObj.name : "Sem pasta";

      const searchableText = normalize([
        doc.title,
        doc.sector,
        doc.category,
        doc.document_type,
        doc.file_name,
        folderName
      ].join(" "));

      const matchesSearch = !search || searchableText.includes(search);

      return matchesSector && matchesCategory && matchesType && matchesRole && matchesDate && matchesSearch;
    });
  };

  // Render main content area
  const renderDocuments = () => {
    if (!grid) return;

    updateSummaryCards();
    updateSidebarCounts();

    const filteredDocs = getFilteredDocuments();

    // Sort documents
    if (state.sortBy === "nome") {
      filteredDocs.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sortBy === "antigos") {
      filteredDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      // "recentes" (default)
      filteredDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    grid.innerHTML = "";

    // If sector selected is "todos", we show a list of folders, or documents
    const activeSectorLabel = state.sector === "todos" ? "Todos os setores" : state.sector;
    const currentFolders = state.folders.filter(f => state.sector === "todos" || normSec(f.sector) === normSec(state.sector));

    // Render Sector Header in main section
    const sectorHeaderEl = document.createElement("div");
    sectorHeaderEl.style.display = "flex";
    sectorHeaderEl.style.justifyContent = "space-between";
    sectorHeaderEl.style.alignItems = "center";
    sectorHeaderEl.style.marginBottom = "15px";
    sectorHeaderEl.innerHTML = `
      <div>
        <h2 style="font-size: 1.2rem; font-weight: 800; color: var(--ink); margin: 0;">${activeSectorLabel}</h2>
        <span style="font-size: 0.75rem; color: var(--muted);">${filteredDocs.length} ${filteredDocs.length === 1 ? 'documento' : 'documentos'} • ${currentFolders.length} ${currentFolders.length === 1 ? 'pasta' : 'pastas'}</span>
      </div>
      ${state.sector !== "todos" ? `
        <button type="button" class="eq-btn-outline" id="btn-new-folder-sector" style="display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 0.75rem; border: 1.5px solid #d4af37; color: #d4af37; background: #ffffff; border-radius: 6px; cursor: pointer; font-weight: 600;">
          <i data-lucide="plus" style="width: 14px; height: 14px;"></i> Nova pasta neste setor
        </button>
      ` : ""}
    `;

    grid.appendChild(sectorHeaderEl);

    // Event listener for "Nova pasta neste setor"
    sectorHeaderEl.querySelector("#btn-new-folder-sector")?.addEventListener("click", () => {
      openFolderModal(state.sector);
    });

    // 1. Folders Horizontal Grid (Top of Center panel)
    if (currentFolders.length > 0) {
      const folderGridEl = document.createElement("div");
      folderGridEl.className = "eq-folder-grid";

      currentFolders.forEach(folder => {
        const folderDocsCount = filteredDocs.filter(d => {
          const fid = localStorage.getItem("seven-gold-doc-folder-" + d.file_path) || d.folder_id;
          return fid === folder.id;
        }).length;

        const isFolderActive = state.activeFolderId === folder.id;

        const folderCard = document.createElement("div");
        folderCard.className = `eq-folder-card ${isFolderActive ? 'active' : ''}`;
        folderCard.dataset.folderId = folder.id;
        
        folderCard.innerHTML = `
          <div class="eq-folder-card-head">
            <i data-lucide="folder" class="folder-icon"></i>
            <button class="eq-folder-menu-btn" type="button" data-id="${folder.id}">
              <i data-lucide="more-vertical" style="width: 16px; height: 16px;"></i>
            </button>
            <div class="eq-context-menu" id="ctx-menu-${folder.id}">
              <button type="button" class="rename-folder" data-id="${folder.id}"><i data-lucide="edit"></i> Renomear</button>
              <button type="button" class="delete delete-folder" data-id="${folder.id}"><i data-lucide="trash-2"></i> Excluir</button>
            </div>
          </div>
          <h4 title="${folder.name}">${folder.name}</h4>
          <span>${folderDocsCount} ${folderDocsCount === 1 ? 'documento' : 'documentos'}</span>
        `;

        // Folder selection click (expands and highlights)
        folderCard.addEventListener("click", (e) => {
          if (e.target.closest(".eq-folder-menu-btn") || e.target.closest(".eq-context-menu")) return;
          state.activeFolderId = isFolderActive ? "todos" : folder.id;
          if (state.activeFolderId !== "todos") {
            state.expandedFolders.add(folder.id);
          }
          renderDocuments();
        });

        // Three vertical dots menu toggler
        const menuBtn = folderCard.querySelector(".eq-folder-menu-btn");
        const ctxMenu = folderCard.querySelector(".eq-context-menu");
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          // Hide other menus
          document.querySelectorAll(".eq-context-menu").forEach(el => {
            if (el !== ctxMenu) el.style.display = "none";
          });
          ctxMenu.style.display = ctxMenu.style.display === "flex" ? "none" : "flex";
        });

        // Folder Actions bindings inside context menu
        folderCard.querySelector(".rename-folder").addEventListener("click", (e) => {
          e.stopPropagation();
          ctxMenu.style.display = "none";
          const newName = prompt("Digite o novo nome para a pasta:", folder.name);
          if (newName && newName.trim() !== "") {
            folder.name = newName.trim();
            saveFolders();
            renderDocuments();
            populateFormFolders();
          }
        });

        folderCard.querySelector(".delete-folder").addEventListener("click", (e) => {
          e.stopPropagation();
          ctxMenu.style.display = "none";
          
          // Verify if folder has documents before deleting
          const folderDocs = state.documents.filter(d => {
            const fid = localStorage.getItem("seven-gold-doc-folder-" + d.file_path) || d.folder_id;
            return fid === folder.id;
          });

          if (folderDocs.length > 0) {
            alert(`Esta pasta possui ${folderDocs.length} documento(s). Mova ou exclua os documentos antes de apagar a pasta.`);
            return;
          }

          if (confirm(`Tem certeza de que deseja excluir a pasta "${folder.name}"?`)) {
            state.folders = state.folders.filter(f => f.id !== folder.id);
            saveFolders();
            if (state.activeFolderId === folder.id) state.activeFolderId = "todos";
            state.expandedFolders.delete(folder.id);
            renderDocuments();
            populateFormFolders();
          }
        });

        folderGridEl.appendChild(folderCard);
      });

      grid.appendChild(folderGridEl);
    }

    // Hide context menu when clicking elsewhere
    document.addEventListener("click", () => {
      document.querySelectorAll(".eq-context-menu").forEach(el => el.style.display = "none");
    });

    // 2. Collapsible Folders Sections (Aba sanfonada)
    // Filter folders to display (if activeFolderId is selected, show only that folder)
    const foldersToRender = state.activeFolderId === "todos" 
      ? currentFolders 
      : currentFolders.filter(f => f.id === state.activeFolderId);

    // Render folder accordion blocks
    foldersToRender.forEach(folder => {
      const folderDocs = filteredDocs.filter(d => {
        const fid = localStorage.getItem("seven-gold-doc-folder-" + d.file_path) || d.folder_id;
        return fid === folder.id;
      });

      const isExpanded = state.expandedFolders.has(folder.id);

      const folderSection = document.createElement("div");
      folderSection.className = "eq-folder-section";

      folderSection.innerHTML = `
        <div class="eq-folder-section-header">
          <div class="eq-folder-section-header-left">
            <i data-lucide="${isExpanded ? 'folder-open' : 'folder'}" style="color: #d4af37; width: 18px; height: 18px;"></i>
            <h3>${folder.name}</h3>
            <span>• ${folderDocs.length} ${folderDocs.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
          <div class="eq-folder-section-header-right">
            <button type="button" class="eq-btn-outline btn-add-in-folder" style="font-size: 0.72rem; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              <i data-lucide="plus" style="width: 12px; height: 12px;"></i> Adicionar documento
            </button>
            <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" style="width: 16px; height: 16px; color: #94a3b8;"></i>
          </div>
        </div>
        <div class="eq-folder-section-content" style="display: ${isExpanded ? 'flex' : 'none'};">
          <!-- Documents list -->
        </div>
      `;

      // Expand/Collapse header toggle
      folderSection.querySelector(".eq-folder-section-header").addEventListener("click", (e) => {
        if (e.target.closest(".btn-add-in-folder")) return;
        if (isExpanded) {
          state.expandedFolders.delete(folder.id);
        } else {
          state.expandedFolders.add(folder.id);
        }
        renderDocuments();
      });

      // Quick Upload shortcut inside this folder
      folderSection.querySelector(".btn-add-in-folder").addEventListener("click", (e) => {
        e.stopPropagation();
        form.elements.sector.value = folder.sector;
        populateFormFolders();
        form.elements.folder_id.value = folder.id;
        form.elements.title.focus();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      const listContainer = folderSection.querySelector(".eq-folder-section-content");

      if (folderDocs.length === 0) {
        listContainer.innerHTML = `
          <p style="color:#94a3b8; font-size:0.75rem; margin:0; font-style:italic; text-align:center; padding:10px 0;">
            Nenhum documento cadastrado nesta pasta.
          </p>
        `;
      } else {
        folderDocs.forEach(doc => {
          const docCard = document.createElement("div");
          docCard.innerHTML = renderDocumentCard(doc);

          // Bind card buttons actions
          docCard.querySelector(".btn-edit-doc")?.addEventListener("click", () => {
            startEditDocument(doc);
          });

          docCard.querySelector(".btn-delete-doc")?.addEventListener("click", () => {
            deleteDocument(doc.id, doc.file_path, doc.title);
          });

          listContainer.appendChild(docCard.firstElementChild);
        });
      }

      grid.appendChild(folderSection);
    });

    // 3. Render documents without folder ("Sem pasta" section)
    const docsWithoutFolder = filteredDocs.filter(d => {
      const fid = localStorage.getItem("seven-gold-doc-folder-" + d.file_path) || d.folder_id;
      return !fid;
    });

    if (docsWithoutFolder.length > 0 && state.activeFolderId === "todos") {
      const generalSection = document.createElement("div");
      generalSection.className = "eq-folder-section";
      
      const isGeneralExpanded = state.expandedFolders.has("general-unassigned");

      generalSection.innerHTML = `
        <div class="eq-folder-section-header">
          <div class="eq-folder-section-header-left">
            <i data-lucide="help-circle" style="color: #94a3b8; width: 18px; height: 18px;"></i>
            <h3>Documentos Gerais (Sem pasta)</h3>
            <span>• ${docsWithoutFolder.length} ${docsWithoutFolder.length === 1 ? 'documento' : 'documentos'}</span>
          </div>
          <i data-lucide="${isGeneralExpanded ? 'chevron-up' : 'chevron-down'}" style="width: 16px; height: 16px; color: #94a3b8;"></i>
        </div>
        <div class="eq-folder-section-content" style="display: ${isGeneralExpanded ? 'flex' : 'none'};">
          <!-- Documents list -->
        </div>
      `;

      generalSection.querySelector(".eq-folder-section-header").addEventListener("click", () => {
        if (isGeneralExpanded) {
          state.expandedFolders.delete("general-unassigned");
        } else {
          state.expandedFolders.add("general-unassigned");
        }
        renderDocuments();
      });

      const generalList = generalSection.querySelector(".eq-folder-section-content");
      
      docsWithoutFolder.forEach(doc => {
        const docCard = document.createElement("div");
        docCard.innerHTML = renderDocumentCard(doc);

        docCard.querySelector(".btn-edit-doc")?.addEventListener("click", () => {
          startEditDocument(doc);
        });

        docCard.querySelector(".btn-delete-doc")?.addEventListener("click", () => {
          deleteDocument(doc.id, doc.file_path, doc.title);
        });

        generalList.appendChild(docCard.firstElementChild);
      });

      grid.appendChild(generalSection);
    }

    // Render Empty alert if nothing matches search
    if (filteredDocs.length === 0) {
      grid.innerHTML = "";
      grid.appendChild(sectorHeaderEl);
      
      const emptyCard = document.createElement("article");
      emptyCard.className = "eq-document-card";
      emptyCard.style.padding = "24px";
      emptyCard.style.textAlign = "center";
      emptyCard.innerHTML = `
        <div style="color: #cbd5e1; font-size: 2.5rem; margin-bottom: 8px;"><i data-lucide="file-question" style="width: 48px; height: 48px; margin: 0 auto;"></i></div>
        <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Nenhum documento encontrado</h3>
        <p style="font-size: 0.78rem; color: #64748b; margin: 0;">Confira os filtros selecionados, limpe as pesquisas ou cadastre um novo documento.</p>
      `;
      grid.appendChild(emptyCard);
    }

    refreshIcons();
  };

  // Generate document card template
  const renderDocumentCard = (doc) => {
    let fileIcon = "file-text";
    let iconClass = "eq-file-txt";
    const ext = doc.file_name ? doc.file_name.split('.').pop().toLowerCase() : '';
    
    if (ext === 'pdf') {
      fileIcon = "file-text";
      iconClass = "eq-file-pdf";
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      fileIcon = "file-spreadsheet";
      iconClass = "eq-file-xls";
    } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
      fileIcon = "image";
      iconClass = "eq-file-img";
    } else if (['doc', 'docx'].includes(ext)) {
      fileIcon = "file";
      iconClass = "eq-file-doc";
    }

    const sizeStr = getFileSizeStr(doc);
    const resolvedRole = doc.role_key 
      ? (doc.role_key === 'diretor-ceo' ? 'Diretor / CEO' : doc.role_key) 
      : 'Sem cargo';

    return `
      <div class="eq-document-card" data-doc-id="${doc.id}">
        <div class="eq-doc-card-top">
          <div class="eq-doc-card-icon-wrapper ${iconClass}">
            <i data-lucide="${fileIcon}"></i>
            ${ext ? `<span class="eq-doc-card-ext-badge">${ext.toUpperCase()}</span>` : ''}
          </div>
          <div class="eq-doc-card-title-info">
            <h4>${doc.title}</h4>
            <p>${doc.file_name || 'Sem arquivo'}</p>
          </div>
          <span class="eq-doc-status-badge">Ativo</span>
        </div>
        
        <div class="eq-doc-card-meta-grid">
          <div class="eq-doc-meta-item">
            <span class="meta-label">Cargo</span>
            <strong class="meta-value" title="${resolvedRole}">${resolvedRole}</strong>
          </div>
          <div class="eq-doc-meta-item">
            <span class="meta-label">Categoria</span>
            <strong class="meta-value">${doc.category || 'Geral'}</strong>
          </div>
          <div class="eq-doc-meta-item">
            <span class="meta-label">Tipo</span>
            <strong class="meta-value">${doc.document_type || 'Documento'}</strong>
          </div>
          <div class="eq-doc-meta-item">
            <span class="meta-label">Data</span>
            <strong class="meta-value">${formatDate(doc.created_at)}</strong>
          </div>
          <div class="eq-doc-meta-item">
            <span class="meta-label">Tamanho</span>
            <strong class="meta-value">${sizeStr}</strong>
          </div>
          <div class="eq-doc-meta-item">
            <span class="meta-label">Responsável</span>
            <strong class="meta-value" style="display: flex; align-items: center; gap: 4px;">
              <span class="eq-mini-avatar">${(doc.uploader_name || 'J').charAt(0)}</span>
              ${doc.uploader_name || 'Jonatã'}
            </strong>
          </div>
        </div>
        
        <div class="eq-doc-card-actions">
          <a href="${doc.signedUrl || '#'}" target="_blank" class="eq-btn-card-action btn-view-doc"><i data-lucide="eye"></i> Visualizar</a>
          <a href="${doc.signedUrl || '#'}" download="${doc.file_name || 'documento'}" class="eq-btn-card-action btn-download-doc"><i data-lucide="download"></i> Baixar</a>
          <button type="button" class="eq-btn-card-action btn-edit-doc" data-id="${doc.id}"><i data-lucide="edit-2"></i> Editar</button>
          <button type="button" class="eq-btn-card-action btn-delete-doc eq-btn-delete" data-id="${doc.id}"><i data-lucide="trash-2"></i> Excluir</button>
        </div>
      </div>
    `;
  };

  // Add signed urls to documents fetched from Supabase
  const addSignedUrls = async (documents) => {
    const client = getClient();
    if (!client) return documents;

    return Promise.all(
      documents.map(async (doc) => {
        if (!doc.file_path) return doc;
        try {
          const { data } = await client.storage
            .from(bucketName)
            .createSignedUrl(doc.file_path, 60 * 60);

          return {
            ...doc,
            signedUrl: data?.signedUrl || "#",
          };
        } catch (e) {
          console.error(e);
          return doc;
        }
      })
    );
  };

  // Load documents list from Supabase
  const loadDocuments = async () => {
    const client = getClient();

    if (!client) {
      // Fallback simulated local load if Supabase not configured
      const savedDocs = localStorage.getItem("seven-gold-company-documents-local");
      if (savedDocs) {
        state.documents = JSON.parse(savedDocs);
      } else {
        // Mock starter document matching user reference image
        state.documents = [
          {
            id: "mock-doc-1",
            title: "Contrato padrão",
            sector: "Diretoria",
            category: "Contratos",
            document_type: "Contrato",
            role_key: "diretor-ceo",
            file_name: "contrato_padrao.pdf",
            file_path: "mock/contrato_padrao.pdf",
            created_at: new Date("2026-06-10T14:30:00.000Z").toISOString(),
            signedUrl: "#",
            uploader_name: "Jonatã"
          }
        ];
        localStorage.setItem("seven-gold-doc-folder-mock/contrato_padrao.pdf", "dir-contratos");
        localStorage.setItem("seven-gold-doc-size-mock/contrato_padrao.pdf", "250880"); // 245 KB
        localStorage.setItem("seven-gold-company-documents-local", JSON.stringify(state.documents));
      }
      
      // Auto expand folder containing mock document
      state.expandedFolders.add("dir-contratos");
      
      renderDocuments();
      return;
    }

    try {
      const { data, error } = await client
        .from("company_documents")
        .select("id, title, sector, category, document_type, role_key, file_name, file_path, created_at");

      if (error) {
        console.error(error);
        return;
      }

      state.documents = await addSignedUrls(data || []);
      
      // Merge local storage counts/data mapping if any
      renderDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Document
  const deleteDocument = async (docId, filePath, docTitle) => {
    if (!confirm(`Deseja realmente excluir o documento "${docTitle}"?`)) {
      return;
    }

    const client = getClient();

    if (!client) {
      // Fallback local storage delete
      state.documents = state.documents.filter(d => d.id !== docId);
      localStorage.setItem("seven-gold-company-documents-local", JSON.stringify(state.documents));
      localStorage.removeItem("seven-gold-doc-folder-" + filePath);
      localStorage.removeItem("seven-gold-doc-size-" + filePath);
      setStatus("Documento excluído localmente com sucesso.", "success");
      renderDocuments();
      return;
    }

    try {
      // 1. Remove from database
      const { error: dbError } = await client
        .from("company_documents")
        .delete()
        .eq("id", docId);

      if (dbError) {
        setStatus("Não consegui excluir o registro no Supabase.");
        return;
      }

      // 2. Remove from Storage
      await client.storage.from(bucketName).remove([filePath]);

      localStorage.removeItem("seven-gold-doc-folder-" + filePath);
      localStorage.removeItem("seven-gold-doc-size-" + filePath);
      setStatus("Documento excluído com sucesso.", "success");
      await loadDocuments();
    } catch (e) {
      console.error(e);
      setStatus("Erro ao processar exclusão.");
    }
  };

  // Start Editing mode
  const startEditDocument = (doc) => {
    state.editingDocId = doc.id;
    
    // Set form title
    formTitle.innerHTML = `<i data-lucide="edit" style="color: #d4af37;"></i> Editar documento`;
    
    // Fill fields
    form.elements.title.value = doc.title;
    form.elements.sector.value = doc.sector;
    
    populateFormFolders();
    const folderId = localStorage.getItem("seven-gold-doc-folder-" + doc.file_path) || doc.folder_id;
    form.elements.folder_id.value = folderId || "";
    
    form.elements.category.value = doc.category;
    form.elements.document_type.value = doc.document_type;
    form.elements.role_key.value = doc.role_key || "";
    
    // File upload optional for editing
    
    // Show current file information
    editFileInfo.textContent = `Arquivo atual: ${doc.file_name}`;
    editFileInfo.style.display = "block";
    btnCancelEdit.style.display = "block";
    btnSubmitDoc.innerHTML = `<i data-lucide="save" style="width: 16px; height: 16px;"></i> Salvar alterações`;
    
    // Scroll and focus
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.elements.title.focus();
    
    refreshIcons();
  };

  // Cancel Editing mode
  const cancelEdit = () => {
    state.editingDocId = null;
    form.reset();
    formTitle.innerHTML = `<i data-lucide="file-plus" style="color: #d4af37;"></i> Adicionar documento`;
    editFileInfo.style.display = "none";
    btnCancelEdit.style.display = "none";
    btnSubmitDoc.innerHTML = `<i data-lucide="save" style="width: 16px; height: 16px;"></i> Salvar documento`;
    dropZoneText.textContent = "Arraste e solte ou clique para escolher";
    populateFormFolders();
    refreshIcons();
  };

  // Modal handlers
  const openFolderModal = (sectorName = "") => {
    newFolderModal.style.display = "flex";
    newFolderForm.reset();
    if (sectorName) {
      newFolderForm.elements.folderSector.value = sectorName;
    }
    newFolderForm.elements.folderName.focus();
    refreshIcons();
  };

  const closeFolderModal = () => {
    newFolderModal.style.display = "none";
  };

  // File drag & drop events helper
  const setupFileDrop = () => {
    if (!dropZone || !fileInput) return;

    // Trigger click on dropzone triggers file selector
    dropZone.addEventListener("click", () => {
      fileInput.click();
    });

    // drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        dropZoneText.textContent = files[0].name;
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        dropZoneText.textContent = fileInput.files[0].name;
      } else {
        dropZoneText.textContent = "Arraste e solte ou clique para escolher";
      }
    });
  };

  // Initialize and register bindings
  const init = async () => {
    loadFolders();

    // 1. Sector Left Side Tabs clicks
    sectorButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.sector = button.dataset.sectorFilter;
        state.activeFolderId = "todos"; // reset folder selection
        window.history.replaceState({}, document.title, window.location.pathname);
        sectorButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        
        // Match form sector dropdown to active sector
        if (state.sector !== "todos") {
          form.elements.sector.value = state.sector;
          populateFormFolders();
        }
        
        renderDocuments();
      });
    });

    // Sector select change inside upload form dynamically updates folders
    form.elements.sector.addEventListener("change", populateFormFolders);
    populateFormFolders(); // initial call

    // 2. Search bars & Upper Filters
    searchInput?.addEventListener("input", () => {
      state.search = searchInput.value;
      renderDocuments();
    });

    typeFilterUpper?.addEventListener("change", () => {
      state.type = typeFilterUpper.value === "Todos os tipos" ? "todos" : typeFilterUpper.value;
      renderDocuments();
    });

    sortFilterUpper?.addEventListener("change", () => {
      state.sortBy = sortFilterUpper.value;
      renderDocuments();
    });

    // 3. Left Sidebar filters
    categoryFilter?.addEventListener("change", () => {
      state.category = categoryFilter.value;
      renderDocuments();
    });

    typeFilter?.addEventListener("change", () => {
      state.type = typeFilter.value;
      renderDocuments();
    });

    roleFilter?.addEventListener("change", () => {
      state.roleKey = roleFilter.value;
      renderDocuments();
    });

    dateFilter?.addEventListener("change", () => {
      state.date = dateFilter.value;
      renderDocuments();
    });

    btnClearAllFilters?.addEventListener("click", () => {
      categoryFilter.value = "todos";
      typeFilter.value = "todos";
      roleFilter.value = "todos";
      dateFilter.value = "todos";
      searchInput.value = "";
      if (typeFilterUpper) typeFilterUpper.value = "Todos os tipos";
      if (sortFilterUpper) sortFilterUpper.value = "recentes";
      
      state.category = "todos";
      state.type = "todos";
      state.roleKey = "";
      state.date = "todos";
      state.search = "";
      state.sortBy = "recentes";
      
      renderDocuments();
    });

    // 4. Nova Pasta Modals triggers
    btnNewFolder?.addEventListener("click", () => openFolderModal(state.sector !== "todos" ? state.sector : "Diretoria"));
    btnCreateFolderShortcut?.addEventListener("click", () => openFolderModal(form.elements.sector.value));
    btnCloseFolderModal?.addEventListener("click", closeFolderModal);
    btnCancelFolder?.addEventListener("click", closeFolderModal);

    // Form submit for folder creation
    newFolderForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const folderName = newFolderForm.elements.folderName.value.trim();
      const folderSector = newFolderForm.elements.folderSector.value;
      const folderRole = newFolderForm.elements.folderRole.value;
      const folderDesc = newFolderForm.elements.folderDesc.value.trim();

      const newFolder = {
        id: `folder-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        name: folderName,
        sector: folderSector,
        role_key: folderRole || null,
        description: folderDesc || null,
        createdAt: new Date().toISOString()
      };

      state.folders.push(newFolder);
      saveFolders();
      closeFolderModal();
      populateFormFolders();
      
      // Auto expand newly created folder
      state.expandedFolders.add(newFolder.id);
      renderDocuments();
      alert(`Pasta "${folderName}" criada com sucesso no setor ${folderSector}!`);
    });

    // 5. Upload file dropzone
    setupFileDrop();

    // 6. Focus triggers
    const focusButton = document.querySelector("[data-focus-document-form]");
    focusButton?.addEventListener("click", () => {
      form?.scrollIntoView({ behavior: "smooth", block: "start" });
      form?.elements.title?.focus();
    });

    btnCancelEdit?.addEventListener("click", cancelEdit);

    // 7. Form submission: Adicionar / Editar Documento
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const client = getClient();
      const user = await waitForUser();
      const file = fileInput?.files?.[0];

      if (!client) {
        // Fallback local storage upload
        const formData = new FormData(form);
        const title = String(formData.get("title") || "").trim();
        const selectedSector = String(formData.get("sector") || "");
        const folderId = String(formData.get("folder_id") || "");
        const category = String(formData.get("category") || "");
        const type = String(formData.get("document_type") || "");
        const role_key = String(formData.get("role_key") || "") || null;

        if (state.editingDocId) {
          // Edit mode
          const doc = state.documents.find(d => d.id === state.editingDocId);
          if (doc) {
            doc.title = title;
            doc.sector = selectedSector;
            doc.category = category;
            doc.document_type = type;
            doc.role_key = role_key;
            
            if (file) {
              doc.file_name = file.name;
              doc.file_path = `local/${Date.now()}-${file.name}`;
              localStorage.setItem("seven-gold-doc-size-" + doc.file_path, file.size.toString());
              localStorage.setItem("seven-gold-doc-folder-" + doc.file_path, folderId);
            } else {
              localStorage.setItem("seven-gold-doc-folder-" + doc.file_path, folderId);
            }
          }
          localStorage.setItem("seven-gold-company-documents-local", JSON.stringify(state.documents));
          cancelEdit();
          setStatus("Documento editado com sucesso.", "success");
        } else {
          // Create mode
          if (!file) {
            setStatus("Selecione um arquivo.");
            return;
          }
          const filePath = `local/${Date.now()}-${file.name}`;
          const newDoc = {
            id: `doc-${Date.now()}`,
            title,
            sector: selectedSector,
            category,
            document_type: type,
            role_key,
            file_name: file.name,
            file_path: filePath,
            created_at: new Date().toISOString(),
            signedUrl: "#",
            uploader_name: "Jonatã"
          };
          state.documents.push(newDoc);
          localStorage.setItem("seven-gold-doc-size-" + filePath, file.size.toString());
          localStorage.setItem("seven-gold-doc-folder-" + filePath, folderId);
          localStorage.setItem("seven-gold-company-documents-local", JSON.stringify(state.documents));
          
          form.reset();
          dropZoneText.textContent = "Arraste e solte ou clique para escolher";
          setStatus("Documento cadastrado com sucesso.", "success");
        }

        renderDocuments();
        return;
      }

      // Supabase storage & database upload
      if (!user) {
        setStatus("Faça login novamente antes de salvar.");
        return;
      }

      const submitButton = form.querySelector("button[type='submit']");
      const formData = new FormData(form);
      const title = String(formData.get("title") || "").trim();
      const selectedSector = String(formData.get("sector") || "");
      const folderId = String(formData.get("folder_id") || "");
      const category = String(formData.get("category") || "");
      const type = String(formData.get("document_type") || "");
      const role_key = String(formData.get("role_key") || "") || null;

      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
      setStatus("");

      try {
        if (state.editingDocId) {
          // Edit mode
          const doc = state.documents.find(d => d.id === state.editingDocId);
          if (!doc) {
            setStatus("Documento não encontrado.");
            submitButton.disabled = false;
            submitButton.textContent = "Salvar documento";
            return;
          }

          let filePath = doc.file_path;
          let fileNameVal = doc.file_name;

          if (file) {
            // If new file chosen, upload to storage
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "-");
            filePath = `${user.id}/${Date.now()}-${safeName}`;
            
            const uploadResult = await client.storage.from(bucketName).upload(filePath, file, {
              upsert: false,
            });

            if (uploadResult.error) {
              submitButton.disabled = false;
              submitButton.textContent = "Salvar documento";
              setStatus("Não consegui subir o novo arquivo. Confirme o bucket.");
              return;
            }
            fileNameVal = file.name;
            localStorage.setItem("seven-gold-doc-size-" + filePath, file.size.toString());
          }

          // Update database row
          const { error } = await client
            .from("company_documents")
            .update({
              title,
              sector: selectedSector,
              category,
              document_type: type,
              role_key,
              file_name: fileNameVal,
              file_path: filePath,
            })
            .eq("id", state.editingDocId);

          if (error) {
            setStatus("Cadastro não pôde ser atualizado no Supabase.");
            submitButton.disabled = false;
            submitButton.textContent = "Salvar documento";
            return;
          }

          // Save folder mapping locally
          localStorage.setItem("seven-gold-doc-folder-" + filePath, folderId);
          cancelEdit();
          setStatus("Documento atualizado com sucesso.", "success");
        } else {
          // Create mode
          if (!file) {
            setStatus("Selecione um arquivo.");
            submitButton.disabled = false;
            submitButton.textContent = "Salvar documento";
            return;
          }

          const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "-");
          const filePath = `${user.id}/${Date.now()}-${safeName}`;

          const uploadResult = await client.storage.from(bucketName).upload(filePath, file, {
            upsert: false,
          });

          if (uploadResult.error) {
            submitButton.disabled = false;
            submitButton.textContent = "Salvar documento";
            setStatus("Não consegui subir o arquivo. Confira o bucket no Supabase.");
            return;
          }

          const { error } = await client.from("company_documents").insert({
            title,
            sector: selectedSector,
            category,
            document_type: type,
            role_key,
            file_name: file.name,
            file_path: filePath,
            uploaded_by: user.id,
          });

          if (error) {
            setStatus("Arquivo subiu, mas não salvei o cadastro. Confira a tabela no Supabase.");
            submitButton.disabled = false;
            submitButton.textContent = "Salvar documento";
            return;
          }

          localStorage.setItem("seven-gold-doc-size-" + filePath, file.size.toString());
          localStorage.setItem("seven-gold-doc-folder-" + filePath, folderId);

          form.reset();
          dropZoneText.textContent = "Arraste e solte ou clique para escolher";
          setStatus("Documento salvo com sucesso.", "success");
        }

        submitButton.disabled = false;
        submitButton.textContent = "Salvar documento";
        await loadDocuments();
      } catch (e) {
        console.error(e);
        submitButton.disabled = false;
        submitButton.textContent = "Salvar documento";
        setStatus("Erro ao salvar cadastro.");
      }
    });

    // 8. Load initial documents list
    await loadDocuments();

    // 9. Process and sync query string routing parameters on initialization
    if (paramSector) {
      // Find sector button and trigger click to select
      const activeSectorBtn = sectorButtons.find(btn => normSec(btn.dataset.sectorFilter) === normSec(paramSector));
      if (activeSectorBtn) {
        activeSectorBtn.click();
      }
      
      // Auto expand folders of this sector on query load
      state.folders
        .filter(f => normSec(f.sector) === normSec(paramSector))
        .forEach(f => state.expandedFolders.add(f.id));
        
      renderDocuments();
    }

    if (paramCargo) {
      if (roleFilter) roleFilter.value = paramCargo;
      state.roleKey = paramCargo;
      renderDocuments();
    }

    if (paramColaborador) {
      if (searchInput) searchInput.value = paramColaborador;
      state.search = paramColaborador;
      renderDocuments();
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
