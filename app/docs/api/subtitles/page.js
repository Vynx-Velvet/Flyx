'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import NavBar from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import '../api-docs.css';

const SubtitlesDocs = () => {
    const codeExample = `
// Example: Fetching subtitles for a movie
const tmdbId = '12345'; // The Movie Database ID
const subtitlesUrl = \`/api/subtitles?tmdbId=\${tmdbId}\`;

fetch(subtitlesUrl)
    .then(response => response.json())
    .then(data => {
        if (data.subtitles && data.subtitles.length > 0) {
            // Choose a subtitle file and use its URL
            const subtitleFileUrl = data.subtitles[0].url;
            console.log('Subtitle URL:', subtitleFileUrl);
        } else {
            console.log('No subtitles found.');
        }
    })
    .catch(error => console.error('Error fetching subtitles:', error));
    `;

    return (
        <>
            <NavBar />
            <div className="api-docs-page">
                <div className="api-docs-container">
                    <header className="api-docs-hero">
                        <h1 className="hero-title">Subtitles API</h1>
                        <p className="hero-subtitle">Find and fetch subtitles for a vast library of movies and TV shows.</p>
                    </header>

                    <main>
                        <section className="docs-section">
                            <h2>Overview</h2>
                            <p>The Subtitles API provides a simple way to search for subtitle files using The Movie Database (TMDB) ID. It sources subtitles from various providers and returns a list of available files in different languages.</p>
                        </section>

                        <section className="docs-section">
                            <h2>Endpoint</h2>
                            <div className="endpoint-card">
                                <span className="method">GET</span>
                                <span className="path">/api/subtitles</span>
                            </div>
                        </section>

                        <section className="docs-section">
                            <h2>Query Parameters</h2>
                            <div className="params-table">
                                <div className="table-header">
                                    <div>Parameter</div>
                                    <div>Type</div>
                                    <div>Description</div>
                                </div>
                                <div className="table-row">
                                    <div><code>tmdbId</code></div>
                                    <div>String</div>
                                    <div>The Movie Database ID of the movie or TV show.</div>
                                </div>
                            </div>
                        </section>

                        <section className="docs-section">
                            <h2>Usage Example</h2>
                            <SyntaxHighlighter language="javascript" style={atomDark} showLineNumbers>
                                {codeExample}
                            </SyntaxHighlighter>
                        </section>

                        <section className="docs-section">
                            <h2>Responses</h2>
                            <ul>
                                <li><strong>200 OK:</strong> Returns a JSON object with a <code>subtitles</code> array. Each object in the array contains the language and URL of a subtitle file.</li>
                                <li><strong>400 Bad Request:</strong> The <code>tmdbId</code> parameter is missing or invalid.</li>
                                <li><strong>404 Not Found:</strong> No subtitles were found for the given TMDB ID.</li>
                            </ul>
                        </section>
                    </main>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default SubtitlesDocs;