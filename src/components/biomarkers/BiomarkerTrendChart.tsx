import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'dd MMM yyyy', { locale: ru }),
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

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Тренд</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="normalZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="optimalZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
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
          
          {/* Optimal zone shading */}
          {referenceRanges?.optimal_min && referenceRanges?.optimal_max && (
            <Area
              dataKey="optimal_max"
              stroke="none"
              fill="url(#optimalZone)"
              strokeWidth={0}
            />
          )}
          
          {/* Reference lines */}
          {referenceRanges?.min && (
            <ReferenceLine 
              y={referenceRanges.min} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: 'Мин', position: 'insideTopRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.max && (
            <ReferenceLine 
              y={referenceRanges.max} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              label={{ value: 'Макс', position: 'insideBottomRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.optimal_min && (
            <ReferenceLine 
              y={referenceRanges.optimal_min} 
              stroke="hsl(var(--chart-1))" 
              strokeDasharray="5 5"
              label={{ value: 'Опт. мин', position: 'insideTopRight', className: 'text-xs' }}
            />
          )}
          
          {referenceRanges?.optimal_max && (
            <ReferenceLine 
              y={referenceRanges.optimal_max} 
              stroke="hsl(var(--chart-1))" 
              strokeDasharray="5 5"
              label={{ value: 'Опт. макс', position: 'insideBottomRight', className: 'text-xs' }}
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
