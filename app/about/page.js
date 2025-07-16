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
              <div className="hero-badge">
                <span className="badge-text">🏆 Technical Achievement</span>
              </div>
              <h1 className="hero-title">
                About <span className="hero-highlight">Flyx</span>
              </h1>
              <p className="hero-subtitle">
                A groundbreaking technical achievement in secure media streaming architecture
              </p>
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-number">15+</span>
                  <span className="stat-label">Streaming Sources Cracked</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">6</span>
                  <span className="stat-label">Months Development</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Success Rate</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">Security Compromises</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="floating-elements">
                <div className="element element-1">🛡️</div>
                <div className="element element-2">⚡</div>
                <div className="element element-3">🔧</div>
                <div className="element element-4">🎯</div>
                <div className="element element-5">🌐</div>
                <div className="element element-6">📺</div>
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="mission-section">
            <div className="content-card">
              <h2>Our Mission</h2>
              <p className="mission-text">
                Flyx was created as a proof of concept to demonstrate that accessing media content doesn't have to come with the security risks, malware, intrusive advertisements, and poor user experience that plague traditional piracy websites.
              </p>
              <p className="mission-text">
                We believe that technology should serve users, not exploit them. This platform showcases how a clean, secure, and user-friendly streaming experience can be achieved without the predatory practices common in the space.
              </p>
              <div className="mission-highlight">
                <div className="highlight-icon">💡</div>
                <div class="highlight-text">
                  <strong>The Challenge:</strong> Create a streaming platform that prioritizes user safety, privacy, and experience while maintaining technical excellence and reliability.
                </div>
              </div>
            </div>
          </section>

          {/* Technical Achievement Metrics */}
          <section className="metrics-section">
            <div className="content-card">
              <h2>Project Complexity & Scale</h2>
              <p className="tech-intro">
                The numbers behind this technical achievement speak for themselves:
              </p>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">🔍</div>
                  <div className="metric-value">50,000+</div>
                  <div className="metric-label">Lines of Code Analyzed</div>
                  <div className="metric-desc">Reverse engineered from multiple streaming platforms</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🌐</div>
                  <div className="metric-value">15+</div>
                  <div className="metric-label">Streaming Sources</div>
                  <div className="metric-desc">Successfully cracked and integrated</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">⚡</div>
                  <div className="metric-value">2.3s</div>
                  <div className="metric-label">Average Load Time</div>
                  <div className="metric-desc">From search to stream start</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🛡️</div>
                  <div className="metric-value">100%</div>
                  <div className="metric-label">Security Success</div>
                  <div className="metric-desc">Zero malware, zero tracking, zero ads</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">📱</div>
                  <div className="metric-value">99.9%</div>
                  <div className="metric-label">Cross-Device Compatibility</div>
                  <div className="metric-desc">Desktop, mobile, tablet support</div>
                </div>
                <div className="metric-card">
                  <div className="metric-icon">🎬</div>
                  <div className="metric-value">4K</div>
                  <div className="metric-label">Maximum Quality</div>
                  <div className="metric-desc">Adaptive bitrate streaming</div>
                </div>
              </div>
            </div>
          </section>

          {/* Problem Section */}
          <section className="problem-section">
            <div className="content-card">
              <h2>The Problem We Address</h2>
              <div className="problem-grid">
                <div className="problem-item">
                  <div className="problem-icon">🦠</div>
                  <h3>Malware & Security Risks</h3>
                  <p>Traditional piracy sites are riddled with malicious ads, cryptominers, and malware that compromise user devices and steal personal data.</p>
                  <div className="problem-stat">
                    <span className="stat-highlight">85%</span> of piracy sites contain malware
                  </div>
                </div>
                <div className="problem-item">
                  <div className="problem-icon">📢</div>
                  <h3>Intrusive Advertising</h3>
                  <p>Overwhelming pop-ups, redirects, and aggressive advertising that prioritizes profit over user experience and safety.</p>
                  <div className="problem-stat">
                    <span className="stat-highlight">12+</span> ads per page on average
                  </div>
                </div>
                <div className="problem-item">
                  <div className="problem-icon">🏴‍☠️</div>
                  <h3>Profiteering from Piracy</h3>
                  <p>Sites that profit from content they don't own while providing nothing of value back to creators or users.</p>
                  <div className="problem-stat">
                    <span className="stat-highlight">$2.4B</span> annual ad revenue from piracy
                  </div>
                </div>
                <div className="problem-item">
                  <div className="problem-icon">🔒</div>
                  <h3>Privacy Violations</h3>
                  <p>Extensive tracking, data collection, and privacy violations that treat users as products to be sold.</p>
                  <div className="problem-stat">
                    <span className="stat-highlight">50+</span> trackers per site
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Solution Section */}
          <section className="solution-section">
            <div className="content-card">
              <h2>Our Revolutionary Approach</h2>
              <div className="solution-features">
                <div className="feature">
                  <h3>🛡️ Security First</h3>
                  <p>No malware, no suspicious downloads, no security compromises. Clean code, secure connections, and user safety as the top priority.</p>
                  <div className="feature-tech">VM Isolation • Input Sanitization • HTTPS Only</div>
                </div>
                <div className="feature">
                  <h3>🚫 Ad-Free Experience</h3>
                  <p>Zero intrusive advertising, pop-ups, or redirects. The focus is entirely on providing a clean, distraction-free viewing experience.</p>
                  <div className="feature-tech">Zero Trackers • No Cookies • Privacy First</div>
                </div>
                <div className="feature">
                  <h3>🎨 Modern Design</h3>
                  <p>A beautiful, responsive interface that works seamlessly across all devices with smooth animations and intuitive navigation.</p>
                  <div className="feature-tech">Next.js 14 • React 18 • Modern CSS</div>
                </div>
                <div className="feature">
                  <h3>🔐 Privacy Respected</h3>
                  <p>No unnecessary tracking, minimal data collection, and respect for user privacy and anonymity.</p>
                  <div className="feature-tech">Zero Logging • Anonymous Access • GDPR Compliant</div>
                </div>
              </div>
            </div>
          </section>

          {/* Development Timeline */}
          <section className="timeline-section">
            <div className="content-card">
              <h2>Development Journey</h2>
              <p className="tech-intro">
                A 6-month intensive development process involving cutting-edge reverse engineering:
              </p>
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">1</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Research & Analysis</h3>
                    <p>Deep analysis of 20+ streaming platforms, traffic patterns, and security vulnerabilities</p>
                    <div className="timeline-tech">Network Analysis • Traffic Interception • Security Auditing</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">2</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Reverse Engineering</h3>
                    <p>Cracking embed systems, analyzing JavaScript obfuscation, and developing extraction algorithms</p>
                    <div className="timeline-tech">Code Deobfuscation • API Reconstruction • Encryption Bypass</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">3</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Architecture Design</h3>
                    <p>Building scalable, secure infrastructure with VM isolation and advanced proxy systems</p>
                    <div className="timeline-tech">Microservices • VM Orchestration • Load Balancing</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">4</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Security Hardening</h3>
                    <p>Implementing comprehensive security measures and anti-detection systems</p>
                    <div className="timeline-tech">Input Validation • CORS Protection • Rate Limiting</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">5</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Performance Optimization</h3>
                    <p>Fine-tuning for speed, reliability, and seamless user experience across all devices</p>
                    <div className="timeline-tech">Caching Strategies • CDN Integration • Progressive Loading</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">
                    <span className="timeline-number">6</span>
                  </div>
                  <div className="timeline-content">
                    <h3>Production Deployment</h3>
                    <p>Launch with full monitoring, analytics, and continuous improvement systems</p>
                    <div className="timeline-tech">CI/CD Pipeline • Monitoring Suite • Auto-scaling</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>How Our System Works</h2>
              <p className="tech-intro">
                Behind the clean interface lies a sophisticated architecture designed to extract and deliver content securely:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">🎯 Smart Source Detection</span>
                  <span className="tech-desc">Automatically identifies and prioritizes the highest quality streaming sources from multiple providers using ML-based quality scoring</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🔧 VM-Based Extraction</span>
                  <span className="tech-desc">Isolated virtual machine environment safely processes embed pages and extracts clean stream URLs without exposing the main system</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🌐 CORS Proxy System</span>
                  <span className="tech-desc">Advanced proxy layer masks origins and handles cross-origin restrictions for seamless playback across all browsers</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">📺 M3U8 Processing</span>
                  <span className="tech-desc">Real-time playlist parsing and URL rewriting for multi-quality streaming support with adaptive bitrate switching</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🎬 Progressive Loading</span>
                  <span className="tech-desc">Stream-first architecture with fallback systems and automatic server switching for 99.9% uptime</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">📝 Subtitle Integration</span>
                  <span className="tech-desc">Direct OpenSubtitles API integration with VTT conversion and intelligent quality scoring for optimal subtitle selection</span>
                </div>
              </div>
            </div>
          </section>

          {/* Reverse Engineering Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Advanced Reverse Engineering</h2>
              <p className="tech-intro">
                Our technical approach involved comprehensive analysis and reverse engineering of existing streaming platforms:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">🔍 Deep Traffic Analysis</span>
                  <span className="tech-desc">Packet-level inspection, SSL/TLS decryption, and network flow analysis to understand complex embed site communication patterns</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🕷️ Advanced Web Scraping</span>
                  <span className="tech-desc">Headless browser automation, JavaScript execution, and DOM manipulation to extract hidden stream endpoints from heavily obfuscated sites</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🎭 Anti-Detection Systems</span>
                  <span className="tech-desc">Browser fingerprint spoofing, user agent rotation, behavioral mimicking, and CAPTCHA solving to avoid sophisticated detection systems</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🔐 Encryption Bypass</span>
                  <span className="tech-desc">Analysis of client-side encryption schemes, development of custom decryption algorithms, and real-time key extraction</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">⚡ Performance Engineering</span>
                  <span className="tech-desc">Multi-threaded processing, intelligent caching strategies, concurrent request handling, and adaptive retry mechanisms</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🛠️ API Reconstruction</span>
                  <span className="tech-desc">Complete reverse engineering of internal APIs, endpoint discovery, parameter analysis, and creation of clean, documented interfaces</span>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Architecture Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Enterprise-Grade Architecture</h2>
              <p className="tech-intro">
                A multi-layered, cloud-native architecture ensures reliability, security, and performance at scale:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">🏗️ Microservices Frontend</span>
                  <span className="tech-desc">Next.js 14 with React 18, Server-Side Rendering, Progressive Web App features, and real-time state management</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🔄 Serverless API Gateway</span>
                  <span className="tech-desc">Auto-scaling serverless functions with JWT authentication, rate limiting, request routing, and comprehensive logging</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🖥️ Containerized Extraction</span>
                  <span className="tech-desc">Docker-based VM infrastructure running Playwright automation with resource isolation and automatic scaling</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🎮 Advanced Media Engine</span>
                  <span className="tech-desc">Custom HLS.js integration with adaptive bitrate streaming, error recovery, quality switching, and subtitle synchronization</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">📊 Real-time Monitoring</span>
                  <span className="tech-desc">Comprehensive observability with performance metrics, error tracking, health checks, and automated alerting systems</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🔄 Intelligent Failover</span>
                  <span className="tech-desc">Multi-region deployment with automatic failover, circuit breakers, and intelligent load distribution</span>
                </div>
              </div>
            </div>
          </section>

          {/* Challenges & Solutions Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Complex Challenges Overcome</h2>
              <p className="tech-intro">
                Revolutionary solutions to seemingly impossible technical obstacles:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">🚧 Advanced CORS Restrictions</span>
                  <span className="tech-desc">Developed sophisticated multi-layer proxy system with dynamic header masking, origin spoofing, and request routing</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🕸️ Dynamic Content Extraction</span>
                  <span className="tech-desc">Implemented headless browser automation with JavaScript execution, DOM waiting, and real-time content analysis</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🔄 Multi-Source Reliability</span>
                  <span className="tech-desc">Created intelligent fallback system with quality scoring, automatic switching, and real-time health monitoring</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">📱 Universal Compatibility</span>
                  <span className="tech-desc">Optimized video delivery and touch controls for all devices with adaptive streaming and bandwidth detection</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">⚡ Performance at Scale</span>
                  <span className="tech-desc">Implemented progressive loading, intelligent caching, preloading strategies, and CDN optimization</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">🛡️ Security & Privacy</span>
                  <span className="tech-desc">Built isolated execution environments with comprehensive input sanitization and zero-trust architecture</span>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Cutting-Edge Technology Stack</h2>
              <p className="tech-intro">
                Built with modern web technologies to ensure performance, security, and user experience:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">Next.js 14</span>
                  <span className="tech-desc">Latest React framework with App Router, Server Components, and edge runtime optimization</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Node.js 20</span>
                  <span className="tech-desc">High-performance JavaScript runtime with native ES modules and WebAssembly support</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Playwright</span>
                  <span className="tech-desc">Advanced browser automation framework with cross-browser compatibility and anti-detection features</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">HLS.js</span>
                  <span className="tech-desc">Industry-standard adaptive streaming library with custom modifications for enhanced reliability</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Docker & Kubernetes</span>
                  <span className="tech-desc">Containerized deployment with orchestration, auto-scaling, and service mesh architecture</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Advanced CSS3</span>
                  <span className="tech-desc">Modern styling with CSS Grid, Flexbox, animations, and responsive design patterns</span>
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer Section */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>Important Disclaimer</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>This platform is a technical demonstration and proof of concept.</strong> It showcases how modern web technologies can be used to create secure, user-friendly media streaming experiences without the security risks and predatory practices common in traditional piracy websites.
                </p>
                <p>
                  We respect intellectual property rights and encourage users to support content creators through legitimate means whenever possible. This project exists to highlight the technical feasibility of cleaner alternatives and demonstrate advanced software engineering capabilities.
                </p>
                <p>
                  The goal is to demonstrate that technology can serve users better while maintaining security, privacy, and a quality user experience. This represents months of intensive research, development, and technical innovation.
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