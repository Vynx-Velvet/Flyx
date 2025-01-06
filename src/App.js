import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import ShowDetails from './components/ShowDetails';


const App = () => {
  const [selectedMovie, setSelectedMovie] = useState(null);

  const handleMovieClick = (movieId) => {
    console.log(movieId)
    setSelectedMovie(movieId);
  };

  useEffect((

  ) => {}, [selectedMovie]);

  return (
    <div className="app">
      {!selectedMovie ? (
        <HomePage movieClick={handleMovieClick} />
      ) : (
        <>
          <ShowDetails movieId={selectedMovie} backButton={handleMovieClick} />
        </>
      )}
    </div>
  );
};

export default App;
