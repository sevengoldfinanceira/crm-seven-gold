const menuButton = document.querySelector(".menu-button");
const navItems = document.querySelectorAll(".nav-item");
const modal = document.querySelector(".lead-modal");
const openModalButton = document.querySelector("[data-open-modal]");
const closeModalButton = document.querySelector("[data-close-modal]");
const leadForm = document.querySelector("[data-lead-form]");
const leadFormStatus = document.querySelector("[data-lead-form-status]");
const leadCount = document.querySelector("[data-lead-count]");
const columns = Array.from(document.querySelectorAll("[data-status]"));
const appointmentModal = document.querySelector(".appointment-modal");
const appointmentForm = document.querySelector("[data-appointment-form]");
const appointmentStatus = document.querySelector("[data-appointment-status]");
const calendarGrid = document.querySelector("[data-calendar-grid]");
const calendarMobileList = document.querySelector("[data-calendar-mobile-list]");
const calendarWeekLabel = document.querySelector("[data-calendar-week-label]");
const calendarStatus = document.querySelector("[data-calendar-status]");
let draggedLeadId = null;
let pointerDrag = null;
let calendarWeekStart = null;
let calendarAppointments = [];
let appointmentResolution = null;
let currentEditingLead = null;

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

  if (confirm(`Deseja alterar o responsavel deste lead para "${newEmail}"?`)) {
    await changeLeadResponsible(currentEditingLead.id, newEmail, currentEditingLead);
    const updatedLead = { ...currentEditingLead, assigned_to_email: newEmail, assigned_to_name: event.target.options[event.target.selectedIndex].text.split(" (")[0] };
    currentEditingLead = updatedLead;
    const responsibleName = modal.querySelector("#modal-lead-responsible-name");
    const responsibleEmail = modal.querySelector("#modal-lead-responsible-email");
    if (responsibleName) responsibleName.textContent = updatedLead.assigned_to_name || newEmail;
    if (responsibleEmail) {
      responsibleEmail.textContent = newEmail;
      responsibleEmail.style.display = "inline";
    }
  } else {
    event.target.value = currentEditingLead.assigned_to_email || "";
  }
});

const openEditLeadModal = async (lead, highlightTaskId = null) => {
  if (!modal || !leadForm) return;

  const client = getClient();
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

  if (responsibleSection) {
    responsibleSection.style.display = "flex";
    if (lead.assigned_to_name) {
      if (responsibleName) responsibleName.textContent = lead.assigned_to_name;
      if (responsibleEmail) {
        responsibleEmail.textContent = lead.assigned_to_email || "";
        responsibleEmail.style.display = lead.assigned_to_email ? "inline" : "none";
      }
    } else {
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

const setAppointmentStatus = (message = "", type = "error") => {
  if (!appointmentStatus) return;
  appointmentStatus.textContent = message;
  appointmentStatus.dataset.type = type;
};

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

let responsibleFilterInitialized = false;
let selectedResponsibleEmail = "";

const initResponsibleFilter = async (currentCrmUser) => {
  if (responsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return; // Vendedor não vê o filtro
  }

  const selectEl = document.getElementById("responsible-filter-select");
  const containerEl = document.getElementById("responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  responsibleFilterInitialized = true;
  containerEl.style.display = "grid";

  const { data: users, error } = await client
    .from("crm_users")
    .select("nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !users) {
    console.error("Erro ao carregar vendedores para filtro:", error);
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
    selectedResponsibleEmail = e.target.value;
    loadLeads();
  });

  document.querySelector(".clear-button")?.addEventListener("click", () => {
    selectEl.value = "";
    selectedResponsibleEmail = "";
    loadLeads();
  });
};

let calendarResponsibleFilterInitialized = false;
let selectedCalendarResponsibleEmail = "";

const initCalendarResponsibleFilter = async (currentCrmUser) => {
  if (calendarResponsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return; // Vendedor não vê o filtro
  }

  const selectEl = document.getElementById("calendar-responsible-filter-select");
  const containerEl = document.getElementById("calendar-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  calendarResponsibleFilterInitialized = true;
  containerEl.style.display = "flex";

  const { data: users, error } = await client
    .from("crm_users")
    .select("nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !users) {
    console.error("Erro ao carregar vendedores para filtro do calendário:", error);
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
    selectedCalendarResponsibleEmail = e.target.value;
    loadAppointments();
  });
};

let tasksResponsibleFilterInitialized = false;
let selectedTasksResponsibleEmail = "";

const initTasksResponsibleFilter = async (currentCrmUser) => {
  if (tasksResponsibleFilterInitialized) return;

  if (!shouldSeeAllLeads(currentCrmUser)) {
    return; // Vendedor não vê o filtro
  }

  const selectEl = document.getElementById("tasks-responsible-filter-select");
  const containerEl = document.getElementById("tasks-responsible-filter-container");
  if (!selectEl || !containerEl) return;

  const client = getClient();
  if (!client) return;

  tasksResponsibleFilterInitialized = true;
  containerEl.style.display = "flex";

  const { data: users, error } = await client
    .from("crm_users")
    .select("nome, email, cargo, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error || !users) {
    console.error("Erro ao carregar vendedores para filtro de tarefas:", error);
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
  if (currentCrmUser) {
    await initTasksResponsibleFilter(currentCrmUser);
  }

  const tasksListEl = document.getElementById("tasks-list");
  const countLabelEl = document.querySelector("[data-tasks-count-label]");
  if (!tasksListEl) return;

  tasksListEl.innerHTML = '<p class="permission-note">Carregando tarefas...</p>';

  let query = client
    .from("tasks")
    .select("*")
    .order("scheduled_at", { ascending: true });

  // 1. Filtragem por Responsável (RLS já restringe vendedores)
  if (!shouldSeeAllLeads(currentCrmUser)) {
    query = query.eq("assigned_to_email", currentCrmUser.email);
  } else {
    if (selectedTasksResponsibleEmail) {
      query = query.eq("assigned_to_email", selectedTasksResponsibleEmail);
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

const loadDashboardMetrics = async () => {
  const client = getClient();
  if (!client) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  if (currentCrmUser) {
    await initDashResponsibleFilter(currentCrmUser);
  }

  const elTotal = document.getElementById("dash-total-leads");
  const elReceived = document.getElementById("dash-received-leads");
  const elActive = document.getElementById("dash-active-leads");
  const elAppointments = document.getElementById("dash-appointments");
  const elTasks = document.getElementById("dash-pending-tasks");
  const elClosed = document.getElementById("dash-closed-leads");
  const elConversion = document.getElementById("dash-conversion-rate");

  if (!elTotal) return;

  // 1. Leads
  let leadsQuery = client.from("leads").select("status, assigned_to_email, created_at");
  if (!shouldSeeAllLeads(currentCrmUser)) {
    leadsQuery = leadsQuery.eq("assigned_to_email", currentCrmUser.email);
  } else if (selectedDashResponsibleEmail) {
    leadsQuery = leadsQuery.eq("assigned_to_email", selectedDashResponsibleEmail);
  }
  const { data: leadsData } = await leadsQuery;
  const leads = leadsData || [];

  const totalLeads = leads.length;
  const receivedLeads = leads.filter(l => l.status === "lead_recebido").length;
  const closedLeads = leads.filter(l => l.status === "venda_fechada").length;
  const activeLeads = leads.filter(l => ["primeiro_contato", "agendamento", "cliente_em_loja", "proposta_enviada"].includes(l.status)).length;
  const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";

  // 2. Agendamentos
  let apptsQuery = client.from("appointments").select("status, data_agendamento, assigned_to_email").neq("status", "cancelado");
  if (!shouldSeeAllLeads(currentCrmUser)) {
    apptsQuery = apptsQuery.eq("assigned_to_email", currentCrmUser.email);
  } else if (selectedDashResponsibleEmail) {
    apptsQuery = apptsQuery.eq("assigned_to_email", selectedDashResponsibleEmail);
  }
  const { data: apptsData } = await apptsQuery;
  const totalAppointments = (apptsData || []).length;

  // 3. Tarefas
  let tasksQuery = client.from("tasks").select("id, lead_id, lead_nome, type, scheduled_at, assigned_to_name, assigned_to_email, status").eq("status", "pending");
  if (!shouldSeeAllLeads(currentCrmUser)) {
    tasksQuery = tasksQuery.eq("assigned_to_email", currentCrmUser.email);
  } else if (selectedDashResponsibleEmail) {
    tasksQuery = tasksQuery.eq("assigned_to_email", selectedDashResponsibleEmail);
  }
  const { data: tasksData } = await tasksQuery;
  const totalTasks = (tasksData || []).length;

  // Renderizar no HTML
  elTotal.textContent = totalLeads;
  elReceived.textContent = receivedLeads;
  elActive.textContent = activeLeads;
  elAppointments.textContent = totalAppointments;
  elTasks.textContent = totalTasks;
  elClosed.textContent = closedLeads;
  elConversion.textContent = `${conversionRate}%`;

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

const changeLeadResponsible = async (leadId, newEmail, lead) => {
  const client = getClient();
  if (!client || !leadId) return;

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;

  const { data: newAssignee, error: fetchError } = await client
    .from("crm_users")
    .select("nome, email")
    .eq("email", newEmail)
    .maybeSingle();

  if (fetchError || !newAssignee) {
    alert("Erro ao buscar dados do novo responsavel.");
    return;
  }

  const oldName = lead.assigned_to_name || "Sem responsavel";
  const newName = newAssignee.nome || newEmail;

  const { error } = await client.from("leads").update({
    assigned_to_email: newEmail || null,
    assigned_to_name: newAssignee.nome || null,
    updated_by_email: currentCrmUser?.email || null,
    updated_by_name: currentCrmUser?.nome || null,
    updated_at: new Date().toISOString(),
  }).eq("id", leadId);

  if (error) {
    alert("Erro ao alterar responsavel: " + error.message);
    return;
  }

  const { error: historyError } = await client.from("lead_history").insert({
    lead_id: leadId,
    action_type: "owner_changed",
    action_label: "Responsavel alterado",
    description: `Responsavel alterado de ${oldName} para ${newName}`,
    performed_by_email: currentCrmUser?.email || null,
    performed_by_name: currentCrmUser?.nome || null,
  });

  if (historyError) {
    console.warn("Erro ao registrar historico de alteracao de responsavel:", historyError);
  }

  await loadLeads();
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
  appointmentForm.elements.id.value = appointment?.id || "";
  appointmentForm.elements.lead_id.value = appointment?.lead_id || lead?.id || "";
  appointmentForm.elements.nome_cliente.value = appointment?.nome_cliente || lead?.name || "";
  appointmentForm.elements.telefone_cliente.value = appointment?.telefone_cliente || lead?.telefone || "";
  appointmentForm.elements.data_agendamento.value = appointment?.data_agendamento || date || toDateKey(new Date());
  appointmentForm.elements.hora_agendamento.value = normalizeAppointmentTime(appointment?.hora_agendamento || time || "08:00");
  appointmentForm.elements.nome_usuario.value = appointment?.nome_usuario || await getCurrentSellerName();
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
  const { data, error } = await client
    .from("leads")
    .select("id, name, telefone, status")
    .eq("id", leadId)
    .single();
  if (error) {
    return fallback?.name ? { id: leadId, ...fallback } : null;
  }
  return data;
};

const requestAppointmentForLead = async (leadId, fallback = {}) => {
  const lead = await fetchLeadForAppointment(leadId, fallback);
  if (!lead) {
    alert("Nao consegui carregar o cliente para criar o agendamento.");
    return null;
  }
  return openAppointmentModal({ lead });
};

const createAppointmentCard = (appointment) => {
  const card = document.createElement("article");
  card.className = "appointment-card";
  card.tabIndex = 0;
  card.dataset.appointmentId = appointment.id;

  const header = document.createElement("div");
  header.className = "appointment-card-header";
  const client = document.createElement("strong");
  client.textContent = `Cliente - ${appointment.nome_cliente}`;
  const time = document.createElement("time");
  time.className = "appointment-card-time";
  time.textContent = normalizeAppointmentTime(appointment.hora_agendamento);
  header.append(client, time);
  const seller = document.createElement("span");
  seller.className = "appointment-card-seller";
  seller.textContent = `Vendedor - ${formatSellerName(appointment.vendedor_nome || appointment.nome_usuario)}`;
  const customerPhone = formatDisplayPhone(appointment.telefone_cliente) || "Telefone nao informado";
  const phone = document.createElement("span");
  phone.className = "appointment-card-phone";
  phone.textContent = `Telefone - ${customerPhone}`;
  card.append(header, seller, phone);

  const open = (event) => {
    event.stopPropagation();
    openAppointmentModal({ appointment });
  };
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") open(event);
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

  if (calendarGrid) {
    calendarGrid.innerHTML = "";
    const corner = document.createElement("div");
    corner.className = "calendar-corner";
    corner.textContent = "Horario";
    calendarGrid.append(corner);

    days.forEach((day) => {
      const header = document.createElement("div");
      header.className = `calendar-day-header${toDateKey(day) === todayKey ? " is-today" : ""}`;
      const weekday = document.createElement("strong");
      weekday.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "");
      const date = document.createElement("span");
      date.textContent = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(day);
      header.append(weekday, date);
      calendarGrid.append(header);
    });

    calendarTimes.forEach((time) => {
      const label = document.createElement("div");
      label.className = "calendar-time-label";
      label.textContent = time;
      calendarGrid.append(label);

      days.forEach((day) => {
        const dateKey = toDateKey(day);
        const slot = document.createElement("div");
        slot.className = `calendar-slot${dateKey === todayKey ? " is-today" : ""}`;
        slot.dataset.date = dateKey;
        slot.dataset.time = time;
        slot.tabIndex = 0;
        slot.setAttribute("role", "button");
        slot.setAttribute("aria-label", `Criar agendamento em ${dateKey} as ${time}`);
        slot.addEventListener("click", () => openAppointmentModal({ date: dateKey, time }));
        slot.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openAppointmentModal({ date: dateKey, time });
          }
        });

        calendarAppointments
          .filter((item) => {
            const appointmentTime = normalizeAppointmentTime(item.hora_agendamento);
            return item.data_agendamento === dateKey && appointmentTime.slice(0, 2) === time.slice(0, 2);
          })
          .forEach((item) => slot.append(createAppointmentCard(item)));
        calendarGrid.append(slot);
      });
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
      section.className = "calendar-mobile-day";
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
          button.addEventListener("click", () => openAppointmentModal({ appointment: item }));
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
  if (currentCrmUser) {
    await initCalendarResponsibleFilter(currentCrmUser);
  }

  setCalendarStatus("Carregando agendamentos...");
  const start = toDateKey(calendarWeekStart);
  const end = toDateKey(addDays(calendarWeekStart, 6));

  let query = client
    .from("appointments")
    .select("id, lead_id, nome_cliente, telefone_cliente, usuario_id, nome_usuario, data_agendamento, hora_agendamento, observacao, status, created_at, updated_at")
    .gte("data_agendamento", start)
    .lte("data_agendamento", end)
    .neq("status", "cancelado")
    .order("data_agendamento")
    .order("hora_agendamento");

  if (selectedCalendarResponsibleEmail) {
    query = query.eq("assigned_to_email", selectedCalendarResponsibleEmail);
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
  }));
  renderCalendar();
  setCalendarStatus(`${calendarAppointments.length} agendamento${calendarAppointments.length === 1 ? "" : "s"} nesta semana.`);
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
  const time = normalizeAppointmentTime(formData.get("hora_agendamento"));
  const [hour, minute] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes < 8 * 60 || totalMinutes > 20 * 60 + 59) {
    setAppointmentStatus("Escolha um horario entre 08:00 e 20:59.");
    return;
  }

  const submitButton = appointmentForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";
  const crmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
  const responsibleEmail = crmUser?.email || user.email || null;
  const responsibleName = crmUser?.nome || crmUser?.email || user.email || null;

  const payload = {
    lead_id: String(formData.get("lead_id") || "").trim() || null,
    nome_cliente: String(formData.get("nome_cliente") || "").trim(),
    telefone_cliente: String(formData.get("telefone_cliente") || "").replace(/\D/g, "") || null,
    usuario_id: user.id,
    nome_usuario: String(formData.get("nome_usuario") || "").trim() || await getCurrentSellerName(),
    data_agendamento: String(formData.get("data_agendamento") || ""),
    hora_agendamento: `${time}:00`,
    observacao: String(formData.get("observacao") || "").trim() || null,
    status: "agendado",
    assigned_to_email: responsibleEmail,
    assigned_to_name: responsibleName,
  };

  const appointmentId = String(formData.get("id") || "").trim();
  const query = appointmentId
    ? client.from("appointments").update(payload).eq("id", appointmentId)
    : client.from("appointments").insert(payload);
  const { data, error } = await query.select().single();

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

const updateLeadStatus = async (leadId, status, { optimistic = false, skipAppointment = false } = {}) => {
  const client = getClient();

  if (!client || !leadId || !status) {
    return false;
  }

  let createdAppointment = null;
  if (status === "agendamento" && !skipAppointment) {
    createdAppointment = await requestAppointmentForLead(leadId);
    if (!createdAppointment || createdAppointment.cancelled) {
      return false;
    }
  }

  if (optimistic) {
    const targetColumn = columns.find((col) => col.dataset.status === status);
    const sourceCard = document.querySelector(`[data-lead-id="${leadId}"]`);

    if (sourceCard && targetColumn) {
      const sourceColumn = sourceCard.closest?.(".kanban-column");
      const targetStack = targetColumn.querySelector(".card-stack");
      const emptyMsg = targetStack.querySelector(".empty-column, .empty-column-card");
      if (emptyMsg) emptyMsg.remove();
      targetStack.append(sourceCard);

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

  const { error } = await client.from("leads").update({
    status,
    updated_by_email: (window.currentCrmUser || window.crmUser)?.email || null,
    updated_by_name: (window.currentCrmUser || window.crmUser)?.nome || null,
    updated_at: new Date().toISOString(),
  }).eq("id", leadId);

  if (error) {
    if (createdAppointment?.id) {
      await client.from("appointments").delete().eq("id", createdAppointment.id);
    }
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
  if (status === "agendamento") {
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

  // Responsible Badge
  const responsibleBadge = document.createElement("div");
  responsibleBadge.className = "lead-responsible-badge";
  if (lead.assigned_to_name) {
    const respIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #d4a017; margin-right: 4px; vertical-align: middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    responsibleBadge.innerHTML = respIcon;
    const respText = document.createElement("span");
    respText.textContent = lead.assigned_to_name;
    responsibleBadge.append(respText);
  } else {
    const respIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #9ca3af; margin-right: 4px; vertical-align: middle;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    responsibleBadge.innerHTML = respIcon;
    const respText = document.createElement("span");
    respText.textContent = "Sem responsavel";
    respText.style.color = "#9ca3af";
    responsibleBadge.append(respText);
  }

  // Optional Note
  const hasCustomNote = lead.note && lead.note.trim() !== "" && lead.note.trim().toLowerCase() !== "sem observacao cadastrada.";
  let noteEl = null;
  if (hasCustomNote) {
    noteEl = document.createElement("p");
    noteEl.className = "lead-card-note";
    noteEl.textContent = lead.note;
  }

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

  // Tags Container
  const tagsContainer = document.createElement("div");
  tagsContainer.className = "lead-tags-container";
  let tagsArray = [];
  if (Array.isArray(lead.tags)) {
    tagsArray = lead.tags;
  } else if (typeof lead.tags === "string" && lead.tags.trim() !== "") {
    tagsArray = lead.tags.split(",").map(t => t.trim()).filter(Boolean);
  }

  if (tagsArray.length > 0) {
    tagsArray.forEach(tag => {
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
  card.append(top, warningBadge);
  if (tagsArray.length > 0) {
    card.append(tagsContainer);
  }
  card.append(phoneLine);
  card.append(responsibleBadge);
  if (noteEl) {
    card.append(noteEl);
  }
  card.append(divider, actionsRow);

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

const loadLeads = async () => {
  const client = getClient();

  if (!client || columns.length === 0) {
    return;
  }

  const currentCrmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;

  if (currentCrmUser) {
    await initResponsibleFilter(currentCrmUser);
  }

  let query = client
    .from("leads")
    .select("id, name, origin, note, status, created_at, telefone, property_region, credit_value, down_payment_value, installment_value, tags, assigned_to_email, assigned_to_name, created_by_email, created_by_name, updated_by_email, updated_by_name")
    .order("created_at", { ascending: false });

  if (!shouldSeeAllLeads(currentCrmUser)) {
    query = query.eq("assigned_to_email", currentCrmUser.email);
  } else {
    if (selectedResponsibleEmail) {
      query = query.eq("assigned_to_email", selectedResponsibleEmail);
    }
  }

  const { data, error } = await query;

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

  const tagsInput = String(formData.get("tags") || "").trim();
  const tagsArray = tagsInput
    ? tagsInput.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  if (mode === "edit" && leadId) {
    const targetStatus = String(formData.get("status") || "lead_recebido").trim();
    let appointment = null;
    if (targetStatus === "agendamento" && leadForm.dataset.originalStatus !== "agendamento") {
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

    const crmUser = window.currentCrmUser || window.crmUser || window.sevenGoldCrmSession?.crmUser;
    const { error } = await client.from("leads").update({
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
      updated_by_email: crmUser?.email || user.email || null,
      updated_by_name: crmUser?.nome || null,
      updated_at: new Date().toISOString(),
    }).eq("id", leadId);

    submitButton.disabled = false;
    submitButton.textContent = "Salvar Alteracoes";

    if (error) {
      if (appointment?.id) {
        await client.from("appointments").delete().eq("id", appointment.id);
      }
      setFormStatus("Nao consegui atualizar o lead: " + error.message);
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

    const { error } = await client.from("leads").insert({
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
      owner_id: user.id,
      assigned_to_email: responsibleEmail,
      assigned_to_name: responsibleName,
      created_by_email: responsibleEmail,
      created_by_name: responsibleName,
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
      const allowedTabs = ["pipeline", "dashboard", "calendario", "tarefas", "feed"];
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
        content.style.display = "none";
      });

      // Map tabs to content divs
      if (targetTab === "dados") {
        const dadosContainer = document.getElementById("modal-lead-tab-dados");
        if (dadosContainer) dadosContainer.style.display = "block";
        if (submitButton) submitButton.style.display = "block";
        const mode = leadForm?.dataset.mode;
        if (deleteButton && mode === "edit") deleteButton.style.display = "block";
      } else if (targetTab === "tarefas") {
        const tasksContainer = document.getElementById("modal-lead-tasks-section");
        if (tasksContainer) tasksContainer.style.display = "block";
        if (submitButton) submitButton.style.display = "none";
        if (deleteButton) deleteButton.style.display = "none";
      } else if (targetTab === "historico") {
        const historyContainer = document.getElementById("modal-lead-history-section");
        if (historyContainer) historyContainer.style.display = "block";
        if (submitButton) submitButton.style.display = "none";
        if (deleteButton) deleteButton.style.display = "none";
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  calendarWeekStart = getWeekStart();
  renderCalendar();
  setupDragAndDrop();
  setupTouchMove();
  setupBulkActions();
  initLeadModalTabs();
  switchTab();
  loadLeads();
});

document.addEventListener("crm-authorized", () => {
  window.currentCrmUser = window.crmUser || window.sevenGoldCrmSession?.crmUser;
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
