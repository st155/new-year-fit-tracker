/**
 * Smart Insights Types
 */

export type InsightType = 
  | 'critical' 
  | 'warning' 
  | 'achievement' 
  | 'info' 
  | 'recommendation'
  | 'correlation'
  | 'anomaly'
  | 'prediction'
  | 'social'
  | 'trainer'
  | 'temporal';

export interface SmartInsight {
  id: string;
  type: InsightType;
  emoji: string;
  message: string;
  priority: number; // 0-100, higher = more important
  action: InsightAction;
  timestamp: Date;
  source: string;
}

export interface InsightAction {
  type: 'navigate' | 'modal' | 'external';
  path?: string;
  data?: any;
}

export interface InsightGeneratorContext {
  userId: string;
  qualityData?: any;
  metricsData?: any;
  goalsData?: any;
  habitsData?: any;
  todayMetrics?: any;
  challengeData?: any;
  trainerData?: any;
}
