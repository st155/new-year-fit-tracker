import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { getPrefetcher } from '@/lib/prefetch-strategy';

export function DevDebugBar() {
  if (!import.meta.env.DEV) return null;

  let debugInfo = {
    route: 'unknown',
    userId: 'error',
    loading: 'error',
    rolesLoading: 'error',
    isTrainer: 'error',
    prefetcherReady: 'error',
    timestamp: new Date().toLocaleTimeString()
  };

  try {
    const location = useLocation();
    debugInfo.route = location.pathname;
  } catch (e) {
    console.error('[DevDebugBar] useLocation failed:', e);
  }

  try {
    const { user, loading, rolesLoading, isTrainer } = useAuth();
    debugInfo.userId = user?.id || 'null';
    debugInfo.loading = String(loading);
    debugInfo.rolesLoading = String(rolesLoading);
    debugInfo.isTrainer = String(isTrainer);
  } catch (e) {
    console.error('[DevDebugBar] useAuth failed:', e);
  }

  try {
    getPrefetcher();
    debugInfo.prefetcherReady = 'true';
  } catch (e) {
    debugInfo.prefetcherReady = 'false';
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '11px',
      padding: '8px 12px',
      zIndex: 9999,
      borderTop: '2px solid #00ff00',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <span>🛠️ DEV</span>
      <span>Route: <strong>{debugInfo.route}</strong></span>
      <span>User: <strong>{debugInfo.userId.substring(0, 8)}...</strong></span>
      <span>Loading: <strong>{debugInfo.loading}</strong></span>
      <span>RolesLoading: <strong>{debugInfo.rolesLoading}</strong></span>
      <span>IsTrainer: <strong>{debugInfo.isTrainer}</strong></span>
      <span>Prefetcher: <strong>{debugInfo.prefetcherReady}</strong></span>
      <span>Time: <strong>{debugInfo.timestamp}</strong></span>
    </div>
  );
}
