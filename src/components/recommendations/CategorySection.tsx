import { useTranslation } from 'react-i18next';
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

const CATEGORY_STATIC_CONFIG: Record<RecommendationCategory, { 
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  sleep: { 
    icon: Moon, 
    color: 'text-indigo-500', 
    bgColor: 'bg-indigo-500/10',
  },
  exercise: { 
    icon: Dumbbell, 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-500/10',
  },
  supplement: { 
    icon: Pill, 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10',
  },
  checkup: { 
    icon: FlaskConical, 
    color: 'text-purple-500', 
    bgColor: 'bg-purple-500/10',
  },
  lifestyle: { 
    icon: Heart, 
    color: 'text-pink-500', 
    bgColor: 'bg-pink-500/10',
  },
  nutrition: { 
    icon: Utensils, 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
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
  const { t } = useTranslation('recommendations');
  const staticConfig = CATEGORY_STATIC_CONFIG[category];
  const Icon = staticConfig.icon;
  const pendingCount = recommendations.filter(r => r.status === 'pending').length;
  const highPriorityCount = recommendations.filter(r => r.priority === 'high' && r.status === 'pending').length;

  const label = t(`categories.${category}.label`);
  const description = t(`categories.${category}.description`);
  const emptyMessage = t(`categories.${category}.emptyMessage`);

  return (
    <Card className="glass-card">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", staticConfig.bgColor)}>
                <Icon className={cn("h-5 w-5", staticConfig.color)} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {label}
                  {pendingCount > 0 && (
                    <Badge variant="secondary">{pendingCount}</Badge>
                  )}
                  {highPriorityCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {t('priority.important', { count: highPriorityCount })}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{description}</p>
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
                key={rec.mergedId}
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
            <AlertDescription>{emptyMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
