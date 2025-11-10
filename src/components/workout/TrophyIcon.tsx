import { motion } from 'framer-motion';

export function TrophyIcon() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        bounce: 0.5, 
        duration: 0.8,
        delay: 0.3 
      }}
      className="relative w-48 h-48 md:w-64 md:h-64"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </linearGradient>
          <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <filter id="trophyGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Left laurel wreath */}
        <path
          d="M 60 80 Q 50 70 45 60 Q 40 50 42 40 Q 44 35 48 38 Q 50 50 55 60 Q 58 68 62 75"
          stroke="url(#greenGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 55 85 Q 45 78 40 68 Q 35 58 36 48 Q 38 42 42 45 Q 44 55 48 65 Q 52 74 58 82"
          stroke="url(#greenGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Right laurel wreath */}
        <path
          d="M 140 80 Q 150 70 155 60 Q 160 50 158 40 Q 156 35 152 38 Q 150 50 145 60 Q 142 68 138 75"
          stroke="url(#greenGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 145 85 Q 155 78 160 68 Q 165 58 164 48 Q 162 42 158 45 Q 156 55 152 65 Q 148 74 142 82"
          stroke="url(#greenGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Trophy cup body */}
        <path
          d="M 70 60 L 65 100 Q 65 110 75 115 L 75 130 Q 75 135 80 135 L 120 135 Q 125 135 125 130 L 125 115 Q 135 110 135 100 L 130 60 Z"
          fill="url(#goldGradient)"
          stroke="#FFA500"
          strokeWidth="2"
          filter="url(#trophyGlow)"
        />

        {/* Trophy handles */}
        <path
          d="M 70 70 Q 55 70 50 80 Q 50 85 55 85 Q 60 85 65 80"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 130 70 Q 145 70 150 80 Q 150 85 145 85 Q 140 85 135 80"
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Trophy base */}
        <rect
          x="70"
          y="135"
          width="60"
          height="8"
          rx="2"
          fill="url(#goldGradient)"
          stroke="#FFA500"
          strokeWidth="1"
        />
        <rect
          x="65"
          y="143"
          width="70"
          height="10"
          rx="3"
          fill="url(#goldGradient)"
          stroke="#FFA500"
          strokeWidth="1"
        />

        {/* Decorative shine on cup */}
        <ellipse
          cx="85"
          cy="80"
          rx="8"
          ry="12"
          fill="rgba(255, 255, 255, 0.3)"
        />
      </svg>

      {/* Pulsing background glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent 70%)'
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
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
