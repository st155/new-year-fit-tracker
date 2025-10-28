import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  successMessage = 'Refreshed successfully',
  errorMessage = 'Failed to refresh',
  showToast = true,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    
    try {
      await onRefresh();
      
      if (showToast) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
    } catch (error) {
      logger.error('Pull to refresh error', error);
      
      if (showToast) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing, successMessage, errorMessage, showToast]);

  return {
    isRefreshing,
    handleRefresh,
  };
}
