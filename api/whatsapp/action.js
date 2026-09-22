const { supabase } = require("../../lib/server/supabase");
const { getAuthorizedCrmUser, canAccessLead } = require("../../lib/server/crm-authorization");
const { archiveChat, clearChat, deleteChat, normalizePhone } = require("../../lib/server/wppconnect");

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  try {
    const auth = await getAuthorizedCrmUser(req);
    if (auth.error) return json(res, auth.status || 401, { ok: false, error: auth.error });
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Método não permitido." });

    const leadId = String(req.body?.lead_id || "").trim();
    const action = String(req.body?.action || "").trim();
    if (!leadId || !action) return json(res, 400, { ok: false, error: "Lead e ação são obrigatórios." });

    const { data: lead } = await supabase
      .from("leads")
      .select("id,telefone,assigned_to_email")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) return json(res, 404, { ok: false, error: "Lead não encontrado." });
    if (!canAccessLead(auth.user, lead)) return json(res, 403, { ok: false, error: "Sem acesso a este lead." });

    const phone = normalizePhone(lead.telefone);
    if (!phone) return json(res, 400, { ok: false, error: "Lead sem telefone válido." });

    let result;
    if (action === "archive") result = await archiveChat(phone, true);
    else if (action === "unarchive") result = await archiveChat(phone, false);
    else if (action === "clear") result = await clearChat(phone);
    else if (action === "delete") result = await deleteChat(phone);
    else return json(res, 400, { ok: false, error: "Ação inválida." });

    return json(res, 200, { ok: true, result });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Erro ao executar ação no WhatsApp." });
  }
};
