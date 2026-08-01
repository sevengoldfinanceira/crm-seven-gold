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

    #floating-robot-chat-container.robot-chat-positioned {
      right: auto !important;
      bottom: auto !important;
    }

    #floating-robot-chat-trigger {
      width: 58px !important;
      height: 58px !important;
      border-radius: 50% !important;
      background: linear-gradient(135deg, #161616 0%, #282216 100%) !important;
      border: 2px solid #D4AF37 !important;
      color: #D4AF37 !important;
      cursor: grab !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 8px 26px rgba(0, 0, 0, 0.4), 0 0 18px rgba(212, 175, 55, 0.3) !important;
      transition: transform 0.25s ease, box-shadow 0.25s ease !important;
      position: relative !important;
      outline: none !important;
      touch-action: none !important;
      user-select: none !important;
    }

    #floating-robot-chat-trigger:hover {
      transform: scale(1.08) translateY(-2px) !important;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(212, 175, 55, 0.5) !important;
    }

    #floating-robot-chat-container.robot-chat-dragging #floating-robot-chat-trigger {
      cursor: grabbing !important;
      transform: scale(1.03) !important;
      transition: none !important;
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

        <!-- Attachment Preview Bar -->
        <div id="robot-chat-attachment-preview" style="display:none; padding:8px 12px; background:#F1F5F9; border-top:1px solid #E2E8F0; align-items:center; justify-content:space-between; gap:8px;">
          <div id="robot-chat-preview-content" style="display:flex; align-items:center; gap:8px; overflow:hidden; flex:1;"></div>
          <button type="button" id="robot-chat-remove-attachment" style="background:none; border:none; color:#EF4444; font-size:1.1rem; cursor:pointer; font-weight:bold; padding:0 4px;" title="Remover anexo">&times;</button>
        </div>

        <form id="robot-chat-message-form" style="display:flex; align-items:center; gap:6px; padding:10px 12px; border-top:1px solid #E2E8F0; background:#FFF;">
          <input type="file" id="robot-chat-file-input" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" style="display:none;" />
          
          <button type="button" id="robot-chat-attach-btn" title="Anexar foto ou arquivo" aria-label="Anexar foto ou arquivo" style="background:none; border:none; color:#64748B; cursor:pointer; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s, color 0.2s; flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <input type="text" id="robot-chat-input" placeholder="Digite ou anexe foto/arquivo..." style="flex:1; height:38px; border:1px solid #CBD5E1; border-radius:20px; padding:0 14px; font-size:0.85rem; outline:none; font-family:inherit;" />

          <button type="submit" style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #B98220, #D4AF37); border:none; color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 3px 10px rgba(185,130,32,0.35);">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
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
    const container = document.getElementById("floating-robot-chat-container");
    const triggerBtn = document.getElementById("floating-robot-chat-trigger");
    const chatBox = document.getElementById("floating-robot-chat-box");
    if (!container || !triggerBtn || !chatBox) return;
    if (container.dataset.robotChatReady === "1") return;
    container.dataset.robotChatReady = "1";

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

    const getTodayKey = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const loadDailyMessages = () => {
      const today = getTodayKey();
      const savedDate = localStorage.getItem("seven-gold-robot-chat-date");

      // Next day reset check! If saved date is from a previous day, clear history!
      if (savedDate !== today) {
        localStorage.setItem("seven-gold-robot-chat-date", today);
        localStorage.removeItem("seven-gold-robot-chat-messages");
        return {};
      }

      try {
        const stored = localStorage.getItem("seven-gold-robot-chat-messages");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    };

    const saveDailyMessages = (msgsObj) => {
      try {
        const today = getTodayKey();
        localStorage.setItem("seven-gold-robot-chat-date", today);
        localStorage.setItem("seven-gold-robot-chat-messages", JSON.stringify(msgsObj));
      } catch (e) {}
    };

    let activeTargetUser = null;
    let inMemoryMessages = loadDailyMessages();
    let teamUsers = [];
    let dragState = null;
    let suppressNextTriggerClick = false;
    let previousDocumentUserSelect = "";

    const ROBOT_CHAT_POSITION_KEY = "seven-gold-robot-chat-position";
    const ROBOT_CHAT_EDGE_PADDING = 8;
    const ROBOT_CHAT_DRAG_THRESHOLD = 6;

    function getViewportSize() {
      return {
        width: document.documentElement.clientWidth || window.innerWidth || 0,
        height: document.documentElement.clientHeight || window.innerHeight || 0
      };
    }

    function clampNumber(value, min, max) {
      const safeMax = Math.max(min, max);
      return Math.min(Math.max(value, min), safeMax);
    }

    function getWidgetSize() {
      const rect = container.getBoundingClientRect();
      return {
        width: rect.width || triggerBtn.offsetWidth || 58,
        height: rect.height || triggerBtn.offsetHeight || 58
      };
    }

    function clampWidgetPosition(left, top) {
      const viewport = getViewportSize();
      const size = getWidgetSize();
      return {
        left: clampNumber(left, ROBOT_CHAT_EDGE_PADDING, viewport.width - size.width - ROBOT_CHAT_EDGE_PADDING),
        top: clampNumber(top, ROBOT_CHAT_EDGE_PADDING, viewport.height - size.height - ROBOT_CHAT_EDGE_PADDING)
      };
    }

    function saveWidgetPosition(position) {
      try {
        localStorage.setItem(ROBOT_CHAT_POSITION_KEY, JSON.stringify(position));
      } catch (e) {}
    }

    function setWidgetPosition(left, top, shouldSave) {
      const position = clampWidgetPosition(left, top);
      container.classList.add("robot-chat-positioned");
      container.style.setProperty("left", `${position.left}px`, "important");
      container.style.setProperty("top", `${position.top}px`, "important");
      container.style.setProperty("right", "auto", "important");
      container.style.setProperty("bottom", "auto", "important");
      if (shouldSave) saveWidgetPosition(position);
      updateChatBoxPlacement();
      return position;
    }

    function restoreSavedWidgetPosition() {
      try {
        const stored = localStorage.getItem(ROBOT_CHAT_POSITION_KEY);
        if (!stored) return;
        const saved = JSON.parse(stored);
        const left = Number(saved?.left);
        const top = Number(saved?.top);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        setWidgetPosition(left, top, true);
      } catch (e) {}
    }

    function updateChatBoxPlacement() {
      if (!chatBox || !triggerBtn || !container) return;

      const previousDisplay = chatBox.style.display;
      const previousVisibility = chatBox.style.visibility;
      const wasHidden = previousDisplay === "none" || window.getComputedStyle(chatBox).display === "none";

      if (wasHidden) {
        chatBox.style.setProperty("visibility", "hidden", "important");
        chatBox.style.setProperty("display", "block", "important");
      }

      const viewport = getViewportSize();
      const triggerRect = triggerBtn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const gap = 14;
      const boxWidth = Math.min(chatBox.offsetWidth || 360, viewport.width - (ROBOT_CHAT_EDGE_PADDING * 2));
      const boxHeight = Math.min(chatBox.offsetHeight || 420, viewport.height - (ROBOT_CHAT_EDGE_PADDING * 2));
      const spaceAbove = triggerRect.top - ROBOT_CHAT_EDGE_PADDING;
      const spaceBelow = viewport.height - triggerRect.bottom - ROBOT_CHAT_EDGE_PADDING;

      let desiredLeft = triggerRect.right - boxWidth;
      let desiredTop = (spaceAbove >= boxHeight + gap || spaceAbove >= spaceBelow)
        ? triggerRect.top - boxHeight - gap
        : triggerRect.bottom + gap;

      desiredLeft = clampNumber(desiredLeft, ROBOT_CHAT_EDGE_PADDING, viewport.width - boxWidth - ROBOT_CHAT_EDGE_PADDING);
      desiredTop = clampNumber(desiredTop, ROBOT_CHAT_EDGE_PADDING, viewport.height - boxHeight - ROBOT_CHAT_EDGE_PADDING);

      chatBox.style.setProperty("left", `${desiredLeft - containerRect.left}px`, "important");
      chatBox.style.setProperty("top", `${desiredTop - containerRect.top}px`, "important");
      chatBox.style.setProperty("right", "auto", "important");
      chatBox.style.setProperty("bottom", "auto", "important");

      if (wasHidden) {
        if (previousDisplay) {
          chatBox.style.display = previousDisplay;
        } else {
          chatBox.style.removeProperty("display");
        }

        if (previousVisibility) {
          chatBox.style.visibility = previousVisibility;
        } else {
          chatBox.style.removeProperty("visibility");
        }
      }
    }

    function handleRobotDragMove(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (!dragState.hasMoved && Math.hypot(deltaX, deltaY) >= ROBOT_CHAT_DRAG_THRESHOLD) {
        dragState.hasMoved = true;
        suppressNextTriggerClick = true;
        container.classList.add("robot-chat-dragging");
        document.documentElement.style.userSelect = "none";
      }

      if (!dragState.hasMoved) return;

      event.preventDefault();
      setWidgetPosition(dragState.startLeft + deltaX, dragState.startTop + deltaY, false);
    }

    function finishRobotDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      if (dragState.hasMoved) {
        event.preventDefault();
        const rect = container.getBoundingClientRect();
        saveWidgetPosition({ left: rect.left, top: rect.top });
        window.setTimeout(() => {
          suppressNextTriggerClick = false;
        }, 350);
      }

      try {
        triggerBtn.releasePointerCapture(event.pointerId);
      } catch (e) {}

      document.documentElement.style.userSelect = previousDocumentUserSelect;
      container.classList.remove("robot-chat-dragging");
      dragState = null;
    }

    triggerBtn.addEventListener("pointerdown", (event) => {
      if (event.isPrimary === false) return;
      if (typeof event.button === "number" && event.button !== 0) return;

      const rect = container.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        hasMoved: false
      };
      previousDocumentUserSelect = document.documentElement.style.userSelect || "";

      try {
        triggerBtn.setPointerCapture(event.pointerId);
      } catch (e) {}
    });

    triggerBtn.addEventListener("pointermove", handleRobotDragMove);
    triggerBtn.addEventListener("pointerup", finishRobotDrag);
    triggerBtn.addEventListener("pointercancel", finishRobotDrag);
    window.addEventListener("pointermove", handleRobotDragMove, { passive: false });
    window.addEventListener("pointerup", finishRobotDrag);
    window.addEventListener("pointercancel", finishRobotDrag);

    window.addEventListener("resize", () => {
      if (container.classList.contains("robot-chat-positioned")) {
        const rect = container.getBoundingClientRect();
        setWidgetPosition(rect.left, rect.top, true);
      } else {
        updateChatBoxPlacement();
      }
    });

    restoreSavedWidgetPosition();

    const chatChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("sg-ephemeral-team-chat") : null;

    if (chatChannel) {
      chatChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.senderId || (!data.text && !data.file)) return;

        if (!inMemoryMessages[data.senderId]) inMemoryMessages[data.senderId] = [];
        inMemoryMessages[data.senderId].push({
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text || "",
          file: data.file || null,
          time: data.time || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          type: "received"
        });

        saveDailyMessages(inMemoryMessages);

        if (activeTargetUser && String(activeTargetUser.id) === String(data.senderId)) {
          renderMessages();
        }
      };
    }

    triggerBtn.addEventListener("click", (event) => {
      if (suppressNextTriggerClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextTriggerClick = false;
        return;
      }

      const isHidden = chatBox.style.display === "none";
      chatBox.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        updateChatBoxPlacement();
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
      updateChatBoxPlacement();
    });

    userSearch?.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      renderUsersList(teamUsers.filter(u => u.name.toLowerCase().includes(term) || (u.cargo && u.cargo.toLowerCase().includes(term))));
      updateChatBoxPlacement();
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

    const getSupabaseClient = () => {
      if (window.sevenGoldAuth && window.sevenGoldAuth.from) return window.sevenGoldAuth;
      if (typeof getClient === "function") {
        try {
          const c = getClient();
          if (c && c.from) return c;
        } catch (e) {}
      }
      if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
      if (window.supabase && window.SEVEN_GOLD_SUPABASE) {
        try {
          window.supabaseClient = window.supabase.createClient(
            window.SEVEN_GOLD_SUPABASE.url,
            window.SEVEN_GOLD_SUPABASE.publishableKey
          );
          return window.supabaseClient;
        } catch (e) {}
      }
      return null;
    };

    const getCurrentLoggedUser = () => {
      if (window.crmUser) return window.crmUser;
      if (window.currentCrmUser) return window.currentCrmUser;
      if (window.sevenGoldCurrentUser) return window.sevenGoldCurrentUser;
      try {
        const stored = localStorage.getItem("seven_gold_crm_user") || localStorage.getItem("sb-user-profile");
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return null;
    };

    const loadTeamUsers = async () => {
      if (!usersList) return;
      usersList.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8; font-size:0.82rem;">Carregando colaboradores reais...</div>';

      let loadedUsers = [];

      // 1. Try querying real crm_users table via window.sevenGoldAuth
      try {
        const client = getSupabaseClient();
        if (client && client.from) {
          const { data: crmData, error: crmErr } = await client
            .from("crm_users")
            .select("id, nome, email, cargo, ativo")
            .order("nome", { ascending: true });

          if (!crmErr && Array.isArray(crmData) && crmData.length > 0) {
            loadedUsers = crmData
              .filter(u => u.ativo !== false)
              .map(u => ({
                id: u.id,
                name: u.nome || u.email || "Colaborador",
                email: u.email || "",
                avatar: "",
                cargo: formatUserRole(u.cargo)
              }));
          }
        }
      } catch (e) {
        console.warn("[Robot Chat] Erro ao carregar crm_users:", e);
      }

      // 2. Try window profile state cache (populated by auth.js / equipe.js)
      if (loadedUsers.length === 0) {
        const cached = window.crmUsers || window.usersRecords || window.equipeData || window.crmUsersList || [];
        if (Array.isArray(cached) && cached.length > 0) {
          loadedUsers = cached
            .filter(u => u.ativo !== false && u.status !== "inativo")
            .map(u => ({
              id: u.id || Math.random(),
              name: u.nome || u.full_name || u.name || u.email || "Colaborador",
              email: u.email || "",
              avatar: u.avatar_url || "",
              cargo: formatUserRole(u.cargo || u.role)
            }));
        }
      }

      // Filter out currently logged-in user so user cannot send messages to oneself
      const activeMe = getCurrentLoggedUser();
      if (activeMe) {
        const myId = String(activeMe.id || activeMe.user_id || "");
        const myEmail = String(activeMe.email || activeMe.user_email || "").toLowerCase().trim();
        const myName = String(activeMe.nome || activeMe.name || "").toLowerCase().trim();

        loadedUsers = loadedUsers.filter(u => {
          const uId = String(u.id || "");
          const uEmail = String(u.email || "").toLowerCase().trim();
          const uName = String(u.name || "").toLowerCase().trim();

          if (myId && uId && uId === myId) return false;
          if (myEmail && uEmail && uEmail === myEmail) return false;
          if (myName && uName && uName === myName && myName.length > 2) return false;
          return true;
        });
      }

      teamUsers = loadedUsers;
      renderUsersList(teamUsers);
      updateChatBoxPlacement();
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
      updateChatBoxPlacement();

      renderMessages();
      msgInput?.focus();
    };

    const attachBtn = document.getElementById("robot-chat-attach-btn");
    const fileInput = document.getElementById("robot-chat-file-input");
    const previewBar = document.getElementById("robot-chat-attachment-preview");
    const previewContent = document.getElementById("robot-chat-preview-content");
    const removeAttachBtn = document.getElementById("robot-chat-remove-attachment");

    let pendingAttachment = null;

    const formatFileSize = (bytes) => {
      if (!bytes) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    attachBtn?.addEventListener("click", () => fileInput?.click());

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 8 * 1024 * 1024) {
        alert("O arquivo selecionado deve ter no máximo 8 MB.");
        fileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const isImage = file.type.startsWith("image/");

        pendingAttachment = {
          name: file.name,
          size: formatFileSize(file.size),
          type: isImage ? "image" : "file",
          dataUrl: dataUrl
        };

        if (previewBar && previewContent) {
          previewBar.style.display = "flex";
          if (isImage) {
            previewContent.innerHTML = `
              <img src="${dataUrl}" style="width:34px; height:34px; object-fit:cover; border-radius:6px; border:1px solid #CBD5E1; flex-shrink:0;" />
              <div style="font-size:0.78rem; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(file.name)}</div>
            `;
          } else {
            previewContent.innerHTML = `
              <div style="font-size:1.1rem; flex-shrink:0;">📄</div>
              <div style="font-size:0.78rem; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                <strong>${escapeHtml(file.name)}</strong> (${formatFileSize(file.size)})
              </div>
            `;
          }
          updateChatBoxPlacement();
        }
      };
      reader.readAsDataURL(file);
    });

    removeAttachBtn?.addEventListener("click", () => {
      pendingAttachment = null;
      if (fileInput) fileInput.value = "";
      if (previewBar) previewBar.style.display = "none";
      updateChatBoxPlacement();
    });

    const renderMessages = () => {
      if (!msgBody || !activeTargetUser) return;
      const msgs = inMemoryMessages[activeTargetUser.id] || [];

      if (msgs.length === 0) {
        msgBody.innerHTML = `
          <div style="text-align:center; margin:auto; padding:20px; color:#94A3B8;">
            <div style="font-size:1.8rem; margin-bottom:6px;">🤖</div>
            <strong style="font-size:0.85rem; color:#475569; display:block;">Conversa Temporária</strong>
            <span style="font-size:0.76rem; color:#64748B;">Você pode enviar textos, fotos e arquivos. As conversas zeram no dia seguinte.</span>
          </div>
        `;
        return;
      }

      msgBody.innerHTML = msgs.map(m => {
        let attachmentHtml = "";
        if (m.file) {
          const fileName = escapeHtml(m.file.name || "anexo");
          const fileSize = escapeHtml(m.file.size || "");
          if (m.file.type === "image") {
            attachmentHtml = `
              <div style="margin-bottom:6px;">
                <img src="${m.file.dataUrl}" style="max-width:100%; max-height:180px; border-radius:10px; cursor:pointer; display:block; border:1px solid rgba(0,0,0,0.1); box-shadow:0 2px 8px rgba(0,0,0,0.12);" onclick="window.open(this.src, '_blank')" title="Clique para abrir imagem" />
                <a href="${m.file.dataUrl}" download="${fileName}" style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:7px; padding:7px 10px; background:rgba(255,255,255,0.24); border-radius:10px; text-decoration:none; color:inherit; border:1px solid rgba(0,0,0,0.08); box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                  <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:0.76rem; font-weight:800;">${fileName}</span>
                  <span style="flex-shrink:0; font-size:0.68rem; opacity:0.82; font-weight:800;">${fileSize ? `${fileSize} · ` : ""}Baixar imagem</span>
                </a>
              </div>
            `;
          } else {
            attachmentHtml = `
              <a href="${m.file.dataUrl}" download="${fileName}" style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:rgba(255,255,255,0.22); border-radius:10px; text-decoration:none; color:inherit; margin-bottom:6px; border:1px solid rgba(0,0,0,0.08); box-shadow:0 1px 4px rgba(0,0,0,0.05);">
                <span style="font-size:1.2rem; flex-shrink:0;">📄</span>
                <div style="flex:1; overflow:hidden;">
                  <strong style="font-size:0.8rem; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${fileName}</strong>
                  <span style="font-size:0.68rem; opacity:0.8;">${fileSize ? `${fileSize} · ` : ""}Baixar arquivo</span>
                </div>
              </a>
            `;
          }
        }

        return `
          <div class="robot-chat-msg-bubble ${m.type === 'sent' ? 'sent' : 'received'}">
            ${attachmentHtml}
            ${m.text ? `<div>${escapeHtml(m.text)}</div>` : ''}
            <div style="font-size:0.65rem; text-align:right; opacity:0.75; margin-top:2px;">${m.time}</div>
          </div>
        `;
      }).join("");

      msgBody.scrollTop = msgBody.scrollHeight;
    };

    msgForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text && !pendingAttachment) return;
      if (!activeTargetUser) return;

      const currentUser = window.crmUser || window.currentCrmUser;
      const timeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      const msgPayload = {
        senderId: currentUser?.id || "me",
        text: text,
        file: pendingAttachment ? { ...pendingAttachment } : null,
        time: timeStr,
        type: "sent"
      };

      if (!inMemoryMessages[activeTargetUser.id]) inMemoryMessages[activeTargetUser.id] = [];
      inMemoryMessages[activeTargetUser.id].push(msgPayload);

      if (chatChannel) {
        chatChannel.postMessage({
          senderId: currentUser?.id || "user-peer",
          senderName: currentUser?.nome || "Colaborador",
          targetId: activeTargetUser.id,
          text: text,
          file: pendingAttachment ? { ...pendingAttachment } : null,
          time: timeStr
        });
      }

      saveDailyMessages(inMemoryMessages);

      // Reset input state
      pendingAttachment = null;
      if (fileInput) fileInput.value = "";
      if (previewBar) previewBar.style.display = "none";
      updateChatBoxPlacement();

      msgInput.value = "";
      renderMessages();
    });
  }

  function isLoginPage() {
    if (document.body && document.body.hasAttribute("data-require-auth")) {
      return false; // Authenticated panel page - ALWAYS render robot chat!
    }
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith("crm-login.html") || path.endsWith("auth-callback.html")) {
      return true;
    }
    if (document.body && (document.body.classList.contains("crm-login-body") || document.body.classList.contains("login-page-body"))) {
      if (!document.body.hasAttribute("data-require-auth")) {
        return true;
      }
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

  // Heartbeat to guarantee floating robot chat is ALWAYS present on all authenticated pages/panels
  setInterval(() => {
    if (!isLoginPage() && !document.getElementById("floating-robot-chat-trigger")) {
      start();
    }
  }, 1500);
})();
