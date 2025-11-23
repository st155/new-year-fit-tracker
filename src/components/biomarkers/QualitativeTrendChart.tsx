import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface QualitativeDataPoint {
  date: string;
  text_value: string;
  laboratory: string;
}

interface Props {
  history: QualitativeDataPoint[];
}

// Map qualitative values to numeric scale for visualization
const qualitativeValueMap: Record<string, number> = {
  'negative': 1,
  'trace': 2,
  'positive': 3,
  '+': 3,
  '++': 4,
  '+++': 5,
  '++++': 6,
  'absent': 1,
  'present': 3,
  'mild': 2,
  'moderate': 3,
  'severe': 4,
};

// Reverse map for Y-axis labels
const numericToTextMap: Record<number, string> = {
  1: 'Отрицательный',
  2: 'Следы',
  3: 'Положительный',
  4: '++',
  5: '+++',
  6: '++++',
};

// Color coding based on severity
const getColorForValue = (numericValue: number): string => {
  if (numericValue === 1) return 'hsl(160, 84%, 39%)'; // green - negative/absent (good)
  if (numericValue === 2) return 'hsl(38, 92%, 50%)'; // amber - trace (warning)
  return 'hsl(351, 95%, 71%)'; // rose - positive (alert)
};

const QualitativeTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  
  return (
    <div className="bg-neutral-950 border border-purple-500/50 rounded-lg p-3 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
      <p className="text-sm font-medium text-foreground mb-1">
        {format(new Date(data.date), 'd MMMM yyyy', { locale: ru })}
      </p>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ 
            backgroundColor: getColorForValue(data.numericValue),
            boxShadow: `0 0 8px ${getColorForValue(data.numericValue)}`
          }}
        />
        <p className="text-sm text-muted-foreground">
          Результат: <span className="text-foreground font-medium">{data.text_value}</span>
        </p>
      </div>
      {data.laboratory && (
        <p className="text-xs text-muted-foreground mt-1">
          Лаборатория: {data.laboratory}
        </p>
      )}
    </div>
  );
};

const CustomLegend = () => (
  <div className="flex justify-center gap-4 text-xs mt-4">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px hsl(160, 84%, 39%)' }} />
      <span className="text-muted-foreground">Отрицательный</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-amber-500" style={{ boxShadow: '0 0 6px hsl(38, 92%, 50%)' }} />
      <span className="text-muted-foreground">Следы</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-rose-500" style={{ boxShadow: '0 0 6px hsl(351, 95%, 71%)' }} />
      <span className="text-muted-foreground">Положительный</span>
    </div>
  </div>
);

export default function QualitativeTrendChart({ history }: Props) {
  // Transform data: map text values to numeric scale
  const chartData = history.map(item => {
    const textValue = item.text_value?.toLowerCase() || '';
    const numericValue = qualitativeValueMap[textValue] || 3; // default to 'positive' if unknown
    
    return {
      date: item.date,
      text_value: item.text_value,
      numericValue,
      laboratory: item.laboratory,
    };
  });

  // Custom dot with color based on value
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const color = getColorForValue(payload.numericValue);
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke={color}
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
    );
  };

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
          
          <XAxis
            dataKey="date"
            className="text-xs"
            tickFormatter={(date) => format(new Date(date), 'd MMM', { locale: ru })}
            stroke="hsl(var(--muted-foreground))"
          />
          
          <YAxis
            domain={[0, 7]}
            ticks={[1, 2, 3, 4, 5, 6]}
            tickFormatter={(value) => numericToTextMap[value] || ''}
            className="text-xs"
            stroke="hsl(var(--muted-foreground))"
            width={100}
          />
          
          <Tooltip content={<QualitativeTooltip />} />
          <Legend content={<CustomLegend />} />
          
          <Line
            type="stepAfter"
            dataKey="numericValue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          График показывает качественные изменения результатов во времени
        </p>
      </div>
    </div>
  );
}
