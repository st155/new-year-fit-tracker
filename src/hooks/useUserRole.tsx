import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<'trainer' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
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

        // Check profiles table
        const profilePromise = supabase
          .from('profiles')
          .select('trainer_role, username, full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        const hasRolePermission = roles && roles.length > 0;
        const hasActiveTrainerRole = profile?.trainer_role === true;
        const finalIsTrainer = hasRolePermission && hasActiveTrainerRole;

        // Log inconsistent state only in dev
        if (import.meta.env.DEV) {
          if (hasRolePermission && !hasActiveTrainerRole) {
            console.warn('⚠️ [useUserRole] INCONSISTENT STATE: User has trainer role in user_roles but trainer_role=false in profiles');
          }
          if (!hasRolePermission && hasActiveTrainerRole) {
            console.warn('⚠️ [useUserRole] INCONSISTENT STATE: User has trainer_role=true in profiles but no role in user_roles');
          }
        }

        setRole(finalIsTrainer ? 'trainer' : 'user');
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('❌ [useUserRole] Error checking role:', error);
        }
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { role, isTrainer: role === 'trainer', loading };
};
