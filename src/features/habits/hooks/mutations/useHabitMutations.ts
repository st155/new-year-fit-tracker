/**
 * Hook for habit CRUD mutations using the service layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createHabit,
  updateHabitStatus,
  deleteHabit,
  type CreateHabitDTO,
  type HabitDTO,
} from '@/services/habits.service';
import { habitKeys } from '../keys';

export function useHabitMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateHabits = () => {
    queryClient.invalidateQueries({ queryKey: habitKeys.all });
  };

  // Create habit mutation
  const create = useMutation<HabitDTO, Error, CreateHabitDTO>({
    mutationFn: createHabit,
    onSuccess: (habit) => {
      invalidateHabits();
      toast({
        title: 'Привычка создана',
        description: `"${habit.name}" добавлена в список`,
      });
    },
    onError: (error) => {
      console.error('[useHabitMutations] Create error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать привычку',
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const updateStatus = useMutation<
    void,
    Error,
    { id: string; status: 'completed' | 'uncompleted'; date: string }
  >({
    mutationFn: ({ id, status, date }) => updateHabitStatus(id, status, date),
    onSuccess: () => {
      invalidateHabits();
    },
    onError: (error) => {
      console.error('[useHabitMutations] Status update error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive',
      });
    },
  });

  // Delete habit mutation
  const remove = useMutation<void, Error, string>({
    mutationFn: deleteHabit,
    onSuccess: () => {
      invalidateHabits();
      toast({
        title: 'Привычка удалена',
        description: 'Привычка и все связанные данные удалены',
      });
    },
    onError: (error) => {
      console.error('[useHabitMutations] Delete error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить привычку',
        variant: 'destructive',
      });
    },
  });

  return {
    create,
    updateStatus,
    remove,
    isCreating: create.isPending,
    isUpdating: updateStatus.isPending,
    isDeleting: remove.isPending,
  };
}
