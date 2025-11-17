/**
 * Phase 3: Conflict Resolution Engine
 * Автоматическое разрешение конфликтов между источниками
 */

import { SourcePriorityService, DataSource, MetricCategory } from './source-priority';
import type { MetricWithConfidence } from './confidence-scoring';

export enum ResolutionStrategy {
  HIGHEST_CONFIDENCE = 'highest_confidence',
  HIGHEST_PRIORITY = 'highest_priority',
  AVERAGE = 'average',
  MEDIAN = 'median',
  MOST_RECENT = 'most_recent',
  MANUAL_OVERRIDE = 'manual_override',
}

export interface ConflictResolutionConfig {
  strategy: ResolutionStrategy;
  minConfidenceThreshold?: number; // Минимальный confidence для использования
  allowedDeviation?: number; // Допустимое отклонение в %
}

export class ConflictResolver {
  /**
   * Разрешить конфликт между несколькими метриками
   */
  static resolve(
    conflicts: MetricWithConfidence[],
    config: ConflictResolutionConfig
  ): MetricWithConfidence {
    if (conflicts.length === 0) {
      throw new Error('No metrics to resolve');
    }

    // Фильтр по минимальному confidence
    const eligible = config.minConfidenceThreshold
      ? conflicts.filter(m => m.confidence >= config.minConfidenceThreshold)
      : conflicts;

    if (eligible.length === 0) {
      console.warn('[ConflictResolver] No metrics meet minimum confidence threshold, using all');
      return this.selectHighestConfidence(conflicts);
    }

    switch (config.strategy) {
      case ResolutionStrategy.HIGHEST_CONFIDENCE:
        return this.selectHighestConfidence(eligible);

      case ResolutionStrategy.HIGHEST_PRIORITY:
        return this.selectHighestPriority(eligible);

      case ResolutionStrategy.AVERAGE:
        return this.calculateAverage(eligible);

      case ResolutionStrategy.MEDIAN:
        return this.calculateMedian(eligible);

      case ResolutionStrategy.MOST_RECENT:
        return this.selectMostRecent(eligible);

      case ResolutionStrategy.MANUAL_OVERRIDE:
        return this.selectManualOverride(eligible);

      default:
        return this.selectHighestConfidence(eligible);
    }
  }

  /**
   * Strategy 1: Highest Confidence
   */
  private static selectHighestConfidence(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    return metrics.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Strategy 2: Highest Priority (by source)
   */
  private static selectHighestPriority(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    return metrics.reduce((best, current) => {
      const currentPriority = SourcePriorityService.getPriority(
        current.metric.source as DataSource,
        this.getCategoryFromMetric(current.metric.metric_name)
      );

      const bestPriority = SourcePriorityService.getPriority(
        best.metric.source as DataSource,
        this.getCategoryFromMetric(best.metric.metric_name)
      );

      // If priorities are equal, use additional tiebreakers
      if (currentPriority === bestPriority) {
        const metricName = current.metric.metric_name.toLowerCase();
        
        // For sleep metrics, prefer longer duration (main sleep > nap)
        if (metricName.includes('sleep') && metricName.includes('duration')) {
          return current.metric.value > best.metric.value ? current : best;
        }
        
        // For sleep efficiency, prefer higher percentage
        if (metricName.includes('sleep') && metricName.includes('efficiency')) {
          return current.metric.value > best.metric.value ? current : best;
        }
        
        // Default tiebreaker: higher confidence
        if (current.confidence !== best.confidence) {
          return current.confidence > best.confidence ? current : best;
        }
        
        // Final tiebreaker: most recent
        return new Date(current.metric.measurement_date) > new Date(best.metric.measurement_date) 
          ? current 
          : best;
      }

      return currentPriority > bestPriority ? current : best;
    });
  }

  /**
   * Strategy 3: Average
   * Усреднить значения, взвесить по confidence
   */
  private static calculateAverage(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    const totalConfidence = metrics.reduce((sum, m) => sum + m.confidence, 0);

    const weightedSum = metrics.reduce(
      (sum, m) => sum + m.metric.value * m.confidence,
      0
    );

    const averageValue = weightedSum / totalConfidence;

    // Вернуть метрику с highest confidence, но со средним значением
    const bestMetric = this.selectHighestConfidence(metrics);

    return {
      ...bestMetric,
      metric: {
        ...bestMetric.metric,
        value: averageValue,
        source: 'aggregated' as any,
      },
    };
  }

  /**
   * Strategy 4: Median
   */
  private static calculateMedian(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    const sorted = [...metrics].sort((a, b) => a.metric.value - b.metric.value);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? this.calculateAverage([sorted[mid - 1], sorted[mid]])
      : sorted[mid];
  }

  /**
   * Strategy 5: Most Recent
   */
  private static selectMostRecent(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    return metrics.reduce((latest, current) =>
      new Date(current.metric.measurement_date) >
      new Date(latest.metric.measurement_date)
        ? current
        : latest
    );
  }

  /**
   * Strategy 6: Manual Override
   * Всегда предпочитать manual entry
   */
  private static selectManualOverride(
    metrics: MetricWithConfidence[]
  ): MetricWithConfidence {
    const manual = metrics.find(
      m => m.metric.source === DataSource.MANUAL || 
           m.metric.source === 'manual' as any
    );

    return manual || this.selectHighestConfidence(metrics);
  }

  /**
   * Detect outliers (аномалии)
   */
  static detectOutliers(
    metrics: MetricWithConfidence[],
    allowedDeviation: number = 15 // 15% по умолчанию
  ): MetricWithConfidence[] {
    if (metrics.length < 2) return [];

    const values = metrics.map(m => m.metric.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    return metrics.filter(m => {
      const deviationPercent = Math.abs((m.metric.value - mean) / mean) * 100;
      return deviationPercent > allowedDeviation;
    });
  }

  /**
   * Helper: определить категорию метрики
   */
  private static getCategoryFromMetric(metricName: string): MetricCategory {
    const name = metricName.toLowerCase();
    
    if (name.includes('weight') || name.includes('fat') || name.includes('muscle')) {
      return MetricCategory.BODY_COMPOSITION;
    }
    
    if (name.includes('step') || name.includes('calories')) {
      return MetricCategory.ACTIVITY;
    }
    
    if (name.includes('recovery') || name.includes('hrv')) {
      return MetricCategory.RECOVERY;
    }
    
    if (name.includes('heart')) {
      return MetricCategory.CARDIOVASCULAR;
    }
    
    if (name.includes('sleep')) {
      return MetricCategory.SLEEP;
    }
    
    return MetricCategory.HEALTH;
  }
}
