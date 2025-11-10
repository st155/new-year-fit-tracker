import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

interface WorkoutStats {
  duration: number;
  totalVolume: number;
  totalExercises: number;
  totalSets: number;
  estimatedCalories: number;
}

interface AIInsightCardProps {
  stats: WorkoutStats;
  feeling: number;
}

export function AIInsightCard({ stats, feeling }: AIInsightCardProps) {
  const generateInsight = () => {
    // Generate contextual AI insight based on stats and feeling
    if (feeling <= 2 && stats.totalVolume > 3000) {
      return "Отлично! Ты справился с большим объемом и чувствуешь себя хорошо. Я увеличу нагрузку на следующей тренировке. 💪";
    }
    
    if (feeling >= 4) {
      return "Тяжелая тренировка — это нормально! Твое тело адаптируется. Следующая сессия будет скорректирована для лучшего восстановления. 🌟";
    }
    
    if (stats.totalSets >= 20) {
      return "Внушительный объем работы! Эти данные помогут мне создать идеальную программу для твоего прогресса. 🎯";
    }
    
    if (stats.duration < 30) {
      return "Короткая, но эффективная тренировка! Качество важнее количества. Продолжай в том же духе! ⚡";
    }

    return "Отличная тренировка! Твоя последовательность поможет мне персонализировать следующий план. 🚀";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="relative bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 backdrop-blur-xl border border-purple-400/20 rounded-2xl p-6 overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-cyan-500/5 animate-pulse" />
      
      <div className="relative space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">AI Insight</h3>
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
        </div>
        
        <p className="text-foreground/90 leading-relaxed">
          {generateInsight()}
        </p>
      </div>
    </motion.div>
  );
}
