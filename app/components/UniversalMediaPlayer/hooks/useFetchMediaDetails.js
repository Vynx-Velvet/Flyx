import { useState, useEffect } from 'react';

export const useFetchMediaDetails = (mediaId, mediaType) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!mediaId || !mediaType) {
            setLoading(false);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const action = mediaType === 'tv' ? 'getShowDetails' : 'getMovieDetails';
                const response = await fetch(`/api/tmdb?action=${action}&movieId=${mediaId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch media details');
                }
                const data = await response.json();
                setDetails(data);
            } catch (err) {
                setError(err.message);
                console.error('Failed to fetch media details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [mediaId, mediaType]);

    return { details, loading, error };
}; 