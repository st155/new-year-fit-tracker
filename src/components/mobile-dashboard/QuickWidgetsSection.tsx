import { IntegrationsCard } from './IntegrationsCard';
import { ActiveProtocolsMiniCard } from './ActiveProtocolsMiniCard';
import { LeaderboardMiniCard } from './LeaderboardMiniCard';
import { WeeklyGoalsMiniCard } from './WeeklyGoalsMiniCard';
import { useTranslation } from 'react-i18next';

export function QuickWidgetsSection() {
  const { t } = useTranslation('dashboard');
  
  return (
    <div className="px-4">
      <h3 className="text-xs font-medium text-muted-foreground mb-3">{t('quickAccess')}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        <IntegrationsCard />
        <ActiveProtocolsMiniCard />
        <LeaderboardMiniCard />
        <WeeklyGoalsMiniCard />
      </div>
    </div>
  );
}
