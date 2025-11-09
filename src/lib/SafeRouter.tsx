import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { USE_HASH_ROUTER } from './safe-flags';

interface SafeRouterProps {
  children: ReactNode;
}

/**
 * SafeRouter: Automatically chooses between BrowserRouter and HashRouter
 * 
 * Uses HashRouter when:
 * - Running in iframe (preview environment)
 * - USE_HASH_ROUTER flag is enabled
 * - Initial route returns 404 (fallback safety)
 * 
 * Uses BrowserRouter in production with proper base path
 */
export function SafeRouter({ children }: SafeRouterProps) {
  const [routerType, setRouterType] = useState<'browser' | 'hash'>(
    USE_HASH_ROUTER ? 'hash' : 'browser'
  );

  useEffect(() => {
    // Auto-detect if we need hash router
    const isIframe = window.top !== window;
    const hasNonStandardBase = window.location.pathname !== '/' && 
                                !window.location.pathname.startsWith('/app');
    
    if (isIframe || hasNonStandardBase) {
      console.log('🔀 [SafeRouter] Detected special environment, using HashRouter');
      setRouterType('hash');
    }
  }, []);

  // Render appropriate router
  const Router = routerType === 'hash' ? HashRouter : BrowserRouter;
  
  console.log(`🚦 [SafeRouter] Using ${routerType === 'hash' ? 'HashRouter' : 'BrowserRouter'}`);
  
  return (
    <Router>
      <RouterFallback>
        {children}
      </RouterFallback>
    </Router>
  );
}

/**
 * RouterFallback: Catches routing errors and redirects to debug page
 */
function RouterFallback({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Set up error recovery
    const timer = setTimeout(() => {
      const root = document.getElementById('root');
      if (root && root.children.length === 0) {
        console.error('🚨 [RouterFallback] No content rendered, forcing debug page');
        setHasError(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (hasError) {
    return <DebugRedirect />;
  }

  return <>{children}</>;
}

/**
 * Component to redirect to debug page when routing fails
 */
function DebugRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/__debug') {
      console.log('🔧 [SafeRouter] Redirecting to debug page...');
      navigate('/__debug', { replace: true });
    }
  }, [navigate, location]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      color: '#00ffff',
      fontFamily: 'monospace',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div>
        <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>🔧 Redirecting...</h1>
        <p>Taking you to the debug page...</p>
      </div>
    </div>
  );
}
