import { Navigate, useLocation } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, role, loading } = useUserRole();
  const location = useLocation();

  console.log('👔 [TrainerOnlyRoute] Render', {
    timestamp: new Date().toISOString(),
    pathname: location.pathname,
    isTrainer,
    role,
    loading
  });

  if (loading) {
    console.log('⏳ [TrainerOnlyRoute] Loading role state');
    return <PageLoader message="Проверка доступа тренера..." />;
  }

  if (!isTrainer) {
    console.log('🚫 [TrainerOnlyRoute] Access denied - not a trainer', {
      role,
      redirectTo: '/profile'
    });
    return <Navigate to="/profile" replace />;
  }

  console.log('✅ [TrainerOnlyRoute] Trainer access granted, rendering children');
  return <>{children}</>;
};
