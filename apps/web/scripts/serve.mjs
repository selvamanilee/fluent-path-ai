// Minimal production server for the built PWA: static files + SPA fallback + /api proxy.
// In production you can use nginx/Caddy instead (see docs/08-deployment.md).
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/web/browser/', import.meta.url));
const port = Number(process.env.PORT ?? 4200);
const api = new URL(process.env.API_URL ?? 'http://localhost:3000');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'microphone=(self), camera=()', 'X-Frame-Options': 'DENY' };

http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    const p = http.request({ hostname: api.hostname, port: api.port, path: req.url, method: req.method, headers: { ...req.headers, host: api.host, 'x-forwarded-for': req.socket.remoteAddress } }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { code: 'BAD_GATEWAY', message: 'The server is not reachable right now.' } })); });
    return req.pipe(p);
  }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  const ext = extname(file);
  const cache = ext === '.html' || file.endsWith('ngsw.json') || file.endsWith('ngsw-worker.js') || ext === '.webmanifest' ? 'no-cache' : /-[\w-]{8}\.(js|css)$/.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400';
  res.writeHead(200, { ...headers, 'content-type': types[ext] ?? 'application/octet-stream', 'cache-control': cache });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`FluentPath web on http://localhost:${port} → API ${api.origin}`));
