import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend 
} from 'recharts';
import type { ChartConfig } from '../OptimizedChart';
import { rechartsTooltipStyle } from '@/lib/chart-styles';

interface Props {
  data: any[];
  config: ChartConfig;
  height: number;
}

export default function LineChartWrapper({ data, config, height }: Props) {
  // Calculate optimal Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (config.yDomain !== 'dataMin-dataMax') {
      return undefined; // Let recharts auto-calculate
    }
    
    const values = data
      .map(d => d[config.yKey])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    
    if (values.length === 0) return undefined;
    
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;
    const paddingPercent = config.yPadding || 10;
    const padding = range * (paddingPercent / 100);
    
    // Ensure we have some padding even for flat lines
    const minPadding = dataMin * 0.05 || 0.1;
    const actualPadding = Math.max(padding, minPadding);
    
    return [
      Math.floor((dataMin - actualPadding) * 10) / 10,
      Math.ceil((dataMax + actualPadding) * 10) / 10
    ] as [number, number];
  }, [data, config.yKey, config.yDomain, config.yPadding]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis 
          dataKey={config.xKey} 
          className="text-xs text-muted-foreground"
        />
        <YAxis 
          className="text-xs text-muted-foreground"
          domain={yAxisDomain}
          tickFormatter={(v) => Number(v).toFixed(1)}
          width={35}
        />
        {config.showTooltip && (
          <Tooltip 
            contentStyle={rechartsTooltipStyle}
            wrapperStyle={{ zIndex: 1000 }}
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        )}
        {config.showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey={config.yKey} 
          stroke={config.color} 
          strokeWidth={3}
          dot={{ fill: config.color, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
