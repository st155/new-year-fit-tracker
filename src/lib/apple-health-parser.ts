// lib/apple-health-parser.ts
import JSZip from 'jszip';

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

// Маппинг типов метрик Apple Health на наши категории
const METRIC_MAPPING: Record<string, { name: string; unit: string; category: string }> = {
  // Витальные показатели
  'HKQuantityTypeIdentifierHeartRate': { name: 'Частота пульса', unit: 'уд/мин', category: 'heart' },
  'HKQuantityTypeIdentifierRestingHeartRate': { name: 'Пульс в покое', unit: 'уд/мин', category: 'heart' },
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': { name: 'Вариабельность пульса', unit: 'мс', category: 'heart' },
  'HKQuantityTypeIdentifierBloodPressureSystolic': { name: 'Систолическое давление', unit: 'мм рт.ст.', category: 'heart' },
  'HKQuantityTypeIdentifierBloodPressureDiastolic': { name: 'Диастолическое давление', unit: 'мм рт.ст.', category: 'heart' },
  'HKQuantityTypeIdentifierRespiratoryRate': { name: 'Частота дыхания', unit: 'вдохов/мин', category: 'vitals' },
  'HKQuantityTypeIdentifierOxygenSaturation': { name: 'Насыщение кислородом', unit: '%', category: 'vitals' },
  'HKQuantityTypeIdentifierBodyTemperature': { name: 'Температура тела', unit: '°C', category: 'vitals' },
  
  // Композиция тела
  'HKQuantityTypeIdentifierBodyMass': { name: 'Вес', unit: 'кг', category: 'body' },
  'HKQuantityTypeIdentifierBodyMassIndex': { name: 'ИМТ', unit: 'кг/м²', category: 'body' },
  'HKQuantityTypeIdentifierBodyFatPercentage': { name: 'Процент жира', unit: '%', category: 'body' },
  'HKQuantityTypeIdentifierLeanBodyMass': { name: 'Мышечная масса', unit: 'кг', category: 'body' },
  'HKQuantityTypeIdentifierHeight': { name: 'Рост', unit: 'см', category: 'body' },
  'HKQuantityTypeIdentifierWaistCircumference': { name: 'Окружность талии', unit: 'см', category: 'body' },
  
  // Активность
  'HKQuantityTypeIdentifierStepCount': { name: 'Шаги', unit: 'шагов', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceWalkingRunning': { name: 'Дистанция ходьба/бег', unit: 'км', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceCycling': { name: 'Дистанция велосипед', unit: 'км', category: 'activity' },
  'HKQuantityTypeIdentifierDistanceSwimming': { name: 'Дистанция плавание', unit: 'км', category: 'activity' },
  'HKQuantityTypeIdentifierFlightsClimbed': { name: 'Этажей пройдено', unit: 'этажей', category: 'activity' },
  'HKQuantityTypeIdentifierActiveEnergyBurned': { name: 'Активные калории', unit: 'ккал', category: 'activity' },
  'HKQuantityTypeIdentifierBasalEnergyBurned': { name: 'Базовые калории', unit: 'ккал', category: 'activity' },
  'HKQuantityTypeIdentifierAppleExerciseTime': { name: 'Время тренировки', unit: 'мин', category: 'activity' },
  'HKQuantityTypeIdentifierAppleStandTime': { name: 'Время стояния', unit: 'мин', category: 'activity' },
  'HKQuantityTypeIdentifierAppleMoveTime': { name: 'Время движения', unit: 'мин', category: 'activity' },
  
  // Сон
  'HKCategoryTypeIdentifierSleepAnalysis': { name: 'Анализ сна', unit: 'часов', category: 'sleep' },
  'HKQuantityTypeIdentifierSleepDuration': { name: 'Длительность сна', unit: 'часов', category: 'sleep' },
  
  // Питание
  'HKQuantityTypeIdentifierDietaryWater': { name: 'Вода', unit: 'мл', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryCaffeine': { name: 'Кофеин', unit: 'мг', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryProtein': { name: 'Белки', unit: 'г', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryCarbohydrates': { name: 'Углеводы', unit: 'г', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryFatTotal': { name: 'Жиры', unit: 'г', category: 'nutrition' },
  'HKQuantityTypeIdentifierDietaryEnergyConsumed': { name: 'Калории потреблено', unit: 'ккал', category: 'nutrition' },
  
  // Тренировки
  'HKQuantityTypeIdentifierVO2Max': { name: 'VO2 Max', unit: 'мл/кг/мин', category: 'fitness' },
  'HKQuantityTypeIdentifierWalkingSpeed': { name: 'Скорость ходьбы', unit: 'км/ч', category: 'fitness' },
  'HKQuantityTypeIdentifierWalkingStepLength': { name: 'Длина шага', unit: 'см', category: 'fitness' },
  'HKQuantityTypeIdentifierPushCount': { name: 'Отжимания', unit: 'раз', category: 'fitness' },
  'HKQuantityTypeIdentifierSwimmingStrokeCount': { name: 'Гребки при плавании', unit: 'гребков', category: 'fitness' },
  
  // Другие
  'HKQuantityTypeIdentifierUVExposure': { name: 'УФ-излучение', unit: 'индекс', category: 'environment' },
  'HKQuantityTypeIdentifierEnvironmentalAudioExposure': { name: 'Уровень шума', unit: 'дБ', category: 'environment' },
  'HKQuantityTypeIdentifierHeadphoneAudioExposure': { name: 'Громкость наушников', unit: 'дБ', category: 'environment' },
};

// Маппинг типов тренировок
const WORKOUT_MAPPING: Record<string, string> = {
  'HKWorkoutActivityTypeRunning': 'Бег',
  'HKWorkoutActivityTypeWalking': 'Ходьба',
  'HKWorkoutActivityTypeCycling': 'Велосипед',
  'HKWorkoutActivityTypeSwimming': 'Плавание',
  'HKWorkoutActivityTypeYoga': 'Йога',
  'HKWorkoutActivityTypeStrengthTraining': 'Силовая тренировка',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'Функциональная тренировка',
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'Классическая силовая',
  'HKWorkoutActivityTypeCrossTraining': 'Кросс-тренинг',
  'HKWorkoutActivityTypeElliptical': 'Эллипсоид',
  'HKWorkoutActivityTypeRowing': 'Гребля',
  'HKWorkoutActivityTypeStairClimbing': 'Подъем по лестнице',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'HIIT',
  'HKWorkoutActivityTypePilates': 'Пилатес',
  'HKWorkoutActivityTypeDancing': 'Танцы',
  'HKWorkoutActivityTypeMartialArts': 'Единоборства',
  'HKWorkoutActivityTypeSoccer': 'Футбол',
  'HKWorkoutActivityTypeBasketball': 'Баскетбол',
  'HKWorkoutActivityTypeTennis': 'Теннис',
  'HKWorkoutActivityTypeVolleyball': 'Волейбол',
  'HKWorkoutActivityTypeAmericanFootball': 'Американский футбол',
  'HKWorkoutActivityTypeGolf': 'Гольф',
  'HKWorkoutActivityTypeClimbing': 'Скалолазание',
  'HKWorkoutActivityTypeHiking': 'Хайкинг',
  'HKWorkoutActivityTypeSurfing': 'Серфинг',
  'HKWorkoutActivityTypeSnowboarding': 'Сноуборд',
  'HKWorkoutActivityTypeSkiing': 'Лыжи',
  'HKWorkoutActivityTypeSkating': 'Катание на коньках',
  'HKWorkoutActivityTypeBoxing': 'Бокс',
  'HKWorkoutActivityTypeBadminton': 'Бадминтон',
  'HKWorkoutActivityTypeTableTennis': 'Настольный теннис',
  'HKWorkoutActivityTypeOther': 'Другое'
};

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
        throw new Error('Не найден файл export.xml в архиве');
      }
      
      // Парсим XML
      const doc = this.parser.parseFromString(xmlContent, 'text/xml');
      
      // Проверяем на ошибки парсинга
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('Ошибка парсинга XML: ' + parserError.textContent);
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
      const metricInfo = METRIC_MAPPING[record.type];
      
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
        const metricInfo = Object.values(METRIC_MAPPING).find(m => m.name === metricName);
        if (!metricInfo) return;
        
        let aggregatedValue: number;
        
        // Определяем тип агрегации в зависимости от метрики
        if (metricInfo.category === 'activity' || 
            metricName.includes('Калории') || 
            metricName.includes('Шаги')) {
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
      const metricInfo = METRIC_MAPPING[record.type];
      if (metricInfo) {
        const existing = metricCounts.get(metricInfo.name) || { count: 0, category: metricInfo.category };
        existing.count++;
        metricCounts.set(metricInfo.name, existing);
      }
    });
    
    // Подсчитываем типы тренировок
    const workoutCounts = new Map<string, number>();
    
    data.workouts.forEach(workout => {
      const type = WORKOUT_MAPPING[workout.workoutActivityType] || 'Другое';
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
}