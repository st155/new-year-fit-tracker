/**
 * Sentry Configuration for Error Tracking
 * 
 * Setup:
 * 1. Create Sentry account at sentry.io
 * 2. Add SENTRY_DSN secret to Lovable
 * 3. Sentry will automatically track errors
 */

interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  enabled: boolean;
}

class SentryClient {
  private config: SentryConfig | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    if (import.meta.env.DEV) return; // Disable in development

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      console.info('Sentry DSN not found. Error tracking disabled.');
      return;
    }

    try {
      // Dynamic import to avoid bundling in dev
      const Sentry = await import('@sentry/browser');
      
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1, // 10% of transactions
        
        beforeSend(event, hint) {
          // Filter out non-critical errors
          if (event.exception) {
            const error = hint.originalException;
            
            // Ignore network errors (they're expected)
            if (error instanceof Error && error.message.includes('fetch')) {
              return null;
            }
          }
          
          return event;
        },
      });

      this.initialized = true;
      console.info('✅ Sentry error tracking initialized');
    } catch (error) {
      console.warn('Failed to initialize Sentry:', error);
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;

    import('@sentry/browser').then(Sentry => {
      Sentry.captureException(error, {
        level: 'error',
        extra: context,
      });
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
    if (!this.initialized) return;

    import('@sentry/browser').then(Sentry => {
      Sentry.captureMessage(message, {
        level,
        extra: context,
      });
    });
  }

  setUser(userId: string, email?: string) {
    if (!this.initialized) return;

    import('@sentry/browser').then(Sentry => {
      Sentry.setUser({ id: userId, email });
    });
  }

  clearUser() {
    if (!this.initialized) return;

    import('@sentry/browser').then(Sentry => {
      Sentry.setUser(null);
    });
  }
}

export const sentry = new SentryClient();

/**
 * Initialize Sentry on app startup
 */
export async function initSentry() {
  await sentry.init();
}
