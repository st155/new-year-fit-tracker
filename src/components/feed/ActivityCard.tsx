import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

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

// Все карточки имеют красную границу
const getActivityBorderColor = () => {
  return 'border-red-500/80';
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

  // Helper: формат длительности из минут
  const pushDuration = (totalMinutes?: number) => {
    if (totalMinutes === undefined || totalMinutes === null || isNaN(Number(totalMinutes))) return;
    const t = Number(totalMinutes);
    const hours = Math.floor(t / 60);
    const minutes = Math.floor(t % 60);
    const seconds = Math.round((t % 1) * 60);
    if (hours > 0) {
      parts.push(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      parts.push(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  if (activity.action_type === 'workouts') {
    // Длительность из метаданных или по start/end
    if (m.duration_minutes) {
      pushDuration(Number(m.duration_minutes));
    } else if (m.start_time && m.end_time) {
      const diffMin = (new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000;
      pushDuration(diffMin);
    }
    // Strain из метаданных или из action_text
    if (m.strain || m.workout_strain) {
      const strain = m.strain || m.workout_strain;
      parts.push(`${Number(strain).toFixed(1)}`);
    } else if (activity.action_text) {
      const match = activity.action_text.match(/(\d+(?:\.\d+)?)\s*strain/i);
      if (match) parts.push(`${Number(match[1]).toFixed(1)}`);
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
    const metricName: string = m.user_metrics?.metric_name || m.metric_name || '';
    const unit: string | undefined = m.user_metrics?.unit || m.unit;

    // Если это Strain — показываем Duration (если есть) и затем Strain
    if (/strain/i.test(metricName) || /strain/i.test(activity.action_text || '')) {
      if (m.duration_minutes) pushDuration(Number(m.duration_minutes));
      if (m.value !== undefined && m.value !== null) {
        parts.push(`${Number(m.value).toFixed(1)}`);
      } else {
        const match = (activity.action_text || '').match(/(\d+(?:\.\d+)?)\s*strain/i);
        if (match) parts.push(`${Number(match[1]).toFixed(1)}`);
      }
      return parts.join(', ');
    }

    // Сон — часы в формат H:MM
    if (/sleep/i.test(metricName) || /slept/i.test(activity.action_text || '')) {
      const hoursVal = Number(m.value);
      if (!isNaN(hoursVal)) {
        const h = Math.floor(hoursVal);
        const min = Math.round((hoursVal % 1) * 60);
        parts.push(`${h}:${min.toString().padStart(2, '0')}`);
      }
      return parts.join(', ');
    }

    // Если пришло значение в часах (unit содержит hour), конвертируем красиво
    if (unit && /(hour|час)/i.test(unit) && m.value !== undefined) {
      const hoursVal = Number(m.value);
      if (!isNaN(hoursVal)) {
        const h = Math.floor(hoursVal);
        const min = Math.round((hoursVal % 1) * 60);
        parts.push(`${h}:${min.toString().padStart(2, '0')}`);
      }
      return parts.join(', ');
    }

    // По умолчанию ничего не добавляем, чтобы не мусорить ленту
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
  const borderColor = getActivityBorderColor();
  const profiles = activity.profiles;
  
  // Получаем инициалы пользователя
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

  // Форматируем время
  const getRelativeTime = () => {
    try {
      return formatDistanceToNow(new Date(activity.created_at), { 
        addSuffix: true, 
        locale: ru 
      });
    } catch {
      return '';
    }
  };

  const displayName = profiles?.full_name?.split(' ')[0] || profiles?.username || 'Пользователь';
  const likeCount = activity.like_count || 0;
  const commentCount = activity.comment_count || 0;
  
  return (
    <div className={cn(
      "relative rounded-[28px] border-[2.5px] bg-[#1a1f2e] p-6 transition-all duration-300 animate-fade-in",
      borderColor
    )}>
      <div className="flex items-start gap-4">
        <Avatar className={cn("h-16 w-16 border-[2.5px] shrink-0", borderColor)}>
          <AvatarImage src={profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-xl font-bold bg-[#252b3d] text-white">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-[22px] font-bold text-white leading-tight">{displayName}</h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
              <span className="text-base font-medium text-white">{likeCount}</span>
            </div>
          </div>
          <p className="text-[15px] text-gray-300 leading-relaxed mb-3">
            {activity.action_text}
          </p>
          <p className="text-[13px] text-gray-500">
            {getRelativeTime()}
          </p>
        </div>
      </div>
    </div>
  );
}