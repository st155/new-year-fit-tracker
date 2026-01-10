/**
 * User-Friendly Error Messages
 * Maps technical errors to human-readable messages
 * Supports i18n via factory function
 */

import i18n from '@/i18n';

// ============= TYPES =============

export interface ErrorMessages {
  network: {
    failedToFetch: string;
    networkError: string;
    noConnection: string;
    detailed: string;
  };
  auth: {
    unauthorized: string;
    invalidCredentials: string;
    tokenExpired: string;
    sessionMissing: string;
    detailed: string;
  };
  http: Record<string, string>;
  database: {
    duplicateKey: string;
    foreignKey: string;
    uniqueConstraint: string;
  };
  validation: {
    required: string;
    invalidEmail: string;
    passwordTooShort: string;
    invalidFormat: string;
    checkField: (field: string) => string;
    checkForm: string;
  };
  supabase: {
    invalidApiKey: string;
    rowLevelSecurity: string;
  };
  generic: {
    unknown: string;
    somethingWrong: string;
  };
  server: {
    detailed: string;
  };
}

// ============= LOCALIZED MESSAGES FACTORY =============

export function createLocalizedErrorMessages(): ErrorMessages {
  const t = (key: string, options?: Record<string, string>) => i18n.t(`errors:${key}`, options);

  return {
    network: {
      failedToFetch: t('network.failedToFetch'),
      networkError: t('network.networkError'),
      noConnection: t('network.noConnection'),
      detailed: t('network.detailed'),
    },
    auth: {
      unauthorized: t('auth.unauthorized'),
      invalidCredentials: t('auth.invalidCredentials'),
      tokenExpired: t('auth.tokenExpired'),
      sessionMissing: t('auth.sessionMissing'),
      detailed: t('auth.detailed'),
    },
    http: {
      '400': t('http.400'),
      '401': t('http.401'),
      '403': t('http.403'),
      '404': t('http.404'),
      '429': t('http.429'),
      '500': t('http.500'),
      '502': t('http.502'),
      '503': t('http.503'),
    },
    database: {
      duplicateKey: t('database.duplicateKey'),
      foreignKey: t('database.foreignKey'),
      uniqueConstraint: t('database.uniqueConstraint'),
    },
    validation: {
      required: t('validation.required'),
      invalidEmail: t('validation.invalidEmail'),
      passwordTooShort: t('validation.passwordTooShort'),
      invalidFormat: t('validation.invalidFormat'),
      checkField: (field: string) => t('validation.checkField', { field }),
      checkForm: t('validation.checkForm'),
    },
    supabase: {
      invalidApiKey: t('supabase.invalidApiKey'),
      rowLevelSecurity: t('supabase.rowLevelSecurity'),
    },
    generic: {
      unknown: t('generic.unknown'),
      somethingWrong: t('generic.somethingWrong'),
    },
    server: {
      detailed: t('server.detailed'),
    },
  };
}

// ============= ERROR MAP BUILDER =============

function buildErrorMap(messages: ErrorMessages): Record<string, string> {
  return {
    // Network errors
    'Failed to fetch': messages.network.failedToFetch,
    'Network error': messages.network.networkError,
    'NetworkError': messages.network.noConnection,
    
    // Authentication errors
    'Unauthorized': messages.auth.unauthorized,
    'Invalid credentials': messages.auth.invalidCredentials,
    'Token expired': messages.auth.tokenExpired,
    'Auth session missing': messages.auth.sessionMissing,
    
    // HTTP errors
    '400': messages.http['400'],
    '401': messages.http['401'],
    '403': messages.http['403'],
    '404': messages.http['404'],
    '429': messages.http['429'],
    '500': messages.http['500'],
    '502': messages.http['502'],
    '503': messages.http['503'],
    
    // Database errors
    'duplicate key': messages.database.duplicateKey,
    'foreign key': messages.database.foreignKey,
    'unique constraint': messages.database.uniqueConstraint,
    
    // Validation errors
    'required': messages.validation.required,
    'invalid email': messages.validation.invalidEmail,
    'password too short': messages.validation.passwordTooShort,
    'invalid format': messages.validation.invalidFormat,
    
    // Supabase specific
    'Invalid API key': messages.supabase.invalidApiKey,
    'Row level security': messages.supabase.rowLevelSecurity,
  };
}

// ============= ERROR MESSAGE HANDLER FACTORY =============

export function createErrorMessageHandler(messages?: ErrorMessages) {
  const resolvedMessages = messages || createLocalizedErrorMessages();
  const errorMap = buildErrorMap(resolvedMessages);

  const getErrorMessage = (error: unknown): string => {
    // Handle null/undefined
    if (!error) {
      return resolvedMessages.generic.unknown;
    }

    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message;

      // Check error map
      for (const [key, friendlyMessage] of Object.entries(errorMap)) {
        if (message.toLowerCase().includes(key.toLowerCase())) {
          return friendlyMessage;
        }
      }

      // In development, show the actual error
      if (import.meta.env.DEV) {
        return `${message} (Dev Only)`;
      }

      // Generic error message for production
      return resolvedMessages.generic.somethingWrong;
    }

    // Handle string errors
    if (typeof error === 'string') {
      for (const [key, friendlyMessage] of Object.entries(errorMap)) {
        if (error.toLowerCase().includes(key.toLowerCase())) {
          return friendlyMessage;
        }
      }
      return error;
    }

    // Handle objects with message property
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return getErrorMessage((error as { message: unknown }).message);
    }

    // Fallback
    return resolvedMessages.generic.unknown;
  };

  const getNetworkErrorMessage = (): string => resolvedMessages.network.detailed;
  const getAuthErrorMessage = (): string => resolvedMessages.auth.detailed;
  const getValidationErrorMessage = (field?: string): string => {
    if (field) {
      return resolvedMessages.validation.checkField(field);
    }
    return resolvedMessages.validation.checkForm;
  };
  const getServerErrorMessage = (): string => resolvedMessages.server.detailed;

  return {
    getErrorMessage,
    getNetworkErrorMessage,
    getAuthErrorMessage,
    getValidationErrorMessage,
    getServerErrorMessage,
  };
}

// ============= DEFAULT EXPORTS (with i18n support) =============

// These functions will use the current i18n language
export const getErrorMessage = (error: unknown): string => {
  const handler = createErrorMessageHandler();
  return handler.getErrorMessage(error);
};

export const getNetworkErrorMessage = (): string => {
  const handler = createErrorMessageHandler();
  return handler.getNetworkErrorMessage();
};

export const getAuthErrorMessage = (): string => {
  const handler = createErrorMessageHandler();
  return handler.getAuthErrorMessage();
};

export const getValidationErrorMessage = (field?: string): string => {
  const handler = createErrorMessageHandler();
  return handler.getValidationErrorMessage(field);
};

export const getServerErrorMessage = (): string => {
  const handler = createErrorMessageHandler();
  return handler.getServerErrorMessage();
};

// ============= ERROR CATEGORIZATION =============

export type ErrorCategory = 'network' | 'auth' | 'validation' | 'server' | 'unknown';

export const categorizeError = (error: unknown): ErrorCategory => {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('интернет') || message.includes('сеть') || message.includes('internet') || message.includes('network')) {
    return 'network';
  }
  if (message.includes('войдите') || message.includes('авторизация') || message.includes('sign in') || message.includes('auth')) {
    return 'auth';
  }
  if (message.includes('заполнения') || message.includes('формат') || message.includes('form') || message.includes('field')) {
    return 'validation';
  }
  if (message.includes('сервер') || message.includes('server')) {
    return 'server';
  }
  return 'unknown';
};
