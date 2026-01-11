import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getConfidenceBadgeVariant, getConfidenceLabel } from '@/lib/data-quality/ui-helpers';
import type { ConfidenceFactors } from '@/lib/data-quality';
import { useTranslation } from 'react-i18next';

interface QualityFactorsCardProps {
  confidence: number;
  factors: ConfidenceFactors;
  metricName?: string;
}

export function QualityFactorsCard({ confidence, factors, metricName }: QualityFactorsCardProps) {
  const { t } = useTranslation('common');
  const factorEntries = Object.entries(factors) as [keyof ConfidenceFactors, number][];

  const factorDescriptions: Record<keyof ConfidenceFactors, string> = {
    sourceReliability: t('dataQuality.factors.sourceReliability'),
    dataFreshness: t('dataQuality.factors.dataFreshness'),
    measurementFrequency: t('dataQuality.factors.measurementFrequency'),
    crossValidation: t('dataQuality.factors.crossValidation'),
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('dataQuality.title')}</CardTitle>
            {metricName && (
              <CardDescription className="mt-1">{metricName}</CardDescription>
            )}
          </div>
          <Badge variant={getConfidenceBadgeVariant(confidence)} className="text-base px-3 py-1">
            {Math.round(confidence)}% · {getConfidenceLabel(confidence)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {factorEntries.map(([key, value]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {factorDescriptions[key]}
              </span>
              <span className="text-muted-foreground">
                {Math.round(value)}%
              </span>
            </div>
            <Progress value={value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
