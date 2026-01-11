import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Languages } from 'lucide-react';
import type { AnalysisReport } from '../types';

interface AnalyzerHeaderProps {
  stats: AnalysisReport['stats'];
  onRefresh: () => void;
  loading: boolean;
}

export function AnalyzerHeader({ stats, onRefresh, loading }: AnalyzerHeaderProps) {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Languages className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">i18n Analyzer</h1>
          <p className="text-sm text-muted-foreground">{t('dev.analyzingLocalizations')}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {stats.totalNamespaces} namespaces
          </Badge>
          <Badge variant="secondary" className="text-xs">
            RU: {stats.totalKeysRu}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            EN: {stats.totalKeysEn}
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>
    </div>
  );
}
