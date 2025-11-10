import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export function EmptyHabitIcon() {
  return (
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="relative"
    >
      <div className="p-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 ring-2 ring-green-500/30 shadow-lg shadow-green-500/20">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <CheckCircle className="h-12 w-12 text-green-500" />
        </motion.div>
      </div>
      
      {/* Sparkle effect */}
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}
