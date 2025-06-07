'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import "./NavBar.css"

const NavBar = ({ onClearSearch }) => {
  const router = useRouter();

  const handleLogoClick = () => {
    if (window.location.pathname === '/') {
      // If already on home page, clear search state
      if (onClearSearch) {
        onClearSearch();
      }
    } else {
      // Navigate to home page
      router.push('/');
    }
  };

  return (
    <nav className="navbar">
      <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
        Flyx
      </div>
    </nav>
  );
};

export default NavBar;
