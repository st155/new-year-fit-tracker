import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, terra-signature, x-whoop-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Определяем провайдера по заголовкам
    const terraSignature = req.headers.get('terra-signature');
    const whoopSignature = req.headers.get('x-whoop-signature');
    
    // Получаем URL для определения провайдера по пути
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    console.log('🔔 Webhook received:', {
      provider,
      headers: {
        terraSignature: !!terraSignature,
        whoopSignature: !!whoopSignature,
      }
    });

    // Маршрутизация на основе заголовков или параметра provider
    if (terraSignature || provider === 'terra') {
      return await handleTerraWebhook(req, supabase);
    } else if (whoopSignature || provider === 'whoop') {
      return await handleWhoopWebhook(req, supabase);
    } else if (provider === 'withings') {
      return await handleWithingsWebhook(req, supabase);
    }

    return new Response(
      JSON.stringify({ error: 'Unknown webhook provider' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Terra Webhook Handler
async function handleTerraWebhook(req: Request, supabase: any) {
  const terraSigningSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;
  const signature = req.headers.get('terra-signature');

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'Missing terra-signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const rawBody = await req.text();
  const isValid = await verifyTerraSignature(rawBody, signature, terraSigningSecret);

  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const payload = JSON.parse(rawBody);
  console.log('✅ Terra webhook:', payload.type);

  if (payload.type === 'auth') {
    const { reference_id, user: terraUser } = payload;
    const provider = terraUser.provider?.toUpperCase();

    const { data: existing } = await supabase
      .from('terra_tokens')
      .select('id')
      .eq('user_id', reference_id)
      .eq('provider', provider)
      .maybeSingle();

    const tokenData = {
      user_id: reference_id,
      terra_user_id: terraUser.user_id,
      provider,
      is_active: true,
      last_sync_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase.from('terra_tokens').update(tokenData).eq('id', existing.id);
    } else {
      await supabase.from('terra_tokens').insert(tokenData);
    }
  } else if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
    await processTerraData(supabase, payload);
    
    if (payload.user?.user_id) {
      await supabase
        .from('terra_tokens')
        .update({ last_sync_date: new Date().toISOString() })
        .eq('terra_user_id', payload.user.user_id);
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Whoop Webhook Handler
async function handleWhoopWebhook(req: Request, supabase: any) {
  const payload = await req.json();
  console.log('✅ Whoop webhook:', payload);

  // Implement Whoop webhook logic here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Withings Webhook Handler
async function handleWithingsWebhook(req: Request, supabase: any) {
  const payload = await req.json();
  console.log('✅ Withings webhook:', payload);

  // Implement Withings webhook logic here
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Terra signature verification
async function verifyTerraSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }
    
    if (!timestamp || !sig) return false;
    
    const payload = timestamp + rawBody;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const computed = bufferToHex(signatureBuffer);
    
    return computed === sig;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function processTerraData(supabase: any, payload: any) {
  const { user, data } = payload;
  
  const { data: tokenData } = await supabase
    .from('terra_tokens')
    .select('user_id, provider')
    .eq('terra_user_id', user.user_id)
    .eq('is_active', true)
    .single();

  if (!tokenData) {
    console.error('User not found for Terra user_id:', user.user_id);
    return;
  }

  const userId = tokenData.user_id;
  const provider = tokenData.provider;

  if (payload.type === 'activity') {
    for (const activity of data) {
      if (activity.active_durations?.length > 0) {
        for (const workout of activity.active_durations) {
          await supabase.from('workouts').upsert({
            user_id: userId,
            workout_type: workout.activity_type || 'Activity',
            start_time: workout.start_time,
            end_time: workout.end_time,
            duration_minutes: Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000),
            calories_burned: activity.calories_data?.total_burned_calories,
            heart_rate_avg: activity.heart_rate_data?.avg_hr_bpm,
            heart_rate_max: activity.heart_rate_data?.max_hr_bpm,
            source: provider.toLowerCase(),
            external_id: `terra_${provider}_${workout.start_time}`,
          }, {
            onConflict: 'external_id',
            ignoreDuplicates: true,
          });
        }
      }
    }
  }

  if (payload.type === 'body') {
    for (const bodyData of data) {
      if (bodyData.body_fat_percentage || bodyData.weight_kg) {
        await supabase.from('body_composition').upsert({
          user_id: userId,
          measurement_date: bodyData.timestamp?.split('T')[0],
          weight: bodyData.weight_kg,
          body_fat_percentage: bodyData.body_fat_percentage,
          muscle_mass: bodyData.muscle_mass_kg,
          measurement_method: provider.toLowerCase(),
        }, {
          onConflict: 'user_id,measurement_date',
        });
      }
    }
  }

  console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
}
