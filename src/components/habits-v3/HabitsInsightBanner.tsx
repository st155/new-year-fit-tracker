/**
 * Habits Insight Banner
 * Displays top critical insights in a carousel
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SmartInsight } from '@/lib/insights/types';

interface HabitsInsightBannerProps {
  insights: SmartInsight[];
  onAction?: (insight: SmartInsight) => void;
  onDismiss?: (insightId: string) => void;
}

export function HabitsInsightBanner({ insights, onAction, onDismiss }: HabitsInsightBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show only top 3 critical insights
  const topInsights = insights
    .filter(i => ['critical', 'habit_risk', 'warning'].includes(i.type) || i.priority >= 70)
    .slice(0, 3);

  if (topInsights.length === 0) return null;

  const currentInsight = topInsights[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % topInsights.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + topInsights.length) % topInsights.length);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(currentInsight.id);
    }
    if (topInsights.length > 1) {
      handleNext();
    }
  };

  const bgClass = 
    currentInsight.priority >= 80 ? 'bg-destructive/10 border-destructive/30' :
    currentInsight.priority >= 60 ? 'bg-primary/10 border-primary/30' :
    'bg-accent/50 border-accent';

  return (
    <div className={`relative border rounded-lg p-4 mb-4 ${bgClass} transition-colors`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentInsight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          <div className="text-3xl">{currentInsight.emoji}</div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {currentInsight.message}
            </p>
            
            {currentInsight.action && onAction && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-xs"
                onClick={() => onAction(currentInsight)}
              >
                Узнать больше →
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {topInsights.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex gap-1 px-2">
                  {topInsights.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${
                        idx === currentIndex 
                          ? 'bg-foreground w-4' 
                          : 'bg-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
