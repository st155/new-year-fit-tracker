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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
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
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        )}
        {config.showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey={config.yKey} 
          stroke={config.color} 
          strokeWidth={2}
          dot={{ fill: config.color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
