import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ExportReportsDialog } from "./ExportReportsDialog";
import { ClientProgressCharts } from "./ClientProgressCharts";
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations-v3';
import { Card as TremorCard, Metric, Text, BadgeDelta, ProgressBar, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge as TremorBadge } from '@tremor/react';
import { useTranslation } from "react-i18next";

interface ClientStats {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  goals_count: number;
  goals_on_track: number;
  goals_at_risk: number;
  recent_measurements: number;
  last_activity: string;
  health_score: number;
  progress_score: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'inactive';
}

interface OverallStats {
  total_clients: number;
  active_clients: number;
  total_goals: number;
  completed_goals: number;
  recent_measurements: number;
  avg_progress: number;
}

export function TrainerAnalytics() {
  const { user } = useAuth();
  const { t } = useTranslation("trainer");
  const [clientStats, setClientStats] = useState<ClientStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedClientForExport, setSelectedClientForExport] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Используем оптимизированный RPC вместо множественных запросов
      const { data: clients, error } = await supabase
        .rpc('get_trainer_clients_enhanced', {
          p_trainer_id: user.id
        });

      if (error) throw error;

      // Обрабатываем данные клиентов
      const stats: ClientStats[] = (clients || []).map((client: any) => {
        const goalsCount = client.active_goals_count || 0;
        const goalsOnTrack = client.goals_on_track || 0;
        const goalsAtRisk = client.goals_at_risk || 0;
        const recentMeasurementsCount = client.recent_measurements_count || 0;
        const lastActivity = client.last_activity_date || '';
        const healthScore = client.health_score || 0;
        
        // Вычисляем очки прогресса (0-100)
        let progressScore = 0;
        
        // Наличие целей (20 баллов)
        if (goalsCount > 0) progressScore += 20;
        
        // Регулярные измерения (30 баллов)
        if (recentMeasurementsCount > 0) progressScore += 15;
        if (recentMeasurementsCount >= 5) progressScore += 15;
        
        // Прогресс по целям (25 баллов)
        if (goalsCount > 0 && goalsOnTrack > 0) {
          const trackPercentage = (goalsOnTrack / goalsCount) * 100;
          if (trackPercentage >= 80) progressScore += 25;
          else if (trackPercentage >= 50) progressScore += 15;
          else progressScore += 5;
        }
        
        // Недавняя активность (25 баллов)
        if (lastActivity) {
          const daysSinceActivity = Math.floor(
            (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceActivity <= 1) progressScore += 25;
          else if (daysSinceActivity <= 3) progressScore += 15;
          else if (daysSinceActivity <= 7) progressScore += 10;
          else if (daysSinceActivity <= 14) progressScore += 5;
        }

        // Определяем статус на основе health_score (если есть) или progressScore
        let status: ClientStats['status'] = 'inactive';
        const scoreToUse = healthScore > 0 ? healthScore : progressScore;
        
        if (scoreToUse >= 80) status = 'excellent';
        else if (scoreToUse >= 60) status = 'good';
        else if (scoreToUse >= 40) status = 'needs_attention';
        else status = 'inactive';

        return {
          id: client.client_id,
          user_id: client.client_id,
          username: client.username || '',
          full_name: client.full_name || '',
          goals_count: goalsCount,
          goals_on_track: goalsOnTrack,
          goals_at_risk: goalsAtRisk,
          recent_measurements: recentMeasurementsCount,
          last_activity: lastActivity,
          health_score: healthScore,
          progress_score: progressScore,
          status
        };
      });

      setClientStats(stats);

      // Вычисляем общую статистику из загруженных данных
      const totalClients = stats.length;
      const activeClients = stats.filter(c => c.status !== 'inactive').length;
      const totalGoals = stats.reduce((sum, c) => sum + c.goals_count, 0);
      const goalsOnTrack = stats.reduce((sum, c) => sum + c.goals_on_track, 0);
      const goalsAtRisk = stats.reduce((sum, c) => sum + c.goals_at_risk, 0);
      const recentMeasurementsSum = stats.reduce((sum, c) => sum + c.recent_measurements, 0);
      const avgProgress = totalClients > 0 
        ? stats.reduce((sum, c) => sum + c.progress_score, 0) / totalClients 
        : 0;

      setOverallStats({
        total_clients: totalClients,
        active_clients: activeClients,
        total_goals: totalGoals,
        completed_goals: goalsOnTrack,
        recent_measurements: recentMeasurementsSum,
        avg_progress: Math.round(avgProgress)
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error(t('analytics.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'needs_attention':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'inactive':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return t('analytics.status.excellent');
      case 'good':
        return t('analytics.status.good');
      case 'needs_attention':
        return t('analytics.status.needsAttention');
      case 'inactive':
        return t('analytics.status.inactive');
      default:
        return status;
    }
  };

  const getStatusColor = (status: ClientStats['status']) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'needs_attention':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.title')}</h2>
          <p className="text-muted-foreground">{t('analytics.subtitle')}</p>
        </div>
        <Button onClick={() => setExportOpen(true)} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('analytics.exportReport')}
        </Button>
      </div>
      
      <ExportReportsDialog 
        open={exportOpen}
        onOpenChange={setExportOpen}
        clientId={selectedClientForExport?.id}
        clientName={selectedClientForExport?.name}
      />

      {/* Общая статистика */}
      {overallStats && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="cyan">
              <div className="flex items-center justify-between">
                <Text>{t('analytics.totalClients')}</Text>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.total_clients}</Metric>
              <Text className="text-xs mt-1">
                {t('analytics.activeClients')} {overallStats.active_clients}
              </Text>
              <BadgeDelta 
                deltaType={overallStats.active_clients > 0 ? "moderateIncrease" : "unchanged"} 
                className="mt-2"
              >
                {overallStats.total_clients > 0 ? Math.round((overallStats.active_clients / overallStats.total_clients) * 100) : 0}% {t('analytics.activity')}
              </BadgeDelta>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="purple">
              <div className="flex items-center justify-between">
                <Text>{t('analytics.activeGoals')}</Text>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.total_goals}</Metric>
              <Text className="text-xs mt-1">
                {t('analytics.completed')} {overallStats.completed_goals}
              </Text>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="orange">
              <div className="flex items-center justify-between">
                <Text>{t('analytics.measurementsThisMonth')}</Text>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.recent_measurements}</Metric>
              <Text className="text-xs mt-1">{t('analytics.last30days')}</Text>
            </TremorCard>
          </motion.div>

          <motion.div variants={staggerItem}>
            <TremorCard className="glass-medium border-white/10" decoration="top" decorationColor="emerald">
              <div className="flex items-center justify-between">
                <Text>{t('analytics.avgProgress')}</Text>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <Metric className="mt-2">{overallStats.avg_progress}%</Metric>
              <ProgressBar 
                value={overallStats.avg_progress} 
                color="emerald" 
                className="mt-2" 
              />
            </TremorCard>
          </motion.div>
        </motion.div>
      )}

      {/* Статистика по клиентам */}
      <Card className="glass-medium neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('analytics.detailedStats')}
          </CardTitle>
          <CardDescription>
            {t('analytics.detailedStatsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientStats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">{t('analytics.noClients')}</h3>
              <p className="text-muted-foreground">
                {t('analytics.addClientsForAnalytics')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientStats.map((client) => (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-light p-4 rounded-lg hover:neon-border transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="h-14 w-14 border-2 border-white/10">
                        <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white font-bold">
                          {client.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center",
                        client.status === 'excellent' ? "bg-green-500" :
                        client.status === 'good' ? "bg-blue-500" :
                        client.status === 'needs_attention' ? "bg-yellow-500" : "bg-red-500"
                      )}>
                        {client.status === 'excellent' ? <Award className="h-3 w-3 text-white" /> :
                         client.status === 'good' ? <CheckCircle className="h-3 w-3 text-white" /> :
                         client.status === 'needs_attention' ? <AlertTriangle className="h-3 w-3 text-white" /> :
                         <TrendingDown className="h-3 w-3 text-white" />}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{client.full_name || client.username}</h4>
                        <Badge className={cn(
                          "text-xs",
                          client.status === 'excellent' ? "bg-green-500/20 text-green-400" :
                          client.status === 'good' ? "bg-blue-500/20 text-blue-400" :
                          client.status === 'needs_attention' ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {getStatusLabel(client.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">@{client.username}</p>
                      
                      {/* Metrics */}
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <Target className="h-3 w-3 text-purple-400" />
                          <span className="text-muted-foreground">{t('analytics.goals')}</span>
                          <span className="font-medium">{client.goals_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Activity className="h-3 w-3 text-green-400" />
                          <span className="text-muted-foreground">{t('analytics.activity')}:</span>
                          <span className="font-medium">{client.recent_measurements}</span>
                        </div>
                        {client.last_activity && (
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3 text-blue-400" />
                            <span className="text-muted-foreground">{new Date(client.last_activity).toLocaleDateString('ru')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="hidden md:flex flex-col items-end gap-1 min-w-[100px]">
                      <span className="text-xs font-medium">{client.progress_score}%</span>
                      <Progress 
                        value={client.progress_score} 
                        className="h-2 w-full"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Рекомендации */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.recommendations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientStats.filter(c => c.status === 'inactive').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-800">
                    {clientStats.filter(c => c.status === 'inactive').length} неактивных подопечных
                  </p>
                  <p className="text-red-700">
                    Свяжитесь с ними или создайте мотивационный пост
                  </p>
                </div>
              </div>
            )}
            
            {clientStats.filter(c => c.status === 'needs_attention').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">
                    {clientStats.filter(c => c.status === 'needs_attention').length} подопечных требуют внимания
                  </p>
                  <p className="text-yellow-700">
                    Проверьте их цели и предложите поддержку
                  </p>
                </div>
              </div>
            )}
            
            {clientStats.filter(c => c.status === 'excellent').length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Award className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-800">
                    {clientStats.filter(c => c.status === 'excellent').length} подопечных показывают отличные результаты
                  </p>
                  <p className="text-green-700">
                    Поделитесь их успехами для мотивации других
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}