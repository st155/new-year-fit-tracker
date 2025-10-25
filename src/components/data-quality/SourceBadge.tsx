/**
 * Phase 6: Source Badge Component
 * Визуализация источника данных
 */

import { Badge } from '@/components/ui/badge';
import { DataSource } from '@/lib/data-quality';

const SOURCE_INFO: Record<string, { label: string; icon: string; className: string }> = {
  [DataSource.INBODY]: { 
    label: 'InBody', 
    icon: '🏋️', 
    className: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500'
  },
  [DataSource.WITHINGS]: { 
    label: 'Withings', 
    icon: '⚖️', 
    className: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500'
  },
  [DataSource.WHOOP]: { 
    label: 'Whoop', 
    icon: '⌚', 
    className: 'bg-red-500 hover:bg-red-600 text-white border-red-500'
  },
  [DataSource.APPLE_HEALTH]: { 
    label: 'Apple Health', 
    icon: '🍎', 
    className: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500'
  },
  [DataSource.MANUAL]: { 
    label: 'Manual', 
    icon: '✍️', 
    className: 'bg-green-500 hover:bg-green-600 text-white border-green-500'
  },
  [DataSource.GARMIN]: { 
    label: 'Garmin', 
    icon: '🏃', 
    className: 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
  },
  [DataSource.ULTRAHUMAN]: { 
    label: 'Ultrahuman', 
    icon: '💪', 
    className: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500'
  },
  [DataSource.TERRA]: { 
    label: 'Terra', 
    icon: '🌍', 
    className: 'bg-teal-500 hover:bg-teal-600 text-white border-teal-500'
  },
  'aggregated': {
    label: 'Combined',
    icon: '🔄',
    className: 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500'
  },
};

interface SourceBadgeProps {
  source: string;
  showIcon?: boolean;
}

export function SourceBadge({ source, showIcon = true }: SourceBadgeProps) {
  const info = SOURCE_INFO[source] || {
    label: source,
    icon: '❓',
    className: 'bg-gray-400 hover:bg-gray-500 text-white border-gray-400',
  };
  
  return (
    <Badge className={info.className}>
      {showIcon && <span className="mr-1">{info.icon}</span>}
      {info.label}
    </Badge>
  );
}
