import { NextResponse } from 'next/server';

const tmdbOptions = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization:
      'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiOGlhY2RkODdlMTJjMjgzZjU2ZmViMmUwMTZiNDk2NCIsIm5iZiI6MTcxOTg4MzU2OS40NDU1MDcsInN1YiI6IjY2ODE5MzQ5NjhlOTgzNmRjZWRkNDM3NSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.bETg1ujNoewklg0L0Q3hOZuqnaB9v7V4XzenHmlLYso',
  },
};

export async function GET(request, { params }) {
  const { movieId, seasonId } = params;

  try {
    // Silent operation - only log errors
    
    const seasonResponse = await fetch(
      `https://api.themoviedb.org/3/tv/${movieId}/season/${seasonId}?language=en-US`, 
      tmdbOptions
    );
    
    if (!seasonResponse.ok) {
      throw new Error(`TMDB API error: ${seasonResponse.status}`);
    }
    
    const seasonData = await seasonResponse.json();
    
    // Return the season data with episodes for navigation
    return NextResponse.json(seasonData);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch season details' },
      { status: 500 }
    );
  }
}