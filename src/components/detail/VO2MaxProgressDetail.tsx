import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Heart, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { QuickMeasurementDialog } from '@/features/goals/components';

interface VO2MaxData {
  date: string;
  vo2max: number;
  change?: number;
}

interface VO2MaxProgressDetailProps {
  onBack: () => void;
}

export function VO2MaxProgressDetail({ onBack }: VO2MaxProgressDetailProps) {
  const { t, i18n } = useTranslation('health');
  const { user } = useAuth();
  const [vo2maxData, setVO2MaxData] = useState<VO2MaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVO2Max, setCurrentVO2Max] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);
  const [vo2maxGoal, setVO2maxGoal] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  useEffect(() => {
    if (user) {
      fetchVO2MaxData();
    }
  }, [user]);

  const fetchVO2MaxData = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 90);

      // Получаем цель по VO2Max
      const { data: vo2maxGoalData } = await supabase
        .from('goals')
        .select('id, goal_name, goal_type, target_value, target_unit')
        .eq('user_id', user.id)
        .ilike('goal_name', '%vo2%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (vo2maxGoalData) {
        setVO2maxGoal(vo2maxGoalData);
      }

      // Получаем данные VO2Max из metric_values через user_metrics
      const { data: vo2maxMetrics } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      // Фильтруем только VO2Max метрики
      const filteredMetrics = vo2maxMetrics?.filter(item => 
        item.user_metrics?.metric_name?.toLowerCase().includes('vo2')
      ) || [];

      let formattedData: VO2MaxData[] = [];
      
      if (filteredMetrics && filteredMetrics.length > 0) {
        formattedData = filteredMetrics
          .map((item, index, arr) => ({
            date: item.measurement_date,
            vo2max: Number(item.value),
            change: index > 0 ? Number(item.value) - Number(arr[index - 1].value) : 0
          }));
      }

      setVO2MaxData(formattedData);
      
      if (formattedData.length > 0) {
        const latest = formattedData[formattedData.length - 1];
        setCurrentVO2Max(latest.vo2max);
        
        // Вычисляем недельное изменение
        const weekAgo = formattedData.find(item => {
          const itemDate = new Date(item.date);
          const weekAgoDate = subDays(new Date(), 7);
          return itemDate >= weekAgoDate;
        });
        
        if (weekAgo) {
          setWeeklyChange(latest.vo2max - weekAgo.vo2max);
        }
      }
    } catch (error) {
      console.error('Error fetching VO2Max data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number | null) => {
    if (!change) return null;
    return change > 0 ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatTooltipDate = (dateStr: string) => {
    return format(new Date(dateStr), 'd MMM', { locale: dateLocale });
  };

  const getVO2MaxCategory = (value: number) => {
    // Примерная классификация VO2Max для взрослых
    if (value >= 60) return { label: t('vo2maxDetail.category.excellent'), color: 'text-green-600' };
    if (value >= 50) return { label: t('vo2maxDetail.category.veryGood'), color: 'text-green-500' };
    if (value >= 40) return { label: t('vo2maxDetail.category.good'), color: 'text-blue-500' };
    if (value >= 30) return { label: t('vo2maxDetail.category.fair'), color: 'text-yellow-500' };
    return { label: t('vo2maxDetail.category.needsImprovement'), color: 'text-red-500' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('vo2maxDetail.back')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full pb-6 px-4 pt-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('vo2maxDetail.title')}</h1>
          </div>
        </div>
        {vo2maxGoal && (
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="icon"
            className="rounded-full bg-gradient-primary hover:opacity-90 shrink-0"
          >
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div 
          className="p-5 rounded-2xl border-2 relative overflow-hidden col-span-2"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "#EF4444",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">{t('vo2maxDetail.current')}</div>
          <div className="text-4xl font-bold text-[#EF4444]">
            {currentVO2Max ? `${currentVO2Max.toFixed(1)}` : '—'}
          </div>
          {currentVO2Max && (
            <>
              <div className="text-sm text-muted-foreground">{t('vo2maxDetail.unit')}</div>
              <div className={`text-xs mt-1 font-semibold ${getVO2MaxCategory(currentVO2Max).color}`}>
                {getVO2MaxCategory(currentVO2Max).label}
              </div>
            </>
          )}
        </div>

        <div 
          className="p-5 rounded-2xl border-2"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">{t('vo2maxDetail.weekly')}</div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            {weeklyChange !== null ? (
              <>
                {getTrendIcon(weeklyChange)}
                <span className={weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}
                </span>
              </>
            ) : '—'}
          </div>
        </div>

        <div 
          className="p-5 rounded-2xl border-2"
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            borderColor: "#3B82F6",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
          }}
        >
          <div className="text-sm text-muted-foreground mb-1">{t('vo2maxDetail.measurements')}</div>
          <div className="text-3xl font-bold text-[#3B82F6]">
            {vo2maxData.length}
          </div>
        </div>
      </div>

      {/* Chart */}
      {vo2maxData.length > 0 ? (
        <div 
          className="p-4 rounded-2xl border-2 mb-6"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vo2maxData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vo2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255, 255, 255, 0.1)" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatTooltipDate}
                  stroke="rgba(255, 255, 255, 0.3)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  stroke="rgba(255, 255, 255, 0.3)"
                  tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 12px'
                  }}
                  labelStyle={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
                  itemStyle={{ color: '#EF4444', fontSize: 14, fontWeight: 'bold' }}
                labelFormatter={(value) => formatTooltipDate(value as string)}
                formatter={(value: number) => [t('vo2maxDetail.valueUnit', { value: value.toFixed(1) }), 'VO2Max']}
              />
                <Line 
                  type="monotone" 
                  dataKey="vo2max" 
                  stroke="#EF4444" 
                  strokeWidth={3}
                  fill="url(#vo2Gradient)"
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div 
          className="text-center py-12 rounded-2xl border-2 mb-6"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground">{t('vo2maxDetail.noData')}</p>
          <p className="text-sm text-muted-foreground">{t('vo2maxDetail.noDataHint')}</p>
        </div>
      )}

      {/* History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground">{t('vo2maxDetail.history')}</h3>
        <div className="space-y-2">
          {vo2maxData.slice(-10).reverse().map((item) => (
            <div 
              key={item.date} 
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <div>
                <div className="font-semibold text-foreground text-lg">
                  {t('vo2maxDetail.valueUnit', { value: item.vo2max.toFixed(1) })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.date), 'd MMMM yyyy', { locale: dateLocale })}
                </div>
                <div className={`text-xs font-semibold ${getVO2MaxCategory(item.vo2max).color}`}>
                  {getVO2MaxCategory(item.vo2max).label}
                </div>
              </div>
              {item.change !== 0 && (
                <div 
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
                  style={{
                    background: item.change > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.change > 0 ? '#22C55E' : '#EF4444'
                  }}
                >
                  {getTrendIcon(item.change)}
                  <span>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div 
        className="p-5 rounded-2xl border-2"
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          borderColor: "#3B82F6",
        }}
      >
        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          📊 {t('vo2maxDetail.info.title')}
        </h4>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            {t('vo2maxDetail.info.description')}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <strong className="text-foreground">{t('vo2maxDetail.category.excellent')}:</strong> 60+ {t('vo2maxDetail.unit')}
            </div>
            <div>
              <strong className="text-foreground">{t('vo2maxDetail.category.veryGood')}:</strong> 50-59 {t('vo2maxDetail.unit')}
            </div>
            <div>
              <strong className="text-foreground">{t('vo2maxDetail.category.good')}:</strong> 40-49 {t('vo2maxDetail.unit')}
            </div>
            <div>
              <strong className="text-foreground">{t('vo2maxDetail.category.fairShort')}:</strong> 30-39 {t('vo2maxDetail.unit')}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Measurement Dialog */}
      {vo2maxGoal && (
        <QuickMeasurementDialog
          goal={vo2maxGoal}
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onMeasurementAdded={fetchVO2MaxData}
        />
      )}
    </div>
  );
}