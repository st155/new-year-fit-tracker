import { useState, useEffect } from 'react';
import { Sparkles, Settings } from 'lucide-react';
import { SparklesCore } from '@/components/aceternity';
import { useNavigate } from 'react-router-dom';
import { useSmartInsights } from '@/hooks/useSmartInsights';
import { useInsightPersonalization } from '@/hooks/useInsightPersonalization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InsightDetailModal } from './InsightDetailModal';
import { InsightSettingsModal } from './InsightSettingsModal';
import type { SmartInsight } from '@/lib/insights/types';

const getBadgeVariant = (type: string) => {
  switch (type) {
    case 'critical':
    case 'anomaly':
      return 'destructive';
    case 'warning':
    case 'prediction':
      return 'default';
    case 'achievement':
      return 'success';
    case 'social':
    case 'temporal':
      return 'outline';
    case 'trainer':
    case 'correlation':
    case 'recommendation':
      return 'secondary';
    case 'info':
    default:
      return 'outline';
  }
};

export function DashboardHeader() {
  const navigate = useNavigate();
  const { insights, isLoading } = useSmartInsights({ maxInsights: 10 });
  const { preferences, muteInsight } = useInsightPersonalization();
  const [selectedInsight, setSelectedInsight] = useState<SmartInsight | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [displayedInsights, setDisplayedInsights] = useState<SmartInsight[]>([]);

  // Auto-rotate insights based on user preferences
  useEffect(() => {
    if (insights.length === 0) return;

    setDisplayedInsights(insights.slice(0, 7));

    const interval = setInterval(() => {
      setDisplayedInsights((prev) => {
        if (insights.length <= 7) return insights;
        const currentStart = insights.findIndex((i) => i.id === prev[0]?.id);
        const nextStart = currentStart >= 0 ? (currentStart + 7) % insights.length : 0;
        return insights.slice(nextStart, Math.min(nextStart + 7, insights.length));
      });
    }, preferences.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [insights, preferences.refreshInterval]);

  const handleInsightClick = (insight: SmartInsight) => {
    if (insight.action.type === 'modal') {
      setSelectedInsight(insight);
    } else if (insight.action.path) {
      navigate(insight.action.path);
    }
  };

  const handleHideInsight = (insightId: string) => {
    muteInsight(insightId);
    setSelectedInsight(null);
  };

  return (
    <>
      <div className="space-y-3">
        {!isLoading && displayedInsights.length > 0 && (
          <div className="relative w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border/50 rounded-lg py-3 md:py-2.5 overflow-hidden">
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
            
            <div className="relative z-10 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 ml-4 animate-pulse" />
              <div className="flex-1 overflow-hidden">
                <div className="flex gap-3 animate-[marquee_40s_linear_infinite] whitespace-nowrap">
                  {[...displayedInsights, ...displayedInsights].map((insight, i) => (
                    <Badge
                      key={`${insight.id}-${i}`}
                      variant={getBadgeVariant(insight.type)}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg shrink-0",
                        insight.type === 'critical' && "animate-pulse"
                      )}
                      onClick={() => handleInsightClick(insight)}
                    >
                      <span className="mr-1.5">{insight.emoji}</span>
                      <span className="text-sm font-medium">{insight.message}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 shrink-0"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <InsightDetailModal
        insight={selectedInsight}
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        onHide={handleHideInsight}
      />

      <InsightSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
