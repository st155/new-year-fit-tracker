import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { registerServiceWorker } from "@/lib/pwa-utils";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const CreateChallenge = lazy(() => import("./pages/CreateChallenge"));
const Progress = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateGoal = lazy(() => import("./pages/CreateGoal"));
const EditGoal = lazy(() => import("./pages/EditGoal"));
const FitnessData = lazy(() => import("./pages/FitnessData"));
const WhoopCallback = lazy(() => import("./pages/WhoopCallback"));
const WithingsCallback = lazy(() => import("./pages/WithingsCallback"));
const Integrations = lazy(() => import("./pages/Integrations"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Landing = lazy(() => import("./pages/Landing"));
const ModernProgress = lazy(() => import("./pages/ModernProgress"));
const Feed = lazy(() => import("./pages/Feed"));
const MetricDetail = lazy(() => import("./pages/MetricDetail"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));

const queryClient = new QueryClient();

const App = () => {
  // Регистрируем Service Worker
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <>
            <AuthProvider>
              <BrowserRouter>
              <Toaster />
              <Sonner />
              <InstallPrompt />
              <UpdatePrompt />
              <Suspense fallback={<PageLoader message="Загрузка..." />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ModernAppLayout>
                    <PageTransition>
                      <Index />
                    </PageTransition>
                  </ModernAppLayout>
                </ProtectedRoute>
              } />
            <Route path="/app" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Challenges />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges/:id" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <ChallengeDetail />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges/create" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <CreateChallenge />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <ModernProgress />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Leaderboard />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/metric/:metricType" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <MetricDetail />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Profile />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/goals/create" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <CreateGoal />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/goals/edit/:id" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <EditGoal />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/fitness-data" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <FitnessData />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Integrations />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/whoop-callback" element={<WhoopCallback />} />
            <Route path="/functions/v1/withings-integration" element={<WithingsCallback />} />
            <Route path="/feed" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <Feed />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/trainer-dashboard" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <PageTransition>
                    <TrainerDashboard />
                  </PageTransition>
                </ModernAppLayout>
              </ProtectedRoute>
            } />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
