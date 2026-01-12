import type { SyncIssue, NamespaceStats, AnalysisReport } from '../types';

// Plural suffixes used by i18next - differences between RU and EN are expected
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

// Check if a key difference is just a plural form mismatch (expected behavior)
function isPluralKeyMismatch(key: string): boolean {
  return PLURAL_SUFFIXES.some(suffix => key.endsWith(suffix));
}

// List of known namespaces (auto-discovered from public/locales/ru/)
const NAMESPACES = [
  'activity',
  'admin',
  'auth',
  'biomarkerDetail',
  'biomarkers',
  'biostack',
  'body',
  'bodyComposition',
  'categoryDetail',
  'challengeDetail',
  'challenges',
  'common',
  'dashboard',
  'dashboardPage',
  'errors',
  'feed',
  'fitnessData',
  'gamification',
  'goalDetail',
  'goals',
  'habitDetail',
  'habitTeamDetail',
  'habitTeams',
  'habits',
  'health',
  'healthScore',
  'home',
  'insights',
  'integrations',
  'landing',
  'landingAI',
  'leaderboard',
  'loader',
  'medical',
  'medicalDocs',
  'metricDetail',
  'mobileGoals',
  'navigation',
  'notFound',
  'notifications',
  'privacy',
  'profile',
  'progress',
  'recommendations',
  'shortcuts',
  'statsGrid',
  'supplements',
  'terraDiagnostics',
  'testing',
  'trainer',
  'trainerDashboard',
  'trainerHealth',
  'trainerTest',
  'trainingPlan',
  'units',
  'wellness',
  'widgets',
  'workoutDetail',
  'workouts',
];

function flattenObject(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenObject(value as Record<string, unknown>, newKey));
    } else {
      keys.push(newKey);
    }
  }
  
  return keys;
}

async function loadNamespaceFiles(namespace: string): Promise<{
  en: Record<string, unknown> | null;
  ru: Record<string, unknown> | null;
}> {
  const results = { en: null as Record<string, unknown> | null, ru: null as Record<string, unknown> | null };
  
  try {
    const enResponse = await fetch(`/locales/en/${namespace}.json`);
    if (enResponse.ok) {
      results.en = await enResponse.json();
    }
  } catch {
    // File doesn't exist
  }
  
  try {
    const ruResponse = await fetch(`/locales/ru/${namespace}.json`);
    if (ruResponse.ok) {
      results.ru = await ruResponse.json();
    }
  } catch {
    // File doesn't exist
  }
  
  return results;
}

export async function analyzeLocales(): Promise<AnalysisReport> {
  const syncIssues: SyncIssue[] = [];
  const namespaceStats: NamespaceStats[] = [];
  let totalKeysRu = 0;
  let totalKeysEn = 0;
  let totalNamespaces = 0;

  for (const namespace of NAMESPACES) {
    const { en, ru } = await loadNamespaceFiles(namespace);
    
    if (!en && !ru) continue;
    
    totalNamespaces++;
    
    const enKeys = en ? new Set(flattenObject(en)) : new Set<string>();
    const ruKeys = ru ? new Set(flattenObject(ru)) : new Set<string>();
    
    totalKeysEn += enKeys.size;
    totalKeysRu += ruKeys.size;
    
    // Find keys missing in EN (ignore plural form differences)
    for (const key of ruKeys) {
      if (!enKeys.has(key) && !isPluralKeyMismatch(key)) {
        syncIssues.push({ namespace, key, missingIn: 'en' });
      }
    }
    
    // Find keys missing in RU (ignore plural form differences)
    for (const key of enKeys) {
      if (!ruKeys.has(key) && !isPluralKeyMismatch(key)) {
        syncIssues.push({ namespace, key, missingIn: 'ru' });
      }
    }
    
    namespaceStats.push({
      name: namespace,
      ruKeys: ruKeys.size,
      enKeys: enKeys.size,
      syncIssues: syncIssues.filter(i => i.namespace === namespace).length,
    });
  }

  return {
    syncIssues,
    stats: {
      totalNamespaces,
      totalKeysRu,
      totalKeysEn,
      namespaceStats,
    },
  };
}
