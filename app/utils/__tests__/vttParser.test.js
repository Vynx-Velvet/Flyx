/**
 * Comprehensive VTT Parser Tests
 * Tests VTT parsing with various subtitle formats and malformed files
 * Requirements: 3.1, 3.2, 3.4
 */

import { parseVTT, validateVTTCue, sanitizeVTTText } from '../enhancedVttParser.js';

describe('VTT Parser', () => {
  describe('parseVTT - Valid VTT Files', () => {
    test('should parse standard VTT format with HH:MM:SS.mmm timestamps', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
Hello, world!

2
00:00:05.500 --> 00:00:08.200
This is a test subtitle.`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0]).toEqual({
        id: '1',
        start: 1.0,
        end: 3.0,
        text: 'Hello, world!'
      });
      expect(result.cues[1]).toEqual({
        id: '2',
        start: 5.5,
        end: 8.2,
        text: 'This is a test subtitle.'
      });
    });

    test('should parse VTT format with MM:SS.mmm timestamps', () => {
      const vttContent = `WEBVTT

1
01:30.000 --> 03:45.500
Short format timestamp.`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1);
      expect(result.cues[0].start).toBe(90.0); // 1:30
      expect(result.cues[0].end).toBe(225.5); // 3:45.5
    });

    test('should parse VTT with multi-line subtitles', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
This is line one.
This is line two.
This is line three.`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues[0].text).toBe('This is line one.\nThis is line two.\nThis is line three.');
    });

    test('should parse VTT with HTML formatting tags', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
<b>Bold text</b> and <i>italic text</i>

2
00:00:05.000 --> 00:00:07.000
<u>Underlined</u> and <font color="red">colored</font> text`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues[0].text).toBe('Bold text and italic text');
      expect(result.cues[1].text).toBe('Underlined and colored text');
    });

    test('should parse VTT with positioning and styling cues', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000 position:50% align:center
Centered subtitle

2
00:00:05.000 --> 00:00:07.000 line:90%
Bottom positioned subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].text).toBe('Centered subtitle');
      expect(result.cues[1].text).toBe('Bottom positioned subtitle');
    });
  });

  describe('parseVTT - Malformed VTT Files', () => {
    test('should handle missing WEBVTT header', () => {
      const vttContent = `1
00:00:01.000 --> 00:00:03.000
Missing header subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Missing WEBVTT header, assuming VTT format');
      expect(result.cues).toHaveLength(1);
    });

    test('should handle malformed timestamps', () => {
      const vttContent = `WEBVTT

1
00:00:01 --> 00:00:03
Missing milliseconds

2
invalid --> 00:00:05.000
Invalid start time

3
00:00:07.000 --> invalid
Invalid end time

4
00:00:09.000 --> 00:00:08.000
End before start`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1); // Only first one should be valid
      expect(result.errors).toContain('Invalid timestamp format in cue 2');
      expect(result.errors).toContain('Invalid timestamp format in cue 3');
      expect(result.errors).toContain('End time before start time in cue 4');
    });

    test('should handle empty cues and whitespace', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000


2
00:00:05.000 --> 00:00:07.000
   

3
00:00:09.000 --> 00:00:11.000
Valid subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1); // Only the valid one
      expect(result.warnings).toContain('Empty cue text in cue 1');
      expect(result.warnings).toContain('Empty cue text in cue 2');
    });

    test('should handle mixed line endings', () => {
      const vttContent = "WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:03.000\r\nWindows line endings\n\n2\n00:00:05.000 --> 00:00:07.000\nUnix line endings";

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
    });

    test('should handle extremely large files gracefully', () => {
      // Create a large VTT file with many cues
      let vttContent = 'WEBVTT\n\n';
      for (let i = 1; i <= 10000; i++) {
        const start = String(Math.floor(i / 60)).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0') + '.000';
        const end = String(Math.floor((i + 2) / 60)).padStart(2, '0') + ':' + String((i + 2) % 60).padStart(2, '0') + '.000';
        vttContent += `${i}\n${start} --> ${end}\nSubtitle ${i}\n\n`;
      }

      const startTime = performance.now();
      const result = parseVTT(vttContent);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // Should parse within 5 seconds
    });

    test('should handle corrupted UTF-8 characters', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
Valid text with émojis 🎬 and accénts

2
00:00:05.000 --> 00:00:07.000
Text with invalid characters: \uFFFD\uFFFE`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0].text).toBe('Valid text with émojis 🎬 and accénts');
      // Invalid characters should be filtered out
      expect(result.cues[1].text).toBe('Text with invalid characters: ');
    });
  });

  describe('parseVTT - Edge Cases', () => {
    test('should handle completely empty file', () => {
      const result = parseVTT('');
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Empty VTT content');
    });

    test('should handle file with only WEBVTT header', () => {
      const result = parseVTT('WEBVTT');
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(0);
      expect(result.warnings).toContain('No subtitle cues found');
    });

    test('should handle overlapping timestamps', () => {
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
First subtitle

2
00:00:03.000 --> 00:00:07.000
Overlapping subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.warnings).toContain('Overlapping timestamps detected');
    });

    test('should handle very long subtitle text', () => {
      const longText = 'A'.repeat(10000);
      const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:10.000
${longText}`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues[0].text.length).toBe(10000);
    });

    test('should handle negative timestamps', () => {
      const vttContent = `WEBVTT

1
-00:00:01.000 --> 00:00:03.000
Negative start time`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(0);
      expect(result.errors).toContain('Invalid timestamp format in cue 1');
    });
  });

  describe('validateVTTCue', () => {
    test('should validate correct cue', () => {
      const cue = {
        id: '1',
        start: 1.0,
        end: 3.0,
        text: 'Valid cue'
      };

      const result = validateVTTCue(cue);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid start time', () => {
      const cue = {
        id: '1',
        start: -1.0,
        end: 3.0,
        text: 'Invalid start'
      };

      const result = validateVTTCue(cue);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Start time cannot be negative');
    });

    test('should detect end time before start time', () => {
      const cue = {
        id: '1',
        start: 5.0,
        end: 3.0,
        text: 'End before start'
      };

      const result = validateVTTCue(cue);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('End time must be after start time');
    });

    test('should detect empty text', () => {
      const cue = {
        id: '1',
        start: 1.0,
        end: 3.0,
        text: ''
      };

      const result = validateVTTCue(cue);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cue text cannot be empty');
    });
  });

  describe('sanitizeVTTText', () => {
    test('should remove HTML tags', () => {
      const text = '<b>Bold</b> and <i>italic</i> text';
      const result = sanitizeVTTText(text);
      expect(result).toBe('Bold and italic text');
    });

    test('should preserve line breaks', () => {
      const text = 'Line one\nLine two\nLine three';
      const result = sanitizeVTTText(text);
      expect(result).toBe('Line one\nLine two\nLine three');
    });

    test('should remove dangerous HTML', () => {
      const text = '<script>alert("xss")</script>Safe text<img src="x" onerror="alert(1)">';
      const result = sanitizeVTTText(text);
      expect(result).toBe('Safe text');
    });

    test('should handle nested HTML tags', () => {
      const text = '<b><i>Nested</i> tags</b>';
      const result = sanitizeVTTText(text);
      expect(result).toBe('Nested tags');
    });

    test('should decode HTML entities', () => {
      const text = '&lt;Hello&gt; &amp; &quot;World&quot;';
      const result = sanitizeVTTText(text);
      expect(result).toBe('<Hello> & "World"');
    });

    test('should trim whitespace', () => {
      const text = '   Trimmed text   ';
      const result = sanitizeVTTText(text);
      expect(result).toBe('Trimmed text');
    });
  });

  describe('Performance Tests', () => {
    test('should parse large VTT files efficiently', () => {
      // Generate a large VTT file
      let vttContent = 'WEBVTT\n\n';
      for (let i = 1; i <= 5000; i++) {
        vttContent += `${i}\n00:${String(Math.floor(i/60)).padStart(2, '0')}:${String(i%60).padStart(2, '0')}.000 --> 00:${String(Math.floor((i+3)/60)).padStart(2, '0')}:${String((i+3)%60).padStart(2, '0')}.000\nSubtitle ${i}\n\n`;
      }

      const startTime = performance.now();
      const result = parseVTT(vttContent);
      const endTime = performance.now();

      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(5000);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });

    test('should handle memory efficiently with large subtitle text', () => {
      const largeText = 'Lorem ipsum '.repeat(1000);
      const vttContent = `WEBVTT\n\n1\n00:00:01.000 --> 00:00:10.000\n${largeText}`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues[0].text.length).toBeGreaterThan(10000);
    });
  });

  describe('Format Variations', () => {
    test('should handle VTT with NOTE sections', () => {
      const vttContent = `WEBVTT

NOTE
This is a note section that should be ignored.

1
00:00:01.000 --> 00:00:03.000
Subtitle after note`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1);
      expect(result.cues[0].text).toBe('Subtitle after note');
    });

    test('should handle VTT with STYLE sections', () => {
      const vttContent = `WEBVTT

STYLE
::cue {
  background-color: black;
  color: white;
}

1
00:00:01.000 --> 00:00:03.000
Styled subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1);
    });

    test('should handle VTT with REGION sections', () => {
      const vttContent = `WEBVTT

REGION
id:speaker
width:40%
lines:3
regionanchor:0%,100%
viewportanchor:10%,90%
scroll:up

1
00:00:01.000 --> 00:00:03.000 region:speaker
Regional subtitle`;

      const result = parseVTT(vttContent);
      
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(1);
    });
  });
});