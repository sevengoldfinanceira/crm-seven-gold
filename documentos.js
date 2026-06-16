(function () {
  const grid = document.querySelector("[data-document-grid]");
  const form = document.querySelector("[data-document-form]");
  const statusEl = document.querySelector("[data-document-status]");
  const searchInput = document.querySelector("[data-document-search]");
  const typeFilter = document.querySelector("[data-type-filter]");
  const sectorButtons = Array.from(document.querySelectorAll("[data-sector-filter]"));
  const fileInput = form?.elements.file;
  const fileName = document.querySelector("[data-file-name]");
  const focusButton = document.querySelector("[data-focus-document-form]");

  const bucketName = "company-documents";
  const state = {
    documents: [],
    sector: "todos",
    type: "Todos os tipos",
    search: "",
    roleKey: window.location.hash ? window.location.hash.slice(1) : "",
  };

  const categoryIcons = {
    Contratos: "docs-icon",
    Financeiro: "money-icon",
    Equipe: "team-icon",
    Marketing: "marketing-icon",
    Modelos: "docs-icon",
    Comissoes: "commission-icon",
    Procedimentos: "reports-icon",
  };

  const getClient = () => window.sevenGoldAuth;

  const waitForUser = async () => {
    const client = getClient();

    if (!client) {
      return null;
    }

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data } = await client.auth.getUser();

      if (data.user) {
        return data.user;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  };

  const setStatus = (message, type = "error") => {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.dataset.type = type;
  };

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const formatDate = (value) => {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(new Date(value));
  };

  const countLabel = (count) => `${count} ${count === 1 ? "doc" : "docs"}`;

  const updateCounts = () => {
    const counts = state.documents.reduce(
      (acc, documentItem) => {
        acc.todos += 1;
        acc[documentItem.sector] = (acc[documentItem.sector] || 0) + 1;
        return acc;
      },
      { todos: 0 }
    );

    document.querySelectorAll("[data-sector-count]").forEach((element) => {
      const sector = element.dataset.sectorCount;
      element.textContent = countLabel(counts[sector] || 0);
    });
  };

  const getFilteredDocuments = () => {
    const search = normalize(state.search);

    return state.documents.filter((documentItem) => {
      const matchesSector = state.sector === "todos" || documentItem.sector === state.sector;
      const matchesType =
        state.type === "Todos os tipos" || documentItem.document_type === state.type;
      const matchesRole = !state.roleKey || documentItem.role_key === state.roleKey;
      const searchableText = normalize(
        [
          documentItem.title,
          documentItem.sector,
          documentItem.category,
          documentItem.document_type,
          documentItem.file_name,
        ].join(" ")
      );
      const matchesSearch = !search || searchableText.includes(search);

      return matchesSector && matchesType && matchesRole && matchesSearch;
    });
  };

  const groupByCategory = (documents) =>
    documents.reduce((groups, documentItem) => {
      const category = documentItem.category || "Sem categoria";
      groups[category] = groups[category] || [];
      groups[category].push(documentItem);
      return groups;
    }, {});

  const createDocumentLink = (documentItem) => {
    const link = document.createElement("a");
    link.href = documentItem.signedUrl || "#";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = documentItem.title;

    const meta = document.createElement("span");
    meta.textContent = `${documentItem.sector} | ${documentItem.document_type} | ${formatDate(documentItem.created_at)}`;

    link.append(meta);
    return link;
  };

  const renderEmpty = (title, text) => {
    grid.innerHTML = "";

    const card = document.createElement("article");
    card.className = "document-category";
    card.innerHTML = `
      <header>
        <span class="category-icon docs-icon" aria-hidden="true"></span>
        <div>
          <h2>${title}</h2>
          <p>${text}</p>
        </div>
      </header>
    `;

    grid.append(card);
  };

  const renderDocuments = () => {
    if (!grid) {
      return;
    }

    updateCounts();
    const documents = getFilteredDocuments();

    if (documents.length === 0) {
      renderEmpty(
        state.roleKey ? "Nenhum documento para este cargo" : "Nenhum documento encontrado",
        "Cadastre um novo arquivo ou ajuste os filtros para ver mais documentos."
      );
      return;
    }

    const groups = groupByCategory(documents);
    grid.innerHTML = "";

    Object.entries(groups).forEach(([category, items]) => {
      const card = document.createElement("article");
      card.className = "document-category";

      const header = document.createElement("header");
      const icon = document.createElement("span");
      icon.className = `category-icon ${categoryIcons[category] || "docs-icon"}`;
      icon.setAttribute("aria-hidden", "true");

      const text = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = category;
      const description = document.createElement("p");
      description.textContent = countLabel(items.length);
      text.append(title, description);
      header.append(icon, text);

      const list = document.createElement("div");
      list.className = "document-list";
      items.forEach((documentItem) => list.append(createDocumentLink(documentItem)));

      card.append(header, list);
      grid.append(card);
    });
  };

  const addSignedUrls = async (documents) => {
    const client = getClient();

    return Promise.all(
      documents.map(async (documentItem) => {
        if (!documentItem.file_path) {
          return documentItem;
        }

        const { data } = await client.storage
          .from(bucketName)
          .createSignedUrl(documentItem.file_path, 60 * 60);

        return {
          ...documentItem,
          signedUrl: data?.signedUrl || "#",
        };
      })
    );
  };

  const loadDocuments = async () => {
    const client = getClient();

    if (!client || !grid) {
      return;
    }

    const { data, error } = await client
      .from("company_documents")
      .select("id, title, sector, category, document_type, role_key, file_name, file_path, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      renderEmpty("Tabela de documentos ainda nao criada", "Crie a tabela e o bucket no Supabase para ativar esta aba.");
      return;
    }

    state.documents = await addSignedUrls(data || []);
    renderDocuments();
  };

  sectorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sector = button.dataset.sectorFilter;
      state.roleKey = "";
      window.history.replaceState({}, document.title, window.location.pathname);
      sectorButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderDocuments();
    });
  });

  searchInput?.addEventListener("input", () => {
    state.search = searchInput.value;
    renderDocuments();
  });

  typeFilter?.addEventListener("change", () => {
    state.type = typeFilter.value;
    renderDocuments();
  });

  fileInput?.addEventListener("change", () => {
    fileName.textContent = fileInput.files?.[0]?.name || "Selecionar arquivo";
  });

  focusButton?.addEventListener("click", () => {
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.elements.title?.focus();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const client = getClient();
    const user = await waitForUser();
    const file = fileInput?.files?.[0];

    if (!client || !user) {
      setStatus("Faca login novamente antes de salvar.");
      return;
    }

    if (!file) {
      setStatus("Selecione um arquivo.");
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "-");
    const filePath = `${user.id}/${Date.now()}-${safeName}`;

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    setStatus("");

    const uploadResult = await client.storage.from(bucketName).upload(filePath, file, {
      upsert: false,
    });

    if (uploadResult.error) {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar documento";
      setStatus("Nao consegui subir o arquivo. Confira se o bucket foi criado no Supabase.");
      return;
    }

    const { error } = await client.from("company_documents").insert({
      title,
      sector: String(formData.get("sector") || ""),
      category: String(formData.get("category") || ""),
      document_type: String(formData.get("document_type") || ""),
      role_key: String(formData.get("role_key") || "") || null,
      file_name: file.name,
      file_path: filePath,
      uploaded_by: user.id,
    });

    submitButton.disabled = false;
    submitButton.textContent = "Salvar documento";

    if (error) {
      setStatus("Arquivo subiu, mas nao consegui salvar o cadastro. Confira a tabela no Supabase.");
      return;
    }

    form.reset();
    fileName.textContent = "Selecionar arquivo";
    setStatus("Documento salvo com sucesso.", "success");
    await loadDocuments();
  });

  document.addEventListener("DOMContentLoaded", loadDocuments);
})();
