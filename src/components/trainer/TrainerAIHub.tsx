import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, History, X, Filter, FileDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModernAIChatWindow } from './chat/ModernAIChatWindow';
import { AIConversationList } from './AIConversationList';
import { ConversationSearch } from './ConversationSearch';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';

interface TrainerAIHubProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

export const TrainerAIHub = ({ selectedClient }: TrainerAIHubProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [localSelectedClient, setLocalSelectedClient] = useState(selectedClient);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const {
    conversations,
    currentConversation,
    messages,
    loading: conversationsLoading,
    sending,
    sendingState,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
  } = useAIConversations(user?.id);

  const {
    pendingActions,
    loading: actionsLoading,
    executing,
    executeActions,
    rejectAction,
  } = useAIPendingActions(user?.id);

  // Update local selected client when prop changes
  useEffect(() => {
    setLocalSelectedClient(selectedClient);
  }, [selectedClient]);

  // Auto-select last conversation if no current conversation
  useEffect(() => {
    if (!currentConversation && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, currentConversation, selectConversation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K - открыть историю
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setHistoryOpen(true);
      }
      
      // Ctrl/Cmd + N - новый разговор
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        startNewConversation();
        setHistoryOpen(false);
      }
      
      // Esc - закрыть историю
      if (e.key === 'Escape' && historyOpen) {
        setHistoryOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [historyOpen, startNewConversation]);

  const handleSendMessage = async (
    message: string,
    contextMode: string,
    mentionedClients: string[],
    mentionedNames?: string[],
    contextClientId?: string,
    autoExecute?: boolean
  ) => {
    // Always auto-execute (simplified), always use 'general' context
    return await sendMessage(message, 'general', mentionedClients, mentionedNames || [], contextClientId, true);
  };

  const handleClearSelectedClient = () => {
    setLocalSelectedClient(null);
  };

  const handleExportConversation = () => {
    if (!currentConversation) return;
    
    // Generate markdown export
    const markdown = messages.map(msg => 
      `**${msg.role === 'user' ? 'You' : 'AI Assistant'}** (${new Date(msg.created_at).toLocaleString()}):\n\n${msg.content}\n\n---\n\n`
    ).join('');
    
    const blob = new Blob([`# ${currentConversation.title}\n\n${markdown}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${currentConversation.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Conversation exported");
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = searchQuery === "" || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || conv.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (conversationsLoading || actionsLoading) {
    return <PageLoader message="Загрузка AI Assistant..." />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-2 md:p-4">
      {/* Compact header - stack vertically on mobile */}
      <div className="mb-3 md:mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground hidden md:block">
              Умный помощник для работы с клиентами
            </p>
          </div>
        </div>
        
        {/* History button with sheet */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {pendingActions.length > 0 && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
              {pendingActions.length}
            </Badge>
          )}
          
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size={isMobile ? "default" : "sm"} 
                className="gap-2 w-full md:w-auto"
              >
                <History className="h-4 w-4" />
                История
                <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {conversations.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className={isMobile ? "w-full" : "w-[400px]"}
            >
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>История разговоров</SheetTitle>
                  {currentConversation && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleExportConversation}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <ConversationSearch 
                  onSearch={setSearchQuery}
                  placeholder="Search conversations..."
                />
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="client_analysis">Client Analysis</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {conversationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <AIConversationList
                    conversations={filteredConversations}
                    currentConversation={currentConversation}
                    onSelectConversation={(id) => {
                      selectConversation(id);
                      setHistoryOpen(false);
                    }}
                    onNewConversation={() => {
                      startNewConversation();
                      setHistoryOpen(false);
                    }}
                    onDeleteConversation={deleteConversation}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Selected client indicator (if any) - компактный на mobile */}
      {localSelectedClient && (
        <div className="mb-2 md:mb-3 p-2 bg-muted rounded-lg border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 md:h-8 md:w-8">
              <AvatarImage src={localSelectedClient.avatar_url} />
              <AvatarFallback className="text-xs">
                {localSelectedClient.full_name?.[0] || localSelectedClient.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm md:text-base font-medium truncate max-w-[200px] md:max-w-none">
              {localSelectedClient.full_name || localSelectedClient.username}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClearSelectedClient}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Full-width chat - адаптивная высота */}
      <Card 
        className="p-0 flex flex-col overflow-hidden" 
        style={{ 
          height: isMobile 
            ? 'calc(100vh - 180px)' 
            : 'calc(100vh - 200px)', 
          minHeight: isMobile ? '400px' : '600px' 
        }}
      >
        <ModernAIChatWindow
          messages={messages}
          currentConversation={currentConversation}
          selectedClient={localSelectedClient}
          sending={sending}
          sendingState={sendingState}
          onSendMessage={handleSendMessage}
          pendingActions={pendingActions}
          onExecuteAction={executeActions}
          onRejectAction={rejectAction}
          executing={executing}
        />
      </Card>
    </div>
  );
};
