import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showInstallPrompt, isAppInstalled, setupInstallPrompt } from '@/lib/pwa-utils';
import { cn } from '@/lib/utils';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Не показываем, если уже установлено
    if (isAppInstalled()) {
      return;
    }

    // Настраиваем слушатель
    setupInstallPrompt();

    const handleInstallAvailable = () => {
      // Показываем промпт через небольшую задержку
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    const handleInstalled = () => {
      setShowPrompt(false);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const accepted = await showInstallPrompt();
      
      if (accepted) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save to localStorage to not show again
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 animate-slide-in-right">
      <Card className={cn(
        "glass-card border-primary/20 shadow-glow max-w-sm",
        "animate-bounce-in"
      )}>
        <CardHeader className="relative pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Download className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">Install App</CardTitle>
              <CardDescription className="text-xs">
                Quick access from home screen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Fast loading
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Push notifications
            </li>
          </ul>
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full bg-gradient-primary ripple"
          >
            {isInstalling ? (
              'Installing...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Install
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
