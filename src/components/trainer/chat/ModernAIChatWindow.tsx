import { useState, useEffect, useRef } from 'react';
import { ChatHeader } from './ChatHeader';
import { VirtualizedMessageList } from './VirtualizedMessageList';
import { ChatInput } from './ChatInput';
import { AIStatusIndicator } from './AIStatusIndicator';
import { AIMessage, AIConversation } from '@/types/trainer';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { supabase } from '@/integrations/supabase/client';
import { ClientSuggestion } from '../MentionAutocomplete';
import { ClientDisambiguationModal } from '../ClientDisambiguationModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ModernAIChatWindowProps {
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

export const ModernAIChatWindow = ({
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
}: ModernAIChatWindowProps) => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientSuggestion[]>([]);
  const [clientAliases, setClientAliases] = useState<Array<{
    id: string;
    client_id: string;
    alias_name: string;
  }>>([]);
  const [mentions, setMentions] = useState<Map<string, string>>(new Map());
  const [loadingClients, setLoadingClients] = useState(true);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [disambiguations, setDisambiguations] = useState<any[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string>('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    loadTrainerClients();
    loadClientAliases();
  }, []);

  const loadTrainerClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoadingClients(true);
    
    try {
      const { data, error } = await supabase
        .rpc('get_trainer_clients_summary', { p_trainer_id: user.id });

      if (error) {
        console.error('Error loading clients:', error);
        toast.error('Не удалось загрузить список клиентов');
        return;
      }

      const clientsList = (data || []).map((tc: any) => ({
        user_id: tc.client_id,
        username: tc.username || '',
        full_name: tc.full_name || '',
        avatar_url: tc.avatar_url
      }));
      
      setClients(clientsList);
    } catch (error) {
      console.error('Error loading clients:', error);
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
        console.error('Error loading aliases:', error);
        return;
      }

      setClientAliases(data || []);
    } catch (error) {
      console.error('Exception loading aliases:', error);
    }
  };

  const handleSend = async (message: string, clientIds: string[], names: string[]) => {
    if (sending) return;

    const confirmPatterns = ['да', 'yes', 'confirm', 'ок', 'давай', 'согласен'];
    const isConfirmation = confirmPatterns.some(p => message.toLowerCase().includes(p));

    if (isConfirmation) {
      toast.success("⚡ Подготовка плана", {
        description: "AI готовит структурированный план действий...",
        duration: 3000
      });
    }

    try {
      const response = await onSendMessage(message, 'general', clientIds, names, selectedClient?.user_id, true);
      
      if (response?.needsDisambiguation) {
        setPendingMessage(message);
        setDisambiguations(response.disambiguations);
        setShowDisambiguation(true);
        return;
      }
      
      setMentions(new Map());
    } catch (error: any) {
      console.error('Error sending message:', error);
    }
  };

  const handleDisambiguationResolve = async (resolvedClients: Map<string, string>) => {
    setShowDisambiguation(false);
    
    const clientIds = Array.from(resolvedClients.values());
    await handleSend(pendingMessage, clientIds, []);
    
    setPendingMessage('');
    setDisambiguations([]);
  };

  const handleNavigateToClient = (clientId: string) => {
    navigate(`/trainer-dashboard?tab=clients&client=${clientId}`);
  };

  const handleApprovePlan = async () => {
    if (sending) return;
    const approvalMessage = "Да, выполнить план";
    await onSendMessage(approvalMessage, 'general', [], [], selectedClient?.user_id, true);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollableElement) {
        scrollableElement.scrollTo({ 
          top: scrollableElement.scrollHeight, 
          behavior: 'smooth' 
        });
        setShowScrollButton(false);
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <ChatHeader
        selectedClient={selectedClient}
        onNavigateToProfile={() => {
          if (selectedClient) {
            navigate(`/trainer-dashboard?tab=clients&client=${selectedClient.user_id}`);
          }
        }}
      />

      <VirtualizedMessageList
        messages={messages}
        clients={clients}
        pendingActions={pendingActions}
        onNavigateToClient={handleNavigateToClient}
        onExecuteAction={onExecuteAction}
        onRejectAction={onRejectAction}
        executing={executing}
        sending={sending}
        onApprovePlan={handleApprovePlan}
        conversationId={currentConversation?.id}
        showScrollButton={showScrollButton}
        onScrollToBottom={scrollToBottom}
      />

      <AIStatusIndicator sendingState={sendingState} elapsedTime={elapsedTime} />

      <ChatInput
        onSend={handleSend}
        disabled={sending}
        clients={clients}
        clientAliases={clientAliases}
        loadingClients={loadingClients}
        mentions={mentions}
        onMentionsChange={setMentions}
      />

      {showDisambiguation && (
        <ClientDisambiguationModal
          open={showDisambiguation}
          onClose={() => setShowDisambiguation(false)}
          disambiguations={disambiguations}
          onResolve={handleDisambiguationResolve}
        />
      )}
    </div>
  );
};
