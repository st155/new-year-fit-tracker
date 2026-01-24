import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Zap, RotateCcw, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DocumentType } from '@/hooks/useMedicalDocuments';
import { supabase } from '@/integrations/supabase/client';
import { healthApi } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { ReprocessAllDocumentsDialog } from './ReprocessAllDocumentsDialog';

interface DocumentFiltersProps {
  filterType: string;
  onFilterChange: (value: string) => void;
  filterCategory?: string | null;
  onFilterCategoryChange?: (category: string | null) => void;
  onRefresh?: () => void;
  pendingCount?: number;
  onBatchProcess?: () => void;
}

export const DocumentFilters = ({ 
  filterType, 
  onFilterChange,
  filterCategory,
  onFilterCategoryChange,
  onRefresh, 
  pendingCount = 0, 
  onBatchProcess 
}: DocumentFiltersProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [isResetting, setIsResetting] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);

  const handleResetStuck = async () => {
    setIsResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Reset documents that have been processing for more than 1 hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from('medical_documents')
        .update({ 
          processing_status: 'pending',
          processing_started_at: null
        })
        .eq('user_id', user.id)
        .eq('processing_status', 'processing')
        .lt('processing_started_at', oneHourAgo.toISOString())
        .select();

      if (error) throw error;

      toast({
        title: t('docFilters.documentsReset'),
        description: t('docFilters.documentsResetDesc', { count: data?.length || 0 }),
      });

      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: t('errors.generic'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handlePopulateCorrelations = async () => {
    setIsPopulating(true);
    try {
      toast({
        title: t('docFilters.populatingStart'),
        description: t('docFilters.populatingDesc'),
      });

      const { error } = await healthApi.populateBiomarkerCorrelations();

      if (error) throw error;

      toast({
        title: t('success.saved'),
        description: t('docFilters.populatingSuccess'),
      });
    } catch (error: any) {
      console.error('Failed to populate correlations:', error);
      toast({
        title: t('errors.generic'),
        description: error.message || t('docFilters.populatingError'),
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">🔍 {t('docFilters.title')}</h2>
        
        <div className="flex items-center gap-2">
          {pendingCount > 0 && onBatchProcess && (
            <Button 
              variant="default"
              onClick={onBatchProcess}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {t('docFilters.processAll', { count: pendingCount })}
            </Button>
          )}

          <ReprocessAllDocumentsDialog />

          <Button
            variant="outline"
            onClick={handleResetStuck}
            disabled={isResetting}
            className="gap-2 glass-subtle"
            title={t('docFilters.resetTitle')}
          >
            <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('docFilters.reset')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePopulateCorrelations}
            disabled={isPopulating}
            className="gap-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            title={t('docFilters.correlationsTitle')}
          >
            <Sparkles className={`h-4 w-4 ${isPopulating ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{t('docFilters.correlations')}</span>
          </Button>

          {filterCategory && onFilterCategoryChange && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-md text-sm">
              <span>{t('docFilters.category', { name: filterCategory })}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterCategoryChange(null)}
                className="h-auto p-0 hover:bg-transparent"
              >
                ✕
              </Button>
            </div>
          )}

          <Select value={filterType} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[200px] glass-subtle">
              <SelectValue placeholder={t('docFilters.allTypes')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 {t('docFilters.allTypes')}</SelectItem>
              <SelectItem value="blood_test">🩸 {t('docFilters.bloodTests')}</SelectItem>
              <SelectItem value="inbody">💪 {t('documentTypes.inbody')}</SelectItem>
              <SelectItem value="progress_photo">📸 {t('documentTypes.progress_photo')}</SelectItem>
              <SelectItem value="vo2max">🫁 {t('documentTypes.vo2max')}</SelectItem>
              <SelectItem value="fitness_report">📋 {t('docFilters.medReports')}</SelectItem>
              <SelectItem value="caliper">📏 {t('documentTypes.caliper')}</SelectItem>
              <SelectItem value="prescription">💊 {t('documentTypes.prescription')}</SelectItem>
              <SelectItem value="training_program">🏋️ {t('docFilters.programs')}</SelectItem>
              <SelectItem value="other">📄 {t('documentTypes.other')}</SelectItem>
            </SelectContent>
          </Select>

          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="glass-subtle"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
