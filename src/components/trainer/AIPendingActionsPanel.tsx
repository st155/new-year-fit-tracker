import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { useTranslation } from 'react-i18next';

interface AIPendingActionsPanelProps {
  pendingActions: AIPendingAction[];
  executing: boolean;
  onExecute: (pendingActionId: string, conversationId: string, actions: any[]) => Promise<any>;
  onReject: (actionId: string) => Promise<void>;
}

export const AIPendingActionsPanel = ({
  pendingActions,
  executing,
  onExecute,
  onReject
}: AIPendingActionsPanelProps) => {
  const navigate = useNavigate();
  const { setSelectedClient } = useClientContext();
  const { t, i18n } = useTranslation('trainer');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const handleExecute = async (action: AIPendingAction) => {
    try {
      // Parse action_data into executable actions
      const actions = Array.isArray(action.action_data) 
        ? action.action_data 
        : [action.action_data];

      const result = await onExecute(action.id, action.conversation_id, actions);
      
      // Extract client_id from actions
      const clientId = actions[0]?.data?.client_id || actions[0]?.data?.user_id;
      
      // Show success toast with navigation option
      if (clientId) {
        toast.success(t('ai.actionExecuted'), {
          action: {
            label: t('ai.openClient'),
            onClick: () => {
              setSelectedClient(clientId);
              navigate(`/trainer-dashboard?tab=clients&client=${clientId}`);
            }
          }
        });
      } else {
        toast.success(t('ai.actionExecuted'));
      }
    } catch (error: any) {
      // Handle specific errors
      if (error.message?.includes('AI rate limit exceeded') || error.message?.includes('429')) {
        toast.error(t('aiToast.rateLimitTitle'));
      } else if (error.message?.includes('AI credits exhausted') || error.message?.includes('402')) {
        toast.error(t('aiToast.creditsTitle'));
      } else if (error.message?.includes('duplicate key value') || error.message?.includes('23505')) {
        toast.error(t('aiToast.duplicateMeasurement'));
      } else {
        toast.error(t('aiToast.failedExecuteActions'));
      }
      console.error('Failed to execute actions:', error);
    }
  };

  if (pendingActions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">{t('ai.noPendingActions')}</h3>
        <p className="text-sm">
          {t('ai.pendingActionsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('ai.pendingActions')}</h2>
        <span className="text-sm text-muted-foreground">
          {pendingActions.length} {pendingActions.length === 1 ? t('ai.action') : t('ai.actions')}
        </span>
      </div>

      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-4">
          {pendingActions.map((action) => (
            <Card key={action.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        {action.action_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(action.created_at), {
                          addSuffix: true,
                          locale: dateLocale
                        })}
                      </span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {action.action_plan}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExecute(action)}
                    disabled={executing}
                    size="sm"
                    className="flex-1"
                  >
                    {executing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {t('ai.execute')}
                  </Button>
                  <Button
                    onClick={() => onReject(action.id)}
                    disabled={executing}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('ai.reject')}
                  </Button>
                </div>

                {action.action_data && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {t('ai.actionDetails')}
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(action.action_data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
