import React, { useState } from 'react';
import HomePage from './components/HomePage';
import ShowDetails from './components/ShowDetails';
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import { useMediaContext } from './context/mediaContext';

const App = () => {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const {updateMedia} = useMediaContext();
  const handleMovieClick = (movieId) => {
    setSelectedMovie(movieId);
    updateMedia(selectedMovie);
  };

  return (
    <div className="app">
      <NavBar />
      {!selectedMovie ? (
        <HomePage movieClick={handleMovieClick} />
      ) : (
          <ShowDetails movieId={selectedMovie} clearMovie={handleMovieClick} />
      )}
      <Footer />
    </div>
  );
};

export default App;
