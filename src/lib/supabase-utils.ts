import { supabase } from "@/integrations/supabase/client";

/**
 * Optimized query builder for common Supabase patterns
 */
export class SupabaseQueryBuilder {
  /**
   * Fetch user metrics with automatic join and filtering
   */
  static async getUserMetrics(userId: string, options?: {
    metricNames?: string[];
    category?: string;
    source?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    let query = supabase
      .from('metric_values')
      .select(`
        id,
        value,
        measurement_date,
        external_id,
        user_metrics!inner (
          id,
          metric_name,
          metric_category,
          source,
          unit
        )
      `)
      .eq('user_id', userId)
      .order('measurement_date', { ascending: false });

    if (options?.metricNames) {
      query = query.in('user_metrics.metric_name', options.metricNames);
    }

    if (options?.category) {
      query = query.eq('user_metrics.metric_category', options.category);
    }

    if (options?.source) {
      query = query.eq('user_metrics.source', options.source);
    }

    if (options?.startDate) {
      query = query.gte('measurement_date', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('measurement_date', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }

  /**
   * Fetch latest metric value for a user
   */
  static async getLatestMetric(userId: string, metricName: string) {
    return supabase
      .from('metric_values')
      .select(`
        value,
        measurement_date,
        user_metrics!inner (
          metric_name,
          unit,
          source
        )
      `)
      .eq('user_id', userId)
      .eq('user_metrics.metric_name', metricName)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  /**
   * Fetch user goals with progress
   */
  static async getUserGoals(userId: string, options?: {
    challengeId?: string;
    isPersonal?: boolean;
  }) {
    let query = supabase
      .from('goals')
      .select(`
        *,
        measurements (
          id,
          value,
          measurement_date,
          unit
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.challengeId) {
      query = query.eq('challenge_id', options.challengeId);
    }

    if (options?.isPersonal !== undefined) {
      query = query.eq('is_personal', options.isPersonal);
    }

    return query;
  }

  /**
   * Batch insert metric values (more efficient than individual inserts)
   */
  static async batchInsertMetrics(userId: string, metrics: Array<{
    metric_id: string;
    value: number;
    measurement_date: string;
    external_id?: string;
  }>) {
    const metricsWithUser = metrics.map(m => ({
      ...m,
      user_id: userId,
    }));

    return supabase
      .from('metric_values')
      .insert(metricsWithUser)
      .select();
  }

  /**
   * Get aggregated statistics for a metric
   */
  static async getMetricStats(userId: string, metricName: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('metric_values')
      .select(`
        value,
        measurement_date,
        user_metrics!inner (
          metric_name
        )
      `)
      .eq('user_id', userId)
      .eq('user_metrics.metric_name', metricName)
      .gte('measurement_date', startDate.toISOString().split('T')[0]);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        latest: 0,
        count: 0,
      };
    }

    const values = data.map(d => d.value);
    
    return {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[0],
      count: values.length,
    };
  }

  /**
   * Check if user has any data for a specific integration
   */
  static async hasIntegrationData(userId: string, source: string) {
    const { count, error } = await supabase
      .from('metric_values')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_metrics.source', source)
      .limit(1);

    if (error) throw error;
    return (count ?? 0) > 0;
  }
}

/**
 * Helper to handle Supabase errors consistently
 */
export function handleSupabaseError(error: any): string {
  if (!error) return 'An unknown error occurred';
  
  if (error.message) {
    // Handle common Supabase errors
    if (error.message.includes('JWT')) {
      return 'Session expired. Please sign in again.';
    }
    if (error.message.includes('permission')) {
      return 'You don\'t have permission to perform this action.';
    }
    if (error.message.includes('unique')) {
      return 'This record already exists.';
    }
    return error.message;
  }
  
  return 'An error occurred while processing your request.';
}
