/**
 * Terra Diagnostics - Refactored Example
 * 
 * This shows how to use the new withHandler pattern.
 * Original: 234 lines → Refactored: ~180 lines
 */

import { withAuth, jsonResponse, errorResponse, parseBody, corsHeaders } from '../_shared/handler.ts';

const terraApiKey = Deno.env.get('TERRA_API_KEY')!;
const terraDevId = Deno.env.get('TERRA_DEV_ID')!;

interface DiagnosticsRequest {
  provider: string;
}

Deno.serve(withAuth(async ({ req, supabase, user }) => {
  const { provider } = await parseBody<DiagnosticsRequest>(req);
  console.log(`🔍 [terra-diagnostics] provider: ${provider}, user: ${user!.id}`);

  // Get Terra user_id and token info
  const { data: terraToken, error: tokenError } = await supabase
    .from('terra_tokens')
    .select('*')
    .eq('user_id', user!.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  if (tokenError || !terraToken) {
    return errorResponse('Terra token not found for this provider', 404);
  }

  const terraUserId = terraToken.terra_user_id;
  
  // Date range: last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Fetch data from Terra API for each endpoint
  const endpoints = [
    { type: 'daily', url: 'https://api.tryterra.co/v2/daily' },
    { type: 'sleep', url: 'https://api.tryterra.co/v2/sleep' },
    { type: 'activity', url: 'https://api.tryterra.co/v2/activity' },
    { type: 'body', url: 'https://api.tryterra.co/v2/body' },
  ];

  const terraData: Record<string, any[]> = {
    daily: [],
    sleep: [],
    activity: [],
    body: [],
  };

  // Fetch from Terra API in parallel
  await Promise.all(endpoints.map(async (endpoint) => {
    try {
      const url = `${endpoint.url}?user_id=${terraUserId}&start_date=${startDateStr}&end_date=${endDateStr}`;
      
      const response = await fetch(url, {
        headers: {
          'dev-id': terraDevId,
          'x-api-key': terraApiKey,
        },
      });

      if (!response.ok) {
        console.error(`❌ Terra API error for ${endpoint.type}:`, response.status);
        return;
      }

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        terraData[endpoint.type] = data.data.map((item: any) => {
          const metadata = item.metadata || {};
          const date = metadata.start_time?.split('T')[0] || 
                       metadata.end_time?.split('T')[0] || 
                       'unknown';
          
          return {
            date,
            summary: getSummary(endpoint.type, item),
          };
        });
      }
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint.type}:`, error);
    }
  }));

  // Fetch webhook logs
  const { data: webhookLogs } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return jsonResponse({
    provider,
    terra_user_id: terraUserId,
    date_range: { start: startDateStr, end: endDateStr },
    available_in_terra: terraData,
    webhook_logs: webhookLogs || [],
    last_sync: terraToken.last_sync_date,
  });
}));

function getSummary(type: string, item: any): string {
  switch (type) {
    case 'daily':
      return `Recovery: ${item.scores?.recovery_score ?? 'N/A'}, Strain: ${item.scores?.strain ?? 'N/A'}`;
    case 'sleep':
      const duration = item.sleep_durations_data?.sleep_duration_seconds;
      return `Duration: ${duration ? (duration / 3600).toFixed(1) + 'h' : 'N/A'}`;
    case 'activity':
      return `Calories: ${item.calories_data?.total_burned_calories ?? 'N/A'}`;
    case 'body':
      return `Weight: ${item.body_data?.weight_kg ?? 'N/A'}kg`;
    default:
      return 'Unknown';
  }
}
