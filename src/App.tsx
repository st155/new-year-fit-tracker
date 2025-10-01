import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Challenges from "./pages/Challenges";
import ChallengeDetail from "./pages/ChallengeDetail";
import CreateChallenge from "./pages/CreateChallenge";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import CreateGoal from "./pages/CreateGoal";
import EditGoal from "./pages/EditGoal";
import FitnessData from "./pages/FitnessData";
import WhoopCallback from "./pages/WhoopCallback";
import WithingsCallback from "./pages/WithingsCallback";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import TrainerDashboard from "./pages/TrainerDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Landing from "./pages/Landing";
import ModernProgress from "./pages/ModernProgress";
import Feed from "./pages/Feed";
import MetricDetail from "./pages/MetricDetail";
import Leaderboard from "./pages/Leaderboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
          <Toaster />
          <Sonner />
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
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
