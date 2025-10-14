import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { registerServiceWorker } from "@/lib/pwa-utils";


// Critical pages - load immediately
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));

// Primary pages
const Index = lazy(() => import("./pages/Index"));
const Progress = lazy(() => import("./pages/ModernProgress"));
const FitnessData = lazy(() => import("./pages/FitnessData"));

// Secondary pages
const Profile = lazy(() => import("./pages/Profile"));
const Integrations = lazy(() => import("./pages/Integrations"));

// OAuth callbacks
const TerraCallback = lazy(() => import("./pages/TerraCallback"));
const WhoopCallback = lazy(() => import("./pages/WhoopCallback"));

// Static pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Main application component with authentication and routing
const App = () => {
  useEffect(() => {
    try {
      registerServiceWorker();
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <>
                <Toaster />
                <Sonner />
                <InstallPrompt />
                <UpdatePrompt />
                <Suspense fallback={<PageLoader message="Loading..." />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Index />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/progress" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Progress />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/fitness-data" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <FitnessData />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Profile />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/integrations" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Integrations />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    
                    {/* OAuth callbacks */}
                    <Route path="/terra-callback" element={<TerraCallback />} />
                    <Route path="/integrations/whoop/callback" element={<WhoopCallback />} />
                    
                    {/* Static pages */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
