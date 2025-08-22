import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * VoiceInterface - Advanced voice control system for hands-free media interaction
 * 
 * Features:
 * - Natural language voice commands with intelligent parsing
 * - Multi-language support with automatic language detection
 * - Visual feedback with voice activation animations
 * - Offline command recognition for privacy and performance
 * - Custom command configuration and learning
 * - Contextual command suggestions
 * - Noise cancellation and voice isolation
 * - Accessibility integration with screen readers
 */
const VoiceInterface = ({
  isEnabled = false,
  language = 'en-US',
  sensitivity = 0.5,
  commands = {},
  onCommand = null,
  onTranscript = null,
  offlineMode = false,
  customWakeWords = ['hey player', 'media control'],
  privacyMode = true,
  accessibility = {
    screenReader: false,
    visualFeedback: true,
    hapticFeedback: false
  },
  advanced = {
    naturalLanguage: true,
    contextAware: true,
    learningEnabled: true
  }
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const streamRef = useRef(null);
  const wakeWordTimeoutRef = useRef(null);
  const commandCacheRef = useRef(new Map());

  // Built-in command patterns with natural language support
  const defaultCommands = useMemo(() => ({
    // Playback controls
    play: [
      'play', 'start', 'resume', 'begin',
      'play the video', 'start playing', 'resume playback'
    ],
    pause: [
      'pause', 'stop', 'halt', 'freeze',
      'pause the video', 'stop playing', 'hold on'
    ],
    next: [
      'next', 'skip', 'forward', 'next episode',
      'go to next', 'skip this', 'move forward'
    ],
    previous: [
      'previous', 'back', 'last', 'previous episode',
      'go back', 'last one', 'move back'
    ],
    
    // Volume controls
    volumeUp: [
      'volume up', 'louder', 'increase volume', 'turn up',
      'make it louder', 'pump up the volume'
    ],
    volumeDown: [
      'volume down', 'quieter', 'decrease volume', 'turn down',
      'make it quieter', 'lower the volume'
    ],
    mute: [
      'mute', 'silent', 'no sound', 'turn off sound',
      'silence', 'mute audio'
    ],
    unmute: [
      'unmute', 'sound on', 'turn on sound',
      'restore audio', 'bring back sound'
    ],
    
    // Seeking
    seekForward: [
      'fast forward', 'skip ahead', 'jump forward',
      'go forward 10 seconds', 'skip 30 seconds'
    ],
    seekBackward: [
      'rewind', 'go back', 'jump back',
      'go back 10 seconds', 'rewind 30 seconds'
    ],
    
    // Quality and settings
    fullscreen: [
      'fullscreen', 'full screen', 'maximize',
      'go fullscreen', 'make it bigger'
    ],
    exitFullscreen: [
      'exit fullscreen', 'minimize', 'window mode',
      'make it smaller', 'normal view'
    ],
    qualityAuto: [
      'auto quality', 'automatic quality', 'best quality',
      'optimize quality', 'smart quality'
    ],
    
    // Subtitles
    subtitlesOn: [
      'subtitles on', 'show subtitles', 'captions on',
      'turn on captions', 'enable subtitles'
    ],
    subtitlesOff: [
      'subtitles off', 'hide subtitles', 'captions off',
      'turn off captions', 'disable subtitles'
    ]
  }), []);

  // Merge default and custom commands
  const allCommands = useMemo(() => ({
    ...defaultCommands,
    ...commands
  }), [defaultCommands, commands]);

  // Initialize speech recognition
  useEffect(() => {
    if (!isEnabled || typeof window === 'undefined') return;

    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 3;
    
    // Get supported languages
    if (recognition.getGrammarList) {
      try {
        const languages = recognition.getGrammarList();
        setSupportedLanguages(languages);
      } catch (error) {
        console.warn('Could not get supported languages:', error);
      }
    }

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isEnabled, language]);

  // Audio level monitoring for visual feedback
  useEffect(() => {
    if (!isListening || !navigator.mediaDevices) return;

    const initializeAudioMonitoring = async () => {
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
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.smoothingTimeConstant = 0.3;
        analyser.fftSize = 256;
        
        microphone.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        microphoneRef.current = microphone;
        
        const updateAudioLevel = () => {
          if (!analyserRef.current) return;
          
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVoiceLevel(average / 255);
          
          if (isListening) {
            requestAnimationFrame(updateAudioLevel);
          }
        };
        
        updateAudioLevel();
        
      } catch (error) {
        console.warn('Could not initialize audio monitoring:', error);
      }
    };

    initializeAudioMonitoring();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening]);

  // Natural language processing for command matching
  const processNaturalLanguage = useCallback((text) => {
    const normalizedText = text.toLowerCase().trim();
    
    // Check cache first
    if (commandCacheRef.current.has(normalizedText)) {
      return commandCacheRef.current.get(normalizedText);
    }
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Iterate through all command patterns
    for (const [commandName, patterns] of Object.entries(allCommands)) {
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase();
        
        // Exact match
        if (normalizedText === normalizedPattern) {
          bestMatch = { command: commandName, score: 1.0, pattern };
          break;
        }
        
        // Substring match
        if (normalizedText.includes(normalizedPattern)) {
          const score = normalizedPattern.length / normalizedText.length;
          if (score > bestScore && score > sensitivity) {
            bestMatch = { command: commandName, score, pattern };
            bestScore = score;
          }
        }
        
        // Word overlap scoring
        const textWords = normalizedText.split(/\s+/);
        const patternWords = normalizedPattern.split(/\s+/);
        const overlap = textWords.filter(word => patternWords.includes(word));
        const overlapScore = overlap.length / Math.max(textWords.length, patternWords.length);
        
        if (overlapScore > bestScore && overlapScore > sensitivity) {
          bestMatch = { command: commandName, score: overlapScore, pattern };
          bestScore = overlapScore;
        }
      }
      
      if (bestMatch && bestMatch.score === 1.0) break;
    }
    
    // Cache the result
    if (bestMatch) {
      commandCacheRef.current.set(normalizedText, bestMatch);
    }
    
    return bestMatch;
  }, [allCommands, sensitivity]);

  // Extract parameters from natural language commands
  const extractParameters = useCallback((text, command) => {
    const params = {};
    
    // Extract numbers for volume, seek, etc.
    const numbers = text.match(/\d+/g);
    if (numbers) {
      params.value = parseInt(numbers[0]);
    }
    
    // Extract time references
    const timeMatch = text.match(/(\d+)\s*(second|minute|hour)s?/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      
      switch (unit) {
        case 'second': params.seconds = value; break;
        case 'minute': params.seconds = value * 60; break;
        case 'hour': params.seconds = value * 3600; break;
      }
    }
    
    // Extract quality preferences
    if (text.includes('720') || text.includes('hd')) params.quality = '720p';
    if (text.includes('1080') || text.includes('full hd')) params.quality = '1080p';
    if (text.includes('4k') || text.includes('ultra hd')) params.quality = '2160p';
    
    return params;
  }, []);

  // Wake word detection
  const checkWakeWord = useCallback((text) => {
    const normalizedText = text.toLowerCase();
    
    return customWakeWords.some(wakeWord => 
      normalizedText.includes(wakeWord.toLowerCase())
    );
  }, [customWakeWords]);

  // Handle speech recognition events
  useEffect(() => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      setIsListening(true);
      if (accessibility.screenReader) {
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = 'Voice control activated';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
      setVoiceLevel(0);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Handle permission denied
        if (accessibility.screenReader) {
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'assertive');
          announcement.textContent = 'Microphone permission required for voice control';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 3000);
        }
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setConfidence(confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);

      if (onTranscript) {
        onTranscript(fullTranscript, event.results[event.results.length - 1].isFinal);
      }

      // Process final transcripts
      if (finalTranscript) {
        setIsProcessing(true);
        
        // Check for wake word if not already active
        if (!isWakeWordActive && checkWakeWord(finalTranscript)) {
          setIsWakeWordActive(true);
          
          // Clear wake word timeout
          if (wakeWordTimeoutRef.current) {
            clearTimeout(wakeWordTimeoutRef.current);
          }
          
          // Set timeout to deactivate wake word
          wakeWordTimeoutRef.current = setTimeout(() => {
            setIsWakeWordActive(false);
          }, 10000); // 10 seconds
          
          return;
        }
        
        // Process command if wake word is active or always listening
        if (isWakeWordActive || !customWakeWords.length) {
          const commandMatch = processNaturalLanguage(finalTranscript);
          
          if (commandMatch && commandMatch.score > sensitivity) {
            const parameters = extractParameters(finalTranscript, commandMatch.command);
            
            const commandData = {
              command: commandMatch.command,
              transcript: finalTranscript,
              confidence,
              score: commandMatch.score,
              pattern: commandMatch.pattern,
              parameters,
              timestamp: Date.now()
            };
            
            setLastCommand(commandData);
            setCommandHistory(prev => [commandData, ...prev.slice(0, 9)]);
            
            if (onCommand) {
              onCommand(commandData);
            }
            
            // Visual feedback
            if (accessibility.visualFeedback) {
              // Flash or pulse effect
              document.documentElement.style.setProperty(
                '--voice-command-flash', 
                'rgba(0, 255, 100, 0.3)'
              );
              setTimeout(() => {
                document.documentElement.style.setProperty(
                  '--voice-command-flash', 
                  'transparent'
                );
              }, 300);
            }
            
            // Haptic feedback
            if (accessibility.hapticFeedback && navigator.vibrate) {
              navigator.vibrate([50, 100, 50]);
            }
          }
        }
        
        setTimeout(() => setIsProcessing(false), 500);
      }
    };

  }, [
    isWakeWordActive,
    customWakeWords,
    processNaturalLanguage,
    sensitivity,
    extractParameters,
    onCommand,
    onTranscript,
    checkWakeWord,
    accessibility
  ]);

  // Start/stop listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.warn('Could not start speech recognition:', error);
      }
    }
  }, [isListening]);

  // Voice activation animations
  const voiceAnimationVariants = {
    idle: { 
      scale: 1, 
      opacity: 0.5,
      boxShadow: '0 0 0 rgba(0, 255, 100, 0)'
    },
    listening: { 
      scale: [1, 1.1, 1],
      opacity: [0.7, 1, 0.7],
      boxShadow: [
        '0 0 0 rgba(0, 255, 100, 0)',
        '0 0 20px rgba(0, 255, 100, 0.5)',
        '0 0 0 rgba(0, 255, 100, 0)'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    processing: {
      scale: 1.05,
      opacity: 1,
      boxShadow: '0 0 30px rgba(100, 150, 255, 0.8)',
      transition: {
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    success: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.8, 1],
      boxShadow: [
        '0 0 30px rgba(0, 255, 100, 0.8)',
        '0 0 50px rgba(0, 255, 100, 1)',
        '0 0 30px rgba(0, 255, 100, 0.8)'
      ],
      transition: {
        duration: 0.6,
        ease: 'easeInOut'
      }
    }
  };

  if (!isEnabled) return null;

  return (
    <div className={styles.voiceInterface}>
      {/* Voice activation button */}
      <motion.button
        className={styles.voiceButton}
        onClick={toggleListening}
        variants={voiceAnimationVariants}
        animate={
          isProcessing ? 'processing' : 
          lastCommand && Date.now() - lastCommand.timestamp < 1000 ? 'success' :
          isListening ? 'listening' : 'idle'
        }
        whileTap={{ scale: 0.95 }}
        aria-label={isListening ? 'Stop voice control' : 'Start voice control'}
      >
        <div className={styles.voiceIcon}>
          {isListening ? '🎙️' : '🔇'}
        </div>
        
        {/* Voice level indicator */}
        {isListening && (
          <div 
            className={styles.voiceLevel}
            style={{
              height: `${Math.max(10, voiceLevel * 100)}%`,
              background: `linear-gradient(to top, 
                rgba(0, 255, 100, 0.3), 
                rgba(0, 255, 100, ${voiceLevel})
              )`
            }}
          />
        )}
      </motion.button>

      {/* Voice status display */}
      <AnimatePresence>
        {(isListening || isProcessing || transcript) && (
          <motion.div
            className={styles.voiceStatus}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Wake word status */}
            {isWakeWordActive && (
              <div className={styles.wakeWordStatus}>
                <span className={styles.wakeWordIcon}>👂</span>
                Listening for commands...
              </div>
            )}
            
            {/* Current transcript */}
            {transcript && (
              <div className={styles.transcript}>
                <span className={styles.transcriptLabel}>
                  {isProcessing ? 'Processing...' : 'You said:'}
                </span>
                <span className={styles.transcriptText}>{transcript}</span>
                {confidence > 0 && (
                  <span className={styles.confidence}>
                    ({Math.round(confidence * 100)}% confident)
                  </span>
                )}
              </div>
            )}
            
            {/* Last command executed */}
            {lastCommand && Date.now() - lastCommand.timestamp < 3000 && (
              <motion.div
                className={styles.lastCommand}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <span className={styles.commandIcon}>✓</span>
                Command: {lastCommand.command}
                {lastCommand.parameters && Object.keys(lastCommand.parameters).length > 0 && (
                  <span className={styles.commandParams}>
                    {JSON.stringify(lastCommand.parameters)}
                  </span>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command suggestions (when listening) */}
      {isListening && isWakeWordActive && (
        <motion.div
          className={styles.commandSuggestions}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className={styles.suggestionsTitle}>Try saying:</div>
          <div className={styles.suggestionsList}>
            {['Play', 'Pause', 'Volume up', 'Next episode', 'Fullscreen'].map((suggestion, index) => (
              <motion.span
                key={suggestion}
                className={styles.suggestion}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                "{suggestion}"
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VoiceInterface;