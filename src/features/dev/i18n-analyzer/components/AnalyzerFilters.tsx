import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FilterState, NamespaceStats } from '../types';

interface AnalyzerFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  namespaces: NamespaceStats[];
}

export function AnalyzerFilters({ filters, setFilters, namespaces }: AnalyzerFiltersProps) {
  const { t } = useTranslation('common');
  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('devTools.searchPlaceholder')}
            value={filters.searchQuery}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            className="pl-9"
          />
        </div>
      </div>
      
      <Select 
        value={filters.namespace || 'all'} 
        onValueChange={(v) => setFilters({ ...filters, namespace: v === 'all' ? null : v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('devTools.allNamespaces')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('devTools.allNamespaces')}</SelectItem>
          {namespaces.filter(ns => ns.syncIssues > 0).map(ns => (
            <SelectItem key={ns.name} value={ns.name}>
              {ns.name} ({ns.syncIssues})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={filters.missingIn} 
        onValueChange={(v) => setFilters({ ...filters, missingIn: v as 'all' | 'en' | 'ru' })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t('devTools.missingInPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('devTools.allIssues')}</SelectItem>
          <SelectItem value="en">{t('devTools.missingInEn')}</SelectItem>
          <SelectItem value="ru">{t('devTools.missingInRu')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
