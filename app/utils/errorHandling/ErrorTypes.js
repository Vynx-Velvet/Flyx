/**
 * Comprehensive error classification system for media playback
 * Covers extraction, playback, and subtitle errors as specified in requirements
 */

export const ErrorTypes = {
  // Extraction errors (Requirements 4.1, 4.7)
  EXTRACTION: {
    IFRAME_NAVIGATION_FAILED: 'iframe_navigation_failed',
    SERVER_HASH_EXHAUSTED: 'server_hash_exhausted',
    ANTI_BOT_DETECTED: 'anti_bot_detected',
    PLAY_BUTTON_NOT_FOUND: 'play_button_not_found',
    CLOUDNESTRA_ACCESS_BLOCKED: 'cloudnestra_access_blocked',
    SHADOWLANDS_CORS_ERROR: 'shadowlands_cors_error',
    EXTRACTION_TIMEOUT: 'extraction_timeout',
    VM_SERVICE_UNAVAILABLE: 'vm_service_unavailable'
  },

  // Playback errors (Requirements 4.1, 4.3, 4.4)
  PLAYBACK: {
    HLS_FATAL_ERROR: 'hls_fatal_error',
    HLS_NETWORK_ERROR: 'hls_network_error',
    HLS_MEDIA_ERROR: 'hls_media_error',
    SEGMENT_LOAD_FAILED: 'segment_load_failed',
    BUFFER_STALLED: 'buffer_stalled',
    QUALITY_SWITCH_FAILED: 'quality_switch_failed',
    VIDEO_ELEMENT_ERROR: 'video_element_error',
    STREAM_PROXY_FAILED: 'stream_proxy_failed',
    CORS_ERROR: 'cors_error'
  },

  // Subtitle errors (Requirements 4.1, 4.4)
  SUBTITLE: {
    VTT_PARSE_ERROR: 'vtt_parse_error',
    SYNC_DRIFT: 'sync_drift',
    BLOB_URL_FAILED: 'blob_url_failed',
    LANGUAGE_SWITCH_FAILED: 'language_switch_failed',
    OPENSUBTITLES_API_ERROR: 'opensubtitles_api_error',
    SUBTITLE_LOAD_TIMEOUT: 'subtitle_load_timeout',
    SUBTITLE_DISPLAY_ERROR: 'subtitle_display_error'
  },

  // System errors (Requirements 6.1, 6.2)
  SYSTEM: {
    MEMORY_EXHAUSTED: 'memory_exhausted',
    BROWSER_COMPATIBILITY: 'browser_compatibility',
    NETWORK_UNAVAILABLE: 'network_unavailable',
    QUOTA_EXCEEDED: 'quota_exceeded',
    UNKNOWN_ERROR: 'unknown_error'
  }
};

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const ErrorCategory = {
  RECOVERABLE: 'recoverable',
  RETRY_REQUIRED: 'retry_required',
  FALLBACK_AVAILABLE: 'fallback_available',
  FATAL: 'fatal'
};