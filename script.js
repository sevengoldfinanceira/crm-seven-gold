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
    document.body.classList.remove("menu-open");
  });
});

openModalButton?.addEventListener("click", () => {
  if (typeof modal?.showModal === "function") {
    const title = modal.querySelector("#modal-title");
    const submitButton = modal.querySelector("button[type='submit']");
    const statusLabel = modal.querySelector("#modal-status-label");
    const deleteBtn = modal.querySelector("#delete-lead-modal-btn");

    if (title) title.textContent = "Novo lead";
    if (submitButton) submitButton.textContent = "Salvar lead";
    if (statusLabel) statusLabel.style.display = "none";
    if (deleteBtn) deleteBtn.style.display = "none";

    if (leadForm) {
      leadForm.reset();
      leadForm.dataset.mode = "create";
      delete leadForm.dataset.leadId;
    }
    setFormStatus("");
    modal.showModal();
  }
});

closeModalButton?.addEventListener("click", () => {
  modal?.close();
});

const openEditLeadModal = (lead) => {
  if (!modal || !leadForm) return;

  const title = modal.querySelector("#modal-title");
  const submitButton = modal.querySelector("button[type='submit']");
  const statusLabel = modal.querySelector("#modal-status-label");
  const deleteBtn = modal.querySelector("#delete-lead-modal-btn");

  if (title) title.textContent = "Editar Lead";
  if (submitButton) submitButton.textContent = "Salvar Alteracoes";
  if (statusLabel) statusLabel.style.display = "block";
  if (deleteBtn) deleteBtn.style.display = "block";

  leadForm.dataset.mode = "edit";
  leadForm.dataset.leadId = lead.id;

  if (leadForm.elements["name"]) {
    leadForm.elements["name"].value = lead.name;
  }
  if (leadForm.elements["telefone"]) {
    leadForm.elements["telefone"].value = lead.telefone || "";
  }
  if (leadForm.elements["status"]) {
    leadForm.elements["status"].value = lead.status || "lead_recebido";
  }
  if (leadForm.elements["origin"]) {
    leadForm.elements["origin"].value = lead.origin || "Site publico";
  }
  if (leadForm.elements["note"]) {
    leadForm.elements["note"].value = lead.note || "";
  }

  setFormStatus("");
  modal.showModal();
};

document.getElementById("delete-lead-modal-btn")?.addEventListener("click", async () => {
  const leadId = leadForm?.dataset.leadId;
  if (!leadId) return;

  if (confirm("Tem certeza que deseja excluir este lead permanentemente?")) {
    const success = await deleteLead(leadId);
    if (success) {
      modal?.close();
      await loadLeads();
    }
  }
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

const formatInternationalPhone = (phoneStr) => {
  if (!phoneStr) return "";
  
  // Clean all non-digits
  let digits = phoneStr.replace(/\D/g, "");
  
  if (digits.length === 0) return phoneStr;

  // Normalize Brazilian numbers: if it has 10 or 11 digits and doesn't start with 55, assume Brazil +55
  if (digits.length <= 11 && !digits.startsWith("55") && digits.length >= 10) {
    digits = "55" + digits;
  }

  // Format if it starts with 55 (Brazil)
  if (digits.startsWith("55")) {
    const rest = digits.slice(2);
    if (rest.length === 11) {
      // Mobile: +55 (XX) XXXXX-XXXX
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
    } else if (rest.length === 10) {
      // Landline: +55 (XX) XXXX-XXXX
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6)}`;
    }
  }

  // Fallback for other lengths or countries
  return "+" + digits;
};

const formatDisplayPhone = (phoneStr) => {
  if (!phoneStr) return "";
  let digits = phoneStr.replace(/\D/g, "");
  if (digits.length === 0) return phoneStr;
  if (digits.startsWith("55") && digits.length > 2) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneStr;
};

const deleteLead = async (leadId) => {
  if (!leadId) {
    return false;
  }

  try {
    const response = await fetch(`/api/leads/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: leadId }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      alert("Erro ao excluir o lead: " + (result.error || "Erro desconhecido"));
      return false;
    }

    return true;
  } catch (err) {
    alert("Erro de conexao ao excluir o lead. Tente novamente.");
    console.error("Delete failed:", err);
    return false;
  }
};

const editLead = async (leadId) => {
  const client = getClient();
  if (!client) return;

  const { data: lead, error: fetchError } = await client
    .from("leads")
    .select("name, telefone, note")
    .eq("id", leadId)
    .single();

  if (fetchError || !lead) {
    alert("Erro ao carregar dados do lead para edicao.");
    return;
  }

  const newName = prompt("Editar Nome do Lead:", lead.name);
  if (newName === null) return;
  const trimmedName = newName.trim();
  if (!trimmedName) return;

  const newPhone = prompt("Editar Telefone (ex: 11999998888):", lead.telefone || "");
  if (newPhone === null) return;

  const newNote = prompt("Editar Observacao:", lead.note || "");
  if (newNote === null) return;

  const { error } = await client
    .from("leads")
    .update({ 
      name: trimmedName,
      telefone: newPhone.replace(/\D/g, ""),
      note: newNote.trim()
    })
    .eq("id", leadId);

  if (error) {
    alert("Erro ao salvar alteracoes: " + error.message);
  } else {
    await loadLeads();
  }
};

const updateLeadCount = () => {
  if (!leadCount) return;
  let total = 0;
  columns.forEach((column) => {
    const stack = column.querySelector(".card-stack");
    total += stack.querySelectorAll(".lead-card").length;
  });
  leadCount.textContent = `${total} ${total === 1 ? "lead ativo" : "leads ativos"}`;
};

const updateLeadStatus = async (leadId, status, { optimistic = false } = {}) => {
  const client = getClient();

  if (!client || !leadId || !status) {
    return false;
  }

  if (optimistic) {
    const targetColumn = columns.find((col) => col.dataset.status === status);
    const sourceCard = document.querySelector(`[data-lead-id="${leadId}"]`);

    if (sourceCard && targetColumn) {
      const targetStack = targetColumn.querySelector(".card-stack");
      const emptyMsg = targetStack.querySelector(".empty-column");
      if (emptyMsg) emptyMsg.remove();
      targetStack.append(sourceCard);

      const counter = targetColumn.querySelector("small");
      if (counter) {
        counter.textContent = targetStack.querySelectorAll(".lead-card").length;
      }

      const sourceColumn = sourceCard.closest?.(".kanban-column");
      if (sourceColumn && sourceColumn !== targetColumn) {
        const sourceStack = sourceColumn.querySelector(".card-stack");
        const sourceCounter = sourceColumn.querySelector("small");
        if (sourceCounter) {
          sourceCounter.textContent = sourceStack.querySelectorAll(".lead-card").length;
        }
        if (sourceStack.querySelectorAll(".lead-card").length === 0) {
          renderEmptyState(sourceStack);
        }
      }

      updateLeadCount();
    }
  }

  const { error } = await client.from("leads").update({ status }).eq("id", leadId);

  if (error) {
    if (optimistic) {
      await loadLeads();
    } else {
      alert("Nao consegui mover o lead. Tente novamente.");
    }
    return false;
  }

  if (!optimistic) {
    await loadLeads();
  }
  return true;
};

const createLeadCard = (lead) => {
  const card = document.createElement("article");
  card.className = lead.status === "venda_fechada" ? "lead-card done" : "lead-card";
  card.draggable = true;
  card.dataset.leadId = lead.id;

  const top = document.createElement("div");
  top.className = "lead-card-top";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "lead-select-checkbox";
  checkbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
    updateBulkActionsBar();
  });

  const name = document.createElement("strong");
  name.className = "lead-card-name";
  // Format casing nicely (Capitalized words)
  name.textContent = lead.name
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  // Dynamic font sizing to keep the name in a single line
  const nameLength = lead.name.length;
  if (nameLength > 24) {
    name.style.fontSize = "0.7rem";
  } else if (nameLength > 16) {
    name.style.fontSize = "0.78rem";
  } else {
    name.style.fontSize = "0.85rem";
  }

  const nameWrapper = document.createElement("div");
  nameWrapper.className = "lead-card-title-group";
  nameWrapper.append(checkbox, name);

  top.append(nameWrapper);

  // Warning Badge (days without contact)
  const createdDate = new Date(lead.created_at);
  const now = new Date();
  const diffTime = Math.abs(now - createdDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const warningBadge = document.createElement("div");
  warningBadge.className = "lead-warning-badge";
  if (diffDays === 0) {
    warningBadge.textContent = "⚠️ Criado hoje";
  } else {
    warningBadge.textContent = `⚠️ ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} sem contato`;
  }

  // Phone Line
  const phoneLine = document.createElement("div");
  phoneLine.className = "lead-phone-line";
  const phoneIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #9ca3af; margin-right: 6px; vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const phoneText = document.createElement("span");
  phoneText.textContent = lead.telefone ? formatDisplayPhone(lead.telefone) : "Sem telefone";
  phoneLine.innerHTML = phoneIcon;
  phoneLine.append(phoneText);

  // Optional Note
  const hasCustomNote = lead.note && lead.note.trim() !== "" && lead.note.trim().toLowerCase() !== "sem observacao cadastrada.";
  let noteEl = null;
  if (hasCustomNote) {
    noteEl = document.createElement("p");
    noteEl.className = "lead-card-note";
    noteEl.textContent = lead.note;
  }

  // Stacked metadata footer (origin and created date)
  const metaContainer = document.createElement("div");
  metaContainer.className = "lead-info-meta";

  const originEl = document.createElement("span");
  originEl.className = "lead-meta-origin";
  originEl.textContent = `Via: ${lead.origin || "Origem nao informada"}`;

  const createdAtEl = document.createElement("span");
  createdAtEl.className = "lead-meta-date";
  createdAtEl.textContent = `Criado em: ${formatLeadDate(lead.created_at)}`;

  metaContainer.append(originEl, createdAtEl);

  // Separator
  const divider = document.createElement("hr");
  divider.className = "lead-card-divider";

  // Actions Row
  const actionsRow = document.createElement("div");
  actionsRow.className = "lead-card-actions-row";

  const cleanDigits = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
  const waPhone = (cleanDigits.length <= 11 && !cleanDigits.startsWith("55") && cleanDigits.length >= 10) 
    ? "55" + cleanDigits 
    : cleanDigits;

  const waBtn = document.createElement("a");
  waBtn.href = lead.telefone ? `https://wa.me/${waPhone}` : "#";
  waBtn.target = lead.telefone ? "_blank" : "_self";
  waBtn.className = "lead-action-btn wa-btn";
  waBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WA`;
  if (!lead.telefone) waBtn.style.opacity = "0.5";

  const callBtn = document.createElement("a");
  callBtn.href = lead.telefone ? `tel:+${waPhone}` : "#";
  callBtn.className = "lead-action-btn call-btn";
  callBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Ligar`;
  if (!lead.telefone) callBtn.style.opacity = "0.5";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "lead-action-btn edit-btn";
  editBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Editar`;
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditLeadModal(lead);
  });

  actionsRow.append(waBtn, callBtn, editBtn);

  // Append everything
  card.append(top, warningBadge, phoneLine);
  if (noteEl) {
    card.append(noteEl);
  }
  card.append(metaContainer, divider, actionsRow);

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
    .select("id, name, origin, note, status, created_at, telefone")
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

    stack.addEventListener("dragleave", (event) => {
      if (stack.contains(event.relatedTarget)) {
        return;
      }
      column.classList.remove("drag-over");
    });

    stack.addEventListener("drop", async (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");

      if (draggedLeadId) {
        await updateLeadStatus(draggedLeadId, column.dataset.status, { optimistic: true });
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
    if (event.pointerType !== "touch") {
      return;
    }

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
      if (!pointerDrag || event.pointerType !== "touch") {
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
    if (!pointerDrag || event.pointerType !== "touch") {
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
      await updateLeadStatus(drag.id, targetColumn.dataset.status, { optimistic: true });
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

  const mode = leadForm.dataset.mode || "create";
  const leadId = leadForm.dataset.leadId;

  if (mode === "edit" && leadId) {
    const { error } = await client.from("leads").update({
      name,
      telefone: String(formData.get("telefone") || "").replace(/\D/g, ""),
      status: String(formData.get("status") || "lead_recebido").trim(),
      origin: String(formData.get("origin") || "").trim(),
      note: String(formData.get("note") || "").trim(),
    }).eq("id", leadId);

    submitButton.disabled = false;
    submitButton.textContent = "Salvar Alteracoes";

    if (error) {
      setFormStatus("Nao consegui atualizar o lead: " + error.message);
      return;
    }
  } else {
    const { error } = await client.from("leads").insert({
      name,
      telefone: String(formData.get("telefone") || "").replace(/\D/g, ""),
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
  }

  leadForm.reset();
  modal?.close();
  await loadLeads();
});

const updateBulkActionsBar = () => {
  const checkboxes = document.querySelectorAll(".lead-select-checkbox:checked");
  const bar = document.getElementById("bulk-actions-bar");
  const countSpan = document.getElementById("bulk-selected-count");

  if (!bar || !countSpan) return;

  const count = checkboxes.length;
  countSpan.textContent = count;

  if (count > 0) {
    bar.style.display = "flex";
  } else {
    bar.style.display = "none";
    const select = document.getElementById("bulk-move-select");
    if (select) select.value = "";
  }
};

const setupBulkActions = () => {
  const moveSelect = document.getElementById("bulk-move-select");
  const deleteBtn = document.getElementById("bulk-delete-btn");
  const cancelBtn = document.getElementById("bulk-cancel-btn");

  moveSelect?.addEventListener("change", async (e) => {
    const targetStatus = e.target.value;
    if (!targetStatus) return;

    const checkboxes = document.querySelectorAll(".lead-select-checkbox:checked");
    const leadIds = Array.from(checkboxes).map(cb => cb.closest(".lead-card")?.dataset.leadId).filter(Boolean);

    if (leadIds.length === 0) return;

    if (confirm(`Deseja mover os ${leadIds.length} leads selecionados para "${statusLabels[targetStatus]}"?`)) {
      const client = getClient();
      if (!client) return;

      // Optimistic update
      checkboxes.forEach(cb => {
        const card = cb.closest(".lead-card");
        if (card) {
          card.classList.remove("selected");
          cb.checked = false;
        }
      });
      updateBulkActionsBar();

      const { error } = await client
        .from("leads")
        .update({ status: targetStatus })
        .in("id", leadIds);

      if (error) {
        alert("Erro ao mover alguns leads. Detalhes: " + error.message);
      }

      await loadLeads();
    } else {
      moveSelect.value = "";
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const checkboxes = document.querySelectorAll(".lead-select-checkbox:checked");
    const leadIds = Array.from(checkboxes).map(cb => cb.closest(".lead-card")?.dataset.leadId).filter(Boolean);

    if (leadIds.length === 0) return;

    if (confirm(`Tem certeza que deseja excluir permanentemente os ${leadIds.length} leads selecionados?`)) {
      const client = getClient();
      if (!client) return;

      // Optimistic UI updates
      checkboxes.forEach(cb => {
        const card = cb.closest(".lead-card");
        if (card) card.remove();
      });
      updateBulkActionsBar();

      try {
        const response = await fetch(`/api/leads/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: leadIds }),
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
          alert("Erro ao excluir os leads: " + (result.error || "Erro desconhecido"));
          await loadLeads();
          return;
        }

        await loadLeads();
      } catch (err) {
        alert("Erro de conexao ao excluir os leads. Tente novamente.");
        console.error("Bulk delete failed:", err);
        await loadLeads();
      }
    }
  });

  cancelBtn?.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll(".lead-select-checkbox:checked");
    checkboxes.forEach(cb => {
      cb.checked = false;
      cb.closest(".lead-card")?.classList.remove("selected");
    });
    updateBulkActionsBar();
  });
};

const tabTitleMap = {
  dashboard: "Dashboard",
  pipeline: "Pipeline",
  tarefas: "Tarefas",
  feed: "Feed",
  calendario: "Calendario",
  financeiro: "Financeiro",
  cadastro: "Cadastro rapido",
  equipe: "Minha equipe",
};

const switchTab = () => {
  const hash = window.location.hash.replace("#", "") || "pipeline";
  const validTabs = ["dashboard", "pipeline", "tarefas", "feed", "calendario", "financeiro", "cadastro", "equipe"];
  const activeTab = validTabs.includes(hash) ? hash : "pipeline";

  document.querySelectorAll(".tab-content").forEach((section) => {
    section.style.display = section.dataset.tab === activeTab ? "" : "none";
  });

  navItems.forEach((item) => {
    const isActive = item.getAttribute("href") === "#" + activeTab;
    item.classList.toggle("active", isActive);
    if (isActive) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  const titleEl = document.querySelector("[data-tab-title]");
  if (titleEl) titleEl.textContent = tabTitleMap[activeTab] || "Pipeline";
};

window.addEventListener("hashchange", switchTab);

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  setupTouchMove();
  setupBulkActions();
  switchTab();
  loadLeads();
});
