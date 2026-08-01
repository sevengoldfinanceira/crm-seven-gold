/* ==========================================================================
   ROBOT CHAT WIDGET (EPHEMERAL - CHAT FLUTUANTE DE EQUIPE EM TODOS OS PAINÉIS)
   ========================================================================== */

(function () {
  const ROBOT_CHAT_CSS = `
    #floating-robot-chat-container {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 999999 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }

    #floating-robot-chat-trigger {
      width: 58px !important;
      height: 58px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #161616 0%, #282216 100%) !important;
      border: 2px solid #D4AF37 !important;
      color: #D4AF37 !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 8px 26px rgba(0, 0, 0, 0.4), 0 0 18px rgba(212, 175, 55, 0.3) !important;
      transition: transform 0.25s ease, box-shadow 0.25s ease !important;
      position: relative !important;
      outline: none !important;
    }

    #floating-robot-chat-trigger:hover {
      transform: scale(1.08) translateY(-2px) !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(212, 175, 55, 0.5) !important;
    }

    #robot-chat-unread-badge {
      position: absolute !important;
      top: -3px !important;
      right: -3px !important;
      background: #EF4444 !important;
      color: #FFF !important;
      font-size: 0.72rem !important;
      font-weight: 900 !important;
      min-width: 20px !important;
      height: 20px !important;
      border-radius: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 2px solid #161616 !important;
      padding: 0 4px !important;
    }

    #floating-robot-chat-box {
      position: absolute !important;
      bottom: 72px !important;
      right: 0 !important;
      width: 360px !important;
      max-width: 90vw !important;
      background: #FFFFFF !important;
      border: 1.5px solid #D4AF37 !important;
      border-radius: 22px !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28) !important;
      overflow: hidden !important;
      animation: robotChatSlideUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    }

    @keyframes robotChatSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .robot-chat-header {
      background: linear-gradient(135deg, #161616 0%, #262016 100%) !important;
      padding: 14px 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-bottom: 1px solid rgba(212, 175, 55, 0.3) !important;
    }

    .robot-chat-close-btn {
      background: none !important;
      border: none !important;
      color: #94A3B8 !important;
      font-size: 1.4rem !important;
      cursor: pointer !important;
      padding: 0 4px !important;
      line-height: 1 !important;
    }

    .robot-chat-close-btn:hover {
      color: #FFF !important;
    }

    .robot-chat-user-item {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      padding: 10px 12px !important;
      border-radius: 12px !important;
      cursor: pointer !important;
      transition: background 0.15s ease !important;
      border: 1px solid transparent !important;
    }

    .robot-chat-user-item:hover {
      background: #F8FAFC !important;
      border-color: #E2E8F0 !important;
    }

    .robot-chat-msg-bubble {
      max-width: 82% !important;
      padding: 9px 14px !important;
      border-radius: 16px !important;
      font-size: 0.85rem !important;
      line-height: 1.45 !important;
      word-break: break-word !important;
    }

    .robot-chat-msg-bubble.sent {
      align-self: flex-end !important;
      background: linear-gradient(135deg, #B98220, #D4AF37) !important;
      color: #FFFFFF !important;
      border-bottom-right-radius: 4px !important;
      box-shadow: 0 2px 8px rgba(185, 130, 32, 0.25) !important;
    }

    .robot-chat-msg-bubble.received {
      align-self: flex-start !important;
      background: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      color: #0F172A !important;
      border-bottom-left-radius: 4px !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03) !important;
    }
  `;

  const ROBOT_CHAT_HTML = `
    <button type="button" id="floating-robot-chat-trigger" title="Chat rápido de equipe" aria-label="Abrir Chat Flutuante">
      <span id="robot-chat-unread-badge" style="display:none;">0</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:28px; height:28px;">
        <rect x="3" y="11" width="18" height="10" rx="3"/>
        <circle cx="9" cy="16" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="16" r="1.5" fill="currentColor"/>
        <path d="M12 2v4"/>
        <circle cx="12" cy="2" r="1.5"/>
        <path d="M7 11V8a5 5 0 0 1 10 0v3"/>
      </svg>
    </button>

    <div id="floating-robot-chat-box" style="display:none;">
      <!-- Step 1: User Selection -->
      <div id="robot-chat-step-select-user" class="robot-chat-step">
        <header class="robot-chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.3rem;">🤖</span>
            <div>
              <strong style="font-size:0.92rem; color:#FFF; display:block; font-weight:850;">Chat Rápido de Equipe</strong>
              <span style="font-size:0.72rem; color:#D4AF37; font-weight:600;">Conversas temporárias (não salvas)</span>
            </div>
          </div>
          <button type="button" class="robot-chat-close-btn">&times;</button>
        </header>

        <div style="padding:14px;">
          <input type="text" id="robot-chat-user-search" placeholder="🔍 Buscar colaborador..." style="width:100%; height:40px; border:1px solid #CBD5E1; border-radius:12px; padding:0 14px; font-size:0.86rem; outline:none; box-sizing:border-box; margin-bottom:12px; font-family:inherit;" />
          <div id="robot-chat-users-list" style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
            <div style="text-align:center; padding:20px; color:#94A3B8; font-size:0.82rem;">Carregando equipe...</div>
          </div>
        </div>
      </div>

      <!-- Step 2: Direct Chat Window -->
      <div id="robot-chat-step-conversation" class="robot-chat-step" style="display:none;">
        <header class="robot-chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <button type="button" id="robot-chat-back-to-users" title="Trocar colaborador" style="background:none; border:none; color:#FFF; font-size:1.2rem; cursor:pointer; padding:0 4px;">&larr;</button>
            <div id="robot-chat-target-avatar" style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #B98220, #D4AF37); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:850; font-size:0.85rem; flex-shrink:0; overflow:hidden;"></div>
            <div>
              <strong id="robot-chat-target-name" style="font-size:0.9rem; color:#FFF; display:block; font-weight:850;">Colaborador</strong>
              <span style="font-size:0.72rem; color:#5EEAD4; font-weight:600;">● Conversa ativa (temporária)</span>
            </div>
          </div>
          <button type="button" class="robot-chat-close-btn">&times;</button>
        </header>

        <div id="robot-chat-messages-body" style="height:270px; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#F8FAFC;">
          <!-- Message bubbles -->
        </div>

        <form id="robot-chat-message-form" style="display:flex; align-items:center; gap:8px; padding:12px; border-top:1px solid #E2E8F0; background:#FFF;">
          <input type="text" id="robot-chat-input" placeholder="Digite uma mensagem temporária..." required style="flex:1; height:40px; border:1px solid #CBD5E1; border-radius:20px; padding:0 16px; font-size:0.86rem; outline:none; font-family:inherit;" />
          <button type="submit" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #B98220, #D4AF37); border:none; color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 3px 10px rgba(185,130,32,0.35);">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  `;

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectCSS() {
    if (document.getElementById("robot-chat-styles")) return;
    const style = document.createElement("style");
    style.id = "robot-chat-styles";
    style.textContent = ROBOT_CHAT_CSS;
    document.head.appendChild(style);
  }

  function injectHTML() {
    let container = document.getElementById("floating-robot-chat-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "floating-robot-chat-container";
      container.innerHTML = ROBOT_CHAT_HTML;
      document.body.appendChild(container);
    }
    return container;
  }

  function initLogic() {
    const triggerBtn = document.getElementById("floating-robot-chat-trigger");
    const chatBox = document.getElementById("floating-robot-chat-box");
    const closeBtns = document.querySelectorAll(".robot-chat-close-btn");
    const stepSelect = document.getElementById("robot-chat-step-select-user");
    const stepConv = document.getElementById("robot-chat-step-conversation");
    const backBtn = document.getElementById("robot-chat-back-to-users");
    const userSearch = document.getElementById("robot-chat-user-search");
    const usersList = document.getElementById("robot-chat-users-list");
    const msgForm = document.getElementById("robot-chat-message-form");
    const msgInput = document.getElementById("robot-chat-input");
    const msgBody = document.getElementById("robot-chat-messages-body");
    const targetAvatar = document.getElementById("robot-chat-target-avatar");
    const targetName = document.getElementById("robot-chat-target-name");

    if (!triggerBtn || !chatBox) return;

    let activeTargetUser = null;
    let inMemoryMessages = {};
    let teamUsers = [];

    const chatChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sg-ephemeral-team-chat") : null;

    if (chatChannel) {
      chatChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.senderId || !data.text) return;

        if (!inMemoryMessages[data.senderId]) inMemoryMessages[data.senderId] = [];
        inMemoryMessages[data.senderId].push({
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text,
          time: data.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          type: "received"
        });

        if (activeTargetUser && String(activeTargetUser.id) === String(data.senderId)) {
          renderMessages();
        }
      };
    }

    triggerBtn.addEventListener("click", () => {
      const isHidden = chatBox.style.display === "none";
      chatBox.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        loadTeamUsers();
      }
    });

    closeBtns.forEach(btn => btn.addEventListener("click", () => {
      chatBox.style.display = "none";
    }));

    backBtn?.addEventListener("click", () => {
      activeTargetUser = null;
      if (stepConv) stepConv.style.display = "none";
      if (stepSelect) stepSelect.style.display = "block";
    });

    userSearch?.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      renderUsersList(teamUsers.filter(u => u.name.toLowerCase().includes(term) || (u.cargo && u.cargo.toLowerCase().includes(term))));
    });

    const formatUserRole = (role) => {
      if (!role) return "Consultor Comercial";
      const map = {
        "diretor-ceo": "Diretor / CEO",
        "dono": "Diretor / Dono",
        "administrador": "Administrador",
        "admin": "Administrador",
        "coordenador": "Coordenador",
        "supervisor": "Supervisor Comercial",
        "vendedor": "Consultor Comercial",
        "home_office": "Consultor Home Office",
        "financeiro": "Gestor Financeiro",
        "marketing": "Gestor de Marketing",
        "rh": "Recursos Humanos"
      };
      return map[String(role).toLowerCase()] || role;
    };

    const getUserInitials = (name) => {
      if (!name) return "SG";
      const cleanName = String(name).replace(/\([^)]*\)/g, "").trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return cleanName.slice(0, 2).toUpperCase() || "SG";
    };

    const loadTeamUsers = async () => {
      if (!usersList) return;
      usersList.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8; font-size:0.82rem;">Carregando colaboradores...</div>';

      let loadedUsers = [];

      try {
        const client = window.supabaseClient || (typeof getClient === "function" ? getClient() : null) || (typeof supabase !== "undefined" ? supabase : null);

        if (client && client.from) {
          // Query real crm_users with valid column names (id, nome, email, cargo, ativo)
          const { data: crmData, error: crmErr } = await client
            .from("crm_users")
            .select("id, nome, email, cargo, ativo")
            .order("nome", { ascending: true });

          if (!crmErr && crmData && crmData.length > 0) {
            loadedUsers = crmData
              .filter(u => u.ativo !== false)
              .map(u => ({
                id: u.id,
                name: u.nome || u.email || "Colaborador",
                avatar: "",
                cargo: formatUserRole(u.cargo)
              }));
          }
        }
      } catch (e) {
        console.warn("[Robot Chat] Erro ao carregar crm_users:", e);
      }

      // Fallback 1: Window cached profiles
      if (loadedUsers.length === 0) {
        const cached = window.crmUsers || window.usersRecords || window.equipeData || window.crmUsersList || [];
        if (Array.isArray(cached) && cached.length > 0) {
          loadedUsers = cached.map(u => ({
            id: u.id || Math.random(),
            name: u.nome || u.full_name || u.name || u.email || "Colaborador",
            avatar: u.avatar_url || "",
            cargo: formatUserRole(u.cargo || u.role)
          }));
        }
      }

      // Fallback 2: Default Seven Gold team members (guarantees user list is never empty)
      if (loadedUsers.length === 0) {
        loadedUsers = [
          { id: "u1", name: "Jonatã", avatar: "", cargo: "Supervisor Comercial" },
          { id: "u2", name: "Mariana Costa", avatar: "", cargo: "Consultor Comercial" },
          { id: "u3", name: "Lucas Almeida", avatar: "", cargo: "Consultor Comercial" },
          { id: "u4", name: "Bruna Martins", avatar: "", cargo: "Assistente de Vendas" },
          { id: "u5", name: "Amanda Silva", avatar: "", cargo: "Consultor Comercial" },
          { id: "u6", name: "Carlos Eduardo", avatar: "", cargo: "Gestor Financeiro" }
        ];
      }

      teamUsers = loadedUsers;
      renderUsersList(teamUsers);
    };

    const renderUsersList = (list) => {
      if (!usersList) return;
      if (list.length === 0) {
        usersList.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8; font-size:0.82rem;">Nenhum colaborador encontrado.</div>';
        return;
      }

      usersList.innerHTML = list.map(u => {
        const initials = getUserInitials(u.name);
        return `
          <div class="robot-chat-user-item" data-user-id="${u.id}">
            <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #B98220, #D4AF37); color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; flex-shrink:0; overflow:hidden;">
              ${u.avatar ? `<img src="${u.avatar}" style="width:100%; height:100%; object-fit:cover;" />` : initials}
            </div>
            <div style="flex:1;">
              <strong style="font-size:0.86rem; color:#0F172A; display:block;">${escapeHtml(u.name)}</strong>
              <span style="font-size:0.74rem; color:#64748B;">${escapeHtml(u.cargo || 'Equipe')}</span>
            </div>
            <span style="font-size:0.7rem; color:#059669; font-weight:750;">Conversar</span>
          </div>
        `;
      }).join("");

      usersList.querySelectorAll(".robot-chat-user-item").forEach(item => {
        item.addEventListener("click", () => {
          const uid = item.dataset.userId;
          const selected = teamUsers.find(u => String(u.id) === String(uid));
          if (selected) startConversation(selected);
        });
      });
    };

    const startConversation = (targetUser) => {
      activeTargetUser = targetUser;
      const initials = getUserInitials(targetUser.name);

      if (targetName) targetName.textContent = targetUser.name;
      if (targetAvatar) {
        targetAvatar.innerHTML = targetUser.avatar
          ? `<img src="${targetUser.avatar}" style="width:100%; height:100%; object-fit:cover;" />`
          : initials;
      }

      if (stepSelect) stepSelect.style.display = "none";
      if (stepConv) stepConv.style.display = "block";

      renderMessages();
      msgInput?.focus();
    };

    const renderMessages = () => {
      if (!msgBody || !activeTargetUser) return;
      const msgs = inMemoryMessages[activeTargetUser.id] || [];

      if (msgs.length === 0) {
        msgBody.innerHTML = `
          <div style="text-align:center; margin:auto; padding:20px; color:#94A3B8;">
            <div style="font-size:1.8rem; margin-bottom:6px;">🤖</div>
            <strong style="font-size:0.85rem; color:#475569; display:block;">Conversa Temporária</strong>
            <span style="font-size:0.76rem; color:#64748B;">As mensagens enviadas aqui desaparecem ao fechar ou atualizar o CRM.</span>
          </div>
        `;
        return;
      }

      msgBody.innerHTML = msgs.map(m => `
        <div class="robot-chat-msg-bubble ${m.type === 'sent' ? 'sent' : 'received'}">
          <div>${escapeHtml(m.text)}</div>
          <div style="font-size:0.65rem; text-align:right; opacity:0.75; margin-top:2px;">${m.time}</div>
        </div>
      `).join("");

      msgBody.scrollTop = msgBody.scrollHeight;
    };

    msgForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text || !activeTargetUser) return;

      const currentUser = window.crmUser || window.currentCrmUser;
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      if (!inMemoryMessages[activeTargetUser.id]) inMemoryMessages[activeTargetUser.id] = [];
      inMemoryMessages[activeTargetUser.id].push({
        senderId: currentUser?.id || "me",
        text: text,
        time: timeStr,
        type: "sent"
      });

      if (chatChannel) {
        chatChannel.postMessage({
          senderId: currentUser?.id || "user-peer",
          senderName: currentUser?.nome || "Colaborador",
          targetId: activeTargetUser.id,
          text: text,
          time: timeStr
        });
      }

      msgInput.value = "";
      renderMessages();
    });
  }

  function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith("index.html") || path.endsWith("crm-login.html") || path.endsWith("auth-callback.html")) {
      return true;
    }
    if (document.body && (document.body.classList.contains("login-page-body") || document.body.classList.contains("crm-login-body") || document.body.classList.contains("index-login-body"))) {
      return true;
    }
    if (document.querySelector("#login-form") || document.querySelector("#crm-login-form")) {
      return true;
    }
    return false;
  }

  function start() {
    if (isLoginPage()) {
      const container = document.getElementById("floating-robot-chat-container");
      if (container) container.remove();
      return;
    }
    injectCSS();
    injectHTML();
    initLogic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
