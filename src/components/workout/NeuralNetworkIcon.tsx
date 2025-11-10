import { motion } from 'framer-motion';

export function NeuralNetworkIcon() {
  return (
    <motion.div
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "linear"
      }}
      className="relative w-48 h-48 md:w-64 md:h-64"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))' }}
      >
        <defs>
          <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer hexagon */}
        <path
          d="M 100 20 L 150 50 L 150 110 L 100 140 L 50 110 L 50 50 Z"
          stroke="url(#neuralGradient)"
          strokeWidth="2"
          fill="none"
          filter="url(#glow)"
        />

        {/* Inner hexagon */}
        <path
          d="M 100 50 L 130 70 L 130 100 L 100 120 L 70 100 L 70 70 Z"
          stroke="url(#neuralGradient)"
          strokeWidth="2"
          fill="none"
          filter="url(#glow)"
        />

        {/* Connecting lines */}
        <line x1="100" y1="20" x2="100" y2="50" stroke="url(#neuralGradient)" strokeWidth="1.5" />
        <line x1="150" y1="50" x2="130" y2="70" stroke="url(#neuralGradient)" strokeWidth="1.5" />
        <line x1="150" y1="110" x2="130" y2="100" stroke="url(#neuralGradient)" strokeWidth="1.5" />
        <line x1="100" y1="140" x2="100" y2="120" stroke="url(#neuralGradient)" strokeWidth="1.5" />
        <line x1="50" y1="110" x2="70" y2="100" stroke="url(#neuralGradient)" strokeWidth="1.5" />
        <line x1="50" y1="50" x2="70" y2="70" stroke="url(#neuralGradient)" strokeWidth="1.5" />

        {/* Vertex dots with animation */}
        {[
          { cx: 100, cy: 20 },
          { cx: 150, cy: 50 },
          { cx: 150, cy: 110 },
          { cx: 100, cy: 140 },
          { cx: 50, cy: 110 },
          { cx: 50, cy: 50 },
          { cx: 100, cy: 80 }
        ].map((point, i) => (
          <motion.circle
            key={i}
            cx={point.cx}
            cy={point.cy}
            r="4"
            fill="#06b6d4"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2
            }}
            style={{ filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))' }}
          />
        ))}
      </svg>

      {/* Pulsing background glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}
