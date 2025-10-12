import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, terra-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraSigningSecret = Deno.env.get('TERRA_SIGNING_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔔 Terra webhook received', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    const signature = req.headers.get('terra-signature');
    if (!signature) {
      console.error('❌ Missing terra-signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await req.text();
    console.log('📦 Raw body received:', rawBody);
    
    const isValidSignature = await verifyTerraSignature(rawBody, signature, terraSigningSecret);
    
    if (!isValidSignature) {
      console.error('❌ Invalid signature - responding with 400');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(rawBody);
    console.log('✅ Valid Terra webhook received:', {
      type: payload.type,
      user: payload.user,
      reference_id: payload.reference_id
    });

    // Обработка healthcheck от Terra
    if (payload.type === 'healthcheck') {
      console.log('💚 Healthcheck received from Terra - responding OK');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook is healthy' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        console.log('✅ Updated terra_tokens');
      } else {
        await supabase.from('terra_tokens').insert(tokenData);
        console.log('✅ Inserted new terra_tokens');
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (['activity', 'body', 'daily', 'sleep', 'nutrition', 'athlete'].includes(payload.type)) {
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

  } catch (error) {
    console.error('Terra webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    
    if (!timestamp || !sig) {
      console.error('❌ Invalid signature format', { signature });
      return false;
    }
    
    // Попробуем оба формата Terra: с точкой и без
    const formats = [
      `${timestamp}.${rawBody}`,  // Стандартный формат Stripe-style
      `${timestamp}${rawBody}`,   // Альтернативный формат
    ];
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    for (const payload of formats) {
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
      const computed = bufferToHex(signatureBuffer);
      
      if (computed === sig) {
        console.log('✅ Signature verified successfully with format:', payload.includes('.') ? 'timestamp.body' : 'timestamp+body');
        return true;
      }
    }
    
    // Если ни один формат не подошел
    console.error('❌ Signature mismatch with both formats', { 
      expected: sig,
      timestamp,
      bodyLength: rawBody.length,
      bodyPreview: rawBody.substring(0, 100)
    });
    
    return false;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
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
