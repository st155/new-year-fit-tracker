import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, Zap } from 'lucide-react';

export function AIInsightsStrip() {
  // TODO: Connect to real data hooks
  const insights = [
    { icon: <TrendingUp className="h-3.5 w-3.5" />, value: '12', label: 'метрик' },
    { icon: <Sparkles className="h-3.5 w-3.5" />, value: '5', label: 'источников' },
    { icon: <Target className="h-3.5 w-3.5" />, value: '3', label: 'цели' },
    { icon: <Zap className="h-3.5 w-3.5" />, value: '8', label: 'привычек' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="flex gap-2 overflow-x-auto px-4 scrollbar-hide"
    >
      {insights.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + index * 0.05 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs whitespace-nowrap"
        >
          {item.icon}
          <span className="font-semibold">{item.value}</span>
          <span className="text-primary/70">{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
