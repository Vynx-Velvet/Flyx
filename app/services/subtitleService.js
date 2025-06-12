// Frontend subtitle service based on cloudnestra's approach
// This moves subtitle fetching from vm-server to frontend for better performance

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
      
      // Try to decompress with pako (like cloudnestra)
      let vttContent;
      try {
        if (typeof window !== 'undefined' && !window.pako) {
          await this.loadPako();
        }

        if (window.pako) {
          vttContent = window.pako.inflate(arrayBuffer, { to: 'string' });
          console.log('✅ Decompressed subtitle content via pako');
        } else {
          vttContent = new TextDecoder('utf-8').decode(arrayBuffer);
          console.log('✅ Decoded subtitle content as plain text');
        }
      } catch (decompressError) {
        console.log('⚠️ Decompression failed, using plain text decoder:', decompressError.message);
        vttContent = new TextDecoder('utf-8').decode(arrayBuffer);
      }

      // Convert SRT to VTT if needed
      if (subtitle.format === 'srt' && !vttContent.startsWith('WEBVTT')) {
        vttContent = this.convertSrtToVtt(vttContent);
        console.log('🔄 Converted SRT to VTT format');
      }

      // Validate VTT content
      if (!vttContent.startsWith('WEBVTT')) {
        console.warn('⚠️ Content does not appear to be valid VTT format');
      }

      // Create blob URL for CORS-free playback
      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const blobUrl = URL.createObjectURL(blob);

      console.log('✅ Subtitle processed successfully:', {
        format: subtitle.format,
        contentLength: vttContent.length,
        hasValidVTT: vttContent.startsWith('WEBVTT'),
        blobUrl: blobUrl.substring(0, 50) + '...'
      });

      return {
        ...subtitle,
        content: vttContent,
        blobUrl: blobUrl,
        contentLength: vttContent.length,
        processed: true,
        processedAt: Date.now(),
        usedProxy: true
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

  // Convert SRT to VTT format
  convertSrtToVtt(srtContent) {
    let vttContent = 'WEBVTT\n\n';
    
    vttContent += srtContent
      .replace(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/g, '$1:$2:$3.$4')
      .replace(/^\d+$/gm, '')
      .replace(/\n\n\n/g, '\n\n')
      .trim();
    
    return vttContent;
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
}

// Export singleton instance
const subtitleService = new SubtitleService();
export default subtitleService;

// Named exports for convenience
export {
  subtitleService as SubtitleService
}; 