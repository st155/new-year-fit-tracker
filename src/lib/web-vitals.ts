/**
 * Web Vitals tracking for performance monitoring
 * 
 * Tracks Core Web Vitals:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial render
 * - TTFB (Time to First Byte) - Server response time
 */

import { logger } from './logger';

type MetricName = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

interface Metric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Send metric to analytics service
 */
function sendToAnalytics(metric: Metric) {
  logger.info(`Web Vital: ${metric.name}`, {
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
  });

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to Edge Function in production
  if (!import.meta.env.DEV) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      fetch(`${supabaseUrl}/functions/v1/analytics-vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          timestamp: Date.now(),
          url: window.location.href,
        }),
        keepalive: true,
      }).catch((error) => {
        logger.warn('Failed to send web vitals', { error });
      });
    }
  }
}

/**
 * Initialize Web Vitals tracking
 */
export async function initWebVitals() {
  if (typeof window === 'undefined') return;

  try {
    const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);

    logger.debug('Web Vitals tracking initialized');
  } catch (error) {
    logger.warn('Failed to initialize web vitals', { error });
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  if (typeof window === 'undefined' || !window.performance) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (!navigation) return null;

  return {
    // Network timing
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    
    // Page load timing
    domInteractive: navigation.domInteractive - navigation.fetchStart,
    domComplete: navigation.domComplete - navigation.fetchStart,
    loadComplete: navigation.loadEventEnd - navigation.fetchStart,
    
    // Resource timing
    totalResources: performance.getEntriesByType('resource').length,
  };
}

/**
 * Log performance metrics to console (dev only)
 */
export function logPerformanceMetrics() {
  if (!import.meta.env.DEV) return;

  const metrics = getPerformanceMetrics();
  if (metrics) {
    logger.debug('Performance Metrics', metrics);
  }
}
