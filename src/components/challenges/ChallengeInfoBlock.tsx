import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Trophy, Target, UserPlus, Info, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChallengeInfoBlockProps {
  challengeId: string;
  onJoinClick: () => void;
  isJoining: boolean;
}

const difficultyLevels = [
  { level: 0, label: "Бенчмарк", multiplier: "100%", description: "Базовый уровень - достигните установленных бенчмарков", color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  { level: 1, label: "Продвинутый", multiplier: "130%", description: "Увеличенные цели на 30%", color: "bg-green-500/20 text-green-700 dark:text-green-300" },
  { level: 2, label: "Эксперт", multiplier: "160%", description: "Увеличенные цели на 60%", color: "bg-orange-500/20 text-orange-700 dark:text-orange-300" },
  { level: 3, label: "Мастер", multiplier: "190%", description: "Увеличенные цели на 90%", color: "bg-red-500/20 text-red-700 dark:text-red-300" },
];

export function ChallengeInfoBlock({ challengeId, onJoinClick, isJoining }: ChallengeInfoBlockProps) {
  const { challenge, isLoading: challengeLoading } = useChallengeDetail(challengeId);

  const { data: disciplines = [], isLoading: disciplinesLoading } = useQuery({
    queryKey: ["challenge-disciplines", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_disciplines")
        .select("discipline_name, benchmark_value, unit")
        .eq("challenge_id", challengeId)
        .order("position");
      if (error) throw error;
      return data || [];
    },
    enabled: !!challengeId,
  });

  if (challengeLoading || disciplinesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Информация о челлендже не найдена</p>
        </CardContent>
      </Card>
    );
  }

  const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Hero Description */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">О челлендже</CardTitle>
              <CardDescription className="text-base">
                {challenge.description}
              </CardDescription>
            </div>
            <Info className="h-6 w-6 text-primary shrink-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Начало</p>
                <p className="font-semibold">
                  {formatDistanceToNow(new Date(challenge.start_date), { addSuffix: true, locale: enUS })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Осталось</p>
                <p className="font-semibold">
                  {daysLeft > 0 ? `${daysLeft} дней` : "Завершен"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Дисциплин</p>
                <p className="font-semibold">{disciplines.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disciplines */}
      {disciplines.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Дисциплины
            </CardTitle>
            <CardDescription>
              Направления развития в этом челлендже
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disciplines.map((discipline, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{discipline.discipline_name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {discipline.benchmark_value}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {discipline.unit}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Бенчмарк
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Difficulty Levels */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Уровни сложности
          </CardTitle>
          <CardDescription>
            Выберите уровень сложности при присоединении
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {difficultyLevels.map((difficulty) => (
              <div
                key={difficulty.level}
                className="p-4 rounded-xl border bg-card"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold">{difficulty.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {difficulty.description}
                    </p>
                  </div>
                  <Badge className={difficulty.color}>
                    {difficulty.multiplier}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="glass-card border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">Готовы принять вызов?</h3>
              <p className="text-muted-foreground">
                Присоединяйтесь к челленджу и начните отслеживать свой прогресс
              </p>
            </div>
            <Button
              onClick={onJoinClick}
              disabled={isJoining}
              size="lg"
              className="bg-gradient-primary text-white hover:opacity-90 shadow-glow-primary"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isJoining ? "Присоединение..." : "Участвовать в челлендже"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
