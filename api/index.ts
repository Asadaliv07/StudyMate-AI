import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleAiApiRequest } from '../server/apiRouter.ts';

/**
 * Vercel Serverless Function entrypoint for StudyMate AI.
 * Routes /api/ai/status, /api/ai/summarize, and /api/ai/quiz
 * with multi-key pooling, round-robin load balancing, and rate-limit failover.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const handled = await handleAiApiRequest(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'API route not found' }));
  }
}
