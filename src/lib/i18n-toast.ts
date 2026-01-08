/**
 * Internationalized toast utility
 * Wrapper around sonner that automatically translates messages
 * 
 * @example
 * import { i18nToast } from '@/lib/i18n-toast';
 * 
 * // Simple usage
 * i18nToast.success('common:success.saved');
 * 
 * // With interpolation
 * i18nToast.success('biostack:toast.addedCount', { count: 5 });
 * 
 * // With description
 * i18nToast.success('biostack:toast.synced', { 
 *   count: 10,
 *   description: 'biostack:toast.syncedDesc' 
 * });
 */

import { toast, ExternalToast } from 'sonner';
import i18n from '@/i18n';

type ToastOptions = ExternalToast & {
  description?: string;
  descriptionParams?: Record<string, unknown>;
};

function translate(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params);
}

export const i18nToast = {
  success: (key: string, options?: ToastOptions & Record<string, unknown>) => {
    const { description, descriptionParams, ...rest } = options || {};
    const translatedDesc = description ? translate(description, descriptionParams) : undefined;
    return toast.success(translate(key, rest), {
      ...rest,
      description: translatedDesc,
    });
  },

  error: (key: string, options?: ToastOptions & Record<string, unknown>) => {
    const { description, descriptionParams, ...rest } = options || {};
    const translatedDesc = description ? translate(description, descriptionParams) : undefined;
    return toast.error(translate(key, rest), {
      ...rest,
      description: translatedDesc,
    });
  },

  info: (key: string, options?: ToastOptions & Record<string, unknown>) => {
    const { description, descriptionParams, ...rest } = options || {};
    const translatedDesc = description ? translate(description, descriptionParams) : undefined;
    return toast.info(translate(key, rest), {
      ...rest,
      description: translatedDesc,
    });
  },

  warning: (key: string, options?: ToastOptions & Record<string, unknown>) => {
    const { description, descriptionParams, ...rest } = options || {};
    const translatedDesc = description ? translate(description, descriptionParams) : undefined;
    return toast.warning(translate(key, rest), {
      ...rest,
      description: translatedDesc,
    });
  },

  loading: (key: string, options?: ToastOptions & Record<string, unknown>) => {
    const { description, descriptionParams, ...rest } = options || {};
    const translatedDesc = description ? translate(description, descriptionParams) : undefined;
    return toast.loading(translate(key, rest), {
      ...rest,
      description: translatedDesc,
    });
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss: toast.dismiss,

  /**
   * Promise-based toast with automatic success/error handling
   * @example
   * i18nToast.promise(fetchData(), {
   *   loading: 'common:states.loading',
   *   success: 'common:success.saved',
   *   error: 'common:errors.generic'
   * });
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: translate(messages.loading),
      success: (data) => 
        typeof messages.success === 'function' 
          ? messages.success(data) 
          : translate(messages.success),
      error: (err) => 
        typeof messages.error === 'function'
          ? messages.error(err)
          : translate(messages.error),
    });
  },
};

export default i18nToast;
