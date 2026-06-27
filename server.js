const http = require("http");
const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------
// Carregar variáveis de ambiente do arquivo .env (se existir)
// -----------------------------------------------------------
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
  console.log("Variáveis de ambiente carregadas do .env");
}

// -----------------------------------------------------------
// Importar handlers de API
// -----------------------------------------------------------
const apiRoutes = {};

try {
  apiRoutes["/api/whatsapp/webhook"] = require("./api/whatsapp/webhook");
  console.log("Rota de API carregada: /api/whatsapp/webhook");
} catch (e) {
  try {
    apiRoutes["/api/whatsapp/webhook"] = require("./pages/api/whatsapp/webhook");
    console.log("Rota de API carregada (pages): /api/whatsapp/webhook");
  } catch (e2) {
    console.warn("Aviso: webhook.js nao pode ser carregado.", e2.message);
  }
}

const port = 3000;
const root = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  // ---------------------------------------------------------
  // Rotas de API
  // ---------------------------------------------------------
  const handler = apiRoutes[pathname];
  if (handler) {
    request.query = Object.fromEntries(requestUrl.searchParams);

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        request.body = body ? JSON.parse(body) : {};
      } catch {
        request.body = {};
      }
      handler(request, response);
    });

    return;
  }

  // ---------------------------------------------------------
  // Arquivos estáticos
  // ---------------------------------------------------------
  const normalizedPath = path.normalize(pathname);
  const safePath = normalizedPath
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "" ? "index.html" : safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Acesso negado");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Arquivo nao encontrado");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
    });
    response.end(content);
  });
});

server.listen(port, () => {
  console.log(`Seven Gold rodando em http://localhost:${port}`);
});
