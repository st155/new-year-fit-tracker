import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Pill, 
  Dumbbell, 
  Moon, 
  FlaskConical, 
  Heart,
  Utensils,
  Plus,
  XCircle,
  Clock,
  User,
  Loader2,
  Sparkles,
  Stethoscope,
  Activity,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { UnifiedRecommendation, RecommendationCategory } from '@/hooks/useAllRecommendations';
import { MergedRecommendation } from '@/lib/deduplication';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const CATEGORY_CONFIG: Record<RecommendationCategory, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  sleep: { icon: Moon, label: 'Сон', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  exercise: { icon: Dumbbell, label: 'Тренировки', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  supplement: { icon: Pill, label: 'Добавки', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  checkup: { icon: FlaskConical, label: 'Чекапы', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  lifestyle: { icon: Heart, label: 'Образ жизни', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  nutrition: { icon: Utensils, label: 'Питание', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

const SOURCE_CONFIG = {
  doctor: { icon: Stethoscope, label: 'Врач' },
  ai: { icon: Sparkles, label: 'AI' },
  device: { icon: Activity, label: 'Устройство' },
  manual: { icon: User, label: 'Вручную' },
};

const STATUS_CONFIG = {
  pending: { label: 'Ожидает', className: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  active: { label: 'Активно', className: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  completed: { label: 'Выполнено', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
  dismissed: { label: 'Отклонено', className: 'bg-muted text-muted-foreground' },
};

interface RecommendationCardProps {
  recommendation: MergedRecommendation;
  onAction?: (recommendation: MergedRecommendation) => void;
  onDismiss?: (recommendation: MergedRecommendation) => void;
  isActionPending?: boolean;
  compact?: boolean;
}

export function RecommendationCard({ 
  recommendation, 
  onAction, 
  onDismiss,
  isActionPending,
  compact = false,
}: RecommendationCardProps) {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const categoryConfig = CATEGORY_CONFIG[recommendation.category];
  const sourceConfig = SOURCE_CONFIG[recommendation.source];
  const statusConfig = STATUS_CONFIG[recommendation.status];
  const CategoryIcon = categoryConfig.icon;
  const SourceIcon = sourceConfig.icon;
  
  const hasMerged = recommendation.mergeCount > 1;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
        <div className={cn("p-2 rounded-lg", categoryConfig.bgColor)}>
          <CategoryIcon className={cn("h-4 w-4", categoryConfig.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm truncate">{recommendation.title}</p>
            {hasMerged && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 text-[10px] px-1.5 py-0">
                ×{recommendation.mergeCount}
              </Badge>
            )}
          </div>
          {recommendation.description && (
            <p className="text-xs text-muted-foreground truncate">{recommendation.description}</p>
          )}
        </div>
        {recommendation.priority === 'high' && (
          <Badge variant="destructive" className="text-xs shrink-0">Важно</Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-card hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn("p-2.5 rounded-xl", categoryConfig.bgColor)}>
              <CategoryIcon className={cn("h-5 w-5", categoryConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h4 className="font-medium">{recommendation.title}</h4>
                {hasMerged && (
                  <Badge 
                    variant="secondary" 
                    className="bg-blue-500/20 text-blue-500 text-xs cursor-pointer hover:bg-blue-500/30 transition-colors"
                    onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                  >
                    <Layers className="h-3 w-3 mr-1" />
                    ×{recommendation.mergeCount}
                  </Badge>
                )}
                <Badge variant="outline" className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
                {recommendation.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">Важно</Badge>
                )}
              </div>
              
              {recommendation.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {recommendation.description}
                </p>
              )}
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <SourceIcon className="h-3 w-3" />
                  {sourceConfig.label}
                </span>
                
                {recommendation.metadata.doctorName && !hasMerged && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {recommendation.metadata.doctorName}
                  </span>
                )}
                
                {recommendation.metadata.prescriptionDate && !hasMerged && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(recommendation.metadata.prescriptionDate), 'd MMM', { locale: ru })}
                  </span>
                )}
                
                {recommendation.metadata.duration && (
                  <span>{recommendation.metadata.duration}</span>
                )}
              </div>
              
              {/* Collapsible sources list for merged recommendations */}
              {hasMerged && (
                <Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
                      <ChevronDown className={cn("h-3 w-3 transition-transform", isSourcesOpen && "rotate-180")} />
                      Объединено из {recommendation.mergeCount} протоколов
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                      {recommendation.sources.map((source, idx) => (
                        <div key={source.id || idx} className="text-xs text-muted-foreground flex items-center gap-2">
                          <Stethoscope className="h-3 w-3 shrink-0" />
                          <span>
                            {source.doctorName || 'Неизвестный врач'}
                            {source.protocolTag && (
                              <span className="text-primary/70"> • {source.protocolTag}</span>
                            )}
                            {source.prescriptionDate && (
                              <span className="opacity-70"> • {format(new Date(source.prescriptionDate), 'd MMM yyyy', { locale: ru })}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>

          {recommendation.status === 'pending' && recommendation.actionable && (
            <div className="flex flex-col gap-1.5 shrink-0">
              {onAction && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAction(recommendation)}
                  disabled={isActionPending}
                  className="text-xs"
                >
                  {isActionPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3 w-3 mr-1" />
                      В стек
                    </>
                  )}
                </Button>
              )}
              {onDismiss && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onDismiss(recommendation)}
                  className="text-xs text-muted-foreground"
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Отклонить{hasMerged ? ` все (${recommendation.mergeCount})` : ''}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
