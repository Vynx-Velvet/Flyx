'use client'

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import "./NavBar.css"

const NavBar = ({ onClearSearch }) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogoClick = () => {
    if (pathname === '/') {
      // If already on home page, clear search state
      if (onClearSearch) {
        onClearSearch();
      }
    } else {
      // Navigate to home page
      router.push('/');
    }
  };

  const handleAboutClick = () => {
    router.push('/about');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="logo" onClick={handleLogoClick}>
          <div className="logo-container">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="logo-svg">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <path d="M4 8L16 2L28 8V24L16 30L4 24V8Z" stroke="url(#logoGradient)" strokeWidth="2" fill="rgba(99, 102, 241, 0.1)" />
                <circle cx="16" cy="16" r="6" fill="url(#logoGradient)" />
                <path d="M12 16L15 19L20 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="logo-text-container">
              <span className="logo-text">FLYX</span>
              <div className="logo-tagline">Stream Beyond</div>
            </div>
          </div>
          <div className="logo-particles">
            <span className="particle particle-1"></span>
            <span className="particle particle-2"></span>
            <span className="particle particle-3"></span>
          </div>
        </div>
        
        <div className="nav-links">
          <button 
            className={`nav-link ${pathname === '/' ? 'active' : ''}`}
            onClick={handleLogoClick}
          >
            Home
          </button>
          <button 
            className={`nav-link ${pathname === '/about' ? 'active' : ''}`}
            onClick={handleAboutClick}
          >
            About
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
