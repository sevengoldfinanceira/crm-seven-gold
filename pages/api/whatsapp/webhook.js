module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];

    console.log('[WhatsApp Webhook] GET verification', { mode, token });

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Token verification failed');
  }

  if (req.method === 'POST') {
    console.log(
      '[WhatsApp Webhook] POST received:',
      JSON.stringify(req.body, null, 2)
    );
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.status(405).send('Method not allowed');
};
