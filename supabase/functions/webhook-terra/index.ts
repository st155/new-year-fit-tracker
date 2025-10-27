import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { withErrorHandling, EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';
import { Logger } from '../_shared/monitoring.ts';
import { IdempotencyManager } from '../_shared/idempotency.ts';
import { withRateLimit } from '../_shared/rate-limiting.ts';
import { JobQueue, JobType } from '../_shared/background-jobs.ts';

const logger = new Logger('webhook-terra');

interface TerraWebhookPayload {
  type: string;
  user?: {
    user_id: string;
    provider: string;
    reference_id?: string;
    scopes?: string[];
    active?: boolean;
    created_at?: string;
  };
  reference_id?: string;
  data?: any;
  old_user?: {
    user_id: string;
  };
  new_user?: {
    user_id: string;
    provider: string;
    reference_id?: string;
    scopes?: string[];
    active?: boolean;
  };
}

Deno.serve(
  withErrorHandling(async (req: Request) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Handle GET/HEAD for health checks
    if (req.method === 'GET' || req.method === 'HEAD') {
      const message = req.method === 'HEAD' ? null : JSON.stringify({ 
        ok: true, 
        message: 'Terra webhook endpoint is live. Send signed POST webhooks here.' 
      });
      return new Response(message, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        'Method not allowed',
        405
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read raw body for signature verification
    const rawBody = await req.text();
    logger.info('Webhook received', { 
      bodyLength: rawBody.length,
      headers: {
        provider: req.headers.get('dev-id'),
        type: req.headers.get('type'),
      }
    });

    // Get Terra signature from headers
    const signature = req.headers.get('terra-signature') || req.headers.get('x-terra-signature');
    if (!signature) {
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        'Missing Terra signature',
        401
      );
    }

    // Verify signature
    const isValid = await verifyTerraSignature(rawBody, signature);
    if (!isValid) {
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid signature',
        401
      );
    }

    logger.info('Signature verified successfully');

    // Parse the payload
    const payload: TerraWebhookPayload = JSON.parse(rawBody);
    logger.info('Valid Terra webhook', {
      type: payload.type,
      userId: payload.user?.user_id,
      provider: payload.user?.provider,
    });

    // Generate webhook ID for idempotency
    const webhookId = payload.reference_id || crypto.randomUUID();

    // Check idempotency
    const idempotency = new IdempotencyManager();
    const { exists, result } = await idempotency.checkKey(webhookId, 3600); // 1 hour TTL

    if (exists) {
      logger.info('Duplicate webhook ignored', { webhookId });
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For data webhooks (activity, body, sleep, daily, nutrition, athlete), respond immediately
    const dataWebhookTypes = ['activity', 'body', 'sleep', 'daily', 'nutrition', 'athlete'];

    if (dataWebhookTypes.includes(payload.type)) {
      const response = {
        success: true,
        queued: true,
        webhookId,
        type: payload.type,
      };

      // Store idempotency result
      await idempotency.storeResult(webhookId, response);

      // Process everything in background
      EdgeRuntime.waitUntil(
        (async () => {
          const startTime = Date.now();
          
          // Store raw webhook
          try {
            const { error: insertError } = await supabase.from('terra_webhooks_raw').insert({
              webhook_id: webhookId,
              type: payload.type,
              user_id: payload.user?.user_id,
              provider: payload.user?.provider,
              payload: payload,
              status: 'pending',
            });

            if (insertError) {
              logger.error('Failed to store raw webhook', {
                error: insertError.message,
                webhookId,
              });
            } else {
              logger.info('Raw webhook stored', { 
                webhookId, 
                type: payload.type,
                duration_ms: Date.now() - startTime 
              });
            }
          } catch (e) {
            logger.error('Exception storing raw webhook', {
              error: e instanceof Error ? e.message : String(e),
              webhookId,
            });
          }

          // Rate limiting (soft check, doesn't block)
          const identifier = payload.user?.user_id || 'anonymous';
          try {
            await withRateLimit({
              maxRequests: 100,
              windowMs: 60000,
              keyPrefix: 'terra_webhook',
            })(req, identifier);
          } catch (e) {
            logger.error('Rate limiting failed', {
              error: e instanceof Error ? e.message : String(e),
              identifier,
            });
          }

          // Update terra_tokens with last_sync_date
          if (payload.user?.user_id && payload.user?.provider) {
            const provider = payload.user.provider.toUpperCase();
            const terraUserId = payload.user.user_id;
            
            try {
              const { data: updated, error: updateError } = await withTimeout(
                supabase
                  .from('terra_tokens')
                  .update({ 
                    last_sync_date: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('terra_user_id', terraUserId)
                  .eq('is_active', true)
                  .select('id'),
                2000
              );

              if (updateError) {
                logger.warn('Failed to update last_sync_date', { 
                  error: updateError.message,
                  terraUserId 
                });
              } else if (!updated || updated.length === 0) {
                // Try linking by provider
                const { data: nullToken } = await withTimeout(
                  supabase
                    .from('terra_tokens')
                    .select('id, user_id')
                    .eq('provider', provider)
                    .eq('is_active', true)
                    .is('terra_user_id', null)
                    .maybeSingle(),
                  2000
                );

                if (nullToken) {
                  logger.info('Linking terra_user_id from data webhook', {
                    userId: nullToken.user_id,
                    provider,
                    terraUserId
                  });
                  
                  await withTimeout(
                    supabase
                      .from('terra_tokens')
                      .update({
                        terra_user_id: terraUserId,
                        last_sync_date: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', nullToken.id),
                    2000
                  );
                }
              } else {
                logger.info('Updated last_sync_date', { 
                  terraUserId, 
                  type: payload.type,
                  duration_ms: Date.now() - startTime
                });
              }
            } catch (e) {
              logger.warn('Background terra_tokens update failed', {
                error: e instanceof Error ? e.message : String(e),
                terraUserId,
              });
            }
          }

          // Enqueue job for processing
          try {
            const jobQueue = new JobQueue();
            const job = await jobQueue.enqueue(
              JobType.WEBHOOK_PROCESSING,
              {
                webhookId,
                payload,
              },
              {
                maxAttempts: 3,
              }
            );

            logger.info('Webhook processing enqueued', {
              webhookId,
              type: payload.type,
              jobId: job.id,
              duration_ms: Date.now() - startTime
            });

            // Update webhook status
            await supabase
              .from('terra_webhooks_raw')
              .update({ 
                status: 'enqueued', 
                job_id: job.id 
              })
              .eq('webhook_id', webhookId);

            // Trigger job-worker
            supabase.functions.invoke('job-worker').catch((e: Error) => {
              logger.warn('Failed to trigger job-worker', { error: e.message });
            });
          } catch (e) {
            logger.error('Failed to enqueue job', {
              error: e instanceof Error ? e.message : String(e),
              webhookId,
            });
          }

          // Log webhook receipt
          let userId = null;
          if (payload.user?.user_id) {
            try {
              const { data: tokenData } = await withTimeout(
                supabase
                  .from('terra_tokens')
                  .select('user_id')
                  .eq('terra_user_id', payload.user.user_id)
                  .eq('is_active', true)
                  .maybeSingle(),
                2000
              );
              userId = tokenData?.user_id || null;
            } catch (e) {
              // Ignore
            }
          }

          await supabase.from('webhook_logs').insert({
            webhook_type: 'terra',
            event_type: payload.type,
            terra_user_id: payload.user?.user_id || null,
            user_id: userId,
            payload: payload,
            status: 'received',
            created_at: new Date().toISOString()
          });

          logger.info('Background processing completed', {
            webhookId,
            total_duration_ms: Date.now() - startTime
          });
        })()
      );

      // Return immediate response to Terra
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For non-data webhooks (auth, healthcheck, reauth), keep synchronous processing
    // Rate limiting with fallback
    const identifier = payload.user?.user_id || 'anonymous';
    try {
      await withRateLimit({
        maxRequests: 100,
        windowMs: 60000,
        keyPrefix: 'terra_webhook',
      })(req, identifier);
    } catch (e) {
      logger.error('Rate limiting failed, continuing', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Store raw webhook
    let rawWebhookStored = false;
    try {
      const { error: insertError } = await supabase.from('terra_webhooks_raw').insert({
        webhook_id: webhookId,
        type: payload.type,
        user_id: payload.user?.user_id,
        provider: payload.user?.provider,
        payload: payload,
        status: 'pending',
      });

      if (insertError) {
        logger.error('Failed to store raw webhook', {
          error: insertError.message,
          webhookId,
        });
      } else {
        rawWebhookStored = true;
        logger.info('Raw webhook stored', { webhookId, type: payload.type });
      }
    } catch (e) {
      logger.error('Exception storing raw webhook', {
        error: e instanceof Error ? e.message : String(e),
        webhookId,
      });
    }

    // Log webhook receipt
    let userId = null;
    if (payload.user?.user_id) {
      try {
        const { data: tokenData } = await withTimeout(
          supabase
            .from('terra_tokens')
            .select('user_id')
            .eq('terra_user_id', payload.user.user_id)
            .eq('is_active', true)
            .maybeSingle(),
          2000
        );
        userId = tokenData?.user_id || null;
      } catch (e) {
        logger.warn('Timeout fetching user_id for webhook_logs', { 
          error: e instanceof Error ? e.message : String(e) 
        });
      }
    }

    EdgeRuntime.waitUntil(
      supabase.from('webhook_logs').insert({
        webhook_type: 'terra',
        event_type: payload.type,
        terra_user_id: payload.user?.user_id || null,
        user_id: userId,
        payload: payload,
        status: 'received',
        created_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) {
          logger.warn('Failed to insert webhook_logs', { 
            error: error.message,
            webhookId,
          });
        }
      })
    );

    // Handle healthcheck
    if (payload.type === 'healthcheck') {
      logger.info('Healthcheck received');
      
      const response = {
        success: true,
        message: 'ok',
      };

      await idempotency.storeResult(webhookId, response);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Unknown webhook type
    logger.warn('Unhandled webhook type', { type: payload.type });

    const response = {
      success: true,
      message: `Webhook type ${payload.type} received but not processed`,
    };

    await idempotency.storeResult(webhookId, response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  })
);

// Signature verification helper
async function verifyTerraSignature(body: string, signature: string): Promise<boolean> {
  const signingSecret = Deno.env.get('TERRA_SIGNING_SECRET');
  if (!signingSecret) {
    logger.error('TERRA_SIGNING_SECRET not configured');
    return false;
  }

  try {
    const sigParts = signature.split(',');
    const timestamp = sigParts.find(p => p.startsWith('t='))?.split('=')[1];
    const receivedSig = sigParts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !receivedSig) {
      logger.error('Invalid signature format');
      return false;
    }

    // Try both Terra formats: with dot and without
    const formats = [
      `${timestamp}.${body}`, // Standard Stripe-style format
      `${timestamp}${body}`,  // Alternative format
    ];

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    for (const payload of formats) {
      const signature_buffer = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(payload)
      );

      const expectedSig = Array.from(new Uint8Array(signature_buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const expectedSigBytes = new TextEncoder().encode(expectedSig);
      const receivedSigBytes = new TextEncoder().encode(receivedSig);

      if (expectedSigBytes.length !== receivedSigBytes.length) {
        continue;
      }

      if (timingSafeEqual(expectedSigBytes, receivedSigBytes)) {
        logger.info('Signature verified successfully', {
          format: payload.includes('.') ? 'timestamp.body' : 'timestamp+body'
        });
        return true;
      }
    }

    logger.error('Signature mismatch with both formats', {
      expected: receivedSig,
      timestamp,
      bodyLength: body.length
    });

    return false;
  } catch (error) {
    logger.error('Signature verification error', error);
    return false;
  }
}

// Timing-safe comparison to prevent timing attacks
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Timeout wrapper for database operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}
