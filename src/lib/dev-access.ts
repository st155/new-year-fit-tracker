/**
 * Centralized access control for developer tools
 * Prevents hardcoding email checks throughout the codebase
 */

import { FORCE_CLIENT_ROLE } from './safe-flags';

// Emails allowed to access dev tools in production
const ALLOWED_DEV_EMAILS = [
  'st@roosh.vc',
];

/**
 * Check if a user can access developer tools
 * Access is granted if:
 * - Running in DEV mode (import.meta.env.DEV)
 * - Running in preview/iframe (FORCE_CLIENT_ROLE)
 * - User email is in the allowed list
 */
export function canAccessDevTools(userEmail?: string | null): boolean {
  // Always allow in development mode
  if (import.meta.env.DEV) return true;
  
  // Allow in preview/iframe environments
  if (FORCE_CLIENT_ROLE) return true;
  
  // Check if user email is in allowed list
  if (userEmail && ALLOWED_DEV_EMAILS.includes(userEmail)) return true;
  
  return false;
}

/**
 * Hook-friendly version that accepts user object
 */
export function canAccessDevToolsForUser(user?: { email?: string } | null): boolean {
  return canAccessDevTools(user?.email);
}
