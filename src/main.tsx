import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./index-inbody-styles.css";
import "./i18n"; // i18n initialization
import { SMOKE_MODE, enableSafeMode } from "./lib/safe-flags";

// Smoke mode is now managed via safe-flags.ts

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

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

// Helper: Try to actually import a module
async function probeModuleImport(url: string, timeoutMs = 6000): Promise<{ url: string; ok: boolean; error?: string }> {
  try {
    await Promise.race([
      import(/* @vite-ignore */ `${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    return { url, ok: true };
  } catch (err) {
    return { url, ok: false, error: (err as Error).message };
  }
}

// Enhanced pre-check with dependency analysis
async function preCheckModuleSafe() {
  const isDev = window.location.hostname.includes('lovableproject.com') || window.location.hostname === 'localhost';
  if (!isDev) return;

  try {
    console.group('🔍 [Pre-check] Analyzing App.tsx');
    
    const ts = Date.now();
    
    // Probe different URL variants
    console.log('🔬 Probing App.tsx URL variants...');
    const variants = [
      `/src/App.tsx?import`,
      `/src/App.tsx?import&t=${ts}`,
      `/src/App.tsx?t=${ts}`
    ];
    
    for (const url of variants) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const type = res.headers.get('content-type') || 'unknown';
        const len = res.headers.get('content-length') || 'unknown';
        console.log(`${url} → ${res.status} ${type} (${len} bytes)`);
        if (type.includes('text/html')) {
          console.warn(`❌ RED FLAG: ${url} returned HTML!`);
        }
      } catch (err) {
        console.warn(`❌ RED FLAG: ${url} → ${(err as Error).message}`);
      }
    }
    
    // Standard check
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
    
    // Parse Vite node_modules dependencies
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
    
    // Parse local src/* dependencies
    const srcDepRegex = /(?:from|import)\s*\(\s*["']([^"']*\/src\/[^"']+\.(?:t|j)sx?)["']\s*\)|from\s+["']([^"']*\/src\/[^"']+\.(?:t|j)sx?)["']/g;
    const srcMatches = [...body.matchAll(srcDepRegex)];
    const srcDeps = srcMatches.map(m => m[1] || m[2]).filter(Boolean);
    const uniqueSrcDeps = [...new Set(srcDeps)];
    
    if (uniqueSrcDeps.length > 0) {
      console.log(`\n🔍 Found ${uniqueSrcDeps.length} local src/* dependencies`);
      
      for (const srcUrl of uniqueSrcDeps) {
        try {
          const srcRes = await fetch(`${srcUrl}${srcUrl.includes('?') ? '&' : '?'}ts=${Date.now()}`, {
            cache: 'no-cache'
          });
          
          const srcStatus = srcRes.status;
          const srcType = srcRes.headers.get('content-type') || 'unknown';
          const srcBody = await srcRes.text();
          const preview = srcBody.substring(0, 200);
          
          if (srcStatus >= 400) {
            console.warn(`❌ RED FLAG: ${srcUrl} → ${srcStatus}`);
          } else if (srcType.includes('text/html') || preview.trim().startsWith('<!DOCTYPE') || preview.trim().startsWith('<html')) {
            console.warn(`❌ RED FLAG: ${srcUrl} → HTML response instead of JS!`);
          } else {
            console.log(`✅ ${srcUrl.split('/').pop()} → ${srcStatus}`);
          }
        } catch (err) {
          console.warn(`❌ RED FLAG: ${srcUrl} → ${(err as Error).message}`);
        }
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
    const ts = Date.now();
    
    // Probe App.tsx import variants
    diag.appImportProbe = [];
    const variants = [
      `/src/App.tsx?import`,
      `/src/App.tsx?import&t=${ts}`,
      `/src/App.tsx?t=${ts}`
    ];
    
    for (const url of variants) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const body = await res.text();
        diag.appImportProbe.push({
          url,
          status: res.status,
          contentType: res.headers.get('content-type'),
          contentLength: res.headers.get('content-length'),
          preview: body.substring(0, 300)
        });
      } catch (err) {
        diag.appImportProbe.push({
          url,
          error: (err as Error).message
        });
      }
    }
    
    // Check standard App.tsx
    const appRes = await fetch(`/src/App.tsx?diag=${ts}`, { cache: 'no-cache' });
    const appBody = await appRes.text();
    diag.appModule = {
      status: appRes.status,
      contentType: appRes.headers.get('content-type'),
      contentLength: appRes.headers.get('content-length'),
      preview: appBody.substring(0, 400)
    };
    
    // Parse and check node_modules dependencies from FULL body
    const depRegex = /from\s+["']([^"']*\/node_modules\/\.vite\/deps\/[^"']+)["']/g;
    const deps = [...appBody.matchAll(depRegex)].map((m: any) => m[1]);
    const uniqueDeps = [...new Set(deps)];
    
    diag.dependencies = [];
    for (const depUrl of uniqueDeps) {
      try {
        const depRes = await fetch(`${depUrl}${depUrl.includes('?') ? '&' : '?'}ts=${ts}`, {
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
    
    // Parse and check local src/* dependencies
    const srcDepRegex = /(?:from|import)\s*\(\s*["']([^"']*\/src\/[^"']+\.(?:t|j)sx?)["']\s*\)|from\s+["']([^"']*\/src\/[^"']+\.(?:t|j)sx?)["']/g;
    const srcMatches = [...appBody.matchAll(srcDepRegex)];
    const srcDeps = srcMatches.map((m: any) => m[1] || m[2]).filter(Boolean);
    const uniqueSrcDeps = [...new Set(srcDeps)];
    
    diag.srcDeps = [];
    diag.srcImportProbes = [];
    
    if (uniqueSrcDeps.length > 0) {
      console.log(`🔍 Checking ${uniqueSrcDeps.length} local src/* dependencies...`);
      
      // Fetch and analyze each src module
      for (const srcUrl of uniqueSrcDeps) {
        try {
          const srcRes = await fetch(`${srcUrl}${srcUrl.includes('?') ? '&' : '?'}ts=${ts}`, {
            cache: 'no-cache'
          });
          
          const srcStatus = srcRes.status;
          const srcType = srcRes.headers.get('content-type') || 'unknown';
          const srcBody = await srcRes.text();
          const preview = srcBody.substring(0, 300);
          
          const redFlag = srcStatus >= 400 || 
                         srcType.includes('text/html') || 
                         preview.trim().startsWith('<!DOCTYPE') || 
                         preview.trim().startsWith('<html');
          
          diag.srcDeps.push({
            url: srcUrl,
            status: srcStatus,
            contentType: srcType,
            contentLength: srcRes.headers.get('content-length'),
            preview,
            redFlag
          });
          
          if (redFlag) {
            console.warn(`❌ RED FLAG: ${srcUrl} → ${srcStatus} ${srcType}`);
          }
        } catch (err) {
          diag.srcDeps.push({
            url: srcUrl,
            error: (err as Error).message,
            redFlag: true
          });
        }
      }
      
      // Attempt real dynamic import for each src module
      console.log('🔬 Probing real module imports...');
      for (const srcUrl of uniqueSrcDeps) {
        const probeResult = await probeModuleImport(srcUrl, 6000);
        diag.srcImportProbes.push(probeResult);
        
        if (!probeResult.ok) {
          console.warn(`❌ Import failed: ${srcUrl} → ${probeResult.error}`);
        } else {
          console.log(`✅ Import OK: ${srcUrl}`);
        }
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
  
  // Show diagnostic summaries if available
  const diagSummary = diagnostics ? (
    <div style={{ 
      marginTop: '1rem', 
      padding: '1rem', 
      background: 'rgba(0, 0, 0, 0.3)', 
      borderRadius: '8px',
      fontSize: '12px',
      maxHeight: '300px',
      overflow: 'auto'
    }}>
      {diagnostics.appImportProbe && (
        <>
          <strong>App.tsx Import Probes:</strong>
          {diagnostics.appImportProbe.map((p: any, i: number) => (
            <div key={i} style={{ marginTop: '0.5rem' }}>
              {p.url}: {p.error || `${p.status} ${p.contentType}`}
            </div>
          ))}
        </>
      )}
      
      {diagnostics.srcDeps && diagnostics.srcDeps.length > 0 && (
        <>
          <div style={{ marginTop: '1rem' }}>
            <strong>Local src/* Dependencies ({diagnostics.srcDeps.length}):</strong>
          </div>
          {diagnostics.srcDeps.map((dep: any, i: number) => (
            <div key={i} style={{ 
              marginTop: '0.5rem',
              color: dep.redFlag ? '#fca5a5' : '#86efac'
            }}>
              {dep.redFlag && '🚨 '}{dep.url.split('/').pop()}: {dep.error || `${dep.status} ${dep.contentType}`}
            </div>
          ))}
        </>
      )}
      
      {diagnostics.srcImportProbes && diagnostics.srcImportProbes.length > 0 && (
        <>
          <div style={{ marginTop: '1rem' }}>
            <strong>Real Import Probes:</strong>
          </div>
          {diagnostics.srcImportProbes.map((probe: any, i: number) => (
            <div key={i} style={{ 
              marginTop: '0.5rem',
              color: probe.ok ? '#86efac' : '#fca5a5'
            }}>
              {probe.ok ? '✅' : '❌'} {probe.url.split('/').pop()}{!probe.ok && `: ${probe.error}`}
            </div>
          ))}
        </>
      )}
    </div>
  ) : null;
  
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
            marginBottom: '1rem',
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
        {diagSummary}
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

// Simplified boot: static imports, no dynamic loading phase
async function boot() {
  console.time('boot');
  console.log('🚀 [Boot] Starting application (static imports)...');
  
  const reactRoot = createRoot(root);
  
  try {
    // Pre-check (non-blocking, for diagnostics)
    preCheckModuleSafe();
    
    // 🚨 SMOKE MODE: Render minimal test component
    if (SMOKE_MODE) {
      console.log('🔥 [SMOKE MODE] Rendering minimal test component');
      reactRoot.render(
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#00ff00',
          fontFamily: 'monospace',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '64px', margin: '20px 0' }}>✅ React Mounted</h1>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            SMOKE_MODE is ON. Basic rendering works.
          </p>
          <p style={{ fontSize: '14px', opacity: 0.6 }}>
            Time: {new Date().toLocaleTimeString()}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.6, marginTop: '10px' }}>
            Path: {window.location.pathname}
          </p>
          <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
            <a href="/__debug" style={{ 
              color: '#00ffff', 
              textDecoration: 'underline',
              fontSize: '16px'
            }}>→ Debug Page</a>
            <button onClick={() => {
              window.location.href = '/?disable_smoke=1';
            }} style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Disable Smoke & Reload
            </button>
          </div>
        </div>
      );
      (window as any).__react_mounted__ = true;
      console.log('✅ [Boot] Smoke component rendered successfully');
      console.timeEnd('boot');
      return;
    }
    
    // Render App directly (statically imported)
    console.log('🎨 [Boot] Rendering App...');
    reactRoot.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    (window as any).__react_mounted__ = true;
    
    // Принудительно скрыть boot loader из index.html
    const bootLoader = document.getElementById('boot-loader');
    if (bootLoader) {
      console.log('🧹 [Boot] Removing boot loader from index.html');
      bootLoader.classList.add('hidden');
      setTimeout(() => bootLoader.remove(), 300);
    }
    
    console.log('✅ [Boot] App rendered successfully');
    console.timeEnd('boot');
    
    // 🔥 Boot watchdog: detect if app fails to render content
    setTimeout(() => {
      const rootEl = document.getElementById('root');
      const bootLoader = document.getElementById('boot-loader');
      
      // Если boot loader всё ещё виден через 3 секунды - принудительно удалить
      if (bootLoader && !bootLoader.classList.contains('hidden')) {
        console.error('🚨 [Boot Watchdog] Boot loader still visible after 3s!');
        bootLoader.classList.add('hidden');
        setTimeout(() => bootLoader.remove(), 300);
      }
      
      // Проверка контента
      if (!rootEl || rootEl.children.length === 0 || rootEl.textContent?.trim() === '') {
        console.error('🚨 [Boot Watchdog] No content detected after 3 seconds!');
        console.error('Root element:', rootEl);
        console.error('Children count:', rootEl?.children.length);
        
        // Show recovery UI
        reactRoot.render(
          <BootError message="App rendered but no content appeared. This might be a routing or suspense issue." />
        );
      } else {
        console.log('✅ [Boot Watchdog] Content detected, app is healthy');
      }
    }, 3000);
    
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
