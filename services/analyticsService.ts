import { analytics } from "./firebase";
import { logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { logger } from "../utils/logger";

export type AnalyticsEvent = 
  | 'session_start'
  | 'page_view'
  | 'login'
  | 'sign_up'
  | 'feature_used'
  | 'message_sent'
  | 'message_feedback'
  | 'error_boundary'
  | 'performance_metric'
  | 'conversion_start'
  | 'upgrade_plan';

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

// Initialize User Context for Retention Analysis
export const setAnalyticsUser = (userId: string | null, properties?: { plan?: string; credits?: number }) => {
  if (!analytics) return;
  
  if (userId) {
    setUserId(analytics, userId);
    if (properties) {
      setUserProperties(analytics, properties);
    }
  } else {
    setUserId(analytics, null);
  }
};

// Generic Event Logger
export const trackEvent = (eventName: AnalyticsEvent, params?: EventParams) => {
  if (!analytics) {
    // Fallback logging for dev/offline
    logger.info(`[Analytics] ${eventName}`, params);
    return;
  }
  try {
    logEvent(analytics, eventName, params);
  } catch (error) {
    logger.warn("Failed to log analytics event", error);
  }
};

// Performance Monitoring (Web Vitals & Custom)
export const initPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return;

  // 1. Page Load Time
  window.addEventListener('load', () => {
    if (window.performance) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      trackEvent('performance_metric', { 
        metric: 'page_load_time', 
        value: loadTime, 
        rating: loadTime < 2000 ? 'good' : loadTime < 4000 ? 'needs_improvement' : 'poor'
      });
    }
  });

  // 2. First Contentful Paint (FCP) via PerformanceObserver
  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          trackEvent('performance_metric', { 
            metric: 'FCP', 
            value: Math.round(entry.startTime),
            rating: entry.startTime < 1500 ? 'good' : 'poor'
          });
        }
      }
    });
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Observer not supported
  }

  // 3. Monitor Long Tasks (Main Thread Blocking)
  try {
    const longTaskObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > 50) { // Tasks > 50ms
             trackEvent('performance_metric', { 
                metric: 'long_task', 
                value: Math.round(entry.duration)
            });
        }
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch (e) {
      // Observer not supported
  }
};

export const trackError = (error: Error, componentStack?: string) => {
  trackEvent('error_boundary', {
    error_name: error.name,
    error_message: error.message,
    component_stack: componentStack ? componentStack.substring(0, 500) : undefined // Truncate
  });
};
