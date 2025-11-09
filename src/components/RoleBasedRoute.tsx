import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';
import { FORCE_CLIENT_ROLE } from '@/lib/safe-flags';
import { useEffect, useState } from 'react';

interface RoleBasedRouteProps {
  children: React.ReactNode;
}

export const RoleBasedRoute = ({ children }: RoleBasedRouteProps) => {
  const { isTrainer, loading, rolesLoading } = useAuth();
  const [forceReady, setForceReady] = useState(false);

  console.log('👤 [RoleBasedRoute] State:', { 
    isTrainer, 
    loading, 
    rolesLoading,
    FORCE_CLIENT_ROLE 
  });

  // Preview окружение: пропустить проверку ролей
  if (FORCE_CLIENT_ROLE) {
    console.log('🏳️ [RoleBasedRoute] FORCE_CLIENT_ROLE enabled, skipping role check');
    return <>{children}</>;
  }

  // Таймаут: если роли не загрузились за 2 секунды, показать контент
  useEffect(() => {
    if (rolesLoading && !loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ [RoleBasedRoute] Roles timeout, forcing render');
        setForceReady(true);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [rolesLoading, loading]);

  // Wait for both auth and roles to load (with timeout override)
  if ((loading || rolesLoading) && !forceReady) {
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
