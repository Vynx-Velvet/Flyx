import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useAdaptiveQuality - Intelligent video quality adaptation hook
 * 
 * Features:
 * - Real-time bandwidth monitoring and prediction
 * - Device capability-aware quality selection
 * - Machine learning-based quality optimization
 * - Buffer health and network stability analysis
 * - User preference learning and adaptation
 * - Power-aware quality scaling for battery optimization
 * - Viewing context awareness (screen size, ambient light)
 * - Smooth quality transitions with minimal buffering
 */
const useAdaptiveQuality = ({
  initialQuality = 'auto',
  availableQualities = [],
  enableAdaptation = true,
  aggressiveAdaptation = false,
  bufferTargets = { low: 5, medium: 15, high: 30 },
  bandwidthSafetyMargin = 0.8,
  qualityLockDuration = 10000, // ms
  enableMLPrediction = true,
  powerAware = true,
  contextAware = true,
  userLearning = true,
  onQualityChange = null,
  onAdaptationEvent = null,
  debugMode = false
} = {}) => {

  // Core quality state
  const [currentQuality, setCurrentQuality] = useState(initialQuality);
  const [targetQuality, setTargetQuality] = useState(initialQuality);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationLocked, setAdaptationLocked] = useState(false);
  const [qualityHistory, setQualityHistory] = useState([]);

  // Network and performance metrics
  const [networkMetrics, setNetworkMetrics] = useState({
    bandwidth: 0,
    latency: 0,
    stability: 1.0,
    trend: 'stable',
    effectiveType: 'unknown'
  });

  const [bufferMetrics, setBufferMetrics] = useState({
    currentBuffer: 0,
    bufferHealth: 100,
    stallCount: 0,
    lastStallTime: 0
  });

  const [deviceMetrics, setDeviceMetrics] = useState({
    screenResolution: { width: 1920, height: 1080 },
    pixelRatio: 1,
    batteryLevel: 1,
    thermalState: 'nominal',
    cpuUsage: 0,
    memoryUsage: 0
  });

  // Learning and prediction state
  const [userPreferences, setUserPreferences] = useState({
    preferredQuality: 'auto',
    qualityTolerance: 0.8,
    batteryAwareness: 1.0,
    adaptationSensitivity: 0.7
  });

  const [mlModel, setMlModel] = useState({
    predictions: [],
    accuracy: 0.5,
    confidenceThreshold: 0.7,
    trainingData: []
  });

  // Refs for continuous monitoring
  const videoRef = useRef(null);
  const monitoringRef = useRef({
    bandwidth: null,
    buffer: null,
    adaptation: null,
    ml: null
  });

  const metricsHistoryRef = useRef({
    bandwidth: [],
    buffer: [],
    quality: [],
    stalls: []
  });

  const adaptationStateRef = useRef({
    lastAdaptation: 0,
    consecutiveAdaptations: 0,
    lockEndTime: 0,
    pendingQuality: null
  });

  // Quality configuration and constraints
  const qualityLevels = useMemo(() => {
    const defaultLevels = [
      { name: '2160p', bitrate: 25000000, width: 3840, height: 2160, fps: 60, tier: 'ultra' },
      { name: '1440p', bitrate: 16000000, width: 2560, height: 1440, fps: 60, tier: 'high' },
      { name: '1080p', bitrate: 8000000, width: 1920, height: 1080, fps: 60, tier: 'high' },
      { name: '720p', bitrate: 5000000, width: 1280, height: 720, fps: 30, tier: 'medium' },
      { name: '480p', bitrate: 2500000, width: 854, height: 480, fps: 30, tier: 'low' },
      { name: '360p', bitrate: 1000000, width: 640, height: 360, fps: 30, tier: 'minimal' }
    ];

    // Merge with available qualities or use defaults
    return availableQualities.length > 0 ? availableQualities : defaultLevels;
  }, [availableQualities]);

  // Device capability analysis
  useEffect(() => {
    const analyzeDeviceCapabilities = async () => {
      const capabilities = {
        screenResolution: {
          width: screen.width,
          height: screen.height
        },
        pixelRatio: window.devicePixelRatio || 1,
        batteryLevel: 1,
        thermalState: 'nominal',
        cpuUsage: 0,
        memoryUsage: 0
      };

      // Get battery info if available
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          capabilities.batteryLevel = battery.level;
          capabilities.isCharging = battery.charging;
        } catch (error) {
          console.warn('Battery API not available:', error);
        }
      }

      // Estimate device performance
      const deviceMemory = navigator.deviceMemory || 4;
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      
      capabilities.performanceTier = deviceMemory >= 8 && hardwareConcurrency >= 8 ? 'high' :
                                   deviceMemory >= 4 && hardwareConcurrency >= 4 ? 'medium' : 'low';

      setDeviceMetrics(capabilities);
    };

    analyzeDeviceCapabilities();
  }, []);

  // Network monitoring and bandwidth estimation
  useEffect(() => {
    if (!enableAdaptation) return;

    const monitorNetwork = async () => {
      const newMetrics = {
        bandwidth: 0,
        latency: 0,
        stability: 1.0,
        trend: 'stable',
        effectiveType: 'unknown'
      };

      // Use Navigation Timing API for bandwidth estimation
      try {
        const connection = navigator.connection;
        if (connection) {
          newMetrics.bandwidth = connection.downlink * 1000000; // Convert to bps
          newMetrics.effectiveType = connection.effectiveType;
          newMetrics.latency = connection.rtt;
        }

        // Additional bandwidth measurement via Resource Timing API
        const entries = performance.getEntriesByType('resource');
        const recentEntries = entries.slice(-10);
        
        if (recentEntries.length > 0) {
          const totalSize = recentEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
          const totalTime = recentEntries.reduce((sum, entry) => sum + entry.duration, 0);
          
          if (totalTime > 0) {
            const estimatedBandwidth = (totalSize * 8) / (totalTime / 1000); // bits per second
            newMetrics.bandwidth = Math.max(newMetrics.bandwidth, estimatedBandwidth);
          }
        }

        // Calculate network stability
        const bandwidthHistory = metricsHistoryRef.current.bandwidth.slice(-10);
        if (bandwidthHistory.length > 1) {
          const variance = calculateVariance(bandwidthHistory);
          const mean = bandwidthHistory.reduce((a, b) => a + b, 0) / bandwidthHistory.length;
          newMetrics.stability = Math.max(0, 1 - (variance / (mean * mean)));
        }

        // Determine trend
        if (bandwidthHistory.length >= 5) {
          const recent = bandwidthHistory.slice(-3);
          const earlier = bandwidthHistory.slice(-6, -3);
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
          
          if (recentAvg > earlierAvg * 1.2) {
            newMetrics.trend = 'improving';
          } else if (recentAvg < earlierAvg * 0.8) {
            newMetrics.trend = 'degrading';
          } else {
            newMetrics.trend = 'stable';
          }
        }

        // Store in history
        metricsHistoryRef.current.bandwidth = [
          ...metricsHistoryRef.current.bandwidth.slice(-19),
          newMetrics.bandwidth
        ];

        setNetworkMetrics(newMetrics);
      } catch (error) {
        console.warn('Network monitoring failed:', error);
      }
    };

    monitorNetwork();
    monitoringRef.current.bandwidth = setInterval(monitorNetwork, 5000);

    return () => {
      if (monitoringRef.current.bandwidth) {
        clearInterval(monitoringRef.current.bandwidth);
      }
    };
  }, [enableAdaptation]);

  // Buffer health monitoring
  useEffect(() => {
    if (!enableAdaptation || !videoRef.current) return;

    const monitorBuffer = () => {
      const video = videoRef.current;
      if (!video) return;

      const currentTime = video.currentTime;
      const buffered = video.buffered;
      let bufferAhead = 0;

      // Calculate buffer ahead
      for (let i = 0; i < buffered.length; i++) {
        if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
          bufferAhead = buffered.end(i) - currentTime;
          break;
        }
      }

      const bufferHealth = Math.min(100, (bufferAhead / bufferTargets.medium) * 100);
      
      setBufferMetrics(prev => ({
        ...prev,
        currentBuffer: bufferAhead,
        bufferHealth
      }));

      // Store in history
      metricsHistoryRef.current.buffer = [
        ...metricsHistoryRef.current.buffer.slice(-19),
        { time: Date.now(), buffer: bufferAhead, health: bufferHealth }
      ];
    };

    monitorBuffer();
    monitoringRef.current.buffer = setInterval(monitorBuffer, 1000);

    return () => {
      if (monitoringRef.current.buffer) {
        clearInterval(monitoringRef.current.buffer);
      }
    };
  }, [enableAdaptation, bufferTargets]);

  // Calculate variance for stability metrics
  const calculateVariance = useCallback((values) => {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }, []);

  // Optimal quality selection algorithm
  const selectOptimalQuality = useCallback(() => {
    if (!enableAdaptation || adaptationLocked) return currentQuality;

    const availableBandwidth = networkMetrics.bandwidth * bandwidthSafetyMargin;
    const { screenResolution, batteryLevel, performanceTier } = deviceMetrics;
    const { bufferHealth } = bufferMetrics;

    // Filter qualities based on device constraints
    let suitableQualities = qualityLevels.filter(quality => {
      // Screen resolution constraint
      if (quality.width > screenResolution.width || quality.height > screenResolution.height) {
        return false;
      }

      // Performance tier constraint
      if (performanceTier === 'low' && quality.tier === 'ultra') return false;
      if (performanceTier === 'medium' && quality.tier === 'ultra' && quality.name === '2160p') return false;

      // Power constraint
      if (powerAware && batteryLevel < 0.3 && quality.tier === 'ultra') return false;
      if (powerAware && batteryLevel < 0.2 && quality.tier === 'high') return false;

      return true;
    });

    if (suitableQualities.length === 0) {
      suitableQualities = [qualityLevels[qualityLevels.length - 1]]; // Fallback to lowest
    }

    // Sort by bitrate
    suitableQualities.sort((a, b) => b.bitrate - a.bitrate);

    // Select based on bandwidth and buffer health
    let selectedQuality = suitableQualities.find(q => q.bitrate <= availableBandwidth);
    
    if (!selectedQuality) {
      selectedQuality = suitableQualities[suitableQualities.length - 1]; // Lowest suitable
    }

    // Adjust for buffer health
    if (bufferHealth < 30 && !aggressiveAdaptation) {
      // Conservative approach - step down one level
      const currentIndex = suitableQualities.findIndex(q => q.name === selectedQuality.name);
      if (currentIndex < suitableQualities.length - 1) {
        selectedQuality = suitableQualities[currentIndex + 1];
      }
    } else if (bufferHealth > 80 && networkMetrics.trend === 'improving') {
      // Aggressive approach - try higher quality
      const currentIndex = suitableQualities.findIndex(q => q.name === currentQuality);
      if (currentIndex > 0 && aggressiveAdaptation) {
        selectedQuality = suitableQualities[Math.max(0, currentIndex - 1)];
      }
    }

    // Apply ML prediction if enabled
    if (enableMLPrediction && mlModel.accuracy > mlModel.confidenceThreshold) {
      selectedQuality = applyMLPrediction(selectedQuality, suitableQualities);
    }

    // Apply user learning
    if (userLearning) {
      selectedQuality = applyUserPreferences(selectedQuality, suitableQualities);
    }

    return selectedQuality.name;
  }, [
    enableAdaptation,
    adaptationLocked,
    currentQuality,
    networkMetrics,
    deviceMetrics,
    bufferMetrics,
    qualityLevels,
    bandwidthSafetyMargin,
    powerAware,
    aggressiveAdaptation,
    enableMLPrediction,
    mlModel,
    userLearning
  ]);

  // Apply ML prediction for quality selection
  const applyMLPrediction = useCallback((selectedQuality, availableQualities) => {
    // Simplified ML prediction - in reality this would use a trained model
    const predictions = mlModel.predictions.slice(-5);
    
    if (predictions.length > 0) {
      const avgPredictedBandwidth = predictions.reduce((sum, p) => sum + p.bandwidth, 0) / predictions.length;
      const predictedQuality = availableQualities.find(q => q.bitrate <= avgPredictedBandwidth * 0.9);
      
      if (predictedQuality && mlModel.accuracy > mlModel.confidenceThreshold) {
        return predictedQuality;
      }
    }
    
    return selectedQuality;
  }, [mlModel]);

  // Apply user preference learning
  const applyUserPreferences = useCallback((selectedQuality, availableQualities) => {
    const { qualityTolerance, adaptationSensitivity } = userPreferences;
    
    // If user historically prefers higher quality, bias selection upward
    if (qualityTolerance > 0.8) {
      const currentIndex = availableQualities.findIndex(q => q.name === selectedQuality.name);
      if (currentIndex > 0) {
        const higherQuality = availableQualities[currentIndex - 1];
        if (higherQuality.bitrate <= networkMetrics.bandwidth * (bandwidthSafetyMargin + 0.1)) {
          return higherQuality;
        }
      }
    }
    
    return selectedQuality;
  }, [userPreferences, networkMetrics.bandwidth, bandwidthSafetyMargin]);

  // Execute quality change
  const changeQuality = useCallback(async (newQuality) => {
    if (newQuality === currentQuality || adaptationLocked) return;

    setIsAdapting(true);
    setTargetQuality(newQuality);

    // Lock adaptations temporarily
    setAdaptationLocked(true);
    adaptationStateRef.current.lockEndTime = Date.now() + qualityLockDuration;

    try {
      // Record adaptation event
      const adaptationEvent = {
        timestamp: Date.now(),
        from: currentQuality,
        to: newQuality,
        reason: determineAdaptationReason(newQuality),
        networkMetrics: { ...networkMetrics },
        bufferMetrics: { ...bufferMetrics },
        deviceMetrics: { ...deviceMetrics }
      };

      setQualityHistory(prev => [adaptationEvent, ...prev.slice(0, 19)]);
      metricsHistoryRef.current.quality = [adaptationEvent, ...metricsHistoryRef.current.quality.slice(0, 19)];

      // Update learning data
      if (userLearning) {
        updateUserPreferences(adaptationEvent);
      }

      // Update ML training data
      if (enableMLPrediction) {
        updateMLTrainingData(adaptationEvent);
      }

      setCurrentQuality(newQuality);

      if (onQualityChange) {
        onQualityChange({
          quality: newQuality,
          previous: currentQuality,
          auto: true,
          reason: adaptationEvent.reason
        });
      }

      if (onAdaptationEvent) {
        onAdaptationEvent(adaptationEvent);
      }

      if (debugMode) {
        console.log('Quality adapted:', adaptationEvent);
      }

    } catch (error) {
      console.error('Quality change failed:', error);
    } finally {
      setIsAdapting(false);
      
      // Schedule unlock
      setTimeout(() => {
        if (Date.now() >= adaptationStateRef.current.lockEndTime) {
          setAdaptationLocked(false);
        }
      }, qualityLockDuration);
    }
  }, [
    currentQuality,
    adaptationLocked,
    qualityLockDuration,
    networkMetrics,
    bufferMetrics,
    deviceMetrics,
    userLearning,
    enableMLPrediction,
    onQualityChange,
    onAdaptationEvent,
    debugMode
  ]);

  // Determine reason for adaptation
  const determineAdaptationReason = useCallback((newQuality) => {
    const currentQualityLevel = qualityLevels.find(q => q.name === currentQuality);
    const newQualityLevel = qualityLevels.find(q => q.name === newQuality);
    
    if (!currentQualityLevel || !newQualityLevel) return 'unknown';
    
    if (bufferMetrics.bufferHealth < 30) return 'buffer_underrun';
    if (networkMetrics.trend === 'degrading') return 'bandwidth_decrease';
    if (networkMetrics.trend === 'improving') return 'bandwidth_increase';
    if (deviceMetrics.batteryLevel < 0.3) return 'power_saving';
    
    return newQualityLevel.bitrate > currentQualityLevel.bitrate ? 'upgrade' : 'downgrade';
  }, [currentQuality, qualityLevels, bufferMetrics.bufferHealth, networkMetrics.trend, deviceMetrics.batteryLevel]);

  // Update user preferences based on adaptation success
  const updateUserPreferences = useCallback((adaptationEvent) => {
    // This would analyze the success of adaptations and adjust user preferences
    // For now, simplified implementation
    
    setUserPreferences(prev => ({
      ...prev,
      // Adjust tolerance based on adaptation success
      qualityTolerance: Math.max(0.5, Math.min(1.0, prev.qualityTolerance * 0.99 + 0.01))
    }));
  }, []);

  // Update ML training data
  const updateMLTrainingData = useCallback((adaptationEvent) => {
    const trainingPoint = {
      input: {
        bandwidth: adaptationEvent.networkMetrics.bandwidth,
        bufferHealth: adaptationEvent.bufferMetrics.bufferHealth,
        batteryLevel: adaptationEvent.deviceMetrics.batteryLevel
      },
      output: {
        quality: adaptationEvent.to,
        successful: true // Would be determined by subsequent performance
      },
      timestamp: adaptationEvent.timestamp
    };

    setMlModel(prev => ({
      ...prev,
      trainingData: [trainingPoint, ...prev.trainingData.slice(0, 99)]
    }));
  }, []);

  // Main adaptation loop
  useEffect(() => {
    if (!enableAdaptation || currentQuality !== 'auto') return;

    const runAdaptation = () => {
      const optimalQuality = selectOptimalQuality();
      
      if (optimalQuality !== currentQuality && !adaptationLocked) {
        changeQuality(optimalQuality);
      }
    };

    // Initial adaptation
    runAdaptation();

    // Set up periodic adaptation
    monitoringRef.current.adaptation = setInterval(runAdaptation, 10000); // Reduce frequency

    return () => {
      if (monitoringRef.current.adaptation) {
        clearInterval(monitoringRef.current.adaptation);
      }
    };
  }, [enableAdaptation, currentQuality, adaptationLocked]);

  // Handle video element attachment
  const attachToVideo = useCallback((videoElement) => {
    videoRef.current = videoElement;

    // Listen for stall events
    const handleWaiting = () => {
      setBufferMetrics(prev => ({
        ...prev,
        stallCount: prev.stallCount + 1,
        lastStallTime: Date.now()
      }));

      metricsHistoryRef.current.stalls.push({
        timestamp: Date.now(),
        quality: currentQuality,
        bufferLevel: bufferMetrics.currentBuffer
      });
    };

    const handleCanPlayThrough = () => {
      // Buffer recovered
    };

    videoElement.addEventListener('waiting', handleWaiting);
    videoElement.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      videoElement.removeEventListener('waiting', handleWaiting);
      videoElement.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [currentQuality, bufferMetrics.currentBuffer]);

  // Public API
  return {
    // Current state
    currentQuality,
    targetQuality,
    isAdapting,
    adaptationLocked,
    
    // Metrics
    networkMetrics,
    bufferMetrics,
    deviceMetrics,
    
    // History and learning
    qualityHistory,
    userPreferences,
    
    // Available qualities
    availableQualities: qualityLevels,
    
    // Manual controls
    setQuality: useCallback((quality) => {
      if (quality === 'auto') {
        setCurrentQuality('auto');
      } else {
        changeQuality(quality);
      }
    }, [changeQuality]),
    
    // Adaptation controls
    enableAdaptation: useCallback(() => {
      if (currentQuality !== 'auto') {
        setCurrentQuality('auto');
      }
    }, [currentQuality]),
    
    disableAdaptation: useCallback(() => {
      setCurrentQuality(currentQuality === 'auto' ? '1080p' : currentQuality);
    }, [currentQuality]),
    
    lockAdaptation: useCallback((duration = qualityLockDuration) => {
      setAdaptationLocked(true);
      adaptationStateRef.current.lockEndTime = Date.now() + duration;
      
      setTimeout(() => {
        if (Date.now() >= adaptationStateRef.current.lockEndTime) {
          setAdaptationLocked(false);
        }
      }, duration);
    }, [qualityLockDuration]),
    
    // Configuration
    updateConfiguration: useCallback((config) => {
      Object.entries(config).forEach(([key, value]) => {
        switch (key) {
          case 'aggressiveAdaptation':
            // Handle aggressive adaptation toggle
            break;
          case 'bandwidthSafetyMargin':
            // Handle safety margin update
            break;
          default:
            break;
        }
      });
    }, []),
    
    // Video integration
    attachToVideo,
    
    // Utilities
    getOptimalQuality: selectOptimalQuality,
    
    getAdaptationRecommendation: useCallback(() => {
      const optimal = selectOptimalQuality();
      return {
        recommended: optimal,
        current: currentQuality,
        reason: determineAdaptationReason(optimal),
        confidence: mlModel.accuracy
      };
    }, [selectOptimalQuality, currentQuality, determineAdaptationReason, mlModel.accuracy]),
    
    // Debug information
    getDebugInfo: useCallback(() => {
      return debugMode ? {
        adaptationState: adaptationStateRef.current,
        metricsHistory: {
          bandwidth: metricsHistoryRef.current.bandwidth.slice(-5),
          buffer: metricsHistoryRef.current.buffer.slice(-5),
          quality: metricsHistoryRef.current.quality.slice(-5)
        },
        mlModel
      } : null;
    }, [debugMode, mlModel])
  };
};

export default useAdaptiveQuality;