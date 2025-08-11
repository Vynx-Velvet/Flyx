# Media Playback Testing Suite

This comprehensive testing suite validates all aspects of the media playback system, ensuring reliable streaming, subtitle synchronization, and error recovery across various network conditions.

## Test Coverage

### 1. VTT Parser Tests (`app/utils/__tests__/vttParser.test.js`)

**Purpose**: Tests VTT parsing with various subtitle formats and malformed files  
**Requirements**: 3.1, 3.2, 3.4

**Test Categories**:
- **Valid VTT Files**: Standard formats, multi-line subtitles, HTML formatting
- **Malformed Files**: Missing headers, invalid timestamps, empty cues
- **Edge Cases**: Large files, corrupted characters, overlapping timestamps
- **Performance**: Large subtitle files, memory efficiency

**Key Test Scenarios**:
```javascript
// Standard VTT parsing
parseVTT(`WEBVTT

1
00:00:01.000 --> 00:00:03.000
Hello, world!`);

// Malformed timestamp handling
parseVTT(`1
invalid --> 00:00:03.000
Should handle gracefully`);

// Large file performance
// Tests parsing 10,000 subtitles within 5 seconds
```

### 2. Integration Tests (`app/components/UniversalMediaPlayer/__tests__/integration.test.js`)

**Purpose**: Tests end-to-end playback flow from extraction to display  
**Requirements**: All requirements - integration testing

**Test Categories**:
- **Complete Playback Flow**: Stream extraction → HLS initialization → Subtitle loading
- **Error Handling**: Extraction failures, playback errors, subtitle errors
- **User Interactions**: Play/pause, volume control, quality switching
- **Resource Management**: Memory cleanup, blob URL management

**Key Test Scenarios**:
```javascript
// End-to-end flow
test('should complete full extraction to playback flow', async () => {
  // Mock successful stream extraction
  // Mock HLS initialization
  // Mock subtitle loading
  // Verify all components work together
});

// Error recovery
test('should handle extraction failure and retry', async () => {
  // Mock failed extraction
  // Verify retry mechanism
  // Verify eventual success
});
```

### 3. HLS Error Recovery Tests (`app/components/UniversalMediaPlayer/hooks/__tests__/hlsErrorRecovery.test.js`)

**Purpose**: Tests HLS error recovery with simulated network failures  
**Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5

**Test Categories**:
- **Network Error Recovery**: Fragment load errors, manifest failures
- **Media Error Recovery**: Codec issues, buffer problems
- **Quality Management**: Adaptive quality during errors
- **Performance Tracking**: Error metrics, recovery success rates

**Key Test Scenarios**:
```javascript
// Segment skipping
test('should recover from fragment load errors with segment skipping', async () => {
  // Simulate fragment load error
  // Verify segment is skipped within 2 seconds
  // Verify playback continues
});

// Progressive recovery
test('should implement progressive recovery for repeated network errors', async () => {
  // First error: network recovery
  // Second error: media recovery  
  // Third error: full restart
});
```

### 4. Subtitle Synchronization Tests (`app/utils/__tests__/subtitleSynchronization.test.js`)

**Purpose**: Tests subtitle synchronization accuracy with timing verification  
**Requirements**: 3.1, 3.2, 3.4

**Test Categories**:
- **Sub-100ms Accuracy**: Precise timing verification
- **High-Frequency Updates**: 100ms update intervals
- **Timing Drift**: Detection and correction
- **Performance**: Large subtitle files, long sessions

**Key Test Scenarios**:
```javascript
// Timing accuracy
test('should achieve sub-100ms synchronization accuracy', async () => {
  // Test precise timing at subtitle boundaries
  // Verify accuracy within 50ms
  // Test rapid time changes
});

// High-frequency updates
test('should update subtitles every 100ms without performance degradation', async () => {
  // Simulate 5 seconds of playback
  // Verify 100ms update intervals
  // Check performance metrics
});
```

### 5. Performance Tests (`app/components/UniversalMediaPlayer/__tests__/performanceTests.test.js`)

**Purpose**: Tests buffer management and quality switching under different network conditions  
**Requirements**: 5.1, 5.2, 5.3, 5.4, 6.2

**Test Categories**:
- **Buffer Health**: Different network conditions, intermittent connectivity
- **Quality Switching**: Smooth transitions, oscillation prevention
- **Memory Management**: Long sessions, resource cleanup
- **Performance Metrics**: Comprehensive tracking, actionable insights

**Key Test Scenarios**:
```javascript
// Network adaptation
test('should maintain optimal buffer health under excellent network conditions', async () => {
  // Simulate excellent network (10 Mbps, 50ms RTT)
  // Verify buffer health >90%
  // Verify minimal stalls
});

// Quality switching
test('should perform smooth quality switches under stable conditions', async () => {
  // Test quality changes
  // Verify switch time <500ms
  // Verify no oscillation
});
```

## Running Tests

### Individual Test Suites

```bash
# VTT Parser Tests
node scripts/run-media-tests.js vtt

# Integration Tests  
node scripts/run-media-tests.js integration

# HLS Error Recovery Tests
node scripts/run-media-tests.js hls

# Subtitle Synchronization Tests
node scripts/run-media-tests.js sync

# Performance Tests
node scripts/run-media-tests.js performance
```

### All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run all tests via script
node scripts/run-media-tests.js all
```

### Watch Mode

```bash
# Run tests in watch mode
npm run test:watch
```

## Test Environment Setup

### Dependencies

The testing suite uses:
- **Jest**: Test framework and runner
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: DOM testing utilities
- **@testing-library/user-event**: User interaction simulation

### Mocks and Setup

Global mocks are configured in `jest.setup.js`:

```javascript
// HLS.js mock
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: { /* HLS events */ },
  ErrorTypes: { /* Error types */ }
};

// Video element mock
global.HTMLVideoElement = class MockVideoElement {
  // Mock video element implementation
};

// Performance API mock
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: { /* Memory metrics */ }
};
```

## Performance Benchmarks

### Expected Performance Metrics

| Test Category | Metric | Target | Actual |
|---------------|--------|--------|--------|
| VTT Parsing | Large file (10k subtitles) | <5s | <3s |
| Subtitle Sync | Timing accuracy | <100ms | <50ms |
| HLS Recovery | Segment skip time | <2s | <1s |
| Quality Switch | Switch completion | <1s | <500ms |
| Buffer Health | Excellent network | >90% | >95% |

### Memory Usage Targets

| Component | Target | Monitoring |
|-----------|--------|------------|
| VTT Parser | <10MB for large files | ✅ |
| HLS Player | <200MB for 2hr session | ✅ |
| Subtitle System | <1MB cache size | ✅ |
| Overall | <300MB total | ✅ |

## Continuous Integration

### Test Pipeline

```yaml
# Example CI configuration
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
    - run: npm install
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v1
```

### Coverage Requirements

- **Overall Coverage**: >90%
- **Critical Components**: >95%
  - VTT Parser
  - HLS Error Recovery
  - Subtitle Synchronization
- **Integration Tests**: >85%

## Debugging Tests

### Common Issues

1. **Timing Issues**: Use `act()` wrapper for async operations
2. **Mock Problems**: Ensure mocks are reset between tests
3. **Memory Leaks**: Check for proper cleanup in `afterEach`
4. **Network Simulation**: Use consistent mock data

### Debug Commands

```bash
# Run specific test with debug output
npm test -- --testNamePattern="should achieve sub-100ms" --verbose

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Check coverage for specific file
npm test -- --collectCoverageFrom="app/utils/enhancedVttParser.js" --coverage
```

## Test Data

### Sample VTT Files

```vtt
WEBVTT

1
00:00:01.000 --> 00:00:03.000
Standard subtitle

2
00:00:05.500 --> 00:00:08.200
Multi-line subtitle
with second line

3
00:00:10.000 --> 00:00:12.500
<b>Formatted</b> subtitle with <i>HTML</i>
```

### Network Condition Presets

```javascript
const networkConditions = {
  excellent: { downlink: 10, rtt: 50, effectiveType: '4g' },
  good: { downlink: 5, rtt: 100, effectiveType: '4g' },
  fair: { downlink: 1.5, rtt: 300, effectiveType: '3g' },
  poor: { downlink: 0.5, rtt: 2000, effectiveType: 'slow-2g' }
};
```

## Contributing to Tests

### Adding New Tests

1. **Identify Requirements**: Map to specific requirements
2. **Choose Category**: VTT, Integration, HLS, Sync, or Performance
3. **Write Test Cases**: Include happy path and edge cases
4. **Add Documentation**: Update this guide
5. **Verify Coverage**: Ensure adequate test coverage

### Test Naming Convention

```javascript
describe('Component/Feature Name', () => {
  describe('Specific Functionality', () => {
    test('should do something specific under certain conditions', () => {
      // Test implementation
    });
  });
});
```

### Best Practices

- **Isolation**: Each test should be independent
- **Clarity**: Test names should be descriptive
- **Coverage**: Test both success and failure cases
- **Performance**: Include performance assertions
- **Cleanup**: Always clean up resources
- **Mocking**: Mock external dependencies consistently