import React, { StrictMode } from "react";
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

// Enhanced pre-check with dependency analysis
async function preCheckModuleSafe() {
  const isDev = window.location.hostname.includes('lovableproject.com') || window.location.hostname === 'localhost';
  if (!isDev) return;

  try {
    console.group('🔍 [Pre-check] Analyzing App.tsx');
    
    const ts = Date.now();
    const res = await fetch(`/src/App.tsx?precheck=1&ts=${ts}`, {
      cache: 'no-cache'
    });
    
    const status = res.status;
    const contentType = res.headers.get('content-type') || 'unknown';
    const contentLength = res.headers.get('content-length') || 'unknown';
    
    console.log(`Status: ${status}, Type: ${contentType}, Length: ${contentLength}`);
    
    if (!res.ok) {
      console.warn(`❌ RED FLAG: App.tsx returned ${status}`);
      console.groupEnd();
      return;
    }
    
    const body = await res.text();
    console.log(`First 400 chars: ${body.substring(0, 400)}`);
    
    if (contentType.includes('text/html')) {
      console.warn('❌ RED FLAG: App.tsx returned HTML instead of JavaScript!');
    }
    
    // Parse Vite dependencies
    const depRegex = /from\s+["']([^"']*\/node_modules\/\.vite\/deps\/[^"']+)["']/g;
    const deps = [...body.matchAll(depRegex)].map(m => m[1]);
    const uniqueDeps = [...new Set(deps)];
    
    console.log(`Found ${uniqueDeps.length} Vite dependencies`);
    
    // Check each dependency
    for (const depUrl of uniqueDeps) {
      try {
        const depRes = await fetch(`${depUrl}${depUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const depStatus = depRes.status;
        const depType = depRes.headers.get('content-type') || 'unknown';
        
        if (depStatus >= 400) {
          console.warn(`❌ RED FLAG: ${depUrl} → ${depStatus}`);
        } else if (depType.includes('text/html')) {
          console.warn(`❌ RED FLAG: ${depUrl} → HTML response`);
        } else {
          console.log(`✅ ${depUrl.split('/').pop()} → ${depStatus}`);
        }
      } catch (err) {
        console.warn(`❌ RED FLAG: ${depUrl} → ${(err as Error).message}`);
      }
    }
    
    console.groupEnd();
  } catch (err) {
    console.warn('⚠️ [Pre-check] Failed:', err);
    console.groupEnd();
  }
}

// Collect detailed diagnostics
async function collectDiagnostics(error: unknown) {
  const diag: any = {
    timestamp: new Date().toISOString(),
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    },
    browser: {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled
    },
    performance: {
      resources: performance.getEntriesByType('resource').slice(-50).map((e: any) => ({
        name: e.name,
        duration: e.duration,
        transferSize: e.transferSize
      }))
    }
  };
  
  try {
    // Check App.tsx
    const appRes = await fetch(`/src/App.tsx?diag=${Date.now()}`, { cache: 'no-cache' });
    diag.appModule = {
      status: appRes.status,
      contentType: appRes.headers.get('content-type'),
      contentLength: appRes.headers.get('content-length'),
      preview: (await appRes.text()).substring(0, 400)
    };
    
    // Parse and check dependencies
    const depRegex = /from\s+["']([^"']*\/node_modules\/\.vite\/deps\/[^"']+)["']/g;
    const deps = [...diag.appModule.preview.matchAll(depRegex)].map((m: any) => m[1]);
    const uniqueDeps = [...new Set(deps)];
    
    diag.dependencies = [];
    for (const depUrl of uniqueDeps) {
      try {
        const depRes = await fetch(`${depUrl}${depUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-cache'
        });
        diag.dependencies.push({
          url: depUrl,
          status: depRes.status,
          contentType: depRes.headers.get('content-type')
        });
      } catch (err) {
        diag.dependencies.push({
          url: depUrl,
          error: (err as Error).message
        });
      }
    }
  } catch (err) {
    diag.diagError = (err as Error).message;
  }
  
  (window as any).__bootDiag = diag;
  
  console.group('🔬 [Diagnostics] Boot Failure Analysis');
  console.log('Full diagnostics:', diag);
  console.groupEnd();
  
  return diag;
}

// Smart recovery: clear caches and unregister SW
async function performRecovery() {
  console.log('🔧 [Recovery] Starting recovery process...');
  
  try {
    // Mark recovery attempt
    sessionStorage.setItem('__auto_recover_attempts', '1');
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service worker(s)`);
      
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Unregistered service worker:', registration.scope);
      }
    }
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} cache(s)`);
      
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('✅ Deleted cache:', cacheName);
      }
    }
    
    console.log('✅ [Recovery] Recovery complete. Reloading...');
    
    // Small delay to ensure cleanup completes
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (err) {
    console.error('❌ [Recovery] Recovery failed:', err);
    alert('Recovery failed. Please manually clear browser cache and reload.');
  }
}

// Fallback UI component with diagnostics
function BootError({ message }: { message: string }) {
  const [diagnostics, setDiagnostics] = React.useState<any>(null);
  
  const runDiagnostics = async () => {
    const diag = await collectDiagnostics(new Error(message));
    setDiagnostics(diag);
  };
  
  const copyDiagnostics = () => {
    const data = (window as any).__bootDiag || diagnostics;
    if (data) {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => alert('Diagnostics copied to clipboard!'))
        .catch(() => alert('Failed to copy. Check console for __bootDiag'));
    }
  };
  
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#e4e4e7',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>
          App Failed to Load
        </h1>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#fca5a5',
          }}
        >
          {message}
        </pre>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={performRecovery}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
          >
            🔧 Run Recovery
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            🔄 Reload
          </button>
          <button
            onClick={runDiagnostics}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#7c3aed')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#8b5cf6')}
          >
            🔬 Run Diagnostics
          </button>
          {diagnostics && (
            <button
              onClick={copyDiagnostics}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#059669')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#10b981')}
            >
              📋 Copy Diagnostics
            </button>
          )}
        </div>
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
    
    // Phase 2: Dynamic import with timeout and retry
    console.log('📦 [Boot] Phase 2: Importing App module...');
    
    const importWithTimeout = (cacheBust = false) => {
      const url = cacheBust ? `./App.tsx?v=${Date.now()}` : './App.tsx';
      console.log(`Attempting import: ${url}`);
      
      return Promise.race([
        import(/* @vite-ignore */ url).then(module => module.default),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('App import timeout (8 seconds)')), 8000)
        )
      ]);
    };
    
    let App;
    try {
      App = await importWithTimeout(false) as any;
    } catch (firstError) {
      console.warn('⚠️ [Boot] First import attempt failed, retrying with cache-bust...', firstError);
      App = await importWithTimeout(true) as any;
    }
    
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
    
    // Collect diagnostics
    await collectDiagnostics(err);
    
    // Auto-recovery for dev hosts (once)
    const isDev = window.location.hostname.includes('lovableproject.com') || window.location.hostname === 'localhost';
    const errorMsg = err instanceof Error ? err.message : String(err);
    const hasRecovered = sessionStorage.getItem('__auto_recover_attempts');
    
    if (isDev && errorMsg.includes('Failed to fetch dynamically imported module') && !hasRecovered) {
      console.log('🔄 [Boot] Auto-recovery triggered...');
      await performRecovery();
      return;
    }
    
    // Show fallback UI with detailed error
    console.log('🛑 [Boot] Showing fallback error UI');
    const errorMessage = err instanceof Error 
      ? `${err.message}\n\nCheck console for details. This may be caused by:\n- Network issues loading modules\n- CSP blocking resources\n- Service Worker conflicts\n\nDiagnostics saved to window.__bootDiag`
      : String(err);
    
    reactRoot.render(<BootError message={errorMessage} />);
    (window as any).__react_mounted__ = true;
    console.timeEnd('boot');
  }
}

// Additional system monitoring
window.addEventListener('error', (e) => {
  if (e.filename && e.filename.includes('/node_modules/.vite/deps/')) {
    console.error('💥 [Dependency Script Error]', {
      filename: e.filename,
      message: e.message,
      lineno: e.lineno,
      colno: e.colno
    });
  }
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const resources = performance.getEntriesByType('resource');
    const viteResources = resources.filter((r: any) => r.name.includes('/node_modules/.vite/deps/'));
    
    console.group('📊 [Performance] Vite Dependencies');
    console.log(`Total loaded: ${viteResources.length}`);
    viteResources.forEach((r: any) => {
      console.log(`${r.name.split('/').pop()} - ${Math.round(r.duration)}ms (${r.transferSize || 0} bytes)`);
    });
    console.groupEnd();
  }, 2000);
});

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
