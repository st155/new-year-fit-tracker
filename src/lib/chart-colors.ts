/**
 * Unified Chart Color Palette
 * HSL colors for consistent theming across all chart types
 */

export const chartColors = {
  // Primary palette - vibrant, readable colors
  emerald: 'hsl(160, 84%, 39%)',    // #10b981
  rose: 'hsl(351, 95%, 71%)',        // #fb7185
  orange: 'hsl(25, 95%, 53%)',       // #fb923c
  indigo: 'hsl(239, 84%, 67%)',      // #6366f1
  sky: 'hsl(199, 89%, 48%)',         // #0ea5e9
  purple: 'hsl(258, 90%, 66%)',      // #a78bfa
  amber: 'hsl(38, 92%, 50%)',        // #f59e0b
  cyan: 'hsl(189, 94%, 43%)',        // #06b6d4
  fuchsia: 'hsl(292, 84%, 61%)',     // #d946ef
  
  // RGB versions for Recharts gradients
  emeraldRGB: '16, 185, 129',
  roseRGB: '251, 113, 133',
  orangeRGB: '251, 146, 60',
  indigoRGB: '99, 102, 241',
  skyRGB: '14, 165, 233',
  purpleRGB: '167, 139, 250',
  amberRGB: '245, 158, 11',
} as const;

/**
 * Creates a linear gradient definition for Recharts
 */
export function createChartGradient(id: string, color: keyof typeof chartColors, opacity = 0.3) {
  const rgb = chartColors[`${color}RGB` as keyof typeof chartColors];
  
  return {
    id,
    x1: '0',
    y1: '0',
    x2: '0',
    y2: '1',
    stops: [
      { offset: '5%', color: `rgba(${rgb}, ${opacity * 2})` },
      { offset: '95%', color: `rgba(${rgb}, 0)` },
    ],
  };
}

/**
 * Sleep phase colors - consistent across all sleep charts
 */
export const sleepColors = {
  deep: chartColors.indigo,
  light: chartColors.sky,
  rem: chartColors.purple,
  awake: chartColors.amber,
} as const;

/**
 * Metric-specific colors
 */
export const metricColors = {
  recovery: chartColors.emerald,
  strain: chartColors.orange,
  heartRate: chartColors.rose,
  sleep: chartColors.indigo,
  steps: chartColors.cyan,
  calories: chartColors.amber,
} as const;
