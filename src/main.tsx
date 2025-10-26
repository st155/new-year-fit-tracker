import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./index-inbody-styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Pre-boot: Clear SW and caches on dev domains (before any imports)
const isDevHost = location.hostname.endsWith('.lovableproject.com') || location.hostname === 'localhost';
(async () => {
  const autoRecoveryDisabled = sessionStorage.getItem('__auto_recovery_disabled');
  if (isDevHost && !autoRecoveryDisabled && 'serviceWorker' in navigator && navigator.serviceWorker.controller && !sessionStorage.getItem('__sw_cleared_once')) {
    console.log('🧹 [Boot] Clearing SW on dev domain...');
    sessionStorage.setItem('__sw_cleared_once', '1');
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
      console.log('✅ [Boot] SW unregistered');
    } catch (err) {
      console.warn('⚠️ [Boot] Failed to unregister SW:', err);
    }
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
        console.log('✅ [Boot] Caches cleared');
      } catch (err) {
        console.warn('⚠️ [Boot] Failed to clear caches:', err);
      }
    }
    location.reload();
    await new Promise(() => {}); // stop further execution
  }
})();

// Global error logging
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

// CSP violation logging
document.addEventListener('securitypolicyviolation', (e) => {
  console.error('🚫 [Global] CSP violation:', {
    blockedURI: (e as any).blockedURI,
    directive: (e as any).effectiveDirective,
  });
});

// Pre-check: verify module availability (non-blocking with timeout)
function preCheckModuleSafe(timeoutMs = 1500) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('precheck timeout')), timeoutMs)
  );
  return Promise.race([
    fetch('/src/App.tsx', { cache: 'no-cache' }),
    timeout,
  ])
  .then((res) => {
    if (res instanceof Response) {
      if (!res.ok) throw new Error(`/src/App.tsx status ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) throw new Error('returned HTML');
    }
  })
  .catch((e) => console.warn('⚠️ [Boot] precheck warning:', e));
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
  
  // Wait for cleanup
  await new Promise(resolve => setTimeout(resolve, 300));
}

// Fallback UI component
function BootError({ message }: { message: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0b0b',
      color: '#ff6b6b',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '8px', fontWeight: 600 }}>Boot Error</h1>
      <p style={{ color: '#aaa', maxWidth: '760px', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
        {message}
      </p>
      <p style={{ color: '#666', fontSize: '14px', maxWidth: '600px', marginBottom: '24px' }}>
        Check browser console for details. Try recovery to clear caches and service workers.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={async () => {
            const attempts = Number(sessionStorage.getItem('__auto_recover_attempts') || '0');
            sessionStorage.setItem('__auto_recover_attempts', String(attempts + 1));
            sessionStorage.setItem('__auto_recover_ts', String(Date.now()));
            await performRecovery();
            window.location.reload();
          }}
          style={{
            padding: '10px 16px',
            background: '#6ee7b7',
            borderRadius: '8px',
            color: '#0b0b0b',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Run Recovery
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 16px',
            background: '#374151',
            borderRadius: '8px',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

// Safe boot with dynamic import and recovery
async function boot() {
  console.time('boot');
  console.log('🚀 [Boot] Starting application...');
  
  try {
    // Pre-check (non-blocking, doesn't block boot)
    preCheckModuleSafe();
    
    // Try to import App with timeout
    console.log('📦 [Boot] Importing App module...');
    const importApp = Promise.race([
      import('./App.tsx'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Import timeout')), 10000)),
    ]) as Promise<{ default: React.ComponentType }>;
    const { default: App } = await importApp;
    
    console.log('🎨 [Boot] Rendering App...');
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    (window as any).__react_mounted__ = true;
    console.log('✅ [Boot] React mounted successfully');
    console.timeEnd('boot');
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('💥 [Boot] First import failed:', err);
    
    // If this is a module fetch error or timeout, check if we should auto-recover
    if (errorMessage.includes('Import timeout') || errorMessage.includes('Failed to fetch dynamically imported module')) {
      const attempts = Number(sessionStorage.getItem('__auto_recover_attempts') || '0');
      const lastTs = Number(sessionStorage.getItem('__auto_recover_ts') || '0');
      const now = Date.now();
      const thrashing = now - lastTs < 5000;
      
      if (attempts >= 2 || thrashing) {
        sessionStorage.setItem('__auto_recovery_disabled', '1');
        console.warn('🛑 [Boot] Auto-recovery disabled. attempts=', attempts, 'thrashing=', thrashing);
        createRoot(root).render(
          <BootError message="Auto-recovery stopped after multiple attempts. Check console logs or try Reload/Run Recovery once manually." />
        );
        (window as any).__react_mounted__ = true;
        console.timeEnd('boot');
        return;
      }
      
      sessionStorage.setItem('__auto_recover_attempts', String(attempts + 1));
      sessionStorage.setItem('__auto_recover_ts', String(now));
      console.log('🔄 [Boot] Import issue detected, performing recovery (attempt', attempts + 1, ')...');
      await performRecovery();
      location.reload();
      return;
    }
    
    // Try recovery once for other errors
    const alreadyRecovered = sessionStorage.getItem('__boot_recovered') === '1';
    
    if (!alreadyRecovered) {
      console.log('🔄 [Boot] Attempting recovery...');
      sessionStorage.setItem('__boot_recovered', '1');
      
      try {
        await performRecovery();
        
        console.log('📦 [Boot] Retrying App import after recovery...');
        const { default: App } = await import('./App.tsx');
        
        createRoot(root).render(
          <StrictMode>
            <App />
          </StrictMode>
        );
        
        (window as any).__react_mounted__ = true;
        console.log('✅ [Boot] React mounted successfully after recovery');
        console.timeEnd('boot');
        return;
        
      } catch (err2) {
        console.error('💥 [Boot] Import failed after recovery:', err2);
      }
    }
    
    // Show fallback UI
    console.log('🛑 [Boot] Showing fallback error UI');
    const fallbackMessage = err instanceof Error ? err.message : String(err);
    createRoot(root).render(<BootError message={fallbackMessage} />);
    (window as any).__react_mounted__ = true;
    console.timeEnd('boot');
  }
}

// Start boot process
boot();
