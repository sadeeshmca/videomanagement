// Production server for Railway (and any Node host).
// TanStack Start's build output (dist/server/server.js) only exports a fetch
// handler, so this file serves the static client assets and forwards every
// other request to that handler.
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, "dist", "client");
const { default: app } = await import("./dist/server/server.js");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

async function tryStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (urlPath === "/") return false;
  const filePath = path.normalize(path.join(clientDir, urlPath));
  if (!filePath.startsWith(clientDir + path.sep)) return false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    const immutable = urlPath.startsWith("/assets/");
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": info.size,
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  try {
    if (await tryStatic(req, res)) return;

    const proto = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `${proto}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value !== undefined) headers.set(key, value);
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(url, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });

    const response = await app.fetch(request);

    const outHeaders = {};
    response.headers.forEach((value, key) => {
      if (key === "set-cookie") return;
      outHeaders[key] = value;
    });
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) outHeaders["set-cookie"] = cookies;
    res.writeHead(response.status, outHeaders);

    if (!response.body || req.method === "HEAD") return res.end();
    Readable.fromWeb(response.body).pipe(res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
