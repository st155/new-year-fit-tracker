import { memo } from 'react';
import { useMetricsView } from '@/contexts/MetricsViewContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export const MetricsViewToggle = memo(function MetricsViewToggle() {
  const { viewMode, setViewMode, deviceFilter, setDeviceFilter } = useMetricsView();
  const { t } = useTranslation();

  const devices = [
    { id: 'all' as const, label: 'All Devices', icon: '🔗', color: 'from-primary to-accent' },
    { id: 'whoop' as const, label: 'Whoop', icon: '🔵', color: 'from-blue-500 to-blue-600' },
    { id: 'withings' as const, label: 'Withings', icon: '🟢', color: 'from-green-500 to-green-600' },
    { id: 'garmin' as const, label: 'Garmin', icon: '🟡', color: 'from-yellow-500 to-yellow-600' },
    { id: 'ultrahuman' as const, label: 'Ultrahuman', icon: '🟣', color: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="space-y-4">
      {/* Режим просмотра */}
      <div className="flex items-center justify-center gap-2 p-1 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50">
        <Button
          variant={viewMode === 'unified' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('unified')}
          className={cn(
            'flex-1 transition-all duration-300',
            viewMode === 'unified' && 'shadow-glow'
          )}
        >
          <span className="mr-2">🔗</span>
          Unified
        </Button>
        <Button
          variant={viewMode === 'by_device' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('by_device')}
          className={cn(
            'flex-1 transition-all duration-300',
            viewMode === 'by_device' && 'shadow-glow'
          )}
        >
          <span className="mr-2">📱</span>
          By Device
        </Button>
      </div>

      {/* Фильтр по девайсам (показываем только в режиме by_device) */}
      {viewMode === 'by_device' && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {devices.map((device) => (
            <Button
              key={device.id}
              variant={deviceFilter === device.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDeviceFilter(device.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap transition-all duration-300 hover:scale-105',
                deviceFilter === device.id && 'shadow-glow'
              )}
            >
              <span className="text-lg">{device.icon}</span>
              <span className="text-xs font-medium">{device.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Информационный badge */}
      {viewMode === 'unified' && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            <span className="mr-1">ℹ️</span>
            Showing aggregated data from all sources
          </Badge>
        </div>
      )}
      
      {viewMode === 'by_device' && deviceFilter !== 'all' && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            <span className="mr-1">📊</span>
            Showing data from {devices.find(d => d.id === deviceFilter)?.label}
          </Badge>
        </div>
      )}
    </div>
  );
});
