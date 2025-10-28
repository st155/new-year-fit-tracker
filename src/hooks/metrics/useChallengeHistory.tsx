import { useMemo } from 'react';
import { useUnifiedMetricsQuery } from './useUnifiedMetricsQuery';
import { generateDailyChallenges, updateChallengeProgress } from '@/lib/daily-challenges';

export interface ChallengeStats {
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  totalPointsEarned: number;
  mostCompletedType: string;
  currentStreak: number;
}

export function useChallengeHistory(userId: string | undefined) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const { data: weekMetrics = [] } = useUnifiedMetricsQuery(userId, {
    startDate: weekAgo,
    endDate: now
  });
  
  const { data: monthMetrics = [] } = useUnifiedMetricsQuery(userId, {
    startDate: monthAgo,
    endDate: now
  });

  const stats = useMemo<ChallengeStats>(() => {
    // Group metrics by date
    const metricsByDate = new Map<string, typeof weekMetrics>();
    
    weekMetrics.forEach(m => {
      const date = m.measurement_date;
      if (!metricsByDate.has(date)) {
        metricsByDate.set(date, []);
      }
      metricsByDate.get(date)!.push(m);
    });

    // Calculate completion for each day
    const dailyCompletions: { date: string; completed: number; total: number }[] = [];
    const completionByType = new Map<string, number>();
    
    metricsByDate.forEach((metrics, date) => {
      const challenges = generateDailyChallenges();
      
      let completed = 0;
      challenges.forEach(challenge => {
        const relevantMetric = metrics.find(m => {
          switch (challenge.type) {
            case 'steps': return m.metric_name === 'Steps';
            case 'workout': return m.metric_name === 'Workout Count';
            case 'sleep': return m.metric_name === 'Sleep Duration';
            case 'strain': return m.metric_name === 'Day Strain';
            case 'recovery': return m.metric_name === 'Recovery Score';
            default: return false;
          }
        });
        
        if (relevantMetric) {
          let value = relevantMetric.value;
          // Convert sleep from minutes to hours for comparison
          if (challenge.type === 'sleep') {
            value = value / 60;
          }
          const updated = updateChallengeProgress(challenge, value);
          if (updated.completed) {
            completed++;
            completionByType.set(
              challenge.type, 
              (completionByType.get(challenge.type) || 0) + 1
            );
          }
        }
      });
      
      dailyCompletions.push({ date, completed, total: challenges.length });
    });

    // Calculate weekly completion rate
    const weeklyTotal = dailyCompletions.reduce((sum, d) => sum + d.total, 0);
    const weeklyCompleted = dailyCompletions.reduce((sum, d) => sum + d.completed, 0);
    const weeklyCompletionRate = weeklyTotal > 0 ? (weeklyCompleted / weeklyTotal) * 100 : 0;

    // Calculate monthly completion rate (using monthMetrics)
    const monthMetricsByDate = new Map<string, typeof monthMetrics>();
    monthMetrics.forEach(m => {
      const date = m.measurement_date;
      if (!monthMetricsByDate.has(date)) {
        monthMetricsByDate.set(date, []);
      }
      monthMetricsByDate.get(date)!.push(m);
    });

    const monthlyDailyCompletions: { completed: number; total: number }[] = [];
    monthMetricsByDate.forEach((metrics) => {
      const challenges = generateDailyChallenges();
      let completed = 0;
      
      challenges.forEach(challenge => {
        const relevantMetric = metrics.find(m => {
          switch (challenge.type) {
            case 'steps': return m.metric_name === 'Steps';
            case 'workout': return m.metric_name === 'Workout Count';
            case 'sleep': return m.metric_name === 'Sleep Duration';
            case 'strain': return m.metric_name === 'Day Strain';
            case 'recovery': return m.metric_name === 'Recovery Score';
            default: return false;
          }
        });
        
        if (relevantMetric) {
          let value = relevantMetric.value;
          if (challenge.type === 'sleep') {
            value = value / 60;
          }
          const updated = updateChallengeProgress(challenge, value);
          if (updated.completed) {
            completed++;
          }
        }
      });
      
      monthlyDailyCompletions.push({ completed, total: challenges.length });
    });

    const monthlyTotal = monthlyDailyCompletions.reduce((sum, d) => sum + d.total, 0);
    const monthlyCompleted = monthlyDailyCompletions.reduce((sum, d) => sum + d.completed, 0);
    const monthlyCompletionRate = monthlyTotal > 0 ? (monthlyCompleted / monthlyTotal) * 100 : 0;

    // Find most completed type
    let mostCompletedType = 'steps';
    let maxCompletions = 0;
    completionByType.forEach((count, type) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        mostCompletedType = type;
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const sortedDays = [...dailyCompletions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    for (const day of sortedDays) {
      if (day.completed === day.total && day.total > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate total points (50 points per completed challenge)
    const totalPointsEarned = weeklyCompleted * 50;

    return {
      weeklyCompletionRate: Math.round(weeklyCompletionRate),
      monthlyCompletionRate: Math.round(monthlyCompletionRate),
      totalPointsEarned,
      mostCompletedType,
      currentStreak
    };
  }, [weekMetrics, monthMetrics]);

  return stats;
}
