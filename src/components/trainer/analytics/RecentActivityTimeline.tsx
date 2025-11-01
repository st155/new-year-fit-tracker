import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  TrendingDown 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface TimelineEvent {
  id: string;
  type: 'measurement' | 'goal' | 'alert' | 'sync' | 'conflict';
  title: string;
  description: string;
  client_name: string;
  client_id: string;
  created_at: string;
  metadata?: any;
}

const EVENT_ICONS: Record<TimelineEvent['type'], any> = {
  measurement: Activity,
  goal: Target,
  alert: TrendingDown,
  sync: RefreshCw,
  conflict: AlertTriangle,
};

const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  measurement: 'bg-blue-500/10 text-blue-500',
  goal: 'bg-green-500/10 text-green-500',
  alert: 'bg-red-500/10 text-red-500',
  sync: 'bg-purple-500/10 text-purple-500',
  conflict: 'bg-yellow-500/10 text-yellow-500',
};

export function RecentActivityTimeline() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<TimelineEvent['type'] | 'all'>('all');
  const [limit, setLimit] = useState(20);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['trainer-activity-timeline', user?.id, filter, limit],
    queryFn: async () => {
      // Fetch recent notifications and activities
      const { data: notifications, error } = await supabase
        .from('user_notifications')
        .select(`
          id,
          type,
          title,
          message,
          metadata,
          created_at
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform to timeline events
      const timelineEvents: TimelineEvent[] = notifications.map(n => {
        const meta = n.metadata as any;
        return {
          id: n.id,
          type: n.type.includes('alert') ? 'alert' : 
                n.type.includes('goal') ? 'goal' :
                n.type.includes('conflict') ? 'conflict' :
                n.type.includes('sync') ? 'sync' : 'measurement',
          title: n.title,
          description: n.message,
          client_name: meta?.client_name || 'Unknown Client',
          client_id: meta?.client_id || '',
          created_at: n.created_at,
          metadata: n.metadata,
        };
      });

      return filter === 'all' 
        ? timelineEvents 
        : timelineEvents.filter(e => e.type === filter);
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const filterOptions: Array<{ value: TimelineEvent['type'] | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'measurement', label: 'Measurements' },
    { value: 'goal', label: 'Goals' },
    { value: 'alert', label: 'Alerts' },
    { value: 'sync', label: 'Syncs' },
    { value: 'conflict', label: 'Conflicts' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <div className="flex gap-2">
            {filterOptions.map(option => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              {/* Timeline events */}
              <div className="space-y-4">
                {events.map((event, index) => {
                  const Icon = EVENT_ICONS[event.type];
                  return (
                    <div key={event.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${EVENT_COLORS[event.type]}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {event.client_name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {events.length >= limit && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLimit(prev => prev + 20)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
