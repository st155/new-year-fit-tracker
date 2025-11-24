import { useAuth } from '@/hooks/useAuth';
import { useActiveProtocols } from '@/hooks/biostack/useActiveProtocols';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Pill, Calendar, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const SourceBadge = ({ source }: { source: string }) => {
  const badges = {
    doctor_rx: { icon: '💊', label: 'Rx', color: 'text-success border-success/30 bg-success/5' },
    ai_suggestion: { icon: '🤖', label: 'AI', color: 'text-primary border-primary/30 bg-primary/5' },
    manual: { icon: '👤', label: 'Manual', color: 'text-accent border-accent/30 bg-accent/5' },
  };

  const badge = badges[source as keyof typeof badges] || badges.manual;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', badge.color)}>
      <span>{badge.icon}</span>
      <span>{badge.label}</span>
    </span>
  );
};

const ProgressBar = ({ percent }: { percent: number }) => {
  const getColorClass = () => {
    if (percent <= 60) return 'from-success to-success/80';
    if (percent <= 85) return 'from-warning to-warning/80';
    return 'from-destructive to-destructive/80';
  };

  const getGlowClass = () => {
    if (percent <= 60) return 'border-success/30 bg-success/5';
    if (percent <= 85) return 'border-warning/30 bg-warning/5';
    return 'border-destructive/30 bg-destructive/5';
  };

  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full border', getGlowClass())}>
      <div
        className={cn('h-full bg-gradient-to-r transition-all duration-500', getColorClass())}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

const ProtocolCard = ({ protocol }: { protocol: any }) => {
  const getCardGlow = () => {
    if (protocol.progressPercent <= 60) return 'border-success/30 shadow-glow-success';
    if (protocol.progressPercent <= 85) return 'border-warning/30 shadow-[0_0_20px_rgba(234,179,8,0.2)]';
    return 'border-destructive/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]';
  };

  return (
    <div className={cn('p-4 rounded-lg border backdrop-blur transition-all', getCardGlow())}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Pill className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">
                {protocol.supplement_products?.name || protocol.stack_name}
              </h4>
              {protocol.supplement_products?.brand && (
                <p className="text-xs text-muted-foreground truncate">
                  {protocol.supplement_products.brand}
                </p>
              )}
            </div>
            <SourceBadge source={protocol.source} />
          </div>

          <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2">
              <ProgressBar percent={protocol.progressPercent} />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {Math.round(protocol.progressPercent)}% • {protocol.daysRemaining} days left
              </span>
            </div>

            {protocol.target_outcome && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{protocol.target_outcome}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Ends {new Date(protocol.planned_end_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-4 rounded-lg border border-border/50">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ActiveProtocolsWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: protocols, isLoading } = useActiveProtocols(user?.id);

  const handleViewAll = () => {
    navigate('/biostack/supplements?tab=protocols');
  };

  const handleStartProtocol = () => {
    navigate('/biostack/supplements');
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">⏱️ Active Protocols</h3>
                <p className="text-xs text-muted-foreground">Time-bound supplement programs</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/20 shadow-glow-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">⏱️ Active Protocols</h3>
              <p className="text-xs text-muted-foreground">Time-bound supplement programs</p>
            </div>
          </div>
          {protocols && protocols.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleViewAll}
              className="text-primary hover:text-primary hover:bg-primary/10"
            >
              <span className="text-xs">View All</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!protocols || protocols.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
              <Pill className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-3">No active time-bound protocols</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStartProtocol}
                className="border-primary/30 hover:bg-primary/10"
              >
                Start a Protocol
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {protocols.map((protocol) => (
              <ProtocolCard key={protocol.id} protocol={protocol} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
