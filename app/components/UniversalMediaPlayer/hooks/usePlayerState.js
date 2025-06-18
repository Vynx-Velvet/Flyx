import { useReducer, useCallback } from 'react';

const initialState = {
  isPlaying: false,
  volume: 1,
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
      return { ...state, volume: action.payload, isMuted: action.payload === 0 };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
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
    setError,
  };

  return { state, actions };
}; 