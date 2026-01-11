import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag, Zap } from "lucide-react";
import { generateSplits } from "@/lib/workout-calculations";

interface WorkoutSplitsTableProps {
  distanceKm?: number;
  durationMin?: number;
}

export default function WorkoutSplitsTable({ distanceKm, durationMin }: WorkoutSplitsTableProps) {
  const { t } = useTranslation('workouts');

  if (!distanceKm || !durationMin || distanceKm < 1) {
    return null;
  }

  const splits = generateSplits(distanceKm, durationMin);

  if (splits.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-yellow-400" />
          {t('splits.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {splits.map((split) => (
            <div 
              key={split.km}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-yellow-400">{split.km}</span>
                </div>
                <span className="text-gray-300 font-medium">{t('splits.kilometer', { km: split.km })}</span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t('splits.pace')}</p>
                  <p className="text-sm font-semibold text-gray-200">{split.pace} {t('detailUnits.perKm')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{t('splits.time')}</p>
                  <p className="text-sm font-semibold text-gray-200">{split.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-gray-400">
            {t('splits.estimatedNote')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
