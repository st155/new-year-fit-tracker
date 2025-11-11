import { Card } from "@tremor/react";
import { Trophy, Calendar } from "lucide-react";

interface LogEntry {
  date: string;
  workout: string;
  hasPR: boolean;
  prDetails?: string;
}

interface LogbookSnippetCardProps {
  entries: LogEntry[];
}

export function LogbookSnippetCard({ entries }: LogbookSnippetCardProps) {
  return (
    <Card className="bg-neutral-900 border border-neutral-800">
      <h3 className="text-lg font-semibold mb-4">Журнал (Ключевые моменты)</h3>
      
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <div key={idx} className="border-l-2 border-neutral-700 pl-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-3 h-3" />
              {entry.date}
            </div>
            <div className="font-medium text-foreground">{entry.workout}</div>
            
            {entry.hasPR && entry.prDetails && (
              <div className="mt-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-500 font-medium">
                  PR: {entry.prDetails}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
