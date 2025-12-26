/**
 * Hook for fetching habits list using the service layer
 */

import { useQuery } from '@tanstack/react-query';
import { fetchHabits, type HabitDTO } from '@/services/habits.service';
import { habitKeys } from '../keys';

export { habitKeys };

interface UseHabitsQueryOptions {
  date?: string;
  enabled?: boolean;
}

export function useHabitsQuery(options: UseHabitsQueryOptions = {}) {
  const { date = new Date().toISOString().split('T')[0], enabled = true } = options;

  return useQuery<HabitDTO[], Error>({
    queryKey: habitKeys.list(date),
    queryFn: () => fetchHabits(date),
    enabled,
    staleTime: 5000,
  });
}
