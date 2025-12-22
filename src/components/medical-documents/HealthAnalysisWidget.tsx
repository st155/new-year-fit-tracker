import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface HealthAnalysis {
  id: string;
  overall_score: number | null;
  health_categories: {
    cardiovascular?: number;
    metabolic?: number;
    body_composition?: number;
    recovery?: number;
  };
  summary: string;
  achievements: string[];
  concerns: string[];
  recommendations: any[];
  analysis_date: string;
  documents_analyzed: number;
}

export function HealthAnalysisWidget() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['health-analysis-latest'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('health_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as HealthAnalysis | null;
    }
  });

  const generateAnalysis = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-health-analysis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate analysis');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-analysis-latest'] });
      toast.success('Анализ здоровья успешно обновлен');
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast.error(`Ошибка: ${error.message}`);
      setIsGenerating(false);
    }
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateAnalysis.mutate();
  };

  if (isLoading) {
    return (
      <Card className="glass-card col-span-2 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card col-span-2 p-6 border-primary/20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Общий анализ здоровья</h3>
              {analysis && (
                <p className="text-sm text-muted-foreground">
                  Последнее обновление: {new Date(analysis.analysis_date).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Обновить
              </>
            )}
          </Button>
        </div>

        {!analysis ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium mb-2">Нет данных для анализа</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Загрузите и обработайте медицинские документы для получения<br />
                  персонализированного анализа состояния здоровья
                </p>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? 'Генерация...' : 'Создать анализ'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Overall Score */}
            {analysis.overall_score == null ? (
              <div className="text-center py-6 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Недостаточно данных для расчёта оценки</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Проанализировано документов: {analysis.documents_analyzed}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${(analysis.overall_score / 10) * 251.2} 251.2`}
                      className="text-primary transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{analysis.overall_score.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Общая оценка здоровья</p>
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Проанализировано документов: {analysis.documents_analyzed}
                  </p>
                </div>
              </div>
            )}

            {/* Categories */}
            {analysis.health_categories && Object.keys(analysis.health_categories).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(analysis.health_categories).map(([key, value]) => (
                  <div key={key} className="bg-background/50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-primary">{value != null ? value.toFixed(1) : '—'}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {key === 'cardiovascular' && 'Сердечно-сосудистая'}
                      {key === 'metabolic' && 'Метаболизм'}
                      {key === 'body_composition' && 'Композиция тела'}
                      {key === 'recovery' && 'Восстановление'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Achievements & Concerns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Achievements */}
              {analysis.achievements && analysis.achievements.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Сильные стороны</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.achievements.slice(0, 3).map((achievement, idx) => (
                      <Badge key={idx} variant="outline" className="border-green-500/50 text-green-600">
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Concerns */}
              {analysis.concerns && analysis.concerns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>Требует внимания</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.concerns.slice(0, 3).map((concern, idx) => (
                      <Badge key={idx} variant="outline" className="border-yellow-500/50 text-yellow-600">
                        {concern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
