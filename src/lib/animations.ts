/**
 * Framer Motion Animation Library
 * Reusable animation variants for consistent micro-interactions
 * 
 * @deprecated This file is being phased out in favor of animations-v3.ts
 * Please use src/lib/animations-v3.ts for new code.
 * This file is kept for backward compatibility with existing components.
 * 
 * Migration guide:
 * - fadeInUp -> animations.fadeIn()
 * - scaleIn -> animations.scaleIn()
 * - slideInRight -> animations.slideIn('right')
 * - Use ANIMATION_DURATION and ANIMATION_EASING constants from animations-v3
 */

import { Variants } from 'framer-motion';

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

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
      ease: [0.4, 0, 0.2, 1] // Custom easing
    }
  }
};

// Card hover lift effect
export const hoverLift = {
  whileHover: {
    y: -5,
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  whileTap: {
    scale: 0.98
  }
};

// Page transition with scale effect
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
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3
    }
  }
};

// Fade in animation
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.4 }
  },
  exit: { opacity: 0 }
};

// Check if user prefers reduced motion
export const shouldReduceMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get animation variants with reduced motion support
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

// Check if browser supports advanced 3D animations
export const supportsAdvancedAnimations = () => {
  if (typeof window === 'undefined') return false;
  
  const supportsTransform3D = () => {
    const el = document.createElement('p');
    let has3d = false;
    const transforms: Record<string, string> = {
      'webkitTransform': '-webkit-transform',
      'OTransform': '-o-transform',
      'msTransform': '-ms-transform',
      'MozTransform': '-moz-transform',
      'transform': 'transform',
    };

    document.body.insertBefore(el, null);

    for (const t in transforms) {
      if ((el.style as any)[t] !== undefined) {
        (el.style as any)[t] = 'translate3d(1px,1px,1px)';
        has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]) !== undefined;
        break;
      }
    }

    document.body.removeChild(el);
    return has3d;
  };

  return supportsTransform3D();
};
