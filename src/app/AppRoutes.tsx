import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

import Auth from "@/pages/Auth";
import DebugPage from "@/pages/DebugPage";

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
import FeedSync from "@/pages/Feed";
import FitnessDataSync from "@/pages/FitnessData";
import LeaderboardSync from "@/pages/Leaderboard";
import ProfileSync from "@/pages/Profile";
import IntegrationsSync from "@/pages/Integrations";
import MedicalDocumentsSync from "@/pages/MedicalDocuments";
import TrainerDashboardSync from "@/pages/TrainerDashboard";
import TrainerTestPageSync from "@/pages/TrainerTestPage";
import AdminSync from "@/pages/Admin";
import TerraCallbackSync from "@/pages/TerraCallback";
import PrivacyPolicySync from "@/pages/PrivacyPolicy";
import HealthSync from "@/pages/Health";
import NotFoundSync from "@/pages/NotFound";

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
const Feed = lazySafe(FeedSync, () => import("@/pages/Feed"));
const FitnessData = lazySafe(FitnessDataSync, () => import("@/pages/FitnessData"));
const Leaderboard = lazySafe(LeaderboardSync, () => import("@/pages/Leaderboard"));
const Profile = lazySafe(ProfileSync, () => import("@/pages/Profile"));
const Integrations = lazySafe(IntegrationsSync, () => import("@/pages/Integrations"));
const MedicalDocuments = lazySafe(MedicalDocumentsSync, () => import("@/pages/MedicalDocuments"));
const TrainerDashboard = lazySafe(TrainerDashboardSync, () => import("@/pages/TrainerDashboard"));
const TrainerTestPage = lazySafe(TrainerTestPageSync, () => import("@/pages/TrainerTestPage"));
const Admin = lazySafe(AdminSync, () => import("@/pages/Admin"));
const TerraCallback = lazySafe(TerraCallbackSync, () => import("@/pages/TerraCallback"));
const PrivacyPolicy = lazySafe(PrivacyPolicySync, () => import("@/pages/PrivacyPolicy"));
const Health = lazySafe(HealthSync, () => import("@/pages/Health"));
const NotFound = lazySafe(NotFoundSync, () => import("@/pages/NotFound"));

export const AppRoutes = () => {
  const { user } = useAuth();

  // Prefetch critical data after login
  useEffect(() => {
    if (user) {
      logger.debug('[AppRoutes] User logged in, prefetching critical data');
      const prefetcher = getPrefetcher();
      prefetcher.prefetchAfterLogin(user.id).catch(error => {
        logger.warn('[AppRoutes] Prefetch after login failed:', error);
      });
    }
  }, [user]);

  return (
    <Suspense fallback={<PageLoader message="Loading..." />}>
      <Routes>
        {/* Debug route - no auth, no lazy, no providers */}
        <Route path="/__debug" element={<DebugPage />} />
        
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
        
        {/* Static pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/health" element={<Health />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Sonner />
      <InstallPrompt />
      <UpdatePrompt />
    </Suspense>
  );
};
