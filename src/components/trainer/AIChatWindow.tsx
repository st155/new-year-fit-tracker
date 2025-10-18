import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Bot, User, ExternalLink, MessageSquare, X } from 'lucide-react';
import { AIMessage, AIConversation } from '@/hooks/useAIConversations';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { MentionAutocomplete, ClientSuggestion } from './MentionAutocomplete';
import { ClientDisambiguationModal } from './ClientDisambiguationModal';
import { toast } from 'sonner';

interface AIChatWindowProps {
  messages: AIMessage[];
  currentConversation: AIConversation | null;
  contextMode: string;
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  sending: boolean;
  onSendMessage: (message: string, contextMode: string, mentionedClients: string[], mentionedNames?: string[], contextClientId?: string) => Promise<any>;
  onSwitchToActionsTab?: () => void;
}

export const AIChatWindow = ({
  messages,
  currentConversation,
  contextMode,
  selectedClient,
  sending,
  onSendMessage,
  onSwitchToActionsTab
}: AIChatWindowProps) => {
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const [input, setInput] = useState('');
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguations, setDisambiguations] = useState<any[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    loadTrainerClients();
  }, []);

  const loadTrainerClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('trainer_clients')
      .select(`
        client_id,
        profiles!trainer_clients_client_id_fkey (
          user_id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('trainer_id', user.id)
      .eq('active', true);
    
    if (data) {
      const clientsList = data
        .map(tc => tc.profiles)
        .filter(Boolean) as ClientSuggestion[];
      setClients(clientsList);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    
    // Check for @ mentions
    const lastAtIndex = text.lastIndexOf('@');
    const cursorIsAfterAt = lastAtIndex !== -1 && lastAtIndex < text.length;
    
    if (cursorIsAfterAt) {
      const afterAt = text.slice(lastAtIndex + 1);
      const queryMatch = afterAt.match(/^(\S*)/);
      
      if (queryMatch) {
        const query = queryMatch[1];
        setMentionQuery(query);
        setShowMentionSuggestions(true);
        
        // Calculate position for dropdown
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const rect = textarea.getBoundingClientRect();
          setMentionPosition({
            top: rect.bottom + 5,
            left: rect.left
          });
        }
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const selectClient = (client: ClientSuggestion) => {
    const lastAtIndex = input.lastIndexOf('@');
    const beforeAt = input.slice(0, lastAtIndex);
    const afterQuery = input.slice(lastAtIndex + 1).replace(/^\S*/, '');
    
    const newInput = `${beforeAt}@${client.username}${afterQuery}`;
    setInput(newInput);
    
    // Save username -> user_id mapping
    setMentions(prev => new Map(prev).set(client.username, client.user_id));
    setShowMentionSuggestions(false);
    
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const handleSend = async (messageText?: string, mentionedClientIds?: string[], mentionedNames?: string[]) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || sending) return;

    if (!messageText) {
      setInput('');
    }

    // Extract @mentions if not provided
    let clientIds = mentionedClientIds;
    let names = mentionedNames;
    
    if (!clientIds || !names) {
      // iOS/Safari compatible mention extraction without matchAll
      const findMentions = (text: string): Array<{ full: string; username: string }> => {
        const pattern = /@(\S+)/g;
        const results: Array<{ full: string; username: string }> = [];
        let match: RegExpExecArray | null;
        
        while ((match = pattern.exec(text)) !== null) {
          results.push({ full: match[0], username: match[1] });
          if (pattern.lastIndex === match.index) {
            pattern.lastIndex++;
          }
        }
        return results;
      };
      
      const mentionMatches = findMentions(textToSend);
      
      clientIds = mentionMatches
        .map(m => mentions.get(m.username))
        .filter(Boolean) as string[];
      
      // Extract raw names (those not resolved via autocomplete)
      names = mentionMatches
        .filter(m => !mentions.has(m.username))
        .map(m => m.username);
    }

    try {
      const response = await onSendMessage(textToSend, contextMode, clientIds, names, selectedClient?.user_id);
      
      // Check if disambiguation is needed
      if (response?.needsDisambiguation) {
        setPendingMessage(textToSend);
        setDisambiguations(response.disambiguations);
        setShowDisambiguation(true);
        return;
      }
      
      setMentions(new Map()); // Clear mentions after sending
      setShowMentionSuggestions(false);
    } catch (error: any) {
      // Handle AI rate limit errors
      if (error.message?.includes('AI rate limit exceeded') || error.message?.includes('429')) {
        toast.error("AI rate limit exceeded. Please wait a few minutes and try again.");
      } else if (error.message?.includes('AI credits exhausted') || error.message?.includes('402')) {
        toast.error("AI credits exhausted. Please add more credits to your Lovable workspace to continue.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
      console.error('Error sending message:', error);
    }
  };

  const handleDisambiguationResolve = async (resolvedClients: Map<string, string>) => {
    setShowDisambiguation(false);
    
    // Resend message with resolved client IDs
    const clientIds = Array.from(resolvedClients.values());
    await handleSend(pendingMessage, clientIds, []);
    
    setPendingMessage('');
    setDisambiguations([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentionSuggestions) {
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
    navigate(`/trainer-dashboard?tab=clients&search=${cleanUsername}`);
  };

  // Handle plan approval
  const handleApprovePlan = async () => {
    if (sending) return;
    
    const approvalMessage = "Да, выполнить план";
    setInput('');
    
    await onSendMessage(approvalMessage, contextMode, [], [], selectedClient?.user_id);
    
    // Switch to actions tab to review
    if (onSwitchToActionsTab) {
      setTimeout(() => {
        onSwitchToActionsTab();
      }, 1000);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Render message content with clickable client names
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find mentions (@username or full names in content)
    clients.forEach(client => {
      const patterns = [
        `@${client.username}`,
        client.full_name,
      ];

      patterns.forEach(pattern => {
        let searchIndex = content.indexOf(pattern, lastIndex);
        while (searchIndex !== -1 && searchIndex >= lastIndex) {
          // Add text before mention
          if (searchIndex > lastIndex) {
            parts.push(content.substring(lastIndex, searchIndex));
          }

          // Add clickable mention
          parts.push(
            <Button
              key={`${client.user_id}-${searchIndex}`}
              variant="link"
              className="p-0 h-auto font-medium text-primary inline"
              onClick={() => handleNavigateToClient(client.user_id)}
            >
              {pattern}
            </Button>
          );

          lastIndex = searchIndex + pattern.length;
          searchIndex = content.indexOf(pattern, lastIndex);
        }
      });
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with selected client context */}
      <div className="p-4 border-b bg-muted/30">
        {selectedClient ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedClient.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(selectedClient.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedClient.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  Контекст AI: работа с этим клиентом
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/trainer-dashboard?tab=clients&client=${selectedClient.user_id}`)}
              >
                Открыть профиль
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-5 w-5 mx-auto mb-2" />
            <p className="text-sm font-medium">Общий чат с AI</p>
            <p className="text-xs">Выберите клиента для работы с его данными</p>
          </div>
        )}
      </div>

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
                    {message.role === 'assistant' ? renderMessageContent(message.content) : message.content}
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

      <div className="p-4 border-t relative">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Напишите сообщение... (@username для упоминания клиента)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] resize-none"
            disabled={sending}
          />
          {showMentionSuggestions && (
            <MentionAutocomplete
              clients={clients}
              query={mentionQuery}
              onSelect={selectClient}
              onClose={() => setShowMentionSuggestions(false)}
              position={mentionPosition}
            />
          )}
          <Button
            size="icon"
            onClick={() => handleSend()}
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

      <ClientDisambiguationModal
        open={showDisambiguation}
        disambiguations={disambiguations}
        onResolve={handleDisambiguationResolve}
        onClose={() => {
          setShowDisambiguation(false);
          setPendingMessage('');
          setDisambiguations([]);
        }}
      />
    </div>
  );
};
