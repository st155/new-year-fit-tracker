import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./index-inbody-styles.css";
import App from "./App.tsx";
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

// Cache busting removed - Vite doesn't support variable paths in dev mode

// Pre-check: verify module availability
async function preCheckModule() {
  try {
    const response = await fetch('/src/App.tsx', { cache: 'no-cache' });
    if (!response.ok) {
      const msg = `/src/App.tsx вернул статус ${response.status} — подозрение на кэш/прокси/CSP`;
      console.error('⚠️ [Boot]', msg);
      if ((window as any).__lastErrors) {
        (window as any).__lastErrors.push(msg);
      }
      return false;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const msg = '/src/App.tsx вернул HTML вместо модуля — подозрение на кэш/прокси';
      console.error('⚠️ [Boot]', msg);
      if ((window as any).__lastErrors) {
        (window as any).__lastErrors.push(msg);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('⚠️ [Boot] Pre-check failed:', err);
    return true; // Don't block boot on pre-check failure
  }
}

// Smart recovery: clear caches and unregister SW
async function performRecovery() {
  console.log('🔧 [Boot] Performing recovery...');
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      console.log('✅ [Boot] Service Workers unregistered');
    } catch (err) {
      console.warn('⚠️ [Boot] Failed to unregister SW:', err);
    }
  }
  
  // Clear all caches
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('✅ [Boot] Caches cleared');
    } catch (err) {
      console.warn('⚠️ [Boot] Failed to clear caches:', err);
    }
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 200));
}

// Static import and immediate mount (dev-stable)
console.time('boot');
console.log('🚀 [Boot] Mounting React App...');
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
console.timeEnd('boot');
