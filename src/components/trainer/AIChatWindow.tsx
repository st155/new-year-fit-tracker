import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Bot, User, ExternalLink, MessageSquare, Sparkles, CheckCircle, FileText, ChevronDown, ChevronUp, AlertCircle, XCircle, ArrowDown, Zap } from 'lucide-react';
import { AIMessage, AIConversation } from '@/hooks/useAIConversations';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { MentionAutocomplete, ClientSuggestion } from './MentionAutocomplete';
import { ClientDisambiguationModal } from './ClientDisambiguationModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface AIChatWindowProps {
  messages: AIMessage[];
  currentConversation: AIConversation | null;
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  sending: boolean;
  onSendMessage: (message: string, contextMode: string, mentionedClients: string[], mentionedNames?: string[], contextClientId?: string, autoExecute?: boolean) => Promise<any>;
  pendingActions: AIPendingAction[];
  onExecuteAction: (pendingActionId: string, conversationId: string, actions: any[]) => Promise<any>;
  onRejectAction: (actionId: string) => Promise<void>;
  executing: boolean;
}

export const AIChatWindow = ({
  messages,
  currentConversation,
  selectedClient,
  sending,
  onSendMessage,
  pendingActions,
  onExecuteAction,
  onRejectAction,
  executing
}: AIChatWindowProps) => {
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [loadingClients, setLoadingClients] = useState(true);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguations, setDisambiguations] = useState<any[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSelectingMention, setIsSelectingMention] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (!isUserScrolling && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingActions, isUserScrolling]);

  // Track user scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    setIsUserScrolling(!isAtBottom);
    setShowScrollButton(!isAtBottom);
  };

  // Scroll to bottom button handler
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setIsUserScrolling(false);
      setShowScrollButton(false);
    }
  };

  useEffect(() => {
    loadTrainerClients();
  }, []);

  const loadTrainerClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[@mentions] No authenticated user');
      return;
    }

    console.log('[@mentions] Loading clients for trainer:', user.id);
    setLoadingClients(true);
    
    try {
      const { data, error } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles:client_id (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('active', true);

      if (error) {
        console.error('[@mentions] Error loading clients:', error);
        setLoadingClients(false);
        return;
      }

      if (!data) {
        console.log('[@mentions] No clients data returned');
        setLoadingClients(false);
        return;
      }

      const clientsList = data
        .map(tc => tc.profiles)
        .filter(Boolean) as ClientSuggestion[];
      
      console.log('[@mentions] Loaded clients:', clientsList.length, clientsList);
      setClients(clientsList);
    } catch (error) {
      console.error('[@mentions] Error loading clients:', error);
    } finally {
      setLoadingClients(false);
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
      
      // Always show list, even if query is empty
      const query = queryMatch ? queryMatch[1] : '';
      
      console.log('[@mentions] Detected @ symbol');
      console.log('[@mentions] Available clients:', clients.length);
      console.log('[@mentions] Query after @:', query);
      
      setMentionQuery(query);
      setShowMentionSuggestions(true);
      
      // Calculate position for dropdown (viewport-relative for fixed positioning)
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
        console.log('[@mentions] Dropdown position:', { top: rect.bottom + 5, left: rect.left });
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const selectClient = (client: ClientSuggestion) => {
    console.log('[@mentions] Selected client:', client.username);
    setIsSelectingMention(true);
    
    const lastAtIndex = input.lastIndexOf('@');
    const beforeAt = input.slice(0, lastAtIndex);
    const afterQuery = input.slice(lastAtIndex + 1).replace(/^\S*/, '');
    
    const newInput = `${beforeAt}@${client.username} ${afterQuery}`; // Add space after username
    setInput(newInput);
    
    // Save username -> user_id mapping
    setMentions(prev => new Map(prev).set(client.username, client.user_id));
    
    // Close dropdown immediately
    setShowMentionSuggestions(false);
    setMentionQuery('');
    
    // Focus back on textarea with delay
    setTimeout(() => {
      setIsSelectingMention(false);
      textareaRef.current?.focus();
      // Set cursor at end
      const len = newInput.length;
      textareaRef.current?.setSelectionRange(len, len);
    }, 10);
  };

  const handleSend = async (messageText?: string, mentionedClientIds?: string[], mentionedNames?: string[]) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || sending) return;
    
    console.log('[@mentions] Sending message:', textToSend);

    // Detect confirmation intent
    const confirmPatterns = ['да', 'yes', 'confirm', 'ок', 'давай', 'согласен'];
    const isConfirmation = confirmPatterns.some(p => textToSend.toLowerCase().includes(p));

    // Clear input immediately for better UX
    if (!messageText) {
      setInput('');
    }
    
    // Auto-scroll to bottom when sending
    setIsUserScrolling(false);

    // Show toast for confirmation
    if (isConfirmation) {
      toast.success("⚡ Подготовка плана", {
        description: "AI готовит структурированный план действий...",
        duration: 3000
      });
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
      
      console.log('[@mentions] Extracted client IDs:', clientIds);
      console.log('[@mentions] Unresolved names:', names);
    }

    try {
      const response = await onSendMessage(textToSend, 'general', clientIds, names, selectedClient?.user_id, true);
      
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
      // Errors are already handled in useAIConversations hook
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
    if (e.key === 'Enter' && !e.shiftKey && !isSelectingMention) {
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
  const handleNavigateToClient = async (clientId: string) => {
    navigate(`/trainer-dashboard?tab=clients&client=${clientId}`);
  };

  // Handle plan approval
  const handleApprovePlan = async () => {
    if (sending) return;
    
    const approvalMessage = "Да, выполнить план";
    setInput('');
    
    await onSendMessage(approvalMessage, 'general', [], [], selectedClient?.user_id, true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Render message content with clickable client names
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    // Find all mentions for all clients
    interface Mention {
      start: number;
      end: number;
      text: string;
      clientId: string;
    }
    
    const mentions: Mention[] = [];
    
    clients.forEach(client => {
      const patterns = [
        `@${client.username}`,
        client.full_name,
      ];

      patterns.forEach(pattern => {
        let startIndex = 0;
        while (true) {
          const index = content.indexOf(pattern, startIndex);
          if (index === -1) break;
          
          mentions.push({
            start: index,
            end: index + pattern.length,
            text: pattern,
            clientId: client.user_id
          });
          
          startIndex = index + pattern.length;
        }
      });
    });

    // Filter out mentions that don't match any real client
    const validMentions = mentions.filter(mention => {
      const matchingClient = clients.find(c => 
        c.user_id === mention.clientId
      );
      
      if (!matchingClient) {
        console.warn(`⚠️ Skipping invalid mention (no matching client): ${mention.text}`);
        return false;
      }
      
      return true;
    });

    // Sort valid mentions by position
    validMentions.sort((a, b) => a.start - b.start);
    
    // Remove overlapping mentions (keep first)
    const filteredMentions: Mention[] = [];
    validMentions.forEach(mention => {
      const hasOverlap = filteredMentions.some(
        m => (mention.start >= m.start && mention.start < m.end) ||
             (mention.end > m.start && mention.end <= m.end)
      );
      if (!hasOverlap) {
        filteredMentions.push(mention);
      }
    });

    // Build parts array
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    filteredMentions.forEach((mention, idx) => {
      // Add text before mention
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      // Add clickable mention
      parts.push(
        <Button
          key={`mention-${idx}`}
          variant="link"
          className="p-0 h-auto font-medium text-primary inline"
          onClick={() => handleNavigateToClient(mention.clientId)}
        >
          {mention.text}
        </Button>
      );

      lastIndex = mention.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

  return parts.length > 0 ? parts : content;
  };

  // ActionPlanCard component
  const ActionPlanCard = ({ message, onApprove, onReconsider, sending }: {
    message: AIMessage;
    onApprove: () => void;
    onReconsider: () => void;
    sending: boolean;
  }) => {
    const actionData = message.metadata?.suggestedActions || [];
    const actionCount = actionData.length || 0;
    const isPreparing = message.metadata?.status === 'preparing';

    return (
      <div className="mt-3 border-l-4 border-primary pl-3">
        <div className="flex items-center gap-2 mb-2">
          {isPreparing ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
          <Badge variant="secondary" className="text-xs">
            {isPreparing ? '⏳ Подготовка плана...' : 'План ожидает подтверждения'}
          </Badge>
        </div>
        
        {!isPreparing && actionCount > 0 && (
          <div className="text-xs text-muted-foreground mb-3">
            Действий: {actionCount}
          </div>
        )}
        
        {isPreparing ? (
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Готовлю структурированный план...</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={sending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Выполнить
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReconsider}
              disabled={sending}
            >
              Подумать
            </Button>
          </div>
        )}
      </div>
    );
  };

  // AutoExecutionReport component
  const AutoExecutionReport = ({ message }: { message: AIMessage }) => {
    const [expanded, setExpanded] = useState(false);
    const results = message.metadata?.results || [];
    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;
    const totalCount = results.length;

    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 p-4 max-w-2xl w-full shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="bg-green-600 dark:bg-green-500 p-2 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Автоматически выполнено
                  </span>
                  {successCount === totalCount && totalCount > 0 ? (
                    <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                      {successCount}/{totalCount} успешно
                    </Badge>
                  ) : totalCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {successCount}/{totalCount} успешно
                    </Badge>
                  ) : null}
                </div>
                
                <div className="text-xs text-green-700 dark:text-green-300 whitespace-pre-line mb-2">
                  {message.content}
                </div>

                {results.length > 0 && (
                  <>
                    <div className="space-y-1 mt-3">
                      {results.slice(0, expanded ? undefined : 3).map((result: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          {result.success ? (
                            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <span className={result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                            {result.message || result.action_type}
                          </span>
                        </div>
                      ))}
                    </div>

                    {results.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 h-7 text-xs text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Свернуть
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Показать все ({results.length})
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // PendingActionCard component - показывается прямо в чате
  const PendingActionCard = ({ action, onExecute, onReject, executing }: {
    action: AIPendingAction;
    onExecute: () => void;
    onReject: () => void;
    executing: boolean;
  }) => {
    const handleExecute = () => {
      toast.loading("Выполняется...", {
        description: "План выполняется, подождите",
        duration: 2000
      });
      onExecute();
    };

    return (
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-3 md:p-4 my-3 animate-fade-in">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm md:text-base">
                План готов к выполнению
              </h4>
              <p className="text-xs md:text-sm text-amber-700 dark:text-amber-300 mt-1 whitespace-pre-wrap break-words">
                {action.action_plan}
              </p>
            </div>
          </div>
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
            <Button 
              size="sm" 
              onClick={handleExecute}
              disabled={executing}
              className="flex-1 justify-center bg-green-600 hover:bg-green-700 text-white"
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Выполнить
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onReject}
              disabled={executing}
              className="flex-1 justify-center"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Пересмотреть
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Simplified header */}
      <div className="p-3 border-b bg-muted/20">
        {selectedClient ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={selectedClient.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(selectedClient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedClient.full_name}</p>
              <p className="text-xs text-muted-foreground">
                AI работает с этим клиентом
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/trainer-dashboard?tab=clients&client=${selectedClient.user_id}`)}
            >
              Профиль
            </Button>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm font-medium">Чат с AI</p>
            <p className="text-xs text-muted-foreground">Используйте @username для работы с клиентами</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full" onScrollCapture={handleScroll}>
          <div className="p-4">
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
              <div key={message.id} className="animate-fade-in">
                {message.role === 'system' ? (
                  <AutoExecutionReport message={message} />
                ) : (
                  <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </Avatar>
                    )}
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <div
                         className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                            : 'bg-muted max-w-[80%]'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.role === 'assistant' ? renderMessageContent(message.content) : message.content}
                        </div>
                        
                        {/* Optimistic message status indicator */}
                        {message.metadata?.isOptimistic && (
                          <div className="text-xs mt-2 flex items-center gap-1">
                            {message.metadata.status === 'sending' && (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="opacity-70">Отправка...</span>
                              </>
                            )}
                            {message.metadata.status === 'sent' && (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="opacity-70">✓ Отправлено</span>
                              </>
                            )}
                            {message.metadata.status === 'failed' && (
                              <>
                                <XCircle className="h-3 w-3 text-destructive" />
                                <span className="text-destructive">Не отправлено</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 px-2 text-xs ml-2"
                                  onClick={() => {
                                    onSendMessage(message.content, 'general', [], undefined, selectedClient?.id, true);
                                  }}
                                >
                                  Повторить
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                    
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
                        {message.role === 'assistant' && (message.metadata?.isPlan || message.metadata?.pendingActionId) && (
                          <ActionPlanCard 
                            message={message}
                            onApprove={handleApprovePlan}
                            onReconsider={() => setInput("Нужно подумать")}
                            sending={sending}
                          />
                        )}
                      </div>
                      
                      <div className="text-xs opacity-70">
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
                )}
              </div>
            ))}

            {/* Pending actions in chat flow */}
            {pendingActions.length > 0 && (
              <div className="space-y-2">
                {pendingActions.map((action) => (
                  <PendingActionCard
                    key={action.id}
                    action={action}
                    onExecute={() => {
                      try {
                        const actionData = typeof action.action_data === 'string' 
                          ? JSON.parse(action.action_data) 
                          : action.action_data;
                        onExecuteAction(action.id, action.conversation_id, actionData.actions || []);
                      } catch (error) {
                        console.error('Error parsing action data:', error);
                        toast.error('Ошибка при выполнении действия');
                      }
                    }}
                    onReject={() => onRejectAction(action.id)}
                    executing={executing}
                  />
                ))}
              </div>
            )}

              {/* AI thinking indicator when sending */}
              {sending && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3 animate-pulse">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">
                        AI генерирует ответ
                        <span className="inline-block w-3 text-left ml-0.5">
                          <span className="animate-[pulse_1.5s_ease-in-out_infinite]">.</span>
                          <span className="animate-[pulse_1.5s_ease-in-out_0.2s_infinite]">.</span>
                          <span className="animate-[pulse_1.5s_ease-in-out_0.4s_infinite]">.</span>
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 rounded-full shadow-lg animate-scale-in hover:scale-110 transition-transform z-10"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-4 border-t relative">
        <div className="flex gap-2 relative">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={loadingClients 
                ? "Загрузка клиентов..." 
                : clients.length > 0 
                  ? "Напишите @имя для упоминания клиента или задайте вопрос..." 
                  : "Задайте вопрос или опишите задачу..."
              }
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] resize-none w-full"
              disabled={sending}
            />
            {mentions.size > 0 && (
              <Badge variant="secondary" className="absolute top-2 right-2 text-xs pointer-events-none">
                {mentions.size} {mentions.size === 1 ? 'упоминание' : 'упоминаний'}
              </Badge>
            )}
          </div>
          {showMentionSuggestions && (
            <MentionAutocomplete
              clients={clients}
              query={mentionQuery}
              onSelect={selectClient}
              onClose={() => setShowMentionSuggestions(false)}
              position={mentionPosition}
            />
          )}
        </div>
        <div className="mt-2 flex items-center justify-end">
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
