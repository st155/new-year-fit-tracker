import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ExternalLink, User as UserIcon, AtSign, CheckCircle, FileText, Search, MapPin } from 'lucide-react';

interface RecognizedClientBadgeProps {
  recognizedClient: {
    client_id: string;
    recognition_method: string;
    confidence_score: number;
    recognized_from_text?: string;
  };
  clients: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  }>;
  onNavigateToClient: (clientId: string) => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export function RecognizedClientBadge({
  recognizedClient,
  clients,
  onNavigateToClient
}: RecognizedClientBadgeProps) {
  const client = clients.find(c => c.user_id === recognizedClient.client_id);
  if (!client) return null;

  const methodLabels: Record<string, { label: string; icon: any }> = {
    alias: { label: 'Псевдоним', icon: UserIcon },
    full_name_exact: { label: 'Полное имя', icon: CheckCircle },
    username: { label: 'Username', icon: AtSign },
    name_part: { label: 'Часть имени', icon: FileText },
    name_stem: { label: 'Склонение', icon: Search },
    context: { label: 'Из контекста', icon: MapPin }
  };

  const method = methodLabels[recognizedClient.recognition_method] || { 
    label: 'Распознан', 
    icon: UserIcon 
  };
  const Icon = method.icon;

  // Color based on confidence score
  const confidenceColor = recognizedClient.confidence_score >= 90
    ? 'bg-success/10 border-success/30 text-success-foreground hover:bg-success/20'
    : recognizedClient.confidence_score >= 70
    ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
    : 'bg-warning/10 border-warning/30 text-warning-foreground hover:bg-warning/20';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onNavigateToClient(client.user_id)}
      className={`h-auto py-1 px-2 rounded-md border transition-all ${confidenceColor}`}
    >
      <div className="flex items-center gap-1.5">
        <Avatar className="h-4 w-4">
          <AvatarImage src={client.avatar_url} />
          <AvatarFallback className="text-[8px] bg-muted">
            {getInitials(client.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            <span className="text-[10px] font-medium leading-tight">
              {method.label}
            </span>
          </div>
          <span className="text-[11px] font-semibold leading-tight">
            {client.full_name}
          </span>
        </div>
        <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
      </div>
    </Button>
  );
}
