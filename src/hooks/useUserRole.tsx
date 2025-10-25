import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<'trainer' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      console.log('🔍 [useUserRole] Starting role check', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        userEmail: user?.email
      });

      if (!user) {
        console.log('⚠️ [useUserRole] No user found, setting role to null');
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const startTime = performance.now();

        // Timeout for all queries
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Role check timeout')), 8000)
        );

        // Check user_roles table
        const rolesStart = performance.now();
        const rolesPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['trainer', 'admin']);

        const { data: roles, error: rolesError } = await Promise.race([
          rolesPromise,
          timeoutPromise
        ]) as any;
        const rolesTime = performance.now() - rolesStart;

        console.log('📊 [useUserRole] user_roles query result', {
          userId: user.id,
          roles: roles?.map(r => r.role) || [],
          error: rolesError,
          queryTime: `${rolesTime.toFixed(2)}ms`
        });

        // Check profiles table
        const profileStart = performance.now();
        const profilePromise = supabase
          .from('profiles')
          .select('trainer_role, username, full_name')
          .eq('user_id', user.id)
          .single();

        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;
        const profileTime = performance.now() - profileStart;

        console.log('👤 [useUserRole] profiles query result', {
          userId: user.id,
          trainerRole: profile?.trainer_role,
          username: profile?.username,
          error: profileError,
          queryTime: `${profileTime.toFixed(2)}ms`
        });

        const hasRolePermission = roles && roles.length > 0;
        const hasActiveTrainerRole = profile?.trainer_role === true;
        const finalIsTrainer = hasRolePermission && hasActiveTrainerRole;

        console.log('✅ [useUserRole] Role determination complete', {
          userId: user.id,
          hasRolePermission,
          hasActiveTrainerRole,
          finalIsTrainer,
          computedRole: finalIsTrainer ? 'trainer' : 'user',
          totalTime: `${(performance.now() - startTime).toFixed(2)}ms`
        });

        // Warning for inconsistent state
        if (hasRolePermission && !hasActiveTrainerRole) {
          console.warn('⚠️ [useUserRole] INCONSISTENT STATE: User has trainer role in user_roles but trainer_role=false in profiles');
        }
        if (!hasRolePermission && hasActiveTrainerRole) {
          console.warn('⚠️ [useUserRole] INCONSISTENT STATE: User has trainer_role=true in profiles but no role in user_roles');
        }

        setRole(finalIsTrainer ? 'trainer' : 'user');
      } catch (error) {
        console.error('❌ [useUserRole] Error checking role:', error);
        setRole('user');
      } finally {
        setLoading(false);
        console.log('🏁 [useUserRole] Role check completed', { 
          userId: user.id,
          finalRole: role
        });
      }
    };

    checkRole();
  }, [user]);

  return { role, isTrainer: role === 'trainer', loading };
};
