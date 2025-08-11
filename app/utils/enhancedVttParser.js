/**
 * Enhanced VTT Parser with improved error handling, format support, and synchronization
 * Implements requirements 3.1, 3.2, 3.4 for improved VTT subtitle parsing and synchronization
 */

/**
 * Enhanced VTT parser that handles malformed subtitle files and various format variations
 * @param {string} vttText - Raw VTT content
 * @param {Object} options - Parser options
 * @returns {Object} Parsed cues and metadata
 */
export function parseVTTEnhanced(vttText, options = {}) {
  const {
    strictMode = false,
    maxCues = 10000,
    enableErrorRecovery = true,
    sanitizeHtml = true,
    validateTiming = true
  } = options;

  console.log('🎬 Enhanced VTT Parser starting:', {
    contentLength: vttText?.length || 0,
    strictMode,
    enableErrorRecovery,
    options
  });

  const result = {
    cues: [],
    metadata: {
      totalLines: 0,
      processedCues: 0,
      skippedCues: 0,
      errors: [],
      warnings: [],
      format: 'unknown',
      hasWebVTTHeader: false,
      processingTime: 0
    }
  };

  const startTime = performance.now();

  try {
    if (!vttText || typeof vttText !== 'string') {
      throw new Error('Invalid VTT content: must be a non-empty string');
    }

    // Normalize line endings and clean content
    const normalizedContent = normalizeVTTContent(vttText);
    const lines = normalizedContent.split('\n');
    result.metadata.totalLines = lines.length;

    console.log('📝 Content normalized:', {
      originalLength: vttText.length,
      normalizedLength: normalizedContent.length,
      totalLines: lines.length
    });

    // Detect and validate format
    const formatDetection = detectVTTFormat(normalizedContent);
    result.metadata.format = formatDetection.format;
    result.metadata.hasWebVTTHeader = formatDetection.hasWebVTTHeader;

    if (!formatDetection.isValid && strictMode) {
      throw new Error(`Invalid VTT format: ${formatDetection.issues.join(', ')}`);
    }

    if (formatDetection.issues.length > 0) {
      result.metadata.warnings.push(...formatDetection.issues);
    }

    // Parse cues with enhanced error recovery
    const cueParsingResult = parseCuesEnhanced(lines, {
      enableErrorRecovery,
      sanitizeHtml,
      validateTiming,
      maxCues
    });

    result.cues = cueParsingResult.cues;
    result.metadata.processedCues = cueParsingResult.processedCues;
    result.metadata.skippedCues = cueParsingResult.skippedCues;
    result.metadata.errors.push(...cueParsingResult.errors);
    result.metadata.warnings.push(...cueParsingResult.warnings);

    // Validate and optimize cues
    if (validateTiming) {
      const validationResult = validateCueTiming(result.cues);
      result.metadata.warnings.push(...validationResult.warnings);
      result.metadata.errors.push(...validationResult.errors);
    }

    result.metadata.processingTime = performance.now() - startTime;

    console.log('✅ Enhanced VTT parsing completed:', {
      totalCues: result.cues.length,
      processedCues: result.metadata.processedCues,
      skippedCues: result.metadata.skippedCues,
      errors: result.metadata.errors.length,
      warnings: result.metadata.warnings.length,
      processingTime: `${result.metadata.processingTime.toFixed(2)}ms`
    });

    return result;

  } catch (error) {
    result.metadata.errors.push(`Fatal parsing error: ${error.message}`);
    result.metadata.processingTime = performance.now() - startTime;
    
    console.error('❌ Enhanced VTT parsing failed:', error);
    
    if (enableErrorRecovery) {
      console.log('🔄 Attempting fallback parsing...');
      return fallbackVTTParsing(vttText, result);
    }
    
    throw error;
  }
}

/**
 * Normalize VTT content for consistent parsing
 * @param {string} content - Raw VTT content
 * @returns {string} Normalized content
 */
function normalizeVTTContent(content) {
  return content
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove BOM if present
    .replace(/^\uFEFF/, '')
    // Clean up excessive whitespace but preserve structure
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Ensure content ends with newline
    .replace(/\n*$/, '\n');
}

/**
 * Detect and validate VTT format
 * @param {string} content - Normalized VTT content
 * @returns {Object} Format detection result
 */
function detectVTTFormat(content) {
  const result = {
    format: 'vtt',
    isValid: true,
    hasWebVTTHeader: false,
    issues: []
  };

  const lines = content.split('\n');
  
  // Check for WEBVTT header
  if (lines.length > 0 && lines[0].trim().startsWith('WEBVTT')) {
    result.hasWebVTTHeader = true;
  } else {
    result.issues.push('Missing WEBVTT header');
  }

  // Check for basic VTT structure
  const hasTimestamps = /\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(content);
  if (!hasTimestamps) {
    result.issues.push('No valid VTT timestamps found');
    result.isValid = false;
  }

  // Check for common malformed patterns
  if (content.includes('-->') && !hasTimestamps) {
    result.issues.push('Malformed timestamp format detected');
  }

  return result;
}

/**
 * Parse cues with enhanced error recovery
 * @param {string[]} lines - Content lines
 * @param {Object} options - Parsing options
 * @returns {Object} Parsing result
 */
function parseCuesEnhanced(lines, options) {
  const {
    enableErrorRecovery,
    sanitizeHtml,
    validateTiming,
    maxCues
  } = options;

  const result = {
    cues: [],
    processedCues: 0,
    skippedCues: 0,
    errors: [],
    warnings: []
  };

  let i = 0;
  let cueId = 1;

  // Skip header and metadata
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === 'WEBVTT' || line.startsWith('NOTE') || line === '') {
      i++;
      continue;
    }
    break;
  }

  console.log(`🔍 Starting enhanced cue parsing from line ${i}`);

  while (i < lines.length && result.cues.length < maxCues) {
    try {
      const cueResult = parseNextCue(lines, i, {
        cueId: cueId++,
        sanitizeHtml,
        validateTiming,
        enableErrorRecovery
      });

      if (cueResult.success) {
        result.cues.push(cueResult.cue);
        result.processedCues++;
        i = cueResult.nextIndex;
        
        if (result.processedCues <= 3) {
          console.log(`✅ Parsed cue #${result.processedCues}:`, {
            start: cueResult.cue.start,
            end: cueResult.cue.end,
            text: cueResult.cue.text.substring(0, 50) + '...'
          });
        }
      } else {
        result.skippedCues++;
        result.errors.push(`Line ${i}: ${cueResult.error}`);
        i = cueResult.nextIndex || i + 1;
        
        if (!enableErrorRecovery) {
          break;
        }
      }
    } catch (error) {
      result.errors.push(`Line ${i}: Unexpected error - ${error.message}`);
      result.skippedCues++;
      i++;
      
      if (!enableErrorRecovery) {
        break;
      }
    }
  }

  return result;
}

/**
 * Parse next cue from lines starting at index
 * @param {string[]} lines - Content lines
 * @param {number} startIndex - Starting line index
 * @param {Object} options - Parsing options
 * @returns {Object} Cue parsing result
 */
function parseNextCue(lines, startIndex, options) {
  const { cueId, sanitizeHtml, validateTiming, enableErrorRecovery } = options;
  let i = startIndex;

  // Skip empty lines
  while (i < lines.length && lines[i].trim() === '') {
    i++;
  }

  if (i >= lines.length) {
    return { success: false, error: 'End of content reached', nextIndex: i };
  }

  // Look for cue identifier or timestamp
  let cueIdentifier = null;
  let timestampLine = null;
  let timestampIndex = -1;

  // Check if current line is a cue identifier (not a timestamp)
  const currentLine = lines[i].trim();
  if (currentLine && !isTimestampLine(currentLine)) {
    cueIdentifier = currentLine;
    i++;
  }

  // Find timestamp line
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') {
      i++;
      continue;
    }
    
    if (isTimestampLine(line)) {
      timestampLine = line;
      timestampIndex = i;
      break;
    }
    
    // If we haven't found a timestamp and this isn't empty, it might be malformed
    if (enableErrorRecovery) {
      // Try to extract timestamp from malformed line
      const extractedTimestamp = extractTimestampFromMalformed(line);
      if (extractedTimestamp) {
        timestampLine = extractedTimestamp;
        timestampIndex = i;
        break;
      }
    }
    
    i++;
  }

  if (!timestampLine) {
    return {
      success: false,
      error: 'No valid timestamp found',
      nextIndex: i
    };
  }

  // Parse timestamp
  const timingResult = parseTimestamp(timestampLine, validateTiming);
  if (!timingResult.success) {
    return {
      success: false,
      error: `Invalid timestamp: ${timingResult.error}`,
      nextIndex: i + 1
    };
  }

  // Collect cue text
  i = timestampIndex + 1;
  const textLines = [];
  
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '') {
      break;
    }
    textLines.push(line);
    i++;
  }

  if (textLines.length === 0) {
    return {
      success: false,
      error: 'No cue text found',
      nextIndex: i
    };
  }

  // Process cue text
  let cueText = textLines.join('\n');
  
  if (sanitizeHtml) {
    cueText = sanitizeHTMLTags(cueText);
  }

  // Create cue object
  const cue = {
    id: cueIdentifier || `cue-${cueId}`,
    start: timingResult.start,
    end: timingResult.end,
    text: cueText,
    originalText: textLines.join('\n')
  };

  return {
    success: true,
    cue,
    nextIndex: i
  };
}

/**
 * Check if line contains VTT timestamp
 * @param {string} line - Line to check
 * @returns {boolean} True if line contains timestamp
 */
function isTimestampLine(line) {
  return /\d{1,2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

/**
 * Extract timestamp from malformed line (error recovery)
 * @param {string} line - Potentially malformed line
 * @returns {string|null} Extracted timestamp or null
 */
function extractTimestampFromMalformed(line) {
  // Try to find timestamp pattern with various separators
  const patterns = [
    // Standard VTT with comma instead of dot
    /(\d{1,2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}),(\d{3})/,
    // Missing milliseconds
    /(\d{1,2}:\d{2}:\d{2})\s*-->\s*(\d{1,2}:\d{2}:\d{2})/,
    // MM:SS format
    /(\d{1,2}:\d{2})\.\d{3}\s*-->\s*(\d{1,2}:\d{2})\.\d{3}/
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      if (pattern === patterns[0]) {
        // Convert comma to dot for milliseconds
        return `${match[1]}.${match[2]} --> ${match[3]}.${match[4]}`;
      } else if (pattern === patterns[1]) {
        // Add missing milliseconds
        return `${match[1]}.000 --> ${match[2]}.000`;
      }
      // Return as-is for other patterns
      return match[0];
    }
  }

  return null;
}

/**
 * Enhanced time parsing supporting both HH:MM:SS.mmm and MM:SS.mmm formats
 * @param {string} timeStr - Time string to parse
 * @returns {number} Time in seconds
 */
export function parseTimeEnhanced(timeStr) {
  try {
    const cleanTime = timeStr.trim();
    
    // Handle HH:MM:SS.mmm format
    const longMatch = cleanTime.match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/);
    if (longMatch) {
      const [, hours, minutes, seconds, milliseconds] = longMatch;
      return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    // Handle MM:SS.mmm format
    const shortMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\.(\d{3})$/);
    if (shortMatch) {
      const [, minutes, seconds, milliseconds] = shortMatch;
      return parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    // Handle MM:SS format (no milliseconds)
    const noMsMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (noMsMatch) {
      const [, minutes, seconds] = noMsMatch;
      return parseInt(minutes) * 60 + parseInt(seconds);
    }

    // Fallback: try to parse as float (seconds only)
    const floatValue = parseFloat(cleanTime);
    if (!isNaN(floatValue) && floatValue >= 0) {
      return floatValue;
    }

    throw new Error(`Unrecognized time format: ${timeStr}`);
  } catch (error) {
    console.warn('⚠️ Time parsing failed:', timeStr, error.message);
    return 0;
  }
}

/**
 * Parse VTT timestamp line
 * @param {string} timestampLine - Line containing timestamp
 * @param {boolean} validateTiming - Whether to validate timing
 * @returns {Object} Parsing result
 */
function parseTimestamp(timestampLine, validateTiming = true) {
  try {
    const parts = timestampLine.split('-->').map(s => s.trim());
    
    if (parts.length !== 2) {
      return { success: false, error: 'Invalid timestamp format - missing -->' };
    }

    const start = parseTimeEnhanced(parts[0]);
    const end = parseTimeEnhanced(parts[1]);

    if (validateTiming) {
      if (start < 0 || end < 0) {
        return { success: false, error: 'Negative time values not allowed' };
      }
      
      if (start >= end) {
        return { success: false, error: 'Start time must be before end time' };
      }
      
      if (end - start > 300) { // 5 minutes max duration
        return { success: false, error: 'Cue duration too long (max 5 minutes)' };
      }
    }

    return {
      success: true,
      start,
      end
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Sanitize HTML tags from cue text with error recovery
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeHTMLTags(text) {
  try {
    // Allow basic VTT formatting tags but remove potentially harmful ones
    const allowedTags = ['b', 'i', 'u', 'c', 'v', 'lang'];
    
    return text
      // Remove script and style tags completely
      .replace(/<(script|style)[^>]*>.*?<\/\1>/gis, '')
      // Remove dangerous attributes
      .replace(/\s(on\w+|javascript:|data:)[^>]*/gi, '')
      // Clean up malformed tags
      .replace(/<([^>]+)>/g, (match, tagContent) => {
        const tagName = tagContent.split(/\s/)[0].toLowerCase();
        if (allowedTags.includes(tagName)) {
          return match;
        }
        return ''; // Remove disallowed tags
      })
      // Clean up orphaned closing tags
      .replace(/<\/[^>]+>/g, (match) => {
        const tagName = match.slice(2, -1).toLowerCase();
        return allowedTags.includes(tagName) ? match : '';
      })
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.warn('⚠️ HTML sanitization failed:', error.message);
    // Fallback: remove all tags
    return text.replace(/<[^>]*>/g, '').trim();
  }
}

/**
 * Validate cue timing and detect overlaps
 * @param {Array} cues - Array of parsed cues
 * @returns {Object} Validation result
 */
function validateCueTiming(cues) {
  const result = {
    warnings: [],
    errors: []
  };

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    
    // Check for overlapping cues
    for (let j = i + 1; j < cues.length; j++) {
      const nextCue = cues[j];
      
      if (cue.end > nextCue.start && cue.start < nextCue.end) {
        result.warnings.push(`Overlapping cues detected: ${cue.id} and ${nextCue.id}`);
      }
    }
    
    // Check for very short cues (might be errors)
    if (cue.end - cue.start < 0.1) {
      result.warnings.push(`Very short cue duration: ${cue.id} (${(cue.end - cue.start).toFixed(3)}s)`);
    }
    
    // Check for very long cues
    if (cue.end - cue.start > 60) {
      result.warnings.push(`Very long cue duration: ${cue.id} (${(cue.end - cue.start).toFixed(1)}s)`);
    }
  }

  return result;
}

/**
 * Fallback VTT parsing for severely malformed content
 * @param {string} content - Original VTT content
 * @param {Object} existingResult - Existing parsing result
 * @returns {Object} Fallback parsing result
 */
function fallbackVTTParsing(content, existingResult) {
  console.log('🔄 Attempting fallback VTT parsing...');
  
  try {
    const lines = content.split('\n');
    const cues = [];
    let cueId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for anything that might be a timestamp
      if (line.includes('-->')) {
        const extractedTimestamp = extractTimestampFromMalformed(line);
        if (extractedTimestamp) {
          const timingResult = parseTimestamp(extractedTimestamp, false);
          if (timingResult.success) {
            // Look for text in next few lines
            let text = '';
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const textLine = lines[j].trim();
              if (textLine && !textLine.includes('-->')) {
                text += (text ? ' ' : '') + textLine;
              } else if (text) {
                break;
              }
            }
            
            if (text) {
              cues.push({
                id: `fallback-cue-${cueId++}`,
                start: timingResult.start,
                end: timingResult.end,
                text: sanitizeHTMLTags(text)
              });
            }
          }
        }
      }
    }

    existingResult.cues = cues;
    existingResult.metadata.processedCues = cues.length;
    existingResult.metadata.warnings.push('Used fallback parsing due to malformed content');
    
    console.log(`✅ Fallback parsing recovered ${cues.length} cues`);
    return existingResult;
    
  } catch (error) {
    console.error('❌ Fallback parsing also failed:', error);
    existingResult.metadata.errors.push(`Fallback parsing failed: ${error.message}`);
    return existingResult;
  }
}