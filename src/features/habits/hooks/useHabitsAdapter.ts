/**
 * Adapter for legacy useHabits API
 * 
 * Maps the new useHabitsQuery response to the old useHabits format
 * for easier migration.
 * 
 * @deprecated This is a temporary adapter. Migrate to useHabitsQuery directly.
 */

import { useMemo } from 'react';
import { useHabitsQuery } from './useHabitsQuery';

interface LegacyHabitsResult {
  habits: any[];
  activeHabits: any[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Adapter hook that provides the legacy useHabits interface
 * using the new useHabitsQuery hook underneath.
 * 
 * @param userId - User ID (for backward compatibility, not used internally)
 * @deprecated Migrate to useHabitsQuery directly
 */
export function useHabitsAdapter(userId?: string): LegacyHabitsResult {
  const { data, isLoading, error, refetch } = useHabitsQuery({ 
    enabled: !!userId 
  });
  
  const habits = useMemo(() => data ?? [], [data]);
  const activeHabits = useMemo(() => 
    habits.filter((h: any) => h.isActive !== false), 
    [habits]
  );
  
  return {
    habits,
    activeHabits,
    isLoading,
    error,
    refetch,
  };
}
