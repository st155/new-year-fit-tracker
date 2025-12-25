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
import type { UpdateLibraryEntryInput } from '../../types';

/**
 * Add product to library
 */
export function useAddToLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      toast.error('Failed to add to library');
    },
  });
}

/**
 * Update library entry
 */
export function useUpdateLibraryEntry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateLibraryEntryInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      return libraryService.updateLibraryEntry(user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
      toast.success('Library entry updated');
    },
    onError: (error) => {
      console.error('Error updating library entry:', error);
      toast.error('Failed to update library entry');
    },
  });
}

/**
 * Remove from library
 */
export function useRemoveFromLibrary() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (productId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return libraryService.removeFromLibrary(user.id, productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.library.all });
      toast.success('Removed from library');
    },
    onError: (error) => {
      console.error('Error removing from library:', error);
      toast.error('Failed to remove from library');
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
