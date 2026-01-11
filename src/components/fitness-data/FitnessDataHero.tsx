import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Link as LinkIcon, Activity, Clock, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { staggerItem } from '@/lib/animations';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: typeof LinkIcon;
  gradient: string;
}

function StatCard({ title, value, icon: Icon, gradient }: StatCardProps) {
  return (
    <motion.div variants={staggerItem}>
      <Card className={`glass-card border-border/50 hover-lift group relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface FitnessDataHeroProps {
  activeIntegrations: number;
  totalMetrics: number;
  lastSync: string;
  healthScore: number;
}

export function FitnessDataHero({
  activeIntegrations,
  totalMetrics,
  lastSync,
  healthScore,
}: FitnessDataHeroProps) {
  const { t } = useTranslation('fitnessData');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title={t('hero.activeIntegrations')}
        value={activeIntegrations}
        icon={LinkIcon}
        gradient="from-blue-500 to-cyan-500"
      />
      <StatCard
        title={t('hero.metricsCollected')}
        value={totalMetrics}
        icon={Activity}
        gradient="from-purple-500 to-pink-500"
      />
      <StatCard
        title={t('hero.lastSync')}
        value={lastSync}
        icon={Clock}
        gradient="from-orange-500 to-red-500"
      />
      <StatCard
        title={t('hero.healthScore')}
        value={`${healthScore}%`}
        icon={Heart}
        gradient="from-green-500 to-emerald-500"
      />
    </div>
  );
}
