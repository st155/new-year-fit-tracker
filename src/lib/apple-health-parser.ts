// lib/apple-health-parser.ts
import JSZip from 'jszip';
import i18n from '@/i18n';

// Типы данных Apple Health
export interface AppleHealthRecord {
  type: string;
  sourceName: string;
  sourceVersion?: string;
  device?: string;
  unit: string;
  creationDate: Date;
  startDate: Date;
  endDate: Date;
  value: number | string;
}

export interface WorkoutRecord {
  workoutActivityType: string;
  duration: number;
  durationUnit: string;
  totalDistance?: number;
  totalDistanceUnit?: string;
  totalEnergyBurned?: number;
  totalEnergyBurnedUnit?: string;
  sourceName: string;
  startDate: Date;
  endDate: Date;
}

export interface ActivitySummary {
  dateComponents: string;
  activeEnergyBurned: number;
  activeEnergyBurnedGoal: number;
  activeEnergyBurnedUnit: string;
  moveTime?: number;
  moveTimeGoal?: number;
  exerciseTime?: number;
  exerciseTimeGoal?: number;
  standHours?: number;
  standHoursGoal?: number;
}

export interface ParsedHealthData {
  records: AppleHealthRecord[];
  workouts: WorkoutRecord[];
  activitySummaries: ActivitySummary[];
  metadata: {
    exportDate: Date;
    recordCount: number;
    workoutCount: number;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
}

// Metric mapping with localization keys
const METRIC_MAPPING: Record<string, { nameKey: string; unitKey: string; category: string }> = {
  // Vitals
  'HKQuantityTypeIdentifierHeartRate': { nameKey: 'heartRate', unitKey: 'bpm', category: 'heart' },
  'HKQuantityTypeIdentifierRestingHeartRate': { nameKey: 'restingHeartRate', unitKey: 'bpm', category: 'heart' },
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': { nameKey: 'hrv', unitKey: 'ms', category: 'heart' },
  'HKQuantityTypeIdentifierBloodPressureSystolic': { nameKey: 'systolicBP', unitKey: 'mmHg', category: 'heart' },
  'HKQuantityTypeIdentifierBloodPressureDiastolic': { nameKey: 'diastolicBP', unitKey: 'mmHg', category: 'heart' },
  'HKQuantityTypeIdentifierRespiratoryRate': { nameKey: 'respiratoryRate', unitKey: 'breathsPerMin', category: 'vitals' },
  'HKQuantityTypeIdentifierOxygenSaturation': { nameKey: 'oxygenSaturation', unitKey: 'percent', category: 'vitals' },
  'HKQuantityTypeIdentifierBodyTemperature': { nameKey: 'bodyTemperature', unitKey: 'celsius', category: 'vitals' },
  
  // Body composition
  'HKQuantityTypeIdentifierBodyMass': { nameKey: 'weight', unitKey: 'kg', category: 'body' },
  'HKQuantityTypeIdentifierBodyMassIndex': { nameKey: 'bmi', unitKey: 'kgm2', category: 'body' },
  'HKQuantityTypeIdentifierBodyFatPercentage': { nameKey: 'bodyFat', unitKey: 'percent', category: 'body' },
  'HKQuantityTypeIdentifierLeanBodyMass': { nameKey: 'leanMass', unitKey: 'kg', category: 'body' },
  'HKQuantityTypeIdentifierHeight': { nameKey: 'height', unitKey: 'cm', category: 'body' },
  'HKQuantityTypeIdentifierWaistCircumference': { nameKey: 'waist', unitKey: 'cm', category: 'body' },
  
  // Activity
  'HKQuantityTypeIdentifierStepCount': { nameKey: 'steps', unitKey: 'stepsUnit', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceWalkingRunning': { nameKey: 'distanceWalkRun', unitKey: 'km', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceCycling': { nameKey: 'distanceCycling', unitKey: 'km', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceSwimming': { nameKey: 'distanceSwimming', unitKey: 'km', category: 'activity' },
  'HKQuantityTypeIdentifierFlightsClimbed': { nameKey: 'floorsClimbed', unitKey: 'floors', category: 'activity' },
  'HKQuantityTypeIdentifierActiveEnergyBurned': { nameKey: 'activeCalories', unitKey: 'kcal', category: 'activity' },
  'HKQuantityTypeIdentifierBasalEnergyBurned': { nameKey: 'basalCalories', unitKey: 'kcal', category: 'activity' },
  'HKQuantityTypeIdentifierAppleExerciseTime': { nameKey: 'exerciseTime', unitKey: 'min', category: 'activity' },
  'HKQuantityTypeIdentifierAppleStandTime': { nameKey: 'standTime', unitKey: 'min', category: 'activity' },
  'HKQuantityTypeIdentifierAppleMoveTime': { nameKey: 'moveTime', unitKey: 'min', category: 'activity' },
  
  // Sleep
  'HKCategoryTypeIdentifierSleepAnalysis': { nameKey: 'sleepAnalysis', unitKey: 'hours', category: 'sleep' },
  'HKQuantityTypeIdentifierSleepDuration': { nameKey: 'sleepDuration', unitKey: 'hours', category: 'sleep' },
  
  // Nutrition
  'HKQuantityTypeIdentifierDietaryWater': { nameKey: 'water', unitKey: 'ml', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryCaffeine': { nameKey: 'caffeine', unitKey: 'mg', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryProtein': { nameKey: 'protein', unitKey: 'g', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryCarbohydrates': { nameKey: 'carbs', unitKey: 'g', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryFatTotal': { nameKey: 'fat', unitKey: 'g', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryEnergyConsumed': { nameKey: 'caloriesConsumed', unitKey: 'kcal', category: 'nutrition' },
  
  // Fitness
  'HKQuantityTypeIdentifierVO2Max': { nameKey: 'vo2max', unitKey: 'mlkgmin', category: 'fitness' },
  'HKQuantityTypeIdentifierWalkingSpeed': { nameKey: 'walkingSpeed', unitKey: 'kmh', category: 'fitness' },
  'HKQuantityTypeIdentifierWalkingStepLength': { nameKey: 'stepLength', unitKey: 'cm', category: 'fitness' },
  'HKQuantityTypeIdentifierPushCount': { nameKey: 'pushups', unitKey: 'reps', category: 'fitness' },
  'HKQuantityTypeIdentifierSwimmingStrokeCount': { nameKey: 'swimmingStrokes', unitKey: 'strokes', category: 'fitness' },
  
  // Environment
  'HKQuantityTypeIdentifierUVExposure': { nameKey: 'uvExposure', unitKey: 'index', category: 'environment' },
  'HKQuantityTypeIdentifierEnvironmentalAudioExposure': { nameKey: 'environmentalNoise', unitKey: 'dB', category: 'environment' },
  'HKQuantityTypeIdentifierHeadphoneAudioExposure': { nameKey: 'headphoneVolume', unitKey: 'dB', category: 'environment' },
};

// Workout type mapping with localization keys
const WORKOUT_MAPPING: Record<string, string> = {
  'HKWorkoutActivityTypeRunning': 'running',
  'HKWorkoutActivityTypeWalking': 'walking',
  'HKWorkoutActivityTypeCycling': 'cycling',
  'HKWorkoutActivityTypeSwimming': 'swimming',
  'HKWorkoutActivityTypeYoga': 'yoga',
  'HKWorkoutActivityTypeStrengthTraining': 'strength',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'functionalStrength',
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'traditionalStrength',
  'HKWorkoutActivityTypeCrossTraining': 'crossTraining',
  'HKWorkoutActivityTypeElliptical': 'elliptical',
  'HKWorkoutActivityTypeRowing': 'rowing',
  'HKWorkoutActivityTypeStairClimbing': 'stairClimbing',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'hiit',
  'HKWorkoutActivityTypePilates': 'pilates',
  'HKWorkoutActivityTypeDancing': 'dancing',
  'HKWorkoutActivityTypeMartialArts': 'martialArts',
  'HKWorkoutActivityTypeSoccer': 'soccer',
  'HKWorkoutActivityTypeBasketball': 'basketball',
  'HKWorkoutActivityTypeTennis': 'tennis',
  'HKWorkoutActivityTypeVolleyball': 'volleyball',
  'HKWorkoutActivityTypeAmericanFootball': 'americanFootball',
  'HKWorkoutActivityTypeGolf': 'golf',
  'HKWorkoutActivityTypeClimbing': 'climbing',
  'HKWorkoutActivityTypeHiking': 'hiking',
  'HKWorkoutActivityTypeSurfing': 'surfing',
  'HKWorkoutActivityTypeSnowboarding': 'snowboarding',
  'HKWorkoutActivityTypeSkiing': 'skiing',
  'HKWorkoutActivityTypeSkating': 'skating',
  'HKWorkoutActivityTypeBoxing': 'boxing',
  'HKWorkoutActivityTypeBadminton': 'badminton',
  'HKWorkoutActivityTypeTableTennis': 'tableTennis',
  'HKWorkoutActivityTypeOther': 'other'
};

// Helper function to get localized metric info
export function getMetricInfo(type: string): { name: string; unit: string; category: string } | null {
  const mapping = METRIC_MAPPING[type];
  if (!mapping) return null;
  return {
    name: i18n.t(`workouts:appleHealth.metrics.${mapping.nameKey}`),
    unit: i18n.t(`workouts:appleHealth.units.${mapping.unitKey}`),
    category: mapping.category
  };
}

// Helper function to get localized workout name
export function getWorkoutName(type: string): string {
  const key = WORKOUT_MAPPING[type];
  return key 
    ? i18n.t(`workouts:appleHealth.workouts.${key}`) 
    : i18n.t('workouts:appleHealth.workouts.other');
}

export class AppleHealthParser {
  private parser: DOMParser;

  constructor() {
    this.parser = new DOMParser();
  }

  /**
   * Парсит ZIP архив экспорта Apple Health
   */
  async parseHealthExport(file: File): Promise<ParsedHealthData> {
    try {
      // Распаковываем ZIP
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Ищем export.xml или export_cda.xml
      let xmlContent: string | null = null;
      
      for (const filename of Object.keys(zipContent.files)) {
        if (filename.endsWith('export.xml') || filename.endsWith('export_cda.xml')) {
          xmlContent = await zipContent.files[filename].async('string');
          break;
        }
      }
      
      if (!xmlContent) {
        throw new Error(i18n.t('workouts:appleHealth.errors.exportNotFound'));
      }
      
      // Парсим XML
      const doc = this.parser.parseFromString(xmlContent, 'text/xml');
      
      // Проверяем на ошибки парсинга
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error(i18n.t('workouts:appleHealth.errors.xmlParseError') + ': ' + parserError.textContent);
      }
      
      // Извлекаем данные
      const records = this.extractRecords(doc);
      const workouts = this.extractWorkouts(doc);
      const activitySummaries = this.extractActivitySummaries(doc);
      
      // Вычисляем метаданные
      const metadata = this.calculateMetadata(records, workouts);
      
      return {
        records,
        workouts,
        activitySummaries,
        metadata
      };
    } catch (error) {
      console.error('Error parsing Apple Health export:', error);
      throw error;
    }
  }

  /**
   * Извлекает записи здоровья (Record элементы)
   */
  private extractRecords(doc: Document): AppleHealthRecord[] {
    const records: AppleHealthRecord[] = [];
    const recordElements = doc.querySelectorAll('Record');
    
    recordElements.forEach((element) => {
      const type = element.getAttribute('type');
      const value = element.getAttribute('value');
      const unit = element.getAttribute('unit');
      const startDate = element.getAttribute('startDate');
      const endDate = element.getAttribute('endDate');
      const sourceName = element.getAttribute('sourceName');
      
      if (type && value && unit && startDate && endDate) {
        // Пропускаем неизвестные типы
        if (!METRIC_MAPPING[type]) {
          return;
        }
        
        records.push({
          type,
          sourceName: sourceName || 'Unknown',
          sourceVersion: element.getAttribute('sourceVersion') || undefined,
          device: element.getAttribute('device') || undefined,
          unit,
          creationDate: new Date(element.getAttribute('creationDate') || startDate),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          value: this.parseValue(value, unit)
        });
      }
    });
    
    return records;
  }

  /**
   * Извлекает данные о тренировках (Workout элементы)
   */
  private extractWorkouts(doc: Document): WorkoutRecord[] {
    const workouts: WorkoutRecord[] = [];
    const workoutElements = doc.querySelectorAll('Workout');
    
    workoutElements.forEach((element) => {
      const workoutActivityType = element.getAttribute('workoutActivityType');
      const duration = element.getAttribute('duration');
      const durationUnit = element.getAttribute('durationUnit');
      const startDate = element.getAttribute('startDate');
      const endDate = element.getAttribute('endDate');
      const sourceName = element.getAttribute('sourceName');
      
      if (workoutActivityType && duration && startDate && endDate) {
        workouts.push({
          workoutActivityType,
          duration: parseFloat(duration),
          durationUnit: durationUnit || 'min',
          totalDistance: element.getAttribute('totalDistance') 
            ? parseFloat(element.getAttribute('totalDistance')!) 
            : undefined,
          totalDistanceUnit: element.getAttribute('totalDistanceUnit') || undefined,
          totalEnergyBurned: element.getAttribute('totalEnergyBurned')
            ? parseFloat(element.getAttribute('totalEnergyBurned')!)
            : undefined,
          totalEnergyBurnedUnit: element.getAttribute('totalEnergyBurnedUnit') || undefined,
          sourceName: sourceName || 'Unknown',
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });
      }
    });
    
    return workouts;
  }

  /**
   * Извлекает сводки активности (ActivitySummary элементы)
   */
  private extractActivitySummaries(doc: Document): ActivitySummary[] {
    const summaries: ActivitySummary[] = [];
    const summaryElements = doc.querySelectorAll('ActivitySummary');
    
    summaryElements.forEach((element) => {
      const dateComponents = element.getAttribute('dateComponents');
      const activeEnergyBurned = element.getAttribute('activeEnergyBurned');
      const activeEnergyBurnedGoal = element.getAttribute('activeEnergyBurnedGoal');
      const activeEnergyBurnedUnit = element.getAttribute('activeEnergyBurnedUnit');
      
      if (dateComponents && activeEnergyBurned) {
        summaries.push({
          dateComponents: dateComponents,
          activeEnergyBurned: parseFloat(activeEnergyBurned),
          activeEnergyBurnedGoal: parseFloat(activeEnergyBurnedGoal || '0'),
          activeEnergyBurnedUnit: activeEnergyBurnedUnit || 'kcal',
          moveTime: element.getAttribute('appleStandHours') 
            ? parseFloat(element.getAttribute('appleStandHours')!)
            : undefined,
          moveTimeGoal: element.getAttribute('appleStandHoursGoal')
            ? parseFloat(element.getAttribute('appleStandHoursGoal')!)
            : undefined,
          exerciseTime: element.getAttribute('appleExerciseTime')
            ? parseFloat(element.getAttribute('appleExerciseTime')!)
            : undefined,
          exerciseTimeGoal: element.getAttribute('appleExerciseTimeGoal')
            ? parseFloat(element.getAttribute('appleExerciseTimeGoal')!)
            : undefined,
          standHours: element.getAttribute('appleStandHours')
            ? parseFloat(element.getAttribute('appleStandHours')!)
            : undefined,
          standHoursGoal: element.getAttribute('appleStandHoursGoal')
            ? parseFloat(element.getAttribute('appleStandHoursGoal')!)
            : undefined
        });
      }
    });
    
    return summaries;
  }

  /**
   * Парсит значение с учетом единиц измерения
   */
  private parseValue(value: string, unit: string): number {
    const numValue = parseFloat(value);
    
    // Конвертируем в метрическую систему если нужно
    switch(unit) {
      case 'lb':
        return numValue * 0.453592; // фунты в кг
      case 'ft':
        return numValue * 30.48; // футы в см
      case 'in':
        return numValue * 2.54; // дюймы в см
      case 'mi':
        return numValue * 1.60934; // мили в км
      case 'yd':
        return numValue * 0.9144; // ярды в метры
      case 'cal':
      case 'Cal':
        return numValue; // калории оставляем как есть
      default:
        return numValue;
    }
  }

  /**
   * Вычисляет метаданные о данных
   */
  private calculateMetadata(
    records: AppleHealthRecord[], 
    workouts: WorkoutRecord[]
  ): ParsedHealthData['metadata'] {
    let minDate = new Date();
    let maxDate = new Date(0);
    
    // Находим диапазон дат
    records.forEach((record) => {
      const date = record.startDate;
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    });
    
    workouts.forEach((workout) => {
      const date = workout.startDate;
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    });
    
    return {
      exportDate: new Date(),
      recordCount: records.length,
      workoutCount: workouts.length,
      dateRange: {
        start: minDate,
        end: maxDate
      }
    };
  }

/**
   * Группирует записи по дням и метрикам для оптимизации
   */
  groupRecordsByDate(
    records: AppleHealthRecord[]
  ): Map<string, Map<string, AppleHealthRecord[]>> {
    const grouped = new Map<string, Map<string, AppleHealthRecord[]>>();
    
    records.forEach((record) => {
      const dateKey = record.startDate.toISOString().split('T')[0];
      const metricInfo = getMetricInfo(record.type);
      
      if (!metricInfo) return;
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, new Map());
      }
      
      const dateGroup = grouped.get(dateKey)!;
      
      if (!dateGroup.has(metricInfo.name)) {
        dateGroup.set(metricInfo.name, []);
      }
      
      dateGroup.get(metricInfo.name)!.push(record);
    });
    
    return grouped;
  }

  /**
   * Агрегирует данные за день (среднее, сумма и т.д.)
   */
aggregateDailyData(
    records: AppleHealthRecord[]
  ): { date: string; metric: string; value: number; unit: string; source: string }[] {
    const grouped = this.groupRecordsByDate(records);
    const aggregated: any[] = [];
    
    grouped.forEach((dateGroup, date) => {
      dateGroup.forEach((metricRecords, metricName) => {
        // Find category by looking up the first record's type
        const firstRecord = metricRecords[0];
        const metricInfo = firstRecord ? getMetricInfo(firstRecord.type) : null;
        if (!metricInfo) return;
        
        let aggregatedValue: number;
        
        // Определяем тип агрегации в зависимости от метрики
        if (metricInfo.category === 'activity' || 
            metricName.includes('Калории') || metricName.includes('Calories') ||
            metricName.includes('Шаги') || metricName.includes('Steps')) {
          // Для активности суммируем
          aggregatedValue = metricRecords.reduce((sum, r) => sum + (r.value as number), 0);
        } else {
          // Для остальных берем среднее
          const sum = metricRecords.reduce((s, r) => s + (r.value as number), 0);
          aggregatedValue = sum / metricRecords.length;
        }
        
        aggregated.push({
          date,
          metric: metricName,
          value: Math.round(aggregatedValue * 100) / 100, // округляем до 2 знаков
          unit: metricInfo.unit,
          source: 'apple_health',
          category: metricInfo.category
        });
      });
    });
    
    return aggregated;
  }

  /**
   * Преобразует данные для сохранения в БД
   */
  prepareForDatabase(
    data: ParsedHealthData,
    userId: string
  ): {
    metrics: any[];
    workouts: any[];
    summaries: any[];
  } {
    // Агрегируем записи по дням
    const aggregatedMetrics = this.aggregateDailyData(data.records);
    
    // Преобразуем тренировки
    const workouts = data.workouts.map(workout => ({
      user_id: userId,
      workout_type: WORKOUT_MAPPING[workout.workoutActivityType] || 'Другое',
      duration_minutes: workout.duration,
      distance_km: workout.totalDistance,
      calories_burned: workout.totalEnergyBurned,
      start_time: workout.startDate,
      end_time: workout.endDate,
      source: 'apple_health',
      raw_data: workout
    }));
    
    // Преобразуем сводки активности
    const summaries = data.activitySummaries.map(summary => ({
      user_id: userId,
      date: summary.dateComponents,
      active_calories: summary.activeEnergyBurned,
      active_calories_goal: summary.activeEnergyBurnedGoal,
      move_minutes: summary.moveTime,
      exercise_minutes: summary.exerciseTime,
      stand_hours: summary.standHours,
      source: 'apple_health'
    }));
    
    return {
      metrics: aggregatedMetrics.map(m => ({
        user_id: userId,
        metric_name: m.metric,
        value: m.value,
        unit: m.unit,
        measurement_date: m.date,
        source: 'apple_health'
      })),
      workouts,
      summaries
    };
  }

  /**
   * Получает статистику по загруженным данным
   */
  getStatistics(data: ParsedHealthData): {
    totalRecords: number;
    totalWorkouts: number;
    totalDays: number;
    metrics: { name: string; count: number; category: string }[];
    workoutTypes: { type: string; count: number }[];
    dateRange: { start: Date; end: Date };
  } {
    // Подсчитываем метрики
    const metricCounts = new Map<string, { count: number; category: string }>();
    
    data.records.forEach(record => {
      const metricInfo = getMetricInfo(record.type);
      if (metricInfo) {
        const existing = metricCounts.get(metricInfo.name) || { count: 0, category: metricInfo.category };
        existing.count++;
        metricCounts.set(metricInfo.name, existing);
      }
    });
    
    // Подсчитываем типы тренировок
    const workoutCounts = new Map<string, number>();
    
    data.workouts.forEach(workout => {
      const type = getWorkoutName(workout.workoutActivityType);
      workoutCounts.set(type, (workoutCounts.get(type) || 0) + 1);
    });
    
    // Считаем уникальные дни
    const uniqueDays = new Set<string>();
    data.records.forEach(record => {
      uniqueDays.add(record.startDate.toISOString().split('T')[0]);
    });
    
    return {
      totalRecords: data.metadata.recordCount,
      totalWorkouts: data.metadata.workoutCount,
      totalDays: uniqueDays.size,
      metrics: Array.from(metricCounts.entries()).map(([name, info]) => ({
        name,
        count: info.count,
        category: info.category
      })).sort((a, b) => b.count - a.count),
      workoutTypes: Array.from(workoutCounts.entries()).map(([type, count]) => ({
        type,
        count
      })).sort((a, b) => b.count - a.count),
      dateRange: data.metadata.dateRange
    };
  }

  /**
   * Конвертирует записи здоровья в формат для базы данных
   */
  convertToMetrics(data: ParsedHealthData, userId: string): any[] {
    const metrics: any[] = [];
    
    data.records.forEach(record => {
      const metricInfo = getMetricInfo(record.type);
      if (!metricInfo) return;
      
      metrics.push({
        user_id: userId,
        metric_name: metricInfo.name,
        metric_type: 'health',
        unit: metricInfo.unit,
        value: record.value,
        measurement_date: record.startDate.toISOString().split('T')[0],
        source_data: {
          type: record.type,
          sourceName: record.sourceName,
          sourceVersion: record.sourceVersion,
          device: record.device,
          creationDate: record.creationDate.toISOString(),
          startDate: record.startDate.toISOString(),
          endDate: record.endDate.toISOString()
        }
      });
    });
    
    return metrics;
  }

  /**
   * Конвертирует тренировки в формат для базы данных
   */
  convertToWorkouts(data: ParsedHealthData, userId: string): any[] {
    const workouts: any[] = [];
    
    data.workouts.forEach(workout => {
      const workoutType = WORKOUT_MAPPING[workout.workoutActivityType] || workout.workoutActivityType;
      
      workouts.push({
        user_id: userId,
        workout_type: workoutType,
        start_time: workout.startDate.toISOString(),
        end_time: workout.endDate.toISOString(),
        duration_minutes: Math.round(workout.duration),
        distance_km: workout.totalDistance,
        calories_burned: workout.totalEnergyBurned,
        source: 'apple_health',
        source_data: {
          workoutActivityType: workout.workoutActivityType,
          durationUnit: workout.durationUnit,
          totalDistanceUnit: workout.totalDistanceUnit,
          totalEnergyBurnedUnit: workout.totalEnergyBurnedUnit,
          sourceName: workout.sourceName
        }
      });
    });
    
    return workouts;
  }

  /**
   * Конвертирует сводки активности в формат для базы данных
   */
  convertToActivitySummaries(data: ParsedHealthData, userId: string): any[] {
    const summaries: any[] = [];
    
    data.activitySummaries.forEach(summary => {
      summaries.push({
        user_id: userId,
        date: summary.dateComponents,
        active_calories: summary.activeEnergyBurned,
        active_calories_goal: summary.activeEnergyBurnedGoal,
        exercise_minutes: summary.exerciseTime,
        exercise_minutes_goal: summary.exerciseTimeGoal,
        stand_hours: summary.standHours,
        stand_hours_goal: summary.standHoursGoal,
        move_time: summary.moveTime,
        move_time_goal: summary.moveTimeGoal,
        source: 'apple_health',
        source_data: {
          activeEnergyBurnedUnit: summary.activeEnergyBurnedUnit
        }
      });
    });
    
    return summaries;
  }
}