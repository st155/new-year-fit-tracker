/**
 * Centralized Query Keys for React Query
 * 
 * Benefits:
 * - Type-safe query key management
 * - Easy invalidation
 * - Consistent naming
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: (userId: string) => [...queryKeys.auth.all, userId] as const,
    profile: (userId: string) => [...queryKeys.auth.all, 'profile', userId] as const,
  },
  
  metrics: {
    all: ['metrics'] as const,
    unified: (userId: string) => [...queryKeys.metrics.all, 'unified', userId] as const,
    latest: (userId: string, types: string[]) => [...queryKeys.metrics.unified(userId), 'latest', types] as const,
    history: (userId: string, filters: any) => [...queryKeys.metrics.unified(userId), 'history', filters] as const,
  },
  
  body: {
    all: ['body'] as const,
    composition: (userId: string) => [...queryKeys.body.all, 'composition', userId] as const,
    inbody: (userId: string) => [...queryKeys.body.all, 'inbody', userId] as const,
  },
  
  goals: {
    all: ['goals'] as const,
    list: (userId: string) => [...queryKeys.goals.all, userId] as const,
    challenge: (userId: string) => [...queryKeys.goals.list(userId), 'challenge'] as const,
    personal: (userId: string) => [...queryKeys.goals.list(userId), 'personal'] as const,
  },
  
  challenges: {
    all: ['challenges'] as const,
    active: (userId: string) => [...queryKeys.challenges.all, 'active', userId] as const,
    detail: (challengeId: string) => [...queryKeys.challenges.all, challengeId] as const,
    participants: (challengeId: string) => [...queryKeys.challenges.detail(challengeId), 'participants'] as const,
  },
  
  activities: {
    all: ['activities'] as const,
    feed: (userId: string, filter?: string) => [...queryKeys.activities.all, 'feed', userId, filter] as const,
  },
  
  habits: {
    all: ['habits'] as const,
    list: (userId: string) => [...queryKeys.habits.all, userId] as const,
    attempts: (habitId: string) => [...queryKeys.habits.all, 'attempts', habitId] as const,
  },
  
  trainer: {
    all: ['trainer'] as const,
    clients: (trainerId: string) => [...queryKeys.trainer.all, 'clients', trainerId] as const,
    clientDetail: (clientId: string) => [...queryKeys.trainer.all, 'client', clientId] as const,
  },
  
  widgets: {
    all: ['widgets'] as const,
    list: (userId: string) => [...queryKeys.widgets.all, userId] as const,
    batch: (userId: string, widgetIds: string[]) => [...queryKeys.widgets.list(userId), 'batch', widgetIds] as const,
  },
  
  leaderboard: {
    all: ['leaderboard'] as const,
    global: () => [...queryKeys.leaderboard.all, 'global'] as const,
  },
};

/**
 * Helper to invalidate all queries for a specific domain
 */
export function invalidateQueryDomain(queryClient: any, domain: keyof typeof queryKeys) {
  return queryClient.invalidateQueries({ queryKey: queryKeys[domain].all });
}
