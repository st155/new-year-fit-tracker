import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * PERFORMANCE: Web Vitals monitoring
 * 
 * Tracks Core Web Vitals and custom performance metrics
 * 
 * Thresholds:
 * - LCP (Largest Contentful Paint): < 2.5s (good), < 4s (needs improvement), > 4s (poor)
 * - INP (Interaction to Next Paint): < 200ms (good), < 500ms (needs improvement), > 500ms (poor)
 * - CLS (Cumulative Layout Shift): < 0.1 (good), < 0.25 (needs improvement), > 0.25 (poor)
 * - FCP (First Contentful Paint): < 1.8s (good), < 3s (needs improvement), > 3s (poor)
 * - TTFB (Time to First Byte): < 600ms (good), < 1.5s (needs improvement), > 1.5s (poor)
 * 
 * Usage:
 * ```tsx
 * import { startPerformanceMonitoring, trackCustomMetric } from '@/lib/performance-monitor';
 * 
 * // In main.tsx
 * startPerformanceMonitoring();
 * 
 * // Track custom metrics
 * trackCustomMetric('dashboard-load', 1234);
 * ```
 */

interface PerformanceData {
  metric: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

const PERFORMANCE_LOG_KEY = 'app_performance_log';
const MAX_LOG_ENTRIES = 100;

/**
 * Get performance rating based on metric type and value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [600, 1500],
  };

  const [good, poor] = thresholds[name] || [1000, 3000];
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Log performance metric
 */
function logMetric(data: PerformanceData) {
  // Console output with color coding
  const emoji = {
    good: '✅',
    'needs-improvement': '⚠️',
    poor: '❌',
  }[data.rating];

  console.log(
    `${emoji} [Performance] ${data.metric}: ${data.value.toFixed(2)}ms (${data.rating})`
  );

  // Store in localStorage for analysis
  if (typeof window !== 'undefined') {
    try {
      const log = JSON.parse(localStorage.getItem(PERFORMANCE_LOG_KEY) || '[]');
      log.push(data);
      
      // Keep only last N entries
      if (log.length > MAX_LOG_ENTRIES) {
        log.shift();
      }
      
      localStorage.setItem(PERFORMANCE_LOG_KEY, JSON.stringify(log));
    } catch (e) {
      console.error('[Performance] Failed to log metric:', e);
    }
  }

  // Send to analytics (if configured)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'Performance',
      event_label: data.metric,
      value: Math.round(data.value),
      metric_rating: data.rating,
    });
  }
}

/**
 * Handle Web Vitals metric
 */
function handleMetric({ name, value, rating }: Metric) {
  logMetric({
    metric: name,
    value,
    rating: rating as 'good' | 'needs-improvement' | 'poor',
    timestamp: Date.now(),
  });
}

/**
 * Start monitoring Web Vitals
 */
export function startPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  console.log('[Performance] Starting Web Vitals monitoring...');

  // Core Web Vitals
  onCLS(handleMetric);
  onINP(handleMetric);
  onLCP(handleMetric);
  
  // Additional metrics
  onFCP(handleMetric);
  onTTFB(handleMetric);

  // Track initial page load
  if (window.performance && window.performance.timing) {
    const timing = window.performance.timing;
    const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
    
    if (pageLoadTime > 0) {
      trackCustomMetric('page-load', pageLoadTime);
    }
  }

  console.log('[Performance] Monitoring active');
}

/**
 * Track custom performance metric
 */
export function trackCustomMetric(name: string, value: number) {
  const rating = getRating(name, value);
  
  logMetric({
    metric: name,
    value,
    rating,
    timestamp: Date.now(),
  });
}

/**
 * Get performance log from localStorage
 */
export function getPerformanceLog(): PerformanceData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    return JSON.parse(localStorage.getItem(PERFORMANCE_LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const log = getPerformanceLog();
  
  const summary: Record<string, { 
    avg: number; 
    min: number; 
    max: number; 
    count: number;
    goodCount: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  }> = {};

  log.forEach(entry => {
    if (!summary[entry.metric]) {
      summary[entry.metric] = {
        avg: 0,
        min: Infinity,
        max: 0,
        count: 0,
        goodCount: 0,
        rating: 'good',
      };
    }

    const s = summary[entry.metric];
    s.count++;
    s.avg = (s.avg * (s.count - 1) + entry.value) / s.count;
    s.min = Math.min(s.min, entry.value);
    s.max = Math.max(s.max, entry.value);
    
    if (entry.rating === 'good') s.goodCount++;
  });

  // Calculate overall rating
  Object.keys(summary).forEach(metric => {
    const s = summary[metric];
    const goodPercentage = (s.goodCount / s.count) * 100;
    
    if (goodPercentage >= 75) s.rating = 'good';
    else if (goodPercentage >= 50) s.rating = 'needs-improvement';
    else s.rating = 'poor';
  });

  return summary;
}

/**
 * Clear performance log
 */
export function clearPerformanceLog() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PERFORMANCE_LOG_KEY);
  }
}
