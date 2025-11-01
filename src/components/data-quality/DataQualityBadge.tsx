import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface ConfidenceFactors {
  sourceReliability: number;
  dataFreshness: number;
  measurementFrequency: number;
  crossValidation: number;
}

interface DataQualityBadgeProps {
  confidence: number;
  factors?: ConfidenceFactors;
  metricName?: string;
  userId?: string;
  showRecalculate?: boolean;
  onRecalculate?: () => void;
  size?: 'default' | 'compact';
  showLabel?: boolean;
}

export function DataQualityBadge({
  confidence,
  factors,
  metricName,
  userId,
  showRecalculate = false,
  onRecalculate,
  size = 'default',
  showLabel = true,
}: DataQualityBadgeProps) {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { icon, variant, label, color } = getConfidenceDisplay(confidence);

  const handleRecalculate = async () => {
    if (!userId || !metricName) return;

    setIsRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke('recalculate-confidence', {
        body: { user_id: userId, metric_name: metricName },
      });

      if (error) throw error;

      toast.success('Confidence recalculation started');
      onRecalculate?.();
    } catch (error) {
      console.error('Recalculation error:', error);
      toast.error('Failed to recalculate confidence');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Compact mode: just icon + percentage
  if (size === 'compact') {
    return (
      <Badge variant={variant as any} className="gap-1 px-2 py-0.5 text-xs">
        {icon}
        <span>{Math.round(confidence)}%</span>
      </Badge>
    );
  }

  if (!factors) {
    return (
      <Badge variant={variant as any} className="gap-1">
        {icon}
        <span>{Math.round(confidence)}%</span>
        {showLabel && <span className="ml-1">{label}</span>}
        {showRecalculate && (
          <RefreshCw 
            className="w-3 h-3 ml-1 cursor-pointer hover:rotate-180 transition-transform" 
            onClick={handleRecalculate}
          />
        )}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge variant={variant as any} className="gap-1 cursor-help">
              {icon}
              <span className="font-semibold">{confidence}%</span>
              <span className="text-xs opacity-80">{label}</span>
            </Badge>
            
            {showRecalculate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full`} style={{ backgroundColor: color }} />
              <p className="font-semibold">Data Quality: {label}</p>
            </div>

            <div className="space-y-1 text-xs border-t pt-2">
              <div className="flex justify-between items-center">
                <span>Source Reliability:</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(factors.sourceReliability / 40) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium min-w-[2.5rem] text-right">
                    {factors.sourceReliability}/40
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Data Freshness:</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(factors.dataFreshness / 20) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium min-w-[2.5rem] text-right">
                    {factors.dataFreshness}/20
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Frequency:</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(factors.measurementFrequency / 20) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium min-w-[2.5rem] text-right">
                    {factors.measurementFrequency}/20
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span>Cross-validation:</span>
                <div className="flex items-center gap-1">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(factors.crossValidation / 20) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium min-w-[2.5rem] text-right">
                    {factors.crossValidation}/20
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-2">
              Higher scores indicate more reliable data from trusted sources
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getConfidenceDisplay(confidence: number): {
  icon: JSX.Element;
  variant: string;
  label: string;
  color: string;
} {
  if (confidence >= 80) {
    return {
      icon: <CheckCircle2 className="h-3 w-3" />,
      variant: 'default',
      label: 'Excellent',
      color: 'hsl(var(--success))',
    };
  } else if (confidence >= 60) {
    return {
      icon: <CheckCircle2 className="h-3 w-3" />,
      variant: 'secondary',
      label: 'Good',
      color: 'hsl(var(--primary))',
    };
  } else if (confidence >= 40) {
    return {
      icon: <AlertTriangle className="h-3 w-3" />,
      variant: 'outline',
      label: 'Fair',
      color: 'hsl(var(--warning))',
    };
  } else {
    return {
      icon: <XCircle className="h-3 w-3" />,
      variant: 'destructive',
      label: 'Poor',
      color: 'hsl(var(--destructive))',
    };
  }
}
