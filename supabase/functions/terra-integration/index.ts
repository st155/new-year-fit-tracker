import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
    const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем текущего пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { action, provider } = body;
    console.log('Terra integration action:', { action, provider, userId: user.id });

    // Generate Widget Session (for iframe embedding)
    if (action === 'generate-widget-session') {
      const authSuccessUrl = `${req.headers.get('origin')}/integrations`;
      const authFailureUrl = `${req.headers.get('origin')}/integrations`;
      
      const response = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          providers: 'ULTRAHUMAN,OURA,GARMIN,WITHINGS,POLAR',
          language: 'en',
          auth_success_redirect_url: authSuccessUrl,
          auth_failure_redirect_url: authFailureUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Terra widget error:', error);
        throw new Error(`Terra API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Terra widget session created:', data);

      return new Response(
        JSON.stringify({ url: data.url, sessionId: data.session_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получить URL авторизации Terra (legacy, for specific provider)
    if (action === 'get-auth-url') {
      const authSuccessUrl = `${req.headers.get('origin')}/terra-callback`;
      const authFailureUrl = `${req.headers.get('origin')}/terra-callback`;
      
      const response = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_id: user.id,
          providers: provider,
          language: 'en',
          auth_success_redirect_url: authSuccessUrl,
          auth_failure_redirect_url: authFailureUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Terra widget error:', error);
        throw new Error(`Terra API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Terra widget session created:', data);

      return new Response(
        JSON.stringify({ authUrl: data.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Синхронизировать данные
    if (action === 'sync-data') {
      const { data: tokens } = await supabase
        .from('terra_tokens')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!tokens || tokens.length === 0) {
        throw new Error('No active connections found');
      }

      // Запускаем синхронизацию для всех провайдеров
      for (const token of tokens) {
        try {
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          const start = startDate.toISOString().split('T')[0];

          const syncResponse = await fetch(
            `https://api.tryterra.co/v2/data/${token.terra_user_id}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'dev-id': terraDevId,
                'x-api-key': terraApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                types: ['body', 'activity', 'daily', 'sleep', 'nutrition'],
                start_date: start,
                end_date: endDate,
              }),
            }
          );

          if (syncResponse.ok) {
            console.log(`Sync initiated for ${token.provider}`);
            
            // Update last_sync_date
            await supabase
              .from('terra_tokens')
              .update({ last_sync_date: new Date().toISOString() })
              .eq('id', token.id);
          } else {
            console.error(`Sync failed for ${token.provider}:`, await syncResponse.text());
          }
        } catch (error) {
          console.error(`Error syncing ${token.provider}:`, error);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Отключить провайдера
    if (action === 'disconnect') {
      await supabase
        .from('terra_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('provider', provider);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unknown action');

  } catch (error: any) {
    console.error('Terra integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Функция проверки подписи Terra (Web Crypto API)
async function verifyTerraSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Парсим заголовок terra-signature: "t=timestamp,v1=signature"
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }
    
    if (!timestamp || !sig) {
      console.error('Invalid signature format', { signature });
      return false;
    }
    
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
    const isValid = computed === sig;
    
    if (!isValid) {
      console.error('Signature verification failed', { expected: sig, computed, timestamp, payloadLength: payload.length });
    }
    return isValid;
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

// Функция обработки данных Terra (копия из webhook-terra)
async function processTerraData(supabase: any, payload: any) {
  try {
    console.log('🔍 Processing Terra data:', { 
      type: payload.type, 
      provider: payload.user?.provider,
      hasData: !!payload.data,
      dataLength: payload.data?.length 
    });

    const { user, data } = payload;
    
    if (!user?.user_id) {
      console.error('❌ Missing user.user_id in payload');
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Empty data array, skipping processing');
      return;
    }
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('user_id, provider')
      .eq('terra_user_id', user.user_id)
      .eq('is_active', true)
      .single();

    if (tokenError) {
      console.error('❌ Error fetching terra_tokens:', tokenError);
      return;
    }

    if (!tokenData) {
      console.error('❌ User not found for Terra user_id:', user.user_id);
      return;
    }

    const userId = tokenData.user_id;
    const provider = tokenData.provider;
    
    console.log('✅ Found user:', { userId, provider });

    if (payload.type === 'activity') {
      console.log('📊 Processing activity data');
      for (const activity of data) {
        console.log('Activity item:', { 
          hasActiveDurations: !!activity.active_durations,
          durationsCount: activity.active_durations?.length 
        });
        
        if (activity.active_durations?.length > 0) {
          for (const workout of activity.active_durations) {
            const { error: workoutError } = await supabase.from('workouts').upsert({
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
            
            if (workoutError) {
              console.error('❌ Error upserting workout:', workoutError);
            }
          }
        }
      }
    }

    if (payload.type === 'body') {
      console.log('📊 Processing body data');
      for (const bodyData of data) {
        console.log('Body item:', { 
          hasWeight: !!bodyData.weight_kg,
          hasFat: !!bodyData.body_fat_percentage,
          timestamp: bodyData.timestamp
        });
        
        if (bodyData.body_fat_percentage || bodyData.weight_kg) {
          const { error: bodyError } = await supabase.from('body_composition').upsert({
            user_id: userId,
            measurement_date: bodyData.timestamp?.split('T')[0],
            weight: bodyData.weight_kg,
            body_fat_percentage: bodyData.body_fat_percentage,
            muscle_mass: bodyData.muscle_mass_kg,
            measurement_method: provider.toLowerCase(),
          }, {
            onConflict: 'user_id,measurement_date',
          });
          
          if (bodyError) {
            console.error('❌ Error upserting body composition:', bodyError);
          }
        }
      }
    }
    
    if (payload.type === 'sleep') {
      console.log('📊 Processing sleep data');
      for (const sleepData of data) {
        // Создаем или получаем метрику для Sleep Duration
        const { data: metricId } = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: 'Sleep Duration',
          p_metric_category: 'sleep',
          p_unit: 'hours',
          p_source: provider
        });

        if (metricId && sleepData.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
          const sleepHours = sleepData.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600;
          
          await supabase.from('metric_values').upsert({
            user_id: userId,
            metric_id: metricId,
            value: sleepHours,
            measurement_date: sleepData.day?.split('T')[0] || new Date().toISOString().split('T')[0],
            external_id: `terra_${provider}_sleep_${sleepData.day}`,
          }, {
            onConflict: 'external_id',
          });
        }
      }
    }
    
    if (payload.type === 'daily') {
      console.log('📊 Processing daily data');
      for (const dailyData of data) {
        // VO2Max
        if (dailyData.oxygen_data?.vo2max_ml_per_min_per_kg) {
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'VO2Max',
            p_metric_category: 'cardio',
            p_unit: 'ml/kg/min',
            p_source: provider
          });

          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: dailyData.oxygen_data.vo2max_ml_per_min_per_kg,
              measurement_date: dailyData.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
              external_id: `terra_${provider}_vo2max_${dailyData.metadata?.start_time}`,
            }, {
              onConflict: 'external_id',
            });
          }
        }
      }
    }

    if (payload.type === 'nutrition') {
      console.log('📊 Processing nutrition data');
      for (const nutritionData of data) {
        // Blood Glucose от Ultrahuman
        if (nutritionData.blood_glucose_data_mg_per_dL) {
          const { data: metricId } = await supabase.rpc('create_or_get_metric', {
            p_user_id: userId,
            p_metric_name: 'Blood Glucose',
            p_metric_category: 'health',
            p_unit: 'mg/dL',
            p_source: provider
          });

          if (metricId) {
            await supabase.from('metric_values').upsert({
              user_id: userId,
              metric_id: metricId,
              value: nutritionData.blood_glucose_data_mg_per_dL,
              measurement_date: nutritionData.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
              external_id: `terra_${provider}_glucose_${nutritionData.metadata?.start_time}`,
            }, {
              onConflict: 'external_id',
            });
          }
        }
      }
    }

    console.log(`✅ Processed Terra ${payload.type} data from ${provider} for user ${userId}`);
  } catch (error) {
    console.error('❌ Error in processTerraData:', error);
    throw error;
  }
}

