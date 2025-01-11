import React, { useState } from "react";
import "./MediaPlayer.css"
const MediaPlayer = ({
  mediaType,
  movieId,
  seasonId,
  episodeId,
  maxEpisodes,
  onEpisodeChange,
  onBackToShowDetails,
}) => {
  const [server, setServer] = useState("Vidsrc.xyz");

  // Generate the embed URL based on the media type and server
  const embedUrl =
    mediaType === "movie"
      ? server === "Embed.su"
        ? `https://embed.su/embed/${mediaType}/${movieId}`
        : `https://vidsrc.xyz/embed/${mediaType}?tmdb=${movieId}`
      : server === "Embed.su"
      ? `https://embed.su/embed/${mediaType}/${movieId}/${seasonId}/${episodeId}`
      : `https://vidsrc.xyz/embed/${mediaType}?tmdb=${movieId}&season=${seasonId}&episode=${episodeId}`;

  const handleServerChange = (event) => {
    setServer(event.target.value);
  };

  const handleNextEpisode = () => {
    if (episodeId < maxEpisodes) {
      onEpisodeChange(seasonId, episodeId + 1);
    }
  };

  const handlePreviousEpisode = () => {
    if (episodeId > 1) {
      onEpisodeChange(seasonId, episodeId - 1);
    }
  };

  const handleBackToShowDetails = () => {
    onBackToShowDetails(seasonId);
  };

  return (
    <div className="media-container">
      <div className="media-player">
        <iframe
          src={embedUrl}
          title={`Media Player - ${mediaType} ${movieId}`}
          width="100%"
          height="100%"
          frameBorder="0"
          referrerPolicy="origin"
          allowFullScreen
        ></iframe>
      </div>
      {mediaType === "tv" && (
        <div className="media-controls">
          {episodeId <= 1 ? null : <button
            onClick={handlePreviousEpisode}
            disabled={episodeId <= 1}
            className={`control-button ${episodeId <= 1 ? "disabled" : ""}`}
          >
            ◄ Previous Episode
          </button>}
          
          <button
            onClick={handleNextEpisode}
            disabled={episodeId >= maxEpisodes}
            className={`control-button ${
              episodeId >= maxEpisodes ? "disabled" : ""
            }`}
          >
            Next Episode ►
          </button>
        </div>
      )}
      <div className="other-options">
      <button onClick={handleBackToShowDetails} className="control-button">
        Back to Show Details
      </button>
      <div className="server-selector">
        <label htmlFor="server">Choose Server: </label>
        <select id="server" value={server} onChange={handleServerChange}>
          <option value="Embed.su">Embed.su</option>
          <option value="Vidsrc.xyz">Vidsrc.xyz</option>
        </select>
        </div>
      </div>
    </div>
  );
};

export default MediaPlayer;
