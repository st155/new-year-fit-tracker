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
   * Check rate limit
   * Returns remaining requests or throws error
   */
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{ remaining: number; resetAt: Date }> {
    const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create rate limit record
    const { data, error } = await this.supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    let currentCount = 0;
    let resetAt = new Date(now + config.windowMs);

    if (data) {
      // Check if window expired
      const windowStartTime = new Date(data.window_start).getTime();
      if (windowStartTime < windowStart) {
        // Reset window
        currentCount = 1;
        await this.supabase
          .from('rate_limits')
          .update({
            count: 1,
            window_start: new Date(now).toISOString(),
          })
          .eq('key', key);
      } else {
        // Increment count
        currentCount = data.count + 1;
        
        if (currentCount > config.maxRequests) {
          throw new EdgeFunctionError(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs}ms`,
            429,
            {
              maxRequests: config.maxRequests,
              windowMs: config.windowMs,
              resetAt: new Date(windowStartTime + config.windowMs).toISOString(),
            }
          );
        }

        await this.supabase
          .from('rate_limits')
          .update({ 
            count: currentCount,
          })
          .eq('key', key);

        resetAt = new Date(windowStartTime + config.windowMs);
      }
    } else {
      // Create new record
      currentCount = 1;
      await this.supabase
        .from('rate_limits')
        .insert({
          key: key,
          count: 1,
          window_start: new Date(now).toISOString(),
        });
    }

    return {
      remaining: config.maxRequests - currentCount,
      resetAt,
    };
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
