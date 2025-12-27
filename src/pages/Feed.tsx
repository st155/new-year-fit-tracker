import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityCard } from "@/components/feed/ActivityCard";
import { ActivityFilters } from "@/components/feed/ActivityFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function Feed() {
  const { t } = useTranslation('feed');
  const { user } = useAuth();
  const [filter, setFilter] = useState<string | null>(null);
  const { activities, isLoading, hasMore, loadMore } = useActivityFeed(user?.id, filter);

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <ActivityFilters currentFilter={filter} onFilterChange={setFilter} />

      {!activities || activities.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-12 w-12" />}
          title={t('empty.title')}
          description={t('empty.description')}
        />
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <ActivityCard 
              key={activity.id} 
              activity={activity}
              onActivityUpdate={() => {}}
              index={index}
            />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
