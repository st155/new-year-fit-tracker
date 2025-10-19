import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Maximize2, Sparkles, X, Minimize2, Zap, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { ClientSearchAutocomplete } from './ClientSearchAutocomplete';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface Client {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

interface ContextSuggestion {
  text: string;
  icon: string;
}

interface TrainerStats {
  activeClients: number;
  averageProgress: number;
  goalsAchieved: number;
  updatesThisWeek: number;
}

interface TrainerAIWidgetProps {
  selectedClient?: Client | null;
  compact?: boolean;
  embedded?: boolean;
  mode?: 'overview' | 'standalone';
  contextSuggestions?: ContextSuggestion[];
  stats?: TrainerStats;
  clients?: any[];
}

export const TrainerAIWidget = ({ 
  selectedClient: initialClient, 
  compact = false, 
  embedded = false,
  mode = 'standalone',
  contextSuggestions = [],
  stats,
  clients = []
}: TrainerAIWidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialClient || null);
  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    conversations, 
    currentConversation, 
    sending, 
    sendMessage, 
    selectConversation,
    startNewConversation 
  } = useAIConversations(user?.id);
  const { pendingActions } = useAIPendingActions(user?.id);

  // Auto-select last conversation on mount (for overview mode only)
  useEffect(() => {
    if (mode === 'overview' && conversations.length > 0 && !currentConversation) {
      const lastConversation = conversations[0]; // Already sorted by last_message_at
      console.log('📌 Auto-selecting last conversation:', lastConversation.id);
      selectConversation(lastConversation.id);
    }
  }, [conversations, currentConversation, mode]);

  const recentMessages = mode === 'overview' ? messages.slice(-3) : messages.slice(-5);

  const handleSend = async (customInput?: string) => {
    const messageText = customInput || input;
    if (!messageText.trim() || sending) return;
    
    const autoExecute = localStorage.getItem('ai-auto-execute') !== 'false';
    
    await sendMessage(
      messageText,
      'general',
      selectedClient ? [selectedClient.user_id] : [],
      selectedClient ? [selectedClient.full_name] : [],
      selectedClient?.user_id,
      autoExecute
    );
    
    if (!customInput) {
      setInput('');
    }
  };

  const sendQuickCommand = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
    toast.info('Quick command added to input');
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

  const heightClass = mode === 'overview' ? 'h-[calc(100vh-200px)]' : (compact ? 'h-[400px]' : 'h-[500px]');

  return (
    <Card className={`flex flex-col ${heightClass} bg-slate-900/50 border-slate-800`}>
      {/* Header */}
      <CardHeader className="p-4 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-xs text-slate-400">Cmd+K to focus</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {pendingActions.length > 0 && (
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                {pendingActions.length}
              </Badge>
            )}
            {mode === 'overview' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
            )}
            {!embedded && (
              <Button variant="ghost" size="sm" onClick={handleExpand} className="h-8 w-8 p-0">
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <>
            <ClientSearchAutocomplete onSelect={setSelectedClient} />

            {selectedClient && (
              <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedClient.avatar_url} />
                  <AvatarFallback className="text-xs bg-purple-500/20">
                    {getInitials(selectedClient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium flex-1 text-white">{selectedClient.full_name}</span>
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
          </>
        )}
      </CardHeader>

      {isCollapsed ? (
        <div className="p-4 text-center">
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
            {pendingActions.length} pending actions
          </Badge>
        </div>
      ) : (
        <>
          {/* Quick Commands for overview mode */}
          {mode === 'overview' && (
            <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-purple-900/10 to-transparent space-y-3">
              <div>
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1 text-slate-300">
                  <Zap className="h-3 w-3 text-purple-400" />
                  Quick Commands
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors bg-slate-800 text-slate-300 border-slate-700"
                    onClick={() => sendQuickCommand("Кто не тренировался сегодня?")}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Today's stats
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors bg-slate-800 text-slate-300 border-slate-700"
                    onClick={() => sendQuickCommand("Создать цели для клиентов")}
                  >
                    <Target className="h-3 w-3 mr-1" />
                    Create goals
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors bg-slate-800 text-slate-300 border-slate-700"
                    onClick={() => sendQuickCommand("Прогресс за неделю")}
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Weekly progress
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-semibold mb-2 text-slate-300">📋 Создание планов</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors text-slate-300"
                    onClick={() => sendQuickCommand('Создай недельный план тренировок для выбранного клиента: понедельник - грудь + трицепс, среда - спина + бицепс, пятница - ноги + плечи')}
                  >
                    Push/Pull/Legs
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors text-slate-300"
                    onClick={() => sendQuickCommand('Составь программу для начинающего на 3 тренировки в неделю: full body каждый день')}
                  >
                    Full Body 3x
                  </Badge>
                  
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-purple-500/20 transition-colors text-slate-300"
                    onClick={() => sendQuickCommand('Создай план для набора массы: 4 тренировки в неделю, верх/низ сплит')}
                  >
                    Масса 4x
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestions for overview mode */}
          {mode === 'overview' && contextSuggestions.length > 0 && (
            <div className="p-3 bg-purple-900/10 border-b border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-purple-300">💡 AI Suggestions</h4>
              {contextSuggestions.map((suggestion, idx) => (
                <Button 
                  key={idx}
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-left h-auto py-2 hover:bg-purple-500/10 text-slate-300"
                  onClick={() => handleSend(suggestion.text)}
                >
                  <span className="mr-2">{suggestion.icon}</span>
                  <span className="text-xs">{suggestion.text}</span>
                </Button>
              ))}
            </div>
          )}

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            {recentMessages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                
                {currentConversation ? (
                  // Show last conversation preview with continue/new options
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-300">Последний разговор</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDistanceToNow(new Date(currentConversation.last_message_at || currentConversation.created_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="default" 
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          selectConversation(currentConversation.id);
                          inputRef.current?.focus();
                        }}
                      >
                        Продолжить разговор
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          startNewConversation();
                          inputRef.current?.focus();
                          toast.info('Начат новый разговор');
                        }}
                      >
                        Начать новую
                      </Button>
                    </div>
                  </div>
                ) : (
                  // No conversations yet - show default empty state
                  <>
                    <p className="text-sm">Начните разговор с AI</p>
                    {!selectedClient && (
                      <p className="text-xs mt-1">Выберите клиента или задайте общий вопрос</p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Conversation header badge */}
                {currentConversation && (
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                    <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-400">
                      Разговор от {formatDistanceToNow(new Date(currentConversation.created_at), { 
                        addSuffix: true, 
                        locale: ru 
                      })}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        startNewConversation();
                        toast.info('Начат новый разговор');
                      }}
                    >
                      Начать новую
                    </Button>
                  </div>
                )}
                
                {recentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-200'
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

          {/* Input Area */}
          <CardContent className="p-4 border-t border-slate-800 space-y-2">
            <Textarea
              ref={inputRef}
              data-ai-input
              placeholder="Спросите AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[60px] resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              disabled={sending}
            />
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                Pending: {pendingActions.length}
              </Badge>
              <Button 
                size="sm" 
                onClick={() => handleSend()} 
                disabled={!input.trim() || sending}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {sending ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
};
