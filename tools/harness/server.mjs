// Static server for the harness: /ext → this repo, /harness → this folder
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const roots = { '/ext/': process.env.EXT_DIR || path.resolve(here, '../..'), '/harness/': here };
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.md': 'text/markdown', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
export function serve(port = 0) {
    const srv = http.createServer((req, res) => {
        let u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (u === '/') u = '/harness/index.html';
        const pre = Object.keys(roots).find(k => u.startsWith(k));
        const file = pre ? path.join(roots[pre], u.slice(pre.length)) : null;
        if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(r => srv.listen(port, '127.0.0.1', () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) serve(8123).then(() => console.log('http://127.0.0.1:8123/'));
