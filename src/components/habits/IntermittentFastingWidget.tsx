import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, Droplets, Zap, Flame, TrendingUp, Calendar, Award, 
  Play, Square, AlertCircle, Sparkles, Brain, Shield 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  useActiveFastingSession, 
  useFastingHistory, 
  useStartFasting, 
  useEndFasting,
  useFastingStats
} from '@/hooks/useFastingSessions';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const FASTING_MODES = [
  { value: '16:8', label: '16:8 (Интервальное)', hours: 16 },
  { value: '18:6', label: '18:6 (Воин)', hours: 18 },
  { value: '20:4', label: '20:4', hours: 20 },
  { value: '23:1', label: '23:1 (OMAD)', hours: 23 },
  { value: '36h-dry', label: '36ч Сухое', hours: 36 },
  { value: '48h', label: '48ч Расширенное', hours: 48 },
  { value: 'custom', label: 'Кастомное', hours: 0 },
];

interface FastingPhase {
  name: string;
  minHours: number;
  maxHours: number;
  icon: React.ReactNode;
  color: string;
  benefits: string[];
}

const FASTING_PHASES: FastingPhase[] = [
  {
    name: 'Пищеварение',
    minHours: 0,
    maxHours: 4,
    icon: <Droplets className="h-4 w-4" />,
    color: 'hsl(var(--primary))',
    benefits: ['Переваривание пищи', 'Уровень глюкозы стабилизируется'],
  },
  {
    name: 'Переход',
    minHours: 4,
    maxHours: 12,
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'hsl(var(--warning))',
    benefits: ['Запасы гликогена истощаются', 'Начало жиросжигания'],
  },
  {
    name: 'Жиросжигание',
    minHours: 12,
    maxHours: 16,
    icon: <Flame className="h-4 w-4" />,
    color: 'hsl(210, 100%, 55%)',
    benefits: ['Активное жиросжигание', 'Повышение энергии'],
  },
  {
    name: 'Кетоз',
    minHours: 16,
    maxHours: 24,
    icon: <Zap className="h-4 w-4" />,
    color: 'hsl(45, 100%, 51%)',
    benefits: ['Производство кетонов', 'Ментальная ясность'],
  },
  {
    name: 'Глубокий кетоз',
    minHours: 24,
    maxHours: 36,
    icon: <Sparkles className="h-4 w-4" />,
    color: 'hsl(280, 100%, 60%)',
    benefits: ['Максимальное жиросжигание', 'Повышение HGH'],
  },
  {
    name: 'Аутофагия',
    minHours: 36,
    maxHours: Infinity,
    icon: <Brain className="h-4 w-4" />,
    color: 'hsl(340, 82%, 52%)',
    benefits: ['Клеточная регенерация', 'Антивозрастной эффект', 'Иммунитет ↑'],
  },
];

function getCurrentPhase(hours: number): FastingPhase {
  return FASTING_PHASES.find(phase => hours >= phase.minHours && hours < phase.maxHours) || FASTING_PHASES[FASTING_PHASES.length - 1];
}

export function IntermittentFastingWidget() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState('16:8');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: activeSession } = useActiveFastingSession(user?.id);
  const { data: history = [] } = useFastingHistory(user?.id, 30);
  const stats = useFastingStats(user?.id);
  const startFasting = useStartFasting();
  const endFasting = useEndFasting();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate fasting duration
  const fastingDuration = useMemo(() => {
    if (!activeSession) return 0;
    const start = new Date(activeSession.start_time).getTime();
    const now = currentTime.getTime();
    return (now - start) / (1000 * 60 * 60); // hours
  }, [activeSession, currentTime]);

  const currentPhase = getCurrentPhase(fastingDuration);
  const targetHours = activeSession?.target_hours || FASTING_MODES.find(m => m.value === selectedMode)?.hours || 16;
  const progress = Math.min((fastingDuration / targetHours) * 100, 100);

  // Chart data for history
  const chartData = useMemo(() => {
    return history.slice(0, 14).reverse().map(session => {
      const start = new Date(session.start_time).getTime();
      const end = session.end_time ? new Date(session.end_time).getTime() : Date.now();
      const duration = (end - start) / (1000 * 60 * 60);
      
      return {
        date: format(new Date(session.start_time), 'dd MMM', { locale: ru }),
        duration: Math.round(duration),
      };
    });
  }, [history]);

  const handleStart = () => {
    if (!user?.id) return;
    const mode = FASTING_MODES.find(m => m.value === selectedMode);
    startFasting.mutate({
      userId: user.id,
      fastingType: selectedMode,
      targetHours: mode?.hours,
    });
  };

  const handleEnd = (completed: boolean) => {
    if (!user?.id || !activeSession) return;
    endFasting.mutate({
      sessionId: activeSession.id,
      userId: user.id,
      completed,
    });
  };

  const isInKetosis = fastingDuration >= 16;
  const isInDeepKetosis = fastingDuration >= 24;
  const isInAutophagy = fastingDuration >= 36;

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <Card className="inbody-card neon-border overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Интермиттентное голодание</CardTitle>
            </div>
            {isInKetosis && (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse">
                <Flame className="h-3 w-3 mr-1" />
                Кетоз
              </Badge>
            )}
          </div>
          <CardDescription>
            {activeSession ? 'Голодание активно' : 'Выберите режим и начните'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!activeSession ? (
            // Start Mode
            <div className="space-y-4">
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FASTING_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label} {mode.hours > 0 && `(${mode.hours}ч)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button onClick={handleStart} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Начать голодание
              </Button>

              {/* Quick Stats */}
              {stats.totalSessions > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.currentStreak}</div>
                    <div className="text-xs text-muted-foreground">Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.averageDuration}ч</div>
                    <div className="text-xs text-muted-foreground">Средняя</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.longestFast}ч</div>
                    <div className="text-xs text-muted-foreground">Рекорд</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Active Fasting Mode
            <div className="space-y-4">
              {/* Progress Circle */}
              <div className="relative flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-muted/20"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke={currentPhase.color}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                      className="transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-bold metric-glow" style={{ color: currentPhase.color }}>
                      {Math.floor(fastingDuration)}ч {Math.round((fastingDuration % 1) * 60)}м
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      из {targetHours}ч
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Phase */}
              <div className="inbody-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {currentPhase.icon}
                  <span className="font-semibold" style={{ color: currentPhase.color }}>
                    {currentPhase.name}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {currentPhase.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Smart Insights */}
              {isInDeepKetosis && (
                <div className="glass-card border-purple-500/30 bg-purple-500/5 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold text-purple-400">Глубокий кетоз! </span>
                      <span className="text-muted-foreground">
                        Ваше тело активно использует жир как источник энергии. 
                        {fastingDuration >= 30 && ' Не забудьте о гидратации и электролитах.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isInAutophagy && (
                <div className="glass-card border-pink-500/30 bg-pink-500/5 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-pink-400 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold text-pink-400">Аутофагия активна! </span>
                      <span className="text-muted-foreground">
                        Клеточная регенерация в самом разгаре. Антивозрастной эффект максимален.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleEnd(true)} 
                  variant="default"
                  className="bg-success hover:bg-success/90"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Завершить
                </Button>
                <Button 
                  onClick={() => handleEnd(false)} 
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Прервать
                </Button>
              </div>

              {/* Start Info */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Начато: {format(new Date(activeSession.start_time), 'HH:mm, dd MMM', { locale: ru })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Chart */}
      {chartData.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              История (последние 14 дней)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    axisLine={false}
                  />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <div className="bg-background border rounded px-2 py-1 text-xs shadow-lg">
                            <div>{payload[0].payload.date}</div>
                            <div className="font-semibold text-primary">
                              {payload[0].value}ч голодания
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="text-center">
                <Award className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{stats.totalSessions}</div>
                <div className="text-[10px] text-muted-foreground">Всего</div>
              </div>
              <div className="text-center">
                <Flame className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{stats.currentStreak}</div>
                <div className="text-[10px] text-muted-foreground">Streak</div>
              </div>
              <div className="text-center">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{stats.averageDuration}ч</div>
                <div className="text-[10px] text-muted-foreground">Средняя</div>
              </div>
              <div className="text-center">
                <Zap className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{stats.totalHoursFasted}ч</div>
                <div className="text-[10px] text-muted-foreground">Всего</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
