import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  suffix?: string;
}

export function StatCard({ icon: Icon, value, label, suffix = '' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.1, y: -5 }}
      viewport={{ once: true }}
      className="text-center relative group cursor-pointer"
    >
      <Icon className="h-10 w-10 mx-auto mb-3 text-primary group-hover:text-cyan-300 transition-colors" />
      <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-purple-500/20 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10" />
    </motion.div>
  );
}
