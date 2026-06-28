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
  leadForm.dataset.originalStatus = lead.status || "lead_recebido";

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
  const client = getClient();
  if (client && user?.id) {
    const { data: profile } = await client
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.full_name) return profile.full_name;
  }
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
  setCalendarStatus("Carregando agendamentos...");
  const start = toDateKey(calendarWeekStart);
  const end = toDateKey(addDays(calendarWeekStart, 6));
  const { data, error } = await client
    .from("appointments")
    .select("id, lead_id, nome_cliente, telefone_cliente, usuario_id, nome_usuario, data_agendamento, hora_agendamento, observacao, status, created_at, updated_at")
    .gte("data_agendamento", start)
    .lte("data_agendamento", end)
    .neq("status", "cancelado")
    .order("data_agendamento")
    .order("hora_agendamento");

  if (error) {
    calendarAppointments = [];
    renderCalendar();
    setCalendarStatus("A tabela de agendamentos ainda nao esta configurada no Supabase.", "error");
    return;
  }
  const appointments = data || [];
  const sellerIds = [...new Set(appointments.map((item) => item.usuario_id).filter(Boolean))];
  let sellerNames = new Map();
  if (sellerIds.length) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, full_name")
      .in("id", sellerIds);
    sellerNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
  }
  calendarAppointments = appointments.map((item) => ({
    ...item,
    vendedor_nome: sellerNames.get(item.usuario_id) || item.nome_usuario,
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
  setAppointmentStatus("");

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
  if (noteEl) {
    card.append(noteEl);
  }
  card.append(metaContainer, divider, actionsRow);

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

  const { data, error } = await client
    .from("leads")
    .select("id, name, origin, note, status, created_at, telefone, property_region, credit_value, down_payment_value, installment_value")
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
  }
};

window.addEventListener("hashchange", switchTab);

document.addEventListener("DOMContentLoaded", () => {
  calendarWeekStart = getWeekStart();
  renderCalendar();
  setupDragAndDrop();
  setupTouchMove();
  setupBulkActions();
  switchTab();
  loadLeads();
});
