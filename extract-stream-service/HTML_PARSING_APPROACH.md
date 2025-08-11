# HTML Parsing Approach for Stream Extraction

## Overview

The new HTML parsing approach (`vm-server-html-parsing.js`) replaces the play button interaction method with a more reliable HTML parsing strategy. Instead of looking for and clicking play buttons, this approach:

1. **Parses the loaded page HTML** for cloudnestra RCP URLs
2. **Opens a new tab** for the RCP URL
3. **Reads the HTML** for the prorcp URL
4. **Opens another tab** for the prorcp URL  
5. **Finds the shadowlands URL** from the final tab HTML

## Key Advantages

- **No Play Button Dependency**: Eliminates the need to find and interact with play buttons
- **Direct URL Extraction**: Parses HTML directly for embedded URLs
- **Multi-Tab Navigation**: Uses separate browser tabs for each step in the chain
- **Comprehensive Pattern Matching**: Uses multiple regex patterns to find URLs
- **Enhanced Stealth**: Maintains all existing anti-detection measures

## Architecture

### URL Extraction Chain

```
vidsrc.xyz → cloudnestra.com/rcp → cloudnestra.com/prorcp → shadowlandschronicles.com
```

### Pattern Matching

The system uses comprehensive regex patterns to find URLs:

**RCP URL Patterns:**
- `https?://[^"'\s]*cloudnestra[^"'\s]*/rcp[^"'\s]*`
- `src="([^"]*cloudnestra[^"]*/rcp[^"]*)"`
- iframe src attributes

**ProRCP URL Patterns:**
- `https?://[^"'\s]*cloudnestra[^"'\s]*/prorcp[^"'\s]*`
- `src="([^"]*cloudnestra[^"]*/prorcp[^"]*)"`
- iframe src attributes

**Shadowlands URL Patterns:**
- `https?://[^"'\s]*shadowlandschronicles[^"'\s]*`
- `https?://[^"'\s]*\.m3u8[^"'\s]*`
- video and source element src attributes

## Usage

### Starting the Server

```bash
# Start the HTML parsing server
node start-html-parsing-vm.js

# Or directly
node vm-server-html-parsing.js
```

### API Endpoints

**POST /extract-stream**
```json
{
  "mediaType": "movie",
  "movieId": "603",
  "server": "vidsrc.xyz"
}
```

**Response:**
```json
{
  "success": true,
  "extractionMethod": "html_parsing",
  "data": {
    "htmlParsingResult": {
      "success": true,
      "method": "html_parsing",
      "urls": {
        "rcp": "https://cloudnestra.com/rcp/...",
        "prorcp": "https://cloudnestra.com/prorcp/...",
        "shadowlands": "https://shadowlandschronicles.com/..."
      },
      "finalStreamUrl": "https://shadowlandschronicles.com/stream.m3u8"
    }
  }
}
```

### Testing

```bash
# Run comprehensive tests
node test-html-parsing.js
```

## Implementation Details

### Multi-Tab Navigation

The system opens separate browser tabs for each step:

1. **Main Tab**: Loads the initial vidsrc.xyz URL
2. **RCP Tab**: Navigates to the extracted cloudnestra RCP URL
3. **ProRCP Tab**: Navigates to the extracted prorcp URL

Each tab maintains the same stealth configuration and fingerprinting.

### Error Handling

- **URL Not Found**: Returns specific error messages for each step
- **Cloudflare Challenges**: Handles challenges on each tab independently  
- **Tab Management**: Properly closes tabs to prevent memory leaks
- **Timeout Handling**: 30-second timeout for each navigation step

### Stealth Features

- **Advanced User Agent Rotation**: Realistic browser fingerprints
- **Enhanced LocalStorage**: Realistic user preferences and settings
- **Behavioral Simulation**: Mouse movements, scrolling, and timing delays
- **Sandbox Detection Bypass**: Removes automation indicators
- **Request Throttling**: Prevents pattern detection

## Configuration

### Browser Configuration

```javascript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-blink-features=AutomationControlled',
    // ... additional stealth args
  ]
}
```

### Fingerprint Matching

- User Agent rotation with realistic values
- Screen resolution matching
- Hardware concurrency simulation
- Device memory simulation
- Timezone consistency

## Monitoring and Logging

### Request Tracking

Each request gets a unique ID for tracking:
```
[req_1703123456789_abc123def] INFO: Starting HTML parsing for cloudnestra RCP URLs
```

### Performance Metrics

- Total extraction time
- Individual step timing
- Success/failure rates
- URL extraction counts

### Debug Information

- Found URLs at each step
- Cloudflare challenge detection
- Tab navigation status
- Pattern matching results

## Comparison with Play Button Approach

| Feature | Play Button | HTML Parsing |
|---------|-------------|--------------|
| Reliability | Depends on button visibility | Direct HTML parsing |
| Speed | Slower (interaction delays) | Faster (direct extraction) |
| Complexity | High (element interaction) | Medium (pattern matching) |
| Maintenance | High (UI changes break it) | Low (URL patterns stable) |
| Success Rate | Variable | More consistent |

## Future Enhancements

1. **Pattern Learning**: Adapt patterns based on success rates
2. **Caching**: Cache successful URL patterns
3. **Parallel Processing**: Extract multiple URLs simultaneously
4. **Fallback Strategies**: Multiple extraction methods
5. **Real-time Monitoring**: Live success rate tracking

## Troubleshooting

### Common Issues

1. **No RCP URL Found**: Check if vidsrc.xyz page structure changed
2. **Cloudflare Challenges**: Increase timeout or improve challenge handling
3. **Tab Navigation Fails**: Check network connectivity and timeouts
4. **Pattern Matching Fails**: Update regex patterns for new URL formats

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=true node vm-server-html-parsing.js
```

This approach provides a more reliable and maintainable solution for stream extraction by focusing on direct HTML parsing rather than UI interaction.