/**
 * Inventory Mutation Hooks
 * 
 * React Query mutations for inventory operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/biostack.service';
import { biostackQueryKeys } from '../../constants/query-keys';
import { toast } from 'sonner';
import type { AddToInventoryInput, UpdateInventoryInput } from '../../types';

/**
 * Add to inventory
 */
export function useAddToInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: AddToInventoryInput) =>
      inventoryService.addToInventory(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success('Added to inventory');
    },
    onError: (error) => {
      console.error('Error adding to inventory:', error);
      toast.error('Failed to add to inventory');
    },
  });
}

/**
 * Update inventory item
 */
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateInventoryInput) =>
      inventoryService.updateInventory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success('Inventory updated');
    },
    onError: (error) => {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
    },
  });
}

/**
 * Remove from inventory
 */
export function useRemoveFromInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      inventoryService.removeFromInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: biostackQueryKeys.inventory.all });
      toast.success('Removed from inventory');
    },
    onError: (error) => {
      console.error('Error removing from inventory:', error);
      toast.error('Failed to remove from inventory');
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
