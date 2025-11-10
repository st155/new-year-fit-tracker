export function BackgroundWaves() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Cyan waves - top left */}
      <svg
        className="absolute -top-40 -left-40 w-[600px] h-[600px] opacity-20"
        viewBox="0 0 600 600"
      >
        <defs>
          <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M 0 150 Q 150 100 300 150 T 600 150"
          stroke="url(#cyanGradient)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0 200 Q 150 150 300 200 T 600 200"
          stroke="url(#cyanGradient)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0 250 Q 150 200 300 250 T 600 250"
          stroke="url(#cyanGradient)"
          strokeWidth="2"
          fill="none"
        />
      </svg>

      {/* Pink waves - bottom right */}
      <svg
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] opacity-20"
        viewBox="0 0 600 600"
      >
        <defs>
          <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <path
          d="M 0 350 Q 150 400 300 350 T 600 350"
          stroke="url(#pinkGradient)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0 400 Q 150 450 300 400 T 600 400"
          stroke="url(#pinkGradient)"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M 0 450 Q 150 500 300 450 T 600 450"
          stroke="url(#pinkGradient)"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
}
