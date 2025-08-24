# 🎬 Futuristic Media Player - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Components](#core-components)
5. [Advanced Features](#advanced-features)
6. [API Reference](#api-reference)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tips](#performance-tips)
10. [Changelog](#changelog)

---

## Overview

The **Futuristic Media Player** is a fully refactored, high-performance media player component built with React and Next.js. It provides seamless video streaming with advanced features like HLS support, intelligent subtitles, gesture controls, voice commands, and comprehensive error recovery.

### Key Features
- 🚀 **Optimized Performance** - No forced re-renders, efficient state management
- 🎥 **HLS.js Integration** - Adaptive streaming with quality selection
- 🎯 **Smart Controls** - Responsive timeline, volume, and playback controls
- 🌐 **Multi-language Subtitles** - Intelligent positioning and styling
- 👆 **Gesture Controls** - Touch and mouse gesture support
- 🎙️ **Voice Commands** - Natural language control interface
- 💡 **Ambient Lighting** - Synchronized visual effects
- 📺 **Picture-in-Picture** - Native and custom PiP support
- 🛡️ **Error Recovery** - Comprehensive error boundaries with auto-recovery
- 📊 **Performance Monitoring** - Real-time metrics and analytics

---

## Architecture

### Component Hierarchy

```
FuturisticMediaPlayer (Main Component with Error Boundary)
├── MediaPlayerErrorBoundary (Error handling wrapper)
│   └── FuturisticMediaPlayerCore (Core player logic)
│       ├── Video Element (HTML5 video)
│       ├── EnhancedMediaControls (Control bar)
│       ├── IntelligentSubtitles (Subtitle display)
│       ├── AmbientLighting (Visual effects)
│       ├── GestureOverlay (Touch/mouse gestures)
│       ├── VoiceInterface (Voice commands)
│       ├── AdvancedSettings (Settings panel)
│       ├── PerformanceDashboard (Metrics display)
│       ├── EpisodeCarousel (TV show episodes)
│       ├── NextEpisodePrompt (Auto-advance)
│       └── PictureInPicture (PiP mode)
```

### State Management

The player uses a single source of truth pattern with two main state objects:

1. **playerState** - Core playback state
2. **advancedState** - Advanced features configuration

### Data Flow

```
User Input → Action Handlers → State Update → Component Re-render
     ↓                              ↑
Stream Extraction ←→ HLS.js → Video Element
```

---

## Quick Start

### Basic Usage

```jsx
import FuturisticMediaPlayer from '@/components/UniversalMediaPlayer/FuturisticMediaPlayer';

function MoviePage() {
  return (
    <FuturisticMediaPlayer
      mediaType="movie"
      movieId="533535"
      onBackToShowDetails={() => router.back()}
    />
  );
}
```

### TV Show Usage

```jsx
<FuturisticMediaPlayer
  mediaType="tv"
  movieId="1399"
  seasonId="1"
  episodeId="1"
  onEpisodeChange={(season, episode) => {
    // Handle episode change
  }}
  onBackToShowDetails={() => router.back()}
/>
```

### With Advanced Features

```jsx
<FuturisticMediaPlayer
  mediaType="movie"
  movieId="533535"
  enableAdvancedFeatures={true}
  theme="dark"
  ambientLighting={true}
  gestureControls={true}
  voiceControls={true}
  adaptiveQuality={true}
  collaborativeMode={false}
  onBackToShowDetails={() => router.back()}
/>
```

---

## Core Components

### FuturisticMediaPlayer

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mediaType` | `'movie' \| 'tv'` | Required | Type of media |
| `movieId` | `string` | Required | TMDB movie/show ID |
| `seasonId` | `string` | - | Season number (TV only) |
| `episodeId` | `string` | - | Episode number (TV only) |
| `onBackToShowDetails` | `function` | Required | Back navigation handler |
| `onEpisodeChange` | `function` | - | Episode change handler |
| `enableAdvancedFeatures` | `boolean` | `true` | Enable advanced features |
| `theme` | `string` | `'dark'` | Player theme |
| `ambientLighting` | `boolean` | `true` | Enable ambient effects |
| `gestureControls` | `boolean` | `true` | Enable gestures |
| `voiceControls` | `boolean` | `false` | Enable voice commands |
| `adaptiveQuality` | `boolean` | `true` | Auto quality adjustment |

### EnhancedMediaControls

Provides the main control interface with:
- Play/Pause toggle
- Timeline with preview
- Volume control with mute
- Quality selector
- Subtitle selector
- Playback speed control
- Fullscreen toggle
- Episode navigation (TV shows)

**Key Improvements:**
- Throttled timeline/volume updates
- HH:MM:SS time format
- Smooth animations
- Keyboard shortcuts support

### useStream Hook

Manages stream extraction with intelligent retry logic:

```jsx
const {
  streamUrl,
  streamType,
  loading,
  error,
  loadingProgress,
  loadingPhase,
  retryExtraction
} = useStream({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  shouldFetch: true
});
```

**Features:**
- Exponential backoff retry
- Error classification
- Server health checking
- Fallback mechanisms
- Request deduplication

---

## Advanced Features

### Gesture Controls

Supported gestures:
- **Swipe Up** - Increase volume
- **Swipe Down** - Decrease volume
- **Swipe Left** - Rewind 10 seconds
- **Swipe Right** - Forward 10 seconds
- **Single Tap** - Play/Pause
- **Double Tap** - Toggle fullscreen

### Voice Commands

Natural language commands:
- "Play" / "Pause"
- "Volume [0-100]"
- "Seek to [time]"
- "Set quality to [quality]"
- "Enable subtitles"
- "Fullscreen"

### Error Recovery

The player includes multiple layers of error handling:

1. **Component Error Boundary** - Catches React errors
2. **Stream Error Recovery** - Retries failed extractions
3. **Network Health Monitoring** - Detects connectivity issues
4. **HLS Error Recovery** - Handles streaming errors

Recovery strategies:
- Exponential backoff retry
- Quality fallback
- Format switching
- Cache clearing
- Component remounting

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |
| `←` / `→` | Seek ±10 seconds |
| `↑` / `↓` | Volume ±10% |
| `,` / `.` | Playback speed ±0.25x |
| `Escape` | Exit fullscreen |

---

## API Reference

### Player Actions

```javascript
const playerActions = {
  play: async () => void,
  pause: () => void,
  togglePlay: async () => void,
  seek: (time: number) => void,
  setVolume: (volume: number) => void,
  adjustVolume: (delta: number) => void,
  toggleMute: () => void,
  setFullscreen: (isFullscreen: boolean) => void,
  setPlaybackRate: (rate: number) => void,
  setPipPosition: (position: {x: number, y: number}) => void
};
```

### Player State

```javascript
const playerState = {
  isPlaying: boolean,
  volume: number,        // 0-1
  isMuted: boolean,
  duration: number,      // seconds
  currentTime: number,   // seconds
  isFullscreen: boolean,
  buffered: number,      // seconds
  isLoading: boolean,
  hasError: boolean,
  errorMessage: string | null
};
```

### Advanced State

```javascript
const advancedState = {
  subtitleStyle: object,
  ambientIntensity: number,     // 0-1
  gestureVisualFeedback: boolean,
  particlesEnabled: boolean,
  pipEnabled: boolean,
  pipPosition: {x: number, y: number},
  currentQuality: string,
  qualities: Array<Quality>,
  playbackRate: number          // 0.25-4
};
```

---

## Testing

### Running Tests

The player includes comprehensive integration tests:

```javascript
// In browser console
window.MediaPlayerTests.quickTest();

// Run specific test
window.MediaPlayerTests.runTest('coreFunctionality', 'core-1');

// Generate test report
window.MediaPlayerTests.generateReport();
```

### Test Dashboard

To use the visual test dashboard:

```jsx
import TestDashboard from '@/components/UniversalMediaPlayer/tests/TestDashboard';

// Add to your component
const [showTests, setShowTests] = useState(false);

{showTests && <TestDashboard onClose={() => setShowTests(false)} />}
```

### Test Categories

1. **Core Functionality** - Player init, stream extraction, HLS loading
2. **Media Controls** - Play/pause, volume, seeking, time display
3. **Advanced Features** - Quality, subtitles, gestures, settings
4. **TV Show Features** - Episode navigation, auto-advance
5. **Error Handling** - Network errors, stream failures, recovery
6. **Performance** - Load time, memory usage, frame drops
7. **Keyboard Shortcuts** - All keyboard controls

---

## Troubleshooting

### Common Issues

#### 1. Video Not Playing

**Symptoms:** Black screen, loading spinner stuck
**Solutions:**
- Check browser console for errors
- Verify stream extraction is working
- Check network connectivity
- Try different server/quality
- Clear browser cache

#### 2. Controls Not Updating

**Symptoms:** Timeline/volume not responding
**Solutions:**
- Ensure no console errors
- Check if video element exists
- Verify state updates in React DevTools
- Check for event listener conflicts

#### 3. HLS.js Errors

**Symptoms:** "Fatal error" in console
**Solutions:**
- Check if HLS.js is properly loaded
- Verify stream URL is valid HLS
- Try fallback to native playback
- Check CORS headers on stream

#### 4. Memory Leaks

**Symptoms:** Increasing memory usage, slow performance
**Solutions:**
- Ensure proper cleanup in useEffect
- Check for HLS.js instance cleanup
- Verify event listener removal
- Monitor with Chrome DevTools

#### 5. Subtitle Issues

**Symptoms:** Subtitles not showing or misaligned
**Solutions:**
- Check subtitle API response
- Verify IMDB ID is correct
- Check subtitle file format
- Ensure proper time sync

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('mediaPlayerDebug', 'true');

// View stored errors
JSON.parse(localStorage.getItem('mediaPlayerErrors'));
```

---

## Performance Tips

### 1. Optimize Initial Load

- Use `enableAdvancedFeatures={false}` for basic playback
- Disable unused features (voice, gestures)
- Implement progressive enhancement

### 2. Reduce Re-renders

- Already optimized with React.memo
- Uses proper dependency arrays
- Single source of truth for state

### 3. Network Optimization

- HLS adaptive bitrate streaming
- Intelligent buffer management
- Request deduplication
- Exponential backoff retry

### 4. Memory Management

- Proper cleanup in useEffect
- HLS.js instance disposal
- Event listener removal
- Cache management

### 5. Best Practices

```jsx
// ✅ Good - Memoized actions
const playerActions = useMemo(() => ({...}), []);

// ✅ Good - Throttled updates
const handleTimelineChange = useThrottle((value) => {...}, 100);

// ✅ Good - Lazy loading
const Component = dynamic(() => import('./Component'), { ssr: false });

// ❌ Bad - Force re-renders
<Component key={Date.now()} />

// ❌ Bad - Inline functions
<button onClick={() => doSomething()}>
```

---

## Changelog

### Version 2.0.0 - Complete Refactor
**Date:** August 2024

#### Major Changes
- ✅ Complete state management overhaul
- ✅ Fixed forced re-render issues
- ✅ Proper HLS.js integration with cleanup
- ✅ Enhanced controls with throttling
- ✅ Comprehensive error boundaries
- ✅ Intelligent retry mechanisms
- ✅ Performance optimizations
- ✅ Added test suite and dashboard

#### Improvements
- HH:MM:SS time format
- Smooth timeline/volume dragging
- Better error messages
- Network health monitoring
- Memory leak fixes
- Request deduplication
- Component memoization
- Dynamic imports

#### Bug Fixes
- Fixed controls not updating
- Fixed memory leaks
- Fixed duplicate extraction requests
- Fixed HLS.js cleanup issues
- Fixed timeline jumping
- Fixed volume slider lag

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Run the test suite to identify problems
3. Enable debug mode for detailed logging
4. Check browser console for errors

---

## License

This component is part of the Flyx application and follows the project's licensing terms.

---

*Last Updated: August 2024*
*Version: 2.0.0*