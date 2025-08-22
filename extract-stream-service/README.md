# VidSrc.cc M3U8 Extraction Service

This service extracts M3U8 URLs from vidsrc.cc by scraping the website and reverse-engineering the stream URLs.

## Features

- Extracts M3U8 URLs from vidsrc.cc for both movies and TV shows
- Uses Puppeteer for web scraping
- Handles encryption and decryption of stream URLs
- Provides a simple REST API for integration

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install the browser for Puppeteer:
   ```bash
   npx puppeteer browsers install chrome
   ```

## Usage

### Starting the Service

You can start the service in multiple ways:

1. Using npm:
   ```bash
   npm start
   ```

2. Using the provided start scripts:
   - On Windows: Run `start-service.bat`
   - On macOS/Linux: Run `start-service.sh`

The service will start on port 3002 by default.

### API Endpoints

#### Extract M3U8 URL

```
GET /extract-m3u8
```

Parameters:
- `mediaId` (required): The TMDB ID of the movie or TV show
- `mediaType` (required): Either "movie" or "tv"
- `season` (required for TV shows): The season number
- `episode` (required for TV shows): The episode number

Example for a movie:
```
http://localhost:3002/extract-m3u8?mediaId=278&mediaType=movie
```

Example for a TV show:
```
http://localhost:3002/extract-m3u8?mediaId=1399&mediaType=tv&season=1&episode=1
```

Response:
```json
{
  "success": true,
  "m3u8Url": "https://example.com/stream.m3u8"
}
```

#### Health Check

```
GET /health
```

Returns the health status of the service.

### Testing

To test the service with a sample movie:

```bash
npm test
```

## How It Works

1. The service receives a request with media information (ID, type, etc.)
2. It uses Puppeteer to navigate to the appropriate vidsrc.cc page
3. It extracts necessary variables (movieId, userId, etc.) from the page
4. It generates an encrypted movie ID using AES-CBC encryption
5. It fetches server information from the vidsrc.cc API
6. It retrieves the stream source from the API
7. It returns the M3U8 URL

## Dependencies

- express: Web framework
- cors: Cross-origin resource sharing
- puppeteer: Headless Chrome for web scraping
- node-fetch: HTTP client for API requests

## Troubleshooting

If you encounter an error about Chrome not being found, make sure to install the browser:

```bash
npx puppeteer browsers install chrome
```

## License

MIT