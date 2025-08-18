# 9anime HTML Analysis - Deep Dive

## Comprehensive Pattern Analysis

After analyzing the example.html file thoroughly, here are additional patterns and extraction opportunities we may have missed:

## 🔍 Key Data Attributes & Identifiers

### 1. Main Wrapper Data Attributes
```html
<div id="wrapper" data-id="18718" data-continue-episode="" data-page="watch">
```

**Extraction Opportunities:**
- `data-id="18718"` - This is the anime/episode ID that could be used for:
  - API calls to get episode lists
  - Server endpoint construction
  - Episode navigation
- `data-continue-episode=""` - Could indicate auto-continue functionality
- `data-page="watch"` - Page type identifier

**Implementation Suggestion:**
```javascript
// Extract anime ID for potential API calls
const animeId = await page.evaluate(() => {
  const wrapper = document.getElementById('wrapper');
  return wrapper ? wrapper.getAttribute('data-id') : null;
});

// Use anime ID for server endpoint construction
if (animeId) {
  const serverEndpoint = `https://9animetv.to/ajax/episode/servers/${animeId}`;
  // Make API call to get available servers
}
```

### 2. Episode Navigation Functions
```html
<a class="btn btn-sm btn-prev" href="javascript:;" onclick="prevEpisode()">
<a class="btn btn-sm btn-next" href="javascript:;" onclick="nextEpisode()">
```

**Extraction Opportunities:**
- These functions likely exist in the page's JavaScript
- Could be called programmatically to navigate episodes
- May trigger server reloading automatically

**Implementation Suggestion:**
```javascript
// Check if navigation functions exist and call them
const hasNextEpisode = await page.evaluate(() => {
  return typeof window.nextEpisode === 'function';
});

if (hasNextEpisode) {
  // Could programmatically navigate to next episode
  await page.evaluate(() => window.nextEpisode());
}
```

### 3. Player Settings & Toggles
```html
<div class="toggle-basic off quick-settings" data-option="auto_play">
<div class="toggle-basic off quick-settings" data-option="auto_next">
```

**Extraction Opportunities:**
- `data-option="auto_play"` - Could be toggled to enable autoplay
- `data-option="auto_next"` - Auto-advance to next episode
- These settings might affect video loading behavior

**Implementation Suggestion:**
```javascript
// Enable autoplay for better extraction
await page.evaluate(() => {
  const autoplayToggle = document.querySelector('[data-option="auto_play"]');
  if (autoplayToggle && autoplayToggle.classList.contains('off')) {
    autoplayToggle.click();
  }
});
```

## 🎌 Japanese Title Data Attributes

### Dynamic Name Elements
```html
<h2 class="film-name dynamic-name" data-jname="Ore dake Level Up na Ken">Solo Leveling</h2>
<li class="breadcrumb-item dynamic-name active" data-jname="Watching Ore dake Level Up na Ken">
```

**Extraction Opportunities:**
- `data-jname` contains Japanese titles
- Could be used for more accurate anime identification
- Useful for cross-referencing with other databases

## 🔧 Loading States & Indicators

### Loading Box
```html
<div class="loading-relative loading-box" id="embed-loading">
```

**Extraction Opportunities:**
- Monitor this element to detect when iframe is loading
- Could wait for this to disappear before proceeding
- Better timing for iframe interaction

**Implementation Suggestion:**
```javascript
// Wait for embed loading to complete
await page.waitForFunction(() => {
  const loadingBox = document.getElementById('embed-loading');
  return !loadingBox || loadingBox.style.display === 'none';
}, { timeout: 10000 });
```

## 📺 Server Content Area

### Server Container
```html
<div class="player-servers">
    <div id="servers-content"></div>
</div>
```

**Extraction Opportunities:**
- This container is populated dynamically with server options
- Could monitor for changes to detect new servers
- May contain server switching buttons

**Implementation Suggestion:**
```javascript
// Monitor servers-content for dynamic updates
const serversObserver = await page.evaluateHandle(() => {
  const serversContent = document.getElementById('servers-content');
  if (serversContent) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // New server options added
          window.serversUpdated = true;
        }
      });
    });
    observer.observe(serversContent, { childList: true, subtree: true });
    return observer;
  }
  return null;
});
```

## 🎬 Episode List Section

### Episode Block Area
```html
<section class="block_area block_area-episodes"></section>
```

**Extraction Opportunities:**
- This section likely contains episode list when populated
- Could be used to detect available episodes
- May have episode selection functionality

## 🔐 Anti-Bot & Security Measures

### ReCAPTCHA Integration
```javascript
var recaptchaSiteKey = '6LcJeB8eAAAAAK9SJTPy75A2v4iIEOa-iNIpDzJM';
```

**Extraction Opportunities:**
- Site uses ReCAPTCHA for bot protection
- May need to handle CAPTCHA challenges
- Could affect iframe loading

### Obfuscated Scripts
```html
<script data-verify="1" data-verify-src="https://yb23b.com/400/9326353?">
```

**Extraction Opportunities:**
- Multiple obfuscated anti-bot scripts present
- May interfere with extraction
- Could require additional stealth measures

## 🌐 API Endpoints & AJAX Calls

### Potential API Patterns
Based on the structure, likely API endpoints:
- `/ajax/episode/servers/{anime_id}` - Get available servers
- `/ajax/episode/list/{anime_id}` - Get episode list  
- `/ajax/episode/info/{episode_id}` - Get episode info

**Implementation Suggestion:**
```javascript
// Intercept network requests to find API calls
await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = request.url();
  if (url.includes('/ajax/episode/') || url.includes('/embed/')) {
    logger.info('Detected API call', { url });
    // Could extract server URLs from responses
  }
  request.continue();
});
```

## 🎯 Enhanced Extraction Strategies

### 1. Multi-Layer Iframe Detection
```javascript
// Enhanced iframe chain detection
async function detectIframeChain(page, logger) {
  const iframes = [];
  
  // Level 1: Main page iframes
  const mainIframes = await page.$$('iframe');
  for (const iframe of mainIframes) {
    const src = await iframe.evaluate(el => el.src);
    iframes.push({ level: 1, src, element: iframe });
    
    try {
      const frame = await iframe.contentFrame();
      if (frame) {
        // Level 2: Nested iframes
        const nestedIframes = await frame.$$('iframe');
        for (const nested of nestedIframes) {
          const nestedSrc = await nested.evaluate(el => el.src);
          iframes.push({ level: 2, src: nestedSrc, parent: src });
        }
      }
    } catch (e) {
      // CORS blocked
    }
  }
  
  return iframes;
}
```

### 2. Dynamic Content Monitoring
```javascript
// Monitor for dynamic content changes
async function monitorDynamicContent(page, logger) {
  await page.evaluate(() => {
    // Monitor iframe src changes
    const iframe = document.getElementById('iframe-embed');
    if (iframe) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            window.iframeSrcChanged = iframe.src;
          }
        });
      });
      observer.observe(iframe, { attributes: true });
    }
    
    // Monitor server content changes
    const serversContent = document.getElementById('servers-content');
    if (serversContent) {
      const serverObserver = new MutationObserver(() => {
        window.serversContentUpdated = true;
      });
      serverObserver.observe(serversContent, { childList: true, subtree: true });
    }
  });
}
```

### 3. Enhanced Server Detection
```javascript
// Look for server buttons with multiple selectors
const serverSelectors = [
  '#servers-content .server-item',
  '#servers-content .server',
  '#servers-content [data-server]',
  '#servers-content button',
  '#servers-content .btn',
  '.server-list .server',
  '.server-tabs .tab',
  '[onclick*="server"]',
  '[data-id*="server"]'
];

for (const selector of serverSelectors) {
  const servers = await page.$$(selector);
  if (servers.length > 0) {
    logger.info(`Found ${servers.length} servers with selector: ${selector}`);
    // Try each server...
  }
}
```

## 🚀 Performance Optimizations

### 1. Parallel Processing
```javascript
// Process multiple extraction methods simultaneously
const extractionPromises = [
  extractMainIframe(page, logger),
  extractServerOptions(page, logger),
  extractEpisodeInfo(page, logger),
  monitorNetworkRequests(page, logger)
];

const results = await Promise.allSettled(extractionPromises);
```

### 2. Smart Waiting Strategies
```javascript
// Wait for specific conditions instead of fixed timeouts
await page.waitForFunction(() => {
  const iframe = document.getElementById('iframe-embed');
  const serversContent = document.getElementById('servers-content');
  
  return (iframe && iframe.src && iframe.src !== '') ||
         (serversContent && serversContent.children.length > 0);
}, { timeout: 10000 });
```

## 🔍 Missing Patterns We Should Address

### 1. Comment System Integration
```html
<a href="javascript:;" data-type="episode" class="btn btn-sm btn-comment-tab active">
<a href="javascript:;" data-type="anime" class="btn btn-sm btn-comment-tab">
```
- Could provide episode/anime metadata
- May contain user-generated server links

### 2. Quality Selection
- No explicit quality selectors found, but may be in iframe
- Could be handled by server selection

### 3. Subtitle Handling
- No subtitle controls visible in main page
- Likely handled within video player iframe

### 4. Mobile/Responsive Considerations
```css
@media screen and (max-width: 479px)
```
- Site has mobile optimizations
- May need different extraction strategies for mobile

## 🎯 Recommended Implementation Priorities

1. **High Priority:**
   - Anime ID extraction and API endpoint construction
   - Dynamic server content monitoring
   - Enhanced iframe chain detection
   - Loading state monitoring

2. **Medium Priority:**
   - Episode navigation function integration
   - Player settings manipulation
   - Network request interception
   - Multi-level iframe processing

3. **Low Priority:**
   - Comment system integration
   - Japanese title extraction
   - Mobile-specific handling
   - Advanced anti-bot evasion

This analysis reveals that 9anime uses a sophisticated dynamic loading system with multiple layers of content injection, making it essential to monitor for changes rather than relying on static element detection.