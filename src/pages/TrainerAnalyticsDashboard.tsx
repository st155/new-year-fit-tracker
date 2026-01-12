/**
 * TrainerAnalyticsDashboard Page - Страница с аналитикой для тренера
 */

import { useTranslation } from 'react-i18next';
import { TrainerAnalyticsDashboard } from '@/components/trainer/analytics/TrainerAnalyticsDashboard';

export default function TrainerAnalyticsDashboardPage() {
  const { t } = useTranslation('trainerDashboard');
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('analytics.pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('analytics.pageDescription')}
        </p>
      </div>
      
      <TrainerAnalyticsDashboard />
    </div>
  );
}
