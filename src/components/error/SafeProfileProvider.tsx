import { ReactNode } from 'react';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { MiniErrorFallback } from './ErrorFallback';
import { ErrorBoundary } from './ErrorBoundary';

interface SafeProfileProviderProps {
  children: ReactNode;
}

/**
 * Wrapper for ProfileProvider with error boundary protection
 * Prevents the entire app from crashing if profile loading fails
 */
export function SafeProfileProvider({ children }: SafeProfileProviderProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <MiniErrorFallback
              error={new Error('Failed to load profile context')}
              resetError={() => window.location.reload()}
            />
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('💥 [SafeProfileProvider] Profile context error:', {
          error: error.message,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <ProfileProvider>
        {children}
      </ProfileProvider>
    </ErrorBoundary>
  );
}
