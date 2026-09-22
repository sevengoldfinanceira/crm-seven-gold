const { supabase } = require("../../lib/server/supabase");
const { normalizePhone } = require("../../lib/server/wppconnect");

const getMessage = (body) => body?.data || body?.message || body?.response || body || {};

const getText = (msg) => {
  if (typeof msg?.body === "string") return msg.body;
  if (typeof msg?.content === "string") return msg.content;
  if (typeof msg?.text === "string") return msg.text;
  if (typeof msg?.message === "string") return msg.message;
  return "";
};

const getPhone = (msg, isFromMe) => {
  const raw = isFromMe
    ? (msg?.to || msg?.chatId || msg?.chat?.id || msg?.from || "")
    : (msg?.from || msg?.sender?.id || msg?.sender?.user || msg?.chatId || msg?.chat?.id || "");
  return normalizePhone(String(raw).split("@")[0]);
};

const getProviderId = (msg) =>
  msg?.id?._serialized ||
  msg?.id ||
  msg?.messageId ||
  msg?.msgId ||
  null;

module.exports = async (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") return res.end(JSON.stringify({ ok: true }));

  try {
    const body = req.body || {};
    const event = String(body?.event || body?.type || "").toLowerCase();
    const msg = getMessage(body);
    const text = getText(msg);

    if (!text) return res.end(JSON.stringify({ ok: true, ignored: true }));

    const isFromMe = Boolean(msg?.fromMe || msg?.isSentByMe || msg?.isSelf || event.includes("self"));
    const phone = getPhone(msg, isFromMe);
    if (!phone) return res.end(JSON.stringify({ ok: true, ignored: true }));
    const localPhone = phone.startsWith("55") ? phone.slice(2) : phone;

    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .in("telefone", [phone, localPhone])
      .limit(1)
      .maybeSingle();

    if (!lead?.id) return res.end(JSON.stringify({ ok: true, ignored: true, reason: "lead_not_found" }));

    const providerMessageId = getProviderId(msg);

    if (providerMessageId) {
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("provider_message_id", String(providerMessageId))
        .maybeSingle();
      if (existing?.id) return res.end(JSON.stringify({ ok: true, duplicate: true }));
    }

    await supabase.from("messages").insert({
      lead_id: lead.id,
      telefone: phone,
      direcao: isFromMe ? "saida" : "entrada",
      mensagem: text,
      origem: "wppconnect",
      provider_message_id: providerMessageId ? String(providerMessageId) : null,
      message_type: String(msg?.type || "text"),
      raw_payload: body,
    });

    await supabase.from("leads").update({ ultima_interacao: new Date().toISOString() }).eq("id", lead.id);
  } catch (error) {
    console.error("[WPPConnect webhook]", error.message || error);
  }

  return res.end(JSON.stringify({ ok: true }));
};
