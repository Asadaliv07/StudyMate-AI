import http from 'node:http';
import { handleAiApiRequest } from './apiRouter.ts';

const port = Number(process.env.PORT) || 5174;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const handled = await handleAiApiRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Endpoint not found.' }));
  }
});

server.listen(port, () => {
  console.log(`StudyMate AI Standalone Server listening on http://localhost:${port}`);
});
