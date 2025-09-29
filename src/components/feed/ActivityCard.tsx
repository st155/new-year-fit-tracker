import { Activity, Heart, Moon, Dumbbell, TrendingUp, Bike, Waves, Mountain, User, Footprints, Zap, PersonStanding } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityCardProps {
  activity: {
    id: string;
    user_id: string;
    action_type: string;
    action_text: string;
    created_at: string;
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

const getActivityIcon = (actionText: string) => {
  const text = actionText.toLowerCase();
  
  // Running activities (orange running person)
  if (text.includes('running') || text.includes('run') || text.includes('бег')) {
    return <Footprints className="h-8 w-8" />;
  }
  
  // Swimming activities (teal waves)
  if (text.includes('swimming') || text.includes('swim') || text.includes('плавание')) {
    return <Waves className="h-8 w-8" />;
  }
  
  // Cycling activities (blue bicycle)
  if (text.includes('cycling') || text.includes('bike') || text.includes('велосипед')) {
    return <Bike className="h-8 w-8" />;
  }
  
  // Weight lifting activities (red/orange person with weights)
  if (text.includes('weight') || text.includes('lifting') || text.includes('силовая') || text.includes('гантели')) {
    return <PersonStanding className="h-8 w-8" />;
  }
  
  // Strength training (barbell icon)
  if (text.includes('strength') || text.includes('barbell') || text.includes('штанга')) {
    return <Dumbbell className="h-8 w-8" />;
  }
  
  // Hiking/Walking activities (green hiking boot/mountain)
  if (text.includes('hiking') || text.includes('walk') || text.includes('поход') || text.includes('ходьба')) {
    return <Mountain className="h-8 w-8" />;
  }
  
  // Yoga/Meditation activities (blue person sitting)
  if (text.includes('yoga') || text.includes('meditation') || text.includes('йога') || text.includes('медитация')) {
    return <User className="h-8 w-8" />;
  }
  
  // Boxing/Martial arts (purple)
  if (text.includes('boxing') || text.includes('martial') || text.includes('бокс') || text.includes('единоборства')) {
    return <Zap className="h-8 w-8" />;
  }
  
  // Sleep activities (purple moon)
  if (text.includes('slept') || text.includes('sleep') || text.includes('сон') || text.includes('спал')) {
    return <Moon className="h-8 w-8" />;
  }
  
  // General workouts/training (activity line trending up)
  if (text.includes('workout') || text.includes('training') || text.includes('тренировку') || text.includes('strain') || text.includes('завершил')) {
    return <TrendingUp className="h-8 w-8" />;
  }
  
  // Recovery activities  
  if (text.includes('recovered') || text.includes('recovery') || text.includes('восстановление')) {
    return <Heart className="h-8 w-8" />;
  }
  
  // Default fallback icon (standard activity icon)
  return <Activity className="h-8 w-8" />;
};

const parseActivityMetrics = (actionText: string) => {
  const parts: string[] = [];
  const text = actionText.toLowerCase();
  const isRu = /[а-яё]/i.test(actionText);

  // Duration variants (EN)
  const durHMM = actionText.match(/(\d+)h\s*(\d+)m/i); // 1h 23m
  const durMS = actionText.match(/(\d+)m\s*(\d+)s/i);  // 15m 36s
  const durM = actionText.match(/(?:^|\s)(\d+)m(?:\s|$)/i); // 75m

  // Duration variants (RU)
  const durHMMru = actionText.match(/(\d+)\s*ч\s*(\d+)\s*м/i);
  const durMru = actionText.match(/(?:^|\s)(\d+)\s*м(?:\s|$)/i);

  if (durHMM) parts.push(`${durHMM[1]}h ${durHMM[2]}m`);
  else if (durMS) parts.push(`${durMS[1]}m ${durMS[2]}s`);
  else if (durM) parts.push(`${durM[1]}m`);
  else if (durHMMru) parts.push(`${durHMMru[1]}ч ${durHMMru[2]}м`);
  else if (durMru) parts.push(`${durMru[1]}м`);

  // Calories (EN + RU)
  const caloriesMatch = actionText.match(/(\d+)\s*(?:kcal|ккал)/i);
  if (caloriesMatch) parts.push(`${caloriesMatch[1]}${isRu ? ' ккал' : 'kcal'}`.trim());

  // Strain (support colon and RU label)
  const strainEn = actionText.match(/strain[:\s]*([\d.,]+)/i);
  const strainBeforeEn = actionText.match(/([\d.,]+)\s*strain/i);
  const strainRu = actionText.match(/нагрузка[:\s]*([\d.,]+)/i);
  const strainVal = (strainEn?.[1] ?? strainBeforeEn?.[1] ?? strainRu?.[1])?.replace(',', '.');
  if (strainVal) parts.push(isRu ? `Нагрузка ${strainVal}` : `Strain ${strainVal}`);

  // Recovery (support both orders + RU)
  const recoveryAfter = actionText.match(/recovery[:\s]*(\d+)%/i);
  const recoveryBefore = actionText.match(/(\d+)%\s*recovery/i);
  const recovered = actionText.match(/recovered\s*(\d+)%/i);
  const recoveryRu = actionText.match(/восстановлени[ея][:\s]*(\d+)%/i);
  const recoveryVal = recoveryAfter?.[1] ?? recoveryBefore?.[1] ?? recovered?.[1] ?? recoveryRu?.[1];
  if (recoveryVal) parts.push(isRu ? `Восстановление ${recoveryVal}%` : `Recovery ${recoveryVal}%`);

  // Sleep duration (EN + RU)
  const sleptHM = actionText.match(/slept\s*(\d+)h\s*(\d+)m/i);
  const sleptH = actionText.match(/slept\s*([\d.]+)h/i);
  const sleptHMru = actionText.match(/спал(?:а)?\s*(\d+)\s*ч\s*(\d+)\s*м/i);
  const sleptHru = actionText.match(/спал(?:а)?\s*([\d.,]+)\s*ч/i);
  if (sleptHM) parts.push(`${sleptHM[1]}h ${sleptHM[2]}m`);
  else if (sleptH) parts.push(`${sleptH[1]}h`);
  else if (sleptHMru) parts.push(`${sleptHMru[1]}ч ${sleptHMru[2]}м`);
  else if (sleptHru) parts.push(`${sleptHru[1]}ч`);

  // Quality (English and Russian labels)
  const qualityEn = actionText.match(/quality[:\s]*?(\d+)%/i);
  const qualityRu = actionText.match(/качество[:\s]*?(\d+)%/i);
  if (qualityEn?.[1]) parts.push(`${qualityEn[1]}% quality`);
  else if (qualityRu?.[1]) parts.push(`качество ${qualityRu[1]}%`);

  // Prefer metrics-only output; never show raw source text like "ST ... [Whoop]"
  if (parts.length > 0) return parts.join(', ');

  // Fallback by category
  if (/(sleep|slept|сон|спал)/i.test(text)) return isRu ? 'сон' : 'sleep';
  if (/(workout|training|тренировк|strain)/i.test(text)) return isRu ? 'тренировка' : 'workout';

  return isRu ? 'активность' : 'activity';
};

export function ActivityCard({ activity }: ActivityCardProps) {
  const metrics = parseActivityMetrics(activity.action_text);
  const icon = getActivityIcon(activity.action_text);
  
  return (
    <div className="relative rounded-3xl p-[2px] bg-gradient-to-r from-primary via-primary to-success overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <div className="relative rounded-3xl bg-card/90 backdrop-blur-sm p-6 h-full">
        <div className="flex items-center gap-4">
          <div className="text-primary shrink-0">
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-foreground leading-tight">
              {metrics}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}