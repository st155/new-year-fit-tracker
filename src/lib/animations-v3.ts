/**
 * Unified Animation System V3
 * Standardized animations for consistent micro-interactions across the app
 */

import { Variants } from 'framer-motion';

// ============= ANIMATION CONSTANTS =============

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

export const ANIMATION_EASING = {
  smooth: [0.4, 0, 0.2, 1] as const, // cubic-bezier
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  elastic: [0.175, 0.885, 0.32, 1.275] as const,
} as const;

export const SPRING_CONFIG = {
  default: { type: "spring" as const, stiffness: 400, damping: 25 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 20 },
  stiff: { type: "spring" as const, stiffness: 600, damping: 30 },
  bouncy: { type: "spring" as const, stiffness: 500, damping: 15 },
} as const;

// ============= PRESET ANIMATIONS =============

export const fadeIn = (duration = ANIMATION_DURATION.normal): Variants => ({
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: duration / 1000, 
      ease: ANIMATION_EASING.smooth 
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: duration / 1000,
      ease: ANIMATION_EASING.smooth 
    }
  },
});

export const scaleIn = (duration = ANIMATION_DURATION.fast): Variants => ({
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: duration / 1000,
      ease: ANIMATION_EASING.smooth 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { 
      duration: duration / 1000,
      ease: ANIMATION_EASING.smooth 
    }
  },
});

export const slideIn = (direction: 'left' | 'right' | 'up' | 'down' = 'up', duration = ANIMATION_DURATION.normal): Variants => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'left': return { x: -50, y: 0 };
      case 'right': return { x: 50, y: 0 };
      case 'up': return { x: 0, y: 20 };
      case 'down': return { x: 0, y: -20 };
    }
  };

  const initial = getInitialPosition();

  return {
    initial: { opacity: 0, ...initial },
    animate: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: { 
        duration: duration / 1000,
        ease: ANIMATION_EASING.smooth 
      }
    },
    exit: { 
      opacity: 0, 
      ...initial,
      transition: { 
        duration: duration / 1000,
        ease: ANIMATION_EASING.smooth 
      }
    },
  };
};

export const celebration = (): Variants => ({
  initial: { scale: 0, rotate: -180 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: SPRING_CONFIG.bouncy
  },
  exit: { 
    scale: 0, 
    rotate: 180,
    transition: { duration: 0.2 }
  },
});

export const pulse = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export const float = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export const shimmer = {
  backgroundPosition: ["200% center", "-200% center"],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "linear"
  }
};

// ============= STAGGER ANIMATIONS =============

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: ANIMATION_EASING.smooth
    }
  }
};

// ============= HOVER & TAP ANIMATIONS =============

export const hoverLift = {
  whileHover: {
    y: -5,
    scale: 1.02,
    transition: { duration: 0.2, ease: ANIMATION_EASING.smooth }
  },
  whileTap: {
    scale: 0.98
  }
};

export const hoverScale = {
  whileHover: {
    scale: 1.05,
    transition: { duration: 0.2, ease: ANIMATION_EASING.smooth }
  },
  whileTap: {
    scale: 0.95
  }
};

// ============= PAGE TRANSITIONS =============

export const pageTransition: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: ANIMATION_EASING.smooth
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: ANIMATION_EASING.smooth
    }
  }
};

// ============= ACCESSIBILITY =============

export const shouldReduceMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const getAnimationVariants = (variants: Variants): Variants => {
  if (shouldReduceMotion()) {
    return {
      initial: {},
      animate: {},
      exit: {}
    };
  }
  return variants;
};

// ============= UTILITY FUNCTIONS =============

export const withReducedMotion = (variants: Variants): Variants => {
  return getAnimationVariants(variants);
};
