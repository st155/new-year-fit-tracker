// Centralized metric aliases for cross-source matching
// Note: keep names exactly as they appear in client_unified_metrics.metric_name
export const METRIC_ALIASES: Record<string, string[]> = {
  'Resting HR': ['Resting Heart Rate'],
  'Resting Heart Rate': ['Resting HR'],
  'Workout Calories': ['Active Calories'],
  'Active Calories': ['Workout Calories'],
  'Workout Strain': ['Day Strain'],
  'Day Strain': ['Workout Strain'],
};

// Helper to get all acceptable names for a metric including itself
export const getAliasSet = (metricName: string): Set<string> => {
  const set = new Set<string>();
  set.add(metricName);
  const aliases = METRIC_ALIASES[metricName];
  if (aliases) aliases.forEach(a => set.add(a));
  return set;
};

