import { UnifiedRecommendation, RecommendationCategory, RecommendationPriority } from '@/hooks/useAllRecommendations';

export interface MergedRecommendation extends UnifiedRecommendation {
  mergedId: string;
  mergedFrom: string[];
  sources: Array<{
    id: string;
    doctorName?: string;
    prescriptionDate?: string;
    protocolTag?: string;
  }>;
  mergeCount: number;
}

/**
 * Normalize a title for comparison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яёіїєґ0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '');
}

/**
 * Check if two recommendations are similar enough to merge
 */
function areRecommendationsSimilar(a: UnifiedRecommendation, b: UnifiedRecommendation): boolean {
  const normalizedA = normalizeTitle(a.title);
  const normalizedB = normalizeTitle(b.title);
  
  // Must be same category
  if (a.category !== b.category) return false;
  
  // Exact match after normalization
  if (normalizedA === normalizedB) return true;
  
  // Check if one contains the other (for cases like "Vitamin D" vs "Vitamin D3")
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    // Only if the shorter one is at least 4 characters
    const shorter = normalizedA.length < normalizedB.length ? normalizedA : normalizedB;
    if (shorter.length >= 4) return true;
  }
  
  return false;
}

/**
 * Get the highest priority from a list
 */
function getHighestPriority(priorities: RecommendationPriority[]): RecommendationPriority {
  if (priorities.includes('high')) return 'high';
  if (priorities.includes('medium')) return 'medium';
  return 'low';
}

/**
 * Merge similar recommendations into groups
 */
export function mergeRecommendations(recommendations: UnifiedRecommendation[]): MergedRecommendation[] {
  const groups: Map<string, UnifiedRecommendation[]> = new Map();
  
  // Group similar recommendations
  for (const rec of recommendations) {
    let foundGroup = false;
    
    for (const [key, group] of groups) {
      if (areRecommendationsSimilar(rec, group[0])) {
        group.push(rec);
        foundGroup = true;
        break;
      }
    }
    
    if (!foundGroup) {
      // Create new group with normalized key
      const key = `${rec.category}_${normalizeTitle(rec.title)}_${Date.now()}_${Math.random()}`;
      groups.set(key, [rec]);
    }
  }
  
  // Convert groups to merged recommendations
  const merged: MergedRecommendation[] = [];
  
  for (const group of groups.values()) {
    if (group.length === 1) {
      // Single item, no merge needed
      merged.push({
        ...group[0],
        mergedId: group[0].id,
        mergedFrom: [group[0].id],
        sources: [{
          id: group[0].id,
          doctorName: group[0].metadata.doctorName,
          prescriptionDate: group[0].metadata.prescriptionDate,
          protocolTag: group[0].metadata.protocolTag,
        }],
        mergeCount: 1,
      });
    } else {
      // Multiple items, merge them
      const primary = group[0]; // Use first as primary
      const allPriorities = group.map(r => r.priority);
      const highestPriority = getHighestPriority(allPriorities);
      
      // Check if any is actionable
      const anyActionable = group.some(r => r.actionable);
      const anyPending = group.some(r => r.status === 'pending');
      
      // Collect all sources
      const sources = group.map(r => ({
        id: r.id,
        doctorName: r.metadata.doctorName,
        prescriptionDate: r.metadata.prescriptionDate,
        protocolTag: r.metadata.protocolTag,
      }));
      
      // Sort by prescription date (newest first)
      sources.sort((a, b) => {
        if (!a.prescriptionDate) return 1;
        if (!b.prescriptionDate) return -1;
        return new Date(b.prescriptionDate).getTime() - new Date(a.prescriptionDate).getTime();
      });
      
      // Combine descriptions if different
      const descriptions = [...new Set(group.map(r => r.description).filter(Boolean))];
      const combinedDescription = descriptions.length > 1 
        ? descriptions[0] // Use first description
        : (descriptions[0] || '');
      
      // Combine dosages
      const dosages = [...new Set(group.map(r => r.metadata.dosage).filter(Boolean))];
      
      // Create unique mergedId from sorted IDs
      const mergedId = `merged_${group.map(r => r.id).sort().join('_')}`;
      
      merged.push({
        ...primary,
        id: primary.id, // Keep primary ID for actions
        mergedId,
        priority: highestPriority,
        status: anyPending ? 'pending' : primary.status,
        actionable: anyActionable,
        description: combinedDescription,
        metadata: {
          ...primary.metadata,
          dosage: dosages.length > 0 ? dosages.join(' / ') : undefined,
        },
        mergedFrom: group.map(r => r.id),
        sources,
        mergeCount: group.length,
      });
    }
  }
  
  return merged;
}
