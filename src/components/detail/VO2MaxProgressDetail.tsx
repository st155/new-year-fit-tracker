import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingDown, TrendingUp, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Chart3D } from '@/components/ui/3d-progress-chart';

interface VO2MaxData {
  date: string;
  vo2max: number;
  change?: number;
}

interface VO2MaxProgressDetailProps {
  onBack: () => void;
}

export function VO2MaxProgressDetail({ onBack }: VO2MaxProgressDetailProps) {
  const { user } = useAuth();
  const [vo2maxData, setVO2MaxData] = useState<VO2MaxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVO2Max, setCurrentVO2Max] = useState<number | null>(null);
  const [weeklyChange, setWeeklyChange] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchVO2MaxData();
    }
  }, [user]);

  const fetchVO2MaxData = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 90); // Последние 90 дней для VO2Max

      // Получаем данные VO2Max из metric_values
      const { data: vo2maxMetrics } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .or('user_metrics.metric_name.ilike.%vo2%,user_metrics.metric_name.ilike.%кардио%,user_metrics.metric_name.ilike.%cardiovascular%')
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date', { ascending: true });

      let formattedData: VO2MaxData[] = [];
      
      if (vo2maxMetrics && vo2maxMetrics.length > 0) {
        formattedData = vo2maxMetrics
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
    return format(new Date(dateStr), 'd MMM', { locale: ru });
  };

  const getVO2MaxCategory = (value: number) => {
    // Примерная классификация VO2Max для взрослых
    if (value >= 60) return { label: 'Превосходный', color: 'text-green-600' };
    if (value >= 50) return { label: 'Отличный', color: 'text-green-500' };
    if (value >= 40) return { label: 'Хороший', color: 'text-blue-500' };
    if (value >= 30) return { label: 'Удовлетворительный', color: 'text-yellow-500' };
    return { label: 'Требует улучшения', color: 'text-red-500' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={onBack} className="w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
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
    <div className="min-h-screen pb-24 px-4 pt-4 overflow-y-auto bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Прогресс VO2Max</h1>
        </div>
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
          <div className="text-sm text-muted-foreground mb-1">Текущий VO2Max</div>
          <div className="text-4xl font-bold text-[#EF4444]">
            {currentVO2Max ? `${currentVO2Max.toFixed(1)}` : '—'}
          </div>
          {currentVO2Max && (
            <>
              <div className="text-sm text-muted-foreground">мл/кг/мин</div>
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
          <div className="text-sm text-muted-foreground mb-1">За неделю</div>
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
          <div className="text-sm text-muted-foreground mb-1">Измерений</div>
          <div className="text-3xl font-bold text-[#3B82F6]">
            {vo2maxData.length}
          </div>
        </div>
      </div>

      {/* 3D Chart */}
      {vo2maxData.length > 0 ? (
        <div className="mb-6">
          <Chart3D
            data={vo2maxData.map(d => ({
              date: d.date,
              value: d.vo2max,
              change: d.change
            }))}
            color="#EF4444"
            height="400px"
          />
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
          <p className="text-muted-foreground">Нет данных VO2Max</p>
          <p className="text-sm text-muted-foreground">Загрузите скриншоты из Whoop для отслеживания прогресса</p>
        </div>
      )}

      {/* History */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-foreground">История измерений</h3>
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
                  {item.vo2max.toFixed(1)} мл/кг/мин
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.date), 'd MMMM yyyy', { locale: ru })}
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
          📊 Что такое VO2Max?
        </h4>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            VO2Max — максимальное потребление кислорода, ключевой показатель сердечно-сосудистой выносливости.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <strong className="text-foreground">Превосходный:</strong> 60+ мл/кг/мин
            </div>
            <div>
              <strong className="text-foreground">Отличный:</strong> 50-59 мл/кг/мин
            </div>
            <div>
              <strong className="text-foreground">Хороший:</strong> 40-49 мл/кг/мин
            </div>
            <div>
              <strong className="text-foreground">Удовлетв.:</strong> 30-39 мл/кг/мин
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}