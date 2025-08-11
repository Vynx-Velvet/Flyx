# Enhanced Stream Proxy Service

The enhanced stream proxy service provides robust CORS handling for media streaming with advanced features for reliability, security, and performance.

## Features

### 🔒 Security & Rate Limiting
- **Rate Limiting**: 100 requests per minute per IP address
- **Request Validation**: Bot detection and user agent validation
- **Automatic Blocking**: 5-minute blocks for rate limit violations
- **Security Headers**: Comprehensive CORS and security headers

### 🔄 Reliability & Retry Logic
- **Exponential Backoff**: Automatic retry with increasing delays (1s → 2s → 4s → 8s)
- **Smart Retry Logic**: Retries on network errors and 5xx responses
- **Connection Pooling**: Keep-alive connections for better performance
- **Timeout Handling**: 30-second request timeouts with proper error handling

### 🎯 Source-Specific Configuration
- **shadowlandschronicles.com**: Proper referer and origin headers for CORS compliance
- **vidsrc.xyz**: Clean headers to avoid detection
- **embed.su**: Full masking headers for compatibility
- **Subtitle Files**: Optimized headers for VTT/SRT files

### 📊 Monitoring & Debugging
- **Rate Limit Headers**: `X-RateLimit-Remaining` and `X-RateLimit-Reset`
- **Comprehensive Logging**: Detailed request/response logging
- **Error Classification**: Proper error codes and messages
- **Performance Metrics**: Request timing and success rates

## API Usage

### Basic Request
```javascript
const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
const response = await fetch(proxyUrl);
```

### With Source Specification
```javascript
const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}&source=vidsrc`;
const response = await fetch(proxyUrl);
```

### Supported Sources
- `vidsrc` - For vidsrc.xyz streams (uses clean headers)
- `embed.su` - For embed.su streams (uses masking headers)
- Auto-detection for shadowlandschronicles.com URLs

## Response Headers

### Rate Limiting
- `X-RateLimit-Remaining`: Number of requests remaining in current window
- `X-RateLimit-Reset`: ISO timestamp when rate limit resets
- `Retry-After`: Seconds to wait when rate limited (429 responses)

### CORS
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
- `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges`

## Error Handling

### Rate Limiting (429)
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 300,
  "requestId": "proxy_1234567890"
}
```

### Validation Errors (400)
```json
{
  "success": false,
  "error": "Invalid user agent",
  "requestId": "proxy_1234567890"
}
```

### Network Errors (502/503/504)
- Automatic retry with exponential backoff
- Fallback to error response after max retries
- Detailed error context in response

## Configuration

### Rate Limiting
```javascript
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,        // 1 minute window
  maxRequests: 100,           // Max 100 requests per minute per IP
  blockDuration: 5 * 60 * 1000 // Block for 5 minutes if exceeded
};
```

### Retry Logic
```javascript
const RETRY_CONFIG = {
  maxRetries: 3,              // Maximum retry attempts
  baseDelay: 1000,            // 1 second base delay
  maxDelay: 10000,            // 10 seconds max delay
  backoffFactor: 2            // Exponential backoff multiplier
};
```

### Connection Pooling
```javascript
const CONNECTION_POOL_CONFIG = {
  maxConnections: 50,         // Maximum concurrent connections
  keepAliveTimeout: 30000,    // 30 seconds keep-alive
  timeout: 30000              // 30 seconds request timeout
};
```

## Testing

### Run Integration Tests
```bash
node app/api/stream-proxy/test-enhanced-proxy.js
```

### Run Unit Tests
```bash
npm test app/api/stream-proxy/__tests__/enhanced-proxy.test.js
```

## Requirements Compliance

This implementation addresses the following requirements:

- **Requirement 1.6**: shadowlandschronicles.com CORS handling with proper headers
- **Requirement 4.2**: Enhanced retry logic with exponential backoff
- **Requirement 5.3**: Connection pooling and performance optimization

## Performance Optimizations

1. **Connection Reuse**: Keep-alive connections reduce connection overhead
2. **Smart Retries**: Only retry on recoverable errors to avoid wasted requests
3. **Header Optimization**: Minimal headers for better performance
4. **Memory Management**: Efficient buffer handling for large responses
5. **Rate Limiting**: Prevents abuse and ensures fair resource usage

## Security Considerations

1. **Bot Detection**: Prevents automated abuse
2. **Rate Limiting**: Protects against DoS attacks
3. **Request Validation**: Validates user agents and request patterns
4. **Header Sanitization**: Prevents header injection attacks
5. **Origin Validation**: Ensures requests come from legitimate sources