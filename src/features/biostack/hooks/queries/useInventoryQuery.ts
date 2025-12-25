/**
 * Inventory Query Hooks
 * 
 * React Query hooks for fetching inventory data
 */

import { useQuery } from '@tanstack/react-query';
import { biostackQueryKeys } from '../../constants/query-keys';
import { inventoryService } from '@/services/biostack.service';
import type { InventoryItemDTO, BiostackQueryOptions } from '../../types';

/**
 * Fetch user inventory
 */
export function useInventoryQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.inventory.list(userId || ''),
    queryFn: () => inventoryService.fetchInventory(userId!),
    enabled: !!userId && (options?.enabled !== false),
  });
}

/**
 * Fetch low stock alerts
 */
export function useLowStockAlertsQuery(
  userId: string | undefined,
  options?: BiostackQueryOptions
) {
  return useQuery({
    queryKey: biostackQueryKeys.inventory.lowStock(userId || ''),
    queryFn: () => inventoryService.fetchLowStockAlerts(userId!),
    enabled: !!userId && (options?.enabled !== false),
  });
}

/**
 * Combined hook for inventory data (matches legacy useSupplementInventory)
 */
export function useSupplementInventoryQuery(userId: string | undefined) {
  const inventoryQuery = useInventoryQuery(userId);
  const lowStockQuery = useLowStockAlertsQuery(userId);

  return {
    inventory: inventoryQuery.data,
    lowStockAlerts: lowStockQuery.data,
    isLoading: inventoryQuery.isLoading,
  };
}
