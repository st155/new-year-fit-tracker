/**
 * Smart Insight Prioritizer
 */

import type { SmartInsight } from './types';

/**
 * Prioritize insights based on:
 * 1. Type priority (critical > warning > achievement > recommendation > info)
 * 2. Custom priority score
 * 3. Freshness (newer = higher priority)
 */
export function prioritizeInsights(insights: SmartInsight[]): SmartInsight[] {
  // Type weights
  const typeWeights: Record<string, number> = {
    critical: 100,
    warning: 80,
    achievement: 60,
    recommendation: 40,
    info: 20,
  };

  // Calculate final priority score
  const scored = insights.map(insight => {
    const typeWeight = typeWeights[insight.type] || 0;
    const freshness = Math.max(0, 10 - (Date.now() - insight.timestamp.getTime()) / (1000 * 60 * 60)); // Decay over hours
    const finalScore = insight.priority + typeWeight + freshness;

    return {
      insight,
      score: finalScore,
    };
  });

  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);

  // Return top insights
  return scored.map(s => s.insight);
}

/**
 * Deduplicate similar insights
 * Keep only the highest priority insight from each source
 */
export function deduplicateInsights(insights: SmartInsight[]): SmartInsight[] {
  const seen = new Map<string, SmartInsight>();

  insights.forEach(insight => {
    const key = `${insight.source}-${insight.type}`;
    const existing = seen.get(key);

    if (!existing || insight.priority > existing.priority) {
      seen.set(key, insight);
    }
  });

  return Array.from(seen.values());
}

/**
 * Filter insights by minimum priority
 */
export function filterByPriority(insights: SmartInsight[], minPriority: number): SmartInsight[] {
  return insights.filter(i => i.priority >= minPriority);
}

/**
 * Limit number of insights to display
 */
export function limitInsights(insights: SmartInsight[], maxCount: number): SmartInsight[] {
  return insights.slice(0, maxCount);
}
