import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./index-inbody-styles.css";
// Temporarily disabled for debugging
// import { startPerformanceMonitoring } from "./lib/performance-monitor";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Global error logging - now in production too
window.addEventListener('error', (e) => {
  console.error('💥 [Global] Uncaught error:', (e as ErrorEvent).error);
  if ((window as any).__lastErrors) {
    (window as any).__lastErrors.push(`Error: ${e.message} at ${e.filename}:${e.lineno}`);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 [Global] Unhandled promise rejection:', (e as PromiseRejectionEvent).reason);
  if ((window as any).__lastErrors) {
    (window as any).__lastErrors.push(`Promise rejection: ${e.reason}`);
  }
});

// Temporarily disabled for debugging
// if (typeof window !== 'undefined') {
//   startPerformanceMonitoring();
// }

// Retry logic for dynamic imports (handles cache issues)
async function importWithRetry<T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.warn(`⚠️ [Boot] Import failed, retrying (${retries} attempts left)...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return importWithRetry(importFn, retries - 1, delay * 2);
  }
}

// Dynamic import with error handling
(async () => {
  try {
    console.log('🚀 [Boot] Starting dynamic import of App...');
    
    const { default: App } = await importWithRetry(
      () => import("./App.tsx")
    );
    
    console.log('✅ [Boot] App imported successfully, mounting React...');
    
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );

    // Signal that React has successfully mounted
    if (typeof window !== 'undefined') {
      (window as any).__react_mounted__ = true;
      console.log('✅ [Boot] React mounted successfully');
    }
  } catch (error) {
    console.error('💥 [Boot] Failed to import or mount App:', error);
    
    // Store error for debug overlay
    if ((window as any).__lastErrors) {
      const errorMsg = error instanceof Error 
        ? `${error.name}: ${error.message}\n${error.stack}` 
        : String(error);
      (window as any).__lastErrors.push(`Import/Mount error: ${errorMsg}`);
    }
    
    // Handle cache-related errors with automatic reload
    if (error instanceof TypeError && 
        (error.message.includes('Failed to fetch') || 
         error.message.includes('dynamically imported module'))) {
      console.warn('🔄 [Boot] Cache issue detected, prompting reload...');
      
      const shouldReload = confirm(
        'Обнаружена новая версия приложения. Перезагрузить страницу для обновления?'
      );
      
      if (shouldReload) {
        // Force reload, bypassing cache
        window.location.reload();
        return;
      }
    }
    
    // Show debug overlay if available
    const overlay = document.getElementById('boot-debug-overlay');
    if (overlay) {
      overlay.style.display = 'block';
      console.log('🔍 [Boot] Debug overlay shown');
    }
    
    throw error;
  }
})();
