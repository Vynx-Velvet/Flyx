import puppeteer from 'puppeteer';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Generate encrypted movie ID using AES-CBC encryption
 * @param {string} movieId - The movie ID
 * @param {string} userId - The user ID
 * @returns {string} - Encrypted movie ID
 */
function generateEncryptedMovieId(movieId, userId) {
  try {
    // Create SHA-256 hash of userId
    const keyHash = crypto.createHash('sha256').update(userId).digest();
    
    // Create AES-CBC cipher
    const iv = Buffer.alloc(16); // Zero-filled IV
    const cipher = crypto.createCipheriv('aes-256-cbc', keyHash, iv);
    
    // Encrypt movieId
    let encrypted = cipher.update(movieId, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Base64 URL encode (replace + with -, / with _, remove =)
    return encrypted
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    throw new Error("Encryption failed: " + error.message);
  }
}

/**
 * Clean up M3U8 URL by extracting the real stream URL from tracking URLs
 * @param {string} url - The M3U8 URL that may contain tracking parameters
 * @returns {string} - Cleaned M3U8 URL
 */
function cleanM3U8Url(url) {
  try {
    // Check if this is a tracking URL with mu parameter
    if (url.includes('mu=')) {
      const urlObj = new URL(url);
      const muParam = urlObj.searchParams.get('mu');
      
      // If mu parameter exists and looks like a URL, use it as the real URL
      if (muParam && (muParam.startsWith('http://') || muParam.startsWith('https://'))) {
        console.log(`🧹 Cleaning URL - Extracting real stream URL from mu parameter: ${muParam.substring(0, 100)}...`);
        return decodeURIComponent(muParam);
      }
    }
    
    // Return original URL if no cleaning needed
    return url;
  } catch (error) {
    console.warn(`⚠️ Failed to clean URL, returning original: ${url.substring(0, 100)}...`, error.message);
    return url;
  }
}

/**
 * Extract M3U8 URL from vidsrc.cc by watching network requests
 * @param {string} mediaId - The movie/TV show ID
 * @param {string} mediaType - "movie" or "tv"
 * @param {number} season - Season number (for TV shows)
 * @param {number} episode - Episode number (for TV shows)
 * @returns {Promise<string>} - M3U8 URL
 */
async function extractM3U8Url(mediaId, mediaType, season, episode) {
  console.log(`🎬 Starting extraction for ${mediaType} ${mediaId} ${season ? `S${season}E${episode}` : ''}`);
  
  // Launch browser
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to false for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-blink-features=AutomationControlled',
    ]
  });
  
  const page = await browser.newPage();
  console.log('📄 Created new page');
  
  try {
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    console.log('👤 Set user agent');
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    console.log('📐 Set viewport');
    
    // Promise to resolve when we find an M3U8 URL
    const m3u8Promise = new Promise((resolve, reject) => {
      // Set a timeout to reject if no M3U8 is found
      const timeout = setTimeout(() => {
        reject(new Error("Timeout: No M3U8 URL found"));
      }, 30000); // 30 second timeout
      
      // Listen for network responses
      page.on('response', (response) => {
        const url = response.url();
        console.log(`📥 Response: ${response.status()} ${url}`);
        
        // Check if this is an M3U8 URL
        if (url.includes('.m3u8')) {
          console.log(`🎯 Found M3U8 URL: ${url}`);
          clearTimeout(timeout);
          
          // Clean the URL before returning
          const cleanUrl = cleanM3U8Url(url);
          console.log(`✨ Cleaned M3U8 URL: ${cleanUrl}`);
          resolve(cleanUrl);
        }
      });
    });
    
    // Enable request interception for debugging
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      console.log(`📡 Request: ${request.method()} ${request.url()}`);
      request.continue();
    });
    
    // Navigate to vidsrc.cc
    const url = mediaType === 'movie' 
      ? `https://vidsrc.cc/v2/embed/movie/${mediaId}` 
      : `https://vidsrc.cc/v2/embed/tv/${mediaId}/${season}/${episode}`;
      
    console.log(`🌐 Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Page loaded');
    
    // Wait for the page to load
    try {
      await page.waitForSelector('#player', { timeout: 10000 });
      console.log('🎯 Player element found');
    } catch (error) {
      console.log('⚠️ Player element not found, continuing anyway');
    }
    
    // Wait for an M3U8 URL to be found or timeout
    try {
      const m3u8Url = await m3u8Promise;
      console.log('🧹 Closing browser early');
      await browser.close();
      return m3u8Url;
    } catch (error) {
      console.log(`⏳ ${error.message}, continuing with content extraction...`);
    }
    
    // If we didn't find M3U8 URLs through network monitoring, 
    // try to extract from page content
    console.log('🔍 Trying to extract M3U8 URL from page content...');
    
    // Extract the HTML content
    const htmlContent = await page.content();
    console.log('📄 Extracted HTML content');
    
    // Look for the script tag with the necessary variables
    const scriptContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        if (script.textContent && 
            (script.textContent.includes('movieId') || 
             script.textContent.includes('imdbId') || 
             script.textContent.includes('userId'))) {
          return script.textContent;
        }
      }
      return null;
    });
    
    // Try to extract M3U8 URLs from the page
    const m3u8Matches = htmlContent.match(/https?:\/\/[^\s"]+\.m3u8[^\s"]*/gi);
    if (m3u8Matches && m3u8Matches.length > 0) {
      console.log(`✅ Found M3U8 URLs in page content:`, m3u8Matches);
      const cleanUrl = cleanM3U8Url(m3u8Matches[0]);
      await browser.close();
      return cleanUrl;
    }
    
    // Try to get M3U8 URLs from JavaScript variables
    const jsM3u8Matches = htmlContent.match(/['"](?:https?:)?\/\/[^\s"']+\.m3u8[^\s"']*['"]/gi);
    if (jsM3u8Matches && jsM3u8Matches.length > 0) {
      console.log(`✅ Found M3U8 URLs in JavaScript:`, jsM3u8Matches);
      // Clean up the URLs (remove quotes)
      const rawUrl = jsM3u8Matches[0].replace(/['"]/g, '');
      const cleanUrl = cleanM3U8Url(rawUrl);
      await browser.close();
      return cleanUrl;
    }
    
    console.log('❌ No M3U8 URLs found');
    throw new Error("No M3U8 URLs found");
  } finally {
    console.log('🧹 Closing browser');
    await browser.close();
  }
}

// API endpoint for extracting M3U8 URL
app.get('/extract-m3u8', async (req, res) => {
  console.log('📥 Received request:', req.query);
  try {
    const { mediaId, mediaType, season, episode } = req.query;
    
    // Validate parameters
    if (!mediaId || !mediaType) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: mediaId and mediaType'
      });
    }
    
    if (mediaType === 'tv' && (!season || !episode)) {
      console.log('❌ Missing season/episode parameters for TV show');
      return res.status(400).json({
        success: false,
        error: 'TV shows require season and episode parameters'
      });
    }
    
    // Extract M3U8 URL
    console.log(`🎬 Extracting M3U8 URL for ${mediaType} ${mediaId} ${season ? `S${season}E${episode}` : ''}`);
    const m3u8Url = await extractM3U8Url(mediaId, mediaType, parseInt(season), parseInt(episode));
    
    console.log(`✅ Successfully extracted M3U8 URL: ${m3u8Url}`);
    res.json({
      success: true,
      m3u8Url: m3u8Url
    });
  } catch (error) {
    console.error(`❌ Extraction failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('❤️ Health check');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VidSrc.cc M3U8 Extraction Service'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VidSrc.cc M3U8 Extraction Service running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🎬 Extract endpoint: http://0.0.0.0:${PORT}/extract-m3u8`);
});

export default app;