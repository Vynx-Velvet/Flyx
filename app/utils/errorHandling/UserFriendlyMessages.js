/**
 * User-friendly error messages with actionable recovery options
 * Provides clear, non-technical error messages for end users
 */

import { ErrorTypes } from './ErrorTypes.js';

export class UserFriendlyMessages {
  static getErrorMessage(classifiedError, context = {}) {
    const { type, severity, metadata } = classifiedError;
    
    const messageData = this.getMessageForErrorType(type, metadata, context);
    
    return {
      title: messageData.title,
      message: messageData.message,
      actions: messageData.actions,
      severity,
      type,
      canRetry: classifiedError.retryable,
      canRecover: classifiedError.recoverable,
      technicalDetails: this.getTechnicalDetails(classifiedError),
      timestamp: new Date().toISOString()
    };
  }

  static getMessageForErrorType(errorType, metadata = {}, context = {}) {
    switch (errorType) {
      // Extraction errors
      case ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED:
        return {
          title: "Stream Loading Issue",
          message: "We're having trouble accessing the video stream. This usually happens when the streaming source has updated their security measures.",
          actions: [
            { label: "Try Again", action: "retry", primary: true },
            { label: "Try Different Server", action: "fallback_server" },
            { label: "Report Issue", action: "report" }
          ]
        };

      case ErrorTypes.EXTRACTION.SERVER_HASH_EXHAUSTED:
        return {
          title: "All Servers Unavailable",
          message: "We've tried all available streaming servers, but none are currently working for this content. This might be temporary.",
          actions: [
            { label: "Try Again Later", action: "retry_later", primary: true },
            { label: "Try Different Episode", action: "change_content" },
            { label: "Report Issue", action: "report" }
          ]
        };

      case ErrorTypes.EXTRACTION.ANTI_BOT_DETECTED:
        return {
          title: "Access Temporarily Blocked",
          message: "The streaming source has temporarily blocked access. Please wait a moment before trying again.",
          actions: [
            { label: "Wait and Retry", action: "retry_delayed", primary: true },
            { label: "Try Different Server", action: "fallback_server" },
            { label: "Report Issue", action: "report" }
          ]
        };

      case ErrorTypes.EXTRACTION.VM_SERVICE_UNAVAILABLE:
        return {
          title: "Service Temporarily Unavailable",
          message: "Our streaming service is currently experiencing issues. We're working to fix this as quickly as possible.",
          actions: [
            { label: "Try Again", action: "retry", primary: true },
            { label: "Check Status", action: "check_status" },
            { label: "Report Issue", action: "report" }
          ]
        };

      // Playback errors
      case ErrorTypes.PLAYBACK.HLS_FATAL_ERROR:
        return {
          title: "Video Playback Error",
          message: "There was a problem playing the video. This could be due to a network issue or an incompatible video format.",
          actions: [
            { label: "Restart Video", action: "restart_player", primary: true },
            { label: "Try Lower Quality", action: "lower_quality" },
            { label: "Check Connection", action: "check_network" },
            { label: "Report Issue", action: "report" }
          ]
        };

      case ErrorTypes.PLAYBACK.BUFFER_STALLED:
        return {
          title: "Video Buffering",
          message: "The video is taking longer than usual to load. This might be due to a slow internet connection or server issues.",
          actions: [
            { label: "Continue Waiting", action: "wait", primary: true },
            { label: "Lower Quality", action: "lower_quality" },
            { label: "Restart Video", action: "restart_player" },
            { label: "Check Connection", action: "check_network" }
          ]
        };

      case ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED:
        return {
          title: "Loading Issue",
          message: "Some parts of the video failed to load. We'll try to skip the problematic sections automatically.",
          actions: [
            { label: "Continue Playing", action: "continue", primary: true },
            { label: "Restart Video", action: "restart_player" },
            { label: "Try Different Quality", action: "change_quality" }
          ]
        };

      case ErrorTypes.PLAYBACK.CORS_ERROR:
        return {
          title: "Access Restriction",
          message: "The video stream is blocked by security restrictions. We'll try to use an alternative method to access it.",
          actions: [
            { label: "Try Alternative Method", action: "use_proxy", primary: true },
            { label: "Try Different Server", action: "fallback_server" },
            { label: "Report Issue", action: "report" }
          ]
        };

      // Subtitle errors
      case ErrorTypes.SUBTITLE.VTT_PARSE_ERROR:
        return {
          title: "Subtitle Loading Issue",
          message: "There was a problem loading the subtitles. The video will continue playing without subtitles.",
          actions: [
            { label: "Continue Without Subtitles", action: "continue", primary: true },
            { label: "Try Different Language", action: "change_subtitle_language" },
            { label: "Reload Subtitles", action: "reload_subtitles" }
          ]
        };

      case ErrorTypes.SUBTITLE.SYNC_DRIFT:
        return {
          title: "Subtitle Timing Issue",
          message: "The subtitles are not synchronized with the video. We'll try to fix the timing automatically.",
          actions: [
            { label: "Auto-Fix Timing", action: "resync_subtitles", primary: true },
            { label: "Turn Off Subtitles", action: "disable_subtitles" },
            { label: "Try Different Language", action: "change_subtitle_language" }
          ]
        };

      case ErrorTypes.SUBTITLE.LANGUAGE_SWITCH_FAILED:
        return {
          title: "Subtitle Language Error",
          message: "We couldn't switch to the requested subtitle language. The current subtitles will continue to display.",
          actions: [
            { label: "Keep Current Subtitles", action: "continue", primary: true },
            { label: "Try Different Language", action: "change_subtitle_language" },
            { label: "Turn Off Subtitles", action: "disable_subtitles" }
          ]
        };

      // System errors
      case ErrorTypes.SYSTEM.MEMORY_EXHAUSTED:
        return {
          title: "Memory Issue",
          message: "Your device is running low on memory. Try closing other tabs or applications to free up resources.",
          actions: [
            { label: "Close Other Tabs", action: "close_tabs", primary: true },
            { label: "Restart Browser", action: "restart_browser" },
            { label: "Lower Video Quality", action: "lower_quality" }
          ]
        };

      case ErrorTypes.SYSTEM.BROWSER_COMPATIBILITY:
        return {
          title: "Browser Not Supported",
          message: "Your browser doesn't support all the features needed for video playback. Please update your browser or try a different one.",
          actions: [
            { label: "Update Browser", action: "update_browser", primary: true },
            { label: "Try Chrome/Firefox", action: "try_different_browser" },
            { label: "Check Requirements", action: "check_requirements" }
          ]
        };

      case ErrorTypes.SYSTEM.NETWORK_UNAVAILABLE:
        return {
          title: "No Internet Connection",
          message: "Please check your internet connection and try again.",
          actions: [
            { label: "Check Connection", action: "check_network", primary: true },
            { label: "Try Again", action: "retry" },
            { label: "Troubleshoot", action: "network_troubleshoot" }
          ]
        };

      default:
        return {
          title: "Something Went Wrong",
          message: "An unexpected error occurred. Please try again or contact support if the problem persists.",
          actions: [
            { label: "Try Again", action: "retry", primary: true },
            { label: "Refresh Page", action: "refresh" },
            { label: "Report Issue", action: "report" }
          ]
        };
    }
  }

  static getTechnicalDetails(classifiedError) {
    const { type, originalError, metadata } = classifiedError;
    
    return {
      errorType: type,
      errorMessage: originalError?.message || 'Unknown error',
      timestamp: classifiedError.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata: {
        // Only include non-sensitive metadata
        hlsDetails: metadata?.hlsDetails ? {
          type: metadata.hlsDetails.type,
          details: metadata.hlsDetails.details,
          fatal: metadata.hlsDetails.fatal
        } : null,
        networkDetails: metadata?.networkDetails ? {
          status: metadata.networkDetails.status,
          statusText: metadata.networkDetails.statusText
        } : null,
        videoDetails: metadata?.videoDetails ? {
          currentTime: metadata.videoDetails.currentTime,
          duration: metadata.videoDetails.duration,
          readyState: metadata.videoDetails.readyState,
          networkState: metadata.videoDetails.networkState
        } : null
      }
    };
  }

  static getProgressMessage(recoveryAction, progress = 0) {
    const progressMessages = {
      retry: `Retrying... (${Math.round(progress)}%)`,
      restart_player: `Restarting video player... (${Math.round(progress)}%)`,
      fallback_server: `Trying alternative server... (${Math.round(progress)}%)`,
      use_proxy: `Using alternative access method... (${Math.round(progress)}%)`,
      resync_subtitles: `Fixing subtitle timing... (${Math.round(progress)}%)`,
      lower_quality: `Switching to lower quality... (${Math.round(progress)}%)`,
      reload_subtitles: `Reloading subtitles... (${Math.round(progress)}%)`
    };

    return progressMessages[recoveryAction] || `Processing... (${Math.round(progress)}%)`;
  }

  static getSuccessMessage(recoveryAction) {
    const successMessages = {
      retry: "Successfully reconnected! The video should now play normally.",
      restart_player: "Video player restarted successfully. Playback has resumed.",
      fallback_server: "Connected to alternative server. Video is now loading.",
      use_proxy: "Alternative access method successful. Video is now available.",
      resync_subtitles: "Subtitle timing has been fixed. Subtitles should now be synchronized.",
      lower_quality: "Video quality adjusted. Playback should be smoother now.",
      reload_subtitles: "Subtitles reloaded successfully. They should now display correctly."
    };

    return successMessages[recoveryAction] || "Issue resolved successfully.";
  }

  static getActionInstructions(action) {
    const instructions = {
      retry: "Click 'Try Again' to attempt loading the video again.",
      restart_player: "This will restart the video player and resume from where you left off.",
      fallback_server: "This will try to load the video from a different streaming server.",
      use_proxy: "This will use an alternative method to access the video stream.",
      resync_subtitles: "This will automatically adjust the subtitle timing to match the video.",
      lower_quality: "This will reduce the video quality to improve loading and reduce buffering.",
      check_network: "Please check your internet connection and ensure it's stable.",
      close_tabs: "Close other browser tabs to free up memory and improve performance.",
      update_browser: "Update your browser to the latest version for better compatibility.",
      report: "Send a report to help us fix this issue for everyone."
    };

    return instructions[action] || "Follow the suggested action to resolve this issue.";
  }
}