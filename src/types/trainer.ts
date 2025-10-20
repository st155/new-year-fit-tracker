// Trainer types for improved type safety across trainer functionality

export interface TrainerClient {
  client_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  active_goals_count: number;
  recent_measurements_count: number;
  last_activity_date: string | null;
  health_summary: {
    whoop_recovery_avg: number | null;
    sleep_hours_avg: number | null;
    weight_latest: number | null;
    vo2max_latest: number | null;
  };
}

export interface AIConversation {
  id: string;
  trainer_id: string;
  title: string | null;
  context_mode: 'general' | 'goals' | 'analysis' | 'challenge';
  category: 'planning' | 'client_analysis' | 'tasks' | 'general';
  created_at: string;
  last_message_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface AIPendingAction {
  id: string;
  trainer_id: string;
  conversation_id: string;
  action_type: string;
  action_plan: string;
  action_data: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  created_at: string;
  executed_at: string | null;
}

export interface ClientTask {
  id: string;
  trainer_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deadline: string | null;
  task_type: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingPlan {
  id: string;
  trainer_id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  created_at: string;
  updated_at: string;
}

export interface AssignedTrainingPlan {
  id: string;
  plan_id: string;
  client_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

export interface ClientDetailData {
  goals: Array<{
    id: string;
    goal_name: string;
    target_value: number;
    target_unit: string;
    goal_type: string;
    current_value?: number;
  }>;
  measurements: Array<{
    id: string;
    value: number;
    measurement_date: string;
    goal_name: string;
    unit: string;
    source?: string;
  }>;
  unified_metrics: Array<{
    metric_name: string;
    value: number;
    measurement_date: string;
    source: string;
    unit: string;
    category: string;
  }>;
  health_summary: Array<{
    date: string;
    steps?: number;
    weight?: number;
    heart_rate_avg?: number;
    active_calories?: number;
    sleep_hours?: number;
    vo2_max?: number;
  }>;
  ai_history: Array<{
    id: string;
    action_type: string;
    action_details: Record<string, any>;
    success: boolean;
    created_at: string;
  }>;
}

export interface AIActionLog {
  id: string;
  trainer_id: string;
  client_id: string | null;
  conversation_id: string | null;
  action_type: string;
  action_details: Record<string, any>;
  success: boolean;
  error_message: string | null;
  pending_action_id: string | null;
  created_at: string;
}

export type TrainerRole = 'owner' | 'coach' | 'assistant';

export interface ChallengeTrainer {
  id: string;
  challenge_id: string;
  trainer_id: string;
  role: TrainerRole;
  added_at: string;
}
