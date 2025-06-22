# WebOS Service-Based Architecture

## Overview

The Flyx TV WebOS application has been refactored to use a **JavaScript service architecture** that separates network operations from the main UI thread. This provides significant performance improvements for LG Smart TVs by:

- **Offloading network operations** (API calls, streaming data fetching) to a background service
- **Preventing UI blocking** during network requests
- **Better memory management** with dedicated service caching
- **Improved error handling** and resilience
- **Enhanced user experience** with responsive UI

## Architecture Components

### 1. Background JavaScript Service
**Location**: `services/com.flyx.streaming.service/`

- **`service.js`** - Main service implementation handling all network operations
- **`services.json`** - Service manifest defining service configuration
- **`package.json`** - Node.js dependencies for the service

**Responsibilities**:
- TMDB API calls (trending, search, details)
- VM-Server stream extraction
- Data caching and formatting
- Error handling and fallbacks

### 2. Service Client
**Location**: `js/service-client.js`

- **Replaces** the old `api-client.js`
- **Communicates** with background service via webOS Luna Bus
- **Provides** caching layer for UI responsiveness
- **Maintains** backward compatibility with existing code

### 3. Main Application
**Location**: `js/flyx-app.js` and related UI files

- **Focuses** solely on UI logic and user interactions
- **Communicates** with service via service client
- **No longer handles** direct network operations

## Service Communication Flow

```
[UI Components] 
    ↓ (user actions)
[Service Client] 
    ↓ (webOS Luna Bus)
[Background Service] 
    ↓ (HTTP/HTTPS)
[External APIs] (TMDB, VM-Server)
```

## Available Service Methods

### Content Retrieval
- `getTrendingToday()` - Fetch trending movies/shows for today
- `getTrendingWeek()` - Fetch trending movies/shows for the week
- `getPopularShows()` - Fetch popular anime/shows
- `searchContent(query)` - Search for movies/shows

### Media Details
- `getMovieDetails(id, mediaType)` - Get detailed information for movies/shows
- `getStreamingInfo(id, mediaType, season?, episode?)` - Get streaming URLs

### Service Management
- `healthCheck()` - Check service status and health
- `clearCache()` - Clear service cache

## Benefits Over Previous Architecture

### Performance Improvements
1. **Non-blocking UI** - Network operations don't freeze the interface
2. **Better memory usage** - Service handles large data operations separately
3. **Faster response times** - Dual-layer caching (service + client)
4. **Background processing** - Service continues working even when app is backgrounded

### Reliability Improvements
1. **Service isolation** - Service crashes don't affect UI
2. **Better error handling** - Service provides graceful fallbacks
3. **Automatic retries** - Built-in retry logic for failed requests
4. **Connection monitoring** - Health checks and reconnection logic

### Development Benefits
1. **Separation of concerns** - UI logic separate from network logic
2. **Easier testing** - Service can be tested independently
3. **Better debugging** - Clear separation of service vs UI issues
4. **Scalability** - Service can handle multiple concurrent requests

## Configuration

### Service Configuration
Edit `services/com.flyx.streaming.service/service.js`:

```javascript
var config = {
    tmdb: {
        baseURL: 'https://api.themoviedb.org/3',
        apiKey: 'your-tmdb-api-key'
    },
    vmServer: {
        baseURL: 'http://your-vm-server:3001',
        timeout: 30000
    },
    cache: {
        timeout: 300000, // 5 minutes
        maxSize: 100
    }
};
```

### Client Configuration
Edit `js/service-client.js`:

```javascript
function ServiceClient() {
    this.serviceName = 'com.flyx.streaming.service';
    this.requestTimeout = 30000; // 30 seconds
    this.cacheTimeout = 60000; // 1 minute local cache
}
```

## Fallback Behavior

If the background service is unavailable:
1. **Service client detects failure** and logs warning
2. **Automatic fallback** to demo data for UI continuity
3. **Periodic reconnection attempts** to restore service
4. **User notification** of reduced functionality (optional)

## Deployment

### WebOS Package Structure
```
webOS/
├── index.html (updated to use service-client.js)
├── appinfo.json (includes service reference)
├── js/
│   ├── service-client.js (new)
│   └── ... (other UI files)
└── services/
    └── com.flyx.streaming.service/
        ├── service.js
        ├── services.json
        └── package.json
```

### Installation Requirements
1. **WebOS SDK** with service support
2. **Node.js runtime** on target device
3. **Service permissions** in device configuration

## Monitoring and Debugging

### Service Status Checking
```javascript
// Check if service is connected
window.serviceClient.getServiceStatus()
    .then(function(status) {
        console.log('Service status:', status);
    });
```

### Service Logs
- Service logs appear in webOS system logs
- Use `journalctl` or webOS Inspector for debugging
- Service prefixes all logs with `[Flyx Service]`

### Performance Monitoring
- Service provides uptime and cache statistics
- Client tracks request/response times
- Built-in error counting and reporting

## Migration Notes

### From Previous Architecture
- **`api-client.js`** → **`service-client.js`**
- **Direct fetch() calls** → **Service method calls**
- **Synchronous operations** → **Promise-based async operations**

### Backward Compatibility
- All existing method names preserved
- Same return data formats
- Gradual migration path available

## Troubleshooting

### Service Not Starting
1. Check `services.json` configuration
2. Verify Node.js dependencies installed
3. Check webOS service permissions
4. Review service logs for startup errors

### Connection Issues
1. Service client shows "Background service not available"
2. App falls back to demo mode automatically
3. Check Luna Bus connectivity
4. Verify service is running in background

### Performance Issues
1. Monitor cache hit rates
2. Check network request patterns
3. Adjust cache timeouts if needed
4. Review service memory usage

---

This service-based architecture provides a robust, scalable foundation for the Flyx TV WebOS application while maintaining excellent user experience and development maintainability. 