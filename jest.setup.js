require('@testing-library/jest-dom');

// Mock global objects
global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn(() => ({
  size: 1024,
  type: 'text/vtt'
}));

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
};

// Mock navigator
global.navigator = {
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// Mock fetch
global.fetch = jest.fn();

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn(() => true),
  Events: {
    MEDIA_ATTACHED: 'hlsMediaAttached',
    MANIFEST_PARSED: 'hlsManifestParsed',
    LEVEL_LOADED: 'hlsLevelLoaded',
    FRAG_LOADED: 'hlsFragLoaded',
    ERROR: 'hlsError'
  },
  ErrorTypes: {
    NETWORK_ERROR: 'networkError',
    MEDIA_ERROR: 'mediaError',
    OTHER_ERROR: 'otherError'
  },
  ErrorDetails: {
    FRAG_LOAD_ERROR: 'fragLoadError',
    FRAG_LOAD_TIMEOUT: 'fragLoadTimeout',
    BUFFER_STALLED_ERROR: 'bufferStalledError'
  }
};

// Mock video element
global.HTMLVideoElement = class MockVideoElement {
  constructor() {
    this.currentTime = 0;
    this.duration = 100;
    this.buffered = {
      length: 1,
      start: () => 0,
      end: () => 30
    };
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.play = jest.fn(() => Promise.resolve());
    this.pause = jest.fn();
    this.load = jest.fn();
  }
};

// Mock window.location
delete window.location;
window.location = {
  reload: jest.fn(),
  href: 'http://localhost:3000'
};

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes?.('Warning:')) {
    return;
  }
  originalWarn(...args);
};