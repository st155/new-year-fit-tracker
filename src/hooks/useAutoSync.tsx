import { useState, useEffect, useCallback } from 'react';
import { syncAllSources, shouldSync, canSync, setLastSyncTime } from '@/lib/sync-utils';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook для автоматической синхронизации данных
 * - Проверяет при монтировании, нужна ли синхронизация
 * - Ограничивает частоту синхронизации (не чаще 1 раза в 15 минут)
 * - Предоставляет функцию для ручной синхронизации
 */
export function useAutoSync(userId: string | undefined) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Auto-sync при монтировании компонента (если нужно)
  useEffect(() => {
    if (!userId) return;

    const checkAndSync = async () => {
      console.log('🔄 [useAutoSync] Checking if sync needed...');
      
      // Проверяем, не было ли недавней синхронизации
      if (!canSync()) {
        console.log('⏭️ [useAutoSync] Skipping auto-sync (too recent)');
        return;
      }

      // Проверяем, нужна ли синхронизация (данные старше 24ч)
      const needsSync = await shouldSync(userId);
      if (!needsSync) {
        console.log('✅ [useAutoSync] Data is fresh, no sync needed');
        return;
      }

      console.log('🚀 [useAutoSync] Auto-syncing stale data...');
      setIsSyncing(true);

      try {
        const results = await syncAllSources(userId);
        setLastSyncTime();

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (successCount > 0) {
          toast({
            title: 'Данные обновлены',
            description: `Синхронизировано источников: ${successCount}${failCount > 0 ? ` (${failCount} ошибок)` : ''}`,
          });
        }

        if (failCount > 0 && successCount === 0) {
          toast({
            title: 'Ошибка синхронизации',
            description: 'Не удалось обновить данные. Проверьте подключения.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('❌ [useAutoSync] Auto-sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Запускаем проверку через 2 секунды после монтирования (не мешаем первичной загрузке)
    const timeoutId = setTimeout(checkAndSync, 2000);

    return () => clearTimeout(timeoutId);
  }, [userId, toast]);

  // Функция для ручной синхронизации (для кнопки "Обновить")
  const syncAllData = useCallback(async () => {
    if (!userId || isSyncing) return;

    console.log('🔄 [useAutoSync] Manual sync triggered');
    setIsSyncing(true);

    try {
      const results = await syncAllSources(userId);
      setLastSyncTime();

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: 'Синхронизация завершена',
          description: `Обновлено источников: ${successCount}${failCount > 0 ? ` (${failCount} ошибок)` : ''}`,
        });
      }

      if (failCount > 0) {
        const failedProviders = results
          .filter(r => !r.success)
          .map(r => r.provider)
          .join(', ');
        
        toast({
          title: successCount > 0 ? 'Частичная синхронизация' : 'Ошибка синхронизации',
          description: `Не удалось обновить: ${failedProviders}`,
          variant: successCount > 0 ? 'default' : 'destructive',
        });
      }

      if (successCount === 0 && failCount === 0) {
        toast({
          title: 'Нет активных источников',
          description: 'Подключите устройства в разделе Интеграции',
        });
      }
    } catch (error: any) {
      console.error('❌ [useAutoSync] Manual sync failed:', error);
      toast({
        title: 'Ошибка синхронизации',
        description: error.message || 'Не удалось обновить данные',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing, toast]);

  return {
    isSyncing,
    syncAllData,
  };
}
