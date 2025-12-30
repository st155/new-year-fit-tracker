import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bot, User, Loader2, CheckCircle, XCircle, AlertCircle, ExternalLink, FileText, Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { AIMessage } from '@/types/trainer';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useState } from 'react';
import { RecognizedClientBadge } from '@/components/trainer/ai/RecognizedClientBadge';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  message: AIMessage;
  clients: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  }>;
  onNavigateToClient: (clientId: string) => void;
  pendingAction?: AIPendingAction;
  onExecuteAction?: () => void;
  onRejectAction?: () => void;
  executing?: boolean;
  sending?: boolean;
  onApprovePlan?: () => void;
  onReconsiderPlan?: () => void;
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const MessageBubble = memo(({
  message,
  clients,
  onNavigateToClient,
  pendingAction,
  onExecuteAction,
  onRejectAction,
  executing,
  sending,
  onApprovePlan,
  onReconsiderPlan
}: MessageBubbleProps) => {
  const { t, i18n } = useTranslation('trainer');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  const isOptimistic = message.metadata?.isOptimistic;
  const status = message.metadata?.status;
  const isAutoExecuted = message.role === 'system' && message.metadata?.autoExecuted;

  // Clean debug content from AI messages
  const cleanContent = (content: string): string => {
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim().toLowerCase();
      // Filter out SQL queries and debug information
      return !trimmed.startsWith('`update_goal') &&
             !trimmed.startsWith('`add_measurement') &&
             !trimmed.startsWith('`create_client_goals') &&
             !trimmed.includes('client_id=') &&
             !trimmed.includes('measure_unit=') &&
             !trimmed.includes('goal_name=') &&
             !trimmed.includes('executing now...') &&
             trimmed.length > 0; // Remove empty lines
    });
    return filteredLines.join('\n').trim();
  };

  // Render clickable client mentions
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    const mentions: Array<{
      start: number;
      end: number;
      text: string;
      clientId: string;
    }> = [];
    
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

    mentions.sort((a, b) => a.start - b.start);
    
    const filteredMentions: typeof mentions = [];
    mentions.forEach(mention => {
      const hasOverlap = filteredMentions.some(
        m => (mention.start >= m.start && mention.start < m.end) ||
             (mention.end > m.start && mention.end <= m.end)
      );
      if (!hasOverlap) {
        filteredMentions.push(mention);
      }
    });

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    filteredMentions.forEach((mention, idx) => {
      if (mention.start > lastIndex) {
        parts.push(content.substring(lastIndex, mention.start));
      }

      parts.push(
        <Button
          key={`mention-${idx}`}
          variant="link"
          className="p-0 h-auto font-medium text-primary inline"
          onClick={() => onNavigateToClient(mention.clientId)}
        >
          {mention.text}
        </Button>
      );

      lastIndex = mention.end;
    });

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  // Auto-execution report component
  if (isAutoExecuted) {
    const [expanded, setExpanded] = useState(false);
    const results = message.metadata?.results || [];
    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.filter((r: any) => !r.success).length;
    const totalCount = results.length;

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
                      ? t('chat.autoExecuted')
                      : failCount > 0 && successCount === 0
                        ? t('chat.executionError')
                        : t('chat.partiallyExecuted')
                    }
                  </span>
                  {successCount === totalCount && totalCount > 0 ? (
                    <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                      {successCount}/{totalCount} {t('chat.success')}
                    </Badge>
                  ) : totalCount > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {successCount}/{totalCount} {t('chat.success')}
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
                                : `${result.action || result.action_type}: ${result.error || t('chat.unknownError')}`
                              }
                            </span>
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
                            {t('chat.collapse')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            {t('chat.showAll', { count: results.length })}
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
  }

  // Pending action card
  if (pendingAction && message.metadata?.hasPendingAction) {
    return (
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-4 my-3 animate-fade-in">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm">
                {t('chat.planReady')}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 whitespace-pre-wrap break-words">
                {pendingAction.action_plan}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={onExecuteAction}
              disabled={executing}
              className="flex-1 justify-center bg-green-600 hover:bg-green-700 text-white"
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {t('chat.execute')}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRejectAction}
              disabled={executing}
              className="flex-1 justify-center"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('chat.reconsider')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // User message
  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-3 animate-fade-in">
        <div className="max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          
          {/* Recognized Client Badge */}
          {message.metadata?.recognizedClient && (
            <div className="flex justify-end mt-1">
              <RecognizedClientBadge
                recognizedClient={message.metadata.recognizedClient}
                clients={clients}
                onNavigateToClient={onNavigateToClient}
              />
            </div>
          )}
          
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: dateLocale })}
            </span>
            {isOptimistic && (
              <>
                {status === 'sending' && <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />}
                {status === 'sent' && <CheckCircle className="h-3 w-3 text-green-500" />}
                {status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
              </>
            )}
          </div>
        </div>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  // Assistant message
  const actionData = message.metadata?.suggestedActions || [];
  const actionCount = actionData.length || 0;
  const isPreparing = message.metadata?.status === 'preparing';

  return (
    <div className="flex gap-3 animate-fade-in">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 max-w-[80%]">
        <div className="bg-muted rounded-lg px-4 py-2">
          <p className="text-sm whitespace-pre-wrap break-words">{renderMessageContent(cleanContent(message.content))}</p>
        </div>
        
        {message.metadata?.needsApproval && actionCount > 0 && (
          <div className="mt-3 border-l-4 border-primary pl-3">
            <div className="flex items-center gap-2 mb-2">
              {isPreparing ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-primary" />
              )}
              <Badge variant="secondary" className="text-xs">
                {isPreparing ? t('chat.preparingPlan') : t('chat.planAwaiting')}
              </Badge>
            </div>
            
            {!isPreparing && actionCount > 0 && (
              <div className="text-xs text-muted-foreground mb-3">
                {t('chat.actionsCount', { count: actionCount })}
              </div>
            )}
            
            {isPreparing ? (
              <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('chat.preparingStructuredPlan')}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onApprovePlan}
                  disabled={sending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('chat.execute')}
                </Button>
                <Button
                  size="sm"
                    variant="outline"
                    onClick={onReconsiderPlan}
                    disabled={sending}
                  >
                    {t('chat.think')}
                </Button>
              </div>
            )}
          </div>
        )}
        
        <span className="text-xs text-muted-foreground mt-1 block">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: dateLocale })}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.metadata?.status === nextProps.message.metadata?.status &&
    prevProps.pendingAction?.id === nextProps.pendingAction?.id &&
    prevProps.executing === nextProps.executing &&
    prevProps.sending === nextProps.sending
  );
});

MessageBubble.displayName = 'MessageBubble';
