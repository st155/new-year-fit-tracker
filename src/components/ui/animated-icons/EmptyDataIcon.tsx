import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export function EmptyDataIcon() {
  return (
    <motion.div
      animate={{ 
        y: [0, -8, 0],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="relative"
    >
      <div className="p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/20">
        <TrendingUp className="h-12 w-12 text-orange-500" />
      </div>
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }}
        animate={{
          x: [-100, 100]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </motion.div>
  );
}
