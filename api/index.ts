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

const MAX_NOTES_CHAR_LENGTH = 25000;
const MIN_NOTES_CHAR_LENGTH = 20;

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

function getAiConfigStatus(): AiServiceStatus {
  const apiKey = getApiKey();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  return {
    configured: Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'your_gemini_api_key_here'),
    provider: 'gemini',
    model,
    message: apiKey
      ? 'Google Gemini API is configured and operational.'
      : 'GEMINI_API_KEY is not configured on the server. Real AI features require setting this environment variable.',
  };
}

function createGeminiClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey || apiKey.trim().length === 0 || apiKey === 'your_gemini_api_key_here') {
    const error: AiApiErrorResponse = {
      error: 'API_KEY_NOT_CONFIGURED',
      code: 'MISSING_API_KEY',
      message:
        'Google Gemini API key is missing on the server. Please configure GEMINI_API_KEY in your Vercel project environment variables.',
      details: 'Get a free API key at https://aistudio.google.com/',
      isRetryable: false,
    };
    throw error;
  }
  return new GoogleGenAI({ apiKey });
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

  const ai = createGeminiClient();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const systemInstruction = `You are StudyMate AI, an expert academic study assistant for university students.
Analyze the student notes and generate a structured academic summary strictly grounded in the text.`;

  const userPrompt = `Subject: ${subject || 'General Study'}
Document Title: ${title || 'Study Session Notes'}
=== STUDENT NOTES ===
${cleanNotes}
=== END NOTES ===`;

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
      (f: { type?: 'fact' | 'formula' | 'date'; label?: string; content?: string }) => ({
        type: (['fact', 'formula', 'date'].includes(f.type || '') ? f.type : 'fact') as 'fact' | 'formula' | 'date',
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
}

async function generateQuizWithGemini(
  notesText: string,
  subject: string,
  requestedCount: number = 5,
  difficulty: QuizDifficulty = 'Medium',
  questionType: QuizSetupType = 'mixed'
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

  const ai = createGeminiClient();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const userPrompt = `Subject: ${subject}
Requested Questions: ${requestedCount}
Difficulty: ${difficulty}
Format: ${questionType}

Notes:
${cleanNotes}`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: 'Generate active-recall practice questions strictly grounded in the supplied notes.',
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
              required: ['type', 'question', 'options', 'correctAnswerIndex', 'explanation', 'groundedExcerpt'],
            },
          },
        },
        required: ['title', 'questions'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

  const questions: GeneratedQuizQuestion[] = rawQuestions.map((q: any, i: number) => {
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
    requestedCount,
    actualCount: questions.length,
    explanationOfCount: parsed.explanationOfCount,
    createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isRuleBasedDemo: false,
    provider: 'gemini',
    modelName: model,
  };
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';

  // GET /api/ai/status or /api/status
  if (req.method === 'GET' && (url.includes('status') || url.includes('health'))) {
    res.statusCode = 200;
    res.end(JSON.stringify(getAiConfigStatus()));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
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
  res.end(JSON.stringify({ error: 'NOT_FOUND', message: 'Route not found' }));
}
