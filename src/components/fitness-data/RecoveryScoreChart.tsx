import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface RecoveryScoreChartProps {
  score: number;
  trend?: number;
  history?: { value: number; date: string }[];
}

export function RecoveryScoreChart({ score, trend = 0, history = [] }: RecoveryScoreChartProps) {
  const getColor = (value: number) => {
    if (value >= 70) return 'from-green-400 to-emerald-500';
    if (value >= 40) return 'from-yellow-400 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getTextColor = (value: number) => {
    if (value >= 70) return 'text-green-500';
    if (value >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Circular Progress */}
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <motion.circle
                cx="96"
                cy="96"
                r={radius}
                stroke="url(#gradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={`${getColor(score).split(' ')[0].replace('from-', 'text-')}`} stopOpacity="1" />
                  <stop offset="100%" className={`${getColor(score).split(' ')[1].replace('to-', 'text-')}`} stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-center"
              >
                <div className={`text-5xl font-bold ${getTextColor(score)}`}>
                  {Math.round(score)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Recovery Score</div>
              </motion.div>
            </div>
          </div>

          {/* Trend indicator */}
          {trend !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`flex items-center gap-1 text-sm ${
                trend > 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(trend)}% vs. предыдущий период</span>
            </motion.div>
          )}

          {/* Mini line chart */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="w-full h-16"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
