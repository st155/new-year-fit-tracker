import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Settings, ChevronLeft, ChevronRight, Play, Pause, AlertCircle, TrendingUp } from 'lucide-react';
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
  const [currentBatch, setCurrentBatch] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Smart rotation: keep critical insights visible, rotate regular ones
  const displayedInsights = useMemo(() => {
    if (insights.length === 0) return [];
    
    const critical = insights.filter(i => i.priority > 80);
    const regular = insights.filter(i => i.priority <= 80);
    
    if (regular.length === 0) return critical.slice(0, 7);
    
    const availableSlots = Math.max(3, 7 - critical.length);
    const regularToShow = regular.slice(currentBatch, currentBatch + availableSlots);
    
    return [...critical, ...regularToShow];
  }, [insights, currentBatch]);

  // Auto-rotation effect
  useEffect(() => {
    if (isPaused || insights.length <= 7) return;
    
    const regularInsights = insights.filter(i => i.priority <= 80);
    if (regularInsights.length <= 3) return;
    
    const interval = setInterval(() => {
      setCurrentBatch(prev => {
        const critical = insights.filter(i => i.priority > 80).length;
        const batchSize = Math.max(3, 7 - critical);
        const maxBatch = regularInsights.length - batchSize;
        return prev >= maxBatch ? 0 : prev + batchSize;
      });
    }, (preferences.refreshInterval || 30) * 1000);
    
    return () => clearInterval(interval);
  }, [insights, isPaused, preferences.refreshInterval]);

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

  const handlePrevBatch = () => {
    const critical = insights.filter(i => i.priority > 80).length;
    const batchSize = Math.max(3, 7 - critical);
    setCurrentBatch(Math.max(0, currentBatch - batchSize));
  };

  const handleNextBatch = () => {
    const critical = insights.filter(i => i.priority > 80).length;
    const regular = insights.filter(i => i.priority <= 80);
    const batchSize = Math.max(3, 7 - critical);
    const maxBatch = Math.max(0, regular.length - batchSize);
    setCurrentBatch(Math.min(maxBatch, currentBatch + batchSize));
  };

  const canGoBack = currentBatch > 0;
  const canGoForward = () => {
    const critical = insights.filter(i => i.priority > 80).length;
    const regular = insights.filter(i => i.priority <= 80);
    const batchSize = Math.max(3, 7 - critical);
    return currentBatch + batchSize < regular.length;
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
              
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevBatch}
                  disabled={!canGoBack}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextBatch}
                  disabled={!canGoForward()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div 
                className="flex-1 overflow-hidden"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="flex gap-3 whitespace-nowrap">
                  {displayedInsights.map((insight) => (
                    <Badge
                      key={insight.id}
                      variant={getBadgeVariant(insight.type)}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg shrink-0",
                        insight.priority > 80 && "text-base px-4 py-2 shadow-lg",
                        insight.priority > 90 && "animate-pulse ring-2 ring-destructive",
                        insight.type === 'achievement' && "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0",
                        insight.type === 'correlation' && "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                      )}
                      onClick={() => handleInsightClick(insight)}
                    >
                      {insight.priority > 80 && <AlertCircle className="h-4 w-4 mr-1.5" />}
                      <span className="mr-1.5">{insight.emoji}</span>
                      <span className={cn(
                        "font-medium",
                        insight.priority > 80 ? "text-sm" : "text-xs"
                      )}>
                        {insight.message}
                      </span>
                      {insight.type === 'prediction' && (
                        <TrendingUp className="h-3 w-3 ml-1.5" />
                      )}
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
