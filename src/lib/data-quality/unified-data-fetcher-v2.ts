/**
 * Phase 4: Enhanced UnifiedDataFetcher
 * Обновленный data fetching с confidence + conflict resolution
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ConfidenceScorer, type MetricWithConfidence } from './confidence-scoring';
import { ConflictResolver, ResolutionStrategy } from './conflict-resolution';
import type { UnifiedMetric, MetricType } from '@/types/metrics';

export class UnifiedDataFetcherV2 {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Получить latest unified metrics с conflict resolution
   */
  async getLatestUnifiedMetrics(
    userId: string,
    metricTypes?: string[]
  ): Promise<MetricWithConfidence[]> {
    // Fetch RAW data from all sources
    let query = this.supabase
      .from('unified_metrics')
      .select('*')
      .eq('user_id', userId);

    if (metricTypes?.length) {
      query = query.in('metric_name', metricTypes);
    }

    const { data: rawData, error } = await query
      .order('measurement_date', { ascending: false });

    if (error) throw error;

    const metrics: UnifiedMetric[] = (rawData || []).map(row => ({
      metric_id: row.metric_name,
      user_id: row.user_id,
      metric_name: row.metric_name,
      metric_type: row.metric_name as MetricType,
      value: row.value,
      unit: row.unit,
      source: row.source as any,
      measurement_date: row.measurement_date,
      created_at: new Date().toISOString(),
      priority: row.priority,
    }));

    // Calculate confidence scores
    const metricsWithConfidence = ConfidenceScorer.calculateBatch(metrics);

    // Group by metric_name
    const grouped = new Map<string, MetricWithConfidence[]>();

    for (const metric of metricsWithConfidence) {
      const key = metric.metric.metric_name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(metric);
    }

    // Resolve conflicts per metric
    const resolved: MetricWithConfidence[] = [];

    for (const [metricName, conflicts] of grouped.entries()) {
      if (conflicts.length === 1) {
        resolved.push(conflicts[0]);
      } else {
        // Detect outliers
        const outliers = ConflictResolver.detectOutliers(conflicts, 15);
        if (outliers.length > 0) {
          console.warn(`[Data Quality] Outliers detected for ${metricName}:`, 
            outliers.map(o => ({ source: o.metric.source, value: o.metric.value }))
          );
        }

        // Select resolution strategy based on metric type
        const strategy = this.selectStrategy(metricName);
        const winner = ConflictResolver.resolve(conflicts, {
          strategy,
          minConfidenceThreshold: 30,
        });

        resolved.push(winner);
      }
    }

    return resolved;
  }

  /**
   * Получить историю с deduplication
   */
  async getMetricHistory(
    userId: string,
    metricName: string,
    dateRange: { start: string; end: string }
  ): Promise<MetricWithConfidence[]> {
    const { data: rawData, error } = await this.supabase
      .from('unified_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('metric_name', metricName)
      .gte('measurement_date', dateRange.start)
      .lte('measurement_date', dateRange.end)
      .order('measurement_date', { ascending: false });

    if (error) throw error;

    const metrics: UnifiedMetric[] = (rawData || []).map(row => ({
      metric_id: row.metric_name,
      user_id: row.user_id,
      metric_name: row.metric_name,
      metric_type: row.metric_name as MetricType,
      value: row.value,
      unit: row.unit,
      source: row.source as any,
      measurement_date: row.measurement_date,
      created_at: new Date().toISOString(),
      priority: row.priority,
    }));

    const metricsWithConfidence = ConfidenceScorer.calculateBatch(metrics);

    // Deduplicate по дням
    const byDay = new Map<string, MetricWithConfidence[]>();

    for (const metric of metricsWithConfidence) {
      const dayKey = metric.metric.measurement_date.split('T')[0];

      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, []);
      }
      byDay.get(dayKey)!.push(metric);
    }

    // Resolve conflicts per day
    const resolved: MetricWithConfidence[] = [];

    for (const [day, conflicts] of byDay.entries()) {
      if (conflicts.length === 1) {
        resolved.push(conflicts[0]);
      } else {
        const strategy = this.selectStrategy(metricName);
        const winner = ConflictResolver.resolve(conflicts, {
          strategy,
          minConfidenceThreshold: 20,
        });
        resolved.push(winner);
      }
    }

    return resolved.sort(
      (a, b) =>
        new Date(b.metric.measurement_date).getTime() -
        new Date(a.metric.measurement_date).getTime()
    );
  }

  /**
   * Select resolution strategy based on metric type
   */
  private selectStrategy(metricName: string): ResolutionStrategy {
    const name = metricName.toLowerCase();

    // Body composition - prefer highest priority (InBody > Withings)
    if (name.includes('weight') || name.includes('fat') || name.includes('muscle')) {
      return ResolutionStrategy.HIGHEST_PRIORITY;
    }

    // Activity metrics - average
    if (name.includes('step') || name.includes('calories') || name.includes('active')) {
      return ResolutionStrategy.AVERAGE;
    }

    // Recovery metrics - highest confidence (Whoop typically)
    if (name.includes('hrv') || name.includes('recovery') || name.includes('resting')) {
      return ResolutionStrategy.HIGHEST_CONFIDENCE;
    }

    // Default: manual override
    return ResolutionStrategy.MANUAL_OVERRIDE;
  }
}
