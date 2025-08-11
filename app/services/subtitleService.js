// Frontend subtitle service based on cloudnestra's approach
// This moves subtitle fetching from vm-server to frontend for better performance
import { parseVTTEnhanced, parseTimeEnhanced } from '../utils/enhancedVttParser';

class SubtitleService {
  constructor() {
    // Language mapping from cloudnestra (complete language support)
    this.languages = [
      {"IdSubLanguage":"eng","ISO639":"en","LanguageName":"English","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"spa","ISO639":"es","LanguageName":"Spanish","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"fre","ISO639":"fr","LanguageName":"French","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"ger","ISO639":"de","LanguageName":"German","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"ita","ISO639":"it","LanguageName":"Italian","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"por","ISO639":"pt","LanguageName":"Portuguese","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"rus","ISO639":"ru","LanguageName":"Russian","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"ara","ISO639":"ar","LanguageName":"Arabic","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"pol","ISO639":"pl","LanguageName":"Polish","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"chi","ISO639":"zh","LanguageName":"Chinese (simplified)","UploadEnabled":"1","WebEnabled":"1"},
      {"IdSubLanguage":"jpn","ISO639":"ja","LanguageName":"Japanese","UploadEnabled":"1","WebEnabled":"1"}
    ];

    this.apiUrl = "https://rest.opensubtitles.org";
    this.userAgent = 'trailers.to-UA';
  }

  // Get language object by various identifiers
  getLanguageByCode(code) {
    return this.languages.find(lang => 
      lang.IdSubLanguage === code || 
      lang.ISO639 === code
    );
  }

  // Note: Direct API URL building moved to server-side proxy for CORS handling

  // Fetch subtitles via our server-side proxy (avoids 302 redirects and CORS issues)
  async fetchSubtitles(imdbId, languageId = 'eng', season = null, episode = null) {
    try {
      // Build URL for our server-side proxy
      const proxyUrl = new URL('/api/subtitles', window.location.origin);
      proxyUrl.searchParams.set('imdbId', imdbId);
      proxyUrl.searchParams.set('languageId', languageId);
      if (season) proxyUrl.searchParams.set('season', season);
      if (episode) proxyUrl.searchParams.set('episode', episode);
      
      console.log('🎬 Fetching subtitles via server proxy:', {
        imdbId,
        languageId,
        season,
        episode,
        proxyUrl: proxyUrl.toString()
      });

      const response = await fetch(proxyUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server proxy error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Server proxy returned unsuccessful response');
      }

      console.log(`✅ Found ${data.totalCount} subtitles via server proxy for ${data.language}`);

      return {
        success: true,
        subtitles: data.subtitles || [],
        totalCount: data.totalCount || 0,
        language: data.language,
        source: 'opensubtitles-proxy',
        debug: data.debug
      };

    } catch (error) {
      console.error('❌ Error fetching subtitles via proxy:', error);
      return {
        success: false,
        error: error.message,
        subtitles: [],
        totalCount: 0
      };
    }
  }

  // Note: Quality score calculation moved to server-side proxy

  // Download and process subtitle file via server proxy (cloudnestra approach)
  async downloadSubtitle(subtitle) {
    try {
      console.log('📥 Downloading subtitle via proxy:', subtitle.fileName);

      // Use our server-side download proxy
      const proxyUrl = new URL('/api/subtitles/download', window.location.origin);
      proxyUrl.searchParams.set('url', subtitle.downloadLink);

      const response = await fetch(proxyUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`Subtitle download failed: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log('📦 Downloaded subtitle file:', {
        size: arrayBuffer.byteLength,
        format: subtitle.format,
        encoding: subtitle.encoding || 'unknown'
      });
      
      let subtitleContent;
      
      // First, try to detect if the content is gzipped
      const uint8Array = new Uint8Array(arrayBuffer);
      const isGzipped = uint8Array.length >= 2 && uint8Array[0] === 0x1f && uint8Array[1] === 0x8b;
      
      console.log('🔍 File analysis:', {
        isGzipped,
        firstBytes: Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16)).join(' ')
      });

      // Handle gzipped content (most OpenSubtitles files are gzipped)
      if (isGzipped) {
        try {
          // Ensure pako is loaded
          if (typeof window !== 'undefined' && !window.pako) {
            console.log('📚 Loading pako library for decompression...');
            await this.loadPako();
          }

          if (window.pako) {
            subtitleContent = window.pako.inflate(arrayBuffer, { to: 'string' });
            console.log('✅ Successfully decompressed gzipped subtitle:', {
              originalSize: arrayBuffer.byteLength,
              decompressedSize: subtitleContent.length
            });
          } else {
            throw new Error('Pako library not available for decompression');
          }
        } catch (decompressError) {
          console.error('❌ Gzip decompression failed:', decompressError);
          throw new Error(`Failed to decompress gzipped subtitle: ${decompressError.message}`);
        }
      } else {
        // Handle uncompressed content
        console.log('📄 Processing uncompressed content');
        subtitleContent = new TextDecoder('utf-8').decode(arrayBuffer);
      }

      // Validate we have content
      if (!subtitleContent || subtitleContent.trim().length === 0) {
        throw new Error('Subtitle content is empty after processing');
      }

      console.log('📝 Subtitle content preview:', {
        length: subtitleContent.length,
        startsWithWebVTT: subtitleContent.startsWith('WEBVTT'),
        firstLine: subtitleContent.split('\n')[0],
        hasNumbers: /^\d+$/.test(subtitleContent.split('\n')[0]) // SRT format check
      });

      // Convert SRT to VTT if needed (improved conversion)
      let vttContent;
      if (subtitleContent.startsWith('WEBVTT')) {
        console.log('✅ Content is already in VTT format');
        vttContent = subtitleContent;
      } else if (this.isSrtFormat(subtitleContent)) {
        console.log('🔄 Converting SRT to VTT format');
        vttContent = this.convertSrtToVtt(subtitleContent);
      } else {
        console.log('🔄 Assuming SRT format and converting to VTT');
        vttContent = this.convertSrtToVtt(subtitleContent);
      }

      // Final validation
      if (!vttContent.startsWith('WEBVTT')) {
        console.warn('⚠️ Final content does not start with WEBVTT header');
        // Force add WEBVTT header if missing
        vttContent = 'WEBVTT\n\n' + vttContent;
      }

      // Use enhanced VTT parser for validation and improved parsing
      console.log('🔍 Using enhanced VTT parser for validation...');
      const enhancedParseResult = parseVTTEnhanced(vttContent, {
        strictMode: false,
        enableErrorRecovery: true,
        sanitizeHtml: true,
        validateTiming: true
      });

      if (enhancedParseResult.metadata.errors.length > 0) {
        console.warn('⚠️ Enhanced VTT parsing found errors:', enhancedParseResult.metadata.errors);
      }
      
      if (enhancedParseResult.metadata.warnings.length > 0) {
        console.warn('⚠️ Enhanced VTT parsing warnings:', enhancedParseResult.metadata.warnings);
      }

      console.log('✅ Enhanced VTT validation completed:', {
        cues: enhancedParseResult.cues.length,
        errors: enhancedParseResult.metadata.errors.length,
        warnings: enhancedParseResult.metadata.warnings.length,
        processingTime: `${enhancedParseResult.metadata.processingTime.toFixed(2)}ms`
      });

      // Show first 400 characters of VTT content for debugging
      console.log('📄 VTT Content (first 400 chars):\n' + vttContent.substring(0, 400) + '\n[...truncated...]');

      // DON'T create blob URL - use VTT content directly
      console.log('✅ Subtitle processed successfully (NO BLOB URL):', {
        format: subtitle.format,
        originalSize: arrayBuffer.byteLength,
        processedSize: vttContent.length,
        isGzipped,
        hasValidVTT: vttContent.startsWith('WEBVTT'),
        validationSummary: validation.summary,
        useDirectContent: true
      });

      return {
        ...subtitle,
        content: vttContent,
        // blobUrl: blobUrl,  // REMOVED - don't create blob URLs
        contentLength: vttContent.length,
        originalSize: arrayBuffer.byteLength,
        processed: true,
        processedAt: Date.now(),
        usedProxy: true,
        wasGzipped: isGzipped,
        useDirectContent: true  // Flag to indicate we should use content directly
      };

    } catch (error) {
      console.error('❌ Error downloading subtitle via proxy:', error);
      throw error;
    }
  }

  // Load pako compression library
  async loadPako() {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.pako) {
        resolve(window.pako);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
      script.async = true;
      
      script.onload = () => resolve(window.pako);
      script.onerror = () => reject(new Error('Failed to load pako'));
      
      document.head.appendChild(script);
    });
  }

  // Check if content is in SRT format
  isSrtFormat(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 3) return false;
    
    // SRT format typically starts with a number, then timestamp, then subtitle text
    const firstLine = lines[0].trim();
    const secondLine = lines[1] ? lines[1].trim() : '';
    
    // Check if first line is a number and second line contains timestamp
    const isNumberFirst = /^\d+$/.test(firstLine);
    const hasTimestamp = /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(secondLine);
    
    return isNumberFirst && hasTimestamp;
  }

  // Convert SRT to VTT format (improved)
  convertSrtToVtt(srtContent) {
    try {
      let vttContent = 'WEBVTT\n';
      vttContent += 'NOTE Generated by Flyx subtitle service\n\n';
      
      // Clean up the content first
      let cleanContent = srtContent
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\r/g, '\n')    // Handle old Mac line endings
        .trim();
      
      // Split into subtitle blocks - be more permissive with splitting
      const blocks = cleanContent.split(/\n\s*\n/);
      console.log(`🔍 Processing ${blocks.length} subtitle blocks`);
      
      const processedBlocks = [];
      let validBlockCount = 0;
      
      blocks.forEach((block, blockIndex) => {
        const lines = block.trim().split('\n');
        if (lines.length < 2) {
          console.log(`⚠️ Skipping block ${blockIndex}: too few lines (${lines.length})`);
          return; // Skip blocks with too few lines
        }
        
        // Find the timestamp line (might not always be the second line)
        let timestampLineIndex = -1;
        let timestampLine = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) {
            timestampLineIndex = i;
            timestampLine = line;
            break;
          }
        }
        
        if (timestampLineIndex === -1) {
          console.log(`⚠️ Skipping block ${blockIndex}: no valid timestamp found`);
          return;
        }
        
        // Convert SRT timestamp format to VTT format
        // SRT: 00:01:30,500 --> 00:01:33,400
        // VTT: 00:01:30.500 --> 00:01:33.400
        const vttTimestamp = timestampLine.replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4');
        
        // Validate VTT timestamp format
        if (!/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(vttTimestamp)) {
          console.warn(`⚠️ Invalid VTT timestamp format in block ${blockIndex}:`, vttTimestamp);
          return;
        }
        
        // Get subtitle text (everything after the timestamp line)
        const textLines = lines.slice(timestampLineIndex + 1);
        const subtitleText = textLines.join('\n').trim();
        
        if (!subtitleText) {
          console.log(`⚠️ Skipping block ${blockIndex}: empty subtitle text`);
          return;
        }
        
        // Clean up subtitle text (remove some common SRT formatting that doesn't work in VTT)
        let cleanedText = subtitleText
          .replace(/{[^}]*}/g, '')  // Remove SRT formatting tags like {y:i}
          .replace(/\\N/g, '\n')    // Replace \N with actual line breaks
          .replace(/<font[^>]*>/gi, '') // Remove font tags
          .replace(/<\/font>/gi, '') // Remove closing font tags
          .replace(/^\s*$\n/gm, '') // Remove empty lines
          .trim();
        
        // Add cue identifier for better tracking
        const cueId = `cue-${validBlockCount + 1}`;
        
        // Build VTT cue
        const vttCue = `${cueId}\n${vttTimestamp}\n${cleanedText}`;
        processedBlocks.push(vttCue);
        validBlockCount++;
        
        if (blockIndex < 3) { // Log first few for debugging
          console.log(`✅ Processed block ${blockIndex}:`, {
            cueId,
            timestamp: vttTimestamp,
            textLength: cleanedText.length,
            textPreview: cleanedText.substring(0, 50) + (cleanedText.length > 50 ? '...' : '')
          });
        }
      });
      
      if (processedBlocks.length === 0) {
        console.error('❌ No valid subtitle blocks found after processing');
        // Fallback to simple conversion
        return this.convertSrtToVttSimple(srtContent);
      }
      
      vttContent += processedBlocks.join('\n\n');
      
      // Ensure proper ending
      if (!vttContent.endsWith('\n')) {
        vttContent += '\n';
      }
      
      console.log('🔄 SRT to VTT conversion completed:', {
        originalBlocks: blocks.length,
        processedBlocks: processedBlocks.length,
        validBlocks: validBlockCount,
        finalLength: vttContent.length,
        startsWithWebVTT: vttContent.startsWith('WEBVTT'),
        hasNote: vttContent.includes('NOTE'),
        firstCuePreview: processedBlocks[0] ? processedBlocks[0].substring(0, 100) + '...' : 'none'
      });
      
      // Show first 400 characters of VTT content for debugging
      console.log('📄 VTT Content (first 400 chars):\n' + vttContent.substring(0, 400) + '\n[...truncated...]');
      
      return vttContent;
      
    } catch (error) {
      console.error('❌ Error converting SRT to VTT:', error);
      // Fallback to simple conversion
      return this.convertSrtToVttSimple(srtContent);
    }
  }

  // Simple fallback SRT to VTT conversion (improved)
  convertSrtToVttSimple(srtContent) {
    console.log('🔄 Using simple SRT to VTT conversion fallback');
    
    try {
      let vttContent = 'WEBVTT\n';
      vttContent += 'NOTE Simple conversion fallback\n\n';
      
      // Clean and normalize content
      let cleanContent = srtContent
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
      
      // Simple approach: fix timestamps and remove sequence numbers at start of lines
      cleanContent = cleanContent
        .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')  // Fix timestamps
        .replace(/^\d+\n/gm, '')  // Remove sequence numbers at start of lines
        .replace(/\n\n\n+/g, '\n\n')  // Clean up extra newlines
        .trim();
      
      vttContent += cleanContent;
      
      // Ensure proper ending
      if (!vttContent.endsWith('\n')) {
        vttContent += '\n';
      }
      
      console.log('✅ Simple conversion completed:', {
        finalLength: vttContent.length,
        startsWithWebVTT: vttContent.startsWith('WEBVTT')
      });
      
      return vttContent;
      
    } catch (error) {
      console.error('❌ Simple conversion also failed:', error);
      // Ultra-simple fallback
      return `WEBVTT\nNOTE Conversion failed\n\n00:00:01.000 --> 00:00:05.000\nSubtitle conversion error occurred\n`;
    }
  }

  // Clean up blob URLs
  cleanupBlobUrl(blobUrl) {
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('❌ Failed to cleanup blob URL:', error);
      }
    }
  }

  // Validate VTT content format
  validateVttContent(vttContent) {
    const issues = [];
    const info = {
      hasWebVTTHeader: false,
      hasNote: false,
      cueCount: 0,
      validCues: 0,
      invalidCues: 0,
      hasTimestamps: false,
      totalLength: vttContent.length,
      lineCount: vttContent.split('\n').length
    };

    try {
      // Check WEBVTT header
      if (!vttContent.startsWith('WEBVTT')) {
        issues.push('Missing WEBVTT header');
      } else {
        info.hasWebVTTHeader = true;
      }

      // Check for NOTE
      if (vttContent.includes('NOTE')) {
        info.hasNote = true;
      }

      // Split into lines and analyze structure
      const lines = vttContent.split('\n');
      let inCue = false;
      let currentCue = [];
      let cueStartIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
          if (inCue && currentCue.length > 0) {
            // End of cue, validate it
            const cueValidation = this.validateVttCue(currentCue, cueStartIndex);
            if (cueValidation.valid) {
              info.validCues++;
            } else {
              info.invalidCues++;
              issues.push(`Invalid cue at line ${cueStartIndex}: ${cueValidation.error}`);
            }
            info.cueCount++;
            currentCue = [];
            inCue = false;
          }
          continue;
        }

        if (line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
          continue;
        }

        // Check if this could be a timestamp line
        if (/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) {
          info.hasTimestamps = true;
          if (!inCue) {
            inCue = true;
            cueStartIndex = i;
          }
        }

        if (inCue) {
          currentCue.push(line);
        }
      }

      // Handle last cue if file doesn't end with empty line
      if (inCue && currentCue.length > 0) {
        const cueValidation = this.validateVttCue(currentCue, cueStartIndex);
        if (cueValidation.valid) {
          info.validCues++;
        } else {
          info.invalidCues++;
          issues.push(`Invalid cue at line ${cueStartIndex}: ${cueValidation.error}`);
        }
        info.cueCount++;
      }

      const result = {
        valid: issues.length === 0,
        issues: issues,
        info: info,
        summary: `${info.validCues}/${info.cueCount} valid cues, ${info.totalLength} chars, ${issues.length} issues`
      };

      console.log('🔍 VTT validation result:', result);
      return result;

    } catch (error) {
      console.error('❌ Error validating VTT content:', error);
      return {
        valid: false,
        issues: [`Validation error: ${error.message}`],
        info: info,
        summary: 'Validation failed'
      };
    }
  }

  // Validate individual VTT cue
  validateVttCue(cueLines, startLineIndex) {
    try {
      if (cueLines.length < 2) {
        return { valid: false, error: 'Cue too short (need timestamp + text)' };
      }

      let timestampLineIndex = -1;
      let timestampLine = '';

      // Find timestamp line
      for (let i = 0; i < cueLines.length; i++) {
        if (/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(cueLines[i])) {
          timestampLineIndex = i;
          timestampLine = cueLines[i];
          break;
        }
      }

      if (timestampLineIndex === -1) {
        return { valid: false, error: 'No valid timestamp found' };
      }

      // Validate timestamp format
      const timestampMatch = timestampLine.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (!timestampMatch) {
        return { valid: false, error: 'Invalid timestamp format' };
      }

      // Check if there's text after timestamp
      const textLines = cueLines.slice(timestampLineIndex + 1);
      const hasText = textLines.some(line => line.trim().length > 0);
      
      if (!hasText) {
        return { valid: false, error: 'No text content after timestamp' };
      }

      // Validate timing (start should be before end)
      const [, h1, m1, s1, ms1, h2, m2, s2, ms2] = timestampMatch;
      const startTime = parseInt(h1) * 3600 + parseInt(m1) * 60 + parseInt(s1) + parseInt(ms1) / 1000;
      const endTime = parseInt(h2) * 3600 + parseInt(m2) * 60 + parseInt(s2) + parseInt(ms2) / 1000;
      
      if (startTime >= endTime) {
        return { valid: false, error: 'Start time is not before end time' };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  // Test method for debugging subtitle processing
  async testSubtitleProcessing(testData) {
    console.log('🧪 Testing subtitle processing with sample data');
    
    try {
      // Test SRT format detection
      const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
This is a test subtitle

2
00:00:05,000 --> 00:00:08,000
Another test line`;

      console.log('Testing SRT format detection:', this.isSrtFormat(sampleSrt));
      
      // Test SRT to VTT conversion
      const convertedVtt = this.convertSrtToVtt(sampleSrt);
      console.log('Converted VTT:', convertedVtt);
      
      // Test pako loading
      if (typeof window !== 'undefined') {
        await this.loadPako();
        console.log('Pako loaded:', !!window.pako);
      }
      
      return {
        success: true,
        tests: {
          srtDetection: this.isSrtFormat(sampleSrt),
          vttConversion: convertedVtt.startsWith('WEBVTT'),
          pakoAvailable: typeof window !== 'undefined' ? !!window.pako : false
        }
      };
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const subtitleService = new SubtitleService();
export default subtitleService;

// Named exports for convenience
export {
  subtitleService as SubtitleService
}; 