import { Suspense, SuspenseProps } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PageLoader } from '@/components/ui/page-loader';
import { MiniErrorFallback } from './ErrorFallback';

interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: SuspenseProps['fallback'];
  errorFallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Комбинирует ErrorBoundary и Suspense для обработки
 * как синхронных ошибок, так и асинхронной загрузки
 */
export function AsyncErrorBoundary({
  children,
  fallback = <PageLoader message="Загрузка..." />,
  errorFallback,
  onError,
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={errorFallback}
      onError={onError}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Минимальная версия для небольших компонентов
 */
export function MiniAsyncErrorBoundary({
  children,
  fallback,
}: Pick<AsyncErrorBoundaryProps, 'children' | 'fallback'>) {
  return (
    <ErrorBoundary
      fallback={
        <MiniErrorFallback
          error={null}
          resetError={() => window.location.reload()}
        />
      }
    >
      <Suspense fallback={fallback || <div className="animate-pulse">Загрузка...</div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
