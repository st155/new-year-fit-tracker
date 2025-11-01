/**
 * TrainerAnalyticsDashboard Page - Страница с аналитикой для тренера
 */

import { TrainerAnalyticsDashboard } from '@/components/trainer/analytics/TrainerAnalyticsDashboard';

export default function TrainerAnalyticsDashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Аналитика</h1>
        <p className="text-muted-foreground">
          Обзор активности и прогресса ваших клиентов
        </p>
      </div>
      
      <TrainerAnalyticsDashboard />
    </div>
  );
}
