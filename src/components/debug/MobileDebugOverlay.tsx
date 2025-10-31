import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function MobileDebugOverlay() {
  const { user, loading, isTrainer, role } = useAuth();
  const [screenInfo, setScreenInfo] = useState('');
  
  useEffect(() => {
    const updateInfo = () => {
      setScreenInfo(`
📱 Screen: ${window.innerWidth}x${window.innerHeight}
👤 User: ${user?.email || 'none'}
🔐 User ID: ${user?.id || 'none'}
⏳ Auth Loading: ${loading}
👨‍🏫 Is Trainer: ${isTrainer}
🎭 Role: ${role || 'none'}
🌐 URL: ${window.location.pathname}
📍 Origin: ${window.location.origin}
🔍 UA: ${navigator.userAgent.slice(0, 50)}...
      `.trim());
    };
    
    updateInfo();
    window.addEventListener('resize', updateInfo);
    return () => window.removeEventListener('resize', updateInfo);
  }, [user, loading, isTrainer, role]);
  
  // Show in dev mode or with ?debug=1 parameter
  if (!import.meta.env.DEV && !window.location.search.includes('debug=1')) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 z-[9999] bg-red-500 text-white p-2 text-xs font-mono max-w-full overflow-auto shadow-lg">
      <div className="font-bold mb-1">🔍 DEBUG INFO</div>
      <pre className="whitespace-pre-wrap">{screenInfo}</pre>
    </div>
  );
}
