import { Activity, Heart, Moon, Dumbbell, TrendingUp, Bike, Waves, Mountain, Footprints, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
    metadata?: any;
    profiles: {
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    like_count?: number;
    comment_count?: number;
    user_liked?: boolean;
  };
  onActivityUpdate: () => void;
}

const getActivityIcon = (activity: ActivityCardProps["activity"]) => {
  const meta = activity.metadata || {};
  const text = (activity.action_text || '').toLowerCase();
  const type = (meta.workout_type || '').toLowerCase();

  const has = (s: string) => text.includes(s) || type.includes(s);

  if (activity.action_type === 'workouts') {
    if (has('run') || has('бег')) return <Footprints className="h-8 w-8" />;
    if (has('swim') || has('плав')) return <Waves className="h-8 w-8" />;
    if (has('bike') || has('велос') || has('cycle')) return <Bike className="h-8 w-8" />;
    if (has('hike') || has('walk') || has('ходьб') || has('поход')) return <Mountain className="h-8 w-8" />;
    if (has('strength') || has('силов') || has('weight') || has('barbell') || has('штанг')) return <Dumbbell className="h-8 w-8" />;
    return <TrendingUp className="h-8 w-8" />;
  }

  if (activity.action_type === 'metric_values') {
    if (has('recovery') || /восстанов/i.test(text)) return <Heart className="h-8 w-8" />;
    return <TrendingUp className="h-8 w-8" />;
  }

  if (/(sleep|сон)/i.test(text)) return <Moon className="h-8 w-8" />;
  if (/(boxing|бокс|martial|единобор)/i.test(text)) return <Zap className="h-8 w-8" />;

  return <Activity className="h-8 w-8" />;
};

const formatDistance = (km?: number | null, swim = false) => {
  if (!km && km !== 0) return undefined;
  const val = Number(km);
  if (swim || val < 1) return `${Math.round(val * 1000)} м`;
  return `${val.toFixed(1).replace(/\.0$/, '')} км`;
};

const buildDisplayText = (activity: ActivityCardProps["activity"]) => {
  const m = activity.metadata || {};
  const profiles = activity.profiles;
  const userName = profiles?.full_name || profiles?.username || "Пользователь";

  if (activity.action_type === 'workouts') {
    const wt = (m.workout_type || '').toLowerCase();
    const isRun = /run|бег/.test(wt);
    const isSwim = /swim|плав/.test(wt);
    const isBike = /bike|cycle|велос/.test(wt);
    const isWalk = /walk|ходьб|hike|поход/.test(wt);
    const isStrength = /strength|силов|weight|barbell|штанг/.test(wt);

    let activityText = "";
    if (isRun) {
      activityText = "пробежал";
      if (m.distance_km) activityText += ` ${Number(m.distance_km).toFixed(1)} км`;
    } else if (isBike) {
      activityText = "проехал на велосипеде";
      if (m.distance_km) activityText += ` ${Number(m.distance_km).toFixed(1)} км`;
    } else if (isSwim) {
      activityText = "проплыл";
      if (m.distance_km) activityText += ` ${Math.round(Number(m.distance_km) * 1000)} м`;
    } else if (isWalk) {
      activityText = "прошел";
      if (m.distance_km) activityText += ` ${Number(m.distance_km).toFixed(1)} км`;
    } else if (isStrength) {
      activityText = "завершил силовую тренировку";
    } else {
      activityText = `завершил тренировку ${m.workout_type || 'неизвестного типа'}`;
    }

    const details = [];
    if (m.duration_minutes) details.push(`${m.duration_minutes} мин`);
    if (m.calories_burned) details.push(`${Math.round(Number(m.calories_burned))} ккал`);
    
    const result = `${userName} ${activityText}`;
    return details.length > 0 ? `${result} (${details.join(', ')})` : result;
  }

  if (activity.action_type === 'body_composition') {
    const details = [];
    if (m.weight) details.push(`вес ${Number(m.weight).toFixed(1)} кг`);
    if (m.body_fat_percentage) details.push(`${Number(m.body_fat_percentage).toFixed(1)}% жира`);
    
    if (details.length > 0) {
      return `${userName} обновил состав тела (${details.join(', ')})`;
    }
    return `${userName} обновил состав тела`;
  }

  if (activity.action_type === 'measurements') {
    if (m.value && m.unit) {
      return `${userName} записал измерение: ${m.value} ${m.unit}`;
    }
    return `${userName} добавил измерение`;
  }

  if (activity.action_type === 'metric_values') {
    const metricName = m.user_metrics?.metric_name;
    if (metricName === 'Recovery Score') {
      return `${userName} восстановился на ${Math.round(Number(m.value))}%`;
    }
    if (metricName === 'Workout Strain') {
      return `${userName} завершил тренировку (нагрузка ${Number(m.value).toFixed(1)})`;
    }
    if (metricName === 'Sleep Duration') {
      const hours = Number(m.value);
      return `${userName} спал ${hours.toFixed(1)} ч`;
    }
    if (metricName === 'VO2Max') {
      return `${userName} обновил VO₂Max: ${Number(m.value).toFixed(1)} мл/кг/мин`;
    }
    if (m.value) {
      return `${userName} обновил показатель: ${Number(m.value).toFixed(1)}${m.unit ? ` ${m.unit}` : ''}`;
    }
  }

  if (activity.action_type === 'goals') {
    const goalName = m.goal_name || 'новую цель';
    if (m.target_value && m.target_unit) {
      return `${userName} создал цель "${goalName}" (${m.target_value} ${m.target_unit})`;
    }
    return `${userName} создал цель "${goalName}"`;
  }

  // Fallback - никогда не показываем техническую информацию
  return `${userName} проявил активность`;
};


export function ActivityCard({ activity }: ActivityCardProps) {
  const text = buildDisplayText(activity);
  const icon = getActivityIcon(activity);
  
  return (
    <div className="relative rounded-3xl p-[2px] bg-gradient-to-r from-primary via-primary to-success overflow-hidden group hover:scale-[1.02] transition-all duration-300 animate-fade-in">
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-sm p-6 h-full">
        <div className="flex items-center gap-4">
          <div className="text-primary shrink-0">
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">
              {text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}