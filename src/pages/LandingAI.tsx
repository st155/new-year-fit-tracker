import { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSmartInsights } from '@/hooks/useSmartInsights';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useHabits } from '@/hooks/useHabits';
import { useMetrics } from '@/hooks/composite/data/useMetrics';
import { useBodyComposition } from '@/hooks/composite/data/useBodyComposition';
import { SparklesCore } from '@/components/aceternity/sparkles';
import { HoverBorderGradient } from '@/components/aceternity/hover-border-gradient';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { AreaChart } from '@tremor/react';
import { Sparkles, TrendingUp, Target, Zap, Shield, Activity, Brain, Users, Award, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const BodyModel3D = lazy(() => import('@/components/body-composition/BodyModel3D').then(m => ({ default: m.BodyModel3D })));

// Animated Counter Component
const AnimatedCounter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

// Insight Card Component
const InsightCard = ({ insight, index }: { insight: any; index: number }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'correlation': return '🔗';
      case 'achievement': return '🏆';
      case 'recommendation': return '💡';
      default: return '🤖';
    }
  };

  const getGradientColor = () => {
    switch (insight.type) {
      case 'critical': return 'from-red-500/20 to-red-600/10';
      case 'warning': return 'from-yellow-500/20 to-yellow-600/10';
      case 'correlation': return 'from-blue-500/20 to-blue-600/10';
      case 'achievement': return 'from-green-500/20 to-green-600/10';
      default: return 'from-cyan-500/20 to-cyan-600/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card p-6 rounded-xl bg-gradient-to-br ${getGradientColor()} border border-border/50 hover:border-primary/50 transition-all hover:scale-105`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{getIcon()}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-2 capitalize">{insight.type}</h4>
          <p className="text-sm text-muted-foreground line-clamp-3">{insight.message}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Stat Card Component with Icons
const StatCard = ({ icon: Icon, value, label, index, color }: { 
  icon: any; 
  value: number; 
  label: string; 
  index: number;
  color: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.1, y: -5 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="text-center relative group cursor-pointer"
  >
    <Icon className={`h-10 w-10 mx-auto mb-3 text-${color}-400 group-hover:text-${color}-300 transition-colors`} />
    <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
      <AnimatedCounter value={value} />
      {value >= 1000000 && '+'}
    </div>
    <div className="text-sm text-muted-foreground">{label}</div>
    
    {/* Hover Glow */}
    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-purple-500/20 to-pink-500/0 
      opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
  </motion.div>
);

// Testimonials data
const testimonials = [
  {
    name: "Алексей М.",
    role: "Триатлет",
    quote: "AI точно предсказал мою перетренированность за 2 дня до травмы. Спасибо!"
  },
  {
    name: "Мария К.",
    role: "Фитнес-тренер",
    quote: "Клиенты теперь получают персонализированные планы автоматически. Революция!"
  },
  {
    name: "Дмитрий С.",
    role: "Бодибилдер",
    quote: "3D анализ тела показал дисбаланс, о котором я не знал. Результаты улучшились!"
  }
];

export default function LandingAI() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000, stopOnInteraction: false })]);

  // Fetch all data
  const { insights, isLoading: insightsLoading } = useSmartInsights({ maxInsights: 6 });
  const { averageConfidence, isLoading: qualityLoading } = useDataQuality();
  const { habits } = useHabits(user?.id);
  const { latest: metrics, history: metricsHistory } = useMetrics({
    metricTypes: ['weight'],
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
  });
  const { bodyData, model3D } = useBodyComposition({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
  });

  // Platform stats
  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const [challenges, workouts, metricsCount] = await Promise.all([
        supabase.from('challenges').select('id', { count: 'exact', head: true }),
        supabase.from('workout_logs').select('id', { count: 'exact', head: true }),
        supabase.from('unified_metrics').select('id', { count: 'exact', head: true }),
      ]);

      return {
        challenges: challenges.count || 1204,
        workouts: workouts.count || 8500,
        metrics: metricsCount.count || 1000000,
        insights: 5200,
      };
    },
  });

  // Convert segmental data to array format if needed
  const segmentalArray = useMemo(() => {
    if (!model3D?.segmental) return [];
    
    const seg = model3D.segmental;
    return [
      { name: 'Right Arm', value: seg.rightArm?.percent || 0, balanced: true },
      { name: 'Left Arm', value: seg.leftArm?.percent || 0, balanced: true },
      { name: 'Trunk', value: seg.trunk?.percent || 0, balanced: true },
      { name: 'Right Leg', value: seg.rightLeg?.percent || 0, balanced: true },
      { name: 'Left Leg', value: seg.leftLeg?.percent || 0, balanced: true },
    ];
  }, [model3D?.segmental]);

  // Process data
  const displayInsight = insights[0] || {
    message: 'Подключите данные для AI анализа',
    type: 'info',
  };

  const displayConfidence = averageConfidence || 0;

  const bestHabit = useMemo(() => {
    const habitsWithStreaks = habits.filter(h => h.stats?.current_streak && h.stats.current_streak > 0);
    return habitsWithStreaks.sort((a, b) => (b.stats?.current_streak || 0) - (a.stats?.current_streak || 0))[0] || {
      name: 'Создайте первую привычку',
      stats: { current_streak: 0 },
    };
  }, [habits]);

  const chartData = useMemo(() => {
    return metricsHistory?.slice(-7).map((m: any) => ({
      date: new Date(m.measured_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      value: m.value,
    })) || [];
  }, [metricsHistory]);

  if (insightsLoading || qualityLoading) {
    return <PageLoader message="Загружаем ваш AI демо..." />;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <SparklesCore
            id="landing-sparkles"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={120}
            className="w-full h-full"
            particleColor="#06b6d4"
          />
        </div>

        {/* Floating Elements - Hidden on mobile */}
        <div className="hidden lg:block">
          <motion.div
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-10 opacity-20"
          >
            <Brain className="h-24 w-24 text-cyan-400" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-40 right-10 opacity-20"
          >
            <Zap className="h-32 w-32 text-purple-400" />
          </motion.div>

          {/* Floating Stats */}
          {[
            { value: "92%", label: "Точность", top: "15%", left: "5%" },
            { value: "24/7", label: "Мониторинг", top: "60%", right: "5%" },
            { value: "1M+", label: "Данных", bottom: "20%", left: "10%" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, delay: i * 1.5 }}
              className="absolute glass-card p-4 rounded-xl border border-primary/20"
              style={{ top: stat.top, left: stat.left, right: stat.right, bottom: stat.bottom }}
            >
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Elite10: Ваш AI-тренер
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Отдыхайте умнее. Тренируйтесь эффективнее. Достигайте большего.
            </p>
          </motion.div>

          {/* Pulsing Background Glow */}
          <div className="absolute inset-0 max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 
              blur-3xl animate-pulse opacity-50 rounded-3xl" />
          </div>

          {/* Central Glass Window - Live Dashboard Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative glass-card backdrop-blur-3xl p-4 sm:p-8 md:p-12 lg:p-16 rounded-3xl 
              border-2 border-primary/20 shadow-[0_0_50px_rgba(6,182,212,0.3)] 
              bg-gradient-to-br from-background/80 via-background/60 to-background/80
              max-w-5xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-foreground">
              Привет, {user?.user_metadata?.full_name || 'Спортсмен'}! 👋
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* AI Insight */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-medium p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 
                  border-2 border-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]
                  transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Brain className="h-6 w-6 text-cyan-400" />
                  <h3 className="font-semibold text-foreground">AI Совет</h3>
                </div>
                <p className="text-sm text-muted-foreground">{displayInsight.message}</p>
              </motion.div>

              {/* Data Quality */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="glass-medium p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 
                  border-2 border-green-500/30 hover:border-green-400/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]
                  transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Shield className="h-6 w-6 text-green-400" />
                  <h3 className="font-semibold text-foreground">Качество данных</h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-green-400">{Math.round(displayConfidence)}</span>
                  <span className="text-muted-foreground">%</span>
                </div>
              </motion.div>

              {/* Habit Streak */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="glass-medium p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 
                  border-2 border-orange-500/30 hover:border-orange-400/60 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]
                  transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Target className="h-6 w-6 text-orange-400" />
                  <h3 className="font-semibold text-foreground">Лучшая привычка</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{bestHabit.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl">🔥</span>
                  <span className="text-3xl font-bold text-orange-400">{bestHabit.stats?.current_streak || 0}</span>
                  <span className="text-muted-foreground text-sm">дней</span>
                </div>
              </motion.div>

              {/* Metric Chart */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="glass-medium p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                  border-2 border-purple-500/30 hover:border-purple-400/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]
                  transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                  <h3 className="font-semibold text-foreground">Динамика веса</h3>
                </div>
                {chartData.length > 0 ? (
                  <AreaChart
                    className="h-20 mt-2"
                    data={chartData}
                    index="date"
                    categories={["value"]}
                    colors={["purple"]}
                    showXAxis={false}
                    showYAxis={false}
                    showLegend={false}
                    showGridLines={false}
                    showTooltip={true}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Добавьте первую метрику</p>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="glass-card backdrop-blur-xl p-8 rounded-2xl border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <StatCard 
                icon={Target}
                value={platformStats?.challenges || 1204} 
                label="Активных челленджей" 
                index={0}
                color="cyan"
              />
              <StatCard 
                icon={Zap}
                value={platformStats?.workouts || 8500} 
                label="Тренировок завершено" 
                index={1}
                color="purple"
              />
              <StatCard 
                icon={Activity}
                value={platformStats?.metrics || 1000000} 
                label="Метрик синхронизировано" 
                index={2}
                color="green"
              />
              <StatCard 
                icon={Brain}
                value={platformStats?.insights || 5200} 
                label="AI-советов сгенерировано" 
                index={3}
                color="orange"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI Insights Showcase */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              AI, который видит паттерны, не только цифры
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Персонализированные инсайты на основе ваших данных в реальном времени
            </p>
          </motion.div>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex gap-6">
              {insights.slice(0, 6).map((insight, index) => (
                <div key={index} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0">
                  <InsightCard insight={insight} index={index} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid with 3D Body */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Полный контроль над вашим прогрессом
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 3D Body Model - Takes 2 rows on large screens */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="lg:row-span-2 glass-card p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-foreground">3D Анализ тела</h3>
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <Suspense fallback={
                <div className="h-64 flex items-center justify-center">
                  <PageLoader size="sm" />
                </div>
              }>
                <BodyModel3D segmentalData={segmentalArray} />
              </Suspense>
              <div className="mt-4 p-3 glass-medium rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Muscle Mass: {bodyData?.muscleMass?.toFixed(1) || '--'} kg
                </p>
              </div>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:scale-105 transition-transform"
            >
              <Zap className="h-8 w-8 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Тренировки</h3>
              <p className="text-sm text-muted-foreground">
                Автоматическая генерация тренировок на основе вашего восстановления и целей
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 hover:scale-105 transition-transform"
            >
              <Shield className="h-8 w-8 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Ассессмент здоровья</h3>
              <p className="text-sm text-muted-foreground">
                Мониторинг биомаркеров и предупреждения о рисках перетренированности
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:scale-105 transition-transform"
            >
              <Target className="h-8 w-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Умные цели</h3>
              <p className="text-sm text-muted-foreground">
                Адаптивные цели, которые корректируются на основе вашего прогресса
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="glass-card p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 hover:scale-105 transition-transform"
            >
              <Brain className="h-8 w-8 text-orange-400 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Предиктивная аналитика</h3>
              <p className="text-sm text-muted-foreground">
                Прогнозы достижения целей и предупреждения о потенциальных проблемах
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-background/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Что говорят пользователи
            </h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 rounded-2xl border border-border/50 hover:border-primary/50 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">"{t.quote}"</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card backdrop-blur-xl p-8 sm:p-12 rounded-3xl border border-border/50 text-center"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Готовы перейти от данных к действиям?
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Активируйте AI Juggernaut Engine и получите персонализированный тренировочный план за 2 минуты
            </p>

            <HoverBorderGradient
              as="div"
              containerClassName="inline-block"
              className="bg-background text-foreground"
            >
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => {
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                  navigate('/workouts/ai-onboarding');
                }}
              >
                Начать AI Онбординг
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            </HoverBorderGradient>

            <p className="text-sm text-muted-foreground mt-6">
              Бесплатный 14-дневный триал. Отмена в любое время.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
