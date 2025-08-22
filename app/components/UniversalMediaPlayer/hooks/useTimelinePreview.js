/**
 * Timeline Preview Hook
 * Handles timeline hover preview with thumbnail and timestamp
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export const useTimelinePreview = ({ duration, videoRef }) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const canvasRef = useRef(null);
  const thumbnailTimeoutRef = useRef(null);
  const lastThumbnailTimeRef = useRef(-1);

  // Format time for display
  const formatPreviewTime = useCallback((seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Generate thumbnail at specific time - PROPERLY IMPLEMENTED
  const generateThumbnail = useCallback(async (targetTime) => {
    if (!videoRef?.current || !canvasRef.current) return null;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size for thumbnail
      canvas.width = 160;
      canvas.height = 90;

      // Create a temporary video element for thumbnail generation to avoid affecting main playback
      const thumbnailVideo = document.createElement('video');
      thumbnailVideo.crossOrigin = video.crossOrigin;
      thumbnailVideo.preload = 'metadata';
      
      // For HLS streams, we need to use the same source but in a separate element
      if (video.src) {
        thumbnailVideo.src = video.src;
      } else if (video.currentSrc) {
        thumbnailVideo.src = video.currentSrc;
      }
      
      // IMPORTANT: Don't attach to DOM to prevent interference with main video
      thumbnailVideo.style.display = 'none';
      thumbnailVideo.muted = true; // Mute to prevent audio interference
      
      // Wait for the temporary video to load metadata
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Timeout loading video for thumbnail')), 3000);
        
        thumbnailVideo.addEventListener('loadedmetadata', () => {
          clearTimeout(timeoutId);
          resolve();
        }, { once: true });
        
        thumbnailVideo.addEventListener('error', (e) => {
          clearTimeout(timeoutId);
          reject(e);
        }, { once: true });
      });

      return new Promise((resolve) => {
        let timeoutId;
        
        const onSeeked = () => {
          try {
            // Draw the frame at the target time
            ctx.drawImage(thumbnailVideo, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Clean up
            thumbnailVideo.removeEventListener('seeked', onSeeked);
            clearTimeout(timeoutId);
            thumbnailVideo.remove();
            
            resolve(thumbnailUrl);
          } catch (error) {
            console.warn('❌ Error drawing thumbnail:', error);
            thumbnailVideo.remove();
            resolve(null);
          }
        };

        // Set up timeout fallback
        timeoutId = setTimeout(() => {
          thumbnailVideo.removeEventListener('seeked', onSeeked);
          thumbnailVideo.remove();
          resolve(null);
        }, 1000);

        // Set up event listener and seek
        thumbnailVideo.addEventListener('seeked', onSeeked, { once: true });
        thumbnailVideo.currentTime = targetTime;
      });
    } catch (error) {
      console.warn('❌ Error generating thumbnail:', error);
      return null;
    }
  }, [videoRef]);

  // Handle timeline hover with proper thumbnail generation
  const handleTimelineHover = useCallback((event, timelineElement) => {
    if (!duration || !timelineElement) return;

    const rect = timelineElement.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, hoverX / rect.width));
    const time = progress * duration;
    
    // Calculate preview position (keep within bounds)
    const previewWidth = 160; // Width of preview tooltip
    const maxPosition = rect.width - previewWidth;
    const position = Math.max(0, Math.min(maxPosition, hoverX - previewWidth / 2));
    
    setPreviewTime(time);
    setPreviewPosition(position);
    setPreviewVisible(true);

    // Debounce thumbnail generation
    if (thumbnailTimeoutRef.current) {
      clearTimeout(thumbnailTimeoutRef.current);
    }

    // Only generate thumbnail if time has changed significantly
    const timeDiff = Math.abs(time - lastThumbnailTimeRef.current);
    if (timeDiff > 1) {
      thumbnailTimeoutRef.current = setTimeout(async () => {
        try {
          const thumbnail = await generateThumbnail(time);
          if (thumbnail) {
            setThumbnailUrl(thumbnail);
            lastThumbnailTimeRef.current = time;
          }
        } catch (error) {
          console.warn('❌ Error generating hover thumbnail:', error);
        }
      }, 200);
    }
  }, [duration, generateThumbnail]);

  // Handle timeline leave
  const handleTimelineLeave = useCallback(() => {
    setPreviewVisible(false);
    setThumbnailUrl(null);
    
    // Clear any pending thumbnail generation
    if (thumbnailTimeoutRef.current) {
      clearTimeout(thumbnailTimeoutRef.current);
      thumbnailTimeoutRef.current = null;
    }
  }, []);

  // Get preview data
  const getPreviewData = useCallback(() => {
    return {
      visible: previewVisible,
      time: previewTime,
      formattedTime: formatPreviewTime(previewTime),
      position: previewPosition,
      thumbnailUrl
    };
  }, [previewVisible, previewTime, formatPreviewTime, previewPosition, thumbnailUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (thumbnailTimeoutRef.current) {
        clearTimeout(thumbnailTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Event handlers
    handleTimelineHover,
    handleTimelineLeave,
    
    // Preview data
    getPreviewData,
    
    // Canvas ref for thumbnail generation
    canvasRef,
    
    // State
    previewVisible,
    previewTime: formatPreviewTime(previewTime),
    previewPosition,
    thumbnailUrl
  };
};