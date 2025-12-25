import { motion } from "framer-motion";
import { Trophy, Calendar, Users, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { getRankDisplay } from "@/lib/challenge-scoring-v3";
import type { ChallengeReport } from "@/hooks/useChallengeReport";

interface ReportHeaderProps {
  report: ChallengeReport;
}

export function ReportHeader({ report }: ReportHeaderProps) {
  const rankDisplay = getRankDisplay(report.finalRank);
  const isTopThree = report.finalRank <= 3;

  const getRankGradient = (rank: number) => {
    if (rank === 1) return "from-yellow-400 via-yellow-500 to-yellow-600";
    if (rank === 2) return "from-slate-300 via-slate-400 to-slate-500";
    if (rank === 3) return "from-orange-400 via-orange-500 to-orange-600";
    return "from-primary/80 to-primary";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border p-6 md:p-8"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary to-secondary rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary to-primary rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Challenge Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Итоги челленджа
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{report.title}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(report.startDate), "d MMM", { locale: ru })} — {format(new Date(report.endDate), "d MMM yyyy", { locale: ru })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{report.totalParticipants} участников</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarImage src={report.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                {report.fullName?.charAt(0) || report.username?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            {isTopThree && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="absolute -bottom-2 -right-2"
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRankGradient(report.finalRank)} flex items-center justify-center text-xl shadow-lg`}>
                  {rankDisplay}
                </div>
              </motion.div>
            )}
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{report.fullName || report.username}</h2>
            {!isTopThree && (
              <Badge variant="outline" className="text-muted-foreground">
                <Medal className="h-3 w-3 mr-1" />
                {report.finalRank} место
              </Badge>
            )}
          </div>
        </div>

        {/* Points Display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className={`inline-flex flex-col items-center gap-1 px-8 py-4 rounded-2xl bg-gradient-to-br ${getRankGradient(report.finalRank)} shadow-lg`}>
            <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
              Итоговый счёт
            </span>
            <span className="text-4xl md:text-5xl font-black text-white">
              {report.totalPoints.toLocaleString()}
            </span>
            <span className="text-sm text-white/70">очков</span>
          </div>
        </motion.div>

        {/* Points Breakdown Mini */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-primary">{report.performancePoints}</div>
            <div className="text-xs text-muted-foreground">Активность</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-secondary">{report.recoveryPoints}</div>
            <div className="text-xs text-muted-foreground">Восстановление</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-lg font-bold text-accent-foreground">{report.synergyPoints}</div>
            <div className="text-xs text-muted-foreground">Синергия</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
