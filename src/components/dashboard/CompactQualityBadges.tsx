import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface CompactQualityBadgesProps {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
  total: number;
}

export function CompactQualityBadges({ excellent, good, fair, poor, total }: CompactQualityBadgesProps) {
  if (total === 0) return null;

  const getPercentage = (count: number) => total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Excellent */}
      {excellent > 0 && (
        <Badge 
          variant="outline" 
          className="gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20 transition-colors"
        >
          <CheckCircle className="h-3 w-3" />
          <span className="text-xs font-medium">Отлично</span>
          <span className="text-xs font-bold">{excellent}</span>
          <span className="text-xs opacity-70">({getPercentage(excellent)}%)</span>
        </Badge>
      )}

      {/* Good */}
      {good > 0 && (
        <Badge 
          variant="outline" 
          className="gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 transition-colors"
        >
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-medium">Хорошо</span>
          <span className="text-xs font-bold">{good}</span>
          <span className="text-xs opacity-70">({getPercentage(good)}%)</span>
        </Badge>
      )}

      {/* Fair */}
      {fair > 0 && (
        <Badge 
          variant="outline" 
          className="gap-1.5 px-2.5 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
        >
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs font-medium">Средне</span>
          <span className="text-xs font-bold">{fair}</span>
          <span className="text-xs opacity-70">({getPercentage(fair)}%)</span>
        </Badge>
      )}

      {/* Poor */}
      {poor > 0 && (
        <Badge 
          variant="outline" 
          className="gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/20 transition-colors"
        >
          <AlertCircle className="h-3 w-3" />
          <span className="text-xs font-medium">Плохо</span>
          <span className="text-xs font-bold">{poor}</span>
          <span className="text-xs opacity-70">({getPercentage(poor)}%)</span>
        </Badge>
      )}
    </div>
  );
}
