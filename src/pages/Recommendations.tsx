import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Moon, 
  Dumbbell, 
  Pill, 
  FlaskConical, 
  Heart,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAllRecommendations, RecommendationCategory } from '@/hooks/useAllRecommendations';
import { MergedRecommendation } from '@/lib/deduplication';
import { CategorySection } from '@/components/recommendations/CategorySection';
import { DoctorProtocolsSection } from '@/components/recommendations/DoctorProtocolsSection';
import { RecommendationCard } from '@/components/recommendations/RecommendationCard';
import { useAddSupplementToLibrary } from '@/hooks/biostack/useDoctorProtocol';
import { useDismissActionItem } from '@/hooks/biostack/useDoctorActionItems';
import { cn } from '@/lib/utils';

const CATEGORY_TABS: { value: RecommendationCategory | 'all' | 'protocols'; icon: React.ElementType; label: string }[] = [
  { value: 'all', icon: Sparkles, label: 'Все' },
  { value: 'protocols', icon: FileText, label: 'Протоколы' },
  { value: 'sleep', icon: Moon, label: 'Сон' },
  { value: 'exercise', icon: Dumbbell, label: 'Тренировки' },
  { value: 'supplement', icon: Pill, label: 'Добавки' },
  { value: 'checkup', icon: FlaskConical, label: 'Чекапы' },
];

function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bgColor 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const Recommendations = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { recommendations, groupedByCategory, stats, isLoading } = useAllRecommendations();
  const addToLibrary = useAddSupplementToLibrary();
  const dismissItem = useDismissActionItem();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const handleAction = async (recommendation: MergedRecommendation) => {
    if (recommendation.action?.type === 'add_to_stack' && recommendation.metadata.originalItem) {
      setActionPendingId(recommendation.id);
      try {
        await addToLibrary.mutateAsync({ 
          item: recommendation.metadata.originalItem, 
          addToStack: true 
        });
        // If merged, dismiss all others in the group
        if (recommendation.mergeCount > 1) {
          for (const id of recommendation.mergedFrom.slice(1)) {
            dismissItem.mutate(id);
          }
        }
      } finally {
        setActionPendingId(null);
      }
    }
  };

  const handleDismiss = (recommendation: MergedRecommendation) => {
    // Dismiss all merged items
    for (const id of recommendation.mergedFrom) {
      dismissItem.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Рекомендации</h1>
          <p className="text-sm text-muted-foreground">
            Персональные рекомендации на основе данных и назначений врачей
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard 
          icon={Clock} 
          label="Ожидают" 
          value={stats.pending} 
          color="text-yellow-500"
          bgColor="bg-yellow-500/10"
        />
        <StatsCard 
          icon={CheckCircle2} 
          label="Выполнено" 
          value={stats.completed} 
          color="text-green-500"
          bgColor="bg-green-500/10"
        />
        <StatsCard 
          icon={AlertCircle} 
          label="Важных" 
          value={stats.highPriority} 
          color="text-red-500"
          bgColor="bg-red-500/10"
        />
        <StatsCard 
          icon={Sparkles} 
          label="Всего" 
          value={stats.total} 
          color="text-primary"
          bgColor="bg-primary/10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-card grid w-full grid-cols-3 md:grid-cols-6 h-auto p-1">
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            const count = tab.value === 'all' 
              ? recommendations.filter(r => r.status === 'pending').length
              : tab.value === 'protocols' 
              ? 0 
              : groupedByCategory[tab.value as RecommendationCategory]?.filter(r => r.status === 'pending').length || 0;
            
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="gap-2 data-[state=active]:bg-primary/20"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && tab.value !== 'protocols' && (
                  <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          {recommendations.length > 0 ? (
            recommendations
              .filter(r => r.status === 'pending' || r.status === 'active')
              .slice(0, 10)
              .map(rec => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAction={handleAction}
                  onDismiss={handleDismiss}
                  isActionPending={actionPendingId === rec.id}
                />
              ))
          ) : (
            <Card className="glass-card">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет активных рекомендаций</h3>
                <p className="text-sm text-muted-foreground">
                  Загрузите медицинские документы или подключите устройства для получения персональных рекомендаций.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="protocols" className="mt-6">
          <DoctorProtocolsSection />
        </TabsContent>

        <TabsContent value="sleep" className="mt-6">
          <CategorySection 
            category="sleep" 
            recommendations={groupedByCategory.sleep}
            onAction={handleAction}
            onDismiss={handleDismiss}
            actionPendingId={actionPendingId}
          />
        </TabsContent>

        <TabsContent value="exercise" className="mt-6">
          <CategorySection 
            category="exercise" 
            recommendations={groupedByCategory.exercise}
            onAction={handleAction}
            onDismiss={handleDismiss}
            actionPendingId={actionPendingId}
          />
        </TabsContent>

        <TabsContent value="supplement" className="mt-6">
          <CategorySection 
            category="supplement" 
            recommendations={groupedByCategory.supplement}
            onAction={handleAction}
            onDismiss={handleDismiss}
            actionPendingId={actionPendingId}
          />
        </TabsContent>

        <TabsContent value="checkup" className="mt-6">
          <CategorySection 
            category="checkup" 
            recommendations={groupedByCategory.checkup}
            onAction={handleAction}
            onDismiss={handleDismiss}
            actionPendingId={actionPendingId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Recommendations;
