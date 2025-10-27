import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EdgeFunctionError, ErrorCode } from './error-handling.ts';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

/**
 * Rate limiting using Supabase api_rate_limits table
 */
export class RateLimiter {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  /**
   * Check rate limit using atomic increment
   * Returns remaining requests or throws error
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ remaining: number; resetAt: Date }> {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
    const now = Date.now();

    try {
      // Use atomic RPC function for rate limiting
      const { data, error } = await this.supabase.rpc('increment_rate_limit', {
        p_key: key,
        p_window_start: new Date(now).toISOString(),
        p_max_requests: config.maxRequests,
        p_window_ms: config.windowMs
      });

      if (error) {
        console.error('Rate limit RPC error:', error);
        throw error;
      }

      const result = data as { exceeded: boolean; count: number; remaining?: number; reset_at: string };

      if (result.exceeded) {
        throw new EdgeFunctionError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs}ms`,
          429,
          {
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
            resetAt: result.reset_at,
          }
        );
      }

      return {
        remaining: result.remaining || 0,
        resetAt: new Date(result.reset_at),
      };
    } catch (error) {
      // If it's already an EdgeFunctionError, rethrow it
      if (error instanceof EdgeFunctionError) {
        throw error;
      }
      // For other errors, log and rethrow
      console.error('Rate limit check failed:', error);
      throw error;
    }
  }
}

/**
 * Middleware для rate limiting
 */
export function withRateLimit(config: RateLimitConfig) {
  return async (
    req: Request,
    identifier: string
  ): Promise<void> => {
    const limiter = new RateLimiter();
    const { remaining, resetAt } = await limiter.checkLimit(identifier, config);

    // Log rate limit info
    console.log(`Rate limit: ${remaining} remaining, resets at ${resetAt}`);
  };
}
