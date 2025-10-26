import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  function_name: string;
  metadata?: Record<string, any>;
  timestamp: string;
  request_id?: string;
  user_id?: string;
  duration_ms?: number;
}

/**
 * Centralized logging
 */
export class Logger {
  private supabase;
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }

  private async log(entry: Omit<LogEntry, 'timestamp' | 'function_name'>) {
    const logEntry: LogEntry = {
      ...entry,
      function_name: this.functionName,
      timestamp: new Date().toISOString(),
    };

    // Console log для Deno logs
    console.log(JSON.stringify(logEntry));

    // Store в БД для analytics (асинхронно, не блокирует)
    this.supabase
      .from('edge_function_logs')
      .insert(logEntry)
      .then(({ error }) => {
        if (error) console.error('Failed to store log:', error);
      });
  }

  debug(message: string, metadata?: Record<string, any>) {
    return this.log({ level: LogLevel.DEBUG, message, metadata });
  }

  info(message: string, metadata?: Record<string, any>) {
    return this.log({ level: LogLevel.INFO, message, metadata });
  }

  warn(message: string, metadata?: Record<string, any>) {
    return this.log({ level: LogLevel.WARN, message, metadata });
  }

  error(message: string, metadata?: Record<string, any>) {
    return this.log({ level: LogLevel.ERROR, message, metadata });
  }
}

/**
 * Performance tracking
 */
export class PerformanceTracker {
  private startTime: number;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  end(operationName: string, metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    
    this.logger.info(`${operationName} completed`, {
      ...metadata,
      duration_ms: duration,
    });

    return duration;
  }
}

/**
 * Global error logger
 */
export async function logError(
  error: unknown,
  context?: Record<string, any>
): Promise<void> {
  const logger = new Logger('error-handler');
  
  const errorInfo = error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    : { message: String(error) };

  await logger.error('Unhandled error', {
    ...errorInfo,
    ...context,
  });
}
