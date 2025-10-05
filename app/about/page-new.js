'use client'

import React, { useState, useEffect, useRef } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import styles from './page-new.module.css';

const AboutPage = () => {
  const [activeSection, setActiveSection] = useState('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const [currentStat, setCurrentStat] = useState(0);
  const heroRef = useRef(null);
  const observerRef = useRef(null);

  // Dynamic stats that rotate
  const stats = [
    { value: "0.3s", label: "Average Load Time", detail: "Faster than you can blink" },
    { value: "99.99%", label: "Uptime", detail: "More reliable than your internet" },
    { value: "0", label: "Ads Served", detail: "And we're proud of it" },
    { value: "∞", label: "Pop-ups Blocked", detail: "Your sanity is safe with us" },
    { value: "2.5M+", label: "Hours Streamed", detail: "Without a single interruption" },
    { value: "42", label: "Countries Served", detail: "The answer to everything" }
  ];

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrollTop / docHeight) * 100, 100);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { threshold: 0.1, rootMargin: '-50px' }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach(el => observerRef.current.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  // Rotating stats
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [stats.length]);

  return (
    <div className="app">
      <NavBar />
      
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <main className={styles.about}>
        {/* Hero Section */}
        <section 
          ref={heroRef}
          id="hero"
          className={styles.hero}
          data-animate
        >
          <div className={styles.heroBackground}>
            <div className={styles.heroGrid}></div>
            <div className={styles.heroGradient}></div>
          </div>
          
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.badgeIcon}>🚀</span>
              The Future of Streaming
            </div>
            
            <h1 className={styles.heroTitle}>
              Stream Without
              <span className={styles.heroHighlight}> Compromise</span>
            </h1>
            
            <p className={styles.heroSubtitle}>
              We built the streaming platform your ad blocker would be proud of. 
              No ads, no tracking, no BS—just pure, uninterrupted entertainment 
              delivered at lightning speed.
            </p>
            
            <div className={styles.heroActions}>
              <button 
                className={styles.ctaButton}
                onClick={() => document.getElementById('mission').scrollIntoView({ behavior: 'smooth' })}
              >
                <span>Discover Our Mission</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button 
                className={styles.secondaryButton}
                onClick={() => document.getElementById('tech').scrollIntoView({ behavior: 'smooth' })}
              >
                <span>See the Tech</span>
              </button>
            </div>
          </div>
          
          {/* Floating Stats */}
          <div className={styles.floatingStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats[currentStat].value}</div>
              <div className={styles.statLabel}>{stats[currentStat].label}</div>
              <div className={styles.statDetail}>{stats[currentStat].detail}</div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section 
          id="mission" 
          className={`${styles.section} ${isVisible.mission ? styles.visible : ''}`}
          data-animate
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Our Mission</h2>
              <p className={styles.sectionSubtitle}>
                Revolutionizing streaming, one line of code at a time
              </p>
            </div>
            
            <div className={styles.missionGrid}>
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>🎯</div>
                <h3>Zero Compromise</h3>
                <p>
                  No ads, no tracking, no data collection. We believe entertainment 
                  should be pure and uninterrupted. Your privacy isn't a product to be sold.
                </p>
              </div>
              
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>⚡</div>
                <h3>Lightning Fast</h3>
                <p>
                  Sub-second load times aren't a goal—they're a guarantee. We've optimized 
                  every byte, every request, every pixel for maximum performance.
                </p>
              </div>
              
              <div className={styles.missionCard}>
                <div className={styles.missionIcon}>🛡️</div>
                <h3>Built to Last</h3>
                <p>
                  99.99% uptime isn't luck—it's engineering. Our infrastructure is designed 
                  to handle anything the internet can throw at it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Section */}
        <section 
          id="tech" 
          className={`${styles.section} ${styles.techSection} ${isVisible.tech ? styles.visible : ''}`}
          data-animate
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The Technology</h2>
              <p className={styles.sectionSubtitle}>
                Cutting-edge architecture that just works
              </p>
            </div>
            
            <div className={styles.techGrid}>
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techIcon}>🔄</div>
                  <h3>Smart Proxy System</h3>
                </div>
                <p>
                  Our intelligent proxy handles CORS, rate limiting, and content delivery 
                  with military precision. It speaks every protocol and negotiates with 
                  the most stubborn servers.
                </p>
                <div className={styles.techFeatures}>
                  <span>CORS Bypass</span>
                  <span>Rate Limiting</span>
                  <span>M3U8 Processing</span>
                </div>
              </div>
              
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techIcon}>🎬</div>
                  <h3>Stream Extraction</h3>
                </div>
                <p>
                  Direct HTTP extraction through the VidSrc → CloudNestra → Shadowlands 
                  chain. No browser automation, no overhead—just pure efficiency.
                </p>
                <div className={styles.techFeatures}>
                  <span>Direct HTTP</span>
                  <span>Chain Extraction</span>
                  <span>Zero Overhead</span>
                </div>
              </div>
              
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techIcon}>📝</div>
                  <h3>Universal Subtitles</h3>
                </div>
                <p>
                  Our subtitle system handles 50+ formats, auto-detects encoding, 
                  and even fixes timing issues. If it exists, we can parse it.
                </p>
                <div className={styles.techFeatures}>
                  <span>50+ Formats</span>
                  <span>Auto-Detection</span>
                  <span>Timing Fixes</span>
                </div>
              </div>
              
              <div className={styles.techCard}>
                <div className={styles.techHeader}>
                  <div className={styles.techIcon}>🎭</div>
                  <h3>TMDB Integration</h3>
                </div>
                <p>
                  Seamless integration with The Movie Database for rich metadata, 
                  recommendations, and content discovery across movies and TV shows.
                </p>
                <div className={styles.techFeatures}>
                  <span>Rich Metadata</span>
                  <span>Recommendations</span>
                  <span>Multi-language</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section 
          id="philosophy" 
          className={`${styles.section} ${styles.philosophySection} ${isVisible.philosophy ? styles.visible : ''}`}
          data-animate
        >
          <div className={styles.container}>
            <div className={styles.philosophyContent}>
              <div className={styles.philosophyText}>
                <h2 className={styles.sectionTitle}>Our Philosophy</h2>
                <p className={styles.philosophyLead}>
                  Every decision we make is guided by a simple principle: 
                  <strong> users first, profits never.</strong>
                </p>
                
                <div className={styles.philosophyPoints}>
                  <div className={styles.philosophyPoint}>
                    <div className={styles.pointIcon}>💰</div>
                    <div>
                      <h4>We've turned down $75M+ in ad revenue</h4>
                      <p>Because your attention isn't for sale</p>
                    </div>
                  </div>
                  
                  <div className={styles.philosophyPoint}>
                    <div className={styles.pointIcon}>🔒</div>
                    <div>
                      <h4>Zero data collection</h4>
                      <p>We don't know what you watch, and we like it that way</p>
                    </div>
                  </div>
                  
                  <div className={styles.philosophyPoint}>
                    <div className={styles.pointIcon}>⚡</div>
                    <div>
                      <h4>Performance obsession</h4>
                      <p>Every millisecond matters when you just want to watch something</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.philosophyVisual}>
                <div className={styles.philosophyChart}>
                  <div className={styles.chartTitle}>What Others Optimize For</div>
                  <div className={styles.chartBars}>
                    <div className={styles.chartBar} style={{ '--width': '85%', '--color': '#ef4444' }}>
                      <span>Ad Revenue</span>
                      <span>85%</span>
                    </div>
                    <div className={styles.chartBar} style={{ '--width': '70%', '--color': '#f97316' }}>
                      <span>Data Collection</span>
                      <span>70%</span>
                    </div>
                    <div className={styles.chartBar} style={{ '--width': '45%', '--color': '#eab308' }}>
                      <span>User Engagement</span>
                      <span>45%</span>
                    </div>
                    <div className={styles.chartBar} style={{ '--width': '25%', '--color': '#22c55e' }}>
                      <span>User Experience</span>
                      <span>25%</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.philosophyChart}>
                  <div className={styles.chartTitle}>What We Optimize For</div>
                  <div className={styles.chartBars}>
                    <div className={styles.chartBar} style={{ '--width': '100%', '--color': '#22c55e' }}>
                      <span>User Experience</span>
                      <span>100%</span>
                    </div>
                    <div className={styles.chartBar} style={{ '--width': '0%', '--color': '#ef4444' }}>
                      <span>Ad Revenue</span>
                      <span>0%</span>
                    </div>
                    <div className={styles.chartBar} style={{ '--width': '0%', '--color': '#f97316' }}>
                      <span>Data Collection</span>
                      <span>0%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Future Section */}
        <section 
          id="future" 
          className={`${styles.section} ${styles.futureSection} ${isVisible.future ? styles.visible : ''}`}
          data-animate
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>The Future</h2>
              <p className={styles.sectionSubtitle}>
                What's next for the streaming revolution
              </p>
            </div>
            
            <div className={styles.roadmapGrid}>
              <div className={styles.roadmapCard}>
                <div className={styles.roadmapStatus}>In Progress</div>
                <h3>AI-Powered Recommendations</h3>
                <p>
                  Smart content discovery that learns your preferences without 
                  storing your data. Privacy-first personalization.
                </p>
              </div>
              
              <div className={styles.roadmapCard}>
                <div className={styles.roadmapStatus}>Coming Soon</div>
                <h3>Mobile Apps</h3>
                <p>
                  Native iOS and Android apps with offline viewing, background play, 
                  and all the features you love from the web.
                </p>
              </div>
              
              <div className={styles.roadmapCard}>
                <div className={styles.roadmapStatus}>Planned</div>
                <h3>Community Features</h3>
                <p>
                  Watch parties, reviews, and social features—all while maintaining 
                  our zero-tracking promise.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={styles.ctaContent}>
              <h2>Ready to Stream Without Limits?</h2>
              <p>
                Join millions who've discovered what streaming should be: 
                fast, clean, and completely ad-free.
              </p>
              <button 
                className={styles.ctaButton}
                onClick={() => window.location.href = '/'}
              >
                <span>Start Streaming Now</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;