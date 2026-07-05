const menuButton = document.querySelector(".menu-button");
const navItems = document.querySelectorAll(".nav-item");
const modal = document.querySelector(".lead-modal");
const openModalButton = document.querySelector("[data-open-modal]");
const closeModalButton = document.querySelector("[data-close-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadFormStatus = document.querySelector("[data-lead-form-status]");
const leadCount = document.querySelector("[data-lead-count]");
const columns = Array.from(document.querySelectorAll(".kanban-column[data-status]"));
const appointmentModal = document.querySelector(".appointment-modal");
const appointmentForm = document.querySelector("[data-appointment-form]");
const appointmentStatus = document.querySelector("[data-appointment-status]");
const calendarGrid = document.querySelector("[data-calendar-grid]");
const calendarMobileList = document.querySelector("[data-calendar-mobile-list]");
const calendarWeekLabel = document.querySelector("[data-calendar-week-label]");
const calendarStatus = document.querySelector("[data-calendar-status]");
const calendarStatTotal = document.querySelector("[data-calendar-stat-total]");
const calendarStatConfirmed = document.querySelector("[data-calendar-stat-confirmed]");
const calendarStatStore = document.querySelector("[data-calendar-stat-store]");
let draggedLeadId = null;
let pointerDrag = null;
let calendarWeekStart = null;
let calendarAppointments = [];
let appointmentResolution = null;
let currentEditingLead = null;
let deepLinkedLeadHandled = false;
let commercialProductions = [];
let selectedProduction = null;
let isProductionDirectorCeo = false;
let selectedPipelinePeriod = "week";
let selectedPipelinePeriodValue = "";

const syncPipelineMonthToProduction = () => {
  const monthInput = document.getElementById("pipeline-period-month-input");
  const productionMonth = selectedProduction?.starts_at?.slice(0, 7);
  if (!monthInput || !productionMonth) return;
  monthInput.min = productionMonth;
  monthInput.max = productionMonth;
  monthInput.value = productionMonth;
  if (selectedPipelinePeriod === "month") selectedPipelinePeriodValue = productionMonth;
};

const isSelectedProductionClosed = () => selectedProduction?.status === "closed";
const formatProductionDate = (value) => value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "";

const productionRequest = async (body) => {
  const client = getClient();
  const { data: sessionData } = await client.auth.getSession();
  const response = await fetch("/api/productions/manage", {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${sessionData?.session?.access_token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) throw new Error(result.error || "Não foi possível gerenciar a produção.");
  return result;
};

const renderProductionControl = () => {
  const control = document.getElementById("production-control");
  if (!control || !selectedProduction) return;
  control.hidden = false;
  document.getElementById("production-eyebrow").textContent = isSelectedProductionClosed() ? "Produção encerrada" : "Produção atual";
  document.getElementById("production-name").textContent = selectedProduction.name;
  document.getElementById("production-range").textContent = `${formatProductionDate(selectedProduction.starts_at)} até ${formatProductionDate(selectedProduction.ends_at)}`;
  const status = document.getElementById("production-status");
  status.textContent = isSelectedProductionClosed() ? "Encerrada" : "Aberta";
  status.className = `production-status ${isSelectedProductionClosed() ? "is-closed" : "is-open"}`;
  const index = commercialProductions.findIndex((item) => item.id === selectedProduction.id);
  const prev = document.getElementById("production-prev"); const next = document.getElementById("production-next");
  prev.hidden = !isProductionDirectorCeo; next.hidden = !isProductionDirectorCeo;
  prev.disabled = index >= commercialProductions.length - 1; next.disabled = index <= 0;
  document.getElementById("production-close").hidden = !isProductionDirectorCeo || isSelectedProductionClosed();
  document.getElementById("production-start").hidden = !isProductionDirectorCeo || commercialProductions.some((item) => item.status === "open");
  document.getElementById("production-readonly-warning").hidden = !isSelectedProductionClosed();
  document.body.classList.toggle("production-readonly", isSelectedProductionClosed());
  if (openModalButton) openModalButton.disabled = isSelectedProductionClosed();
  if (typeof syncPipelineMonthToProduction === "function") syncPipelineMonthToProduction();
};

const loadCommercialProductions = async () => {
  try {
    const result = await productionRequest();
    commercialProductions = result.productions || [];
    isProductionDirectorCeo = result.isDirectorCeo === true;
    selectedProduction = commercialProductions.find((item) => item.status === "open") || commercialProductions[0] || null;
    if (selectedProduction) renderProductionControl();
  } catch (error) {
    console.error("Erro ao carregar produção comercial:", error);
    if (leadCount) leadCount.textContent = error.message;
  }
};

const initProductionControls = () => {
  const switchProduction = async (direction) => {
    const index = commercialProductions.findIndex((item) => item.id === selectedProduction?.id);
    const target = commercialProductions[index + direction]; if (!target) return;
    selectedProduction = target; renderProductionControl(); await Promise.all([loadLeads(), loadDashboardMetrics()]);
  };
  document.getElementById("production-prev")?.addEventListener("click", () => switchProduction(1));
  document.getElementById("production-next")?.addEventListener("click", () => switchProduction(-1));
  const closePreviewModal = document.getElementById("production-close-preview-modal");
  document.getElementById("production-close")?.addEventListener("click", async () => {
    if (!isProductionDirectorCeo || !selectedProduction) return;
    document.getElementById("close-preview-range").textContent = selectedProduction.name;
    document.getElementById("close-preview-total").textContent = "...";
    document.getElementById("close-preview-vendas").textContent = "...";
    document.getElementById("close-preview-lixeira").textContent = "...";
    document.getElementById("close-preview-continuar").textContent = "...";
    document.getElementById("close-preview-dups-warning").style.display = "none";
    if (typeof closePreviewModal?.showModal === "function") {
      closePreviewModal.showModal();
    }
    try {
      const res = await productionRequest({ action: "preview_close", production_id: selectedProduction.id });
      if (res.ok && res.preview) {
        const p = res.preview;
        document.getElementById("close-preview-total").textContent = String(p.total);
        document.getElementById("close-preview-vendas").textContent = String(p.vendaFechada);
        document.getElementById("close-preview-lixeira").textContent = String(p.lixeira);
        document.getElementById("close-preview-continuar").textContent = String(p.continuaveis);
        if (p.duplicados > 0) {
          document.getElementById("close-preview-dups-count").textContent = String(p.duplicados);
          document.getElementById("close-preview-dups-warning").style.display = "list-item";
        } else {
          document.getElementById("close-preview-dups-warning").style.display = "none";
        }
      } else {
        alert(res.error || "Não foi possível carregar a prévia de fechamento.");
        closePreviewModal?.close();
      }
    } catch (err) {
      alert(err.message || "Erro ao carregar prévia.");
      closePreviewModal?.close();
    }
  });

  document.getElementById("close-preview-cancel-btn")?.addEventListener("click", () => closePreviewModal?.close());
  document.getElementById("close-preview-cancel-btn2")?.addEventListener("click", () => closePreviewModal?.close());

  document.getElementById("close-preview-confirm-btn")?.addEventListener("click", async () => {
    if (!selectedProduction) return;
    const confirmBtn = document.getElementById("close-preview-confirm-btn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Fechando...";
    try {
      await productionRequest({ action: "close", production_id: selectedProduction.id });
      closePreviewModal?.close();
      await loadCommercialProductions();
      await loadLeads();
    } catch (error) {
      alert(error.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Confirmar Fechamento";
    }
  });
  document.getElementById("production-start")?.addEventListener("click", async () => {
    try { await productionRequest({ action: "start_next" }); await loadCommercialProductions(); await loadLeads(); } catch (error) { alert(error.message); }
  });
};

const createLeadActivityLog = async ({
  leadId,
  actionType,
  actionLabel,
  description,
  oldValue,
  newValue
}) => {
  const client = getClient();
  if (!client) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;

  const payload = {
    lead_id: leadId,
    action_type: actionType,
    action_label: actionLabel,
    description: description || null,
    old_value: oldValue ? String(oldValue) : null,
    new_value: newValue ? String(newValue) : null,
    created_by_email: currentCrmUser?.email || null,
    created_by_name: currentCrmUser?.nome || currentCrmUser?.email || null,
    created_by_role: currentCrmUser?.cargo || null,
    created_at: new Date().toISOString()
  };

  const { error } = await client
    .from("lead_activity_logs")
    .insert(payload);

  if (error) {
    console.error("[Histórico Lead] Erro ao registrar ação da tarefa:", error);
  }
};

const statusLabels = {
  lead_recebido: "Lead recebido",
  primeiro_contato: "Primeiro contato",
  agendamento: "Agendamento",
  cliente_em_loja: "Cliente em loja",
  proposta_enviada: "Em aprovação",
  venda_fechada: "Venda fechada",
  cancelado: "Lixeira",
};

const PIPELINE_STAGE_TAGS = {
  primeiro_contato: [
    {
      value: "retorno",
      label: "Retorno",
      className: "retorno",
    },
    {
      value: "confirmar_agend",
      label: "Confirmar agend.",
      className: "confirmar-agend",
    },
    {
      value: "acompanhar",
      label: "Acompanhar",
      className: "acompanhar",
    },
    {
      value: "nao_quer",
      label: "Não quer",
      className: "nao-quer",
    },
  ],
  agendamento: [
    {
      value: "reagendar",
      label: "Reagendar",
      className: "reagendar",
    },
    {
      value: "sem_retorno",
      label: "Sem retorno",
      className: "sem-retorno",
    },
    {
      value: "nao_quer",
      label: "Não quer",
      className: "nao-quer",
    },
  ],
};

const PIPELINE_STAGE_TAGS_MAP = Object.values(PIPELINE_STAGE_TAGS)
  .flat()
  .reduce((acc, tag) => {
    acc[tag.value] = tag;
    return acc;
  }, {});

const getAvailableTagsForStage = (stageId) => {
  if (!stageId) return [];
  const tags = PIPELINE_STAGE_TAGS[stageId];
  return Array.isArray(tags) ? tags : [];
};

const getLeadTagValue = (lead) => {
  if (!lead) return null;
  const tags = Array.isArray(lead.tags) ? lead.tags : (typeof lead.tags === "string" && lead.tags.trim() !== ""
    ? lead.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : []);
  return tags.length > 0 ? String(tags[0]) : null;
};

const getLeadTagConfig = (lead) => {
  const value = getLeadTagValue(lead);
  if (!value) return null;
  return PIPELINE_STAGE_TAGS_MAP[value] || { value, label: value, className: "default" };
};

const pipelineStatusOrder = [
  "lead_recebido",
  "primeiro_contato",
  "agendamento",
  "cliente_em_loja",
  "proposta_enviada",
  "venda_fechada",
];

const getNextPipelineStatus = (status) => {
  const currentIndex = pipelineStatusOrder.indexOf(status);
  return currentIndex >= 0 ? pipelineStatusOrder[currentIndex + 1] || null : null;
};

const canMoveToPipelineStatus = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) return true;
  if (currentStatus === "cancelado") return false;
  if (targetStatus === "cancelado") return true;
  return targetStatus === getNextPipelineStatus(currentStatus);
};

const getPreviousPipelineStatus = (status) => {
  const currentIndex = pipelineStatusOrder.indexOf(status);
  return currentIndex > 0 ? pipelineStatusOrder[currentIndex - 1] : null;
};

const canGoBackPipelineStatus = (currentStatus) => {
  if (currentStatus === "cancelado") return false;
  return getPreviousPipelineStatus(currentStatus) !== null;
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

// ─── Sidebar Collapse Toggle ───
const sidebarCollapseBtn = document.querySelector(".sidebar-collapse-btn");
if (sidebarCollapseBtn) {
  if (localStorage.getItem("sidebar-collapsed") === "true") {
    document.body.classList.add("sidebar-collapsed");
  }
  sidebarCollapseBtn.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sidebar-collapsed", document.body.classList.contains("sidebar-collapsed"));
  });
  document.querySelectorAll(".nav-item .nav-label").forEach((label) => {
    const navItem = label.closest(".nav-item");
    if (navItem) navItem.setAttribute("data-tooltip", label.textContent.trim());
  });
}

openModalButton?.addEventListener("click", () => {
  if (isSelectedProductionClosed()) return alert("Lead travado porque pertence a uma produção encerrada.");
  if (typeof modal?.showModal === "function") {
    const title = modal.querySelector("#modal-title");
    const submitButton = modal.querySelector("button[type='submit']");
    const deleteBtn = modal.querySelector("#delete-lead-modal-btn");

    if (title) title.textContent = "Novo lead";
    if (submitButton) submitButton.textContent = "Salvar lead";
    if (deleteBtn) deleteBtn.style.display = "none";

    if (leadForm) {
      leadForm.reset();
      leadForm.dataset.mode = "create";
      delete leadForm.dataset.leadId;
    }
    const metaContainer = modal.querySelector("#modal-lead-meta");
    if (metaContainer) metaContainer.style.display = "none";
    const responsibleSection = modal.querySelector("#modal-lead-responsible");
    if (responsibleSection) responsibleSection.style.display = "none";
    setFormStatus("");
    modal.showModal();
  }
});

closeModalButton?.addEventListener("click", () => {
  modal?.close();
  currentEditingLead = null;
});

document.getElementById("modal-lead-responsible-select")?.addEventListener("change", async (event) => {
  const newEmail = event.target.value;
  if (!currentEditingLead || !newEmail) return;
  const previousEmail = currentEditingLead.assigned_to_email || "";
  if (newEmail === previousEmail) return;

  if (confirm(`Deseja alterar o responsavel deste lead para "${newEmail}"?`)) {
    const savedLead = await changeLeadResponsible(currentEditingLead.id, newEmail);
    if (!savedLead) {
      event.target.value = previousEmail;
      event.target.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const updatedLead = { ...currentEditingLead, ...savedLead };
    currentEditingLead = updatedLead;
    const responsibleName = modal.querySelector("#modal-lead-responsible-name");
    const responsibleEmail = modal.querySelector("#modal-lead-responsible-email");
    if (responsibleName) responsibleName.textContent = updatedLead.assigned_to_name || newEmail;
    if (responsibleEmail) {
      responsibleEmail.textContent = newEmail;
      responsibleEmail.style.display = "inline";
    }
  } else {
    event.target.value = previousEmail;
    event.target.dispatchEvent(new Event("input", { bubbles: true }));
  }
});

const openEditLeadModal = async (lead, highlightTaskId = null) => {
  if (!modal || !leadForm) return;

  const client = getClient();
  const title = modal.querySelector("#modal-title");
  const submitButton = modal.querySelector("button[type='submit']");
  const deleteBtn = modal.querySelector("#delete-lead-modal-btn");

  if (title) title.textContent = "Editar Lead";
  if (submitButton) submitButton.textContent = "Salvar Alteracoes";
  if (deleteBtn) deleteBtn.style.display = "block";

  leadForm.dataset.mode = "edit";
  leadForm.dataset.leadId = lead.id;
  leadForm.dataset.originalStatus = lead.status || "lead_recebido";
  currentEditingLead = lead;

  const metaRow = modal.querySelector("#modal-lead-meta");
  const originDisplay = modal.querySelector("#modal-lead-origin-display");
  const createdDisplay = modal.querySelector("#modal-lead-created-display");

  if (metaRow) metaRow.style.display = "flex";
  if (originDisplay) originDisplay.textContent = lead.origin || "Site publico";
  if (createdDisplay) createdDisplay.textContent = formatLeadDate(lead.created_at);

  const responsibleSection = modal.querySelector("#modal-lead-responsible");
  const responsibleName = modal.querySelector("#modal-lead-responsible-name");
  const responsibleEmail = modal.querySelector("#modal-lead-responsible-email");
  const responsibleChange = modal.querySelector("#modal-lead-responsible-change");
  const responsibleSelect = modal.querySelector("#modal-lead-responsible-select");

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  const canViewResponsible = Boolean(currentCrmUser) && shouldSeeAllLeads(currentCrmUser);

  if (responsibleSection) {
    responsibleSection.style.display = canViewResponsible ? "flex" : "none";
    if (canViewResponsible && lead.assigned_to_name) {
      if (responsibleName) responsibleName.textContent = lead.assigned_to_name;
      if (responsibleEmail) {
        responsibleEmail.textContent = lead.assigned_to_email || "";
        responsibleEmail.style.display = lead.assigned_to_email ? "inline" : "none";
      }
    } else if (canViewResponsible) {
      if (responsibleName) responsibleName.textContent = "Sem responsavel";
      if (responsibleEmail) responsibleEmail.style.display = "none";
    }
  }

  if (responsibleChange && responsibleSelect) {
    if (currentCrmUser && isAdminRole(currentCrmUser.cargo)) {
      responsibleChange.style.display = "block";
      loadCrmUsersForSelect(responsibleSelect, lead.assigned_to_email);
    } else {
      responsibleChange.style.display = "none";
    }
  }

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
  if (leadForm.elements["tags"]) {
    let tagsVal = "";
    if (Array.isArray(lead.tags)) {
      tagsVal = lead.tags.join(", ");
    } else if (typeof lead.tags === "string") {
      tagsVal = lead.tags;
    }
    leadForm.elements["tags"].value = tagsVal;
  }
  if (leadForm.elements["property_region"]) {
    leadForm.elements["property_region"].value = lead.property_region || "";
  }
  if (leadForm.elements["credit_value"]) {
    leadForm.elements["credit_value"].value = lead.credit_value ?? "";
  }
  if (leadForm.elements["down_payment_value"]) {
    leadForm.elements["down_payment_value"].value = lead.down_payment_value ?? "";
  }
  if (leadForm.elements["installment_value"]) {
    leadForm.elements["installment_value"].value = lead.installment_value ?? "";
  }

  const tagSelectEl = leadForm.querySelector("[data-lead-tag-select]");
  const tagFieldEl = leadForm.querySelector("[data-lead-form-tag-field]");
  if (tagSelectEl) {
    const stageId = lead.status || "lead_recebido";
    const availableTags = getAvailableTagsForStage(stageId);
    const previousValue = getLeadTagValue(lead) || "";
    tagSelectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = availableTags.length === 0 ? "Sem etiqueta disponível nesta etapa" : "Sem etiqueta";
    tagSelectEl.append(placeholder);
    availableTags.forEach((config) => {
      const opt = document.createElement("option");
      opt.value = config.value;
      opt.textContent = config.label;
      tagSelectEl.append(opt);
    });
    if (availableTags.length === 0) {
      tagSelectEl.value = "";
      tagSelectEl.disabled = true;
    } else {
      tagSelectEl.disabled = false;
      tagSelectEl.value = previousValue && availableTags.some((c) => c.value === previousValue) ? previousValue : "";
    }
    if (tagFieldEl) {
      tagFieldEl.style.display = "flex";
    }
  }

  // Fetch and render tasks for this lead
  const tasksSection = document.getElementById("modal-lead-tasks-section");
  const tasksList = document.getElementById("modal-lead-tasks-list");
  if (tasksSection && tasksList && client) {
    tasksList.innerHTML = '<p style="color: var(--muted); font-size: 0.8rem; margin: 0;">Carregando tarefas...</p>';
    // tasksSection display managed by tabs

    const { data: leadTasks, error } = await client
      .from("tasks")
      .select("*")
      .eq("lead_id", lead.id)
      .order("scheduled_at", { ascending: true });

    if (error || !leadTasks || leadTasks.length === 0) {
      tasksList.innerHTML = '<p style="color: var(--muted); font-size: 0.85rem; text-align: center; padding: 20px 0; margin: 0;">Nenhuma tarefa vinculada a este lead.</p>';
    } else {
      tasksList.innerHTML = "";
      const now = new Date();

      leadTasks.forEach((task) => {
        const item = document.createElement("div");
        item.style.padding = "10px 12px";
        item.style.border = "1px solid var(--line)";
        item.style.borderRadius = "8px";
        item.style.background = "rgba(255, 255, 255, 0.02)";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.fontSize = "0.8rem";
        item.style.flexWrap = "wrap";
        item.style.gap = "10px";

        const formattedDate = new Date(task.scheduled_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

        const typeLabel = task.type === "whatsapp_message" ? "Retorno WhatsApp" : "Lembrete / Retorno";

        // Check if overdue
        const isOverdue = task.status !== "done" && new Date(task.scheduled_at) < now;
        const shouldHighlight = highlightTaskId && task.id === highlightTaskId;

        if (shouldHighlight) {
          item.style.border = "2px solid #ef4444";
          item.style.background = "rgba(239, 68, 68, 0.05)";
        } else if (isOverdue) {
          item.style.border = "1px solid #ef4444";
          item.style.background = "rgba(239, 68, 68, 0.02)";
        }

        item.innerHTML = `
          <div style="flex: 1; min-width: 200px;">
            <div style="font-weight: 700; color: var(--gold); display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span>${typeLabel}</span>
              ${shouldHighlight || isOverdue ? `<span style="font-size: 0.65rem; color: #ef4444; border: 1px solid #ef4444; padding: 1px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Tarefa atrasada</span>` : ""}
            </div>
            ${task.title ? `<div style="color: var(--ink); font-weight: 600;">${task.title}</div>` : ""}
            ${task.internal_note ? `<div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px; line-height: 1.3;">${task.internal_note}</div>` : ""}
            <div style="font-size: 0.72rem; color: var(--muted); margin-top: 4px;">
              Agendado para: <strong>${formattedDate}</strong>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
            <span style="font-size: 0.72rem; color: var(--muted);">Resp: <strong>${task.assigned_to_name || "Sem atribuição"}</strong></span>
            <span style="font-size: 0.72rem; color: ${task.status === "done" ? "#22c55e" : "#ef4444"}; font-weight: 700;">
              ${task.status === "done" ? "Concluída" : "Pendente"}
            </span>
            ${task.status !== "done" && (shouldHighlight || isOverdue) ? `
              <div style="display: flex; gap: 6px; margin-top: 4px;">
                <button class="task-action-done-btn" style="border: none; background: #22c55e; color: #150126; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Concluir</button>
                <button class="task-action-reschedule-btn" style="border: none; background: var(--gold); color: #150126; font-size: 0.7rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Reagendar</button>
              </div>
            ` : ""}
          </div>

          <!-- Inline Reschedule Form -->
          <div class="reschedule-form-inline" style="display: none; flex-direction: column; gap: 8px; margin-top: 8px; border-top: 1px dotted var(--line); padding-top: 8px; width: 100%;">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <label style="flex: 1; min-width: 110px; display: flex; flex-direction: column; gap: 3px; font-size: 0.72rem; color: var(--muted);">
                Nova data
                <input type="date" class="reschedule-date-input" style="min-height: 28px; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; background: var(--surface); color: var(--ink); font-size: 0.78rem;" />
              </label>
              <label style="flex: 1; min-width: 100px; display: flex; flex-direction: column; gap: 3px; font-size: 0.72rem; color: var(--muted);">
                Novo horário
                <input type="time" class="reschedule-time-input" style="min-height: 28px; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; background: var(--surface); color: var(--ink); font-size: 0.78rem;" />
              </label>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="reschedule-cancel-inline-btn" style="border: 1px solid var(--line); background: transparent; color: var(--muted); font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Cancelar</button>
              <button class="reschedule-confirm-inline-btn" style="border: none; background: var(--gold); color: #150126; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Confirmar</button>
            </div>
          </div>
        `;

        const checkPermission = () => {
          const uRole = normalizeRole(currentCrmUser?.cargo);
          const isUserAdmin = isAdminRole(uRole) || isManagerRole(uRole);
          const isUserOwner = task.assigned_to_email === currentCrmUser?.email;
          return isUserAdmin || isUserOwner;
        };

        const doneBtn = item.querySelector(".task-action-done-btn");
        const reschBtn = item.querySelector(".task-action-reschedule-btn");
        const reschForm = item.querySelector(".reschedule-form-inline");
        const cancelReschBtn = item.querySelector(".reschedule-cancel-inline-btn");
        const confirmReschBtn = item.querySelector(".reschedule-confirm-inline-btn");

        if (doneBtn) {
          doneBtn.addEventListener("click", async () => {
            if (!checkPermission()) {
              alert("Você não tem permissão para alterar esta tarefa.");
              return;
            }
            if (!client || !currentCrmUser) return;
            doneBtn.disabled = true;
            doneBtn.textContent = "Salvando...";

            const { error: updateErr } = await client
              .from("tasks")
              .update({
                status: "done",
                completed_at: new Date().toISOString(),
                completed_by_email: currentCrmUser.email,
                completed_by_name: currentCrmUser.nome || currentCrmUser.email,
                updated_at: new Date().toISOString()
              })
              .eq("id", task.id);

            if (updateErr) {
              alert(`Erro ao concluir tarefa: ${updateErr.message}`);
              doneBtn.disabled = false;
              doneBtn.textContent = "Concluir";
            } else {
              alert("Tarefa concluída com sucesso.");
              createLeadActivityLog({
                leadId: lead.id,
                actionType: "task_completed",
                actionLabel: "Tarefa concluída",
                description: `Tarefa/retorno concluído por ${currentCrmUser.nome || currentCrmUser.email}.`,
                oldValue: "pending",
                newValue: "done"
              });
              await openEditLeadModal(lead, highlightTaskId);
              await loadDashboardMetrics();
            }
          });
        }

        if (reschBtn && reschForm) {
          reschBtn.addEventListener("click", () => {
            if (!checkPermission()) {
              alert("Você não tem permissão para alterar esta tarefa.");
              return;
            }
            reschForm.style.display = "flex";
          });
        }

        if (cancelReschBtn && reschForm) {
          cancelReschBtn.addEventListener("click", () => {
            reschForm.style.display = "none";
          });
        }

        if (confirmReschBtn && reschForm) {
          confirmReschBtn.addEventListener("click", async () => {
            if (!checkPermission()) {
              alert("Você não tem permissão para alterar esta tarefa.");
              return;
            }
            const dateVal = reschForm.querySelector(".reschedule-date-input").value;
            const timeVal = reschForm.querySelector(".reschedule-time-input").value;

            if (!dateVal || !timeVal) {
              alert("Favor selecionar data e hora para o reagendamento.");
              return;
            }

            confirmReschBtn.disabled = true;
            confirmReschBtn.textContent = "Salvando...";

            const newScheduledAt = new Date(`${dateVal}T${timeVal}:00`).toISOString();

            const { error: updateErr } = await client
              .from("tasks")
              .update({
                scheduled_at: newScheduledAt,
                updated_at: new Date().toISOString(),
                updated_by_email: currentCrmUser?.email || "",
                updated_by_name: currentCrmUser?.nome || currentCrmUser?.email || ""
              })
              .eq("id", task.id);

            if (updateErr) {
              alert(`Erro ao reagendar tarefa: ${updateErr.message}`);
              confirmReschBtn.disabled = false;
              confirmReschBtn.textContent = "Confirmar";
            } else {
              alert("Tarefa reagendada com sucesso.");
              const oldFormatted = new Date(task.scheduled_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
              const newFormatted = new Date(newScheduledAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
              createLeadActivityLog({
                leadId: lead.id,
                actionType: "task_rescheduled",
                actionLabel: "Tarefa reagendada",
                description: `Tarefa/retorno reagendado de ${oldFormatted} para ${newFormatted}.`,
                oldValue: task.scheduled_at,
                newValue: newScheduledAt
              });
              await openEditLeadModal(lead, highlightTaskId);
              await loadDashboardMetrics();
            }
          });
        }

        tasksList.appendChild(item);

        // Scroll to highlighted task
        if (shouldHighlight) {
          setTimeout(() => {
            item.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 200);
        }
      });
    }
  }

  // 3. Fetch and render activity logs for this lead
  const historySection = document.getElementById("modal-lead-history-section");
  const historyList = document.getElementById("modal-lead-history-list");
  if (historySection && historyList && client) {
    historyList.innerHTML = '<p style="color: var(--muted); font-size: 0.8rem; margin: 0;">Carregando histórico...</p>';
    // historySection display managed by tabs

    const { data: logs, error: logsError } = await client
      .from("lead_activity_logs")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });

    if (logsError || !logs || logs.length === 0) {
      historyList.innerHTML = '<p style="color: var(--muted); font-size: 0.85rem; text-align: center; padding: 20px 0; margin: 0;">Nenhum histórico registrado.</p>';
    } else {
      historyList.innerHTML = "";
      logs.forEach((log) => {
        const logItem = document.createElement("div");
        logItem.style.padding = "8px 10px";
        logItem.style.borderBottom = "1px solid var(--line)";
        logItem.style.fontSize = "0.75rem";
        logItem.style.lineHeight = "1.3";

        const logDate = new Date(log.created_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

        logItem.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <strong style="color: var(--gold);">${log.action_label || "Ação"}</strong>
            <span style="color: var(--muted); font-size: 0.7rem;">${logDate}</span>
          </div>
          <div style="color: var(--ink);">${log.description || ""}</div>
          <div style="color: var(--muted); font-size: 0.7rem; margin-top: 2px;">
            Executado por: ${log.created_by_name || log.created_by_email || "Sistema"}
          </div>
        `;
        historyList.appendChild(logItem);
      });
    }
  }

  setFormStatus("");
  
  // Reset tabs to default active state ("dados" or "tarefas" if we have a highlightTaskId)
  const defaultTab = highlightTaskId ? "tarefas" : "dados";
  const targetTabBtn = document.querySelector(`.lead-modal-tab-btn[data-tab='${defaultTab}']`);
  if (targetTabBtn) targetTabBtn.click();

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

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getWeekStart = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
};

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const calendarTimes = Array.from({ length: 13 }, (_, index) =>
  `${String(8 + index).padStart(2, "0")}:00`
);

const normalizeAppointmentTime = (value) => String(value || "").slice(0, 5);

const formatSellerName = (value) => {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ") || "Vendedor nao informado";
};

const getCurrentSellerName = async () => {
  const user = await getCurrentUser();
  const crmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (crmUser?.nome) return crmUser.nome;
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Usuario";
};

const setCalendarStatus = (message = "", type = "") => {
  if (!calendarStatus) return;
  calendarStatus.textContent = message;
  calendarStatus.dataset.type = type;
};

const setCalendarHeaderStats = ({ total = 0, confirmed = 0, store = 0 } = {}) => {
  if (calendarStatTotal) calendarStatTotal.textContent = total;
  if (calendarStatConfirmed) calendarStatConfirmed.textContent = confirmed;
  if (calendarStatStore) calendarStatStore.textContent = store;
};

const setAppointmentStatus = (message = "", type = "error") => {
  if (!appointmentStatus) return;
  appointmentStatus.textContent = message;
  appointmentStatus.dataset.type = type;
};

function normalizeRole(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const aliases = {
    ceo: "diretor-ceo",
    diretor: "diretor-ceo",
    "diretor-executivo": "diretor-ceo",
    "diretor-e-ceo": "diretor-ceo",
    owner: "dono",
    proprietario: "dono",
    administrator: "administrador",
  };

  return aliases[normalized] || normalized;
}

function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return ["diretor-ceo", "dono", "admin", "administrador"].includes(normalized);
}

function isManagerRole(role) {
  const normalized = normalizeRole(role);
  return [
    "coordenador-comercial",
    "supervisor-comercial",
    "coordenador-posvenda",
    "coordenador-adm",
    "coordenador-financeiro",
    "coordenador-mkt",
    "coordenador-rh",
  ].includes(normalized);
}

function shouldSeeAllLeads(crmUser) {
  if (!crmUser) return true;
  return isAdminRole(crmUser.cargo) || isManagerRole(crmUser.cargo);
}

function isTeamCoordinatorRole(crmUser) {
  if (!crmUser) return false;
  const normalized = normalizeRole(crmUser.cargo);
  return ["coordenador-comercial", "supervisor-comercial"].includes(normalized);
}

function getCoordinatedTeamId(currentCrmUser) {
  if (!currentCrmUser || !isTeamCoordinatorRole(currentCrmUser)) return null;
  const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser.id);
  return myTeam?.id || null;
}

let cachedTeamMemberEmails = null;
let cachedTeamCoordinatorEmail = null;

const loadTeamMemberEmails = async (coordinatorEmail) => {
  if (cachedTeamMemberEmails && cachedTeamCoordinatorEmail === coordinatorEmail) {
    return cachedTeamMemberEmails;
  }
  const client = getClient();
  if (!client) return [coordinatorEmail];
  try {
    const { data: teamData } = await client.rpc("get_coordinated_team_id", { user_email: coordinatorEmail });
    if (!teamData) return [coordinatorEmail];
    const { data: members } = await client
      .from("crm_team_members")
      .select("user_id")
      .eq("team_id", teamData);
    if (!members?.length) return [coordinatorEmail];
    const { data: users } = await client
      .from("crm_users")
      .select("email")
      .in("id", members.map((m) => m.user_id))
      .eq("ativo", true);
    const emails = (users || []).map((u) => u.email).filter(Boolean);
    if (!emails.includes(coordinatorEmail)) emails.push(coordinatorEmail);
    cachedTeamMemberEmails = emails;
    cachedTeamCoordinatorEmail = coordinatorEmail;
    return emails;
  } catch (_) {
    return [coordinatorEmail];
  }
};

let responsibleFilterInitialized = false;
let selectedResponsibleEmail = "";

let allTeams = [];
let allTeamMembers = [];
let selectedPipelineTeamId = "";
let selectedDashTeamId = "";
let selectedCalendarTeamId = "";
let selectedTasksTeamId = "";
let selectedDashPeriod = "month";
let selectedDashPeriodValue = "";
let dashTeamFilterInitialized = false;
let dashPeriodFilterInitialized = false;
let pipelineTeamFilterInitialized = false;
let calendarTeamFilterInitialized = false;
let tasksTeamFilterInitialized = false;

const loadAllTeams = async (client) => {
  if (allTeams.length) return allTeams;
  try {
    const { data: teams } = await client
      .from("crm_teams")
      .select("id, name, coordinator_user_id, active, photo_url")
      .eq("active", true)
      .order("name");
    allTeams = teams || [];

    const teamIds = allTeams.map((t) => t.id);
    if (teamIds.length) {
      const { data: members } = await client
        .from("crm_team_members")
        .select("team_id, user_id")
        .in("team_id", teamIds);
      allTeamMembers = members || [];
    }
  } catch (_) {
    allTeams = [];
    allTeamMembers = [];
  }
  return allTeams;
};

const getTeamMemberEmailsById = async (client, teamId) => {
  if (!teamId) return null;
  const memberUserIds = allTeamMembers
    .filter((m) => m.team_id === teamId)
    .map((m) => m.user_id);
  if (!memberUserIds.length) return [];
  const { data: users } = await client
    .from("crm_users")
    .select("email")
    .in("id", memberUserIds)
    .eq("ativo", true);
  return (users || []).map((u) => u.email).filter(Boolean);
};

const getTeamMemberIdsById = async (client, teamId) => {
  if (!teamId) return null;
  const memberUserIds = allTeamMembers
    .filter((m) => m.team_id === teamId)
    .map((m) => m.user_id);
  if (!memberUserIds.length) return [];
  const { data: users } = await client
    .from("crm_users")
    .select("id")
    .in("id", memberUserIds)
    .eq("ativo", true);
  return (users || []).map((u) => u.id).filter(Boolean);
};

const populateTeamFilter = (selectEl, currentCrmUser) => {
  if (!selectEl) return;
  const isCoordinator = isTeamCoordinatorRole(currentCrmUser);
  selectEl.innerHTML = "";

  if (isCoordinator) {
    const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser?.id);
    selectEl.innerHTML = `<option value="${myTeam?.id || ""}" selected>${myTeam?.name || "Minha equipe"}</option>`;
    selectEl.disabled = true;
  } else {
    selectEl.innerHTML = '<option value="">Todas as equipes</option>';
    allTeams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      selectEl.appendChild(option);
    });
    selectEl.disabled = false;
  }
};

const refreshResponsibleFilterForTeam = async (selectEl, client, currentCrmUser, teamId = "") => {
  if (!selectEl) return;

  const allUsers = await client
    .from("crm_users")
    .select("id, nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const users = allUsers.data || [];
  selectEl.innerHTML = '<option value="">Todos os vendedores</option>';

  if (teamId) {
    const teamEmails = await getTeamMemberEmailsById(client, teamId);
    if (teamEmails?.length) {
      const filtered = users.filter((u) => teamEmails.includes(u.email));
      filtered.forEach((u) => addResponsibleOption(selectEl, u));
    }
    return;
  }

  users.forEach((u) => addResponsibleOption(selectEl, u));
};

const addResponsibleOption = (selectEl, user) => {
  const cargoLabel = user.cargo ? user.cargo.toUpperCase() : "";
  const option = document.createElement("option");
  option.value = user.email || user.id || "";
  option.textContent = cargoLabel ? `${user.nome} — ${cargoLabel}` : user.nome;
  selectEl.appendChild(option);
};

const initPipelineTeamFilter = async (currentCrmUser) => {
  if (pipelineTeamFilterInitialized) return;
  if (!shouldSeeAllLeads(currentCrmUser)) return;

  const selectEl = document.getElementById("pipeline-team-filter-select");
  const containerEl = document.getElementById("pipeline-team-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await loadAllTeams(client);
  pipelineTeamFilterInitialized = true;
  containerEl.style.display = "";
  populateTeamFilter(selectEl, currentCrmUser);

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser?.id);
    if (myTeam) {
      selectedPipelineTeamId = myTeam.id;
      selectEl.value = myTeam.id;
    }
  } else {
    selectedPipelineTeamId = selectEl.value || "";
  }

  selectEl.addEventListener("change", async (e) => {
    selectedPipelineTeamId = e.target.value;
    const respSelect = document.getElementById("responsible-filter-select");
    if (respSelect) {
      selectedResponsibleEmail = "";
      respSelect.value = "";
      await refreshResponsibleFilterForTeam(respSelect, client, currentCrmUser, selectedPipelineTeamId);
    }
    loadLeads();
  });
};

const initPipelineCalendarPicker = () => {
  const periodSelect = document.getElementById("pipeline-period-type-select");
  const calendarLabel = document.getElementById("pipeline-period-calendar-label");
  const todayBtn = document.querySelector("[data-pipeline-calendar-today]");
  const prevBtn = document.querySelector("[data-pipeline-calendar-prev]");
  const nextBtn = document.querySelector("[data-pipeline-calendar-next]");
  const inputs = {
    day: document.getElementById("pipeline-period-day-input"),
    week: document.getElementById("pipeline-period-week-input"),
    month: document.getElementById("pipeline-period-month-input"),
  };
  if (!periodSelect || !inputs.day) return;
  if (periodSelect.dataset.calendarReady === "true") return;
  periodSelect.dataset.calendarReady = "true";

  const pad = (v) => String(v).padStart(2, "0");

  const getCurrentValue = (type) => {
    const now = new Date();
    if (type === "day") return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    if (type === "week") {
      const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const dayNumber = utcDate.getUTCDay() || 7;
      utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
      const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
      return `${utcDate.getUTCFullYear()}-W${pad(weekNumber)}`;
    }
    if (type === "month") return selectedProduction?.starts_at?.slice(0, 7) || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    return "";
  };

  const getActiveInput = () => inputs[selectedPipelinePeriod];

  const hideAllInputs = () => {
    Object.values(inputs).forEach((inp) => { if (inp) inp.hidden = true; });
  };

  const showActiveInput = () => {
    hideAllInputs();
    const active = getActiveInput();
    if (active) active.hidden = false;
    if (selectedPipelinePeriod === "month") syncPipelineMonthToProduction();
    if (prevBtn) prevBtn.disabled = selectedPipelinePeriod === "month";
    if (nextBtn) nextBtn.disabled = selectedPipelinePeriod === "month";
    if (calendarLabel) {
      calendarLabel.textContent = selectedPipelinePeriod === "day"
        ? "Selecionar dia"
        : selectedPipelinePeriod === "week" ? "Selecionar semana" : "Mês da produção";
    }
  };

  const navigate = (dir) => {
    if (selectedPipelinePeriod === "month") return;
    const input = getActiveInput();
    if (!input || !input.value) return;
    if (selectedPipelinePeriod === "day") {
      const d = new Date(`${input.value}T12:00:00`);
      d.setDate(d.getDate() + dir);
      input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } else if (selectedPipelinePeriod === "week") {
      const match = /^(\d{4})-W(\d{2})$/.exec(input.value);
      if (!match) return;
      const d = new Date(Number(match[1]), 0, 1 + (Number(match[2]) - 1) * 7);
      d.setDate(d.getDate() + (7 * dir));
      const utcDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = utcDate.getUTCDay() || 7;
      utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
      const ys = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
      const wn = Math.ceil((((utcDate - ys) / 86400000) + 1) / 7);
      input.value = `${utcDate.getUTCFullYear()}-W${pad(wn)}`;
    }
    selectedPipelinePeriodValue = input.value;
    input.dispatchEvent(new Event("change"));
  };

  const goToday = () => {
    const input = getActiveInput();
    if (!input) return;
    if (selectedPipelinePeriod === "month") {
      syncPipelineMonthToProduction();
      loadLeads();
      return;
    }
    input.value = getCurrentValue(selectedPipelinePeriod);
    selectedPipelinePeriodValue = input.value;
    input.dispatchEvent(new Event("change"));
  };

  Object.entries(inputs).forEach(([type, input]) => {
    if (!input) return;
    input.value = getCurrentValue(type);
    input.addEventListener("change", () => {
      if (type !== selectedPipelinePeriod) return;
      if (type === "month") syncPipelineMonthToProduction();
      selectedPipelinePeriodValue = input.value;
      loadLeads();
    });
  });
  selectedPipelinePeriodValue = inputs[selectedPipelinePeriod]?.value || getCurrentValue(selectedPipelinePeriod);

  showActiveInput();

  periodSelect.addEventListener("change", () => {
    selectedPipelinePeriod = periodSelect.value || "week";
    const active = getActiveInput();
    if (active && !active.value) active.value = getCurrentValue(selectedPipelinePeriod);
    selectedPipelinePeriodValue = active?.value || "";
    showActiveInput();
    loadLeads();
  });

  prevBtn?.addEventListener("click", () => navigate(-1));
  nextBtn?.addEventListener("click", () => navigate(1));
  todayBtn?.addEventListener("click", goToday);
};

const initDashTeamFilter = async (currentCrmUser) => {
  if (dashTeamFilterInitialized) return;
  if (!shouldSeeAllLeads(currentCrmUser)) return;

  const selectEl = document.getElementById("dash-team-filter-select");
  const containerEl = document.getElementById("dash-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await loadAllTeams(client);
  dashTeamFilterInitialized = true;
  containerEl.style.display = "flex";
  populateTeamFilter(selectEl, currentCrmUser);

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser?.id);
    if (myTeam) {
      selectedDashTeamId = myTeam.id;
      selectEl.value = myTeam.id;
    }
  } else {
    selectedDashTeamId = selectEl.value || "";
  }

  selectEl.addEventListener("change", async (e) => {
    selectedDashTeamId = e.target.value;
    const respSelect = document.getElementById("dash-responsible-filter-select");
    if (respSelect) {
      selectedDashResponsibleEmail = "";
      respSelect.value = "";
      await refreshResponsibleFilterForTeam(respSelect, client, currentCrmUser, selectedDashTeamId);
    }
    loadDashboardMetrics();
  });
};

const initCalendarTeamFilter = async (currentCrmUser) => {
  if (calendarTeamFilterInitialized) return;
  if (!shouldSeeAllLeads(currentCrmUser)) return;

  const selectEl = document.getElementById("calendar-team-filter-select");
  const containerEl = document.getElementById("calendar-team-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await loadAllTeams(client);
  calendarTeamFilterInitialized = true;
  containerEl.style.display = "flex";
  populateTeamFilter(selectEl, currentCrmUser);

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser?.id);
    if (myTeam) {
      selectedCalendarTeamId = myTeam.id;
      selectEl.value = myTeam.id;
    }
  } else {
    selectedCalendarTeamId = selectEl.value || "";
  }

  selectEl.addEventListener("change", async (e) => {
    selectedCalendarTeamId = e.target.value;
    const respSelect = document.getElementById("calendar-responsible-filter-select");
    if (respSelect) {
      selectedCalendarResponsibleId = "";
      respSelect.value = "";
      await refreshCalendarResponsibleFilterForTeam(respSelect, client, currentCrmUser);
    }
    loadAppointments();
  });
};

const refreshCalendarResponsibleFilterForTeam = async (selectEl, client, currentCrmUser) => {
  if (!selectEl) return;
  const teamId = selectedCalendarTeamId;

  const allUsers = await client
    .from("crm_users")
    .select("id, nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  const users = allUsers.data || [];
  selectEl.innerHTML = '<option value="">Todos os vendedores</option>';

  if (teamId) {
    const memberUserIds = allTeamMembers
      .filter((m) => m.team_id === teamId)
      .map((m) => m.user_id);
    if (memberUserIds.length) {
      const filtered = users.filter((u) => memberUserIds.includes(u.id));
      filtered.forEach((u) => {
        const cargoLabel = u.cargo ? u.cargo.toUpperCase() : "";
        const option = document.createElement("option");
        option.value = u.id;
        option.textContent = cargoLabel ? `${u.nome} — ${cargoLabel}` : u.nome;
        selectEl.appendChild(option);
      });
    }
    return;
  }

  users.forEach((u) => {
    const cargoLabel = u.cargo ? u.cargo.toUpperCase() : "";
    const option = document.createElement("option");
    option.value = u.id;
    option.textContent = cargoLabel ? `${u.nome} — ${cargoLabel}` : u.nome;
    selectEl.appendChild(option);
  });
};

const initTasksTeamFilter = async (currentCrmUser) => {
  if (tasksTeamFilterInitialized) return;
  if (!shouldSeeAllLeads(currentCrmUser)) return;

  const selectEl = document.getElementById("tasks-team-filter-select");
  const containerEl = document.getElementById("tasks-team-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await loadAllTeams(client);
  tasksTeamFilterInitialized = true;
  containerEl.style.display = "flex";
  populateTeamFilter(selectEl, currentCrmUser);

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const myTeam = allTeams.find((t) => t.coordinator_user_id === currentCrmUser?.id);
    if (myTeam) {
      selectedTasksTeamId = myTeam.id;
      selectEl.value = myTeam.id;
    }
  } else {
    selectedTasksTeamId = selectEl.value || "";
  }

  selectEl.addEventListener("change", async (e) => {
    selectedTasksTeamId = e.target.value;
    const respSelect = document.getElementById("tasks-responsible-filter-select");
    if (respSelect) {
      selectedTasksResponsibleEmail = "";
      respSelect.value = "";
      await refreshResponsibleFilterForTeam(respSelect, client, currentCrmUser, selectedTasksTeamId);
    }
    loadTasks();
  });
};

const initResponsibleFilter = async (currentCrmUser) => {
  if (responsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return;
  }

  const selectEl = document.getElementById("responsible-filter-select");
  const containerEl = document.getElementById("responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await initPipelineTeamFilter(currentCrmUser);
  responsibleFilterInitialized = true;
  containerEl.style.display = "grid";

  await refreshResponsibleFilterForTeam(selectEl, client, currentCrmUser, selectedPipelineTeamId);

  selectEl.addEventListener("change", (e) => {
    selectedResponsibleEmail = e.target.value;
    loadLeads();
  });

  document.querySelector(".clear-button")?.addEventListener("click", () => {
    selectEl.value = "";
    selectedResponsibleEmail = "";
    selectedPipelineTeamId = "";
    const teamSelect = document.getElementById("pipeline-team-filter-select");
    if (teamSelect) teamSelect.value = "";
    loadLeads();
  });
};

let calendarResponsibleFilterInitialized = false;
let selectedCalendarResponsibleId = "";

const initCalendarResponsibleFilter = async (currentCrmUser) => {
  if (calendarResponsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return;
  }

  const selectEl = document.getElementById("calendar-responsible-filter-select");
  const containerEl = document.getElementById("calendar-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await initCalendarTeamFilter(currentCrmUser);

  calendarResponsibleFilterInitialized = true;
  containerEl.style.display = "flex";

  await refreshCalendarResponsibleFilterForTeam(selectEl, client, currentCrmUser);

  selectEl.addEventListener("change", (e) => {
    selectedCalendarResponsibleId = e.target.value;
    loadAppointments();
  });
};

let tasksResponsibleFilterInitialized = false;
let selectedTasksResponsibleEmail = "";

const initTasksResponsibleFilter = async (currentCrmUser) => {
  if (tasksResponsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return;
  }

  const selectEl = document.getElementById("tasks-responsible-filter-select");
  const containerEl = document.getElementById("tasks-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  await initTasksTeamFilter(currentCrmUser);

  tasksResponsibleFilterInitialized = true;
  containerEl.style.display = "flex";

  await refreshResponsibleFilterForTeam(selectEl, client, currentCrmUser, selectedTasksTeamId);

  selectEl.addEventListener("change", (e) => {
    selectedTasksResponsibleEmail = e.target.value;
    loadTasks();
  });

  document.getElementById("tasks-status-filter")?.addEventListener("change", loadTasks);
  document.getElementById("tasks-date-filter")?.addEventListener("change", loadTasks);
};

const loadTasks = async () => {
  const client = getClient();
  if (!client) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (!currentCrmUser) return;
  await initTasksResponsibleFilter(currentCrmUser);

  const tasksListEl = document.getElementById("tasks-list");
  const countLabelEl = document.querySelector("[data-tasks-count-label]");
  if (!tasksListEl) return;

  tasksListEl.innerHTML = '<p class="permission-note">Carregando tarefas...</p>';

  let query = client
    .from("tasks")
    .select("*")
    .order("scheduled_at", { ascending: true });

  // 1. Filtragem por Responsável (RLS já restringe vendedores)
  let activeTeamId = selectedTasksTeamId;
  let activeTasksResponsibleEmail = selectedTasksResponsibleEmail;

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    activeTeamId = coordTeamId;
    if (activeTasksResponsibleEmail) {
      const myTeamEmails = await loadTeamMemberEmails(currentCrmUser.email);
      if (!myTeamEmails.includes(activeTasksResponsibleEmail)) {
        activeTasksResponsibleEmail = "";
      }
    }
  }

  if (!shouldSeeAllLeads(currentCrmUser)) {
    query = query.eq("assigned_to_email", currentCrmUser.email);
  } else if (activeTasksResponsibleEmail) {
    query = query.eq("assigned_to_email", activeTasksResponsibleEmail);
  } else if (activeTeamId) {
    const teamEmails = await getTeamMemberEmailsById(client, activeTeamId);
    if (teamEmails?.length) {
      query = query.in("assigned_to_email", teamEmails);
    }
  } else if (isTeamCoordinatorRole(currentCrmUser) && currentCrmUser.email) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    const teamEmails = await loadTeamMemberEmails(currentCrmUser.email);
    if (coordTeamId && teamEmails?.length) {
      query = query.in("assigned_to_email", teamEmails);
    }
  }

  // 2. Filtragem por Status
  const statusFilter = document.getElementById("tasks-status-filter")?.value || "";
  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  // 3. Filtragem por Período
  const dateFilter = document.getElementById("tasks-date-filter")?.value || "";
  const now = new Date();
  if (dateFilter === "hoje") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    query = query.gte("scheduled_at", startOfDay).lte("scheduled_at", endOfDay);
  } else if (dateFilter === "atrasadas") {
    query = query.lt("scheduled_at", now.toISOString()).eq("status", "pending");
  } else if (dateFilter === "semana") {
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6)).toISOString();
    query = query.gte("scheduled_at", startOfWeek).lte("scheduled_at", endOfWeek);
  }

  const { data: tasks, error } = await query;

  if (error) {
    tasksListEl.innerHTML = `<p class="permission-note" style="color: #ef4444;">Erro ao carregar tarefas: ${error.message}</p>`;
    return;
  }

  if (countLabelEl) {
    countLabelEl.textContent = `${tasks.length} tarefa${tasks.length === 1 ? "" : "s"}`;
  }

  if (!tasks || tasks.length === 0) {
    tasksListEl.innerHTML = '<p class="permission-note">Nenhuma tarefa encontrada.</p>';
    return;
  }

  tasksListEl.innerHTML = "";
  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "lead-card";
    card.style.cursor = "default";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.justifyContent = "space-between";
    card.style.padding = "16px";
    card.style.gap = "8px";
    card.style.border = "1px solid var(--line)";
    card.style.borderRadius = "12px";
    card.style.background = "var(--surface)";

    const formattedDate = new Date(task.scheduled_at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });

    const isPending = task.status === "pending";
    const isOverdue = isPending && new Date(task.scheduled_at) < now;

    if (isOverdue) {
      card.style.border = "1px solid #ef4444";
      card.style.background = "rgba(239, 68, 68, 0.02)";
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="tag" style="background: ${task.type === "whatsapp_message" ? "rgba(34, 197, 94, 0.1)" : "rgba(59, 130, 246, 0.1)"}; color: ${task.type === "whatsapp_message" ? "#22c55e" : "#3b82f6"};">
            ${task.type === "whatsapp_message" ? "WhatsApp" : "Lembrete"}
          </span>
          ${isOverdue ? `<span style="font-size: 0.65rem; color: #ef4444; border: 1px solid #ef4444; padding: 1px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Tarefa atrasada</span>` : ""}
        </div>
        <span style="font-size: 0.72rem; color: var(--muted); font-weight: 600;">${formattedDate}</span>
      </div>
      <h3 style="font-size: 0.95rem; font-weight: 700; margin: 4px 0 2px; color: var(--ink);">${task.lead_nome}</h3>
      ${task.title ? `<p style="font-size: 0.82rem; font-weight: 600; color: var(--ink); margin: 0;">${task.title}</p>` : ""}
      ${task.internal_note ? `<p style="font-size: 0.78rem; color: var(--muted); margin: 0; line-height: 1.3;">${task.internal_note}</p>` : ""}
      <div style="border-top: 1px solid var(--line); margin-top: 8px; padding-top: 8px; display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
          <span style="font-size: 0.72rem; color: var(--muted);">Resp: <strong>${task.assigned_to_name || "Sem atribuição"}</strong></span>
          ${isPending ? `
            <div style="display: flex; gap: 6px; align-items: center;">
              ${task.lead_id ? `
                <button class="task-open-lead-btn" style="border: none; background: transparent; color: var(--gold); font-size: 0.72rem; font-weight: 700; padding: 4px 6px; cursor: pointer; text-decoration: underline;">
                  Abrir lead
                </button>
              ` : ""}
              <button class="complete-task-btn" style="border: none; background: #22c55e; color: #150126; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                Concluir
              </button>
              <button class="reschedule-task-btn" style="border: none; background: var(--gold); color: #150126; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                Reagendar
              </button>
            </div>
          ` : `
            <span style="font-size: 0.75rem; color: #22c55e; font-weight: 700;">Concluída</span>
          `}
        </div>

        <!-- Inline Reschedule Form -->
        <div class="reschedule-form-inline" style="display: none; flex-direction: column; gap: 8px; margin-top: 4px; border-top: 1px dotted var(--line); padding-top: 8px; width: 100%;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <label style="flex: 1; min-width: 110px; display: flex; flex-direction: column; gap: 3px; font-size: 0.72rem; color: var(--muted);">
              Nova data
              <input type="date" class="reschedule-date-input" style="min-height: 28px; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; background: var(--surface); color: var(--ink); font-size: 0.78rem;" />
            </label>
            <label style="flex: 1; min-width: 100px; display: flex; flex-direction: column; gap: 3px; font-size: 0.72rem; color: var(--muted);">
              Novo horário
              <input type="time" class="reschedule-time-input" style="min-height: 28px; border: 1px solid var(--line); border-radius: 6px; padding: 0 8px; background: var(--surface); color: var(--ink); font-size: 0.78rem;" />
            </label>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="reschedule-cancel-inline-btn" style="border: 1px solid var(--line); background: transparent; color: var(--muted); font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Cancelar</button>
            <button class="reschedule-confirm-inline-btn" style="border: none; background: var(--gold); color: #150126; font-size: 0.72rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Confirmar</button>
          </div>
        </div>
      </div>
    `;

    const checkPermission = () => {
      const uRole = normalizeRole(currentCrmUser?.cargo);
      const isUserAdmin = isAdminRole(uRole) || isManagerRole(uRole);
      const isUserOwner = task.assigned_to_email === currentCrmUser?.email;
      return isUserAdmin || isUserOwner;
    };

    const openLeadBtn = card.querySelector(".task-open-lead-btn");
    const completeBtn = card.querySelector(".complete-task-btn");
    const rescheduleBtn = card.querySelector(".reschedule-task-btn");
    const reschForm = card.querySelector(".reschedule-form-inline");
    const cancelReschBtn = card.querySelector(".reschedule-cancel-inline-btn");
    const confirmReschBtn = card.querySelector(".reschedule-confirm-inline-btn");

    if (openLeadBtn) {
      openLeadBtn.addEventListener("click", async () => {
        openLeadBtn.disabled = true;
        const originalText = openLeadBtn.textContent;
        openLeadBtn.textContent = "Abrindo...";

        const { data: lead, error: leadErr } = await client.from("leads").select("*").eq("id", task.lead_id).single();
        openLeadBtn.disabled = false;
        openLeadBtn.textContent = originalText;

        if (leadErr || !lead) {
          alert("Não foi possível localizar o lead desta tarefa.");
        } else {
          openEditLeadModal(lead, task.id);
        }
      });
    }

    if (completeBtn) {
      completeBtn.addEventListener("click", async () => {
        if (!checkPermission()) {
          alert("Você não tem permissão para alterar esta tarefa.");
          return;
        }
        completeBtn.disabled = true;
        completeBtn.textContent = "Salvando...";

        const { error: updateErr } = await client
          .from("tasks")
          .update({
            status: "done",
            completed_at: new Date().toISOString(),
            completed_by_email: currentCrmUser?.email || "",
            completed_by_name: currentCrmUser?.nome || currentCrmUser?.email || "",
            updated_at: new Date().toISOString()
          })
          .eq("id", task.id);

        if (updateErr) {
          alert(`Erro ao concluir tarefa: ${updateErr.message}`);
          completeBtn.disabled = false;
          completeBtn.textContent = "Concluir";
        } else {
          alert("Tarefa concluída com sucesso.");
          if (task.lead_id) {
            createLeadActivityLog({
              leadId: task.lead_id,
              actionType: "task_completed",
              actionLabel: "Tarefa concluída",
              description: `Tarefa/retorno concluído por ${currentCrmUser.nome || currentCrmUser.email}.`,
              oldValue: "pending",
              newValue: "done"
            });
          }
          await loadTasks();
          await loadDashboardMetrics();
        }
      });
    }

    if (rescheduleBtn && reschForm) {
      rescheduleBtn.addEventListener("click", () => {
        if (!checkPermission()) {
          alert("Você não tem permissão para alterar esta tarefa.");
          return;
        }
        reschForm.style.display = "flex";
      });
    }

    if (cancelReschBtn && reschForm) {
      cancelReschBtn.addEventListener("click", () => {
        reschForm.style.display = "none";
      });
    }

    if (confirmReschBtn && reschForm) {
      confirmReschBtn.addEventListener("click", async () => {
        if (!checkPermission()) {
          alert("Você não tem permissão para alterar esta tarefa.");
          return;
        }
        const dateVal = reschForm.querySelector(".reschedule-date-input").value;
        const timeVal = reschForm.querySelector(".reschedule-time-input").value;

        if (!dateVal || !timeVal) {
          alert("Favor selecionar data e hora para o reagendamento.");
          return;
        }

        confirmReschBtn.disabled = true;
        confirmReschBtn.textContent = "Salvando...";

        const newScheduledAt = new Date(`${dateVal}T${timeVal}:00`).toISOString();

        const { error: updateErr } = await client
          .from("tasks")
          .update({
            scheduled_at: newScheduledAt,
            updated_at: new Date().toISOString(),
            updated_by_email: currentCrmUser?.email || "",
            updated_by_name: currentCrmUser?.nome || currentCrmUser?.email || ""
          })
          .eq("id", task.id);

        if (updateErr) {
          alert(`Erro ao reagendar tarefa: ${updateErr.message}`);
          confirmReschBtn.disabled = false;
          confirmReschBtn.textContent = "Confirmar";
        } else {
          alert("Tarefa reagendada com sucesso.");
          if (task.lead_id) {
            const oldFormatted = new Date(task.scheduled_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            });
            const newFormatted = new Date(newScheduledAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit"
            });
            createLeadActivityLog({
              leadId: task.lead_id,
              actionType: "task_rescheduled",
              actionLabel: "Tarefa reagendada",
              description: `Tarefa/retorno reagendado de ${oldFormatted} para ${newFormatted}.`,
              oldValue: task.scheduled_at,
              newValue: newScheduledAt
            });
          }
          await loadTasks();
          await loadDashboardMetrics();
        }
      });
    }

    tasksListEl.appendChild(card);
  });
};

let dashResponsibleFilterInitialized = false;
let selectedDashResponsibleEmail = "";

const initDashResponsibleFilter = async (currentCrmUser) => {
  if (dashResponsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return; // Vendedor não vê o filtro
  }

  const selectEl = document.getElementById("dash-responsible-filter-select");
  const containerEl = document.getElementById("dash-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  dashResponsibleFilterInitialized = true;
  containerEl.style.display = "flex";

  const { data: users, error } = await client
    .from("crm_users")
    .select("nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !users) {
    console.error("Erro ao carregar vendedores para filtro do dashboard:", error);
    return;
  }

  selectEl.innerHTML = '<option value="">Todos os vendedores</option>';
  users.forEach((u) => {
    const cargoLabel = u.cargo ? u.cargo.toUpperCase() : "";
    const option = document.createElement("option");
    option.value = u.email;
    option.textContent = cargoLabel ? `${u.nome} — ${cargoLabel}` : u.nome;
    selectEl.appendChild(option);
  });

  selectEl.addEventListener("change", (e) => {
    selectedDashResponsibleEmail = e.target.value;
    loadDashboardMetrics();
  });
};

const fetchAuthorizedLeads = async (client) => {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch("/api/permissions/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pipeline_action: "list_leads", production_id: selectedProduction?.id || null }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Não foi possível carregar os leads.");
  }
  return Array.isArray(result.leads) ? result.leads : [];
};

const fetchDashboardHistory = async (client) => {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch("/api/permissions/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pipeline_action: "dashboard_history", production_id: selectedProduction?.id || null }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Não foi possível carregar o histórico comercial.");
  }
  return {
    leads: Array.isArray(result.leads) ? result.leads : [],
    stageEvents: Array.isArray(result.stageEvents) ? result.stageEvents : [],
    appointments: Array.isArray(result.appointments) ? result.appointments : [],
  };
};

const padDashboardDatePart = (value) => String(value).padStart(2, "0");

const getCurrentDashboardPeriodValue = (periodType) => {
  const now = new Date();
  if (periodType === "day") {
    return `${now.getFullYear()}-${padDashboardDatePart(now.getMonth() + 1)}-${padDashboardDatePart(now.getDate())}`;
  }
  if (periodType === "week") {
    const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${padDashboardDatePart(weekNumber)}`;
  }
  return `${now.getFullYear()}-${padDashboardDatePart(now.getMonth() + 1)}`;
};

const navigateDashPeriod = (periodType, input, direction) => {
  if (!input) return;
  let date;
  if (periodType === "day") {
    date = new Date(`${input.value}T12:00:00`);
    date.setDate(date.getDate() + direction);
    input.value = `${date.getFullYear()}-${padDashboardDatePart(date.getMonth() + 1)}-${padDashboardDatePart(date.getDate())}`;
  } else if (periodType === "week") {
    const match = /^(\d{4})-W(\d{2})$/.exec(input.value);
    if (!match) return;
    const weekYear = Number(match[1]);
    const weekNumber = Number(match[2]);
    const januaryFourth = new Date(weekYear, 0, 4);
    const januaryFourthDay = januaryFourth.getDay() || 7;
    date = new Date(weekYear, 0, 4 - januaryFourthDay + 1 + ((weekNumber - 1) * 7));
    date.setDate(date.getDate() + (7 * direction));
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const ys = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const wn = Math.ceil((((utcDate - ys) / 86400000) + 1) / 7);
    input.value = `${utcDate.getUTCFullYear()}-W${padDashboardDatePart(wn)}`;
  } else {
    const [year, month] = input.value.split("-").map(Number);
    date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + direction);
    input.value = `${date.getFullYear()}-${padDashboardDatePart(date.getMonth() + 1)}`;
  }
  selectedDashPeriodValue = input.value;
  loadDashboardMetrics();
};

const getDashboardPeriodRange = (periodType, periodValue) => {
  const value = periodValue || getCurrentDashboardPeriodValue(periodType);
  let start;
  let end;

  if (periodType === "day") {
    const [year, month, day] = value.split("-").map(Number);
    start = new Date(year, month - 1, day);
    end = new Date(year, month - 1, day + 1);
  } else if (periodType === "week") {
    const match = /^(\d{4})-W(\d{2})$/.exec(value);
    const weekYear = Number(match?.[1]);
    const weekNumber = Number(match?.[2]);
    const januaryFourth = new Date(weekYear, 0, 4);
    const januaryFourthDay = januaryFourth.getDay() || 7;
    start = new Date(weekYear, 0, 4 - januaryFourthDay + 1 + ((weekNumber - 1) * 7));
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    const [year, month] = value.split("-").map(Number);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
  }

  return { start, end };
};

const isWithinDashboardPeriod = (value, range, dateOnly = false) => {
  if (!value) return false;
  const date = dateOnly ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (!range.start || date >= range.start) && (!range.end || date < range.end);
};

const loadDashboardMetrics = async () => {
  const client = getClient();
  if (!client) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (currentCrmUser) {
    await initDashTeamFilter(currentCrmUser);
    await initDashResponsibleFilter(currentCrmUser);
  }

  const elReceived = document.getElementById("dash-received-leads");
  const elInService = document.getElementById("dash-in-service");
  const elNotServed = document.getElementById("dash-not-served");
  const elAppointments = document.getElementById("dash-appointments");
  const elClientsInStore = document.getElementById("dash-clients-in-store");
  const elNoShows = document.getElementById("dash-no-shows");
  const elNoShowsConversion = document.getElementById("dash-no-shows-conversion");
  const elInApproval = document.getElementById("dash-in-approval");
  const elNotInterested = document.getElementById("dash-not-interested");
  const elClosed = document.getElementById("dash-closed-leads");
  const elClosingConversion = document.getElementById("dash-closing-conversion");
  const elAppointmentConversion = document.getElementById("dash-appointment-conversion");
  const elServiceConversion = document.getElementById("dash-service-conversion");
  const elNotServedConversion = document.getElementById("dash-not-served-conversion");
  const elStoreConversion = document.getElementById("dash-store-conversion");
  const elApprovalConversion = document.getElementById("dash-approval-conversion");
  const elNotInterestedConversion = document.getElementById("dash-not-interested-conversion");
  const elCancelled = document.getElementById("dash-cancelled-leads");
  const elCancelledConversion = document.getElementById("dash-cancelled-conversion");
  const elTodayClients = document.getElementById("dash-today-clients");

  if (!elReceived) return;

  const periodSelect = document.getElementById("dash-period-filter-select");
  const periodLabel = document.getElementById("dash-period-calendar-label");
  const periodInputs = {
    day: document.getElementById("dash-period-day-input"),
    week: document.getElementById("dash-period-week-input"),
    month: document.getElementById("dash-period-month-input"),
  };
  if (periodSelect && !dashPeriodFilterInitialized) {
    dashPeriodFilterInitialized = true;
    periodSelect.value = selectedDashPeriod;
    Object.entries(periodInputs).forEach(([type, input]) => {
      if (!input) return;
      input.value = getCurrentDashboardPeriodValue(type);
      input.addEventListener("change", () => {
        if (selectedDashPeriod !== type) return;
        selectedDashPeriodValue = input.value || getCurrentDashboardPeriodValue(type);
        loadDashboardMetrics();
      });
    });
    periodSelect.addEventListener("change", () => {
      selectedDashPeriod = periodSelect.value || "month";
      selectedDashPeriodValue = periodInputs[selectedDashPeriod]?.value || getCurrentDashboardPeriodValue(selectedDashPeriod);
      loadDashboardMetrics();
    });
    document.querySelector("[data-dash-prev]")?.addEventListener("click", () => {
      navigateDashPeriod(selectedDashPeriod, periodInputs[selectedDashPeriod], -1);
    });
    document.querySelector("[data-dash-next]")?.addEventListener("click", () => {
      navigateDashPeriod(selectedDashPeriod, periodInputs[selectedDashPeriod], 1);
    });
    document.querySelector("[data-dash-today]")?.addEventListener("click", () => {
      const input = periodInputs[selectedDashPeriod];
      if (!input) return;
      input.value = getCurrentDashboardPeriodValue(selectedDashPeriod);
      selectedDashPeriodValue = input.value;
      loadDashboardMetrics();
    });
  }
  Object.entries(periodInputs).forEach(([type, input]) => {
    if (input) input.hidden = type !== selectedDashPeriod;
  });
  if (periodLabel) {
    periodLabel.textContent = selectedDashPeriod === "day"
      ? "Selecionar dia"
      : selectedDashPeriod === "week" ? "Selecionar semana" : "Selecionar mês";
  }

  document.querySelectorAll(".kpi-day-hide").forEach((el) => {
    el.style.display = selectedDashPeriod === "day" ? "none" : "";
  });

  document.querySelectorAll(".kpi-day-only").forEach((el) => {
    el.style.display = selectedDashPeriod === "day" ? "flex" : "none";
  });

  const grid = document.querySelector(".commercial-summary-grid");
  if (grid) {
    const dayOrder = ["received", "inservice", "notserved", "appointments", "today", "store", "approval", "notinterested", "closed", "cancelled"];
    const weekOrder = ["received", "inservice", "notserved", "appointments", "noshow", "store", "approval", "notinterested", "closed", "cancelled"];
    const monthOrder = ["received", "inservice", "notserved", "appointments", "noshow", "store", "approval", "notinterested", "closed", "cancelled"];
    const order = selectedDashPeriod === "day" ? dayOrder : selectedDashPeriod === "week" ? weekOrder : monthOrder;
    const cards = grid.querySelectorAll("[data-kpi]");
    const cardMap = {};
    cards.forEach((card) => { cardMap[card.dataset.kpi] = card; });
    order.forEach((key) => {
      if (cardMap[key]) grid.appendChild(cardMap[key]);
    });
  }

  if (!selectedDashPeriodValue) {
    selectedDashPeriodValue = periodInputs[selectedDashPeriod]?.value || getCurrentDashboardPeriodValue(selectedDashPeriod);
  }

  let activeTeamId = selectedDashTeamId;
  let activeDashResponsibleEmail = selectedDashResponsibleEmail;

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    activeTeamId = coordTeamId;
    if (activeDashResponsibleEmail) {
      const myTeamEmails = await loadTeamMemberEmails(currentCrmUser.email);
      if (!myTeamEmails.includes(activeDashResponsibleEmail)) {
        activeDashResponsibleEmail = "";
      }
    }
  }

  let dashboardTeamEmails = null;
  if (activeTeamId) {
    dashboardTeamEmails = await getTeamMemberEmailsById(client, activeTeamId);
  } else if (isTeamCoordinatorRole(currentCrmUser) && currentCrmUser.email) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    if (coordTeamId) dashboardTeamEmails = await loadTeamMemberEmails(currentCrmUser.email);
  }

  let history;
  try {
    history = await fetchDashboardHistory(client);
  } catch (error) {
    console.error("Erro ao carregar métricas comerciais:", error);
    return;
  }

  let leads = history.leads;

  const normalizeMetricEmail = (value) => String(value || "").trim().toLowerCase();
  if (activeDashResponsibleEmail) {
    const responsibleEmail = normalizeMetricEmail(activeDashResponsibleEmail);
    leads = leads.filter((lead) => normalizeMetricEmail(lead.assigned_to_email) === responsibleEmail);
  } else if (dashboardTeamEmails?.length) {
    const allowedEmails = new Set(dashboardTeamEmails.map(normalizeMetricEmail));
    leads = leads.filter((lead) => allowedEmails.has(normalizeMetricEmail(lead.assigned_to_email)));
  }

  const periodRange = getDashboardPeriodRange(selectedDashPeriod, selectedDashPeriodValue);
  const visibleLeadIds = new Set(leads.map((lead) => String(lead.id)));
  const receivedLeads = leads.filter((lead) => isWithinDashboardPeriod(lead.created_at, periodRange)).length;
  const periodEvents = history.stageEvents.filter((event) =>
    visibleLeadIds.has(String(event.lead_id)) && isWithinDashboardPeriod(event.created_at, periodRange)
  );
  const periodAppointments = history.appointments.filter((appointment) =>
    visibleLeadIds.has(String(appointment.lead_id)) &&
    isWithinDashboardPeriod(appointment.data_agendamento || appointment.created_at, periodRange, Boolean(appointment.data_agendamento))
  );

  const serviceLeadIds = new Set();
  const storeLeadIds = new Set();
  const closedLeadIds = new Set();
  const cancelledLeadIds = new Set();
  const historicalLeadIds = new Set(history.stageEvents.map((event) => String(event.lead_id)));

  periodEvents.forEach((event) => {
    const leadId = String(event.lead_id);
    const status = String(event.new_value || "").trim().toLowerCase();
    const previousStatus = String(event.old_value || "").trim().toLowerCase();
    if (status === "primeiro_contato" || previousStatus === "primeiro_contato") serviceLeadIds.add(leadId);
    if (status === "cliente_em_loja") storeLeadIds.add(leadId);
    if (status === "venda_fechada") closedLeadIds.add(leadId);
    if (status === "cancelado") cancelledLeadIds.add(leadId);
  });

  // Registros antigos podem não ter histórico. Neles, usa o estado atual apenas
  // quando a última movimentação pertence ao período selecionado.
  leads.forEach((lead) => {
    const leadId = String(lead.id);
    if (historicalLeadIds.has(leadId)) return;
    const movementDate = lead.updated_at || lead.ultima_interacao || lead.created_at;
    if (!isWithinDashboardPeriod(movementDate, periodRange)) return;
    const status = String(lead.status || "").trim().toLowerCase();
    const statusIndex = pipelineStatusOrder.indexOf(status);
    if (statusIndex >= pipelineStatusOrder.indexOf("primeiro_contato")) serviceLeadIds.add(leadId);
    if (["cliente_em_loja", "em_aprovacao", "proposta_enviada", "venda_fechada", "nao_quer", "não_quer", "nao_tem_interesse", "perdido"].includes(status)) {
      storeLeadIds.add(leadId);
    }
    if (status === "venda_fechada") closedLeadIds.add(leadId);
    if (status === "cancelado") cancelledLeadIds.add(leadId);
  });

  const scheduledLeadKeys = new Set(periodAppointments.map((appointment) => String(appointment.lead_id || appointment.id)).filter(Boolean));
  const inService = serviceLeadIds.size;
  const notServed = Math.max(receivedLeads - inService, 0);
  const clientsInStore = storeLeadIds.size;
  const inApproval = leads.filter((lead) =>
    ["em_aprovacao", "proposta_enviada"].includes(String(lead.status || "").trim().toLowerCase())
  ).length;
  const closedLeads = closedLeadIds.size;
  const cancelledLeads = cancelledLeadIds.size;
  const notInterested = leads.filter((lead) => String(lead.status || "").trim().toLowerCase() === "cliente_em_loja").length;
  const closingConversion = clientsInStore > 0 ? ((closedLeads / clientsInStore) * 100).toFixed(1) : "0.0";
  const totalAppointments = scheduledLeadKeys.size;
  const noShows = Math.max(totalAppointments - clientsInStore, 0);
  const noShowsConversion = totalAppointments > 0 ? ((noShows / totalAppointments) * 100).toFixed(1) : "0.0";
  const appointmentConversion = inService > 0 ? ((totalAppointments / inService) * 100).toFixed(1) : "0.0";
  const tasksData = [];

  // Renderizar no HTML
  elReceived.textContent = receivedLeads;
  elInService.textContent = inService;
  elNotServed.textContent = notServed;
  elAppointments.textContent = totalAppointments;
  elClientsInStore.textContent = clientsInStore;
  if (elTodayClients) elTodayClients.textContent = totalAppointments;
  if (elNoShows) elNoShows.textContent = noShows;
  if (elNoShowsConversion) elNoShowsConversion.textContent = `${noShowsConversion}%`;
  elInApproval.textContent = inApproval;
  elNotInterested.textContent = notInterested;
  elClosed.textContent = closedLeads;
  if (selectedDashPeriod === "day") {
    const dayStoreConv = totalAppointments > 0 ? ((clientsInStore / totalAppointments) * 100).toFixed(1) : "0.0";
    const dayApprovalConv = clientsInStore > 0 ? ((inApproval / clientsInStore) * 100).toFixed(1) : "0.0";
    const dayClosingConv = clientsInStore > 0 ? ((closedLeads / clientsInStore) * 100).toFixed(1) : "0.0";
    const dayNotInterestedConv = clientsInStore > 0 ? ((notInterested / clientsInStore) * 100).toFixed(1) : "0.0";
    if (elStoreConversion) elStoreConversion.textContent = `${dayStoreConv}%`;
    elClosingConversion.textContent = `${dayClosingConv}%`;
    if (elApprovalConversion) elApprovalConversion.textContent = `${dayApprovalConv}%`;
    if (elNotInterestedConversion) elNotInterestedConversion.textContent = `${dayNotInterestedConv}%`;
  } else {
    elClosingConversion.textContent = `${closingConversion}%`;
  }
  elAppointmentConversion.textContent = `${appointmentConversion}%`;
  if (elCancelled) elCancelled.textContent = cancelledLeads;

  if (receivedLeads > 0) {
    if (elServiceConversion) elServiceConversion.textContent = `${((inService / receivedLeads) * 100).toFixed(1)}%`;
    if (elNotServedConversion) elNotServedConversion.textContent = `${((notServed / receivedLeads) * 100).toFixed(1)}%`;
    if (selectedDashPeriod !== "day") {
      if (elStoreConversion) elStoreConversion.textContent = `${totalAppointments > 0 ? ((clientsInStore / totalAppointments) * 100).toFixed(1) : "0.0"}%`;
      if (elApprovalConversion) elApprovalConversion.textContent = `${clientsInStore > 0 ? ((inApproval / clientsInStore) * 100).toFixed(1) : "0.0"}%`;
      if (elNotInterestedConversion) elNotInterestedConversion.textContent = `${clientsInStore > 0 ? ((notInterested / clientsInStore) * 100).toFixed(1) : "0.0"}%`;
    }
    if (elCancelledConversion) elCancelledConversion.textContent = `${receivedLeads > 0 ? ((cancelledLeads / receivedLeads) * 100).toFixed(1) : "0.0"}%`;
  }

  // 4. Alertas de Metas
  const elAlertsList = document.getElementById("dash-goals-alerts-list");
  if (elAlertsList) {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const expectedProgress = today.getDate() / daysInMonth;

    let goalsQuery = client.from("crm_sales_goals").eq("month", currentMonthStr);
    const seeAll = shouldSeeAllLeads(currentCrmUser);
    if (!seeAll && currentCrmUser?.email) {
      goalsQuery = goalsQuery.eq("user_email", currentCrmUser.email);
    }
    const { data: goalsData } = await goalsQuery;
    const goals = goalsData || [];

    let users = [];
    if (seeAll) {
      const { data: usersData } = await client
        .from("crm_users")
        .select("nome, email, cargo, ativo")
        .eq("ativo", true);
      users = usersData || [];
    } else if (currentCrmUser) {
      users = [currentCrmUser];
    }

    let targetUsers = users;
    if (seeAll && selectedDashResponsibleEmail) {
      targetUsers = users.filter(u => u.email === selectedDashResponsibleEmail);
    }

    const alerts = [];
    targetUsers.forEach((user) => {
      const email = user.email;
      if (!email) return;

      const goal = goals.find(g => g.user_email === email);
      if (!goal) return;

      const userLeads = leads.filter(l => {
        if (l.assigned_to_email !== email || !l.created_at) return false;
        return l.created_at.startsWith(currentMonthStr);
      });
      const actualLeads = userLeads.length;
      const actualSales = userLeads.filter(l => l.status === "venda_fechada").length;

      const actualAppts = (apptsData || []).filter(a => {
        if (a.assigned_to_email !== email || !a.data_agendamento) return false;
        return a.data_agendamento.startsWith(currentMonthStr);
      }).length;

      const checkPacing = (actual, target, typeLabel, pluralLabel) => {
        if (!target || target <= 0) return null;
        const realProgress = actual / target;
        if (realProgress < expectedProgress) {
          const isAtencao = realProgress >= (expectedProgress - 0.15);
          return {
            nome: user.nome || email,
            email: email,
            type: typeLabel,
            plural: pluralLabel,
            actual,
            target,
            status: isAtencao ? "Atenção" : "Atrasado",
            color: isAtencao ? "#eab308" : "#ef4444"
          };
        }
        return null;
      };

      const alertLeads = checkPacing(actualLeads, goal.target_leads, "Leads", "leads");
      const alertAppts = checkPacing(actualAppts, goal.target_appointments, "Agendamentos", "agendamentos");
      const alertSales = checkPacing(actualSales, goal.target_sales, "Vendas", "vendas");

      if (alertLeads) alerts.push(alertLeads);
      if (alertAppts) alerts.push(alertAppts);
      if (alertSales) alerts.push(alertSales);
    });
    if (alerts.length === 0) {
      elAlertsList.innerHTML = `
        <div class="empty-alert-state">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #fef9c3; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #ca8a04;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          </div>
          <strong style="color: #101233; font-size: 0.88rem; font-weight: 700; margin-bottom: 4px;">Nenhum alerta no momento</strong>
          <span style="color: #667085; font-size: 0.78rem;">Suas metas estão em dia. Continue assim!</span>
        </div>
      `;
    } else {
      elAlertsList.innerHTML = "";
      alerts.forEach((alert) => {
        const item = document.createElement("div");
        item.style.padding = "10px 12px";
        item.style.border = "1px solid var(--line)";
        item.style.borderRadius = "8px";
        item.style.background = "rgba(255, 255, 255, 0.02)";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.fontSize = "0.82rem";

        item.innerHTML = `
          <div>
            <strong style="color: var(--ink);">${alert.nome}</strong> — <span style="color: var(--muted); font-weight: 600;">${alert.type} ${alert.status === "Atenção" ? "em atenção" : "atrasadas"}</span>
            <div style="font-size: 0.72rem; color: var(--muted); margin-top: 2px;">
               ${alert.actual} / ${alert.target} ${alert.plural}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; color: ${alert.color}; font-size: 0.75rem; border: 1px solid ${alert.color}; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
              ${alert.status}
            </span>
            <button class="dash-goal-report-btn" data-email="${alert.email}" data-name="${alert.nome}" style="border: none; background: transparent; color: var(--gold); font-size: 0.78rem; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0;">
              Ver relatório
            </button>
          </div>
        `;
        elAlertsList.appendChild(item);
      });

      // Attach click handlers to report buttons
      elAlertsList.querySelectorAll(".dash-goal-report-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const email = btn.dataset.email;
          const name = btn.dataset.name;
          window.location.href = `relatorios.html?seller_email=${encodeURIComponent(email)}&seller_name=${encodeURIComponent(name)}`;
        });
      });
    }
  }

  // 5. Alertas de Tarefas Atrasadas
  const elTasksAlertsList = document.getElementById("dash-tasks-alerts-list");
  if (elTasksAlertsList) {
    const now = new Date();
    const overdueTasks = (tasksData || []).filter(t => {
      return t.scheduled_at && new Date(t.scheduled_at) < now;
    });
    if (overdueTasks.length === 0) {
      elTasksAlertsList.innerHTML = `
        <div class="empty-alert-state">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #ef4444;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <strong style="color: #101233; font-size: 0.88rem; font-weight: 700; margin-bottom: 4px;">Tudo certo por aqui!</strong>
          <span style="color: #667085; font-size: 0.78rem;">Não há tarefas atrasadas no momento.</span>
        </div>
      `;
    } else {
      elTasksAlertsList.innerHTML = "";
      overdueTasks.forEach((task) => {
        const item = document.createElement("div");
        item.style.padding = "10px 12px";
        item.style.border = "1px solid var(--line)";
        item.style.borderRadius = "8px";
        item.style.background = "rgba(255, 255, 255, 0.02)";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.fontSize = "0.82rem";

        const formattedDate = new Date(task.scheduled_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });

        const typeLabel = task.type === "whatsapp_message" ? "Retorno WhatsApp" : "Lembrete / Retorno";

        item.innerHTML = `
          <div>
            <div style="font-weight: 700; color: var(--gold); margin-bottom: 2px;">
              ${task.assigned_to_name || "Sem atribuição"} — ${typeLabel}
            </div>
            <div style="color: var(--ink); font-weight: 600;">
              Cliente: ${task.lead_nome || "Sem nome"}
            </div>
            <div style="font-size: 0.72rem; color: #ef4444; font-weight: 700; margin-top: 4px;">
              Atrasado desde ${formattedDate}
            </div>
          </div>
          <button class="dash-task-open-btn" data-lead-id="${task.lead_id || ""}" data-task-id="${task.id}" style="border: none; background: var(--gold); color: #150126; font-size: 0.75rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: opacity 0.2s;">
            Abrir lead
          </button>
        `;
        elTasksAlertsList.appendChild(item);
      });

      // Bind click events to buttons
      elTasksAlertsList.querySelectorAll(".dash-task-open-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const leadId = btn.dataset.leadId;
          const taskObjId = btn.dataset.taskId;
          const taskObj = overdueTasks.find(t => t.id === taskObjId);

          if (!leadId) {
            if (taskObj) {
              const formattedDate = new Date(taskObj.scheduled_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              });
              const typeLabel = taskObj.type === "whatsapp_message" ? "Retorno WhatsApp" : "Lembrete / Retorno";
              alert(`Tarefa:\n${taskObj.title || "Sem título"}\nResponsável: ${taskObj.assigned_to_name || "Sem atribuição"}\nTipo: ${typeLabel}\nData/Hora: ${formattedDate}`);
            } else {
              alert("Não foi possível localizar o lead desta tarefa.");
            }
            return;
          }

          btn.disabled = true;
          const originalText = btn.textContent;
          btn.textContent = "Abrindo...";
          
          const client = getClient();
          const { data, error } = await client.from("leads").select("*").eq("id", leadId).single();
          
          btn.disabled = false;
          btn.textContent = originalText;
          
          if (error || !data) {
            alert("Não foi possível localizar o lead desta tarefa.");
          } else {
            openEditLeadModal(data);
            setTimeout(() => {
              const textarea = document.querySelector(".lead-modal textarea[name='note']");
              if (textarea) {
                textarea.scrollIntoView({ behavior: "smooth", block: "center" });
                textarea.focus();
              }
            }, 100);
          }
        });
      });
    }
  }

  renderDashboardCharts({ receivedLeads, inService, totalAppointments, clientsInStore, closedLeads, leads });
};

const renderDashboardCharts = ({ receivedLeads, inService, totalAppointments, clientsInStore, closedLeads, leads }) => {
  const funnelEl = document.getElementById("dash-funnel-chart");
  const statusEl = document.getElementById("dash-status-chart");
  const conversionEl = document.getElementById("dash-conversion-chart");
  if (!funnelEl && !statusEl && !conversionEl) return;

  const statusCounts = {};
  leads.forEach((lead) => {
    const s = String(lead.status || "lead_recebido").trim().toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const statusLabels = {
    lead_recebido: "Lead Recebido",
    primeiro_contato: "Primeiro Contato",
    agendamento: "Agendamento",
    cliente_em_loja: "Cliente em Loja",
    proposta_enviada: "Proposta Enviada",
    venda_fechada: "Venda Fechada",
    cancelado: "Cancelado",
    nao_quer: "Não Quer",
    "não_quer": "Não Quer",
    nao_tem_interesse: "Sem Interesse",
    perdido: "Perdido",
    em_aprovacao: "Em Aprovação",
  };

  const statusColors = {
    lead_recebido: "#6366f1",
    primeiro_contato: "#ea580c",
    agendamento: "#2563eb",
    cliente_em_loja: "#ca8a04",
    proposta_enviada: "#7c3aed",
    venda_fechada: "#10b981",
    cancelado: "#ef4444",
    nao_quer: "#ef4444",
    "não_quer": "#ef4444",
    nao_tem_interesse: "#f97316",
    perdido: "#dc2626",
    em_aprovacao: "#8b5cf6",
  };

  if (funnelEl) {
    const steps = [
      { label: "Recebidos", value: receivedLeads, color: "#7C3AED", gradient: "linear-gradient(135deg, #7C3AED, #5B5FEF)", icon: "users" },
      { label: "Atendidos", value: inService, color: "#EA580C", gradient: "linear-gradient(135deg, #FF7A1A, #EA580C)", icon: "headphones" },
      { label: "Agendamentos", value: totalAppointments, color: "#2563EB", gradient: "linear-gradient(135deg, #3B82F6, #2563EB)", icon: "calendar" },
      { label: "Em Loja", value: clientsInStore, color: "#D97706", gradient: "linear-gradient(135deg, #FBBF24, #D97706)", icon: "store" },
      { label: "Fechados", value: closedLeads, color: "#059669", gradient: "linear-gradient(135deg, #34D399, #059669)", icon: "check" },
    ];
    const maxVal = Math.max(receivedLeads, 1);
    const iconPaths = {
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
      headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="7" y="13" width="3" height="3" rx="0.5"/><rect x="14" y="13" width="3" height="3" rx="0.5"/>',
      store: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
      check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    };
    const widths = [100, 82, 64, 46, 30];
    let funnelHTML = '<div class="dash-funnel-v2">';
    funnelHTML += '<div class="dash-funnel-v2-header">';
    funnelHTML += '  <div class="dash-funnel-v2-header-spacer"></div>';
    funnelHTML += '  <div class="dash-funnel-v2-header-metrics"><span>Quantidade</span><span>Conversão</span></div>';
    funnelHTML += '</div>';
    funnelHTML += '<div class="dash-funnel-v2-rows">';
    steps.forEach((step, i) => {
      const pct = ((step.value / maxVal) * 100).toFixed(0);
      funnelHTML += `
        <div class="dash-funnel-v2-row" style="--stage-color: ${step.color}; --stage-width: ${widths[i]}%;">
          <div class="dash-funnel-v2-piece" style="background: ${step.gradient}; width: calc(${widths[i]}% * 0.8);">
            <div class="dash-funnel-v2-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${step.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths[step.icon]}</svg>
            </div>
            <span class="dash-funnel-v2-label">${step.label}</span>
          </div>
          <div class="dash-funnel-v2-dotted" style="border-color: ${step.color};"></div>
          <div class="dash-funnel-v2-metrics-row">
            <span class="dash-funnel-v2-metric-value" style="color: ${step.color};">${step.value}</span>
            <span class="dash-funnel-v2-metric-pct" style="background: ${step.color}12; color: ${step.color}; border: 1px solid ${step.color}22;">${pct}%</span>
          </div>
        </div>`;
    });
    funnelHTML += '</div>';
    funnelHTML += '</div>';
    funnelEl.innerHTML = funnelHTML;
  }

  if (statusEl) {
    const excludeStatuses = new Set(["nao_quer", "não_quer", "nao_tem_interesse", "perdido"]);
    const pieData = [];
    Object.entries(statusCounts).forEach(([key, val]) => {
      if (excludeStatuses.has(key)) return;
      if (val <= 0) return;
      pieData.push({
        key,
        label: statusLabels[key] || key,
        value: val,
        color: statusColors[key] || "#94a3b8",
      });
    });
    pieData.sort((a, b) => b.value - a.value);

    const total = pieData.reduce((sum, d) => sum + d.value, 0) || 1;

    const totalEl = document.getElementById("dash-status-total");
    const totalPctEl = document.getElementById("dash-status-total-pct");
    if (totalEl) totalEl.textContent = String(total);
    if (totalPctEl) totalPctEl.textContent = "100% do total";

    const cx = 100, cy = 100, r = 86, inner = 56;
    let cumAngle = -Math.PI / 2;
    let paths = "";

    pieData.forEach((d) => {
      const angle = (d.value / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(cumAngle);
      const y1 = cy + r * Math.sin(cumAngle);
      const x2 = cx + r * Math.cos(cumAngle + angle);
      const y2 = cy + r * Math.sin(cumAngle + angle);
      const ix1 = cx + inner * Math.cos(cumAngle);
      const iy1 = cy + inner * Math.sin(cumAngle);
      const ix2 = cx + inner * Math.cos(cumAngle + angle);
      const iy2 = cy + inner * Math.sin(cumAngle + angle);
      const large = angle > Math.PI ? 1 : 0;

      paths += `<path d="M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${inner},${inner} 0 ${large} 0 ${ix1},${iy1} Z" fill="${d.color}"/>`;
      cumAngle += angle;
    });

    const softBg = {
      lead_recebido: { bg: "#EEF2FF", fg: "#5B4BFF" },
      venda_fechada: { bg: "#D1FAE5", fg: "#059669" },
      agendamento: { bg: "#DBEAFE", fg: "#2563EB" },
      cliente_em_loja: { bg: "#FEF3C7", fg: "#D97706" },
      primeiro_contato: { bg: "#FFEDD5", fg: "#F97316" },
      proposta_enviada: { bg: "#F5F3FF", fg: "#7C3AED" },
      em_aprovacao: { bg: "#F5F3FF", fg: "#8B5CF6" },
      cancelado: { bg: "#FEE2E2", fg: "#EF4444" },
    };

    let legendHTML = "";
    pieData.forEach((d) => {
      const pct = ((d.value / total) * 100).toFixed(1);
      const soft = softBg[d.key] || { bg: "#F1F5F9", fg: d.color };
      legendHTML += `
        <div class="status-item" style="--status-color: ${d.color};">
          <span class="status-dot" style="background: ${d.color};"></span>
          <div class="status-info">
            <div class="status-name">${d.label}</div>
            <div class="status-description">${pct}% do total</div>
          </div>
          <div class="status-quantity">${d.value}</div>
          <div class="status-percent-badge" style="background: ${soft.bg}; color: ${soft.fg};">${pct}%</div>
        </div>`;
    });

    statusEl.innerHTML = `
      <div class="chart-wrapper">
        <svg class="dash-donut-svg" viewBox="0 0 200 200">${paths}</svg>
        <div class="chart-center">
          <div class="chart-center-number">${total}</div>
          <div class="chart-center-label">leads</div>
        </div>
      </div>
      <div class="status-list">${legendHTML}</div>`;
  }

  if (conversionEl) {
    const convSteps = [
      { label: "Atendimento", from: receivedLeads, to: inService, color: "#ea580c", iconBg: "rgba(234, 88, 12, 0.1)", icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' },
      { label: "Agendamento", from: inService, to: totalAppointments, color: "#2563eb", iconBg: "rgba(37, 99, 235, 0.1)", icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
      { label: "Em Loja", from: totalAppointments, to: clientsInStore, color: "#ca8a04", iconBg: "rgba(202, 138, 4, 0.1)", icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
      { label: "Fechamento", from: clientsInStore, to: closedLeads, color: "#10b981", iconBg: "rgba(16, 185, 129, 0.1)", icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
    ];
    const generalPct = receivedLeads > 0 ? ((closedLeads / receivedLeads) * 100) : 0;

    const totalNumEl = document.getElementById("dash-conversion-total");
    const totalPctEl = document.getElementById("dash-conversion-total-pct");
    if (totalNumEl) totalNumEl.textContent = closedLeads;
    if (totalPctEl) totalPctEl.textContent = generalPct.toFixed(1) + "% conversão geral";

    let html = '<div class="conversion-stages">';
    convSteps.forEach((step) => {
      const pct = step.from > 0 ? ((step.to / step.from) * 100) : 0;
      const pctText = pct.toFixed(1) + "%";
      html += `
        <div class="conversion-stage-card">
          <div class="conversion-stage-icon" style="background: ${step.iconBg}; color: ${step.color};">
            ${step.icon}
          </div>
          <div class="conversion-stage-info">
            <div class="conversion-stage-label">${step.label}</div>
            <div class="conversion-stage-bar-track">
              <div class="conversion-stage-bar-fill" style="width: ${Math.min(pct, 100)}%; background: ${step.color};"></div>
            </div>
          </div>
          <div class="conversion-stage-meta">
            <div class="conversion-stage-pct">${pctText}</div>
            <div class="conversion-stage-count">${step.to} leads</div>
          </div>
        </div>`;
    });
    html += '</div>';
    html += `
      <div class="general-conversion-card">
        <div>
          <div class="general-conversion-label">Conversão Geral</div>
          <div class="general-conversion-detail">${closedLeads} de ${receivedLeads} leads convertidos</div>
        </div>
        <div class="general-conversion-value">${generalPct.toFixed(1)}%</div>
      </div>`;
    conversionEl.innerHTML = html;
  }
};

const loadCrmUsersForSelect = async (selectElement, currentAssignedEmail) => {
  const client = getClient();
  if (!client || !selectElement) return;

  const { data, error } = await client
    .from("crm_users")
    .select("id, nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !data) return;

  selectElement.innerHTML = '<option value="">Selecionar Vendedor...</option>';
  data.forEach((user) => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = `${user.nome} (${(user.cargo || "").toUpperCase()})`;
    if (user.email === currentAssignedEmail) {
      option.selected = true;
    }
    selectElement.appendChild(option);
  });
};

const changeLeadResponsible = async (leadId, newEmail) => {
  const client = getClient();
  if (!client || !leadId) return null;
  try {
    const updatedLead = await updateLeadThroughApi(client, leadId, { assigned_to_email: newEmail });
    await loadLeads();
    return updatedLead;
  } catch (error) {
    alert("Erro ao alterar responsável: " + (error.message || "Tente novamente."));
    return null;
  }
};

const closeAppointmentModal = (result = null) => {
  appointmentModal?.close();
  if (appointmentResolution) {
    const resolve = appointmentResolution;
    appointmentResolution = null;
    resolve(result);
  }
};

const openAppointmentModal = async ({ appointment = null, lead = null, date = "", time = "" } = {}) => {
  if (!appointmentModal || !appointmentForm) return null;

  appointmentForm.reset();
  setAppointmentStatus("");
  appointmentForm.dataset.mode = appointment ? "edit" : "create";
  const linkedLeadId = appointment?.lead_id || lead?.id || "";
  const linkedLead = lead || (linkedLeadId ? await fetchLeadForAppointment(linkedLeadId) : null);
  const leadOwner = await resolveAppointmentLeadOwner(linkedLead);
  appointmentForm.elements.id.value = appointment?.id || "";
  appointmentForm.elements.lead_id.value = linkedLeadId;
  appointmentForm.elements.nome_cliente.value = appointment?.nome_cliente || linkedLead?.name || "";
  appointmentForm.elements.telefone_cliente.value = appointment?.telefone_cliente || linkedLead?.telefone || "";
  appointmentForm.elements.data_agendamento.value = appointment?.data_agendamento || date || toDateKey(new Date());
  appointmentForm.elements.hora_agendamento.value = normalizeAppointmentTime(appointment?.hora_agendamento || time || "08:00");
  appointmentForm.elements.nome_usuario.value = leadOwner.name || appointment?.nome_usuario || "Vendedor nao informado";
  appointmentForm.elements.observacao.value = appointment?.observacao || "";

  const title = appointmentModal.querySelector("#appointment-modal-title");
  const submit = appointmentForm.querySelector("button[type='submit']");
  const deleteButton = appointmentModal.querySelector("[data-delete-appointment]");
  if (title) title.textContent = appointment ? "Detalhes do agendamento" : "Agendar cliente";
  if (submit) submit.textContent = appointment ? "Salvar alteracoes" : "Confirmar agendamento";
  if (deleteButton) deleteButton.hidden = !appointment;

  appointmentModal.showModal();
  appointmentForm.elements.data_agendamento.focus();

  return new Promise((resolve) => {
    appointmentResolution = resolve;
  });
};

const fetchLeadForAppointment = async (leadId, fallback = {}) => {
  const client = getClient();
  if (!client || !leadId) return null;
  try {
    const leads = await fetchAuthorizedLeads(client);
    const lead = leads.find((item) => String(item.id) === String(leadId));
    if (lead) return lead;
  } catch (error) {
    console.warn("Não foi possível carregar o responsável do lead:", error);
  }
  return fallback?.name ? { id: leadId, ...fallback } : null;
};

const resolveAppointmentLeadOwner = async (lead) => {
  const client = getClient();
  const ownerEmail = String(lead?.assigned_to_email || "").trim().toLowerCase();
  let ownerUser = null;
  if (client && ownerEmail) {
    const { data } = await client
      .from("crm_users")
      .select("id,nome,email")
      .ilike("email", ownerEmail)
      .eq("ativo", true)
      .maybeSingle();
    ownerUser = data || null;
  }
  return {
    id: ownerUser?.id || null,
    name: lead?.assigned_to_name || ownerUser?.nome || ownerEmail || "",
  };
};

const requestAppointmentForLead = async (leadId, fallback = {}) => {
  const client = getClient();
  if (client && leadId) {
    try {
      const { data: activeApts } = await client
        .from("appointments")
        .select("id, data_agendamento, hora_agendamento")
        .eq("lead_id", leadId)
        .neq("status", "cancelado")
        .limit(1);
      
      if (activeApts && activeApts.length > 0) {
        const existing = activeApts[0];
        alert(`Este cliente já possui um agendamento ativo em ${existing.data_agendamento} às ${existing.hora_agendamento.slice(0, 5)}.`);
        return { id: existing.id, skipped: true };
      }
    } catch (checkError) {
      console.warn("Erro ao checar agendamentos existentes:", checkError);
    }
  }

  const lead = await fetchLeadForAppointment(leadId, fallback);
  if (!lead) {
    alert("Nao consegui carregar o cliente para criar o agendamento.");
    return null;
  }
  return openAppointmentModal({ lead });
};

const createAppointmentCard = (appointment) => {
  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  const canSeeAppointmentSeller = shouldSeeAllLeads(currentCrmUser);
  const card = document.createElement("article");
  card.className = "appointment-card";
  card.tabIndex = 0;
  card.dataset.appointmentId = appointment.id;
  if (appointment.lead_id) card.dataset.leadId = appointment.lead_id;

  // 3-dots menu button and dropdown menu
  const menuBtn = document.createElement("button");
  menuBtn.className = "appointment-menu-button";
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-label", "Opções");
  menuBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>';

  const dropdown = document.createElement("div");
  dropdown.className = "appointment-card-dropdown";

  const editItem = document.createElement("button");
  editItem.className = "appointment-card-dropdown-item btn-edit";
  editItem.type = "button";
  editItem.textContent = "Editar lead";

  const cancelItem = document.createElement("button");
  cancelItem.className = "appointment-card-dropdown-item btn-cancel";
  cancelItem.type = "button";
  cancelItem.textContent = "Cancelar agendamento";

  dropdown.append(editItem, cancelItem);

  // Top Row: horários + confirmação
  const topRow = document.createElement("div");
  topRow.className = "appointment-top-row";

  // Horário Pill
  const timeBadge = document.createElement("span");
  timeBadge.className = "appointment-time-badge";
  timeBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${normalizeAppointmentTime(appointment.hora_agendamento)}`;

  // Confirmação Pill
  const isConfirmed = ["concluido", "confirmado"].includes(String(appointment.status || "").toLowerCase());
  const confBadge = document.createElement("button");
  confBadge.type = "button";
  confBadge.className = `appointment-confirmation-badge ${isConfirmed ? "confirmed" : "pending"}`;
  if (isConfirmed) {
    confBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Confirmado`;
  } else {
    confBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> A confirmar`;
  }

  // Create Status Option Dropdown Menu
  const statusDropdown = document.createElement("div");
  statusDropdown.className = "appointment-status-dropdown";

  const optBtn = document.createElement("button");
  optBtn.type = "button";
  if (isConfirmed) {
    optBtn.className = "appointment-status-option pending";
    optBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> A confirmar`;
  } else {
    optBtn.className = "appointment-status-option confirmed";
    optBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Confirmado`;
  }

  optBtn.addEventListener("click", async (event) => {
    event.stopPropagation();
    statusDropdown.classList.remove("is-open");
    const client = getClient();
    if (!client) return;
    const targetStatus = isConfirmed ? "agendado" : "concluido";
    const { error } = await client
      .from("appointments")
      .update({ status: targetStatus })
      .eq("id", appointment.id);
    if (error) {
      alert(`Não foi possível alterar status: ${error.message}`);
      return;
    }
    await loadAppointments();
  });

  statusDropdown.append(optBtn);

  confBadge.addEventListener("click", (event) => {
    event.stopPropagation();
    document.querySelectorAll(".appointment-status-dropdown.is-open, .appointment-card-dropdown.is-open, .lead-card-dropdown.is-open").forEach((d) => {
      if (d !== statusDropdown) d.classList.remove("is-open");
    });
    statusDropdown.classList.toggle("is-open");
  });

  topRow.append(timeBadge, confBadge);

  // Client Name
  const clientName = document.createElement("div");
  clientName.className = "appointment-client-name";
  clientName.textContent = appointment.nome_cliente;

  // Info List (Seller and Phone)
  const infoList = document.createElement("div");
  infoList.className = "appointment-info-list";

  // Seller row
  const sellerRow = document.createElement("div");
  sellerRow.className = "appointment-info-row";
  
  const sellerIcon = document.createElement("span");
  sellerIcon.className = "appointment-info-icon vendor";
  sellerIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  const sellerText = document.createElement("span");
  sellerText.className = "appointment-info-text";
  sellerText.textContent = formatSellerName(appointment.vendedor_nome || appointment.nome_usuario);

  sellerRow.append(sellerIcon, sellerText);

  // Phone row
  const phoneRow = document.createElement("div");
  phoneRow.className = "appointment-info-row";

  const phoneIcon = document.createElement("span");
  phoneIcon.className = "appointment-info-icon phone";
  phoneIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  const phoneText = document.createElement("span");
  phoneText.className = "appointment-info-text";
  phoneText.textContent = formatDisplayPhone(appointment.telefone_cliente) || "Sem telefone";

  phoneRow.append(phoneIcon, phoneText);
  if (canSeeAppointmentSeller) infoList.append(sellerRow);
  infoList.append(phoneRow);

  card.append(menuBtn, dropdown, statusDropdown, topRow, clientName, infoList);

  const openLead = async (event) => {
    event.stopPropagation();
    const leadId = appointment.lead_id || card.dataset.leadId;
    if (!leadId) return;
    const lead = await fetchLeadForAppointment(leadId, {
      name: appointment.nome_cliente,
      telefone: appointment.telefone_cliente,
      assigned_to_name: appointment.vendedor_nome || appointment.nome_usuario,
    });
    if (lead) await openEditLeadModal(lead);
  };

  menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    document.querySelectorAll(".appointment-card-dropdown.is-open, .lead-card-dropdown.is-open").forEach((d) => {
      if (d !== dropdown) d.classList.remove("is-open");
    });
    dropdown.classList.toggle("is-open");
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("is-open");
    statusDropdown.classList.remove("is-open");
  });

  editItem.addEventListener("click", openLead);

  cancelItem.addEventListener("click", async (event) => {
    event.stopPropagation();
    dropdown.classList.remove("is-open");
    const leadId = appointment.lead_id || card.dataset.leadId;
    if (!leadId) return;

    if (confirm(`Deseja cancelar o agendamento de "${appointment.nome_cliente}" e voltar o lead para "Primeiro contato"?`)) {
      setCalendarStatus("Cancelando agendamento...");
      const success = await updateLeadStatus(leadId, "primeiro_contato", { goBack: true });
      if (success) {
        await loadLeads();
      }
    }
  });

  return card;
};

const renderCalendar = () => {
  if (!calendarWeekStart) calendarWeekStart = getWeekStart();
  const days = Array.from({ length: 7 }, (_, index) => addDays(calendarWeekStart, index));
  const todayKey = toDateKey(new Date());
  const end = days[6];
  const weekFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  if (calendarWeekLabel) calendarWeekLabel.textContent = `${weekFormat.format(days[0])} a ${weekFormat.format(end)}`;
  setCalendarStatus("Veja seus clientes agendados da semana");

  const weekAppointments = calendarAppointments.filter((item) =>
    days.some((day) => item.data_agendamento === toDateKey(day))
  );
  const confirmedAppointments = weekAppointments.filter((item) =>
    ["concluido", "confirmado"].includes(String(item.status || "").toLowerCase())
  );
  const storeStatuses = ["cliente_em_loja", "proposta_enviada", "venda_fechada"];
  const storeAppointments = weekAppointments.filter((item) => {
    const appointmentDay = days.find((day) => item.data_agendamento === toDateKey(day));
    return appointmentDay?.getDay() !== 0 && storeStatuses.includes(item.lead_status);
  });
  setCalendarHeaderStats({
    total: weekAppointments.length,
    confirmed: confirmedAppointments.length,
    store: storeAppointments.length,
  });

  const weekRangeEl = document.querySelector("[data-calendar-week-range]");
  if (weekRangeEl) {
    const d0 = days[0];
    const d6 = days[6];
    const fmt = (d) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}`;
    };
    weekRangeEl.textContent = `${fmt(d0)} - ${fmt(d6)}`;
  }

  if (calendarGrid) {
    calendarGrid.innerHTML = "";

    const dayAcronyms = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

    const dayCounts = days.map((d) => {
      if (d.getDay() === 0) return null; // Exclude Sunday
      const dKey = toDateKey(d);
      return calendarAppointments.filter((item) => item.data_agendamento === dKey).length;
    });
    const validCounts = dayCounts.filter((c) => c !== null);
    const maxAppointments = validCounts.length > 0 ? Math.max(...validCounts) : 0;
    const minAppointments = validCounts.length > 0 ? Math.min(...validCounts) : 0;
    const hasDifferentCounts = maxAppointments !== minAppointments;

    days.forEach((day) => {
      const dateKey = toDateKey(day);
      const dayOfWeek = day.getDay();
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const isToday = dateKey === todayKey;
      const dayAcronym = dayAcronyms[dayOfWeek];
      const dayDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(day);

      const dayAppointments = calendarAppointments
        .filter((item) => item.data_agendamento === dateKey)
        .sort((a, b) => normalizeAppointmentTime(a.hora_agendamento).localeCompare(normalizeAppointmentTime(b.hora_agendamento)));

      const hasAppointments = dayAppointments.length > 0;
      const dayCount = dayOfWeek === 0 ? 0 : dayAppointments.length;

      let busyClass = "";
      if (dayOfWeek !== 0 && hasDifferentCounts) {
        if (dayCount === maxAppointments) {
          busyClass = " is-most-busy";
        } else if (dayCount === minAppointments) {
          busyClass = " is-least-busy";
        } else {
          busyClass = " is-normal-day";
        }
      } else if (dayOfWeek !== 0) {
        busyClass = " is-normal-day";
      }

      const column = document.createElement("div");
      const stateClass = isToday ? " is-today" : hasAppointments ? " has-appointments" : "";
      const themeClass = isSunday ? " is-sunday" : isSaturday ? " is-saturday" : "";
      column.className = `weekly-day-card${stateClass}${themeClass}${busyClass}`;

      // Redesigned Card Header
      const header = document.createElement("div");
      header.className = "day-card-header";

      const main = document.createElement("div");
      main.className = "day-header-main";

      const left = document.createElement("div");
      left.className = "day-header-left";

      const iconWrap = document.createElement("div");
      iconWrap.className = "day-icon";
      iconWrap.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="7" y="13" width="3" height="3" rx="0.5"/><rect x="14" y="13" width="3" height="3" rx="0.5"/></svg>`;

      const info = document.createElement("div");
      info.className = "day-info";

      const nameEl = document.createElement("div");
      nameEl.className = "day-name";
      nameEl.textContent = dayAcronym;

      const dateEl = document.createElement("div");
      dateEl.className = "day-date";
      dateEl.textContent = dayDate;

      info.append(nameEl, dateEl);
      left.append(iconWrap, info);

      const headerDivider = document.createElement("div");
      headerDivider.className = "day-header-divider";

      const right = document.createElement("div");
      right.className = "day-header-right";

      const countNum = document.createElement("div");
      countNum.className = "day-count";
      countNum.textContent = dayCount;

      const countLbl = document.createElement("div");
      countLbl.className = "day-count-label";
      countLbl.innerHTML = "Clientes<br>Agendados";

      right.append(countNum, countLbl);
      main.append(left, headerDivider, right);

      const accent = document.createElement("div");
      accent.className = "day-header-accent";

      header.append(main, accent);

      const list = document.createElement("div");
      list.className = "weekly-day-card-appointments";

      if (!hasAppointments) {
        const empty = document.createElement("div");
        empty.className = "weekly-day-empty";
        empty.innerHTML = `
          <svg class="weekly-day-empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Nenhum agendamento</span>
        `;
        list.append(empty);
      } else {
        dayAppointments.forEach((item) => list.append(createAppointmentCard(item)));
      }

      // Card Footer with counter: "0 | Clientes em Loja | 0%"
      const footer = document.createElement("div");
      footer.className = "weekly-day-card-footer";

      const storeCount = dayOfWeek === 0 ? 0 : dayAppointments.filter(apt => storeStatuses.includes(apt.lead_status)).length;

      const countNumber = document.createElement("span");
      countNumber.className = "weekly-day-card-count";
      countNumber.textContent = storeCount;

      const verticalBar = document.createElement("span");
      verticalBar.className = "weekly-day-card-footer-divider";
      verticalBar.textContent = "|";

      const countLabel = document.createElement("span");
      countLabel.className = "weekly-day-card-label";
      countLabel.textContent = storeCount === 1 ? "Cliente em Loja" : "Clientes em Loja";

      const verticalBar2 = document.createElement("span");
      verticalBar2.className = "weekly-day-card-footer-divider";
      verticalBar2.textContent = "|";

      const countPercent = document.createElement("span");
      countPercent.className = "weekly-day-card-percent";
      const totalScheduled = dayCount;
      const percentVal = totalScheduled > 0 ? (storeCount / totalScheduled) * 100 : 0;
      const formattedPercent = percentVal % 1 === 0 ? percentVal.toFixed(0) : percentVal.toFixed(1);
      countPercent.textContent = `${formattedPercent}%`;

      footer.append(countNumber, verticalBar, countLabel, verticalBar2, countPercent);

      column.append(header, list, footer);
      calendarGrid.append(column);
    });
  }

  if (calendarMobileList) {
    calendarMobileList.innerHTML = "";
    days.forEach((day) => {
      const dateKey = toDateKey(day);
      const dayAppointments = calendarAppointments
        .filter((item) => item.data_agendamento === dateKey)
        .sort((a, b) => normalizeAppointmentTime(a.hora_agendamento).localeCompare(normalizeAppointmentTime(b.hora_agendamento)));
      const section = document.createElement("section");
      section.className = `calendar-mobile-day${toDateKey(day) === todayKey ? " is-today" : ""}${day.getDay() === 6 ? " is-saturday" : day.getDay() === 0 ? " is-sunday" : ""}`;
      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(day);
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "calendar-nav-button";
      addButton.textContent = "+";
      addButton.addEventListener("click", () => openAppointmentModal({ date: dateKey, time: "08:00" }));
      header.append(title, addButton);
      section.append(header);
      const list = document.createElement("div");
      list.className = "calendar-mobile-day-list";
      if (!dayAppointments.length) {
        const empty = document.createElement("p");
        empty.className = "calendar-mobile-empty";
        empty.textContent = "Nenhum cliente agendado.";
        list.append(empty);
      } else {
        dayAppointments.forEach((item) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "calendar-mobile-appointment";
          const time = document.createElement("time");
          time.textContent = normalizeAppointmentTime(item.hora_agendamento);
          const info = document.createElement("span");
          const name = document.createElement("strong");
          name.textContent = item.nome_cliente;
          const seller = document.createElement("span");
          seller.textContent = item.nome_usuario || "Vendedor nao informado";
          info.append(name, seller);
          button.append(time, info);
          button.addEventListener("click", async () => {
            if (!item.lead_id) return;
            const lead = await fetchLeadForAppointment(item.lead_id, {
              name: item.nome_cliente,
              telefone: item.telefone_cliente,
              assigned_to_name: item.vendedor_nome || item.nome_usuario,
            });
            if (lead) await openEditLeadModal(lead);
          });
          list.append(button);
        });
      }
      section.append(list);
      calendarMobileList.append(section);
    });
  }
};

const loadAppointments = async () => {
  const client = getClient();
  if (!client || !calendarWeekStart) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (!currentCrmUser) return;
  const authUserId = window.currentUser?.id || window.sevenGoldCrmSession?.currentUser?.id || null;
  await initCalendarResponsibleFilter(currentCrmUser);

  setCalendarStatus("Carregando agendamentos...");
  const start = toDateKey(calendarWeekStart);
  const end = toDateKey(addDays(calendarWeekStart, 6));

  let query = client
    .from("appointments")
    .select("id, lead_id, nome_cliente, telefone_cliente, usuario_id, nome_usuario, data_agendamento, hora_agendamento, observacao, status, created_at, updated_at, leads ( status )")
    .gte("data_agendamento", start)
    .lte("data_agendamento", end)
    .neq("status", "cancelado")
    .order("data_agendamento")
    .order("hora_agendamento");

  let activeTeamId = selectedCalendarTeamId;
  let activeResponsibleId = selectedCalendarResponsibleId;

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    activeTeamId = coordTeamId;
    if (activeResponsibleId) {
      const teamEmails = await loadTeamMemberEmails(currentCrmUser.email);
      const { data: teamUsers } = await client.from("crm_users").select("id").in("email", teamEmails);
      const userIds = (teamUsers || []).map((u) => u.id);
      if (!userIds.includes(activeResponsibleId)) {
        activeResponsibleId = "";
      }
    }
  }

  if (!shouldSeeAllLeads(currentCrmUser) && authUserId) {
    query = query.eq("usuario_id", authUserId);
  } else if (activeResponsibleId) {
    query = query.eq("usuario_id", activeResponsibleId);
  } else if (activeTeamId) {
    const teamEmails = await getTeamMemberEmailsById(client, activeTeamId);
    if (teamEmails?.length) {
      const { data: teamUsers } = await client.from("crm_users").select("id").in("email", teamEmails);
      const userIds = (teamUsers || []).map((u) => u.id);
      if (userIds.length) {
        query = query.in("usuario_id", userIds);
      }
    }
  } else if (isTeamCoordinatorRole(currentCrmUser) && currentCrmUser.email) {
    const teamEmails = await loadTeamMemberEmails(currentCrmUser.email);
    if (teamEmails?.length) {
      const { data: teamUsers } = await client.from("crm_users").select("id").in("email", teamEmails);
      const userIds = (teamUsers || []).map((u) => u.id);
      if (userIds.length) {
        query = query.in("usuario_id", userIds);
      }
    }
  }

  const { data, error } = await query;

  if (error) {
    calendarAppointments = [];
    renderCalendar();
    setCalendarStatus("A tabela de agendamentos ainda nao esta configurada no Supabase.", "error");
    return;
  }
  const appointments = data || [];
  calendarAppointments = appointments.map((item) => ({
    ...item,
    vendedor_nome: item.vendedor_nome || item.nome_usuario,
    lead_status: item.leads?.status,
  }));
  renderCalendar();
  setCalendarStatus("Veja seus clientes agendados da semana");
};

appointmentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = getClient();
  const user = await getCurrentUser();
  if (!client || !user) {
    setAppointmentStatus("Faca login novamente antes de salvar.");
    return;
  }

  const formData = new FormData(appointmentForm);
  const linkedLeadId = String(formData.get("lead_id") || "").trim();
  const linkedLead = linkedLeadId ? await fetchLeadForAppointment(linkedLeadId) : null;
  const leadOwner = await resolveAppointmentLeadOwner(linkedLead);
  const time = normalizeAppointmentTime(formData.get("hora_agendamento"));
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes < 8 * 60 || totalMinutes > 20 * 60 + 59) {
    setAppointmentStatus("Escolha um horario entre 08:00 e 20:59.");
    return;
  }

  const cleanPhone = String(formData.get("telefone_cliente") || "").replace(/\D/g, "");
  if (cleanPhone) {
    const phoneVariants = [cleanPhone];
    if (cleanPhone.startsWith("55") && cleanPhone.length > 2) {
      phoneVariants.push(cleanPhone.slice(2));
    } else {
      phoneVariants.push("55" + cleanPhone);
    }

    const appointmentId = String(formData.get("id") || "").trim();
    try {
      const { data: existingApts } = await client
        .from("appointments")
        .select("id, data_agendamento, hora_agendamento")
        .in("telefone_cliente", phoneVariants)
        .neq("status", "cancelado")
        .limit(1);
      
      if (existingApts && existingApts.length > 0) {
        const existing = existingApts[0];
        if (existing.id !== appointmentId) {
          setAppointmentStatus(`Este número já possui agendamento ativo em ${existing.data_agendamento} às ${existing.hora_agendamento.slice(0, 5)}.`);
          return;
        }
      }
    } catch (checkError) {
      console.warn("Erro ao verificar duplicados por telefone:", checkError);
    }
  }

  const submitButton = appointmentForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";
  const payload = {
    lead_id: linkedLeadId || null,
    nome_cliente: String(formData.get("nome_cliente") || "").trim(),
    telefone_cliente: String(formData.get("telefone_cliente") || "").replace(/\D/g, "") || null,
    usuario_id: leadOwner.id || user.id,
    nome_usuario: leadOwner.name || String(formData.get("nome_usuario") || "").trim() || "Vendedor nao informado",
    data_agendamento: String(formData.get("data_agendamento") || ""),
    hora_agendamento: `${time}:00`,
    observacao: String(formData.get("observacao") || "").trim() || null,
    status: "agendado",
  };

  const appointmentId = String(formData.get("id") || "").trim();
  let data = null;
  let error = null;

  if (appointmentId) {
    const result = await client.from("appointments").update(payload).eq("id", appointmentId).select().single();
    data = result.data;
    error = result.error;
  } else {
    try {
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "Não foi possível salvar o agendamento.");
      }
      data = result.appointment;
    } catch (requestError) {
      error = requestError;
    }
  }

  submitButton.disabled = false;
  submitButton.textContent = appointmentId ? "Salvar alteracoes" : "Confirmar agendamento";
  if (error) {
    setAppointmentStatus(`Nao consegui salvar o agendamento: ${error.message}`);
    return;
  }

  closeAppointmentModal(data);
  await loadAppointments();
});

document.querySelector(".user-profile-link")?.addEventListener("click", () => {
  document.body.classList.remove("menu-open");
});

document.querySelector("[data-close-appointment]")?.addEventListener("click", () => closeAppointmentModal(null));
document.querySelector("[data-cancel-appointment]")?.addEventListener("click", () => closeAppointmentModal(null));
appointmentModal?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeAppointmentModal(null);
});

document.querySelector("[data-delete-appointment]")?.addEventListener("click", async () => {
  const appointmentId = appointmentForm?.elements.id.value;
  if (!appointmentId || !confirm("Cancelar este agendamento?")) return;
  const client = getClient();
  const { error } = await client.from("appointments").update({ status: "cancelado" }).eq("id", appointmentId);
  if (error) {
    setAppointmentStatus(`Nao consegui cancelar: ${error.message}`);
    return;
  }
  closeAppointmentModal({ cancelled: true });
  await loadAppointments();
});

document.querySelector("[data-new-appointment]")?.addEventListener("click", () => openAppointmentModal());
document.querySelector("[data-calendar-prev]")?.addEventListener("click", async () => {
  calendarWeekStart = addDays(calendarWeekStart || getWeekStart(), -7);
  renderCalendar();
  await loadAppointments();
});
document.querySelector("[data-calendar-today]")?.addEventListener("click", async () => {
  calendarWeekStart = getWeekStart();
  renderCalendar();
  await loadAppointments();
});
document.querySelector("[data-calendar-next]")?.addEventListener("click", async () => {
  calendarWeekStart = addDays(calendarWeekStart || getWeekStart(), 7);
  renderCalendar();
  await loadAppointments();
});

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

const parseOptionalMoney = (value) => {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
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
    const { data: sessionData } = await getClient().auth.getSession();
    const response = await fetch(`/api/leads/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData?.session?.access_token}`,
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

  const newNote = prompt("Editar Anotacoes:", lead.note || "");
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

const updateLeadThroughApi = async (client, leadId, payload) => {
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch("/api/leads/update-stage", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lead_id: leadId, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || "Não foi possível mover o lead.");
  }
  return result.lead;
};

const updateLeadStageThroughApi = (client, leadId, status, goBack = false) =>
  updateLeadThroughApi(client, leadId, { status, ...(goBack ? { go_back: true } : {}) });

const updateLeadTag = async (leadId, tagValue) => {
  const client = getClient();
  if (!client || !leadId) return false;

  const card = document.querySelector(`[data-lead-id="${leadId}"]`);
  if (!card) {
    try {
      await updateLeadThroughApi(client, leadId, { tags: tagValue ? [tagValue] : [] });
      return true;
    } catch (error) {
      alert(error.message || "Não consegui atualizar a etiqueta do lead.");
      return false;
    }
  }

  try {
    await updateLeadThroughApi(client, leadId, { tags: tagValue ? [tagValue] : [] });
    if (Array.isArray(card.dataset) && card.dataset) {
      if (tagValue) {
        card.dataset.leadTag = tagValue;
      } else {
        delete card.dataset.leadTag;
      }
    }
    const previousManualTag = card.querySelector(".lead-tag.manual-tag");
    if (previousManualTag) previousManualTag.remove();
    const badgeRow = card.querySelector(".lead-card-badge-row") || card.querySelector(".lead-trash-badge-row");
    const stageId = card.dataset.status;
    if (tagValue && badgeRow && getAvailableTagsForStage(stageId).length > 0) {
      const config = PIPELINE_STAGE_TAGS_MAP[tagValue] || { value: tagValue, label: tagValue, className: "default" };
      const tagEl = document.createElement("div");
      tagEl.className = `lead-tag manual-tag lead-tag-${config.className}`;
      tagEl.dataset.leadTagValue = config.value;
      tagEl.textContent = config.label;
      tagEl.title = `Etiqueta: ${config.label}`;
      if (badgeRow.firstChild) {
        badgeRow.insertBefore(tagEl, badgeRow.firstChild);
      } else {
        badgeRow.appendChild(tagEl);
      }
    }
    card.querySelectorAll(".lead-card-tag-option").forEach((opt) => {
      if (opt.dataset.tagValue && String(opt.dataset.tagValue) === String(tagValue || "")) {
        opt.classList.add("is-selected");
      } else {
        opt.classList.remove("is-selected");
      }
    });
    return true;
  } catch (error) {
    alert(error.message || "Não consegui atualizar a etiqueta do lead.");
    return false;
  }
};

const updateLeadStatus = async (leadId, status, { optimistic = false, skipAppointment = false, goBack = false } = {}) => {
  const client = getClient();

  if (!client || !leadId || !status) {
    return false;
  }
  if (isSelectedProductionClosed()) {
    alert("Não é possível alterar lead de uma produção encerrada.");
    return false;
  }

  const existingCard = document.querySelector(`[data-lead-id="${leadId}"]`);
  const currentStatus = existingCard?.closest?.(".kanban-column")?.dataset.status || null;
  if (currentStatus === status) return true;

  if (goBack) {
    if (!canGoBackPipelineStatus(currentStatus)) {
      alert("Este lead não pode voltar uma etapa.");
      return false;
    }
    const prevStatus = getPreviousPipelineStatus(currentStatus);
    if (status !== prevStatus) {
      alert(`A etapa anterior válida é: ${statusLabels[prevStatus]}.`);
      return false;
    }
  } else {
    if (currentStatus && !canMoveToPipelineStatus(currentStatus, status)) {
      if (currentStatus === "cancelado") {
        alert("Um lead cancelado não pode retornar ao funil.");
        return false;
      }
      const nextStatus = getNextPipelineStatus(currentStatus);
      const nextLabel = nextStatus ? statusLabels[nextStatus] : "nenhuma etapa";
      alert(`Este lead só pode avançar para a próxima etapa: ${nextLabel}, ou ser cancelado.`);
      return false;
    }
  }

  let cancelledAppointment = false;
  const backwardStatuses = ["lead_recebido", "primeiro_contato"];
  if (currentStatus === "agendamento" && backwardStatuses.includes(status)) {
    const { data: appointments } = await client
      .from("appointments")
      .select("id")
      .eq("lead_id", leadId)
      .neq("status", "cancelado");
    if (appointments && appointments.length > 0) {
      for (const apt of appointments) {
        await client.from("appointments").update({ status: "cancelado" }).eq("id", apt.id);
      }
      cancelledAppointment = true;
    }
  }

  let createdAppointment = null;
  if (status === "agendamento" && !skipAppointment && !goBack) {
    createdAppointment = await requestAppointmentForLead(leadId);
    if (!createdAppointment || createdAppointment.cancelled) {
      return false;
    }
  }

  if (optimistic) {
    const targetColumn = columns.find((col) => col.dataset.status === status);
    const sourceCard = existingCard;

    if (sourceCard && targetColumn) {
      const sourceColumn = sourceCard.closest?.(".kanban-column");
      const targetStack = targetColumn.querySelector(".card-stack");
      const emptyMsg = targetStack.querySelector(".empty-column, .empty-column-card");
      if (emptyMsg) emptyMsg.remove();

      if (status === "cancelado") {
        const rebuiltLead = {
          id: leadId,
          name: sourceCard.querySelector(".lead-card-name")?.textContent?.trim() || "",
          telefone: sourceCard.querySelector(".lead-info-value")?.textContent?.trim() || "",
          status,
          trash_origin_status: currentStatus,
          assigned_to_email: sourceCard.dataset.assignedEmail || "",
          assigned_to_name: sourceCard.dataset.assignedName || "",
          created_at: sourceCard.dataset.createdAt || new Date().toISOString(),
          tags: [],
        };
        const newCard = createLeadCard(rebuiltLead);
        if (rebuiltLead.assigned_to_email) newCard.dataset.assignedEmail = rebuiltLead.assigned_to_email;
        if (rebuiltLead.assigned_to_name) newCard.dataset.assignedName = rebuiltLead.assigned_to_name;
        if (rebuiltLead.created_at) newCard.dataset.createdAt = rebuiltLead.created_at;
        targetStack.append(newCard);
        sourceCard.remove();
      } else if (currentStatus === "cancelado") {
        const rebuiltLead = {
          id: leadId,
          name: sourceCard.querySelector(".lead-card-name")?.textContent?.trim() || "",
          telefone: sourceCard.querySelector(".lead-info-value")?.textContent?.trim() || "",
          status,
          trash_origin_status: null,
          assigned_to_email: sourceCard.dataset.assignedEmail || "",
          assigned_to_name: sourceCard.dataset.assignedName || "",
          created_at: sourceCard.dataset.createdAt || new Date().toISOString(),
          tags: [],
        };
        const newCard = createLeadCard(rebuiltLead);
        if (rebuiltLead.assigned_to_email) newCard.dataset.assignedEmail = rebuiltLead.assigned_to_email;
        if (rebuiltLead.assigned_to_name) newCard.dataset.assignedName = rebuiltLead.assigned_to_name;
        if (rebuiltLead.created_at) newCard.dataset.createdAt = rebuiltLead.created_at;
        targetStack.append(newCard);
        sourceCard.remove();
      } else {
        targetStack.append(sourceCard);
        sourceCard.dataset.status = status;
        const targetTagsAvailable = getAvailableTagsForStage(status).length > 0;
        const existingManualTag = sourceCard.querySelector(".lead-tag.manual-tag");
        if (!targetTagsAvailable && existingManualTag) {
          existingManualTag.remove();
          sourceCard.dataset.leadTag = "";
        }
      }

      const counter = targetColumn.querySelector("small");
      if (counter) {
        counter.textContent = targetStack.querySelectorAll(".lead-card").length;
      }

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

  const shouldClearManualTag = status !== "cancelado" && getAvailableTagsForStage(status).length === 0 && status !== "lead_recebido";

  try {
    const updatePayload = { status, ...(goBack ? { go_back: true } : {}) };
    if (shouldClearManualTag) updatePayload.tags = [];
    await updateLeadThroughApi(client, leadId, updatePayload);
  } catch (error) {
    if (createdAppointment?.id && !createdAppointment.skipped) {
      await client.from("appointments").delete().eq("id", createdAppointment.id);
    }
    if (cancelledAppointment) {
      await client.from("appointments").update({ status: "agendado" }).eq("lead_id", leadId);
    }
    if (optimistic) {
      await loadLeads();
    }
    alert(error.message || "Não consegui mover o lead. Tente novamente.");
    return false;
  }

  if (!optimistic) {
    await loadLeads();
  }
  if (status === "agendamento" || cancelledAppointment) {
    await loadAppointments();
  }
  return true;
};

const getTagColors = (tag) => {
  const colors = [
    { bg: "#eff6ff", text: "#1d4ed8", border: "#dbeafe" }, // blue
    { bg: "#fef2f2", text: "#b91c1c", border: "#fee2e2" }, // red
    { bg: "#ecfdf5", text: "#047857", border: "#d1fae5" }, // green
    { bg: "#fffbeb", text: "#b45309", border: "#fef3c7" }, // yellow/amber
    { bg: "#faf5ff", text: "#6d28d9", border: "#f3e8ff" }, // purple
    { bg: "#fdf2f8", text: "#be185d", border: "#fce7f3" }, // pink
    { bg: "#f0fdfa", text: "#0f766e", border: "#ccfbf1" }, // teal
  ];
  let hash = 0;
  const tagStr = String(tag).toLowerCase().trim();
  for (let i = 0; i < tagStr.length; i++) {
    hash = tagStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const createLeadCard = (lead) => {
  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  const showResponsible = Boolean(currentCrmUser) && shouldSeeAllLeads(currentCrmUser);
  let tagDropdownList = null;
  const card = document.createElement("article");
  card.className = lead.status === "venda_fechada" ? "lead-card done" : "lead-card";
  const leadLocked = lead.commercial_productions?.status === "closed" || Boolean(lead.locked_at);
  card.draggable = !leadLocked;
  card.classList.toggle("is-production-locked", leadLocked);
  card.dataset.leadId = lead.id;
  card.dataset.status = lead.status || "lead_recebido";
  if (lead.created_at) card.dataset.createdAt = lead.created_at;
  if (lead.assigned_to_email) card.dataset.assignedEmail = lead.assigned_to_email;
  if (lead.assigned_to_name) card.dataset.assignedName = lead.assigned_to_name;

  const top = document.createElement("div");
  top.className = "lead-card-header";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "lead-checkbox";
  checkbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
    updateBulkActionsBar();
  });

  const name = document.createElement("div");
  name.className = "lead-name";
  name.textContent = lead.name
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  top.append(checkbox, name);

  // Warning Badge (days without contact)
  const createdDate = lead.created_at ? new Date(lead.created_at) : null;
  const now = new Date();
  const diffDays = createdDate && !Number.isNaN(createdDate.getTime())
    ? Math.floor(Math.abs(now - createdDate) / (1000 * 60 * 60 * 24))
    : 0;

  const warningBadge = document.createElement("span");
  warningBadge.className = "lead-time-badge";
  const warningIcon = '<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  if (diffDays === 0) {
    warningBadge.innerHTML = `${warningIcon} Hoje`;
  } else {
    warningBadge.innerHTML = `${warningIcon} ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }

  const badgeRow = document.createElement("div");
  if (lead.status === "primeiro_contato" || lead.status === "agendamento") {
    const stageBadge = document.createElement("span");
    stageBadge.className = `lead-tag-badge lead-trash-origin-badge--${lead.status}`;
    const stageIcon = lead.status === "primeiro_contato"
      ? `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
      : `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    stageBadge.innerHTML = `${stageIcon} ${lead.status === "primeiro_contato" ? "Primeiro contato" : "Agendamento"}`;
    badgeRow.append(stageBadge);
  }
  badgeRow.className = "lead-badges-row";
  badgeRow.append(warningBadge);

  const getLeadTagIcon = (className) => {
    if (className === "retorno" || className === "retornar") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    }
    if (className === "confirmar-agend" || className === "pre-agendamento") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    }
    if (className === "acompanhar") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
    }
    if (className === "nao-quer" || className === "faltou" || className === "cancelado") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }
    if (className === "reagendar" || className === "remarcar") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
    }
    if (className === "sem-retorno" || className === "nao-responde" || className === "esfriando") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5L7 19M19 17L5 7M2 12h20"/></svg>`;
    }
    if (className === "proposta" || className === "qualificado" || className === "fechado") {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    return "";
  };

  const manualTagConfig = getLeadTagConfig(lead);
  let manualTagBadge = null;
  const isClickableTagStage = lead.status === "primeiro_contato" || lead.status === "agendamento";

  if (isClickableTagStage && lead.status !== "cancelado") {
    const tagDropdownContainer = document.createElement("div");
    tagDropdownContainer.className = "lead-tag-dropdown-container";
    tagDropdownContainer.style.position = "relative";
    tagDropdownContainer.style.display = "inline-flex";

    const stageBadgeBtn = document.createElement("button");
    stageBadgeBtn.type = "button";
    
    const tagIconSvg = `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;

    if (manualTagConfig) {
      stageBadgeBtn.className = `lead-tag-badge clickable-tag-badge lead-tag-${manualTagConfig.className}`;
      stageBadgeBtn.innerHTML = `${getLeadTagIcon(manualTagConfig.className) || tagIconSvg} ${manualTagConfig.label}`;
    } else {
      stageBadgeBtn.className = `lead-tag-badge clickable-tag-badge lead-tag-none`;
      stageBadgeBtn.innerHTML = `${tagIconSvg} Sem etiqueta`;
    }
    
    tagDropdownList = document.createElement("div");
    tagDropdownList.className = "lead-tag-dropdown-menu";
    
    const availableTags = getAvailableTagsForStage(lead.status);
    
    const clearOpt = document.createElement("button");
    clearOpt.type = "button";
    clearOpt.className = "lead-tag-dropdown-item lead-tag-dropdown-item--clear";
    clearOpt.textContent = "Sem etiqueta";
    if (!manualTagConfig) clearOpt.classList.add("is-active");
    clearOpt.addEventListener("click", async (e) => {
      e.stopPropagation();
      tagDropdownList.classList.remove("is-open");
      const ok = await updateLeadTag(lead.id, null);
      if (ok) await loadLeads();
    });
    tagDropdownList.append(clearOpt);

    availableTags.forEach((tagOpt) => {
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = `lead-tag-dropdown-item lead-tag-dropdown-item--${tagOpt.className}`;
      opt.textContent = tagOpt.label;
      if (manualTagConfig && manualTagConfig.value === tagOpt.value) opt.classList.add("is-active");
      opt.addEventListener("click", async (e) => {
        e.stopPropagation();
        tagDropdownList.classList.remove("is-open");
        const ok = await updateLeadTag(lead.id, tagOpt.value);
        if (ok) await loadLeads();
      });
      tagDropdownList.append(opt);
    });

    stageBadgeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".lead-tag-dropdown-menu.is-open, .appointment-status-dropdown.is-open, .appointment-card-dropdown.is-open, .lead-card-dropdown.is-open").forEach((openD) => {
        if (openD !== tagDropdownList) openD.classList.remove("is-open");
      });
      tagDropdownList.classList.toggle("is-open");
    });

    tagDropdownContainer.append(stageBadgeBtn, tagDropdownList);
    badgeRow.append(tagDropdownContainer);
  } else {
    if (manualTagConfig) {
      manualTagBadge = document.createElement("span");
      manualTagBadge.className = `lead-tag-badge lead-tag-${manualTagConfig.className}`;
      manualTagBadge.dataset.leadTagValue = manualTagConfig.value;
      manualTagBadge.title = `Etiqueta: ${manualTagConfig.label}`;
      manualTagBadge.innerHTML = `${getLeadTagIcon(manualTagConfig.className)} ${manualTagConfig.label}`;
      if (lead.status !== "cancelado") badgeRow.append(manualTagBadge);
    }
  }
  if (manualTagConfig && lead?.id) {
    card.dataset.leadTag = manualTagConfig.value;
  } else if (lead?.id) {
    delete card.dataset.leadTag;
  }

  let trashBadgeRow = null;
  if (lead.status === "cancelado") {
    trashBadgeRow = document.createElement("div");
    trashBadgeRow.className = "lead-badges-row";

    const originBadge = document.createElement("span");
    const originStatus = lead.trash_origin_status && lead.trash_origin_status !== "cancelado"
      ? lead.trash_origin_status
      : "unknown";
    originBadge.className = `lead-tag-badge lead-trash-origin-badge--${originStatus}`;
    const originLabel = statusLabels[lead.trash_origin_status] || "Origem desconhecida";

    const getStageCategoryIcon = (statusKey) => {
      if (statusKey === "primeiro_contato") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
      }
      if (statusKey === "agendamento") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
      }
      if (statusKey === "lead_recebido") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17h6M9 13h6M9 9h6"/></svg>`;
      }
      if (statusKey === "cliente_em_loja") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
      }
      if (statusKey === "proposta_enviada") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
      }
      if (statusKey === "venda_fechada") {
        return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      }
      return `<svg class="lead-warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    };

    originBadge.innerHTML = `${getStageCategoryIcon(originStatus)} ${originLabel}`;
    originBadge.title = `Enviado para a Lixeira a partir de: ${originLabel}`;

    trashBadgeRow.append(warningBadge, originBadge);
    if (manualTagBadge) {
      trashBadgeRow.append(manualTagBadge);
    }
  }

  if (lead.is_carry_over) {
    const carryBadge = document.createElement("span");
    const originProd = commercialProductions.find((p) => p.id === lead.carried_from_production_id);
    const originName = originProd ? originProd.name : "Mês anterior";
    carryBadge.className = "lead-tag-badge lead-carry";
    carryBadge.textContent = `Veio de ${originName}`;
    carryBadge.title = `Lead continuado da produção de ${originName}`;
    if (trashBadgeRow) {
      trashBadgeRow.prepend(carryBadge);
    } else {
      badgeRow.prepend(carryBadge);
    }
  }

  // Info List (Phone and Responsible)
  const infoList = document.createElement("div");
  infoList.className = "lead-info-list";

  const phoneRow = document.createElement("div");
  phoneRow.className = "lead-info-row";

  const phoneIconSpan = document.createElement("span");
  phoneIconSpan.className = "lead-info-icon phone";
  phoneIconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

  const phoneTextSpan = document.createElement("span");
  phoneTextSpan.className = "lead-info-text";
  phoneTextSpan.textContent = lead.telefone ? formatDisplayPhone(lead.telefone) : "Sem telefone";

  phoneRow.append(phoneIconSpan, phoneTextSpan);
  infoList.append(phoneRow);

  if (showResponsible) {
    const respRow = document.createElement("div");
    respRow.className = "lead-info-row";

    const respIconSpan = document.createElement("span");
    respIconSpan.className = "lead-info-icon responsible";
    respIconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    const respTextSpan = document.createElement("span");
    respTextSpan.className = "lead-info-text";
    respTextSpan.textContent = lead.assigned_to_name || "Sem responsável";

    respRow.append(respIconSpan, respTextSpan);
    infoList.append(respRow);
  }

  // Optional Note
  const hasCustomNote = lead.note && lead.note.trim() !== "" && lead.note.trim().toLowerCase() !== "sem observacao cadastrada.";
  let noteEl = null;
  if (hasCustomNote) {
    noteEl = document.createElement("p");
    noteEl.className = "lead-card-note";
    noteEl.textContent = lead.note;
  }

  // Separators
  const divider1 = document.createElement("div");
  divider1.className = "lead-card-divider";

  const divider2 = document.createElement("div");
  divider2.className = "lead-card-divider";

  // Actions Row
  const actionsRow = document.createElement("div");
  actionsRow.className = "lead-actions";

  const cleanDigits = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
  const waPhone = (cleanDigits.length <= 11 && !cleanDigits.startsWith("55") && cleanDigits.length >= 10) 
    ? "55" + cleanDigits 
    : cleanDigits;

  const waBtn = document.createElement("a");
  waBtn.href = lead.telefone ? `https://wa.me/${waPhone}` : "#";
  waBtn.target = lead.telefone ? "_blank" : "_self";
  waBtn.className = "lead-action-button whatsapp";
  waBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-7.6-4.7 8.38 8.38 0 0 1 3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>WhatsApp`;
  if (!lead.telefone) waBtn.style.opacity = "0.5";

  const callBtn = document.createElement("a");
  callBtn.href = lead.telefone ? `tel:+${waPhone}` : "#";
  callBtn.className = "lead-action-button call";
  callBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Ligar`;
  if (!lead.telefone) callBtn.style.opacity = "0.5";

  actionsRow.append(waBtn, callBtn);

  if (leadLocked && isProductionDirectorCeo) {
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "lead-action-button copy";
    copyBtn.textContent = "Copiar para atual";
    copyBtn.addEventListener("click", async () => {
      try {
        await productionRequest({ action: "copy_lead", lead_id: lead.id });
        alert("Lead copiado para a produção atual.");
        await loadLeads();
      } catch (error) {
        alert(error.message);
      }
    });
    actionsRow.append(copyBtn);
    actionsRow.style.gridTemplateColumns = "repeat(3, 1fr)";
  }

  // Tags Container (legacy)
  const tagsContainer = document.createElement("div");
  tagsContainer.className = "lead-tags-container";
  let tagsArray = [];
  if (Array.isArray(lead.tags)) {
    tagsArray = lead.tags;
  } else if (typeof lead.tags === "string" && lead.tags.trim() !== "") {
    tagsArray = lead.tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  const knownManualTagValues = new Set(Object.keys(PIPELINE_STAGE_TAGS_MAP));
  const legacyTags = stageTagsAvailable
    ? []
    : tagsArray.filter((tag) => !knownManualTagValues.has(String(tag)));

  if (legacyTags.length > 0) {
    legacyTags.forEach(tag => {
      const tagEl = document.createElement("span");
      tagEl.className = "lead-tag-pill";
      tagEl.textContent = tag;
      const colors = getTagColors(tag);
      tagEl.style.backgroundColor = colors.bg;
      tagEl.style.color = colors.text;
      tagEl.style.borderColor = colors.border;
      tagsContainer.append(tagEl);
    });
  }

  // Append everything
  card.append(top, trashBadgeRow || badgeRow);
  if (legacyTags.length > 0) {
    card.append(tagsContainer);
  }
  card.append(divider1, infoList);
  if (noteEl) {
    card.append(noteEl);
  }

  // 3-dots actions menu
  const leadMenuBtn = document.createElement("button");
  leadMenuBtn.className = "lead-menu-button";
  leadMenuBtn.type = "button";
  leadMenuBtn.setAttribute("aria-label", "Opções do lead");
  leadMenuBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>';

  const leadDropdown = document.createElement("div");
  leadDropdown.className = "lead-card-dropdown";

  const editItem = document.createElement("button");
  editItem.className = "lead-card-dropdown-item btn-edit";
  editItem.type = "button";
  editItem.textContent = "Editar lead";
  if (leadLocked) {
    editItem.disabled = true;
    editItem.style.opacity = "0.5";
    editItem.title = "Lead travado porque pertence a uma produção encerrada.";
  }
  leadDropdown.append(editItem);

  const stageHasManualTags = getAvailableTagsForStage(lead.status).length > 0 && lead.status !== "primeiro_contato" && lead.status !== "agendamento";
  let tagMenuContainer = null;
  let tagMenuButton = null;
  if (stageHasManualTags) {
    tagMenuContainer = document.createElement("div");
    tagMenuContainer.className = "lead-card-tag-menu";

    tagMenuButton = document.createElement("button");
    tagMenuButton.className = "lead-card-dropdown-item btn-tag-toggle";
    tagMenuButton.type = "button";
    tagMenuButton.innerHTML = '<span>Etiqueta</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    tagMenuContainer.append(tagMenuButton);

    const tagOptionsList = document.createElement("div");
    tagOptionsList.className = "lead-card-tag-options";

    const clearTagItem = document.createElement("button");
    clearTagItem.className = "lead-card-tag-option lead-card-tag-option--clear";
    clearTagItem.type = "button";
    clearTagItem.textContent = "Sem etiqueta";
    tagOptionsList.append(clearTagItem);
    clearTagItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      tagMenuContainer.classList.remove("is-open");
      leadDropdown.classList.remove("is-open");
      const ok = await updateLeadTag(lead.id, null);
      if (ok === false) return;
    });

    getAvailableTagsForStage(lead.status).forEach((config) => {
      const opt = document.createElement("button");
      opt.className = `lead-card-tag-option lead-card-tag-option--${config.className}`;
      opt.type = "button";
      opt.dataset.tagValue = config.value;
      opt.innerHTML = `<span class="lead-card-tag-swatch lead-tag lead-tag-${config.className}">${config.label}</span><span class="lead-card-tag-check" aria-hidden="true"></span>`;
      tagOptionsList.append(opt);
      if (manualTagConfig && manualTagConfig.value === config.value) {
        opt.classList.add("is-selected");
      }
      opt.addEventListener("click", async (e) => {
        e.stopPropagation();
        tagMenuContainer.classList.remove("is-open");
        leadDropdown.classList.remove("is-open");
        const ok = await updateLeadTag(lead.id, config.value);
        if (ok === false) return;
      });
    });

    tagMenuContainer.append(tagOptionsList);
    tagMenuButton.addEventListener("click", (e) => {
      e.stopPropagation();
      tagMenuContainer.classList.toggle("is-open");
    });

    leadDropdown.append(tagMenuContainer);
  }

  if (lead.status === "cancelado" && isProductionDirectorCeo) {
    const recoverItem = document.createElement("button");
    recoverItem.className = "lead-card-dropdown-item btn-recover";
    recoverItem.type = "button";
    recoverItem.textContent = "Recuperar";
    leadDropdown.append(recoverItem);

    recoverItem.addEventListener("click", async (e) => {
      e.stopPropagation();
      leadDropdown.classList.remove("is-open");
      if (!confirm("Deseja recuperar este lead para a produção atual? Será criada uma cópia com status 'Lead recebido'.")) return;
      try {
        await productionRequest({ action: "recover_trash", lead_id: lead.id });
        alert("Lead recuperado e copiado para a produção atual.");
        await loadLeads();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  editItem.addEventListener("click", (e) => {
    e.stopPropagation();
    leadDropdown.classList.remove("is-open");
    if (leadLocked) return alert("Lead travado porque pertence a uma produção encerrada.");
    openEditLeadModal(lead);
  });

  leadMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".lead-card-dropdown.is-open, .appointment-card-dropdown.is-open").forEach((d) => {
      if (d !== leadDropdown) d.classList.remove("is-open");
    });
    leadDropdown.classList.toggle("is-open");
  });

  document.addEventListener("click", () => {
    leadDropdown.classList.remove("is-open");
    if (tagDropdownList) tagDropdownList.classList.remove("is-open");
  });

  card.append(leadMenuBtn, leadDropdown);
  card.append(divider2, actionsRow);

  return card;
};

const renderEmptyState = (stack) => {
  const container = document.createElement("div");
  container.className = "empty-column-card";

  const iconBox = document.createElement("div");
  iconBox.className = "empty-column-icon-box";
  iconBox.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

  const title = document.createElement("strong");
  title.textContent = "Sem leads nesta etapa";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Leads recém-chegados aparecerão aqui.";

  container.append(iconBox, title, subtitle);
  stack.append(container);
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

const getPipelineLeadDateRange = () => {
  if (!selectedPipelinePeriodValue) return null;

  if (selectedPipelinePeriod === "day") {
    const start = new Date(`${selectedPipelinePeriodValue}T00:00:00-03:00`);
    if (Number.isNaN(start.getTime())) return null;
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }

  if (selectedPipelinePeriod === "month") {
    const startsAt = selectedProduction?.starts_at;
    const endsAt = selectedProduction?.ends_at;
    if (!startsAt || !endsAt) return null;
    const start = new Date(`${startsAt}T00:00:00-03:00`);
    const finalDay = new Date(`${endsAt}T00:00:00-03:00`);
    return { start, end: new Date(finalDay.getTime() + 24 * 60 * 60 * 1000) };
  }

  const match = /^(\d{4})-W(\d{2})$/.exec(selectedPipelinePeriodValue);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1 + ((week - 1) * 7));
  const date = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  const start = new Date(`${date}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) };
};

const filterLeadsByPipelinePeriod = (leads) => {
  const range = getPipelineLeadDateRange();
  if (!range) return leads;
  return leads.filter((lead) => {
    const createdAt = new Date(lead.created_at);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= range.start && createdAt < range.end;
  });
};

const loadLeads = async () => {
  const client = getClient();

  if (!client || columns.length === 0) {
    return;
  }

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (!currentCrmUser) return;
  await initResponsibleFilter(currentCrmUser);

  let activeTeamId = selectedPipelineTeamId;
  let activeResponsibleEmail = selectedResponsibleEmail;

  if (isTeamCoordinatorRole(currentCrmUser)) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    activeTeamId = coordTeamId;
    if (activeResponsibleEmail) {
      const myTeamEmails = await loadTeamMemberEmails(currentCrmUser.email);
      if (!myTeamEmails.includes(activeResponsibleEmail)) {
        activeResponsibleEmail = "";
      }
    }
  }

  let teamEmails = null;
  if (activeTeamId) {
    teamEmails = await getTeamMemberEmailsById(client, activeTeamId);
  } else if (isTeamCoordinatorRole(currentCrmUser) && currentCrmUser.email) {
    const coordTeamId = getCoordinatedTeamId(currentCrmUser);
    if (coordTeamId) teamEmails = await loadTeamMemberEmails(currentCrmUser.email);
  }

  let visibleLeads;
  try {
    visibleLeads = await fetchAuthorizedLeads(client);
  } catch (error) {
    console.error("Erro ao carregar pipeline pelo servidor:", error);
    if (leadCount) leadCount.textContent = error.message || "Não foi possível carregar os leads.";
    return;
  }

  const normalizeLeadEmail = (value) => String(value || "").trim().toLowerCase();

  if (activeResponsibleEmail) {
    const responsibleEmail = normalizeLeadEmail(activeResponsibleEmail);
    visibleLeads = visibleLeads.filter((lead) => normalizeLeadEmail(lead.assigned_to_email) === responsibleEmail);
  } else if (teamEmails?.length) {
    const allowedTeamEmails = new Set(teamEmails.map(normalizeLeadEmail));
    visibleLeads = visibleLeads.filter((lead) => allowedTeamEmails.has(normalizeLeadEmail(lead.assigned_to_email)));
  }

  visibleLeads = filterLeadsByPipelinePeriod(visibleLeads);

  renderLeads(visibleLeads);
  if (!deepLinkedLeadHandled) {
    const requestedLeadId = new URLSearchParams(window.location.search).get("leadId");
    const requestedLead = requestedLeadId ? visibleLeads.find((lead) => String(lead.id) === String(requestedLeadId)) : null;
    if (requestedLead) {
      deepLinkedLeadHandled = true;
      openEditLeadModal(requestedLead);
    }
  }
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
        const sourceCard = document.querySelector(`[data-lead-id="${draggedLeadId}"]`);
        const currentStatus = sourceCard?.closest?.(".kanban-column")?.dataset.status;
        const targetStatus = column.dataset.status;
        const goBack = targetStatus === getPreviousPipelineStatus(currentStatus);
        await updateLeadStatus(draggedLeadId, targetStatus, { optimistic: true, goBack });
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
      const currentStatus = drag.card.closest?.(".kanban-column")?.dataset.status;
      const targetStatus = targetColumn.dataset.status;
      const goBack = targetStatus === getPreviousPipelineStatus(currentStatus);
      await updateLeadStatus(drag.id, targetStatus, { optimistic: true, goBack });
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

  const tagsInput = String(formData.get("tags") || "").trim();
  const baseTags = tagsInput
    ? tagsInput.split(",").map(t => t.trim()).filter(Boolean)
    : [];
  const leadTagSelect = leadForm?.querySelector?.("[data-lead-tag-select]");
  const leadTagValue = leadTagSelect ? String(leadTagSelect.value || "").trim() : "";
  let tagsArray = baseTags;
  if (mode === "edit" && leadTagSelect) {
    const finalTagValue = leadTagSelect.disabled ? "" : leadTagValue;
    tagsArray = finalTagValue ? [finalTagValue] : [];
  }

  if (mode === "edit" && leadId) {
    const originalStatus = String(leadForm.dataset.originalStatus || "").trim();
    const targetStatus = originalStatus || "lead_recebido";
    if (!canMoveToPipelineStatus(originalStatus, targetStatus)) {
      if (originalStatus === "cancelado") {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar Alteracoes";
        setFormStatus("Um lead cancelado não pode retornar ao funil.");
        return;
      }
      const nextStatus = getNextPipelineStatus(originalStatus);
      const nextLabel = nextStatus ? statusLabels[nextStatus] : "nenhuma etapa";
      submitButton.disabled = false;
      submitButton.textContent = "Salvar Alteracoes";
      setFormStatus(`Este lead só pode avançar para a próxima etapa: ${nextLabel}, ou ser cancelado.`);
      return;
    }
    let appointment = null;
    if (targetStatus === "agendamento" && originalStatus !== "agendamento") {
      modal?.close();
      appointment = await requestAppointmentForLead(leadId, {
        name,
        telefone: String(formData.get("telefone") || "").replace(/\D/g, ""),
      });
      if (!appointment || appointment.cancelled) {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar Alteracoes";
        modal?.showModal();
        return;
      }
    }

    let updateError = null;
    try {
      await updateLeadThroughApi(client, leadId, {
        name,
        telefone: String(formData.get("telefone") || "").replace(/\D/g, ""),
        status: targetStatus,
        origin: String(formData.get("origin") || "").trim(),
        note: String(formData.get("note") || "").trim(),
        tags: tagsArray,
        property_region: String(formData.get("property_region") || "").trim() || null,
        credit_value: parseOptionalMoney(formData.get("credit_value")),
        down_payment_value: parseOptionalMoney(formData.get("down_payment_value")),
        installment_value: parseOptionalMoney(formData.get("installment_value")),
      });
    } catch (error) {
      updateError = error;
    }

    submitButton.disabled = false;
    submitButton.textContent = "Salvar Alteracoes";

    if (updateError) {
      if (appointment?.id) {
        await client.from("appointments").delete().eq("id", appointment.id);
      }
      setFormStatus("Nao consegui atualizar o lead: " + updateError.message);
      modal?.showModal();
      return;
    }
  } else {
    const crmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
    const responsibleEmail = crmUser?.email || user.email || null;
    const responsibleName = crmUser?.nome || crmUser?.email || user.email || null;

    if (!responsibleEmail) {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar lead";
      setFormStatus("Nao foi possivel identificar o usuario responsavel pelo lead.");
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    const response = await fetch("/api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionData?.session?.access_token}` },
      body: JSON.stringify({
      name,
      telefone: String(formData.get("telefone") || "").replace(/\D/g, ""),
      origin: String(formData.get("origin") || "").trim(),
      status: "lead_recebido",
      note: String(formData.get("note") || "").trim(),
      tags: tagsArray,
      property_region: String(formData.get("property_region") || "").trim() || null,
      credit_value: parseOptionalMoney(formData.get("credit_value")),
      down_payment_value: parseOptionalMoney(formData.get("down_payment_value")),
      installment_value: parseOptionalMoney(formData.get("installment_value")),
      })
    });
    const created = await response.json().catch(() => ({}));

    submitButton.disabled = false;
    submitButton.textContent = "Salvar lead";

    if (!response.ok || created.ok !== true) {
      setFormStatus(created.error || "Não foi possível salvar o lead.");
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
    const selectedCards = Array.from(checkboxes).map((checkbox) => checkbox.closest(".lead-card")).filter(Boolean);
    const leadIds = selectedCards.map((card) => card.dataset.leadId).filter(Boolean);

    if (leadIds.length === 0) return;

    const invalidCard = selectedCards.find((card) => {
      const currentStatus = card.closest(".kanban-column")?.dataset.status;
      return !canMoveToPipelineStatus(currentStatus, targetStatus);
    });
    if (invalidCard) {
      const currentStatus = invalidCard.closest(".kanban-column")?.dataset.status;
      if (currentStatus === "cancelado") {
        alert("Leads cancelados não podem retornar ao funil.");
        moveSelect.value = "";
        return;
      }
      const nextStatus = getNextPipelineStatus(currentStatus);
      const nextLabel = nextStatus ? statusLabels[nextStatus] : "nenhuma etapa";
      alert(`Todos os leads selecionados devem estar na etapa anterior. Próxima etapa permitida: ${nextLabel}, ou Lixeira.`);
      moveSelect.value = "";
      return;
    }

    if (targetStatus === "agendamento") {
      if (!confirm(`Agendar ${leadIds.length} cliente${leadIds.length === 1 ? "" : "s"}? A data e o horario serao solicitados individualmente.`)) {
        moveSelect.value = "";
        return;
      }

      for (const leadId of leadIds) {
        const saved = await updateLeadStatus(leadId, "agendamento");
        if (!saved) break;
      }
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.closest(".lead-card")?.classList.remove("selected");
      });
      updateBulkActionsBar();
      moveSelect.value = "";
      await loadLeads();
      return;
    }

    if (confirm(`Deseja mover os ${leadIds.length} leads selecionados para "${statusLabels[targetStatus]}"?`)) {
      let allMoved = true;
      for (const leadId of leadIds) {
        const moved = await updateLeadStatus(leadId, targetStatus, { optimistic: true });
        if (!moved) {
          allMoved = false;
          break;
        }
      }
      if (allMoved) {
        checkboxes.forEach((checkbox) => {
          checkbox.checked = false;
          checkbox.closest(".lead-card")?.classList.remove("selected");
        });
        updateBulkActionsBar();
      }
      moveSelect.value = "";
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
        const { data: sessionData } = await client.auth.getSession();
        const response = await fetch(`/api/leads/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData?.session?.access_token}`,
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
  perfil: "Meu perfil",
};

const switchTab = () => {
  const hash = window.location.hash.replace("#", "") || "pipeline";
  const validTabs = ["dashboard", "pipeline", "tarefas", "feed", "calendario", "financeiro", "cadastro", "equipe", "perfil"];
  const activeTab = validTabs.includes(hash) ? hash : "pipeline";

  const userRole = window.userRole || (window.sevenGoldCrmSession?.userRole);
  if (userRole && typeof window.canAccessArea === "function") {
    window.currentCrmUser = window.crmUser || window.sevenGoldCrmSession?.crmUser;

    if (!window.canAccessArea(userRole, activeTab)) {
      alert("Você não tem permissão para acessar esta área.");
      const allowedTabs = ["pipeline", "dashboard", "calendario"];
      const fallbackTab = allowedTabs.find(tab => window.canAccessArea(userRole, tab)) || "pipeline";
      window.location.hash = "#" + fallbackTab;
      return;
    }
  }

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

  if (activeTab === "calendario") {
    calendarWeekStart = calendarWeekStart || getWeekStart();
    renderCalendar();
    loadAppointments();
  } else if (activeTab === "tarefas") {
    loadTasks();
  } else if (activeTab === "dashboard") {
    loadDashboardMetrics();
  }
};

window.addEventListener("hashchange", switchTab);

const initLeadModalTabs = () => {
  const tabsContainer = document.querySelector(".lead-modal-tabs");
  if (!tabsContainer) return;

  const tabButtons = tabsContainer.querySelectorAll(".lead-modal-tab-btn");
  const tabContents = document.querySelectorAll(".lead-modal-tab-content");
  const submitButton = document.querySelector(".lead-modal button[type='submit']");
  const deleteButton = document.getElementById("delete-lead-modal-btn");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // Update button active states
      tabButtons.forEach((b) => {
        b.classList.remove("active");
        b.style.color = "var(--muted)";
        b.style.borderBottomColor = "transparent";
      });
      btn.classList.add("active");
      btn.style.color = "var(--gold)";
      btn.style.borderBottomColor = "var(--gold)";

      // Update content visibility
      tabContents.forEach((content) => {
        content.style.setProperty("display", "none", "important");
      });

      // Map tabs to content divs
      if (targetTab === "dados") {
        const dadosContainer = document.getElementById("modal-lead-tab-dados");
        if (dadosContainer) dadosContainer.style.setProperty("display", "grid", "important");
        if (submitButton) submitButton.style.display = "block";
        const mode = leadForm?.dataset.mode;
        if (deleteButton && mode === "edit") deleteButton.style.display = "block";
      } else if (targetTab === "tarefas") {
        const tasksContainer = document.getElementById("modal-lead-tasks-section");
        if (tasksContainer) tasksContainer.style.setProperty("display", "block", "important");
        if (submitButton) submitButton.style.display = "none";
        if (deleteButton) deleteButton.style.display = "none";
      } else if (targetTab === "historico") {
        const historyContainer = document.getElementById("modal-lead-history-section");
        if (historyContainer) historyContainer.style.setProperty("display", "block", "important");
        if (submitButton) submitButton.style.display = "none";
        if (deleteButton) deleteButton.style.display = "none";
      }
    });
  });
};

const dashboardMetricOrderKey = "sevenGoldDashboardMetricOrder";
const sidebarNavOrderKey = "sevenGoldSidebarNavOrder";

const saveSidebarNavOrder = (navList) => {
  const order = Array.from(navList.querySelectorAll(".nav-item"))
    .map((item) => item.dataset.permissionKey || item.getAttribute("href"))
    .filter(Boolean);
  try {
    localStorage.setItem(sidebarNavOrderKey, JSON.stringify(order));
  } catch (error) {
    console.warn("Não foi possível salvar a ordem das abas:", error);
  }
};

const setupSidebarNavDrag = () => {
  const navList = document.querySelector(".nav-list");
  if (!navList || navList.dataset.dragReady === "true") return;
  navList.dataset.dragReady = "true";

  const items = Array.from(navList.querySelectorAll(".nav-item"));
  items.forEach((item) => {
    item.draggable = true;
  });

  try {
    const savedOrder = JSON.parse(localStorage.getItem(sidebarNavOrderKey) || "[]");
    if (Array.isArray(savedOrder)) {
      const itemByKey = new Map(
        items.map((item) => [item.dataset.permissionKey || item.getAttribute("href"), item])
      );
      savedOrder.forEach((key) => {
        const item = itemByKey.get(key);
        if (item) navList.append(item);
      });
      items.forEach((item) => {
        const key = item.dataset.permissionKey || item.getAttribute("href");
        if (!savedOrder.includes(key)) navList.append(item);
      });
    }
  } catch (error) {
    console.warn("Não foi possível restaurar a ordem das abas:", error);
  }

  let draggedItem = null;

  navList.addEventListener("dragstart", (event) => {
    const item = event.target.closest?.(".nav-item");
    if (!item) return;
    draggedItem = item;
    navList.classList.add("is-nav-reordering");
    item.classList.add("is-nav-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.dataset.permissionKey || item.getAttribute("href"));
  });

  navList.addEventListener("dragover", (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const targetItem = event.target.closest?.(".nav-item");
    if (!targetItem || targetItem === draggedItem) return;

    const targetRect = targetItem.getBoundingClientRect();
    const insertAfter = event.clientY > targetRect.top + targetRect.height / 2;
    navList.insertBefore(draggedItem, insertAfter ? targetItem.nextSibling : targetItem);
  });

  navList.addEventListener("drop", (event) => {
    if (!draggedItem) return;
    event.preventDefault();
    saveSidebarNavOrder(navList);
  });

  navList.addEventListener("dragend", () => {
    draggedItem?.classList.remove("is-nav-dragging");
    navList.classList.remove("is-nav-reordering");
    draggedItem = null;
    saveSidebarNavOrder(navList);
  });
};

const saveDashboardMetricOrder = (grid) => {
  const order = Array.from(grid.querySelectorAll(".kpi-card"))
    .map((card) => card.dataset.metricKey)
    .filter(Boolean);
  try {
    localStorage.setItem(dashboardMetricOrderKey, JSON.stringify(order));
  } catch (error) {
    console.warn("Não foi possível salvar a ordem dos cards:", error);
  }
};

const setupDashboardMetricDrag = () => {
  const grid = document.querySelector(".commercial-summary-grid");
  if (!grid || grid.dataset.dragReady === "true") return;
  grid.dataset.dragReady = "true";

  const cards = Array.from(grid.querySelectorAll(".kpi-card"));
  cards.forEach((card) => {
    const numberElement = card.querySelector(".kpi-number[id]");
    card.dataset.metricKey = numberElement?.id || "";
    card.draggable = true;
  });

  try {
    const savedOrder = JSON.parse(localStorage.getItem(dashboardMetricOrderKey) || "[]");
    if (Array.isArray(savedOrder)) {
      const cardByKey = new Map(cards.map((card) => [card.dataset.metricKey, card]));
      savedOrder.forEach((key) => {
        const card = cardByKey.get(key);
        if (card) grid.append(card);
      });
      cards.forEach((card) => {
        if (!savedOrder.includes(card.dataset.metricKey)) grid.append(card);
      });
    }
  } catch (error) {
    console.warn("Não foi possível restaurar a ordem dos cards:", error);
  }

  let draggedCard = null;

  grid.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.(".kpi-card");
    if (!card) return;
    draggedCard = card;
    card.classList.add("is-metric-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.metricKey);
  });

  grid.addEventListener("dragover", (event) => {
    if (!draggedCard) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const targetCard = event.target.closest?.(".kpi-card");
    if (!targetCard || targetCard === draggedCard) return;

    const currentCards = Array.from(grid.querySelectorAll(".kpi-card"));
    const draggedIndex = currentCards.indexOf(draggedCard);
    const targetIndex = currentCards.indexOf(targetCard);
    if (draggedIndex < targetIndex) {
      grid.insertBefore(draggedCard, targetCard.nextSibling);
    } else {
      grid.insertBefore(draggedCard, targetCard);
    }
  });

  grid.addEventListener("drop", (event) => {
    if (!draggedCard) return;
    event.preventDefault();
    saveDashboardMetricOrder(grid);
  });

  grid.addEventListener("dragend", () => {
    draggedCard?.classList.remove("is-metric-dragging");
    draggedCard = null;
    saveDashboardMetricOrder(grid);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  calendarWeekStart = getWeekStart();
  renderCalendar();
  initPipelineCalendarPicker();
  initProductionControls();
  setupDragAndDrop();
  setupTouchMove();
  setupBulkActions();
  setupSidebarNavDrag();
  setupDashboardMetricDrag();
  initLeadModalTabs();
  switchTab();
  loadLeads();
});

document.addEventListener("crm-authorized", async () => {
  window.currentCrmUser = window.crmUser || window.sevenGoldCrmSession?.crmUser;
  await loadCommercialProductions();
  loadLeads();
  const hash = window.location.hash.replace("#", "") || "pipeline";
  if (hash === "calendario") {
    loadAppointments();
  } else if (hash === "tarefas") {
    loadTasks();
  } else if (hash === "dashboard") {
    loadDashboardMetrics();
  }
});
