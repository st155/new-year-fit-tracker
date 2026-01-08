/**
 * Inventory Mutation Hooks
 * 
 * React Query mutations for inventory operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/biostack.service';
import { biostackQueryKeys } from '../../constants/query-keys';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { AddToInventoryInput, UpdateInventoryInput } from '../../types';

/**
 * Add to inventory
 */
export function useAddToInventory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (item: AddToInventoryInput) =>
      inventoryService.addToInventory(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success(t('toast.addedToInventory'));
    },
    onError: (error) => {
      console.error('Error adding to inventory:', error);
      toast.error(t('toast.failedAddToInventory'));
    },
  });
}

/**
 * Update inventory item
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (input: UpdateInventoryInput) =>
      inventoryService.updateInventory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success(t('toast.inventoryUpdated'));
    },
    onError: (error) => {
      console.error('Error updating inventory:', error);
      toast.error(t('toast.failedUpdateInventory'));
    },
  });
}

/**
 * Remove from inventory
 */
export function useRemoveFromInventory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('biostack');

  return useMutation({
    mutationFn: (id: string) =>
      inventoryService.removeFromInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success(t('toast.removedFromInventory'));
    },
    onError: (error) => {
      console.error('Error removing from inventory:', error);
      toast.error(t('toast.failedRemoveFromInventory'));
    },
  });
}

/**
 * Combined mutations hook
 */
export function useInventoryMutations() {
  return {
    addToInventory: useAddToInventory(),
    updateInventory: useUpdateInventory(),
    removeFromInventory: useRemoveFromInventory(),
  };
}
