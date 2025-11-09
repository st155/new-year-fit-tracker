import { Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { SafeRouter } from "@/lib/SafeRouter";
import { registerServiceWorker, setupVersionCheck } from "@/lib/pwa-utils";
import { initInvalidator } from "@/lib/query-invalidation";
import { initPrefetcher } from "@/lib/prefetch-strategy";
import { initWebVitals } from "@/lib/web-vitals";
import { initSentry } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { DISABLE_SW } from "@/lib/safe-flags";
import { AppRoutes } from "./app/AppRoutes";

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

// Initialize prefetcher synchronously to avoid "not initialized" errors
initPrefetcher(queryClient);

// Internal component that renders inside QueryClientProvider
const AppContent = () => {
  console.log('🚀 [AppContent] Rendering...');
  
  // Initialize invalidation, web vitals, sentry (deferred to not block render)
  // Note: prefetcher is initialized synchronously at module level
  useEffect(() => {
    console.log('🚀 [AppContent] useEffect initializing strategies...');
    const timer = setTimeout(() => {
      initInvalidator(queryClient);
      initWebVitals();
      initSentry();
      setupVersionCheck(); // Auto-detect new app versions
      logger.info('[App] Query strategies, monitoring, and version check initialized');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Service worker registration - Managed via safe-flags
  useEffect(() => {
    if (import.meta.env.PROD && !DISABLE_SW) {
      try {
        registerServiceWorker();
      } catch (error) {
        logger.error('Service worker registration failed', error);
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

  console.log('🚀 [AppContent] Rendering providers and routes...');
  
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SafeRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader message="Loading application..." />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </SafeRouter>
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
