const { WebSocket, WebSocketServer } = require('ws');

const connections = new Map();

function broadcastProgress(chapterId, progress) {
  const clients = connections.get(chapterId);
  if (!clients) return;

  const payload = JSON.stringify(progress);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        clients.delete(client);
      }
    } else {
      clients.delete(client);
    }
  }
}

function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    const match = url.match(/^\/api\/ws\/progress\/([^/?]+)/);

    if (match) {
      const chapterId = match[1];
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, chapterId);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, _req, chapterId) => {
    if (!connections.has(chapterId)) {
      connections.set(chapterId, new Set());
    }
    connections.get(chapterId).add(ws);

    console.log(`[WS] Client connected for chapter ${chapterId}`);

    ws.on('message', (message) => {
      if (message.toString() === 'ping') {
        ws.send('pong');
      }
    });

    ws.on('close', () => {
      const set = connections.get(chapterId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) connections.delete(chapterId);
      }
      console.log(`[WS] Client disconnected for chapter ${chapterId}`);
    });
  });

  return wss;
}

module.exports = {
  broadcastProgress,
  setupWebSocketServer,
};
