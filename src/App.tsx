import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import TrainerDashboard from "./pages/TrainerDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Index />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges" element={
              <ProtectedRoute>
                <AppLayout>
                  <Challenges />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <ChallengeDetail />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/challenges/create" element={
              <ProtectedRoute>
                <AppLayout>
                  <CreateChallenge />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <AppLayout>
                  <Progress />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout>
                  <Profile />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/goals/create" element={
              <ProtectedRoute>
                <AppLayout>
                  <CreateGoal />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/goals/edit/:id" element={
              <ProtectedRoute>
                <AppLayout>
                  <EditGoal />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/fitness-data" element={
              <ProtectedRoute>
                <AppLayout>
                  <FitnessData />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <AppLayout>
                  <Integrations />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/whoop-callback" element={<WhoopCallback />} />
            <Route path="/trainer-dashboard" element={
              <ProtectedRoute>
                <AppLayout>
                  <TrainerDashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
