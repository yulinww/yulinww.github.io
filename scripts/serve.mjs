import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { projectRoot } from "./build.mjs";

const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif", ".ico": "image/x-icon",
  ".pdf": "application/pdf", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8"
};

export function startServer({ port = Number(process.env.PORT || 4173), root = path.join(projectRoot, "dist") } = {}) {
  root = path.resolve(root);
  const server = createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      let file = path.resolve(root, "." + pathname);
      if (!file.startsWith(root + path.sep) && file !== root) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if ((await stat(file)).isDirectory()) {
        if (!pathname.endsWith("/")) {
          response.writeHead(301, { Location: url.pathname + "/" + url.search }).end();
          return;
        }
        file = path.join(file, "index.html");
      }
      const data = await readFile(file);
      response.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
      response.end(request.method === "HEAD" ? undefined : data);
    } catch (error) {
      if (error instanceof URIError) { response.writeHead(400).end("Bad URL"); return; }
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      let html = "<h1>404</h1>";
      try { html = await readFile(path.join(root, "404.html")); } catch { /* Site has not been built. */ }
      response.end(request.method === "HEAD" ? undefined : html);
    }
  });
  server.on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? "端口 " + port + " 已被占用。请设置 PORT 使用其他端口。" : error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => console.log("Local: http://127.0.0.1:" + server.address().port));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startServer();
