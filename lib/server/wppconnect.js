const normalizeBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const getConfig = () => {
  const baseUrl = normalizeBaseUrl(process.env.WPPCONNECT_BASE_URL);
  const session = String(process.env.WPPCONNECT_SESSION || "seven-gold").trim();
  const token = String(process.env.WPPCONNECT_TOKEN || "").trim();

  if (!baseUrl) throw new Error("WPPCONNECT_BASE_URL não configurada.");
  if (!session) throw new Error("WPPCONNECT_SESSION não configurada.");
  if (!token) throw new Error("WPPCONNECT_TOKEN não configurado.");

  return { baseUrl, session, token };
};

const normalizePhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }
  return digits;
};

const request = async (path, options = {}) => {
  const { baseUrl, token } = getConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch (_) { payload = { raw: text }; }

  if (!response.ok) {
    const message = payload?.message || payload?.error || payload?.raw || `Erro WPPConnect ${response.status}`;
    throw new Error(String(message));
  }

  return payload;
};

const startSession = async (webhookUrl) => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/start-session`, {
    method: "POST",
    body: { webhook: webhookUrl || "", waitQrCode: true },
  });
};

const getStatus = async () => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/status-session`);
};

const getQrCode = async () => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/qrcode-session`);
};

const sendText = async (phone, message) => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/send-message`, {
    method: "POST",
    body: { phone: normalizePhone(phone), message: String(message || "") },
  });
};

const archiveChat = async (phone, archive = true) => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/archive-chat`, {
    method: "POST",
    body: { phone: normalizePhone(phone), archive: Boolean(archive) },
  });
};

const clearChat = async (phone) => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/clear-chat`, {
    method: "POST",
    body: { phone: normalizePhone(phone) },
  });
};

const deleteChat = async (phone) => {
  const { session } = getConfig();
  return request(`/api/${encodeURIComponent(session)}/delete-chat`, {
    method: "POST",
    body: { phone: normalizePhone(phone) },
  });
};

module.exports = {
  getConfig,
  normalizePhone,
  startSession,
  getStatus,
  getQrCode,
  sendText,
  archiveChat,
  clearChat,
  deleteChat,
};
