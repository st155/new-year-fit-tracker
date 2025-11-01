import { motion, AnimatePresence } from 'framer-motion';
import { MetricCard } from './MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface MetricCardData {
  name: string;
  value: string | number;
  unit?: string;
  icon: any;
  color: string;
  source?: string;
  isStale?: boolean;
  sparkline?: { value: number }[];
  subtitle?: string;
  confidence?: number;
}

interface MetricsGridProps {
  metrics: MetricCardData[];
  isLoading?: boolean;
}

export function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px]" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 px-4 text-center"
      >
        <div className="p-4 rounded-full bg-muted mb-4">
          <Activity className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Нет данных</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Подключите первое устройство для автоматической синхронизации ваших фитнес-данных
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((metric) => (
          <motion.div
            key={metric.name}
            variants={staggerItem}
          >
            <MetricCard {...metric} />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
