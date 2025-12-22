import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TerraToken {
  id: string;
  user_id: string;
  provider: string;
  terra_user_id: string | null;
  is_active: boolean;
  last_sync_date: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
  profile: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useTerraTokens() {
  return useQuery({
    queryKey: ['admin-terra-tokens'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'list' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.tokens as TerraToken[];
    },
    refetchInterval: 30000,
  });
}

export function useUsersList() {
  return useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'list_users' }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.users as UserProfile[];
    },
  });
}

export function useCreateTerraToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { user_id: string; terra_user_id: string; provider: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'create', data: params }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success('Токен успешно создан');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка создания токена: ${error.message}`);
    }
  });
}

export function useUpdateTerraToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      id: string; 
      terra_user_id?: string; 
      provider?: string; 
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'update', data: params }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success('Токен успешно обновлён');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка обновления: ${error.message}`);
    }
  });
}

export function useDeleteTerraToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'delete', data: { id } }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success('Токен удалён');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка удаления: ${error.message}`);
    }
  });
}
