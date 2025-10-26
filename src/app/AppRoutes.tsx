import { Suspense, lazy, useEffect } from "react";
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

import Auth from "@/pages/Auth";
import DebugPage from "@/pages/DebugPage";

// Critical pages - load on demand
const Landing = lazy(() => import("@/pages/Landing"));

// Primary pages
const Index = lazy(() => import("@/pages/Index"));
const Progress = lazy(() => import("@/pages/Progress"));
const Goals = lazy(() => import("@/pages/Goals"));
const GoalDetail = lazy(() => import("@/pages/GoalDetail"));
const Body = lazy(() => import("@/pages/Body"));
const Challenges = lazy(() => import("@/pages/Challenges"));
const ChallengeDetail = lazy(() => import("@/pages/ChallengeDetail"));
const Habits = lazy(() => import("@/pages/Habits"));
const Feed = lazy(() => import("@/pages/Feed"));
const FitnessData = lazy(() => import("@/pages/FitnessData"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));

// Secondary pages
const Profile = lazy(() => import("@/pages/Profile"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const MedicalDocuments = lazy(() => import("@/pages/MedicalDocuments"));
const TrainerDashboard = lazy(() => import("@/pages/TrainerDashboard"));
const TrainerTestPage = lazy(() => import("@/pages/TrainerTestPage"));
const Admin = lazy(() => import("@/pages/Admin"));

// OAuth callbacks
const TerraCallback = lazy(() => import("@/pages/TerraCallback"));

// Static pages
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Health = lazy(() => import("@/pages/Health"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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
