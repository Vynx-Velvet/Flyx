# Stream Extraction Retry Functionality Implementation

## Overview
Implemented robust retry logic for the frontend to attempt stream extraction up to 3 times from the vm-server, providing protection against temporary failures while avoiding overwhelming the server.

## Key Features

### 1. Smart Retry Logic
- **Maximum 3 attempts** per extraction request
- **5-second delay** between retry attempts (increased from 2 seconds to prevent server overload)
- **Race condition prevention** using refs to track extraction state
- **Proper cleanup** of EventSource connections and timeouts

### 2. Error Classification
- **Retryable errors**: Connection failures, temporary server issues, extraction timeouts
- **Non-retryable errors**: Invalid TMDB ID, media not found, rate limiting, blocked by provider
- Only retryable errors trigger automatic retries

### 3. User Interface Enhancements
- **Loading phase indicators** show current attempt (e.g., "retrying (attempt 2/3)")
- **Error display** includes retry count information
- **Manual retry button** in error overlay for user-initiated retries
- **Visual feedback** with green retry button and improved error actions layout

### 4. State Management
- **Retry attempt tracking** with `retryAttempt` state
- **Extraction state protection** prevents multiple simultaneous attempts
- **Component unmount handling** properly cleans up ongoing extractions
- **Loading state management** during retry cycles

## Technical Implementation

### Modified Files
1. **`app/components/UniversalMediaPlayer/hooks/useStream.js`**
   - Added retry logic with smart error classification
   - Implemented race condition prevention
   - Added proper cleanup mechanisms
   - Enhanced logging for debugging

2. **`app/components/UniversalMediaPlayer/index.js`**
   - Updated to display retry information
   - Added manual retry button in error overlay
   - Enhanced error display with retry actions

3. **`app/components/UniversalMediaPlayer/UniversalMediaPlayer.module.css`**
   - Added styles for retry button and error actions
   - Improved error overlay layout

### Key Functions
- `isRetryableError()`: Determines if an error should trigger a retry
- `handleExtractionFailure()`: Centralized failure handling with retry logic
- `cleanup()`: Proper resource cleanup for EventSource and timeouts
- `retryExtraction()`: Manual retry function for user-initiated attempts

## Retry Behavior

### Automatic Retries
1. **First attempt fails** → Wait 5 seconds → **Second attempt**
2. **Second attempt fails** → Wait 5 seconds → **Third attempt**
3. **Third attempt fails** → Show final error with retry count

### Manual Retries
- User can click "🔄 Try Again" button in error overlay
- Resets attempt counter and starts fresh extraction cycle
- Prevents duplicate requests if extraction is already in progress

### Non-Retryable Scenarios
- Invalid TMDB ID or media parameters
- Media not found in databases
- Rate limiting or provider blocking
- Unsupported media types

## Benefits

### For Users
- **Higher success rate** due to automatic retry on temporary failures
- **Clear feedback** on retry progress and attempt counts
- **Manual control** with retry button for failed extractions
- **Faster resolution** of temporary network or server issues

### For System Stability
- **Prevents server overload** with reasonable retry delays
- **Avoids infinite loops** with maximum attempt limits
- **Smart error handling** prevents retries on permanent failures
- **Resource cleanup** prevents memory leaks and connection buildup

## Logging and Debugging
- Comprehensive console logging for each retry attempt
- Clear distinction between retryable and non-retryable errors
- Timing information for retry delays and extraction phases
- Success/failure tracking with attempt numbers

## Future Enhancements
- Exponential backoff for retry delays
- Server-specific retry strategies
- Retry statistics and analytics
- User preference for retry behavior