import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JobQueue, JobType, Job } from '../_shared/background-jobs.ts';
import { Logger } from '../_shared/monitoring.ts';
import { withErrorHandling, EdgeFunctionError, ErrorCode } from '../_shared/error-handling.ts';
import { corsHeaders } from '../_shared/cors.ts';

const logger = new Logger('job-worker');

interface TerraWebhookPayload {
  webhookId: string;
  payload: any;
}

interface TerraBackfillPayload {
  userId: string;
  provider: string;
  dataTypes: string[];
  startDate: string;
  endDate: string;
}

Deno.serve(
  withErrorHandling(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const queue = new JobQueue();
    let processed = 0;
    let failed = 0;
    const results: any[] = [];

    // Process up to 10 jobs per invocation
    for (let i = 0; i < 10; i++) {
      const job = await queue.dequeue();
      if (!job) break;

      logger.info('Processing job', { 
        jobId: job.id, 
        type: job.type, 
        attempt: job.attempts 
      });

      try {
        const result = await processJob(job, supabase);
        await queue.complete(job.id, result);
        processed++;
        results.push({ jobId: job.id, status: 'completed', result });
        logger.info('Job completed successfully', { jobId: job.id });
      } catch (error) {
        logger.error('Job failed', error, { jobId: job.id });
        const shouldRetry = job.attempts < (job.max_attempts || 3);
        await queue.fail(job.id, error.message, shouldRetry);
        failed++;
        results.push({ 
          jobId: job.id, 
          status: shouldRetry ? 'retrying' : 'failed', 
          error: error.message 
        });
      }
    }

    logger.info('Job worker completed', { processed, failed });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        failed,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  })
);

async function processJob(job: Job, supabase: any): Promise<any> {
  switch (job.type) {
    case JobType.WEBHOOK_PROCESSING:
      return await processTerraWebhookData(job.payload as TerraWebhookPayload, supabase);
    
    case JobType.TERRA_BACKFILL:
      return await processTerraBackfill(job.payload as TerraBackfillPayload, supabase);
    
    case JobType.CONFIDENCE_CALCULATION:
      return await processConfidenceCalculation(job.payload, supabase);
    
    default:
      throw new EdgeFunctionError(
        ErrorCode.VALIDATION_ERROR,
        `Unknown job type: ${job.type}`,
        400
      );
  }
}

async function processTerraWebhookData(
  jobPayload: TerraWebhookPayload,
  supabase: any
): Promise<any> {
  const { webhookId, payload } = jobPayload;
  const { user, data, type } = payload;

  logger.info('Processing Terra webhook', { webhookId, type, userId: user?.user_id });

  // Get user mapping
  const { data: tokenData, error: tokenError } = await supabase
    .from('terra_tokens')
    .select('user_id, provider')
    .eq('terra_user_id', user.user_id)
    .single();

  if (tokenError || !tokenData) {
    throw new Error(`User not found for Terra user: ${user.user_id}`);
  }

  const { user_id, provider } = tokenData;
  const metricsToInsert: any[] = [];
  let processedCount = 0;

  // Process different webhook types
  if (type === 'activity' && data) {
    for (const activity of data) {
      const date = activity.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];
      
      if (activity.active_durations) {
        for (const workout of activity.active_durations) {
          const workoutDate = workout.start_time?.split('T')[0] || date;
          const workoutId = `terra_${provider}_workout_${workout.start_time}`;

          if (activity.calories_data?.total_burned_calories) {
            metricsToInsert.push({
              metric_name: 'Workout Calories',
              category: 'workout',
              value: activity.calories_data.total_burned_calories,
              measurement_date: workoutDate,
              source: 'terra',
              external_id: `${workoutId}_calories`,
              user_id,
            });
          }

          if (activity.distance_data?.distance_meters) {
            metricsToInsert.push({
              metric_name: 'Distance',
              category: 'workout',
              value: activity.distance_data.distance_meters / 1000,
              measurement_date: workoutDate,
              source: 'terra',
              external_id: `${workoutId}_distance`,
              user_id,
            });
          }
        }
      }

      if (activity.distance_data?.steps) {
        metricsToInsert.push({
          metric_name: 'Steps',
          category: 'activity',
          value: activity.distance_data.steps,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_steps_${date}`,
          user_id,
        });
      }
    }
  }

  if (type === 'body' && data) {
    for (const body of data) {
      const date = body.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

      if (body.body_mass_kg) {
        metricsToInsert.push({
          metric_name: 'Weight',
          category: 'body',
          value: body.body_mass_kg,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_weight_${date}`,
          user_id,
        });
      }

      if (body.body_fat_percentage) {
        metricsToInsert.push({
          metric_name: 'Body Fat Percentage',
          category: 'body',
          value: body.body_fat_percentage,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_bodyfat_${date}`,
          user_id,
        });
      }
    }
  }

  if (type === 'sleep' && data) {
    for (const sleep of data) {
      const date = sleep.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

      if (sleep.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
        const sleepHours = sleep.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600;
        metricsToInsert.push({
          metric_name: 'Sleep Duration',
          category: 'sleep',
          value: sleepHours,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_sleep_${date}`,
          user_id,
        });
      }
    }
  }

  if (type === 'daily' && data) {
    for (const daily of data) {
      const date = daily.metadata?.start_time?.split('T')[0] || new Date().toISOString().split('T')[0];

      if (daily.distance_data?.steps) {
        metricsToInsert.push({
          metric_name: 'Steps',
          category: 'activity',
          value: daily.distance_data.steps,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_daily_steps_${date}`,
          user_id,
        });
      }

      if (daily.calories_data?.total_burned_calories) {
        metricsToInsert.push({
          metric_name: 'Active Calories',
          category: 'activity',
          value: daily.calories_data.total_burned_calories,
          measurement_date: date,
          source: 'terra',
          external_id: `terra_${provider}_daily_calories_${date}`,
          user_id,
        });
      }
    }
  }

  // Batch insert metrics
  if (metricsToInsert.length > 0) {
    processedCount = await batchInsertMetrics(supabase, user_id, metricsToInsert);
  }

  // Update data freshness tracking
  await supabase
    .from('data_freshness_tracking')
    .upsert({
      user_id,
      source: 'terra',
      provider,
      last_sync: new Date().toISOString(),
      data_types: [type],
      sync_status: 'completed',
    }, {
      onConflict: 'user_id,source,provider',
    });

  // Update webhook status
  await supabase
    .from('terra_webhooks_raw')
    .update({
      status: 'completed',
      processed_count: processedCount,
      processed_at: new Date().toISOString(),
    })
    .eq('webhook_id', webhookId);

  logger.info('Terra webhook processed', { 
    webhookId, 
    type, 
    metricsCount: processedCount 
  });

  return { 
    success: true, 
    processedCount, 
    type,
    userId: user_id 
  };
}

async function batchInsertMetrics(
  supabase: any,
  userId: string,
  metricsData: any[]
): Promise<number> {
  // First, ensure all metrics exist
  const uniqueMetrics = Array.from(
    new Set(metricsData.map(m => JSON.stringify({
      name: m.metric_name,
      category: m.category,
      source: m.source
    })))
  ).map(s => JSON.parse(s));

  for (const metric of uniqueMetrics) {
    const { data: existing } = await supabase
      .from('user_metrics')
      .select('id')
      .eq('user_id', userId)
      .eq('metric_name', metric.name)
      .eq('source', metric.source)
      .maybeSingle();

    if (!existing) {
      await supabase.from('user_metrics').insert({
        user_id: userId,
        metric_name: metric.name,
        metric_category: metric.category,
        unit: getUnitForMetric(metric.name),
        source: metric.source,
      });
    }
  }

  // Get metric IDs
  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('id, metric_name, source')
    .eq('user_id', userId)
    .in('metric_name', uniqueMetrics.map(m => m.name));

  const metricMap = new Map(
    metrics?.map(m => [`${m.metric_name}_${m.source}`, m.id]) || []
  );

  // Prepare metric values for batch insert
  const valuesToInsert = metricsData.map(m => ({
    user_id: userId,
    metric_id: metricMap.get(`${m.metric_name}_${m.source}`),
    value: m.value,
    measurement_date: m.measurement_date,
    external_id: m.external_id,
  })).filter(v => v.metric_id);

  // Batch upsert metric values
  if (valuesToInsert.length > 0) {
    await supabase
      .from('metric_values')
      .upsert(valuesToInsert, {
        onConflict: 'external_id',
        ignoreDuplicates: false,
      });
  }

  return valuesToInsert.length;
}

function getUnitForMetric(metricName: string): string {
  const unitMap: Record<string, string> = {
    'Weight': 'kg',
    'Body Fat Percentage': '%',
    'Steps': 'steps',
    'Distance': 'km',
    'Sleep Duration': 'hours',
    'Active Calories': 'kcal',
    'Workout Calories': 'kcal',
    'Heart Rate': 'bpm',
  };
  return unitMap[metricName] || 'unit';
}

async function processTerraBackfill(
  payload: TerraBackfillPayload,
  supabase: any
): Promise<any> {
  logger.info('Processing Terra backfill', payload);
  // Implement backfill logic here
  return { success: true, message: 'Backfill not yet implemented' };
}

async function processConfidenceCalculation(
  payload: any,
  supabase: any
): Promise<any> {
  logger.info('Processing confidence calculation', payload);
  // Implement confidence calculation here
  return { success: true, message: 'Confidence calculation not yet implemented' };
}
