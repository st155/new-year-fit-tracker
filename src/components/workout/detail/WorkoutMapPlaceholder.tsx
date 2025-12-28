import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, MapPin } from "lucide-react";

export default function WorkoutMapPlaceholder() {
  const { t } = useTranslation('workouts');

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5 text-green-400" />
          {t('map.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[300px] rounded-lg overflow-hidden bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-white/5">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <MapPin className="w-16 h-16 text-green-400/30 mb-4" />
            <p className="text-gray-300 font-medium mb-2">{t('map.noGps')}</p>
            <p className="text-sm text-gray-400 max-w-md">
              {t('map.deviceRequired')}
            </p>
            <div className="mt-6 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs text-gray-500">📍 {t('map.inDevelopment')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
