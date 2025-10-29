import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SleepData {
  deep_sleep_duration?: number;
  rem_sleep_duration?: number;
  light_sleep_duration?: number;
  awake_duration?: number;
  total_sleep_duration?: number;
}

function calculateSleepEfficiency(sleepData: SleepData): number | null {
  try {
    const deep = sleepData.deep_sleep_duration || 0;
    const rem = sleepData.rem_sleep_duration || 0;
    const light = sleepData.light_sleep_duration || 0;
    const awake = sleepData.awake_duration || 0;

    const totalSleepTime = deep + rem + light;
    const timeInBed = totalSleepTime + awake;

    if (timeInBed === 0) return null;

    const efficiency = (totalSleepTime / timeInBed) * 100;
    return Math.round(efficiency * 10) / 10; // Round to 1 decimal
  } catch (error) {
    console.error('Error calculating sleep efficiency:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, metricId, backfillDays } = await req.json();

    // Backfill mode: process last N days
    if (backfillDays) {
      console.log(`Starting backfill for user ${userId}, last ${backfillDays} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - backfillDays);
      
      const { data: sleepMetrics, error: fetchError } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_name', 'Sleep Duration')
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      let processedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const metric of sleepMetrics || []) {
        // Check if Sleep Efficiency already exists for this date and source
        const { data: existing } = await supabase
          .from('unified_metrics')
          .select('id')
          .eq('user_id', userId)
          .eq('metric_name', 'Sleep Efficiency')
          .eq('source', metric.source)
          .eq('measurement_date', metric.measurement_date)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        const efficiency = calculateSleepEfficiency(metric.metadata || {});
        
        if (efficiency !== null) {
          const { error: insertError } = await supabase
            .from('unified_metrics')
            .insert({
              user_id: userId,
              metric_name: 'Sleep Efficiency',
              value: efficiency,
              unit: '%',
              source: metric.source,
              measurement_date: metric.measurement_date,
              priority: (metric.priority || 0) + 1,
              metric_category: 'sleep',
              metadata: { calculated_from: 'sleep_duration', original_metric_id: metric.id }
            });

          if (insertError) {
            errors.push(`Failed to insert for ${metric.measurement_date}: ${insertError.message}`);
          } else {
            processedCount++;
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          processedCount, 
          skippedCount,
          errors: errors.length > 0 ? errors : undefined
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single metric mode: process one specific metric
    if (metricId) {
      const { data: metric, error: fetchError } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('id', metricId)
        .single();

      if (fetchError || !metric) {
        throw new Error('Metric not found');
      }

      if (metric.metric_name !== 'Sleep Duration') {
        return new Response(
          JSON.stringify({ success: false, message: 'Not a Sleep Duration metric' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if Sleep Efficiency already exists
      const { data: existing } = await supabase
        .from('unified_metrics')
        .select('id')
        .eq('user_id', metric.user_id)
        .eq('metric_name', 'Sleep Efficiency')
        .eq('source', metric.source)
        .eq('measurement_date', metric.measurement_date)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, message: 'Sleep Efficiency already exists', skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const efficiency = calculateSleepEfficiency(metric.metadata || {});

      if (efficiency === null) {
        return new Response(
          JSON.stringify({ success: false, message: 'Cannot calculate efficiency from provided data' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: insertError } = await supabase
        .from('unified_metrics')
        .insert({
          user_id: metric.user_id,
          metric_name: 'Sleep Efficiency',
          value: efficiency,
          unit: '%',
          source: metric.source,
          measurement_date: metric.measurement_date,
          priority: (metric.priority || 0) + 1,
          metric_category: 'sleep',
          metadata: { calculated_from: 'sleep_duration', original_metric_id: metricId }
        });

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, efficiency }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Either metricId or backfillDays must be provided');

  } catch (error) {
    console.error('Error in calculate-sleep-efficiency:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
