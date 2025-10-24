import { supabase } from '@/integrations/supabase/client';

export interface ErrorLogData {
  errorType: string;
  errorMessage: string;
  errorDetails?: any;
  source: 'whoop' | 'apple_health' | 'garmin' | 'ui' | 'api' | 'file_upload' | 'general' | 'terra';
  stackTrace?: string;
  url?: string;
}

export class ErrorLogger {
  private static getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Unknown';
  }

  private static getCurrentUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return 'Unknown';
  }

  static async logError(data: ErrorLogData, userId?: string): Promise<void> {
    try {
      // Получаем текущего пользователя если userId не передан
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }

      // Если нет пользователя, записываем в консоль и выходим
      if (!currentUserId) {
        console.error('Error Logger: No user found', data);
        return;
      }

      // Собираем полную информацию об ошибке
      const errorLog = {
        user_id: currentUserId,
        error_type: data.errorType,
        error_message: data.errorMessage,
        error_details: data.errorDetails ? JSON.stringify(data.errorDetails) : null,
        source: data.source,
        stack_trace: data.stackTrace,
        user_agent: this.getUserAgent(),
        url: data.url || this.getCurrentUrl(),
      };

      // Сохраняем в базу данных
      const { error } = await supabase
        .from('error_logs')
        .insert(errorLog);

      if (error) {
        console.error('Failed to save error log:', error);
        // Записываем в консоль как fallback
        console.error('Original error:', data);
      }

    } catch (logError) {
      // Если не удалось записать в базу, записываем в консоль
      console.error('Error Logger failed:', logError);
      console.error('Original error:', data);
    }
  }

  // Удобные методы для разных типов ошибок
  
  /**
   * @deprecated Используйте logTerraError() - Whoop теперь работает через Terra API
   */
  static async logWhoopError(errorMessage: string, errorDetails?: any, userId?: string): Promise<void> {
    await this.logTerraError(errorMessage, errorDetails, userId);
  }

  static async logTerraError(errorMessage: string, errorDetails?: any, userId?: string): Promise<void> {
    await this.logError({
      errorType: 'integration_error',
      errorMessage,
      errorDetails,
      source: 'terra',
      stackTrace: new Error().stack
    }, userId);
  }

  static async logAppleHealthError(errorMessage: string, errorDetails?: any, userId?: string): Promise<void> {
    await this.logError({
      errorType: 'integration_error',
      errorMessage,
      errorDetails,
      source: 'apple_health',
      stackTrace: new Error().stack
    }, userId);
  }

  static async logFileUploadError(errorMessage: string, fileInfo?: any, userId?: string): Promise<void> {
    // Hash sensitive data for privacy
    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    };

    // Расширенная информация о файле и системе (с анонимизацией)
    const enhancedFileInfo = {
      ...fileInfo,
      timestamp: new Date().toISOString(),
      browserInfo: typeof navigator !== 'undefined' ? {
        userAgentHash: hashString(navigator.userAgent), // Хешированный UA для приватности
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      } : null,
      connectionType: typeof navigator !== 'undefined' && 'connection' in navigator 
        ? (navigator as any).connection?.effectiveType 
        : 'unknown'
    };

    await this.logError({
      errorType: 'file_upload_error',
      errorMessage,
      errorDetails: enhancedFileInfo,
      source: 'file_upload',
      stackTrace: new Error().stack
    }, userId);
  }

  static async logUIError(errorMessage: string, componentName?: string, userId?: string): Promise<void> {
    await this.logError({
      errorType: 'ui_error',
      errorMessage,
      errorDetails: { component: componentName },
      source: 'ui',
      stackTrace: new Error().stack
    }, userId);
  }

  static async logAPIError(errorMessage: string, endpoint?: string, responseData?: any, userId?: string): Promise<void> {
    await this.logError({
      errorType: 'api_error',
      errorMessage,
      errorDetails: {
        endpoint,
        response: responseData
      },
      source: 'api',
      stackTrace: new Error().stack
    }, userId);
  }

  // Специальный метод для Apple Health диагностики
  static async logAppleHealthDiagnostics(phase: string, details: any, userId?: string): Promise<void> {
    await this.logError({
      errorType: 'apple_health_diagnostics',
      errorMessage: `Apple Health ${phase}`,
      errorDetails: {
        ...details,
        phase,
        timestamp: new Date().toISOString(),
        memoryUsage: typeof performance !== 'undefined' && (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null
      },
      source: 'apple_health'
    }, userId);
  }

  // Глобальный обработчик ошибок JavaScript
  static initGlobalErrorHandler(): void {
    // Обработка необработанных ошибок JavaScript
    window.addEventListener('error', (event) => {
      // Skip React errors to avoid conflicts with hooks
      if (event.message?.includes('dispatcher') || event.message?.includes('useState')) {
        console.error('React error detected:', event.message);
        return;
      }
      
      this.logError({
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorDetails: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString()
        },
        source: 'ui',
        stackTrace: event.error?.stack
      });
    });

    // Обработка необработанных промисов
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        errorType: 'unhandled_promise_rejection',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorDetails: {
          reason: event.reason,
          timestamp: new Date().toISOString()
        },
        source: 'general',
        stackTrace: event.reason?.stack
      });
    });

    // Обработка сетевых ошибок
    window.addEventListener('online', () => {
      this.logError({
        errorType: 'network_status_change',
        errorMessage: 'Network connection restored',
        errorDetails: { 
          status: 'online',
          timestamp: new Date().toISOString()
        },
        source: 'general'
      });
    });

    window.addEventListener('offline', () => {
      this.logError({
        errorType: 'network_status_change',
        errorMessage: 'Network connection lost',
        errorDetails: { 
          status: 'offline',
          timestamp: new Date().toISOString()
        },
        source: 'general'
      });
    });
  }
}

// Инициализируем глобальный обработчик ошибок при загрузке модуля
if (typeof window !== 'undefined') {
  ErrorLogger.initGlobalErrorHandler();
}