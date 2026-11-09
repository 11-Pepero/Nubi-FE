import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const pages = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/mock-data.js', ['mock-data.js', 'text/javascript']],
  ['/nubi-logo.png', ['nubi-logo.png', 'image/png']],
]);

createServer(async (request, response) => {
  const [filename, type] = pages.get(new URL(request.url, 'http://localhost').pathname) ?? [];
  if (!filename || !['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const contents = await readFile(new URL(filename, import.meta.url));
    response.writeHead(200, { 'Content-Type': type.startsWith('image/') ? type : `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch {
    response.writeHead(500).end();
  }
}).listen(4173, 'localhost', () => console.log('http://localhost:4173'));
