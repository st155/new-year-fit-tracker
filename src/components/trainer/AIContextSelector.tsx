import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, BarChart3, MessageCircle, Trophy } from 'lucide-react';

interface AIContextSelectorProps {
  contextMode: string;
  onContextChange: (mode: string) => void;
}

export const AIContextSelector = ({ contextMode, onContextChange }: AIContextSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Режим AI</label>
      <Select value={contextMode} onValueChange={onContextChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="general">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span>Общий чат</span>
            </div>
          </SelectItem>
          <SelectItem value="goals">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Управление целями</span>
            </div>
          </SelectItem>
          <SelectItem value="analysis">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Анализ клиентов</span>
            </div>
          </SelectItem>
          <SelectItem value="challenge">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>Управление челленджами</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {contextMode === 'general' && 'Свободное общение с AI для любых вопросов'}
        {contextMode === 'goals' && 'Создание и обновление целей для клиентов'}
        {contextMode === 'analysis' && 'Анализ прогресса и метрик клиентов'}
        {contextMode === 'challenge' && 'Управление челленджами и участниками'}
      </p>
    </div>
  );
};
