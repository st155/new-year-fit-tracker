import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Backfill running pace measurements from existing Garmin activity data
 * Processes terra_webhooks_raw entries to extract lap_data and create measurements
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { userId, limit = 100 } = await req.json().catch(() => ({}));

    console.log('🏃 Starting Garmin pace backfill', { userId, limit });

    // Get Garmin running activity webhooks
    let query = supabase
      .from('terra_webhooks_raw')
      .select('id, webhook_id, user_id, payload, created_at')
      .eq('type', 'activity')
      .eq('provider', 'GARMIN')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: webhooks, error: webhooksError } = await query;

    if (webhooksError) {
      throw new Error(`Failed to fetch webhooks: ${webhooksError.message}`);
    }

    console.log(`Found ${webhooks?.length || 0} Garmin webhooks to process`);

    let processed = 0;
    let measurementsCreated = 0;
    const results: any[] = [];

    for (const webhook of webhooks || []) {
      try {
        const payload = webhook.payload;
        const data = payload?.data || [];

        for (const activity of data) {
          const metadata = activity.metadata;
          
          // Skip non-running activities (type 8 = Running, 1 = Treadmill)
          const isRunning = metadata?.type === 8 || metadata?.type === 1;
          if (!isRunning) continue;

          const hasLapData = activity.lap_data?.laps?.length > 0;
          if (!hasLapData) continue;

          const workoutDate = metadata.start_time?.split('T')[0];
          if (!workoutDate) continue;

          // Get app user_id from terra_tokens
          const { data: tokenData } = await supabase
            .from('terra_tokens')
            .select('user_id')
            .eq('terra_user_id', payload.user?.user_id)
            .eq('is_active', true)
            .single();

          if (!tokenData) {
            console.log('No user found for terra_user_id:', payload.user?.user_id);
            continue;
          }

          const appUserId = tokenData.user_id;

          // Find ~1km laps
          const kmLaps = activity.lap_data.laps.filter(
            (lap: any) => lap.distance_meters >= 900 && lap.distance_meters <= 1100 && lap.avg_speed_meters_per_second > 0
          );

          if (kmLaps.length === 0) {
            console.log('No ~1km laps in activity', { workoutDate, userId: appUserId });
            continue;
          }

          // Find best (fastest) lap
          const bestLap = kmLaps.reduce((best: any, lap: any) => {
            const lapPace = 1000 / lap.avg_speed_meters_per_second;
            const bestPace = 1000 / best.avg_speed_meters_per_second;
            return lapPace < bestPace ? lap : best;
          });

          const paceSeconds = 1000 / bestLap.avg_speed_meters_per_second;
          const paceMinutes = paceSeconds / 60;
          const paceFormatted = `${Math.floor(paceMinutes)}:${String(Math.round((paceMinutes % 1) * 60)).padStart(2, '0')}`;

          console.log('🏃‍♂️ Calculated pace', { 
            userId: appUserId, 
            workoutDate, 
            paceMinutes: Math.round(paceMinutes * 100) / 100,
            paceFormatted 
          });

          // Find user's running goal
          const { data: runGoal } = await supabase
            .from('goals')
            .select('id, target_unit')
            .eq('user_id', appUserId)
            .ilike('goal_name', '%Бег%1%км%')
            .maybeSingle();

          if (!runGoal) {
            console.log('No running goal found for user', { userId: appUserId });
            continue;
          }

          // Check if measurement already exists for this goal/user/date/source
          const { data: existingMeasurement } = await supabase
            .from('measurements')
            .select('id, value')
            .eq('goal_id', runGoal.id)
            .eq('user_id', appUserId)
            .eq('measurement_date', workoutDate)
            .eq('source', 'garmin')
            .maybeSingle();

          const paceValue = Math.round(paceMinutes * 100) / 100;
          
          let measurementError: any = null;
          
          if (existingMeasurement) {
            // Update if the new pace is better (lower = faster)
            if (paceValue < existingMeasurement.value) {
              const { error } = await supabase
                .from('measurements')
                .update({
                  value: paceValue,
                  notes: `Backfilled from Garmin: ${paceFormatted} min/km`
                })
                .eq('id', existingMeasurement.id);
              measurementError = error;
            } else {
              // Skip - existing measurement is better
              console.log('Skipping - existing measurement is better', { 
                existing: existingMeasurement.value, 
                new: paceValue 
              });
              continue;
            }
          } else {
            // Insert new measurement
            const { error } = await supabase
              .from('measurements')
              .insert({
                goal_id: runGoal.id,
                user_id: appUserId,
                value: paceValue,
                measurement_date: workoutDate,
                unit: runGoal.target_unit || 'мин',
                source: 'garmin',
                notes: `Backfilled from Garmin: ${paceFormatted} min/km`
              });
            measurementError = error;
          }

          if (measurementError) {
            console.error('Failed to insert measurement', measurementError);
            results.push({ 
              status: 'error', 
              workoutDate, 
              userId: appUserId,
              error: measurementError.message 
            });
          } else {
            measurementsCreated++;
            results.push({ 
              status: 'created', 
              workoutDate, 
              userId: appUserId,
              pace: paceFormatted 
            });
            console.log('✅ Measurement created', { workoutDate, userId: appUserId, pace: paceFormatted });
          }
        }

        processed++;
      } catch (err) {
        console.error('Error processing webhook', { webhookId: webhook.webhook_id, error: err });
      }
    }

    console.log('🏁 Backfill completed', { processed, measurementsCreated });

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        measurementsCreated,
        results: results.slice(0, 50) // Limit results in response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backfill error', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
