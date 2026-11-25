// Petit serveur HTTP sans dépendance : sert les fichiers statiques de public/
// et une mini API JSON en mémoire pour les tâches.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

let nextId = 3;
let tasks = [
  { id: 1, title: "Découvrir le projet", done: true },
  { id: 2, title: "Ajouter une tâche", done: false },
];

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(data === undefined ? "" : JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e5) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
  });
}

async function handleApi(req, res, url) {
  const match = url.pathname.match(/^\/api\/tasks(?:\/(\d+))?$/);
  if (!match) return sendJson(res, 404, { error: "Route inconnue" });
  const id = match[1] && Number(match[1]);

  if (!id && req.method === "GET") return sendJson(res, 200, tasks);

  if (!id && req.method === "POST") {
    const body = await readBody(req);
    const title = String(body.title || "").trim();
    if (!title) return sendJson(res, 400, { error: "Le titre est requis" });
    const task = { id: nextId++, title, done: false };
    tasks.push(task);
    return sendJson(res, 201, task);
  }

  const task = tasks.find((t) => t.id === id);
  if (!task) return sendJson(res, 404, { error: "Tâche introuvable" });

  if (req.method === "PATCH") {
    const body = await readBody(req);
    if (typeof body.done === "boolean") task.done = body.done;
    return sendJson(res, 200, task);
  }
  if (req.method === "DELETE") {
    tasks = tasks.filter((t) => t.id !== id);
    res.writeHead(204);
    return res.end();
  }
  sendJson(res, 405, { error: "Méthode non autorisée" });
}

function serveStatic(res, url) {
  const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Interdit");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Page introuvable");
    }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    serveStatic(res, url);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Application disponible sur http://localhost:${PORT}`);
});
