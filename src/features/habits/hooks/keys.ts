/**
 * Query keys for habits feature
 */

export const habitKeys = {
  all: ['habits'] as const,
  lists: () => [...habitKeys.all, 'list'] as const,
  list: (date: string) => [...habitKeys.lists(), date] as const,
  detail: (id: string) => [...habitKeys.all, 'detail', id] as const,
  progress: (id: string, start: string, end: string) => 
    [...habitKeys.all, 'progress', id, start, end] as const,
  attempts: (id: string) => [...habitKeys.all, 'attempts', id] as const,
  completions: (userId: string, days: number) => 
    [...habitKeys.all, 'completions', userId, days] as const,
  measurements: (id: string) => [...habitKeys.all, 'measurements', id] as const,
  streakHistory: (userId: string) => [...habitKeys.all, 'streak-history', userId] as const,
  xpHistory: (userId: string, days: number) => 
    [...habitKeys.all, 'xp-history', userId, days] as const,
};
