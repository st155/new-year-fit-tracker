/**
 * Unified Edge Function Handler
 * 
 * Provides:
 * - Automatic CORS handling
 * - Consistent error responses
 * - Request logging
 * - Authentication helpers
 */

import { createServiceClient, createAuthClient, getAuthenticatedUser } from './supabase-client.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface HandlerContext {
  req: Request;
  supabase: ReturnType<typeof createServiceClient>;
  authSupabase?: ReturnType<typeof createAuthClient>;
  user?: { id: string; email?: string };
}

export interface HandlerOptions {
  requireAuth?: boolean;
  logRequests?: boolean;
}

type HandlerFunction = (ctx: HandlerContext) => Promise<Response>;

/**
 * JSON response helper
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Error response helper
 */
export function errorResponse(error: unknown, status = 500): Response {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[EdgeFunction Error]', message);
  
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Main handler wrapper
 * 
 * Usage:
 * ```ts
 * import { withHandler, jsonResponse } from '../_shared/handler.ts';
 * 
 * Deno.serve(withHandler(async ({ req, supabase, user }) => {
 *   const { data } = await req.json();
 *   // ... your logic
 *   return jsonResponse({ success: true });
 * }, { requireAuth: true }));
 * ```
 */
export function withHandler(fn: HandlerFunction, options: HandlerOptions = {}) {
  const { requireAuth = false, logRequests = true } = options;

  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (logRequests) {
      console.log(`[${req.method}] ${url.pathname}`);
    }

    try {
      const supabase = createServiceClient();
      const ctx: HandlerContext = { req, supabase };

      // Handle authentication if required
      if (requireAuth) {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return errorResponse('Missing authorization header', 401);
        }

        try {
          ctx.user = await getAuthenticatedUser(authHeader);
          ctx.authSupabase = createAuthClient(authHeader);
        } catch {
          return errorResponse('Unauthorized', 401);
        }
      }

      const response = await fn(ctx);
      
      if (logRequests) {
        console.log(`[${req.method}] ${url.pathname} - ${Date.now() - startTime}ms`);
      }

      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Shorthand for authenticated handlers
 */
export function withAuth(fn: HandlerFunction) {
  return withHandler(fn, { requireAuth: true });
}

/**
 * Parse JSON body with error handling
 */
export async function parseBody<T>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Rate limiting helper (simple in-memory)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string, 
  maxRequests: number, 
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
