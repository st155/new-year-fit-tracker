import { supabase } from '@/integrations/supabase/client';
import { terraApi } from './api/client';

export interface SyncResult {
  provider: string;
  success: boolean;
  error?: string;
}

/**
 * Синхронизирует данные из всех активных источников пользователя
 */
export async function syncAllSources(userId: string): Promise<SyncResult[]> {
  console.log('🔄 [syncAllSources] Starting sync for user:', userId);
  
  // Получаем все активные токены пользователя
  const { data: tokens, error: tokensError } = await supabase
    .from('terra_tokens')
    .select('provider, is_active')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (tokensError) {
    console.error('❌ [syncAllSources] Failed to fetch tokens:', tokensError);
    return [];
  }

  if (!tokens || tokens.length === 0) {
    console.log('⚠️ [syncAllSources] No active tokens found');
    return [];
  }

  console.log(`📡 [syncAllSources] Found ${tokens.length} active sources:`, tokens.map(t => t.provider));

  // Параллельная синхронизация всех источников
  const syncPromises = tokens.map(async (token) => {
    try {
      console.log(`🔄 [syncAllSources] Syncing ${token.provider}...`);
      
      const { error } = await supabase.functions.invoke('terra-integration', {
        body: { 
          action: 'sync-data',
          provider: token.provider // Pass provider for targeted sync if needed
        }
      });

      if (error) {
        console.error(`❌ [syncAllSources] ${token.provider} sync failed:`, error);
        return {
          provider: token.provider,
          success: false,
          error: error.message
        };
      }

      console.log(`✅ [syncAllSources] ${token.provider} sync completed`);
      return {
        provider: token.provider,
        success: true
      };
    } catch (error: any) {
      console.error(`❌ [syncAllSources] ${token.provider} sync exception:`, error);
      return {
        provider: token.provider,
        success: false,
        error: error.message
      };
    }
  });

  const results = await Promise.all(syncPromises);
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ [syncAllSources] Completed: ${successCount} success, ${failCount} failed`);
  
  return results;
}

/**
 * Проверяет, нужна ли синхронизация (данные старше 1 дня)
 */
export async function shouldSync(userId: string): Promise<boolean> {
  const { data: metrics } = await supabase
    .from('unified_metrics')
    .select('measurement_date')
    .eq('user_id', userId)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!metrics) {
    console.log('🔄 [shouldSync] No metrics found, sync needed');
    return true;
  }

  const lastUpdate = new Date(metrics.measurement_date);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

  const needsSync = hoursSinceUpdate > 24;
  console.log(`🔄 [shouldSync] Last update: ${hoursSinceUpdate.toFixed(1)}h ago, needs sync: ${needsSync}`);
  
  return needsSync;
}

/**
 * Получает время последней синхронизации из localStorage
 */
export function getLastSyncTime(): Date | null {
  const timestamp = localStorage.getItem('last_sync_time');
  return timestamp ? new Date(parseInt(timestamp)) : null;
}

/**
 * Сохраняет время синхронизации в localStorage
 */
export function setLastSyncTime(date: Date = new Date()): void {
  localStorage.setItem('last_sync_time', date.getTime().toString());
}

/**
 * Проверяет, можно ли запустить синхронизацию (не чаще 1 раза в 15 минут)
 */
export function canSync(): boolean {
  const lastSync = getLastSyncTime();
  if (!lastSync) return true;

  const now = new Date();
  const minutesSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60);
  
  const canSyncNow = minutesSinceSync >= 15;
  console.log(`🔄 [canSync] Last sync: ${minutesSinceSync.toFixed(1)}m ago, can sync: ${canSyncNow}`);
  
  return canSyncNow;
}
