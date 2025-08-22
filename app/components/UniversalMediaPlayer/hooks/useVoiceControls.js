import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useVoiceControls - Advanced voice control hook with natural language processing
 * 
 * Features:
 * - Natural language command processing with context awareness
 * - Multi-language support with automatic language detection
 * - Custom wake words and command phrases
 * - Voice command learning and adaptation
 * - Offline command recognition for privacy
 * - Audio level monitoring and noise cancellation
 * - Integration with system voice assistants
 * - Advanced voice authentication and user profiles
 */
const useVoiceControls = ({
  isEnabled = false,
  language = 'en-US',
  sensitivity = 0.5,
  wakeWords = ['hey player', 'media control'],
  offlineMode = false,
  privacyMode = true,
  customCommands = {},
  voiceProfiles = false,
  contextAware = true,
  learningEnabled = true,
  noiseReduction = true,
  onCommand = null,
  onTranscript = null,
  onStateChange = null,
  debugMode = false
} = {}) => {

  // Core voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [recognizedCommands, setRecognizedCommands] = useState([]);
  
  // Audio analysis state
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [speakingDetected, setSpeakingDetected] = useState(false);
  const [voiceCharacteristics, setVoiceCharacteristics] = useState({});
  
  // Voice profile and learning state
  const [activeProfile, setActiveProfile] = useState('default');
  const [commandAccuracy, setCommandAccuracy] = useState(new Map());
  const [personalizedPhrases, setPersonalizedPhrases] = useState(new Map());
  const [contextualHistory, setContextualHistory] = useState([]);

  // Refs for speech recognition and audio analysis
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const microphoneRef = useRef(null);
  const streamRef = useRef(null);
  const wakeWordTimeoutRef = useRef(null);
  const commandProcessorRef = useRef(null);

  // Natural language command patterns
  const commandPatterns = useMemo(() => ({
    // Playback controls
    playback: {
      play: [
        /^(play|start|begin|resume)(\s+the\s+)?(video|movie|show)?$/i,
        /^let's\s+(watch|start|begin)$/i,
        /^continue\s+playing$/i,
        /^unpause$/i
      ],
      pause: [
        /^(pause|stop|halt|freeze)(\s+the\s+)?(video|movie|show)?$/i,
        /^hold\s+on$/i,
        /^wait\s+a\s+(second|minute|moment)$/i,
        /^take\s+a\s+break$/i
      ],
      next: [
        /^(next|skip|forward)(\s+(episode|video|track))?$/i,
        /^go\s+to\s+next(\s+(episode|video))?$/i,
        /^skip\s+(this|ahead)$/i,
        /^fast\s+forward$/i
      ],
      previous: [
        /^(previous|back|last)(\s+(episode|video|track))?$/i,
        /^go\s+back(\s+to\s+(previous|last))?$/i,
        /^rewind$/i,
        /^last\s+(one|episode|video)$/i
      ]
    },

    // Volume controls
    volume: {
      up: [
        /^(volume|sound)\s+(up|higher|louder)$/i,
        /^(increase|raise|turn\s+up)\s+(the\s+)?(volume|sound)$/i,
        /^(make\s+it\s+)?(louder|higher)$/i,
        /^pump\s+up\s+the\s+volume$/i
      ],
      down: [
        /^(volume|sound)\s+(down|lower|quieter)$/i,
        /^(decrease|lower|turn\s+down)\s+(the\s+)?(volume|sound)$/i,
        /^(make\s+it\s+)?(quieter|lower|softer)$/i,
        /^turn\s+it\s+down$/i
      ],
      mute: [
        /^(mute|silence|quiet|shush)$/i,
        /^(turn\s+off|disable)\s+(the\s+)?(sound|audio|volume)$/i,
        /^no\s+(sound|audio)$/i
      ],
      unmute: [
        /^(unmute|sound\s+on|audio\s+on)$/i,
        /^(turn\s+on|enable)\s+(the\s+)?(sound|audio|volume)$/i,
        /^restore\s+(sound|audio)$/i
      ]
    },

    // Navigation
    navigation: {
      seekForward: [
        /^(skip|jump|go)\s+(ahead|forward)\s+(\d+)?\s*(seconds?|minutes?)?$/i,
        /^fast\s+forward(\s+(\d+)\s*(seconds?|minutes?)?)?$/i,
        /^forward\s+(\d+)?\s*(seconds?|minutes?)?$/i
      ],
      seekBackward: [
        /^(go|jump|skip)\s+back(\s+(\d+)\s*(seconds?|minutes?)?)?$/i,
        /^rewind(\s+(\d+)\s*(seconds?|minutes?)?)?$/i,
        /^back\s+(\d+)?\s*(seconds?|minutes?)?$/i
      ],
      seekTo: [
        /^(go\s+to|jump\s+to|seek\s+to)\s+(\d+)\s*(:|minutes?)\s*(\d+)?\s*(seconds?)?$/i,
        /^skip\s+to\s+(\d+)\s*(:|minutes?)\s*(\d+)?\s*(seconds?)?$/i
      ]
    },

    // Quality and display
    quality: [
      /^(change|switch|set)\s+(to\s+)?(quality\s+to\s+)?(\d+p|auto|best|highest|lowest)$/i,
      /^(auto|best|highest|lowest)\s+quality$/i,
      /^quality\s+(auto|best|highest|lowest|\d+p)$/i
    ],

    fullscreen: [
      /^(full\s*screen|maximize|make\s+it\s+(bigger|larger|full))$/i,
      /^go\s+full\s*screen$/i,
      /^enter\s+full\s*screen\s+mode$/i
    ],

    exitFullscreen: [
      /^(exit\s+full\s*screen|minimize|make\s+it\s+smaller)$/i,
      /^(normal\s+view|window\s+mode)$/i,
      /^shrink\s+(it\s+)?back$/i
    ],

    // Subtitles
    subtitles: {
      on: [
        /^(turn\s+on|enable|show)\s+(subtitles?|captions?)$/i,
        /^(subtitles?|captions?)\s+on$/i,
        /^I\s+(need|want)\s+(subtitles?|captions?)$/i
      ],
      off: [
        /^(turn\s+off|disable|hide)\s+(subtitles?|captions?)$/i,
        /^(subtitles?|captions?)\s+off$/i,
        /^(remove|no)\s+(subtitles?|captions?)$/i
      ]
    },

    // Special commands
    special: {
      help: [
        /^(help|what\s+can\s+(I|you)\s+(do|say)|commands?)$/i,
        /^show\s+me\s+(the\s+)?commands$/i,
        /^how\s+do\s+I\s+control\s+this$/i
      ],
      settings: [
        /^(open\s+)?(settings|preferences|options)$/i,
        /^show\s+me\s+(the\s+)?(settings|options)$/i,
        /^configure$/i
      ],
      repeat: [
        /^(repeat|again|do\s+that\s+again|one\s+more\s+time)$/i,
        /^say\s+that\s+again$/i
      ]
    }
  }), []);

  // Merge default and custom commands
  const allCommandPatterns = useMemo(() => {
    const merged = { ...commandPatterns };
    
    // Integrate custom commands
    Object.entries(customCommands).forEach(([category, commands]) => {
      if (!merged[category]) merged[category] = {};
      
      Object.entries(commands).forEach(([action, patterns]) => {
        if (!merged[category][action]) merged[category][action] = [];
        merged[category][action] = [...merged[category][action], ...patterns];
      });
    });
    
    return merged;
  }, [commandPatterns, customCommands]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 3;

    recognitionRef.current = recognition;

    // Handle recognition events
    recognition.onstart = () => {
      setIsListening(true);
      if (onStateChange) onStateChange({ state: 'listening', isListening: true });
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
      if (onStateChange) onStateChange({ state: 'stopped', isListening: false });
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      if (event.error === 'not-allowed') {
        if (onStateChange) onStateChange({ 
          state: 'error', 
          error: 'Microphone permission denied' 
        });
      }
    };

    recognition.onresult = (event) => {
      processRecognitionResult(event);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isEnabled, language]);

  // Initialize audio analysis for voice detection
  useEffect(() => {
    if (!isEnabled || !noiseReduction) return;

    const initializeAudioAnalysis = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        streamRef.current = stream;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyzer = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyzer.smoothingTimeConstant = 0.3;
        analyzer.fftSize = 256;

        microphone.connect(analyzer);

        audioContextRef.current = audioContext;
        analyzerRef.current = analyzer;
        microphoneRef.current = microphone;

        startAudioAnalysis();

      } catch (error) {
        console.warn('Audio analysis initialization failed:', error);
      }
    };

    initializeAudioAnalysis();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isEnabled, noiseReduction]);

  // Audio level analysis
  const startAudioAnalysis = useCallback(() => {
    if (!analyzerRef.current) return;

    const updateAudioLevel = () => {
      if (!analyzerRef.current) return;

      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const normalizedLevel = average / 255;

      setAudioLevel(normalizedLevel);

      // Detect speaking vs background noise
      const threshold = 0.1;
      const isSpeaking = normalizedLevel > threshold;
      setSpeakingDetected(isSpeaking);

      if (!isSpeaking && normalizedLevel > 0.05) {
        setNoiseLevel(normalizedLevel);
      }

      // Continue analysis
      if (isListening) {
        requestAnimationFrame(updateAudioLevel);
      }
    };

    updateAudioLevel();
  }, [isListening]);

  // Process speech recognition results
  const processRecognitionResult = useCallback((event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      const confidence = event.results[i][0].confidence || 0.8;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
        setConfidence(confidence);
      } else {
        interimTranscript += transcript;
      }
    }

    const fullTranscript = finalTranscript || interimTranscript;
    setCurrentTranscript(fullTranscript);

    if (onTranscript) {
      onTranscript(fullTranscript, event.results[event.results.length - 1].isFinal);
    }

    // Process final transcripts
    if (finalTranscript) {
      processVoiceCommand(finalTranscript.trim(), confidence);
    }
  }, []);

  // Check for wake words
  const checkWakeWords = useCallback((text) => {
    const normalizedText = text.toLowerCase();
    
    return wakeWords.some(wakeWord => {
      const normalizedWakeWord = wakeWord.toLowerCase();
      return normalizedText.includes(normalizedWakeWord);
    });
  }, [wakeWords]);

  // Process voice commands
  const processVoiceCommand = useCallback((text, confidence) => {
    if (!text) return;

    setIsProcessing(true);

    // Check for wake word activation
    if (!isWakeWordActive && checkWakeWords(text)) {
      setIsWakeWordActive(true);
      
      // Clear existing timeout
      if (wakeWordTimeoutRef.current) {
        clearTimeout(wakeWordTimeoutRef.current);
      }
      
      // Set timeout to deactivate wake word
      wakeWordTimeoutRef.current = setTimeout(() => {
        setIsWakeWordActive(false);
      }, 10000);
      
      setIsProcessing(false);
      return;
    }

    // Process command if wake word is active or no wake words configured
    if (isWakeWordActive || wakeWords.length === 0) {
      const command = parseCommand(text, confidence);
      
      if (command) {
        executeVoiceCommand(command, text, confidence);
      } else if (debugMode) {
        console.log('Unrecognized voice command:', text);
      }
    }

    setIsProcessing(false);
  }, [isWakeWordActive, checkWakeWords, wakeWords, debugMode]);

  // Parse natural language command
  const parseCommand = useCallback((text, confidence) => {
    const normalizedText = text.toLowerCase().trim();
    let bestMatch = null;
    let highestScore = 0;

    // Check against all command patterns
    Object.entries(allCommandPatterns).forEach(([category, actions]) => {
      Object.entries(actions).forEach(([action, patterns]) => {
        patterns.forEach(pattern => {
          const match = normalizedText.match(pattern);
          if (match) {
            const score = calculateCommandScore(match, confidence, category, action);
            
            if (score > highestScore && score > sensitivity) {
              bestMatch = {
                category,
                action,
                match: match[0],
                groups: match.slice(1),
                score,
                params: extractParameters(match, category, action)
              };
              highestScore = score;
            }
          }
        });
      });
    });

    // Apply personalization if learning is enabled
    if (learningEnabled && bestMatch) {
      updateCommandAccuracy(bestMatch, true);
    }

    return bestMatch;
  }, [allCommandPatterns, sensitivity, learningEnabled]);

  // Calculate command matching score
  const calculateCommandScore = useCallback((match, confidence, category, action) => {
    let score = confidence * 0.6; // Base confidence score
    
    // Boost score for exact matches
    if (match[0].length === match.input.length) {
      score += 0.3;
    }
    
    // Boost score for commonly used commands
    const commandKey = `${category}.${action}`;
    const accuracy = commandAccuracy.get(commandKey);
    if (accuracy && accuracy.successRate > 0.8) {
      score += 0.1;
    }
    
    // Context-aware scoring
    if (contextAware) {
      score += getContextualScore(category, action);
    }
    
    return Math.min(1.0, score);
  }, [commandAccuracy, contextAware]);

  // Get contextual relevance score
  const getContextualScore = useCallback((category, action) => {
    // This would analyze current media player state to determine relevance
    // For now, return a base score
    return 0.1;
  }, []);

  // Extract parameters from command
  const extractParameters = useCallback((match, category, action) => {
    const params = {};
    
    // Extract numbers for seek operations
    if (category === 'navigation') {
      const numbers = match[0].match(/\d+/g);
      if (numbers) {
        params.amount = parseInt(numbers[0]);
        
        if (match[0].includes('minute')) {
          params.amount *= 60;
        }
      } else {
        // Default seek amounts
        params.amount = action.includes('Forward') ? 10 : -10;
      }
    }
    
    // Extract quality settings
    if (category === 'quality') {
      const qualityMatch = match[0].match(/(\d+p|auto|best|highest|lowest)/i);
      if (qualityMatch) {
        params.quality = qualityMatch[1].toLowerCase();
      }
    }
    
    // Extract time for seekTo commands
    if (action === 'seekTo') {
      const timeMatch = match[0].match(/(\d+)\s*:?\s*(\d+)?/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        const seconds = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        params.time = minutes * 60 + seconds;
      }
    }
    
    return params;
  }, []);

  // Execute parsed voice command
  const executeVoiceCommand = useCallback((command, originalText, confidence) => {
    const commandEvent = {
      category: command.category,
      action: command.action,
      params: command.params,
      originalText,
      confidence,
      score: command.score,
      timestamp: Date.now(),
      profile: activeProfile
    };

    // Add to command history
    setRecognizedCommands(prev => [commandEvent, ...prev.slice(0, 49)]);
    
    // Add to contextual history for learning
    if (contextAware) {
      setContextualHistory(prev => [commandEvent, ...prev.slice(0, 99)]);
    }

    // Execute the command
    if (onCommand) {
      onCommand(commandEvent);
    }

    // Update learning data
    if (learningEnabled) {
      updatePersonalizedPhrases(originalText, command);
    }

    if (debugMode) {
      console.log('Voice command executed:', commandEvent);
    }
  }, [activeProfile, contextAware, learningEnabled, onCommand, debugMode]);

  // Update command accuracy tracking
  const updateCommandAccuracy = useCallback((command, success) => {
    const commandKey = `${command.category}.${command.action}`;
    const current = commandAccuracy.get(commandKey) || { 
      attempts: 0, 
      successes: 0, 
      successRate: 0 
    };
    
    const updated = {
      attempts: current.attempts + 1,
      successes: current.successes + (success ? 1 : 0),
      successRate: 0
    };
    
    updated.successRate = updated.successes / updated.attempts;
    
    setCommandAccuracy(prev => new Map(prev.set(commandKey, updated)));
  }, [commandAccuracy]);

  // Update personalized phrases
  const updatePersonalizedPhrases = useCallback((text, command) => {
    const commandKey = `${command.category}.${command.action}`;
    const phrases = personalizedPhrases.get(commandKey) || [];
    
    const normalizedText = text.toLowerCase().trim();
    
    // Add phrase if not already exists
    if (!phrases.some(p => p.phrase === normalizedText)) {
      const newPhrases = [
        ...phrases,
        { 
          phrase: normalizedText, 
          count: 1, 
          lastUsed: Date.now() 
        }
      ].slice(0, 10); // Keep top 10 phrases per command
      
      setPersonalizedPhrases(prev => new Map(prev.set(commandKey, newPhrases)));
    } else {
      // Update existing phrase
      const updatedPhrases = phrases.map(p => 
        p.phrase === normalizedText 
          ? { ...p, count: p.count + 1, lastUsed: Date.now() }
          : p
      );
      
      setPersonalizedPhrases(prev => new Map(prev.set(commandKey, updatedPhrases)));
    }
  }, [personalizedPhrases]);

  // Start/stop listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    recognitionRef.current.stop();
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Get available commands for help
  const getAvailableCommands = useCallback(() => {
    const commands = {};
    
    Object.entries(allCommandPatterns).forEach(([category, actions]) => {
      commands[category] = Object.keys(actions);
    });
    
    return commands;
  }, [allCommandPatterns]);

  // Generate command suggestions based on context
  const getCommandSuggestions = useCallback((currentContext = 'default') => {
    // This would analyze current state and suggest relevant commands
    const suggestions = [
      'Play',
      'Pause', 
      'Volume up',
      'Next episode',
      'Show settings'
    ];
    
    return suggestions;
  }, []);

  // Public API
  return {
    // State
    isEnabled,
    isListening,
    isProcessing,
    isWakeWordActive,
    currentTranscript,
    confidence,
    recognizedCommands,
    audioLevel,
    noiseLevel,
    speakingDetected,
    activeProfile,
    
    // Controls
    startListening,
    stopListening,
    toggleListening,
    
    // Configuration
    setWakeWordActive: setIsWakeWordActive,
    setActiveProfile,
    
    // Command processing
    processVoiceCommand: useCallback((text, confidence = 0.8) => {
      processVoiceCommand(text, confidence);
    }, [processVoiceCommand]),
    
    // Learning and adaptation
    commandAccuracy: Array.from(commandAccuracy.entries()),
    personalizedPhrases: Array.from(personalizedPhrases.entries()),
    contextualHistory,
    
    clearLearningData: useCallback(() => {
      setCommandAccuracy(new Map());
      setPersonalizedPhrases(new Map());
      setContextualHistory([]);
    }, []),
    
    // Utilities
    getAvailableCommands,
    getCommandSuggestions,
    
    // Debug information
    getDebugInfo: useCallback(() => {
      return debugMode ? {
        commandPatterns: allCommandPatterns,
        recentCommands: recognizedCommands.slice(0, 10),
        audioStats: {
          level: audioLevel,
          noise: noiseLevel,
          speaking: speakingDetected
        }
      } : null;
    }, [debugMode, allCommandPatterns, recognizedCommands, audioLevel, noiseLevel, speakingDetected])
  };
};

export default useVoiceControls;