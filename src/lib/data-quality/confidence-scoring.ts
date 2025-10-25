/**
 * Phase 2: Confidence Scoring System
 * Рассчитывает confidence score (0-100) на основе 4 факторов
 */

import { SourcePriorityService, DataSource, MetricCategory } from './source-priority';
import type { UnifiedMetric } from '@/types/metrics';

export interface ConfidenceFactors {
  sourceReliability: number;    // 0-40 баллов (из priority)
  dataFreshness: number;        // 0-20 баллов (recency)
  measurementFrequency: number; // 0-20 баллов (regularity)
  crossValidation: number;      // 0-20 баллов (согласованность)
}

export interface MetricWithConfidence {
  metric: UnifiedMetric;
  confidence: number; // 0-100
  factors: ConfidenceFactors;
}

export class ConfidenceScorer {
  /**
   * Рассчитать confidence для одной метрики
   */
  static calculate(
    metric: UnifiedMetric,
    allMetrics: UnifiedMetric[]
  ): MetricWithConfidence {
    const category = this.getCategory(metric.metric_name);
    
    const factors: ConfidenceFactors = {
      sourceReliability: this.calculateSourceReliability(
        metric.source as DataSource,
        category
      ),
      dataFreshness: this.calculateDataFreshness(metric.measurement_date),
      measurementFrequency: this.calculateMeasurementFrequency(metric, allMetrics),
      crossValidation: this.calculateCrossValidation(metric, allMetrics),
    };

    const confidence = Math.min(100, 
      factors.sourceReliability +
      factors.dataFreshness +
      factors.measurementFrequency +
      factors.crossValidation
    );

    return {
      metric,
      confidence,
      factors,
    };
  }
  
  /**
   * 1. Source Reliability (0-40 баллов)
   * Базируется на приоритетной матрице
   */
  private static calculateSourceReliability(
    source: DataSource,
    category: MetricCategory
  ): number {
    const priority = SourcePriorityService.getPriority(source, category);
    // Normalize 1-10 to 0-40
    return (priority / 10) * 40;
  }
  
  /**
   * 2. Data Freshness (0-20 баллов)
   * Чем свежее данные, тем выше балл
   */
  private static calculateDataFreshness(measurementDate: string): number {
    const now = new Date();
    const measured = new Date(measurementDate);
    const hoursSince = (now.getTime() - measured.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 1) return 20;      // < 1 час
    if (hoursSince < 24) return 18;     // < 1 день
    if (hoursSince < 72) return 15;     // < 3 дня
    if (hoursSince < 168) return 10;    // < 1 неделя
    if (hoursSince < 720) return 5;     // < 1 месяц
    return 0;                           // > 1 месяц
  }
  
  /**
   * 3. Measurement Frequency (0-20 баллов)
   * Регулярные измерения = более надежные данные
   */
  private static calculateMeasurementFrequency(
    metric: UnifiedMetric,
    allMetrics: UnifiedMetric[]
  ): number {
    // Найти метрики того же типа за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetrics = allMetrics.filter(
      m =>
        m.metric_name === metric.metric_name &&
        m.source === metric.source &&
        new Date(m.measurement_date) >= thirtyDaysAgo
    );

    const count = recentMetrics.length;

    if (count >= 28) return 20;   // Ежедневно
    if (count >= 12) return 15;   // Через день
    if (count >= 4) return 10;    // Еженедельно
    if (count >= 1) return 5;     // Редко
    return 0;
  }
  
  /**
   * 4. Cross-Validation (0-20 баллов)
   * Согласованность с другими источниками
   */
  private static calculateCrossValidation(
    metric: UnifiedMetric,
    allMetrics: UnifiedMetric[]
  ): number {
    // Найти метрики того же типа в тот же день от других источников
    const metricDate = new Date(metric.measurement_date).toISOString().split('T')[0];
    
    const sameDay = allMetrics.filter(
      m =>
        m.metric_name === metric.metric_name &&
        m.source !== metric.source &&
        new Date(m.measurement_date).toISOString().split('T')[0] === metricDate
    );

    if (sameDay.length === 0) return 10; // Нет данных для сравнения

    // Рассчитать среднее отклонение
    const avgValue =
      (sameDay.reduce((sum, m) => sum + m.value, 0) + metric.value) /
      (sameDay.length + 1);

    const deviations = [...sameDay, metric].map(m =>
      Math.abs(m.value - avgValue)
    );

    const avgDeviation =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

    // Процент отклонения
    const deviationPercent = (avgDeviation / avgValue) * 100;

    if (deviationPercent < 2) return 20;  // Отличное согласование
    if (deviationPercent < 5) return 15;  // Хорошее
    if (deviationPercent < 10) return 10; // Приемлемое
    if (deviationPercent < 20) return 5;  // Плохое
    return 0;                             // Очень плохое
  }

  /**
   * Batch calculation для всех метрик
   */
  static calculateBatch(
    metrics: UnifiedMetric[]
  ): MetricWithConfidence[] {
    return metrics.map(metric => this.calculate(metric, metrics));
  }

  /**
   * Helper: определить категорию метрики
   */
  private static getCategory(metricName: string): MetricCategory {
    const name = metricName.toLowerCase();
    
    if (name.includes('weight') || name.includes('fat') || name.includes('muscle') || 
        name.includes('bmr') || name.includes('bmi')) {
      return MetricCategory.BODY_COMPOSITION;
    }
    
    if (name.includes('step') || name.includes('calories') || name.includes('active')) {
      return MetricCategory.ACTIVITY;
    }
    
    if (name.includes('recovery') || name.includes('hrv')) {
      return MetricCategory.RECOVERY;
    }
    
    if (name.includes('heart') || name.includes('hr')) {
      return MetricCategory.CARDIOVASCULAR;
    }
    
    if (name.includes('sleep')) {
      return MetricCategory.SLEEP;
    }
    
    return MetricCategory.HEALTH;
  }
}
