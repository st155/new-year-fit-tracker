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
        // Check user_roles table
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['trainer', 'admin']);

        if (roles && roles.length > 0) {
          setRole('trainer');
        } else {
          // Fallback to old trainer_role system
          const { data: profile } = await supabase
            .from('profiles')
            .select('trainer_role')
            .eq('user_id', user.id)
            .single();

          setRole(profile?.trainer_role ? 'trainer' : 'user');
        }
      } catch (error) {
        console.error('Error checking role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { role, isTrainer: role === 'trainer', loading };
};
