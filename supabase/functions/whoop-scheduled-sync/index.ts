import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v1';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

// Only sync for whitelisted users
const WHOOP_DIRECT_USERS = [
  'b9fc3f8b-e7bf-44f9-a591-cec47f9c93ae', // Alexey Gubarev
  'f9e07829-5fd7-4e27-94eb-b3f5c49b4e7e', // Anton
  '932aab9d-a104-4ba2-885f-2dfdc5dd5df2', // Pavel Radaev
];

async function refreshTokenIfNeeded(serviceClient: any, tokenData: any): Promise<string | null> {
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  console.log(`🔄 [scheduled-sync] Refreshing token for user ${tokenData.user_id}`);

  const clientId = Deno.env.get('WHOOP_CLIENT_ID');
  const clientSecret = Deno.env.get('WHOOP_CLIENT_SECRET');

  try {
    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!tokenResponse.ok) {
      console.error(`❌ Token refresh failed for user ${tokenData.user_id}`);
      await serviceClient
        .from('whoop_tokens')
        .update({ is_active: false })
        .eq('user_id', tokenData.user_id);
      return null;
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await serviceClient
      .from('whoop_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || tokenData.refresh_token,
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', tokenData.user_id);

    return tokens.access_token;
  } catch (error) {
    console.error(`❌ Token refresh error for user ${tokenData.user_id}:`, error);
    return null;
  }
}

async function fetchWhoopData(accessToken: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status}`);
  }

  return response.json();
}

async function syncUserData(serviceClient: any, tokenData: any) {
  const userId = tokenData.user_id;
  const accessToken = await refreshTokenIfNeeded(serviceClient, tokenData);
  
  if (!accessToken) {
    return { success: false, error: 'Token refresh failed' };
  }

  // Sync last 2 days for scheduled sync (more frequent, less data)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 2);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = new Date().toISOString().split('T')[0];

  const metricsToInsert: any[] = [];

  try {
    // Fetch cycles
    const cyclesData = await fetchWhoopData(accessToken, '/cycle', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const cycle of cyclesData.records || []) {
      const measurementDate = cycle.start?.split('T')[0];
      if (!measurementDate) continue;

      if (cycle.score?.strain !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Day Strain',
          metric_category: 'activity',
          value: cycle.score.strain,
          unit: 'strain',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_cycle_${cycle.id}`,
        });
      }
    }

    // Fetch recovery
    const recoveryData = await fetchWhoopData(accessToken, '/recovery', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const recovery of recoveryData.records || []) {
      const measurementDate = recovery.created_at?.split('T')[0];
      if (!measurementDate) continue;

      if (recovery.score?.recovery_score !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Recovery Score',
          metric_category: 'recovery',
          value: recovery.score.recovery_score,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_recovery_${recovery.cycle_id}`,
        });
      }

      if (recovery.score?.hrv_rmssd_milli !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'HRV RMSSD',
          metric_category: 'recovery',
          value: recovery.score.hrv_rmssd_milli,
          unit: 'ms',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_hrv_${recovery.cycle_id}`,
        });
      }

      if (recovery.score?.resting_heart_rate !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Resting Heart Rate',
          metric_category: 'heart',
          value: recovery.score.resting_heart_rate,
          unit: 'bpm',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_rhr_${recovery.cycle_id}`,
        });
      }
    }

    // Fetch sleep
    const sleepData = await fetchWhoopData(accessToken, '/sleep', {
      start: `${startStr}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    });

    for (const sleep of sleepData.records || []) {
      const measurementDate = sleep.start?.split('T')[0];
      if (!measurementDate) continue;

      if (sleep.score?.sleep_performance_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Sleep Performance',
          metric_category: 'sleep',
          value: sleep.score.sleep_performance_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_sleep_perf_${sleep.id}`,
        });
      }

      if (sleep.score?.sleep_efficiency_percentage !== undefined) {
        metricsToInsert.push({
          user_id: userId,
          metric_name: 'Sleep Efficiency',
          metric_category: 'sleep',
          value: sleep.score.sleep_efficiency_percentage,
          unit: '%',
          source: 'whoop',
          provider: 'whoop',
          measurement_date: measurementDate,
          priority: 1,
          confidence_score: 95,
          external_id: `whoop_sleep_eff_${sleep.id}`,
        });
      }
    }

    // Insert metrics
    if (metricsToInsert.length > 0) {
      await serviceClient
        .from('unified_metrics')
        .upsert(metricsToInsert, {
          onConflict: 'user_id,metric_name,measurement_date,source',
          ignoreDuplicates: false,
        });
    }

    // Update last sync time
    await serviceClient
      .from('whoop_tokens')
      .update({ 
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    console.log(`✅ [scheduled-sync] User ${userId}: ${metricsToInsert.length} metrics synced`);
    return { success: true, metrics_count: metricsToInsert.length };

  } catch (error: any) {
    console.error(`❌ [scheduled-sync] Error for user ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`⏰ [whoop-scheduled-sync] Starting scheduled sync...`);

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all active whoop tokens for whitelisted users
    const { data: tokens, error: tokensError } = await serviceClient
      .from('whoop_tokens')
      .select('*')
      .eq('is_active', true)
      .in('user_id', WHOOP_DIRECT_USERS);

    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }

    console.log(`📋 [whoop-scheduled-sync] Found ${tokens?.length || 0} active tokens`);

    const results: any[] = [];

    for (const tokenData of tokens || []) {
      try {
        const result = await syncUserData(serviceClient, tokenData);
        results.push({ user_id: tokenData.user_id, ...result });
      } catch (error: any) {
        results.push({ user_id: tokenData.user_id, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ [whoop-scheduled-sync] Completed: ${successCount}/${results.length} users synced`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_synced: successCount,
        total_users: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [whoop-scheduled-sync] Error:`, error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
