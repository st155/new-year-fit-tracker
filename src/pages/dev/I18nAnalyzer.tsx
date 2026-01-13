import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '@/components/ui/page-loader';
import { useAuth } from '@/hooks/useAuth';
import { canAccessDevTools } from '@/lib/dev-access';
import {
  useI18nAnalysis,
  AnalyzerHeader,
  AnalyzerFilters,
  SyncIssuesPanel,
  StatsSummary,
  JsonErrorsPanel,
  LanguageIssuesPanel,
  type FilterState,
} from '@/features/dev/i18n-analyzer';

export default function I18nAnalyzer() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  
  // Check access using centralized dev-access module
  if (!canAccessDevTools(user?.email)) {
    return <Navigate to="/" replace />;
  }

  const { report, loading, error, refresh } = useI18nAnalysis();
  const [filters, setFilters] = useState<FilterState>({
    namespace: null,
    missingIn: 'all',
    searchQuery: '',
  });

  if (loading) {
    return <PageLoader message={t('dev.analyzingLocalizations')} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-destructive">
          <p className="text-lg font-medium">{t('dev.analysisError')}</p>
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
        
        {/* JSON Errors Panel - CRITICAL, shown first */}
        <JsonErrorsPanel 
          errors={report.jsonErrors} 
          brokenNamespaces={report.brokenNamespaces}
        />
        
        {/* Language Issues Panel - Cyrillic in EN files */}
        <LanguageIssuesPanel issues={report.languageIssues} />
        
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
