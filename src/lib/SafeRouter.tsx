import { ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, useNavigate, useLocation } from 'react-router-dom';
import { USE_HASH_ROUTER } from './safe-flags';

interface SafeRouterProps {
  children: ReactNode;
}

// OAuth callback paths that must always use BrowserRouter
const OAUTH_CALLBACK_PATHS = [
  '/auth/whoop/oauth2',
  '/whoop-callback',
  '/terra-callback',
  '/auth/',
];

/**
 * SafeRouter: Automatically chooses between BrowserRouter and HashRouter
 * 
 * Uses HashRouter when:
 * - Running in iframe (preview environment)
 * - USE_HASH_ROUTER flag is enabled
 * 
 * Uses BrowserRouter:
 * - In production
 * - For OAuth callback paths (even in special environments)
 */
export function SafeRouter({ children }: SafeRouterProps) {
  const [routerType, setRouterType] = useState<'browser' | 'hash'>(() => {
    // Check if this is an OAuth callback path - always use BrowserRouter
    const pathname = window.location.pathname;
    const isOAuthCallback = OAUTH_CALLBACK_PATHS.some(p => pathname.startsWith(p));
    
    if (isOAuthCallback) {
      console.log('🔀 [SafeRouter] OAuth callback detected, forcing BrowserRouter', { pathname });
      return 'browser';
    }
    
    return USE_HASH_ROUTER ? 'hash' : 'browser';
  });

  useEffect(() => {
    // Only switch to HashRouter if in iframe AND not an OAuth callback
    const isIframe = window.top !== window;
    const pathname = window.location.pathname;
    const isOAuthCallback = OAUTH_CALLBACK_PATHS.some(p => pathname.startsWith(p));
    
    if (isOAuthCallback) {
      // Never switch away from BrowserRouter for OAuth callbacks
      console.log('🔀 [SafeRouter] OAuth callback - keeping BrowserRouter');
      return;
    }
    
    if (isIframe) {
      console.log('🔀 [SafeRouter] Detected iframe, using HashRouter');
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
