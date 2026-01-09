import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, terraApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
      const { data, error } = await adminApi.terraTokens.list();

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return (data as any)?.tokens as TerraToken[];
    },
    refetchInterval: 30000,
  });
}

export function useUsersList() {
  return useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const { data, error } = await adminApi.terraTokens.list();
      // Note: this should use a different action 'list_users', but for now reusing the interface
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return (data as any)?.users as UserProfile[];
    },
  });
}

export function useCreateTerraToken() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (params: { user_id: string; terra_user_id: string; provider: string }) => {
      const { data, error } = await adminApi.terraTokens.create(params);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return (data as any)?.token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.tokenCreated'));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.tokenCreateError', { error: error.message }));
    }
  });
}

export function useUpdateTerraToken() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (params: { 
      id: string; 
      terra_user_id?: string; 
      provider?: string; 
      is_active?: boolean;
    }) => {
      const { data, error } = await adminApi.terraTokens.update(params);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return (data as any)?.token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.tokenUpdated'));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.tokenUpdateError', { error: error.message }));
    }
  });
}

export function useDeleteTerraToken() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await adminApi.terraTokens.delete(id);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.tokenDeleted'));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.tokenDeleteError', { error: error.message }));
    }
  });
}

export function useRequestHistoricalData() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (params: { terra_user_id: string; days?: number }) => {
      const { data, error } = await terraApi.requestHistorical(params.terra_user_id, params.days);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.historicalDataRequested', { message: (data as any)?.message }));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.historicalDataError', { error: error.message }));
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
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      // This would need a separate API method; using the general interface
      const { data, error } = await adminApi.terraTokens.list();
      // Note: This needs to be adapted to use a proper 'get-terra-users' action
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return data as unknown as { success: boolean; users: TerraApiUser[]; reference_id: string };
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.getUsersError', { error: error.message }));
    }
  });
}

// Deauthenticate a single Terra user
export function useDeauthTerraUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (params: { terraUserId: string; provider?: string }) => {
      const { data, error } = await adminApi.terraTokens.deauthUser(params.terraUserId, params.provider);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.userDeauthenticated'));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.deauthError', { error: error.message }));
    }
  });
}

// Deauthenticate all Terra connections for a user by reference_id
export function useDeauthAllTerraUsers() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationFn: async (params: { targetUserId: string; providerFilter?: string }) => {
      const { data, error } = await adminApi.terraTokens.deauthAll(params.targetUserId, params.providerFilter);

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      
      return data as unknown as { 
        success: boolean; 
        deauthenticated: number; 
        total: number; 
        results: Array<{ terraUserId: string; provider: string; success: boolean; error?: string }>;
        localTokensDeleted: number;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-terra-tokens'] });
      toast.success(t('terraToken.connectionsReset', { count: data.deauthenticated, total: data.total }));
    },
    onError: (error: Error) => {
      toast.error(t('terraToken.resetError', { error: error.message }));
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
  const { data, error } = await adminApi.terraTokens.deauthAll(targetUserId);

  if (error) {
    console.error('Deauth error:', error);
    return { success: false, deauthenticated: 0, total: 0, error: error.message };
  }
  
  if ((data as any)?.error) {
    return { success: false, deauthenticated: 0, total: 0, error: (data as any).error };
  }
  
  return {
    success: true,
    deauthenticated: (data as any)?.deauthenticated || 0,
    total: (data as any)?.total || 0,
  };
}
