import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();
  const location = useLocation();

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    return <PageLoader message="Checking trainer access..." />;
  }

  if (!isTrainer) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
