import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, CheckCircle, XCircle } from 'lucide-react';
import type { NamespaceStats } from '../types';

interface StatsSummaryProps {
  namespaceStats: NamespaceStats[];
}

export function StatsSummary({ namespaceStats }: StatsSummaryProps) {
  const sortedStats = [...namespaceStats].sort((a, b) => b.syncIssues - a.syncIssues);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Статистика по namespaces
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {sortedStats.map(ns => {
            const maxKeys = Math.max(ns.ruKeys, ns.enKeys);
            const ruPercent = maxKeys > 0 ? (ns.ruKeys / maxKeys) * 100 : 0;
            const enPercent = maxKeys > 0 ? (ns.enKeys / maxKeys) * 100 : 0;
            const isSynced = ns.syncIssues === 0;
            
            return (
              <div key={ns.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="w-32 font-medium text-sm text-foreground truncate">
                  {ns.name}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground">RU</span>
                    <Progress value={ruPercent} className="h-1.5 flex-1" />
                    <span className="w-8 text-muted-foreground">{ns.ruKeys}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground">EN</span>
                    <Progress value={enPercent} className="h-1.5 flex-1" />
                    <span className="w-8 text-muted-foreground">{ns.enKeys}</span>
                  </div>
                </div>
                
                {isSynced ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Badge variant="destructive" className="shrink-0">
                    <XCircle className="h-3 w-3 mr-1" />
                    {ns.syncIssues}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
