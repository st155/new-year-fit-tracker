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
  // Added fields for dead connection detection
  last_webhook_date?: string | null;
  days_since_webhook?: number | null;
  is_dead?: boolean;
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

export function useRequestHistoricalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { terra_user_id: string; days?: number }) => {
      const { data, error } = await supabase.functions.invoke('terra-request-historical', {
        body: params
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(`Запрос исторических данных отправлен: ${data.message}`);
    },
    onError: (error: Error) => {
      toast.error(`Ошибка запроса данных: ${error.message}`);
    }
  });
}

// Get all Terra users for a reference_id from Terra API
export interface TerraApiUser {
  user_id: string;
  provider: string;
  last_webhook_update?: string;
  scopes?: string;
  reference_id?: string;
}

export function useGetTerraUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'get-terra-users', data: { targetUserId } }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as { success: boolean; users: TerraApiUser[]; reference_id: string };
    },
    onError: (error: Error) => {
      toast.error(`Ошибка получения Terra users: ${error.message}`);
    }
  });
}

// Deauthenticate a single Terra user
export function useDeauthTerraUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { terraUserId: string; provider?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'deauth-user', data: params }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success('Terra пользователь деавторизован');
    },
    onError: (error: Error) => {
      toast.error(`Ошибка деавторизации: ${error.message}`);
    }
  });
}

// Deauthenticate all Terra connections for a user by reference_id
export function useDeauthAllTerraUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { targetUserId: string; providerFilter?: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
        body: { action: 'deauth-all', data: params }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as { 
        success: boolean; 
        deauthenticated: number; 
        total: number; 
        results: Array<{ terraUserId: string; provider: string; success: boolean; error?: string }>;
        localTokensDeleted: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(`Сброшено ${data.deauthenticated} подключений из ${data.total}`);
    },
    onError: (error: Error) => {
      toast.error(`Ошибка сброса подключений: ${error.message}`);
    }
  });
}

// Programmatic deauth for specific user - can be called directly
export async function deauthUserConnections(targetUserId: string): Promise<{
  success: boolean;
  deauthenticated: number;
  total: number;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke('admin-terra-tokens', {
    body: { action: 'deauth-all', data: { targetUserId } }
  });

  if (error) {
    console.error('Deauth error:', error);
    return { success: false, deauthenticated: 0, total: 0, error: error.message };
  }
  
  if (data.error) {
    return { success: false, deauthenticated: 0, total: 0, error: data.error };
  }
  
  return {
    success: true,
    deauthenticated: data.deauthenticated || 0,
    total: data.total || 0,
  };
}
