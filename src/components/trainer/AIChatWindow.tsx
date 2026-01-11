import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Send, Loader2, Bot, User, ExternalLink, MessageSquare, Sparkles, CheckCircle, FileText, ChevronDown, ChevronUp, AlertCircle, XCircle, ArrowDown, Zap } from 'lucide-react';
import { AIMessage, AIConversation } from '@/types/trainer';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { supabase } from '@/integrations/supabase/client';
import { MentionAutocomplete, ClientSuggestion } from './MentionAutocomplete';
import { ClientDisambiguationModal } from './ClientDisambiguationModal';
import { useIsMobile } from '@/hooks/primitive';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
  sendingState: 'idle' | 'sending' | 'processing' | 'error' | 'timeout';
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
  sendingState,
  onSendMessage,
  pendingActions,
  onExecuteAction,
  onRejectAction,
  executing
}: AIChatWindowProps) => {
  const { t } = useTranslation('trainer');
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const isMobile = useIsMobile();
  const [input, setInput] = useState('');
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [clientAliases, setClientAliases] = useState<Array<{
    id: string;
    client_id: string;
    alias_name: string;
  }>>([]);
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [filteredClientsForDropdown, setFilteredClientsForDropdown] = useState<ClientSuggestion[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguations, setDisambiguations] = useState<any[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSelectingMention, setIsSelectingMention] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Timer for elapsed time display
  useEffect(() => {
    if (sendingState === 'processing') {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [sendingState]);

  // Smart auto-scroll: scroll on initial load or if user is at bottom
  useEffect(() => {
    if (!scrollRef.current) return;
    
    const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollableElement) return;
    
    const isInitialLoad = messages.length > 0 && scrollableElement.scrollTop === 0;
    const lastMessage = messages[messages.length - 1];
    const isOwnMessage = lastMessage?.role === 'user';
    
    // Always scroll for initial load, user's own messages, or if at bottom
    if (isInitialLoad || isOwnMessage || !isUserScrolling) {
      requestAnimationFrame(() => {
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      });
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
      // Get the actual scrollable element from ScrollArea
      const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ top: scrollableElement.scrollHeight, behavior: 'smooth' });
        setIsUserScrolling(false);
        setShowScrollButton(false);
      }
    }
  };

  // Prevent page scroll when scrolling chat
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target) return;
    
    const isScrollingDown = e.deltaY > 0;
    const isAtTop = target.scrollTop === 0;
    const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
    
    // Prevent page scroll if we're at boundaries
    if ((isAtTop && !isScrollingDown) || (isAtBottom && isScrollingDown)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Initial scroll to bottom on mount
  useEffect(() => {
    // Double RAF for guaranteed full render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
          if (scrollableElement) {
            scrollableElement.scrollTop = scrollableElement.scrollHeight;
            setIsUserScrolling(false);
          }
        }
      });
    });
    
    // Fallback for slow connections
    const fallbackTimeout = setTimeout(() => {
      if (scrollRef.current) {
        const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      }
    }, 500);
    
    return () => clearTimeout(fallbackTimeout);
  }, []);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Scroll to bottom when switching conversations
  useEffect(() => {
    if (currentConversation?.id) {
      setIsUserScrolling(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
            if (scrollableElement) {
              scrollableElement.scrollTop = scrollableElement.scrollHeight;
            }
          }
        });
      });
    }
  }, [currentConversation?.id]);

  useEffect(() => {
    loadTrainerClients();
    loadClientAliases();
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
        toast.error(t('aiToast.failedLoadClients'));
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

  const loadClientAliases = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('client_aliases')
        .select('id, client_id, alias_name')
        .eq('trainer_id', user.id);

      if (error) {
        console.error('[@mentions] Error loading aliases:', error);
        return;
      }

      setClientAliases(data || []);
      console.log('[@mentions] Loaded aliases:', data?.length || 0);
    } catch (error) {
      console.error('[@mentions] Exception loading aliases:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    
    // Detect active @mention segment based on caret position
    const caret = e.target.selectionStart ?? text.length;
    const atIndex = text.lastIndexOf('@', Math.max(0, caret - 1));
    const cursorIsAfterAt = atIndex !== -1 && atIndex < caret;
    
    if (cursorIsAfterAt) {
      // Extract query between @ and caret (stop at whitespace)
      const afterAt = text.slice(atIndex + 1, caret);
      const queryMatch = afterAt.match(/^(\S*)/);
      const query = queryMatch ? queryMatch[1] : '';

      setMentionQuery(query);

      // Filter clients with priority: aliases first, then username, then full_name
      const lowerQuery = query.toLowerCase();
      const filteredClients = clients.filter(c => {
        // Check aliases first (priority)
        const hasMatchingAlias = clientAliases.some(
          alias => alias.client_id === c.user_id && 
                   alias.alias_name.toLowerCase().includes(lowerQuery)
        );
        if (hasMatchingAlias) return true;
        
        // Then check username and full_name
        return c.username.toLowerCase().includes(lowerQuery) ||
               c.full_name.toLowerCase().includes(lowerQuery);
      });
      
      // Sort by priority: exact alias match > username match > name match
      filteredClients.sort((a, b) => {
        const aExactAlias = clientAliases.find(
          alias => alias.client_id === a.user_id && 
                   alias.alias_name.toLowerCase() === lowerQuery
        );
        const bExactAlias = clientAliases.find(
          alias => alias.client_id === b.user_id && 
                   alias.alias_name.toLowerCase() === lowerQuery
        );
        
        if (aExactAlias && !bExactAlias) return -1;
        if (!aExactAlias && bExactAlias) return 1;
        
        const aUsernameMatch = a.username.toLowerCase().startsWith(lowerQuery);
        const bUsernameMatch = b.username.toLowerCase().startsWith(lowerQuery);
        
        if (aUsernameMatch && !bUsernameMatch) return -1;
        if (!aUsernameMatch && bUsernameMatch) return 1;
        
        return 0;
      });

      // Provide data to dropdown and always show when @ is active
      setFilteredClientsForDropdown(filteredClients);
      setShowMentionSuggestions(true);
      
      // Calculate position for dropdown (viewport-relative for fixed positioning)
      if (textareaRef.current) {
        const textarea = textareaRef.current;
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left
        });
      }
    } else {
      setShowMentionSuggestions(false);
      setFilteredClientsForDropdown([]);
    }
  };
  const selectClient = (client: ClientSuggestion) => {
    console.log('[@mentions] Selected client:', client.username);
    setIsSelectingMention(true);
    
    const lastAtIndex = input.lastIndexOf('@');
    const beforeAt = input.slice(0, lastAtIndex);
    const afterQuery = input.slice(lastAtIndex + 1).replace(/^\S*/, '');
    
    const newInput = `${beforeAt}@${client.username} ${afterQuery}`;
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
      const len = newInput.length;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
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
    setTimeout(() => {
      if (scrollRef.current) {
        const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollableElement) {
          scrollableElement.scrollTo({ 
            top: scrollableElement.scrollHeight,
            behavior: 'smooth' 
          });
        }
      }
    }, 100);

    // Show toast for confirmation
    if (isConfirmation) {
      toast.success(t('aiToast.preparingPlan'), {
        description: t('aiToast.preparingPlanDesc'),
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
      const response = await onSendMessage(textToSend, 'general', clientIds, names, selectedClient?.user_id, !requireConfirmation);
      
      // Check if disambiguation is needed
      if (response?.needsDisambiguation) {
        setPendingMessage(textToSend);
        setDisambiguations(response.disambiguations);
        setShowDisambiguation(true);
        return;
      }
      
      setMentions(new Map()); // Clear mentions after sending
      setShowMentionSuggestions(false);
      
      // Return focus to textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Если дропдаун открыт — не обрабатываем Enter в textarea (его обработает MentionAutocomplete)
    if (showMentionSuggestions && e.key === 'Enter') {
      // Ничего не делаем, дропдаун сам обработает
      return;
    }
    // Больше никакой логики отправки по Enter — только через кнопку "Отправить"
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

    // Определяем цвет карточки в зависимости от результата
    const cardColorClass = failCount === 0 && successCount > 0
      ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
      : failCount > 0 && successCount === 0
        ? "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800"
        : "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800";

    const iconColorClass = failCount === 0 && successCount > 0
      ? "bg-green-600 dark:bg-green-500"
      : failCount > 0 && successCount === 0
        ? "bg-red-600 dark:bg-red-500"
        : "bg-amber-600 dark:bg-amber-500";

    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <Card className={`${cardColorClass} p-4 max-w-2xl w-full shadow-lg`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`${iconColorClass} p-2 rounded-lg`}>
                {failCount > 0 && successCount === 0 ? (
                  <XCircle className="h-5 w-5 text-white" />
                ) : failCount > 0 ? (
                  <AlertCircle className="h-5 w-5 text-white" />
                ) : (
                  <Zap className="h-5 w-5 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${
                    failCount === 0 
                      ? 'text-green-900 dark:text-green-100'
                      : failCount > 0 && successCount === 0
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-amber-900 dark:text-amber-100'
                  }`}>
                    {failCount === 0 && successCount > 0
                      ? t('ai.autoExecuted')
                      : failCount > 0 && successCount === 0
                        ? t('ai.executionError')
                        : t('ai.partiallyExecuted')
                    }
                  </span>
                  {successCount === totalCount && totalCount > 0 ? (
                    <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                      {successCount}/{totalCount} {t('ai.success')}
                    </Badge>
                  ) : totalCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {successCount}/{totalCount} {t('ai.success')}
                    </Badge>
                  ) : null}
                </div>
                
                <div className={`text-xs whitespace-pre-line mb-2 ${
                  failCount === 0 
                    ? 'text-green-700 dark:text-green-300'
                    : failCount > 0 && successCount === 0
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                }`}>
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
                          <div className="flex-1 flex items-center gap-2 flex-wrap">
                            <span className={result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                              {result.success 
                                ? (result.message || result.action_type)
                                : `${result.action || result.action_type}: ${result.error || t('ai.unknownError')}`
                              }
                            </span>
                            
                            {/* Link to view created training plan */}
                            {result.success && result.action === 'create_training_plan' && result.data?.plan_id && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                onClick={() => navigate(`/trainer-dashboard?tab=plans&plan=${result.data.plan_id}`)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {t('ai.viewPlan')}
                              </Button>
                            )}
                            
                            {/* Link to view created goal */}
                            {result.success && result.action === 'create_goal' && result.data?.goal_id && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                onClick={() => navigate(`/trainer-dashboard?tab=goals&goal=${result.data.goal_id}`)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {t('ai.viewGoal')}
                              </Button>
                            )}
                          </div>
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
      toast.loading(t('aiChat.executing'), {
        description: t('aiChat.executingDesc'),
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
                {t('aiChat.planReady')}
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

      <div className="flex-1 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="h-full" onScrollCapture={handleScroll} onWheel={handleWheel}>
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
                          locale: getDateLocale()
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

              {/* Enhanced AI status indicators */}
              {(sendingState === 'sending' || sendingState === 'processing') && (
                <div className="flex gap-3 justify-start animate-fade-in">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">
                        {sendingState === 'sending' ? 'Отправка' : 'AI генерирует ответ'}
                        {elapsedTime > 0 && ` (${elapsedTime}s)`}
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

              {/* Error indicator */}
              {sendingState === 'error' && (
                <Card className="bg-destructive/10 border-destructive/50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm">Ошибка отправки. Попробуйте еще раз.</span>
                  </div>
                </Card>
              )}

              {/* Timeout indicator with refresh button */}
              {sendingState === 'timeout' && (
                <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="text-sm">AI не отвечает уже 30 секунд</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.reload()}
                    >
                      Обновить страницу
                    </Button>
                  </div>
                </Card>
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
            <div className="flex flex-col items-center">
              <ArrowDown className="h-4 w-4" />
              {messages.length > 0 && isUserScrolling && (
                <span className="text-[10px] mt-0.5">Новое</span>
              )}
            </div>
          </Button>
        )}
      </div>

      <div className="p-4 border-t relative">
        <div className="flex gap-2 relative">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              aria-autocomplete="list"
              aria-expanded={showMentionSuggestions}
              aria-controls="mention-suggestions"
              placeholder={loadingClients 
                ? t('aiChat.loadingClients')
                : clients.length > 0 
                  ? t('aiChat.mentionPlaceholder')
                  : t('aiInput.placeholder')
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
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="require-confirmation-chat" 
              checked={requireConfirmation}
              onCheckedChange={(checked) => setRequireConfirmation(checked as boolean)}
            />
            <Label 
              htmlFor="require-confirmation-chat" 
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              Требовать подтверждение
            </Label>
          </div>
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

      {/* Mention autocomplete dropdown - rendered via portal to avoid clipping */}
        {showMentionSuggestions && typeof document !== 'undefined' &&
          createPortal(
            <MentionAutocomplete
              clients={filteredClientsForDropdown}
              query={mentionQuery}
              onSelect={selectClient}
              onClose={() => setShowMentionSuggestions(false)}
              position={mentionPosition}
              loading={loadingClients}
            />,
            document.body
          )
        }

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
