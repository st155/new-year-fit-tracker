import { Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ConnectHealthButtonsProps {
  onComplete: () => void;
}

export function ConnectHealthButtons({ onComplete }: ConnectHealthButtonsProps) {
  const { t } = useTranslation('common');
  
  const handleConnect = (provider: string) => {
    toast.info(`${provider} integration coming soon!`);
    // Auto-advance after showing toast
    setTimeout(() => onComplete(), 1000);
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <Button
        onClick={() => handleConnect('Apple Health')}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 h-14"
      >
        <Apple className="w-5 h-5 mr-2" />
        Connect Apple Health
      </Button>
      <Button
        onClick={() => handleConnect('Google Fit')}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 h-14"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m7.5 2c-1.47 0-2.75.81-3.42 2H6.34c.68-2.05 2.62-3.5 4.91-3.5 2.29 0 4.23 1.45 4.91 3.5h-2.74c-.67-1.19-1.95-2-3.42-2m0 14c1.47 0 2.75-.81 3.42-2h2.74c-.68 2.05-2.62 3.5-4.91 3.5-2.29 0-4.23-1.45-4.91-3.5h2.74c.67 1.19 1.95 2 3.42 2z"/>
        </svg>
        Connect Google Fit
      </Button>
      <Button
        onClick={onComplete}
        variant="ghost"
        className="w-full text-muted-foreground hover:text-foreground"
      >
        {t('skip')}
      </Button>
    </div>
  );
}
