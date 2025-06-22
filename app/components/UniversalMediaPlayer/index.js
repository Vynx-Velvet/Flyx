import React, { useRef, useEffect, useState } from 'react';
import styles from './UniversalMediaPlayer.module.css';
import { usePlayerState } from './hooks/usePlayerState';
import { useStream } from './hooks/useStream';
import { useHls } from './hooks/useHls';
import { useSubtitles } from './hooks/useSubtitles';
import { useFetchMediaDetails } from './hooks/useFetchMediaDetails';
import PlayerControls from './components/PlayerControls';
import LoadingSpinner from './components/LoadingSpinner';

const UniversalMediaPlayer = ({ mediaType, movieId, seasonId, episodeId, onBackToShowDetails }) => {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const seekTimeoutRef = useRef(null);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitleCues, setSubtitleCues] = useState([]);
  const [subtitleError, setSubtitleError] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingTo, setSeekingTo] = useState(null);

  const { state: playerState, actions: playerActions } = usePlayerState();
  const { details: mediaDetails } = useFetchMediaDetails(movieId, mediaType);
  
  const { streamUrl, streamType, loading: streamLoading, error: streamError, loadingProgress, loadingPhase } = useStream({
    mediaType, movieId, seasonId, episodeId, shouldFetch: true
  });

  const { subtitles, activeSubtitle, selectSubtitle, loading: subtitlesLoading } = useSubtitles({
    imdbId: mediaDetails?.imdb_id, season: seasonId, episode: episodeId, enabled: !!mediaDetails,
  });

  const { qualities, setQuality, currentQuality } = useHls(streamUrl, videoRef, streamType, activeSubtitle);
  
  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await playerContainerRef.current.requestFullscreen();
        playerActions.setFullscreen(true);
        console.log('🖥️ Entered fullscreen mode');
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        playerActions.setFullscreen(false);
        console.log('🖥️ Exited fullscreen mode');
      }
    } catch (error) {
      console.error('❌ Fullscreen error:', error);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement === playerContainerRef.current;
      playerActions.setFullscreen(isFullscreen);
      console.log('🖥️ Fullscreen state changed:', isFullscreen);
      
      // Show controls when entering/exiting fullscreen
      showControls();
    };

    const handleFullscreenError = (event) => {
      console.error('❌ Fullscreen error event:', event);
      playerActions.setFullscreen(false);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('fullscreenerror', handleFullscreenError);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('fullscreenerror', handleFullscreenError);
    };
  }, [playerActions]);



  // Auto-hide controls functionality
  const showControls = () => {
    setControlsVisible(true);
    resetHideTimer();
  };

  const hideControls = () => {
    if (playerState.isPlaying) {
      setControlsVisible(false);
    }
  };

  const resetHideTimer = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(hideControls, 5000);
  };

  const handleMouseMove = () => {
    showControls();
  };

  const handleMouseLeave = () => {
    resetHideTimer();
  };

  // Show controls when video is paused, hide when playing
  useEffect(() => {
    if (playerState.isPlaying) {
      resetHideTimer();
    } else {
      setControlsVisible(true);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }
  }, [playerState.isPlaying]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);
  
  // Enhanced subtitle parser with better debugging
  const parseVTT = (vttText) => {
    console.log('🎬 PARSING VTT:', {
      length: vttText.length,
      startsWithWebVTT: vttText.startsWith('WEBVTT'),
      firstLines: vttText.split('\n').slice(0, 10)
    });
    
    // Show the first 500 characters of raw VTT content
    console.log('📝 RAW VTT CONTENT (first 500 chars):', vttText.substring(0, 500));
    
    const lines = vttText.split('\n');
    console.log('📋 TOTAL LINES:', lines.length);
    
    const cues = [];
    let i = 0;

    // Skip WEBVTT header and metadata
    while (i < lines.length) {
      const line = lines[i].trim();
      console.log(`Line ${i}: "${line}"`);
      if (line === 'WEBVTT' || line.startsWith('NOTE') || line === '') {
        i++;
        continue;
      }
      break;
    }
    
    console.log(`🔍 Starting cue parsing from line ${i}`);

    // Parse cues
    let cueCount = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      console.log(`Processing line ${i}: "${line}"`);
      
      // Skip empty lines
      if (line === '') {
        i++;
        continue;
      }
      
      // Look for timestamp line
      if (line.includes('-->')) {
        console.log(`🕐 Found timestamp line: "${line}"`);
        const timeParts = line.split('-->').map(s => s.trim());
        if (timeParts.length === 2) {
          const startSeconds = timeToSeconds(timeParts[0]);
          const endSeconds = timeToSeconds(timeParts[1]);
          console.log(`⏰ Parsed times: ${startSeconds}s -> ${endSeconds}s`);
          
          // Get subtitle text (next non-empty lines until empty line or end)
          i++;
          let text = '';
          const textLines = [];
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim());
            if (text) text += ' ';
            text += lines[i].trim();
            i++;
          }
          
          console.log(`📝 Found subtitle text: "${text}" (from ${textLines.length} lines)`);
          
          if (text && startSeconds >= 0 && endSeconds >= 0) {
            const cue = { 
              start: startSeconds, 
              end: endSeconds, 
              text: text.replace(/<[^>]*>/g, '') // Remove HTML tags
            };
            cues.push(cue);
            cueCount++;
            console.log(`✅ Added cue #${cueCount}:`, cue);
          } else {
            console.log(`❌ Skipping invalid cue - text: "${text}", start: ${startSeconds}, end: ${endSeconds}`);
          }
        } else {
          console.log(`❌ Invalid timestamp format: "${line}"`);
        }
      } else {
        // Skip cue identifiers or other non-timestamp lines
        console.log(`⏭️ Skipping non-timestamp line: "${line}"`);
        i++;
      }
      
      // Safety break to prevent infinite loops
      if (i > lines.length + 10) {
        console.error('❌ Parser safety break triggered!');
        break;
      }
    }
    
    console.log('🎬 PARSED CUES:', {
      totalCues: cues.length,
      firstCue: cues[0],
      lastCue: cues[cues.length - 1],
      sampleTimes: cues.slice(0, 3).map(c => ({ start: c.start, end: c.end, text: c.text.substring(0, 30) }))
    });
    
    return cues;
  };

  const timeToSeconds = (timeStr) => {
    try {
      // Handle both HH:MM:SS.mmm and MM:SS.mmm formats
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
      } else if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return parseInt(minutes) * 60 + parseFloat(seconds);
      }
      return 0;
    } catch (error) {
      console.error('❌ Time parsing error:', timeStr, error);
      return 0;
    }
  };

  // Load subtitle content when selected
  useEffect(() => {
    if (activeSubtitle?.blobUrl) {
      console.log('🎬 LOADING SUBTITLE:', {
        language: activeSubtitle.language,
        blobUrl: activeSubtitle.blobUrl,
        id: activeSubtitle.id
      });
      
      setSubtitleError('');
      
      fetch(activeSubtitle.blobUrl)
        .then(res => {
          console.log('📡 Fetch response:', {
            ok: res.ok,
            status: res.status,
            headers: Object.fromEntries(res.headers.entries())
          });
          return res.text();
        })
        .then(vttText => {
          console.log('📄 VTT TEXT RECEIVED:', {
            length: vttText.length,
            startsWithWebVTT: vttText.startsWith('WEBVTT'),
            preview: vttText.substring(0, 200)
          });
          
          if (!vttText || vttText.length === 0) {
            throw new Error('Empty VTT content received');
          }
          
          const cues = parseVTT(vttText);
          
          if (cues.length === 0) {
            throw new Error('No subtitle cues found in VTT content');
          }
          
          setSubtitleCues(cues);
          console.log('✅ SUBTITLES LOADED SUCCESSFULLY:', {
            cueCount: cues.length,
            language: activeSubtitle.language,
            firstCueText: cues[0]?.text,
            timeRange: `${cues[0]?.start}s - ${cues[cues.length - 1]?.end}s`
          });
        })
        .catch(err => {
          console.error('❌ SUBTITLE LOAD FAILED:', err);
          setSubtitleError(`Failed to load ${activeSubtitle.language} subtitles: ${err.message}`);
          setSubtitleCues([]);
        });
    } else {
      console.log('🎬 NO ACTIVE SUBTITLE - CLEARING');
      setSubtitleCues([]);
      setCurrentSubtitle('');
      setSubtitleError('');
    }
  }, [activeSubtitle]);

  // Update current subtitle based on video time - MORE FREQUENT UPDATES
  useEffect(() => {
    if (subtitleCues.length === 0 || !videoRef.current) {
      setCurrentSubtitle('');
      return;
    }

    const currentTime = playerState.currentTime;
    const activeCue = subtitleCues.find(cue => 
      currentTime >= cue.start && currentTime <= cue.end
    );

    const newSubtitle = activeCue ? activeCue.text : '';
    if (newSubtitle !== currentSubtitle) {
      setCurrentSubtitle(newSubtitle);
      if (newSubtitle) {
        console.log('📝 SUBTITLE SHOWING:', {
          time: currentTime.toFixed(1),
          text: newSubtitle,
          cue: activeCue
        });
      }
    }
  }, [playerState.currentTime, subtitleCues, currentSubtitle]);

  // Enhanced seeking functionality
  const handleSeek = (time) => {
    if (!videoRef.current || isSeeking) {
      console.log('🎯 Seek blocked:', { hasVideo: !!videoRef.current, isSeeking });
      return;
    }

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(time, playerState.duration));
    
    console.log('🎯 Starting seek:', { 
      requestedTime: time, 
      clampedTime, 
      duration: playerState.duration,
      currentTime: playerState.currentTime 
    });

    setIsSeeking(true);
    setSeekingTo(clampedTime);
    playerActions.setSeeking(true);

    // Clear any existing seek timeout
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    try {
      // Set the video current time
      videoRef.current.currentTime = clampedTime;
      
      // Set a timeout to handle cases where seeked event doesn't fire
      seekTimeoutRef.current = setTimeout(() => {
        console.log('⚠️ Seek timeout - forcing completion');
        completeSeeking(clampedTime);
      }, 3000);

    } catch (error) {
      console.error('❌ Seek error:', error);
      completeSeeking(clampedTime);
    }
  };

  const completeSeeking = (time) => {
    console.log('✅ Seek completed:', { time, wasSeekingTo: seekingTo });
    setIsSeeking(false);
    setSeekingTo(null);
    playerActions.setSeeking(false);
    
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
  };

  // Enhanced video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current && !isSeeking) {
      const currentTime = videoRef.current.currentTime;
      playerActions.setCurrentTime(currentTime);
      
      if (videoRef.current.buffered.length > 0) {
        playerActions.setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
      }
    }
  };

  const handleSeeked = () => {
    if (videoRef.current) {
      const actualTime = videoRef.current.currentTime;
      console.log('🎯 Seeked event fired:', { actualTime, wasSeekingTo: seekingTo });
      playerActions.setCurrentTime(actualTime);
      completeSeeking(actualTime);
    }
  };

  const handleSeeking = () => {
    console.log('🎯 Seeking event fired');
    // This event fires when seeking starts
  };

  const handleWaiting = () => {
    console.log('⏳ Video waiting for data');
    // Could show loading spinner here if needed
  };

  const handleCanPlay = () => {
    console.log('✅ Video can play');
    // Video has enough data to start playing
  };

  const handleDurationChange = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      playerActions.setDuration(videoRef.current.duration);
    }
  };

  // Video playback sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (playerState.isPlaying) {
      videoRef.current.play().catch(console.error);
    } else {
      videoRef.current.pause();
    }
  }, [playerState.isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = playerState.volume;
      videoRef.current.muted = playerState.isMuted;
    }
  }, [playerState.volume, playerState.isMuted]);

  const loading = streamLoading || (subtitlesLoading && !streamUrl);

  if (loading) {
    return (
      <div className={styles.playerContainer}>
        <LoadingSpinner progress={loadingProgress} phase={loadingPhase || 'Loading...'} />
      </div>
    );
  }

  if (streamError) {
    return (
      <div className={styles.playerContainer}>
        <div className={styles.errorOverlay}>
          <h3>❌ Playback Error</h3>
          <p>{streamError}</p>
          <button onClick={onBackToShowDetails} className={styles.backButton}>
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={styles.playerContainer}
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onSeeked={handleSeeked}
        onSeeking={handleSeeking}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onPlay={() => playerActions.setPlaying(true)}
        onPause={() => playerActions.setPlaying(false)}
        controls={false}
        autoPlay
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        textTracks="false"
        disablePictureInPicture
        data-testid="video-player"
      />

      {/* Seeking Indicator */}
      {isSeeking && (
        <div className={styles.seekingIndicator}>
          <div className={styles.seekingSpinner}></div>
          <span>Seeking to {Math.floor(seekingTo / 60)}:{(Math.floor(seekingTo % 60)).toString().padStart(2, '0')}...</span>
        </div>
      )}

      {/* SUBTITLE OVERLAY - GUARANTEED TO SHOW - Always visible */}
      {currentSubtitle && (
        <div className={styles.subtitleOverlay}>
          {currentSubtitle}
        </div>
      )}

      {/* Subtitle Error Indicator */}
      {subtitleError && (
        <div className={styles.statusIndicator} style={{ background: 'rgba(239, 68, 68, 0.9)' }}>
          ❌ {subtitleError}
        </div>
      )}

      {/* Back Button - Auto-hiding */}
      <button 
        onClick={onBackToShowDetails} 
        className={`${styles.backBtn} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
        onMouseEnter={showControls}
      >
        ← Back
      </button>

      {/* Media Controls - Auto-hiding */}
      <div 
        className={`${styles.controlsContainer} ${controlsVisible ? styles.controlsVisible : styles.controlsHidden}`}
        onMouseEnter={showControls}
      >
        <PlayerControls
          playerState={playerState}
          playerActions={playerActions}
          onSeek={handleSeek}
          onToggleFullscreen={toggleFullscreen}
          qualities={qualities}
          onSelectQuality={setQuality}
          currentQuality={currentQuality}
          subtitles={subtitles}
          onSelectSubtitle={selectSubtitle}
          activeSubtitle={activeSubtitle}
        />
      </div>
    </div>
  );
};

export default UniversalMediaPlayer; 