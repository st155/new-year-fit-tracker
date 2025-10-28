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
