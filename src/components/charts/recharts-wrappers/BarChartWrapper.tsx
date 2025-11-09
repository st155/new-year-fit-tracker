import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
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

export default function BarChartWrapper({ data, config, height }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
        <XAxis 
          dataKey={config.xKey} 
          className="text-xs text-muted-foreground"
        />
        <YAxis className="text-xs text-muted-foreground" />
        {config.showTooltip && (
          <Tooltip 
            contentStyle={rechartsTooltipStyle}
            wrapperStyle={{ zIndex: 1000 }}
            cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
          />
        )}
        {config.showLegend && <Legend />}
        <Bar 
          dataKey={config.yKey} 
          fill={config.color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
