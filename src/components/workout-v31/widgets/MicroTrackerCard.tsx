import { Card, CardContent } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  TooltipProps 
} from 'recharts';
import { chartColors } from '@/lib/chart-colors';
import { rechartsTooltipStyle, rechartsTooltipLabelStyle, rechartsTooltipItemStyle } from '@/lib/chart-styles';

interface MicroTrackerCardProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  color: "purple" | "violet" | "indigo";
  valueFormatter?: (value: number) => string;
}

export function MicroTrackerCard({ 
  title, 
  data, 
  color,
  valueFormatter = (value) => `${value}`
}: MicroTrackerCardProps) {
  
  const getBarColor = () => {
    switch (color) {
      case 'purple':
        return chartColors.purple;
      case 'violet':
        return chartColors.fuchsia;
      case 'indigo':
        return chartColors.indigo;
      default:
        return chartColors.purple;
    }
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div style={rechartsTooltipStyle}>
          <p style={rechartsTooltipLabelStyle}>{label}</p>
          <p style={rechartsTooltipItemStyle}>
            {valueFormatter(payload[0].value as number)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        
        <ResponsiveContainer width="100%" height={224}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.1)' }} />
          <Bar 
            dataKey="value" 
            fill={getBarColor()}
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
