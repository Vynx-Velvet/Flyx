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
                The story of how two developers lost their minds trying to make streaming work, one CORS error at a time
              </p>
            </div>
          </section>

          {/* Origin Story */}
          <section className="origin-section">
            <div className="content-card">
              <h2>The Origin Story: "How Hard Could It Be?" 🤡</h2>
              <p className="mission-text">
                It all started with a simple question: "Why do all these streaming sites look like they were designed in 2003 and have more ads than a NASCAR car?" We thought, "Hey, how hard could it be to make a clean streaming platform?" 
              </p>
              <p className="mission-text">
                <strong>Narrator:</strong> <em>It was, in fact, very hard.</em>
              </p>
              <p className="mission-text">
                What began as a weekend project quickly turned into a months-long journey through the seventh circle of web development hell. We discovered that the streaming world is basically the Wild West, except everyone's wearing a trench coat and whispering about "embed.su" in dark corners of Discord servers.
              </p>
              <p className="mission-text">
                Our mission was simple: create a platform that doesn't try to install 47 browser extensions, mine Bitcoin on your GPU, or redirect you to "Hot Singles in Your Area" every time you breathe near the play button. Turns out, this was revolutionary thinking in the streaming world.
              </p>
            </div>
          </section>

          {/* The Development Journey */}
          <section className="development-journey-section">
            <div className="content-card">
              <h2>The Development Journey: A Comedy of Errors 😭</h2>
              <p className="mission-text">
                <strong>Month 1: "This Should Take a Week"</strong><br/>
                We started with the confidence of a junior developer who just learned React. "We'll just scrape some URLs, proxy them, and boom - Netflix killer!" The first attempt involved a simple fetch request that immediately got smacked down by CORS faster than a fly hitting a windshield.
              </p>
              <p className="mission-text">
                <strong>Month 2: "Okay, Maybe We Need a Backend"</strong><br/>
                Enter Playwright, our knight in shining armor... that occasionally decided to crash for no reason. We spent countless hours debugging headless browsers that worked perfectly until we added one tiny console.log, then suddenly acted like they'd never seen JavaScript before. The browser would literally sit there like "¯\_(ツ)_/¯" while we screamed at our monitors.
              </p>
              <p className="mission-text">
                <strong>Month 3: "Why Is Everything Obfuscated?"</strong><br/>
                We discovered that streaming sites protect their URLs with obfuscation so thick you need a machete to cut through it. Variables named like someone fell asleep on their keyboard, functions that call functions that call more functions just to decrypt "potato".
              </p>
              <p className="mission-text">
                <strong>Month 4: "The CORS Wars"</strong><br/>
                CORS became our nemesis. We tried everything: monkey-patching fetch, bribing the browser security gods, even whispering sweet nothings to our HTTP headers. Finally, we built a proxy that basically acts like a diplomatic translator between angry streaming servers and confused browsers.
              </p>
              <p className="mission-text">
                <strong>Month 5: "It Works! ...Sometimes"</strong><br/>
                Success! Sort of. It worked perfectly on our machines, but broke spectacularly in production. The classic developer experience: "Well, it works in dev environment" became our motto. Turns out VM networking is different from localhost. Who knew? 🤷‍♂️
              </p>
              <p className="mission-text">
                <strong>Month 6: "Polish and Panic"</strong><br/>
                Adding subtitles seemed simple until we realized there are approximately 47 different subtitle formats, each with their own special way of timing text. SRT files that claim to be UTF-8 but are actually encoded in some ancient Babylonian character set. VTT files that work everywhere except the one browser your users actually use.
              </p>
            </div>
          </section>

          {/* Real Technical Challenges */}
          <section className="reverse-engineering-section">
            <div className="content-card">
              <h2>Real Technical Challenges: The Stuff That Actually Broke Us 💀</h2>
              <p className="mission-text">
                Here's the real tea about what we actually went through, because "learning experience" is just a nice way of saying "we cried a lot."
              </p>
              
              <div className="process-grid">
                <div className="process-step">
                  <div className="step-number">01</div>
                  <h3>The Great Bot Detection Wars</h3>
                  <p>Turns out, streaming sites really don't like robots. They detect everything: your user agent, your screen resolution, how you move your mouse, probably your astrological sign. We had to make our bot act more human than actual humans.</p>
                  <p className="process-detail"><strong>The Reality:</strong> We spent 3 weeks making Playwright move the mouse in "realistic" patterns. Our bot was doing little mouse dances, random scrolls, even fake typos. It had more personality than some of our friends.</p>
                  <p className="process-detail"><strong>The Breakthrough:</strong> The secret wasn't being more human - it was being consistently inconsistent. Real humans are chaotically imperfect. Our bot learned to be beautifully, randomly flawed.</p>
                  <div className="tech-stack-mini">
                    <span>Playwright</span>
                    <span>Tears</span>
                    <span>Coffee</span>
                    <span>More Tears</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">02</div>
                  <h3>CORS: The Gatekeeper From Hell</h3>
                  <p>CORS errors became our sleep paralysis demon. "Access to fetch has been blocked by CORS policy" haunted our dreams. We tried everything short of sacrificing a rubber duck to the browser gods.</p>
                  <p className="process-detail"><strong>The Madness:</strong> We built 4 different proxy approaches. One used reverse proxying, another tried header spoofing, one attempted to sweet-talk the browser with promises of good behavior. None worked consistently.</p>
                  <p className="process-detail"><strong>The Solution:</strong> We finally built a smart proxy that doesn't just forward requests - it reads M3U8 playlists like a bedtime story and rewrites every URL in real-time. It's basically a URL translator with anger management issues.</p>
                  <div className="tech-stack-mini">
                    <span>Proxy Magic</span>
                    <span>Header Manipulation</span>
                    <span>URL Rewriting</span>
                    <span>Voodoo</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">03</div>
                  <h3>JavaScript Obfuscation: The Puzzle From Hell</h3>
                  <p>Streaming sites protect their URLs with obfuscation so thick you need a machete to cut through it. Variables named like someone fell asleep on their keyboard, functions that call functions that call more functions just to decrypt "potato".</p>
                  <p className="process-detail"><strong>The Nightmare:</strong> We found URLs buried 17 layers deep in obfuscated JavaScript. Base64 inside URL encoding inside more base64 inside a function that only runs if the moon is in the right phase and you've clicked exactly 3 times.</p>
                  <p className="process-detail"><strong>The Eureka Moment:</strong> Instead of trying to reverse-engineer the obfuscation, we let the browser do it for us. We execute the code in a sandbox and catch the good stuff when it tries to escape. Lazy? Yes. Effective? Also yes.</p>
                  <div className="tech-stack-mini">
                    <span>Runtime Execution</span>
                    <span>Pattern Recognition</span>
                    <span>Regex Witchcraft</span>
                    <span>Luck</span>
                  </div>
                </div>
                
                <div className="process-step">
                  <div className="step-number">04</div>
                  <h3>The M3U8 Playlist Madness</h3>
                  <p>M3U8 files are like IKEA instructions - they look simple until you try to follow them. Each playlist can link to more playlists, creating an infinite Russian doll situation that made us question our life choices.</p>
                  <p className="process-detail"><strong>The Chaos:</strong> Some playlists had relative URLs, others had absolute URLs, some had URLs that only work if you ask nicely. Quality levels that lie about their resolution. Segments that expire faster than milk in summer.</p>
                  <p className="process-detail"><strong>The Fix:</strong> We built a parser that's basically a psychic - it predicts what the playlist author meant to do, not what they actually did. It can handle broken timestamps, missing headers, and URLs that lead to 404 pages.</p>
                  <div className="tech-stack-mini">
                    <span>M3U8 Parsing</span>
                    <span>URL Reconstruction</span>
                    <span>Quality Detection</span>
                    <span>Patience</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The "Aha!" Moments */}
          <section className="architecture-section">
            <div className="content-card">
              <h2>The "Aha!" Moments: When Things Finally Clicked 💡</h2>
              <p className="mission-text">
                Between the mental breakdowns and caffeine overdoses, we had some genuine breakthroughs. These are the moments that made all the suffering worth it (or at least bearable).
              </p>
              
              <div className="architecture-diagram">
                <div className="arch-layer frontend">
                  <h4>🎭 The Frontend: Where Dreams Come to Die</h4>
                  <div className="arch-components">
                    <div className="component">Next.js 14 (Bleeding Edge)</div>
                    <div className="component">React (With Hooks Addiction)</div>
                    <div className="component">HLS.js (Video Player Savior)</div>
                    <div className="component">CSS Tears</div>
                  </div>
                  <p className="arch-description">The frontend looks deceptively simple, but underneath it's managing real-time subtitle synchronization, quality switching without buffering, and progress updates that actually work. It's like a swan - elegant on the surface, paddling frantically underneath.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer api">
                  <h4>⚡ The API Layer: Our Swiss Army Knife</h4>
                  <div className="arch-components">
                    <div className="component">Next.js API Routes</div>
                    <div className="component">CORS Proxy (The Hero)</div>
                    <div className="component">Stream Extraction</div>
                    <div className="component">Subtitle Pipeline</div>
                  </div>
                  <p className="arch-description">Serverless functions that do the heavy lifting. The stream proxy is basically a diplomatic translator between angry streaming servers and confused browsers. It speaks fluent M3U8 and can negotiate with headers that have trust issues.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer vm">
                  <h4>🤖 The VM: Our Headless Browser Army</h4>
                  <div className="arch-components">
                    <div className="component">Google Cloud VMs</div>
                    <div className="component">Playwright Automation</div>
                    <div className="component">Stealth Mode</div>
                    <div className="component">Bot Disguises</div>
                  </div>
                  <p className="arch-description">Each request gets its own pristine VM with a fresh Chromium browser that's been trained in the ancient arts of "acting human." It can scroll naturally, pause like it's thinking, and even fake reading comprehension. It's method acting for browsers.</p>
                </div>
                <div className="arch-arrow">↓</div>
                <div className="arch-layer sources">
                  <h4>🎯 The Sources: Our Frenemies</h4>
                  <div className="arch-components">
                    <div className="component">embed.su (The Reliable One)</div>
                    <div className="component">vidsrc.xyz (The Moody One)</div>
                    <div className="component">OpenSubtitles (Subtitle Heaven)</div>
                    <div className="component">Various Backup Plans</div>
                  </div>
                  <p className="arch-description">Our streaming sources have personalities. embed.su is like that reliable friend who always shows up, while vidsrc.xyz is more like that friend who's amazing when they're in a good mood but will ghost you for no reason. We learned to work with both types.</p>
                </div>
              </div>
            </div>
          </section>

          {/* The Technical Deep Dive (But Funny) */}
          <section className="implementation-section">
            <div className="content-card">
              <h2>The Technical Deep Dive: How We Actually Built This Monster 🔧</h2>
              <p className="mission-text">
                Here's the real technical stuff, but explained like we're telling a story at a bar after too many Pacific Punch Monster Energy drinks.
              </p>
              
              <div className="implementation-grid">
                <div className="impl-category">
                  <h3>🚀 The Backend: Powered by Desperation</h3>
                  <ul>
                    <li><strong>VM Isolation:</strong> Every request gets its own VM because we learned the hard way that browsers hold grudges. One bad request can poison the whole session, like that one friend who ruins the vibe at parties.</li>
                    <li><strong>Serverless Everything:</strong> We went serverless because we're too lazy to manage servers. Vercel handles the scaling while we handle the existential crises. It's a good division of labor.</li>
                    <li><strong>The Proxy System:</strong> Our proxy is like a translator who's fluent in "angry server" and "confused browser." It rewrites URLs faster than a politician rewrites their campaign promises.</li>
                    <li><strong>Subtitle Integration:</strong> We integrated with OpenSubtitles because life's too short to watch movies without knowing what anyone is saying. Plus, their API documentation is actually readable, which is rarer than you'd think.</li>
                    <li><strong>Caching Strategy:</strong> We cache everything except our mistakes (we made too many of those). Multiple layers of caching because nothing hurts more than waiting 30 seconds for a stream that doesn't work.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>🛡️ Security: Paranoia as a Service</h3>
                  <ul>
                    <li><strong>Request Isolation:</strong> Every extraction runs in a completely clean environment. It's like surgical conditions, but for browser automation. We're basically the CDC of web scraping.</li>
                    <li><strong>Header Randomization:</strong> Our bots have more fake identities than a spy movie. They rotate user agents, randomize headers, and probably have trust issues by now.</li>
                    <li><strong>Human Behavior Simulation:</strong> Teaching browsers to act human was like teaching your dad to use TikTok - painful but necessary. Our bots now scroll with the perfect amount of laziness.</li>
                    <li><strong>Rate Limiting:</strong> We're polite robots. We don't spam servers like that person who sends 47 texts in a row. Nobody likes that person, including servers.</li>
                    <li><strong>Error Handling:</strong> Our error handling has error handling. It's error handling all the way down. We've seen things break in ways that shouldn't be physically possible.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>⚡ Performance: The Need for Speed</h3>
                  <ul>
                    <li><strong>Multi-Layer Caching:</strong> We cache so aggressively it borders on hoarding. Browser cache, CDN cache, application cache, probably emotional cache too. Cache is love, cache is life.</li>
                    <li><strong>Real-Time Updates:</strong> The frontend gets live updates during extraction like a sports commentator calling a game. "And here we see the browser navigating to the embed page... OH! A wild CAPTCHA appears!"</li>
                    <li><strong>Smart Fallbacks:</strong> When our primary source fails, we switch to backups faster than a politician changes positions during election season. Seamless failure is an art form.</li>
                    <li><strong>Resource Management:</strong> We manage browser instances like a helicopter parent. Every resource is tracked, every memory leak is hunted down like it owes us money.</li>
                    <li><strong>Global Distribution:</strong> Thanks to Vercel's edge network, our suffering is available worldwide! Users in Tokyo can experience the same CORS errors as users in New York. True global equality.</li>
                  </ul>
                </div>
                
                <div className="impl-category">
                  <h3>🎬 Media Processing: The Magic Show</h3>
                  <ul>
                    <li><strong>Format Support:</strong> We support more video formats than a Swiss Army knife has tools. HLS, MP4, WebM, and probably some formats that haven't been invented yet.</li>
                    <li><strong>Quality Detection:</strong> Our system can identify video quality like a wine sommelier identifies vintages. "Ah yes, this is a fine 720p with hints of compression artifacts and a robust buffering profile."</li>
                    <li><strong>Subtitle Processing:</strong> Converting SRT to VTT shouldn't be rocket science, but here we are. Different subtitle formats have more personality disorders than reality TV stars.</li>
                    <li><strong>Adaptive Streaming:</strong> The player automatically adjusts quality based on your internet speed, which is more consideration than most streaming services give you.</li>
                    <li><strong>Seeking Support:</strong> Our seeking actually works, unlike that one streaming site where clicking the timeline is basically playing Russian roulette with your sanity.</li>
                  </ul>
                </div>
              </div>

              {/* NEW: Actual Code Examples Section */}
              <div className="code-examples-section">
                <h3>📝 The Code That Actually Works (Sometimes)</h3>
                <p className="mission-text">
                  Here's some actual code from our implementation, with commentary on why we did what we did (and why we regret some of it).
                </p>

                <div className="code-example">
                  <h4>🤖 VM Stream Extraction - The Bot That Learned to Act Human</h4>
                  <pre className="code-block">
{`// This is how we make our bot act more human than actual humans
const hlsConfig = {
  // COMPLETELY DISABLE ALL NATIVE SUBTITLE RENDERING
  renderTextTracksNatively: false,
  subtitleTrackController: false,
  subtitleDisplay: false,
  
  // Aggressive high quality settings
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  maxBufferSize: 60 * 1000 * 1000, // 60MB buffer
  
  // Enhanced error recovery - because streams love to break
  fragLoadingRetryDelay: 500,
  fragLoadingMaxRetry: 1,
  fragLoadingMaxRetryTimeout: 5000,
  
  // Quality maintenance settings
  abrBandWidthFactor: 0.8,
  abrBandWidthUpFactor: 0.7,
  
  enableWorker: false, // Disable worker to avoid edge cases
  lowLatencyMode: false, // Stability over speed
};`}
                  </pre>
                  <p className="code-explanation">
                    This HLS.js configuration took weeks to perfect. We disabled native subtitle rendering because browsers have opinions about text that don't match ours. The aggressive buffering keeps quality high, and the conservative bandwidth factors prevent the player from getting too ambitious and choking on bad connections.
                  </p>
                </div>

                <div className="code-example">
                  <h4>🛡️ CORS Proxy - The Diplomatic Solution</h4>
                  <pre className="code-block">
{`// Smart headers that make servers trust us
function getStreamHeaders(originalUrl, userAgent, source) {
  const isVidsrc = source === 'vidsrc';
  const isSubtitle = originalUrl.includes('.vtt') || originalUrl.includes('.srt');
  
  if (isVidsrc || isSubtitle) {
    // Minimal headers for sensitive sources
    return {
      'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': isSubtitle ? 'text/vtt, text/plain, */*' : '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    };
  }
  
  // Full diplomatic headers for embed.su
  return {
    'Referer': 'https://embed.su/',
    'Origin': 'https://embed.su',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
}`}
                  </pre>
                  <p className="code-explanation">
                    Different streaming sources have different trust issues. vidsrc.xyz gets suspicious with too many headers, while embed.su wants the full diplomatic treatment. Our proxy speaks both languages fluently and knows which personality to use for each source.
                  </p>
                </div>

                <div className="code-example">
                  <h4>🎯 Browser Automation - Teaching Robots to Be Human</h4>
                  <pre className="code-block">
{`// This is how we make browsers act naturally suspicious
const browserOptions = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-ipc-flooding-protection',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-client-side-phishing-detection',
    '--disable-sync',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-default-apps',
    '--mute-audio',
    '--no-default-browser-check',
    '--autoplay-policy=user-gesture-required',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};

// Human-like behavior simulation
await page.evaluate(() => {
  // Override webdriver detection
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
  
  // Randomize screen properties
  Object.defineProperty(screen, 'width', {
    get: () => 1920 + Math.floor(Math.random() * 100),
  });
});`}
                  </pre>
                  <p className="code-explanation">
                    This is our "make the bot look human" spell. We disable automation flags, randomize screen properties, and add natural delays. The browser thinks it's being driven by a slightly confused human with inconsistent mouse movements - which is perfect.
                  </p>
                </div>

                <div className="code-example">
                  <h4>📺 Subtitle Processing - The Universal Translator</h4>
                  <pre className="code-block">
{`// Converting SRT to VTT because the world needs more standards
function srtToVtt(srtContent) {
  // Add VTT header
  let vttContent = 'WEBVTT\\n\\n';
  
  // Split into subtitle blocks
  const blocks = srtContent.split(/\\n\\s*\\n/);
  
  blocks.forEach(block => {
    const lines = block.trim().split('\\n');
    if (lines.length >= 3) {
      // Skip the sequence number
      const timestamp = lines[1];
      const text = lines.slice(2).join('\\n');
      
      // Convert SRT timestamp to VTT format
      const vttTimestamp = timestamp.replace(/,/g, '.');
      
      vttContent += \`\${vttTimestamp}\\n\${text}\\n\\n\`;
    }
  });
  
  return vttContent;
}

// Quality scoring because not all subtitles are created equal
function calculateQualityScore(subtitle) {
  let score = 0;
  
  // Language bonus
  if (subtitle.language === 'en') score += 100;
  
  // Download count bonus (popularity)
  score += Math.min(subtitle.downloadCount || 0, 50);
  
  // Movie hash match bonus (perfect sync)
  if (subtitle.movieHash) score += 200;
  
  // Hearing impaired penalty (usually has [music] tags)
  if (subtitle.hearingImpaired) score -= 25;
  
  // File size bonus (more content usually = better)
  if (subtitle.fileSize > 50000) score += 25;
  
  return score;
}`}
                  </pre>
                  <p className="code-explanation">
                    Our subtitle system is like a picky librarian - it knows exactly what makes a good subtitle file. We score based on language, popularity, synchronization, and file size. The result is subtitles that actually match what people are saying, when they're saying it.
                  </p>
                </div>

                <div className="code-example">
                  <h4>⚡ Real-Time Progress Updates - The Play-by-Play Commentary</h4>
                  <pre className="code-block">
{`// Live updates during stream extraction
const updateProgress = (phase, progress, details) => {
  const update = {
    phase: phase,
    progress: progress,
    details: details,
    timestamp: Date.now()
  };
  
  // Send to frontend via WebSocket or polling
  broadcastUpdate(update);
  
  logger.info('Extraction progress update', {
    phase,
    progress: \`\${progress}%\`,
    details,
    duration: Date.now() - extractionStart
  });
};

// Phase progression during extraction
updateProgress('Initializing', 0, 'Starting browser instance...');
updateProgress('Navigating', 20, 'Loading embed page...');
updateProgress('Analyzing', 40, 'Detecting video sources...');
updateProgress('Extracting', 60, 'Decoding stream URLs...');
updateProgress('Validating', 80, 'Testing stream quality...');
updateProgress('Complete', 100, 'Stream ready for playback!');`}
                  </pre>
                  <p className="code-explanation">
                    We give users live updates during extraction because waiting in silence is psychological torture. The frontend gets play-by-play commentary like a sports game: "And here we see the browser navigating to the embed page... OH! A wild CAPTCHA appears!"
                  </p>
                </div>

                <div className="code-example">
                  <h4>🎮 Advanced Error Recovery - The Phoenix System</h4>
                  <pre className="code-block">
{`// This is how we handle the inevitable chaos
const handleStreamError = (error, context) => {
  const errorMap = {
    'CORS': () => switchToProxyMode(),
    'NETWORK_ERROR': () => retryWithBackoff(),
    'MEDIA_ERR_DECODE': () => switchQuality('lower'),
    'BUFFER_STALL': () => clearBufferAndResume(),
    'MANIFEST_LOAD_ERROR': () => findAlternativeSource(),
    'FRAG_LOAD_ERROR': () => skipToNextSegment(),
    'LEVEL_SWITCH_ERROR': () => lockToCurrentQuality()
  };
  
  const recovery = errorMap[error.code] || (() => panicAndRestart());
  
  logger.error('Stream error detected', {
    error: error.code,
    context,
    recoveryStrategy: recovery.name,
    timestamp: Date.now()
  });
  
  return recovery();
};

// Exponential backoff with jitter
const retryWithBackoff = async (attempt = 1) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 0.1 * delay;
  
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
  
  if (attempt < 3) {
    return retryWithBackoff(attempt + 1);
  } else {
    throw new Error('Maximum retries exceeded');
  }
};`}
                  </pre>
                  <p className="code-explanation">
                    Our error handling is like a Swiss Army knife for digital disasters. Every error gets a custom recovery strategy, from switching quality levels to finding alternative sources. We've learned that in the streaming world, everything breaks eventually - the key is breaking gracefully.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* The Horror Stories */}
          <section className="challenges-section">
            <div className="content-card">
              <h2>War Stories: When Everything Went Wrong 💀</h2>
              <p className="mission-text">
                These are the challenges that made us question our career choices, our life decisions, and whether technology was a mistake.
              </p>
              
              <div className="challenges-grid">
                <div className="challenge-item">
                  <div className="challenge-icon">🤖</div>
                  <h3>The Day the Bots Revolted</h3>
                  <p>embed.su updated their bot detection and suddenly our perfectly working system started failing 100% of the time. It was like our bots showed up to work and everyone was speaking a different language.</p>
                  <p className="challenge-detail">We spent 72 hours straight debugging, consuming enough caffeine to power a small village. Turns out they added canvas fingerprinting detection. Our bots needed to learn how to draw, apparently.</p>
                  <p className="challenge-detail">The fix involved making our browsers generate slightly different canvas fingerprints each time, like giving each bot its own unique digital DNA. We're basically playing God with browser identities.</p>
                  <div className="solution-badge">Fixed with Digital Art Therapy</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">🌐</div>
                  <h3>The Great CORS Catastrophe of 2024</h3>
                  <p>One day everything worked. The next day, CORS errors everywhere. It was like the browser security gods woke up and chose violence. No code changes, no server updates, just pure chaos.</p>
                  <p className="challenge-detail">Spent a week thinking we broke something. Turns out, browsers updated their CORS policies and decided to be more aggressive about blocking requests. Thanks for the heads up, Chrome!</p>
                  <p className="challenge-detail">We had to rebuild our entire proxy system to be more diplomatic with headers. It now speaks fluent "please don't block me" in 12 different HTTP dialects.</p>
                  <div className="solution-badge">Diplomacy Through Code</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">🧩</div>
                  <h3>The Subtitle Format Wars</h3>
                  <p>Who knew there were so many ways to display text on a screen? SRT, VTT, SUB, ASS (yes, that's a real format), and about 47 others. Each one with its own special quirks and emotional baggage.</p>
                  <p className="challenge-detail">Our converter worked great... until we encountered a subtitle file that was apparently encoded in ancient Sumerian. Character encoding became our nemesis. UTF-8 was more like "UTF-Hate."</p>
                  <p className="challenge-detail">We built a subtitle parser that's basically a universal translator. It can handle broken timestamps, missing headers, and files that seem to have been corrupted by cosmic radiation.</p>
                  <div className="solution-badge">Subtitles for the Multiverse</div>
                </div>
                
                <div className="challenge-item">
                  <div className="challenge-icon">📱</div>
                  <h3>The Mobile Browser Massacre</h3>
                  <p>Desktop browsers: "Sure, we'll play your video!" Mobile browsers: "What's a video? Also, your CSS is ugly and your JavaScript smells funny." Building for mobile was like coding with boxing gloves on.</p>
                  <p className="challenge-detail">iOS Safari has its own interpretation of web standards that's about as consistent as weather predictions. What works in Chrome definitely doesn't work in Safari, and what works in Safari breaks everything else.</p>
                  <p className="challenge-detail">We ended up with more browser-specific code than a 2005 website. Progressive enhancement became progressive surrender. If it works on iPhone, Android, and at least one desktop browser, we call it a win.</p>
                  <div className="solution-badge">Compatibility Through Suffering</div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats That Made Us Cry */}
          <section className="metrics-section">
            <div className="content-card">
              <h2>The Numbers: Our Digital Therapy Session 📊</h2>
              <p className="mission-text">
                Here are the statistics that tell the real story of our journey through development hell.
              </p>
              
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-value">1,643</div>
                  <div className="metric-label">Pacific Punch Monster Energy Cans</div>
                  <div className="metric-desc">Consumed during development. That's about 6 cans per day of active development. Our local gas station now stocks extra just for us.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">2.3s</div>
                  <div className="metric-label">Avg. Stream Time</div>
                  <div className="metric-desc">From click to play. Faster than most people can find the TV remote. We're basically wizards at this point.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">95.7%</div>
                  <div className="metric-label">Success Rate</div>
                  <div className="metric-desc">Which is better than our success rate at explaining to our families what we actually do for work.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">99.9%</div>
                  <div className="metric-label">Uptime</div>
                  <div className="metric-desc">Better uptime than our sleep schedule during development. The servers are more reliable than we are.</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">∞</div>
                  <div className="metric-label">Stack Overflow Visits</div>
                  <div className="metric-desc">We probably kept Stack Overflow's servers running with our desperate searches for "CORS error help please god"</div>
                </div>
                <div className="metric-card">
                  <div className="metric-value">47</div>
                  <div className="metric-label">Existential Crises</div>
                  <div className="metric-desc">Per week during peak development. We considered switching careers to something easier, like rocket science.</div>
                </div>
              </div>
            </div>
          </section>

          {/* The Tech Stack Hall of Fame */}
          <section className="tech-section">
            <div className="content-card">
              <h2>The Tech Stack: Our Digital Army 🛠️</h2>
              <p className="mission-text">
                These are the technologies that helped us build Flyx, along with our honest opinions about each one.
              </p>
              
              <div className="tech-categories">
                <div className="tech-category">
                  <h3>Frontend: The Pretty Face</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Next.js 14 🔥</span>
                      <span className="tech-desc">The new hotness. App Router is like regular routing but with more anxiety. Server components are magic until they break, then they're black magic.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">React 18 ⚛️</span>
                      <span className="tech-desc">Our old reliable. Still causing re-render nightmares and useEffect confusion. It's like that friend who's great but has some issues.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">HLS.js 📺</span>
                      <span className="tech-desc">The video player library that actually works. Unlike some other players we could mention (*cough* native video element *cough*).</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">CSS Grid/Flexbox 🎨</span>
                      <span className="tech-desc">For when you need 47 different layouts to work on 47 different screen sizes. Still easier than explaining CSS to your dog.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>Backend: The Brain (Such As It Is)</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">Node.js 🚀</span>
                      <span className="tech-desc">JavaScript on the backend because we hate ourselves. Actually pretty fast when it's not busy garbage collecting our hopes and dreams.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Playwright 🎭</span>
                      <span className="tech-desc">Browser automation that occasionally works. Like having a very expensive, very slow intern who sometimes forgets how to click buttons.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Google Cloud Platform ☁️</span>
                      <span className="tech-desc">Hosts our VMs and occasionally our nervous breakdowns. Billing is as mysterious as their documentation, but at least it scales.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Vercel Edge Functions ⚡</span>
                      <span className="tech-desc">Serverless functions that deploy faster than we can break them. The cold start times are shorter than our attention spans.</span>
                    </div>
                  </div>
                </div>
                
                <div className="tech-category">
                  <h3>APIs & Services: Our Lifelines</h3>
                  <div className="tech-grid">
                    <div className="tech-item">
                      <span className="tech-name">TMDB API 🎬</span>
                      <span className="tech-desc">The movie database that knows more about films than we know about our own code. Free tier is generous, unlike some APIs we could mention.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">OpenSubtitles API 💬</span>
                      <span className="tech-desc">4 million subtitle files because reading lips is hard. Their API is like a treasure chest, if treasures were SRT files.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Streaming Sources 📡</span>
                      <span className="tech-desc">embed.su and friends. Reliable until they're not. It's like dating but with more JavaScript and fewer feelings.</span>
                    </div>
                    <div className="tech-item">
                      <span className="tech-name">Custom Proxy System 🛡️</span>
                      <span className="tech-desc">Our greatest achievement and biggest headache. It rewrites URLs like a very aggressive editor with commitment issues.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Lessons Learned */}
          <section className="security-ethics-section">
            <div className="content-card">
              <h2>Lessons Learned: Wisdom Born from Pain 🎓</h2>
              <p className="mission-text">
                If you're thinking about building something similar, here's what we learned so you don't have to suffer as much as we did.
              </p>
              <p className="mission-text">
                <strong>Lesson 1: CORS is Not Your Friend</strong><br/>
                CORS will betray you when you least expect it. Build your proxy system first, not last. Trust us, we learned this the hard way after rebuilding our entire architecture twice.
              </p>
              <p className="mission-text">
                <strong>Lesson 2: Browsers Have Trust Issues</strong><br/>
                Modern browsers are more paranoid than a conspiracy theorist at an alien convention. Every security update breaks something new. Embrace the chaos, become one with the breakage.
              </p>
              <p className="mission-text">
                <strong>Lesson 3: Documentation is a Myth</strong><br/>
                Most streaming APIs have documentation that's about as useful as a chocolate teapot. You'll spend more time reverse-engineering than actually coding. Pack snacks for the journey.
              </p>
              <p className="mission-text">
                <strong>Lesson 4: Murphy's Law is an Understatement</strong><br/>
                Everything that can go wrong will go wrong, and some things that shouldn't be able to go wrong will find creative new ways to break. Embrace the absurdity.
              </p>
              <p className="mission-text">
                <strong>Lesson 5: Pacific Punch Monster Energy is a Necessary Dependency</strong><br/>
                Make sure to add caffeine to your package.json. It's not listed as a dev dependency, but it definitely should be. Our entire system runs on Pacific Punch Monster Energy and determination. We went through approximately 6 cans per day during active development - that's 1,643 cans total. The gas station clerk now knows us by name.
              </p>
              <p className="mission-text">
                <strong>Lesson 6: Error Messages Are Suggestions</strong><br/>
                That "Network Error" could mean literally anything from DNS issues to cosmic radiation. Build your error handling like you're preparing for an alien invasion - expect the unexpected and have backup plans for your backup plans.
              </p>
              <p className="mission-text">
                <strong>Lesson 7: The Browser is Your Frenemy</strong><br/>
                Browsers will work perfectly for 99.9% of users, then completely break for that one person using Internet Explorer on Windows Vista. Yes, that person still exists, and they will find your website.
              </p>
            </div>
          </section>

          {/* Future Plans */}
          <section className="future-section">
            <div className="content-card">
              <h2>What's Next: More Suffering, But Organized 🚀</h2>
              <p className="mission-text">
                Because apparently we enjoy pain, here's what we're planning to add next. Each feature comes with its own unique opportunities for despair!
              </p>
              <p className="mission-text">
                <strong>AI Integration:</strong> Teaching machines to find streams because humans clearly aren't masochistic enough. Machine learning models that can detect "good" streaming links vs "definitely malware" links with 73% accuracy (better than us).
              </p>
              <p className="mission-text">
                <strong>Better Mobile Support:</strong> Making the mobile experience less painful. Currently our mobile app works about as well as a chocolate firewall, so there's room for improvement.
              </p>
              <p className="mission-text">
                <strong>More Streaming Sources:</strong> Adding more sources because we apparently enjoy the challenge of reverse-engineering new forms of digital sadness. Each new source is like a puzzle designed by someone who doesn't like us very much.
              </p>
              <p className="mission-text">
                <strong>Community Features:</strong> User accounts, watchlists, recommendations. You know, all the features that require databases and user management and other things that keep developers awake at night.
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="disclaimer-section">
            <div className="content-card disclaimer-card">
              <h2>The Fine Print: Please Don't Sue Us 📝</h2>
              <div className="disclaimer-content">
                <p>
                  <strong>This is educational content, folks!</strong> We built this to prove it was possible, not to overthrow the streaming industrial complex. Think of it as a very expensive science experiment that occasionally plays movies.
                </p>
                <p>
                  We're not trying to compete with Netflix, we just wanted to see if we could build something that doesn't assault your eyeballs with pop-ups every 3 seconds. Apparently, this was considered revolutionary thinking.
                </p>
                <p>
                  <strong>Technical Demonstration Only:</strong> This project exists to showcase what's possible with modern web technologies when you have too much time and not enough sense. The real streaming services have lawyers; we have coffee and determination.
                </p>
                <p>
                  <strong>No Malware, We Promise:</strong> Unlike 99% of streaming sites, we don't try to install mysterious browser extensions or mine cryptocurrency on your laptop. We're rebels like that.
                </p>
                <p>
                  If anyone from the streaming sites is reading this: we're impressed by your security measures. They gave us many interesting debugging challenges and contributed significantly to our caffeine addiction. Thank you for the educational experience!
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