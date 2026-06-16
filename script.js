const menuButton = document.querySelector(".menu-button");
const navItems = document.querySelectorAll(".nav-item");
const modal = document.querySelector(".lead-modal");
const openModalButton = document.querySelector("[data-open-modal]");
const closeModalButton = document.querySelector("[data-close-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadFormStatus = document.querySelector("[data-lead-form-status]");
const leadCount = document.querySelector("[data-lead-count]");
const columns = Array.from(document.querySelectorAll("[data-status]"));
let draggedLeadId = null;
let pointerDrag = null;

const statusLabels = {
  lead_recebido: "Lead recebido",
  primeiro_contato: "Primeiro contato",
  agendamento: "Agendamento",
  cliente_em_loja: "Cliente em loja",
  proposta_enviada: "Proposta enviada",
  venda_fechada: "Venda fechada",
};

menuButton?.addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

const overlay = document.querySelector(".sidebar-overlay");
overlay?.addEventListener("click", () => {
  document.body.classList.remove("menu-open");
});

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((navItem) => navItem.classList.remove("active"));
    item.classList.add("active");
    document.body.classList.remove("menu-open");
  });
});

openModalButton?.addEventListener("click", () => {
  if (typeof modal?.showModal === "function") {
    modal.showModal();
  }
});

closeModalButton?.addEventListener("click", () => {
  modal?.close();
});

const setFormStatus = (message, type = "error") => {
  if (!leadFormStatus) {
    return;
  }

  leadFormStatus.textContent = message;
  leadFormStatus.dataset.type = type;
};

const getClient = () => window.sevenGoldAuth;

const getCurrentUser = async () => {
  const client = getClient();

  if (!client) {
    return null;
  }

  const { data } = await client.auth.getUser();
  return data.user;
};

const formatLeadDate = (value) => {
  if (!value) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const updateLeadStatus = async (leadId, status) => {
  const client = getClient();

  if (!client || !leadId || !status) {
    return false;
  }

  const { error } = await client.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    alert("Nao consegui mover o lead. Tente novamente.");
    return false;
  }

  await loadLeads();
  return true;
};

const createMoveMenu = (lead) => {
  const details = document.createElement("details");
  details.className = "lead-actions";

  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", "Mover lead");
  summary.textContent = "...";

  const menu = document.createElement("div");
  menu.className = "move-menu";

  Object.entries(statusLabels).forEach(([status, label]) => {
    if (status === lead.status) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      details.removeAttribute("open");
      await updateLeadStatus(lead.id, status);
    });

    menu.append(button);
  });

  details.append(summary, menu);
  return details;
};

const createLeadCard = (lead) => {
  const card = document.createElement("article");
  card.className = lead.status === "venda_fechada" ? "lead-card done" : "lead-card";
  card.draggable = true;
  card.dataset.leadId = lead.id;

  const top = document.createElement("div");
  top.className = "lead-card-top";

  const name = document.createElement("strong");
  name.textContent = lead.name;

  const tag = document.createElement("mark");
  tag.className = lead.status === "venda_fechada" ? "money" : "soft";
  tag.textContent = statusLabels[lead.status] || "Novo";
  const actions = createMoveMenu(lead);

  const note = document.createElement("p");
  note.textContent = lead.note || "Sem observacao cadastrada.";

  const footer = document.createElement("footer");
  const origin = document.createElement("span");
  origin.textContent = lead.origin || "Origem nao informada";

  const createdAt = document.createElement("time");
  createdAt.textContent = formatLeadDate(lead.created_at);

  top.append(name, tag, actions);
  footer.append(origin, createdAt);
  card.append(top, note, footer);

  return card;
};

const renderEmptyState = (stack) => {
  const empty = document.createElement("p");
  empty.className = "empty-column";
  empty.textContent = "Sem leads nesta etapa.";
  stack.append(empty);
};

const renderLeads = (leads) => {
  const total = leads.length;

  columns.forEach((column) => {
    const status = column.dataset.status;
    const stack = column.querySelector(".card-stack");
    const counter = column.querySelector("small");
    const leadsInColumn = leads.filter((lead) => lead.status === status);

    stack.innerHTML = "";
    counter.textContent = leadsInColumn.length;

    if (leadsInColumn.length === 0) {
      renderEmptyState(stack);
      return;
    }

    leadsInColumn.forEach((lead) => {
      stack.append(createLeadCard(lead));
    });
  });

  if (leadCount) {
    leadCount.textContent = `${total} ${total === 1 ? "lead ativo" : "leads ativos"}`;
  }
};

const loadLeads = async () => {
  const client = getClient();

  if (!client || columns.length === 0) {
    return;
  }

  const { data, error } = await client
    .from("leads")
    .select("id, name, origin, note, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    if (leadCount) {
      leadCount.textContent = "Tabela de leads ainda nao criada.";
    }
    return;
  }

  renderLeads(data || []);
};

const setupDragAndDrop = () => {
  columns.forEach((column) => {
    const stack = column.querySelector(".card-stack");

    stack.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });

    stack.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    stack.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");

      if (draggedLeadId) {
        await updateLeadStatus(draggedLeadId, column.dataset.status);
      }

      draggedLeadId = null;
    });
  });

  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".lead-card");

    if (!card) {
      return;
    }

    draggedLeadId = card.dataset.leadId;
    card.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedLeadId);
  });

  document.addEventListener("dragend", (event) => {
    event.target.closest?.(".lead-card")?.classList.remove("is-dragging");
    columns.forEach((column) => column.classList.remove("drag-over"));
    draggedLeadId = null;
  });
};

const setupTouchMove = () => {
  document.addEventListener("pointerdown", (event) => {
    const card = event.target.closest?.(".lead-card");

    if (!card || event.target.closest("button, summary, details, a, input, select, textarea")) {
      return;
    }

    pointerDrag = {
      id: card.dataset.leadId,
      card,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  });

  document.addEventListener(
    "pointermove",
    (event) => {
      if (!pointerDrag) {
        return;
      }

      const distance = Math.hypot(
        event.clientX - pointerDrag.startX,
        event.clientY - pointerDrag.startY
      );

      if (distance < 12 && !pointerDrag.active) {
        return;
      }

      pointerDrag.active = true;
      pointerDrag.card.classList.add("is-dragging");
      event.preventDefault();

      columns.forEach((column) => column.classList.remove("drag-over"));
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-status]")
        ?.classList.add("drag-over");
    },
    { passive: false }
  );

  document.addEventListener("pointerup", async (event) => {
    if (!pointerDrag) {
      return;
    }

    const drag = pointerDrag;
    pointerDrag = null;
    drag.card.classList.remove("is-dragging");
    columns.forEach((column) => column.classList.remove("drag-over"));

    if (!drag.active) {
      return;
    }

    const targetColumn = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest("[data-status]");

    if (targetColumn) {
      await updateLeadStatus(drag.id, targetColumn.dataset.status);
    }
  });
};

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const client = getClient();
  const user = await getCurrentUser();

  if (!client || !user) {
    setFormStatus("Faca login novamente antes de salvar.");
    return;
  }

  const submitButton = leadForm.querySelector("button[type='submit']");
  const formData = new FormData(leadForm);
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    setFormStatus("Informe o nome do lead.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";
  setFormStatus("");

  const { error } = await client.from("leads").insert({
    name,
    origin: String(formData.get("origin") || "").trim(),
    status: "lead_recebido",
    note: String(formData.get("note") || "").trim(),
    owner_id: user.id,
  });

  submitButton.disabled = false;
  submitButton.textContent = "Salvar lead";

  if (error) {
    setFormStatus("Nao consegui salvar. Confira se a tabela leads foi criada no Supabase.");
    return;
  }

  leadForm.reset();
  modal?.close();
  await loadLeads();
});

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  setupTouchMove();
  loadLeads();
});
