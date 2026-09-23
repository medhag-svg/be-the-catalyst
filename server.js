"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const PORT = 8766;
const root = path.join(__dirname, "experience");
const clients = new Set();
let latest = { type: "body", tracked: false, bodies: [], mask: "", receivedAt: 0 };
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: true, kinect: Date.now() - latest.receivedAt < 1500, bodies: latest.bodies?.length || 0 }));
    return;
  }
  if (url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write(`data: ${JSON.stringify(latest)}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (url.pathname === "/kinect" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { if (body.length < 300000) body += chunk; });
    req.on("end", () => {
      try {
        latest = JSON.parse(body);
        latest.type = "body";
        latest.receivedAt = Date.now();
        const message = `data: ${JSON.stringify(latest)}\n\n`;
        for (const client of clients) client.write(message);
        res.writeHead(204).end();
      } catch (_) {
        res.writeHead(400).end("Invalid Kinect frame");
      }
    });
    return;
  }

  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = path.normalize(path.join(root, relative));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Living Portal is ready at http://127.0.0.1:${PORT}`);
  if (process.argv.includes("--launch")) {
    const route = process.argv.includes("--demo") ? `http://127.0.0.1:${PORT}/?demo=1` : `http://127.0.0.1:${PORT}`;
    cp.spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", path.join(__dirname, "projector-launch.ps1"),
      route
    ], { detached: true, stdio: "ignore", windowsHide: true }).unref();
  }
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
