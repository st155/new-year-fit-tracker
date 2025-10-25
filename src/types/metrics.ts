/**
 * Core metric types for the application
 */

export enum DataSource {
  INBODY = 'inbody',
  WITHINGS = 'withings',
  WHOOP = 'whoop',
  APPLE_HEALTH = 'apple_health',
  MANUAL = 'manual',
  TERRA = 'terra',
}

export type MetricType = 
  | 'weight'
  | 'body_fat'
  | 'body_fat_percentage'
  | 'muscle_mass'
  | 'skeletal_muscle_mass'
  | 'bmr'
  | 'bmi'
  | 'visceral_fat'
  | 'body_water'
  | 'protein'
  | 'minerals'
  | 'vo2_max'
  | 'heart_rate'
  | 'hrv'
  | 'sleep_duration'
  | 'steps'
  | 'calories'
  | 'active_energy';

export interface UnifiedMetric {
  metric_id: string;
  user_id: string;
  metric_name: string;
  metric_type: MetricType;
  value: number;
  unit: string;
  source: DataSource;
  measurement_date: string; // ISO UTC string
  created_at: string;
  priority?: number;
}

export interface MetricWithTrend extends UnifiedMetric {
  trend?: number;
  trendPercent?: number;
  previousValue?: number;
  changeFromPrevious?: number;
}

export interface SparklineDataPoint {
  date: string;
  value: number;
}

export interface MetricData {
  value: number;
  unit: string;
  source: DataSource;
  date: string;
  trend?: number;
  trendPercent?: number;
  sparklineData?: SparklineDataPoint[];
  zone?: 'low' | 'normal' | 'high';
  percentOfNorm?: number;
  sources?: {
    inbody?: { value: number; date: string; sparklineData: SparklineDataPoint[] };
    withings?: { value: number; date: string; sparklineData: SparklineDataPoint[] };
    manual?: { value: number; date: string; sparklineData: SparklineDataPoint[] };
  };
}

export interface BodyComposition {
  id: string;
  user_id: string;
  weight: number | null;
  skeletal_muscle_mass: number | null;
  percent_body_fat: number | null;
  body_fat_mass: number | null;
  visceral_fat_area: number | null;
  bmi: number | null;
  bmr: number | null;
  total_body_water: number | null;
  protein: number | null;
  minerals: number | null;
  test_date: string;
  source: DataSource;
  created_at: string;
}

export interface SegmentalData {
  percent: number;
  mass: number;
  zone: 'low' | 'normal' | 'high';
}

export interface AggregatedBodyMetrics {
  weight?: MetricData;
  bodyFat?: MetricData;
  muscleMass?: MetricData;
  bmr?: MetricData;
  visceralFat?: MetricData;
  bodyWater?: MetricData;
  protein?: MetricData;
  minerals?: MetricData;
  segmental?: {
    rightArm?: SegmentalData;
    leftArm?: SegmentalData;
    trunk?: SegmentalData;
    rightLeg?: SegmentalData;
    leftLeg?: SegmentalData;
  };
}

export interface WidgetConfig {
  id: string;
  user_id: string;
  metric_name: string;
  source: DataSource;
  position: number;
  created_at: string;
}

export interface MetricFilters {
  userId?: string;
  metricType?: MetricType;
  metricName?: string;
  source?: DataSource;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface DateRange {
  start: string;
  end: string;
}
