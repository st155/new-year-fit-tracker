// Goals Module Types

// ============= Base Types =============

export type GoalSource = 'inbody' | 'withings' | 'manual' | 'garmin' | 'whoop' | 'oura' | 'google' | 'terra';
export type GoalTrend = 'up' | 'down' | 'stable';

// ============= Measurement Types =============

export interface Measurement {
  id?: string;
  goal_id: string;
  user_id?: string;
  value: number;
  measurement_date: string;
  reps?: number | null;
  source?: GoalSource;
  created_at?: string;
}

export interface MeasurementCreateInput {
  goal_id: string;
  user_id: string;
  value: number;
  unit: string;
  measurement_date: string;
  reps?: number | null;
  source?: GoalSource;
}

// ============= Goal Types =============

export interface Goal {
  id: string;
  user_id: string | null;
  goal_name: string;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  target_reps?: number | null;
  is_personal: boolean | null;
  challenge_id: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields (attached after fetch)
  measurements?: Measurement[];
  current_value?: number;
  source?: GoalSource;
}

export interface GoalCreateInput {
  user_id: string;
  goal_name: string;
  goal_type: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_reps?: number | null;
  is_personal?: boolean;
  challenge_id?: string | null;
}

export interface GoalUpdateInput {
  id: string;
  goal_name?: string;
  goal_type?: string;
  target_value?: number | null;
  target_unit?: string | null;
  target_reps?: number | null;
  is_personal?: boolean;
}

// ============= Challenge Goal Types =============

export interface SubSource {
  source: 'inbody' | 'withings' | 'manual';
  value: number;
  label: string;
}

export interface ChallengeGoal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number | null;
  target_unit: string;
  target_reps?: number | null;
  current_value: number;
  progress_percentage: number;
  trend: GoalTrend;
  trend_percentage: number;
  is_personal: boolean;
  challenge_id?: string;
  challenge_title?: string;
  measurements: Measurement[];
  source?: GoalSource;
  has_target: boolean;
  baseline_value?: number;
  subSources?: SubSource[];
}

// ============= Participation Types =============

export interface ChallengeParticipation {
  challenge_id: string;
  baseline_body_fat: number | null;
  baseline_weight: number | null;
  baseline_muscle_mass: number | null;
  baseline_recorded_at: string | null;
  challenges?: {
    title: string;
    start_date: string;
  };
}

// ============= Current Value Types =============

export interface GoalCurrentValue {
  goal_id: string;
  current_value: number | null;
  source: string | null;
}

// ============= Unified Metric Types =============

export interface UnifiedMetric {
  metric_name: string;
  value: number;
  measurement_date: string;
}

// ============= Query Result Types =============

export interface GoalsQueryResult {
  personalGoals: Goal[] | undefined;
  challengeGoals: Goal[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

// ============= Component Props Types =============

export interface GoalCardProps {
  goal: ChallengeGoal;
  onClick?: () => void;
  className?: string;
}

export interface GoalProgressTimelineProps {
  measurements: Measurement[];
  target: number;
  isLowerBetter?: boolean;
  unit?: string;
  period?: 'week' | 'month';
}
