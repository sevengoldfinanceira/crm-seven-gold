const { getAuthorizedCrmUser } = require("../../lib/server/crm-authorization");
const { startSession, getStatus, getQrCode } = require("../../lib/server/wppconnect");

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  try {
    const auth = await getAuthorizedCrmUser(req);
    if (auth.error) return json(res, auth.status || 401, { ok: false, error: auth.error });

    if (req.method === "GET") {
      try {
        const status = await getStatus();
        return json(res, 200, { ok: true, status });
      } catch (error) {
        return json(res, 200, { ok: true, status: { connected: false, error: error.message } });
      }
    }

    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Método não permitido." });

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const webhook = `${proto}://${host}/api/whatsapp/wpp-webhook`;

    const started = await startSession(webhook);
    let qr = null;
    try { qr = await getQrCode(); } catch (_) {}

    return json(res, 200, { ok: true, started, qr });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Erro ao conectar WhatsApp." });
  }
};
