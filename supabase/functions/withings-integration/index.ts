import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const WITHINGS_CLIENT_ID = Deno.env.get('WITHINGS_CLIENT_ID');
const WITHINGS_CLIENT_SECRET = Deno.env.get('WITHINGS_CLIENT_SECRET');
const WITHINGS_API_URL = 'https://wbsapi.withings.net';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    console.log('Withings integration request:', action);

    switch (action) {
      case 'get-auth-url':
        return await getAuthUrl(req);
      case 'handle-callback':
        return await handleCallback(req);
      case 'sync-data':
        return await syncData(req);
      case 'check-status':
        return await checkStatus(req);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Withings integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getAuthUrl(req: Request) {
  const { userId } = await req.json();
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Generate random state for security
  const state = crypto.randomUUID();
  
  // Store state in database
  await supabase
    .from('withings_oauth_states')
    .insert({ state, user_id: userId });

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/withings-integration?action=handle-callback`;
  
  const authUrl = new URL(`${WITHINGS_API_URL}/v2/oauth2`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', WITHINGS_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'user.info,user.metrics,user.activity');
  authUrl.searchParams.set('state', state);

  return new Response(
    JSON.stringify({ authUrl: authUrl.toString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCallback(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return new Response(
      `<html><body><script>window.close();</script><p>Authorization failed: ${error}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !state) {
    throw new Error('Missing authorization code or state');
  }

  // Verify state
  const { data: stateData, error: stateError } = await supabase
    .from('withings_oauth_states')
    .select('user_id')
    .eq('state', state)
    .single();

  if (stateError || !stateData) {
    throw new Error('Invalid state parameter');
  }

  const userId = stateData.user_id;

  // Exchange code for tokens
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/withings-integration?action=handle-callback`;
  
  const tokenResponse = await fetch(`${WITHINGS_API_URL}/v2/oauth2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: WITHINGS_CLIENT_ID!,
      client_secret: WITHINGS_CLIENT_SECRET!,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (tokenData.status !== 0) {
    throw new Error(`Token exchange failed: ${tokenData.error}`);
  }

  // Save tokens
  const expiresAt = new Date(Date.now() + tokenData.body.expires_in * 1000);
  
  await supabase
    .from('withings_tokens')
    .upsert({
      user_id: userId,
      access_token: tokenData.body.access_token,
      refresh_token: tokenData.body.refresh_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.body.scope,
    });

  // Clean up state
  await supabase
    .from('withings_oauth_states')
    .delete()
    .eq('state', state);

  // Start initial data sync
  await syncUserData(userId, tokenData.body.access_token);

  return new Response(
    `<html>
      <body>
        <script>
          window.opener?.postMessage({type: 'withings-auth-success'}, '*');
          window.close();
        </script>
        <p>Authorization successful! You can close this window.</p>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

async function syncData(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    throw new Error('Invalid user token');
  }

  // Get user's Withings tokens
  const { data: tokenData, error: tokenError } = await supabase
    .from('withings_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('No Withings connection found');
  }

  // Check if token needs refresh
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  let accessToken = tokenData.access_token;
  
  if (now >= expiresAt) {
    accessToken = await refreshToken(tokenData);
  }

  const result = await syncUserData(user.id, accessToken);
  
  return new Response(
    JSON.stringify(result),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkStatus(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Authorization header required');
  }

  console.log('Check status - Auth header present:', !!authHeader);

  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    throw new Error('Invalid user token');
  }

  // Check if user has Withings tokens
  const { data: tokenData, error: tokenError } = await supabase
    .from('withings_tokens')
    .select('created_at, scope')
    .eq('user_id', user.id)
    .single();

  const isConnected = !tokenError && !!tokenData;
  
  return new Response(
    JSON.stringify({ 
      connected: isConnected,
      connectedAt: tokenData?.created_at || null,
      scope: tokenData?.scope || null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function refreshToken(tokenData: any): Promise<string> {
  const response = await fetch(`${WITHINGS_API_URL}/v2/oauth2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: WITHINGS_CLIENT_ID!,
      client_secret: WITHINGS_CLIENT_SECRET!,
      refresh_token: tokenData.refresh_token,
    }),
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    throw new Error(`Token refresh failed: ${data.error}`);
  }

  // Update tokens in database
  const expiresAt = new Date(Date.now() + data.body.expires_in * 1000);
  
  await supabase
    .from('withings_tokens')
    .update({
      access_token: data.body.access_token,
      refresh_token: data.body.refresh_token,
      expires_at: expiresAt.toISOString(),
    })
    .eq('user_id', tokenData.user_id);

  return data.body.access_token;
}

async function syncUserData(userId: string, accessToken: string) {
  console.log('Starting data sync for user:', userId);
  
  const results = {
    measurements: 0,
    activities: 0,
    sleep: 0,
    workouts: 0
  };

  try {
    // Sync body measurements (weight, body composition)
    const measurementsResult = await syncMeasurements(userId, accessToken);
    results.measurements = measurementsResult;

    // Sync activity data (steps, calories, distance)
    const activitiesResult = await syncActivities(userId, accessToken);
    results.activities = activitiesResult;

    // Sync sleep data
    const sleepResult = await syncSleep(userId, accessToken);
    results.sleep = sleepResult;

    // Sync workouts
    const workoutsResult = await syncWorkouts(userId, accessToken);
    results.workouts = workoutsResult;

    console.log('Data sync completed:', results);
    return results;
    
  } catch (error) {
    console.error('Data sync error:', error);
    throw error;
  }
}

async function syncMeasurements(userId: string, accessToken: string): Promise<number> {
  const lastWeek = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  
  const response = await fetch(`${WITHINGS_API_URL}/measure?action=getmeas&access_token=${accessToken}&startdate=${lastWeek}`, {
    method: 'POST',
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    console.error('Failed to fetch measurements:', data);
    return 0;
  }

  let saved = 0;
  
  for (const measureGroup of data.body.measuregrps || []) {
    const date = new Date(measureGroup.date * 1000);
    
    for (const measure of measureGroup.measures || []) {
      const value = measure.value * Math.pow(10, measure.unit);
      let metricName = '';
      let unit = '';
      
      switch (measure.type) {
        case 1: metricName = 'Вес'; unit = 'кг'; break;
        case 4: metricName = 'Рост'; unit = 'м'; break;
        case 5: metricName = 'Мышечная масса'; unit = 'кг'; break;
        case 6: metricName = 'Процент жира'; unit = '%'; break;
        case 8: metricName = 'Процент мышц'; unit = '%'; break;
        case 9: metricName = 'Гидратация'; unit = '%'; break;
        case 10: metricName = 'Костная масса'; unit = 'кг'; break;
        case 11: metricName = 'Пульсовое давление'; unit = 'мм рт.ст.'; break;
        case 12: metricName = 'Висцеральный жир'; unit = ''; break;
        default: continue;
      }

      // Create or get metric
      const { data: metricData } = await supabase.rpc('create_or_get_metric', {
        p_user_id: userId,
        p_metric_name: metricName,
        p_metric_category: 'body',
        p_unit: unit,
        p_source: 'withings'
      });

      if (metricData) {
        // Save metric value
        await supabase
          .from('metric_values')
          .upsert({
            user_id: userId,
            metric_id: metricData,
            value: value,
            measurement_date: date.toISOString().split('T')[0],
            external_id: `withings_${measureGroup.grpid}_${measure.type}`,
            source_data: {
              grpid: measureGroup.grpid,
              type: measure.type,
              unit: measure.unit,
              category: measureGroup.category
            }
          }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
        
        saved++;
      }
    }
  }

  return saved;
}

async function syncActivities(userId: string, accessToken: string): Promise<number> {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  const response = await fetch(`${WITHINGS_API_URL}/v2/measure?action=getactivity&access_token=${accessToken}&startdateymd=${lastWeek}&enddateymd=${today}`, {
    method: 'POST',
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    console.error('Failed to fetch activities:', data);
    return 0;
  }

  let saved = 0;
  
  for (const activity of data.body.activities || []) {
    const date = activity.date;
    
    const metrics = [
      { name: 'Шаги', value: activity.steps, unit: 'шагов' },
      { name: 'Дистанция', value: activity.distance, unit: 'м' },
      { name: 'Активные калории', value: activity.calories, unit: 'ккал' },
      { name: 'Время активности', value: activity.totalcalories, unit: 'мин' }
    ];

    for (const metric of metrics) {
      if (metric.value > 0) {
        const { data: metricData } = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: metric.name,
          p_metric_category: 'activity',
          p_unit: metric.unit,
          p_source: 'withings'
        });

        if (metricData) {
          await supabase
            .from('metric_values')
            .upsert({
              user_id: userId,
              metric_id: metricData,
              value: metric.value,
              measurement_date: date,
              external_id: `withings_activity_${date}_${metric.name}`,
              source_data: activity
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          
          saved++;
        }
      }
    }
  }

  return saved;
}

async function syncSleep(userId: string, accessToken: string): Promise<number> {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  const response = await fetch(`${WITHINGS_API_URL}/v2/sleep?action=getsummary&access_token=${accessToken}&startdateymd=${lastWeek}&enddateymd=${today}`, {
    method: 'POST',
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    console.error('Failed to fetch sleep:', data);
    return 0;
  }

  let saved = 0;
  
  for (const sleep of data.body.series || []) {
    const date = sleep.date;
    
    const metrics = [
      { name: 'Длительность сна', value: sleep.data?.totalsleepduration, unit: 'сек' },
      { name: 'Глубокий сон', value: sleep.data?.deepsleepduration, unit: 'сек' },
      { name: 'Легкий сон', value: sleep.data?.lightsleepduration, unit: 'сек' },
      { name: 'REM сон', value: sleep.data?.remsleepduration, unit: 'сек' },
      { name: 'Время засыпания', value: sleep.data?.durationtosleep, unit: 'сек' },
      { name: 'Количество пробуждений', value: sleep.data?.wakeupcount, unit: 'раз' }
    ];

    for (const metric of metrics) {
      if (metric.value > 0) {
        const { data: metricData } = await supabase.rpc('create_or_get_metric', {
          p_user_id: userId,
          p_metric_name: metric.name,
          p_metric_category: 'sleep',
          p_unit: metric.unit,
          p_source: 'withings'
        });

        if (metricData) {
          await supabase
            .from('metric_values')
            .upsert({
              user_id: userId,
              metric_id: metricData,
              value: metric.value,
              measurement_date: date,
              external_id: `withings_sleep_${date}_${metric.name}`,
              source_data: sleep.data
            }, { onConflict: 'user_id,metric_id,measurement_date,external_id' });
          
          saved++;
        }
      }
    }
  }

  return saved;
}

async function syncWorkouts(userId: string, accessToken: string): Promise<number> {
  const lastWeek = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  
  const response = await fetch(`${WITHINGS_API_URL}/v2/measure?action=getworkouts&access_token=${accessToken}&startdate=${lastWeek}`, {
    method: 'POST',
  });

  const data = await response.json();
  
  if (data.status !== 0) {
    console.error('Failed to fetch workouts:', data);
    return 0;
  }

  let saved = 0;
  
  for (const workout of data.body.series || []) {
    const startTime = new Date(workout.startdate * 1000);
    const endTime = new Date(workout.enddate * 1000);
    
    await supabase
      .from('workouts')
      .upsert({
        user_id: userId,
        workout_type: getWorkoutTypeName(workout.category),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: Math.round((workout.enddate - workout.startdate) / 60),
        distance_km: workout.data?.distance ? workout.data.distance / 1000 : null,
        calories_burned: workout.data?.calories || null,
        heart_rate_avg: workout.data?.hr_average || null,
        heart_rate_max: workout.data?.hr_max || null,
        source: 'withings',
        external_id: `withings_workout_${workout.id}`,
        source_data: workout
      }, { onConflict: 'user_id,external_id' });
    
    saved++;
  }

  return saved;
}

function getWorkoutTypeName(category: number): string {
  const workoutTypes: Record<number, string> = {
    1: 'Ходьба',
    2: 'Бег',
    3: 'Хайкинг',
    4: 'Скейтборд',
    5: 'BMX',
    6: 'Велосипед',
    7: 'Бассейн',
    8: 'Серфинг',
    9: 'Кайтсерфинг',
    10: 'Виндсерфинг',
    11: 'Бодиборд',
    12: 'Теннис',
    13: 'Настольный теннис',
    14: 'Сквош',
    15: 'Бадминтон',
    16: 'Тяжелая атлетика',
    17: 'Калистеника',
    18: 'Эллипсоид',
    19: 'Пилатес',
    20: 'Баскетбол',
    21: 'Футбол',
    22: 'Американский футбол',
    23: 'Регби',
    24: 'Волейбол',
    25: 'Водное поло',
    26: 'Хоккей',
    27: 'Хоккей на траве',
    28: 'Гольф',
    29: 'Йога',
    30: 'Танцы',
    31: 'Бокс',
    32: 'Фехтование',
    33: 'Борьба',
    34: 'Боевые искусства',
    35: 'Лыжи',
    36: 'Сноуборд'
  };
  
  return workoutTypes[category] || 'Другое';
}