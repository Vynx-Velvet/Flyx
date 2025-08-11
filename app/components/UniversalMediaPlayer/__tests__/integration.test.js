/**
 * Integration Tests for End-to-End Playback Flow
 * Tests complete flow from extraction to display
 * Requirements: All requirements - integration testing
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UniversalMediaPlayer } from '../index.js';

// Mock the hooks
jest.mock('../hooks/useStream.js');
jest.mock('../hooks/useHls.js');
jest.mock('../hooks/useSubtitles.js');
jest.mock('../../hooks/useErrorHandling.js');

// Mock fetch for API calls
global.fetch = jest.fn();

describe('UniversalMediaPlayer Integration Tests', () => {
  let mockUseStream, mockUseHls, mockUseSubtitles, mockUseErrorHandling;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup hook mocks
    const { useStream } = require('../hooks/useStream.js');
    const { useHls } = require('../hooks/useHls.js');
    const { useSubtitles } = require('../hooks/useSubtitles.js');
    const { useErrorHandling } = require('../../hooks/useErrorHandling.js');

    mockUseStream = useStream;
    mockUseHls = useHls;
    mockUseSubtitles = useSubtitles;
    mockUseErrorHandling = useErrorHandling;

    // Default mock implementations
    mockUseStream.mockReturnValue({
      streamUrl: null,
      isLoading: false,
      error: null,
      extractStream: jest.fn(),
      retryExtraction: jest.fn()
    });

    mockUseHls.mockReturnValue({
      hlsInstance: null,
      isReady: false,
      qualities: [],
      currentQuality: null,
      bufferHealth: 0,
      isBuffering: false,
      error: null,
      initializeHls: jest.fn(),
      changeQuality: jest.fn(),
      destroy: jest.fn()
    });

    mockUseSubtitles.mockReturnValue({
      subtitles: [],
      currentSubtitle: null,
      isLoading: false,
      error: null,
      loadSubtitles: jest.fn(),
      changeLanguage: jest.fn(),
      getCurrentCue: jest.fn(() => null)
    });

    mockUseErrorHandling.mockReturnValue({
      handleError: jest.fn(),
      clearErrors: jest.fn(),
      retryLastAction: jest.fn()
    });

    // Mock fetch responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        streamUrl: 'https://example.com/stream.m3u8',
        subtitles: [
          {
            id: 'en',
            language: 'English',
            languageCode: 'en',
            blobUrl: 'blob:subtitle-url'
          }
        ]
      })
    });
  });

  describe('Complete Playback Flow', () => {
    test('should complete full extraction to playback flow', async () => {
      const user = userEvent.setup();
      
      // Mock successful stream extraction
      mockUseStream.mockReturnValue({
        streamUrl: 'https://example.com/stream.m3u8',
        isLoading: false,
        error: null,
        extractStream: jest.fn().mockResolvedValue({
          success: true,
          streamUrl: 'https://example.com/stream.m3u8'
        }),
        retryExtraction: jest.fn()
      });

      // Mock successful HLS initialization
      const mockHlsInstance = {
        loadSource: jest.fn(),
        attachMedia: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
        levels: [
          { height: 1080, bitrate: 5000000 },
          { height: 720, bitrate: 2500000 },
          { height: 480, bitrate: 1000000 }
        ],
        currentLevel: 0
      };

      mockUseHls.mockReturnValue({
        hlsInstance: mockHlsInstance,
        isReady: true,
        qualities: [
          { id: 0, height: 1080, label: '1080p' },
          { id: 1, height: 720, label: '720p' },
          { id: 2, height: 480, label: '480p' }
        ],
        currentQuality: { id: 0, height: 1080, label: '1080p' },
        bufferHealth: 85,
        isBuffering: false,
        error: null,
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: jest.fn()
      });

      // Mock successful subtitle loading
      mockUseSubtitles.mockReturnValue({
        subtitles: [
          {
            id: 'en',
            language: 'English',
            languageCode: 'en',
            blobUrl: 'blob:subtitle-url'
          },
          {
            id: 'es',
            language: 'Spanish',
            languageCode: 'es',
            blobUrl: 'blob:subtitle-url-es'
          }
        ],
        currentSubtitle: {
          id: 'en',
          language: 'English',
          languageCode: 'en',
          blobUrl: 'blob:subtitle-url'
        },
        isLoading: false,
        error: null,
        loadSubtitles: jest.fn(),
        changeLanguage: jest.fn(),
        getCurrentCue: jest.fn(() => ({
          start: 1.0,
          end: 3.0,
          text: 'Hello, world!'
        }))
      });

      const props = {
        movieId: 'test-movie-123',
        seasonId: null,
        episodeId: null,
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      // Verify initial loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      // Wait for stream extraction to complete
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify video element is present
      const videoElement = screen.getByRole('video', { hidden: true });
      expect(videoElement).toBeInTheDocument();

      // Verify quality selector is available
      const qualityButton = screen.getByText('1080p');
      expect(qualityButton).toBeInTheDocument();

      // Test quality change
      await user.click(qualityButton);
      const quality720p = screen.getByText('720p');
      await user.click(quality720p);

      expect(mockUseHls().changeQuality).toHaveBeenCalledWith(1);

      // Verify subtitle display
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();

      // Test subtitle language change
      const subtitleButton = screen.getByText('English');
      await user.click(subtitleButton);
      const spanishOption = screen.getByText('Spanish');
      await user.click(spanishOption);

      expect(mockUseSubtitles().changeLanguage).toHaveBeenCalledWith('es');

      // Verify buffer health indicator
      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    test('should handle extraction failure and retry', async () => {
      const user = userEvent.setup();
      
      // Mock failed extraction initially
      const mockExtractStream = jest.fn()
        .mockRejectedValueOnce(new Error('Extraction failed'))
        .mockResolvedValueOnce({
          success: true,
          streamUrl: 'https://example.com/stream.m3u8'
        });

      mockUseStream.mockReturnValue({
        streamUrl: null,
        isLoading: false,
        error: new Error('Extraction failed'),
        extractStream: mockExtractStream,
        retryExtraction: jest.fn().mockImplementation(() => {
          return mockExtractStream();
        })
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      // Verify error state
      expect(screen.getByText(/extraction failed/i)).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      // Verify retry was called
      expect(mockUseStream().retryExtraction).toHaveBeenCalled();
    });

    test('should handle HLS playback errors with recovery', async () => {
      const user = userEvent.setup();
      
      // Mock HLS error scenario
      const mockHandleError = jest.fn();
      mockUseErrorHandling.mockReturnValue({
        handleError: mockHandleError,
        clearErrors: jest.fn(),
        retryLastAction: jest.fn()
      });

      mockUseHls.mockReturnValue({
        hlsInstance: null,
        isReady: false,
        qualities: [],
        currentQuality: null,
        bufferHealth: 0,
        isBuffering: false,
        error: {
          type: 'networkError',
          details: 'fragLoadError',
          fatal: true
        },
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: jest.fn()
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      // Verify error handling was called
      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'networkError',
            details: 'fragLoadError'
          }),
          expect.any(Object)
        );
      });
    });

    test('should handle subtitle loading errors gracefully', async () => {
      mockUseSubtitles.mockReturnValue({
        subtitles: [],
        currentSubtitle: null,
        isLoading: false,
        error: new Error('Failed to load subtitles'),
        loadSubtitles: jest.fn(),
        changeLanguage: jest.fn(),
        getCurrentCue: jest.fn(() => null)
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      // Should still render player without subtitles
      expect(screen.getByRole('video', { hidden: true })).toBeInTheDocument();
      
      // Should show subtitle error indicator
      expect(screen.getByText(/subtitle.*error/i)).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    test('should handle play/pause interactions', async () => {
      const user = userEvent.setup();
      
      // Mock video element methods
      const mockPlay = jest.fn(() => Promise.resolve());
      const mockPause = jest.fn();
      
      // Mock successful setup
      mockUseStream.mockReturnValue({
        streamUrl: 'https://example.com/stream.m3u8',
        isLoading: false,
        error: null,
        extractStream: jest.fn(),
        retryExtraction: jest.fn()
      });

      mockUseHls.mockReturnValue({
        hlsInstance: { destroy: jest.fn() },
        isReady: true,
        qualities: [],
        currentQuality: null,
        bufferHealth: 50,
        isBuffering: false,
        error: null,
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: jest.fn()
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      const videoElement = screen.getByRole('video', { hidden: true });
      videoElement.play = mockPlay;
      videoElement.pause = mockPause;

      // Test play button
      const playButton = screen.getByLabelText(/play/i);
      await user.click(playButton);

      expect(mockPlay).toHaveBeenCalled();

      // Simulate video playing state
      fireEvent(videoElement, new Event('play'));

      // Test pause button
      const pauseButton = screen.getByLabelText(/pause/i);
      await user.click(pauseButton);

      expect(mockPause).toHaveBeenCalled();
    });

    test('should handle volume control', async () => {
      const user = userEvent.setup();
      
      mockUseStream.mockReturnValue({
        streamUrl: 'https://example.com/stream.m3u8',
        isLoading: false,
        error: null,
        extractStream: jest.fn(),
        retryExtraction: jest.fn()
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      const volumeSlider = screen.getByLabelText(/volume/i);
      
      // Test volume change
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      const videoElement = screen.getByRole('video', { hidden: true });
      expect(videoElement.volume).toBe(0.5);
    });

    test('should handle fullscreen toggle', async () => {
      const user = userEvent.setup();
      
      // Mock fullscreen API
      const mockRequestFullscreen = jest.fn();
      const mockExitFullscreen = jest.fn();
      
      document.documentElement.requestFullscreen = mockRequestFullscreen;
      document.exitFullscreen = mockExitFullscreen;
      
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true
      });

      mockUseStream.mockReturnValue({
        streamUrl: 'https://example.com/stream.m3u8',
        isLoading: false,
        error: null,
        extractStream: jest.fn(),
        retryExtraction: jest.fn()
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      render(<UniversalMediaPlayer {...props} />);

      const fullscreenButton = screen.getByLabelText(/fullscreen/i);
      await user.click(fullscreenButton);

      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should cleanup resources on unmount', () => {
      const mockDestroy = jest.fn();
      const mockUnregisterBlobUrl = jest.fn();

      mockUseHls.mockReturnValue({
        hlsInstance: { destroy: mockDestroy },
        isReady: true,
        qualities: [],
        currentQuality: null,
        bufferHealth: 50,
        isBuffering: false,
        error: null,
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: mockDestroy
      });

      mockUseSubtitles.mockReturnValue({
        subtitles: [
          {
            id: 'en',
            blobUrl: 'blob:subtitle-url'
          }
        ],
        currentSubtitle: null,
        isLoading: false,
        error: null,
        loadSubtitles: jest.fn(),
        changeLanguage: jest.fn(),
        getCurrentCue: jest.fn(() => null),
        cleanup: mockUnregisterBlobUrl
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      const { unmount } = render(<UniversalMediaPlayer {...props} />);

      unmount();

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockUnregisterBlobUrl).toHaveBeenCalled();
    });

    test('should handle rapid prop changes without memory leaks', async () => {
      const mockDestroy = jest.fn();

      mockUseHls.mockReturnValue({
        hlsInstance: { destroy: mockDestroy },
        isReady: true,
        qualities: [],
        currentQuality: null,
        bufferHealth: 50,
        isBuffering: false,
        error: null,
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: mockDestroy
      });

      let props = {
        movieId: 'test-movie-1',
        title: 'Test Movie 1'
      };

      const { rerender } = render(<UniversalMediaPlayer {...props} />);

      // Rapidly change props
      for (let i = 2; i <= 10; i++) {
        props = {
          movieId: `test-movie-${i}`,
          title: `Test Movie ${i}`
        };
        rerender(<UniversalMediaPlayer {...props} />);
      }

      // Should have called destroy for each prop change
      expect(mockDestroy).toHaveBeenCalledTimes(9);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from network errors automatically', async () => {
      const mockRetryLastAction = jest.fn();
      
      mockUseErrorHandling.mockReturnValue({
        handleError: jest.fn(),
        clearErrors: jest.fn(),
        retryLastAction: mockRetryLastAction
      });

      // Start with network error
      mockUseHls.mockReturnValueOnce({
        hlsInstance: null,
        isReady: false,
        qualities: [],
        currentQuality: null,
        bufferHealth: 0,
        isBuffering: false,
        error: {
          type: 'networkError',
          details: 'fragLoadError',
          fatal: false
        },
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: jest.fn()
      });

      // Then return successful state
      mockUseHls.mockReturnValue({
        hlsInstance: { destroy: jest.fn() },
        isReady: true,
        qualities: [{ id: 0, height: 720, label: '720p' }],
        currentQuality: { id: 0, height: 720, label: '720p' },
        bufferHealth: 75,
        isBuffering: false,
        error: null,
        initializeHls: jest.fn(),
        changeQuality: jest.fn(),
        destroy: jest.fn()
      });

      const props = {
        movieId: 'test-movie-123',
        title: 'Test Movie'
      };

      const { rerender } = render(<UniversalMediaPlayer {...props} />);

      // Trigger re-render to simulate recovery
      rerender(<UniversalMediaPlayer {...props} />);

      await waitFor(() => {
        expect(screen.getByText('720p')).toBeInTheDocument();
      });
    });
  });
});