import confetti from 'canvas-confetti';

export function celebratePR() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#06b6d4', '#a855f7', '#ec4899'];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });

    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

export function celebrate() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#06b6d4', '#a855f7', '#ec4899'],
  });
}

export function celebrateStreakMilestone(days: number) {
  const scalar = 2;
  const emoji = confetti.shapeFromText({ text: '🔥', scalar });

  confetti({
    particleCount: 50,
    spread: 100,
    startVelocity: 30,
    shapes: [emoji],
    scalar,
  });
}
