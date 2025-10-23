# Simple Video Player - Infinite Loop Fix

## Problem Identified
The SimpleVideoPlayer component was experiencing an infinite render loop where:
- Video setup effect triggered hundreds of times per second
- HLS instance constantly destroyed and recreated
- Eventually the video ref became `false`, causing playback to fail
- Console flooded with "Video setup effect triggered" messages

## Root Causes

### 1. **No Guard Against Re-running Setup**
The video setup effect would run every time the component re-rendered, even if the video was already set up with the same stream URL.

### 2. **Aggressive Cleanup on Every Render**
The cleanup function was destroying the HLS instance on every re-render, not just on unmount, causing the effect to run again.

### 3. **Missing Video Element Check**
The cleanup tried to remove event listeners even if the video element no longer existed.

## Solutions Applied

### 1. **Added Setup Guard**
```javascript
// BEFORE: Effect ran on every render
if (!streamUrl || !videoRef.current) {
  return;
}

// AFTER: Check if already set up
if (!streamUrl || !videoRef.current) {
  return;
}

if (videoRef.current.src === streamUrl) {
  console.log('✅ Video already set up, skipping');
  return;
}
```

**Rationale**: Prevents re-running the entire setup if the video is already configured with the same stream URL.

### 2. **Defensive Cleanup**
```javascript
// BEFORE: Destroyed HLS on every cleanup
if (hlsInstance) {
  hlsInstance.destroy();
  setHlsInstance(null);
}

// AFTER: Only destroy if actually unmounting
if (hlsInstance && !videoRef.current) {
  try {
    hlsInstance.destroy();
  } catch (err) {
    console.warn('Error destroying HLS:', err);
  }
  setHlsInstance(null);
}
```

**Rationale**: Only destroy HLS when the component is actually unmounting (videoRef.current is null), not on every re-render.

### 3. **Safe Event Listener Removal**
```javascript
// BEFORE: Assumed video element exists
video.removeEventListener('play', handlePlay);

// AFTER: Check if video exists first
if (video) {
  video.removeEventListener('play', handlePlay);
}
```

**Rationale**: Prevents errors when trying to remove event listeners from a non-existent element.

## Expected Results

After these fixes:
1. ✅ Video setup effect runs only once per stream URL
2. ✅ HLS instance created once and reused
3. ✅ No infinite render loops
4. ✅ Video ref remains stable
5. ✅ Smooth playback without interruptions
6. ✅ Controls work properly
7. ✅ Episode switching works without issues

## Testing Recommendations

1. Load a video and check console - should see minimal "Video setup effect triggered" messages
2. Verify video plays smoothly without re-initialization
3. Test controls (play/pause, seek, volume)
4. Test episode switching for TV shows
5. Monitor CPU usage - should be normal
6. Check that HLS instance is not constantly destroyed/recreated

## Additional Notes

The 403 Forbidden error from the stream proxy is a separate issue related to:
- CORS configuration
- Stream URL expiration
- Rate limiting
- Referrer policy

This should be investigated separately from the render loop issue.
