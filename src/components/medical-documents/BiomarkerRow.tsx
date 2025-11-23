import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface BiomarkerRowProps {
  result: any;
  status: 'verified' | 'unmatched';
  onResolve?: () => void;
}

export const BiomarkerRow = ({ result, status, onResolve }: BiomarkerRowProps) => {
  const isQualitative = result.text_value !== null && result.text_value !== undefined;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
        status === 'verified' &&
          'border-green-500/50 bg-green-500/5 hover:bg-green-500/10 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]',
        status === 'unmatched' &&
          'border-red-500/50 bg-red-500/5 hover:bg-red-500/10 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]'
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          status === 'verified' && 'bg-green-500/20 text-green-400',
          status === 'unmatched' && 'bg-red-500/20 text-red-400'
        )}
      >
        {status === 'verified' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>

      {/* Biomarker Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.raw_test_name}</div>
        {status === 'verified' && result.biomarker_master && (
          <div className="text-xs text-muted-foreground truncate">
            → {result.biomarker_master.display_name}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-right flex-shrink-0">
        {isQualitative ? (
          <Badge variant="outline" className="font-mono">
            {result.text_value}
          </Badge>
        ) : (
          <div className="font-mono text-sm">
            {result.value} <span className="text-muted-foreground text-xs">{result.unit}</span>
          </div>
        )}
      </div>

      {/* Confidence Score */}
      {result.confidence_score !== undefined && (
        <div className="w-12 text-center flex-shrink-0">
          <div
            className={cn(
              'text-xs font-medium',
              result.confidence_score >= 80 && 'text-green-400',
              result.confidence_score >= 50 && result.confidence_score < 80 && 'text-yellow-400',
              result.confidence_score < 50 && 'text-red-400'
            )}
          >
            {result.confidence_score}%
          </div>
        </div>
      )}

      {/* Action Button */}
      {status === 'unmatched' && onResolve && (
        <Button
          size="sm"
          variant="outline"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-shrink-0"
          onClick={onResolve}
        >
          Resolve
        </Button>
      )}
    </div>
  );
};
