import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./index-inbody-styles.css";

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

// Pre-check: verify module availability
async function preCheckModule() {
  try {
    const response = await fetch('/src/App.tsx', { cache: 'no-cache' });
    if (!response.ok) {
      const msg = `/src/App.tsx returned status ${response.status}`;
      console.error('⚠️ [Boot]', msg);
      return false;
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const msg = '/src/App.tsx returned HTML instead of module';
      console.error('⚠️ [Boot]', msg);
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
    // Pre-check (non-blocking)
    await preCheckModule();
    
    // Try to import App
    console.log('📦 [Boot] Importing App module...');
    const { default: App } = await import('./App.tsx');
    
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
    console.error('💥 [Boot] First import failed:', err);
    
    // Try recovery once
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
    const errorMessage = err instanceof Error ? err.message : String(err);
    createRoot(root).render(<BootError message={errorMessage} />);
    (window as any).__react_mounted__ = true;
    console.timeEnd('boot');
  }
}

// Start boot process
boot();
