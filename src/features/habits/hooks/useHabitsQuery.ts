/**
 * Hook for fetching habits list using the service layer
 */

import { useQuery } from '@tanstack/react-query';
import { fetchHabits, type HabitDTO } from '@/services/habits.service';

export const habitQueryKeys = {
  all: ['habits'] as const,
  list: (date: string) => ['habits', 'list', date] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
};

interface UseHabitsQueryOptions {
  date?: string;
  enabled?: boolean;
}

export function useHabitsQuery(options: UseHabitsQueryOptions = {}) {
  const { date = new Date().toISOString().split('T')[0], enabled = true } = options;

  return useQuery<HabitDTO[], Error>({
    queryKey: habitQueryKeys.list(date),
    queryFn: () => fetchHabits(date),
    enabled,
    staleTime: 5000,
  });
}
