import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Idempotency key manager
 * Prevents duplicate operations (webhooks, payments, etc.)
 */
export class IdempotencyManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  /**
   * Check if operation already executed
   */
  async checkKey(
    idempotencyKey: string,
    ttlSeconds: number = 86400 // 24 hours
  ): Promise<{ exists: boolean; result?: any }> {
    const { data, error } = await this.supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      // Check if expired
      const expiresAt = new Date(data.created_at);
      expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

      if (new Date() > expiresAt) {
        // Expired, delete and allow retry
        await this.supabase
          .from('idempotency_keys')
          .delete()
          .eq('key', idempotencyKey);

        return { exists: false };
      }

      // Return cached result
      return {
        exists: true,
        result: data.result,
      };
    }

    return { exists: false };
  }

  /**
   * Store operation result
   */
  async storeResult(
    idempotencyKey: string,
    result: any
  ): Promise<void> {
    await this.supabase
      .from('idempotency_keys')
      .insert({
        key: idempotencyKey,
        result,
      });
  }
}

/**
 * Middleware для idempotency
 */
export async function withIdempotency<T>(
  req: Request,
  handler: () => Promise<T>
): Promise<T> {
  const idempotencyKey = req.headers.get('x-idempotency-key');

  if (!idempotencyKey) {
    // No key provided, execute normally
    return await handler();
  }

  const manager = new IdempotencyManager();
  const { exists, result } = await manager.checkKey(idempotencyKey);

  if (exists) {
    // Return cached result
    console.log(`Idempotency: Returning cached result for key ${idempotencyKey}`);
    return result as T;
  }

  // Execute handler
  const newResult = await handler();

  // Store result
  await manager.storeResult(idempotencyKey, newResult);

  return newResult;
}
