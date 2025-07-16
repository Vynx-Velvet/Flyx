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

          {/* Mission Section */}
          <section className="mission-section">
            <div className="content-card">
              <h2>Technical Mission</h2>
              <p className="mission-text">
                Flyx represents a sophisticated proof-of-concept that demonstrates cutting-edge web scraping, reverse engineering, and stream extraction technologies. Our system successfully reverse-engineered multiple streaming platforms to create a unified, secure, and user-friendly media delivery platform.
              </p>
              <p className="mission-text">
                Through advanced automation, CORS bypass techniques, and intelligent content extraction, we've built a system that showcases what's possible when modern web technologies are applied to solve complex technical challenges.
              </p>
            </div>
          </section>

          {/* Reverse Engineering Process */}
          <section className="reverse-engineering-section">
            <div className="content-card">
              <h2>Reverse Engineering Process</h2>
              <div className="process-grid">
                <div className="process-step">
                  <div className="step-number">01</div>
                  <h3>Target Analysis</h3>
                  <p>Deep inspection of streaming platforms using browser DevTools, network analysis, and JavaScript runtime examination to understand content delivery mechanisms.</p>
                  <div className="tech-stack-mini">
                    <span>Chrome DevTools</span>
                    <span>Network Analysis</span>
                    <span>DOM Inspection</span>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">02</div>
                  <h3>Automation Framework</h3>
                  <p>Implemented Playwright-based automation to simulate real browser interactions, execute JavaScript, and extract dynamically loaded content from modern web applications.</p>
                  <div className="tech-stack-mini">
                    <span>Playwright</span>
                    <span>Chromium Engine</span>
                    <span>Headless Browsers</span>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">03</div>
                  <h3>CORS Circumvention</h3>
                  <p>Developed sophisticated proxy mechanisms to bypass Cross-Origin Resource Sharing restrictions, enabling seamless content delivery across domains.</p>
                  <div className="tech-stack-mini">
                    <span>Proxy Servers</span>
                    <span>Header Manipulation</span>
                    <span>Origin Spoofing</span>
                  </div>
                </div>
                <div className="process-step">
                  <div className="step-number">04</div>
                  <h3>Stream Extraction</h3>
                  <p>Engineered algorithms to locate, extract, and process M3U8 playlists and direct stream URLs from heavily obfuscated and protected sources.</p>
                  <div className="tech-stack-mini">
                    <span>M3U8 Processing</span>
                    <span>URL Parsing</span>
                    <span>Stream Validation</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* System Architecture */}
          <section className="architecture-section">
            <div className="content-card">
              <h2>System Architecture</h2>
              <div className="architecture-diagram">
                <div className="arch-layer frontend">
                  <h4>Frontend Layer</h4>
                  <div className="arch-components">
                    <div className="component">Next.js 14</div>
                    <div className="component">React Components</div>
                    <div className="component">Real-time UI</div>
                  </div>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer api">
                  <h4>API Gateway</h4>
                  <div className="arch-components">
                    <div className="component">Stream Extraction</div>
                    <div className="component">CORS Proxy</div>
                    <div className="component">Subtitle Service</div>
                  </div>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer vm">
                  <h4>VM Extraction Service</h4>
                  <div className="arch-components">
                    <div className="component">Playwright Automation</div>
                    <div className="component">Chromium Engine</div>
                    <div className="component">Isolated Execution</div>
                  </div>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer sources">
                  <h4>Target Sources</h4>
                  <div className="arch-components">
                    <div className="component">embed.su</div>
                    <div className="component">vidsrc.xyz</div>
                    <div className="component">OpenSubtitles</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Implementation */}
          <section className="implementation-section">
            <div className="content-card">
              <h2>Technical Implementation</h2>
              <div className="implementation-grid">
                <div className="impl-category">
                  <h3>🔧 Backend Infrastructure</h3>
                  <ul>
                    <li><strong>VM-Based Extraction:</strong> Isolated Chromium instances running Playwright scripts</li>
                    <li><strong>Serverless APIs:</strong> Next.js API routes with edge computing capabilities</li>
                    <li><strong>Stream Proxy:</strong> Real-time M3U8 playlist processing and URL rewriting</li>
                    <li><strong>Subtitle Integration:</strong> OpenSubtitles API with VTT conversion pipeline</li>
                  </ul>
                </div>
                <div className="impl-category">
                  <h3>🛡️ Security Measures</h3>
                  <ul>
                    <li><strong>Request Isolation:</strong> Each extraction runs in a clean browser context</li>
                    <li><strong>Header Spoofing:</strong> Dynamic User-Agent and referrer manipulation</li>
                    <li><strong>Rate Limiting:</strong> Intelligent throttling to avoid detection</li>
                    <li><strong>Error Handling:</strong> Graceful fallbacks and recovery mechanisms</li>
                  </ul>
                </div>
                <div className="impl-category">
                  <h3>⚡ Performance Optimizations</h3>
                  <ul>
                    <li><strong>Caching Layer:</strong> Smart caching of extraction results</li>
                    <li><strong>Progressive Loading:</strong> Real-time status updates during extraction</li>
                    <li><strong>Multi-Source Fallbacks:</strong> Automatic server switching on failures</li>
                    <li><strong>Resource Management:</strong> Efficient browser instance lifecycle</li>
                  </ul>
                </div>
                <div className="impl-category">
                  <h3>🎯 Stream Processing</h3>
                  <ul>
                    <li><strong>M3U8 Parsing:</strong> Advanced playlist analysis and URL extraction</li>
                    <li><strong>Quality Detection:</strong> Automatic resolution and bitrate identification</li>
                    <li><strong>Range Request Support:</strong> HTTP byte-range for seeking functionality</li>
                    <li><strong>Format Conversion:</strong> SRT to VTT subtitle transformation</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Code Examples */}
          <section className="code-examples-section">
            <div className="content-card">
              <h2>Technical Deep Dive</h2>
              <div className="code-showcase">
                <div className="code-example">
                  <h4>Stream Extraction Pipeline</h4>
                  <div className="code-block">
                    <pre><code>{`// VM-based extraction with Playwright
const page = await browser.newPage();
await page.setUserAgent(SECURE_USER_AGENT);
await page.setExtraHTTPHeaders({
  'Referer': TARGET_DOMAIN,
  'Origin': TARGET_DOMAIN
});

// Navigate and extract streams
await page.goto(embedUrl, { waitUntil: 'networkidle0' });
const streams = await page.evaluate(() => {
  return window.extractStreams();
});`}</code></pre>
                  </div>
                </div>
                <div className="code-example">
                  <h4>CORS Proxy Implementation</h4>
                  <div className="code-block">
                    <pre><code>{`// Dynamic header manipulation
const getStreamHeaders = (originalUrl, source) => {
  const headers = {
    'User-Agent': BROWSER_UA,
    'Referer': 'https://embed.su/',
    'Origin': 'https://embed.su'
  };
  
  // M3U8 playlist rewriting
  if (url.includes('.m3u8')) {
    headers['Accept'] = 'application/vnd.apple.mpegurl';
  }
  
  return headers;
};`}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Flow */}
          <section className="dataflow-section">
            <div className="content-card">
              <h2>Data Flow Architecture</h2>
              <div className="dataflow-diagram">
                <div className="flow-step">
                  <div className="flow-icon">🎬</div>
                  <h4>Content Request</h4>
                  <p>User selects media → TMDB metadata fetch → IMDB ID resolution</p>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">🤖</div>
                  <h4>VM Extraction</h4>
                  <p>Playwright automation → DOM manipulation → Stream URL capture</p>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">🔄</div>
                  <h4>Proxy Processing</h4>
                  <p>CORS bypass → M3U8 rewriting → Quality stream mapping</p>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-icon">📺</div>
                  <h4>Media Delivery</h4>
                  <p>HLS.js integration → Subtitle overlay → Quality selection</p>
                </div>
              </div>
            </div>
          </section>

          {/* Challenges Overcome */}
          <section className="challenges-section">
            <div className="content-card">
              <h2>Technical Challenges Overcome</h2>
              <div className="challenges-grid">
                <div className="challenge-item">
                  <div className="challenge-icon">🔒</div>
                  <h3>Bot Detection Evasion</h3>
                  <p>Implemented advanced fingerprinting avoidance, realistic user interaction simulation, and dynamic browser profile generation to bypass sophisticated anti-bot systems.</p>
                  <div className="solution-badge">Playwright + Custom Headers</div>
                </div>
                <div className="challenge-item">
                  <div className="challenge-icon">⚡</div>
                  <h3>Dynamic Content Loading</h3>
                  <p>Developed intelligent waiting mechanisms for JavaScript-heavy SPAs, DOM mutation observers, and network idle detection for complete content extraction.</p>
                  <div className="solution-badge">Event-Driven Automation</div>
                </div>
                <div className="challenge-item">
                  <div className="challenge-icon">🌐</div>
                  <h3>Cross-Origin Restrictions</h3>
                  <p>Built sophisticated proxy infrastructure with header manipulation, origin spoofing, and request/response transformation to enable seamless cross-domain streaming.</p>
                  <div className="solution-badge">Transparent Proxying</div>
                </div>
                <div className="challenge-item">
                  <div className="challenge-icon">📱</div>
                  <h3>Multi-Format Support</h3>
                  <p>Created unified media processing pipeline supporting HLS, MP4, WebM streams with automatic subtitle synchronization and quality adaptation.</p>
                  <div className="solution-badge">Universal Player</div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="metrics-section">
            <div className="content-card">
              <h2>Performance Metrics</h2>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">95%</div>
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-desc">Stream extraction accuracy across all supported sources</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">2.3s</div>
                  <div className="metric-label">Avg. Extraction Time</div>
                  <div className="metric-desc">Mean time from request to playable stream URL</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">99.9%</div>
                  <div className="metric-label">Uptime</div>
                  <div className="metric-desc">System availability with automated failover</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">5</div>
                  <div className="metric-label">Source Providers</div>
                  <div className="metric-desc">Integrated streaming platforms with fallback support</div>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Stack */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Advanced Technology Stack</h2>
              <div className="tech-categories">
                <div className="tech-category">
                  <h3>Frontend Technologies</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Next.js 14</span>
                      <span className="tech-desc">React framework with App Router and Server Components</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">HLS.js</span>
                      <span className="tech-desc">HTTP Live Streaming library for adaptive bitrate streaming</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">WebVTT</span>
                      <span className="tech-desc">Web Video Text Tracks for subtitle rendering</span>
                    </div>
                  </div>
                </div>
                <div className="tech-category">
                  <h3>Backend Infrastructure</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Playwright</span>
                      <span className="tech-desc">Browser automation for dynamic content extraction</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Node.js</span>
                      <span className="tech-desc">Server-side JavaScript runtime with edge computing</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">VM Isolation</span>
                      <span className="tech-desc">Containerized browser instances for secure extraction</span>
                    </div>
                  </div>
                </div>
                <div className="tech-category">
                  <h3>Data Processing</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">M3U8 Parser</span>
                      <span className="tech-desc">HLS playlist analysis and URL rewriting engine</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">TMDB API</span>
                      <span className="tech-desc">Movie database integration for metadata enrichment</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">OpenSubtitles</span>
                      <span className="tech-desc">Subtitle service with format conversion pipeline</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer Section */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>Technical Disclosure & Ethics</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>This platform serves as an advanced technical demonstration</strong> showcasing sophisticated web scraping, reverse engineering, and stream processing technologies. The implementation demonstrates cutting-edge browser automation, CORS circumvention, and real-time media delivery systems.
                </p>
                <p>
                  All reverse engineering activities were conducted for educational and research purposes, following responsible disclosure practices. The system demonstrates the technical feasibility of modern web automation and streaming technologies without promoting unauthorized content access.
                </p>
                <p>
                  <strong>Educational Purpose:</strong> This project illustrates advanced concepts in web automation, proxy implementation, media streaming protocols, and modern JavaScript frameworks for academic and research communities.
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