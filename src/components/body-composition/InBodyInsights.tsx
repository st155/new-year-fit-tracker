import { Lightbulb, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InBodyInsightsProps {
  bmi: number | null;
  bodyFatPercent: number | null;
  visceralFat: number | null;
  bmr: number | null;
  rightArmPercent: number | null;
  leftArmPercent: number | null;
  onCreateGoal?: () => void;
}

export function InBodyInsights({
  bmi,
  bodyFatPercent,
  visceralFat,
  bmr,
  rightArmPercent,
  leftArmPercent,
  onCreateGoal,
}: InBodyInsightsProps) {
  const insights: { icon: React.ReactNode; text: string; type: 'info' | 'success' | 'warning' }[] = [];

  // BMR insight
  if (bmr) {
    const estimatedMaintenance = Math.round(bmr * 1.2);
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: `При вашем BMR ${bmr} ккал, для поддержания веса нужно ~${estimatedMaintenance} ккал в день`,
      type: 'info',
    });
  }

  // Arm development insight
  if (rightArmPercent && leftArmPercent) {
    const avgArm = (rightArmPercent + leftArmPercent) / 2;
    if (avgArm > 110) {
      insights.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: `Мышечная масса рук ${avgArm.toFixed(1)}% от нормы - отличные результаты для силовых тренировок!`,
        type: 'success',
      });
    }
  }

  // Visceral fat insight
  if (visceralFat) {
    if (visceralFat < 100) {
      insights.push({
        icon: <Target className="h-4 w-4" />,
        text: `Уровень висцерального жира ${visceralFat.toFixed(1)} см² - в здоровом диапазоне!`,
        type: 'success',
      });
    } else if (visceralFat >= 150) {
      insights.push({
        icon: <Target className="h-4 w-4" />,
        text: `Висцеральный жир ${visceralFat.toFixed(1)} см² - рекомендуется уделить внимание кардио и питанию`,
        type: 'warning',
      });
    }
  }

  // Body fat insight
  if (bodyFatPercent) {
    if (bodyFatPercent <= 13) {
      insights.push({
        icon: <TrendingUp className="h-4 w-4" />,
        text: `Процент жира ${bodyFatPercent.toFixed(1)}% - отличный показатель для атлетического телосложения`,
        type: 'success',
      });
    }
  }

  if (insights.length === 0) {
    return null;
  }

  const getCardClass = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border-yellow-500/20';
      default:
        return 'bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold metric-glow">ЗНАЕТЕ ЛИ ВЫ?</h2>
        {onCreateGoal && (
          <Button variant="outline" size="sm" onClick={onCreateGoal}>
            Установить цель
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((insight, idx) => (
          <Card key={idx} className={`p-4 ${getCardClass(insight.type)}`}>
            <div className="flex gap-3">
              <div className="mt-0.5">{insight.icon}</div>
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
