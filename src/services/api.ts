/**
 * Base API Client architecture.
 * Ready for future backend integration (FastAPI, Express, or Next.js serverless functions).
 */

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function simulatedApiDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
