require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

const apiRoutes = {};

function loadRoute(routePath, filePath) {
  try {
    apiRoutes[routePath] = require(filePath);
    console.log(`Rota de API carregada: ${routePath}`);
  } catch (e) {
    console.warn(`Aviso: ${filePath} nao pode ser carregado.`, e.message);
  }
}

loadRoute("/api/whatsapp/webhook", "./pages/api/whatsapp/webhook");
loadRoute("/api/leads/from-whatsapp-extension", "./pages/api/leads/from-whatsapp-extension");
loadRoute("/api/leads/delete", "./pages/api/leads/delete");
loadRoute("/api/leads/by-phone", "./pages/api/leads/by-phone");
loadRoute("/api/leads/create", "./pages/api/leads/create");
loadRoute("/api/leads/update-stage", "./pages/api/leads/update-stage");
loadRoute("/api/leads/assignees", "./pages/api/leads/assignees");
loadRoute("/api/appointments/list", "./pages/api/appointments");
loadRoute("/api/appointments/create", "./pages/api/appointments");
loadRoute("/api/tasks/list", "./pages/api/tasks");
loadRoute("/api/tasks/create", "./pages/api/tasks");
loadRoute("/api/tasks/update", "./pages/api/tasks");
loadRoute("/api/productions/manage", "./pages/api/productions/manage");
loadRoute("/api/permissions/save", "./pages/api/permissions/save");

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