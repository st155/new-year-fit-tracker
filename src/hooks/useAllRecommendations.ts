import { useMemo } from 'react';
import { useDoctorActionItems, DoctorActionItem } from '@/hooks/biostack/useDoctorActionItems';
import { useUserWeeklySleep } from '@/hooks/useUserWeeklySleep';
import { useAuth } from '@/hooks/useAuth';

export type RecommendationCategory = 'sleep' | 'exercise' | 'supplement' | 'checkup' | 'lifestyle' | 'nutrition';
export type RecommendationSource = 'doctor' | 'ai' | 'device' | 'manual';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationStatus = 'pending' | 'active' | 'completed' | 'dismissed';

export interface UnifiedRecommendation {
  id: string;
  category: RecommendationCategory;
  source: RecommendationSource;
  title: string;
  description: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  actionable: boolean;
  action?: { 
    type: 'add_to_stack' | 'schedule' | 'open_page' | 'dismiss'; 
    payload?: any;
  };
  metadata: {
    doctorName?: string;
    prescriptionDate?: string;
    deviceSource?: string;
    confidence?: number;
    rationale?: string;
    dosage?: string;
    schedule?: string;
    duration?: string;
    protocolTag?: string;
    originalItem?: DoctorActionItem;
  };
  createdAt: string;
}

function mapActionTypeToCategory(actionType: string): RecommendationCategory {
  switch (actionType) {
    case 'supplement':
    case 'medication':
      return 'supplement';
    case 'exercise':
      return 'exercise';
    case 'test':
    case 'consultation':
      return 'checkup';
    case 'lifestyle':
      return 'lifestyle';
    default:
      return 'lifestyle';
  }
}

function mapDoctorItemToRecommendation(item: DoctorActionItem): UnifiedRecommendation {
  const category = mapActionTypeToCategory(item.action_type);
  
  let description = item.details || '';
  if (item.dosage) {
    description = `${item.dosage}${item.schedule ? ` • ${item.schedule}` : ''}`;
  }
  if (item.rationale && !description) {
    description = item.rationale;
  }

  return {
    id: item.id,
    category,
    source: 'doctor',
    title: item.name,
    description,
    priority: (item.priority as RecommendationPriority) || 'medium',
    status: item.status === 'added_to_library' ? 'completed' : (item.status as RecommendationStatus) || 'pending',
    actionable: item.status === 'pending' && item.action_type === 'supplement',
    action: item.status === 'pending' && item.action_type === 'supplement' 
      ? { type: 'add_to_stack', payload: item }
      : undefined,
    metadata: {
      doctorName: item.doctor_name || undefined,
      prescriptionDate: item.prescription_date || undefined,
      rationale: item.rationale || undefined,
      dosage: item.dosage || undefined,
      schedule: item.schedule || undefined,
      duration: item.duration || undefined,
      protocolTag: item.protocol_tag || undefined,
      confidence: item.confidence_score || undefined,
      originalItem: item,
    },
    createdAt: item.created_at,
  };
}

function generateSleepRecommendations(sleepData: { date: string; value: number }[] | undefined): UnifiedRecommendation[] {
  if (!sleepData || sleepData.length < 3) return [];
  
  const recommendations: UnifiedRecommendation[] = [];
  const recentData = sleepData.slice(-3);
  const avgRecovery = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
  
  // Low recovery recommendation
  if (avgRecovery < 60) {
    recommendations.push({
      id: 'sleep-recovery-low',
      category: 'sleep',
      source: 'device',
      title: 'Увеличьте время сна',
      description: `Recovery ${Math.round(avgRecovery)}% за последние 3 дня. Рекомендуем добавить 30-60 минут сна.`,
      priority: avgRecovery < 40 ? 'high' : 'medium',
      status: 'pending',
      actionable: false,
      metadata: {
        deviceSource: 'whoop',
        confidence: 0.85,
      },
      createdAt: new Date().toISOString(),
    });
  }
  
  // Check for declining trend
  if (recentData.length >= 3) {
    const isDecreasing = recentData[0].value > recentData[1].value && recentData[1].value > recentData[2].value;
    if (isDecreasing && recentData[2].value < 70) {
      recommendations.push({
        id: 'sleep-trend-declining',
        category: 'sleep',
        source: 'ai',
        title: 'Проверьте качество сна',
        description: 'Тренд показывает снижение recovery. Рекомендуем проверить режим сна и уровень стресса.',
        priority: 'medium',
        status: 'pending',
        actionable: false,
        metadata: {
          confidence: 0.75,
        },
        createdAt: new Date().toISOString(),
      });
    }
  }
  
  return recommendations;
}

export function useAllRecommendations() {
  const { user } = useAuth();
  const { data: doctorItems, isLoading: isDoctorLoading } = useDoctorActionItems();
  const { data: sleepData, isLoading: isSleepLoading } = useUserWeeklySleep(user?.id);
  
  const allRecommendations = useMemo(() => {
    const recommendations: UnifiedRecommendation[] = [];
    
    // Convert doctor action items
    if (doctorItems) {
      const doctorRecommendations = doctorItems.map(mapDoctorItemToRecommendation);
      recommendations.push(...doctorRecommendations);
    }
    
    // Generate sleep recommendations from device data
    const sleepRecommendations = generateSleepRecommendations(sleepData || undefined);
    recommendations.push(...sleepRecommendations);
    
    // Sort by priority and date
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [doctorItems, sleepData]);
  
  const groupedByCategory = useMemo(() => {
    const groups: Record<RecommendationCategory, UnifiedRecommendation[]> = {
      sleep: [],
      exercise: [],
      supplement: [],
      checkup: [],
      lifestyle: [],
      nutrition: [],
    };
    
    allRecommendations.forEach(rec => {
      groups[rec.category].push(rec);
    });
    
    return groups;
  }, [allRecommendations]);
  
  const stats = useMemo(() => {
    const pending = allRecommendations.filter(r => r.status === 'pending').length;
    const active = allRecommendations.filter(r => r.status === 'active').length;
    const completed = allRecommendations.filter(r => r.status === 'completed').length;
    const highPriority = allRecommendations.filter(r => r.priority === 'high' && r.status === 'pending').length;
    
    return { pending, active, completed, highPriority, total: allRecommendations.length };
  }, [allRecommendations]);
  
  return {
    recommendations: allRecommendations,
    groupedByCategory,
    stats,
    isLoading: isDoctorLoading || isSleepLoading,
  };
}
