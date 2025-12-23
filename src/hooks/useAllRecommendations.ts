import { useMemo } from 'react';
import { useDoctorActionItems, DoctorActionItem } from '@/hooks/biostack/useDoctorActionItems';
import { useMetricsRecommendations } from '@/hooks/useMetricsRecommendations';
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

export function useAllRecommendations() {
  const { user } = useAuth();
  const { data: doctorItems, isLoading: isDoctorLoading } = useDoctorActionItems();
  const { data: metricsRecommendations, isLoading: isMetricsLoading } = useMetricsRecommendations(user?.id);
  
  const allRecommendations = useMemo(() => {
    const recommendations: UnifiedRecommendation[] = [];
    
    // Convert doctor action items
    if (doctorItems) {
      const doctorRecommendations = doctorItems.map(mapDoctorItemToRecommendation);
      recommendations.push(...doctorRecommendations);
    }
    
    // Add metrics-based recommendations from device data
    if (metricsRecommendations) {
      recommendations.push(...metricsRecommendations);
    }
    
    // Deduplicate by id
    const uniqueRecommendations = recommendations.reduce((acc, rec) => {
      if (!acc.find(r => r.id === rec.id)) {
        acc.push(rec);
      }
      return acc;
    }, [] as UnifiedRecommendation[]);
    
    // Sort by priority and date
    return uniqueRecommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [doctorItems, metricsRecommendations]);
  
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
    isLoading: isDoctorLoading || isMetricsLoading,
  };
}
