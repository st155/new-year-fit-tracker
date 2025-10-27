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

// Keep-alive to prevent cold starts
let keepAliveInterval: number | undefined;

Deno.serve(
  withErrorHandling(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Initialize keep-alive on first invocation
    if (!keepAliveInterval) {
      keepAliveInterval = setInterval(() => {
        // Prevent cold start by keeping instance warm
      }, 50000); // 50 seconds
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

    if (processed === 0 && failed === 0) {
      logger.warn('Job worker completed with no jobs processed', { 
        processed, 
        failed,
        message: 'Queue might be empty or all jobs are scheduled for later'
      });
    } else {
      logger.info('Job worker completed', { processed, failed });
    }

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

  // Remove duplicates within batch (keep last)
  const uniqueValues = new Map();
  valuesToInsert.forEach(v => {
    const key = `${v.user_id}_${v.metric_id}_${v.measurement_date}`;
    uniqueValues.set(key, v);
  });
  const finalValues = Array.from(uniqueValues.values());

  // Batch upsert metric values
  if (finalValues.length > 0) {
    const { error: upsertError } = await supabase
      .from('metric_values')
      .upsert(finalValues, {
        onConflict: 'user_id,metric_id,measurement_date',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Failed to insert metrics:', {
        error: upsertError,
        count: finalValues.length,
        sample: finalValues[0],
      });
      throw upsertError;
    }
  }

  return finalValues.length;
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
  const { user_id, metric_name, measurement_date } = payload;
  logger.info('Processing confidence calculation', { user_id, metric_name, measurement_date });

  // Fetch all metrics for this user and metric type (for context)
  const { data: allMetrics, error } = await supabase
    .from('metric_values')
    .select(`
      *,
      user_metrics!inner(metric_name, source, unit, metric_category)
    `)
    .eq('user_id', user_id)
    .eq('user_metrics.metric_name', metric_name);

  if (error) throw error;

  const metricsToCache: any[] = [];

  // Calculate confidence for each unique source
  const sourceGroups = new Map<string, any[]>();
  allMetrics?.forEach(m => {
    const key = `${m.user_metrics.metric_name}_${m.user_metrics.source}`;
    if (!sourceGroups.has(key)) {
      sourceGroups.set(key, []);
    }
    sourceGroups.get(key)!.push(m);
  });

  for (const [key, metrics] of sourceGroups.entries()) {
    for (const metric of metrics) {
      const factors = calculateConfidenceFactors(
        metric,
        metrics,
        allMetrics || []
      );

      const confidence = Math.min(100,
        factors.sourceReliability +
        factors.dataFreshness +
        factors.measurementFrequency +
        factors.crossValidation
      );

      metricsToCache.push({
        user_id: metric.user_id,
        metric_name: metric.user_metrics.metric_name,
        source: metric.user_metrics.source,
        measurement_date: metric.measurement_date,
        confidence_score: confidence,
        source_reliability: factors.sourceReliability,
        data_freshness: factors.dataFreshness,
        measurement_frequency: factors.measurementFrequency,
        cross_validation: factors.crossValidation,
      });
    }
  }

  // Batch upsert to cache
  if (metricsToCache.length > 0) {
    const { error: upsertError } = await supabase
      .from('metric_confidence_cache')
      .upsert(metricsToCache, {
        onConflict: 'user_id,metric_name,source,measurement_date',
      });

    if (upsertError) throw upsertError;
  }

  logger.info('Confidence calculation completed', {
    user_id,
    metric_name,
    cached: metricsToCache.length,
  });

  return {
    success: true,
    cached: metricsToCache.length,
    metric_name,
  };
}

// Helper: Calculate confidence factors
function calculateConfidenceFactors(
  metric: any,
  sameSourceMetrics: any[],
  allMetrics: any[]
): {
  sourceReliability: number;
  dataFreshness: number;
  measurementFrequency: number;
  crossValidation: number;
} {
  const category = getMetricCategory(metric.user_metrics.metric_name);
  
  return {
    sourceReliability: calculateSourceReliability(metric.user_metrics.source, category),
    dataFreshness: calculateDataFreshness(metric.measurement_date),
    measurementFrequency: calculateMeasurementFrequency(sameSourceMetrics),
    crossValidation: calculateCrossValidation(metric, allMetrics),
  };
}

function calculateSourceReliability(source: string, category: string): number {
  // Priority matrix: higher priority = higher reliability
  const priorities: Record<string, Record<string, number>> = {
    body: { inbody: 10, withings: 8, manual: 6, terra: 5, apple_health: 5 },
    activity: { whoop: 9, apple_health: 8, terra: 8, manual: 5 },
    sleep: { whoop: 9, apple_health: 7, terra: 7 },
    recovery: { whoop: 10, apple_health: 6 },
    cardiovascular: { whoop: 9, apple_health: 8, terra: 7 },
    health: { apple_health: 8, terra: 7, manual: 6 },
  };

  const categoryPriorities = priorities[category] || priorities.health;
  const priority = categoryPriorities[source] || 5;
  
  // Normalize 1-10 to 0-40
  return (priority / 10) * 40;
}

function calculateDataFreshness(measurementDate: string): number {
  const now = new Date();
  const measured = new Date(measurementDate);
  const hoursSince = (now.getTime() - measured.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 1) return 20;      // < 1 hour
  if (hoursSince < 24) return 18;     // < 1 day
  if (hoursSince < 72) return 15;     // < 3 days
  if (hoursSince < 168) return 10;    // < 1 week
  if (hoursSince < 720) return 5;     // < 1 month
  return 0;                           // > 1 month
}

function calculateMeasurementFrequency(metrics: any[]): number {
  // Count metrics in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCount = metrics.filter(m =>
    new Date(m.measurement_date) >= thirtyDaysAgo
  ).length;

  if (recentCount >= 28) return 20;   // Daily
  if (recentCount >= 12) return 15;   // Every 2-3 days
  if (recentCount >= 4) return 10;    // Weekly
  if (recentCount >= 1) return 5;     // Rare
  return 0;
}

function calculateCrossValidation(metric: any, allMetrics: any[]): number {
  const metricDate = new Date(metric.measurement_date).toISOString().split('T')[0];
  
  // Find same metric from different sources on same day
  const sameDay = allMetrics.filter(m =>
    m.user_metrics.metric_name === metric.user_metrics.metric_name &&
    m.user_metrics.source !== metric.user_metrics.source &&
    new Date(m.measurement_date).toISOString().split('T')[0] === metricDate
  );

  if (sameDay.length === 0) return 10; // No comparison data

  // Calculate average deviation
  const allValues = [...sameDay.map(m => m.value), metric.value];
  const avgValue = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
  const deviations = allValues.map(v => Math.abs(v - avgValue));
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  const deviationPercent = (avgDeviation / avgValue) * 100;

  if (deviationPercent < 2) return 20;  // Excellent
  if (deviationPercent < 5) return 15;  // Good
  if (deviationPercent < 10) return 10; // Acceptable
  if (deviationPercent < 20) return 5;  // Poor
  return 0;                             // Very poor
}

function getMetricCategory(metricName: string): string {
  const name = metricName.toLowerCase();
  
  if (name.includes('weight') || name.includes('fat') || name.includes('muscle') || 
      name.includes('bmr') || name.includes('bmi')) {
    return 'body';
  }
  
  if (name.includes('step') || name.includes('calories') || name.includes('active')) {
    return 'activity';
  }
  
  if (name.includes('recovery') || name.includes('hrv')) {
    return 'recovery';
  }
  
  if (name.includes('heart') || name.includes('hr')) {
    return 'cardiovascular';
  }
  
  if (name.includes('sleep')) {
    return 'sleep';
  }
  
  return 'health';
}
