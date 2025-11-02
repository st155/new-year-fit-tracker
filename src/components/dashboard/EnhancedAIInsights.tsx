import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { useTodayInsights } from '@/hooks/useTodayInsights';
import { memo } from 'react';

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
  const height = 25;
  const polylinePoints = points.map((point, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((point.value - minVal) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Emoji + Value */}
          <div className="flex items-center gap-2">
            <div className="text-xl">{card.emoji}</div>
            <div className="text-lg font-bold" style={{ color: card.color }}>
              {card.value}
            </div>
          </div>
          
          {/* Right: Label */}
          <div className="text-xs text-muted-foreground flex-1 text-right line-clamp-2">
            {card.label}
          </div>
        </div>
        
        {/* Background sparkline */}
        {points.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[25px] opacity-15 pointer-events-none">
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
                strokeWidth="1.5"
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

const EnhancedAIInsightsComponent = ({ userId }: EnhancedAIInsightsProps) => {
  const { data: insights, isLoading } = useTodayInsights(userId);
  
  if (isLoading || !insights) return null;
  
  const cards: InsightCard[] = [
    {
      emoji: '🔥',
      value: insights.metrics.today,
      label: 'метрик',
      sparklineData: insights.metrics.history,
      color: 'hsl(var(--chart-1))',
    },
    {
      emoji: '📈',
      value: insights.sources.today,
      label: 'источников',
      sparklineData: insights.sources.history,
      color: 'hsl(var(--chart-2))',
    },
    {
      emoji: '🎯',
      value: insights.goals.active,
      label: 'целей',
      sparklineData: insights.goals.history,
      color: 'hsl(var(--chart-3))',
    },
    {
      emoji: '⚡',
      value: insights.habits.active,
      label: 'привычек',
      sparklineData: insights.habits.history,
      color: 'hsl(var(--chart-4))',
    },
  ];
  
  return (
    <Card className="border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-2">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Сегодня:</span>
          </div>
          
          {cards.map((card, i) => (
            <Badge 
              key={i} 
              variant="outline" 
              className="shrink-0 px-2 py-1 gap-1.5 hover:bg-muted/50 transition-colors cursor-default"
            >
              <span className="text-sm">{card.emoji}</span>
              <span className="text-sm font-bold" style={{ color: card.color }}>
                {card.value}
              </span>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Мемоизируем компонент
export const EnhancedAIInsights = memo(EnhancedAIInsightsComponent);
