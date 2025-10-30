import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useTodayInsights } from '@/hooks/useTodayInsights';

interface InsightCard {
  emoji: string;
  value: number;
  label: string;
  sparklineData: Array<{ date: string; value: number }>;
  color: string;
}

interface InsightMiniCardProps {
  card: InsightCard;
}

function InsightMiniCard({ card }: InsightMiniCardProps) {
  const points = card.sparklineData;
  if (points.length === 0) return null;

  const values = points.map(p => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Create SVG polyline points
  const width = 100;
  const height = 40;
  const polylinePoints = points.map((point, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((point.value - minVal) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="text-3xl mb-1">{card.emoji}</div>
        <div className="text-2xl font-bold mb-1" style={{ color: card.color }}>
          {card.value}
        </div>
        <div className="text-sm text-muted-foreground">{card.label}</div>
        
        {/* Background sparkline */}
        {points.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[40px] opacity-20 pointer-events-none">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              className="w-full h-full"
            >
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={card.color}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EnhancedAIInsightsProps {
  userId?: string;
}

export function EnhancedAIInsights({ userId }: EnhancedAIInsightsProps) {
  const { data: insights, isLoading } = useTodayInsights(userId);
  
  if (isLoading || !insights) return null;
  
  const cards: InsightCard[] = [
    {
      emoji: '🔥',
      value: insights.metrics.today,
      label: 'метрик синхронизировано',
      sparklineData: insights.metrics.history,
      color: 'hsl(var(--chart-1))',
    },
    {
      emoji: '📈',
      value: insights.sources.today,
      label: 'источников данных',
      sparklineData: insights.sources.history,
      color: 'hsl(var(--chart-2))',
    },
    {
      emoji: '🎯',
      value: insights.goals.active,
      label: 'активных целей',
      sparklineData: insights.goals.history,
      color: 'hsl(var(--chart-3))',
    },
    {
      emoji: '⚡',
      value: insights.habits.active,
      label: 'активных привычек',
      sparklineData: insights.habits.history,
      color: 'hsl(var(--chart-4))',
    },
  ];
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        Сегодня
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <InsightMiniCard key={i} card={card} />
        ))}
      </div>
    </div>
  );
}
