/**
 * TypeScript definitions for Futuristic Media Player v3.0
 * Provides comprehensive type safety for the refactored architecture
 */
import React from 'react';

// ===== BASIC TYPES =====

export type MediaType = 'movie' | 'tv';

export type Theme = 'dark' | 'light' | 'auto';

export type FullscreenMode = 'standard' | 'immersive' | 'cinema';

export type StreamType = 'hls' | 'mp4' | 'webm' | 'dash';

export type ErrorSeverity = 'low' | 'medium' | 'high';

export type PlaybackRate = 0.25 | 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0 | 4.0;

// ===== PLAYER STATE TYPES =====

export interface PlayerState {
  isPlaying: boolean;
  volume: number; // 0-1
  isMuted: boolean;
  duration: number; // seconds
  currentTime: number; // seconds
  isFullscreen: boolean;
  buffered: number; // seconds
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  readyState: number;
  networkState: number;
  seeking: boolean;
  ended: boolean;
  playbackRate: PlaybackRate;
}

export interface UIState {
  isVisible: boolean;
  settingsVisible: boolean;
  performanceVisible: boolean;
  episodeCarouselVisible: boolean;
  resumeDialogVisible: boolean;
}

export interface FullscreenState {
  isFullscreen: boolean;
  mode: FullscreenMode;
}

export interface Quality {
  id: string;
  label: string;
  height: number;
  bitrate: number;
}

export interface SubtitleTrack {
  id: string;
  language: string;
  label: string;
  url?: string;
  default?: boolean;
}

export interface EpisodeData {
  id: string;
  number: number;
  title: string;
  overview: string;
  stillPath?: string;
  airDate?: string;
  runtime?: number;
  seasonNumber: number;
}

export interface ProgressData {
  currentTime: number;
  duration: number;
  percentage: number;
  lastWatched: number;
  isCompleted: boolean;
  hasUnsavedChanges: boolean;
}

// ===== ERROR HANDLING TYPES =====

export interface ErrorClassification {
  type: 'network' | 'streaming' | 'cors' | 'playback' | 'subtitle' | 'unknown';
  severity: ErrorSeverity;
  userMessage: string;
  recoveryStrategies: string[];
}

export interface ErrorReport {
  error: ErrorClassification;
  originalError: Error;
  context: Record<string, any>;
  timestamp: number;
  userAgent: string;
  url: string;
  retryCount: number;
  sessionId: string;
}

export interface UserMessage {
  type: 'error' | 'warning' | 'success' | 'info';
  text: string;
  duration?: number; // milliseconds, 0 = persistent
}

// ===== HOOK TYPES =====

// useMediaPlayer hook
export interface MediaPlayerConfig {
  streamUrl?: string;
  streamType?: StreamType;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoadedMetadata?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onSeeking?: () => void;
  onSeeked?: () => void;
  onVolumeChange?: () => void;
  onLoadProgress?: () => void;
}

export interface PlayerActions {
  play: () => Promise<boolean>;
  pause: () => boolean;
  togglePlay: () => Promise<boolean>;
  seek: (time: number) => boolean;
  setVolume: (volume: number) => boolean;
  adjustVolume: (delta: number) => boolean;
  toggleMute: () => boolean;
  setPlaybackRate: (rate: PlaybackRate) => boolean;
}

export interface UseMediaPlayerReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  playerState: PlayerState;
  playerActions: PlayerActions;
  isRecovering: boolean;
  retryCount: number;
  resetErrorRecovery: () => void;
  forceStateSync: (eventType?: string) => boolean;
}

// usePlayerUI hook
export interface PlayerUIConfig {
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onSettingsToggle?: (visible: boolean) => void;
  onEpisodeCarouselToggle?: (visible: boolean) => void;
}

export interface UIActions {
  showUI: () => void;
  hideUI: () => void;
  toggleUI: () => void;
  toggleSettings: () => void;
  closeSettings: () => void;
  togglePerformance: () => void;
  closePerformance: () => void;
  toggleEpisodeCarousel: () => void;
  closeEpisodeCarousel: () => void;
  showResumeDialog: () => void;
  hideResumeDialog: () => void;
  toggleFullscreen: () => Promise<void>;
  setFullscreenMode: (mode: FullscreenMode) => void;
  handleKeyPress: (e: KeyboardEvent, playerActions: PlayerActions) => void;
}

export interface UsePlayerUIReturn extends UIActions {
  containerRef: React.RefObject<HTMLDivElement>;
  uiState: UIState;
  fullscreenState: FullscreenState;
}

// useEnhancedErrorHandling hook
export interface ErrorHandlingConfig {
  maxRetries?: number;
  onError?: (errorReport: ErrorReport) => void;
  onRecovery?: () => void;
  onMaxRetriesExceeded?: (error: Error) => void;
  enableUserReporting?: boolean;
  enableAnalytics?: boolean;
}

export interface ErrorActions {
  reportError: (error: Error, context?: Record<string, any>) => Promise<ErrorReport>;
  handleUserAction: (action: string, context?: Record<string, any>) => Promise<boolean>;
  dismissError: () => void;
  dismissMessage: () => void;
  reset: () => void;
  getErrorStats: () => {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoveryAttempts: number;
    averageRecoveryTime: number;
  };
}

export interface UseEnhancedErrorHandlingReturn extends ErrorActions {
  currentError: ErrorReport | null;
  isRecovering: boolean;
  recoveryProgress: number;
  userMessage: UserMessage | null;
  showErrorDialog: boolean;
  retryCount: number;
  errorHistory: ErrorReport[];
}

// usePerformanceOptimization hook
export interface PerformanceMetrics {
  timestamp: number;
  memory?: {
    used: number; // MB
    total: number; // MB
    limit: number; // MB
    usagePercent: number;
  };
  timing: PerformanceTiming;
  navigation: PerformanceNavigation;
  fps: number;
  activeTimeouts: number;
  activeIntervals: number;
  activeAnimationFrames: number;
}

export interface PerformanceActions {
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean) => T;
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (id: number) => void;
  setInterval: (callback: () => void, delay: number) => number;
  clearInterval: (id: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
  createEventHandler: <T extends (...args: any[]) => any>(handler: T, deps?: React.DependencyList) => T;
  createOptimizedUpdater: <T>(setState: React.Dispatch<React.SetStateAction<T>>) => (updates: Partial<T> | ((prev: T) => Partial<T>)) => void;
  monitorMemoryUsage: () => PerformanceMetrics['memory'];
  collectPerformanceMetrics: () => PerformanceMetrics;
  cleanup: () => void;
  lazyLoad: <T>(importFunc: () => Promise<{ default: T }>) => Promise<T>;
  useIntersectionObserver: (ref: React.RefObject<Element>, options?: IntersectionObserverInit) => () => void;
  useResizeObserver: (ref: React.RefObject<Element>, callback: (entries: ResizeObserverEntry[]) => void) => () => void;
  createWorker: (workerFunction: Function) => Worker;
}

export type UsePerformanceOptimizationReturn = PerformanceActions;

// ===== COMPONENT PROPS TYPES =====

// Main FuturisticMediaPlayer props
export interface FuturisticMediaPlayerProps {
  mediaType: MediaType;
  movieId: string;
  seasonId?: string;
  episodeId?: string;
  episodeData?: EpisodeData;
  onBackToShowDetails: () => void;
  onEpisodeChange?: (data: {
    seasonId: string;
    episodeId: string;
    episodeData?: EpisodeData;
    crossSeason?: boolean;
  }) => void;
  enableAdvancedFeatures?: boolean;
  theme?: Theme;
  ambientLighting?: boolean;
  gestureControls?: boolean;
  voiceControls?: boolean;
  adaptiveQuality?: boolean;
  collaborativeMode?: boolean;
}

// MediaControls props
export interface MediaControlsProps {
  playerState: PlayerState;
  playerActions: PlayerActions;
  onToggleFullscreen: () => void;
  qualities?: Quality[];
  onSelectQuality?: (qualityId: string) => void;
  currentQuality?: string;
  subtitles?: SubtitleTrack[];
  onSelectSubtitle?: (subtitleId: string) => void;
  activeSubtitle?: string;
  mediaType?: MediaType;
  hasNextEpisode?: boolean;
  hasPreviousEpisode?: boolean;
  onNextEpisode?: () => void;
  onPreviousEpisode?: () => void;
  enableAdvanced?: boolean;
  theme?: Theme;
  episodeCarouselVisible?: boolean;
  onToggleEpisodeCarousel?: () => void;
  progressData?: ProgressData;
  onMarkCompleted?: () => void;
  onClearProgress?: () => void;
  onSaveProgress?: () => void;
  isVisible?: boolean;
}

// ===== UTILITY TYPES =====

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];

// ===== EVENT TYPES =====

export interface PlayerEvents {
  onLoadStart: () => void;
  onLoadedMetadata: () => void;
  onTimeUpdate: (currentTime: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onSeeking: () => void;
  onSeeked: () => void;
  onVolumeChange: () => void;
  onLoadProgress: () => void;
  onError: (error: Error) => void;
}

export interface UIEvents {
  onFullscreenChange: (isFullscreen: boolean) => void;
  onSettingsToggle: (visible: boolean) => void;
  onEpisodeCarouselToggle: (visible: boolean) => void;
}

// ===== CONFIGURATION TYPES =====

export interface PlayerConfig {
  enableAdvancedFeatures: boolean;
  theme: Theme;
  ambientLighting: boolean;
  gestureControls: boolean;
  voiceControls: boolean;
  adaptiveQuality: boolean;
  collaborativeMode: boolean;
}

export interface AnalyticsConfig {
  isEnabled: boolean;
  privacyMode: boolean;
  anonymizeData: boolean;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
  enablePredictive: boolean;
  abTestingEnabled: boolean;
}


// ===== EXPORT TYPES =====

export type {
  // Re-export React types for convenience
  RefObject,
  Dispatch,
  SetStateAction,
  DependencyList,
  EffectCallback,
  MutableRefObject
} from 'react';