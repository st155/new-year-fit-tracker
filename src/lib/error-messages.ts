/**
 * User-Friendly Error Messages
 * Maps technical errors to human-readable messages
 * Supports i18n via factory function
 */

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

// ============= DEFAULT MESSAGES (Russian) =============

const defaultMessages: ErrorMessages = {
  network: {
    failedToFetch: 'Проблема с подключением к интернету',
    networkError: 'Проверьте подключение к сети',
    noConnection: 'Нет подключения к интернету',
    detailed: 'Проблема с подключением к интернету. Проверьте соединение и попробуйте снова.',
  },
  auth: {
    unauthorized: 'Пожалуйста, войдите снова',
    invalidCredentials: 'Неверный email или пароль',
    tokenExpired: 'Сессия истекла, войдите снова',
    sessionMissing: 'Необходимо войти в систему',
    detailed: 'Требуется повторная авторизация. Пожалуйста, войдите снова.',
  },
  http: {
    '400': 'Неверный запрос',
    '401': 'Требуется авторизация',
    '403': 'Доступ запрещен',
    '404': 'Данные не найдены',
    '429': 'Слишком много запросов, подождите немного',
    '500': 'Ошибка сервера, попробуйте позже',
    '502': 'Сервер временно недоступен',
    '503': 'Сервис временно недоступен',
  },
  database: {
    duplicateKey: 'Такая запись уже существует',
    foreignKey: 'Невозможно удалить, есть связанные данные',
    uniqueConstraint: 'Значение должно быть уникальным',
  },
  validation: {
    required: 'Это поле обязательно для заполнения',
    invalidEmail: 'Неверный формат email',
    passwordTooShort: 'Пароль слишком короткий',
    invalidFormat: 'Неверный формат данных',
    checkField: (field: string) => `Проверьте правильность заполнения поля "${field}"`,
    checkForm: 'Проверьте правильность заполнения формы',
  },
  supabase: {
    invalidApiKey: 'Ошибка конфигурации, обратитесь к администратору',
    rowLevelSecurity: 'Недостаточно прав для выполнения операции',
  },
  generic: {
    unknown: 'Произошла неизвестная ошибка',
    somethingWrong: 'Что-то пошло не так. Попробуйте ещё раз.',
  },
  server: {
    detailed: 'Ошибка сервера. Мы уже работаем над решением проблемы. Попробуйте позже.',
  },
};

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

export function createErrorMessageHandler(messages: ErrorMessages = defaultMessages) {
  const errorMap = buildErrorMap(messages);

  const getErrorMessage = (error: unknown): string => {
    // Handle null/undefined
    if (!error) {
      return messages.generic.unknown;
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
      return messages.generic.somethingWrong;
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
    return messages.generic.unknown;
  };

  const getNetworkErrorMessage = (): string => messages.network.detailed;
  const getAuthErrorMessage = (): string => messages.auth.detailed;
  const getValidationErrorMessage = (field?: string): string => {
    if (field) {
      return messages.validation.checkField(field);
    }
    return messages.validation.checkForm;
  };
  const getServerErrorMessage = (): string => messages.server.detailed;

  return {
    getErrorMessage,
    getNetworkErrorMessage,
    getAuthErrorMessage,
    getValidationErrorMessage,
    getServerErrorMessage,
  };
}

// ============= DEFAULT EXPORTS (backward compatible) =============

const defaultHandler = createErrorMessageHandler();

export const getErrorMessage = defaultHandler.getErrorMessage;
export const getNetworkErrorMessage = defaultHandler.getNetworkErrorMessage;
export const getAuthErrorMessage = defaultHandler.getAuthErrorMessage;
export const getValidationErrorMessage = defaultHandler.getValidationErrorMessage;
export const getServerErrorMessage = defaultHandler.getServerErrorMessage;

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
