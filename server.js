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

loadRoute("/api/whatsapp/webhook", "./api/whatsapp/webhook");
loadRoute("/api/leads/from-whatsapp-extension", "./api/leads");
loadRoute("/api/leads/delete", "./api/leads");
loadRoute("/api/leads/by-phone", "./api/leads");
loadRoute("/api/leads/create", "./api/leads");
loadRoute("/api/leads/update-stage", "./api/leads");
loadRoute("/api/leads/assignees", "./api/leads");
loadRoute("/api/appointments/list", "./api/appointments");
loadRoute("/api/appointments/create", "./api/appointments");
loadRoute("/api/tasks/list", "./api/tasks");
loadRoute("/api/tasks/create", "./api/tasks");
loadRoute("/api/tasks/update", "./api/tasks");
loadRoute("/api/productions/manage", "./api/productions/manage");
loadRoute("/api/permissions/save", "./api/permissions/save");
loadRoute("/api/finance/company-settings", "./api/finance");
loadRoute("/api/finance/borderos/generate", "./api/finance");
loadRoute("/api/finance/borderos/list", "./api/finance");
loadRoute("/api/finance/borderos/update-status", "./api/finance");
loadRoute("/api/finance/borderos/adjust", "./api/finance");
loadRoute("/api/finance/borderos/sign", "./api/finance");
loadRoute("/api/attendance/proposals/simulate", "./api/proposals");
loadRoute("/api/attendance/proposals/tables", "./api/proposals");
loadRoute("/api/attendance/proposals/imports", "./api/proposals");
loadRoute("/api/attendance/proposals/imports/upload", "./api/proposals");
loadRoute("/api/attendance/proposals/drive/sync", "./api/proposals");
loadRoute("/api/attendance/proposals/settings", "./api/proposals");

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
