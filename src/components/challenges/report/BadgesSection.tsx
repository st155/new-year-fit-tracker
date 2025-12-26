import { motion } from "framer-motion";
import { Award, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricsBadge } from "@/features/challenges/types";

interface BadgesSectionProps {
  badges: MetricsBadge[];
  streakDays: number;
}

export function BadgesSection({ badges, streakDays }: BadgesSectionProps) {
  if (badges.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Достижения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Нет полученных достижений</p>
              <p className="text-sm mt-1">Продолжайте участвовать в челленджах!</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Достижения
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({badges.length} получено)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.4 + index * 0.1,
                  type: "spring",
                  stiffness: 200
                }}
                className="relative group"
              >
                <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 text-center transition-all hover:scale-105 hover:border-primary/50">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-medium text-sm">{badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {badge.description}
                  </div>
                </div>
                
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
              </motion.div>
            ))}
          </div>

          {/* Streak highlight */}
          {streakDays > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">🔥</span>
                <span className="font-bold text-xl">{streakDays} дней подряд</span>
              </div>
              <p className="text-sm text-muted-foreground">Максимальная серия активности</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
