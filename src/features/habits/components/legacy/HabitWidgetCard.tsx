import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface HabitWidgetCardProps {
  habit: any;
  onClick?: () => void;
}

export function HabitWidgetCard({ habit, onClick }: HabitWidgetCardProps) {
  const { t, i18n } = useTranslation('habits');
  const [elapsedTime, setElapsedTime] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (habit.habit_type !== 'duration_counter' || !habit.current_attempt?.start_date) return;

    const updateElapsed = () => {
      const start = new Date(habit.current_attempt.start_date);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      const days = Math.floor(diffMins / 1440);
      const hours = Math.floor((diffMins % 1440) / 60);
      const minutes = diffMins % 60;
      
      setElapsedTime({ days, hours, minutes });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [habit]);

  const getBadgeColor = () => {
    const colors: Record<string, string> = {
      health: 'bg-gradient-to-r from-red-500 to-orange-500',
      nutrition: 'bg-gradient-to-r from-green-500 to-teal-500',
      fitness: 'bg-gradient-to-r from-blue-500 to-purple-500',
      mindfulness: 'bg-gradient-to-r from-purple-500 to-pink-500',
      productivity: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    };
    return colors[habit.category] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  const getProgressToNextMilestone = () => {
    if (!habit.ai_motivation?.milestones) return 0;
    
    const totalMinutes = elapsedTime.days * 1440 + elapsedTime.hours * 60 + elapsedTime.minutes;
    const milestones = Object.keys(habit.ai_motivation.milestones).map(Number).sort((a, b) => a - b);
    const nextMilestone = milestones.find(m => m > totalMinutes);
    
    if (!nextMilestone) return 100;
    return Math.min(100, (totalMinutes / nextMilestone) * 100);
  };

  const formatMoneySaved = () => {
    const costPerDay = habit.custom_settings?.cost_per_day || 0;
    if (!costPerDay || !elapsedTime.days) return null;
    
    const saved = Math.floor((elapsedTime.days + elapsedTime.hours / 24) * costPerDay);
    const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
    const currency = i18n.language === 'ru' ? 'RUB' : 'USD';
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(saved);
  };

  return (
    <Card 
      className="p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 ${getBadgeColor()} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
            {habit.icon}
          </div>
          <div>
            <h4 className="font-semibold">{habit.name}</h4>
            <p className="text-xs text-muted-foreground">{habit.category}</p>
          </div>
        </div>
      </div>

      {/* Duration Counter Display */}
      {habit.habit_type === 'duration_counter' && habit.current_attempt && (
        <div className="text-center my-4">
          <div className="inline-flex items-baseline gap-2 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 rounded-lg">
            <span className="text-3xl font-bold">{elapsedTime.days}</span>
            <span className="text-sm text-muted-foreground">{t('widget.days')}</span>
            <span className="text-xl font-semibold">{elapsedTime.hours}</span>
            <span className="text-xs text-muted-foreground">{t('widget.hours')}</span>
            <span className="text-lg">{elapsedTime.minutes}</span>
            <span className="text-xs text-muted-foreground">{t('widget.minutes')}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="space-y-2">
        {habit.stats && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">{t('widget.bestResult')}</span>
            </div>
            <span className="font-semibold">{t('widget.daysCount', { count: habit.stats.longest_streak })}</span>
          </div>
        )}

        {formatMoneySaved() && (
          <div className="text-sm">
            <span className="text-muted-foreground">{t('widget.saved')} </span>
            <span className="font-semibold text-green-600">{formatMoneySaved()}</span>
          </div>
        )}

        {/* Progress to Next Milestone */}
        {habit.habit_type === 'duration_counter' && habit.ai_motivation && (
          <div className="mt-3">
            <Progress value={getProgressToNextMilestone()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {t('widget.progressToMilestone', { percent: Math.round(getProgressToNextMilestone()) })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
