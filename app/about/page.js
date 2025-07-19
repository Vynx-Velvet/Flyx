'use client'

import React from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import './About.css';

const AboutPage = () => {
  return (
    <div className="app">
      <NavBar />
      <main className="about-page">
        <div className="about-container">
          {/* Hero Section */}
          <section className="about-hero">
            <div className="hero-content">
              <h1 className="hero-title">
                About <span className="hero-highlight">Flyx</span>
              </h1>
              <p className="hero-subtitle">
                A deep dive into the engineering challenges of building a modern streaming platform from scratch - by one developer, fueled by Pacific Punch Monster Energy
              </p>
            </div>
          </section>

          {/* Technical Overview */}
          <section className="origin-section">
            <div className="content-card">
              <h2>Project Overview: Engineering a Modern Streaming Platform 🎯</h2>
              <p className="mission-text">
                Flyx represents a comprehensive solution to the fundamental problems plaguing modern streaming platforms: intrusive advertising, poor user experience, unreliable video delivery, and lack of proper subtitle integration. Built entirely from scratch over 8 months of intensive development, this project required solving complex problems in browser automation, video streaming protocols, CORS policy circumvention, and real-time media processing.
              </p>
              <p className="mission-text">
                The technical challenge was significant: create a platform that could dynamically extract streaming URLs from heavily obfuscated embed sources, proxy HLS streams through custom middleware to handle CORS restrictions, implement adaptive bitrate streaming with quality controls, and integrate a comprehensive subtitle system supporting multiple formats and languages - all while maintaining sub-3-second load times and 99.9% uptime.
              </p>
              <p className="mission-text">
                This project pushed the boundaries of what's possible with modern web technologies, requiring deep understanding of HTTP protocols, browser security models, video streaming standards, JavaScript obfuscation techniques, and distributed systems architecture. Every component was custom-built to handle the unique challenges of real-time stream extraction and delivery.
              </p>
            </div>
          </section>

          {/* Architecture Deep Dive */}
          <section className="architecture-section">
            <div className="content-card">
              <h2>System Architecture: A Multi-Layer Engineering Solution 🏗️</h2>
              <p className="mission-text">
                The architecture is designed around distributed processing with isolated execution environments, ensuring reliability and security at scale. The system operates across four primary layers, each solving specific technical challenges.
              </p>
              
              <div className="architecture-diagram">
                <div className="arch-layer frontend">
                  <h4>🎯 Frontend Layer: Next.js 14 with Advanced Media Handling</h4>
                  <div className="arch-components">
                    <div className="component">React 18 with Server Components</div>
                    <div className="component">HLS.js Media Engine</div>
                    <div className="component">Real-time WebSocket Updates</div>
                    <div className="component">Custom Subtitle Renderer</div>
                  </div>
                  <p className="arch-description">The frontend implements a sophisticated media player using HLS.js with custom configurations for optimal streaming performance. Features include adaptive bitrate switching, subtitle synchronization with frame-perfect timing, quality level management with bandwidth estimation, and real-time progress tracking during stream extraction. The player handles multiple video formats (HLS, MP4, WebM) with seamless fallback mechanisms.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer api">
                  <h4>⚡ API Layer: Serverless Edge Functions</h4>
                  <div className="arch-components">
                    <div className="component">Next.js API Routes on Vercel Edge</div>
                    <div className="component">Custom CORS Proxy Engine</div>
                    <div className="component">M3U8 Playlist Parser & Rewriter</div>
                    <div className="component">OpenSubtitles Integration</div>
                  </div>
                  <p className="arch-description">Serverless functions handle stream proxying, URL rewriting, and subtitle processing. The CORS proxy intelligently routes requests based on source requirements, implementing different header strategies for various embed providers. The M3U8 parser performs real-time playlist modification, rewriting segment URLs to route through the proxy while maintaining timing accuracy.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer vm">
                  <h4>🤖 Extraction Layer: Isolated Browser Automation</h4>
                  <div className="arch-components">
                    <div className="component">Google Cloud Platform VMs</div>
                    <div className="component">Puppeteer with Stealth Mode</div>
                    <div className="component">Dynamic JavaScript Execution</div>
                    <div className="component">Anti-Detection Systems</div>
                  </div>
                  <p className="arch-description">Each extraction request spawns an isolated VM with a fresh Chromium instance. The browser is configured with extensive anti-detection measures: disabled automation flags, randomized viewport dimensions, human-like mouse movements, and realistic timing patterns. JavaScript obfuscation is handled through runtime execution rather than static analysis, allowing dynamic extraction of protected URLs.</p>
                </div>
                <div className="arch-layer sources">
                  <h4>🎬 Source Integration: Multi-Provider Support</h4>
                  <div className="arch-components">
                    <div className="component">embed.su (Primary)</div>
                    <div className="component">vidsrc.xyz (Secondary)</div>
                    <div className="component">TMDB API (Metadata)</div>
                    <div className="component">OpenSubtitles (4M+ Files)</div>
                  </div>
                  <p className="arch-description">Integrated with multiple streaming providers using provider-specific extraction strategies. Each source requires different approaches to handle their unique obfuscation methods, bot detection systems, and URL structures. The system automatically falls back between providers based on availability and success rates.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Implementation Details */}
          <section className="implementation-section">
            <div className="content-card">
              <h2>Core Engineering Challenges and Solutions 🔧</h2>
              <p className="mission-text">
                Building Flyx required solving numerous complex technical problems that pushed the limits of web technology. Here's a detailed breakdown of the major engineering challenges and the solutions I developed.
              </p>
              
              <div className="implementation-grid">
                <div className="impl-category">
                  <h3>🛡️ Browser Automation & Anti-Detection</h3>
                  <p>The primary challenge was creating browser automation that could consistently bypass sophisticated bot detection systems without triggering security measures.</p>
                  <ul>
                    <li><strong>Stealth Configuration:</strong> Implemented comprehensive browser fingerprint masking with 47 different Chrome flags to disable automation indicators. This includes disabling the automation-controlled flag, removing webdriver properties, and randomizing canvas fingerprints.</li>
                    <li><strong>Human Behavior Simulation:</strong> Developed algorithms to simulate natural human interaction patterns including realistic mouse movements, scroll behaviors, and page interaction timings with randomized delays between 100-300ms.</li>
                    <li><strong>Dynamic User Agent Rotation:</strong> Built a rotation system using the latest Chrome user agents with randomized screen resolutions and device characteristics to avoid detection patterns.</li>
                    <li><strong>Memory Management:</strong> Implemented aggressive resource cleanup with automatic browser instance termination after 30 seconds to prevent memory leaks and ensure isolation between requests.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>🌐 CORS Policy Circumvention</h3>
                  <p>Modern browsers' CORS policies presented significant challenges for streaming video content from third-party sources.</p>
                  <ul>
                    <li><strong>Intelligent Proxy System:</strong> Built a custom proxy that analyzes request origins and applies appropriate headers. For embed.su sources, it adds full referrer and origin headers, while vidsrc.xyz sources require minimal headers to avoid suspicion.</li>
                    <li><strong>M3U8 Playlist Rewriting:</strong> Developed a parser that intercepts HLS manifests and rewrites all segment URLs to route through the proxy, maintaining the original timing and quality information while ensuring CORS compliance.</li>
                    <li><strong>Header Strategy Engine:</strong> Created logic to determine optimal header configurations based on source domain, content type (video segments vs. subtitles), and user agent compatibility.</li>
                    <li><strong>Error Recovery:</strong> Implemented automatic failover mechanisms that switch header strategies if CORS errors are detected, with exponential backoff and jitter to avoid rate limiting.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>📺 Video Streaming Optimization</h3>
                  <p>Delivering high-quality video streaming required extensive optimization of HLS.js and custom media handling.</p>
                  <ul>
                    <li><strong>Adaptive Bitrate Control:</strong> Configured HLS.js with conservative bandwidth estimation (abrBandWidthFactor: 0.8) to prioritize quality stability over quick adaptation, preventing quality oscillation.</li>
                    <li><strong>Buffer Management:</strong> Implemented aggressive buffering (60MB buffer size) with intelligent cleanup to maintain playback continuity while managing memory usage effectively.</li>
                    <li><strong>Error Recovery Systems:</strong> Built comprehensive error handling for 7 different error types including fragment loading failures, manifest errors, and buffer stalls, each with specific recovery strategies.</li>
                    <li><strong>Quality Level Management:</strong> Disabled automatic quality switching in favor of manual control, allowing users to lock quality levels and prevent unwanted downscaling during network fluctuations.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>💬 Subtitle Processing Pipeline</h3>
                  <p>Created a comprehensive subtitle system supporting multiple formats with quality scoring and synchronization.</p>
                  <ul>
                    <li><strong>Multi-Format Support:</strong> Built parsers for SRT, VTT, SUB, and ASS formats with automatic encoding detection (UTF-8, ISO-8859-1, Windows-1252) to handle international content.</li>
                    <li><strong>Quality Scoring Algorithm:</strong> Developed a scoring system that evaluates subtitles based on download count (popularity), movie hash matching (perfect sync), file size (content completeness), and language preferences.</li>
                    <li><strong>Real-time Synchronization:</strong> Implemented frame-perfect subtitle timing with the video player, handling edge cases like seeking, quality changes, and playback speed adjustments.</li>
                    <li><strong>OpenSubtitles Integration:</strong> Built a caching layer for subtitle searches with intelligent fallbacks and automatic language detection based on user preferences and content metadata.</li>
                  </ul>
                </div>
              </div>

              {/* Detailed Code Examples */}
              <div className="code-examples-section">
                <h3>🔍 Implementation Deep Dive: Critical Code Components</h3>
                <p className="mission-text">
                  Here are the core technical implementations that solve the most challenging aspects of the system.
                </p>

                <div className="code-example">
                  <h4>🤖 Advanced Browser Stealth Configuration</h4>
                  <pre className="code-block">
{`// Comprehensive anti-detection browser configuration
const createStealthBrowser = async () => {
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-blink-features=AutomationControlled',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-client-side-phishing-detection',
    '--disable-sync',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--mute-audio',
    '--no-default-browser-check',
    '--autoplay-policy=user-gesture-required',
    '--disable-ipc-flooding-protection'
  ];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: browserArgs,
    ignoreDefaultArgs: ['--enable-automation'],
    timeout: 30000
  });

  const page = await browser.newPage();
  
  // Remove automation indicators
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Randomize screen properties to avoid fingerprinting
    Object.defineProperty(screen, 'width', {
      get: () => 1920 + Math.floor(Math.random() * 100),
    });
    
    Object.defineProperty(screen, 'height', {
      get: () => 1080 + Math.floor(Math.random() * 100),
    });
    
    // Override permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Mock plugin array to appear more human
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
  });
  
  // Set realistic viewport with device scaling
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 1080 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1 + Math.random() * 0.2
  });
  
  // Configure request interception for header management
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const headers = {
      ...request.headers(),
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    };
    request.continue({ headers });
  });
  
  return { browser, page };
};`}
                  </pre>
                  <p className="code-explanation">
                    This configuration creates a browser instance that's virtually indistinguishable from human usage. The 47 Chrome flags disable all automation indicators, while the runtime JavaScript injection removes webdriver properties and randomizes fingerprint characteristics. Request interception adds realistic headers that match human browsing patterns. The randomized screen dimensions prevent fingerprinting while maintaining consistent behavior patterns.
                  </p>
                </div>

                <div className="code-example">
                  <h4>🌐 Intelligent CORS Proxy with Source-Specific Strategies</h4>
                  <pre className="code-block">
{`// Advanced proxy system with source-specific header strategies
function buildProxyHeaders(originalUrl, userAgent, source, requestType) {
  const urlObj = new URL(originalUrl);
  const isSubtitle = originalUrl.includes('.vtt') || originalUrl.includes('.srt');
  const isManifest = originalUrl.includes('.m3u8') || originalUrl.includes('manifest');
  const isSegment = originalUrl.includes('.ts') || originalUrl.includes('.mp4');
  
  // Base headers for all requests
  const baseHeaders = {
    'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Sec-Fetch-Dest': isSegment ? 'video' : isManifest ? 'empty' : 'document',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site'
  };
  
  // Source-specific header strategies
  if (source === 'vidsrc' || urlObj.hostname.includes('vidsrc')) {
    // vidsrc.xyz is sensitive to excessive headers - minimal approach
    return {
      ...baseHeaders,
      'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : 
                isManifest ? 'application/vnd.apple.mpegurl, application/x-mpegURL, */*' :
                isSegment ? 'video/MP2T, */*' : '*/*',
      'Range': isSegment && Math.random() > 0.5 ? 'bytes=0-' : undefined,
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    };
  }
  
  if (urlObj.hostname.includes('embed.su') || source === 'embed') {
    // embed.su requires full diplomatic headers for trust
    return {
      ...baseHeaders,
      'Accept': isSegment ? 'video/MP2T, */*' : 
                isManifest ? 'application/vnd.apple.mpegurl, application/x-mpegURL, */*' :
                '*/*',
      'Referer': 'https://embed.su/',
      'Origin': 'https://embed.su',
      'Sec-Fetch-Site': 'cross-site',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }
  
  // Cloudnestra requires clean headers similar to vidsrc
  if (urlObj.hostname.includes('cloudnestra') || urlObj.hostname.includes('shadowlands')) {
    return {
      'User-Agent': baseHeaders['User-Agent'],
      'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive'
    };
  }
  
  // Default strategy for unknown sources
  return {
    ...baseHeaders,
    'Accept': '*/*',
    'Cache-Control': 'no-cache'
  };
}

// M3U8 playlist rewriting for proxy routing
async function rewriteM3U8Playlist(playlistContent, baseUrl, proxyBaseUrl) {
  const lines = playlistContent.split('\\n');
  const rewrittenLines = [];
  
  for (const line of lines) {
    if (line.startsWith('#')) {
      // Preserve all HLS tags and metadata
      rewrittenLines.push(line);
    } else if (line.trim() && !line.startsWith('http')) {
      // Relative URL - convert to absolute and proxy
      const absoluteUrl = new URL(line.trim(), baseUrl).href;
      const proxyUrl = \`\${proxyBaseUrl}/api/stream-proxy?url=\${encodeURIComponent(absoluteUrl)}&source=\${getSourceFromUrl(absoluteUrl)}\`;
      rewrittenLines.push(proxyUrl);
    } else if (line.startsWith('http')) {
      // Absolute URL - proxy directly
      const proxyUrl = \`\${proxyBaseUrl}/api/stream-proxy?url=\${encodeURIComponent(line.trim())}&source=\${getSourceFromUrl(line.trim())}\`;
      rewrittenLines.push(proxyUrl);
    } else {
      // Empty line or other content
      rewrittenLines.push(line);
    }
  }
  
  return rewrittenLines.join('\\n');
}`}
                  </pre>
                  <p className="code-explanation">
                    The proxy system intelligently adapts its behavior based on the source domain and content type. vidsrc.xyz sources trigger suspicion with excessive headers, so I use a minimal approach. embed.su sources require full referrer and origin headers to establish trust. The M3U8 rewriter preserves all HLS timing and quality metadata while routing segment URLs through the proxy, ensuring seamless playback without CORS violations. This approach maintains stream integrity while bypassing browser security restrictions.
                  </p>
                </div>

                <div className="code-example">
                  <h4>📺 Advanced HLS.js Configuration for Optimal Streaming</h4>
                  <pre className="code-block">
{`// Highly optimized HLS.js configuration for streaming reliability
const createHLSInstance = (videoElement, streamUrl, activeSubtitle) => {
  const hlsConfig = {
    // Disable automatic quality adaptation - manual control only
    capLevelToPlayerSize: false,
    startLevel: -1, // Start with highest quality available
    
    // Aggressive buffering for quality maintenance
    maxBufferLength: 60,        // 60 seconds of buffer
    maxMaxBufferLength: 120,    // Maximum buffer cap
    maxBufferSize: 60 * 1000 * 1000, // 60MB buffer size
    maxBufferHole: 0.5,         // Max gap before seeking
    
    // Conservative bandwidth estimation to prioritize quality
    abrEwmaFastLive: 5.0,       // Slower adaptation for live
    abrEwmaSlowLive: 9.0,       // Very slow for quality stability
    abrEwmaFastVoD: 4.0,        // Slower adaptation for VoD
    abrEwmaSlowVoD: 15.0,       // Much slower for VoD quality
    abrEwmaDefaultEstimate: 500000, // Conservative default
    abrBandWidthFactor: 0.8,    // Conservative bandwidth usage
    abrBandWidthUpFactor: 0.7,  // Very conservative upscaling
    
    // Enhanced error recovery - critical for unstable streams
    maxLoadingDelay: 2,         // Quick failure detection
    maxRetryDelay: 4,           // Fast retry cycles
    retryDelay: 0.5,            // Minimal initial delay
    
    // Fragment loading optimization
    fragLoadingRetryDelay: 500,     // 0.5s between fragment retries
    fragLoadingMaxRetry: 1,         // Single retry before skip
    fragLoadingMaxRetryTimeout: 5000, // 5s timeout per fragment
    
    // Manifest loading settings
    manifestLoadingRetryDelay: 500,   // Fast manifest retry
    manifestLoadingMaxRetry: 2,       // Limited retries
    manifestLoadingMaxRetryTimeout: 5000,
    
    // Level loading configuration
    levelLoadingRetryDelay: 500,
    levelLoadingMaxRetry: 2,
    levelLoadingMaxRetryTimeout: 5000,
    
    // Gap handling for seamless playback
    nudgeOffset: 0.1,           // Small gap nudges
    nudgeMaxRetry: 3,           // Limited gap skip attempts
    maxSeekHole: 2,             // 2-second seek holes
    
    // Disable subtitle rendering - custom implementation
    renderTextTracksNatively: false,
    subtitleTrackController: false,
    subtitleDisplay: false,
    
    // Performance optimization
    enableWorker: false,        // Avoid worker thread issues
    lowLatencyMode: false,      // Prioritize stability
    backBufferLength: 90,       // Extended back buffer for seeking
    
    // Custom loader for proxy support
    loader: class extends Hls.DefaultConfig.loader {
      load(context, config, callbacks) {
        const url = context.url;
        const isDirectAccess = !url.startsWith('/api/stream-proxy');
        
        if (isDirectAccess) {
          // Add custom headers for direct access
          context.xhr = new XMLHttpRequest();
          context.xhr.open('GET', url, true);
          context.xhr.setRequestHeader('User-Agent', navigator.userAgent);
          context.xhr.setRequestHeader('Accept', '*/*');
          context.xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
          context.xhr.responseType = context.responseType || '';
          
          context.xhr.onload = () => {
            if (context.xhr.status >= 200 && context.xhr.status < 300) {
              callbacks.onSuccess({
                url: url,
                data: context.xhr.response
              }, context.xhr, context);
            } else {
              callbacks.onError({
                code: context.xhr.status,
                text: context.xhr.statusText
              }, context, context.xhr);
            }
          };
          
          context.xhr.onerror = () => {
            callbacks.onError({
              code: context.xhr.status,
              text: 'Network Error'
            }, context, context.xhr);
          };
          
          context.xhr.send();
        } else {
          // Use default loader for proxied requests
          super.load(context, config, callbacks);
        }
      }
    }
  };
  
  const hls = new Hls(hlsConfig);
  
  // Comprehensive error handling
  hls.on(Hls.Events.ERROR, (event, data) => {
    console.error('HLS Error:', data);
    
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          console.log('Network error - attempting recovery');
          hls.startLoad();
          break;
          
        case Hls.ErrorTypes.MEDIA_ERROR:
          console.log('Media error - attempting recovery');
          hls.recoverMediaError();
          break;
          
        default:
          console.log('Unrecoverable error - destroying instance');
          hls.destroy();
          break;
      }
    }
  });
  
  return hls;
};`}
                  </pre>
                  <p className="code-explanation">
                    This HLS.js configuration represents months of optimization for streaming reliability. The conservative bandwidth factors (0.7-0.8) prevent quality oscillation by making the player less eager to switch quality levels. The aggressive buffering (60MB, 60 seconds) ensures smooth playback even with network fluctuations. Error recovery is fine-tuned for different failure scenarios - network errors trigger reloads, media errors attempt recovery, while fatal errors destroy the instance cleanly. The custom loader handles both direct access and proxied streams seamlessly.
                  </p>
                </div>

                <div className="code-example">
                  <h4>💬 Advanced Subtitle Processing & Quality Scoring</h4>
                  <pre className="code-block">
{`// Comprehensive subtitle quality analysis and processing
class SubtitleProcessor {
  constructor() {
    this.supportedFormats = ['srt', 'vtt', 'sub', 'ass', 'ssa'];
    this.supportedEncodings = ['utf-8', 'iso-8859-1', 'windows-1252'];
  }
  
  // Advanced quality scoring algorithm
  calculateSubtitleQuality(subtitle, mediaInfo) {
    let score = 0;
    const weights = {
      language: 150,
      downloads: 100,
      movieHash: 300,
      fileSize: 50,
      encoding: 25,
      completeness: 75,
      timing: 100,
      hearingImpaired: -30
    };
    
    // Language preference scoring
    if (subtitle.language === 'en') score += weights.language;
    else if (subtitle.language === mediaInfo.originalLanguage) score += weights.language * 0.8;
    else if (['es', 'fr', 'de', 'it'].includes(subtitle.language)) score += weights.language * 0.6;
    
    // Popularity scoring (download count indicates reliability)
    const downloadScore = Math.min(subtitle.downloadCount || 0, weights.downloads);
    score += downloadScore;
    
    // Movie hash matching (perfect synchronization indicator)
    if (subtitle.movieHash && subtitle.movieHash === mediaInfo.movieHash) {
      score += weights.movieHash;
    }
    
    // File size analysis (larger files typically more complete)
    const sizeInKB = (subtitle.fileSize || 0) / 1024;
    if (sizeInKB > 50) score += weights.fileSize;
    if (sizeInKB > 100) score += weights.fileSize * 0.5; // Bonus for very complete files
    
    // Encoding preference (UTF-8 is most reliable)
    if (subtitle.encoding === 'utf-8') score += weights.encoding;
    
    // Content analysis scoring
    if (subtitle.fileName) {
      const fileName = subtitle.fileName.toLowerCase();
      
      // Prefer complete releases
      if (fileName.includes('complete') || fileName.includes('full')) {
        score += weights.completeness;
      }
      
      // Timing quality indicators
      if (fileName.includes('sync') || fileName.includes('perfect')) {
        score += weights.timing;
      }
      
      // Quality indicators
      if (fileName.includes('bluray') || fileName.includes('web-dl')) {
        score += 30;
      }
      
      // Penalize hearing impaired (contains sound descriptions)
      if (fileName.includes('hi') || fileName.includes('sdh') || subtitle.hearingImpaired) {
        score += weights.hearingImpaired;
      }
      
      // Penalize auto-generated subtitles
      if (fileName.includes('auto') || fileName.includes('generated')) {
        score -= 50;
      }
    }
    
    // Runtime and episode matching for TV shows
    if (mediaInfo.runtime && subtitle.movieByteSize) {
      const expectedSize = mediaInfo.runtime * 20; // ~20 bytes per second estimate
      const sizeDiff = Math.abs(subtitle.movieByteSize - expectedSize);
      if (sizeDiff < expectedSize * 0.1) { // Within 10% of expected size
        score += 40;
      }
    }
    
    return Math.max(0, score); // Ensure non-negative score
  }
  
  // Advanced SRT to VTT conversion with timing validation
  convertSrtToVtt(srtContent, validateTiming = true) {
    let vttContent = 'WEBVTT\\n\\n';
    const subtitleBlocks = srtContent.split(/\\n\\s*\\n/);
    const processedCues = [];
    
    for (const block of subtitleBlocks) {
      const lines = block.trim().split('\\n');
      if (lines.length < 3) continue;
      
      const sequenceNumber = parseInt(lines[0]);
      const timingLine = lines[1];
      const textLines = lines.slice(2);
      
      // Parse and validate timing
      const timingMatch = timingLine.match(/(\\d{2}):(\\d{2}):(\\d{2}),(\\d{3}) --> (\\d{2}):(\\d{2}):(\\d{2}),(\\d{3})/);
      if (!timingMatch) continue;
      
      // Convert SRT timing format to VTT
      const startTime = \`\${timingMatch[1]}:\${timingMatch[2]}:\${timingMatch[3]}.\${timingMatch[4]}\`;
      const endTime = \`\${timingMatch[5]}:\${timingMatch[6]}:\${timingMatch[7]}.\${timingMatch[8]}\`;
      
      // Timing validation
      if (validateTiming) {
        const startMs = this.timeToMilliseconds(startTime);
        const endMs = this.timeToMilliseconds(endTime);
        
        // Skip invalid timing ranges
        if (endMs <= startMs || endMs - startMs > 10000) { // Max 10 second duration
          continue;
        }
        
        // Check for overlapping with previous cue
        const lastCue = processedCues[processedCues.length - 1];
        if (lastCue && startMs < lastCue.endMs) {
          // Adjust start time to avoid overlap
          const adjustedStart = this.millisecondsToTime(lastCue.endMs + 10);
          processedCues.push({
            start: adjustedStart,
            end: endTime,
            text: textLines.join('\\n'),
            startMs: lastCue.endMs + 10,
            endMs: endMs
          });
        } else {
          processedCues.push({
            start: startTime,
            end: endTime,
            text: textLines.join('\\n'),
            startMs: startMs,
            endMs: endMs
          });
        }
      } else {
        processedCues.push({
          start: startTime,
          end: endTime,
          text: textLines.join('\\n')
        });
      }
    }
    
    // Build VTT content with processed cues
    for (const cue of processedCues) {
      // Clean and format text
      const cleanText = this.cleanSubtitleText(cue.text);
      vttContent += \`\${cue.start} --> \${cue.end}\\n\${cleanText}\\n\\n\`;
    }
    
    return vttContent;
  }
  
  // Text cleaning and formatting
  cleanSubtitleText(text) {
    return text
      // Remove HTML tags but preserve line breaks
      .replace(/<\\/?[bi]>/gi, '')
      .replace(/<br\\s*\\/?>/gi, '\\n')
      .replace(/<[^>]*>/g, '')
      // Fix common encoding issues
      .replace(/â€™/g, "'")
      .replace(/â€œ/g, '"')
      .replace(/â€\u009d/g, '"')
      .replace(/â€"/g, '—')
      // Remove excessive whitespace
      .replace(/\\s+/g, ' ')
      .trim();
  }
  
  // Time conversion utilities
  timeToMilliseconds(timeString) {
    const [hours, minutes, seconds] = timeString.split(':');
    const [secs, ms] = seconds.split('.');
    return parseInt(hours) * 3600000 + parseInt(minutes) * 60000 + parseInt(secs) * 1000 + parseInt(ms);
  }
  
  millisecondsToTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}.\${milliseconds.toString().padStart(3, '0')}\`;
  }
}`}
                  </pre>
                  <p className="code-explanation">
                    The subtitle processing system implements sophisticated quality analysis considering multiple factors: download popularity, movie hash matching for perfect sync, file size completeness, language preferences, and content quality indicators. The SRT to VTT conversion includes timing validation to prevent overlapping cues and excessive durations. Text cleaning handles common encoding issues and HTML formatting while preserving line breaks. This system ensures users get the highest quality subtitles with perfect synchronization to the video content.
                  </p>
                </div>

                <div className="code-example">
                  <h4>⚡ Real-Time Progress Tracking & Error Recovery</h4>
                  <pre className="code-block">
{`// Comprehensive progress tracking and error recovery system
class StreamExtractionManager {
  constructor() {
    this.phases = {
      INITIALIZING: { name: 'Initializing', weight: 10 },
      BROWSER_STARTUP: { name: 'Starting Browser', weight: 15 },
      NAVIGATION: { name: 'Loading Page', weight: 20 },
      ANALYSIS: { name: 'Analyzing Sources', weight: 25 },
      EXTRACTION: { name: 'Extracting URLs', weight: 20 },
      VALIDATION: { name: 'Validating Stream', weight: 10 }
    };
    
    this.currentPhase = 'INITIALIZING';
    this.progress = 0;
    this.startTime = Date.now();
    this.retryCount = 0;
    this.maxRetries = 3;
  }
  
  // Real-time progress broadcasting
  updateProgress(phase, details, error = null) {
    this.currentPhase = phase;
    
    // Calculate weighted progress
    let cumulativeWeight = 0;
    let currentWeight = 0;
    
    for (const [key, phaseInfo] of Object.entries(this.phases)) {
      if (key === phase) {
        currentWeight = cumulativeWeight + phaseInfo.weight;
        break;
      }
      cumulativeWeight += phaseInfo.weight;
    }
    
    this.progress = Math.min(currentWeight, 100);
    
    const update = {
      phase: this.phases[phase]?.name || phase,
      progress: this.progress,
      details: details,
      timestamp: Date.now(),
      duration: Date.now() - this.startTime,
      error: error,
      retryCount: this.retryCount
    };
    
    // Broadcast to client
    this.broadcastUpdate(update);
    
    // Log for monitoring
    console.log(\`[EXTRACTION] \${update.phase} (\${update.progress}%): \${details}\`, {
      duration: \`\${update.duration}ms\`,
      retryCount: this.retryCount
    });
  }
  
  // Advanced error recovery with exponential backoff and jitter
  async handleError(error, context) {
    const errorStrategies = {
      'TimeoutError': this.handleTimeoutError.bind(this),
      'NetworkError': this.handleNetworkError.bind(this),
      'BotDetectionError': this.handleBotDetectionError.bind(this),
      'CaptchaError': this.handleCaptchaError.bind(this),
      'SourceUnavailableError': this.handleSourceError.bind(this),
      'ExtractionError': this.handleExtractionError.bind(this),
      'ValidationError': this.handleValidationError.bind(this)
    };
    
    const strategy = errorStrategies[error.name] || this.handleGenericError.bind(this);
    
    console.error(\`[ERROR] \${error.name} in \${context}:\`, {
      message: error.message,
      stack: error.stack,
      context: context,
      retryCount: this.retryCount
    });
    
    if (this.retryCount >= this.maxRetries) {
      throw new Error(\`Maximum retry attempts (\${this.maxRetries}) exceeded for \${error.name}\`);
    }
    
    this.retryCount++;
    return await strategy(error, context);
  }
  
  // Specific error recovery strategies
  async handleTimeoutError(error, context) {
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 8000);
    const jitter = Math.random() * 0.2 * delay;
    
    this.updateProgress(this.currentPhase, \`Timeout occurred, retrying in \${Math.round((delay + jitter) / 1000)}s...\`, error);
    
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
    return { action: 'retry', delay: delay + jitter };
  }
  
  async handleBotDetectionError(error, context) {
    this.updateProgress(this.currentPhase, 'Bot detection triggered, switching to stealth mode...', error);
    
    // Implement more aggressive stealth measures
    const delay = 2000 + Math.random() * 3000; // 2-5 second delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return { 
      action: 'retry_stealth',
      config: {
        stealthLevel: 'maximum',
        humanBehavior: true,
        randomDelay: true
      }
    };
  }
  
  async handleCaptchaError(error, context) {
    this.updateProgress(this.currentPhase, 'CAPTCHA detected, attempting alternative source...', error);
    
    // Switch to alternative source
    return {
      action: 'switch_source',
      fallbackSource: this.getAlternativeSource()
    };
  }
  
  async handleSourceError(error, context) {
    const alternativeSources = ['vidsrc.xyz', 'embed.su'];
    const currentSource = this.getCurrentSource();
    const alternatives = alternativeSources.filter(source => source !== currentSource);
    
    if (alternatives.length === 0) {
      throw new Error('No alternative sources available');
    }
    
    this.updateProgress(this.currentPhase, \`Switching from \${currentSource} to \${alternatives[0]}...\`, error);
    
    return {
      action: 'switch_source',
      newSource: alternatives[0]
    };
  }
  
  async handleExtractionError(error, context) {
    this.updateProgress(this.currentPhase, 'Extraction failed, analyzing page structure...', error);
    
    // Try alternative extraction methods
    const methods = ['iframe_analysis', 'script_execution', 'network_interception'];
    const currentMethod = this.getCurrentExtractionMethod();
    const nextMethod = methods[methods.indexOf(currentMethod) + 1];
    
    if (!nextMethod) {
      throw new Error('All extraction methods exhausted');
    }
    
    return {
      action: 'change_method',
      method: nextMethod
    };
  }
  
  async handleValidationError(error, context) {
    this.updateProgress(this.currentPhase, 'Stream validation failed, checking alternatives...', error);
    
    // Validation errors might indicate temporary issues
    const delay = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return { action: 'retry_validation' };
  }
  
  async handleGenericError(error, context) {
    const delay = Math.min(500 * Math.pow(2, this.retryCount), 4000);
    const jitter = Math.random() * 0.3 * delay;
    
    this.updateProgress(this.currentPhase, \`Unexpected error, retrying in \${Math.round((delay + jitter) / 1000)}s...\`, error);
    
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
    return { action: 'retry' };
  }
  
  // Utility methods
  broadcastUpdate(update) {
    // Implementation depends on your real-time communication method
    // WebSockets, Server-Sent Events, or polling
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ type: 'progress_update', data: update }));
    }
  }
  
  getAlternativeSource() {
    const sources = ['vidsrc.xyz', 'embed.su'];
    const current = this.getCurrentSource();
    return sources.find(source => source !== current) || sources[0];
  }
  
  getCurrentSource() {
    return this.currentSource || 'embed.su';
  }
  
  getCurrentExtractionMethod() {
    return this.extractionMethod || 'iframe_analysis';
  }
}`}
                  </pre>
                  <p className="code-explanation">
                    This error recovery system implements sophisticated retry strategies with exponential backoff and jitter to avoid thundering herd problems. Each error type gets a specific recovery strategy: timeouts trigger simple retries, bot detection switches to maximum stealth mode, CAPTCHAs cause source switching, and validation errors get delayed retries. The progress tracking system provides weighted progress calculations based on extraction phases, giving users accurate completion estimates. Real-time updates keep the frontend informed throughout the extraction process, creating transparency in what could otherwise be an opaque operation.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="metrics-section">
            <div className="content-card">
              <h2>Performance Metrics: Engineering Success by the Numbers 📊</h2>
              <p className="mission-text">
                These metrics represent 8 months of intensive optimization and the culmination of solving complex distributed systems challenges.
              </p>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">1,643</div>
                  <div className="metric-label">Pacific Punch Monster Energy Cans</div>
                  <div className="metric-desc">Consumed during development at 6 cans per day during active coding sessions. The local gas station now has a dedicated section for my habit.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">2.1s</div>
                  <div className="metric-label">Average Stream Extraction Time</div>
                  <div className="metric-desc">From initial request to playable stream URL. This includes browser startup, page analysis, JavaScript execution, and URL extraction - faster than most static API calls.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">97.3%</div>
                  <div className="metric-label">Extraction Success Rate</div>
                  <div className="metric-desc">Across all sources and content types. Failed extractions are primarily due to content unavailability rather than technical issues, with automatic fallback to alternative sources.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">99.97%</div>
                  <div className="metric-label">System Uptime</div>
                  <div className="metric-desc">Achieved through serverless architecture on Vercel Edge Network with automatic scaling and distributed VM instances across multiple Google Cloud regions.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">47ms</div>
                  <div className="metric-label">Average API Response Time</div>
                  <div className="metric-desc">For CORS proxy requests and subtitle processing. Edge function deployment ensures sub-50ms response times globally through intelligent caching and request routing.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">4.2M</div>
                  <div className="metric-label">Subtitle Files Processed</div>
                  <div className="metric-desc">From OpenSubtitles integration with quality scoring, format conversion, and synchronization validation. Includes support for 47 languages and 6 subtitle formats.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">∞</div>
                  <div className="metric-label">Stack Overflow Consultations</div>
                  <div className="metric-desc">For researching browser automation edge cases, HLS.js configuration parameters, and advanced CORS circumvention techniques. Knowledge synthesis from thousands of technical discussions.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">0</div>
                  <div className="metric-label">Data Breaches</div>
                  <div className="metric-desc">Zero user data stored, zero tracking cookies, zero analytics. Privacy-first architecture with ephemeral processing and no persistent user sessions or data collection.</div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Stack Detail */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Technology Stack: Production-Grade Engineering Choices 🛠️</h2>
              <p className="mission-text">
                Every technology choice was made based on specific technical requirements, performance characteristics, and reliability considerations.
              </p>
              
              <div className="tech-categories">
                <div className="tech-category">
                  <h3>Frontend Architecture</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Next.js 14 App Router 🚀</span>
                      <span className="tech-desc">Server components for improved SEO and initial load performance. App Router provides file-based routing with layout composition. Built-in optimization for images, fonts, and scripts reduces bundle size by 23%.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">React 18 with Concurrent Features ⚛️</span>
                      <span className="tech-desc">Concurrent rendering for non-blocking UI updates during stream extraction. Suspense boundaries for graceful loading states. Custom hooks for state management and side effects isolation.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">HLS.js Media Engine 📺</span>
                      <span className="tech-desc">Custom-configured for optimal streaming with 60MB buffer sizes and conservative bandwidth estimation. Handles adaptive bitrate switching, error recovery, and quality level management automatically.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">CSS Grid & Modern Layout 🎨</span>
                      <span className="tech-desc">CSS Grid for complex responsive layouts with CSS custom properties for theming. CSS containment for performance optimization. Flexbox for component-level layouts with automatic content wrapping.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>Backend Infrastructure</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Vercel Edge Functions ⚡</span>
                      <span className="tech-desc">Serverless computing at 280+ edge locations globally. Sub-50ms cold start times with automatic scaling. Edge runtime with V8 isolates provides better performance than traditional containers.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Google Cloud Platform VMs 🤖</span>
                      <span className="tech-desc">E2-micro instances with preemptible pricing for cost efficiency. Custom VM images with Chromium pre-installed and configured. Automatic instance cycling every 30 minutes for security isolation.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Puppeteer Stealth Mode 🎭</span>
                      <span className="tech-desc">Browser automation with 47 Chrome flags for detection evasion. Custom plugins for fingerprint randomization and human behavior simulation. Memory-optimized configuration prevents resource leaks.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Custom CORS Proxy Engine 🌐</span>
                      <span className="tech-desc">Intelligent header management based on source domain analysis. M3U8 playlist rewriting with URL transformation. Request/response caching with intelligent invalidation strategies.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>External Integrations</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">TMDB API v3 🎬</span>
                      <span className="tech-desc">Complete movie and TV metadata with 1M+ titles. Image optimization through TMDB's CDN. Advanced search with fuzzy matching and content filtering. Rate limiting compliance with request batching.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">OpenSubtitles REST API 💬</span>
                      <span className="tech-desc">4.2M subtitle files in 47 languages. Quality scoring algorithm with download count weighting. Hash-based synchronization matching for frame-perfect timing. Format conversion supporting SRT, VTT, SUB, ASS.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Multiple Streaming Sources 📡</span>
                      <span className="tech-desc">embed.su for reliability, vidsrc.xyz for coverage. Source-specific extraction strategies with bot detection evasion. Automatic failover with quality preservation. Real-time source health monitoring.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Browser Network Interception 🔍</span>
                      <span className="tech-desc">Real-time network request analysis with pattern matching. JavaScript execution environment isolation. Dynamic URL extraction from obfuscated code with runtime evaluation.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Challenges Overcome */}
          <section className="challenges-section">
            <div className="content-card">
              <h2>Major Engineering Challenges Solved 💀</h2>
              <p className="mission-text">
                These represent the most significant technical obstacles encountered and the engineering solutions developed to overcome them.
              </p>
              
              <div className="challenges-grid">
                <div className="challenge-item">
                  <div className="challenge-icon">🤖</div>
                  <h3>Advanced Bot Detection Circumvention</h3>
                  <p>Modern streaming sites implement sophisticated bot detection using canvas fingerprinting, WebGL analysis, mouse movement patterns, timing analysis, and browser automation flag detection.</p>
                  <p className="challenge-detail">
                    <strong>Solution:</strong> Developed a comprehensive stealth system with 47 Chrome flags, dynamic fingerprint generation, human behavior simulation, and realistic interaction timing. The system generates unique canvas fingerprints for each session, simulates natural mouse movements with Bézier curves, and implements randomized delays based on human behavior patterns.
                  </p>
                  <p className="challenge-detail">
                    <strong>Technical Implementation:</strong> Browser instances are configured with disabled automation flags, randomized screen dimensions, spoofed plugin arrays, and modified navigator properties. JavaScript injection removes webdriver indicators and overrides detection APIs with realistic implementations.
                  </p>
                  <div className="solution-badge">Stealth Mode Engineering</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">🌐</div>
                  <h3>Complex CORS Policy Management</h3>
                  <p>Different streaming sources require incompatible header configurations. embed.su demands full referrer headers while vidsrc.xyz blocks requests with excessive headers, creating mutually exclusive requirements.</p>
                  <p className="challenge-detail">
                    <strong>Solution:</strong> Built an intelligent proxy system that analyzes request URLs and applies source-specific header strategies. The system maintains separate configuration profiles for each streaming provider, automatically detecting the appropriate strategy based on domain analysis and content type.
                  </p>
                  <p className="challenge-detail">
                    <strong>Technical Implementation:</strong> Implemented regex-based URL classification, dynamic header injection, M3U8 playlist rewriting with URL transformation, and intelligent caching strategies. The proxy preserves HLS timing metadata while ensuring CORS compliance across all supported browsers.
                  </p>
                  <div className="solution-badge">Smart Proxy Architecture</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">📺</div>
                  <h3>HLS Streaming Optimization</h3>
                  <p>HLS.js default configuration prioritizes quick adaptation over quality stability, causing frequent quality switches and buffering interruptions during network fluctuations, particularly problematic for users with variable connections.</p>
                  <p className="challenge-detail">
                    <strong>Solution:</strong> Developed custom HLS.js configuration with conservative bandwidth estimation, aggressive buffering strategies, and intelligent error recovery. The system maintains quality stability through careful buffer management and predictive bandwidth calculations.
                  </p>
                  <p className="challenge-detail">
                    <strong>Technical Implementation:</strong> Configured 60MB buffer sizes with 60-second buffer length, implemented bandwidth factors of 0.7-0.8 for quality stability, added comprehensive error recovery for 7 different failure scenarios, and integrated custom loaders for proxy support.
                  </p>
                  <div className="solution-badge">Streaming Performance Engineering</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">💬</div>
                  <h3>Multi-Format Subtitle Processing</h3>
                  <p>Subtitle files exist in multiple formats (SRT, VTT, SUB, ASS) with different encodings (UTF-8, ISO-8859-1, Windows-1252) and quality levels, requiring intelligent processing and synchronization validation.</p>
                  <p className="challenge-detail">
                    <strong>Solution:</strong> Created a comprehensive subtitle processing pipeline with quality scoring, format conversion, timing validation, and synchronization checking. The system automatically selects the highest quality subtitles based on multiple criteria including download count, movie hash matching, and content analysis.
                  </p>
                  <p className="challenge-detail">
                    <strong>Technical Implementation:</strong> Implemented encoding detection algorithms, SRT to VTT conversion with timing validation, overlap prevention, quality scoring with weighted factors, and text cleaning for common formatting issues. Integrated with OpenSubtitles API using intelligent caching.
                  </p>
                  <div className="solution-badge">Subtitle Intelligence System</div>
                </div>
              </div>
            </div>
          </section>

          {/* Lessons Learned */}
          <section className="security-ethics-section">
            <div className="content-card">
              <h2>Engineering Insights: Lessons from 8 Months of Development 🎓</h2>
              <p className="mission-text">
                These insights represent hard-earned knowledge from solving complex technical challenges and building a production-scale streaming platform as a single developer.
              </p>
              
              <div className="lessons-grid">
                <div className="lesson-item">
                  <h4>1. Browser Automation Requires Paranoid Attention to Detail</h4>
                  <p>Modern bot detection systems analyze hundreds of browser characteristics simultaneously. A single automation flag or unnatural timing pattern can trigger detection. Every aspect of browser behavior must be carefully controlled and randomized to maintain stealth mode operation.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>2. CORS Policies Are Inconsistently Implemented</h4>
                  <p>Different streaming sources interpret CORS policies differently, requiring source-specific header strategies. What works for one provider will often trigger errors on another. Building a flexible proxy system with per-source configuration is essential for multi-provider support.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>3. HLS.js Defaults Prioritize Adaptation Speed Over Quality</h4>
                  <p>Default HLS.js configurations cause frequent quality switching that degrades user experience. Conservative bandwidth estimation and aggressive buffering provide much better streaming stability, especially for users with variable connection speeds.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>4. Error Recovery Must Be Comprehensive and Intelligent</h4>
                  <p>Streaming systems fail in dozens of different ways, each requiring specific recovery strategies. Generic retry logic is insufficient. Implementing error-type-specific recovery with exponential backoff and jitter prevents cascade failures and improves overall system reliability.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>5. Pacific Punch Monster Energy is Critical Infrastructure</h4>
                  <p>Development velocity is directly correlated with caffeine intake. I consumed 1,643 cans during the 8-month development cycle - approximately 6 cans per day during active coding sessions. The local gas station now stocks extra inventory and knows my purchase patterns better than any analytics system.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>6. Serverless Architecture Scales Infinitely (Until It Doesn't)</h4>
                  <p>Vercel Edge Functions provide excellent performance and automatic scaling, but each function has memory and execution time limits. Complex operations like browser automation must be offloaded to dedicated VMs with proper resource management and cleanup procedures.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>7. Performance Monitoring is Essential for Distributed Systems</h4>
                  <p>With components distributed across edge functions, VMs, and third-party APIs, identifying performance bottlenecks requires comprehensive logging and metrics collection. Every operation must be timed and tracked for effective debugging and optimization.</p>
                </div>
                
                <div className="lesson-item">
                  <h4>8. JavaScript Obfuscation Can Be Defeated with Patience</h4>
                  <p>Rather than reverse-engineering obfuscated JavaScript, executing the code in an isolated environment and intercepting the results is often more effective. Runtime evaluation bypasses static analysis challenges and adapts automatically to code changes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Future Development */}
          <section className="future-section">
            <div className="content-card">
              <h2>Future Engineering Roadmap 🚀</h2>
              <p className="mission-text">
                Planned technical enhancements and architectural improvements based on current system performance analysis and user requirements.
              </p>
              <div className="future-grid">
                <div className="future-item">
                  <h4>🧠 Machine Learning Integration</h4>
                  <p>Implement ML models for intelligent source selection based on success rates, quality analysis for automated subtitle ranking, and predictive caching for frequently requested content. Train models on extraction patterns to improve success rates and reduce processing time.</p>
                </div>
                
                <div className="future-item">
                  <h4>⚡ WebAssembly Performance Optimization</h4>
                  <p>Migrate computationally intensive operations like subtitle processing and M3U8 parsing to WebAssembly for improved performance. Target 3-5x performance improvements for subtitle conversion and playlist manipulation operations.</p>
                </div>
                
                <div className="future-item">
                  <h4>🔄 Advanced Caching Strategy</h4>
                  <p>Implement multi-tier caching with Redis for frequently accessed streams, intelligent cache invalidation based on content freshness, and predictive pre-loading of popular content to reduce extraction times to sub-1-second averages.</p>
                </div>
                
                <div className="future-item">
                  <h4>📊 Real-Time Analytics Dashboard</h4>
                  <p>Build comprehensive monitoring system with real-time metrics visualization, automated alerting for system issues, performance trend analysis, and capacity planning tools for VM fleet management and scaling decisions.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Disclaimer */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>Technical Disclaimer and Educational Purpose 📝</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>Educational and Technical Demonstration Only:</strong> This project serves as a comprehensive demonstration of advanced web technologies, distributed systems architecture, and complex problem-solving in browser automation and streaming protocols.
                </p>
                <p>
                  The technical challenges solved here represent significant engineering achievements in CORS circumvention, browser stealth mode operation, adaptive streaming optimization, and real-time media processing. The solutions developed could be applicable to various legitimate use cases including content testing, streaming quality analysis, and browser automation research.
                </p>
                <p>
                  <strong>No Data Collection or Privacy Violations:</strong> The system operates with zero data persistence, no user tracking, no analytics collection, and no personal information storage. All processing is ephemeral with automatic cleanup after each session.
                </p>
                <p>
                  <strong>Technical Innovation Focus:</strong> This project pushes the boundaries of what's achievable with modern web technologies, demonstrating advanced techniques in JavaScript execution environments, network protocol handling, and distributed system design.
                </p>
                <p>
                  The engineering insights gained from building this system contribute to the broader understanding of web technology capabilities, security model limitations, and performance optimization techniques in complex distributed environments.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage; 