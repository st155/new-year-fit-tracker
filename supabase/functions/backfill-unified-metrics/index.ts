import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { writeToUnifiedMetrics } from '../_shared/unified-metrics-writer.ts';

/**
 * Backfill edge function: migrates data from metric_values to client_unified_metrics
 * This should be run once to populate the new unified metrics table with historical data
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from request (optional - if not provided, backfills all users)
    const { userId, daysBack = 30 } = await req.json();

    console.log('🔄 Starting backfill...', { userId: userId || 'ALL', daysBack });

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Fetch metric_values with metric names
    let query = supabase
      .from('metric_values')
      .select(`
        user_id,
        value,
        measurement_date,
        created_at,
        user_metrics!inner(
          metric_name,
          unit,
          source,
          metric_category
        )
      `)
      .gte('measurement_date', startDateStr)
      .order('measurement_date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: metricValues, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching metric_values:', fetchError);
      throw fetchError;
    }

    if (!metricValues || metricValues.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No data to backfill',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${metricValues.length} metric values to backfill`);

    // Process metrics
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Target metrics for dashboard
    const targetMetrics = new Set([
      'Recovery Score',
      'Day Strain',
      'Max Heart Rate',
      'Average Heart Rate',
      'Resting Heart Rate',
      'Training Readiness',
      'Body Battery',
      'Sleep Efficiency',
      'Sleep Performance',
      'Steps',
      'Active Calories',
      'Weight',
      'Body Fat Percentage',
      'HRV RMSSD',
      'VO2Max',
    ]);

    for (const row of metricValues) {
      try {
        const metricData = Array.isArray(row.user_metrics) 
          ? row.user_metrics[0] 
          : row.user_metrics;

        if (!metricData) {
          console.warn('⚠️ No user_metrics data for row, skipping');
          continue;
        }

        const metricName = metricData.metric_name;
        
        // Only backfill target metrics
        if (!targetMetrics.has(metricName)) {
          continue;
        }

        const result = await writeToUnifiedMetrics(supabase, {
          userId: row.user_id,
          metricName,
          source: metricData.source || 'unknown',
          value: Number(row.value),
          unit: metricData.unit || '',
          measurementDate: row.measurement_date,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          if (result.error && errors.length < 10) {
            errors.push(result.error);
          }
        }
      } catch (e: any) {
        errorCount++;
        console.error('❌ Error processing row:', e);
        if (errors.length < 10) {
          errors.push(e.message);
        }
      }
    }

    console.log(`✅ Backfill complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: metricValues.length,
        successCount,
        errorCount,
        sampleErrors: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
