import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

interface AIInsightCardProps {
  recoveryScore: number;
  message: string;
}

export function AIInsightCard({ recoveryScore, message }: AIInsightCardProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
        Interactive Plan-Fact
      </h2>
      <Card className="bg-neutral-900 border-2 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BrainCircuit className="w-5 h-5 text-green-400" />
            AI Инсайт
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-400">{recoveryScore}%</span>
              <span className="text-sm text-muted-foreground">восстановление</span>
            </div>
            <p className="text-sm text-foreground/80">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
