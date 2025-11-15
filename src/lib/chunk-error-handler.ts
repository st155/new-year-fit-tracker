/**
 * Обработка ошибок динамической загрузки чанков
 * Автоматически перезагружает страницу при ChunkLoadError
 */
export const handleChunkError = (error: Error): boolean => {
  const isChunkError = 
    error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed') ||
    error.message.includes('Failed to load module');

  if (isChunkError) {
    const hasReloaded = sessionStorage.getItem('chunk-error-reload');
    
    if (!hasReloaded) {
      sessionStorage.setItem('chunk-error-reload', 'true');
      console.warn('🔄 [ChunkError] Reloading page due to chunk load failure');
      window.location.reload();
      return true;
    } else {
      sessionStorage.removeItem('chunk-error-reload');
      console.error('❌ [ChunkError] Reload failed, clearing cache recommended');
    }
  }
  
  return false;
};

// Очистка флага перезагрузки при успешной загрузке
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    sessionStorage.removeItem('chunk-error-reload');
  });
}
