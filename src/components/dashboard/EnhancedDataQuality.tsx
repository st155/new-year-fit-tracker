import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, RefreshCw, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useDataQualityHistory } from '@/hooks/useDataQualityHistory';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface QualityZone {
  label: string;
  count: number;
  percentage: number;
  color: string;
  icon: LucideIcon;
}

interface QualityZoneRowProps {
  zone: QualityZone;
}

function QualityZoneRow({ zone }: QualityZoneRowProps) {
  const Icon = zone.icon;
  
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 flex-shrink-0" style={{ color: zone.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">{zone.label}</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {zone.count} показател{zone.count === 1 ? 'ь' : 'ей'} · {zone.percentage}%
          </span>
        </div>
        <Progress 
          value={zone.percentage} 
          className="h-2"
          style={{ 
            ['--progress-background' as string]: zone.color 
          }} 
        />
      </div>
    </div>
  );
}

function CompactRadialProgress({ value, size = 120 }: { value: number; size?: number }) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = (val: number) => {
    if (val >= 80) return 'hsl(var(--success))';
    if (val >= 60) return 'hsl(var(--chart-2))';
    if (val >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{value}%</span>
      </div>
    </div>
  );
}

interface EnhancedDataQualityProps {
  userId?: string;
}

export function EnhancedDataQuality({ userId }: EnhancedDataQualityProps) {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const { 
    averageConfidence, 
    metricsByQuality, 
    isLoading 
  } = useDataQuality();
  
  const { data: history } = useDataQualityHistory(userId);
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  
  if (isLoading || !metricsByQuality) return null;

  const totalMetrics = 
    metricsByQuality.excellent.length +
    metricsByQuality.good.length +
    metricsByQuality.fair.length +
    metricsByQuality.poor.length;

  const zones: QualityZone[] = [
    {
      label: t('dataQuality.excellent'),
      count: metricsByQuality.excellent.length,
      percentage: totalMetrics > 0 ? Math.round((metricsByQuality.excellent.length / totalMetrics) * 100) : 0,
      color: 'hsl(var(--success))',
      icon: CheckCircle2,
    },
    {
      label: t('dataQuality.good'),
      count: metricsByQuality.good.length,
      percentage: totalMetrics > 0 ? Math.round((metricsByQuality.good.length / totalMetrics) * 100) : 0,
      color: 'hsl(var(--chart-2))',
      icon: CheckCircle2,
    },
    {
      label: t('dataQuality.fair'),
      count: metricsByQuality.fair.length,
      percentage: totalMetrics > 0 ? Math.round((metricsByQuality.fair.length / totalMetrics) * 100) : 0,
      color: 'hsl(var(--warning))',
      icon: AlertTriangle,
    },
    {
      label: t('dataQuality.poor'),
      count: metricsByQuality.poor.length,
      percentage: totalMetrics > 0 ? Math.round((metricsByQuality.poor.length / totalMetrics) * 100) : 0,
      color: 'hsl(var(--destructive))',
      icon: XCircle,
    },
  ];

  const handleRecalculate = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('dataQuality.title')}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Пересчитать
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
          {/* Left: Radial */}
          <div className="flex flex-col items-center justify-center">
            <CompactRadialProgress value={Math.round(averageConfidence)} size={140} />
            <p className="text-sm text-muted-foreground mt-2">Общий балл</p>
          </div>
          
          {/* Right: Zones breakdown */}
          <div className="space-y-4">
            {zones.map((zone, i) => (
              <QualityZoneRow key={i} zone={zone} />
            ))}
          </div>
        </div>
        
        {/* Bottom: Trend chart */}
        {history && history.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Тренд качества (7 дней)
            </h4>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).getDate().toString()}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                    formatter={(value: number) => [`${value}%`, 'Качество']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgConfidence" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
