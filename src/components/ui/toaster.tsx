/**
 * Legacy Toaster Component
 * 
 * This component is kept for backward compatibility but is now 
 * a no-op since we use Sonner for all toasts.
 * 
 * The Sonner <Toaster /> is already included in App.tsx.
 * This file can be removed once all legacy toast usage is migrated.
 */

export function Toaster() {
  // Sonner handles all toasts now via the Toaster component in App.tsx
  // This is a no-op component for backward compatibility
  return null;
}
