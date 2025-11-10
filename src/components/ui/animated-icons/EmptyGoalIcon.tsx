import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

export function EmptyGoalIcon() {
  return (
    <motion.div
      animate={{ 
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="relative"
    >
      <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20">
        <Target className="h-12 w-12 text-blue-500" />
      </div>
      
      {/* Pulse rings */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-blue-500/30"
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.5, 0, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
}
