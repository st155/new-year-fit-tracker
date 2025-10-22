import { Suspense, lazy, useEffect } from "react";
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
import { useAutoCacheClear } from "@/hooks/useAutoCacheClear";

import Auth from "./pages/Auth";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { TrainerOnlyRoute } from "@/components/TrainerOnlyRoute";

// Critical pages - load immediately
const Landing = lazy(() => import("./pages/Landing"));

// Primary pages
const Index = lazy(() => import("./pages/Index"));
const Progress = lazy(() => import("./pages/Progress"));
const Goals = lazy(() => import("./pages/Goals"));
const GoalDetail = lazy(() => import("./pages/GoalDetail"));
const Body = lazy(() => import("./pages/Body"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const Habits = lazy(() => import("./pages/Habits"));
const Feed = lazy(() => import("./pages/Feed"));
const FitnessData = lazy(() => import("./pages/FitnessData"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

// Secondary pages
const Profile = lazy(() => import("./pages/Profile"));
const Integrations = lazy(() => import("./pages/Integrations"));
const MedicalDocuments = lazy(() => import("./pages/MedicalDocuments"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const TrainerTestPage = lazy(() => import("./pages/TrainerTestPage"));

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
  // Автоматическая очистка кешей раз в сутки
  useAutoCacheClear();

  useEffect(() => {
    if (import.meta.env.PROD) {
      try {
        registerServiceWorker();
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    } else {
      // Dev-защита: отключаем любые SW и чистим кеши
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
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('💥 [App] Global error caught:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          });
        }}
      >
        <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader message="Loading..." />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <RoleBasedRoute>
                          <ModernAppLayout>
                            <Index />
                          </ModernAppLayout>
                        </RoleBasedRoute>
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
                    <Route path="/goals" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Goals />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/goals/:id" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <GoalDetail />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/body" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Body />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/challenges" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Challenges />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/challenges/:id" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <ChallengeDetail />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/habits" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Habits />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/feed" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Feed />
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
                    <Route path="/leaderboard" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Leaderboard />
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
                    <Route path="/medical-documents" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <MedicalDocuments />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/trainer-dashboard" element={
                      <ProtectedRoute>
                        <TrainerOnlyRoute>
                          <ModernAppLayout>
                            <TrainerDashboard />
                          </ModernAppLayout>
                        </TrainerOnlyRoute>
                      </ProtectedRoute>
                    } />
          {/* Test page only in development */}
          {import.meta.env.DEV && (
            <Route path="/trainer-test" element={<TrainerTestPage />} />
          )}
                    
                    {/* OAuth callbacks */}
                    <Route path="/terra-callback" element={<TerraCallback />} />
          <Route path="/integrations/whoop/callback" element={
            <ErrorBoundary
              fallback={
                <div className="min-h-screen flex items-center justify-center p-4">
                  <div className="max-w-md w-full bg-card rounded-lg border border-border p-6">
                    <h2 className="text-xl font-semibold mb-2">Ошибка подключения Whoop</h2>
                    <p className="text-muted-foreground mb-4">
                      Не удалось завершить подключение. Попробуйте снова.
                    </p>
                    <button
                      onClick={() => window.location.href = '/integrations'}
                      className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Вернуться к интеграциям
                    </button>
                  </div>
                </div>
              }
            >
              <WhoopCallback />
            </ErrorBoundary>
          } />
                    
                    {/* Static pages */}
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Sonner />
                <InstallPrompt />
                <UpdatePrompt />
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
  );
};

export default App;
