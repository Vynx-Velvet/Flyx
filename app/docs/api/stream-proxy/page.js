'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import NavBar from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import '../api-docs.css';

const StreamProxyDocs = () => {
    const codeExample = `
// Example: Fetching a video stream through the proxy
const videoUrl = 'https://example.com/stream.m3u8';
const proxyUrl = \`/api/stream-proxy?url=\${encodeURIComponent(videoUrl)}\`;

fetch(proxyUrl)
    .then(response => {
        if (response.ok) {
            // The response can be used directly in a video player
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.src = proxyUrl;
        } else {
            console.error('Proxy request failed');
        }
    })
    .catch(error => console.error('Error fetching through proxy:', error));
    `;

    return (
        <>
            <NavBar />
            <div className="api-docs-page">
                <div className="api-docs-container">
                    <header className="api-docs-hero">
                        <h1 className="hero-title">Stream Proxy API</h1>
                        <p className="hero-subtitle">Reliably fetch and stream video content from various sources without CORS issues.</p>
                    </header>

                    <main>
                        <section className="docs-section">
                            <h2>Overview</h2>
                            <p>The Stream Proxy API is a crucial component of Flyx, designed to solve one of the most common problems in web-based streaming: Cross-Origin Resource Sharing (CORS) errors. It acts as an intermediary, fetching video content on behalf of the client and forwarding it with the correct headers to ensure smooth playback.</p>
                        </section>

                        <section className="docs-section">
                            <h2>Endpoint</h2>
                            <div className="endpoint-card">
                                <span className="method">GET</span>
                                <span className="path">/api/stream-proxy</span>
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
                                    <div><code>url</code></div>
                                    <div>String</div>
                                    <div>The URL of the video stream to proxy. Must be URL-encoded.</div>
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
                                <li><strong>200 OK:</strong> The video stream is successfully fetched and is being returned. The response body will contain the video data, and the headers will be set for proper streaming.</li>
                                <li><strong>400 Bad Request:</strong> The <code>url</code> parameter is missing or invalid.</li>
                                <li><strong>500 Internal Server Error:</strong> An error occurred on the server while trying to fetch the stream.</li>
                            </ul>
                        </section>
                    </main>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default StreamProxyDocs;