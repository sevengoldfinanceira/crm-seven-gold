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

  // Divider line
  const divider = document.createElement("hr");
  divider.style.border = "0";
  divider.style.borderTop = "1px solid var(--line)";
  divider.style.margin = "4px 0";
  menu.append(divider);

  // Delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Excluir Lead";
  deleteBtn.style.color = "#dc2626";
  deleteBtn.style.fontWeight = "600";
  deleteBtn.addEventListener("click", async () => {
    details.removeAttribute("open");
    if (confirm(`Tem certeza que deseja excluir o lead "${lead.name}"?`)) {
      const card = details.closest(".lead-card");
      if (card) {
        card.remove();
        // Update column counter
        const column = card.closest("[data-status]");
        if (column) {
          const counter = column.querySelector("small");
          if (counter) {
            const currentCount = parseInt(counter.textContent || "0", 10);
            counter.textContent = Math.max(0, currentCount - 1);
          }
        }
        // Update total active leads counter
        if (leadCount) {
          const currentTotalText = leadCount.textContent || "";
          const match = currentTotalText.match(/^(\d+)/);
          if (match) {
            const currentTotal = parseInt(match[1], 10);
            const newTotal = Math.max(0, currentTotal - 1);
            leadCount.textContent = `${newTotal} ${newTotal === 1 ? "lead ativo" : "leads ativos"}`;
          }
        }
      }

      const success = await deleteLead(lead.id);
      if (!success) {
        // If it failed, reload all leads to restore the correct state
        await loadLeads();
      }
    }
  });
  menu.append(deleteBtn);

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
  name.textContent = lead.name;

  const nameWrapper = document.createElement("div");
  nameWrapper.style.display = "flex";
  nameWrapper.style.alignItems = "center";
  nameWrapper.style.gap = "6px";
  nameWrapper.append(checkbox, name);

  const tag = document.createElement("mark");
  tag.className = lead.status === "venda_fechada" ? "money" : "soft";
  tag.textContent = statusLabels[lead.status] || "Novo";
  const actions = createMoveMenu(lead);

  const note = document.createElement("p");
  note.textContent = lead.note || "Sem observacao cadastrada.";

  const phoneContainer = document.createElement("div");
  phoneContainer.className = "lead-phone-container";
  phoneContainer.style.fontSize = "0.78rem";
  phoneContainer.style.fontWeight = "600";
  phoneContainer.style.marginTop = "2px";
  phoneContainer.style.marginBottom = "2px";
  phoneContainer.style.display = "flex";
  phoneContainer.style.alignItems = "center";
  phoneContainer.style.gap = "6px";

  if (lead.telefone) {
    const cleanDigits = lead.telefone.replace(/\D/g, "");
    const waPhone = (cleanDigits.length <= 11 && !cleanDigits.startsWith("55") && cleanDigits.length >= 10) 
      ? "55" + cleanDigits 
      : cleanDigits;

    const phoneLink = document.createElement("a");
    phoneLink.href = `https://wa.me/${waPhone}`;
    phoneLink.target = "_blank";
    phoneLink.className = "lead-phone-link";
    phoneLink.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${formatInternationalPhone(lead.telefone)}`;
    phoneLink.style.color = "var(--blue)";
    phoneLink.style.textDecoration = "none";
    
    phoneContainer.append(phoneLink);
  } else {
    const noPhone = document.createElement("span");
    noPhone.textContent = "Sem telefone";
    noPhone.style.color = "var(--muted)";
    noPhone.style.fontStyle = "italic";
    phoneContainer.append(noPhone);
  }

  const footer = document.createElement("footer");
  const origin = document.createElement("span");
  origin.textContent = lead.origin || "Origem nao informada";

  const createdAt = document.createElement("time");
  createdAt.textContent = formatLeadDate(lead.created_at);

  top.append(nameWrapper, tag, actions);
  footer.append(origin, createdAt);
  card.append(top, phoneContainer, note, footer);

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

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  setupTouchMove();
  setupBulkActions();
  loadLeads();
});
