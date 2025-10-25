import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Enhanced logging
    console.error('💥 [ErrorBoundary] Caught error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Log to external service if available
    if (typeof window !== 'undefined' && (window as any).ErrorLogger) {
      try {
        (window as any).ErrorLogger.logUIError(error, { 
          componentStack: errorInfo.componentStack 
        });
      } catch (logError) {
        console.error('Failed to log to ErrorLogger:', logError);
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset error state if resetKeys change
    if (
      hasError &&
      resetKeys &&
      prevProps.resetKeys &&
      !this.arraysEqual(resetKeys, prevProps.resetKeys)
    ) {
      this.reset();
    }
  }

  arraysEqual(a: Array<string | number>, b: Array<string | number>): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Use default error fallback
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.reset}
        />
      );
    }

    return children;
  }
}

// HOC для оборачивания компонентов в Error Boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return Wrapped;
}
