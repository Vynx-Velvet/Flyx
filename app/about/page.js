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
                Proving that clean, secure media streaming is possible without compromise
              </p>
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
                </div>
                <div className="problem-item">
                  <div className="problem-icon">📢</div>
                  <h3>Intrusive Advertising</h3>
                  <p>Overwhelming pop-ups, redirects, and aggressive advertising that prioritizes profit over user experience and safety.</p>
                </div>
                <div className="problem-item">
                  <div className="problem-icon">🏴‍☠️</div>
                  <h3>Profiteering from Piracy</h3>
                  <p>Sites that profit from content they don't own while providing nothing of value back to creators or users.</p>
                </div>
                <div className="problem-item">
                  <div className="problem-icon">🔒</div>
                  <h3>Privacy Violations</h3>
                  <p>Extensive tracking, data collection, and privacy violations that treat users as products to be sold.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Solution Section */}
          <section className="solution-section">
            <div className="content-card">
              <h2>Our Approach</h2>
              <div className="solution-features">
                <div className="feature">
                  <h3>🛡️ Security First</h3>
                  <p>No malware, no suspicious downloads, no security compromises. Clean code, secure connections, and user safety as the top priority.</p>
                </div>
                <div className="feature">
                  <h3>🚫 Ad-Free Experience</h3>
                  <p>Zero intrusive advertising, pop-ups, or redirects. The focus is entirely on providing a clean, distraction-free viewing experience.</p>
                </div>
                <div className="feature">
                  <h3>🎨 Modern Design</h3>
                  <p>A beautiful, responsive interface that works seamlessly across all devices with smooth animations and intuitive navigation.</p>
                </div>
                <div className="feature">
                  <h3>🔐 Privacy Respected</h3>
                  <p>No unnecessary tracking, minimal data collection, and respect for user privacy and anonymity.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section className="tech-section">
            <div className="content-card">
              <h2>Technology Stack</h2>
              <p className="tech-intro">
                Built with modern web technologies to ensure performance, security, and user experience:
              </p>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-name">Next.js 14</span>
                  <span className="tech-desc">React framework for production</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Node.js</span>
                  <span className="tech-desc">Backend runtime environment</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Modern CSS</span>
                  <span className="tech-desc">Clean, responsive styling</span>
                </div>
                <div className="tech-item">
                  <span className="tech-name">Secure APIs</span>
                  <span className="tech-desc">Safe content delivery</span>
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
                  We respect intellectual property rights and encourage users to support content creators through legitimate means whenever possible. This project exists to highlight the technical feasibility of cleaner alternatives, not to promote piracy.
                </p>
                <p>
                  The goal is to demonstrate that technology can serve users better while maintaining security, privacy, and a quality user experience.
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