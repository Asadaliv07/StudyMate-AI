import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getAiConfigStatus,
  summarizeNotesWithGemini,
  generateQuizWithGemini,
  MAX_NOTES_CHAR_LENGTH,
} from './geminiService.ts';
import type { QuizDifficulty, QuizSetupType } from '../src/types/index.ts';

/**
 * Handles incoming HTTP requests for /api/ai/* routes.
 * Compatible with Connect middleware (Vite dev server) and Node HTTP servers.
 */
export async function handleAiApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/ai') && !url.startsWith('/api')) {
    return false;
  }

  // Set standard API headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // Handle GET /api/ai/status or /api/status or health
  const isStatusOrHealth =
    url.includes('status') ||
    url.includes('health');

  if (req.method === 'GET' && isStatusOrHealth) {
    try {
      const status = getAiConfigStatus();
      res.statusCode = 200;
      res.end(JSON.stringify(status));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'STATUS_CHECK_FAILED', message: String(e) }));
    }
    return true;
  }

  // Only POST is allowed for generation endpoints
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported for this route.' }));
    return true;
  }

  // Parse body
  let bodyData: Record<string, unknown> = {};
  try {
    bodyData = await readJsonBody(req);
  } catch (err) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({
        error: 'INVALID_JSON',
        code: 'INVALID_REQUEST',
        message: 'Request payload must be valid JSON.',
        details: String(err),
      })
    );
    return true;
  }

  // Route: POST /api/ai/summarize or /api/summarize
  if (url.includes('summarize')) {
    const notesText = typeof bodyData.notesText === 'string' ? bodyData.notesText : '';
    const title = typeof bodyData.title === 'string' ? bodyData.title : undefined;
    const subject = typeof bodyData.subject === 'string' ? bodyData.subject : undefined;

    if (!notesText.trim()) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: 'MISSING_NOTES',
          code: 'INVALID_REQUEST',
          message: 'Please provide study notes to summarize.',
          isRetryable: false,
        })
      );
      return true;
    }

    if (notesText.length > MAX_NOTES_CHAR_LENGTH) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: 'INPUT_TOO_LONG',
          code: 'INVALID_REQUEST',
          message: `Notes exceed the maximum length of ${MAX_NOTES_CHAR_LENGTH} characters.`,
          isRetryable: false,
        })
      );
      return true;
    }

    try {
      const summary = await summarizeNotesWithGemini(notesText, title, subject);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, summary }));
    } catch (err: unknown) {
      sendErrorResponse(res, err);
    }
    return true;
  }

  // Route: POST /api/ai/quiz or /api/quiz
  if (url.includes('quiz')) {
    const notesText = typeof bodyData.notesText === 'string' ? bodyData.notesText : '';
    const subject = typeof bodyData.subject === 'string' ? bodyData.subject : 'General Studies';
    const requestedCount = typeof bodyData.requestedCount === 'number' ? bodyData.requestedCount : 5;
    const difficulty = (typeof bodyData.difficulty === 'string' ? bodyData.difficulty : 'Medium') as QuizDifficulty;
    const questionType = (typeof bodyData.questionType === 'string' ? bodyData.questionType : 'mixed') as QuizSetupType;

    if (!notesText.trim()) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: 'MISSING_NOTES',
          code: 'INVALID_REQUEST',
          message: 'Please provide study notes to generate practice questions.',
          isRetryable: false,
        })
      );
      return true;
    }

    if (notesText.length > MAX_NOTES_CHAR_LENGTH) {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: 'INPUT_TOO_LONG',
          code: 'INVALID_REQUEST',
          message: `Notes exceed the maximum length of ${MAX_NOTES_CHAR_LENGTH} characters.`,
          isRetryable: false,
        })
      );
      return true;
    }

    try {
      const quiz = await generateQuizWithGemini(notesText, subject, requestedCount, difficulty, questionType);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, quiz }));
    } catch (err: unknown) {
      sendErrorResponse(res, err);
    }
    return true;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'API route not found' }));
  return true;
}

/**
 * Safely reads and parses the JSON request body stream with a 2MB size cap.
 */
function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    const maxBytes = 2 * 1024 * 1024; // 2MB safety limit

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('Request payload exceeds size limit (2MB)'));
      }
    });

    req.on('end', () => {
      if (!raw || !raw.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(typeof parsed === 'object' && parsed !== null ? parsed : {});
      } catch (e) {
        reject(e);
      }
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Maps errors to clean HTTP error statuses without leaking system secrets.
 */
function sendErrorResponse(res: ServerResponse, err: unknown) {
  const errObj = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>;
  const code = typeof errObj.code === 'string' ? errObj.code : 'PROVIDER_ERROR';
  const message = typeof errObj.message === 'string' ? errObj.message : 'An unexpected error occurred.';
  const details = typeof errObj.details === 'string' ? errObj.details : undefined;
  const isRetryable = typeof errObj.isRetryable === 'boolean' ? errObj.isRetryable : true;

  let statusCode = 500;
  if (code === 'MISSING_API_KEY') statusCode = 503;
  else if (code === 'RATE_LIMIT') statusCode = 429;
  else if (code === 'INVALID_REQUEST') statusCode = 400;

  res.statusCode = statusCode;
  res.end(
    JSON.stringify({
      error: errObj.error || 'AI_SERVICE_ERROR',
      code,
      message,
      details,
      isRetryable,
    })
  );
}
