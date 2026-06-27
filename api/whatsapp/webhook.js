module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // -----------------------------------------------------------
  // GET - Validação do webhook (chamado pela Meta na configuração)
  // -----------------------------------------------------------
  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];

    console.log('[WhatsApp Webhook] GET verification', { mode, token });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(String(challenge));
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Token verification failed');
  }

  // -----------------------------------------------------------
  // POST - Receber mensagens e eventos do WhatsApp
  // -----------------------------------------------------------
  if (req.method === 'POST') {
    console.log(
      '[WhatsApp Webhook] POST received:',
      JSON.stringify(req.body, null, 2)
    );
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('EVENT_RECEIVED');
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
};
