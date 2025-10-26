import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { registerServiceWorker, setupVersionCheck } from "@/lib/pwa-utils";
import { initInvalidator } from "@/lib/query-invalidation";
import { initPrefetcher } from "@/lib/prefetch-strategy";
import { initWebVitals } from "@/lib/web-vitals";
import { logger } from "@/lib/logger";

// Lazy load the entire routing module to reduce initial bundle
const AppRoutes = lazy(() => import("./app/AppRoutes").then(m => ({ default: m.AppRoutes })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,        // 2 minutes
      gcTime: 10 * 60 * 1000,          // 10 minutes
      refetchOnWindowFocus: true,      // ✅ Refresh on tab focus
      refetchOnReconnect: true,        // Refresh on network restore
      retry: 3,                        // 3 retry attempts
      retryDelay: (attemptIndex) => 
        Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      networkMode: 'offlineFirst',     // Work from cache if offline
    },
    mutations: {
      retry: 1,                        // 1 retry for mutations
      networkMode: 'online',           // Don't execute offline
    },
  },
});

// Internal component that renders inside QueryClientProvider
const AppContent = () => {
  // Initialize invalidation, prefetch strategies, and web vitals (deferred to not block render)
  useEffect(() => {
    const timer = setTimeout(() => {
      initInvalidator(queryClient);
      initPrefetcher(queryClient);
      initWebVitals();
      setupVersionCheck(); // Auto-detect new app versions
      logger.info('[App] Query strategies, web vitals, and version check initialized');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Service worker registration - DISABLED temporarily to fix black screen
  useEffect(() => {
    const DISABLE_SW = true; // Feature flag to disable SW in production
    
    if (import.meta.env.PROD && !DISABLE_SW) {
      try {
        registerServiceWorker();
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    } else {
      // Unregister SW and clear caches (dev + DISABLE_SW)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister());
        });
      }
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader message="Loading application..." />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

// Main application component with authentication and routing
const App = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('[App] Global error', error, { componentStack: errorInfo.componentStack });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
