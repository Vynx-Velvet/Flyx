/**
 * WebOS Platform Handler
 * Manages WebOS-specific functionality and lifecycle
 * ES5 Compatible - No modern JavaScript features
 */

function WebOSPlatform() {
    this.isWebOS = false;
    this.deviceInfo = null;
    this.appLifecycleState = 'inactive';
    this.remoteKeyHandlers = {};
    this._mediaPlayerActive = false; // Track if media player is controlling input
    
    this.init();
}

WebOSPlatform.prototype.init = function() {
    var self = this;
    
    // Detect WebOS environment
    this.isWebOS = this.detectWebOSEnvironment();
    
    console.log('WebOS Platform Handler initializing...', {
        isWebOS: this.isWebOS,
        userAgent: navigator.userAgent
    });
    
    if (this.isWebOS) {
        this.initializeWebOSFeatures();
    }
    
    this.setupRemoteControlHandling();
    this.setupWebOSLifecycleEvents();
    
    console.log('WebOS Platform Handler initialized');
};

WebOSPlatform.prototype.detectWebOSEnvironment = function() {
    // Multiple ways to detect WebOS
    return !!(
        window.webOS || 
        window.PalmSystem || 
        navigator.userAgent.indexOf('webOS') !== -1 ||
        navigator.userAgent.indexOf('SmartTV') !== -1 ||
        navigator.userAgent.indexOf('Web0S') !== -1
    );
};

WebOSPlatform.prototype.initializeWebOSFeatures = function() {
    var self = this;
    
    try {
        // Set up WebOS library callbacks
        if (window.webOS) {
            // Device information
            if (window.webOS.deviceInfo) {
                window.webOS.deviceInfo(function(info) {
                    self.deviceInfo = info;
                    console.log('WebOS Device Info received:', info);
                });
            }
            
            // Platform back button handler
            if (window.webOS.platformBack) {
                window.webOS.platformBack = function() {
                    console.log('WebOS platform back button pressed');
                    self.handleBackButton();
                };
            }
        }
        
        // Handle launch parameters
        this.handleLaunchParameters();
        
        // Set up app lifecycle events
        this.setupWebOSLifecycleEvents();
        
    } catch (error) {
        console.error('Error initializing WebOS features:', error);
    }
};

WebOSPlatform.prototype.handleLaunchParameters = function() {
    try {
        if (window.PalmSystem && window.PalmSystem.launchParams) {
            var launchParams = window.PalmSystem.launchParams;
            if (launchParams && launchParams !== '{}') {
                var params = JSON.parse(launchParams);
                console.log('Launch parameters:', params);
                this.onLaunchParams(params);
            }
        }
    } catch (error) {
        console.warn('Error parsing launch parameters:', error);
    }
};

WebOSPlatform.prototype.onLaunchParams = function(params) {
    // Handle launch parameters
    if (params.contentId) {
        // Navigate to specific content
        console.log('Launching with content ID:', params.contentId);
    }
};

WebOSPlatform.prototype.setupWebOSLifecycleEvents = function() {
    var self = this;
    
    // App visibility change events
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            self.onAppPause();
        } else {
            self.onAppResume();
        }
    });
    
    // WebOS specific lifecycle events
    if (window.webOS) {
        document.addEventListener('webOSRelaunch', function(event) {
            console.log('WebOS app relaunch event:', event);
            self.onAppRelaunch(event.detail);
        });
    }
    
    // Window focus events
    window.addEventListener('focus', function() {
        self.onAppResume();
    });
    
    window.addEventListener('blur', function() {
        self.onAppPause();
    });
};

WebOSPlatform.prototype.setupRemoteControlHandling = function() {
    var self = this;
    
    // Define key mappings for WebOS remote
    this.keyMappings = {
        // Navigation
        37: 'LEFT',
        38: 'UP',
        39: 'RIGHT', 
        40: 'DOWN',
        13: 'ENTER',
        
        // WebOS specific keys
        8: 'BACK',
        27: 'EXIT',
        461: 'BACK',
        10009: 'BACK',
        10182: 'EXIT',
        
        // Color keys
        403: 'RED',
        404: 'GREEN',
        405: 'YELLOW',
        406: 'BLUE',
        
        // Media keys
        415: 'PLAY',
        19: 'PAUSE',
        413: 'STOP',
        417: 'FORWARD',
        412: 'REWIND',
        
        // Number keys
        48: '0', 49: '1', 50: '2', 51: '3', 52: '4',
        53: '5', 54: '6', 55: '7', 56: '8', 57: '9'
    };
    
    // Key event listeners
    document.addEventListener('keydown', function(event) {
        self.handleRemoteKeyPress(event);
    });
    
    document.addEventListener('keyup', function(event) {
        self.handleRemoteKeyRelease(event);
    });
};

WebOSPlatform.prototype.handleRemoteKeyPress = function(event) {
    var keyCode = event.keyCode;
    var keyName = this.keyMappings[keyCode];
    
    console.log('Remote key pressed:', {
        keyCode: keyCode,
        keyName: keyName,
        key: event.key
    });
    
    // Prevent default for navigation keys
    if (keyName && ['LEFT', 'RIGHT', 'UP', 'DOWN', 'ENTER', 'BACK', 'EXIT'].indexOf(keyName) !== -1) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Emit custom event for key handling
    this.emitRemoteKeyEvent('keypress', keyName, keyCode, event);
    
    // Handle specific keys
    switch (keyName) {
        case 'BACK':
            this.handleBackKey();
            break;
        case 'EXIT':
            this.handleExitKey();
            break;
        case 'RED':
        case 'GREEN':
        case 'YELLOW':
        case 'BLUE':
            this.handleColorKey(keyName.toLowerCase());
            break;
    }
};

WebOSPlatform.prototype.handleRemoteKeyRelease = function(event) {
    var keyCode = event.keyCode;
    var keyName = this.keyMappings[keyCode];
    
    this.emitRemoteKeyEvent('keyrelease', keyName, keyCode, event);
};

WebOSPlatform.prototype.emitRemoteKeyEvent = function(type, keyName, keyCode, originalEvent) {
    var customEvent = this.createCustomEvent('remote' + type, {
        keyName: keyName,
        keyCode: keyCode,
        originalEvent: originalEvent
    });
    
    document.dispatchEvent(customEvent);
};

WebOSPlatform.prototype.createCustomEvent = function(eventName, detail) {
    var event;
    try {
        event = new CustomEvent(eventName, { detail: detail });
    } catch (e) {
        // Fallback for older browsers
        event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventName, true, true, detail);
    }
    return event;
};

WebOSPlatform.prototype.handleBackKey = function() {
    console.log('Back key pressed');
    
    // CRITICAL: Check if media player is active first
    if (this._mediaPlayerActive) {
        console.log('🎮 WEBOS BACK KEY - MEDIA PLAYER ACTIVE - IGNORING');
        return false; // Do nothing, let media player handle it
    }
    
    // NEW: Let FlyxApp handle back navigation (includes modal restoration logic)
    if (window.FlyxApp && window.FlyxApp.handleBackNavigation) {
        console.log('🔄 WEBOS BACK KEY - Delegating to FlyxApp back navigation handler');
        window.FlyxApp.handleBackNavigation();
        return false;
    }
    
    // CRITICAL: Check if modal is active
    if (window.simpleNavigation && window.simpleNavigation.isModalActive) {
        console.log('🔙 WEBOS BACK KEY - Modal is active, closing modal');
        if (window.FlyxApp && window.FlyxApp.closeModal) {
            window.FlyxApp.closeModal();
        } else {
            window.simpleNavigation.closeModal();
        }
        return false;
    }
    
    // Fallback: Check for open modals directly in DOM
    var modal = document.getElementById('media-modal');
    if (modal && modal.style.display !== 'none') {
        console.log('🔙 WEBOS BACK KEY - Modal visible in DOM, closing modal');
        if (window.FlyxApp && window.FlyxApp.closeModal) {
            window.FlyxApp.closeModal();
        } else {
            modal.style.display = 'none';
        }
        return false;
    }
    
    // NEVER CLOSE THE APP - just ignore the back button
    console.log('🔙 WEBOS BACK KEY - No modal active, ignoring back button (app will not close)');
    return false;
};

WebOSPlatform.prototype.handleExitKey = function() {
    console.log('Exit key pressed - ignoring (app will not close)');
    // NEVER EXIT THE APP
    return false;
};

WebOSPlatform.prototype.handleColorKey = function(color) {
    console.log('Color key pressed:', color);
    
    var colorEvent = this.createCustomEvent('colorkey', { color: color });
    document.dispatchEvent(colorEvent);
};

WebOSPlatform.prototype.handlePlatformBack = function() {
    // Custom back navigation logic - but NEVER exit the app
    if (window.FlyxApp && window.FlyxApp.handleBackNavigation) {
        window.FlyxApp.handleBackNavigation();
    } else {
        // Just ignore - NEVER exit the app
        console.log('🔙 WEBOS PLATFORM BACK - Ignoring back button (app will not close)');
    }
};

WebOSPlatform.prototype.closeModal = function() {
    var modal = document.getElementById('media-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

WebOSPlatform.prototype.exitApplication = function() {
    // NEVER EXIT THE APP - completely disabled
    console.log('🚫 Exit application called but disabled - app will not close');
    return false;
};

WebOSPlatform.prototype.onAppPause = function() {
    if (this.appLifecycleState === 'active') {
        this.appLifecycleState = 'paused';
        console.log('App paused');
        
        var pauseEvent = this.createCustomEvent('apppause', {});
        document.dispatchEvent(pauseEvent);
    }
};

WebOSPlatform.prototype.onAppResume = function() {
    if (this.appLifecycleState !== 'active') {
        this.appLifecycleState = 'active';
        console.log('App resumed');
        
        var resumeEvent = this.createCustomEvent('appresume', {});
        document.dispatchEvent(resumeEvent);
    }
};

WebOSPlatform.prototype.onAppRelaunch = function(params) {
    console.log('App relaunched with params:', params);
    
    var relaunchEvent = this.createCustomEvent('apprelaunch', params);
    document.dispatchEvent(relaunchEvent);
};

WebOSPlatform.prototype.getDeviceInfo = function() {
    return this.deviceInfo;
};

WebOSPlatform.prototype.isWebOSDevice = function() {
    return this.isWebOS;
};

WebOSPlatform.prototype.getAppLifecycleState = function() {
    return this.appLifecycleState;
};

WebOSPlatform.prototype.handleBackButton = function() {
    console.log('WebOS platform back button pressed');
    
    // CRITICAL: Check if media player is active first
    if (this._mediaPlayerActive) {
        console.log('🎮 WEBOS PLATFORM BACK - MEDIA PLAYER ACTIVE - IGNORING');
        return false; // Do nothing, let media player handle it
    }
    
    // NEW: Let FlyxApp handle back navigation (includes modal restoration logic)
    if (window.FlyxApp && window.FlyxApp.handleBackNavigation) {
        console.log('🔄 WEBOS PLATFORM BACK - Delegating to FlyxApp back navigation handler');
        window.FlyxApp.handleBackNavigation();
        return false;
    }
    
    // CRITICAL: Check if modal is active
    if (window.simpleNavigation && window.simpleNavigation.isModalActive) {
        console.log('🔙 WEBOS PLATFORM BACK - Modal is active, closing modal');
        if (window.FlyxApp && window.FlyxApp.closeModal) {
            window.FlyxApp.closeModal();
        } else {
            window.simpleNavigation.closeModal();
        }
        return false;
    }
    
    // Fallback: Check for open modals directly in DOM
    var modal = document.getElementById('media-modal');
    if (modal && modal.style.display !== 'none') {
        console.log('🔙 WEBOS PLATFORM BACK - Modal visible in DOM, closing modal');
        if (window.FlyxApp && window.FlyxApp.closeModal) {
            window.FlyxApp.closeModal();
        } else {
            modal.style.display = 'none';
        }
        return false;
    }
    
    // NEVER CLOSE THE APP - just ignore the back button
    console.log('🔙 WEBOS PLATFORM BACK - No modal active, ignoring back button (app will not close)');
    return false;
};

// Initialize WebOS Platform Handler
window.webOSPlatform = new WebOSPlatform(); 