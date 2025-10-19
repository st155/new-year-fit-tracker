export interface HealthData {
  date: string;
  
  // Activity
  steps?: number;
  steps_source?: string;
  active_calories?: number;
  active_calories_source?: string;
  distance?: number;
  distance_source?: string;
  avg_speed?: number;
  avg_speed_source?: string;
  max_speed?: number;
  max_speed_source?: string;
  elevation_gain?: number;
  elevation_gain_source?: string;
  workout_time?: number;
  workout_time_source?: string;
  
  // Heart
  heart_rate_avg?: number;
  heart_rate_avg_source?: string;
  resting_heart_rate?: number;
  resting_heart_rate_source?: string;
  max_heart_rate?: number;
  max_heart_rate_source?: string;
  hrv?: number;
  hrv_source?: string;
  sleep_hrv?: number;
  sleep_hrv_source?: string;
  hr_zones_low?: number;
  hr_zones_low_source?: string;
  hr_zones_high?: number;
  hr_zones_high_source?: string;
  
  // Sleep
  sleep_hours?: number;
  sleep_hours_source?: string;
  sleep_efficiency?: number;
  sleep_efficiency_source?: string;
  sleep_performance?: number;
  sleep_performance_source?: string;
  deep_sleep_duration?: number;
  deep_sleep_duration_source?: string;
  light_sleep_duration?: number;
  light_sleep_duration_source?: string;
  rem_sleep_duration?: number;
  rem_sleep_duration_source?: string;
  respiratory_rate?: number;
  respiratory_rate_source?: string;
  
  // Body Composition
  weight?: number;
  weight_source?: string;
  body_fat?: number;
  body_fat_source?: string;
  muscle_mass?: number;
  muscle_mass_source?: string;
  muscle_percent?: number;
  muscle_percent_source?: string;
  
  // Recovery
  recovery_score?: number;
  recovery_score_source?: string;
  day_strain?: number;
  day_strain_source?: string;
  workout_strain?: number;
  workout_strain_source?: string;
  body_battery?: number;
  body_battery_source?: string;
  stress_level?: number;
  stress_level_source?: string;
  
  // Workouts
  workout_calories?: number;
  workout_calories_source?: string;
  
  // Health Metrics
  vo2_max?: number;
  vo2_max_source?: string;
  blood_pressure?: number;
  blood_pressure_source?: string;
}

export type MetricCategory = 'overview' | 'activity' | 'heart' | 'sleep' | 'body' | 'recovery' | 'workouts' | 'health';
