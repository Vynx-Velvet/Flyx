/**
 * Manual test runner for enhanced VTT parser
 * Run this in the browser console to test the parser functionality
 */

import { parseVTTEnhanced, parseTimeEnhanced } from './enhancedVttParser.js';

export function runEnhancedVttParserTests() {
  console.log('🧪 Starting Enhanced VTT Parser Tests...');
  
  let passedTests = 0;
  let totalTests = 0;

  function test(name, testFn) {
    totalTests++;
    try {
      testFn();
      console.log(`✅ ${name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ ${name}:`, error.message);
    }
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      not: {
        toContain: (expected) => {
          if (actual.includes(expected)) {
            throw new Error(`Expected "${actual}" not to contain "${expected}"`);
          }
        }
      }
    };
  }

  // Test parseTimeEnhanced
  test('parseTimeEnhanced - HH:MM:SS.mmm format', () => {
    expect(parseTimeEnhanced('01:23:45.678')).toBe(5025.678);
    expect(parseTimeEnhanced('00:01:30.500')).toBe(90.5);
  });

  test('parseTimeEnhanced - MM:SS.mmm format', () => {
    expect(parseTimeEnhanced('23:45.678')).toBe(1425.678);
    expect(parseTimeEnhanced('01:30.500')).toBe(90.5);
  });

  test('parseTimeEnhanced - MM:SS format', () => {
    expect(parseTimeEnhanced('23:45')).toBe(1425);
    expect(parseTimeEnhanced('01:30')).toBe(90);
  });

  test('parseTimeEnhanced - malformed input', () => {
    expect(parseTimeEnhanced('invalid')).toBe(0);
    expect(parseTimeEnhanced('')).toBe(0);
  });

  // Test parseVTTEnhanced
  test('parseVTTEnhanced - valid VTT content', () => {
    const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
This is the first subtitle

2
00:00:05.000 --> 00:00:08.000
This is the second subtitle`;

    const result = parseVTTEnhanced(vttContent);
    expect(result.cues.length).toBe(2);
    expect(result.cues[0].text).toBe('This is the first subtitle');
    expect(result.cues[0].start).toBe(1);
    expect(result.cues[0].end).toBe(4);
  });

  test('parseVTTEnhanced - malformed timestamps with recovery', () => {
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
  });

  test('parseVTTEnhanced - HTML sanitization', () => {
    const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<script>alert('xss')</script>Safe <b>bold</b> text`;

    const result = parseVTTEnhanced(vttContent, {
      sanitizeHtml: true
    });
    
    expect(result.cues[0].text).not.toContain('<script>');
    expect(result.cues[0].text).toContain('<b>bold</b>');
  });

  test('parseVTTEnhanced - missing WEBVTT header', () => {
    const vttContent = `1
00:00:01.000 --> 00:00:04.000
No header subtitle`;

    const result = parseVTTEnhanced(vttContent, {
      strictMode: false,
      enableErrorRecovery: true
    });
    
    expect(result.cues.length).toBeGreaterThan(0);
  });

  test('parseVTTEnhanced - performance metrics', () => {
    const vttContent = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Performance test subtitle`;

    const result = parseVTTEnhanced(vttContent);
    expect(result.metadata.processingTime).toBeGreaterThan(0);
    expect(result.metadata.processedCues).toBe(1);
  });

  // Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Enhanced VTT Parser is working correctly.');
  } else {
    console.log(`⚠️ ${totalTests - passedTests} tests failed. Check the errors above.`);
  }

  return {
    passed: passedTests,
    total: totalTests,
    success: passedTests === totalTests
  };
}

// Test data for manual testing
export const testVttSamples = {
  valid: `WEBVTT

1
00:00:01.000 --> 00:00:04.000
This is a test subtitle

2
00:00:05.000 --> 00:00:08.000
Another test subtitle`,

  malformed: `WEBVTT

1
00:00:01,000 --> 00:00:04,000
Comma instead of dot

2
00:00:05 --> 00:00:08
Missing milliseconds

3
01:30.500 --> 02:45.123
MM:SS format`,

  withHtml: `WEBVTT

1
00:00:01.000 --> 00:00:04.000
<script>alert('xss')</script>Safe <b>bold</b> and <i>italic</i> text

2
00:00:05.000 --> 00:00:08.000
<font color="red">Colored text</font> with <u>underline</u>`,

  noHeader: `1
00:00:01.000 --> 00:00:04.000
No WEBVTT header

2
00:00:05.000 --> 00:00:08.000
Still should work with recovery`
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testEnhancedVttParser = runEnhancedVttParserTests;
  window.testVttSamples = testVttSamples;
}