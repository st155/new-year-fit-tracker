/**
 * BioStack Query Keys
 * 
 * Consistent query key factory for React Query caching
 */

export const biostackQueryKeys = {
  // Root key
  all: ['biostack'] as const,

  // Protocols
  protocols: {
    all: ['biostack', 'protocols'] as const,
    active: (userId: string) => ['biostack', 'protocols', 'active', userId] as const,
    activeV2: (userId: string) => ['biostack', 'protocols', 'active-v2', userId] as const,
    history: (userId: string) => ['biostack', 'protocols', 'history', userId] as const,
    detail: (id: string) => ['biostack', 'protocols', 'detail', id] as const,
    management: (userId: string) => ['biostack', 'protocols', 'management', userId] as const,
  },

  // Library
  library: {
    all: ['biostack', 'library'] as const,
    list: (userId?: string) => userId 
      ? ['biostack', 'library', 'list', userId] as const
      : ['biostack', 'library', 'list'] as const,
    stats: (userId?: string) => userId
      ? ['biostack', 'library', 'stats', userId] as const
      : ['biostack', 'library', 'stats'] as const,
    detail: (productId: string) => ['biostack', 'library', 'detail', productId] as const,
  },

  // Inventory
  inventory: {
    all: ['biostack', 'inventory'] as const,
    list: (userId: string) => ['biostack', 'inventory', 'list', userId] as const,
    lowStock: (userId: string) => ['biostack', 'inventory', 'low-stock', userId] as const,
    detail: (itemId: string) => ['biostack', 'inventory', 'detail', itemId] as const,
  },

  // Today's Supplements
  today: {
    all: ['biostack', 'today'] as const,
    manual: (userId: string, date: string) => ['biostack', 'today', 'manual', userId, date] as const,
    protocol: (userId: string, date: string) => ['biostack', 'today', 'protocol', userId, date] as const,
    schedule: (userId: string, date: string) => ['biostack', 'today', 'schedule', userId, date] as const,
  },

  // Logs & Adherence
  logs: {
    all: ['biostack', 'logs'] as const,
    today: (userId: string, date: string) => ['biostack', 'logs', 'today', userId, date] as const,
    adherence: (userId: string) => ['biostack', 'logs', 'adherence', userId] as const,
    adherenceStats: (userId: string) => ['biostack', 'logs', 'adherence-stats', userId] as const,
  },

  // Correlations & Analytics
  analytics: {
    all: ['biostack', 'analytics'] as const,
    correlation: (stackItemId: string, months: number) => 
      ['biostack', 'analytics', 'correlation', stackItemId, months] as const,
    effectiveness: (stackItemId: string) => 
      ['biostack', 'analytics', 'effectiveness', stackItemId] as const,
    trends: (userId: string) => ['biostack', 'analytics', 'trends', userId] as const,
  },

  // Products search
  products: {
    all: ['biostack', 'products'] as const,
    search: (query: string) => ['biostack', 'products', 'search', query] as const,
    detail: (productId: string) => ['biostack', 'products', 'detail', productId] as const,
  },
} as const;

/**
 * Get all query keys that should be invalidated for a specific domain
 */
export function getBiostackInvalidationKeys(
  userId: string,
  domain?: 'protocols' | 'library' | 'inventory' | 'today' | 'logs'
) {
  const today = new Date().toISOString().split('T')[0];
  
  const allKeys = [
    biostackQueryKeys.protocols.active(userId),
    biostackQueryKeys.protocols.history(userId),
    biostackQueryKeys.protocols.management(userId),
    biostackQueryKeys.library.list(userId),
    biostackQueryKeys.library.stats(userId),
    biostackQueryKeys.inventory.list(userId),
    biostackQueryKeys.inventory.lowStock(userId),
    biostackQueryKeys.today.manual(userId, today),
    biostackQueryKeys.today.protocol(userId, today),
    biostackQueryKeys.logs.adherence(userId),
  ];

  if (!domain) return allKeys;

  switch (domain) {
    case 'protocols':
      return [
        biostackQueryKeys.protocols.active(userId),
        biostackQueryKeys.protocols.history(userId),
        biostackQueryKeys.protocols.management(userId),
        biostackQueryKeys.today.protocol(userId, today),
      ];
    case 'library':
      return [
        biostackQueryKeys.library.list(userId),
        biostackQueryKeys.library.stats(userId),
      ];
    case 'inventory':
      return [
        biostackQueryKeys.inventory.list(userId),
        biostackQueryKeys.inventory.lowStock(userId),
      ];
    case 'today':
      return [
        biostackQueryKeys.today.manual(userId, today),
        biostackQueryKeys.today.protocol(userId, today),
      ];
    case 'logs':
      return [
        biostackQueryKeys.logs.adherence(userId),
        biostackQueryKeys.logs.adherenceStats(userId),
      ];
    default:
      return allKeys;
  }
}
