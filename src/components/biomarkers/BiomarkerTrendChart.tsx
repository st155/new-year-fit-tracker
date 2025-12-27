import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceArea, ComposedChart, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface BiomarkerTrendChartProps {
  data: Array<{
    date: string;
    value: number;
    laboratory?: string;
  }>;
  unit: string;
  referenceRanges?: {
    min: number;
    max: number;
    optimal_min?: number;
    optimal_max?: number;
  };
}

export function BiomarkerTrendChart({ data, unit, referenceRanges }: BiomarkerTrendChartProps) {
  const { t, i18n } = useTranslation('biomarkers');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'dd MMM yyyy', { locale: dateLocale }),
    value: d.value,
    laboratory: d.laboratory,
    // Add zone boundaries for shading
    normal_min: referenceRanges?.min,
    normal_max: referenceRanges?.max,
    optimal_min: referenceRanges?.optimal_min,
    optimal_max: referenceRanges?.optimal_max,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground">{payload[0].payload.date}</p>
          <p className="text-primary font-bold">
            {payload[0].value} {unit}
          </p>
          {payload[0].payload.laboratory && (
            <p className="text-xs text-muted-foreground">{payload[0].payload.laboratory}</p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLegend = () => (
    <div className="flex justify-center gap-6 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.4 }} />
        <span className="text-muted-foreground">{t('trendChart.labRange')}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-emerald-500" style={{ opacity: 0.5 }} />
        <span className="text-muted-foreground">{t('trendChart.optimalRange')}</span>
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">{t('trendChart.title')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          
          <XAxis 
            dataKey="date" 
            className="text-xs text-muted-foreground"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis 
            className="text-xs text-muted-foreground"
            label={{ value: unit, angle: -90, position: 'insideLeft' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            content={<CustomLegend />}
            wrapperStyle={{ paddingTop: '10px' }}
          />
          
          {/* Lab Reference Zone - Gray background */}
          {referenceRanges?.min && referenceRanges?.max && (
            <ReferenceArea
              y1={referenceRanges.min}
              y2={referenceRanges.max}
              fill="hsl(var(--muted))"
              fillOpacity={0.2}
              stroke="none"
            />
          )}
          
          {/* User Optimal Zone - Green background */}
          {referenceRanges?.optimal_min && referenceRanges?.optimal_max && (
            <ReferenceArea
              y1={referenceRanges.optimal_min}
              y2={referenceRanges.optimal_max}
              fill="hsl(160, 84%, 39%)"
              fillOpacity={0.3}
              stroke="none"
            />
          )}
          
          {/* Reference lines */}
          {referenceRanges?.min && (
            <ReferenceLine 
              y={referenceRanges.min} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: t('trendChart.minLabel'), position: 'insideTopRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.max && (
            <ReferenceLine 
              y={referenceRanges.max} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: t('trendChart.maxLabel'), position: 'insideBottomRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.optimal_min && (
            <ReferenceLine 
              y={referenceRanges.optimal_min} 
              stroke="hsl(var(--chart-1))" 
              strokeDasharray="5 5"
              label={{ value: t('trendChart.optMinLabel'), position: 'insideTopRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.optimal_max && (
            <ReferenceLine 
              y={referenceRanges.optimal_max} 
              stroke="hsl(var(--chart-1))" 
              strokeDasharray="5 5"
              label={{ value: t('trendChart.optMaxLabel'), position: 'insideBottomRight', className: 'text-xs' }}
            />
          )}
          
          {/* Main trend line */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', r: 5 }}
            activeDot={{ r: 7, fill: 'hsl(var(--primary))' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
