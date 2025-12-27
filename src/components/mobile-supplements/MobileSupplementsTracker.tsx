/**
 * Mobile Supplements Tracker - "Daily Timeline" view
 * 
 * Operational view: What to take right now?
 */

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Pill } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DayProgressGauge } from './DayProgressGauge';
import { TimelineSection } from './TimelineSection';
import { useTodaysSupplements } from '@/hooks/biostack/useTodaysSupplements';
import { useLowStockAlerts } from '@/hooks/biostack/useLowStockAlerts';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

type TimeSlot = 'morning' | 'noon' | 'evening' | 'bedtime';

// Map hook keys to our time slots
const hookKeyToSlot: Record<string, TimeSlot> = {
  morning: 'morning',
  afternoon: 'noon',
  evening: 'evening',
  before_sleep: 'bedtime',
};

const slotToHookKey: Record<TimeSlot, string> = {
  morning: 'morning',
  noon: 'afternoon',
  evening: 'evening',
  bedtime: 'before_sleep',
};

export function MobileSupplementsTracker() {
  const { t } = useTranslation('supplements');
  const { user } = useAuth();
  const { 
    groupedSupplements, 
    toggleIntakeMutation,
    logIntakeMutation,
  } = useTodaysSupplements();
  
  const { data: lowStockAlerts, isLoading } = useLowStockAlerts(user?.id);

  // Currently toggling item
  const [togglingItemId, setTogglingItemId] = useState<string>();

  // Calculate adherence stats
  const adherenceStats = useMemo(() => {
    const all = [
      ...groupedSupplements.morning,
      ...groupedSupplements.afternoon,
      ...groupedSupplements.evening,
      ...groupedSupplements.before_sleep,
    ];
    const total = all.length;
    const taken = all.filter(s => s.takenToday).length;
    return { taken, total, percentage: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }, [groupedSupplements]);

  // Low stock IDs for quick lookup
  const lowStockIds = useMemo(() => {
    return new Set(lowStockAlerts?.map(a => a.id) || []);
  }, [lowStockAlerts]);

  // Determine current time slot
  const getCurrentTimeSlot = (): TimeSlot => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'noon';
    if (hour < 21) return 'evening';
    return 'bedtime';
  };

  // Find first incomplete section or use current time
  const getDefaultExpandedSection = (): TimeSlot => {
    const slots: TimeSlot[] = ['morning', 'noon', 'evening', 'bedtime'];
    for (const slot of slots) {
      const hookKey = slotToHookKey[slot];
      const items = groupedSupplements[hookKey as keyof typeof groupedSupplements] || [];
      if (items.some(i => !i.takenToday)) {
        return slot;
      }
    }
    return getCurrentTimeSlot();
  };

  const [expandedSection, setExpandedSection] = useState<TimeSlot>(getCurrentTimeSlot());

  // Update expanded section when data loads
  useEffect(() => {
    if (!isLoading && adherenceStats.total > 0) {
      setExpandedSection(getDefaultExpandedSection());
    }
  }, [isLoading, adherenceStats.total]);

  // Handle toggle item
  const handleToggleItem = async (item: Parameters<typeof toggleIntakeMutation.mutate>[0]) => {
    setTogglingItemId(item.id);
    try {
      await toggleIntakeMutation.mutateAsync(item);
    } finally {
      setTogglingItemId(undefined);
    }
  };

  // Handle take all in section
  const handleTakeAll = (slot: TimeSlot) => {
    const hookKey = slotToHookKey[slot];
    const items = groupedSupplements[hookKey as keyof typeof groupedSupplements] || [];
    const notTaken = items.filter(i => !i.takenToday);
    if (notTaken.length > 0) {
      logIntakeMutation.mutate(notTaken);
    }
  };

  // Time sections config
  const timeSections: { key: TimeSlot; hookKey: string }[] = [
    { key: 'morning', hookKey: 'morning' },
    { key: 'noon', hookKey: 'afternoon' },
    { key: 'evening', hookKey: 'evening' },
    { key: 'bedtime', hookKey: 'before_sleep' },
  ];

  if (isLoading) {
    return <PageLoader />;
  }

  // Empty state
  if (adherenceStats.total === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Pill className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('mobile.emptyTitle')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('mobile.emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-24"
    >
      {/* Day Progress Gauge */}
      <DayProgressGauge 
        taken={adherenceStats.taken}
        total={adherenceStats.total}
      />

      {/* Timeline Sections */}
      <div className="px-4 space-y-3">
        {timeSections.map(section => {
          const items = groupedSupplements[section.hookKey as keyof typeof groupedSupplements] || [];
          
          return (
            <TimelineSection
              key={section.key}
              timeSlot={section.key}
              items={items}
              lowStockIds={lowStockIds}
              onToggleItem={handleToggleItem}
              onTakeAll={() => handleTakeAll(section.key)}
              isExpanded={expandedSection === section.key}
              onToggle={() => setExpandedSection(
                expandedSection === section.key ? getCurrentTimeSlot() : section.key
              )}
              togglingItemId={togglingItemId}
            />
          );
        })}
      </div>

      {/* All Done State */}
      {adherenceStats.percentage === 100 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mt-6 p-6 rounded-2xl bg-green-500/10 border border-green-500/30 text-center"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-green-500">{t('mobile.allDoneTitle')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('mobile.allDoneDesc')}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
