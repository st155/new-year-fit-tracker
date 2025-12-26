import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Priority order for metrics (your benchmark)
const METRIC_PRIORITY: string[] = [
  'Recovery Score',
  'Day Strain',
  'Sleep Duration',
  'Sleep Efficiency',
  'HRV RMSSD',
  'Resting Heart Rate',
  'Steps',
  'Active Calories',
  'Weight',
  'Body Fat Percentage',
  'Max Heart Rate',
  'VO2Max',
  'VO2 Max',
  'Training Readiness',
  'Muscle Mass',
  'Skeletal Muscle Mass',
  'BMI',
  'BMR',
  'Deep Sleep Duration',
  'REM Sleep Duration',
  'Light Sleep Duration',
  'Sleep Score',
  'Respiratory Rate',
  'SpO2',
  'Skin Temperature',
  'Calories',
  'Distance',
  'Workout Count',
  'Average Strain',
];

function sortByPriority(metrics: string[]): string[] {
  return metrics.sort((a, b) => {
    const priorityA = METRIC_PRIORITY.indexOf(a);
    const priorityB = METRIC_PRIORITY.indexOf(b);
    
    // If both have priority, sort by priority
    if (priorityA !== -1 && priorityB !== -1) {
      return priorityA - priorityB;
    }
    // If only A has priority, A comes first
    if (priorityA !== -1) return -1;
    // If only B has priority, B comes first
    if (priorityB !== -1) return 1;
    // Otherwise, sort alphabetically
    return a.localeCompare(b);
  });
}

interface PopulateResult {
  userId: string;
  username?: string;
  metricsFound: number;
  widgetsCreated: number;
  metrics: string[];
}

async function populateForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<PopulateResult> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Get user's metrics from last 30 days
  const { data: userMetrics, error: metricsError } = await supabase
    .from('unified_metrics')
    .select('metric_name')
    .eq('user_id', userId)
    .gte('measurement_date', thirtyDaysAgoStr);

  if (metricsError) {
    console.error(`Error fetching metrics for ${userId}:`, metricsError);
    throw metricsError;
  }

  // Get unique metric names
  const availableMetrics = [...new Set(userMetrics?.map(m => m.metric_name) || [])];
  
  if (availableMetrics.length === 0) {
    console.log(`No metrics found for user ${userId}`);
    return {
      userId,
      metricsFound: 0,
      widgetsCreated: 0,
      metrics: [],
    };
  }

  // Sort by priority
  const sortedMetrics = sortByPriority(availableMetrics);
  
  console.log(`User ${userId}: Found ${sortedMetrics.length} metrics: ${sortedMetrics.join(', ')}`);

  // Delete existing widgets
  const { error: deleteError } = await supabase
    .from('dashboard_widgets')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error(`Error deleting widgets for ${userId}:`, deleteError);
    throw deleteError;
  }

  // Create new widgets with proper positions
  const widgetsToCreate = sortedMetrics.map((metric, index) => ({
    user_id: userId,
    metric_name: metric,
    position: index,
    is_visible: true,
  }));

  const { error: insertError } = await supabase
    .from('dashboard_widgets')
    .insert(widgetsToCreate);

  if (insertError) {
    console.error(`Error inserting widgets for ${userId}:`, insertError);
    throw insertError;
  }

  // Get username for logging
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('user_id', userId)
    .single();

  return {
    userId,
    username: profile?.username || profile?.full_name || userId.slice(0, 8),
    metricsFound: sortedMetrics.length,
    widgetsCreated: widgetsToCreate.length,
    metrics: sortedMetrics,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional user_id filter
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body.user_id || null;
    } catch {
      // No body or invalid JSON, process all users
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Get all users with metrics in last 30 days
    let query = supabase
      .from('unified_metrics')
      .select('user_id')
      .gte('measurement_date', thirtyDaysAgoStr);

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data: usersWithMetrics, error: usersError } = await query;

    if (usersError) {
      throw usersError;
    }

    // Get unique user IDs
    const userIds = [...new Set(usersWithMetrics?.map(u => u.user_id) || [])];
    
    console.log(`Processing ${userIds.length} users with metrics`);

    const results: PopulateResult[] = [];
    const errors: { userId: string; error: string }[] = [];

    // Process each user
    for (const userId of userIds) {
      try {
        const result = await populateForUser(supabase, userId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Summary
    const totalWidgets = results.reduce((sum, r) => sum + r.widgetsCreated, 0);
    const usersProcessed = results.length;
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Users processed: ${usersProcessed}`);
    console.log(`Total widgets created: ${totalWidgets}`);
    console.log(`Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          usersProcessed,
          totalWidgetsCreated: totalWidgets,
          errorsCount: errors.length,
        },
        results: results.map(r => ({
          userId: r.userId,
          username: r.username,
          widgetsCreated: r.widgetsCreated,
          metrics: r.metrics,
        })),
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in populate-dashboards:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
