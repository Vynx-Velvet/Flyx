# Ad Script Analysis and Documentation

## Overview

The `vidsrccc.html` file contains a heavily obfuscated advertising script that loads various ad formats including pop-ups, interstitials, banners, and video sliders. The script is designed to serve ads while avoiding detection by ad blockers.

The `embedmin.js` file handles video playback functionality for vidsrc.cc, including bot detection mechanisms and stream URL retrieval.

## Key Components

### 1. Ad Library (Adcash/Adexchange)
The main script is part of the Adcash/Adexchange advertising network. It uses webpack to modularize its components and employs heavy obfuscation to prevent analysis and blocking by ad blockers.

### 2. Configuration Data
The script contains two main configuration objects:
- `window['x4G9Tq2Kw6R7v1Dy3P0B5N8Lc9M2zF']` - Contains ad server domains and paths for different ad formats
- `window['ZpQw9XkLmN8c3vR3']` - Base64 encoded configuration data

### 3. Ad Formats
The script supports multiple ad formats:
- **Pop-under/Pop-up** (`suv5`): Opens ads in a new window behind the current one
- **In-page Push** (`ippg`): Inserts ads directly into the webpage content
- **Auto Tag** (`atag`): Automatically selects and displays the best ad format
- **Interstitial** (`intrn`): Full-page ads that appear between content transitions
- **Video Slider** (`vid`): Video ads that slide in from the side of the screen

### 4. Tracking Mechanisms
The script includes comprehensive tracking capabilities:
- User engagement monitoring
- Client hint collection for better targeting
- Impression tracking
- Click tracking
- Session tracking

### 5. Sandbox Detection
The script includes mechanisms to detect if it's running in a sandboxed environment (like an iframe with restricted permissions) and can show warnings to the webmaster.

## Technical Implementation

### Obfuscation Techniques
The script uses several obfuscation techniques:
1. **Variable Name Obfuscation**: Using meaningless variable names like `e`, `t`, `i`, `r`, `n`
2. **String Encoding**: Base64 encoding of configuration data
3. **Webpack Bundling**: Packaging all code into a single bundle
4. **Control Flow Obfuscation**: Complex nested functions and indirect calls
5. **Dead Code**: Including unused code to confuse analysis

### Event Handling
The script sets up extensive event listeners to track user behavior:
- Mouse movements
- Clicks (both capture and bubble phases)
- Scroll events
- Touch events

### Client Hint Collection
The script collects browser information for better ad targeting:
- User agent data
- Device information
- Browser capabilities
- Network information

## Functionality Breakdown

### Ad Loading Process
1. **Initialization**: Sets up event listeners and collects client hints
2. **Configuration Loading**: Loads ad server domains and paths
3. **Domain Prefetching**: Prefetches domains for performance
4. **Ad Request**: Makes requests to ad servers based on zone IDs
5. **Ad Display**: Shows ads in various formats based on configuration
6. **Tracking**: Tracks impressions, clicks, and user engagement

### Security and Anti-Blocking Measures
1. **Obfuscation**: Makes it difficult to understand and block the script
2. **Dynamic Script Loading**: Loads components on-demand from different domains
3. **Sandbox Detection**: Detects restrictive environments
4. **Fallback Mechanisms**: Switches to alternative domains if primary ones are blocked

## Bot Detection Mechanisms

The scripts include several bot detection mechanisms to prevent automated scraping:

### 1. Self-Defending Function Pattern
The scripts use a self-defending function pattern that makes it difficult to tamper with the code.

### 2. Anti-Debugging Code
Anti-debugging code detects if the script is being debugged in a browser console and can prevent execution.

### 3. Console Protection
Console protection mechanisms prevent developers from using console-based debugging techniques.

### 4. WebAssembly Encryption
The scripts use WebAssembly encryption for sensitive operations like generating encrypted movie IDs.

### 5. RC4 Decryption for M3U8 Data
Stream data is encrypted using RC4 algorithm and requires proper decryption to access.

## Stream URL Retrieval

The `embedmin.js` script handles video playback and stream URL retrieval with the following process:

### 1. Generate Encrypted Movie ID
- Uses AES-CBC encryption with the user ID as a key
- Creates a verification token (vrf) for API requests

### 2. Fetch Server List
- Makes a request to `https://vidsrc.cc/api/{movieId}/servers` with parameters:
  - `id`: Movie ID
  - `type`: Media type (movie or tv)
  - `v`: Base64 encoded title
  - `vrf`: Encrypted movie ID
  - `imdbId`: IMDb ID
  - `season` and `episode`: For TV shows

### 3. Get Source Data
- Makes a request to `https://vidsrc.cc/api/source/{serverHash}` to get the actual stream URL

### 4. Decrypt M3U8 Data
- Uses RC4 decryption with key "DFKykVC3c1" to decrypt M3U8 playlist data

### 5. Play Video
- Uses JW Player with a custom HLS loader that decrypts M3U8 data on-the-fly

## Simplified Stream URL Retrieval

The deobfuscated version (`embedmin-deobfuscated.js`) includes a simplified function for retrieving stream URLs:

```javascript
/**
 * Function to easily fetch stream M3U8 URLs
 * 
 * Usage:
 * getStreamUrl(movieId, userId, imdbId, type, season, episode)
 *   .then(url => console.log("Stream URL:", url))
 *   .catch(error => console.error("Error:", error));
 * 
 * @param {string} movieId - The movie ID
 * @param {string} userId - The user ID
 * @param {string} imdbId - The IMDb ID
 * @param {string} type - The media type (movie or tv)
 * @param {number} season - The season number (for TV shows)
 * @param {number} episode - The episode number (for TV shows)
 * @returns {Promise<string>} - Promise that resolves with the stream URL
 */
async function getStreamUrl(movieId, userId, imdbId, type, season, episode) {
  // Implementation details...
}
```

This function handles all the necessary steps to retrieve a stream URL:
1. Generates the encrypted movie ID
2. Fetches server information
3. Gets the source data
4. Returns the stream URL

## Deobfuscated Implementation

The deobfuscated versions provide the same functionality with clear, readable code:
1. `vidsrccc-deobfuscated.html` - Deobfuscated ad script
2. `embedmin-deobfuscated.js` - Deobfuscated video playback script

Both files:
- Use clear variable and function names
- Include comprehensive comments explaining the code
- Remove webpack bundling for better readability
- Preserve all core functionality
- Include documentation of bot detection mechanisms
- Provide simplified methods for stream URL retrieval

## Conclusion

The original scripts are sophisticated implementations that use multiple techniques to serve ads and stream video content while avoiding detection. The obfuscation makes it difficult to analyze and block, but the underlying functionality is standard for modern advertising and video streaming networks.

The deobfuscated versions provide the same functionality with clear, readable code that can be easily understood and modified as needed. They also document the bot detection mechanisms and provide simplified methods for retrieving stream URLs.