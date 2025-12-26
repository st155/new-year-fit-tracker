import { motion } from 'framer-motion';
import { CockpitHeader } from './CockpitHeader';
import { ReadinessDial } from './ReadinessDial';
import { ActionStrip } from './ActionStrip';
import { AIInsightsStrip } from './AIInsightsStrip';
import { MetricsCarouselV2 } from './MetricsCarouselV2';
import { HabitsBentoCompact } from './HabitsBentoCompact';
import { QuickWidgetsSection } from './QuickWidgetsSection';
import { RetestAlertBanner } from './RetestAlertBanner';

export function MobileDashboardV2() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col pb-24"
    >
      {/* Compact Header */}
      <CockpitHeader />
      
      {/* Hero: Readiness Dial */}
      <div className="px-4 mt-2">
        <ReadinessDial />
      </div>
      
      {/* Quick Actions Strip */}
      <div className="mt-4">
        <ActionStrip />
      </div>
      
      {/* AI Insights Strip */}
      <div className="mt-3">
        <AIInsightsStrip />
      </div>
      
      {/* Metrics Carousel - closer to hero */}
      <div className="mt-3">
        <MetricsCarouselV2 />
      </div>
      
      {/* Compact Habits */}
      <div className="mt-4">
        <HabitsBentoCompact />
      </div>
      
      {/* Retest Alert Banner (conditional) */}
      <RetestAlertBanner />
      
      {/* Quick Widgets Section */}
      <div className="mt-6">
        <QuickWidgetsSection />
      </div>
    </motion.div>
  );
}
