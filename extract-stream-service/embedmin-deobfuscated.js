/**
 * Deobfuscated version of embedmin.js
 * 
 * This script handles video playback functionality for vidsrc.cc
 * It includes bot detection mechanisms and stream URL retrieval
 */

/**
 * Bot Detection Mechanisms:
 * 
 * 1. Self-defending function pattern (obfuscation technique)
 * 2. Anti-debugging code that detects if the code is being debugged
 * 3. Console protection to prevent console-based debugging
 * 4. WebAssembly encryption for movie ID generation
 * 5. RC4 decryption for M3U8 data
 */

/**
 * Stream URL Retrieval Process:
 * 
 * 1. Generate encrypted movie ID using AES-CBC encryption with user ID as key
 * 2. Fetch server list from https://vidsrc.cc/api/{movieId}/servers
 * 3. Get source data from https://vidsrc.cc/api/source/{serverHash}
 * 4. Decrypt M3U8 data using RC4 algorithm
 * 5. Play video using JW Player with custom HLS loader
 */

// Document ready handler
$(document).ready(function() {
  // Global variables
  var encryptedMovieId = null;
  var movieIdentifier = null;
  var player = null;
  var isSourceSwitching = false;
  
  /**
   * Decrypts M3U8 data using RC4 algorithm
   * @param {string} data - The encrypted data
   * @param {string} key - The decryption key
   * @returns {string} - Decrypted data
   */
  function decryptM3U8(data, key) {
    // If data already contains M3U8 header, return as-is
    if (data.includes("#EXTM3U")) {
      return data;
    }
    
    // Decode base64 data
    const decodedData = atob(data);
    
    // RC4 decryption
    const s = [];
    let i, j, k, temp;
    let decrypted = '';
    
    // Initialize S array
    for (i = 0; i < 256; i++) {
      s[i] = i;
    }
    
    // Key scheduling algorithm
    j = 0;
    for (i = 0; i < 256; i++) {
      j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
      temp = s[i];
      s[i] = s[j];
      s[j] = temp;
    }
    
    // Pseudo-random generation algorithm
    i = 0;
    j = 0;
    for (k = 0; k < decodedData.length; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      temp = s[i];
      s[i] = s[j];
      s[j] = temp;
      decrypted += String.fromCharCode(decodedData.charCodeAt(k) ^ s[(s[i] + s[j]) % 256]);
    }
    
    return decrypted;
  }
  
  /**
   * Generate encrypted movie ID using AES-CBC encryption
   * @returns {Promise} - Promise that resolves when encryption is complete
   */
  async function generateEncryptedMovieId() {
    // If already generated, return
    if (encryptedMovieId) {
      return Promise.resolve();
    }
    
    try {
      // Encrypt movie ID with user ID as key
      const cryptoOps = ["encrypt"];
      
      async function encryptAES(data, key) {
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(data);
        const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(key));
        
        const algorithm = {
          name: "AES-CBC"
        };
        
        const cryptoKey = await crypto.subtle.importKey("raw", keyHash, algorithm, false, cryptoOps);
        const iv = new Uint8Array(16);
        
        const encryptParams = {
          name: "AES-CBC",
          iv: iv
        };
        
        const encrypted = await crypto.subtle.encrypt(encryptParams, cryptoKey, dataBytes);
        
        // Base64 encode the result
        function base64Encode(data) {
          const binary = btoa(data);
          return binary.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        
        return base64Encode(String.fromCharCode(...new Uint8Array(encrypted)));
      }
      
      // Generate encrypted movie ID
      encryptedMovieId = await encryptAES(movieId, userId);
    } catch (error) {
      console.error("Encryption failed:", error);
    }
  }
  
  /**
   * Fetch data from API
   * @param {string} url - The API URL
   * @returns {Promise} - Promise that resolves with API response
   */
  async function fetchFromAPI(url) {
    const config = {
      maxRedirects: 0x0
    };
    
    try {
      // Use axios to fetch data
      return (await axios.get(url, config)).data;
    } catch (error) {
      // Handle errors
      if (error.response) {
        return {
          'stack': error.stack,
          'message': "first " + error.response.status + " " + JSON.stringify(error.response.data)
        };
      } else if (error.request) {
        return {
          stack: error.stack,
          message: "second " + (error.responseText || error.message)
        };
      }
      
      return {
        stack: error.stack,
        message: "final " + error.message
      };
    }
  }
  
  /**
   * Get parameter from URL
   * @param {string} name - The parameter name
   * @returns {string|null} - The parameter value or null
   */
  function getUrlParameter(name) {
    try {
      const url = window.location.href;
      name = name.replace(/[\\[\]]/g, "\\$&");
      const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
      const results = regex.exec(url);
      
      if (!results) {
        return null;
      }
      
      if (!results[2]) {
        return '';
      }
      
      return decodeURIComponent(results[2].replace(/\+/g, " "));
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Custom HLS loader that decrypts M3U8 data
   */
  class CustomHlsLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
      super(config || {});
      const originalLoad = this.load.bind(this);
      
      this.load = function(context, config, callbacks) {
        // If this is an M3U8 file, decrypt the data
        if (/\.m3u8$/.test(context.url.split('?')[0])) {
          const originalOnSuccess = callbacks.onSuccess;
          
          callbacks.onSuccess = function(response, stats, context, networkDetails) {
            // Decrypt the M3U8 data
            response.data = decryptM3U8(response.data, "DFKykVC3c1");
            originalOnSuccess(response, stats, context, networkDetails);
          };
        }
        
        // Call original load function
        originalLoad(context, config, callbacks);
      };
    }
  }
  
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
    try {
      // Generate encrypted movie ID
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(movieId);
      const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(userId));
      
      const algorithm = {
        name: "AES-CBC"
      };
      
      const cryptoKey = await crypto.subtle.importKey("raw", keyHash, algorithm, false, ["encrypt"]);
      const iv = new Uint8Array(16);
      
      const encryptParams = {
        name: "AES-CBC",
        iv: iv
      };
      
      const encrypted = await crypto.subtle.encrypt(encryptParams, cryptoKey, dataBytes);
      
      function base64Encode(data) {
        const binary = btoa(data);
        return binary.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      
      const encryptedMovieId = base64Encode(String.fromCharCode(...new Uint8Array(encrypted)));
      
      // Build API URL
      let apiUrl = "?id=" + movieId + "&type=" + type + "&v=" + encodeURIComponent(v) + "&vrf=" + encryptedMovieId + "&imdbId=" + imdbId;
      if (season && episode && type !== "movie") {
        apiUrl += "&season=" + season + "&episode=" + episode;
      }
      
      // Fetch server data
      const serverData = await fetchFromAPI("https://vidsrc.cc/api/" + movieId + "/servers" + apiUrl);
      
      if (!serverData || !serverData.data || serverData.data.length === 0) {
        throw new Error("No servers available");
      }
      
      // Use the first server
      const serverHash = serverData.data[0].hash;
      
      // Fetch source data
      const sourceData = await fetchFromAPI("https://vidsrc.cc/api/source/" + serverHash);
      
      if (!sourceData || !sourceData.data) {
        throw new Error("No source data available");
      }
      
      // Return the source URL
      if (sourceData.data.source) {
        return sourceData.data.source;
      } else if (sourceData.data.sources && sourceData.data.sources.length > 0) {
        return sourceData.data.sources[0].file;
      }
      
      throw new Error("No stream URL found");
    } catch (error) {
      throw new Error("Failed to get stream URL: " + error.message);
    }
  }
  
  // Export the function for external use
  window.getStreamUrl = getStreamUrl;
  
  console.log("Deobfuscated embedmin.js loaded");
  console.log("Use getStreamUrl(movieId, userId, imdbId, type, season, episode) to fetch stream URLs");
});