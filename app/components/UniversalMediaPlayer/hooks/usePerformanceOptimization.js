'use client';

import { useCallback, useRef, useMemo } from 'react';

/**
 * Performance optimization hook that provides utilities for
 * reducing re-renders, debouncing, throttling, and memory management
 */
export const usePerformanceOptimization = () => {
  // Refs for managing intervals and timeouts
  const intervalsRef = useRef(new Set());
  const timeoutsRef = useRef(new Set());
  const animationFramesRef = useRef(new Set());

  // Debounce function
  const debounce = useCallback((func, wait, immediate = false) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      timeoutsRef.current.add(timeout);
      if (callNow) func(...args);
    };
  }, []);

  // Throttle function
  const throttle = useCallback((func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  // Request animation frame wrapper
  const requestAnimationFrame = useCallback((callback) => {
    const id = window.requestAnimationFrame(callback);
    animationFramesRef.current.add(id);
    return id;
  }, []);

  // Cancel animation frame wrapper
  const cancelAnimationFrame = useCallback((id) => {
    window.cancelAnimationFrame(id);
    animationFramesRef.current.delete(id);
  }, []);

  // Set interval wrapper
  const setInterval = useCallback((callback, delay) => {
    const id = window.setInterval(callback, delay);
    intervalsRef.current.add(id);
    return id;
  }, []);

  // Clear interval wrapper
  const clearInterval = useCallback((id) => {
    window.clearInterval(id);
    intervalsRef.current.delete(id);
  }, []);

  // Set timeout wrapper
  const setTimeout = useCallback((callback, delay) => {
    const id = window.setTimeout(callback, delay);
    timeoutsRef.current.add(id);
    return id;
  }, []);

  // Clear timeout wrapper
  const clearTimeout = useCallback((id) => {
    window.clearTimeout(id);
    timeoutsRef.current.delete(id);
  }, []);

  // Memoized event handlers to prevent unnecessary re-renders
  const createEventHandler = useCallback((handler, deps = []) => {
    return useMemo(() => {
      if (typeof handler !== 'function') return handler;
      return (...args) => handler(...args);
    }, deps);
  }, []);

  // Optimized state updater that prevents unnecessary updates
  const createOptimizedUpdater = useCallback((setState) => {
    return useCallback((updates) => {
      setState(prevState => {
        if (typeof updates === 'function') {
          const newState = updates(prevState);
          // Deep comparison to prevent unnecessary updates
          if (JSON.stringify(prevState) === JSON.stringify(newState)) {
            return prevState;
          }
          return newState;
        }

        // For object updates, only update changed properties
        if (typeof updates === 'object' && updates !== null) {
          const newState = { ...prevState };
          let hasChanges = false;

          Object.entries(updates).forEach(([key, value]) => {
            if (prevState[key] !== value) {
              newState[key] = value;
              hasChanges = true;
            }
          });

          return hasChanges ? newState : prevState;
        }

        return updates;
      });
    }, []);
  }, []);

  // Memory usage monitor
  const monitorMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memInfo = performance.memory;
      return {
        used: Math.round(memInfo.usedJSHeapSize / 1048576), // MB
        total: Math.round(memInfo.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memInfo.jsHeapSizeLimit / 1048576), // MB
        usagePercent: Math.round((memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100)
      };
    }
    return null;
  }, []);

  // Performance metrics collector
  const collectPerformanceMetrics = useCallback(() => {
    const metrics = {
      timestamp: Date.now(),
      memory: monitorMemoryUsage(),
      timing: performance.timing,
      navigation: performance.navigation,
      fps: 60, // Default, would need frame timing to calculate accurately
      activeTimeouts: timeoutsRef.current.size,
      activeIntervals: intervalsRef.current.size,
      activeAnimationFrames: animationFramesRef.current.size
    };

    return metrics;
  }, [monitorMemoryUsage]);

  // Cleanup function to clear all managed timers
  const cleanup = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(id => {
      window.clearTimeout(id);
    });
    timeoutsRef.current.clear();

    // Clear all intervals
    intervalsRef.current.forEach(id => {
      window.clearInterval(id);
    });
    intervalsRef.current.clear();

    // Cancel all animation frames
    animationFramesRef.current.forEach(id => {
      window.cancelAnimationFrame(id);
    });
    animationFramesRef.current.clear();
  }, []);

  // Lazy loading utility
  const lazyLoad = useCallback(async (importFunc) => {
    try {
      const module = await importFunc();
      return module.default || module;
    } catch (error) {
      console.error('Lazy loading failed:', error);
      return null;
    }
  }, []);

  // Intersection Observer for performance
  const useIntersectionObserver = useCallback((ref, options = {}) => {
    return useMemo(() => {
      if (!ref.current) return { isIntersecting: false };

      const observer = new IntersectionObserver(([entry]) => {
        // Handle intersection
        if (entry.isIntersecting) {
          // Element is visible
          console.log('Element became visible');
        } else {
          // Element is not visible
          console.log('Element became hidden');
        }
      }, {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      });

      observer.observe(ref.current);

      return () => {
        observer.disconnect();
      };
    }, [ref, options]);
  }, []);

  // Web Worker utility for heavy computations
  const createWorker = useCallback((workerFunction) => {
    const blob = new Blob([`(${workerFunction.toString()})()`], {
      type: 'application/javascript'
    });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    // Clean up blob URL when worker is terminated
    worker.addEventListener('message', (e) => {
      if (e.data === 'terminate') {
        URL.revokeObjectURL(url);
      }
    });

    return worker;
  }, []);

  // ResizeObserver for responsive optimizations
  const useResizeObserver = useCallback((ref, callback) => {
    return useMemo(() => {
      if (!ref.current || !window.ResizeObserver) return;

      const resizeObserver = new ResizeObserver((entries) => {
        const throttledCallback = throttle(callback, 100);
        throttledCallback(entries);
      });

      resizeObserver.observe(ref.current);

      return () => {
        resizeObserver.disconnect();
      };
    }, [ref, callback, throttle]);
  }, [throttle]);

  return {
    // Timing utilities
    debounce,
    throttle,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame,
    cancelAnimationFrame,

    // Optimization utilities
    createEventHandler,
    createOptimizedUpdater,

    // Performance monitoring
    monitorMemoryUsage,
    collectPerformanceMetrics,

    // Resource management
    cleanup,
    lazyLoad,
    useIntersectionObserver,
    useResizeObserver,
    createWorker
  };
};

export default usePerformanceOptimization;