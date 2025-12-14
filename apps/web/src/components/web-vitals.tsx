"use client";

import { useEffect } from "react";

// Web Vitals tracking for performance monitoring
// Reports to console in development, could send to analytics in production

interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
}

function reportWebVitals(metric: WebVitalsMetric) {
  // In development, log to console
  if (process.env.NODE_ENV === "development") {
    console.log("Web Vitals:", {
      name: metric.name,
      value: Math.round(metric.value),
      id: metric.id,
      delta: Math.round(metric.delta),
    });
  }

  // In production, you could send to analytics service
  // Example: sendToAnalytics(metric);
}

export function WebVitals() {
  useEffect(() => {
    // Dynamic import to avoid loading in server-side rendering
    // web-vitals v4+ uses onCLS, onFCP, etc. instead of getCLS, getFID, etc.
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(reportWebVitals);
      onINP(reportWebVitals); // INP replaced FID in v4
      onFCP(reportWebVitals);
      onLCP(reportWebVitals);
      onTTFB(reportWebVitals);
    });
  }, []);

  return null;
}