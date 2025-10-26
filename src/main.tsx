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

// Two-phase safe boot: shell first, then dynamic App import
async function boot() {
  console.time('boot');
  console.log('🚀 [Boot] Starting application...');
  
  const reactRoot = createRoot(root);
  
  try {
    // Phase 1: Immediately mount minimal shell
    console.log('🎨 [Boot] Phase 1: Mounting shell...');
    reactRoot.render(
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0b0b0b',
        color: '#6ee7b7',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px'
      }}>
        Loading application...
      </div>
    );
    
    (window as any).__react_mounted__ = true;
    console.log('✅ [Boot] Shell mounted, React marked as mounted');
    
    // Pre-check (non-blocking)
    preCheckModuleSafe();
    
    // Phase 2: Dynamic import with timeout
    console.log('📦 [Boot] Phase 2: Importing App module...');
    
    const importWithTimeout = () => {
      return Promise.race([
        import('./App.tsx').then(module => module.default),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('App import timeout (8 seconds)')), 8000)
        )
      ]);
    };
    
    const App = await importWithTimeout() as any;
    
    console.log('🎨 [Boot] Rendering full App...');
    reactRoot.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('✅ [Boot] Full app rendered successfully');
    console.timeEnd('boot');
    
  } catch (err) {
    console.error('💥 [Boot] App load/mount failed:', err);
    
    // Show fallback UI with detailed error
    console.log('🛑 [Boot] Showing fallback error UI');
    const errorMessage = err instanceof Error 
      ? `${err.message}\n\nCheck console for details. This may be caused by:\n- Network issues loading modules\n- CSP blocking resources\n- Service Worker conflicts`
      : String(err);
    
    reactRoot.render(<BootError message={errorMessage} />);
    (window as any).__react_mounted__ = true;
    console.timeEnd('boot');
  }
}

// Start boot process
boot();

// Watchdog: Backup check (shell should mount immediately now)
setTimeout(() => {
  if (!(window as any).__react_mounted__) {
    console.error('💥 [Boot] Shell failed to mount in 3 seconds (critical)');
    const diagnosis = [
      'Critical: Even shell failed to mount.',
      'Possible causes:',
      '- React libraries blocked by CSP',
      '- Severe JavaScript errors',
      '- Browser compatibility issues',
      'Check console for specific errors above.'
    ].join('\n');
    
    const fallbackRoot = document.getElementById('root');
    if (fallbackRoot) {
      createRoot(fallbackRoot).render(<BootError message={diagnosis} />);
      (window as any).__react_mounted__ = true;
    }
  }
}, 3000);
