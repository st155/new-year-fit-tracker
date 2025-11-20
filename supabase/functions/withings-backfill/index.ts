import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Backfill Withings data by directly calling Terra API
 * This bypasses webhook processing and writes directly to unified_metrics
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const terraApiKey = Deno.env.get('TERRA_API_KEY');
    const terraDevId = Deno.env.get('TERRA_DEV_ID');

    if (!terraApiKey || !terraDevId) {
      throw new Error('Terra API credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user');
    }

    console.log('[WITHINGS BACKFILL] Starting backfill for user:', user.id);

    // Get Withings token
    const { data: token, error: tokenError } = await supabase
      .from('terra_tokens')
      .select('terra_user_id, provider')
      .eq('user_id', user.id)
      .eq('provider', 'WITHINGS')
      .eq('is_active', true)
      .single();

    if (tokenError || !token) {
      throw new Error('No active Withings connection found');
    }

    console.log('[WITHINGS BACKFILL] Found token:', {
      terraUserId: token.terra_user_id,
      provider: token.provider
    });

    // Get parameters
    const { daysBack = 30 } = await req.json().catch(() => ({}));
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('[WITHINGS BACKFILL] Requesting data from Terra API:', {
      terraUserId: token.terra_user_id,
      startDate: startDateStr,
      endDate: endDateStr,
      daysBack
    });

    // Call Terra API for body data
    const terraUrl = `https://api.tryterra.co/v2/body?user_id=${token.terra_user_id}&start_date=${startDateStr}&end_date=${endDateStr}`;
    
    const terraResponse = await fetch(terraUrl, {
      method: 'GET',
      headers: {
        'dev-id': terraDevId,
        'x-api-key': terraApiKey,
      },
    });

    if (!terraResponse.ok) {
      const errorText = await terraResponse.text();
      console.error('[WITHINGS BACKFILL] Terra API error:', {
        status: terraResponse.status,
        error: errorText
      });
      throw new Error(`Terra API error: ${terraResponse.status} - ${errorText}`);
    }

    const result = await terraResponse.json();
    
    console.log('[WITHINGS BACKFILL] Terra API response:', {
      status: result.status,
      dataCount: result.data?.length,
      dataPreview: result.data?.[0] ? {
        hasMetadata: !!result.data[0].metadata,
        hasMeasurementsData: !!result.data[0].measurements_data,
        measurementCount: result.data[0].measurements_data?.measurements?.length
      } : null
    });

    if (!result.data || result.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No data received from Terra API',
          metricsInserted: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process data and insert into unified_metrics
    const metricsToInsert: any[] = [];

    for (const body of result.data) {
      const date = body.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

      // Process Withings measurements_data.measurements[]
      if (body.measurements_data?.measurements && Array.isArray(body.measurements_data.measurements)) {
        console.log(`[WITHINGS BACKFILL] Processing ${body.measurements_data.measurements.length} measurements`);
        
        for (const measurement of body.measurements_data.measurements) {
          const measurementDate = measurement.measurement_time?.split('T')[0] || date;
          const measurementTime = measurement.measurement_time || `${date}T00:00:00Z`;
          const uniqueId = `terra_withings_${measurementDate}_${measurementTime.replace(/[:.]/g, '')}`;

          console.log('[WITHINGS BACKFILL] Processing measurement:', {
            date: measurementDate,
            weight: measurement.weight_kg,
            bodyfat: measurement.bodyfat_percentage,
            muscle: measurement.muscle_mass_g
          });

          if (measurement.weight_kg) {
            metricsToInsert.push({
              user_id: user.id,
              metric_name: 'Weight',
              metric_category: 'body',
              value: measurement.weight_kg,
              unit: 'kg',
              measurement_date: measurementDate,
              source: 'WITHINGS',
              provider: 'WITHINGS',
              external_id: `${uniqueId}_weight`,
              priority: 4,
              confidence_score: 50,
            });
          }

          if (measurement.bodyfat_percentage) {
            metricsToInsert.push({
              user_id: user.id,
              metric_name: 'Body Fat Percentage',
              metric_category: 'body',
              value: measurement.bodyfat_percentage,
              unit: '%',
              measurement_date: measurementDate,
              source: 'WITHINGS',
              provider: 'WITHINGS',
              external_id: `${uniqueId}_bodyfat`,
              priority: 4,
              confidence_score: 50,
            });
          }

          if (measurement.muscle_mass_g) {
            metricsToInsert.push({
              user_id: user.id,
              metric_name: 'Muscle Mass',
              metric_category: 'body',
              value: measurement.muscle_mass_g / 1000, // Convert to kg
              unit: 'kg',
              measurement_date: measurementDate,
              source: 'WITHINGS',
              provider: 'WITHINGS',
              external_id: `${uniqueId}_muscle`,
              priority: 4,
              confidence_score: 50,
            });
          }
        }
      }
    }

    console.log(`[WITHINGS BACKFILL] Inserting ${metricsToInsert.length} metrics into unified_metrics`);

    if (metricsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('unified_metrics')
        .upsert(metricsToInsert, {
          onConflict: 'user_id,metric_name,measurement_date,source',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('[WITHINGS BACKFILL] Insert error:', insertError);
        throw insertError;
      }

      console.log('[WITHINGS BACKFILL] Successfully inserted metrics');
    }

    return new Response(
      JSON.stringify({
        success: true,
        metricsInserted: metricsToInsert.length,
        dateRange: {
          start: startDateStr,
          end: endDateStr
        },
        metrics: {
          weight: metricsToInsert.filter(m => m.metric_name === 'Weight').length,
          bodyfat: metricsToInsert.filter(m => m.metric_name === 'Body Fat Percentage').length,
          muscle: metricsToInsert.filter(m => m.metric_name === 'Muscle Mass').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[WITHINGS BACKFILL] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
