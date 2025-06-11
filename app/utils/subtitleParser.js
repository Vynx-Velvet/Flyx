/**
 * Comprehensive SRT Subtitle Parser
 * Converts SRT subtitles to WebVTT format for HTML5 video players
 */

// SRT time format: HH:MM:SS,mmm --> HH:MM:SS,mmm
// WebVTT time format: HH:MM:SS.mmm --> HH:MM:SS.mmm

/**
 * Parse SRT time string to WebVTT format
 * @param {string} srtTime - Time in SRT format (HH:MM:SS,mmm)
 * @returns {string} Time in WebVTT format (HH:MM:SS.mmm)
 */
function convertSrtTimeToVtt(srtTime) {
  if (!srtTime || typeof srtTime !== 'string') return '00:00:00.000';
  
  // Replace comma with dot for WebVTT format
  return srtTime.trim().replace(/,/g, '.');
}

/**
 * Parse a single SRT subtitle block
 * @param {string} block - Single SRT subtitle block
 * @returns {Object|null} Parsed subtitle object or null if invalid
 */
function parseSrtBlock(block) {
  if (!block || typeof block !== 'string') return null;
  
  const lines = block.trim().split('\n');
  if (lines.length < 3) return null;
  
  try {
    // Line 1: Subtitle number
    const number = parseInt(lines[0].trim());
    if (isNaN(number)) return null;
    
    // Line 2: Timecodes
    const timeLine = lines[1].trim();
    const timeMatch = timeLine.match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/);
    if (!timeMatch) return null;
    
    const startTime = convertSrtTimeToVtt(timeMatch[1]);
    const endTime = convertSrtTimeToVtt(timeMatch[2]);
    
    // Lines 3+: Subtitle text
    const text = lines.slice(2).join('\n').trim();
    if (!text) return null;
    
    return {
      number,
      startTime,
      endTime,
      text: cleanSubtitleText(text)
    };
  } catch (error) {
    console.warn('Failed to parse SRT block:', error, block);
    return null;
  }
}

/**
 * Clean and format subtitle text
 * @param {string} text - Raw subtitle text
 * @returns {string} Cleaned subtitle text
 */
function cleanSubtitleText(text) {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Clean up common SRT formatting
    .replace(/<i>/g, '<i>')
    .replace(/<\/i>/g, '</i>')
    .replace(/<b>/g, '<b>')
    .replace(/<\/b>/g, '</b>')
    .replace(/<u>/g, '<u>')
    .replace(/<\/u>/g, '</u>')
    // Remove font tags but keep content
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    // Handle line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

/**
 * Convert SRT content to WebVTT format
 * @param {string} srtContent - Raw SRT file content
 * @returns {string} WebVTT formatted content
 */
export function convertSrtToVtt(srtContent) {
  if (!srtContent || typeof srtContent !== 'string') {
    console.warn('Invalid SRT content provided');
    return 'WEBVTT\n\n';
  }
  
  try {
    // Split into blocks (separated by double newlines)
    const blocks = srtContent
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .split(/\n\s*\n/)
      .filter(block => block.trim());
    
    if (blocks.length === 0) {
      console.warn('No subtitle blocks found in SRT content');
      return 'WEBVTT\n\n';
    }
    
    // Parse each block
    const subtitles = blocks
      .map(parseSrtBlock)
      .filter(sub => sub !== null)
      .sort((a, b) => a.number - b.number); // Ensure proper ordering
    
    if (subtitles.length === 0) {
      console.warn('No valid subtitles parsed from SRT content');
      return 'WEBVTT\n\n';
    }
    
    // Build WebVTT content
    let vttContent = 'WEBVTT\n\n';
    
    subtitles.forEach((subtitle, index) => {
      // Add cue with optional identifier
      vttContent += `${index + 1}\n`;
      vttContent += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
      vttContent += `${subtitle.text}\n\n`;
    });
    
  
    return vttContent;
    
  } catch (error) {
    console.error('Failed to convert SRT to WebVTT:', error);
    return 'WEBVTT\n\n';
  }
}

/**
 * Validate SRT file content
 * @param {string} content - SRT file content
 * @returns {Object} Validation result with details
 */
export function validateSrtContent(content) {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Content is empty or not a string',
      subtitleCount: 0
    };
  }
  
  try {
    const blocks = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/\n\s*\n/)
      .filter(block => block.trim());
    
    if (blocks.length === 0) {
      return {
        isValid: false,
        error: 'No subtitle blocks found',
        subtitleCount: 0
      };
    }
    
    const validSubtitles = blocks
      .map(parseSrtBlock)
      .filter(sub => sub !== null);
    
    const validPercentage = (validSubtitles.length / blocks.length) * 100;
    
    if (validSubtitles.length === 0) {
      return {
        isValid: false,
        error: 'No valid subtitle blocks found',
        subtitleCount: 0,
        totalBlocks: blocks.length
      };
    }
    
    // Consider valid if at least 80% of blocks are parseable
    const isValid = validPercentage >= 80;
    
    return {
      isValid,
      error: isValid ? null : `Only ${validPercentage.toFixed(1)}% of blocks are valid`,
      subtitleCount: validSubtitles.length,
      totalBlocks: blocks.length,
      validPercentage,
      firstSubtitle: validSubtitles[0],
      lastSubtitle: validSubtitles[validSubtitles.length - 1]
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
      subtitleCount: 0
    };
  }
}

/**
 * Fetch and parse subtitle file from URL
 * @param {string} url - Subtitle file URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed subtitle data
 */
export async function fetchAndParseSubtitle(url, options = {}) {
  const {
    timeout = 10000,
    format = 'auto', // 'auto', 'srt', 'vtt'
    validateContent = true
  } = options;
  
  try {
    console.log('Fetching subtitle from URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
        const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'text/vtt, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=3600', // Cache for 1 hour
        'User-Agent': 'Flyx v2.0' // Required by OpenSubtitles
      }
    });
    
    clearTimeout(timeoutId);
    
    console.log('Subtitle fetch response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if the URL indicates a gzipped file
    const isGzipped = url.includes('.gz') || response.headers.get('content-encoding')?.includes('gzip');
    
    let content;
    if (isGzipped) {
      try {
        // Method 1: Try browser's built-in DecompressionStream (modern browsers)
        if (typeof DecompressionStream !== 'undefined') {
          const arrayBuffer = await response.arrayBuffer();
          const decompressedStream = new DecompressionStream('gzip');
          const readable = new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(arrayBuffer));
              controller.close();
            }
          });
          
          const decompressed = readable.pipeThrough(decompressedStream);
          const decompressedResponse = new Response(decompressed);
          content = await decompressedResponse.text();
        } 
        // Method 2: Try pako library if available
        else if (typeof window !== 'undefined' && window.pako) {
          const arrayBuffer = await response.arrayBuffer();
          const compressed = new Uint8Array(arrayBuffer);
          const decompressed = window.pako.inflate(compressed, { to: 'string' });
          content = decompressed;
        }
        // Method 3: Try to load pako dynamically at runtime
        else if (typeof window !== 'undefined') {
          try {
            // First try to load pako script dynamically
            await new Promise((resolve, reject) => {
              if (window.pako) {
                resolve(window.pako);
                return;
              }
              
              const script = document.createElement('script');
              script.src = 'https://cdn.jsdelivr.net/npm/pako@2/dist/pako.min.js';
              script.onload = () => resolve(window.pako);
              script.onerror = reject;
              document.head.appendChild(script);
            });
            
            const arrayBuffer = await response.arrayBuffer();
            const compressed = new Uint8Array(arrayBuffer);
            const decompressed = window.pako.inflate(compressed, { to: 'string' });
            content = decompressed;
          } catch (pakoError) {
            throw new Error('Could not load decompression library');
          }
        } else {
          throw new Error('No decompression method available in this environment');
        }
      } catch (decompressionError) {
        // Fallback: try as raw text (maybe it's not actually compressed)
        content = await response.text();
      }
    } else {
      content = await response.text();
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('Empty subtitle file');
    }
    
    // Detect format if auto
    let detectedFormat = format;
    if (format === 'auto') {
      if (content.trim().startsWith('WEBVTT')) {
        detectedFormat = 'vtt';
      } else if (url.toLowerCase().includes('.vtt') || content.includes('WEBVTT')) {
        detectedFormat = 'vtt';
      } else {
        detectedFormat = 'srt'; // Default assumption
      }
    }
    
    let processedContent = content;
    let validation = { isValid: true };
    
    // Process based on format
    if (detectedFormat === 'srt') {
      if (validateContent) {
        validation = validateSrtContent(content);
        if (!validation.isValid) {
          console.warn('SRT validation failed:', validation.error);
        }
      }
      processedContent = convertSrtToVtt(content);
    } else if (detectedFormat === 'vtt') {
      // VTT files can be used directly
      processedContent = content;
    }
    
    const result = {
      success: true,
      content: processedContent,
      originalContent: content,
      format: detectedFormat,
      validation,
      url,
      size: content.length,
      processedSize: processedContent.length
    };
    

    
    return result;
    
  } catch (error) {
    console.error('Failed to fetch and parse subtitle:', error);
    
    return {
      success: false,
      error: error.message,
      url,
      format: null,
      content: null,
      validation: { isValid: false, error: error.message }
    };
  }
}

/**
 * Create a blob URL for subtitle content
 * @param {string} content - WebVTT content
 * @returns {string} Blob URL
 */
export function createSubtitleBlobUrl(content) {
  try {
    if (!content || typeof content !== 'string') {
      return null;
    }
    
    const blob = new Blob([content], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to create subtitle blob URL:', error);
    return null;
  }
}

/**
 * Cleanup blob URL to prevent memory leaks
 * @param {string} blobUrl - Blob URL to cleanup
 */
export function cleanupSubtitleBlobUrl(blobUrl) {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.warn('Failed to cleanup blob URL:', error);
    }
  }
}

/**
 * Parse subtitle timing to seconds
 * @param {string} timeString - Time string (HH:MM:SS.mmm or HH:MM:SS,mmm)
 * @returns {number} Time in seconds
 */
export function parseSubtitleTime(timeString) {
  if (!timeString) return 0;
  
  try {
    const normalizedTime = timeString.replace(',', '.');
    const parts = normalizedTime.split(':');
    
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const secondsParts = parts[2].split('.');
    const seconds = parseInt(secondsParts[0]) || 0;
    const milliseconds = parseInt((secondsParts[1] || '0').padEnd(3, '0')) || 0;
    
    return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
  } catch (error) {
    console.warn('Failed to parse subtitle time:', timeString, error);
    return 0;
  }
}

/**
 * Format seconds to subtitle time string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (HH:MM:SS.mmm)
 */
export function formatSubtitleTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00:00.000';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
} 