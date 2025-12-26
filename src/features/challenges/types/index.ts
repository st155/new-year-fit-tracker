/**
 * Challenge Module Types
 * Domain types for challenges feature
 */

import type { Database } from '@/integrations/supabase/types';

// Database row types
type ChallengeRow = Database['public']['Tables']['challenges']['Row'];
type ChallengeParticipantRow = Database['public']['Tables']['challenge_participants']['Row'];
type ChallengePointsRow = Database['public']['Tables']['challenge_points']['Row'];
type ChallengeTrainerRow = Database['public']['Tables']['challenge_trainers']['Row'];
type ChallengeDisciplineRow = Database['public']['Tables']['challenge_disciplines']['Row'];

// ============ Core Types ============

export interface Challenge extends ChallengeRow {
  isParticipant?: boolean;
  challenge_participants?: Array<{ user_id: string }>;
}

export interface ChallengeWithDetails extends Challenge {
  participants: ChallengeParticipantWithProfile[];
  totalGoals: number;
  totalDisciplines: number;
}

export interface ChallengeParticipant extends ChallengeParticipantRow {}

export interface ChallengeParticipantWithProfile extends ChallengeParticipant {
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChallengePoints extends ChallengePointsRow {}

export interface ChallengeTrainer extends ChallengeTrainerRow {}

export interface ChallengeDiscipline extends ChallengeDisciplineRow {}

// ============ Scoring Types ============

export interface MetricsBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'performance' | 'recovery' | 'consistency' | 'social';
}

export interface PointsBreakdown {
  performance: {
    steps: number;
    calories: number;
    workouts: number;
    goals: number;
  };
  recovery: {
    sleep: number;
    hrv: number;
    restingHr: number;
    recoveryScore: number;
  };
  synergy: {
    streak: number;
    consistency: number;
    improvement: number;
  };
  bonus: {
    badges: number;
    milestones: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  rank: number;
  totalPoints: number;
  performancePoints: number;
  recoveryPoints: number;
  synergyPoints: number;
  streakDays: number;
  lastActivityDate: string | null;
  badges: MetricsBadge[];
  // Metrics
  activeDays: number;
  avgRecovery: number;
  avgStrain: number;
  avgSleep: number;
  avgSleepEfficiency: number;
  avgRestingHr: number;
  avgHrv: number;
  totalSteps: number;
  totalActiveCalories: number;
  totalGoals: number;
  goalsWithBaseline: number;
  trackableGoals: number;
}

// ============ Report Types ============

export interface GoalReport {
  id: string;
  name: string;
  type: string;
  baseline: number | null;
  current: number | null;
  target: number | null;
  unit: string;
  progress: number;
  achieved: boolean;
  trend: 'improved' | 'declined' | 'stable';
  measurements: Array<{ date: string; value: number }>;
}

export interface ActivityReport {
  totalActiveDays: number;
  totalWorkouts: number;
  totalSteps: number;
  totalCalories: number;
  longestStreak: number;
  avgDailySteps: number;
}

export interface HealthReport {
  avgRecovery: number;
  avgSleep: number;
  avgHrv: number;
  avgRestingHr: number;
  avgStrain: number;
  avgSleepEfficiency: number;
}

export interface ChallengeReport {
  // Challenge info
  challengeId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  durationDays: number;
  
  // User results
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  finalRank: number;
  totalPoints: number;
  
  // Points breakdown
  performancePoints: number;
  recoveryPoints: number;
  synergyPoints: number;
  pointsBreakdown: PointsBreakdown | null;
  
  // Goals progress
  goals: GoalReport[];
  goalsAchieved: number;
  totalGoals: number;
  
  // Activity summary
  activity: ActivityReport;
  
  // Health averages
  health: HealthReport;
  
  // Achievements
  badges: MetricsBadge[];
  streakDays: number;
  
  // Joined date
  joinedAt: string;
}

export interface ChallengeReportOptions {
  preview?: boolean;
}

// ============ Input Types ============

export interface ChallengeCreateInput {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  created_by: string;
  is_active?: boolean;
}

export interface ChallengeUpdateInput {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface JoinChallengeInput {
  challengeId: string;
  userId: string;
  difficultyLevel?: number;
}
