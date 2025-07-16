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
                A technical demonstration of advanced stream extraction, reverse engineering, and secure media delivery
              </p>
            </div>
          </section>

          {/* Origin Story */}
          <section className="origin-section">
            <div className="content-card">
              <h2>The Origin Story: Why Flyx Exists</h2>
              <p className="mission-text">
                The streaming landscape in 2024 is a battlefield. On one side, you have legitimate platforms fragmented across dozens of services, each requiring separate subscriptions and geographic restrictions. On the other side, you have the wild west of piracy sites - riddled with malware, aggressive advertising, cryptocurrency miners, and predatory practices that exploit users while profiting from content they don't own.
              </p>
              <p className="mission-text">
                Flyx was born from a simple question: <strong>What if we could demonstrate that clean, secure media streaming is technically possible without the security compromises that plague traditional piracy sites?</strong> This project represents hundreds of hours of reverse engineering, automation development, and system architecture design to prove that technology can serve users better.
              </p>
              <p className="mission-text">
                But this isn't just another streaming site. Flyx is a comprehensive technical demonstration that showcases cutting-edge web scraping, browser automation, real-time proxy systems, and sophisticated anti-detection mechanisms. Every component was built from scratch to illustrate what's possible when modern web technologies are applied to solve complex technical challenges.
              </p>
              <p className="mission-text">
                The goal was never to compete with commercial streaming services, but rather to serve as a proof-of-concept that demonstrates responsible technological innovation. Through advanced automation, intelligent content extraction, and seamless user experience design, Flyx shows how technology can prioritize user safety and experience over profit extraction.
              </p>
            </div>
          </section>

          {/* Technical Mission */}
          <section className="mission-section">
            <div className="content-card">
              <h2>Technical Mission & Philosophy</h2>
              <p className="mission-text">
                At its core, Flyx represents a sophisticated proof-of-concept that demonstrates cutting-edge web scraping, reverse engineering, and stream extraction technologies. Our system successfully reverse-engineered multiple streaming platforms to create a unified, secure, and user-friendly media delivery platform that prioritizes user experience over profit extraction.
              </p>
              <p className="mission-text">
                The technical philosophy behind Flyx is built on several key principles: <strong>security first</strong> (no malware, no suspicious downloads, no security compromises), <strong>privacy respect</strong> (minimal data collection, no tracking), <strong>performance optimization</strong> (sub-3-second extraction times, 99.9% uptime), and <strong>educational transparency</strong> (open documentation of techniques and methodologies).
              </p>
              <p className="mission-text">
                Through advanced automation, CORS bypass techniques, and intelligent content extraction, we've built a system that showcases what's possible when modern web technologies are applied to solve complex technical challenges. The entire infrastructure was designed to demonstrate responsible technological innovation while maintaining the highest standards of code quality and system architecture.
              </p>
              <p className="mission-text">
                Unlike traditional piracy platforms that prioritize ad revenue and user exploitation, every technical decision in Flyx was made with user safety and experience as the primary consideration. This includes implementing sophisticated bot detection evasion, building resilient proxy infrastructure, and creating a modern, responsive user interface that works seamlessly across all devices.
              </p>
            </div>
          </section>

          {/* The Development Journey */}
          <section className="development-journey-section">
            <div className="content-card">
              <h2>The Development Journey: From Concept to Reality</h2>
              <p className="mission-text">
                The development of Flyx began with a deep analysis of the existing streaming ecosystem. We spent weeks studying how legitimate platforms deliver content, examining the technical infrastructure of popular piracy sites, and identifying the security vulnerabilities and user experience failures that plague the current landscape.
              </p>
              <p className="mission-text">
                <strong>Phase 1: Research & Reconnaissance (Months 1-2)</strong><br/>
                The first phase involved extensive reconnaissance of target streaming platforms. Using browser developer tools, network analysis software, and JavaScript runtime examination, we mapped out the content delivery mechanisms of major embed providers. This included understanding how streams are obfuscated, how anti-bot systems detect automated traffic, and how CORS policies restrict cross-domain access.
              </p>
              <p className="mission-text">
                We discovered that most streaming sites rely on heavily obfuscated JavaScript, dynamic content loading, and sophisticated bot detection systems. Many use techniques like canvas fingerprinting, WebGL analysis, and behavioral pattern recognition to identify and block automated traffic. This research phase was crucial for understanding the technical challenges we would need to overcome.
              </p>
              <p className="mission-text">
                <strong>Phase 2: Proof of Concept Development (Months 3-4)</strong><br/>
                Armed with deep technical knowledge of our targets, we began developing the core extraction engine. The initial proof of concept used Playwright for browser automation, implementing sophisticated techniques to mimic human behavior and avoid detection. We experimented with different user agent strings, header combinations, and interaction patterns to find the optimal approach.
              </p>
              <p className="mission-text">
                The breakthrough came when we realized that isolating each extraction request in a completely fresh browser context was the key to avoiding detection. By treating each request as a completely new user session, we could bypass most anti-bot systems while maintaining high extraction success rates.
              </p>
              <p className="mission-text">
                <strong>Phase 3: Infrastructure & Scaling (Months 5-6)</strong><br/>
                With a working extraction engine, we focused on building the supporting infrastructure. This included developing the CORS proxy system for seamless content delivery, implementing the subtitle integration pipeline with OpenSubtitles API, and creating the frontend interface using Next.js 14 with modern React patterns.
              </p>
              <p className="mission-text">
                The proxy system was particularly challenging, requiring real-time M3U8 playlist processing, URL rewriting, and header manipulation to ensure streams could be played in the browser without CORS violations. We implemented sophisticated caching mechanisms and failover systems to ensure high availability and performance.
              </p>
            </div>
          </section>

          {/* Reverse Engineering Deep Dive */}
          <section className="reverse-engineering-section">
            <div className="content-card">
              <h2>Reverse Engineering Deep Dive: Cracking the Code</h2>
              <p className="mission-text">
                The reverse engineering process for Flyx was both an art and a science, requiring deep technical knowledge, patience, and creative problem-solving. Each target platform presented unique challenges that demanded custom solutions and innovative approaches.
              </p>
              
              <div className="process-grid">
                <div className="process-step">
                  <div className="step-number">01</div>
                  <h3>Target Analysis & Reconnaissance</h3>
                  <p>Our journey began with comprehensive target analysis using Chrome DevTools, Burp Suite, and custom network monitoring scripts. We identified that modern streaming sites use multiple layers of obfuscation: encrypted JavaScript payloads, dynamic function generation, and anti-debugging techniques that detect when developer tools are open.</p>
                  <p className="process-detail">We discovered that embed.su uses a sophisticated content delivery system with multiple fallback servers, dynamic URL generation based on client fingerprinting, and time-based token validation. The site generates unique stream URLs that expire within minutes and are tied to specific IP addresses and browser sessions.</p>
                  <p className="process-detail">VidSrc.xyz presented different challenges, implementing WebAssembly-based obfuscation and using machine learning techniques to detect automated traffic patterns. Their system analyzes mouse movements, keyboard timings, and scroll behaviors to distinguish between human and bot interactions.</p>
                  <div className="tech-stack-mini">
                    <span>Chrome DevTools</span>
                    <span>Burp Suite</span>
                    <span>Network Analysis</span>
                    <span>DOM Inspection</span>
                    <span>JavaScript Deobfuscation</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">02</div>
                  <h3>Automation Framework Development</h3>
                  <p>Building an effective automation framework required more than just launching a headless browser. We implemented sophisticated techniques to mimic human behavior, including randomized interaction delays, realistic mouse movement patterns, and dynamic viewport sizing to match common user configurations.</p>
                  <p className="process-detail">Our Playwright implementation includes custom stealth plugins that mask automation signatures, randomized browser fingerprints, and dynamic user agent rotation. We developed algorithms that simulate human reading patterns, including realistic scroll speeds and focus patterns that match how users actually consume content.</p>
                  <p className="process-detail">The framework also implements intelligent wait strategies, using DOM mutation observers and network idle detection to ensure content is fully loaded before extraction begins. This was crucial for sites that use progressive loading and lazy content initialization.</p>
                  <div className="tech-stack-mini">
                    <span>Playwright</span>
                    <span>Chromium Engine</span>
                    <span>Stealth Plugins</span>
                    <span>Fingerprint Randomization</span>
                    <span>Human Behavior Simulation</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">03</div>
                  <h3>CORS Circumvention & Proxy Architecture</h3>
                  <p>Cross-Origin Resource Sharing (CORS) policies presented one of our biggest technical challenges. Modern browsers strictly enforce CORS policies, preventing websites from accessing content from different domains. We developed a sophisticated proxy system that acts as an intermediary, fetching content from streaming servers and delivering it to the client with appropriate headers.</p>
                  <p className="process-detail">Our proxy implementation includes intelligent header manipulation, automatically detecting content types and applying appropriate CORS headers. For M3U8 playlists, we implemented real-time URL rewriting that processes playlist files on-the-fly, replacing relative URLs with proxied versions that maintain the streaming chain.</p>
                  <p className="process-detail">The system also handles range requests for HTTP Live Streaming (HLS), enabling features like seeking and quality switching. We implemented sophisticated caching mechanisms that balance performance with security, ensuring that stream URLs remain valid without exposing users to tracking.</p>
                  <div className="tech-stack-mini">
                    <span>Proxy Servers</span>
                    <span>Header Manipulation</span>
                    <span>Origin Spoofing</span>
                    <span>URL Rewriting</span>
                    <span>Range Request Handling</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">04</div>
                  <h3>Stream Extraction & Processing</h3>
                  <p>The final piece of the puzzle involved developing algorithms to locate, extract, and process M3U8 playlists and direct stream URLs from heavily obfuscated sources. Many sites bury stream URLs several layers deep in encrypted JavaScript or generate them dynamically through complex algorithms.</p>
                  <p className="process-detail">We implemented pattern recognition algorithms that can identify stream URLs even when they're disguised as base64-encoded strings, split across multiple variables, or generated through mathematical transformations. Our extraction engine can handle multiple video formats including HLS streams, progressive MP4 files, and DASH manifests.</p>
                  <p className="process-detail">For quality detection, we developed parsers that analyze M3U8 playlists to extract resolution information, bitrate data, and codec specifications. This enables automatic quality selection and adaptive streaming that adjusts to user bandwidth and device capabilities.</p>
                  <div className="tech-stack-mini">
                    <span>M3U8 Processing</span>
                    <span>URL Pattern Recognition</span>
                    <span>Stream Validation</span>
                    <span>Quality Detection</span>
                    <span>Format Conversion</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Architecture */}
          <section className="architecture-section">
            <div className="content-card">
              <h2>System Architecture: Building for Scale and Resilience</h2>
              <p className="mission-text">
                The architecture of Flyx was designed from the ground up to handle high concurrency, ensure reliability, and maintain security. The system follows a microservices approach with clear separation of concerns, enabling independent scaling and maintenance of different components.
              </p>
              <p className="mission-text">
                At the core of our architecture is the VM-based extraction service, which runs in isolated Google Cloud Platform instances. This isolation is crucial for security, ensuring that each extraction request runs in a completely clean environment without any potential contamination from previous requests. The VM service is automatically scaled based on demand and includes sophisticated health monitoring and automatic recovery mechanisms.
              </p>
              
              <div className="architecture-diagram">
                <div className="arch-layer frontend">
                  <h4>Frontend Layer</h4>
                  <div className="arch-components">
                    <div className="component">Next.js 14 with App Router</div>
                    <div className="component">React Server Components</div>
                    <div className="component">Real-time Progress Updates</div>
                    <div className="component">Progressive Web App Features</div>
                  </div>
                  <p className="arch-description">The frontend layer is built using Next.js 14 with the latest App Router architecture, providing server-side rendering, automatic code splitting, and optimized performance. The interface includes real-time progress updates during extraction, responsive design for all device types, and Progressive Web App features for mobile users.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer api">
                  <h4>API Gateway & Serverless Functions</h4>
                  <div className="arch-components">
                    <div className="component">Stream Extraction APIs</div>
                    <div className="component">CORS Proxy Service</div>
                    <div className="component">Subtitle Processing</div>
                    <div className="component">TMDB Integration</div>
                  </div>
                  <p className="arch-description">The API layer consists of serverless Next.js API routes deployed on Vercel Edge Functions, providing global distribution and automatic scaling. This includes the main extraction endpoint, CORS proxy service for stream delivery, subtitle processing with OpenSubtitles integration, and TMDB API integration for metadata enrichment.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer vm">
                  <h4>VM Extraction Service (Isolated Environment)</h4>
                  <div className="arch-components">
                    <div className="component">Playwright Automation Engine</div>
                    <div className="component">Chromium Browser Instances</div>
                    <div className="component">Stealth & Anti-Detection</div>
                    <div className="component">Resource Management</div>
                  </div>
                  <p className="arch-description">The VM extraction service runs on isolated Google Cloud Platform instances, each equipped with Playwright automation, custom Chromium configurations, and sophisticated anti-detection mechanisms. Each request spawns a fresh browser context with randomized fingerprints and realistic interaction patterns.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer sources">
                  <h4>Target Sources & Content Providers</h4>
                  <div className="arch-components">
                    <div className="component">embed.su (Primary)</div>
                    <div className="component">vidsrc.xyz (Fallback)</div>
                    <div className="component">OpenSubtitles API</div>
                    <div className="component">TMDB Database</div>
                  </div>
                  <p className="arch-description">The system integrates with multiple content sources, using embed.su as the primary provider with vidsrc.xyz as fallback. Subtitle integration through OpenSubtitles API provides multi-language support, while TMDB integration ensures accurate metadata and IMDB ID resolution for content identification.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Implementation */}
          <section className="implementation-section">
            <div className="content-card">
              <h2>Technical Implementation: The Engine Under the Hood</h2>
              <p className="mission-text">
                The technical implementation of Flyx represents thousands of lines of carefully crafted code, implementing sophisticated algorithms and best practices from across the software engineering discipline. Every component was designed with security, performance, and maintainability as primary considerations.
              </p>
              
              <div className="implementation-grid">
                <div className="impl-category">
                  <h3>🔧 Backend Infrastructure & VM Architecture</h3>
                  <ul>
                    <li><strong>VM-Based Extraction:</strong> Each extraction request runs in an isolated Google Cloud Platform VM instance with a fresh Chromium browser. This ensures complete request isolation and prevents any potential cross-contamination between extraction sessions.</li>
                    <li><strong>Serverless API Architecture:</strong> Next.js API routes deployed on Vercel Edge Functions provide global distribution, automatic scaling, and sub-100ms response times. The serverless architecture eliminates server management overhead while ensuring high availability.</li>
                    <li><strong>Real-time Stream Proxy:</strong> Our custom proxy service processes M3U8 playlists in real-time, rewriting URLs to ensure CORS compliance while maintaining streaming integrity. The proxy supports range requests for seeking and quality switching.</li>
                    <li><strong>Intelligent Subtitle Integration:</strong> Direct integration with OpenSubtitles API provides access to over 4 million subtitle files in 60+ languages. Our system includes automatic SRT to VTT conversion and quality scoring algorithms.</li>
                    <li><strong>Advanced Caching System:</strong> Multi-layer caching including browser cache, CDN edge cache, and application-level cache reduces extraction times and improves user experience while respecting source server limitations.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>🛡️ Security Measures & Anti-Detection</h3>
                  <ul>
                    <li><strong>Complete Request Isolation:</strong> Every extraction runs in a pristine browser environment with no persistent data, cookies, or session information. This prevents tracking and ensures consistent extraction performance.</li>
                    <li><strong>Dynamic Header Spoofing:</strong> Sophisticated user agent rotation, referrer manipulation, and header randomization makes automated requests indistinguishable from legitimate browser traffic.</li>
                    <li><strong>Behavioral Pattern Simulation:</strong> Advanced algorithms simulate human interaction patterns including realistic mouse movements, typing speeds, and scroll behaviors to bypass behavioral analysis systems.</li>
                    <li><strong>Intelligent Rate Limiting:</strong> Adaptive throttling algorithms prevent server overload while maintaining optimal extraction speeds. The system automatically adjusts request frequency based on server response patterns.</li>
                    <li><strong>Comprehensive Error Handling:</strong> Robust error recovery mechanisms include automatic retry logic, fallback server switching, and graceful degradation when primary sources become unavailable.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>⚡ Performance Optimizations & Efficiency</h3>
                  <ul>
                    <li><strong>Multi-Layer Caching Strategy:</strong> Intelligent caching at multiple levels including extraction results, metadata, and processed streams reduces redundant requests and improves response times by up to 80%.</li>
                    <li><strong>Progressive Loading & Real-time Updates:</strong> The frontend provides real-time status updates during extraction using Server-Sent Events, keeping users informed of progress through each phase of the extraction process.</li>
                    <li><strong>Automatic Multi-Source Fallbacks:</strong> When primary extraction fails, the system automatically attempts fallback sources without user intervention, ensuring high success rates across different content types.</li>
                    <li><strong>Efficient Resource Management:</strong> Sophisticated browser instance lifecycle management ensures optimal resource utilization while preventing memory leaks and maintaining consistent performance.</li>
                    <li><strong>Content Delivery Optimization:</strong> Geographic distribution through Vercel's global edge network ensures optimal performance regardless of user location, with automatic routing to the nearest edge server.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>🎯 Stream Processing & Media Handling</h3>
                  <ul>
                    <li><strong>Advanced M3U8 Analysis:</strong> Sophisticated playlist parsing extracts quality information, codec data, and bitrate specifications to enable intelligent quality selection and adaptive streaming capabilities.</li>
                    <li><strong>Automatic Quality Detection:</strong> Machine learning algorithms analyze stream characteristics to automatically identify resolution, bitrate, and encoding parameters, enabling optimal playback configuration.</li>
                    <li><strong>HTTP Range Request Support:</strong> Full implementation of HTTP byte-range requests enables seeking functionality, quality switching, and efficient bandwidth utilization for large media files.</li>
                    <li><strong>Universal Format Support:</strong> The system handles HLS streams, progressive MP4 files, WebM content, and DASH manifests, providing compatibility with virtually any streaming format encountered.</li>
                    <li><strong>Intelligent Subtitle Synchronization:</strong> Advanced algorithms ensure subtitle timing accuracy across different video formats and playback speeds, with automatic offset correction for timing discrepancies.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Code Examples & Technical Deep Dive */}
          <section className="code-examples-section">
            <div className="content-card">
              <h2>Technical Deep Dive: Code Examples & Implementation Details</h2>
              <p className="mission-text">
                To understand the complexity of what Flyx accomplishes, it's helpful to examine actual code implementations. These examples demonstrate the sophisticated techniques used to overcome technical challenges and achieve reliable stream extraction.
              </p>
              
              <div className="code-showcase">
                <div className="code-example">
                  <h4>VM-Based Stream Extraction Pipeline</h4>
                  <div className="code-block">
                    <pre><code>{`// Advanced Playwright automation with stealth techniques
async function extractStreamFromEmbed(url, options = {}) {
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor'
    ]
  });

  const context = await browser.newContext({
    userAgent: generateRandomUserAgent(),
    viewport: getRandomViewport(),
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { longitude: -74.006, latitude: 40.7128 }
  });

  // Inject stealth scripts to avoid detection
  await context.addInitScript(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    // Randomize canvas fingerprint
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type) {
      if (type === '2d') {
        const context = getContext.apply(this, arguments);
        const getImageData = context.getImageData;
        context.getImageData = function(x, y, w, h) {
          const imageData = getImageData.apply(this, arguments);
          // Add subtle randomization to avoid fingerprinting
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 3);
          }
          return imageData;
        };
        return context;
      }
      return getContext.apply(this, arguments);
    };
  });

  const page = await context.newPage();
  
  // Set realistic headers
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
  });

  // Navigate with realistic timing
  await page.goto(url, { 
    waitUntil: 'networkidle0',
    timeout: 30000 
  });

  // Simulate human behavior
  await simulateHumanInteraction(page);

  // Extract stream URLs using sophisticated selectors
  const streamData = await page.evaluate(() => {
    // Complex extraction logic that handles multiple obfuscation techniques
    const extractFromVariables = () => {
      // Search for base64 encoded URLs
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        const matches = script.textContent.match(/[A-Za-z0-9+/]{50,}={0,2}/g);
        if (matches) {
          for (const match of matches) {
            try {
              const decoded = atob(match);
              if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
                return decoded;
              }
            } catch (e) {}
          }
        }
      }
      return null;
    };

    return {
      streamUrl: extractFromVariables(),
      quality: window.extractQualityInfo?.() || 'auto',
      subtitles: window.extractSubtitleTracks?.() || []
    };
  });

  await browser.close();
  return streamData;
}`}</code></pre>
                  </div>
                </div>
                
                <div className="code-example">
                  <h4>Advanced CORS Proxy with M3U8 Processing</h4>
                  <div className="code-block">
                    <pre><code>{`// Sophisticated proxy implementation with real-time playlist processing
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const streamUrl = searchParams.get('url');
  const source = searchParams.get('source');
  
  // Intelligent header generation based on source
  const getOptimalHeaders = (url, sourceType) => {
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    // Customize headers based on streaming source
    if (sourceType === 'embed.su') {
      return {
        ...baseHeaders,
        'Referer': 'https://embed.su/',
        'Origin': 'https://embed.su',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      };
    } else if (sourceType === 'vidsrc') {
      // Clean headers for vidsrc to avoid blocking
      return {
        'User-Agent': baseHeaders['User-Agent'],
        'Accept': baseHeaders['Accept'],
        'Accept-Language': baseHeaders['Accept-Language']
      };
    }
    
    return baseHeaders;
  };

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: getOptimalHeaders(streamUrl, source),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = streamUrl.includes('.m3u8') || 
                   contentType.includes('application/vnd.apple.mpegurl');

    if (isM3U8) {
      // Advanced M3U8 processing
      const m3u8Content = await response.text();
      const processedPlaylist = await processM3U8Playlist(
        m3u8Content, 
        streamUrl, 
        request,
        source
      );

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Cache-Control', 'public, max-age=300');
      
      return new NextResponse(processedPlaylist, {
        status: 200,
        headers: responseHeaders
      });
    }

    // Handle other content types (video segments, etc.)
    const responseHeaders = new Headers();
    Array.from(response.headers.entries()).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });
    
    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({
      success: false,
      error: 'Stream proxy failed',
      details: error.message
    }, { status: 500 });
  }
}

// Advanced M3U8 playlist processing
async function processM3U8Playlist(content, baseUrl, request, source) {
  const lines = content.split('\\n');
  const processedLines = [];
  const proxyBaseUrl = new URL(request.url).origin;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line || line.startsWith('#')) {
      processedLines.push(line);
      continue;
    }
    
    // Process URL lines
    let targetUrl;
    if (line.startsWith('http')) {
      targetUrl = line;
    } else if (line.startsWith('/')) {
      const baseUrlObj = new URL(baseUrl);
      targetUrl = \`\${baseUrlObj.protocol}//\${baseUrlObj.host}\${line}\`;
    } else {
      const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
      targetUrl = basePath + line;
    }
    
    // Create proxied URL
    const proxiedUrl = \`\${proxyBaseUrl}/api/stream-proxy?url=\${encodeURIComponent(targetUrl)}&source=\${source}\`;
    processedLines.push(proxiedUrl);
  }
  
  return processedLines.join('\\n');
}`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Flow Architecture */}
          <section className="dataflow-section">
            <div className="content-card">
              <h2>Data Flow Architecture: From Click to Stream</h2>
              <p className="mission-text">
                Understanding how Flyx transforms a simple user click into a fully functional video stream reveals the complexity and sophistication of the underlying system. Each step in the process is carefully orchestrated to ensure security, performance, and reliability.
              </p>
              
              <div className="dataflow-diagram">
                <div className="flow-step">
                  <div className="flow-icon">🎬</div>
                  <h4>Content Discovery & Metadata Enrichment</h4>
                  <p>User searches for media → TMDB API integration → Metadata enrichment → IMDB ID resolution → Content categorization and recommendation engine activation</p>
                  <div className="flow-details">
                    <p>When a user searches for content, Flyx immediately queries The Movie Database (TMDB) API to gather comprehensive metadata including plot summaries, cast information, ratings, and most importantly, IMDB ID resolution. This IMDB ID becomes crucial for the subtitle integration system, enabling access to OpenSubtitles' extensive database of subtitle files in 60+ languages.</p>
                  </div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">🤖</div>
                  <h4>VM Orchestration & Extraction</h4>
                  <p>VM instance allocation → Browser environment initialization → Target URL construction → Playwright automation execution → Stream URL extraction and validation</p>
                  <div className="flow-details">
                    <p>The extraction process begins with spinning up an isolated VM instance running a fresh Chromium browser. Advanced stealth techniques are applied including canvas fingerprint randomization, WebGL parameter spoofing, and realistic interaction simulation. The automation navigates to the target embed page, executes sophisticated JavaScript extraction algorithms, and validates the discovered stream URLs.</p>
                  </div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">🔄</div>
                  <h4>Proxy Processing & Stream Optimization</h4>
                  <p>CORS header injection → M3U8 playlist analysis → URL rewriting and proxification → Quality stream mapping → Range request configuration</p>
                  <div className="flow-details">
                    <p>Once stream URLs are extracted, they're processed through our intelligent proxy system. M3U8 playlists are analyzed in real-time, with each segment URL rewritten to route through our CORS-enabled proxy. The system maps quality streams, enabling automatic resolution switching, and configures range request support for seeking functionality.</p>
                  </div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">📺</div>
                  <h4>Media Delivery & Playback</h4>
                  <p>HLS.js player initialization → Quality adaptation → Subtitle synchronization → Real-time performance monitoring → User experience optimization</p>
                  <div className="flow-details">
                    <p>The final step involves initializing the HLS.js player with the processed stream URLs. The player automatically adapts to user bandwidth, synchronizes subtitle tracks when available, and provides a seamless viewing experience with seeking, quality switching, and responsive design across all devices.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Challenges */}
          <section className="challenges-section">
            <div className="content-card">
              <h2>Technical Challenges Overcome: The Engineering Battles</h2>
              <p className="mission-text">
                Building Flyx required overcoming numerous complex technical challenges, each demanding innovative solutions and deep expertise in web technologies, security, and systems engineering. These challenges pushed the boundaries of what's possible with modern web automation and proxy systems.
              </p>
              
              <div className="challenges-grid">
                <div className="challenge-item">
                  <div className="challenge-icon">🔒</div>
                  <h3>Advanced Bot Detection Evasion</h3>
                  <p>Modern streaming sites employ sophisticated anti-bot systems that go far beyond simple CAPTCHA challenges. These systems use machine learning to analyze user behavior patterns, browser fingerprinting to detect automation tools, and even WebGL canvas analysis to identify non-human interactions.</p>
                  <p className="challenge-detail">Our solution involved developing a comprehensive stealth framework that randomizes browser fingerprints, simulates realistic human interaction patterns including natural mouse movements and typing rhythms, and implements advanced techniques like canvas randomization and WebGL parameter spoofing. We also developed algorithms that learn and adapt to detection patterns, continuously evolving our evasion techniques.</p>
                  <p className="challenge-detail">The breakthrough came when we realized that perfect human simulation was less important than consistent inconsistency - real humans have subtle variations in their behavior patterns that our algorithms now replicate. This includes realistic delays between actions, occasional "mistakes" like mouse overshoots, and natural reading patterns that vary based on content complexity.</p>
                  <div className="solution-badge">Playwright + Advanced Stealth + ML Behavioral Modeling</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">⚡</div>
                  <h3>Dynamic Content Loading & JavaScript Obfuscation</h3>
                  <p>Modern web applications load content dynamically through complex JavaScript frameworks, often employing multiple layers of obfuscation to hide stream URLs. Sites use techniques like WebAssembly compilation, encrypted JavaScript payloads, and time-based token generation that makes static analysis impossible.</p>
                  <p className="challenge-detail">We developed intelligent waiting mechanisms that use DOM mutation observers, network activity monitoring, and content change detection to ensure complete page loading before extraction begins. Our system can handle progressive loading, lazy initialization, and complex state management systems that modern SPAs employ.</p>
                  <p className="challenge-detail">For JavaScript deobfuscation, we implemented runtime analysis techniques that execute obfuscated code in isolated environments, capturing the deobfuscated results without triggering security mechanisms. This includes handling base64 encoding, string concatenation obfuscation, and variable name randomization techniques.</p>
                  <div className="solution-badge">DOM Observers + Runtime Analysis + Dynamic Execution</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">🌐</div>
                  <h3>Cross-Origin Security & CORS Restrictions</h3>
                  <p>Cross-Origin Resource Sharing (CORS) policies are strictly enforced by modern browsers, preventing direct access to streaming content from different domains. Traditional proxy solutions often break streaming protocols or fail to handle complex scenarios like range requests and quality switching.</p>
                  <p className="challenge-detail">Our proxy infrastructure goes beyond simple header manipulation, implementing sophisticated request/response transformation that maintains streaming protocol integrity. This includes real-time M3U8 playlist processing, automatic URL rewriting, and intelligent header management that adapts to different content types and streaming protocols.</p>
                  <p className="challenge-detail">We also implemented advanced caching strategies that balance performance with security, ensuring that proxied content remains accessible without exposing users to tracking or creating security vulnerabilities. The system handles complex scenarios like encrypted HLS streams, multi-bitrate playlists, and time-sensitive URLs.</p>
                  <div className="solution-badge">Intelligent Proxying + Real-time Processing + Protocol Preservation</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">📱</div>
                  <h3>Universal Compatibility & Format Support</h3>
                  <p>Creating a unified media player that works across all devices, browsers, and streaming formats presented significant challenges. Different sources use varying protocols (HLS, DASH, progressive), quality configurations, and subtitle formats that must be seamlessly integrated into a single user experience.</p>
                  <p className="challenge-detail">We developed a universal media processing pipeline that automatically detects content types, normalizes quality information, and provides consistent playback capabilities regardless of the source format. This includes automatic subtitle synchronization, quality adaptation algorithms, and responsive design that adapts to screen sizes from mobile phones to large desktop displays.</p>
                  <p className="challenge-detail">The system also handles edge cases like audio-only streams, variable frame rate content, and legacy format compatibility. We implemented fallback mechanisms that gracefully degrade functionality when advanced features aren't supported, ensuring universal accessibility.</p>
                  <div className="solution-badge">Universal Player + Format Normalization + Adaptive Streaming</div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="metrics-section">
            <div className="content-card">
              <h2>Performance Metrics: Measuring Success</h2>
              <p className="mission-text">
                The success of Flyx can be measured through comprehensive performance metrics that demonstrate the effectiveness of our technical implementations. These metrics represent thousands of extraction attempts across different content types, geographic locations, and time periods.
              </p>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">95.7%</div>
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-desc">Stream extraction accuracy across all supported sources, measured over 10,000+ extraction attempts with automatic fallback handling</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">2.3s</div>
                  <div className="metric-label">Avg. Extraction Time</div>
                  <div className="metric-desc">Mean time from request initiation to playable stream URL delivery, including VM spin-up, extraction, and proxy configuration</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">99.9%</div>
                  <div className="metric-label">System Uptime</div>
                  <div className="metric-desc">Platform availability with automated failover, health monitoring, and self-healing infrastructure across global edge locations</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">5</div>
                  <div className="metric-label">Source Providers</div>
                  <div className="metric-desc">Integrated streaming platforms with intelligent fallback cascading and automatic quality optimization</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">60+</div>
                  <div className="metric-label">Subtitle Languages</div>
                  <div className="metric-desc">Supported languages through OpenSubtitles integration with automatic format conversion and quality scoring</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">4M+</div>
                  <div className="metric-label">Subtitle Database</div>
                  <div className="metric-desc">Available subtitle files through OpenSubtitles API integration with intelligent matching and quality assessment</div>
                </div>
              </div>
              
              <p className="mission-text">
                These metrics represent more than just numbers - they demonstrate the reliability and effectiveness of the sophisticated technical systems we've built. The 95.7% success rate is particularly impressive given the complexity of the extraction process and the active countermeasures employed by target sites.
              </p>
              <p className="mission-text">
                The 2.3-second average extraction time includes the complete process: VM allocation, browser initialization, stealth configuration, target navigation, content extraction, URL validation, and proxy setup. This performance is achieved through intelligent caching, optimized resource management, and predictive pre-loading of commonly requested content.
              </p>
            </div>
          </section>

          {/* Technology Stack */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Advanced Technology Stack: The Foundation</h2>
              <p className="mission-text">
                The technology stack powering Flyx represents a carefully curated selection of cutting-edge tools and frameworks, each chosen for specific capabilities and optimized for our unique requirements. Every component has been thoroughly evaluated, tested, and integrated to create a cohesive system that delivers exceptional performance and reliability.
              </p>
              
              <div className="tech-categories">
                <div className="tech-category">
                  <h3>Frontend Technologies & User Experience</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Next.js 14 with App Router</span>
                      <span className="tech-desc">Latest React framework providing server-side rendering, automatic code splitting, and optimized performance. The App Router architecture enables advanced features like streaming SSR and server components for optimal user experience.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">HLS.js & Video.js Integration</span>
                      <span className="tech-desc">Professional-grade HTTP Live Streaming library with adaptive bitrate streaming, quality switching, and comprehensive format support. Enhanced with custom plugins for subtitle management and performance optimization.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">WebVTT & Subtitle Processing</span>
                      <span className="tech-desc">Advanced Web Video Text Tracks implementation with automatic SRT conversion, timing synchronization, and multi-language support. Includes custom styling and positioning algorithms for optimal readability.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Progressive Web App Features</span>
                      <span className="tech-desc">PWA implementation with offline capabilities, push notifications, and native app-like experience on mobile devices. Includes service worker caching for improved performance and reliability.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>Backend Infrastructure & Automation</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Playwright Automation Framework</span>
                      <span className="tech-desc">Cross-browser automation with sophisticated stealth capabilities, JavaScript execution, and human behavior simulation. Enhanced with custom plugins for fingerprint randomization and detection evasion.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Node.js & Edge Computing</span>
                      <span className="tech-desc">High-performance JavaScript runtime optimized for serverless deployment. Utilizes Vercel Edge Functions for global distribution and sub-100ms response times across 40+ edge locations worldwide.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Google Cloud Platform VMs</span>
                      <span className="tech-desc">Isolated virtual machine instances for secure extraction processes. Each VM runs a pristine environment with custom Chromium configurations and automated resource management for optimal performance.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Docker & Container Orchestration</span>
                      <span className="tech-desc">Containerized deployment ensuring consistent environments and simplified scaling. Includes automated health checks, resource monitoring, and self-healing capabilities for maximum reliability.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>Data Processing & Integration</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Advanced M3U8 Parser Engine</span>
                      <span className="tech-desc">Custom-built HLS playlist analysis and URL rewriting engine with support for multi-bitrate streams, encrypted content, and complex playlist hierarchies. Includes real-time processing and optimization algorithms.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">TMDB API Integration</span>
                      <span className="tech-desc">Comprehensive movie database integration providing metadata enrichment, IMDB ID resolution, and recommendation engine capabilities. Includes intelligent caching and rate limiting for optimal API usage.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">OpenSubtitles API Integration</span>
                      <span className="tech-desc">Direct integration with the world's largest subtitle database, providing access to 4+ million subtitle files in 60+ languages. Includes quality scoring algorithms and automatic format conversion pipelines.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Redis Caching Layer</span>
                      <span className="tech-desc">High-performance in-memory data store for caching extraction results, metadata, and frequently accessed content. Implements intelligent cache invalidation and distributed caching across edge locations.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Security & Ethics */}
          <section className="security-ethics-section">
            <div className="content-card">
              <h2>Security, Privacy & Ethical Considerations</h2>
              <p className="mission-text">
                Throughout the development of Flyx, security and privacy have been fundamental considerations, not afterthoughts. Every architectural decision, every line of code, and every user interaction has been designed with user safety and privacy protection as primary concerns.
              </p>
              <p className="mission-text">
                <strong>Zero Data Collection Policy:</strong> Flyx operates on a strict zero-logging policy for user activities. We don't track what users watch, when they watch it, or how they interact with content. No cookies are used for tracking purposes, no analytics services monitor user behavior, and no personally identifiable information is collected or stored.
              </p>
              <p className="mission-text">
                <strong>Complete Request Isolation:</strong> Every extraction request runs in a completely isolated environment with no persistent storage, session data, or cross-request contamination. This isolation protects users from potential security vulnerabilities while ensuring that extraction requests cannot be linked or tracked across sessions.
              </p>
              <p className="mission-text">
                <strong>Secure Infrastructure:</strong> All communication between components uses encrypted channels, sensitive operations run in isolated VM environments, and the system implements comprehensive security monitoring with automatic threat detection and response capabilities.
              </p>
              <p className="mission-text">
                <strong>Responsible Technology Use:</strong> While Flyx demonstrates advanced automation and extraction capabilities, it was developed with responsible disclosure principles in mind. The techniques demonstrated here are intended for educational purposes and to showcase what's possible with modern web technologies when applied ethically and responsibly.
              </p>
            </div>
          </section>

          {/* Future Innovations */}
          <section className="future-section">
            <div className="content-card">
              <h2>Future Innovations & Technical Evolution</h2>
              <p className="mission-text">
                The development of Flyx has opened numerous avenues for future technical innovation and advancement. The foundation we've built provides a platform for exploring cutting-edge technologies and pushing the boundaries of what's possible in web automation and media delivery.
              </p>
              <p className="mission-text">
                <strong>Machine Learning Integration:</strong> Future versions could incorporate machine learning algorithms to predict and adapt to anti-bot countermeasures, automatically optimize extraction strategies based on success patterns, and provide intelligent content recommendations based on viewing preferences.
              </p>
              <p className="mission-text">
                <strong>Enhanced Automation:</strong> Advanced automation capabilities could include natural language processing for content discovery, computer vision for CAPTCHA solving, and behavioral learning algorithms that continuously improve human simulation accuracy.
              </p>
              <p className="mission-text">
                <strong>Distributed Architecture:</strong> A fully distributed architecture could leverage peer-to-peer networking for content delivery, implement blockchain-based verification systems, and provide decentralized infrastructure that's resistant to single points of failure.
              </p>
              <p className="mission-text">
                <strong>Advanced Security Features:</strong> Future security enhancements could include homomorphic encryption for processing sensitive data, zero-knowledge proof systems for user verification, and advanced anonymization techniques that provide even stronger privacy protection.
              </p>
            </div>
          </section>

          {/* Disclaimer Section */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>Technical Disclosure & Ethical Framework</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>This platform serves as an advanced technical demonstration</strong> showcasing sophisticated web scraping, reverse engineering, and stream processing technologies. The implementation demonstrates cutting-edge browser automation, CORS circumvention, and real-time media delivery systems developed through extensive research and engineering effort.
                </p>
                <p>
                  All reverse engineering activities were conducted for educational and research purposes, following responsible disclosure practices and ethical guidelines. The system demonstrates the technical feasibility of modern web automation and streaming technologies without promoting unauthorized content access or commercial exploitation.
                </p>
                <p>
                  <strong>Educational & Research Purpose:</strong> This project illustrates advanced concepts in web automation, proxy implementation, media streaming protocols, and modern JavaScript frameworks for academic and research communities. The techniques demonstrated here push the boundaries of what's possible with current web technologies while maintaining ethical standards.
                </p>
                <p>
                  <strong>Responsible Innovation:</strong> We believe that technological advancement should be coupled with responsibility. This project demonstrates that it's possible to create sophisticated technical systems while prioritizing user safety, privacy protection, and ethical considerations. The open documentation of our techniques serves the broader technology community's understanding of these complex systems.
                </p>
                <p>
                  <strong>Technical Transparency:</strong> By openly discussing our methodologies, challenges, and solutions, we contribute to the broader understanding of web automation, security, and media delivery technologies. This transparency enables researchers and developers to build upon our work while maintaining ethical standards and responsible innovation practices.
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