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

interface StackedBarChartWrapperProps {
  data: any[];
  indexKey: string;
  categories: string[];
  colors: string[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  stackId?: string;
}

export default function StackedBarChartWrapper({ 
  data, 
  indexKey,
  categories,
  colors,
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  stackId = 'stack'
}: StackedBarChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--muted-foreground) / 0.12)"
          />
        )}
        <XAxis 
          dataKey={indexKey}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          className="text-xs"
        />
        <YAxis 
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          className="text-xs"
        />
        {showTooltip && (
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
        )}
        {showLegend && (
          <Legend 
            wrapperStyle={{ 
              paddingTop: '20px',
              fontSize: '12px'
            }}
          />
        )}
        {categories.map((category, index) => (
          <Bar 
            key={category}
            dataKey={category} 
            stackId={stackId}
            fill={colors[index]}
            radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
