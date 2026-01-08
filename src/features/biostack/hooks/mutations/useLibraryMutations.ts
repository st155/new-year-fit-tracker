/**
 * Library Mutation Hooks
 * 
 * React Query mutations for library operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { libraryService } from '@/services/biostack.service';
import { biostackQueryKeys } from '../../constants/query-keys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { UpdateLibraryEntryInput } from '../../types';

/**
 * Add product to library
 */
export function useAddToLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (productId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return libraryService.addToLibrary(user.id, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
    },
    onError: (error) => {
      console.error('Error adding to library:', error);
      toast.error(t('toast.failedAddToLibrary'));
    },
  });
}

/**
 * Update library entry
 */
export function useUpdateLibraryEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (input: UpdateLibraryEntryInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      return libraryService.updateLibraryEntry(user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
      toast.success(t('toast.libraryEntryUpdated'));
    },
    onError: (error) => {
      console.error('Error updating library entry:', error);
      toast.error(t('toast.failedUpdateLibrary'));
    },
  });
}

/**
 * Remove from library
 */
export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (productId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return libraryService.removeFromLibrary(user.id, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
      toast.success(t('toast.removedFromLibrary'));
    },
    onError: (error) => {
      console.error('Error removing from library:', error);
      toast.error(t('toast.failedRemoveFromLibrary'));
    },
  });
}

/**
 * Combined mutations hook
 */
export function useLibraryMutations() {
  return {
    addToLibrary: useAddToLibrary(),
    updateEntry: useUpdateLibraryEntry(),
    removeFromLibrary: useRemoveFromLibrary(),
  };
}
