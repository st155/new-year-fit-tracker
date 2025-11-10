/**
 * Animation System Showcase
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  fadeIn, 
  scaleIn, 
  slideIn, 
  celebration,
  hoverLift,
  hoverScale,
  pulse,
  float,
  staggerContainer,
  staggerItem,
  ANIMATION_DURATION,
  ANIMATION_EASING
} from '@/lib/animations-v3';
import { PlayCircle, RotateCcw, MoveVertical } from 'lucide-react';

export function AnimationShowcase() {
  const [showFadeIn, setShowFadeIn] = useState(false);
  const [showScaleIn, setShowScaleIn] = useState(false);
  const [showSlideLeft, setShowSlideLeft] = useState(false);
  const [showSlideRight, setShowSlideRight] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showStagger, setShowStagger] = useState(false);

  const resetAll = () => {
    setShowFadeIn(false);
    setShowScaleIn(false);
    setShowSlideLeft(false);
    setShowSlideRight(false);
    setShowCelebration(false);
    setShowStagger(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Animation System</h2>
          <p className="text-muted-foreground">Unified animations from animations-v3.ts</p>
        </div>
        <Button variant="outline" onClick={resetAll}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All
        </Button>
      </div>

      {/* Entrance Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Entrance Animations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fade In */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fade In</p>
                <p className="text-xs text-muted-foreground">Opacity + subtle Y translation</p>
              </div>
              <Button size="sm" onClick={() => setShowFadeIn(!showFadeIn)}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Toggle
              </Button>
            </div>
            <div className="h-20 bg-muted/30 rounded-lg flex items-center justify-center">
              <AnimatePresence mode="wait">
                {showFadeIn && (
                  <motion.div
                    key="fade"
                    {...fadeIn(ANIMATION_DURATION.normal)}
                  >
                    <Badge className="text-lg px-4 py-2">Fade In Animation</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Scale In */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Scale In</p>
                <p className="text-xs text-muted-foreground">Opacity + scale transformation</p>
              </div>
              <Button size="sm" onClick={() => setShowScaleIn(!showScaleIn)}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Toggle
              </Button>
            </div>
            <div className="h-20 bg-muted/30 rounded-lg flex items-center justify-center">
              <AnimatePresence mode="wait">
                {showScaleIn && (
                  <motion.div
                    key="scale"
                    {...scaleIn(ANIMATION_DURATION.fast)}
                  >
                    <Badge variant="secondary" className="text-lg px-4 py-2">Scale In Animation</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Slide In */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Slide In</p>
                <p className="text-xs text-muted-foreground">Directional slide animations</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowSlideLeft(!showSlideLeft)}>
                  Slide Left
                </Button>
                <Button size="sm" onClick={() => setShowSlideRight(!showSlideRight)}>
                  Slide Right
                </Button>
              </div>
            </div>
            <div className="h-20 bg-muted/30 rounded-lg flex items-center justify-center gap-4">
              <AnimatePresence mode="wait">
                {showSlideLeft && (
                  <motion.div
                    key="slide-left"
                    {...slideIn('left', ANIMATION_DURATION.normal)}
                  >
                    <Badge className="text-lg px-4 py-2">← From Left</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {showSlideRight && (
                  <motion.div
                    key="slide-right"
                    {...slideIn('right', ANIMATION_DURATION.normal)}
                  >
                    <Badge variant="secondary" className="text-lg px-4 py-2">From Right →</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Celebration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Celebration</p>
                <p className="text-xs text-muted-foreground">Bouncy scale + rotation for success states</p>
              </div>
              <Button size="sm" onClick={() => setShowCelebration(!showCelebration)}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Toggle
              </Button>
            </div>
            <div className="h-20 bg-muted/30 rounded-lg flex items-center justify-center">
              <AnimatePresence mode="wait">
                {showCelebration && (
                  <motion.div
                    key="celebration"
                    {...celebration()}
                  >
                    <Badge className="text-2xl px-6 py-3 bg-success">🎉 Success!</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stagger Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Stagger Animations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Animate list items with stagger effect</p>
            <Button size="sm" onClick={() => setShowStagger(!showStagger)}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Toggle
            </Button>
          </div>
          <AnimatePresence mode="wait">
            {showStagger && (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-2"
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    variants={staggerItem}
                  >
                    <Card className="p-4">
                      <p className="text-sm">List item {i}</p>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Hover Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Hover Animations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div {...hoverLift}>
              <Card className="p-6 cursor-pointer">
                <p className="text-sm font-medium text-center">Hover Lift</p>
                <p className="text-xs text-muted-foreground text-center mt-1">Y translation + scale</p>
              </Card>
            </motion.div>

            <motion.div {...hoverScale}>
              <Card className="p-6 cursor-pointer">
                <p className="text-sm font-medium text-center">Hover Scale</p>
                <p className="text-xs text-muted-foreground text-center mt-1">Scale up on hover</p>
              </Card>
            </motion.div>

            <Card className="p-6">
              <p className="text-sm font-medium text-center">Pulse</p>
              <p className="text-xs text-muted-foreground text-center mt-1">Available as CSS animation</p>
              <p className="text-xs text-muted-foreground text-center">Use className="animate-pulse"</p>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Continuous Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Continuous Animations (CSS)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 bg-gradient-primary text-primary-foreground">
              <div className="flex items-center justify-center mb-2">
                <MoveVertical className="h-5 w-5 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-center">Pulse Animation</p>
              <p className="text-xs text-center mt-1 opacity-80">className="animate-pulse"</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-secondary to-secondary/50">
              <div className="flex items-center justify-center mb-2">
                <div className="h-5 w-5 bg-primary rounded-full animate-pulse" />
              </div>
              <p className="text-sm font-medium text-center">Continuous Pulse</p>
              <p className="text-xs text-center mt-1 text-muted-foreground">Built-in Tailwind animation</p>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Animation Constants */}
      <Card>
        <CardHeader>
          <CardTitle>Animation Constants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Duration (ms)</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">fast: {ANIMATION_DURATION.fast}ms</Badge>
              <Badge variant="outline">normal: {ANIMATION_DURATION.normal}ms</Badge>
              <Badge variant="outline">slow: {ANIMATION_DURATION.slow}ms</Badge>
              <Badge variant="outline">verySlow: {ANIMATION_DURATION.verySlow}ms</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Easing Functions</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">smooth: [{ANIMATION_EASING.smooth.join(', ')}]</Badge>
              <Badge variant="outline">bounce: [{ANIMATION_EASING.bounce.join(', ')}]</Badge>
              <Badge variant="outline">elastic: [{ANIMATION_EASING.elastic.join(', ')}]</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}