import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ChatHeaderProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  onNavigateToProfile?: () => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const ChatHeader = ({ selectedClient, onNavigateToProfile }: ChatHeaderProps) => {
  const { t } = useTranslation('trainer');
  
  if (selectedClient) {
    return (
      <div className="flex items-center gap-3 p-3 border-b bg-muted/20">
        <Avatar className="h-8 w-8">
          <AvatarImage src={selectedClient.avatar_url} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(selectedClient.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-medium">{selectedClient.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {t('chat.aiWorkingWithClient')}
          </p>
        </div>
        {onNavigateToProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToProfile}
          >
            {t('chat.profile')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-3 border-b bg-muted/20">
      <p className="text-sm font-medium">{t('chat.chatWithAI')}</p>
      <p className="text-xs text-muted-foreground">{t('chat.useUsernameHint')}</p>
    </div>
  );
};
