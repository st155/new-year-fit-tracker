import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerOnlyRouteProps {
  children: React.ReactNode;
}

export const TrainerOnlyRoute = ({ children }: TrainerOnlyRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();
  const location = useLocation();

  console.log('👨‍🏫 [TrainerOnlyRoute] State:', { 
    isTrainer, 
    loading, 
    rolesLoading,
    path: location.pathname 
  });

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    console.log('⏳ [TrainerOnlyRoute] Loading...');
    return <PageLoader message="Checking trainer access..." />;
  }

  if (!isTrainer) {
    console.log('🚫 [TrainerOnlyRoute] Not a trainer, redirecting to /profile');
    return <Navigate to="/profile" replace />;
  }

  console.log('✅ [TrainerOnlyRoute] Trainer verified, rendering children');
  return <>{children}</>;
};
