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

// Add to window for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).clearAllCache = clearAllCache;
}
