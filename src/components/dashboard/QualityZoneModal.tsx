import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DataQualityBadge } from '@/components/data-quality';
import { useTranslation } from 'react-i18next';

interface QualityZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: {
    label: string;
    metrics: Array<{ 
      metricName: string; 
      confidence: number; 
      source: any; 
      factors?: {
        sourceReliability: number;
        dataFreshness: number;
        measurementFrequency: number;
        crossValidation: number;
      }
    }>;
  } | null;
}

export function QualityZoneModal({ isOpen, onClose, zone }: QualityZoneModalProps) {
  const { t } = useTranslation('common');
  
  if (!zone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('dataQuality.zoneTitle', { zone: zone.label })}</DialogTitle>
          <DialogDescription>
            {t('dataQuality.zoneDescription', { zone: zone.label.toLowerCase() })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {zone.metrics.map((m, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex-1">
                <h4 className="font-medium">{m.metricName}</h4>
                <p className="text-sm text-muted-foreground">
                  {m.source}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <DataQualityBadge
                  confidence={m.confidence}
                  factors={m.factors}
                  showLabel={true}
                />
              </div>
            </div>
          ))}
          
          {zone.metrics.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t('dataQuality.noMetrics')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
