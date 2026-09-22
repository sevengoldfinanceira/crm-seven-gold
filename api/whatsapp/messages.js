const { supabase } = require("../../lib/server/supabase");
const { getAuthorizedCrmUser, canAccessLead } = require("../../lib/server/crm-authorization");

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

module.exports = async (req, res) => {
  try {
    const auth = await getAuthorizedCrmUser(req);
    if (auth.error) return json(res, auth.status || 401, { ok: false, error: auth.error });

    if (req.method !== "GET") return json(res, 405, { ok: false, error: "Método não permitido." });

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const leadId = String(url.searchParams.get("lead_id") || "").trim();
    if (!leadId) return json(res, 400, { ok: false, error: "lead_id é obrigatório." });

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id,name,telefone,assigned_to_email")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) return json(res, 404, { ok: false, error: "Lead não encontrado." });
    if (!canAccessLead(auth.user, lead)) return json(res, 403, { ok: false, error: "Sem acesso a este lead." });

    const { data, error } = await supabase
      .from("messages")
      .select("id,lead_id,telefone,direcao,mensagem,origem,provider_message_id,message_type,created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (error) throw error;

    return json(res, 200, { ok: true, lead, messages: data || [] });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message || "Erro ao carregar mensagens." });
  }
};
