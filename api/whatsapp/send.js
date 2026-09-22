const { supabase } = require("../../lib/server/supabase");
const { getAuthorizedCrmUser, canAccessLead } = require("../../lib/server/crm-authorization");
const { sendText, normalizePhone } = require("../../lib/server/wppconnect");

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
    const message = String(req.body?.message || "").trim();
    if (!leadId || !message) return json(res, 400, { ok: false, error: "Lead e mensagem são obrigatórios." });

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id,name,telefone,assigned_to_email")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) return json(res, 404, { ok: false, error: "Lead não encontrado." });
    if (!canAccessLead(auth.user, lead)) return json(res, 403, { ok: false, error: "Sem acesso a este lead." });

    const phone = normalizePhone(lead.telefone);
    if (!phone) return json(res, 400, { ok: false, error: "Lead sem telefone válido." });

    const result = await sendText(phone, message);
    const providerMessageId =
      result?.response?.id?._serialized ||
      result?.response?.id ||
      result?.id?._serialized ||
      result?.id ||
      null;

    const { data: saved, error: saveError } = await supabase
      .from("messages")
      .insert({
        lead_id: lead.id,
        telefone: phone,
        direcao: "saida",
        mensagem: message,
        origem: "wppconnect",
        provider_message_id: providerMessageId ? String(providerMessageId) : null,
        message_type: "text",
      })
      .select("id,lead_id,telefone,direcao,mensagem,origem,provider_message_id,message_type,created_at")
      .single();

    if (saveError) throw saveError;

    await supabase.from("leads").update({ ultima_interacao: new Date().toISOString() }).eq("id", lead.id);

    return json(res, 200, { ok: true, message: saved, provider: result });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Erro ao enviar mensagem." });
  }
};
