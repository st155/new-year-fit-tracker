import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, TrendingUp } from "lucide-react";
import { calculatePace, calculateSpeed } from "@/lib/workout-calculations";

interface PaceMetricsCardProps {
  distanceKm?: number;
  durationMin?: number;
}

export default function PaceMetricsCard({ distanceKm, durationMin }: PaceMetricsCardProps) {
  const { t } = useTranslation('workouts');

  if (!distanceKm || !durationMin) {
    return null;
  }

  const pace = calculatePace(distanceKm, durationMin);
  const speed = calculateSpeed(distanceKm, durationMin);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-purple-400" />
          {t('paceMetrics.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pace */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <p className="text-sm text-gray-400 mb-1">{t('paceMetrics.avgPace')}</p>
            <p className="text-3xl font-bold text-purple-400">{pace}</p>
            <p className="text-xs text-gray-500 mt-1">{t('detailUnits.minPerKm')}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-purple-400/50" />
        </div>

        {/* Speed */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
          <div>
            <p className="text-sm text-gray-400 mb-1">{t('paceMetrics.avgSpeed')}</p>
            <p className="text-3xl font-bold text-cyan-400">{speed.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('detailUnits.kmPerH')}</p>
          </div>
          <Gauge className="w-8 h-8 text-cyan-400/50" />
        </div>

        <div className="pt-2 border-t border-white/10 text-xs text-gray-400">
          <span>{t('paceMetrics.calculatedNote')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
