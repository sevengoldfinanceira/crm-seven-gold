(() => {
  const state = { lead: null, timer: null };

  const authHeaders = async () => {
    const client = window.sevenGoldAuth;
    const { data } = await client?.auth?.getSession?.();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const request = async (url, options = {}) => {
    const headers = await authHeaders();
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.error || "Erro na integração do WhatsApp.");
    return data;
  };

  const els = () => ({
    panel: document.getElementById("modal-lead-whatsapp-section"),
    list: document.getElementById("lead-whatsapp-chat"),
    status: document.getElementById("lead-whatsapp-status"),
    form: document.getElementById("lead-whatsapp-compose"),
    input: document.getElementById("lead-whatsapp-input"),
    connect: document.getElementById("lead-whatsapp-connect"),
    qr: document.getElementById("lead-whatsapp-qr"),
  });

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  const renderMessages = (messages) => {
    const { list } = els();
    if (!list) return;
    if (!messages?.length) {
      list.innerHTML = '<div class="lead-whatsapp-empty">Nenhuma mensagem ainda.</div>';
      return;
    }
    list.innerHTML = messages.map((msg) => {
      const date = msg.created_at ? new Date(msg.created_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "";
      return `<div class="lead-whatsapp-message ${msg.direcao === "saida" ? "out" : "in"}"><div>${escapeHtml(msg.mensagem)}</div><time>${escapeHtml(date)}</time></div>`;
    }).join("");
    list.scrollTop = list.scrollHeight;
  };

  const loadMessages = async () => {
    if (!state.lead?.id) return;
    try {
      const data = await request(`/api/whatsapp/messages?lead_id=${encodeURIComponent(state.lead.id)}`);
      renderMessages(data.messages || []);
    } catch (error) {
      const { list } = els();
      if (list) list.innerHTML = `<div class="lead-whatsapp-empty">${escapeHtml(error.message)}</div>`;
    }
  };

  const loadStatus = async () => {
    const { status, connect } = els();
    if (!status) return;
    try {
      const data = await request("/api/whatsapp/session");
      const raw = JSON.stringify(data.status || {}).toLowerCase();
      const offline = raw.includes("disconnected") || raw.includes("not connected") || raw.includes("unpaired") || raw.includes("closed");
      const online = !offline && (raw.includes('"connected"') || raw.includes("islogged") || raw.includes("inchat") || raw.includes('"status":"connected"'));
      status.textContent = online ? "WhatsApp conectado" : "WhatsApp desconectado";
      status.classList.toggle("is-online", online);
      if (connect) connect.hidden = online;
    } catch (_) {
      status.textContent = "WhatsApp desconectado";
      if (connect) connect.hidden = false;
    }
  };

  const startConnection = async () => {
    const { connect, qr } = els();
    if (connect) connect.hidden = false;
    if (qr) { qr.hidden = true; qr.removeAttribute("src"); }
    try {
      const data = await request("/api/whatsapp/session", { method: "POST", body: JSON.stringify({}) });
      const qrData = data?.qr?.qrcode || data?.qr?.qrCode || data?.started?.qrcode || data?.started?.qrCode || data?.started?.base64;
      if (qr && qrData) {
        qr.src = String(qrData).startsWith("data:") ? qrData : `data:image/png;base64,${qrData}`;
        qr.hidden = false;
      }
      await loadStatus();
    } catch (error) {
      alert(error.message);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const { input } = els();
    const message = input?.value.trim();
    if (!state.lead?.id || !message) return;
    input.disabled = true;
    try {
      await request("/api/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({ lead_id: state.lead.id, message }),
      });
      input.value = "";
      await loadMessages();
    } catch (error) {
      alert(error.message);
    } finally {
      input.disabled = false;
      input.focus();
    }
  };

  const action = async (name) => {
    if (!state.lead?.id) return;
    if (name === "delete" && !confirm("Excluir esta conversa também do WhatsApp conectado?")) return;
    try {
      await request("/api/whatsapp/action", {
        method: "POST",
        body: JSON.stringify({ lead_id: state.lead.id, action: name }),
      });
      if (name === "delete" || name === "clear") await loadMessages();
    } catch (error) {
      alert(error.message);
    }
  };

  window.addEventListener("seven-gold:lead-opened", (event) => {
    state.lead = event.detail || null;
    loadStatus();
    loadMessages();
  });

  document.addEventListener("DOMContentLoaded", () => {
    const { form } = els();
    form?.addEventListener("submit", send);
    document.getElementById("lead-whatsapp-connect-btn")?.addEventListener("click", startConnection);
    document.querySelectorAll("[data-whatsapp-action]").forEach((button) => {
      button.addEventListener("click", () => action(button.dataset.whatsappAction));
    });
    document.querySelector(".lead-modal-tab-btn[data-tab='whatsapp']")?.addEventListener("click", () => {
      loadStatus();
      loadMessages();
      clearInterval(state.timer);
      state.timer = setInterval(loadMessages, 5000);
    });
    document.querySelector("[data-close-modal]")?.addEventListener("click", () => {
      clearInterval(state.timer);
      state.timer = null;
    });
  });
})();
