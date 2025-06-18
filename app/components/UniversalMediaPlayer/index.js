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
  const { state: playerState, actions: playerActions } = usePlayerState();
  const videoRef = useRef(null);

  const { details: mediaDetails } = useFetchMediaDetails(movieId, mediaType);
  
  const { streamUrl, streamType, loading: streamLoading, error: streamError, loadingProgress, loadingPhase } = useStream({
    mediaType,
    movieId,
    seasonId,
    episodeId,
  });

  const { 
    subtitles, 
    activeSubtitle, 
    selectSubtitle, 
    loading: subtitlesLoading 
  } = useSubtitles({
    imdbId: mediaDetails?.imdb_id,
    season: seasonId,
    episode: episodeId,
    enabled: !!mediaDetails,
  });

  console.log('🎬 UniversalMediaPlayer render:', {
    activeSubtitle: activeSubtitle?.language,
    activeSubtitleId: activeSubtitle?.id,
    subtitlesCount: subtitles?.length,
    hasImdbId: !!mediaDetails?.imdb_id
  });

  const { qualities, setQuality, currentQuality } = useHls(streamUrl, videoRef, streamType, activeSubtitle);
  
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    playerActions.setCurrentTime(videoRef.current.currentTime);
    
    if (videoRef.current.buffered.length > 0) {
      playerActions.setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  const handleDurationChange = () => {
    if (!videoRef.current) return;
    if (isFinite(videoRef.current.duration)) {
        playerActions.setDuration(videoRef.current.duration);
    }
  };

  const handlePlay = () => playerActions.setPlaying(true);
  const handlePause = () => playerActions.setPlaying(false);

  const handleSeek = (seekTime) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      playerActions.setCurrentTime(seekTime);
    }
  };
  
  useEffect(() => {
    if (!videoRef.current) return;
    if (playerState.isPlaying) {
      videoRef.current.play().catch(err => {
        console.error("Play failed:", err);
        playerActions.setPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [playerState.isPlaying, streamUrl]); // Re-run when streamUrl changes

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = playerState.volume;
    videoRef.current.muted = playerState.isMuted;
  }, [playerState.volume, playerState.isMuted]);

  const handleSubtitleSelect = (subtitle) => {
    console.log('🔥 SUBTITLE SELECTION IN UNIVERSALMEDIAPLAYER:', {
      subtitle: subtitle,
      subtitleLanguage: subtitle?.language,
      subtitleId: subtitle?.id,
      downloadLink: subtitle?.downloadLink,
      selectSubtitleFunction: typeof selectSubtitle
    });
    selectSubtitle(subtitle);
  };

  const loading = streamLoading || (subtitlesLoading && !streamUrl);

  return (
    <div className={styles.playerContainer}>
      <video
        ref={videoRef}
        className={styles.videoElement}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadedData={() => playerActions.setPlaying(true)}
        autoPlay
      />
      {loading && <LoadingSpinner progress={loadingProgress} phase={loadingPhase} />}
      {streamError && <div className={styles.errorOverlay}>{streamError}</div>}
      
      {!loading && !streamError && (
        <div className={styles.controlsOverlay}>
          <div className={styles.topControls}>
            <button onClick={onBackToShowDetails} className={styles.backButton}>
              &larr; Back
            </button>
          </div>
          
          <PlayerControls
            playerState={playerState}
            playerActions={playerActions}
            onSeek={handleSeek}
            qualities={qualities}
            onSelectQuality={setQuality}
            currentQuality={currentQuality}
            subtitles={subtitles}
            onSelectSubtitle={handleSubtitleSelect}
            activeSubtitle={activeSubtitle}
          />
        </div>
      )}
    </div>
  );
};

export default UniversalMediaPlayer; 