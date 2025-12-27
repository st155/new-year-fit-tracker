import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Heart } from "lucide-react";
import { transformZoneDurations } from "@/lib/workout-calculations";

interface HeartRateZonesChartProps {
  zoneData?: any;
}

export default function HeartRateZonesChart({ zoneData }: HeartRateZonesChartProps) {
  const { t } = useTranslation('workouts');
  const chartData = transformZoneDurations(zoneData);

  if (chartData.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            {t('heartRateZones.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">{t('heartRateZones.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          {t('heartRateZones.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="zone" 
              stroke="rgba(255,255,255,0.5)"
              fontSize={12}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.5)"
              fontSize={12}
              label={{ value: t('heartRateZones.minutes'), angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px'
              }}
              formatter={(value: number) => [`${value.toFixed(1)} ${t('heartRateZones.minAbbr')}`, t('heartRateZones.time')]}
            />
            <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span>💡</span>
          <span>{t('heartRateZones.hint')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
