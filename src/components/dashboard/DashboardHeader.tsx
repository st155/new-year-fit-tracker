import { Sparkles } from 'lucide-react';
import { SparklesCore } from '@/components/aceternity';
import { useNavigate } from 'react-router-dom';
import { useSmartInsights } from '@/hooks/useSmartInsights';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const getBadgeVariant = (type: string) => {
  switch (type) {
    case 'critical': return 'destructive';
    case 'warning': return 'default';
    case 'achievement': return 'success';
    case 'recommendation': return 'secondary';
    case 'info':
    default: return 'outline';
  }
};

export function DashboardHeader() {
  const navigate = useNavigate();
  const { insights, isLoading } = useSmartInsights({ maxInsights: 7 });

  const handleInsightClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <div className="space-y-3">
      {/* Smart AI Insights Ticker */}
      {!isLoading && insights.length > 0 && (
        <div className="relative w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border/50 rounded-lg py-3 md:py-2.5 overflow-hidden">
          {/* Sparkles Background */}
          <div className="absolute inset-0 w-full h-full">
            <SparklesCore
              id="dashboardSparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={50}
              className="w-full h-full"
              particleColor="#06b6d4"
              speed={0.5}
            />
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 ml-4 animate-pulse" />
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-3 animate-[marquee_40s_linear_infinite] whitespace-nowrap">
                {[...insights, ...insights].map((insight, i) => (
                  <Badge
                    key={`${insight.id}-${i}`}
                    variant={getBadgeVariant(insight.type)}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg shrink-0",
                      insight.type === 'critical' && "animate-pulse"
                    )}
                    onClick={() => handleInsightClick(insight.action.path)}
                  >
                    <span className="mr-1.5">{insight.emoji}</span>
                    <span className="text-sm font-medium">{insight.message}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
