import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  source: string;
  date: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

export interface Integration {
  id: string;
  provider: string;
  status: 'active' | 'stale' | 'expired';
  lastSync: string | null;
  terraUserId: string;
}

export interface ActivityItem {
  id: string;
  type: 'habit_completion' | 'workout' | 'milestone' | 'health_metric';
  title: string;
  description: string;
  timestamp: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ProfileSummary {
  // Stats
  habitsCount: number;
  workoutsCount: number;
  goalsCount: number;
  metricsCount: number;
  streakDays: number;
  
  // Health metrics
  latestMetrics: HealthMetric[];
  
  // Integrations
  integrations: Integration[];
  activeIntegrationsCount: number;
  
  // Activity
  recentActivity: ActivityItem[];
  
  // Profile info
  registeredAt: string | null;
  totalXP: number;
}

export function useProfileSummary() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['profile-summary', user?.id],
    queryFn: async (): Promise<ProfileSummary> => {
      if (!user?.id) throw new Error('No user');
      
      // Parallel fetch all data
      const [
        habitsResult,
        workoutsResult,
        goalsResult,
        metricsCountResult,
        latestMetricsResult,
        integrationsResult,
        activityResult,
        profileResult,
        xpResult
      ] = await Promise.all([
        // Habits count
        supabase
          .from('habits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true),
        
        // Workouts count
        supabase
          .from('workouts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        
        // Goals count
        supabase
          .from('goals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        
        // Metrics count
        supabase
          .from('unified_metrics')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        
        // Latest health metrics (unique by metric_name)
        supabase
          .from('unified_metrics')
          .select('metric_name, value, unit, source, measurement_date')
          .eq('user_id', user.id)
          .in('metric_name', ['Weight', 'Resting Heart Rate', 'Sleep Duration', 'Recovery Score', 'Day Strain', 'HRV', 'Steps'])
          .order('measurement_date', { ascending: false })
          .limit(50),
        
        // Integrations from terra_tokens
        supabase
          .from('terra_tokens')
          .select('id, provider, is_active, terra_user_id, updated_at, last_sync_date')
          .eq('user_id', user.id),
        
        // Recent activity from activity_feed
        supabase
          .from('activity_feed')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Profile for registration date
        supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', user.id)
          .single(),
        
        // Total XP
        supabase
          .from('xp_history')
          .select('xp_earned')
          .eq('user_id', user.id)
      ]);
      
      // Process latest metrics - get unique by metric_name
      const metricsMap = new Map<string, HealthMetric>();
      latestMetricsResult.data?.forEach(m => {
        if (!metricsMap.has(m.metric_name)) {
          metricsMap.set(m.metric_name, {
            name: m.metric_name,
            value: m.value,
            unit: m.unit || '',
            source: m.source || 'unknown',
            date: m.measurement_date
          });
        }
      });
      
      // Process integrations
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const integrations: Integration[] = (integrationsResult.data || []).map(t => {
        const lastSync = t.last_sync_date || t.updated_at;
        const lastSyncDate = lastSync ? new Date(lastSync) : null;
        
        let status: 'active' | 'stale' | 'expired' = 'expired';
        if (t.is_active && lastSyncDate) {
          if (lastSyncDate > oneDayAgo) {
            status = 'active';
          } else if (lastSyncDate > sevenDaysAgo) {
            status = 'stale';
          }
        }
        
        return {
          id: t.id,
          provider: t.provider,
          status,
          lastSync: lastSync,
          terraUserId: t.terra_user_id
        };
      });
      
      // Process activity feed
      let recentActivity: ActivityItem[] = (activityResult.data || []).map(a => ({
        id: a.id,
        type: mapActionType(a.action_type),
        title: a.action_text,
        description: a.source_table || '',
        timestamp: a.measurement_date || a.created_at,
        source: a.source_table,
        metadata: a.metadata as Record<string, any> || {}
      }));
      
      // Enrich manual trainer workouts with WHOOP calories
      const manualWorkoutActivities = recentActivity.filter(
        a => a.type === 'workout' && a.metadata?.source === 'manual_trainer'
      );
      
      if (manualWorkoutActivities.length > 0) {
        const { data: whoopWorkouts } = await supabase
          .from('workouts')
          .select('start_time, calories_burned')
          .eq('user_id', user.id)
          .eq('source', 'whoop')
          .in('workout_type', ['0', '1', '48', '63', '44', '47', '82', '71'])
          .not('calories_burned', 'is', null);
        
        if (whoopWorkouts && whoopWorkouts.length > 0) {
          const caloriesMap = new Map<string, number>();
          whoopWorkouts.forEach(w => {
            if (w.start_time && w.calories_burned) {
              const date = w.start_time.split('T')[0];
              caloriesMap.set(date, w.calories_burned);
            }
          });
          
          recentActivity = recentActivity.map(a => {
            if (a.type === 'workout' && a.metadata?.source === 'manual_trainer') {
              const date = (a.metadata?.start_time || a.timestamp)?.split('T')[0];
              if (date && caloriesMap.has(date)) {
                return {
                  ...a,
                  metadata: { ...a.metadata, calories: caloriesMap.get(date) }
                };
              }
            }
            return a;
          });
        }
      }
      
      // Calculate streak (consecutive days with activity)
      const streakDays = await calculateStreak(user.id);
      
      // Total XP
      const totalXP = (xpResult.data || []).reduce((sum, x) => sum + (x.xp_earned || 0), 0);
      
      return {
        habitsCount: habitsResult.count || 0,
        workoutsCount: workoutsResult.count || 0,
        goalsCount: goalsResult.count || 0,
        metricsCount: metricsCountResult.count || 0,
        streakDays,
        latestMetrics: Array.from(metricsMap.values()),
        integrations,
        activeIntegrationsCount: integrations.filter(i => i.status === 'active').length,
        recentActivity,
        registeredAt: profileResult.data?.created_at || null,
        totalXP
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function mapActionType(actionType: string): ActivityItem['type'] {
  if (actionType.includes('habit') || actionType === 'complete') return 'habit_completion';
  if (actionType.includes('workout') || actionType === 'training') return 'workout';
  if (actionType.includes('milestone') || actionType === 'achievement') return 'milestone';
  return 'health_metric';
}

async function calculateStreak(userId: string): Promise<number> {
  // Get activity dates for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data } = await supabase
    .from('activity_feed')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });
  
  if (!data || data.length === 0) return 0;
  
  // Get unique dates
  const dates = new Set(
    data.map(a => new Date(a.created_at).toISOString().split('T')[0])
  );
  
  // Calculate consecutive days from today
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    if (dates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      // Allow missing today, but break on any other gap
      break;
    }
  }
  
  return streak;
}
