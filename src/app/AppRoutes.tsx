import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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
import { lazySafe } from "@/lib/lazy-safe";
import { DevDebugBar } from "@/components/dev/DevDebugBar";
import { AsyncErrorBoundary } from "@/components/error/AsyncErrorBoundary";

import Auth from "@/pages/Auth";
import DebugPage from "@/pages/DebugPage";
import SmokeHome from "@/pages/SmokeHome";

// 🔥 ROUTE_SMOKE: Temporarily route / to SmokeHome (bypass all auth/layout)
const ROUTE_SMOKE = false;

// Sync imports for all pages
import LandingSync from "@/pages/Landing";
import IndexSync from "@/pages/Index";
import ProgressSync from "@/pages/Progress";
import GoalsSync from "@/pages/Goals";
import GoalDetailSync from "@/pages/GoalDetail";
import BodySync from "@/pages/Body";
import ChallengesSync from "@/pages/Challenges";
import ChallengeDetailSync from "@/pages/ChallengeDetail";
import HabitsSync from "@/pages/Habits";
import HabitsV3Sync from "@/pages/HabitsV3";
import HabitDetailSync from "@/pages/HabitDetail";
import FeedSync from "@/pages/Feed";
import FitnessDataSync from "@/pages/FitnessData";
import LeaderboardSync from "@/pages/Leaderboard";
import ProfileSync from "@/pages/Profile";
import IntegrationsSync from "@/pages/Integrations";
import MedicalDocumentsSync from "@/pages/MedicalDocuments";
import TrainerDashboardSync from "@/pages/TrainerDashboard";
import TrainerTestPageSync from "@/pages/TrainerTestPage";
import TrainingPlanDetailSync from "@/pages/TrainingPlanDetail";
import TrainerAnalyticsDashboardSync from "@/pages/TrainerAnalyticsDashboard";
import AdminSync from "@/pages/Admin";
import MetricDetailSync from "@/pages/MetricDetail";
import TerraCallbackSync from "@/pages/TerraCallback";
import PrivacyPolicySync from "@/pages/PrivacyPolicy";
import HealthSync from "@/pages/Health";
import NotFoundSync from "@/pages/NotFound";
import WithingsDebugSync from "@/pages/WithingsDebug";
import { TerraWidgetLoader } from "@/components/integrations/TerraWidgetLoader";

// Safe lazy wrappers (bypass lazy on dev/preview)
const Landing = lazySafe(LandingSync, () => import("@/pages/Landing"));
const Index = lazySafe(IndexSync, () => import("@/pages/Index"));
const Progress = lazySafe(ProgressSync, () => import("@/pages/Progress"));
const Goals = lazySafe(GoalsSync, () => import("@/pages/Goals"));
const GoalDetail = lazySafe(GoalDetailSync, () => import("@/pages/GoalDetail"));
const Body = lazySafe(BodySync, () => import("@/pages/Body"));
const Challenges = lazySafe(ChallengesSync, () => import("@/pages/Challenges"));
const ChallengeDetail = lazySafe(ChallengeDetailSync, () => import("@/pages/ChallengeDetail"));
const Habits = lazySafe(HabitsSync, () => import("@/pages/Habits"));
const HabitsV3 = lazySafe(HabitsV3Sync, () => import("@/pages/HabitsV3"));
const HabitDetail = lazySafe(HabitDetailSync, () => import("@/pages/HabitDetail"));
const Feed = lazySafe(FeedSync, () => import("@/pages/Feed"));
const FitnessData = lazySafe(FitnessDataSync, () => import("@/pages/FitnessData"));
const Leaderboard = lazySafe(LeaderboardSync, () => import("@/pages/Leaderboard"));
const Profile = lazySafe(ProfileSync, () => import("@/pages/Profile"));
const Integrations = lazySafe(IntegrationsSync, () => import("@/pages/Integrations"));
const MedicalDocuments = lazySafe(MedicalDocumentsSync, () => import("@/pages/MedicalDocuments"));
const TrainerDashboard = lazySafe(TrainerDashboardSync, () => import("@/pages/TrainerDashboard"));
const TrainerTestPage = lazySafe(TrainerTestPageSync, () => import("@/pages/TrainerTestPage"));
const TrainingPlanDetail = lazySafe(TrainingPlanDetailSync, () => import("@/pages/TrainingPlanDetail"));
const TrainerAnalyticsDashboard = lazySafe(TrainerAnalyticsDashboardSync, () => import("@/pages/TrainerAnalyticsDashboard"));
const Admin = lazySafe(AdminSync, () => import("@/pages/Admin"));
const TerraCallback = lazySafe(TerraCallbackSync, () => import("@/pages/TerraCallback"));
const PrivacyPolicy = lazySafe(PrivacyPolicySync, () => import("@/pages/PrivacyPolicy"));
const Health = lazySafe(HealthSync, () => import("@/pages/Health"));
const NotFound = lazySafe(NotFoundSync, () => import("@/pages/NotFound"));
const WithingsDebug = lazySafe(WithingsDebugSync, () => import("@/pages/WithingsDebug"));
const MetricDetail = lazySafe(MetricDetailSync, () => import("@/pages/MetricDetail"));

export const AppRoutes = () => {
  const { user } = useAuth();

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
      <Suspense fallback={<PageLoader message="Loading..." />}>
        <Routes>
        {/* Debug route - no auth, no lazy, no providers */}
        <Route path="/__debug" element={<DebugPage />} />
        
        {/* Smoke test route - minimal component */}
        <Route path="/__smoke" element={<SmokeHome />} />
        
        <Route path="/auth" element={<Auth />} />
        <Route path="/landing" element={<Landing />} />
        
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
        <Route path="/habits-v3" element={
          <ProtectedRoute>
            <ModernAppLayout>
              <HabitsV3 />
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
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <DevDebugBar />
      <Sonner />
      <InstallPrompt />
      <UpdatePrompt />
    </Suspense>
    </MotionProvider>
  );
};
