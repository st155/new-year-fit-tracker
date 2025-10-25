/**
 * Phase 2: Source Priority System
 * Определяет приоритеты источников данных для различных категорий метрик
 */

export enum DataSource {
  INBODY = 'inbody',
  WITHINGS = 'withings',
  WHOOP = 'whoop',
  APPLE_HEALTH = 'apple_health',
  MANUAL = 'manual',
  GARMIN = 'garmin',
  ULTRAHUMAN = 'ultrahuman',
  TERRA = 'terra',
}

export enum MetricCategory {
  BODY_COMPOSITION = 'body',
  ACTIVITY = 'activity',
  RECOVERY = 'recovery',
  CARDIOVASCULAR = 'cardio',
  SLEEP = 'sleep',
  HEALTH = 'health',
}

/**
 * Матрица приоритетов: [Category][Source] = Priority Score (1-10)
 * Чем выше число, тем выше приоритет
 */
const PRIORITY_MATRIX: Record<MetricCategory, Partial<Record<DataSource, number>>> = {
  [MetricCategory.BODY_COMPOSITION]: {
    [DataSource.INBODY]: 10,      // Профессиональный BIA сканер
    [DataSource.WITHINGS]: 8,     // Smart scale с BIA
    [DataSource.MANUAL]: 6,       // Ручной ввод
    [DataSource.APPLE_HEALTH]: 4, // Агрегатор (низкая точность)
    [DataSource.TERRA]: 3,
  },
  
  [MetricCategory.ACTIVITY]: {
    [DataSource.WHOOP]: 9,        // Специализированный wearable
    [DataSource.GARMIN]: 8,       // Спортивные часы
    [DataSource.ULTRAHUMAN]: 7,   // Fitness tracker
    [DataSource.APPLE_HEALTH]: 7, // Apple Watch
    [DataSource.MANUAL]: 5,
    [DataSource.TERRA]: 6,
  },
  
  [MetricCategory.RECOVERY]: {
    [DataSource.WHOOP]: 10,       // HRV, recovery специализация
    [DataSource.GARMIN]: 7,
    [DataSource.ULTRAHUMAN]: 7,
    [DataSource.APPLE_HEALTH]: 6,
  },
  
  [MetricCategory.CARDIOVASCULAR]: {
    [DataSource.WHOOP]: 9,        // Continuous heart rate
    [DataSource.APPLE_HEALTH]: 8, // Apple Watch
    [DataSource.GARMIN]: 8,
    [DataSource.WITHINGS]: 7,     // Smart watch
    [DataSource.ULTRAHUMAN]: 7,
    [DataSource.MANUAL]: 5,
  },
  
  [MetricCategory.SLEEP]: {
    [DataSource.WHOOP]: 10,       // Специализация на sleep tracking
    [DataSource.GARMIN]: 8,
    [DataSource.ULTRAHUMAN]: 7,
    [DataSource.APPLE_HEALTH]: 7,
  },
  
  [MetricCategory.HEALTH]: {
    [DataSource.MANUAL]: 10,      // Ручной ввод наиболее точен
    [DataSource.APPLE_HEALTH]: 6, // Агрегатор из других apps
    [DataSource.WITHINGS]: 7,
  },
};

export class SourcePriorityService {
  /**
   * Получить приоритет источника для метрики
   */
  static getPriority(source: DataSource, category: MetricCategory): number {
    return PRIORITY_MATRIX[category]?.[source] ?? 5;
  }

  /**
   * Сравнить два источника для метрики (для sorting)
   */
  static compareSources(
    sourceA: DataSource,
    sourceB: DataSource,
    category: MetricCategory
  ): number {
    const priorityA = this.getPriority(sourceA, category);
    const priorityB = this.getPriority(sourceB, category);
    return priorityB - priorityA; // Descending order
  }

  /**
   * Выбрать лучший источник из списка
   */
  static selectBestSource(
    sources: DataSource[],
    category: MetricCategory
  ): DataSource {
    if (sources.length === 0) {
      throw new Error('No sources provided');
    }
    
    return sources.sort((a, b) => this.compareSources(a, b, category))[0];
  }

  /**
   * Получить все источники по категории, отсортированные по приоритету
   */
  static getSourcesByPriority(category: MetricCategory): DataSource[] {
    const sources = Object.keys(PRIORITY_MATRIX[category] || {}) as DataSource[];
    return sources.sort((a, b) => this.compareSources(a, b, category));
  }
}
