const fs = require('fs');
const path = require('path');

const backendAppPath = path.resolve(__dirname, '../../backend/src/app.js');

let localHandler = null;
if (fs.existsSync(backendAppPath)) {
  localHandler = require('../../../api/index.js');
}

module.exports = async (req, res) => {
  if (localHandler) {
    return localHandler(req, res);
  }

  const upstream = (process.env.BACKEND_URL || '').replace(/\/$/, '');
  if (!upstream) {
    return res.status(503).json({
      error:
        'Deploy from repository root (Root Directory = .) or configure BACKEND_URL in Vercel environment variables.',
    });
  }

  const targetUrl = `${upstream}${req.url}`;
  const headers = { ...req.headers };
  delete headers.host;

  const init = {
    method: req.method,
    headers,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) init.body = Buffer.concat(chunks);
  }

  const upstreamRes = await fetch(targetUrl, init);
  res.status(upstreamRes.status);
  upstreamRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'transfer-encoding') {
      res.setHeader(key, value);
    }
  });
  const arrayBuf = await upstreamRes.arrayBuffer();
  return res.send(Buffer.from(arrayBuf));
};
