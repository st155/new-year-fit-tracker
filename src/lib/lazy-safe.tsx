import { ComponentType, lazy } from "react";

/**
 * Feature flag to disable lazy loading on dev/preview environments
 * This helps avoid "Failed to fetch dynamically imported module" errors
 */
export const DISABLE_LAZY = 
  location.hostname.endsWith('.lovableproject.com') || 
  location.hostname === 'localhost';

/**
 * Safe lazy wrapper that bypasses React.lazy on dev/preview environments
 * @param syncComp - The synchronously imported component (fallback)
 * @param loader - The lazy loader function (used when DISABLE_LAZY is false)
 */
export function lazySafe<T extends ComponentType<any>>(
  syncComp: T,
  loader: () => Promise<{ default: T }>
): T {
  return (DISABLE_LAZY ? syncComp : lazy(loader)) as T;
}
