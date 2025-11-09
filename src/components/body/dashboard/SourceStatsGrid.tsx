import { Card, CardContent } from '@/components/ui/card';
import { Scale, Activity, Watch, Moon, Zap, Edit3 } from 'lucide-react';
import { SourceStats } from '@/hooks/composite/data/useMultiSourceBodyData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SourceStatsGridProps {
  stats: Record<string, SourceStats>;
}

const SOURCE_CONFIG = {
  withings: {
    icon: Scale,
    label: 'Withings',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  inbody: {
    icon: Activity,
    label: 'InBody',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  garmin: {
    icon: Watch,
    label: 'GARMIN',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
  },
  oura: {
    icon: Moon,
    label: 'OURA',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  whoop: {
    icon: Zap,
    label: 'WHOOP',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-500/10',
  },
  manual: {
    icon: Edit3,
    label: 'Manual',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
};

export function SourceStatsGrid({ stats }: SourceStatsGridProps) {
  const sources = Object.keys(SOURCE_CONFIG);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {sources.map((sourceKey) => {
        const config = SOURCE_CONFIG[sourceKey as keyof typeof SOURCE_CONFIG];
        const stat = stats[sourceKey];
        const Icon = config.icon;

        if (!stat) {
          return (
            <Card key={sourceKey} className="opacity-50">
              <CardContent className="pt-6 text-center">
                <div className={cn('inline-flex p-3 rounded-lg mb-3', config.bgColor)}>
                  <Icon className={cn('h-6 w-6', config.color)} />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">No data</div>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={sourceKey}>
            <CardContent className="pt-6 text-center">
              <div className={cn('inline-flex p-3 rounded-lg mb-3', config.bgColor)}>
                <Icon className={cn('h-6 w-6', config.color)} />
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-sm">{config.label}</div>
                <div className="text-2xl font-bold">{stat.count}</div>
                <div className="text-xs text-muted-foreground">
                  {stat.count === 1 ? 'reading' : 'readings'}
                </div>
                {stat.lastSync && (
                  <div className="text-xs text-muted-foreground">
                    Last: {format(new Date(stat.lastSync), 'MMM dd')}
                  </div>
                )}
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-1">Coverage</div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={cn('h-full', config.bgColor)}
                      style={{ width: `${stat.coverage}%` }}
                    />
                  </div>
                  <div className="text-xs font-semibold mt-1">{stat.coverage}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
