import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const CACHE_CLEAR_KEY = 'last_cache_clear';
const CACHE_CLEAR_INTERVAL = 24 * 60 * 60 * 1000; // 24 часа

export function useAutoCacheClear() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAndClearCache = () => {
      try {
        const lastClear = localStorage.getItem(CACHE_CLEAR_KEY);
        const now = Date.now();

        // Если кеш никогда не чистился или прошло больше 24 часов
        if (!lastClear || now - parseInt(lastClear) > CACHE_CLEAR_INTERVAL) {
          console.log('🧹 Auto-clearing caches (24h interval)');
          
          // Очистка localStorage кешей
          const keysToRemove = [
            'fitness_metrics_cache',
            'fitness_data_cache_whoop',
            'fitness_data_cache',
            'metrics_view_mode',
            'metrics_device_filter'
          ];
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
          });
          
          // Очистка кешей с префиксами
          Object.keys(localStorage).forEach(key => {
            if (key.includes('whoop') || 
                key.includes('fitness') || 
                key.startsWith('progress_cache_')) {
              localStorage.removeItem(key);
            }
          });
          
          // Инвалидация React Query кешей
          queryClient.invalidateQueries({ queryKey: ['metric_values'] });
          queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['widgets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
          
          // Сохраняем новый timestamp
          localStorage.setItem(CACHE_CLEAR_KEY, now.toString());
          
          console.log('✅ Auto-cache clear completed');
        } else {
          const hoursUntilNext = Math.ceil((CACHE_CLEAR_INTERVAL - (now - parseInt(lastClear))) / (1000 * 60 * 60));
          console.log(`⏱️ Next auto-cache clear in ${hoursUntilNext} hours`);
        }
      } catch (error) {
        console.error('Auto-cache clear error:', error);
      }
    };

    // Запускаем проверку при монтировании компонента
    checkAndClearCache();
  }, [queryClient]);
}
