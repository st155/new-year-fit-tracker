import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import "@/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { ModernAppLayout } from "@/components/layout/ModernAppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
                  <Index />
                </ModernAppLayout>
              </ProtectedRoute>
            } />
            <Route path="/app" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <Dashboard />
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
                  <ModernProgress />
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
            <Route path="/integrations" element={
              <ProtectedRoute>
                <ModernAppLayout>
                  <Integrations />
                </ModernAppLayout>
              </ProtectedRoute>
            } />
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
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
