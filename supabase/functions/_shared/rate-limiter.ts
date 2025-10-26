import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  identifier: string; // user_id, ip, or custom key
}

export class RateLimiter {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  /**
   * Check if request is within rate limit
   * Returns true if allowed, false if rate limit exceeded
   */
  async checkLimit(config: RateLimitConfig): Promise<boolean> {
    const { identifier, maxRequests, windowSeconds } = config;
    const key = `rate_limit:${identifier}`;

    try {
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_key: key,
        p_max_requests: maxRequests,
        p_window_seconds: windowSeconds,
      });

      if (error) {
        console.error('Rate limit check error:', error);
        // Fail open - allow request on error
        return true;
      }

      return data === true;
    } catch (error) {
      console.error('Rate limiter exception:', error);
      // Fail open
      return true;
    }
  }

  /**
   * Common rate limit configurations
   */
  static configs = {
    // Strict limit for expensive operations
    strict: (identifier: string): RateLimitConfig => ({
      identifier,
      maxRequests: 10,
      windowSeconds: 60,
    }),
    
    // Standard API limit
    standard: (identifier: string): RateLimitConfig => ({
      identifier,
      maxRequests: 100,
      windowSeconds: 60,
    }),
    
    // Lenient for read operations
    lenient: (identifier: string): RateLimitConfig => ({
      identifier,
      maxRequests: 500,
      windowSeconds: 60,
    }),
    
    // Webhook specific
    webhook: (identifier: string): RateLimitConfig => ({
      identifier,
      maxRequests: 1000,
      windowSeconds: 60,
    }),
  };
}

/**
 * Middleware helper for edge functions
 */
export async function withRateLimit(
  req: Request,
  config: RateLimitConfig,
  handler: () => Promise<Response>
): Promise<Response> {
  const limiter = new RateLimiter();
  const isAllowed = await limiter.checkLimit(config);

  if (!isAllowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Maximum ${config.maxRequests} requests per ${config.windowSeconds} seconds`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': config.windowSeconds.toString(),
        },
      }
    );
  }

  return handler();
}
