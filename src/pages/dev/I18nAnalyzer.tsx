import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoader } from '@/components/ui/page-loader';
import { FORCE_CLIENT_ROLE } from '@/lib/safe-flags';
import {
  useI18nAnalysis,
  AnalyzerHeader,
  AnalyzerFilters,
  SyncIssuesPanel,
  StatsSummary,
  type FilterState,
} from '@/features/dev/i18n-analyzer';

// Allow access in DEV mode OR in preview/iframe environments
const IS_DEV_ENVIRONMENT = import.meta.env.DEV || FORCE_CLIENT_ROLE;

export default function I18nAnalyzer() {
  // Only accessible in DEV mode or preview
  if (!IS_DEV_ENVIRONMENT) {
    return <Navigate to="/" replace />;
  }

  const { report, loading, error, refresh } = useI18nAnalysis();
  const [filters, setFilters] = useState<FilterState>({
    namespace: null,
    missingIn: 'all',
    searchQuery: '',
  });

  if (loading) {
    return <PageLoader message="Анализ локализаций..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">Ошибка анализа</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <AnalyzerHeader 
          stats={report.stats} 
          onRefresh={refresh} 
          loading={loading} 
        />
        
        <AnalyzerFilters 
          filters={filters} 
          setFilters={setFilters}
          namespaces={report.stats.namespaceStats}
        />

        <SyncIssuesPanel 
          issues={report.syncIssues} 
          filters={filters} 
        />
        
        <StatsSummary namespaceStats={report.stats.namespaceStats} />
      </div>
    </div>
  );
}
