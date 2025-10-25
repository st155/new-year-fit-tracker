/**
 * Phase 6: Confidence Badge Component
 * Визуализация confidence score (0-100)
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { ConfidenceFactors } from '@/lib/data-quality';

interface ConfidenceBadgeProps {
  confidence: number;
  factors?: ConfidenceFactors;
  showDetails?: boolean;
}

export function ConfidenceBadge({ 
  confidence, 
  factors,
  showDetails = true 
}: ConfidenceBadgeProps) {
  const { icon, variant, label } = getConfidenceDisplay(confidence);
  
  if (!showDetails || !factors) {
    return (
      <Badge variant={variant as any} className="gap-1">
        {icon}
        {label}
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant as any} className="gap-1 cursor-help">
            {icon}
            {confidence}%
          </Badge>
        </TooltipTrigger>
        
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Data Quality: {label}</p>
            
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Source Reliability:</span>
                <span className="font-medium">{factors.sourceReliability}/40</span>
              </div>
              <div className="flex justify-between">
                <span>Data Freshness:</span>
                <span className="font-medium">{factors.dataFreshness}/20</span>
              </div>
              <div className="flex justify-between">
                <span>Frequency:</span>
                <span className="font-medium">{factors.measurementFrequency}/20</span>
              </div>
              <div className="flex justify-between">
                <span>Cross-validation:</span>
                <span className="font-medium">{factors.crossValidation}/20</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getConfidenceDisplay(confidence: number) {
  if (confidence >= 80) {
    return {
      icon: <CheckCircle2 className="h-3 w-3" />,
      variant: 'default',
      label: 'Excellent',
    };
  } else if (confidence >= 60) {
    return {
      icon: <CheckCircle2 className="h-3 w-3" />,
      variant: 'secondary',
      label: 'Good',
    };
  } else if (confidence >= 40) {
    return {
      icon: <AlertTriangle className="h-3 w-3" />,
      variant: 'outline',
      label: 'Fair',
    };
  } else {
    return {
      icon: <XCircle className="h-3 w-3" />,
      variant: 'destructive',
      label: 'Poor',
    };
  }
}
