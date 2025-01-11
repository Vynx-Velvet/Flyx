import React, { createContext, useContext, useState } from "react";

const MediaContext = createContext();

export const useMediaContext = () => {
  const context = useContext(MediaContext);
  if (!context) {
    return {};
  }
  return context;
};

export const MediaProvider = ({ children }) => {
	const [mediaLoaded, setMediaLoaded] = useState();

	const updateMedia = (media) => {
		console.log(media)
		setMediaLoaded(media);
	}

	const getMedia = (media) => {
		return mediaLoaded;
	};
	
	
	return (
		<MediaContext.Provider value={{ updateMedia, getMedia }}>
		  {children}
		</MediaContext.Provider>
	);

};

