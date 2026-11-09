// Lightweight local HTTP redirect proxy from 5173 to 5174
const http = require('http');

const server = http.createServer((req, res) => {
  const target = 'http://localhost:5174' + (req.url || '/');
  res.writeHead(307, {
    'Location': target,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(`Redirecting to ${target}`);
});

server.listen(5173, 'localhost', () => {
  console.log('Redirect proxy listening on http://localhost:5173 -> http://localhost:5174');
});

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error('Redirect proxy error:', err);
  }
});
