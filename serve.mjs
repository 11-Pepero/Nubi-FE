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

const server = createServer(async (request, response) => {
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
});

let port = 4173;
const lastPort = 4183;

server.on('error', error => {
  if (error.code !== 'EADDRINUSE') throw error;
  if (port === lastPort) {
    console.error(`Ports 4173–${lastPort} are already in use. Stop a development server and try again.`);
    process.exitCode = 1;
    return;
  }
  port += 1;
  server.listen(port, 'localhost');
});

server.on('listening', () => console.log(`http://localhost:${port}`));
server.listen(port, 'localhost');
