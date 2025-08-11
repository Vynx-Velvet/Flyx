/**
 * Integration example showing how to use the error handling system
 * with the UniversalMediaPlayer component
 */

import React, { useEffect, useCallback } from 'react';
import { useErrorHandling } from '../../hooks/useErrorHandling.js';
import { ErrorDialog } from '../ErrorHandling/ErrorDialog.js';
import { ErrorToast } from '../ErrorHandling/ErrorToast.js';

export function ErrorHandlingIntegration({ 
  hlsInstance, 
  videoElement, 
  subtitleManager,
  streamUrl,
  movieId,
  seasonId,
  episodeId,
  onRetry,
  onRestart,
  onFallbackServer,
  onUseProxy
}) {
  const {
    currentError,
    isRecovering,
    recoveryProgress,
    userMessage,
    showErrorDialog,
    reportError,
    handleUserAction,
    dismissError,
    dismissMessage
  } = useErrorHandling();

  // Setup HLS error handling
  useEffect(() => {
    if (!hlsInstance) return;

    const handleHlsError = (event, data) => {
      const context = {
        source: 'playback',
        hlsInstance,
        videoElement,
        streamUrl,
        movieId,
        seasonId,
        episodeId,
        retryCallback: onRetry,
        restartCallback: onRestart,
        fallbackCallback: onFallbackServer,
        proxyCallback: onUseProxy
      };

      reportError(data, context);
    };

    hlsInstance.on('hlsError', handleHlsError);

    return () => {
      hlsInstance.off('hlsError', handleHlsError);
    };
  }, [hlsInstance, videoElement, streamUrl, movieId, seasonId, episodeId, 
      onRetry, onRestart, onFallbackServer, onUseProxy, reportError]);

  // Setup video element error handling
  useEffect(() => {
    if (!videoElement) return;

    const handleVideoError = (event) => {
      const context = {
        source: 'playback',
        hlsInstance,
        videoElement,
        streamUrl,
        retryCallback: onRetry,
        restartCallback: onRestart
      };

      reportError(event, context);
    };

    videoElement.addEventListener('error', handleVideoError);

    return () => {
      videoElement.removeEventListener('error', handleVideoError);
    };
  }, [videoElement, hlsInstance, streamUrl, onRetry, onRestart, reportError]);

  // Setup subtitle error handling
  useEffect(() => {
    if (!subtitleManager) return;

    const handleSubtitleError = (error, context) => {
      const errorContext = {
        ...context,
        source: 'subtitle',
        subtitleManager,
        videoElement
      };

      reportError(error, errorContext);
    };

    // Assuming subtitle manager has error event
    subtitleManager.on?.('error', handleSubtitleError);

    return () => {
      subtitleManager.off?.('error', handleSubtitleError);
    };
  }, [subtitleManager, videoElement, reportError]);

  // Handle user actions with enhanced context
  const handleEnhancedUserAction = useCallback(async (action) => {
    const context = {
      hlsInstance,
      videoElement,
      subtitleManager,
      streamUrl,
      movieId,
      seasonId,
      episodeId,
      currentServer: 'vidsrc', // This should come from props
      retryCallback: onRetry,
      restartCallback: onRestart,
      fallbackCallback: onFallbackServer,
      proxyCallback: onUseProxy
    };

    return await handleUserAction(action, context);
  }, [hlsInstance, videoElement, subtitleManager, streamUrl, movieId, seasonId, episodeId,
      onRetry, onRestart, onFallbackServer, onUseProxy, handleUserAction]);

  // Handle error reporting with user feedback
  const handleErrorReport = useCallback(async (userFeedback) => {
    const context = {
      classifiedError: currentError,
      userFeedback,
      movieId,
      seasonId,
      episodeId,
      streamUrl,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    return await handleUserAction('report', context);
  }, [currentError, movieId, seasonId, episodeId, streamUrl, handleUserAction]);

  return (
    <>
      {/* Error Dialog for critical errors */}
      {showErrorDialog && (
        <ErrorDialog
          error={currentError}
          userMessage={userMessage}
          isRecovering={isRecovering}
          recoveryProgress={recoveryProgress}
          onAction={handleEnhancedUserAction}
          onDismiss={dismissError}
          onReport={handleErrorReport}
        />
      )}

      {/* Toast notifications for less critical messages */}
      {userMessage && !showErrorDialog && (
        <ErrorToast
          message={userMessage}
          type={userMessage.type || 'error'}
          duration={userMessage.duration || 5000}
          onDismiss={dismissMessage}
          position="top-right"
        />
      )}
    </>
  );
}

// Example usage in UniversalMediaPlayer
export function UniversalMediaPlayerWithErrorHandling(props) {
  const {
    movieId,
    seasonId,
    episodeId,
    streamUrl,
    onStreamChange,
    onPlayerRestart,
    onServerFallback,
    onProxyToggle
  } = props;

  // Your existing player logic here...
  const [hlsInstance, setHlsInstance] = useState(null);
  const [videoElement, setVideoElement] = useState(null);
  const [subtitleManager, setSubtitleManager] = useState(null);

  const handleRetry = useCallback(async () => {
    // Implement retry logic
    if (onStreamChange) {
      await onStreamChange(streamUrl);
    }
  }, [streamUrl, onStreamChange]);

  const handleRestart = useCallback(async (resumeTime) => {
    // Implement player restart logic
    if (onPlayerRestart) {
      await onPlayerRestart(resumeTime);
    }
  }, [onPlayerRestart]);

  const handleFallbackServer = useCallback(async () => {
    // Implement server fallback logic
    if (onServerFallback) {
      await onServerFallback();
    }
  }, [onServerFallback]);

  const handleUseProxy = useCallback(async () => {
    // Implement proxy toggle logic
    if (onProxyToggle) {
      await onProxyToggle(true);
    }
  }, [onProxyToggle]);

  return (
    <div className="universal-media-player">
      {/* Your existing player UI */}
      <video ref={setVideoElement} />
      
      {/* Error handling integration */}
      <ErrorHandlingIntegration
        hlsInstance={hlsInstance}
        videoElement={videoElement}
        subtitleManager={subtitleManager}
        streamUrl={streamUrl}
        movieId={movieId}
        seasonId={seasonId}
        episodeId={episodeId}
        onRetry={handleRetry}
        onRestart={handleRestart}
        onFallbackServer={handleFallbackServer}
        onUseProxy={handleUseProxy}
      />
    </div>
  );
}

// Utility function to manually report extraction errors
export function reportExtractionError(error, context = {}) {
  const { mediaErrorHandler } = require('../../utils/errorHandling/MediaErrorHandler.js');
  
  return mediaErrorHandler.handleError(error, {
    ...context,
    source: 'extraction'
  });
}

// Utility function to manually report subtitle errors
export function reportSubtitleError(error, context = {}) {
  const { mediaErrorHandler } = require('../../utils/errorHandling/MediaErrorHandler.js');
  
  return mediaErrorHandler.handleError(error, {
    ...context,
    source: 'subtitle'
  });
}