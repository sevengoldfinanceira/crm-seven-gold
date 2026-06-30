require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

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

try {
  apiRoutes["/api/leads/from-whatsapp-extension"] = require("./api/leads/from-whatsapp-extension");
  console.log("Rota de API carregada: /api/leads/from-whatsapp-extension");
} catch (e) {
  try {
    apiRoutes["/api/leads/from-whatsapp-extension"] = require("./pages/api/leads/from-whatsapp-extension");
    console.log("Rota de API carregada (pages): /api/leads/from-whatsapp-extension");
  } catch (e2) {
    console.warn("Aviso: from-whatsapp-extension.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/leads/delete"] = require("./api/leads/delete");
  console.log("Rota de API carregada: /api/leads/delete");
} catch (e) {
  try {
    apiRoutes["/api/leads/delete"] = require("./pages/api/leads/delete");
    console.log("Rota de API carregada (pages): /api/leads/delete");
  } catch (e2) {
    console.warn("Aviso: delete.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/leads/by-phone"] = require("./api/leads/by-phone");
  console.log("Rota de API carregada: /api/leads/by-phone");
} catch (e) {
  try {
    apiRoutes["/api/leads/by-phone"] = require("./pages/api/leads/by-phone");
    console.log("Rota de API carregada (pages): /api/leads/by-phone");
  } catch (e2) {
    console.warn("Aviso: by-phone.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/leads/update-stage"] = require("./api/leads/update-stage");
  console.log("Rota de API carregada: /api/leads/update-stage");
} catch (e) {
  try {
    apiRoutes["/api/leads/update-stage"] = require("./pages/api/leads/update-stage");
    console.log("Rota de API carregada (pages): /api/leads/update-stage");
  } catch (e2) {
    console.warn("Aviso: update-stage.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/leads/assignees"] = require("./api/leads/assignees");
  console.log("Rota de API carregada: /api/leads/assignees");
} catch (e) {
  console.warn("Aviso: leads/assignees.js nao pode ser carregado.", e.message);
}

try {
  apiRoutes["/api/appointments/list"] = require("./api/appointments/list");
  console.log("Rota de API carregada: /api/appointments/list");
} catch (e) {
  try {
    apiRoutes["/api/appointments/list"] = require("./pages/api/appointments/list");
    console.log("Rota de API carregada (pages): /api/appointments/list");
  } catch (e2) {
    console.warn("Aviso: appointments/list.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/appointments/create"] = require("./api/appointments/create");
  console.log("Rota de API carregada: /api/appointments/create");
} catch (e) {
  try {
    apiRoutes["/api/appointments/create"] = require("./pages/api/appointments/create");
    console.log("Rota de API carregada (pages): /api/appointments/create");
  } catch (e2) {
    console.warn("Aviso: appointments/create.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/tasks/list"] = require("./api/tasks/list");
  console.log("Rota de API carregada: /api/tasks/list");
} catch (e) {
  try {
    apiRoutes["/api/tasks/list"] = require("./pages/api/tasks/list");
    console.log("Rota de API carregada (pages): /api/tasks/list");
  } catch (e2) {
    console.warn("Aviso: tasks/list.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/tasks/create"] = require("./api/tasks/create");
  console.log("Rota de API carregada: /api/tasks/create");
} catch (e) {
  try {
    apiRoutes["/api/tasks/create"] = require("./pages/api/tasks/create");
    console.log("Rota de API carregada (pages): /api/tasks/create");
  } catch (e2) {
    console.warn("Aviso: tasks/create.js nao pode ser carregado.", e2.message);
  }
}

try {
  apiRoutes["/api/tasks/update"] = require("./api/tasks/update");
  console.log("Rota de API carregada: /api/tasks/update");
} catch (e) {
  try {
    apiRoutes["/api/tasks/update"] = require("./pages/api/tasks/update");
    console.log("Rota de API carregada (pages): /api/tasks/update");
  } catch (e2) {
    console.warn("Aviso: tasks/update.js nao pode ser carregado.", e2.message);
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
