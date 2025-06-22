import { useReducer, useCallback } from 'react';

const initialState = {
  isPlaying: false,
  volume: 1,
  previousVolume: 1, // Remember volume before muting
  isMuted: false,
  duration: 0,
  currentTime: 0,
  buffered: 0,
  isSeeking: false,
  isFullscreen: false,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_VOLUME':
      // When setting volume, if it's > 0 and we're muted, unmute
      const volume = action.payload;
      const shouldUnmute = volume > 0 && state.isMuted;
      return { 
        ...state, 
        volume: volume,
        previousVolume: volume > 0 ? volume : state.previousVolume,
        isMuted: shouldUnmute ? false : state.isMuted
      };
    case 'TOGGLE_MUTE':
      if (state.isMuted) {
        // Unmuting: restore previous volume
        return { 
          ...state, 
          isMuted: false,
          volume: state.previousVolume > 0 ? state.previousVolume : 0.5
        };
      } else {
        // Muting: remember current volume
        return { 
          ...state, 
          isMuted: true,
          previousVolume: state.volume > 0 ? state.volume : 0.5
        };
      }
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_BUFFERED':
        return { ...state, buffered: action.payload };
    case 'SET_SEEKING':
      return { ...state, isSeeking: action.payload };
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreen: !state.isFullscreen };
    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };
    case 'SET_ERROR':
        return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const usePlayerState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setPlaying = useCallback((isPlaying) => {
    dispatch({ type: isPlaying ? 'PLAY' : 'PAUSE' });
  }, []);

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, []);

  const setVolume = useCallback((volume) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
  }, []);

  const toggleMute = useCallback(() => {
    dispatch({ type: 'TOGGLE_MUTE' });
  }, []);
  
  const setDuration = useCallback((duration) => {
    dispatch({ type: 'SET_DURATION', payload: duration });
  }, []);

  const setCurrentTime = useCallback((time) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, []);

  const setBuffered = useCallback((time) => {
    dispatch({ type: 'SET_BUFFERED', payload: time });
  }, []);

  const setSeeking = useCallback((isSeeking) => {
    dispatch({ type: 'SET_SEEKING', payload: isSeeking });
  }, []);

  const toggleFullscreen = useCallback(() => {
    dispatch({ type: 'TOGGLE_FULLSCREEN' });
  }, []);

  const setFullscreen = useCallback((isFullscreen) => {
    dispatch({ type: 'SET_FULLSCREEN', payload: isFullscreen });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const actions = {
    setPlaying,
    togglePlay,
    setVolume,
    toggleMute,
    setDuration,
    setCurrentTime,
    setBuffered,
    setSeeking,
    toggleFullscreen,
    setFullscreen,
    setError,
  };

  return { state, actions };
}; 