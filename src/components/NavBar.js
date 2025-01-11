import React from 'react';
import "./NavBar.css"

const NavBar = () => {

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => {window.location.reload()}}>Flyx</div>
    </nav>
  );
};

export default NavBar;
