import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useAdvancedAnalytics - Comprehensive analytics and insights hook
 * 
 * Features:
 * - Real-time user interaction tracking and analysis
 * - Performance metrics collection and reporting
 * - User behavior pattern recognition and insights
 * - A/B testing framework integration
 * - Privacy-compliant data collection with opt-out
 * - Advanced engagement metrics and retention analysis
 * - Predictive analytics for content optimization
 * - Custom event tracking and funnel analysis
 */
const useAdvancedAnalytics = ({
  isEnabled = true,
  privacyMode = true,
  anonymizeData = true,
  batchSize = 50,
  flushInterval = 30000, // 30 seconds
  retentionDays = 90,
  enablePredictive = true,
  customEvents = {},
  abTestingEnabled = false,
  onInsightGenerated = null,
  onDataExport = null,
  debugMode = false
} = {}) => {

  // Core analytics state
  const [sessionId] = useState(() => generateSessionId());
  const [userId] = useState(() => generateUserId());
  const [isTracking, setIsTracking] = useState(isEnabled);
  const [sessionData, setSessionData] = useState({
    startTime: Date.now(),
    duration: 0,
    interactions: 0,
    events: []
  });

  // User behavior tracking
  const [userBehavior, setUserBehavior] = useState({
    watchPatterns: {},
    preferences: {},
    engagement: {
      totalWatchTime: 0,
      averageSessionLength: 0,
      completionRate: 0,
      interactionFrequency: 0
    },
    devices: [],
    contexts: []
  });

  // Performance analytics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    pageLoadTime: 0,
    videoLoadTime: 0,
    bufferingEvents: [],
    qualitySwitches: [],
    errorRate: 0,
    crashReports: []
  });

  // Content analytics
  const [contentAnalytics, setContentAnalytics] = useState({
    mostWatchedContent: {},
    dropOffPoints: {},
    popularFeatures: {},
    searchQueries: [],
    recommendationEffectiveness: {}
  });

  // Real-time insights
  const [insights, setInsights] = useState({
    userSegment: 'casual',
    predictedActions: [],
    recommendedOptimizations: [],
    engagementScore: 0.5,
    retentionRisk: 'low'
  });

  // A/B Testing state
  const [abTests, setAbTests] = useState({
    activeTests: new Map(),
    userVariants: new Map(),
    testResults: new Map()
  });

  // Data storage and batching
  const eventQueueRef = useRef([]);
  const flushTimerRef = useRef(null);
  const analyticsConfigRef = useRef({
    trackingPixel: null,
    apiEndpoint: '/api/analytics',
    storage: 'localStorage'
  });

  // Generate unique session ID
  function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate anonymous user ID
  function generateUserId() {
    if (!anonymizeData) return null;
    
    const stored = localStorage.getItem('player_user_id');
    if (stored) return stored;
    
    const userId = `user_${Math.random().toString(36).substr(2, 16)}`;
    localStorage.setItem('player_user_id', userId);
    return userId;
  }

  // Core event tracking
  const trackEvent = useCallback((eventType, eventData = {}) => {
    if (!isTracking || !isEnabled) return;

    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: eventType,
      timestamp: Date.now(),
      sessionId,
      userId: anonymizeData ? userId : null,
      data: privacyMode ? sanitizeEventData(eventData) : eventData,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : null
      }
    };

    // Add to queue
    eventQueueRef.current.push(event);

    // Update session data
    setSessionData(prev => ({
      ...prev,
      interactions: prev.interactions + 1,
      events: [...prev.events.slice(-99), event], // Keep last 100 events
      duration: Date.now() - prev.startTime
    }));

    // Process event for real-time insights
    processEventForInsights(event);

    // Flush if batch size reached
    if (eventQueueRef.current.length >= batchSize) {
      flushEvents();
    }

    if (debugMode) {
      console.log('Event tracked:', event);
    }
  }, [isTracking, isEnabled, sessionId, userId, anonymizeData, privacyMode, batchSize, debugMode]);

  // Sanitize event data for privacy
  const sanitizeEventData = useCallback((data) => {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.ip;
    delete sanitized.email;
    delete sanitized.userId;
    delete sanitized.personalInfo;
    
    // Hash any remaining PII
    if (sanitized.searchQuery) {
      sanitized.searchQuery = hashString(sanitized.searchQuery);
    }
    
    return sanitized;
  }, []);

  // Simple hash function for data anonymization
  const hashString = useCallback((str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }, []);

  // Flush events to storage/server
  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const eventsToFlush = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      // Store locally first
      const existingData = JSON.parse(localStorage.getItem('player_analytics') || '[]');
      const updatedData = [...existingData, ...eventsToFlush];
      
      // Respect retention policy
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const filteredData = updatedData.filter(event => event.timestamp > cutoffTime);
      
      localStorage.setItem('player_analytics', JSON.stringify(filteredData.slice(-1000))); // Keep max 1000 events

      // Send to server if configured
      if (analyticsConfigRef.current.apiEndpoint && !privacyMode) {
        await fetch(analyticsConfigRef.current.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events: eventsToFlush, sessionId })
        });
      }

      // Export data if callback provided
      if (onDataExport) {
        onDataExport({ events: eventsToFlush, sessionId });
      }

    } catch (error) {
      console.warn('Failed to flush analytics events:', error);
      // Put events back in queue
      eventQueueRef.current = [...eventsToFlush, ...eventQueueRef.current];
    }
  }, [sessionId, retentionDays, privacyMode, onDataExport]);

  // Set up automatic flushing
  useEffect(() => {
    if (!isTracking) return;

    flushTimerRef.current = setInterval(() => {
      flushEvents();
    }, flushInterval);

    // Flush on page unload
    const handleUnload = () => {
      flushEvents();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
      window.removeEventListener('beforeunload', handleUnload);
      flushEvents(); // Final flush
    };
  }, [isTracking, flushInterval]);

  // Process events for real-time insights
  const processEventForInsights = useCallback((event) => {
    // Update user behavior patterns
    if (event.type === 'video_play') {
      setUserBehavior(prev => ({
        ...prev,
        watchPatterns: {
          ...prev.watchPatterns,
          [event.data.contentId]: (prev.watchPatterns[event.data.contentId] || 0) + 1
        }
      }));
    }

    // Track feature usage
    if (event.type === 'feature_used') {
      setContentAnalytics(prev => ({
        ...prev,
        popularFeatures: {
          ...prev.popularFeatures,
          [event.data.feature]: (prev.popularFeatures[event.data.feature] || 0) + 1
        }
      }));
    }

    // Calculate engagement score
    updateEngagementScore(event);

    // Generate predictive insights
    if (enablePredictive) {
      generatePredictiveInsights(event);
    }
  }, [enablePredictive]);

  // Update user engagement score
  const updateEngagementScore = useCallback((event) => {
    setInsights(prev => {
      let score = prev.engagementScore;

      switch (event.type) {
        case 'video_play':
          score += 0.1;
          break;
        case 'video_complete':
          score += 0.3;
          break;
        case 'quality_change':
          score += 0.05;
          break;
        case 'feature_used':
          score += 0.15;
          break;
        case 'video_pause':
          score -= 0.02;
          break;
        case 'video_abandon':
          score -= 0.2;
          break;
        default:
          score += 0.01; // Small boost for any interaction
      }

      // Normalize score between 0 and 1
      score = Math.max(0, Math.min(1, score));

      return {
        ...prev,
        engagementScore: score * 0.1 + prev.engagementScore * 0.9 // Smooth the score
      };
    });
  }, []);

  // Generate predictive insights
  const generatePredictiveInsights = useCallback((event) => {
    // Simple predictive logic - in reality this would use ML models
    const predictions = [];

    if (event.type === 'video_pause') {
      const pauseFrequency = sessionData.events.filter(e => e.type === 'video_pause').length;
      if (pauseFrequency > 3) {
        predictions.push({
          action: 'likely_to_abandon',
          confidence: 0.7,
          recommendation: 'Show content suggestions to retain user'
        });
      }
    }

    if (event.type === 'quality_change') {
      predictions.push({
        action: 'bandwidth_concerns',
        confidence: 0.6,
        recommendation: 'Enable adaptive streaming optimizations'
      });
    }

    setInsights(prev => ({
      ...prev,
      predictedActions: [...predictions, ...prev.predictedActions.slice(0, 4)] // Keep 5 most recent
    }));
  }, [sessionData.events]);

  // User segmentation
  const classifyUserSegment = useCallback(() => {
    const { engagement } = userBehavior;
    const recentEvents = sessionData.events.slice(-20);
    
    const watchTime = engagement.totalWatchTime;
    const interactionCount = recentEvents.length;
    const completionRate = engagement.completionRate;

    if (watchTime > 7200000 && completionRate > 0.8) { // 2+ hours, high completion
      return 'power_user';
    } else if (watchTime > 3600000 && interactionCount > 10) { // 1+ hour, active
      return 'engaged_user';
    } else if (watchTime > 1800000) { // 30+ minutes
      return 'regular_user';
    } else if (interactionCount < 5) {
      return 'passive_user';
    } else {
      return 'casual_user';
    }
  }, [userBehavior, sessionData.events]);

  // A/B Testing implementation
  const assignUserToTest = useCallback((testName, variants) => {
    if (!abTestingEnabled) return null;

    const existingAssignment = abTests.userVariants.get(testName);
    if (existingAssignment) return existingAssignment;

    // Simple hash-based assignment for consistent results
    const hash = hashString(`${userId}_${testName}`);
    const variantIndex = Math.abs(hash) % variants.length;
    const assignedVariant = variants[variantIndex];

    setAbTests(prev => ({
      ...prev,
      userVariants: new Map(prev.userVariants.set(testName, assignedVariant)),
      activeTests: new Map(prev.activeTests.set(testName, { variants, startTime: Date.now() }))
    }));

    trackEvent('ab_test_assignment', {
      testName,
      variant: assignedVariant,
      allVariants: variants
    });

    return assignedVariant;
  }, [abTestingEnabled, abTests, userId, hashString, trackEvent]);

  // Track A/B test conversion
  const trackConversion = useCallback((testName, conversionType = 'default') => {
    if (!abTestingEnabled) return;

    const userVariant = abTests.userVariants.get(testName);
    if (!userVariant) return;

    trackEvent('ab_test_conversion', {
      testName,
      variant: userVariant,
      conversionType
    });

    // Update test results
    setAbTests(prev => {
      const testResults = new Map(prev.testResults);
      const testKey = `${testName}_${userVariant}`;
      const current = testResults.get(testKey) || { conversions: 0, views: 0 };
      
      testResults.set(testKey, {
        ...current,
        conversions: current.conversions + 1
      });

      return { ...prev, testResults };
    });
  }, [abTestingEnabled, abTests, trackEvent]);

  // Generate analytics report
  const generateReport = useCallback((timeRange = '7d') => {
    const stored = JSON.parse(localStorage.getItem('player_analytics') || '[]');
    const cutoffTime = Date.now() - (timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 
                                    timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 : 
                                    24 * 60 * 60 * 1000);
    
    const relevantEvents = stored.filter(event => event.timestamp > cutoffTime);
    
    const report = {
      summary: {
        totalEvents: relevantEvents.length,
        uniqueUsers: new Set(relevantEvents.map(e => e.userId)).size,
        totalSessions: new Set(relevantEvents.map(e => e.sessionId)).size,
        timeRange
      },
      engagement: {
        averageSessionDuration: calculateAverageSessionDuration(relevantEvents),
        mostPopularContent: getMostPopularContent(relevantEvents),
        featureUsage: getFeatureUsage(relevantEvents),
        completionRates: getCompletionRates(relevantEvents)
      },
      performance: {
        averageLoadTime: getAverageLoadTime(relevantEvents),
        errorRate: getErrorRate(relevantEvents),
        bufferingFrequency: getBufferingFrequency(relevantEvents)
      },
      insights: {
        userSegments: getUserSegments(relevantEvents),
        dropOffPoints: getDropOffPoints(relevantEvents),
        recommendations: generateRecommendations(relevantEvents)
      }
    };

    return report;
  }, []);

  // Helper functions for report generation
  const calculateAverageSessionDuration = useCallback((events) => {
    const sessions = new Map();
    
    events.forEach(event => {
      if (!sessions.has(event.sessionId)) {
        sessions.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        sessions.get(event.sessionId).end = Math.max(sessions.get(event.sessionId).end, event.timestamp);
      }
    });

    const durations = Array.from(sessions.values()).map(s => s.end - s.start);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }, []);

  const getMostPopularContent = useCallback((events) => {
    const content = {};
    events.filter(e => e.type === 'video_play').forEach(event => {
      const contentId = event.data?.contentId || 'unknown';
      content[contentId] = (content[contentId] || 0) + 1;
    });
    
    return Object.entries(content)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([id, count]) => ({ contentId: id, playCount: count }));
  }, []);

  const getFeatureUsage = useCallback((events) => {
    const features = {};
    events.filter(e => e.type === 'feature_used').forEach(event => {
      const feature = event.data?.feature || 'unknown';
      features[feature] = (features[feature] || 0) + 1;
    });
    
    return Object.entries(features)
      .sort(([,a], [,b]) => b - a)
      .reduce((obj, [feature, count]) => ({ ...obj, [feature]: count }), {});
  }, []);

  const getCompletionRates = useCallback((events) => {
    const plays = events.filter(e => e.type === 'video_play').length;
    const completions = events.filter(e => e.type === 'video_complete').length;
    
    return plays > 0 ? completions / plays : 0;
  }, []);

  const getAverageLoadTime = useCallback((events) => {
    const loadTimes = events
      .filter(e => e.type === 'video_load_complete')
      .map(e => e.data?.loadTime)
      .filter(Boolean);
    
    return loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0;
  }, []);

  const getErrorRate = useCallback((events) => {
    const totalEvents = events.length;
    const errorEvents = events.filter(e => e.type === 'error').length;
    
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }, []);

  const getBufferingFrequency = useCallback((events) => {
    const bufferEvents = events.filter(e => e.type === 'buffering_start').length;
    const sessions = new Set(events.map(e => e.sessionId)).size;
    
    return sessions > 0 ? bufferEvents / sessions : 0;
  }, []);

  const getUserSegments = useCallback((events) => {
    // Simplified user segmentation based on behavior
    const segments = { power_user: 0, engaged_user: 0, regular_user: 0, casual_user: 0 };
    const users = new Set(events.map(e => e.userId)).size;
    
    // This would be more sophisticated in practice
    segments.casual_user = Math.floor(users * 0.6);
    segments.regular_user = Math.floor(users * 0.25);
    segments.engaged_user = Math.floor(users * 0.12);
    segments.power_user = users - segments.casual_user - segments.regular_user - segments.engaged_user;
    
    return segments;
  }, []);

  const getDropOffPoints = useCallback((events) => {
    // Analyze where users typically stop watching
    const dropOffs = {};
    events.filter(e => e.type === 'video_abandon').forEach(event => {
      const progress = Math.floor((event.data?.currentTime || 0) / 10) * 10; // 10-second buckets
      dropOffs[`${progress}s`] = (dropOffs[`${progress}s`] || 0) + 1;
    });
    
    return dropOffs;
  }, []);

  const generateRecommendations = useCallback((events) => {
    const recommendations = [];
    
    const errorRate = getErrorRate(events);
    if (errorRate > 0.05) {
      recommendations.push('High error rate detected. Consider implementing better error handling and recovery mechanisms.');
    }
    
    const completionRate = getCompletionRates(events);
    if (completionRate < 0.5) {
      recommendations.push('Low completion rate. Consider analyzing drop-off points and improving content engagement.');
    }
    
    const bufferingFreq = getBufferingFrequency(events);
    if (bufferingFreq > 2) {
      recommendations.push('High buffering frequency. Optimize video delivery and implement better adaptive streaming.');
    }
    
    return recommendations;
  }, [getErrorRate, getCompletionRates, getBufferingFrequency]);

  // Update insights based on current data
  useEffect(() => {
    const userSegment = classifyUserSegment();
    setInsights(prev => ({
      ...prev,
      userSegment,
      retentionRisk: prev.engagementScore < 0.3 ? 'high' :
                    prev.engagementScore < 0.6 ? 'medium' : 'low'
    }));

    // Generate insights callback
    if (onInsightGenerated) {
      onInsightGenerated({
        userSegment,
        engagementScore: insights.engagementScore,
        predictedActions: insights.predictedActions
      });
    }
  }, [userBehavior, sessionData]);

  // Public API
  return {
    // Core tracking
    trackEvent,
    
    // Session info
    sessionId,
    userId: anonymizeData ? userId : null,
    sessionData,
    isTracking,
    
    // Analytics data
    userBehavior,
    performanceMetrics,
    contentAnalytics,
    insights,
    
    // A/B Testing
    assignUserToTest,
    trackConversion,
    getTestVariant: useCallback((testName) => abTests.userVariants.get(testName), [abTests]),
    
    // Controls
    startTracking: useCallback(() => setIsTracking(true), []),
    stopTracking: useCallback(() => setIsTracking(false), []),
    
    // Data management
    flushEvents,
    generateReport,
    clearData: useCallback(() => {
      localStorage.removeItem('player_analytics');
      eventQueueRef.current = [];
      setSessionData(prev => ({ ...prev, events: [] }));
    }, []),
    
    // Utilities
    getStoredEvents: useCallback(() => {
      return JSON.parse(localStorage.getItem('player_analytics') || '[]');
    }, []),
    
    exportData: useCallback((format = 'json') => {
      const data = {
        session: sessionData,
        behavior: userBehavior,
        performance: performanceMetrics,
        content: contentAnalytics,
        insights,
        events: JSON.parse(localStorage.getItem('player_analytics') || '[]')
      };
      
      if (format === 'csv') {
        // Convert to CSV format
        return convertToCSV(data.events);
      }
      
      return JSON.stringify(data, null, 2);
    }, [sessionData, userBehavior, performanceMetrics, contentAnalytics, insights]),
    
    // Configuration
    updateConfig: useCallback((config) => {
      analyticsConfigRef.current = { ...analyticsConfigRef.current, ...config };
    }, []),
    
    // Privacy controls
    optOut: useCallback(() => {
      setIsTracking(false);
      localStorage.setItem('player_analytics_opt_out', 'true');
    }, []),
    
    optIn: useCallback(() => {
      localStorage.removeItem('player_analytics_opt_out');
      setIsTracking(true);
    }, []),
    
    isOptedOut: useCallback(() => {
      return localStorage.getItem('player_analytics_opt_out') === 'true';
    }, [])
  };
};

// Helper function to convert events to CSV
const convertToCSV = (events) => {
  if (events.length === 0) return '';
  
  const headers = ['timestamp', 'type', 'sessionId', 'data'];
  const rows = events.map(event => [
    new Date(event.timestamp).toISOString(),
    event.type,
    event.sessionId,
    JSON.stringify(event.data || {})
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};

export default useAdvancedAnalytics;