/**
 * Centralized logging system
 * 
 * Usage:
 * - logger.debug() - Development only, removed in production
 * - logger.info() - Development only
 * - logger.warn() - Always logged, sent to monitoring in production
 * - logger.error() - Always logged, sent to error tracking (Sentry/LogRocket)
 */

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private prefix = '🔍';

  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: LogContext) {
    if (this.isDev) {
      console.log(`${this.prefix} [DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Info logs - only in development
   */
  info(message: string, context?: LogContext) {
    if (this.isDev) {
      console.info(`ℹ️ [INFO] ${message}`, context || '');
    }
  }

  /**
   * Warning logs - always logged
   */
  warn(message: string, context?: LogContext) {
    console.warn(`⚠️ [WARN] ${message}`, context || '');
    
    // In production: send to monitoring service
    if (!this.isDev) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Error logs - always logged and tracked
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    console.error(`💥 [ERROR] ${message}`, {
      error: errorObj,
      stack: errorObj.stack,
      ...context,
    });

    // In production: send to error tracking (Sentry/LogRocket)
    if (!this.isDev) {
      this.sendToErrorTracking(message, errorObj, context);
    }
  }

  /**
   * Performance measurement
   */
  time(label: string) {
    if (this.isDev) {
      console.time(`⏱️ ${label}`);
    }
  }

  timeEnd(label: string) {
    if (this.isDev) {
      console.timeEnd(`⏱️ ${label}`);
    }
  }

  /**
   * Group logs for better organization
   */
  group(label: string) {
    if (this.isDev) {
      console.group(`📦 ${label}`);
    }
  }

  groupEnd() {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  private sendToMonitoring(level: string, message: string, context?: LogContext) {
    // TODO: Integrate with monitoring service (e.g., LogRocket, DataDog)
    // Example:
    // window.LogRocket?.log(level, message, context);
  }

  private sendToErrorTracking(message: string, error: Error, context?: LogContext) {
    // TODO: Integrate with error tracking (e.g., Sentry)
    // Example:
    // Sentry.captureException(error, {
    //   level: 'error',
    //   extra: { message, ...context },
    // });
  }
}

export const logger = new Logger();
