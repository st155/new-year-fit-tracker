/**
 * Utility functions for cache management
 */

export const clearAllCache = () => {
  console.log('🗑️ [Cache] Clearing all cache');
  
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  console.log('✅ [Cache] Cache cleared', {
    localStorageKeys: keysToRemove,
    timestamp: new Date().toISOString()
  });
};

/**
 * Check if cached data is stale (older than 24 hours)
 */
export const isCacheStale = (cacheKey: string): boolean => {
  const cacheData = localStorage.getItem(cacheKey);
  if (!cacheData) return false;
  
  try {
    const parsed = JSON.parse(cacheData);
    const timestamp = parsed.timestamp;
    if (!timestamp) return false;
    
    const hoursAgo = (Date.now() - timestamp) / (1000 * 60 * 60);
    return hoursAgo > 24;
  } catch {
    return false;
  }
};

/**
 * Clear stale Whoop caches (older than 24h)
 */
export const clearStaleWhoopCache = () => {
  const whoopKeys = ['fitness_metrics_cache', 'fitness_data_cache_whoop', 'fitness_data_cache'];
  let clearedCount = 0;
  
  whoopKeys.forEach(key => {
    if (isCacheStale(key)) {
      localStorage.removeItem(key);
      clearedCount++;
      console.log(`🧹 Cleared stale cache: ${key}`);
    }
  });
  
  // Also check all keys with whoop/fitness prefix
  Object.keys(localStorage).forEach(key => {
    if ((key.includes('whoop') || key.includes('fitness') || key.startsWith('progress_cache_')) && isCacheStale(key)) {
      localStorage.removeItem(key);
      clearedCount++;
      console.log(`🧹 Cleared stale cache: ${key}`);
    }
  });
  
  if (clearedCount > 0) {
    console.log(`✅ Cleared ${clearedCount} stale cache entries`);
  }
  
  return clearedCount;
};

// Add to window for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllCache = clearAllCache;
  (window as any).clearStaleWhoopCache = clearStaleWhoopCache;
}
