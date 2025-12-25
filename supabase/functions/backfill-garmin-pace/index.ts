import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const BATCH_SIZE = 5; // Process webhooks in small batches to avoid memory issues

/**
 * Calculate best 1km pace using sliding window on GPS distance samples
 * This matches how Garmin calculates "Best 1km" on the watch
 */
function extractBest1kmPace(distanceData: any, lapData: any): { paceMinutes: number; method: string } | null {
  // Try distance_samples first (most accurate, matches Garmin)
  const samples = distanceData?.detailed?.distance_samples;
  
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
  const laps = lapData?.laps;
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
 * Process a single activity and create/update measurement
 */
async function processActivity(
  supabase: any,
  activity: any,
  referenceId: string,
  terraUserId: string
): Promise<{ status: string; workoutDate?: string; pace?: string; method?: string; error?: string } | null> {
  const metadata = activity.metadata;
  
  // Skip non-running activities (type 8 = Running, 1 = Treadmill)
  const isRunning = metadata?.type === 8 || metadata?.type === 1;
  if (!isRunning) return null;

  const workoutDate = metadata.start_time?.split('T')[0];
  if (!workoutDate) return null;

  const appUserId = referenceId;

  // Calculate best 1km pace using only the fields we need
  const paceResult = extractBest1kmPace(activity.distance_data, activity.lap_data);
  
  if (!paceResult) {
    console.log('Could not calculate pace', { workoutDate, userId: appUserId });
    return null;
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
    return null;
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
      return null;
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
    return { status: 'error', workoutDate, error: measurementError.message };
  }

  return { status: 'created', workoutDate, pace: paceFormatted, method };
}

/**
 * Backfill running pace measurements from existing Garmin activity data
 * Uses sliding window algorithm on GPS samples to match Garmin's "Best 1km"
 * 
 * Optimized for memory:
 * - Fetches only required payload fields
 * - Processes in small batches
 * - Releases memory between batches
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
    const { userId, limit = 50, batchSize = BATCH_SIZE } = await req.json().catch(() => ({}));
    const effectiveBatchSize = Math.min(batchSize, 10); // Cap at 10 to prevent memory issues

    console.log('🏃 Starting Garmin pace backfill (optimized)', { userId, limit, batchSize: effectiveBatchSize });

    let processed = 0;
    let measurementsCreated = 0;
    const results: any[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && processed < limit) {
      const currentBatchSize = Math.min(effectiveBatchSize, limit - processed);
      
      console.log(`📦 Fetching batch: offset=${offset}, size=${currentBatchSize}`);

      // Fetch only the webhook IDs first, then fetch payload for each one individually
      // This prevents loading all payloads into memory at once
      let query = supabase
        .from('terra_webhooks_raw')
        .select('id, webhook_id, user_id, created_at')
        .eq('type', 'activity')
        .eq('provider', 'GARMIN')
        .order('created_at', { ascending: false })
        .range(offset, offset + currentBatchSize - 1);

      if (userId) {
        query = query.eq('payload->user->>reference_id', userId);
      }

      const { data: webhookMeta, error: metaError } = await query;

      if (metaError) {
        throw new Error(`Failed to fetch webhook metadata: ${metaError.message}`);
      }

      if (!webhookMeta || webhookMeta.length === 0) {
        console.log('No more webhooks to process');
        hasMore = false;
        break;
      }

      console.log(`Found ${webhookMeta.length} webhooks in this batch`);

      // Process each webhook individually to minimize memory usage
      for (const meta of webhookMeta) {
        try {
          // Fetch only required payload fields for this webhook
          const { data: webhookData, error: payloadError } = await supabase
            .from('terra_webhooks_raw')
            .select(`
              id,
              webhook_id,
              user_id,
              payload->user->reference_id,
              payload->user->user_id,
              payload->data
            `)
            .eq('id', meta.id)
            .single();

          if (payloadError) {
            console.error('Failed to fetch webhook payload', { id: meta.id, error: payloadError });
            continue;
          }

          // Extract data from the flattened response
          const referenceId = webhookData.reference_id;
          const terraUserId = webhookData.user_id;
          const activities = webhookData.data || [];

          if (!referenceId) {
            console.log('No reference_id in payload, skipping. terra_user_id:', terraUserId);
            continue;
          }

          for (const activity of activities) {
            const result = await processActivity(supabase, activity, referenceId, terraUserId);
            if (result) {
              if (result.status === 'created') {
                measurementsCreated++;
              }
              results.push({ ...result, userId: referenceId });
            }
          }

          processed++;
        } catch (err) {
          console.error('Error processing webhook', { webhookId: meta.webhook_id, error: err });
        }
      }

      offset += webhookMeta.length;
      
      // Check if we got fewer results than requested (end of data)
      if (webhookMeta.length < currentBatchSize) {
        hasMore = false;
      }

      console.log(`📊 Batch complete: processed=${processed}, measurements=${measurementsCreated}`);
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
