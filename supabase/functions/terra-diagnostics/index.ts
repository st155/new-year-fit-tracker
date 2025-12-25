import { withAuth, jsonResponse, parseBody } from '../_shared/handler.ts';

function getSummary(type: string, item: any): string {
  switch (type) {
    case 'daily':
      const recovery = item.scores?.recovery_score;
      const strain = item.scores?.strain;
      return `Recovery: ${recovery || 'N/A'}, Strain: ${strain || 'N/A'}`;
    case 'sleep':
      const duration = item.sleep_durations_data?.sleep_duration_seconds;
      const efficiency = item.sleep_durations_data?.sleep_efficiency_percentage;
      return `Duration: ${duration ? (duration / 3600).toFixed(1) + 'h' : 'N/A'}, Efficiency: ${efficiency || 'N/A'}%`;
    case 'activity':
      const calories = item.calories_data?.total_burned_calories;
      const distance = item.distance_data?.distance_meters;
      return `Calories: ${calories || 'N/A'}, Distance: ${distance ? (distance / 1000).toFixed(1) + 'km' : 'N/A'}`;
    case 'body':
      const weight = item.body_data?.weight_kg;
      const fat = item.body_data?.body_fat_percentage;
      return `Weight: ${weight || 'N/A'}kg, Fat: ${fat || 'N/A'}%`;
    default:
      return 'Unknown';
  }
}

function compareDates(terraData: any[], dbData: Record<string, any>, type: string): string[] {
  const terraDateSet = new Set(terraData.map(d => d.date));
  const dbDateSet = new Set(
    Object.keys(dbData).filter(date => dbData[date][type].length > 0)
  );
  
  const missingDates = Array.from(terraDateSet).filter(date => !dbDateSet.has(date));
  return missingDates.sort().reverse();
}

Deno.serve(withAuth(async ({ req, supabase, user }) => {
  const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
  const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

  const { provider } = await parseBody<{ provider: string }>(req);
  console.log(`🔍 [terra-diagnostics] Fetching diagnostics for provider: ${provider}, user: ${user!.id}`);

  // Get Terra user_id and token info
  const { data: terraToken, error: tokenError } = await supabase
    .from('terra_tokens')
    .select('*')
    .eq('user_id', user!.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (tokenError || !terraToken) {
    throw new Error('Terra token not found for this provider');
  }

  const terraUserId = terraToken.terra_user_id;
  console.log(`✅ Terra user_id: ${terraUserId}`);

  // Date range: last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

  // Fetch data from Terra API for each endpoint
  const endpoints = [
    { type: 'daily', url: 'https://api.tryterra.co/v2/daily' },
    { type: 'sleep', url: 'https://api.tryterra.co/v2/sleep' },
    { type: 'activity', url: 'https://api.tryterra.co/v2/activity' },
    { type: 'body', url: 'https://api.tryterra.co/v2/body' },
  ];

  const terraData: any = {
    daily: [],
    sleep: [],
    activity: [],
    body: [],
  };

  // Fetch from Terra API
  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint.url}?user_id=${terraUserId}&start_date=${startDateStr}&end_date=${endDateStr}`;
      console.log(`🌐 Fetching ${endpoint.type} from Terra:`, url);
      
      const response = await fetch(url, {
        headers: {
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
        },
      });

      if (!response.ok) {
        console.error(`❌ Terra API error for ${endpoint.type}:`, response.status, await response.text());
        continue;
      }

      const data = await response.json();
      console.log(`✅ Terra ${endpoint.type} response:`, JSON.stringify(data).substring(0, 500));

      if (data.data && Array.isArray(data.data)) {
        terraData[endpoint.type] = data.data.map((item: any) => {
          const metadata = item.metadata || {};
          const date = metadata.start_time ? metadata.start_time.split('T')[0] : 
                       metadata.end_time ? metadata.end_time.split('T')[0] : 
                       'unknown';
          
          return {
            date,
            raw: item,
            summary: getSummary(endpoint.type, item),
          };
        });
      }
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint.type}:`, error);
    }
  }

  // Fetch data from our database
  const { data: dbMetrics } = await supabase
    .from('metric_values')
    .select(`
      measurement_date,
      value,
      user_metrics!inner(
        metric_name,
        metric_category,
        source
      )
    `)
    .eq('user_id', user!.id)
    .eq('user_metrics.source', provider.toLowerCase())
    .gte('measurement_date', startDateStr)
    .lte('measurement_date', endDateStr)
    .order('measurement_date', { ascending: false });

  // Group DB data by date and category
  const dbDataByDate: Record<string, any> = {};
  (dbMetrics || []).forEach((m: any) => {
    const date = m.measurement_date;
    if (!dbDataByDate[date]) {
      dbDataByDate[date] = { daily: [], sleep: [], activity: [], body: [] };
    }
    
    const category = m.user_metrics.metric_category;
    if (category === 'recovery' || category === 'workout') {
      dbDataByDate[date].daily.push(m.user_metrics.metric_name);
    } else if (category === 'sleep') {
      dbDataByDate[date].sleep.push(m.user_metrics.metric_name);
    } else if (category === 'cardio' || category === 'activity') {
      dbDataByDate[date].activity.push(m.user_metrics.metric_name);
    } else if (category === 'body') {
      dbDataByDate[date].body.push(m.user_metrics.metric_name);
    }
  });

  // Fetch webhook logs
  const { data: webhookLogs } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Compare and find missing data
  const comparison = {
    daily: compareDates(terraData.daily, dbDataByDate, 'daily'),
    sleep: compareDates(terraData.sleep, dbDataByDate, 'sleep'),
    activity: compareDates(terraData.activity, dbDataByDate, 'activity'),
    body: compareDates(terraData.body, dbDataByDate, 'body'),
  };

  const result = {
    provider,
    terra_user_id: terraUserId,
    date_range: { start: startDateStr, end: endDateStr },
    available_in_terra: {
      daily: terraData.daily.map((d: any) => ({ date: d.date, summary: d.summary })),
      sleep: terraData.sleep.map((d: any) => ({ date: d.date, summary: d.summary })),
      activity: terraData.activity.map((d: any) => ({ date: d.date, summary: d.summary })),
      body: terraData.body.map((d: any) => ({ date: d.date, summary: d.summary })),
    },
    in_database: {
      dates_with_data: Object.keys(dbDataByDate).sort().reverse(),
      metrics_by_date: dbDataByDate,
    },
    missing_in_db: comparison,
    webhook_logs: webhookLogs || [],
    last_sync: terraToken.last_sync_date,
  };

  console.log('📊 Diagnostics result:', JSON.stringify(result, null, 2).substring(0, 1000));

  return jsonResponse(result);
}));
