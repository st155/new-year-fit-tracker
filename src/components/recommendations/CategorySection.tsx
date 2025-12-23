import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Pill, 
  Dumbbell, 
  Moon, 
  FlaskConical, 
  Heart,
  Utensils,
  Info,
} from 'lucide-react';
import { RecommendationCategory } from '@/hooks/useAllRecommendations';
import { MergedRecommendation } from '@/lib/deduplication';
import { RecommendationCard } from './RecommendationCard';
import { cn } from '@/lib/utils';

const CATEGORY_CONFIG: Record<RecommendationCategory, { 
  icon: React.ElementType; 
  label: string; 
  description: string;
  color: string;
  bgColor: string;
  emptyMessage: string;
}> = {
  sleep: { 
    icon: Moon, 
    label: 'Сон', 
    description: 'Рекомендации по улучшению качества сна и recovery',
    color: 'text-indigo-500', 
    bgColor: 'bg-indigo-500/10',
    emptyMessage: 'Нет рекомендаций по сну. Подключите Whoop или Apple Watch для анализа.',
  },
  exercise: { 
    icon: Dumbbell, 
    label: 'Тренировки', 
    description: 'Рекомендации по физической активности',
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10',
    emptyMessage: 'Нет рекомендаций по тренировкам.',
  },
  supplement: { 
    icon: Pill, 
    label: 'Добавки', 
    description: 'Рекомендованные добавки и медикаменты',
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
    emptyMessage: 'Нет рекомендаций по добавкам. Загрузите назначения врача.',
  },
  checkup: { 
    icon: FlaskConical, 
    label: 'Чекапы', 
    description: 'Повторные анализы и консультации',
    color: 'text-purple-500', 
    bgColor: 'bg-purple-500/10',
    emptyMessage: 'Нет запланированных чекапов.',
  },
  lifestyle: { 
    icon: Heart, 
    label: 'Образ жизни', 
    description: 'Рекомендации по образу жизни',
    color: 'text-pink-500', 
    bgColor: 'bg-pink-500/10',
    emptyMessage: 'Нет рекомендаций по образу жизни.',
  },
  nutrition: { 
    icon: Utensils, 
    label: 'Питание', 
    description: 'Рекомендации по питанию',
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    emptyMessage: 'Нет рекомендаций по питанию.',
  },
};

interface CategorySectionProps {
  category: RecommendationCategory;
  recommendations: MergedRecommendation[];
  onAction?: (recommendation: MergedRecommendation) => void;
  onDismiss?: (recommendation: MergedRecommendation) => void;
  actionPendingId?: string | null;
  showHeader?: boolean;
}

export function CategorySection({ 
  category, 
  recommendations,
  onAction,
  onDismiss,
  actionPendingId,
  showHeader = true,
}: CategorySectionProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  const pendingCount = recommendations.filter(r => r.status === 'pending').length;
  const highPriorityCount = recommendations.filter(r => r.priority === 'high' && r.status === 'pending').length;

  return (
    <Card className="glass-card">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {config.label}
                  {pendingCount > 0 && (
                    <Badge variant="secondary">{pendingCount}</Badge>
                  )}
                  {highPriorityCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {highPriorityCount} важных
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-0" : ""}>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map(rec => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onAction={onAction}
                onDismiss={onDismiss}
                isActionPending={actionPendingId === rec.id}
              />
            ))}
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{config.emptyMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
