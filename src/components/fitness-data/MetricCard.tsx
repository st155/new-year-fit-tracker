import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  name: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color: string;
  source?: string;
  isStale?: boolean;
  sparkline?: { value: number }[];
  subtitle?: string;
}

export function MetricCard({
  name,
  value,
  unit,
  icon: Icon,
  color,
  source,
  isStale,
  sparkline,
  subtitle,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            {source && (
              <Badge variant="outline" className="text-xs">
                {source}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{name}</div>
            <div className="flex items-baseline gap-1">
              <motion.span
                className="text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {value}
              </motion.span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>

          {/* Sparkline */}
          {sparkline && sparkline.length > 0 && (
            <div className="mt-3 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stale indicator */}
          {isStale && (
            <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
              Устаревшие
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
