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

    // Rate limiting
    const identifier = payload.user?.user_id || 'anonymous';
    await withRateLimit({
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      keyPrefix: 'terra_webhook',
    })(req, identifier);

    // Store raw webhook for debugging and replay
    await supabase.from('terra_webhooks_raw').insert({
      webhook_id: webhookId,
      type: payload.type,
      user_id: payload.user?.user_id,
      provider: payload.user?.provider,
      payload: payload,
      status: 'pending',
    });

    // Log webhook receipt
    let userId = null;
    if (payload.user?.user_id) {
      const { data: tokenData } = await supabase
        .from('terra_tokens')
        .select('user_id')
        .eq('terra_user_id', payload.user.user_id)
        .eq('is_active', true)
        .maybeSingle();
      userId = tokenData?.user_id || null;
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

    logger.info('Raw webhook stored', { webhookId, type: payload.type });

    // Handle healthcheck - quick response
    if (payload.type === 'healthcheck') {
      logger.info('Healthcheck received');
      const response = { success: true, status: 'healthy', message: 'Webhook is healthy' };
      await idempotency.storeResult(webhookId, response);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle auth webhook - quick processing
    if (payload.type === 'auth') {
      logger.info('Auth webhook received', {
        userId: payload.user?.user_id,
        provider: payload.user?.provider,
        referenceId: payload.reference_id,
      });

      const { reference_id, user: terraUser } = payload;
      if (!terraUser) {
        throw new EdgeFunctionError(
          ErrorCode.VALIDATION_ERROR,
          'Missing user in auth webhook',
          400
        );
      }

      const provider = terraUser.provider?.toUpperCase();
      const terraUserId = terraUser.user_id;

      // Найти пользователя по reference_id (если есть) ИЛИ по terra_user_id=null + provider
      let appUserId = reference_id;
      
      if (!appUserId) {
        // Ищем токен без terra_user_id (создан из TerraCallback)
        const { data: pendingToken } = await supabase
          .from('terra_tokens')
          .select('user_id')
          .eq('provider', provider)
          .is('terra_user_id', null)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        appUserId = pendingToken?.user_id;
        logger.info('Found pending token for provider', { provider, appUserId });
      }

      if (!appUserId) {
        logger.warn('No user found for auth webhook', { terraUserId, provider });
        // Всё равно создаём terra_users запись для будущей связки
        await supabase.from('terra_users').upsert({
          user_id: terraUserId,
          provider: provider,
          reference_id: null,
          granted_scopes: terraUser.scopes || null,
          state: terraUser.active ? 'active' : 'inactive',
          created_at: terraUser.created_at || new Date().toISOString(),
        }, { onConflict: 'user_id' });
        
        return new Response(JSON.stringify({ success: true, type: 'auth', note: 'User not linked yet' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Обновляем/создаём токен с правильным terra_user_id
      const { data: existing } = await supabase
        .from('terra_tokens')
        .select('id')
        .eq('user_id', appUserId)
        .eq('provider', provider)
        .maybeSingle();

      const tokenData = {
        user_id: appUserId,
        terra_user_id: terraUserId,
        provider,
        is_active: true,
        last_sync_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        await supabase.from('terra_tokens').update(tokenData).eq('id', existing.id);
        logger.info('Updated terra_tokens with terra_user_id', { appUserId, terraUserId });
      } else {
        await supabase.from('terra_tokens').insert({
          ...tokenData,
          created_at: new Date().toISOString(),
        });
        logger.info('Inserted new terra_tokens', { appUserId, terraUserId });
      }

      // Create/update terra_users record
      const terraUserData = {
        user_id: terraUserId,
        provider: provider,
        reference_id: appUserId,
        granted_scopes: terraUser.scopes || null,
        state: terraUser.active ? 'active' : 'inactive',
        created_at: terraUser.created_at || new Date().toISOString(),
      };

      await supabase
        .from('terra_users')
        .upsert(terraUserData, { onConflict: 'user_id' });

      logger.info('Updated terra_users');

      // Trigger initial sync in background
      logger.info('Triggering initial sync for newly connected device');
      try {
        await supabase.functions.invoke('terra-integration', {
          body: {
            action: 'sync-data',
            userId: appUserId,
            provider: provider
          }
        });
        logger.info('Initial sync triggered successfully');
      } catch (e) {
        logger.error('Error triggering initial sync', e);
      }

      // Update webhook status
      await supabase
        .from('terra_webhooks_raw')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('webhook_id', webhookId);

      const response = { success: true, type: 'auth' };
      await idempotency.storeResult(webhookId, response);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle user_reauth webhook - when user reconnects and gets new user_id
    if (payload.type === 'user_reauth') {
      const { old_user, new_user } = payload;
      if (!old_user || !new_user) {
        throw new EdgeFunctionError(
          ErrorCode.VALIDATION_ERROR,
          'Missing old_user or new_user in reauth webhook',
          400
        );
      }

      const provider = new_user.provider?.toUpperCase();

      logger.info('User reauth received', {
        oldUserId: old_user.user_id,
        newUserId: new_user.user_id,
        provider,
        referenceId: new_user.reference_id
      });

      // Update terra_user_id in terra_tokens
      await supabase
        .from('terra_tokens')
        .update({
          terra_user_id: new_user.user_id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', new_user.reference_id)
        .eq('provider', provider);

      // Update terra_users
      const terraUserData = {
        user_id: new_user.user_id,
        provider: provider,
        reference_id: new_user.reference_id,
        granted_scopes: new_user.scopes || null,
        state: new_user.active ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
      };

      await supabase
        .from('terra_users')
        .upsert(terraUserData, { onConflict: 'user_id' });

      logger.info('Updated tokens and users for reauth');

      // Update webhook status
      await supabase
        .from('terra_webhooks_raw')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('webhook_id', webhookId);

      const response = { success: true, type: 'user_reauth' };
      await idempotency.storeResult(webhookId, response);

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For data webhooks (activity, body, sleep, daily, nutrition, athlete), enqueue for background processing
    const dataWebhookTypes = ['activity', 'body', 'sleep', 'daily', 'nutrition', 'athlete'];

    if (dataWebhookTypes.includes(payload.type)) {
      // Обновляем last_sync_date и terra_user_id (если он еще null) при получении данных
      if (payload.user?.user_id) {
        const { data: existingToken } = await supabase
          .from('terra_tokens')
          .select('terra_user_id')
          .eq('terra_user_id', payload.user.user_id)
          .eq('is_active', true)
          .maybeSingle();

        // Если токен найден, обновляем last_sync_date
        if (existingToken) {
          await supabase
            .from('terra_tokens')
            .update({ 
              last_sync_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('terra_user_id', payload.user.user_id)
            .eq('is_active', true);
          
          logger.info('Updated last_sync_date for terra token', {
            terraUserId: payload.user.user_id,
            type: payload.type
          });
        } else {
          // Токен с terra_user_id не найден - ищем токен с null terra_user_id для провайдера
          const provider = payload.user.provider?.toUpperCase();
          if (provider) {
            const { data: nullToken } = await supabase
              .from('terra_tokens')
              .select('id, user_id')
              .eq('provider', provider)
              .eq('is_active', true)
              .is('terra_user_id', null)
              .maybeSingle();

            if (nullToken) {
              // Обновляем terra_user_id и last_sync_date
              console.log('🔗 Linking terra_user_id from data webhook...', {
                tokenId: nullToken.id,
                userId: nullToken.user_id,
                provider,
                terraUserId: payload.user.user_id
              });
              
              await supabase
                .from('terra_tokens')
                .update({
                  terra_user_id: payload.user.user_id,
                  last_sync_date: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', nullToken.id);

              console.log('✅ Successfully linked terra_user_id from data webhook');
              logger.info('Updated terra_user_id from data webhook', {
                terraUserId: payload.user.user_id,
                provider,
                type: payload.type
              });
            } else {
              console.log('⚠️ No pending token found for provider:', provider);
            }
          }
        }
      }

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
      });

      const response = {
        success: true,
        queued: true,
        jobId: job.id,
        type: payload.type,
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
