import React from 'react';

interface ErrorReport {
  message: string;
  stack?: string;
  component?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  errorType?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

class ErrorReporter {
  private isEnabled: boolean;
  private endpoint: string;
  private queue: ErrorReport[] = [];
  private maxQueueSize: number = 50;
  private isProcessing: boolean = false;

  constructor() {
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true';
    this.endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT || '/api/errors';
  }

  report(error: Error, component?: string, context?: Record<string, any>, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      component,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      errorType: error.constructor.name,
      severity,
      context
    };

    this.queue.push(errorReport);

    // Limit queue size
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      const reports = [...this.queue];
      this.queue = [];

      // Send error reports in batch
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports })
      });
    } catch (error) {
      console.warn('Failed to send error reports:', error);
      // Re-queue failed reports
      this.queue.unshift(...this.queue);
    } finally {
      this.isProcessing = false;
    }
  }

  capturePromiseRejection(reason: any, promise: Promise<any>) {
    if (reason instanceof Error) {
      this.report(reason, 'Promise Rejection');
    } else {
      this.report(new Error(String(reason)), 'Promise Rejection');
    }
  }

  captureUnhandledError(error: ErrorEvent) {
    this.report(error.error || new Error(error.message), 'Unhandled Error', {
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno
    }, 'high');
  }

  // Performance monitoring
  capturePerformanceIssue(issue: {
    type: string;
    message: string;
    duration?: number;
    component?: string;
  }) {
    const error = new Error(`Performance Issue: ${issue.message}`);
    this.report(error, issue.component || 'Performance', {
      type: issue.type,
      duration: issue.duration
    }, 'low');
  }

  // User interaction errors
  captureUserError(action: string, details: string, component?: string) {
    const error = new Error(`User Error: ${action} - ${details}`);
    this.report(error, component, { action, details }, 'low');
  }
}

export const errorReporter = new ErrorReporter();

// Global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorReporter.captureUnhandledError(event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorReporter.capturePromiseRejection(event.reason, event.promise);
  });

  // Performance monitoring
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation' && entry.duration > 5000) {
            errorReporter.capturePerformanceIssue({
              type: 'slow_navigation',
              message: `Navigation took ${entry.duration}ms`,
              duration: entry.duration
            });
          }
        }
      });
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }
}

// React Error Boundary integration
export function withErrorReporting<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return function ErrorBoundaryWrappedComponent(props: P) {
    try {
      return React.createElement(Component, props);
    } catch (error) {
      if (error instanceof Error) {
        errorReporter.report(error, componentName || Component.name);
      }
      throw error;
    }
  };
}

// Hook for manual error reporting
export function useErrorReporting() {
  return {
    reportError: (error: Error, component?: string, context?: Record<string, any>) => {
      errorReporter.report(error, component, context);
    },
    reportUserError: (action: string, details: string, component?: string) => {
      errorReporter.captureUserError(action, details, component);
    },
    reportPerformanceIssue: (issue: {
      type: string;
      message: string;
      duration?: number;
      component?: string;
    }) => {
      errorReporter.capturePerformanceIssue(issue);
    }
  };
} 