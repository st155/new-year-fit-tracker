/**
 * Toast Hook - Compatibility Layer
 * 
 * This is a compatibility shim that wraps sonner to provide 
 * the same API as the old useToast hook.
 * 
 * New code should use:
 * - import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
 * - import { toast } from 'sonner'
 * 
 * This file exists for backward compatibility with existing components
 * that use useToast / toast pattern.
 */

import * as React from "react";
import { toast as sonnerToast } from "sonner";

// Types for backward compatibility
type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
  duration?: number;
  action?: React.ReactElement;
};

type Toast = Omit<ToasterToast, "id">;

/**
 * @deprecated Use showSuccessToast, showErrorToast, etc. from '@/lib/toast-utils' instead
 */
function toast({ title, description, variant, duration, action }: Toast) {
  const id = Math.random().toString(36).slice(2);
  
  const options = {
    description: description as string,
    id,
    duration,
    action: action ? {
      label: (action as any)?.props?.children || 'Action',
      onClick: (action as any)?.props?.onClick || (() => {}),
    } : undefined,
  };
  
  if (variant === "destructive") {
    sonnerToast.error(title as string, options);
  } else if (variant === "success") {
    sonnerToast.success(title as string, options);
  } else {
    sonnerToast(title as string, options);
  }

  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
    update: (props: Partial<ToasterToast>) => {
      // Sonner doesn't support update, so we dismiss and show new
      sonnerToast.dismiss(id);
      toast({ ...props, title: props.title || title, description: props.description || description });
    },
  };
}

/**
 * @deprecated Use showSuccessToast, showErrorToast, etc. from '@/lib/toast-utils' instead
 */
function useToast() {
  const [toasts] = React.useState<ToasterToast[]>([]);

  return {
    toasts,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        sonnerToast.dismiss(toastId);
      } else {
        sonnerToast.dismiss();
      }
    },
  };
}

export { useToast, toast };
export type { ToasterToast, Toast };
