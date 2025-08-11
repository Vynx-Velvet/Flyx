/**
 * Test suite for enhanced VTT parser
 * Tests malformed subtitle handling, time parsing, and error recovery
 */

import { parseVTTEnhanced, parseTimeEnhanced } from '../enhancedVttParser';

describe('Enhanced VTT Parser', () => {
  describe('parseTimeEnhanced', () => {
    test('should parse HH:MM:SS.mmm format', () => {
      expect(parseTimeEnhanced('01:23:45.678')).toBe(5025.678);
      expect(parseTimeEnhanced('00:01:30.500')).toBe(90.5);
      expect(parseTimeEnhanced('2:05:15.123')).toBe(7515.123);
    });

    test('should parse MM:SS.mmm format', () => {
      expect(parseTimeEnhanced('23:45.678')).toBe(1425.678);
      expect(parseTimeEnhanced('01:30.500')).toBe(90.5);
      expect(parseTimeEnhanced('5:15.123')).toBe(315.123);
    });

    test('should parse MM:SS format (no milliseconds)', () => {
      expect(parseTimeEnhanced('23:45')).toBe(1425);
      expect(parseTimeEnhanced('01:30')).toBe(90);
      expect(parseTimeEnhanced('5:15')).toBe(315);
    });

    test('should handle malformed time strings', () => {
      expect(parseTimeEnhanced('invalid')).toBe(0);
      expect(parseTimeEnhanced('')).toBe(0);
      expect(parseTimeEnhanced('25:70.999')).toBe(0); // Invalid minutes/seconds
    });
  });

  describe('parseVTTEnhanced', () => {
    test('should parse valid VTT content', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
This is the first subtitle

2
00:00:05.000 --> 00:00:08.000
This is the second subtitle`;

      const result = parseVTTEnhanced(vttContent);
      
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].text).toBe('This is the first subtitle');
      expect(result.cues[0].start).toBe(1);
      expect(result.cues[0].end).toBe(4);
      expect(result.metadata.errors).toHaveLength(0);
    });

    test('should handle malformed timestamps with error recovery', () => {
      const vttContent = `WEBVTT

1
00:00:01,000 --> 00:00:04,000
Comma instead of dot

2
00:00:05 --> 00:00:08
Missing milliseconds`;

      const result = parseVTTEnhanced(vttContent, {
        enableErrorRecovery: true
      });
      
      expect(result.cues.length).toBeGreaterThan(0);
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
    });

    test('should sanitize HTML tags', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<script>alert('xss')</script>Safe <b>bold</b> text

2
00:00:05.000 --> 00:00:08.000
<font color="red">Colored text</font>`;

      const result = parseVTTEnhanced(vttContent, {
        sanitizeHtml: true
      });
      
      expect(result.cues[0].text).not.toContain('<script>');
      expect(result.cues[0].text).toContain('<b>bold</b>'); // Allowed tag
      expect(result.cues[1].text).not.toContain('<font'); // Disallowed tag
    });

    test('should validate timing and detect overlaps', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
First subtitle

2
00:00:03.000 --> 00:00:06.000
Overlapping subtitle`;

      const result = parseVTTEnhanced(vttContent, {
        validateTiming: true
      });
      
      expect(result.metadata.warnings.length).toBeGreaterThan(0);
      expect(result.metadata.warnings.some(w => w.includes('Overlapping'))).toBe(true);
    });

    test('should handle missing WEBVTT header', () => {
      const vttContent = `1
00:00:01.000 --> 00:00:04.000
No header subtitle`;

      const result = parseVTTEnhanced(vttContent, {
        strictMode: false,
        enableErrorRecovery: true
      });
      
      expect(result.metadata.warnings.some(w => w.includes('Missing WEBVTT header'))).toBe(true);
      expect(result.cues.length).toBeGreaterThan(0);
    });

    test('should handle empty or invalid content', () => {
      expect(() => parseVTTEnhanced('')).toThrow();
      expect(() => parseVTTEnhanced(null)).toThrow();
      expect(() => parseVTTEnhanced(undefined)).toThrow();
    });

    test('should use fallback parsing for severely malformed content', () => {
      const malformedContent = `Some random text
01:30.500 --> 02:45.123
This might be a subtitle
More random text
03:00.000 --> 04:15.678
Another potential subtitle`;

      const result = parseVTTEnhanced(malformedContent, {
        enableErrorRecovery: true
      });
      
      expect(result.metadata.warnings.some(w => w.includes('fallback'))).toBe(true);
      expect(result.cues.length).toBeGreaterThan(0);
    });

    test('should respect maxCues limit', () => {
      let vttContent = 'WEBVTT\n\n';
      
      // Generate 100 cues
      for (let i = 1; i <= 100; i++) {
        const start = i;
        const end = i + 1;
        vttContent += `${i}\n${String(start).padStart(2, '0')}:00:00.000 --> ${String(end).padStart(2, '0')}:00:00.000\nSubtitle ${i}\n\n`;
      }

      const result = parseVTTEnhanced(vttContent, {
        maxCues: 50
      });
      
      expect(result.cues).toHaveLength(50);
    });

    test('should track performance metrics', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Performance test subtitle`;

      const result = parseVTTEnhanced(vttContent);
      
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.totalLines).toBeGreaterThan(0);
      expect(result.metadata.processedCues).toBe(1);
    });
  });
});