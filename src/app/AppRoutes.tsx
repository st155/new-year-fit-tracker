import { Suspense, useEffect, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionProvider } from "@/providers/MotionProvider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { PageLoader } from "@/components/ui/page-loader";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { TrainerOnlyRoute } from "@/components/TrainerOnlyRoute";
import { getPrefetcher } from "@/lib/prefetch-strategy";
import { logger } from "@/lib/logger";
import { DevDebugBar } from "@/components/dev/DevDebugBar";
import { AsyncErrorBoundary } from "@/components/error/AsyncErrorBoundary";
import { ROUTE_SMOKE } from "@/lib/safe-flags";

import Auth from "@/pages/Auth";
import DebugPage from "@/pages/DebugPage";
import SmokeHome from "@/pages/SmokeHome";
import ComponentLibrary from "@/pages/ComponentLibrary";
import { TerraWidgetLoader } from "@/components/integrations/TerraWidgetLoader";

// 🔍 DIAGNOSTIC: Landing imported directly (not lazy) to debug black screen
import Landing from "@/pages/Landing";
const LandingAI = lazy(() => import("@/pages/LandingAI"));
const Index = lazy(() => import("@/pages/Index"));
const Progress = lazy(() => import("@/pages/Progress"));
const Goals = lazy(() => import("@/pages/Goals"));
const GoalDetail = lazy(() => import("@/pages/GoalDetail"));
const Body = lazy(() => import("@/pages/Body"));
const AITrainingOnboarding = lazy(() => import("@/pages/AITrainingOnboarding"));
const GeneratingPlanScreen = lazy(() => import("@/pages/GeneratingPlanScreen"));
const AIGeneratedPlanReady = lazy(() => import("@/pages/AIGeneratedPlanReady"));
const Challenges = lazy(() => import("@/pages/Challenges"));
const ChallengeDetail = lazy(() => import("@/pages/ChallengeDetail"));
const Habits = lazy(() => import("@/pages/Habits"));
const HabitDetail = lazy(() => import("@/pages/HabitDetail"));
const Feed = lazy(() => import("@/pages/Feed"));
const FitnessData = lazy(() => import("@/pages/FitnessData"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const MedicalDocuments = lazy(() => import("@/pages/MedicalDocuments"));
const TrainerDashboard = lazy(() => import("@/pages/TrainerDashboard"));
const TrainerTestPage = lazy(() => import("@/pages/TrainerTestPage"));
const TrainingPlanDetail = lazy(() => import("@/pages/TrainingPlanDetail"));
const TrainerAnalyticsDashboard = lazy(() => import("@/pages/TrainerAnalyticsDashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const TerraCallback = lazy(() => import("@/pages/TerraCallback"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Health = lazy(() => import("@/pages/Health"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WithingsDebug = lazy(() => import("@/pages/WithingsDebug"));
const MetricDetail = lazy(() => import("@/pages/MetricDetail"));
const HabitTeams = lazy(() => import("@/pages/HabitTeams"));
const HabitTeamDetail = lazy(() => import("@/pages/HabitTeamDetail"));
const WorkoutLiveLogger = lazy(() => import("@/pages/WorkoutLiveLogger"));
const WorkoutSummary = lazy(() => import("@/pages/WorkoutSummary"));
const WorkoutManagement = lazy(() => import("@/pages/WorkoutManagement"));
const WorkoutV31 = lazy(() => import("@/pages/WorkoutV31"));

export const AppRoutes = () => {
  const { user } = useAuth();
  const location = useLocation();

  // 🔍 Diagnostic: Route changes logging
  useEffect(() => {
    console.log('🧭 [Router] Current path:', location.pathname, { hasUser: !!user, userId: user?.id });
  }, [location.pathname, user]);

  // Prefetch critical data after login
  useEffect(() => {
    if (!user) return;
    
    try {
      logger.debug('[AppRoutes] User logged in, prefetching critical data');
      const prefetcher = getPrefetcher();
      prefetcher.prefetchAfterLogin(user.id).catch(error => {
        logger.warn('[AppRoutes] Prefetch after login failed:', error);
      });
    } catch (error) {
      logger.warn('[AppRoutes] Prefetcher not ready, skipping prefetch:', error);
    }
  }, [user]);

  return (
    <MotionProvider>
      <AsyncErrorBoundary
        fallback={<PageLoader message="Recovering..." />}
        onError={(error) => {
          logger.error('[AppRoutes] Route rendering error:', error);
        }}
      >
        <Suspense fallback={<PageLoader message="Loading..." />}>
          <Routes>
        {/* Debug/test routes - DEV only */}
        {import.meta.env.DEV && (
          <>
            <Route path="/__debug" element={<DebugPage />} />
            <Route path="/__smoke" element={<SmokeHome />} />
          </>
        )}
        
        {/* Landing page - public */}
        <Route path="/landing" element={<Landing />} />
        
        <Route path="/auth" element={<Auth />} />
        
        {/* Home route - conditional smoke mode */}
        <Route path="/" element={
          ROUTE_SMOKE ? <SmokeHome /> : (
            <ProtectedRoute>
              <RoleBasedRoute>
                <ModernAppLayout>
                  <Index />
                </ModernAppLayout>
              </RoleBasedRoute>
            </ProtectedRoute>
          )
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
        <Route path="/workouts" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <WorkoutV31 />
            </ModernAppLayout>
          </ProtectedRoute>
        } />
        <Route path="/workouts/manage" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <WorkoutManagement />
            </ModernAppLayout>
          </ProtectedRoute>
        } />
        <Route path="/workouts/ai-onboarding" element={
          <ProtectedRoute>
            <AITrainingOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/workouts/generating" element={
          <ProtectedRoute>
            <GeneratingPlanScreen />
          </ProtectedRoute>
        } />
        <Route path="/workouts/plan-ready" element={
          <ProtectedRoute>
            <AIGeneratedPlanReady />
          </ProtectedRoute>
        } />
        <Route path="/workouts/live-logger" element={
          <ProtectedRoute>
            <WorkoutLiveLogger />
          </ProtectedRoute>
        } />
        <Route path="/workouts/summary" element={
          <ProtectedRoute>
            <WorkoutSummary />
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
        <Route path="/habits/:id" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <HabitDetail />
            </ModernAppLayout>
          </ProtectedRoute>
        } />
        <Route path="/habits/teams" element={
          <ProtectedRoute>
            <HabitTeams />
          </ProtectedRoute>
        } />
        <Route path="/habits/teams/:id" element={
          <ProtectedRoute>
            <HabitTeamDetail />
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
              <AsyncErrorBoundary 
                errorFallback={<div className="p-8 text-center">Ошибка загрузки страницы Фитнес дата</div>}
              >
                <FitnessData />
              </AsyncErrorBoundary>
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
        <Route path="/integrations" element={<Navigate to="/fitness-data" replace />} />
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
        <Route path="/trainer-analytics" element={
          <ProtectedRoute>
            <TrainerOnlyRoute>
              <ModernAppLayout>
                <TrainerAnalyticsDashboard />
              </ModernAppLayout>
            </TrainerOnlyRoute>
          </ProtectedRoute>
        } />
        <Route path="/training-plans/:id" element={
          <ProtectedRoute>
            <TrainerOnlyRoute>
              <ModernAppLayout>
                <AsyncErrorBoundary>
                  <TrainingPlanDetail />
                </AsyncErrorBoundary>
              </ModernAppLayout>
            </TrainerOnlyRoute>
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <TrainerOnlyRoute>
              <ModernAppLayout>
                <Admin />
              </ModernAppLayout>
            </TrainerOnlyRoute>
          </ProtectedRoute>
        } />
        {/* Test page only in development */}
        {import.meta.env.DEV && (
          <Route path="/trainer-test" element={<TrainerTestPage />} />
        )}
        
        {/* Component Library - Development only */}
        {import.meta.env.DEV && (
          <Route path="/components" element={<ComponentLibrary />} />
        )}
        
        {/* OAuth callbacks */}
        <Route path="/terra-callback" element={<TerraCallback />} />
        <Route path="/terra-widget-loader" element={<TerraWidgetLoader />} />
        
        {/* Static pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/health" element={<Health />} />
        
        {/* Debug pages - dev/admin only */}
        <Route path="/withings-debug" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <WithingsDebug />
            </ModernAppLayout>
          </ProtectedRoute>
        } />
        
        {/* Metric detail pages */}
        <Route path="/metrics/:metricName" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <MetricDetail />
            </ModernAppLayout>
          </ProtectedRoute>
        } />
        
        {/* AI Coach Landing Page */}
        <Route path="/features/ai-coach" element={
          <ProtectedRoute>
            <LandingAI />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
        </Routes>
        {/* <DevDebugBar /> */}
        <Sonner />
        <InstallPrompt />
        <UpdatePrompt />
      </Suspense>
      </AsyncErrorBoundary>
    </MotionProvider>
  );
};
