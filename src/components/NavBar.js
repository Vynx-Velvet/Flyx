import React from 'react';

const NavBar = () => {

  return (
    <nav className="navbar">
      <div className="logo" onClick={() => {window.location.reload()}}>Flyx</div>
    </nav>
  );
};

export default NavBar;
