import { ComponentType, lazy } from "react";
import { DISABLE_LAZY } from "./safe-flags";

/**
 * Feature flag to disable lazy loading on dev/preview environments
 * Now managed centrally via safe-flags.ts
 */

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
