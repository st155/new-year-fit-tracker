import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { registerServiceWorker } from "@/lib/pwa-utils";
import { TooltipProvider } from "@/components/ui/tooltip";

// Critical pages - load immediately
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));

// Primary pages - with preload function
const indexLoader = () => import("./pages/Index");
const fitnessDataLoader = () => import("./pages/FitnessData");
const progressLoader = () => import("./pages/ModernProgress");
const feedLoader = () => import("./pages/Feed");

const Index = lazy(indexLoader);
const FitnessData = lazy(fitnessDataLoader);
const Progress = lazy(progressLoader);
const Feed = lazy(feedLoader);

// Secondary pages - load on demand
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetail = lazy(() => import("./pages/ChallengeDetail"));
const CreateChallenge = lazy(() => import("./pages/CreateChallenge"));
const Profile = lazy(() => import("./pages/Profile"));
const CreateGoal = lazy(() => import("./pages/CreateGoal"));
const EditGoal = lazy(() => import("./pages/EditGoal"));
const Integrations = lazy(() => import("./pages/Integrations"));
const TrainerDashboard = lazy(() => import("./pages/TrainerDashboard"));
const MetricDetail = lazy(() => import("./pages/MetricDetail"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Notifications = lazy(() => import("./pages/Notifications"));
const BodyComposition = lazy(() => import("./pages/BodyComposition"));
const Habits = lazy(() => import("./pages/Habits"));
const Goals = lazy(() => import("./pages/Goals"));

// Callbacks - load on demand
const WithingsCallback = lazy(() => import("./pages/WithingsCallback"));
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

const App = () => {
  useEffect(() => {
    registerServiceWorker();
    
    // Preload critical pages after initial render
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        indexLoader();
        fitnessDataLoader();
        progressLoader();
        feedLoader();
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <TooltipProvider delayDuration={200}>
                <Toaster />
                <Sonner />
                <InstallPrompt />
                <UpdatePrompt />
                <Suspense fallback={<PageLoader message="Loading..." />}>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/" element={<Landing />} />
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Index />
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
                    <Route path="/challenges/create" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <CreateChallenge />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/progress" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Progress />
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
                    <Route path="/metric/:metricType" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <MetricDetail />
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
                    <Route path="/goals/create" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <CreateGoal />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/goals/edit/:id" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <EditGoal />
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
                    <Route path="/body-composition" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <BodyComposition />
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
                    
                    <Route path="/withings-callback" element={<WithingsCallback />} />
                    <Route path="/terra-callback" element={<TerraCallback />} />
                    <Route path="/whoop-callback" element={<WhoopCallback />} />
                    <Route path="/functions/v1/withings-integration" element={<WithingsCallback />} />
                    <Route path="/feed" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Feed />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/trainer-dashboard" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <TrainerDashboard />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Notifications />
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
                    <Route path="/goals" element={
                      <ProtectedRoute>
                        <ModernAppLayout>
                          <Goals />
                        </ModernAppLayout>
                      </ProtectedRoute>
                    } />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
