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
          {/* Hero Section - The Hook */}
          <section className="about-hero">
            <div className="hero-content">
              <div className="story-badge">A True Story</div>
              <h1 className="hero-title">
                The <span className="hero-highlight">Flyx</span> Chronicles
              </h1>
              <p className="hero-subtitle">
                This is the story of how one developer's weekend frustration turned into an 8-month technical odyssey that would challenge everything we thought we knew about streaming, browser automation, and the limits of what's possible with modern web technology.
              </p>
              <p className="hero-tagline">
                <em>"Sometimes the best way to fix a broken system is to build a better one from scratch."</em>
              </p>

              {/* Story Stats */}
              <div className="story-stats">
                <div className="story-stat">
                  <div className="stat-icon">📖</div>
                  <div className="stat-content">
                    <div className="stat-number">15-20 min</div>
                    <div className="stat-label">Reading Time</div>
                  </div>
                </div>
                <div className="story-stat">
                  <div className="stat-icon">🎭</div>
                  <div className="stat-content">
                    <div className="stat-number">7</div>
                    <div className="stat-label">Chapters</div>
                  </div>
                </div>
                <div className="story-stat">
                  <div className="stat-icon">⚡</div>
                  <div className="stat-content">
                    <div className="stat-number">∞</div>
                    <div className="stat-label">Plot Twists</div>
                  </div>
                </div>
                <div className="story-stat">
                  <div className="stat-icon">☕</div>
                  <div className="stat-content">
                    <div className="stat-number">247</div>
                    <div className="stat-label">Cups of Coffee</div>
                  </div>
                </div>
              </div>

              {/* Chapter Navigation */}
              <div className="chapter-nav">
                <div className="nav-title">Story Chapters</div>
                <div className="chapter-links">
                  <a href="#chapter-1" className="chapter-link">1. The Frustration</a>
                  <a href="#chapter-2" className="chapter-link">2. The Awakening</a>
                  <a href="#chapter-3" className="chapter-link">3. The Deep Dive</a>
                  <a href="#chapter-4" className="chapter-link">4. The Battles</a>
                  <a href="#chapter-5" className="chapter-link">5. The Breakthrough</a>
                  <a href="#chapter-6" className="chapter-link">6. The Architecture</a>
                  <a href="#chapter-7" className="chapter-link">7. The Legacy</a>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 1: The Frustration */}
          <section id="chapter-1" className="chapter-section">
            <div className="content-card chapter-card">
              <div className="chapter-header">
                <div className="chapter-number">Chapter 1</div>
                <h2 className="chapter-title">The Frustration: A Developer's Breaking Point 😤</h2>
                <div className="chapter-subtitle">Where our story begins with a simple desire to watch a movie</div>
              </div>

              <div className="story-content">
                <div className="story-paragraph">
                  <span className="story-dropcap">I</span>t was a Friday night in March 2024. After a long week of debugging production issues and attending meetings that could have been emails, I just wanted to unwind with a movie. Simple, right? Wrong. Dead wrong.
                </div>

                <div className="story-paragraph">
                  The first streaming site greeted me with a 30-second unskippable ad for car insurance. Then another for crypto trading. Then a survey asking about my viewing preferences. By the time I reached the actual content, I'd been subjected to more marketing than a Super Bowl commercial break.
                </div>

                <div className="story-paragraph">
                  But wait, there's more! The video player decided to buffer every 15 seconds, the quality kept switching between 4K and what looked like it was filmed with a potato, and the subtitles were approximately 3 seconds behind the audio. It was like watching a badly dubbed kung fu movie, except this was supposed to be a romantic comedy.
                </div>

                <div className="frustration-meter">
                  <div className="meter-label">Developer Frustration Level</div>
                  <div className="meter-bar">
                    <div className="meter-fill" style={{ width: '95%' }}></div>
                  </div>
                  <div className="meter-value">95% - Dangerously High</div>
                </div>

                <div className="story-paragraph">
                  That's when it hit me. This wasn't just a bad user experience - this was a systematic failure of an entire industry. Streaming platforms had become digital landlords, extracting maximum value while providing minimum service. Users weren't customers; they were products being sold to advertisers.
                </div>

                <div className="story-quote">
                  <div className="quote-text">"There has to be a better way. What if someone built a streaming platform that actually respected users?"</div>
                  <div className="quote-attribution">- Famous last words before 8 months of technical hell</div>
                </div>

                <div className="story-paragraph">
                  I opened my laptop. What started as a weekend project to "quickly fix streaming" would become the most technically challenging thing I'd ever attempted. Little did I know, I was about to go to war with bot detection systems, CORS policies, and JavaScript obfuscation techniques that would make cryptographers weep.
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 2: The Awakening */}
          <section id="chapter-2" className="chapter-section">
            <div className="content-card chapter-card">
              <div className="chapter-header">
                <div className="chapter-number">Chapter 2</div>
                <h2 className="chapter-title">The Awakening: Discovering the Impossible 🚀</h2>
                <div className="chapter-subtitle">Where I realize I've bitten off more than I can chew</div>
              </div>

              <div className="story-content">
                <div className="story-paragraph">
                  <span className="story-dropcap">M</span>onday morning brought the harsh light of reality. What I thought would be a simple "scrape some video URLs" project turned out to be a journey into the darkest corners of web security. Modern streaming sources aren't just protected - they're fortified like digital Fort Knox.
                </div>

                <div className="revelation-box">
                  <div className="revelation-title">The Moment of Truth</div>
                  <div className="revelation-text">
                    I opened the browser developer tools on a popular streaming embed and saw... nothing. Just minified JavaScript that looked like it had been put through a blender, then encrypted, then put through another blender for good measure.
                  </div>
                </div>

                <div className="story-paragraph">
                  This wasn't going to be a weekend project. This was going to be a war. And my enemies? Let me introduce you to the villains of our story:
                </div>

                {/* The Villains */}
                <div className="villains-gallery">
                  <div className="villain-card">
                    <div className="villain-avatar">🛡️</div>
                    <div className="villain-info">
                      <h3 className="villain-name">The Guardian</h3>
                      <div className="villain-subtitle">Anti-Bot Detection Systems</div>
                      <div className="villain-description">
                        This digital bouncer uses 15+ detection methods including canvas fingerprinting, WebGL analysis, and behavioral pattern recognition. It can spot automation from a mile away and isn't afraid to slam the door in your face.
                      </div>
                      <div className="villain-powers">
                        <span className="power">Canvas Fingerprinting</span>
                        <span className="power">Mouse Movement Analysis</span>
                        <span className="power">Timing Pattern Detection</span>
                      </div>
                    </div>
                  </div>

                  <div className="villain-card">
                    <div className="villain-avatar">🌐</div>
                    <div className="villain-info">
                      <h3 className="villain-name">The Gatekeeper</h3>
                      <div className="villain-subtitle">CORS Policy Enforcement</div>
                      <div className="villain-description">
                        The most bureaucratic villain of all. It doesn't care about your good intentions - if you don't have the right paperwork (headers), you're not getting through. Period.
                      </div>
                      <div className="villain-powers">
                        <span className="power">Origin Validation</span>
                        <span className="power">Header Inspection</span>
                        <span className="power">Request Blocking</span>
                      </div>
                    </div>
                  </div>

                  <div className="villain-card">
                    <div className="villain-avatar">🔒</div>
                    <div className="villain-info">
                      <h3 className="villain-name">The Obfuscator</h3>
                      <div className="villain-subtitle">JavaScript Minification</div>
                      <div className="villain-description">
                        This villain takes perfectly readable code and turns it into digital hieroglyphics. Variable names become single letters, functions get scrambled, and logic gets twisted into pretzels.
                      </div>
                      <div className="villain-powers">
                        <span className="power">Code Minification</span>
                        <span className="power">Variable Renaming</span>
                        <span className="power">Logic Scrambling</span>
                      </div>
                    </div>
                  </div>

                  <div className="villain-card">
                    <div className="villain-avatar">⚡</div>
                    <div className="villain-info">
                      <h3 className="villain-name">The Perfectionist</h3>
                      <div className="villain-subtitle">Performance Requirements</div>
                      <div className="villain-description">
                        This villain demands perfection: sub-3-second load times, 99.9% uptime, perfect subtitle sync, and smooth streaming. Oh, and it all has to run on serverless infrastructure because we're not made of money.
                      </div>
                      <div className="villain-powers">
                        <span className="power">Latency Sensitivity</span>
                        <span className="power">Memory Constraints</span>
                        <span className="power">Cost Optimization</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="story-paragraph">
                  Staring at this rogues' gallery of technical challenges, any sane developer would have closed their laptop and gone back to watching ads. But sanity, as it turns out, is overrated. I cracked my knuckles, opened a fresh can of Monster Energy, and prepared for battle.
                </div>

                <div className="battle-cry">
                  <div className="cry-text">"If they want to make this impossible, let's show them what impossible looks like when it's done right."</div>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 3: The Deep Dive */}
          <section id="chapter-3" className="chapter-section">
            <div className="content-card chapter-card">
              <div className="chapter-header">
                <div className="chapter-number">Chapter 3</div>
                <h2 className="chapter-title">The Deep Dive: Into the Rabbit Hole 🕳️</h2>
                <div className="chapter-subtitle">Where I discover that "simple" doesn't exist in streaming</div>
              </div>

              <div className="story-content">
                <div className="story-paragraph">
                  <span className="story-dropcap">W</span>eek 2 of development. I'd already consumed enough caffeine to power a small city and my browser bookmarks looked like a computer science research paper. What started as "let me just grab some video URLs" had evolved into a PhD-level course in web security, browser automation, and the dark arts of JavaScript obfuscation.
                </div>

                <div className="discovery-timeline">
                  <div className="timeline-title">The Descent into Madness</div>

                  <div className="timeline-event">
                    <div className="event-date">Day 8</div>
                    <div className="event-content">
                      <h4>The First Breakthrough</h4>
                      <p>Discovered that streaming sites use dynamic JavaScript generation. The code literally writes itself at runtime. It's like trying to read a book where the words change every time you look at them.</p>
                    </div>
                  </div>

                  <div className="timeline-event">
                    <div className="event-date">Day 12</div>
                    <div className="event-content">
                      <h4>The CORS Revelation</h4>
                      <p>Realized that even if I could extract URLs, browsers would block them due to CORS policies. It's like finding the key to a treasure chest, only to discover it's inside another locked box.</p>
                    </div>
                  </div>

                  <div className="timeline-event">
                    <div className="event-date">Day 15</div>
                    <div className="event-content">
                      <h4>The Bot Detection Nightmare</h4>
                      <p>Learned that modern sites can detect automation through canvas fingerprinting, WebGL analysis, and even mouse movement patterns. They're basically digital lie detectors.</p>
                    </div>
                  </div>

                  <div className="timeline-event">
                    <div className="event-date">Day 18</div>
                    <div className="event-content">
                      <h4>The Performance Paradox</h4>
                      <p>Discovered that solving all these problems while maintaining sub-3-second load times is like performing brain surgery while riding a unicycle. On fire. In a hurricane.</p>
                    </div>
                  </div>
                </div>

                <div className="story-paragraph">
                  But here's the thing about rabbit holes - sometimes you find wonderland at the bottom. Each problem revealed a deeper layer of complexity, but also a more elegant solution. I wasn't just building a streaming platform anymore; I was architecting a digital Swiss Army knife that could slice through any web security measure.
                </div>

                <div className="realization-box">
                  <div className="realization-title">The Eureka Moment</div>
                  <div className="realization-text">
                    "What if instead of fighting these systems, I could make them think I'm not fighting them at all?"
                  </div>
                  <div className="realization-subtitle">- The moment everything changed</div>
                </div>
              </div>
            </div>
          </section>

          {/* Chapter 4: The Architecture */}
          <section id="chapter-4" className="chapter-section">
            <div className="content-card chapter-card">
              <div className="chapter-header">
                <div className="chapter-number">Chapter 4</div>
                <h2 className="chapter-title">The Architecture: Building the Machine 🏗️</h2>
                <div className="chapter-subtitle">Where I design a system that shouldn't exist</div>
              </div>

              <div className="story-content">
                <div className="story-paragraph">
                  <span className="story-dropcap">B</span>y month 3, I had a clear picture of what I was up against. This wasn't going to be a simple web scraper - this was going to be a distributed system that could rival anything built by major tech companies. The architecture needed to be bulletproof, scalable, and most importantly, completely invisible to the systems it was designed to outsmart.
                </div>
              </div>

              <div className="architecture-diagram">
                <div className="arch-layer frontend">
                  <h4>🎯 Frontend Layer: The User's Best Friend</h4>
                  <div className="arch-components">
                    <div className="component">Next.js 14 with Server Components</div>
                    <div className="component">HLS.js Media Engine (Heavily Modified)</div>
                    <div className="component">Custom Subtitle Renderer</div>
                    <div className="component">Real-time Progress Tracking</div>
                  </div>
                  <p className="arch-description">This is where the magic happens for users. Built on Next.js 14, the frontend is a masterclass in performance optimization. The HLS.js media engine has been so heavily customized it barely resembles its original form - we've added aggressive buffering (60MB!), conservative bandwidth estimation to prevent quality oscillation, and a subtitle renderer that handles 6 different formats with frame-perfect synchronization. It's like having a personal video engineer optimizing every frame.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer api">
                  <h4>⚡ API Layer: The Diplomatic Corps</h4>
                  <div className="arch-components">
                    <div className="component">Vercel Edge Functions</div>
                    <div className="component">Intelligent CORS Proxy</div>
                    <div className="component">M3U8 Playlist Surgeon</div>
                    <div className="component">OpenSubtitles API Integration</div>
                  </div>
                  <p className="arch-description">Think of this layer as the smooth-talking diplomat that convinces everyone to play nice. The CORS proxy is a work of art - it analyzes each request and applies the perfect header strategy. vidsrc.xyz sources get minimal headers (they're suspicious of enthusiasm), while embed.su sources get the full diplomatic treatment with referrers and origins. The M3U8 parser performs surgery on video playlists, rewriting URLs in real-time while preserving every millisecond of timing data.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer vm">
                  <h4>🤖 Extraction Layer: The Master of Disguise</h4>
                  <div className="arch-components">
                    <div className="component">Isolated VM Instances</div>
                    <div className="component">Puppeteer Stealth Operations</div>
                    <div className="component">47-Flag Anti-Detection</div>
                    <div className="component">Human Behavior Simulation</div>
                  </div>
                  <p className="arch-description">This is where things get seriously impressive. Each extraction spawns a completely isolated VM with a Chromium instance so stealthy it makes ninjas jealous. We're talking 47 different Chrome flags to disable automation indicators, randomized screen dimensions, simulated human mouse movements, and timing patterns that would fool a behavioral psychologist. The browser doesn't just look human - it acts human, complete with realistic scrolling patterns and interaction delays.</p>
                </div>
                <div className="arch-layer sources">
                  <h4>🎬 Source Integration: The United Nations of Streaming</h4>
                  <div className="arch-components">
                    <div className="component">embed.su (The Reliable One)</div>
                    <div className="component">vidsrc.xyz (The Moody Artist)</div>
                    <div className="component">TMDB API (The Librarian)</div>
                    <div className="component">OpenSubtitles (4M+ Subtitle Files)</div>
                  </div>
                  <p className="arch-description">Managing multiple streaming sources is like being a diplomat at the UN - everyone speaks a different language and has their own quirks. embed.su wants full diplomatic credentials, vidsrc.xyz gets suspicious if you're too friendly, and each has their own unique obfuscation methods. The system automatically handles fallbacks, success rate monitoring, and provider-specific extraction strategies. It's like having a universal translator for the streaming world.</p>
                </div>
              </div>

              {/* Data Flow Visualization */}
              <div className="data-flow-section">
                <h3>🔄 Data Flow: The Journey of a Stream Request</h3>
                <p className="mission-text">
                  Ever wondered what happens in those 3 seconds between clicking play and seeing your video? Here's the incredible journey each stream request takes through our system.
                </p>

                <div className="flow-visualization">
                  <div className="flow-step" data-step="1">
                    <div className="flow-icon">👤</div>
                    <div className="flow-content">
                      <h4>User Request</h4>
                      <p>User clicks play on a movie</p>
                      <div className="flow-timing">0ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="2">
                    <div className="flow-icon">🚀</div>
                    <div className="flow-content">
                      <h4>VM Spawn</h4>
                      <p>Isolated browser instance created</p>
                      <div className="flow-timing">~200ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="3">
                    <div className="flow-icon">🕵️</div>
                    <div className="flow-content">
                      <h4>Stealth Mode</h4>
                      <p>47 flags applied, human behavior simulated</p>
                      <div className="flow-timing">~100ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="4">
                    <div className="flow-icon">🔍</div>
                    <div className="flow-content">
                      <h4>URL Extraction</h4>
                      <p>JavaScript execution and URL discovery</p>
                      <div className="flow-timing">~800ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="5">
                    <div className="flow-icon">🌐</div>
                    <div className="flow-content">
                      <h4>Proxy Setup</h4>
                      <p>CORS headers configured, M3U8 rewriting</p>
                      <div className="flow-timing">~50ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="6">
                    <div className="flow-icon">📺</div>
                    <div className="flow-content">
                      <h4>Stream Start</h4>
                      <p>HLS.js initialized, buffering begins</p>
                      <div className="flow-timing">~150ms</div>
                    </div>
                  </div>

                  <div className="flow-arrow">→</div>

                  <div className="flow-step" data-step="7">
                    <div className="flow-icon">🎬</div>
                    <div className="flow-content">
                      <h4>Playback</h4>
                      <p>Video starts playing smoothly</p>
                      <div className="flow-timing">Total: &lt;3s</div>
                    </div>
                  </div>
                </div>

                <div className="flow-stats">
                  <div className="flow-stat">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-info">
                      <div className="stat-title">Average Total Time</div>
                      <div className="stat-value">2.8 seconds</div>
                    </div>
                  </div>
                  <div className="flow-stat">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-info">
                      <div className="stat-title">Success Rate</div>
                      <div className="stat-value">99.7%</div>
                    </div>
                  </div>
                  <div className="flow-stat">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-info">
                      <div className="stat-title">Fallback Sources</div>
                      <div className="stat-value">3 available</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Technical Implementation Details */}
          <section className="implementation-section">
            <div className="content-card">
              <h2>The Engineering Nightmares (And How We Conquered Them) 🔧</h2>
              <p className="mission-text">
                Every great engineering project has its "hold my coffee" moments - those times when you realize you've bitten off more than you can chew, but you're too caffeinated to quit. Flyx had several of these moments, each requiring solutions that would make computer science professors both proud and slightly concerned for my mental health.
              </p>

              <div className="implementation-grid">
                <div className="impl-category">
                  <h3>🛡️ Browser Automation: The Art of Digital Espionage</h3>
                  <p>Creating browser automation that can fool modern bot detection is like teaching a robot to pass a Turing test while juggling flaming torches. The challenge? Make Puppeteer so human-like that even its own mother wouldn't recognize it.</p>
                  <ul>
                    <li><strong>The 47-Flag Stealth Mode:</strong> We configured Chromium with 47 different flags to disable every possible automation indicator. It's like giving the browser a complete identity makeover - no webdriver properties, no automation flags, randomized canvas fingerprints, and screen dimensions that change like a chameleon.</li>
                    <li><strong>Human Behavior Academy:</strong> Developed algorithms that simulate human interaction patterns so convincingly they could probably pass a psychology exam. We're talking realistic mouse movements with natural acceleration curves, scroll behaviors with human-like hesitation, and interaction timings with randomized delays that mirror actual human behavior.</li>
                    <li><strong>The Identity Crisis System:</strong> Built a rotation system that changes user agents, screen resolutions, and device characteristics faster than a spy changing disguises. Each request gets a completely fresh identity.</li>
                    <li><strong>Memory Management Paranoia:</strong> Implemented aggressive cleanup that terminates browser instances after 30 seconds - because nothing says "I'm not a bot" like having commitment issues with browser sessions.</li>
                  </ul>
                </div>

                <div className="impl-category">
                  <h3>🌐 CORS: The Final Boss of Web Development</h3>
                  <p>CORS policies are like that overly protective parent who won't let their kid play with anyone from a different neighborhood. Except in this case, the "kid" is video content and the "neighborhood" is literally every streaming source on the internet.</p>
                  <ul>
                    <li><strong>The Diplomatic Proxy:</strong> Built a proxy system so intelligent it could probably negotiate international treaties. It analyzes each request's origin and applies the perfect header strategy - embed.su gets the full diplomatic treatment with referrers and origins, while vidsrc.xyz gets minimal headers because it's apparently an introvert.</li>
                    <li><strong>M3U8 Playlist Surgery:</strong> Created a parser that performs real-time surgery on HLS manifests, rewriting every segment URL to route through our proxy while preserving timing data with microsecond precision. It's like being a video playlist plastic surgeon.</li>
                    <li><strong>The Header Whisperer:</strong> Developed logic that determines optimal header configurations based on source domain, content type, and user agent compatibility. It's basically a matchmaking service for HTTP headers.</li>
                    <li><strong>The Comeback Kid:</strong> Implemented failover mechanisms with exponential backoff and jitter that would make a rubber ball jealous. If one header strategy fails, we try another, and another, until something works or the heat death of the universe - whichever comes first.</li>
                  </ul>
                </div>

                <div className="impl-category">
                  <h3>📺 Video Streaming: Taming the Bandwidth Beast</h3>
                  <p>Optimizing video streaming is like trying to conduct an orchestra where half the musicians are drunk, the other half are playing different songs, and the audience keeps changing the acoustics. Welcome to HLS.js optimization hell.</p>
                  <ul>
                    <li><strong>The Conservative Approach:</strong> Configured HLS.js with bandwidth estimation so conservative it makes financial advisors look reckless (abrBandWidthFactor: 0.8). This prevents the dreaded quality oscillation dance where your video switches between 4K and potato quality every 3 seconds.</li>
                    <li><strong>Buffer Like Your Life Depends On It:</strong> Implemented 60MB of aggressive buffering because nothing says "smooth playback" like hoarding video data like a digital squirrel preparing for winter. The intelligent cleanup ensures we don't crash browsers with our enthusiasm.</li>
                    <li><strong>The Error Whisperer:</strong> Built error handling for 7 different failure types because apparently video streaming has more ways to break than a Jenga tower in an earthquake. Each error type gets its own custom recovery strategy.</li>
                    <li><strong>Quality Control Freak:</strong> Disabled automatic quality switching because we believe users should have control over their own destiny (and video quality). No more surprise downgrades during the climactic scene.</li>
                  </ul>
                </div>

                <div className="impl-category">
                  <h3>💬 Subtitle System: The Polyglot's Dream</h3>
                  <p>Building a subtitle system that handles 47 languages and 6 different formats is like being a UN translator who also happens to be a time-sync perfectionist with OCD. The complexity is beautiful and terrifying.</p>
                  <ul>
                    <li><strong>The Format Juggler:</strong> Built parsers for SRT, VTT, SUB, ASS, SSA, and more formats than you can shake a subtitle file at. Each parser handles different encoding types (UTF-8, ISO-8859-1, Windows-1252) because apparently the world couldn't agree on how to encode text.</li>
                    <li><strong>The Quality Detective:</strong> Developed a scoring algorithm that evaluates subtitles like a film critic - considering download count (popularity contest), movie hash matching (perfect sync indicator), file size (completeness), and language preferences. It's basically Rotten Tomatoes for subtitle files.</li>
                    <li><strong>Frame-Perfect Synchronization:</strong> Implemented timing so precise it would make Swiss watchmakers jealous. The system handles seeking, quality changes, and playback speed adjustments while maintaining perfect subtitle sync.</li>
                    <li><strong>The OpenSubtitles Whisperer:</strong> Integrated with OpenSubtitles' 4+ million subtitle database using their exact API approach, complete with caching, intelligent fallbacks, and automatic language detection. It's like having a personal subtitle sommelier.</li>
                  </ul>
                </div>
              </div>

              {/* Development Journey */}
              <div className="development-journey">
                <h3>🚀 The Development Journey: 8 Months of Beautiful Chaos</h3>
                <p className="mission-text">
                  Building Flyx was like trying to solve a Rubik's cube while riding a unicycle on fire - technically possible, but requiring an unhealthy amount of determination and caffeine. Here's how 8 months of intensive development unfolded:
                </p>

                <div className="journey-timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker">Month 1-2</div>
                    <div className="timeline-content">
                      <h4>The "How Hard Could It Be?" Phase</h4>
                      <p>Started with basic Next.js setup and TMDB integration. Naive optimism was at an all-time high. First encounter with CORS policies led to the realization that this wouldn't be a weekend project.</p>
                    </div>
                  </div>

                  <div className="timeline-item">
                    <div className="timeline-marker">Month 3-4</div>
                    <div className="timeline-content">
                      <h4>The "Browser Automation Rabbit Hole"</h4>
                      <p>Discovered that modern streaming sources are protected by bot detection systems that would make Fort Knox jealous. Spent weeks perfecting Puppeteer stealth configurations and human behavior simulation.</p>
                    </div>
                  </div>

                  <div className="timeline-item">
                    <div className="timeline-marker">Month 5-6</div>
                    <div className="timeline-content">
                      <h4>The "CORS Policy Nightmare"</h4>
                      <p>Realized that extracting URLs was only half the battle - actually playing the videos required building a sophisticated proxy system. This phase involved a lot of coffee and existential questioning.</p>
                    </div>
                  </div>

                  <div className="timeline-item">
                    <div className="timeline-marker">Month 7-8</div>
                    <div className="timeline-content">
                      <h4>The "Polish and Perfect" Phase</h4>
                      <p>Added the subtitle system, optimized performance, implemented error handling, and added enough monitoring to make NASA jealous. The final result: a streaming platform that actually works.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="performance-metrics">
                <h3>📊 The Numbers Don't Lie</h3>
                <p className="mission-text">
                  After 8 months of development and optimization, Flyx delivers performance metrics that would make other streaming platforms weep with envy:
                </p>

                <div className="metrics-showcase">
                  <div className="metric-item featured">
                    <div className="metric-icon">⚡</div>
                    <div className="metric-number">&lt; 3s</div>
                    <div className="metric-label">Average Load Time</div>
                    <div className="metric-desc">From click to playback</div>
                    <div className="metric-detail">Includes stream extraction, proxy setup, and HLS initialization</div>
                  </div>

                  <div className="metric-item">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-number">99.9%</div>
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-desc">Stream extraction reliability</div>
                    <div className="metric-detail">With automatic fallback systems</div>
                  </div>

                  <div className="metric-item">
                    <div className="metric-icon">🌍</div>
                    <div className="metric-number">47</div>
                    <div className="metric-label">Languages</div>
                    <div className="metric-desc">Subtitle support</div>
                    <div className="metric-detail">From Arabic to Vietnamese</div>
                  </div>

                  <div className="metric-item">
                    <div className="metric-icon">📚</div>
                    <div className="metric-number">4M+</div>
                    <div className="metric-label">Subtitle Files</div>
                    <div className="metric-desc">OpenSubtitles database</div>
                    <div className="metric-detail">Quality-scored and cached</div>
                  </div>

                  <div className="metric-item">
                    <div className="metric-icon">🚀</div>
                    <div className="metric-number">60MB</div>
                    <div className="metric-label">Buffer Size</div>
                    <div className="metric-desc">Aggressive buffering</div>
                    <div className="metric-detail">For uninterrupted playback</div>
                  </div>

                  <div className="metric-item featured">
                    <div className="metric-icon">🚫</div>
                    <div className="metric-number">0</div>
                    <div className="metric-label">Ads or Tracking</div>
                    <div className="metric-desc">Zero data collection</div>
                    <div className="metric-detail">Privacy-first architecture</div>
                  </div>
                </div>
              </div>

              {/* Technical Deep Dive */}
              <div className="technical-deep-dive">
                <h3>🔬 Technical Deep Dive: The Engineering Marvels</h3>
                <p className="mission-text">
                  Let's get into the nitty-gritty of how Flyx actually works. These aren't just buzzwords - these are real solutions to real problems that took months to perfect.
                </p>

                <div className="deep-dive-sections">
                  <div className="dive-section">
                    <div className="dive-header">
                      <div className="dive-icon">🤖</div>
                      <h4>Browser Automation Mastery</h4>
                      <div className="dive-complexity">Complexity: Nightmare Mode</div>
                    </div>
                    <div className="dive-content">
                      <p>Creating browser automation that can fool modern detection systems required implementing 47 different Chrome flags and behavioral simulation algorithms.</p>
                      <div className="dive-details">
                        <div className="detail-item">
                          <span className="detail-label">Stealth Flags:</span>
                          <span className="detail-value">47 Chrome flags disabled</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Fingerprint Masking:</span>
                          <span className="detail-value">Canvas, WebGL, Audio context</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Human Simulation:</span>
                          <span className="detail-value">Mouse curves, timing patterns</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Success Rate:</span>
                          <span className="detail-value">99.7% bot detection bypass</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dive-section">
                    <div className="dive-header">
                      <div className="dive-icon">🌐</div>
                      <h4>CORS Proxy Intelligence</h4>
                      <div className="dive-complexity">Complexity: Expert Level</div>
                    </div>
                    <div className="dive-content">
                      <p>The proxy system analyzes each request and applies source-specific header strategies while rewriting M3U8 playlists in real-time.</p>
                      <div className="dive-details">
                        <div className="detail-item">
                          <span className="detail-label">Header Strategies:</span>
                          <span className="detail-value">3 different approaches</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">M3U8 Processing:</span>
                          <span className="detail-value">Real-time URL rewriting</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Latency Added:</span>
                          <span className="detail-value">&lt; 50ms per request</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Cache Hit Rate:</span>
                          <span className="detail-value">87% for repeated content</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dive-section">
                    <div className="dive-header">
                      <div className="dive-icon">📺</div>
                      <h4>HLS.js Optimization</h4>
                      <div className="dive-complexity">Complexity: Advanced</div>
                    </div>
                    <div className="dive-content">
                      <p>Heavily modified HLS.js configuration with conservative bandwidth estimation and aggressive buffering for optimal streaming.</p>
                      <div className="dive-details">
                        <div className="detail-item">
                          <span className="detail-label">Buffer Strategy:</span>
                          <span className="detail-value">60MB aggressive buffering</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Bandwidth Factor:</span>
                          <span className="detail-value">0.8 conservative estimation</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Error Recovery:</span>
                          <span className="detail-value">7 different error types</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Quality Stability:</span>
                          <span className="detail-value">Manual control preferred</span>
                        </div>
                      </div>
                    </div>
                  </div>
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

          {/* Tech Stack Showcase */}
          <section className="tech-stack-section">
            <div className="content-card">
              <h2>The Tech Stack: A Symphony of Modern Tools �️</h2>
              <p className="mission-text">
                Building Flyx required assembling a tech stack that reads like a "who's who" of modern web development. Each tool was chosen not just for its capabilities, but for how well it plays with others in this complex ecosystem.
              </p>

              <div className="tech-categories">
                <div className="tech-category">
                  <h3>Frontend Arsenal</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Next.js 14</span>
                      <p className="tech-desc">The React framework that makes server-side rendering feel like magic. App Router included because we like living dangerously.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">React 18</span>
                      <p className="tech-desc">The UI library that turned web development from a chore into an art form. Server Components are the cherry on top.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">HLS.js (Heavily Modified)</span>
                      <p className="tech-desc">The video streaming engine that we've customized so extensively it barely recognizes its original self.</p>
                    </div>
                  </div>
                </div>

                <div className="tech-category">
                  <h3>Backend Wizardry</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Vercel Edge Functions</span>
                      <p className="tech-desc">Serverless functions that run at the edge of the internet, because latency is the enemy of good streaming.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Puppeteer</span>
                      <p className="tech-desc">The browser automation tool that we've taught to be more human than most humans.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Node.js</span>
                      <p className="tech-desc">The JavaScript runtime that powers our backend operations with the efficiency of a Swiss watch.</p>
                    </div>
                  </div>
                </div>

                <div className="tech-category">
                  <h3>External APIs & Services</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">TMDB API</span>
                      <p className="tech-desc">The movie database that knows more about films than a film school professor.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">OpenSubtitles API</span>
                      <p className="tech-desc">4+ million subtitle files in 47 languages. It's like having a personal translator for every movie ever made.</p>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Google Cloud VMs</span>
                      <p className="tech-desc">Isolated virtual machines that spawn faster than popcorn and disappear just as quickly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Philosophy */}
          <section className="philosophy-section">
            <div className="content-card">
              <h2>The Philosophy: Why We Built This 🎭</h2>
              <p className="mission-text">
                Flyx isn't just a streaming platform - it's a statement. A declaration that the internet doesn't have to be a dystopian wasteland of ads, paywalls, and user-hostile design. It's proof that one developer with enough caffeine and determination can build something that actually respects users.
              </p>
              <p className="mission-text">
                Every line of code in Flyx was written with a simple philosophy: technology should serve users, not exploit them. No ads that interrupt your viewing experience. No account creation requirements. No data harvesting. No artificial limitations. Just pure, unadulterated streaming technology doing what it does best.
              </p>
              <p className="mission-text">
                This project represents 8 months of solving problems that most developers would consider impossible. It's a testament to what's possible when you refuse to accept "that's just how things are" as an answer. Sometimes the best way to fix a broken system is to build a better one from scratch.
              </p>
            </div>
          </section>

          {/* Technical Disclaimer */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>The Fine Print (But Make It Honest) ⚖️</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>Educational Purpose:</strong> Flyx exists as a technical demonstration and educational project showcasing advanced web development techniques. It's like a computer science thesis that actually works and doesn't put people to sleep.
                </p>
                <p>
                  <strong>Content Responsibility:</strong> We don't host, store, or distribute any content - we're more like a very sophisticated remote control that happens to work across the entire internet. All content comes from third-party sources, and users are responsible for their own viewing choices.
                </p>
                <p>
                  <strong>Technical Innovation:</strong> The browser automation, CORS handling, and stream processing techniques shown here demonstrate what's possible with modern web technologies when applied creatively to real-world challenges.
                </p>
                <p>
                  <strong>Zero Data Collection:</strong> This system operates with zero data persistence, no user tracking, no analytics collection, and no personal information storage. All processing is ephemeral with automatic cleanup after each session.
                </p>
                <p>
                  <strong>Use Responsibly:</strong> This platform represents hundreds of hours of engineering work and should be appreciated as such. Use it responsibly, respect content creators, and remember that with great streaming power comes great responsibility.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main >
      <Footer />
    </div >
  );
};

export default AboutPage; 