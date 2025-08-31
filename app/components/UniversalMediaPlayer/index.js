/**
 * Universal Media Player - Complete Export System
 * 
 * A revolutionary, AI-powered media player with advanced features including:
 * - Intelligent adaptive streaming and quality management
 * - Content-aware subtitle positioning and styling
 * - Immersive ambient lighting synchronized to video content
 * - Advanced gesture and voice control systems
 * - Real-time analytics and user behavior tracking
 * - Smart buffering with predictive loading
 * - Cross-platform compatibility and accessibility
 * - Glassmorphism design with particle effects
 * - Comprehensive performance monitoring
 * - A/B testing and collaborative features
 */

/**
 * Universal Media Player - Complete Export System (Refactored)
 *
 * This is the new, fully refactored version of the Universal Media Player
 * with improved architecture, performance, and maintainability.
 */

// ===== MAIN COMPONENTS =====
import FuturisticMediaPlayerRefactored from './FuturisticMediaPlayerRefactored';
export { default as FuturisticMediaPlayer } from './FuturisticMediaPlayerRefactored';
export { default as FuturisticMediaPlayerDemo } from './FuturisticMediaPlayerDemo';

// Legacy component (deprecated - use FuturisticMediaPlayer instead)
export { default as FuturisticMediaPlayerLegacy } from './FuturisticMediaPlayer';

// Default export - the refactored player
export default FuturisticMediaPlayerRefactored;


// ===== MODULAR COMPONENTS =====
export { default as MediaControls } from './components/MediaControls';
export { default as IntelligentSubtitles } from './components/IntelligentSubtitles';
export { default as AmbientLighting } from './components/AmbientLighting';
export { default as VoiceInterface } from './components/VoiceInterface';
export { default as GestureOverlay } from './components/GestureOverlay';
export { default as AdvancedSettings } from './components/AdvancedSettings';
export { default as PerformanceDashboard } from './components/PerformanceDashboard';
export { default as EpisodeCarousel } from './components/EpisodeCarousel';
export { default as NextEpisodePrompt } from './components/NextEpisodePrompt';
export { default as PictureInPicture } from './components/PictureInPicture';
export { default as AdaptiveLoading } from './components/AdaptiveLoading';
export { default as WatchProgressIndicator, EpisodeProgressOverlay, ShowProgressSummary } from './components/WatchProgressIndicator';
export { default as ResumeDialog } from './components/ResumeDialog';

// ===== CORE HOOKS =====
export { default as useMediaPlayer } from './hooks/useMediaPlayer';
export { default as usePlayerUI } from './hooks/usePlayerUI';
export { default as useEnhancedErrorHandling } from './hooks/useEnhancedErrorHandling';
export { default as usePerformanceOptimization } from './hooks/usePerformanceOptimization';

// ===== EXISTING HOOKS =====
export { default as useStream } from './hooks/useStream';
export { useEnhancedSubtitles } from '../../hooks/useEnhancedSubtitles';
export { default as useFetchMediaDetails } from './hooks/useFetchMediaDetails';
export { default as useEpisodeNavigation } from './hooks/useEpisodeNavigation';
export { default as useAutoAdvance } from './hooks/useAutoAdvance';
export { default as useWatchProgress } from './hooks/useWatchProgress';

// CSS Modules
export { default as playerStyles } from './FuturisticMediaPlayer.module.css';

// ===== TYPE SCRIPT SUPPORT =====
// Note: TypeScript definitions are available in ./types/index.ts for TypeScript projects
// Import them directly: import * as Types from './types/index.js' (when using a TypeScript environment)

// Constants
export const PLAYER_THEMES = ['dark', 'light', 'auto'];
export const MEDIA_TYPES = ['movie', 'tv'];
export const FULLSCREEN_MODES = ['standard', 'immersive', 'cinema'];

// Default configurations
export const DEFAULT_PLAYER_CONFIG = {
  enableAdvancedFeatures: true,
  theme: 'dark',
  ambientLighting: true,
  gestureControls: true,
  voiceControls: true,
  adaptiveQuality: true,
  collaborativeMode: false
};

export const DEFAULT_ANALYTICS_CONFIG = {
  isEnabled: true,
  privacyMode: true,
  anonymizeData: true,
  batchSize: 50,
  flushInterval: 30000,
  retentionDays: 90,
  enablePredictive: true,
  abTestingEnabled: false
};

// Feature flags for gradual rollout
export const FEATURE_FLAGS = {
  AI_QUALITY_ADAPTATION: true,
  VOICE_COMMANDS: true,
  GESTURE_CONTROLS: true,
  AMBIENT_LIGHTING: true,
  PARTICLE_EFFECTS: true,
  SCENE_DETECTION: true,
  PREDICTIVE_BUFFERING: true,
  CONTENT_AWARE_SUBTITLES: true,
  COLLABORATIVE_MODE: false,
  ADVANCED_ANALYTICS: true,
  PERFORMANCE_MONITORING: true,
  ACCESSIBILITY_FEATURES: true
};

// Utility functions
export const createPlayerInstance = (config = {}) => {
  return {
    ...DEFAULT_PLAYER_CONFIG,
    ...config
  };
};

export const validatePlayerConfig = (config) => {
  const requiredFields = ['theme'];
  const errors = [];
  
  requiredFields.forEach(field => {
    if (!config.hasOwnProperty(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  if (config.theme && !PLAYER_THEMES.includes(config.theme)) {
    errors.push(`Invalid theme: ${config.theme}. Must be one of: ${PLAYER_THEMES.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Analytics utilities
export const createAnalyticsTracker = (config = {}) => {
  return {
    ...DEFAULT_ANALYTICS_CONFIG,
    ...config
  };
};

// Performance utilities
export const getPlayerCapabilities = () => {
  return {
    supportsHLS: !!(window.MediaSource || window.WebKitMediaSource),
    supportsDASH: !!(window.MediaSource && MediaSource.isTypeSupported),
    supportsWebRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
    supportsWebGL: (() => {
      try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      } catch (e) {
        return false;
      }
    })(),
    supportsWebAssembly: typeof WebAssembly === 'object',
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsFullscreen: !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
    supportsPictureInPicture: 'pictureInPictureEnabled' in document,
    supportsVibration: 'vibrate' in navigator,
    supportsGamepad: 'getGamepads' in navigator,
    supportsSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    supportsWebAudio: !!(window.AudioContext || window.webkitAudioContext),
    supportsBattery: 'getBattery' in navigator,
    supportsDeviceOrientation: 'DeviceOrientationEvent' in window,
    supportsTouchEvents: 'ontouchstart' in window,
    supportsPointerEvents: 'PointerEvent' in window
  };
};

// Browser compatibility check
export const checkBrowserCompatibility = () => {
  const capabilities = getPlayerCapabilities();
  const requiredFeatures = [
    'supportsHLS',
    'supportsWebGL',
    'supportsFullscreen'
  ];
  
  const missingFeatures = requiredFeatures.filter(feature => !capabilities[feature]);
  
  return {
    isCompatible: missingFeatures.length === 0,
    missingFeatures,
    capabilities,
    recommendations: missingFeatures.length > 0 ? [
      'Please update your browser for the best experience',
      'Some advanced features may not be available'
    ] : [
      'Your browser supports all advanced features!'
    ]
  };
};

// Version and build information
export const VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES_COUNT = Object.keys(FEATURE_FLAGS).length;

// Quick start helper
export const quickStart = {
  // Basic movie player
  createMoviePlayer: (movieId, config = {}) => ({
    mediaType: 'movie',
    tmdbId: movieId,
    seasonId: null,
    episodeId: null,
    episodeData: null,
    ...createPlayerInstance(config)
  }),
  
  // TV show player - now accepts episode data
  createTVPlayer: (showId, seasonId, episodeId, episodeData = null, config = {}) => ({
    mediaType: 'tv',
    tmdbId: showId,
    seasonId,
    episodeId,
    episodeData, // NEW: Include episode data structure
    ...createPlayerInstance(config)
  }),
  
  // Demo player - requires real TMDB movie ID
  createDemo: (movieId = null, config = {}) => ({
    mediaType: 'movie',
    movieId: movieId, // Must provide real TMDB movie ID
    seasonId: null,
    episodeId: null,
    ...createPlayerInstance({
      enableAdvancedFeatures: true,
      ambientLighting: true,
      gestureControls: true,
      voiceControls: true,
      ...config
    })
  })
};

// Development utilities
export const devUtils = {
  // Note: mockMediaDetails removed - use real TMDB API data
  // For testing, use actual TMDB movie/TV IDs with the media player
  testMovieIds: [
    550, // Fight Club
    13, // Forrest Gump
    680, // Pulp Fiction
    27205, // Inception
  ],
  testTVIds: [
    1399, // Game of Thrones
    1396, // Breaking Bad
    94605, // Arcane
    85271, // WandaVision
  ]
};
