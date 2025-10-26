import { jsonResponse } from './cors.ts';
import { logError } from './monitoring.ts';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  TIMEOUT = 'TIMEOUT',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
}

/**
 * Custom error class
 */
export class EdgeFunctionError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * Global error handler
 */
export async function handleError(
  error: unknown,
  requestId?: string
): Promise<Response> {
  // Log error
  await logError(error, { requestId });

  // Convert to EdgeFunctionError
  let edgeError: EdgeFunctionError;

  if (error instanceof EdgeFunctionError) {
    edgeError = error;
  } else if (error instanceof Error) {
    edgeError = new EdgeFunctionError(
      ErrorCode.INTERNAL_ERROR,
      error.message,
      500,
      { stack: error.stack }
    );
  } else {
    edgeError = new EdgeFunctionError(
      ErrorCode.INTERNAL_ERROR,
      'An unknown error occurred',
      500
    );
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    error: {
      code: edgeError.code,
      message: edgeError.message,
      details: edgeError.details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return jsonResponse(errorResponse, edgeError.statusCode);
}

/**
 * Wrapper для async handlers с error handling
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    
    try {
      return await handler(req);
    } catch (error) {
      return await handleError(error, requestId);
    }
  };
}
