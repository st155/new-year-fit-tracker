import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot, User, ExternalLink } from 'lucide-react';
import { AIMessage, AIConversation } from '@/hooks/useAIConversations';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';

interface AIChatWindowProps {
  messages: AIMessage[];
  currentConversation: AIConversation | null;
  contextMode: string;
  sending: boolean;
  onSendMessage: (message: string, contextMode: string, mentionedClients: string[]) => Promise<any>;
  onSwitchToActionsTab?: () => void;
}

export const AIChatWindow = ({
  messages,
  currentConversation,
  contextMode,
  sending,
  onSendMessage,
  onSwitchToActionsTab
}: AIChatWindowProps) => {
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const messageText = input.trim();
    setInput('');

    // Extract @mentions (simplified version)
    const mentionPattern = /@(\w+)/g;
    const mentions = messageText.match(mentionPattern) || [];
    const mentionedClients: string[] = []; // Would need to resolve usernames to IDs

    await onSendMessage(messageText, contextMode, mentionedClients);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Extract client mentions from message
  const extractClientMentions = (content: string) => {
    const mentionPattern = /@(\w+)/g;
    const matches = content.match(mentionPattern);
    return matches || [];
  };

  // Handle client navigation from message
  const handleNavigateToClient = async (username: string) => {
    // Remove @ symbol
    const cleanUsername = username.replace('@', '');
    
    // Find client by username
    // This is a simplified version - in production, you'd query the database
    navigate(`/trainer-dashboard?tab=clients&search=${cleanUsername}`);
  };

  // Handle plan approval
  const handleApprovePlan = async () => {
    if (sending) return;
    
    const approvalMessage = "Да, выполнить план";
    setInput('');
    
    await onSendMessage(approvalMessage, contextMode, []);
    
    // Switch to actions tab to review
    if (onSwitchToActionsTab) {
      setTimeout(() => {
        onSwitchToActionsTab();
      }, 1000);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Начните разговор с AI</h3>
            <p className="text-sm max-w-md">
              Задавайте вопросы, анализируйте клиентов или обсуждайте планы тренировок.
              Используйте @username для упоминания конкретных клиентов.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted/50 text-muted-foreground text-sm'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                  
                  {/* Show client mention buttons for AI messages */}
                  {message.role === 'assistant' && extractClientMentions(message.content).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {extractClientMentions(message.content).map((mention, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleNavigateToClient(mention)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {mention}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Show plan approval button */}
                  {message.role === 'assistant' && message.metadata?.isPlan && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={handleApprovePlan}
                        disabled={sending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ✅ Да, выполнить план
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInput("Нужно подумать")}
                        disabled={sending}
                      >
                        Нужно подумать
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: ru
                    })}
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 bg-primary">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </Avatar>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </Avatar>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI думает...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Напишите сообщение... (@username для упоминания клиента)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            disabled={sending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-[60px] w-[60px]"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
