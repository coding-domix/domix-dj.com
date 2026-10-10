// Local audit server only: identical cache/compression behavior for both revisions.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
for (const [port, directory] of [[4173, path.join(root, 'output/playwright/baseline-site')], [4174, root]]) {
  http.createServer((req, res) => {
    let file;
    try { file = path.resolve(directory, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); } catch { res.writeHead(400).end(); return; }
    if (!file.startsWith(directory + path.sep) && file !== directory) { res.writeHead(403).end(); return; }
    if (file === directory) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    let data = fs.readFileSync(file);
    const ext = path.extname(file);
    const headers = { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=600', 'Accept-Ranges': 'bytes' };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    let status = 200;
    if (range) {
      const start = Number(range[1]), end = Math.min(Number(range[2] || data.length - 1), data.length - 1);
      if (start > end) { res.writeHead(416).end(); return; }
      headers['Content-Range'] = `bytes ${start}-${end}/${data.length}`;
      data = data.subarray(start, end + 1); status = 206;
    } else if (['.html', '.css', '.js', '.svg'].includes(ext) && req.headers['accept-encoding']?.includes('gzip')) {
      data = gzipSync(data); headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding';
    }
    headers['Content-Length'] = data.length;
    res.writeHead(status, headers).end(req.method === 'HEAD' ? undefined : data);
  }).listen(port, '127.0.0.1', () => console.log(`Audit server: http://127.0.0.1:${port}`));
}
