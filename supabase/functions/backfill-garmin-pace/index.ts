import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Calculate best 1km pace using sliding window on GPS distance samples
 * This matches how Garmin calculates "Best 1km" on the watch
 */
function extractBest1kmPace(activity: any): { paceMinutes: number; method: string } | null {
  // Try distance_samples first (most accurate, matches Garmin)
  const samples = activity?.distance_data?.detailed?.distance_samples;
  
  if (samples && samples.length >= 60) {
    let bestTimeSeconds = Infinity;
    
    for (let i = 0; i < samples.length; i++) {
      const startDist = samples[i].distance_meters;
      const startTime = samples[i].timer_duration_seconds;
      
      // Find first point where distance >= startDist + 1000
      for (let j = i + 1; j < samples.length; j++) {
        const dist = samples[j].distance_meters - startDist;
        if (dist >= 1000) {
          const timeForSegment = samples[j].timer_duration_seconds - startTime;
          // Interpolate to exact 1km
          const adjustedTime = timeForSegment * (1000 / dist);
          if (adjustedTime < bestTimeSeconds && adjustedTime > 60) { // Sanity check: > 1 min/km
            bestTimeSeconds = adjustedTime;
          }
          break;
        }
      }
    }
    
    if (bestTimeSeconds < Infinity) {
      return { paceMinutes: bestTimeSeconds / 60, method: 'distance_samples' };
    }
  }
  
  // Fallback to lap_data
  const laps = activity?.lap_data?.laps;
  if (laps && laps.length > 0) {
    const kmLaps = laps.filter(
      (lap: any) => lap.distance_meters >= 900 && lap.distance_meters <= 1100 && lap.avg_speed_meters_per_second > 0
    );
    
    if (kmLaps.length > 0) {
      const bestLap = kmLaps.reduce((best: any, lap: any) => {
        const lapPace = 1000 / lap.avg_speed_meters_per_second;
        const bestPace = 1000 / best.avg_speed_meters_per_second;
        return lapPace < bestPace ? lap : best;
      });
      
      const paceSeconds = 1000 / bestLap.avg_speed_meters_per_second;
      return { paceMinutes: paceSeconds / 60, method: 'lap_data' };
    }
  }
  
  return null;
}

/**
 * Backfill running pace measurements from existing Garmin activity data
 * Uses sliding window algorithm on GPS samples to match Garmin's "Best 1km"
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

    console.log('🏃 Starting Garmin pace backfill (sliding window)', { userId, limit });

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

          const workoutDate = metadata.start_time?.split('T')[0];
          if (!workoutDate) continue;

          // Get app user_id from reference_id (this is the app_user_id set during Terra auth)
          // This approach works even when terra_user_id changes (e.g., user reconnects with new device)
          const referenceId = payload?.user?.reference_id;
          
          if (!referenceId) {
            console.log('No reference_id in payload, skipping. terra_user_id:', payload.user?.user_id);
            continue;
          }

          const appUserId = referenceId;

          // Calculate best 1km pace using sliding window
          const paceResult = extractBest1kmPace(activity);
          
          if (!paceResult) {
            console.log('Could not calculate pace', { workoutDate, userId: appUserId });
            continue;
          }

          const { paceMinutes, method } = paceResult;
          const paceValue = Math.round(paceMinutes * 100) / 100;
          const mins = Math.floor(paceMinutes);
          const secs = Math.round((paceMinutes - mins) * 60);
          const paceFormatted = `${mins}:${String(secs).padStart(2, '0')}`;

          console.log('🏃‍♂️ Best 1km pace calculated', { 
            userId: appUserId, 
            workoutDate, 
            paceMinutes: paceValue,
            paceFormatted,
            method
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

          let measurementError: any = null;
          
          if (existingMeasurement) {
            // Update if the new pace is better (lower = faster)
            if (paceValue < existingMeasurement.value) {
              const { error } = await supabase
                .from('measurements')
                .update({
                  value: paceValue,
                  notes: `Best 1km from Garmin (${method}): ${paceFormatted} min/km`
                })
                .eq('id', existingMeasurement.id);
              measurementError = error;
              console.log('✅ Updated with better pace', { old: existingMeasurement.value, new: paceValue });
            } else {
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
                notes: `Best 1km from Garmin (${method}): ${paceFormatted} min/km`
              });
            measurementError = error;
          }

          if (measurementError) {
            console.error('Failed to save measurement', measurementError);
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
              pace: paceFormatted,
              method
            });
            console.log('✅ Measurement saved', { workoutDate, userId: appUserId, pace: paceFormatted, method });
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
        results: results.slice(0, 50)
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