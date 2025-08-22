# VidSrcXYZ Reverse Engineering Analysis

## Overview

This document provides a comprehensive analysis of the `vidsrcxyz.html` file to understand the m3u8 URL extraction process and create a programmatic solution.

## File Analysis

### Key Components Identified

1. **Main iframe URL**: `//cloudnestra.com/rcp/[base64_encoded_data]`
2. **Server data hashes**: Multiple base64-encoded server configurations
3. **JavaScript chain**: External scripts handling URL resolution
4. **Anti-detection measures**: DevTools blocking and fingerprinting protection

### Base64 Encoded Data Analysis

#### Primary iframe URL (Line 78)
```
MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6Um5GSFpGRjBjbTRyVXpkMGRpdHFSa2t2Vkc0eVp6Z3dZMjUwTkd4NVJHWjJTM2RTTUV0c1pXSk9RelpSYzFremVWWnJWWFI1UldWU2NsVmtia2QyWVU5UFMxWmtiVGszUTFaa1F6QlhRV0pzYmt4Nk1UaGtVWGg1YlhKS2F6Tm5VM3BGWnpKaU1YbGtia3gzVURaNGNFdDVlVmRLY1RZck5rWnRibkZQWlVSRWRtUnRWVmMyY0ZZMFZFRnJWbEJ1VlRKaFZXWXlUV0YwYjJONkwydExVVEV6U1doUGQxVmhPRFZFWmtkSFVqWmlOVTlQVUZoaFVIVmhka05FUldObFVUaFVlVWRaWm10SlFWQk9VRVpqT1VoMFRsVnRjRllyUzFOWGNVTkdUMnhEVDNweFRVVXpSalpSZUhSbWQxQldNRGgyUjJwWldFOUxjRk5pZHl0T09VeENZMUppT1VNMWNrZDNiVE5aTVU1dkx6QlhhRFkzUjBKaGVESnlkbHBLTjI1MVNrZERWelJyVGtwR05VSnVUMDgxTDFodVlpODFjWGh3TUVGMmNWVmtMMmczTTJod04xWjVWMlowT0hCV1YzbHZlVTF3U1ZObmRuVmpVRnBNVkN0NVlVdHVSRUpPV25kaE1GUkZOelJxZGxkMlREVlFUeXRWTW5RM1l6aEJlRGhSY1hKaFNVUmFjMUJrT0Voc1RrVnFaMnRLUWtkYVZuUTNVMUZXYW5Cak9HTjNNR1ZQZUhGdVZEbFRTa293UW10cVUyZG9iVFZoY1RKNE9XdGtZM2xwUTJsT2VXWTFVbGczY0RkR01uZFNUekkwVlRnM1JEVjZhVGcxTjA5WlduVnNhM2hGY25kNWRUbHNSVTlPY2xSNmFFTklabWRuU2taT1RHMUVkaXRpUjNRdmJYTXZZMkpFTUdkbEszUlVWVWRaT1V0TVpVcEZjMDE2YWtGUE1WcHJOUzlhVWtkT1FuaEpaazFUU1VsRVJtcG9SMVZaZEU5WVIzUXJNSHBSTm5wYWJtVXJlbkZNU0ZNMloyVlhhM0E0ZDBsT2NpdHFNRU40TkRadmVVbEJjV3M1TUdGd2JsRjVPVGMyZEdONlQxaFhNMUJOZERndlNrTXlNR3NyT0ZGM2JGWnJiekZGTUZKWlVVeHZRV1EwWVVWME0xUnpTakUzY2tSQ1VIWXJZVGRqYW1RelRucHBZMkpWV20xRFUyOU9USFk1UjNkd2EyWk5ZbGhLZUZwcE5IQTBNRUZPV0dadEsxTnZlRFptU0daU1dXcHVOVXBFSzNsTlNtNHlZbE5IZVRJMGNXbG9aaXRvY2toQmRrRjNVR05PY25saGJqQmpVME15Y3pkek9XMWpkRUpITW5WQ1pESTBaMnQxVUZWRGRETjBVbTh3TDAxRGRFWlNha1ZQT1ZsRlNURmpPWFE0YlZCNlpWbzBNV2gyV21kNmVsVTFSamx5T1ZWdFFWZDZUMVZUSzFaNlVIaE9ZVkpqS3pVcldDOXZXV1V6VDFGQlUySnFRVkpCUTBSNVkyNUpWMVJZWW1aTE9Xc3ZiM05vV0hCdE5IbEtWblExY0RaSlN6RkdkSEJTUmpSTk1rTTFObXhYTUdSR1NtRklkR3A0YkdkRFdHeDZiVGN6ZWtsWFJFdDFZbGxMWVZrek4wSTVUMkZCT1VFd2NpOUhaMVV3WXpReGMzcHlka2hDTW1adk1EbFpSR3c1TlhacWNVZGFRWFJGWjNRclRHTlVlRmhHVTJsTFdrWkNaWEEzTldVeWExQjJOMFJFVlc4MVZ6SkVVVGQ0YkRNdmRUWlZPR1pUU1VOM1JIcFdXRXhYVGpKQ1NrRlJlbTVyZUU1NGRXaFVTSEUxY1V0T1dFVTNiVzVuUmxkd1prbHpXRWh1TW1ndlNGWjZOek5uVEVaT1MyUklRbmxuVFVKUVZHUmtSRTVGYnpSNlp6SmhaMGMzTDFsdllYTm1jVFpTVUdaeFFTOURObGdyV25GV2NUTnpORE5LWkhWUk1EbFpaelpHTVdrMmJGTmtVVWwxZDNCVlRpOXNiRXg0Ykc1dFNFMWpPRzluWWtvdmJ6aGpaR2RPVGpCSFowRTFXSGx3TTJrMmRFOUhLMjUxT1dORFRtWnlNR3BNV25CWmJqWlZRUzlPUml0U2VUaDViVFZ1UTJSRmVIazNiVXhJY1hsRFQyYzlQUT09
```

**Decoded Structure Analysis:**

This appears to be a double-encoded format:
1. First layer: Base64 containing colon-separated data 
2. Second layer: Additional Base64 encoding of the actual payload

When decoded, the structure appears to be:
```
[MD5_HASH]:[COMPLEX_BASE64_ENCODED_PAYLOAD]
```

The MD5 hash (`122a37a8c83af1175ac3f98edb12ded7`) likely serves as a verification key or session identifier.

#### Server Hash Analysis (Lines 85-87)

**CloudStream Pro Server:**
```
MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6...
```

**2Embed Server:**
```
MmMzM2Y3OWRhMjMwMDhhMWJiYTc3NzM1NTc2MTUxNzU6...
```

**Superembed Server:**
```
MzFlY2NjY2FlNjZhOGRlNTg0ZDNhNGE3MGVhMmQ0YmM6...
```

Each server hash follows the same pattern: `[MD5_HASH]:[BASE64_PAYLOAD]`

### URL Chain Architecture

Based on the analysis and comparison with existing extraction services:

```
vidsrc.xyz → cloudnestra.com/rcp/[encoded_data] → cloudnestra.com/prorcp/[encoded_data] → shadowlandschronicles.com/[final_stream]
```

### JavaScript Dependencies Analysis

Key scripts identified:
1. **jQuery 3.7.1** - DOM manipulation
2. **MD5 hash library** - Hash generation/verification for server selection
3. **js-cookie** - Cookie management for session persistence
4. **base64.js** - Base64 encoding/decoding utilities for URL manipulation
5. **sources.js** - Stream source resolution logic (critical for URL decoding)
6. **reporting.js** - Analytics/tracking (non-essential for extraction)
7. **sbx.js** - Sandbox/security features (anti-detection)
8. **cloudnestra.com/asdf.js** - Critical external script for URL resolution

### Extraction Service Analysis

#### VM-Server.js (Advanced Puppeteer-based Extraction)

**Key Features:**
- **Enhanced iframe chain navigation**: Follows the complete URL chain through multiple redirects
- **Advanced stealth techniques**: Comprehensive anti-bot detection bypass including:
  - WebDriver property removal and obfuscation
  - Chrome object mocking with realistic browser APIs
  - Canvas and WebGL fingerprint protection
  - Navigator property spoofing with realistic hardware specs
  - Plugin and MIME type simulation
  - Performance timing attack protection
- **Request throttling**: Prevents pattern detection with randomized delays
- **Cloudflare challenge handling**: Automatic detection and resolution
- **Multi-server support**: Server hash rotation for fallback options
- **Network interception**: Captures m3u8 URLs through response monitoring
- **Realistic human behavior simulation**: Mouse movements, scrolling, timing delays

**URL Chain Process:**
1. Navigate to vidsrc.xyz with realistic browser fingerprinting
2. Extract cloudnestra.com/rcp URL from iframe src
3. Navigate to RCP URL and look for ProRCP URL
4. Navigate to ProRCP URL and extract shadowlandschronicles.com URL
5. Monitor network requests for final m3u8 streams

#### Local-Server.js (Pure Fetch-based Extraction)

**Key Features:**
- **Direct HTTP requests**: No browser overhead, much faster execution
- **Regex pattern matching**: Multiple patterns for URL extraction at each step
- **Chain following**: RCP → ProRCP → shadowlandschronicles.com → m3u8
- **Header simulation**: Realistic request headers to avoid detection

**Extraction Process:**
```javascript
// 1. Fetch vidsrc page and extract RCP URL
const cloudnestraUrl = extractUrlFromHtml(vidsrcHtml, cloudnestraPatterns);

// 2. Fetch RCP page and extract ProRCP URL  
const prorcpUrl = extractUrlFromHtml(rcpHtml, prorcpPatterns);

// 3. Fetch ProRCP page and extract final m3u8
const m3u8Url = extractUrlFromHtml(prorcpHtml, m3u8Patterns);
```

#### Embedmin-deobfuscated.js (VidSrc.cc - Different Service)

**Key Features:**
- **AES-CBC encryption**: Uses user ID as encryption key for movie ID
- **RC4 decryption**: Decrypts M3U8 data with fixed key ("DFKykVC3c1")
- **API-based extraction**: Uses structured API endpoints
- **HLS loader customization**: Custom loader for encrypted M3U8 files

**Note**: This is for vidsrc.cc, not vidsrc.xyz, but shows similar encryption patterns

### Anti-Detection Measures Identified

1. **DevTools Blocking**: `disable-devtool` script prevents inspection
2. **Selection/Copy Prevention**: Disables text selection and copying
3. **Iframe Parent Detection**: Checks if running in frame vs standalone
4. **VIP Reference System**: `/is_vip_str.php?ref=` for access control
5. **User Agent Tracking**: Various browser fingerprinting techniques
6. **Histats Analytics**: User behavior tracking for bot detection
7. **Console Protection**: Prevents console-based debugging
8. **Function toString Override**: Hides automation indicators
9. **Performance Timing Protection**: Adds noise to timing measurements
10. **WebGL/Canvas Fingerprint Randomization**: Prevents fingerprint detection

### Data Extraction Points

#### Body Attributes (Line 72)
```html
<body data-i="33043892" data-s="1" data-e="1">
```
- `data-i`: Media ID (33043892) - TMDB ID for "Dexter: Resurrection"
- `data-s`: Season (1) 
- `data-e`: Episode (1)

#### Subtitle Hash (Line 142)
```javascript
var sub_hash = '0f9efb939727e23c0cf9abff29cff33a';
```

#### JavaScript Variables
```javascript
var sb_test = true; // Sandbox test flag
current_sub_name = "sub_"+$("body").data("i")+"_"+$("body").data("s")+"x"+$("body").data("e");
// Results in: "sub_33043892_1x1"
```

## Reverse Engineering Strategy

### Phase 1: Base64 Decoding Algorithm ✅

The base64 data structure has been identified:
```
[MD5_HASH]:[BASE64_ENCODED_PAYLOAD]
```

Where:
- MD5 hash serves as verification/session key
- Payload contains encoded media information and server data

### Phase 2: URL Chain Navigation ✅

**Confirmed Chain Structure:**
```
vidsrc.xyz → cloudnestra.com/rcp → cloudnestra.com/prorcp → shadowlandschronicles.com → final.m3u8
```

**Implementation Options:**
1. **Puppeteer-based** (vm-server.js approach): More reliable but slower
2. **Fetch-based** (local-server.js approach): Faster but potentially less reliable
3. **Hybrid approach**: Try fetch first, fallback to Puppeteer

### Phase 3: Anti-Detection Bypass ✅

**Required Bypass Techniques:**
1. **Browser Fingerprinting**: Realistic user agent, screen resolution, hardware specs
2. **WebDriver Detection**: Remove all automation indicators
3. **Canvas/WebGL Protection**: Add noise to fingerprinting APIs
4. **Request Patterns**: Randomized delays and realistic behavior
5. **Header Simulation**: Proper Referer, Origin, and CORS headers

### Phase 4: Dynamic Script Execution 🔄

**Critical Scripts to Handle:**
1. **cloudnestra.com/asdf.js**: External dependency for URL resolution
2. **sources.js**: Internal source resolution logic
3. **base64.js**: URL encoding/decoding utilities
4. **sbx.js**: Sandbox detection and evasion

## Implementation Approach

### Recommended Hybrid Algorithm

```javascript
async function extractVidsrcxyzM3U8(mediaId, mediaType, season, episode) {
  const startTime = Date.now();
  
  try {
    // 1. Try fast fetch-based extraction first
    const fetchResult = await pureFetchExtraction(mediaId, mediaType, season, episode);
    if (fetchResult.success) {
      return fetchResult;
    }
    
    // 2. Fallback to Puppeteer-based extraction
    return await puppeteerExtraction(mediaId, mediaType, season, episode);
    
  } catch (error) {
    throw new Error(`Extraction failed: ${error.message}`);
  }
}

async function pureFetchExtraction(mediaId, mediaType, season, episode) {
  // Build initial vidsrc.xyz URL
  const vidsrcUrl = buildVidsrcxyzUrl(mediaId, mediaType, season, episode);
  
  // Follow the chain: vidsrc → rcp → prorcp → m3u8
  const rcpUrl = await extractRcpUrl(vidsrcUrl);
  const prorcpUrl = await extractProrcpUrl(rcpUrl);
  const m3u8Url = await extractM3u8Url(prorcpUrl);
  
  return {
    success: true,
    streamUrl: m3u8Url,
    extractionMethod: 'pure_fetch',
    extractionTime: Date.now() - startTime
  };
}

async function puppeteerExtraction(mediaId, mediaType, season, episode) {
  // Use vm-server.js approach with enhanced stealth
  // Navigate through iframe chain with realistic interactions
  // Monitor network requests for m3u8 URLs
  // Handle Cloudflare challenges and anti-bot measures
}
```

### Required Utilities

1. **Base64 decoder** for multi-layer encoded data
2. **RCP URL parser** for cloudnestra.com endpoints  
3. **Anti-bot stealth system** with realistic fingerprinting
4. **Network monitoring** for m3u8 URL detection
5. **Server hash rotation** for fallback options
6. **Cloudflare challenge handler**

### URL Pattern Recognition

**RCP URL Patterns:**
```javascript
const rcpPatterns = [
  /src="([^"]*cloudnestra[^"]*/rcp[^"]*)"/g,
  /https?:\/\/[^"'\s]*cloudnestra[^"'\s]*\/rcp[^"'\s]*/g,
  /'(https?:\/\/[^']*cloudnestra[^']*\/rcp[^']*)/g,
  /"(https?:\/\/[^"]*cloudnestra[^"]*\/rcp[^"]*)"/g,
  /\/\/cloudnestra\.com\/rcp\/[^"'\s]+/g
];
```

**ProRCP URL Patterns:**
```javascript
const prorcpPatterns = [
  /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
  /\/prorcp\/[A-Za-z0-9+\/=]+/g,
  /'\/prorcp\/([^']+)'/g,
  /"\/prorcp\/([^"]+)"/g
];
```

**M3U8 URL Patterns:**
```javascript
const m3u8Patterns = [
  /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
  /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
  /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
  /file:\s*["']([^"']*\.m3u8[^"']*)/g,
  /source:\s*["']([^"']*\.m3u8[^"']*)/g,
  /https?:\/\/[^"'\s]*shadowlandschronicles[^"'\s]*/g
];
```

### Performance Optimization

1. **Connection Pooling**: Reuse HTTP connections for chain navigation
2. **Parallel Processing**: Handle multiple server options simultaneously
3. **Caching**: Cache successful patterns and server configurations
4. **Smart Fallback**: Learn which extraction methods work best
5. **Timeout Optimization**: Adaptive timeouts based on success rates

### Server Hash Rotation System

```javascript
const serverOptions = [
  { 
    name: 'CloudStream Pro',
    hash: 'MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6...',
    priority: 1
  },
  { 
    name: '2Embed',
    hash: 'MmMzM2Y3OWRhMjMwMDhhMWJiYTc3NzM1NTc2MTUxNzU6...',
    priority: 2
  },
  { 
    name: 'Superembed',
    hash: 'MzFlY2NjY2FlNjZhOGRlNTg0ZDNhNGE3MGVhMmQ0YmM6...',
    priority: 3
  }
];
```

## Security Considerations

- All URL decoding should be sandboxed to prevent malicious code execution
- Network requests should be throttled to avoid rate limiting  
- Browser fingerprinting should use realistic, rotating values
- Session management should maintain consistency across the URL chain
- CORS headers should be properly handled for shadowlandschronicles.com

## Testing Strategy

### Test Cases

1. **Movie Extraction**: Test with popular movie TMDB IDs
2. **TV Show Extraction**: Test with different seasons/episodes
3. **Server Fallback**: Test server hash rotation when primary fails
4. **Anti-Detection**: Verify stealth measures work against bot detection
5. **Error Handling**: Test with invalid/missing content
6. **Performance**: Measure extraction times and success rates

### Sample Test Data

```javascript
const testCases = [
  {
    name: "Fight Club",
    tmdbId: "550",
    type: "movie",
    expected: "Should extract m3u8 URL"
  },
  {
    name: "Dexter: Resurrection S01E01",
    tmdbId: "33043892",
    type: "tv",
    season: 1,
    episode: 1,
    expected: "Should extract m3u8 URL"
  }
];
```

## Next Steps

1. ✅ **Analyze JavaScript scripts and dependencies**
2. 🔄 **Examine server hash format and decoding mechanism**
3. 📋 **Trace complete URL chain with sample data**
4. 📋 **Create comprehensive programmatic extraction algorithm**
5. 📋 **Implement and test the solution**
6. 📋 **Document performance benchmarks and success rates**

## Conclusion

The vidsrcxyz.html analysis reveals a sophisticated multi-layered system for stream URL obfuscation and delivery. The extraction process involves:

1. **Base64-encoded server configurations** with MD5 verification hashes
2. **Multi-step URL chain navigation** through cloudnestra.com infrastructure
3. **Comprehensive anti-detection measures** requiring advanced stealth techniques
4. **Dynamic JavaScript execution** for URL resolution and verification

The hybrid approach (fetch-first with Puppeteer fallback) appears optimal for balancing speed and reliability. The existing vm-server.js provides an excellent foundation with its advanced anti-detection capabilities, while local-server.js demonstrates the feasibility of a pure fetch-based approach for faster extraction.

**Key Success Factors:**
- Proper base64 decoding of server configurations
- Realistic browser fingerprinting and anti-detection measures  
- Robust error handling and server fallback mechanisms
- Efficient network request patterns to avoid rate limiting
- Comprehensive testing across different content types and servers