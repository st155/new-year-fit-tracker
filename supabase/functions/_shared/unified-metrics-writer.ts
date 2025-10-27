import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Provider priority mapping for conflict resolution
 * Lower number = higher priority
 */
function getProviderPriority(provider: string): number {
  const priorities: Record<string, number> = {
    'WHOOP': 1,        // Highest priority for Recovery/Strain
    'GARMIN': 2,
    'ULTRAHUMAN': 2,
    'OURA': 3,
    'WITHINGS': 4,
    'POLAR': 4,
  };
  return priorities[provider.toUpperCase()] || 5;
}

/**
 * Category mapping for metrics
 */
function getMetricCategory(metricName: string): string {
  const categoryMap: Record<string, string> = {
    'Recovery Score': 'recovery',
    'Training Readiness': 'recovery',
    'Body Battery': 'recovery',
    'Day Strain': 'workout',
    'Sleep Efficiency': 'sleep',
    'Sleep Performance': 'sleep',
    'Sleep Duration': 'sleep',
    'Resting Heart Rate': 'cardio',
    'Average Heart Rate': 'cardio',
    'Max Heart Rate': 'cardio',
    'Steps': 'activity',
    'Active Calories': 'workout',
    'Weight': 'body',
    'Body Fat Percentage': 'body',
    'HRV RMSSD': 'recovery',
    'VO2Max': 'cardio',
  };
  return categoryMap[metricName] || 'general';
}

/**
 * Write metric to unified_metrics table
 * This ensures data is available for the new dashboard architecture
 */
export async function writeToUnifiedMetrics(
  supabase: SupabaseClient,
  params: {
    userId: string;
    metricName: string;
    source: string;
    value: number;
    unit: string;
    measurementDate: string; // YYYY-MM-DD format
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, metricName, source, value, unit, measurementDate } = params;
    
    const priority = getProviderPriority(source);
    const category = getMetricCategory(metricName);

    // Upsert to unified_metrics
    const { error } = await supabase
      .from('unified_metrics')
      .upsert({
        user_id: userId,
        metric_name: metricName,
        metric_category: category,
        source: source.toLowerCase(),
        provider: source.toLowerCase(),
        value,
        unit,
        measurement_date: measurementDate,
        priority,
        confidence_score: 50,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,metric_name,measurement_date,source',
      });

    if (error) {
      console.error('❌ Error writing to unified metrics:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Written to unified metrics: ${metricName} = ${value} ${unit} (${source}, ${measurementDate})`);
    return { success: true };
  } catch (e: any) {
    console.error('❌ Exception writing to unified metrics:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Batch write multiple metrics to unified_metrics
 */
export async function batchWriteToUnifiedMetrics(
  supabase: SupabaseClient,
  metrics: Array<{
    userId: string;
    metricName: string;
    source: string;
    value: number;
    unit: string;
    measurementDate: string;
  }>
): Promise<{ success: boolean; successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  for (const metric of metrics) {
    const result = await writeToUnifiedMetrics(supabase, metric);
    if (result.success) {
      successCount++;
    } else if (result.error) {
      errors.push(`${metric.metricName}: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    successCount,
    errors,
  };
}
