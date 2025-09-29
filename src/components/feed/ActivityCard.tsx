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
  const isRu = /[а-яё]/i.test(activity.action_text || '');
  const clean = (activity.action_text || '').replace(/\[.*?\]/g, '').trim();

  // If backend already produced a descriptive sentence, use it
  const generic = /^(activity|активность)$/i.test(clean);
  const veryGeneric = /(завершил тренировку)$/i.test(clean);
  if (!generic && !veryGeneric && clean.length > 3) return clean;

  const m = activity.metadata || {};

  if (activity.action_type === 'workouts') {
    const wt = (m.workout_type || '').toLowerCase();
    const isRun = /run|бег/.test(wt);
    const isSwim = /swim|плав/.test(wt);
    const isBike = /bike|cycle|велос/.test(wt);
    const isWalk = /walk|ходьб|hike|поход/.test(wt);
    const isStrength = /strength|силов|weight|barbell|штанг/.test(wt);

    const label = isRun
      ? 'Бег'
      : isBike
      ? 'Велосипед'
      : isSwim
      ? 'Плавание'
      : isWalk
      ? 'Ходьба'
      : isStrength
      ? 'Силовая'
      : 'Тренировка';

    const parts: string[] = [];
    const dist = formatDistance(m.distance_km, isSwim);
    if (dist) parts.push(dist);
    if (m.duration_minutes) parts.push(`${m.duration_minutes} мин`);
    if (m.calories_burned) parts.push(`${Math.round(Number(m.calories_burned))} ккал`);

    return parts.length ? `${label} — ${parts.join(', ')}` : label;
  }

  if (activity.action_type === 'body_composition') {
    const parts: string[] = [];
    if (m.weight) parts.push(`${Number(m.weight)} кг`);
    if (m.body_fat_percentage) parts.push(`${Number(m.body_fat_percentage)}% жир`);
    return parts.length ? `Состав тела — ${parts.join(', ')}` : (isRu ? 'Состав тела' : 'Body composition');
  }

  if (activity.action_type === 'measurements') {
    if (m.value && m.unit) return `${isRu ? 'Измерение' : 'Measurement'} — ${m.value} ${m.unit}`;
    return isRu ? 'Измерение' : 'Measurement';
  }

  if (activity.action_type === 'metric_values') {
    if (m.value) return `${isRu ? 'Метрика' : 'Metric'} — ${m.value}${m.unit ? ` ${m.unit}` : ''}`;
  }

  return clean || (isRu ? 'Активность' : 'Activity');
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