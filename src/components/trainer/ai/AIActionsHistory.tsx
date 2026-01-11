import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIActionsHistory } from '@/hooks/useAIActionsHistory';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { 
  Target, 
  TrendingUp, 
  CheckSquare, 
  Dumbbell, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '@/lib/date-locale';

interface AIActionsHistoryProps {
  userId: string | undefined;
}

const getActionIcon = (actionType: string) => {
  const type = actionType.toLowerCase();
  if (type.includes('goal')) return Target;
  if (type.includes('measurement') || type.includes('metric')) return TrendingUp;
  if (type.includes('task')) return CheckSquare;
  if (type.includes('training') || type.includes('plan')) return Dumbbell;
  return Activity;
};

export function AIActionsHistory({ userId }: AIActionsHistoryProps) {
  const { t } = useTranslation('trainer');
  const { actions, loading } = useAIActionsHistory(userId);
  const { user } = useAuth();
  const { pendingActions, loading: pendingLoading } = useAIPendingActions(user?.id);
  const [activeTab, setActiveTab] = useState<'executed' | 'pending' | 'rejected' | 'all'>('executed');

  const getActionTypeLabel = (actionType: string) => {
    const type = actionType.toLowerCase();
    if (type.includes('create_goal')) return t('aiHistory.actionTypes.createGoal');
    if (type.includes('update_goal')) return t('aiHistory.actionTypes.updateGoal');
    if (type.includes('delete_goal')) return t('aiHistory.actionTypes.deleteGoal');
    if (type.includes('add_measurement')) return t('aiHistory.actionTypes.addMeasurement');
    if (type.includes('create_task')) return t('aiHistory.actionTypes.createTask');
    if (type.includes('update_task')) return t('aiHistory.actionTypes.updateTask');
    if (type.includes('create_training_plan')) return t('aiHistory.actionTypes.createPlan');
    if (type.includes('assign_training_plan')) return t('aiHistory.actionTypes.assignPlan');
    return actionType;
  };

  const getGoalTypeLabel = (goalType: string) => {
    const key = `aiHistory.goalLabels.${goalType}`;
    const translated = t(key);
    return translated !== key ? translated : goalType;
  };

  const getActionDescription = (action: any) => {
    const details = action.action_details || {};
    const type = action.action_type.toLowerCase();
    
    if (type.includes('create_goal')) {
      const goalName = details.goal_name || getGoalTypeLabel(details.goal_type);
      const targetValue = details.target_value;
      const targetUnit = details.target_unit || '';
      return `${goalName}: ${targetValue} ${targetUnit}`;
    }
    
    if (type.includes('update_goal')) {
      const goalName = details.goal_name || getGoalTypeLabel(details.goal_type);
      if (details.target_value) {
        return `${goalName}: ${details.target_value} ${details.target_unit || ''}`;
      }
      return goalName;
    }
    
    if (type.includes('delete_goal')) {
      const goalName = details.goal_name || t('aiHistory.goalLabels.weight');
      return goalName;
    }
    
    if (type.includes('add_measurement')) {
      const metricName = details.metric_name || details.goal_name || t('aiHistory.goalLabels.weight');
      const value = details.value;
      const unit = details.unit || '';
      return `${metricName}: ${value} ${unit}`;
    }
    
    if (type.includes('create_task')) {
      return details.title || details.description || '';
    }
    
    if (type.includes('update_task')) {
      return details.title || details.description || '';
    }
    
    if (type.includes('create_training_plan')) {
      return details.plan_name || details.name || '';
    }
    
    if (type.includes('assign') && type.includes('plan')) {
      return details.plan_name || details.name || '';
    }
    
    return JSON.stringify(details).substring(0, 100);
  };

  if (loading || pendingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filter based on active tab
  const displayedActions = activeTab === 'executed' ? actions : [];
  const displayedPending = ['pending', 'all'].includes(activeTab) 
    ? pendingActions.filter(pa => pa.status === 'pending')
    : [];
  const displayedRejected = ['rejected', 'all'].includes(activeTab)
    ? pendingActions.filter(pa => pa.status === 'rejected')
    : [];

  const totalCount = activeTab === 'all' 
    ? actions.length + displayedPending.length + displayedRejected.length
    : activeTab === 'pending'
    ? displayedPending.length
    : activeTab === 'rejected'
    ? displayedRejected.length
    : actions.length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('aiHistory.title')}</h2>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="executed" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('aiHistory.tabs.executed')}
            {actions.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {actions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {t('aiHistory.tabs.pending')}
            {pendingActions.filter(pa => pa.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingActions.filter(pa => pa.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            {t('aiHistory.tabs.rejected')}
            {pendingActions.filter(pa => pa.status === 'rejected').length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pendingActions.filter(pa => pa.status === 'rejected').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            <Filter className="h-3 w-3 mr-1" />
            {t('aiHistory.tabs.all')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {activeTab === 'executed' && t('aiHistory.empty.executed')}
                {activeTab === 'pending' && t('aiHistory.empty.pending')}
                {activeTab === 'rejected' && t('aiHistory.empty.rejected')}
                {activeTab === 'all' && t('aiHistory.empty.all')}
              </h3>
              <p className="text-sm">
                {activeTab === 'executed' && t('aiHistory.empty.executedDesc')}
                {activeTab === 'pending' && t('aiHistory.empty.pendingDesc')}
                {activeTab === 'rejected' && t('aiHistory.empty.rejectedDesc')}
                {activeTab === 'all' && t('aiHistory.empty.allDesc')}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-3">
                {/* Pending Actions */}
                {displayedPending.map((action) => (
                  <Card 
                    key={action.id} 
                    className="p-4 border border-amber-500/30 bg-amber-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-amber-500/10">
                        <Clock className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-amber-500/10">
                            {t('aiHistory.awaitingConfirmation')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.created_at).toLocaleString(getIntlLocale())}
                          </span>
                        </div>
                        <p className="text-sm mb-2 font-medium">
                          {action.action_plan}
                        </p>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {t('aiHistory.actionDetails')}
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(action.action_data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Rejected Actions */}
                {displayedRejected.map((action) => (
                  <Card 
                    key={action.id} 
                    className="p-4 border border-red-500/30 bg-red-500/5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-red-500/10">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-red-500/10">
                            {t('aiHistory.rejected')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.created_at).toLocaleString(getIntlLocale())}
                          </span>
                        </div>
                        <p className="text-sm mb-2 font-medium">
                          {action.action_plan}
                        </p>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {t('aiHistory.actionDetails')}
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(action.action_data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Executed Actions */}
                {displayedActions.map((action) => {
                  const Icon = getActionIcon(action.action_type);
                  
                  return (
                    <Card 
                      key={action.id} 
                      className={cn(
                        "p-4 border transition-colors",
                        action.success 
                          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10" 
                          : "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "shrink-0 mt-0.5 p-2 rounded-lg",
                          action.success ? "bg-green-500/10" : "bg-destructive/10"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            action.success ? "text-green-500" : "text-destructive"
                          )} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getActionTypeLabel(action.action_type)}
                            </Badge>
                            
                            {action.client_name && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {action.client_name}
                              </Badge>
                            )}
                            
                            <div className="flex items-center gap-1.5">
                              {action.success ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {action.success ? t('aiHistory.success') : t('aiHistory.error')}
                              </span>
                            </div>
                            
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                const actionDate = new Date(action.created_at);
                                const now = new Date();
                                const diffHours = (now.getTime() - actionDate.getTime()) / (1000 * 60 * 60);
                                const locale = getIntlLocale();
                                
                                if (diffHours < 24) {
                                  return actionDate.toLocaleTimeString(locale, { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  });
                                } else if (diffHours < 168) { // less than 7 days
                                  return actionDate.toLocaleDateString(locale, { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                } else {
                                  return actionDate.toLocaleDateString(locale, { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    year: 'numeric'
                                  });
                                }
                              })()}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm mb-2 font-medium">
                            {getActionDescription(action)}
                          </p>

                          {/* Error message */}
                          {!action.success && action.error_message && (
                            <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                              {action.error_message}
                            </div>
                          )}

                          {/* Details */}
                          <details className="text-xs mt-2">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              {t('aiHistory.technicalDetails')}
                            </summary>
                            <div className="mt-2 p-3 bg-muted rounded text-xs space-y-1">
                              {Object.entries(action.action_details || {}).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground font-mono min-w-[120px]">{key}:</span>
                                  <span className="font-mono break-all">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
