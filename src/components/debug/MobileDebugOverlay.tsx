import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { safeStorage } from '@/lib/safeStorage';

export function MobileDebugOverlay() {
  const { user, loading, isTrainer, role } = useAuth();
  const [screenInfo, setScreenInfo] = useState('');
  const [isVisible, setIsVisible] = useState(() => {
    const hidden = safeStorage.getItem('debug-overlay-hidden');
    return hidden !== 'true';
  });
  
  const handleClose = () => {
    setIsVisible(false);
    safeStorage.setItem('debug-overlay-hidden', 'true');
  };
  
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
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 z-[9999] bg-red-500 text-white p-2 text-xs font-mono max-w-full overflow-auto shadow-lg">
      <div className="flex items-start justify-between mb-1">
        <div className="font-bold">🔍 DEBUG INFO</div>
        <button 
          onClick={handleClose}
          className="text-white hover:text-red-200 text-lg leading-none ml-2"
          aria-label="Close debug overlay"
        >
          ×
        </button>
      </div>
      <pre className="whitespace-pre-wrap">{screenInfo}</pre>
    </div>
  );
}
