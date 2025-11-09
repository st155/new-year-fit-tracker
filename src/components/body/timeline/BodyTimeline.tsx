import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimelineEntry } from '@/hooks/composite/data/useMultiSourceBodyData';
import { format } from 'date-fns';
import { Search, Filter, Download, Scale, Activity, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BodyTimelineProps {
  timeline: TimelineEntry[];
}

const SOURCE_COLORS = {
  inbody: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  withings: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  garmin: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  oura: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  whoop: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  manual: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
};

const SOURCE_LABELS = {
  inbody: 'InBody Scan',
  withings: 'Withings Scale',
  garmin: 'GARMIN',
  oura: 'OURA Ring',
  whoop: 'WHOOP',
  manual: 'Manual Entry',
};

export function BodyTimeline({ timeline }: BodyTimelineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filteredTimeline = useMemo(() => {
    return timeline.filter((entry) => {
      // Source filter
      if (sourceFilter !== 'all' && entry.type !== sourceFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const dateStr = format(new Date(entry.date), 'MMM dd, yyyy').toLowerCase();
        const sourceStr = SOURCE_LABELS[entry.type].toLowerCase();
        return dateStr.includes(query) || sourceStr.includes(query);
      }

      return true;
    });
  }, [timeline, searchQuery, sourceFilter]);

  const exportToCSV = () => {
    const headers = ['Date', 'Source', 'Weight (kg)', 'Body Fat (%)', 'Muscle Mass (kg)'];
    const rows = filteredTimeline.map((entry) => [
      format(new Date(entry.date), 'yyyy-MM-dd'),
      entry.source,
      entry.weight?.toFixed(1) || '',
      entry.bodyFat?.toFixed(1) || '',
      entry.muscleMass?.toFixed(1) || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `body-timeline-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Timeline</h2>
        <p className="text-muted-foreground">
          Complete history of all body measurements from all sources
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date or source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="withings">Withings</SelectItem>
                <SelectItem value="inbody">InBody</SelectItem>
                <SelectItem value="garmin">GARMIN</SelectItem>
                <SelectItem value="oura">OURA</SelectItem>
                <SelectItem value="whoop">WHOOP</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredTimeline.length} of {timeline.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Timeline Entries */}
      <div className="space-y-4">
        {filteredTimeline.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No entries found matching your filters
            </CardContent>
          </Card>
        ) : (
          filteredTimeline.map((entry, idx) => {
            const isInBody = entry.type === 'inbody';
            const sourceColor = SOURCE_COLORS[entry.type];

            return (
              <Card key={`${entry.date}-${entry.source}-${idx}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className="relative">
                      <div
                        className={cn(
                          'w-3 h-3 rounded-full border-2 border-background',
                          isInBody ? 'bg-orange-500' : 'bg-primary'
                        )}
                      />
                      {idx < filteredTimeline.length - 1 && (
                        <div className="absolute left-1/2 top-3 w-0.5 h-full -translate-x-1/2 bg-border" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {format(new Date(entry.date), 'MMMM dd, yyyy')}
                          </div>
                          <Badge variant="outline" className={cn('text-xs', sourceColor)}>
                            {SOURCE_LABELS[entry.type]}
                          </Badge>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {entry.weight && (
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Weight</div>
                              <div className="font-semibold">{entry.weight.toFixed(1)} kg</div>
                            </div>
                          </div>
                        )}
                        {entry.bodyFat && (
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Body Fat</div>
                              <div className="font-semibold">{entry.bodyFat.toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                        {entry.muscleMass && (
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Muscle Mass</div>
                              <div className="font-semibold">{entry.muscleMass.toFixed(1)} kg</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
