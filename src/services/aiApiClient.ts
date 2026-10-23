import type {
  StructuredSummary,
  GeneratedQuiz,
  QuizDifficulty,
  QuizSetupType,
  AiServiceStatus,
  AiApiErrorResponse,
} from '../types/index.ts';

/**
 * Client-Side API Service for StudyMate AI.
 * Communicates strictly with our server-side API (/api/ai/*).
 * Zero API keys or secrets are stored or transmitted from the browser.
 */

export class AiClientError extends Error {
  code: string;
  details?: string;
  isRetryable: boolean;

  constructor(message: string, code: string, details?: string, isRetryable = true) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
    this.details = details;
    this.isRetryable = isRetryable;
  }
}

/**
 * Checks the operational status of the server-side AI provider.
 */
export async function fetchAiServiceStatus(): Promise<AiServiceStatus> {
  try {
    const res = await fetch('/api/ai/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return {
        configured: false,
        provider: 'none',
        model: 'unknown',
        message: 'Could not communicate with server-side AI health check.',
      };
    }

    return (await res.json()) as AiServiceStatus;
  } catch (err) {
    return {
      configured: false,
      provider: 'none',
      model: 'unknown',
      message: err instanceof Error ? err.message : 'Network failure reaching API status.',
    };
  }
}

/**
 * Requests structured notes summarization from the server-side Gemini service.
 */
export async function summarizeNotesWithServerAi(
  notesText: string,
  title?: string,
  subject?: string
): Promise<StructuredSummary> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

  try {
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ notesText, title, subject }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errData = data as AiApiErrorResponse;
      throw new AiClientError(
        errData.message || 'Failed to generate AI summary from server.',
        errData.code || 'PROVIDER_ERROR',
        errData.details,
        errData.isRetryable ?? true
      );
    }

    return data.summary as StructuredSummary;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof AiClientError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiClientError(
        'AI request timed out after 35 seconds. The server or AI provider is taking longer than expected.',
        'TIMEOUT',
        'Request aborted due to timeout.',
        true
      );
    }

    throw new AiClientError(
      'Unable to connect to StudyMate AI server. Please check your network connection or verify the server is running.',
      'NETWORK_ERROR',
      err instanceof Error ? err.message : String(err),
      true
    );
  }
}

/**
 * Requests grounded practice quiz generation from the server-side Gemini service.
 */
export async function generateQuizWithServerAi(
  notesText: string,
  subject: string,
  requestedCount: number = 5,
  difficulty: QuizDifficulty = 'Medium',
  questionType: QuizSetupType = 'mixed'
): Promise<GeneratedQuiz> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for quiz generation

  try {
    const response = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        notesText,
        subject,
        requestedCount,
        difficulty,
        questionType,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errData = data as AiApiErrorResponse;
      throw new AiClientError(
        errData.message || 'Failed to generate AI practice quiz from server.',
        errData.code || 'PROVIDER_ERROR',
        errData.details,
        errData.isRetryable ?? true
      );
    }

    return data.quiz as GeneratedQuiz;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof AiClientError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiClientError(
        'Quiz generation request timed out after 45 seconds. Please try with shorter notes or fewer questions.',
        'TIMEOUT',
        'Request aborted due to timeout.',
        true
      );
    }

    throw new AiClientError(
      'Unable to connect to StudyMate AI server. Please check your network connection or verify the server is running.',
      'NETWORK_ERROR',
      err instanceof Error ? err.message : String(err),
      true
    );
  }
}
