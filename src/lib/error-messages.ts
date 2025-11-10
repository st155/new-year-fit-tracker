/**
 * User-Friendly Error Messages
 * Maps technical errors to human-readable messages
 */

// ============= ERROR MAPPING =============

const ERROR_MAP: Record<string, string> = {
  // Network errors
  'Failed to fetch': 'Проблема с подключением к интернету',
  'Network error': 'Проверьте подключение к сети',
  'NetworkError': 'Нет подключения к интернету',
  
  // Authentication errors
  'Unauthorized': 'Пожалуйста, войдите снова',
  'Invalid credentials': 'Неверный email или пароль',
  'Token expired': 'Сессия истекла, войдите снова',
  'Auth session missing': 'Необходимо войти в систему',
  
  // HTTP errors
  '400': 'Неверный запрос',
  '401': 'Требуется авторизация',
  '403': 'Доступ запрещен',
  '404': 'Данные не найдены',
  '429': 'Слишком много запросов, подождите немного',
  '500': 'Ошибка сервера, попробуйте позже',
  '502': 'Сервер временно недоступен',
  '503': 'Сервис временно недоступен',
  
  // Database errors
  'duplicate key': 'Такая запись уже существует',
  'foreign key': 'Невозможно удалить, есть связанные данные',
  'unique constraint': 'Значение должно быть уникальным',
  
  // Validation errors
  'required': 'Это поле обязательно для заполнения',
  'invalid email': 'Неверный формат email',
  'password too short': 'Пароль слишком короткий',
  'invalid format': 'Неверный формат данных',
  
  // Supabase specific
  'Invalid API key': 'Ошибка конфигурации, обратитесь к администратору',
  'Row level security': 'Недостаточно прав для выполнения операции',
};

// ============= ERROR MESSAGE FUNCTIONS =============

export const getErrorMessage = (error: unknown): string => {
  // Handle null/undefined
  if (!error) {
    return 'Произошла неизвестная ошибка';
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message;

    // Check error map
    for (const [key, friendlyMessage] of Object.entries(ERROR_MAP)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return friendlyMessage;
      }
    }

    // In development, show the actual error
    if (import.meta.env.DEV) {
      return `${message} (Dev Only)`;
    }

    // Generic error message for production
    return 'Что-то пошло не так. Попробуйте ещё раз.';
  }

  // Handle string errors
  if (typeof error === 'string') {
    for (const [key, friendlyMessage] of Object.entries(ERROR_MAP)) {
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
  return 'Произошла неизвестная ошибка';
};

// ============= SPECIFIC ERROR HANDLERS =============

export const getNetworkErrorMessage = (): string => {
  return 'Проблема с подключением к интернету. Проверьте соединение и попробуйте снова.';
};

export const getAuthErrorMessage = (): string => {
  return 'Требуется повторная авторизация. Пожалуйста, войдите снова.';
};

export const getValidationErrorMessage = (field?: string): string => {
  if (field) {
    return `Проверьте правильность заполнения поля "${field}"`;
  }
  return 'Проверьте правильность заполнения формы';
};

export const getServerErrorMessage = (): string => {
  return 'Ошибка сервера. Мы уже работаем над решением проблемы. Попробуйте позже.';
};

// ============= ERROR CATEGORIZATION =============

export type ErrorCategory = 'network' | 'auth' | 'validation' | 'server' | 'unknown';

export const categorizeError = (error: unknown): ErrorCategory => {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('интернет') || message.includes('сеть')) {
    return 'network';
  }
  if (message.includes('войдите') || message.includes('авторизация')) {
    return 'auth';
  }
  if (message.includes('заполнения') || message.includes('формат')) {
    return 'validation';
  }
  if (message.includes('сервер')) {
    return 'server';
  }
  return 'unknown';
};
