#!/usr/bin/env node
// Serves the static export in out/ (what a static host would serve).
// Usage: node scripts/serve-out.mjs [port]
import { createServer } from "node:http";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../out");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

export function serve(port = 0) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      let path = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) throw new Error("outside root");
      const info = await stat(path).catch(() => null);
      if (info?.isDirectory()) path = join(path, "index.html");
      let body = await readFile(path);
      const type = TYPES[extname(path)] ?? "application/octet-stream";
      const immutable = path.includes("/_next/static/") || path.includes("/art/");
      const headers = {
        "content-type": type,
        "cache-control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
        vary: "accept-encoding",
      };
      // Compress text the way any static host (Vercel, Netlify, a CDN) does.
      const accept = String(req.headers["accept-encoding"] ?? "");
      if (/^(text|application\/json|image\/svg)/.test(type) || type.includes("javascript")) {
        if (accept.includes("br")) {
          body = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
          headers["content-encoding"] = "br";
        } else if (accept.includes("gzip")) {
          body = gzipSync(body, { level: 9 });
          headers["content-encoding"] = "gzip";
        }
      }
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not found");
    }
  });
  return new Promise((resolveServer) => {
    server.listen(port, "127.0.0.1", () => resolveServer(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 3000);
  const server = await serve(port);
  console.log(`Cairn static export on http://localhost:${server.address().port}`);
}
