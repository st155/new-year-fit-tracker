import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Users, Trophy, Target, Activity, Heart, TrendingUp, ArrowRight, Star, Brain, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { motion } from 'framer-motion';
import { HoverBorderGradient } from '@/components/aceternity/hover-border-gradient';
import { StatCard } from '@/components/landing/StatCard';

const SparklesCore = lazy(() => import('@/components/aceternity/sparkles').then(m => ({ default: m.SparklesCore })));


const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    if (user) {
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  const handleCTAClick = async () => {
    const confetti = (await import('canvas-confetti')).default;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    if (user) {
      navigate('/');
    } else {
      navigate('/auth');
    }
  };

  const testimonials = [
    {
      name: "Сергей Н.",
      initials: "СН",
      role: "Участник New Year Challenge",
      quote: "Сбросил 15 кг за 3 месяца! Командная поддержка творит чудеса.",
      achievement: "🏆 Победитель челленджа"
    },
    {
      name: "Анна К.",
      initials: "АК",
      role: "CrossFit Атлет",
      quote: "Метрики помогли оптимизировать тренировки. PR в каждом упражнении!",
      achievement: "💪 +40% силовые показатели"
    },
    {
      name: "Игорь М.",
      initials: "ИМ",
      role: "Марафонец",
      quote: "VO2max вырос с 48 до 55! Приложение - мой цифровой тренер.",
      achievement: "🏃 Личный рекорд в марафоне"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/30 backdrop-blur-sm sticky top-0 z-[9999]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Elite10
            </span>
          </div>
          
          <div className="flex items-center gap-4 pointer-events-auto relative isolate z-[60]">
            <Button 
              onClick={handleGetStarted}
              className="bg-gradient-primary text-primary-foreground hover:shadow-glow"
            >
              {user ? 'Перейти в приложение' : t('landing.getStarted')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-16 lg:py-24 overflow-hidden">
        {/* Sparkles Background */}
        <div className="absolute inset-0 w-full h-full">
          <Suspense fallback={<div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />}>
            <SparklesCore
              id="landing-sparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1.2}
              particleDensity={50}
              className="w-full h-full"
              particleColor="hsl(var(--primary))"
            />
          </Suspense>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-32 left-10 opacity-20 hidden lg:block"
        >
          <Trophy className="h-32 w-32 text-yellow-400" />
        </motion.div>

        <motion.div
          animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-40 right-10 opacity-20 hidden lg:block"
        >
          <Target className="h-28 w-28 text-primary" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 left-20 opacity-20 hidden lg:block"
        >
          <Activity className="h-24 w-24 text-accent" />
        </motion.div>

        {/* Floating Stats Badges */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-1/4 hidden xl:block"
        >
          <div className="glass-card backdrop-blur-xl px-4 py-2 rounded-full border border-primary/30 shadow-glow">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">92% Точность</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 left-1/4 hidden xl:block"
        >
          <div className="glass-card backdrop-blur-xl px-4 py-2 rounded-full border border-accent/30 shadow-glow">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-accent">24/7 Мониторинг</span>
            </div>
          </div>
        </motion.div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center space-y-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2">
                  {t('landing.newChallengeSoon')}
                </Badge>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl lg:text-6xl font-bold text-foreground max-w-4xl mx-auto leading-tight"
              >
                {t('landing.heroTitle1')}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent block">
                  {t('landing.heroTitle2')}
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                {t('landing.heroSubtitle')}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <HoverBorderGradient
                containerClassName="rounded-full"
                className="bg-background text-foreground px-8 py-3 text-lg font-semibold"
                onClick={handleGetStarted}
              >
                <span className="flex items-center gap-2">
                  {user ? 'Перейти в приложение' : t('landing.startFreeTrial')}
                  <ArrowRight className="h-5 w-5" />
                </span>
              </HoverBorderGradient>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg"
              >
                {t('landing.watchDemo')}
              </Button>
            </motion.div>
          </div>

          {/* Mock Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative max-w-5xl mx-auto"
          >
            <div className="glass-card backdrop-blur-3xl rounded-2xl border-2 border-primary/20 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-4 sm:p-8">
              {/* Mock Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 rounded-full bg-accent/20 border-4 border-accent flex items-center justify-center">
                  <span className="text-accent font-bold text-lg">SG</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Hi, Sergey!</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="secondary">Participant</Badge>
                    <span>🏆 New Year Challenge</span>
                  </div>
                </div>
              </div>

              {/* Mock Challenge Progress */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-medium rounded-lg p-4 mb-8 border border-primary/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-lg font-bold text-primary">94 DAYS LEFT</span>
                    <div className="text-sm text-muted-foreground">10% COMPLETED</div>
                  </div>
                </div>
                <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "10%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-gradient-primary h-2 rounded-full"
                  />
                </div>
              </motion.div>

              {/* Mock Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-2 border-metric-body-fat bg-metric-body-fat/5 hover:scale-105 hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">BODY FAT</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">18.5</span>
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">overweight</span>
                      <Badge variant="destructive" className="text-xs">-3%</Badge>
                    </div>
                  </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-2 border-metric-weight bg-metric-weight/5 hover:scale-105 hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">WEIGHT</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">72.0</span>
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">on track</span>
                      <Badge variant="destructive" className="text-xs">-2%</Badge>
                    </div>
                  </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-2 border-metric-vo2max bg-metric-vo2max/5 hover:scale-105 hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">VO₂MAX</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">52.1</span>
                      <span className="text-sm text-muted-foreground">ML/KG/MIN</span>
                    </div>
                    <span className="text-xs text-muted-foreground">71 records</span>
                  </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-2 border-metric-row bg-metric-row/5 hover:scale-105 hover:shadow-glow transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-2">2KM ROW</div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-bold text-foreground">7:25</span>
                      <span className="text-sm text-muted-foreground">MIN</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">34 attempts</span>
                      <Badge variant="destructive" className="text-xs">-2%</Badge>
                    </div>
                  </CardContent>
                  </Card>
                </motion.div>

                {/* Mock Team Rank Circle */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
                >
                  <div className="bg-card border-4 border-primary rounded-full w-20 h-20 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] transition-shadow">
                    <div className="text-xs text-muted-foreground">TEAM</div>
                    <div className="text-xs text-muted-foreground">RANK:</div>
                    <div className="text-lg font-bold text-primary">#3</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats Bar Section */}
      <section className="py-16 px-6 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card backdrop-blur-xl p-8 rounded-2xl border border-border/50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              <StatCard icon={Users} value={1000} label="Активных пользователей" suffix="+" />
              <StatCard icon={Trophy} value={250} label="Челленджей" suffix="+" />
              <StatCard icon={Activity} value={50000} label="Тренировок" suffix="+" />
              <StatCard icon={Target} value={94} label="% Достижения целей" suffix="%" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: t('landing.smartGoalTracking'),
                description: t('landing.smartGoalTrackingDesc'),
                color: "primary",
                gradient: "from-cyan-500/10 to-blue-500/10"
              },
              {
                icon: Trophy,
                title: t('landing.teamLeaderboard'),
                description: t('landing.teamLeaderboardDesc'),
                color: "accent",
                gradient: "from-purple-500/10 to-pink-500/10",
                link: "/leaderboard"
              },
              {
                icon: Activity,
                title: t('landing.realTimeMetrics'),
                description: t('landing.realTimeMetricsDesc'),
                color: "success",
                gradient: "from-green-500/10 to-emerald-500/10"
              },
              {
                icon: Users,
                title: t('landing.teamCollaboration'),
                description: t('landing.teamCollaborationDesc'),
                color: "primary",
                gradient: "from-cyan-500/10 to-blue-500/10"
              },
              {
                icon: Heart,
                title: t('landing.healthIntegration'),
                description: t('landing.healthIntegrationDesc'),
                color: "accent",
                gradient: "from-purple-500/10 to-pink-500/10"
              },
              {
                icon: TrendingUp,
                title: t('landing.progressAnalytics'),
                description: t('landing.progressAnalyticsDesc'),
                color: "success",
                gradient: "from-green-500/10 to-emerald-500/10"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`group glass-card bg-gradient-to-br ${feature.gradient} border-2 border-${feature.color}/30 hover:border-${feature.color}/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.3)] transition-all duration-300 cursor-pointer h-full`}
                  onClick={() => feature.link && navigate(feature.link)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className={`p-3 rounded-xl bg-${feature.color}/10 w-fit group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                        <feature.icon className={`h-6 w-6 text-${feature.color}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-background to-background/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Истории успеха наших участников
            </h2>
            <p className="text-lg text-muted-foreground">
              Присоединяйтесь к сообществу тех, кто уже достиг своих целей
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -5 }}
                className="glass-card p-6 rounded-2xl border border-border/50 hover:border-primary/50 hover:shadow-glow transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic mb-4">"{t.quote}"</p>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-xs text-primary font-semibold">{t.achievement}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-16 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <SparklesCore
              id="cta-sparkles"
              background="transparent"
              minSize={0.3}
              maxSize={1}
              particleDensity={30}
              className="w-full h-full"
              particleColor="hsl(var(--primary))"
            />
          </Suspense>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card backdrop-blur-xl rounded-2xl p-8 md:p-12 border-2 border-primary/20 shadow-[0_0_50px_rgba(6,182,212,0.3)]"
          >
            <div className="space-y-6">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-3xl lg:text-4xl font-bold text-foreground"
              >
                {t('landing.ctaTitle')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-lg text-muted-foreground"
              >
                {t('landing.ctaSubtitle')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <HoverBorderGradient
                  containerClassName="rounded-full"
                  className="bg-background text-foreground px-8 py-3 text-lg font-semibold"
                  onClick={handleCTAClick}
                >
                  <span className="flex items-center gap-2">
                    {user ? 'Перейти в приложение' : t('landing.getStartedForFree')}
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </HoverBorderGradient>
                <p className="text-sm text-muted-foreground">
                  {t('landing.freeTrialNote')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-foreground">Elite10</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('landing.footerCopyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;