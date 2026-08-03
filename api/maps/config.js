const ALLOWED_ORIGIN = 'https://painel.sevengoldfinanceira.com.br';

module.exports = function mapsConfig(request, response) {
  const send = (status, body, headers = {}) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    return response.end(JSON.stringify(body));
  };

  if (request.method !== 'GET') {
    return send(405, { ok: false, error: 'Método não permitido.' }, { Allow: 'GET' });
  }

  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!apiKey) {
    return send(503, { ok: false, error: 'Google Maps não configurado.' });
  }

  const forwardedHost = String(request.headers['x-forwarded-host'] || request.headers.host || '').toLowerCase();
  const isProductionHost = forwardedHost === 'painel.sevengoldfinanceira.com.br';
  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(forwardedHost);

  if (!isProductionHost && !isLocalHost) {
    return send(403, { ok: false, error: 'Origem não autorizada.' });
  }

  return send(200, { ok: true, apiKey, allowedOrigin: ALLOWED_ORIGIN }, {
    'Cache-Control': 'private, no-store, max-age=0',
    Vary: 'Host',
  });
};
