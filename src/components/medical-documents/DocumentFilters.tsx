import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Zap } from 'lucide-react';
import { DocumentType } from '@/hooks/useMedicalDocuments';

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
