/**
 * Toast Notification Utilities
 * Standardized toast messages using sonner
 */

import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { createElement } from 'react';

// ============= TOAST CONFIGURATIONS =============

const DEFAULT_DURATION = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 4000,
  loading: Infinity,
} as const;

// ============= SUCCESS TOASTS =============

export const showSuccessToast = (
  message: string, 
  description?: string,
  duration?: number
) => {
  return toast.success(message, {
    description,
    duration: duration ?? DEFAULT_DURATION.success,
    icon: createElement(CheckCircle, { className: 'h-5 w-5' }),
  });
};

// ============= ERROR TOASTS =============

export const showErrorToast = (
  message: string, 
  details?: string,
  duration?: number
) => {
  return toast.error(message, {
    description: details,
    duration: duration ?? DEFAULT_DURATION.error,
    icon: createElement(AlertCircle, { className: 'h-5 w-5' }),
  });
};

// ============= INFO TOASTS =============

export const showInfoToast = (
  message: string, 
  description?: string,
  duration?: number
) => {
  return toast.info(message, {
    description,
    duration: duration ?? DEFAULT_DURATION.info,
    icon: createElement(Info, { className: 'h-5 w-5' }),
  });
};

// ============= WARNING TOASTS =============

export const showWarningToast = (
  message: string, 
  description?: string,
  duration?: number
) => {
  return toast.warning(message, {
    description,
    duration: duration ?? DEFAULT_DURATION.warning,
    icon: createElement(AlertTriangle, { className: 'h-5 w-5' }),
  });
};

// ============= LOADING TOASTS =============

export const showLoadingToast = (message: string, description?: string) => {
  return toast.loading(message, {
    description,
  });
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};

// ============= PROMISE TOASTS =============

export const showPromiseToast = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

// ============= CUSTOM TOASTS =============

export const showCustomToast = (
  message: string,
  options?: {
    description?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }
) => {
  return toast(message, {
    description: options?.description,
    duration: options?.duration ?? DEFAULT_DURATION.info,
    action: options?.action,
  });
};
