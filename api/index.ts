import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  StructuredSummary,
  GeneratedQuiz,
  GeneratedQuizQuestion,
  QuizDifficulty,
  QuizSetupType,
  AiServiceStatus,
  AiApiErrorResponse,
} from '../src/types/index.ts';

/**
 * Vercel Serverless Function entrypoint for StudyMate AI.
 * Self-contained for Vercel deployment with multi-key pool, round-robin load balancing,
 * and rate-limit failover across all configured Gemini API keys.
 */

const MAX_NOTES_CHAR_LENGTH = 25000;
const MIN_NOTES_CHAR_LENGTH = 20;

interface KeyPoolEntry {
  key: string;
  masked: string;
  rateLimitedUntil: number;
}

class GeminiKeyPool {
  private entries: KeyPoolEntry[] = [];
  private pointer: number = 0;

  constructor() {
    this.refresh();
  }

  public refresh(): void {
    const rawKeys: string[] = [];

    // Comma/newline separated pool
    if (process.env.GEMINI_API_KEYS) {
      rawKeys.push(...process.env.GEMINI_API_KEYS.split(/[,;\n]+/).map((k) => k.trim()));
    }

    // Numbered keys GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    for (let i = 1; i <= 10; i++) {
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if (k) rawKeys.push(k.trim());
    }

    // Single key fallbacks
    if (process.env.GEMINI_API_KEY) {
      rawKeys.push(process.env.GEMINI_API_KEY.trim());
    }
    if (process.env.GOOGLE_API_KEY) {
      rawKeys.push(process.env.GOOGLE_API_KEY.trim());
    }

    const uniqueValid = Array.from(new Set(rawKeys)).filter(
      (k) => k && k.length > 5 && k !== 'your_gemini_api_key_here'
    );

    const now = Date.now();
    const existingLimits = new Map(this.entries.map((e) => [e.key, e.rateLimitedUntil]));

    this.entries = uniqueValid.map((key) => {
      const masked = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';
      const rateLimitedUntil = existingLimits.get(key) || 0;
      return {
        key,
        masked,
        rateLimitedUntil: rateLimitedUntil > now ? rateLimitedUntil : 0,
      };
    });
  }

  public getKeyCount(): number {
    this.refresh();
    return this.entries.length;
  }

  public getActiveCount(): number {
    this.refresh();
    const now = Date.now();
    return this.entries.filter((e) => e.rateLimitedUntil <= now).length;
  }

  public markRateLimited(key: string, cooldownMs: number = 60000): void {
    const entry = this.entries.find((e) => e.key === key);
    if (entry) {
      entry.rateLimitedUntil = Date.now() + cooldownMs;
    }
  }

  public async executeWithPool<T>(
    operation: (ai: GoogleGenAI, key: string, model: string) => Promise<T>,
    requestedModel?: string
  ): Promise<T> {
    this.refresh();
    if (this.entries.length === 0) {
      const error: AiApiErrorResponse = {
        error: 'API_KEY_NOT_CONFIGURED',
        code: 'MISSING_API_KEY',
        message:
          'Google Gemini API key is missing on the server. Please configure GEMINI_API_KEYS or GEMINI_API_KEY in your environment variables.',
        details: 'Get a free API key at https://aistudio.google.com/',
        isRetryable: false,
      };
      throw error;
    }

    const total = this.entries.length;
    let attempts = 0;
    let lastError: unknown = null;
    let currentModel = requestedModel || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    const startIndex = this.pointer;
    this.pointer = (this.pointer + 1) % total;

    for (let offset = 0; offset < total; offset++) {
      const idx = (startIndex + offset) % total;
      const entry = this.entries[idx];
      const now = Date.now();

      if (entry.rateLimitedUntil > now && attempts < total - 1) {
        continue;
      }

      attempts++;
      try {
        const client = new GoogleGenAI({ apiKey: entry.key });
        const result = await operation(client, entry.key, currentModel);
        entry.rateLimitedUntil = 0;
        return result;
      } catch (err: unknown) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);

        // Fallback to gemini-3.5-flash-lite if model not found
        if (errMsg.includes('404') && errMsg.includes('models/')) {
          currentModel = 'gemini-3.5-flash-lite';
          try {
            const client = new GoogleGenAI({ apiKey: entry.key });
            return await operation(client, entry.key, currentModel);
          } catch (modelRetryErr) {
            lastError = modelRetryErr;
          }
        }

        // Rate limit detected (HTTP 429 / quota): failover to next key in pool
        if (
          errMsg.includes('429') ||
          errMsg.toLowerCase().includes('resource exhausted') ||
          errMsg.toLowerCase().includes('quota')
        ) {
          this.markRateLimited(entry.key, 60000);
          continue;
        }

        // Auth failure: continue to next key
        if (errMsg.includes('403') || errMsg.includes('401') || errMsg.toLowerCase().includes('api key')) {
          continue;
        }

        break;
      }
    }

    throw mapGeminiError(lastError);
  }
}

const keyPool = new GeminiKeyPool();

function getAiConfigStatus(): AiServiceStatus {
  const count = keyPool.getKeyCount();
  const activeCount = keyPool.getActiveCount();
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  return {
    configured: count > 0,
    provider: 'gemini',
    model,
    message:
      count > 0
        ? `Google Gemini multi-key pool active (${count} keys configured, ${activeCount} active). Load balanced across keys.`
        : 'GEMINI_API_KEYS is not configured on the server. Configure your Gemini API keys in Vercel environment variables.',
  };
}

function mapGeminiError(err: unknown): AiApiErrorResponse {
  const errMsg = err instanceof Error ? err.message : String(err);

  if (errMsg.includes('429') || errMsg.toLowerCase().includes('resource exhausted') || errMsg.toLowerCase().includes('quota')) {
    return {
      error: 'RATE_LIMIT_EXCEEDED',
      code: 'RATE_LIMIT',
      message: 'All API keys in the pool have reached rate limits. Please wait a moment before trying again.',
      details: errMsg,
      isRetryable: true,
    };
  }

  if (errMsg.includes('403') || errMsg.includes('401') || errMsg.toLowerCase().includes('api key')) {
    return {
      error: 'AUTHENTICATION_FAILED',
      code: 'MISSING_API_KEY',
      message: 'Google Gemini API credentials invalid. Please check your GEMINI_API_KEYS variables.',
      details: 'Verify key at https://aistudio.google.com/',
      isRetryable: false,
    };
  }

  return {
    error: 'GEMINI_PROVIDER_ERROR',
    code: 'PROVIDER_ERROR',
    message: 'Failed to process request with AI model.',
    details: errMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, '***REDACTED***'),
    isRetryable: true,
  };
}

async function summarizeNotesWithGemini(
  notesText: string,
  title?: string,
  subject?: string
): Promise<StructuredSummary> {
  const cleanNotes = notesText ? notesText.trim() : '';
  if (!cleanNotes || cleanNotes.length < MIN_NOTES_CHAR_LENGTH) {
    throw {
      error: 'INVALID_INPUT',
      code: 'INVALID_REQUEST',
      message: `Notes must contain at least ${MIN_NOTES_CHAR_LENGTH} characters.`,
      isRetryable: false,
    } as AiApiErrorResponse;
  }

  if (cleanNotes.length > MAX_NOTES_CHAR_LENGTH) {
    throw {
      error: 'INPUT_TOO_LONG',
      code: 'INVALID_REQUEST',
      message: `Notes exceed maximum allowed length of ${MAX_NOTES_CHAR_LENGTH} characters.`,
      isRetryable: false,
    } as AiApiErrorResponse;
  }

  const systemInstruction = `You are StudyMate AI, an expert academic study assistant for university students.
Analyze the student notes and generate a structured academic summary strictly grounded in the text.`;

  const userPrompt = `Subject: ${subject || 'General Study'}
Document Title: ${title || 'Study Session Notes'}
=== STUDENT NOTES ===
${cleanNotes}
=== END NOTES ===`;

  return await keyPool.executeWithPool(async (ai, _key, model) => {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            overview: { type: Type.STRING },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            terms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING },
                },
                required: ['term', 'definition'],
              },
            },
            factsAndFormulas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['fact', 'formula', 'date'] },
                  label: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ['type', 'label', 'content'],
              },
            },
            takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['overview', 'keyPoints', 'terms', 'factsAndFormulas', 'takeaways'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const wordCount = cleanNotes.trim().split(/\s+/).filter(Boolean).length;
    const summaryWordCount = `${parsed.overview} ${parsed.keyPoints?.join(' ')}`.split(/\s+/).filter(Boolean).length;

    return {
      id: `summary-gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: title?.trim() || `${subject || 'Lecture'} Summary`,
      subject: subject?.trim() || 'General Studies',
      rawNotes: cleanNotes,
      overview: parsed.overview || '',
      keyPoints: parsed.keyPoints || [],
      terms: (parsed.terms || []).map((t: { term?: string; definition?: string }) => ({
        term: t.term || 'Term',
        definition: t.definition || 'Definition',
      })),
      factsAndFormulas: (parsed.factsAndFormulas || []).map(
        (f: { type?: string; label?: string; content?: string }) => ({
          type: (f.type === 'formula' || f.type === 'date' ? f.type : 'fact') as 'fact' | 'formula' | 'date',
          label: f.label || 'Fact',
          content: f.content || '',
        })
      ),
      takeaways: parsed.takeaways || [],
      wordCount,
      summaryWordCount,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isRuleBasedDemo: false,
      provider: 'gemini',
      modelName: model,
    };
  });
}

async function generateQuizWithGemini(
  notesText: string,
  subject: string,
  requestedCount: number,
  difficulty: QuizDifficulty,
  questionType: QuizSetupType
): Promise<GeneratedQuiz> {
  const cleanNotes = notesText ? notesText.trim() : '';
  if (!cleanNotes || cleanNotes.length < MIN_NOTES_CHAR_LENGTH) {
    throw {
      error: 'INVALID_INPUT',
      code: 'INVALID_REQUEST',
      message: `Notes must contain at least ${MIN_NOTES_CHAR_LENGTH} characters.`,
      isRetryable: false,
    } as AiApiErrorResponse;
  }

  const safeCount = Math.min(Math.max(1, requestedCount || 5), 15);

  const systemInstruction = `You are StudyMate AI, an expert academic quiz architect.
Generate pedagogical practice questions strictly grounded in the provided notes text.`;

  const userPrompt = `Subject: ${subject}
Requested Questions: ${safeCount}
Difficulty: ${difficulty}
Question Type: ${questionType}
=== STUDENT NOTES ===
${cleanNotes}
=== END NOTES ===`;

  return await keyPool.executeWithPool(async (ai, _key, model) => {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            explanationOfCount: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['multiple_choice', 'true_false'] },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  groundedExcerpt: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard'] },
                },
                required: [
                  'type',
                  'question',
                  'options',
                  'correctAnswerIndex',
                  'explanation',
                  'groundedExcerpt',
                  'difficulty',
                ],
              },
            },
          },
          required: ['title', 'questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const rawQuestions: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];

    const questions: GeneratedQuizQuestion[] = rawQuestions.map((q, i) => {
      const qType = q.type === 'true_false' ? 'true_false' : 'multiple_choice';
      let options = Array.isArray(q.options) ? q.options.map(String) : [];
      if (qType === 'true_false') {
        options = ['True', 'False'];
      } else {
        while (options.length < 4) options.push(`Option ${options.length + 1}`);
        options = options.slice(0, 4);
      }
      let correctIndex = Number.isInteger(q.correctAnswerIndex) ? q.correctAnswerIndex : 0;
      if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

      return {
        id: `q-gemini-${Date.now()}-${i + 1}`,
        type: qType,
        question: String(q.question),
        options,
        correctAnswerIndex: correctIndex,
        explanation: String(q.explanation || 'Based on notes.'),
        groundedExcerpt: String(q.groundedExcerpt || cleanNotes.slice(0, 100)),
        difficulty: (['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : difficulty) as QuizDifficulty,
      };
    });

    return {
      id: `quiz-gemini-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: parsed.title || `${subject}: Practice Quiz`,
      subject,
      sourceNotes: cleanNotes,
      questions,
      difficulty,
      questionType,
      requestedCount: safeCount,
      actualCount: questions.length,
      explanationOfCount: parsed.explanationOfCount,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isRuleBasedDemo: false,
      provider: 'gemini',
      modelName: model,
    };
  });
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw || !raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';

  // GET /api/ai/status or /api/status or health
  if (req.method === 'GET' && (url.includes('status') || url.includes('health'))) {
    res.statusCode = 200;
    res.end(JSON.stringify(getAiConfigStatus()));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST supported.' }));
    return;
  }

  let bodyData: Record<string, unknown> = {};
  try {
    bodyData = await readJsonBody(req);
  } catch (err) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Payload must be valid JSON', details: String(err) }));
    return;
  }

  if (url.includes('summarize')) {
    const notesText = typeof bodyData.notesText === 'string' ? bodyData.notesText : '';
    const title = typeof bodyData.title === 'string' ? bodyData.title : undefined;
    const subject = typeof bodyData.subject === 'string' ? bodyData.subject : undefined;

    try {
      const summary = await summarizeNotesWithGemini(notesText, title, subject);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, summary }));
    } catch (err: any) {
      res.statusCode = err?.code === 'MISSING_API_KEY' ? 503 : 400;
      res.end(JSON.stringify(err));
    }
    return;
  }

  if (url.includes('quiz')) {
    const notesText = typeof bodyData.notesText === 'string' ? bodyData.notesText : '';
    const subject = typeof bodyData.subject === 'string' ? bodyData.subject : 'General Studies';
    const requestedCount = typeof bodyData.requestedCount === 'number' ? bodyData.requestedCount : 5;
    const difficulty = (typeof bodyData.difficulty === 'string' ? bodyData.difficulty : 'Medium') as QuizDifficulty;
    const questionType = (typeof bodyData.questionType === 'string' ? bodyData.questionType : 'mixed') as QuizSetupType;

    try {
      const quiz = await generateQuizWithGemini(notesText, subject, requestedCount, difficulty, questionType);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, quiz }));
    } catch (err: any) {
      res.statusCode = err?.code === 'MISSING_API_KEY' ? 503 : 400;
      res.end(JSON.stringify(err));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'API route not found' }));
}
