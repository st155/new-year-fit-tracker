import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { ClientSearchAutocomplete } from './ClientSearchAutocomplete';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Client {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface TrainerAIWidgetProps {
  selectedClient?: Client | null;
  compact?: boolean;
  embedded?: boolean;
}

export const TrainerAIWidget = ({ selectedClient: initialClient, compact = false, embedded = false }: TrainerAIWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient || null);
  const [input, setInput] = useState('');
  
  const { messages, sending, sendMessage } = useAIConversations(user?.id);
  const { pendingActions } = useAIPendingActions(user?.id);

  const recentMessages = messages.slice(-5);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    
    await sendMessage(
      input,
      'general',
      selectedClient ? [selectedClient.user_id] : [],
      selectedClient ? [selectedClient.full_name] : [],
      selectedClient?.user_id
    );
    
    setInput('');
  };

  const handleExpand = () => {
    const params = new URLSearchParams();
    params.set('tab', 'ai-hub');
    if (selectedClient) {
      params.set('client', selectedClient.user_id);
    }
    navigate(`/trainer-dashboard?${params.toString()}`);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className={`flex flex-col ${compact ? 'h-[400px]' : 'h-[500px]'}`}>
      {/* Header with search */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          {!embedded && (
            <Button variant="ghost" size="sm" onClick={handleExpand}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ClientSearchAutocomplete onSelect={setSelectedClient} />

        {selectedClient && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
            <Avatar className="h-6 w-6">
              <AvatarImage src={selectedClient.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(selectedClient.full_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium flex-1">{selectedClient.full_name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedClient(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Compact chat */}
      <ScrollArea className="flex-1 p-4">
        {recentMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Начните разговор с AI</p>
            {!selectedClient && (
              <p className="text-xs mt-1">Выберите клиента или задайте общий вопрос</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {recentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input + Quick Actions */}
      <div className="p-4 border-t space-y-2">
        <Textarea
          placeholder="Спросите AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="min-h-[60px] resize-none"
          disabled={sending}
        />
        <div className="flex justify-between items-center">
          <Badge variant="secondary" className="text-xs">
            Pending: {pendingActions.length}
          </Badge>
          <Button size="sm" onClick={handleSend} disabled={!input.trim() || sending}>
            {sending ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
