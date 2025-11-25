import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Zap, RotateCcw, Sparkles } from 'lucide-react';
import { DocumentType } from '@/hooks/useMedicalDocuments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DocumentFiltersProps {
  filterType: string;
  onFilterChange: (value: string) => void;
  onRefresh?: () => void;
  pendingCount?: number;
  onBatchProcess?: () => void;
}

export const DocumentFilters = ({ 
  filterType, 
  onFilterChange, 
  onRefresh, 
  pendingCount = 0, 
  onBatchProcess 
}: DocumentFiltersProps) => {
  const { toast } = useToast();
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
        title: 'Документы сброшены',
        description: `Сброшено ${data?.length || 0} застрявших документов`,
      });

      if (onRefresh) onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
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
        title: "Запуск заполнения",
        description: "Заполнение корреляций добавок и биомаркеров...",
      });

      const { error } = await supabase.functions.invoke('populate-biomarker-correlations');

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Корреляции биомаркеров заполнены",
      });
    } catch (error: any) {
      console.error('Failed to populate correlations:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось заполнить корреляции",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="glass-card p-4 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-foreground">🔍 Медицинские документы</h2>
        
        <div className="flex items-center gap-2">
          {pendingCount > 0 && onBatchProcess && (
            <Button 
              variant="default"
              onClick={onBatchProcess}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Обработать все ({pendingCount})
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleResetStuck}
            disabled={isResetting}
            className="gap-2 glass-subtle"
            title="Сбросить застрявшие документы в обработке"
          >
            <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Сбросить</span>
          </Button>

          <Button
            variant="outline"
            onClick={handlePopulateCorrelations}
            disabled={isPopulating}
            className="gap-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
            title="Заполнить базу корреляций добавок и биомаркеров"
          >
            <Sparkles className={`h-4 w-4 ${isPopulating ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Корреляции</span>
          </Button>

          <Select value={filterType} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[200px] glass-subtle">
              <SelectValue placeholder="Все типы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📊 Все типы</SelectItem>
              <SelectItem value="blood_test">🩸 Анализы крови</SelectItem>
              <SelectItem value="inbody">💪 InBody</SelectItem>
              <SelectItem value="progress_photo">📸 Фото прогресса</SelectItem>
              <SelectItem value="vo2max">🫁 VO2max</SelectItem>
              <SelectItem value="fitness_report">📋 Мед. заключения</SelectItem>
              <SelectItem value="caliper">📏 Калипер</SelectItem>
              <SelectItem value="prescription">💊 Рецепты</SelectItem>
              <SelectItem value="training_program">🏋️ Программы</SelectItem>
              <SelectItem value="other">📄 Другое</SelectItem>
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
