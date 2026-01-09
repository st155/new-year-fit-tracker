// Centralized metric aliases for cross-source matching
// Note: keep names exactly as they appear in client_unified_metrics.metric_name
export const METRIC_ALIASES: Record<string, string[]> = {
  'Resting HR': ['Resting Heart Rate'],
  'Resting Heart Rate': ['Resting HR'],
  'Workout Calories': ['Active Calories'],
  'Active Calories': ['Workout Calories'],
  // Day Strain and Activity Score are related activity metrics from different providers
  // Day Strain (WHOOP) ↔ Activity Score (Oura/Ultrahuman)
  'Day Strain': ['Strain', 'Activity Score'],
  'Strain': ['Day Strain', 'Activity Score'],
  'Activity Score': ['Day Strain', 'Strain'],
  'Recovery Score': ['Recovery', 'RecoveryScore'],
  'Recovery': ['Recovery Score', 'RecoveryScore'],
  'RecoveryScore': ['Recovery Score', 'Recovery'],
  'Max Heart Rate': ['HR Max', 'Max HR', 'Heart Rate Max', 'Maximum Heart Rate'],
  'HR Max': ['Max Heart Rate', 'Max HR', 'Heart Rate Max'],
  'Max HR': ['Max Heart Rate', 'HR Max', 'Heart Rate Max'],
  'Heart Rate Max': ['Max Heart Rate', 'Max HR', 'HR Max'],
  'Maximum Heart Rate': ['Max Heart Rate', 'Max HR', 'HR Max'],
};

// Helper to get all acceptable names for a metric including itself
export const getAliasSet = (metricName: string): Set<string> => {
  const set = new Set<string>();
  set.add(metricName);
  const aliases = METRIC_ALIASES[metricName];
  if (aliases) aliases.forEach(a => set.add(a));
  return set;
};

