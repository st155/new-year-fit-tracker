import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, loading } = useUserRole();

  if (loading) {
    return <PageLoader message="Проверка доступа..." />;
  }

  if (!isTrainer) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
