import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Backfill Withings Body Fat Percentage data from terra_webhooks_raw to unified_metrics
 * This recovers historical data that was not properly synced to unified_metrics
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

    // Get parameters from request
    const { userId, daysBack = 30 } = await req.json().catch(() => ({}));

    console.log('🔄 Starting Withings Body Fat backfill...', { userId: userId || 'ALL', daysBack });

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString();

    // Fetch Withings body webhooks
    let query = supabase
      .from('terra_webhooks_raw')
      .select('*')
      .eq('provider', 'WITHINGS')
      .eq('type', 'body')
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: webhooks, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching webhooks:', fetchError);
      throw fetchError;
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No Withings body webhooks to backfill',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${webhooks.length} Withings body webhooks to process`);

    // Process webhooks
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const metricsToInsert: any[] = [];

    for (const webhook of webhooks) {
      try {
        const payload = webhook.payload;
        const provider = webhook.provider.toLowerCase();
        const userId = webhook.user_id;

        if (!payload?.data || !Array.isArray(payload.data)) {
          continue;
        }

        for (const body of payload.data) {
          // Process Withings measurements_data.measurements[]
          if (body.measurements_data?.measurements && Array.isArray(body.measurements_data.measurements)) {
            for (const measurement of body.measurements_data.measurements) {
              const measurementDate = measurement.measurement_time?.split('T')[0];
              
              if (!measurementDate) continue;

              const measurementTime = measurement.measurement_time || `${measurementDate}T00:00:00Z`;
              const uniqueId = `terra_${provider}_${measurementDate}_${measurementTime.replace(/[:.]/g, '')}`;

              // Body Fat Percentage
              if (measurement.bodyfat_percentage) {
                metricsToInsert.push({
                  user_id: userId,
                  metric_name: 'Body Fat Percentage',
                  metric_category: 'body',
                  value: measurement.bodyfat_percentage,
                  unit: '%',
                  measurement_date: measurementDate,
                  source: provider,
                  provider: provider.toUpperCase(),
                  external_id: `${uniqueId}_bodyfat`,
                  priority: 4, // Withings priority
                  confidence_score: 50,
                });
              }

              // Weight
              if (measurement.weight_kg) {
                metricsToInsert.push({
                  user_id: userId,
                  metric_name: 'Weight',
                  metric_category: 'body',
                  value: measurement.weight_kg,
                  unit: 'kg',
                  measurement_date: measurementDate,
                  source: provider,
                  provider: provider.toUpperCase(),
                  external_id: `${uniqueId}_weight`,
                  priority: 4,
                  confidence_score: 50,
                });
              }

              // Muscle Mass
              if (measurement.muscle_mass_g) {
                metricsToInsert.push({
                  user_id: userId,
                  metric_name: 'Muscle Mass',
                  metric_category: 'body',
                  value: measurement.muscle_mass_g / 1000, // Convert to kg
                  unit: 'kg',
                  measurement_date: measurementDate,
                  source: provider,
                  provider: provider.toUpperCase(),
                  external_id: `${uniqueId}_muscle`,
                  priority: 4,
                  confidence_score: 50,
                });
              }
            }
          }
        }
      } catch (e: any) {
        errorCount++;
        console.error('❌ Error processing webhook:', e);
        if (errors.length < 10) {
          errors.push(e.message);
        }
      }
    }

    // Deduplicate metrics (keep last by measurement_date + source)
    const uniqueMetrics = new Map();
    metricsToInsert.forEach(m => {
      const key = `${m.user_id}_${m.metric_name}_${m.measurement_date}_${m.source}`;
      uniqueMetrics.set(key, m);
    });
    const finalMetrics = Array.from(uniqueMetrics.values());

    console.log(`📝 Inserting ${finalMetrics.length} unique metrics into unified_metrics`);

    // Batch upsert to unified_metrics
    if (finalMetrics.length > 0) {
      const { error: upsertError } = await supabase
        .from('unified_metrics')
        .upsert(finalMetrics, {
          onConflict: 'user_id,metric_name,measurement_date,source',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('❌ Error upserting to unified_metrics:', upsertError);
        throw upsertError;
      }

      successCount = finalMetrics.length;
    }

    console.log(`✅ Backfill complete: ${successCount} metrics inserted, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        webhooksProcessed: webhooks.length,
        metricsInserted: successCount,
        errors: errorCount,
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

