import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();

  console.log('👤 [RoleBasedRoute] State:', { 
    isTrainer, 
    loading, 
    rolesLoading 
  });

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    console.log('⏳ [RoleBasedRoute] Loading roles...');
    return <PageLoader message="Checking role..." />;
  }

  // If trainer/admin, redirect to trainer dashboard
  if (isTrainer) {
    console.log('👨‍🏫 [RoleBasedRoute] Trainer detected, redirecting to /trainer-dashboard');
    return <Navigate to="/trainer-dashboard" replace />;
  }

  console.log('✅ [RoleBasedRoute] Client user, rendering children');
  return <>{children}</>;
};
