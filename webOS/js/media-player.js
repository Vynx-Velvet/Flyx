/**
 * TV Media Player for WebOS with Real HLS Support
 * Handles actual media playback from VM extractor streams
 * ES5 Compatible
 */

function TVMediaPlayer() {
    this.isPlaying = false;
    this.currentMedia = null;
    this.videoElement = null;
    this.hls = null;
    this.isInitialized = false;
    this.isFullscreen = false;
    this.currentTime = 0;
    this.duration = 0;
    
    this.init();
}

TVMediaPlayer.prototype.init = function() {
    console.log('🎬 TV Media Player initializing with HLS support...');
    
    // Check for HLS.js availability
    this.hlsSupported = typeof Hls !== 'undefined' && Hls.isSupported();
    console.log('📺 HLS.js support:', this.hlsSupported);
    
    this.isInitialized = true;
    console.log('✅ TV Media Player initialized');
};

TVMediaPlayer.prototype.loadMedia = function(mediaInfo) {
    var self = this;
    
    console.log('🎬 Loading real media stream:', {
        title: mediaInfo.title,
        streamUrl: mediaInfo.streamUrl ? mediaInfo.streamUrl.substring(0, 100) + '...' : 'none',
        quality: mediaInfo.quality,
        server: mediaInfo.server
    });
    
    this.currentMedia = mediaInfo;
    
    // Check if we have a valid stream URL
    if (!mediaInfo.streamUrl) {
        console.warn('❌ No stream URL provided, showing error');
        this.showError('No stream URL available for playback');
        return;
    }
    
    console.log('✅ Stream URL received:', {
        hasUrl: !!mediaInfo.streamUrl,
        urlLength: mediaInfo.streamUrl.length,
        urlType: typeof mediaInfo.streamUrl,
        startsWithHttp: mediaInfo.streamUrl.startsWith('http'),
        isM3U8: mediaInfo.streamUrl.includes('.m3u8')
    });
    
    // Create real video player
    this.showVideoPlayer(mediaInfo);
};

TVMediaPlayer.prototype.showVideoPlayer = function(mediaInfo) {
    var self = this;
    
    console.log('🎬 Showing real video player for:', mediaInfo.title);
    
    // Remove any existing player
    this.closeVideoPlayer();
    
    // Create real video player modal
    var playerHTML = this.createVideoPlayerHTML(mediaInfo);
    document.body.insertAdjacentHTML('beforeend', playerHTML);
    
    // Get video element
    this.videoElement = document.getElementById('real-video-player');
    
    if (!this.videoElement) {
        console.error('❌ Video element not found');
        this.showError('Failed to create video player');
        return;
    }
    
    // Set up video player controls and events
    this.setupVideoPlayerControls();
    
    // Show demo notification if needed
    if (mediaInfo.isDemoData) {
        this.showDemoNotification(mediaInfo);
    }
    
    // Load the stream
    this.loadStream(mediaInfo.streamUrl);
    
    // Show controls overlay initially
    this.showPlayerOverlay();
    
    // Auto-hide controls after 5 seconds
    var self = this;
    setTimeout(function() {
        self.hidePlayerOverlay();
    }, 5000);
    
    // Activate media player navigation mode
    if (window.simpleNavigation) {
        window.simpleNavigation.setMediaPlayerMode(true);
        console.log('🎬 Video player active - simple navigation media mode activated');
    } else {
        console.log('🎬 Video player active - no navigation system found');
    }
};

TVMediaPlayer.prototype.createVideoPlayerHTML = function(mediaInfo) {
    var html = '<div id="video-player-overlay" class="video-player-overlay">';
    html += '<div class="video-player-container">';
    
    // Video element (main content) - NO NATIVE CONTROLS
    html += '<video id="real-video-player" class="real-video-player" ';
    html += 'preload="metadata" autoplay ';
    html += 'poster="' + (mediaInfo.poster || '') + '">';
    html += '<p>Your browser does not support the video tag.</p>';
    html += '</video>';
    
    // Loading overlay
    html += '<div id="video-loading" class="video-loading-overlay">';
    html += '<div class="video-loading-content">';
    html += '<div class="video-loading-spinner"></div>';
    html += '<h3>Loading Stream...</h3>';
    html += '<p class="loading-url">Connecting to: ' + (mediaInfo.server || 'Stream Server') + '</p>';
    html += '</div>';
    html += '</div>';
    
    // Player overlay controls (for TV remote)
    html += '<div id="player-overlay" class="player-overlay hidden">';
    html += '<div class="player-overlay-header">';
    html += '<div class="player-title-section">';
    html += '<h2 class="player-title">' + mediaInfo.title + '</h2>';
    if (mediaInfo.episodeInfo) {
        html += '<p class="player-episode">S' + mediaInfo.episodeInfo.season + 'E' + mediaInfo.episodeInfo.episode + '</p>';
    }
    html += '<p class="player-navigation-hint">🎮 Use arrow keys to control playback</p>';
    html += '</div>';
    html += '<button class="player-close-btn" onclick="tvMediaPlayer.closeVideoPlayer()">&times;</button>';
    html += '</div>';
    
    // Progress bar
    html += '<div class="player-progress-container">';
    html += '<div class="player-progress-bar">';
    html += '<div class="player-progress-fill" style="width: 0%;"></div>';
    html += '</div>';
    html += '<div class="player-time-display">';
    html += '<span class="player-current-time">0:00</span>';
    html += '<span class="player-total-time">0:00</span>';
    html += '</div>';
    html += '</div>';
    
    // Control buttons
    html += '<div class="player-controls">';
    html += '<button class="player-control-btn" onclick="tvMediaPlayer.seekBackward()">⏪ -10s</button>';
    html += '<button class="player-control-btn player-play-btn" onclick="tvMediaPlayer.togglePlayPause()">';
    html += '<span id="player-play-icon">⏸️</span>';
    html += '</button>';
    html += '<button class="player-control-btn" onclick="tvMediaPlayer.seekForward()">⏩ +10s</button>';
    html += '</div>';
    
    // Stream info
    html += '<div class="player-info">';
    html += '<p class="stream-quality">Quality: ' + (mediaInfo.quality || 'HD') + '</p>';
    html += '<p class="stream-server">Server: ' + (mediaInfo.server || 'Unknown') + '</p>';
    if (mediaInfo.vmInfo && mediaInfo.vmInfo.requestId) {
        html += '<p class="stream-id">Stream ID: ' + mediaInfo.vmInfo.requestId + '</p>';
    }
    html += '</div>';
    
    html += '</div>'; // player-overlay
    
    // Error overlay
    html += '<div id="video-error" class="video-error-overlay hidden">';
    html += '<div class="video-error-content">';
    html += '<h3>❌ Playback Error</h3>';
    html += '<p id="error-message-text">Failed to load stream</p>';
    html += '<button class="error-retry-btn" onclick="tvMediaPlayer.retryStream()">Retry</button>';
    html += '<button class="error-close-btn" onclick="tvMediaPlayer.closeVideoPlayer()">Close</button>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>'; // player-overlay
    
    // Demo notification overlay
    html += '<div id="demo-notification" class="demo-notification-overlay hidden">';
    html += '<div class="demo-notification-content">';
    html += '<h3>🎬 Demo Mode Active</h3>';
    html += '<p>You\'re viewing demonstration content with working video streams.</p>';
    html += '<p>In production, this would show content from your VM extractor service.</p>';
    html += '<button class="demo-notification-close" onclick="tvMediaPlayer.hideDemoNotification()">Got It</button>';
    html += '</div>';
    html += '</div>';
    
    html += '</div></div>';
    
    return html;
};

// Load HLS stream into video element
TVMediaPlayer.prototype.loadStream = function(streamUrl) {
    var self = this;
    
    console.log('🎬 Loading HLS stream:', streamUrl);
    
    if (!this.videoElement) {
        console.error('❌ Video element not available');
        this.showVideoError('Video player not initialized');
        return;
    }
    
    // Show loading overlay
    this.showVideoLoading(true);
    
    // Check if stream URL is valid - less strict validation
    if (!streamUrl || typeof streamUrl !== 'string' || streamUrl.length < 5) {
        console.error('❌ Invalid stream URL:', streamUrl);
        this.showVideoError('Invalid stream URL provided');
        return;
    }
    
    console.log('✅ Stream URL validation passed:', {
        url: streamUrl.substring(0, 100) + (streamUrl.length > 100 ? '...' : ''),
        length: streamUrl.length,
        type: typeof streamUrl
    });
    
    try {
        // Check if HLS.js is supported and needed
        if (this.hlsSupported && streamUrl.includes('.m3u8')) {
            console.log('📺 Using HLS.js for M3U8 stream');
            this.loadHLSStream(streamUrl);
        } else if (this.videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('📺 Using native HLS support');
            this.loadNativeStream(streamUrl);
        } else {
            console.log('📺 Loading as direct video source');
            this.loadDirectStream(streamUrl);
        }
    } catch (error) {
        console.error('❌ Error loading stream:', error);
        this.showVideoError('Failed to load stream: ' + error.message);
    }
};

// Load stream using HLS.js
TVMediaPlayer.prototype.loadHLSStream = function(streamUrl) {
    var self = this;
    
    console.log('📺 Initializing HLS.js for stream');
    
    // Clean up existing HLS instance
    if (this.hls) {
        this.hls.destroy();
        this.hls = null;
    }
    
    this.hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
    });
    
    this.hls.loadSource(streamUrl);
    this.hls.attachMedia(this.videoElement);
    
    this.hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('✅ HLS manifest parsed successfully');
        self.showVideoLoading(false);
        
        // Hide any error overlays since stream is working
        var errorOverlay = document.getElementById('video-error');
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
        }
        
        self.videoElement.play().catch(function(error) {
            console.warn('Auto-play prevented (this is normal):', error.message);
        });
    });
    
    this.hls.on(Hls.Events.ERROR, function(event, data) {
        console.warn('⚠️ HLS Error event:', data);
        
        if (data.fatal) {
            console.error('❌ Fatal HLS Error:', data);
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('🔄 Network error, attempting recovery...');
                    setTimeout(function() {
                        if (self.hls) {
                            self.hls.startLoad();
                        }
                    }, 1000);
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('🔄 Media error, attempting recovery...');
                    setTimeout(function() {
                        if (self.hls) {
                            self.hls.recoverMediaError();
                        }
                    }, 1000);
                    break;
                default:
                    console.error('💥 Fatal HLS error - checking if stream is actually working...');
                    // Don't immediately show error - check if audio is actually playing
                    setTimeout(function() {
                        if (self.videoElement && !self.isPlaying && self.videoElement.paused) {
                            console.error('💥 Stream confirmed not working, trying fallback...');
                            if (self.hls) {
                                self.hls.destroy();
                                self.hls = null;
                            }
                            self.tryFallbackStream();
                        } else {
                            console.log('✅ Stream working despite HLS error - continuing playback');
                        }
                    }, 2000);
                    break;
            }
        } else {
            // Non-fatal error - just log it
            console.log('ℹ️ Non-fatal HLS error (stream should continue):', data.details);
        }
    });
};

// Try fallback stream if primary fails
TVMediaPlayer.prototype.tryFallbackStream = function() {
    var self = this;
    
    if (this.currentMedia && this.currentMedia.fallbackUrl) {
        console.log('🔄 Trying fallback stream:', this.currentMedia.fallbackUrl);
        
        // Show loading again
        this.showVideoLoading(true);
        
        // Try loading fallback as direct video
        this.loadDirectStream(this.currentMedia.fallbackUrl);
    } else {
        this.showVideoError('Stream playback failed - no fallback available');
    }
};

// Load stream using native browser support
TVMediaPlayer.prototype.loadNativeStream = function(streamUrl) {
    var self = this;
    
    console.log('📺 Using native HLS support');
    
    this.videoElement.src = streamUrl;
    this.videoElement.load();
    
    this.videoElement.addEventListener('loadedmetadata', function() {
        console.log('✅ Native stream loaded successfully');
        self.showVideoLoading(false);
    });
    
    this.videoElement.addEventListener('error', function(e) {
        console.warn('⚠️ Native video error event:', e);
        
        // Wait before showing error to see if stream recovers
        setTimeout(function() {
            if (self.videoElement && self.videoElement.error && !self.isPlaying) {
                console.error('❌ Persistent native video error:', self.videoElement.error);
                self.showVideoError('Video playback error');
            } else {
                console.log('✅ Native video error resolved - stream is working');
            }
        }, 3000);
    });
};

// Load stream as direct video source
TVMediaPlayer.prototype.loadDirectStream = function(streamUrl) {
    var self = this;
    
    console.log('📺 Loading as direct video source');
    
    this.videoElement.src = streamUrl;
    this.videoElement.load();
    
    this.videoElement.addEventListener('loadedmetadata', function() {
        console.log('✅ Direct stream loaded successfully');
        self.showVideoLoading(false);
    });
    
    this.videoElement.addEventListener('error', function(e) {
        console.warn('⚠️ Direct video error event:', e);
        
        // Wait before showing error to see if stream recovers
        setTimeout(function() {
            if (self.videoElement && self.videoElement.error && !self.isPlaying) {
                console.error('❌ Persistent direct video error:', self.videoElement.error);
                self.showVideoError('Video source not supported');
            } else {
                console.log('✅ Direct video error resolved - stream is working');
            }
        }, 3000);
    });
};

// Set up video player controls and event handlers
TVMediaPlayer.prototype.setupVideoPlayerControls = function() {
    var self = this;
    
    if (!this.videoElement) {
        console.error('❌ Cannot setup controls - video element not found');
        return;
    }
    
    console.log('🎬 Setting up video player controls');
    
    // Video event listeners
    this.videoElement.addEventListener('loadstart', function() {
        console.log('📺 Video load started');
    });
    
    this.videoElement.addEventListener('loadedmetadata', function() {
        console.log('📺 Video metadata loaded');
        self.duration = self.videoElement.duration;
        self.updateTimeDisplay();
    });
    
    this.videoElement.addEventListener('canplay', function() {
        console.log('✅ Video can start playing - stream is working!');
        self.showVideoLoading(false);
        
        // Hide any error overlays since video can play
        var errorOverlay = document.getElementById('video-error');
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
            errorOverlay.style.display = 'none';
        }
    });
    
    this.videoElement.addEventListener('playing', function() {
        console.log('✅ Video started playing successfully!');
        self.isPlaying = true;
        self.updatePlayButton();
        
        // Hide any error overlays since video is now playing
        var errorOverlay = document.getElementById('video-error');
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
            errorOverlay.style.display = 'none';
        }
        
        // Also hide loading overlay
        self.showVideoLoading(false);
    });
    
    this.videoElement.addEventListener('pause', function() {
        console.log('📺 Video paused');
        self.isPlaying = false;
        self.updatePlayButton();
    });
    
    this.videoElement.addEventListener('timeupdate', function() {
        self.currentTime = self.videoElement.currentTime;
        self.updateProgress();
        self.updateTimeDisplay();
    });
    
    this.videoElement.addEventListener('ended', function() {
        console.log('📺 Video playback ended');
        self.isPlaying = false;
        self.updatePlayButton();
    });
    
    this.videoElement.addEventListener('error', function(e) {
        // Don't show error immediately - could be temporary
        console.warn('⚠️ Video element error event:', e);
        
        // Wait a bit to see if stream recovers
        setTimeout(function() {
            if (self.videoElement && self.videoElement.error && !self.isPlaying) {
                console.error('❌ Persistent video error after timeout:', self.videoElement.error);
                self.showVideoError('Video playback failed');
            } else {
                console.log('✅ Video error resolved - stream is working');
            }
        }, 3000); // Wait 3 seconds before showing error
    });
    
    // Integration with our navigation system - NO separate key handling
    // All key handling is now done through simpleNavigation in media player mode
    
    // Mouse movement (show/hide controls)
    var overlayTimeout;
    document.addEventListener('mousemove', function() {
        if (document.getElementById('video-player-overlay')) {
            self.showPlayerOverlay();
            clearTimeout(overlayTimeout);
            overlayTimeout = setTimeout(function() {
                self.hidePlayerOverlay();
            }, 3000);
        }
    });
    
    // Touch/click events for mobile
    if (this.videoElement) {
        this.videoElement.addEventListener('click', function() {
            self.togglePlayPause();
        });
    }
    
    console.log('✅ Video player controls setup complete');
};

TVMediaPlayer.prototype.setupDemoPlayerControls = function() {
    var self = this;
    
    // Handle remote control keys
    document.addEventListener('remotekeypress', function(event) {
        if (document.getElementById('demo-player')) {
            self.handleDemoPlayerKeys(event.detail);
        }
    });
    
    // Handle keyboard events as fallback
    document.addEventListener('keydown', function(event) {
        if (document.getElementById('demo-player')) {
            switch (event.keyCode) {
                case 32: // Space
                case 13: // Enter
                    event.preventDefault();
                    self.togglePlayPause();
                    break;
                case 27: // Escape
                    event.preventDefault();
                    self.closeDemoPlayer();
                    break;
                case 37: // Left arrow
                    event.preventDefault();
                    self.rewind();
                    break;
                case 39: // Right arrow
                    event.preventDefault();
                    self.fastForward();
                    break;
            }
        }
    });
};

TVMediaPlayer.prototype.handleDemoPlayerKeys = function(keyDetail) {
    switch (keyDetail.keyName) {
        case 'PLAY':
        case 'PAUSE':
            this.togglePlayPause();
            break;
        case 'STOP':
            this.stop();
            break;
        case 'REWIND':
            this.rewind();
            break;
        case 'FORWARD':
            this.fastForward();
            break;
        case 'BACK':
        case 'EXIT':
            this.closeDemoPlayer();
            break;
    }
};

TVMediaPlayer.prototype.togglePlayPause = function() {
    var playIcon = document.getElementById('demo-play-icon');
    var playText = document.getElementById('demo-play-text');
    
    if (this.isPlaying) {
        this.pause();
        if (playIcon) playIcon.textContent = '▶️';
        if (playText) playText.textContent = 'Play';
    } else {
        this.play();
        if (playIcon) playIcon.textContent = '⏸️';
        if (playText) playText.textContent = 'Pause';
    }
};

TVMediaPlayer.prototype.play = function() {
    this.isPlaying = true;
    console.log('Demo player: Playing');
    
    // Update UI
    this.updateDemoStatus('Playing...');
};

TVMediaPlayer.prototype.pause = function() {
    this.isPlaying = false;
    console.log('Demo player: Paused');
    
    // Update UI
    this.updateDemoStatus('Paused');
};

TVMediaPlayer.prototype.stop = function() {
    this.isPlaying = false;
    console.log('Demo player: Stopped');
    
    // Update UI
    this.updateDemoStatus('Stopped');
    
    // Close player after short delay
    var self = this;
    setTimeout(function() {
        self.closeDemoPlayer();
    }, 1000);
};

TVMediaPlayer.prototype.rewind = function() {
    console.log('Demo player: Rewinding');
    this.updateDemoStatus('Rewinding...');
    
    // Animate progress bar (demo)
    var progressFill = document.querySelector('.demo-progress-fill');
    if (progressFill) {
        var currentWidth = parseInt(progressFill.style.width) || 35;
        var newWidth = Math.max(0, currentWidth - 10);
        progressFill.style.width = newWidth + '%';
    }
};

TVMediaPlayer.prototype.fastForward = function() {
    console.log('Demo player: Fast forwarding');
    this.updateDemoStatus('Fast forwarding...');
    
    // Animate progress bar (demo)
    var progressFill = document.querySelector('.demo-progress-fill');
    if (progressFill) {
        var currentWidth = parseInt(progressFill.style.width) || 35;
        var newWidth = Math.min(100, currentWidth + 10);
        progressFill.style.width = newWidth + '%';
    }
};

TVMediaPlayer.prototype.updateDemoStatus = function(status) {
    var statusElement = document.querySelector('.demo-status');
    if (statusElement) {
        statusElement.innerHTML = '🟢 ' + status;
    }
};

TVMediaPlayer.prototype.closeDemoPlayer = function() {
    var demoPlayer = document.getElementById('demo-player');
    if (demoPlayer) {
        demoPlayer.remove();
    }
    
    this.isPlaying = false;
    this.currentMedia = null;
    
    // Restore navigation
    if (window.tvNavigation) {
        setTimeout(function() {
            window.tvNavigation.updateFocusableElements();
            window.tvNavigation.setInitialFocus();
        }, 200);
    }
    
    console.log('Demo player closed');
};

TVMediaPlayer.prototype.getCurrentMedia = function() {
    return this.currentMedia;
};

TVMediaPlayer.prototype.isPlayerPlaying = function() {
    return this.isPlaying;
};

// === REAL VIDEO PLAYER HELPER FUNCTIONS ===

TVMediaPlayer.prototype.showVideoLoading = function(show) {
    var loadingOverlay = document.getElementById('video-loading');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
};

TVMediaPlayer.prototype.showVideoError = function(message) {
    var errorOverlay = document.getElementById('video-error');
    var errorText = document.getElementById('error-message-text');
    
    if (errorOverlay) {
        errorOverlay.classList.remove('hidden');
        errorOverlay.style.display = 'flex';
    }
    
    if (errorText) {
        // Enhanced error message for demo mode
        if (this.currentMedia && this.currentMedia.isDemoData) {
            errorText.textContent = '🎬 Demo Mode: ' + message + '\n\nThis is demonstration content. In production, real streams would be loaded from your VM extractor.';
        } else {
            errorText.textContent = message;
        }
    }
    
    // Hide loading overlay
    this.showVideoLoading(false);
    
    console.error('🎬 Video Player Error:', message);
};

TVMediaPlayer.prototype.updatePlayButton = function() {
    var playIcon = document.getElementById('player-play-icon');
    if (playIcon) {
        playIcon.textContent = this.isPlaying ? '⏸️' : '▶️';
    }
};

TVMediaPlayer.prototype.updateProgress = function() {
    if (!this.videoElement || !this.duration) return;
    
    var progressFill = document.querySelector('.player-progress-fill');
    if (progressFill) {
        var percentage = (this.currentTime / this.duration) * 100;
        progressFill.style.width = percentage + '%';
    }
};

TVMediaPlayer.prototype.updateTimeDisplay = function() {
    var currentTimeElement = document.querySelector('.player-current-time');
    var totalTimeElement = document.querySelector('.player-total-time');
    
    if (currentTimeElement) {
        currentTimeElement.textContent = this.formatTime(this.currentTime);
    }
    
    if (totalTimeElement && this.duration) {
        totalTimeElement.textContent = this.formatTime(this.duration);
    }
};

TVMediaPlayer.prototype.formatTime = function(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return hours + ':' + (minutes < 10 ? '0' : '') + minutes + ':' + (secs < 10 ? '0' : '') + secs;
    } else {
        return minutes + ':' + (secs < 10 ? '0' : '') + secs;
    }
};

// Media player key handling now done through simpleNavigation system

TVMediaPlayer.prototype.showPlayerOverlay = function() {
    var overlay = document.getElementById('player-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
};

TVMediaPlayer.prototype.hidePlayerOverlay = function() {
    var overlay = document.getElementById('player-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
};

// Real video player controls (updated for actual video element)
TVMediaPlayer.prototype.togglePlayPause = function() {
    if (!this.videoElement) return;
    
    if (this.isPlaying) {
        this.videoElement.pause();
    } else {
        this.videoElement.play().catch(function(error) {
            console.warn('Play failed:', error.message);
        });
    }
};

TVMediaPlayer.prototype.seekBackward = function() {
    if (!this.videoElement) return;
    
    this.videoElement.currentTime = Math.max(0, this.videoElement.currentTime - 10);
    console.log('📺 Seeked backward 10 seconds');
};

TVMediaPlayer.prototype.seekForward = function() {
    if (!this.videoElement) return;
    
    this.videoElement.currentTime = Math.min(this.videoElement.duration, this.videoElement.currentTime + 10);
    console.log('📺 Seeked forward 10 seconds');
};



TVMediaPlayer.prototype.retryStream = function() {
    console.log('🔄 Retrying stream...');
    
    if (this.currentMedia && this.currentMedia.streamUrl) {
        // Hide error overlay
        var errorOverlay = document.getElementById('video-error');
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
        }
        
        // Retry loading the stream
        this.loadStream(this.currentMedia.streamUrl);
    } else {
        console.error('❌ No stream URL available for retry');
        this.showVideoError('No stream available to retry');
    }
};

TVMediaPlayer.prototype.closeVideoPlayer = function() {
    console.log('🎬 Closing video player and clearing ALL state');
    
    // Clean up HLS instance
    if (this.hls) {
        this.hls.destroy();
        this.hls = null;
    }
    
    // Stop video playback
    if (this.videoElement) {
        this.videoElement.pause();
        this.videoElement.src = '';
        this.videoElement = null;
    }
    
    // Remove player overlay
    var playerOverlay = document.getElementById('video-player-overlay');
    if (playerOverlay) {
        playerOverlay.remove();
    }
    
    // CRITICAL: Reset ALL state to prevent automatic fetching
    this.isPlaying = false;
    this.currentMedia = null;
    this.currentTime = 0;
    this.duration = 0;
    this.isFullscreen = false;
    this.isInitialized = false;
    
    // Clear any pending media requests or cached data
    if (window.FlyxApp) {
        // Clear any cached stream info that might trigger refetching
        console.log('🗑️ Clearing cached media state in FlyxApp');
        
        // CRITICAL: Clear any streaming loading states
        console.log('🗑️ Clearing streaming loading state');
        window.FlyxApp.setStreamingLoadingState(false);
        
        // DON'T restore modal state here - let the back button handler do it
        // This prevents race conditions and ensures proper timing
        console.log('💾 Modal state preserved for back button restoration');
    }
    
    // Deactivate media player navigation mode
    if (window.simpleNavigation) {
        window.simpleNavigation.setMediaPlayerMode(false);
        console.log('🔓 Video player closed - simple navigation restored');
    } else {
        console.log('🔓 Video player closed - no navigation system found');
    }
    
    console.log('✅ Video player closed successfully - modal state should be restored');
};

TVMediaPlayer.prototype.showError = function(message) {
    console.error('🎬 Media Player Error:', message);
    // Fallback error display if video player UI not available
    alert('Media Player Error: ' + message);
};

// Demo notification functions
TVMediaPlayer.prototype.showDemoNotification = function(mediaInfo) {
    var notification = document.getElementById('demo-notification');
    if (notification && mediaInfo.isDemoData) {
        console.log('🎬 Showing demo mode notification');
        notification.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(function() {
            notification.classList.add('hidden');
        }, 5000);
    }
};

TVMediaPlayer.prototype.hideDemoNotification = function() {
    var notification = document.getElementById('demo-notification');
    if (notification) {
        notification.classList.add('hidden');
    }
};

// Initialize TV Media Player
window.tvMediaPlayer = new TVMediaPlayer();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TVMediaPlayer;
} 