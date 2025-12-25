import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  Calendar, 
  Pause, 
  Trophy,
  Check,
  X,
  MessageCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { adminApi } from '@/lib/api';

interface AIGoalSuggestion {
  id: string;
  goal_id: string;
  suggestion_type: string;
  current_progress: number;
  progress_trend: string;
  recommendation_text: string;
  suggested_action: any;
  confidence_score: number;
  priority: number;
  status: string;
  created_at: string;
  goals?: {
    goal_name: string;
    target_unit: string;
  };
}

interface AIGoalSuggestionsProps {
  clientId: string;
  trainerId: string;
  onOpenChat?: () => void;
}

export function AIGoalSuggestions({ clientId, trainerId, onOpenChat }: AIGoalSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AIGoalSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_goal_suggestions')
        .select(`
          *,
          goals(goal_name, target_unit)
        `)
        .eq('client_id', clientId)
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions((data || []) as AIGoalSuggestion[]);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить рекомендации',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async (force = false) => {
    setGenerating(true);
    try {
      const { data, error } = await adminApi.trainerSuggestAdjustments(clientId, force);

      if (error) throw error;

      toast({
        title: '✨ Анализ завершен',
        description: data.analysis_summary || `Создано ${data.suggestions_count} рекомендаций`,
      });

      loadSuggestions();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать рекомендации',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = async (suggestion: AIGoalSuggestion) => {
    setApplying(suggestion.id);
    try {
      const action = suggestion.suggested_action;
      let actionType = 'update_goal_target';
      let actionData: any = {
        goal_name: suggestion.goals?.goal_name,
        target_value: action.new_value
      };

      if (suggestion.suggestion_type === 'adjust_target') {
        actionType = 'update_goal_target';
      } else if (suggestion.suggestion_type === 'pause_goal') {
        // For pause, we could set a status or deadline
        actionType = 'update_goal_target';
        actionData.notes = 'Приостановлено по рекомендации AI';
      }

      const { data, error } = await adminApi.trainerExecute({
        trainerId,
        clientId,
        actions: [actionData],
        autoConfirm: true
      });

      if (error) throw error;

      // Update suggestion status
      await supabase
        .from('ai_goal_suggestions')
        .update({ status: 'accepted', applied_at: new Date().toISOString() })
        .eq('id', suggestion.id);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['goals', clientId] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress', clientId] });

      toast({
        title: '✅ Применено',
        description: 'Рекомендация успешно применена',
      });

      loadSuggestions();
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось применить рекомендацию',
        variant: 'destructive',
      });
    } finally {
      setApplying(null);
    }
  };

  const dismissSuggestion = async (id: string) => {
    try {
      await supabase
        .from('ai_goal_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', id);

      toast({
        title: 'Отклонено',
        description: 'Рекомендация отклонена',
      });

      loadSuggestions();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отклонить рекомендацию',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadSuggestions();

    // Realtime subscription
    const channel = supabase
      .channel('ai_suggestions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_goal_suggestions',
          filter: `client_id=eq.${clientId}`
        },
        () => loadSuggestions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'adjust_target': return <TrendingUp className="h-5 w-5" />;
      case 'new_goal': return <Target className="h-5 w-5" />;
      case 'change_deadline': return <Calendar className="h-5 w-5" />;
      case 'pause_goal': return <Pause className="h-5 w-5" />;
      case 'celebrate': return <Trophy className="h-5 w-5" />;
      default: return <Sparkles className="h-5 w-5" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'ahead': return 'text-green-600';
      case 'on_track': return 'text-blue-600';
      case 'behind': return 'text-orange-600';
      case 'stagnant': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-800 border-red-300';
    if (priority === 2) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (priority === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI-Рекомендации по целям</CardTitle>
            {suggestions.length > 0 && (
              <Badge variant="secondary">{suggestions.length}</Badge>
            )}
          </div>
          <Button
            onClick={() => generateSuggestions(true)}
            disabled={generating}
            size="sm"
            variant="outline"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Обновить</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Нет активных рекомендаций
            </p>
            <Button onClick={() => generateSuggestions(false)} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Сгенерировать рекомендации
            </Button>
          </div>
        ) : (
          suggestions.map((suggestion) => (
            <Card 
              key={suggestion.id}
              className={`border-2 ${
                suggestion.priority === 1 ? 'border-red-200' :
                suggestion.priority === 2 ? 'border-orange-200' :
                'border-border'
              }`}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getTypeIcon(suggestion.suggestion_type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">
                          {suggestion.goals?.goal_name}
                        </h4>
                        <p className={`text-sm font-medium ${getTrendColor(suggestion.progress_trend)}`}>
                          {suggestion.progress_trend === 'ahead' && '📈 Опережает график'}
                          {suggestion.progress_trend === 'on_track' && '✅ По плану'}
                          {suggestion.progress_trend === 'behind' && '⚠️ Отстает'}
                          {suggestion.progress_trend === 'stagnant' && '⛔ Застой'}
                        </p>
                      </div>
                    </div>
                    <Badge className={getPriorityColor(suggestion.priority)}>
                      Приоритет: {suggestion.priority}
                    </Badge>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">💡 Рекомендация:</p>
                    <p className="text-sm">{suggestion.recommendation_text}</p>
                  </div>

                  {/* Action */}
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <p className="text-sm font-semibold mb-2">
                      ✅ {suggestion.suggested_action.type === 'increase_target' && 'Увеличить цель:'}
                      {suggestion.suggested_action.type === 'decrease_target' && 'Снизить цель:'}
                      {suggestion.suggested_action.type === 'pause' && 'Приостановить цель'}
                    </p>
                    {suggestion.suggested_action.old_value && suggestion.suggested_action.new_value && (
                      <p className="text-lg font-bold text-primary">
                        {suggestion.suggested_action.old_value} → {suggestion.suggested_action.new_value} {suggestion.goals?.target_unit}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {suggestion.suggested_action.reasoning}
                    </p>
                  </div>

                  {/* Confidence */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Уверенность AI:</span>
                      <span className="font-medium">{suggestion.confidence_score}%</span>
                    </div>
                    <Progress value={suggestion.confidence_score} className="h-2" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => applySuggestion(suggestion)}
                      disabled={applying === suggestion.id}
                      className="flex-1"
                    >
                      {applying === suggestion.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Применить
                    </Button>
                    <Button
                      onClick={() => dismissSuggestion(suggestion.id)}
                      variant="outline"
                      disabled={applying === suggestion.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Отклонить
                    </Button>
                    {onOpenChat && (
                      <Button
                        onClick={onOpenChat}
                        variant="outline"
                        disabled={applying === suggestion.id}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}