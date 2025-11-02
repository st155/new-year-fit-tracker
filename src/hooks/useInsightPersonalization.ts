/**
 * Insight Personalization Hook
 * Manages user preferences for Smart Insights
 */

import { useState, useEffect } from 'react';
import type { InsightType } from '@/lib/insights/types';

export interface InsightPreferences {
  enabledTypes: InsightType[];
  priorityOverrides: Record<string, number>;
  mutedInsights: string[];
  refreshInterval: number; // seconds
}

const DEFAULT_PREFERENCES: InsightPreferences = {
  enabledTypes: [
    'critical',
    'warning',
    'achievement',
    'recommendation',
    'info',
    'correlation',
    'anomaly',
    'prediction',
    'social',
    'trainer',
    'temporal',
  ],
  priorityOverrides: {},
  mutedInsights: [],
  refreshInterval: 30,
};

const STORAGE_KEY = 'smart-insights-preferences';

export function useInsightPersonalization() {
  const [preferences, setPreferences] = useState<InsightPreferences>(DEFAULT_PREFERENCES);

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Failed to parse insight preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (newPreferences: Partial<InsightPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Toggle insight type
  const toggleType = (type: InsightType) => {
    const enabledTypes = preferences.enabledTypes.includes(type)
      ? preferences.enabledTypes.filter((t) => t !== type)
      : [...preferences.enabledTypes, type];
    savePreferences({ enabledTypes });
  };

  // Mute specific insight
  const muteInsight = (insightId: string) => {
    const mutedInsights = [...preferences.mutedInsights, insightId];
    savePreferences({ mutedInsights });
  };

  // Unmute insight
  const unmuteInsight = (insightId: string) => {
    const mutedInsights = preferences.mutedInsights.filter((id) => id !== insightId);
    savePreferences({ mutedInsights });
  };

  // Reset to defaults
  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Update refresh interval
  const updateRefreshInterval = (seconds: number) => {
    savePreferences({ refreshInterval: seconds });
  };

  return {
    preferences,
    savePreferences,
    toggleType,
    muteInsight,
    unmuteInsight,
    resetPreferences,
    updateRefreshInterval,
  };
}
