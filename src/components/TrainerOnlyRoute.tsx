import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader message="Проверка доступа тренера..." />;
  }

  if (!isTrainer) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
