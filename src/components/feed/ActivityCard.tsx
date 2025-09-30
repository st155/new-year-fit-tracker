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
    if (has('run') || has('бег')) return <Footprints className="h-8 w-8" strokeWidth={1.5} />;
    if (has('swim') || has('плав')) return <Waves className="h-8 w-8" strokeWidth={1.5} />;
    if (has('bike') || has('велос') || has('cycle')) return <Bike className="h-8 w-8" strokeWidth={1.5} />;
    if (has('hike') || has('walk') || has('ходьб') || has('поход')) return <Mountain className="h-8 w-8" strokeWidth={1.5} />;
    if (has('strength') || has('силов') || has('weight') || has('barbell') || has('штанг')) return <Dumbbell className="h-8 w-8" strokeWidth={1.5} />;
    return <TrendingUp className="h-8 w-8" strokeWidth={1.5} />;
  }

  if (activity.action_type === 'metric_values') {
    if (has('recovery') || /восстанов/i.test(text)) return <Heart className="h-8 w-8" strokeWidth={1.5} />;
    return <TrendingUp className="h-8 w-8" strokeWidth={1.5} />;
  }

  if (/(sleep|сон)/i.test(text)) return <Moon className="h-8 w-8" strokeWidth={1.5} />;
  if (/(boxing|бокс|martial|единобор)/i.test(text)) return <Zap className="h-8 w-8" strokeWidth={1.5} />;

  return <Activity className="h-8 w-8" strokeWidth={1.5} />;
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
  
  // Получаем инициалы пользователя (первая буква имени + первая буква фамилии)
  const getUserInitials = () => {
    if (profiles?.full_name) {
      const parts = profiles.full_name.split(' ');
      if (parts.length >= 2) {
        return parts[0].charAt(0) + parts[1].charAt(0);
      }
      return parts[0].substring(0, 2);
    }
    if (profiles?.username) {
      return profiles.username.substring(0, 2).toUpperCase();
    }
    return 'ST';
  };

  const userInitials = getUserInitials();
  const parts = [userInitials];

  if (activity.action_type === 'workouts') {
    // Добавляем длительность (Duration)
    if (m.duration_minutes) {
      const totalMinutes = Number(m.duration_minutes);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      const seconds = Math.round((totalMinutes % 1) * 60);
      
      if (hours > 0) {
        parts.push(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        parts.push(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }
    
    // Добавляем Strain
    if (m.strain || m.workout_strain) {
      const strain = m.strain || m.workout_strain;
      parts.push(`${Number(strain).toFixed(1)}`);
    }
    
    return parts.join(', ');
  }

  if (activity.action_type === 'body_composition') {
    if (m.weight) {
      parts.push(`${Number(m.weight).toFixed(1)}kg`);
    }
    if (m.body_fat_percentage) {
      parts.push(`${Number(m.body_fat_percentage).toFixed(1)}% BF`);
    }
    return parts.join(', ');
  }

  if (activity.action_type === 'metric_values') {
    const metricName = m.user_metrics?.metric_name;
    if (metricName === 'Recovery Score') {
      parts.push(`${Math.round(Number(m.value))}%`);
    } else if (metricName === 'Workout Strain') {
      parts.push(`${Number(m.value).toFixed(1)}`);
    } else if (metricName === 'Sleep Duration') {
      const hours = Number(m.value);
      const h = Math.floor(hours);
      const min = Math.round((hours % 1) * 60);
      parts.push(`${h}:${min.toString().padStart(2, '0')}`);
    } else if (metricName === 'VO2Max') {
      parts.push(`${Number(m.value).toFixed(1)}`);
    } else if (m.value) {
      parts.push(`${Number(m.value).toFixed(1)}${m.unit || ''}`);
    }
    return parts.join(', ');
  }

  if (activity.action_type === 'measurements') {
    if (m.value && m.unit) {
      parts.push(`${m.value} ${m.unit}`);
    }
    return parts.join(', ');
  }

  if (activity.action_type === 'goals') {
    const goalName = m.goal_name || 'goal';
    parts.push(`${goalName}`);
    return parts.join(', ');
  }

  return parts.join(', ');
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