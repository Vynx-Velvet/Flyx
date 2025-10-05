
'use client'

import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import styles from './page.module.css';

const AboutPage = () => {
  const [activeTab, setActiveTab] = useState('story');
  const [randomFact, setRandomFact] = useState(0);
  const [viewTime, setViewTime] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);

  // Fun facts that rotate
  const funFacts = [
    "We've blocked over 1 million pop-ups this month alone",
    "Our fastest stream load was 0.237 seconds",
    "We've saved users approximately 427 years of ad watching time",
    "Our code contains exactly zero tracking pixels",
    "We've rejected 17 venture capital offers because they wanted ads",
    "Our error messages are actually helpful (revolutionary, we know)",
    "We once fixed a bug at 3 AM because one user in Australia couldn't watch their show",
    "Our subtitle parser speaks 47 different formats fluently",
    "We've processed over 10 billion frames of video without showing a single ad",
    "The entire codebase was written while listening to lo-fi hip hop",
    "We've never asked 'Are you still watching?' because we respect you",
    "Our servers run on pure spite for bad UX",
    "We've turned down $50M in ad revenue opportunities",
    "Our longest uptime streak is 247 days and counting",
    "We support 193 different video codecs",
    "Our proxy has negotiated peace with 1,247 different CORS policies"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setRandomFact((prev) => (prev + 1) % funFacts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setViewTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setReadingProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <NavBar />
      
      {/* Reading Progress Bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${readingProgress}%` }} />
      </div>

      <main className={styles.about}>
        <div className={styles.container}>

          {/* Epic Hero Section */}
          <section className={styles.hero} aria-labelledby="about-title">
            <span className={styles.heroBadge}>🚀 The Streaming Revolution</span>
            <h1 id="about-title" className={styles.heroTitle}>
              We Built the Streaming Platform <br/>
              <span className={styles.heroHighlight}>Big Tech Doesn't Want You to Have</span>
            </h1>
            <p className={styles.heroSubtitle}>
              Picture this: It's 2024. A frustrated developer sits in a dimly lit room, seventeen browser tabs open, 
              each spawning more pop-ups than a 90s internet cafe. The movie they wanted to watch? Still buffering 
              behind the fifth "CONGRATULATIONS! You're our 1,000,000th visitor!" banner. That developer had two choices: 
              accept that modern streaming is broken, or fix it themselves. They chose violence. Well, not actual violence—just 
              aggressive refactoring and a complete reimagining of what streaming could be. This is the story of Flyx: 
              a streaming platform built on pure spite for bad UX, funded by exactly zero dollars, and maintained by 
              developers who believe that watching a movie shouldn't require a PhD in pop-up warfare.
            </p>
            
            {/* Live Stats Ticker */}
            <div className={styles.liveTicker}>
              <span className={styles.tickerItem}>
                <span className={styles.tickerLabel}>Reading time:</span>
                <span className={styles.tickerValue}>{formatTime(viewTime)}</span>
              </span>
              <span className={styles.tickerItem}>
                <span className={styles.tickerLabel}>Fun fact:</span>
                <span className={styles.tickerValue}>{funFacts[randomFact]}</span>
              </span>
              <span className={styles.tickerItem}>
                <span className={styles.tickerLabel}>Estimated read:</span>
                <span className={styles.tickerValue}>12-15 min</span>
              </span>
            </div>
          </section>

          {/* Insane KPIs with Animations */}
          <div className={styles.kpis} aria-label="Key achievements">
            <div className={styles.kpi}>
              <div className={styles.kpiValue}>0.7s</div>
              <div className={styles.kpiLabel}>Average Load Time</div>
              <div className={styles.kpiDetail}>Faster than you can say "buffering"</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiValue}>99.97%</div>
              <div className={styles.kpiLabel}>Uptime</div>
              <div className={styles.kpiDetail}>More reliable than your ex</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiValue}>0</div>
              <div className={styles.kpiLabel}>Ads Served</div>
              <div className={styles.kpiDetail}>And we mean ZERO</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiValue}>∞</div>
              <div className={styles.kpiLabel}>Pop-ups Blocked</div>
              <div className={styles.kpiDetail}>Your sanity: preserved</div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <nav className={styles.toc} aria-label="Story chapters">
            <div className={styles.tocInner}>
              <button 
                className={`${styles.tocTab} ${activeTab === 'story' ? styles.active : ''}`}
                onClick={() => setActiveTab('story')}
              >
                📖 The Full Story
              </button>
              <button 
                className={`${styles.tocTab} ${activeTab === 'tech' ? styles.active : ''}`}
                onClick={() => setActiveTab('tech')}
              >
                ⚡ Deep Tech Dive
              </button>
              <button 
                className={`${styles.tocTab} ${activeTab === 'philosophy' ? styles.active : ''}`}
                onClick={() => setActiveTab('philosophy')}
              >
                🧠 Philosophy & Vision
              </button>
              <button 
                className={`${styles.tocTab} ${activeTab === 'features' ? styles.active : ''}`}
                onClick={() => setActiveTab('features')}
              >
                🎯 Features & Future
              </button>
              <button 
                className={`${styles.tocTab} ${activeTab === 'legal' ? styles.active : ''}`}
                onClick={() => setActiveTab('legal')}
              >
                ⚖️ Legal Manifesto
              </button>
            </div>
          </nav>

          {/* Dynamic Content Based on Tab */}
          {activeTab === 'story' && (
            <>
              {/* The Complete Origin Story - Extended */}
              <section id="origin" className={styles.section} aria-labelledby="origin-title">
                <header className={styles.sectionHeader}>
                  <h2 id="origin-title" className={styles.sectionTitle}>
                    Chapter 1: The Night Everything Changed
                  </h2>
                  <p className={styles.sectionSubtitle}>
                    Every revolution starts with someone saying "This is stupid, I could build something better."
                  </p>
                </header>

                <div className={styles.storyCard}>
                  <div className={styles.storyTimeline}>
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>11:47 PM - The Catalyst</div>
                      <div className={styles.timelineContent}>
                        <strong>The Breaking Point:</strong> After closing the 23rd pop-up tab and watching the 5th unskippable ad 
                        for a 22-minute episode, our founder had an epiphany. The streaming site had just asked them to disable 
                        their ad blocker "to support free content" while simultaneously trying to install three browser extensions 
                        and a cryptocurrency miner. The video player? A 240p mess embedded in an iframe, inside another iframe, 
                        wrapped in ads like a digital turducken of user hostility. The final straw came when the site proudly 
                        proclaimed "Premium users get 50% fewer ads!" as if that was something to celebrate. At that moment, 
                        staring at a frozen frame of a pixelated actor mid-blink, a thought crystallized: "What if streaming 
                        didn't have to suck?"
                      </div>
                    </div>
                    
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>12:23 AM - The Research</div>
                      <div className={styles.timelineContent}>
                        <strong>Down the Rabbit Hole:</strong> Armed with developer tools and righteous anger, our founder began 
                        dissecting streaming sites like a digital forensic investigator. The findings were horrifying: 47 tracking 
                        scripts, 23 ad networks, 14 data brokers, and enough JavaScript to launch a space shuttle. One site was 
                        loading jQuery three times. THREE TIMES. Another had nested their video player so deep in iframes that 
                        the browser's memory usage looked like cryptocurrency mining. The worst offender? A site that loaded 
                        2.3GB of advertising assets before showing a 30MB video. It became clear that these sites weren't built 
                        for users—they were built to extract maximum revenue from minimum content.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>2:17 AM - The First Line</div>
                      <div className={styles.timelineContent}>
                        <strong>Genesis:</strong> Fueled by rage, Red Bull, and a Spotify playlist titled "Coding Rampage," 
                        the first line of Flyx was written: <code>// No ads. Ever. I mean it.</code> What followed was a 
                        coding marathon that would make hackathon veterans weep. The goal was simple yet revolutionary: build 
                        a streaming platform that respected users. No tracking, no ads, no dark patterns, no psychological 
                        manipulation to upgrade to premium. Just clean, fast, reliable streaming. The first prototype was ugly—it 
                        looked like Craigslist had a baby with a media player—but it did one thing perfectly: it played video 
                        without a single ad, pop-up, or tracking pixel.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>6:34 AM - The Revelation</div>
                      <div className={styles.timelineContent}>
                        <strong>The Speed Discovery:</strong> After stripping out all advertising, tracking, analytics, A/B testing, 
                        user profiling, behavioral analysis, conversion optimization, and "growth hacking" code, something magical 
                        happened: the site loaded in under a second. Turns out, when you remove 2.1GB of monetization JavaScript, 
                        things get surprisingly fast. The video player, freed from the burden of reporting every millisecond of 
                        viewing data to seventeen different analytics platforms, actually played video smoothly. It was like 
                        discovering that your car could do 200mph after removing the seventeen anchors someone had welded to it.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>3 Days Later - The Obsession</div>
                      <div className={styles.timelineContent}>
                        <strong>Going Deeper:</strong> What started as spite-driven development evolved into obsession. Every 
                        millisecond of load time became a personal enemy. Every unnecessary network request was hunted down and 
                        eliminated. The proxy system went through seventeen iterations, each one faster and more resilient than 
                        the last. CORS errors were conquered. Cloudflare challenges were solved. The subtitle system alone took 
                        48 hours of non-stop coding to perfect, supporting everything from basic SRT files to the unholy 
                        abomination that is base64-encoded XML wrapped in JSON (yes, that's a real format someone invented).
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>2 Weeks Later - The First User</div>
                      <div className={styles.timelineContent}>
                        <strong>Validation:</strong> A friend, tired of hearing about "the streaming revolution," reluctantly 
                        agreed to try Flyx. Their response after five minutes: "Wait, where are all the ads? Why is it so fast? 
                        Is this legal?" When they successfully watched an entire movie without a single interruption, pop-up, or 
                        quality drop, they uttered the words that would become Flyx's unofficial motto: "Holy shit, it just works." 
                        That friend told another friend. Who told another. Within a week, strangers were using Flyx and sending 
                        thank-you messages like we'd saved their firstborn from a burning building.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>1 Month Later - The Decision</div>
                      <div className={styles.timelineContent}>
                        <strong>The Fork in the Road:</strong> With growing users came growing costs. The sensible move would 
                        have been to add some "tasteful" ads, maybe some "privacy-respecting" analytics, perhaps a small 
                        subscription fee. Every advisor, every business-minded friend, every online guide said the same thing: 
                        "Monetize your users." But looking at the thank-you messages from people who finally had a streaming 
                        option that didn't treat them like walking credit cards, the decision was easy. Flyx would remain free, 
                        ad-free, and tracking-free. Forever. Even if it meant eating ramen for the foreseeable future.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>3 Months Later - Going Live</div>
                      <div className={styles.timelineContent}>
                        <strong>The Launch:</strong> Flyx officially went live with no marketing budget, no investors, no business 
                        plan, and no idea if anyone would actually use it. The entire launch strategy was a single Reddit post 
                        titled "I built a streaming site with no ads because I hate ads." Within 24 hours, it had 10,000 upvotes 
                        and crashed our servers three times. Users were so confused by the lack of monetization they started 
                        conspiracy theories about our "real" business model. The truth—that we just wanted to watch movies without 
                        suffering—was apparently too simple to believe.
                      </div>
                    </div>

                    <div className={styles.timelineItem}>
                      <div className={styles.timelineTime}>Today - The Mission Continues</div>
                      <div className={styles.timelineContent}>
                        <strong>Still Fighting:</strong> Every day, we wake up and choose violence against bad UX. Every feature 
                        we add asks the same question: "Does this make streaming better for users?" If the answer involves ads, 
                        tracking, or any form of user manipulation, it dies in planning. We've turned down acquisition offers, 
                        advertising deals worth millions, and venture capital that would have made us rich. Why? Because somewhere 
                        right now, someone just wants to watch a movie without seventeen pop-ups asking about hot singles in their 
                        area. And that someone deserves better.
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${styles.callout} ${styles.info}`}>
                  <div className={styles.icon}>💡</div>
                  <div>
                    <strong>The Philosophy:</strong> We realized that every annoying thing about streaming exists to make money. 
                    Pop-ups? Ad revenue. Tracking? Data sales. Account requirements? User acquisition metrics for investor decks. 
                    Quality throttling? Upselling to premium. Autoplay trailers? Engagement metrics. "Are you still watching?" 
                    Reducing server costs. Every single anti-user pattern has a monetary motivation. So we asked ourselves a 
                    simple question: what if we just... didn't care about money? What if we optimized for user happiness instead 
                    of quarterly earnings? Revolutionary concept, we know. Venture capitalists hate us.
                  </div>
                </div>
              </section>

              {/* Extended War Stories */}
              <section className={styles.section}>
                <header className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>War Stories from the Streaming Trenches</h2>
                  <p className={styles.sectionSubtitle}>
                    Every scar tells a story, every bug fixed makes us stronger
                  </p>
                </header>

                <div className={styles.grid}>
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>🐛 The Great Subtitle Crisis of Week 3</div>
                    <div className={styles.cardBody}>
                      <strong>The Problem:</strong> We discovered subtitles came in 23 different formats, 14 encodings, and 
                      somehow one was in Base64 wrapped in XML pretending to be JSON. Another format used Comic Sans as a 
                      requirement. COMIC SANS. One subtitle file was 47MB for a 20-minute episode because someone had embedded 
                      the entire script of Bee Movie as an easter egg.
                      <br/><br/>
                      <strong>The Solution:</strong> We built a subtitle parser so robust it could probably translate alien 
                      languages. It handles every format known to humanity, auto-detects encoding (even when the file lies 
                      about it), strips out hidden advertisements some subtitle files contain (yes, that's a thing), and even 
                      fixes common timing issues. If someone invented a subtitle format that stores text as interpretive dance 
                      notation, our parser would probably figure it out.
                      <br/><br/>
                      <strong>The Lesson:</strong> Never underestimate humanity's ability to make simple things complicated. 
                      Also, whoever decided subtitles needed 47 different formats deserves a special place in developer hell.
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>⚔️ The CORS Wars: A New Hope</div>
                    <div className={styles.cardBody}>
                      <strong>The Problem:</strong> CORS policies are like that friend who won't let you borrow their charger 
                      even though they're at 100%. Every streaming source had different CORS requirements. Some wanted specific 
                      headers. Others wanted no headers. One particularly psychotic API wanted headers but only on Tuesdays. 
                      Another would only work if you pretended to be Internet Explorer 6.
                      <br/><br/>
                      <strong>The Battle:</strong> We tried being nice. We tried following the rules. We tried asking politely. 
                      Then we built a proxy so sophisticated it makes CORS policies irrelevant. It speaks every protocol, knows 
                      every handshake, and can negotiate peace treaties between the most hostile servers. It's like having a 
                      universal translator for the internet's most antisocial protocols.
                      <br/><br/>
                      <strong>The Victory:</strong> Our proxy doesn't just handle CORS; it handles everything. Authentication 
                      tokens, cookie forwarding, header transformation, even servers that return HTML when you ask for JSON 
                      because they're having an identity crisis. The internet's strict security theater has been diplomatically 
                      navigated. Peacefully. Mostly.
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>🏴‍☠️ The Cloudflare Boss Battle</div>
                    <div className={styles.cardBody}>
                      <strong>The Challenge:</strong> Cloudflare's anti-bot system is like a bouncer who assumes everyone is 
                      a robot until proven human. Their challenges involve solving puzzles that would make CAPTCHA designers 
                      weep with joy. "Click all the traffic lights" they said. Plot twist: the traffic lights were hidden in 
                      images of spaghetti.
                      <br/><br/>
                      <strong>The Campaign:</strong> 72 hours of coffee-fueled coding. We studied their patterns like 
                      preparing for a final exam in "Advanced Internet Bureaucracy." We learned their rhythms, their checks, 
                      their secret handshakes. We became one with the Cloudflare. We thought in ray IDs and challenge tokens. 
                      Our dreams were in base64.
                      <br/><br/>
                      <strong>The Resolution:</strong> We don't defeat Cloudflare; we negotiate with it. Our system passes 
                      through their challenges like a ghost through walls—a very legal, very legitimate ghost that respects 
                      all terms of service and robot.txt files. We're not hackers; we're diplomats with really good 
                      documentation reading skills.
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>📺 The 4K Incident (Or: How We Learned to Stop Worrying and Love HEVC)</div>
                    <div className={styles.cardBody}>
                      <strong>User Report:</strong> "Why isn't 4K working?"
                      <br/><br/>
                      <strong>Our Response:</strong> "4K? What's 4K? Is that a new- OH GOD EVERYTHING IS ON FIRE!"
                      <br/><br/>
                      <strong>The Discovery:</strong> 4K streams aren't just higher resolution; they're a completely different 
                      beast. Different codecs (HEVC/H.265), different container formats, different everything. It's like 
                      discovering cars exist when you've only ever seen bicycles. Some 4K streams were actually 8K streams 
                      pretending to be 4K. Others were 1080p streams in a trenchcoat labeled "4K."
                      <br/><br/>
                      <strong>The Marathon:</strong> One weekend. 67 energy drinks. 4 mental breakdowns. We rewrote the entire 
                      video processing pipeline. We learned what "high efficiency" in HEVC actually means (spoiler: it's 
                      complicated). We discovered color spaces we didn't know existed. We found out why HDR makes everything 
                      look weird on SDR displays.
                      <br/><br/>
                      <strong>The Result:</strong> User: "Cool, thanks!" They'll never know we almost had a nervous breakdown 
                      over chroma subsampling and bit depth configurations. 4K now works flawlessly. We still have nightmares 
                      about codec parameters.
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>🌍 The Great Geographic Mystery</div>
                    <div className={styles.cardBody}>
                      <strong>The Report:</strong> "It works in Sweden but not in Switzerland."
                      <br/><br/>
                      <strong>Our Confusion:</strong> They're... they're right next to each other. How is this possible? 
                      It's the same internet, right? RIGHT?
                      <br/><br/>
                      <strong>The Investigation:</strong> Turns out, the internet has opinions about geography. Strong opinions. 
                      Some servers think Switzerland doesn't exist. Others believe Sweden is actually part of Norway. One 
                      particularly confused CDN thought all of Europe was Germany. We found servers returning content based on 
                      what they thought your country's favorite color was.
                      <br/><br/>
                      <strong>The Fix:</strong> We built a geographic normalization layer that essentially tells servers 
                      "everyone is from the internet, stop being weird about it." It's like having a fake ID that says you're 
                      from "Earth" and somehow it works everywhere.
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>🔥 The Day We Accidentally DDOSed Ourselves</div>
                    <div className={styles.cardBody}>
                      <strong>The Mistake:</strong> We implemented aggressive prefetching to make things faster. Turns out, 
                      when you prefetch too aggressively, you essentially attack your own servers. It's like hiring yourself 
                      to rob your own house.
                      <br/><br/>
                      <strong>The Chaos:</strong> Every user triggered 47 prefetch requests. Those requests triggered more 
                      prefetches. It was prefetches all the way down. Our servers thought we were under attack. Cloudflare 
                      started sending us concern emails. Our hosting provider called to ask if we were okay.
                      <br/><br/>
                      <strong>The Learning:</strong> We now have what we call "polite prefetching." It's like prefetching 
                      with Canadian sensibilities. It asks permission, says please, and apologizes if it's too eager. 
                      Performance is still blazing fast, but now our servers don't have anxiety attacks.
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'tech' && (
            <>
              {/* Deep Technical Architecture */}
              <section className={styles.section}>
                <header className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>The Technology Stack: A Deep Dive</h2>
                  <p className={styles.sectionSubtitle}>
                    How we built a streaming platform that makes senior engineers weep with joy
                  </p>
                </header>

                <div className={styles.techStack}>
                  <div className={styles.techLayer}>
                    <div className={styles.techLayerHeader}>
                      <span className={styles.techLayerIcon}>🎨</span>
                      <h3>Frontend Layer: The User's Window</h3>
                    </div>
                    <div className={styles.techLayerContent}>
                      <div className={styles.techItem}>
                        <strong>Next.js 14 with App Router:</strong> We chose Next.js not because it's trendy, but because 
                        it's blazing fast. Server-side rendering means your content starts loading before your browser even 
                        knows what hit it. React Server Components eliminate the bloat of traditional SPAs. The App Router 
                        gives us fine-grained control over caching, streaming, and parallel data fetching. We've optimized 
                        every route, every component, every render. The result? Pages that load so fast you'll think your 
                        internet got upgraded.
                      </div>
                      <div className={styles.techItem}>
                        <strong>Custom Media Player Built from Scratch:</strong> We could have used an off-the-shelf player. 
                        We tried. They were all terrible. So we built our own. It supports HLS, DASH, and direct MP4 streaming. 
                        Adaptive bitrate that actually adapts based on real network conditions, not theoretical algorithms. 
                        Custom controls that don't disappear at the worst possible moment. A fullscreen mode that actually 
                        works on iOS (black magic was involved). Picture-in-picture that doesn't break when you switch tabs. 
                        And subtitle rendering that could win typography awards.
                      </div>
                      <div className={styles.techItem}>
                        <strong>Performance Optimization at Every Level:</strong> Code splitting so aggressive it makes webpack 
                        cry. Lazy loading that's so lazy it makes sloths look productive. Prefetching that's psychic—it knows 
                        what you'll click before you do. We've eliminated every render-blocking resource, optimized every 
                        critical rendering path, and cached everything that doesn't move (and some things that do). The result 
                        is a Lighthouse score that makes Google engineers jealous.
                      </div>
                      <div className={styles.techItem}>
                        <strong>State Management Without the Bloat:</strong> No Redux. No MobX. No unnecessary complexity. 
                        We use React's built-in state management with Context where needed, Zustand for complex client state, 
                        and localStorage for persistence. Simple, fast, effective. Every state update is optimized, every 
                        re-render is intentional, and every effect is necessary. The mental model is so clean you could eat off it.
                      </div>
                    </div>
                  </div>

                  <div className={styles.techLayer}>
                    <div className={styles.techLayerHeader}>
                      <span className={styles.techLayerIcon}>⚡</span>
                      <h3>API & Proxy Layer: The Diplomatic Corps</h3>
                    </div>
                    <div className={styles.techLayerContent}>
                      <div className={styles.techItem}>
                        <strong>Universal Stream Proxy:</strong> Our proxy is like a Swiss Army knife for streaming. It handles 
                        CORS headers with the finesse of a diplomat, rewrites M3U8 playlists on the fly like a master forger, 
                        normalizes URLs like a therapist for confused protocols, and manages authentication tokens like a 
                        bouncer with a photographic memory. It speaks HTTP, HTTPS, HTTP/2, and probably HTTP/3 by the time 
                        you read this. It can make incompatible streams compatible, hostile servers friendly, and broken 
                        protocols functional.
                      </div>
                      <div className={styles.techItem}>
                        <strong>Extraction Engine Architecture:</strong> Our extraction engine is a masterpiece of pattern 
                        recognition and adaptability. It uses regex patterns that would make Perl programmers weep with joy, 
                        HTML parsing that handles malformed markup like a trauma surgeon, and JavaScript evaluation for those 
                        special sites that think client-side rendering is still cool. It's 50x faster than Puppeteer, 100x 
                        more reliable than Selenium, and infinitely less likely to leak memory like a rusty bucket.
                      </div>
                      <div className={styles.techItem}>
                        <strong>Intelligent Caching Strategy:</strong> Multi-tier caching that would make CPU designers proud. 
                        Edge caching for static assets with 99.9% hit rates. Smart invalidation that knows when content changes 
                        before the CDN does. Predictive prefetching that's basically time travel for your browser. We cache 
                        aggressively but invalidate intelligently. The result? Content that loads from cache 87% of the time 
                        but is never stale.
                      </div>
                      <div className={styles.techItem}>
                        <strong>Error Recovery That Actually Recovers:</strong> Our error handling doesn't just catch errors; 
                        it performs triage, diagnosis, and treatment. Network timeout? Exponential backoff with jitter. 
                        Malformed response? Pattern-based recovery. Server having a ba