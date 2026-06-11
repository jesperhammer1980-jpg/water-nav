'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8'
};

http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(root, `.${pathname}`);
    if (!file.toLowerCase().startsWith(root.toLowerCase())) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404');
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(error));
  }
}).listen(port, host, () => {
  console.log(`WaterNav static server: http://${host}:${port}/`);
});
