/**
 * Logs Mutation Hooks
 * 
 * React Query mutations for intake logging operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logsService } from '@/services/biostack.service';
import { biostackQueryKeys } from '../../constants/query-keys';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Mark supplement log as taken
 */
export function useMarkAsTaken() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (logId: string) =>
      logsService.markAsTaken(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.today.all });
      toast.success(t('toast.markedAsTaken'));
    },
    onError: (error) => {
      console.error('Error marking as taken:', error);
      toast.error(t('toast.failedMarkAsTaken'));
    },
  });
}

/**
 * Add note to log
 */
export function useAddLogNote() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: ({ logId, note }: { logId: string; note: string }) =>
      logsService.addNote(logId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.logs.all });
      toast.success(t('toast.noteAdded'));
    },
    onError: (error) => {
      console.error('Error adding note:', error);
      toast.error(t('toast.failedAddNote'));
    },
  });
}

/**
 * Log intake for stack item
 */
export function useLogIntakeForStackItem() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: ({
      userId,
      stackItemId,
      intakeTime,
      intakeDate,
    }: {
      userId: string;
      stackItemId: string;
      intakeTime: string;
      intakeDate: string;
    }) => logsService.logIntakeForStackItem(userId, stackItemId, intakeTime, intakeDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.today.all });
      toast.success(t('toast.intakeLogged'));
    },
    onError: (error) => {
      console.error('Error logging intake:', error);
      toast.error(t('toast.failedLogIntake'));
    },
  });
}

/**
 * Cancel intake log
 */
export function useCancelIntakeLog() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (logId: string) =>
      logsService.cancelIntakeLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.logs.all });
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.today.all });
      toast.success(t('toast.intakeCancelled'));
    },
    onError: (error) => {
      console.error('Error cancelling intake:', error);
      toast.error(t('toast.failedCancelIntake'));
    },
  });
}

/**
 * Combined mutations hook
 */
export function useLogsMutations() {
  return {
    markAsTaken: useMarkAsTaken(),
    addNote: useAddLogNote(),
    logIntake: useLogIntakeForStackItem(),
    cancelIntake: useCancelIntakeLog(),
  };
}
