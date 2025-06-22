/**
 * Flyx TV Application
 * Main application controller for WebOS TV
 * ES5 Compatible
 */

function FlyxTVApplication() {
    this.currentPage = 'home';
    this.isInitialized = false;
    this.isLoading = false;
    this.contentCache = {};
    this.searchTimeout = null;
    this.errorTimeout = null;
    
    this.init();
}



FlyxTVApplication.prototype.init = function() {
    var self = this;
    
    console.log('Flyx TV Application initializing...');
    
    // Show splash screen
    this.showSplashScreen();
    
    // Wait for dependencies and DOM
    this.waitForDependencies()
        .then(function() {
            return self.initializeApplication();
        })
        .then(function() {
            return self.loadInitialContent();
        })
        .then(function() {
            self.hideSplashScreen();
            self.isInitialized = true;
            console.log('Flyx TV Application initialized successfully');
        })
        .catch(function(error) {
            console.error('Failed to initialize Flyx TV:', error);
            self.showError('Failed to initialize application. Please restart.');
        });
};

FlyxTVApplication.prototype.waitForDependencies = function() {
    return new Promise(function(resolve) {
        var checkCount = 0;
        var maxChecks = 30; // Reduced from 50
        
        function checkDependencies() {
            var webOSReady = window.webOSPlatform && typeof window.webOSPlatform.isWebOSDevice === 'function';
            var apiReady = window.apiClient && typeof window.apiClient.getTrendingToday === 'function';
            var navReady = true; // No navigation dependencies needed
            
            console.log('🔍 Dependency check #' + (checkCount + 1) + ':', {
                webOSReady: webOSReady,
                apiReady: apiReady,
                navReady: navReady,
                windowApiClient: !!window.apiClient,
                apiClientType: typeof window.apiClient,
                hasTrendingToday: window.apiClient ? typeof window.apiClient.getTrendingToday : 'no apiClient'
            });
            
            if (webOSReady && apiReady && navReady) {
                console.log('✅ All dependencies loaded successfully');
                resolve();
                return;
            }
            
            checkCount++;
            if (checkCount >= maxChecks) {
                console.warn('⚠️ Some dependencies may not have loaded properly, continuing anyway');
                console.log('🔍 Final dependency state:', {
                    webOSReady: webOSReady,
                    apiReady: apiReady,
                    navReady: navReady,
                    windowApiClient: !!window.apiClient,
                    windowServiceClient: !!window.serviceClient
                });
                resolve(); // Continue anyway
                return;
            }
            
            setTimeout(checkDependencies, 150); // Slightly longer interval
        }
        
        checkDependencies();
    });
};

FlyxTVApplication.prototype.initializeApplication = function() {
    var self = this;
    
    console.log('Setting up application components...');
    
    // Test API connectivity first
    if (window.apiClient && typeof window.apiClient.testConnectivity === 'function') {
        console.log('🔗 Testing API connectivity...');
        window.apiClient.testConnectivity();
    } else {
        console.warn('⚠️ API client not available or testConnectivity method missing');
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set up page navigation
    this.setupPageNavigation();
    
    // Set up search functionality
    this.setupSearchFunctionality();
    
    // Set up modal handling
    this.setupModalHandling();
    
    // Set up app lifecycle
    this.setupAppLifecycle();
    
    return Promise.resolve();
};

FlyxTVApplication.prototype.setupEventListeners = function() {
    var self = this;
    
    // Header logo click - navigate to home
    var headerBrand = document.querySelector('.header-brand');
    if (headerBrand) {
        headerBrand.addEventListener('click', function() {
            if (self.currentPage === 'home') {
                // If already on home, refresh content
                self.refreshHomeContent();
            } else {
                // Navigate to home page
                self.navigateToPage('home');
            }
        });
    }
    
    // Navigation button clicks
    var navButtons = document.querySelectorAll('.nav-button');
    for (var i = 0; i < navButtons.length; i++) {
        navButtons[i].addEventListener('click', function(event) {
            var page = event.currentTarget.getAttribute('data-page');
            if (page) {
                self.navigateToPage(page);
            }
        });
    }
    
    // Search button
    var searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            self.performSearch();
        });
    }
    
    // Color key handling
    document.addEventListener('colorkey', function(event) {
        self.handleColorKey(event.detail.color);
    });
    
    // App lifecycle events
    document.addEventListener('apppause', function() {
        self.handleAppPause();
    });
    
    document.addEventListener('appresume', function() {
        self.handleAppResume();
    });
};

FlyxTVApplication.prototype.setupPageNavigation = function() {
    // All pages start hidden except home
    var pages = document.querySelectorAll('.content-page');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('active');
    }
    
    // Show home page
    var homePage = document.getElementById('home-page');
    if (homePage) {
        homePage.classList.add('active');
    }
};

FlyxTVApplication.prototype.setupSearchFunctionality = function() {
    var self = this;
    var searchInput = document.getElementById('search-input');
    
    if (searchInput) {
        // Handle search input activation (Enter key when readonly)
        searchInput.addEventListener('keydown', function(event) {
            if (event.keyCode === 13) { // Enter key
                if (searchInput.hasAttribute('readonly')) {
                    // Remove readonly to enable typing and show keyboard
                    console.log('🔍 Activating search input for typing');
                    searchInput.removeAttribute('readonly');
                    searchInput.focus(); // This will now open the keyboard
                    event.preventDefault();
                    event.stopPropagation();
                } else {
                    // Already in typing mode, perform search
                    self.performSearch(event.target.value);
                    self.deactivateSearchInput();
                }
            } else if (event.keyCode === 27) { // Escape key
                self.deactivateSearchInput();
            }
        });
        
        // Search on input with debouncing (when typing mode is active)
        searchInput.addEventListener('input', function(event) {
            if (!searchInput.hasAttribute('readonly')) {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(function() {
                    self.performSearch(event.target.value);
                }, 800); // Longer delay for production API to avoid excessive calls
            }
        });
        
        // Handle blur (when user clicks away or navigates away from input)
        searchInput.addEventListener('blur', function() {
            // Small delay to allow for other interactions
            setTimeout(function() {
                if (document.activeElement !== searchInput) {
                    self.deactivateSearchInput();
                }
            }, 200);
        });
    }
    
    // Update focusable elements after search results are loaded
    document.addEventListener('searchResultsLoaded', function() {
        if (window.simpleNavigation) {
            setTimeout(function() {
                window.simpleNavigation.refresh();
            }, 100);
        }
    });
};

FlyxTVApplication.prototype.deactivateSearchInput = function() {
    var searchInput = document.getElementById('search-input');
    if (searchInput) {
        // Make readonly again to prevent keyboard from showing on focus
        searchInput.setAttribute('readonly', 'readonly');
        console.log('🔍 Search input deactivated - keyboard hidden');
        
        // Blur the input to hide keyboard if it's showing
        if (document.activeElement === searchInput) {
            searchInput.blur();
        }
        
        // Update navigation focus
        if (window.simpleNavigation) {
            setTimeout(function() {
                window.simpleNavigation.refresh();
            }, 100);
        }
    }
};

FlyxTVApplication.prototype.setupModalHandling = function() {
    var self = this;
    
    // Click outside modal to close (no X button anymore)
    var modalOverlay = document.getElementById('media-modal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                console.log('❌ Modal backdrop clicked - closing modal');
                self.closeModal();
            }
        });
    }
};

FlyxTVApplication.prototype.setupAppLifecycle = function() {
    var self = this;
    
    // Handle WebOS app lifecycle
    document.addEventListener('apprelaunch', function(event) {
        console.log('App relaunched:', event.detail);
        self.handleAppRelaunch(event.detail);
    });
};

FlyxTVApplication.prototype.showSplashScreen = function() {
    var splashScreen = document.getElementById('splash-screen');
    var mainApp = document.getElementById('main-application');
    
    if (splashScreen) splashScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
};

FlyxTVApplication.prototype.hideSplashScreen = function() {
    var self = this;
    var splashScreen = document.getElementById('splash-screen');
    var mainApp = document.getElementById('main-application');
    
    // Show splash for minimum time for better UX
    setTimeout(function() {
        if (splashScreen) splashScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';
        
        // Update navigation focus
        setTimeout(function() {
            if (window.simpleNavigation) {
                window.simpleNavigation.refresh();
            }
        }, 200);
    }, 1500);
};

FlyxTVApplication.prototype.loadInitialContent = function() {
    // Redirect to new enhanced homepage loading
    console.log('🔄 loadInitialContent called - redirecting to enhanced loadHomePage');
    this.loadHomePage();
    return Promise.resolve([]);
};

FlyxTVApplication.prototype.refreshHomeContent = function() {
    var self = this;
    
    console.log('Refreshing home content...');
    
    // Show loading indicator
    this.setLoadingState(true);
    
    // Clear content cache to force fresh data
    this.contentCache = {};
    
    // Reload all home content
    this.loadInitialContent()
        .then(function() {
            self.setLoadingState(false);
            console.log('Home content refreshed successfully');
        })
        .catch(function(error) {
            console.error('Error refreshing home content:', error);
            self.setLoadingState(false);
            self.showError('Failed to refresh content.');
        });
};

// LEGACY METHODS - Redirected to new enhanced homepage
FlyxTVApplication.prototype.loadTrendingToday = function() {
    var self = this;
    
    return window.apiClient.getTrendingToday()
        .then(function(movies) {
            self.populateGrid('trending-today-grid', movies);
            return movies;
        });
};

FlyxTVApplication.prototype.loadTrendingWeek = function() {
    // Legacy method - now loads Popular Movies USA instead
    var self = this;
    
    return window.apiClient.getPopularMoviesUSA()
        .then(function(movies) {
            self.populateGrid('popular-movies-usa-grid', movies);
            return movies;
        });
};

FlyxTVApplication.prototype.loadPopularShows = function() {
    // Legacy method - now loads Popular Shows USA instead
    var self = this;
    
    return window.apiClient.getPopularShowsUSA()
        .then(function(shows) {
            self.populateGrid('popular-shows-usa-grid', shows);
            return shows;
        });
};

FlyxTVApplication.prototype.populateGrid = function(gridId, movies) {
    var self = this;
    var grid = document.getElementById(gridId);
    if (!grid) return;

    if (!movies || movies.length === 0) {
        this.fadeOutContent(grid, function() {
            grid.innerHTML = '<div class="no-content">No content available</div>';
            self.fadeInContent(grid);
        });
        return;
    }

    this.fadeOutContent(grid, function() {
        grid.innerHTML = '';
        
        // Add demo indicator if using demo data
        if (movies.length > 0 && movies[0].id && String(movies[0].id).indexOf('demo-') === 0) {
            var demoIndicator = document.createElement('div');
            demoIndicator.className = 'demo-indicator';
            demoIndicator.innerHTML = '<p>📡 Demo Mode - Production API (tv.vynx.cc) not available</p>';
            demoIndicator.style.cssText = 'background: rgba(255, 193, 7, 0.15); color: #ffc107; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center; font-size: 14px;';
            grid.appendChild(demoIndicator);
        }

        // Create movie cards
        for (var i = 0; i < movies.length; i++) {
            var card = self.createMediaCard(movies[i]);
            grid.appendChild(card);
        }

        self.fadeInContent(grid);
        
        // Update navigation after animation
        setTimeout(function() {
            if (window.simpleNavigation) {
                window.simpleNavigation.refresh();
            }
        }, 350);
    });

    console.log('Populated', movies.length, 'movies for grid:', gridId);
};

FlyxTVApplication.prototype.createMediaCard = function(item) {
    var self = this;
    
    // Validate item data
    if (!item || typeof item !== 'object') {
        console.error('Invalid item data for media card:', item);
        return document.createElement('div');
    }
    
    var card = document.createElement('div');
    card.className = 'media-card focusable';
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-media-id', item.id || '');
    card.setAttribute('data-media-type', item.mediaType || 'unknown');
    card.setAttribute('data-media-title', item.title || 'Unknown Title');
    
    var poster = document.createElement('img');
    poster.className = 'media-poster';
    poster.src = item.poster || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyNjAiIGZpbGw9InJnYmEoOTksIDEwMiwgMjQxLCAwLjIpIiBzdHJva2U9InJnYmEoOTksIDEwMiwgMjQxLCAwLjQpIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjE1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    poster.alt = item.title;
    poster.loading = 'lazy';
    
    // Handle image errors
    poster.onerror = function() {
        poster.src = 'assets/placeholder-poster.jpg';
    };
    
    var info = document.createElement('div');
    info.className = 'media-info';
    
    var title = document.createElement('h3');
    title.className = 'media-title';
    title.textContent = item.title || 'Unknown Title';
    
    var year = document.createElement('p');
    year.className = 'media-year';
    year.textContent = item.year || '';
    
    var rating = document.createElement('div');
    rating.className = 'media-rating';
    var ratingValue = parseFloat(item.rating || 0);
    rating.innerHTML = '<span>⭐</span><span>' + ratingValue.toFixed(1) + '</span>';
    
    info.appendChild(title);
    info.appendChild(year);
    info.appendChild(rating);
    
    card.appendChild(poster);
    card.appendChild(info);
    
    // Add click handler
    card.addEventListener('click', function() {
        self.showMediaDetails(item);
    });
    
    return card;
};

FlyxTVApplication.prototype.navigateToPage = function(pageName) {
    if (this.currentPage === pageName) return;
    
    console.log('Navigating to page:', pageName);
    
    // Update navigation buttons
    var navButtons = document.querySelectorAll('.nav-button');
    for (var i = 0; i < navButtons.length; i++) {
        navButtons[i].classList.remove('active');
        if (navButtons[i].getAttribute('data-page') === pageName) {
            navButtons[i].classList.add('active');
        }
    }
    
    // Update content pages
    var pages = document.querySelectorAll('.content-page');
    for (var j = 0; j < pages.length; j++) {
        pages[j].classList.remove('active');
    }
    
    var targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
        var previousPage = this.currentPage;
        this.currentPage = pageName;
        
        // Handle page-specific initialization
        this.handlePageActivation(pageName);
    }
    
    // Update navigation focus and clear stored focus when changing pages
    if (window.simpleNavigation) {
        setTimeout(function() {
            window.simpleNavigation.clearStoredFocus(); // Clear stored focus when changing pages
            window.simpleNavigation.refresh();
        }, 200);
    }
};

FlyxTVApplication.prototype.handlePageActivation = function(pageName) {
    switch (pageName) {
        case 'search':
            // Just refresh navigation without auto-focusing search input
            setTimeout(function() {
                if (window.simpleNavigation) {
                    // Update focusable elements but don't auto-focus search input
                    window.simpleNavigation.refresh();
                    console.log('🔍 Search page activated - navigation refreshed without auto-focus');
                }
            }, 300);
            break;
    }
};

FlyxTVApplication.prototype.performSearch = function(query) {
    var self = this;
    var searchInput = document.getElementById('search-input');
    
    if (!query && searchInput) {
        query = searchInput.value;
    }
    
    if (!query || query.trim().length === 0) {
        this.clearSearchResults();
        return;
    }
    
    console.log('Performing search for:', query);
    this.setLoadingState(true);
    
    window.apiClient.searchContent(query)
        .then(function(results) {
            self.displaySearchResults(results);
        })
        .catch(function(error) {
            console.error('Search failed:', error);
            if (error.status) {
                self.showError('Search failed (Server Error ' + error.status + '). Please try again.');
            } else {
                self.showError('Search failed. Please check your connection and try again.');
            }
        })
        .finally(function() {
            self.setLoadingState(false);
        });
};

FlyxTVApplication.prototype.displaySearchResults = function(results) {
    var self = this;
    var searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    this.fadeOutContent(searchResults, function() {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            var noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<h3>No results found</h3><p>Try different search terms.</p>';
            searchResults.appendChild(noResults);
            self.fadeInContent(searchResults);
            return;
        }
        
        // Add indicator if using demo data
        if (results.length > 0 && results[0].id) {
            var firstResultId = String(results[0].id); // Convert to string safely
            if (firstResultId.indexOf('demo-') === 0) {
                var demoIndicator = document.createElement('div');
                demoIndicator.className = 'demo-indicator';
                demoIndicator.innerHTML = '<p>⚠️ Using demo data - Production API unavailable</p>';
                demoIndicator.style.cssText = 'background: rgba(255, 193, 7, 0.2); color: #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;';
                searchResults.appendChild(demoIndicator);
            }
        }
        
        // Create search result cards
        for (var i = 0; i < results.length; i++) {
            var card = self.createMediaCard(results[i]);
            searchResults.appendChild(card);
        }
        
        self.fadeInContent(searchResults);
        
        console.log('Displayed', results.length, 'search results');
        
        // Dispatch event to notify that search results are loaded
        var searchResultsEvent = new CustomEvent('searchResultsLoaded', {
            detail: { count: results.length }
        });
        document.dispatchEvent(searchResultsEvent);
        
        // Update navigation after animation
        setTimeout(function() {
            if (window.simpleNavigation) {
                window.simpleNavigation.refresh();
            }
        }, 350);
    });
};

FlyxTVApplication.prototype.clearSearchResults = function() {
    var self = this;
    var searchResults = document.getElementById('search-results');
    if (searchResults) {
        this.fadeOutContent(searchResults, function() {
            searchResults.innerHTML = '';
            self.fadeInContent(searchResults);
        });
    }
};

FlyxTVApplication.prototype.showMediaDetails = function(media) {
    var self = this;
    
    console.log('🔍 Showing details for:', media.title);
    console.log('🔍 Original media object:', {
        id: media.id,
        title: media.title,
        mediaType: media.mediaType,
        media_type: media.media_type,
        year: media.year,
        rating: media.rating
    });
    
    // CRITICAL: Store current homepage focus state before opening modal
    this.storeHomepageFocusState();
    
    var modal = document.getElementById('media-modal');
    var modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalContent) return;
    
    // Show modal with loading state
    modal.style.display = 'flex';
    modalContent.innerHTML = '<div class="loading-state"><div class="loader-spinner"></div><p>Loading details...</p></div>';
    
    window.apiClient.getMovieDetails(media.id, media.mediaType)
        .then(function(details) {
            var mediaData = details || media;
            
            // For TV shows, also fetch season 1 episode data
            if (mediaData.mediaType === 'tv') {
                console.log('📺 TV show detected, fetching season 1 episode data...');
                
                                                  // Fetch season 1 data with episode stills using the webOS service
                 if (window.serviceClient && window.serviceClient.getSeasonDetails) {
                     window.serviceClient.getSeasonDetails(media.id, 1)
                         .then(function(seasonData) {
                             console.log('✅ Got season 1 data with episodes via service:', seasonData);
                             
                             // Store season data with media
                             mediaData.seasonData = mediaData.seasonData || {};
                             mediaData.seasonData[1] = seasonData;
                             
                             // Create modal content
                             modalContent.innerHTML = self.createMediaDetailsHTML(mediaData);
                             
                             // Setup handlers
                             setTimeout(function() {
                                 self.setupSeasonEpisodeHandlers(mediaData);
                             }, 100);
                         })
                         .catch(function(error) {
                             console.warn('❌ Failed to fetch season data via service:', error.message);
                             
                             // Continue without season data
                             modalContent.innerHTML = self.createMediaDetailsHTML(mediaData);
                             
                             setTimeout(function() {
                                 self.setupSeasonEpisodeHandlers(mediaData);
                             }, 100);
                         });
                 } else {
                     console.warn('❌ Service client getSeasonDetails not available');
                     
                     // Continue without season data
                     modalContent.innerHTML = self.createMediaDetailsHTML(mediaData);
                     
                     setTimeout(function() {
                         self.setupSeasonEpisodeHandlers(mediaData);
                                          }, 100);
                 }
            } else {
                // Movie - no season data needed
                modalContent.innerHTML = self.createMediaDetailsHTML(mediaData);
            }
            
            // Modal can be closed by clicking backdrop
            
            // Update navigation for modal - CRITICAL: Modal focus management
            if (window.simpleNavigation) {
                setTimeout(function() {
                    console.log('🔒 Modal opened - activating modal navigation mode');
                    window.simpleNavigation.setModalMode(true);
                    
                    // ✅ FOCUS FIX: For TV shows, try to focus the first season tab immediately
                    if (mediaData.mediaType === 'tv' || mediaData.media_type === 'tv') {
                        var firstSeasonTab = document.querySelector('.season-tab[data-season="1"]');
                        if (firstSeasonTab) {
                            console.log('🎯 EARLY AUTO-FOCUS: Setting focus to first season tab');
                            window.simpleNavigation.setFocus(firstSeasonTab);
                        }
                    }
                }, 300);
            }
        })
        .catch(function(error) {
            console.error('Error loading media details:', error);
            console.log('🔧 API failed, creating enhanced fallback data for:', media.title);
            
            // Create enhanced demo data using the ORIGINAL media object as base
            var enhancedDemoData = self.createEnhancedFallbackData(media);
            
            console.log('🔧 Enhanced fallback data created:', {
                title: enhancedDemoData.title,
                id: enhancedDemoData.id,
                mediaType: enhancedDemoData.mediaType,
                number_of_seasons: enhancedDemoData.number_of_seasons
            });
            
            modalContent.innerHTML = self.createMediaDetailsHTML(enhancedDemoData);
            
            // Setup handlers with enhanced demo data
            if (enhancedDemoData.mediaType === 'tv' || enhancedDemoData.media_type === 'tv') {
                console.log('🔧 Setting up season/episode handlers for fallback TV show');
                setTimeout(function() {
                    self.setupSeasonEpisodeHandlers(enhancedDemoData);
                }, 100);
            }
            
            // Modal can be closed by clicking backdrop (fallback)
            
            // Update navigation for modal
            if (window.simpleNavigation) {
                setTimeout(function() {
                    console.log('🔒 Modal opened (fallback) - activating modal navigation mode');
                    window.simpleNavigation.setModalMode(true);
                    
                    // ✅ FOCUS FIX: For TV shows, try to focus the first season tab immediately
                    if (enhancedDemoData.mediaType === 'tv' || enhancedDemoData.media_type === 'tv') {
                        var firstSeasonTab = document.querySelector('.season-tab[data-season="1"]');
                        if (firstSeasonTab) {
                            console.log('🎯 EARLY AUTO-FOCUS (fallback): Setting focus to first season tab');
                            window.simpleNavigation.setFocus(firstSeasonTab);
                        }
                    }
                }, 300);
            }
        });
};

// NEW: Create enhanced fallback data that preserves original media info
FlyxTVApplication.prototype.createEnhancedFallbackData = function(originalMedia) {
    console.log('🔧 Creating enhanced fallback data for original media:', {
        title: originalMedia.title,
        id: originalMedia.id,
        mediaType: originalMedia.mediaType
    });
    
    // Start with the original media object as base
    var enhancedData = Object.assign({}, originalMedia);
    
    // Add missing demo details while preserving original info
    enhancedData.runtime = enhancedData.mediaType === 'tv' ? 45 : 120;
    enhancedData.genres = enhancedData.genres || [{name: 'Action'}, {name: 'Drama'}, {name: 'Thriller'}];
    enhancedData.cast = enhancedData.cast || [
        {name: 'Demo Actor One', character: 'Main Character', profilePath: null},
        {name: 'Demo Actor Two', character: 'Supporting Character', profilePath: null},
        {name: 'Demo Actor Three', character: 'Villain', profilePath: null}
    ];
    enhancedData.director = enhancedData.director || 'Demo Director';
    enhancedData.tagline = enhancedData.tagline || (enhancedData.mediaType === 'tv' ? 'An amazing TV series' : 'An incredible movie experience');
    
    // Ensure poster and backdrop exist
    if (!enhancedData.poster || enhancedData.poster.includes('placeholder')) {
        enhancedData.poster = 'assets/placeholder-poster.jpg';
    }
    if (!enhancedData.backdrop || enhancedData.backdrop.includes('placeholder')) {
        enhancedData.backdrop = 'assets/placeholder-backdrop.jpg';
    }
    
    // FIXED: If we have actual TMDB poster paths, ensure they're properly formatted
    if (enhancedData.poster && enhancedData.poster.startsWith('/') && !enhancedData.poster.includes('tmdb.org')) {
        enhancedData.poster = 'https://image.tmdb.org/t/p/w500' + enhancedData.poster;
    }
    if (enhancedData.backdrop && enhancedData.backdrop.startsWith('/') && !enhancedData.backdrop.includes('tmdb.org')) {
        enhancedData.backdrop = 'https://image.tmdb.org/t/p/w1280' + enhancedData.backdrop;
    }
    
    // Set default rating if missing
    if (!enhancedData.rating || enhancedData.rating === 0) {
        enhancedData.rating = 7.5 + (Math.random() * 2); // Random rating between 7.5-9.5
    }
    
    // Enhanced overview if missing or generic
    if (!enhancedData.overview || enhancedData.overview.length < 50) {
        enhancedData.overview = 'This ' + (enhancedData.mediaType === 'tv' ? 'TV series' : 'movie') + 
                                ' offers an incredible viewing experience with compelling storytelling and outstanding performances. ' +
                                'Due to network connectivity issues, detailed information from TMDB is not available, but you can still enjoy streaming this content.';
    }
    
    // TV Show specific enhancements
    if (enhancedData.mediaType === 'tv' || enhancedData.media_type === 'tv') {
        console.log('🔧 Adding TV show specific fallback data for:', enhancedData.title);
        
        // Ensure consistent TV show properties
        enhancedData.mediaType = 'tv';
        enhancedData.media_type = 'tv';
        enhancedData.number_of_seasons = enhancedData.number_of_seasons || Math.floor(Math.random() * 5) + 3; // 3-7 seasons
        enhancedData.episode_run_time = enhancedData.episode_run_time || [45, 60];
        enhancedData.first_air_date = enhancedData.year + '-01-01';
        enhancedData.last_air_date = (parseInt(enhancedData.year) + enhancedData.number_of_seasons - 1) + '-12-31';
        enhancedData.status = enhancedData.status || 'Ended';
        enhancedData.type = enhancedData.type || 'Scripted';
        enhancedData.in_production = false;
        
        console.log('✅ TV show fallback data complete:', {
            title: enhancedData.title,
            mediaType: enhancedData.mediaType,
            number_of_seasons: enhancedData.number_of_seasons
        });
    } else {
        // Movie specific enhancements
        enhancedData.budget = enhancedData.budget || 100000000;
        enhancedData.revenue = enhancedData.revenue || 300000000;
        
        // Generate realistic release dates (some might be in the future)
        if (!enhancedData.release_date) {
            enhancedData.release_date = this.generateMovieReleaseDate(enhancedData.year);
        }
        
        // Set status based on release date
        var isReleased = this.isContentReleased(enhancedData.release_date);
        enhancedData.status = isReleased ? 'Released' : 'Post-Production';
    }
    
    console.log('🔧 Enhanced fallback data created successfully for:', enhancedData.title);
    return enhancedData;
};

FlyxTVApplication.prototype.createMediaDetailsHTML = function(media) {
    var self = this;
    
    // FIXED: Declare isTVShow at the beginning to fix scoping issue
    var isTVShow = media.mediaType === 'tv' || media.media_type === 'tv';
    
    console.log('🎬 Creating media details HTML for:', {
        title: media.title,
        mediaType: media.mediaType,
        media_type: media.media_type,
        number_of_seasons: media.number_of_seasons,
        isTVShow: isTVShow
    });
    
    var html = '<div class="enhanced-media-details">';
    
    // Enhanced Header with backdrop and gradient overlay
    html += '<div class="enhanced-details-header">';
    html += '<div class="backdrop-container">';
    
    // Backdrop Image
    var backdropUrl = media.backdrop || media.poster || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjIwMCIgeT0iMTAwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0icmdiYSg5OSwgMTAyLCAyNDEsIDAuMikiIHN0cm9rZT0icmdiYSg5OSwgMTAyLCAyNDEsIDAuNCkiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSI0MDAiIHk9IjIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEJhY2tkcm9wPC90ZXh0Pgo8L3N2Zz4K';
    html += '<img src="' + backdropUrl + '" alt="' + media.title + '" class="enhanced-backdrop">';
    html += '<div class="backdrop-gradient-overlay"></div>';
    html += '</div>';
    
    html += '<div class="header-content-wrapper">';
    html += '<div class="poster-section">';
    
    // FIXED: Ensure proper poster URL with error handling
    var posterUrl = media.poster || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMUExQTJFIi8+CjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIyNjAiIGZpbGw9InJnYmEoOTksIDEwMiwgMjQxLCAwLjIpIiBzdHJva2U9InJnYmEoOTksIDEwMiwgMjQxLCAwLjQpIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMDAiIHk9IjE1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNykiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    html += '<img src="' + posterUrl + '" alt="' + media.title + '" class="enhanced-poster">';
    html += '</div>';
    
    html += '<div class="info-section">';
    html += '<h1 class="enhanced-title">' + media.title + '</h1>';
    
    html += '<div class="enhanced-meta">';
    html += '<span class="meta-item year-badge">' + media.year + '</span>';
    html += '<span class="meta-item rating-badge">⭐ ' + (media.rating ? media.rating.toFixed(1) : 'N/A') + '</span>';
    if (media.runtime) {
        html += '<span class="meta-item runtime-badge">' + media.runtime + ' min</span>';
    }
    if (media.mediaType) {
        html += '<span class="meta-item type-badge">' + (media.mediaType === 'tv' ? 'TV Series' : 'Movie') + '</span>';
    }
    html += '</div>';
    
    if (media.tagline) {
        html += '<p class="enhanced-tagline">"' + media.tagline + '"</p>';
    }
    
    html += '<div class="enhanced-overview">';
    html += '<p>' + (media.overview || 'No overview available.') + '</p>';
    html += '</div>';
    
    // Add play button right after description for movies (not TV shows)
    if (!isTVShow) {
        console.log('🎬 Adding play button after description for movie');
        var isMovieReleased = this.isContentReleased(media.release_date);
        
        html += '<div class="movie-play-section">';
        
        // Show release date info
        html += '<div class="movie-release-info">';
        html += '<span class="release-label">Release Date:</span> ';
        html += '<span class="release-date">' + this.formatAirDate(media.release_date) + '</span>';
        html += '</div>';
        
        if (isMovieReleased) {
            html += '<button id="play-movie-btn" class="action-btn primary focusable" tabindex="0">';
            html += '<span class="btn-icon">▶</span>';
            html += '<span class="btn-text">Play Movie</span>';
            html += '</button>';
        } else {
            html += '<button id="play-movie-btn" class="action-btn disabled" tabindex="-1" disabled>';
            html += '<span class="btn-icon">🔒</span>';
            html += '<span class="btn-text">Not Released Yet</span>';
            html += '</button>';
        }
        html += '</div>';
    }
    
    // Genres
    if (media.genres && media.genres.length > 0) {
        html += '<div class="enhanced-genres">';
        for (var i = 0; i < media.genres.length; i++) {
            html += '<span class="genre-pill">' + media.genres[i].name + '</span>';
        }
        html += '</div>';
    }
    
    html += '</div>'; // info-section
    html += '</div>'; // header-content-wrapper
    html += '</div>'; // enhanced-details-header
    
    // Enhanced Body Content
    html += '<div class="enhanced-details-body">';
    
    // Season/Episode Selection for TV Shows
    console.log('🔧 Checking TV show status:', { mediaType: media.mediaType, media_type: media.media_type, isTVShow: isTVShow });
    
    if (isTVShow) {
        console.log('📺 Generating enhanced season/episode selection HTML');
        html += '<div class="season-episode-section">';
        html += '<h3 class="section-title">📺 Select Episode</h3>';
        
        // Season Tabs (horizontal buttons)
        html += '<div class="season-tabs">';
        var numSeasons = media.number_of_seasons || Math.floor(Math.random() * 3) + 3;
        console.log('📺 Generating', numSeasons, 'seasons as tabs');
        for (var s = 1; s <= numSeasons; s++) {
            var isActive = s === 1;
            html += '<button class="season-tab focusable' + (isActive ? ' active' : '') + '" data-season="' + s + '" tabindex="0">';
            html += 'Season ' + s;
            html += '</button>';
        }
        html += '</div>';
        
        // Episodes Grid Container
        html += '<div class="episodes-grid-container">';
        html += '<div id="episodes-grid" class="episodes-grid">';
        html += '<div class="episodes-loading">';
        html += '<div class="episode-loader-spinner"></div>';
        html += '<p>Loading episodes...</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        console.log('✅ Enhanced season/episode grid HTML generated');
    } else {
        console.log('🎬 Skipping season/episode selection (not a TV show)');
    }
    
    // Cast Section (Enhanced)
    if (media.cast && media.cast.length > 0) {
        html += '<div class="enhanced-cast-section">';
        html += '<h3 class="section-title">Cast</h3>';
        html += '<div class="cast-grid">';
        
        var castLimit = Math.min(6, media.cast.length);
        console.log('🎭 Rendering cast section with', castLimit, 'actors from', media.cast.length, 'total');
        
        for (var j = 0; j < castLimit; j++) {
            var actor = media.cast[j];
            console.log('🎭 Actor', j + 1, ':', actor.name, 'Photo:', actor.profilePath || actor.profile_path || 'none');
            
            html += '<div class="cast-card">';
            
            // Check both profilePath and profile_path for compatibility
            var profilePath = actor.profilePath || actor.profile_path;
            if (profilePath) {
                // Ensure the path starts with /
                var cleanPath = profilePath.startsWith('/') ? profilePath : '/' + profilePath;
                html += '<img src="https://image.tmdb.org/t/p/w185' + cleanPath + '" alt="' + actor.name + '" class="cast-photo" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';">';
                html += '<div class="cast-photo-placeholder" style="display: none;">👤</div>';
            } else {
                html += '<div class="cast-photo-placeholder">👤</div>';
            }
            
            html += '<div class="cast-info">';
            html += '<span class="actor-name">' + (actor.name || 'Unknown Actor') + '</span>';
            html += '<span class="character-name">' + (actor.character || 'Unknown Character') + '</span>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';
        html += '</div>';
    } else {
        console.log('❌ No cast data available for:', media.title);
    }
    
    // No action buttons section needed - play button is now in description area for movies
    // TV shows use episode cards for interaction
    
    html += '</div>'; // enhanced-details-body
    html += '</div>'; // enhanced-media-details
    
    // FIXED: Add event handlers for movies (non-TV shows) immediately
    if (!isTVShow) {
        console.log('🎬 Setting up movie play button handler');
        setTimeout(function() {
            var moviePlayBtn = document.getElementById('play-movie-btn');
            
            if (moviePlayBtn) {
                moviePlayBtn.addEventListener('click', function() {
                    console.log('🎬 Movie play button clicked for:', media.title);
                    self.storeModalState(media, 'play-button', this);
                    self.playMovie(media.id, media);
                });
            }
            
            // Add modal backdrop close handler for movies
            var modal = document.getElementById('media-modal');
            if (modal) {
                modal.addEventListener('click', function(event) {
                    if (event.target === modal) {
                        console.log('❌ Movie modal backdrop clicked');
                        self.closeModal();
                    }
                });
            }
        }, 100);
    }
    
    return html;
};

// Add season/episode management functionality with grid layout
FlyxTVApplication.prototype.setupSeasonEpisodeHandlers = function(media) {
    var self = this;
    
    console.log('🔧 Setting up season/episode grid handlers for:', media.title);
    
    var seasonTabs = document.querySelectorAll('.season-tab');
    var episodesGrid = document.getElementById('episodes-grid');
    
    console.log('🔧 Handler elements found:', {
        seasonTabs: seasonTabs.length,
        episodesGrid: !!episodesGrid
    });
    
    if (!seasonTabs.length || !episodesGrid) {
        console.warn('❌ Season/episode grid elements not found in DOM');
        return;
    }

    // Store media reference for handlers
    this.currentTVMedia = media;
    this.currentSelectedSeason = 1;
    
    // Store modal state for potential restoration after media player
    this.storeModalState(media, 'season-tab');
    
    // ✅ CRITICAL FIX: Use event delegation for season tabs (survives modal cloning)
    var seasonTabsContainer = document.querySelector('.season-tabs');
    if (seasonTabsContainer) {
        // Remove any existing listeners to prevent duplicates
        seasonTabsContainer.removeEventListener('click', self.handleSeasonTabClick);
        
        // Store the handler function for removal
        self.handleSeasonTabClick = function(event) {
            console.log('🔥 DELEGATION: Click event fired on season tabs container', {
                target: event.target,
                targetClass: event.target.className,
                isSeasonTab: event.target.classList.contains('season-tab')
            });
            
            var target = event.target;
            if (target && target.classList.contains('season-tab')) {
                var selectedSeason = parseInt(target.getAttribute('data-season'));
                console.log('🔥 Season tab clicked/activated via delegation:', selectedSeason);
                self.switchToSeason(selectedSeason, media);
                
                // ✅ NAVIGATION FIX: Ensure focus stays on the newly active season tab
                if (window.simpleNavigation) {
                    setTimeout(function() {
                        console.log('🎯 SEASON SWITCH: Maintaining focus on season tab', selectedSeason);
                        window.simpleNavigation.setFocus(target);
                    }, 100);
                }
            } else {
                console.log('🔥 DELEGATION: Click was not on a season tab');
            }
        };
        
        // Add the delegated event listener
        seasonTabsContainer.addEventListener('click', self.handleSeasonTabClick);
        console.log('✅ Season tab event delegation set up - survives modal cloning');
    } else {
        console.error('❌ Season tabs container not found!');
    }
    
    // Close button handler will be set up by the main modal setup
    
    // Add modal backdrop close handler (NO CLONING - preserves event listeners)
    var modal = document.getElementById('media-modal');
    if (modal) {
        // Remove existing backdrop handler to prevent duplicates
        modal.removeEventListener('click', self.handleModalBackdropClick);
        
        // Store the handler function for removal
        self.handleModalBackdropClick = function(event) {
            if (event.target === modal) {
                console.log('❌ Modal backdrop clicked');
                self.closeModal();
            }
        };
        
        // Add the backdrop click handler
        modal.addEventListener('click', self.handleModalBackdropClick);
        console.log('✅ Modal backdrop handler added - NO CLONING');
    }
    
    // Initialize with Season 1 and ensure proper focus
    setTimeout(function() {
        self.switchToSeason(1, media);
        
        // ✅ FOCUS FIX: Ensure first season tab gets focus after modal opens
        setTimeout(function() {
            var firstSeasonTab = document.querySelector('.season-tab[data-season="1"]');
            if (firstSeasonTab && window.simpleNavigation) {
                console.log('🎯 AUTO-FOCUSING first season tab for immediate navigation');
                window.simpleNavigation.setFocus(firstSeasonTab);
                
                // Update modal focusable elements to include all new episode elements
                window.simpleNavigation.updateModalFocusableElements();
            }
        }, 600); // Give time for episodes to load and render
    }, 300);
};

// Switch to a specific season and display its episodes
FlyxTVApplication.prototype.switchToSeason = function(season, media) {
    var self = this;
    
    if (season === 1) {
        console.log('🏠 AUTO-SELECTING Season 1 for immediate episode access');
    } else {
        console.log('📺 Switching to season', season);
    }
    
    // Update active season tab
    var seasonTabs = document.querySelectorAll('.season-tab');
    var newActiveTab = null;
    
    console.log('🔄 SWITCHING: Updating active season tab to season', season);
    console.log('🔍 SWITCHING: Found', seasonTabs.length, 'season tabs');
    
    for (var i = 0; i < seasonTabs.length; i++) {
        var tabSeason = parseInt(seasonTabs[i].getAttribute('data-season'));
        var wasActive = seasonTabs[i].classList.contains('active');
        
        seasonTabs[i].classList.remove('active');
        if (tabSeason === season) {
            seasonTabs[i].classList.add('active');
            newActiveTab = seasonTabs[i];
            console.log('✅ SWITCHING: Set season', season, 'as active');
        }
        
        console.log('🔍 SWITCHING: Season', tabSeason, '- wasActive:', wasActive, '- nowActive:', seasonTabs[i].classList.contains('active'));
    }
    
    this.currentSelectedSeason = season;
    
    // Verify the active class was set correctly
    var verifyActive = document.querySelector('.season-tab.active');
    if (verifyActive) {
        console.log('✅ SWITCHING: Verified active season tab:', {
            seasonNumber: verifyActive.getAttribute('data-season'),
            expectedSeason: season,
            matches: parseInt(verifyActive.getAttribute('data-season')) === season
        });
    } else {
        console.error('❌ SWITCHING: NO ACTIVE SEASON TAB FOUND AFTER SWITCH!');
    }
    
    // ✅ NAVIGATION FIX: Update focus to the newly active season tab
    if (newActiveTab && window.simpleNavigation) {
        console.log('🎯 SEASON SWITCH: Setting focus to newly active season tab:', season);
        setTimeout(function() {
            window.simpleNavigation.setFocus(newActiveTab);
        }, 50);
    }
    
    // Show loading state
    var episodesGrid = document.getElementById('episodes-grid');
    if (episodesGrid) {
        episodesGrid.innerHTML = 
            '<div class="episodes-loading">' +
            '<div class="episode-loader-spinner"></div>' +
            '<p>Loading episodes for Season ' + season + '...</p>' +
            '</div>';
    }
    
    // Generate and display episodes after short delay
    setTimeout(function() {
        self.displayEpisodesGrid(season, media);
    }, 400);
};

// Display episodes in a clickable grid
FlyxTVApplication.prototype.displayEpisodesGrid = function(season, media) {
    var episodesGrid = document.getElementById('episodes-grid');
    
    if (!episodesGrid) return;
    
    // Get episode data (may trigger TMDB fetch in background)
    var episodes = this.generateSeasonEpisodes(season, media);
    
    // Render the episodes grid with current data
    this.renderEpisodesGrid(episodes, season, media, episodesGrid);
    
    console.log('✅ Episodes grid displayed for season', season, ':', episodes.length, 'episodes');
};



// Fetch real TMDB season episodes or fallback to generated ones
FlyxTVApplication.prototype.generateSeasonEpisodes = function(season, media) {
    var self = this;
    
    // Create a cache key for this specific show and season
    var cacheKey = media.id + '_s' + season;
    
    // Check if we already have cached episodes for this show/season
    if (!this.episodeCache) {
        this.episodeCache = {};
    }
    
    if (this.episodeCache[cacheKey]) {
        console.log('📺 Using cached episodes for', media.title, 'Season', season);
        return this.episodeCache[cacheKey];
    }
    
    console.log('📺 Fetching real TMDB season episodes for', media.title, 'Season', season);
    
    // Check if we already have TMDB season data
    if (media.seasonData && media.seasonData[season]) {
        console.log('✅ Using existing TMDB season data for season', season);
        var tmdbEpisodes = this.processTMDBSeasonData(media.seasonData[season]);
        this.episodeCache[cacheKey] = tmdbEpisodes;
        return tmdbEpisodes;
    }
    
              // Need to fetch season data for this season using webOS service
     console.log('🔗 Fetching TMDB season data for season', season, 'via webOS service');
     
     // 🔥 DEBUG: Full service client check
     console.log('🔥 DEBUG: Service client check:', {
         hasServiceClient: !!window.serviceClient,
         hasGetSeasonDetails: !!(window.serviceClient && window.serviceClient.getSeasonDetails),
         mediaId: media.id,
         season: season,
         timestamp: new Date().toISOString()
     });
     
     if (window.serviceClient && window.serviceClient.getSeasonDetails) {
         console.log('🔥 DEBUG: About to call getSeasonDetails with:', {
             tvId: media.id,
             seasonNumber: season,
             mediaTitle: media.title
         });
         
         window.serviceClient.getSeasonDetails(media.id, season)
             .then(function(seasonData) {
                 console.log('🔥 DEBUG: Service getSeasonDetails response:', {
                     seasonData: seasonData,
                     hasData: !!seasonData,
                     hasEpisodes: !!(seasonData && seasonData.episodes),
                     episodeCount: seasonData && seasonData.episodes ? seasonData.episodes.length : 0,
                     mediaId: media.id,
                     season: season
                 });
                 
                 if (!seasonData) {
                     console.error('🔥 DEBUG: Service returned null/undefined for season data!');
                     console.log('📺 Using fallback episodes for season', season);
                     var generatedEpisodes = self.generateFallbackEpisodes(season, media);
                     self.episodeCache[cacheKey] = generatedEpisodes;
                     return;
                 }
                 
                 // Store season data
                 media.seasonData = media.seasonData || {};
                 media.seasonData[season] = seasonData;
                 
                 // Process and cache episodes
                 var tmdbEpisodes = self.processTMDBSeasonData(seasonData);
                 self.episodeCache[cacheKey] = tmdbEpisodes;
                 
                 console.log('🔥 DEBUG: Processed TMDB episodes:', {
                     episodeCount: tmdbEpisodes.length,
                     firstEpisode: tmdbEpisodes[0] ? tmdbEpisodes[0].title : 'None'
                 });
                 
                 // Refresh display with real data
                 self.refreshEpisodesDisplay(season, media, tmdbEpisodes);
             })
             .catch(function(error) {
                 console.error('🔥 DEBUG: Service getSeasonDetails error:', {
                     error: error,
                     message: error.message,
                     stack: error.stack,
                     mediaId: media.id,
                     season: season
                 });
                 
                 console.warn('❌ TMDB season fetch failed via service:', error.message);
                 console.log('📺 Using fallback episodes for season', season);
                 var generatedEpisodes = self.generateFallbackEpisodes(season, media);
                 self.episodeCache[cacheKey] = generatedEpisodes;
             });
     } else {
         console.warn('❌ Service client getSeasonDetails not available, using fallback');
         var generatedEpisodes = self.generateFallbackEpisodes(season, media);
         self.episodeCache[cacheKey] = generatedEpisodes;
     }
    
    // Return generated episodes immediately while TMDB fetch happens in background
    return this.generateFallbackEpisodes(season, media);
};

// Generate fallback episodes when TMDB data isn't available
FlyxTVApplication.prototype.generateFallbackEpisodes = function(season, media) {
    console.log('📺 Generating fallback episodes for', media.title, 'Season', season);
    
    var episodes = [];
    var baseEpisodeCount = 10; // Base episode count
    // Use consistent episode count based on media ID and season
    var episodeSeed = parseInt(media.id) + (season * 3);
    var numEpisodes = baseEpisodeCount + (episodeSeed % 13); // 10-22 episodes consistently
    
    // Generate episode titles and data
    var episodeTitlePrefixes = [
        'The Beginning', 'New Allies', 'Dark Secrets', 'The Truth', 'Betrayal',
        'Redemption', 'The Battle', 'Revelations', 'Last Stand', 'New Hope',
        'Rising Threat', 'Old Friends', 'The Plan', 'Point of No Return', 'Finale',
        'Mystery', 'Crossroads', 'The Hunt', 'Reckoning', 'Legacy', 'Origins', 'Destiny'
    ];
    
    for (var i = 1; i <= numEpisodes; i++) {
        // Use consistent episode title selection based on episode number
        var titleIndex = (parseInt(media.id) + season + i) % episodeTitlePrefixes.length;
        var titlePrefix = episodeTitlePrefixes[titleIndex];
        
        // Use consistent logic for "Part" naming
        var addPart = ((parseInt(media.id) + season + i) % 10) < 3; // 30% chance of "Part" naming
        var title = titlePrefix + (addPart ? ' Part ' + Math.ceil(i/2) : '');
        
        var airDate = this.generateEpisodeAirDate(media.year, season, i);
        var isReleased = this.isContentReleased(airDate);
        
        var episode = {
            number: i,
            title: title,
            overview: 'In this episode of ' + media.title + ', our heroes face new challenges and uncover shocking truths. ' +
                     'This pivotal episode explores character development and advances the main storyline with unexpected twists.',
            runtime: Math.floor(((parseInt(media.id) + season + i) % 16)) + 35, // 35-50 minutes consistently
            airDate: airDate,
            isReleased: isReleased,
            rating: (((parseInt(media.id) + season + i) % 200) / 100 + 7.5).toFixed(1), // 7.5-9.5 rating consistently
            thumbnail: 'imgs/TBD.svg', // ALWAYS use TBD.svg for fallback episodes
            hasRealThumbnail: false // No real thumbnails for fallback episodes
        };
        
        episodes.push(episode);
    }
    
    console.log('📺 Generated', episodes.length, 'fallback episodes for', media.title, 'Season', season);
    
    return episodes;
};

// REMOVED: fetchTMDBSeasonEpisodes - now using direct fetch in generateSeasonEpisodes

// REMOVED: fetchTMDBSeasonDirect - now using simplified browser fetch approach

// Process TMDB season data into episode format
FlyxTVApplication.prototype.processTMDBSeasonData = function(seasonData) {
    var self = this;
    
    console.log('🔥 DEBUG: processTMDBSeasonData called with:', {
        seasonData: seasonData,
        hasSeasonData: !!seasonData,
        seasonDataType: typeof seasonData,
        hasEpisodesProperty: !!(seasonData && seasonData.episodes),
        episodesType: seasonData && seasonData.episodes ? typeof seasonData.episodes : 'N/A',
        episodeCount: seasonData && seasonData.episodes ? seasonData.episodes.length : 0
    });
    
    if (seasonData && seasonData.episodes && seasonData.episodes.length > 0) {
        console.log('✅ Processing', seasonData.episodes.length, 'TMDB episodes with real still_path data');
        
        var processedEpisodes = seasonData.episodes.map(function(episode) {
            var airDate = episode.air_date;
            var isReleased = self.isContentReleased(airDate);
            
            // Use the still_path directly from the episode data (same place as air_date and name!)
            var thumbnail = 'imgs/TBD.svg'; // Default fallback
            if (episode.still_path) {
                thumbnail = 'https://image.tmdb.org/t/p/w300' + episode.still_path;
                console.log('📺 Episode', episode.episode_number, 'using real TMDB still:', thumbnail);
            } else {
                console.log('📺 Episode', episode.episode_number, 'no still_path, using TBD.svg');
            }
            
            return {
                number: episode.episode_number,
                title: episode.name || 'Episode ' + episode.episode_number,
                overview: episode.overview || 'No description available.',
                runtime: episode.runtime || 45,
                airDate: airDate,
                isReleased: isReleased,
                rating: (episode.vote_average || 0).toFixed(1),
                thumbnail: thumbnail,
                hasRealThumbnail: !!episode.still_path,
                // Store the original TMDB data
                tmdbData: episode
            };
        });
        
        console.log('🔥 DEBUG: Processed episodes result:', {
            processedCount: processedEpisodes.length,
            firstEpisodeTitle: processedEpisodes[0] ? processedEpisodes[0].title : 'None',
            firstEpisodeThumbnail: processedEpisodes[0] ? processedEpisodes[0].thumbnail : 'None'
        });
        
        return processedEpisodes;
    }
    
    console.log('🔥 DEBUG: No episode data found in TMDB response - returning empty array');
    return [];
};

// Refresh episodes display with new data
FlyxTVApplication.prototype.refreshEpisodesDisplay = function(season, media, episodes) {
    var episodesGrid = document.getElementById('episodes-grid');
    
    if (!episodesGrid || episodes.length === 0) {
        console.log('📺 Cannot refresh episodes display - no grid or episodes');
        return;
    }
    
    console.log('🔄 Refreshing episodes display with', episodes.length, 'real TMDB episodes');
    
    // Re-render the episodes grid with real data
    this.renderEpisodesGrid(episodes, season, media, episodesGrid);
};

// Render episodes grid HTML
FlyxTVApplication.prototype.renderEpisodesGrid = function(episodes, season, media, episodesGrid) {
    var self = this;
    
    // Build episodes grid HTML
    var html = '';
    for (var i = 0; i < episodes.length; i++) {
        var episode = episodes[i];
        var isDisabled = !episode.isReleased;
        var cardClass = 'episode-card' + (isDisabled ? ' episode-disabled' : ' focusable');
        var tabIndex = isDisabled ? '-1' : '0';
        
        html += '<div class="' + cardClass + '" data-season="' + season + '" data-episode="' + episode.number + '" data-released="' + episode.isReleased + '" tabindex="' + tabIndex + '">';
        
        // Episode thumbnail
        html += '<div class="episode-thumbnail">';
        html += '<img src="' + episode.thumbnail + '" alt="Episode ' + episode.number + '" class="episode-thumb-img" ';
        html += 'onerror="this.src=\'imgs/TBD.svg\'">';
        
        // Episode number overlay
        html += '<div class="episode-number-overlay">E' + episode.number + '</div>';
        
        // Unreleased overlay
        if (isDisabled) {
            html += '<div class="episode-unreleased-overlay">';
            html += '<div class="unreleased-icon">🔒</div>';
            html += '<div class="unreleased-text">Not Released</div>';
            html += '</div>';
        } else {
            // Play overlay for released episodes
            html += '<div class="episode-play-overlay">';
            html += '<div class="play-icon">▶</div>';
            html += '</div>';
        }
        
        html += '</div>';
        
        // Episode content
        html += '<div class="episode-content">';
        html += '<div class="episode-title">' + episode.title + '</div>';
        
        // Air date
        html += '<div class="episode-air-date">';
        var airDateLabel = episode.isReleased ? 'Aired:' : 'Airing:';
        html += '<span class="air-date-label">' + airDateLabel + '</span> ';
        html += '<span class="air-date-value">' + this.formatEpisodeAirDate(episode.airDate, episode.isReleased) + '</span>';
        html += '</div>';
        
        html += '<div class="episode-meta">';
        html += '<span class="episode-duration">' + episode.runtime + ' min</span>';
        html += '<span class="episode-rating">⭐ ' + episode.rating + '</span>';
        html += '</div>';
        html += '<div class="episode-overview">' + episode.overview.substring(0, 120) + '...</div>';
        html += '</div>';
        
        html += '</div>';
    }
    
    // Fade out and update content
    this.fadeOutContent(episodesGrid, function() {
        episodesGrid.innerHTML = html;
        
        // Add click handlers to episode cards
        var episodeCards = episodesGrid.querySelectorAll('.episode-card');
        for (var j = 0; j < episodeCards.length; j++) {
            episodeCards[j].addEventListener('click', function() {
                var season = parseInt(this.getAttribute('data-season'));
                var episodeNumber = parseInt(this.getAttribute('data-episode'));
                var isReleased = this.getAttribute('data-released') === 'true';
                
                console.log('📺 Episode card clicked: S' + season + 'E' + episodeNumber, 'Released:', isReleased);
                
                if (!isReleased) {
                    console.log('🔒 Episode not released yet - blocking playback');
                    self.showError('This episode hasn\'t been released yet. Please check back on the air date.');
                    return;
                }
                
                // Store modal state before launching media player
                self.storeModalState(media, 'episode-card', this);
                self.playTVEpisode(media.id, season, episodeNumber, media);
            });
        }
        
        self.fadeInContent(episodesGrid);
        
        // Update focusable elements for modal navigation
        if (window.simpleNavigation) {
            setTimeout(function() {
                console.log('🔄 EPISODE LOAD: Updating modal navigation elements');
                window.simpleNavigation.updateModalFocusableElements();
                
                // ✅ FOCUS FIX: After episodes load, maintain focus on season tab if no specific focus exists
                var currentFocus = document.activeElement;
                var activeSeasonTab = document.querySelector('.season-tab.active');
                
                if (activeSeasonTab && (!currentFocus || !currentFocus.classList.contains('focusable') || !currentFocus.classList.contains('season-tab'))) {
                    console.log('🎯 MAINTAINING FOCUS: Keeping focus on active season tab after episode load');
                    window.simpleNavigation.setFocus(activeSeasonTab);
                } else if (currentFocus && currentFocus.classList.contains('season-tab')) {
                    console.log('🎯 FOCUS OK: Season tab already has focus');
                }
            }, 200);
        }
    });
    
    console.log('✅ Episodes grid refreshed with real TMDB data');
};

// Generate realistic air dates
FlyxTVApplication.prototype.generateEpisodeAirDate = function(showYear, season, episode) {
    var baseYear = parseInt(showYear);
    var year = baseYear + (season - 1);
    
    // Create consistent start month based on show year and season to avoid randomness
    var showSeed = parseInt(showYear.toString().slice(-2)) + season; // Use last 2 digits + season
    var startMonth = (showSeed % 8) + 3; // March through October (typical TV seasons)
    var weeksOffset = episode - 1; // Episodes air weekly
    
    var startDate = new Date(year, startMonth - 1, 1);
    var episodeDate = new Date(startDate.getTime() + (weeksOffset * 7 * 24 * 60 * 60 * 1000));
    
    var finalYear = episodeDate.getFullYear();
    var finalMonth = episodeDate.getMonth() + 1;
    var finalDay = episodeDate.getDate();
    
    return finalYear + '-' + (finalMonth < 10 ? '0' : '') + finalMonth + '-' + (finalDay < 10 ? '0' : '') + finalDay;
};

// Check if content is released based on air date
FlyxTVApplication.prototype.isContentReleased = function(airDate) {
    if (!airDate) return true; // If no air date, assume released
    
    var today = new Date();
    var releaseDate = new Date(airDate);
    
    // Content is released if air date is today or in the past
    return releaseDate <= today;
};

// REMOVED: generateEpisodeThumbnail function - no longer generates fake URLs
// All fallback episodes use imgs/TBD.svg directly
// Real TMDB episodes get thumbnails from fetchTMDBSeasonEpisodes

// Generate realistic movie release dates (some might be in the future)
FlyxTVApplication.prototype.generateMovieReleaseDate = function(movieYear) {
    var baseYear = parseInt(movieYear);
    var currentYear = new Date().getFullYear();
    
    // 70% chance the movie is already released, 30% chance it's upcoming
    var isUpcoming = Math.random() < 0.3;
    
    if (isUpcoming && baseYear >= currentYear) {
        // Generate future release date
        var futureYear = baseYear;
        var month = Math.floor(Math.random() * 12) + 1;
        var day = Math.floor(Math.random() * 28) + 1;
        
        // Add some months to make it clearly in the future
        var futureDate = new Date(futureYear, month - 1, day);
        var today = new Date();
        if (futureDate <= today) {
            // Make sure it's actually in the future
            futureDate = new Date(today.getTime() + (Math.random() * 365 * 24 * 60 * 60 * 1000)); // Up to 1 year in future
        }
        
        var finalYear = futureDate.getFullYear();
        var finalMonth = futureDate.getMonth() + 1;
        var finalDay = futureDate.getDate();
        
        return finalYear + '-' + (finalMonth < 10 ? '0' : '') + finalMonth + '-' + (finalDay < 10 ? '0' : '') + finalDay;
    } else {
        // Generate past release date
        var year = Math.min(baseYear, currentYear - Math.floor(Math.random() * 5)); // Up to 5 years ago
        var month = Math.floor(Math.random() * 12) + 1;
        var day = Math.floor(Math.random() * 28) + 1;
        
        return year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    }
};

// Format air date for display (for movies - includes "Coming" prefix)
FlyxTVApplication.prototype.formatAirDate = function(airDate) {
    if (!airDate) return 'Unknown';
    
    var date = new Date(airDate);
    var today = new Date();
    
    // Format: "Dec 15, 2023" or "Coming Dec 15, 2023" for future dates
    if (date > today) {
        return 'Coming ' + date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
};

// Format episode air date for display (no "Coming" prefix, just the date)
FlyxTVApplication.prototype.formatEpisodeAirDate = function(airDate, isReleased) {
    if (!airDate) return 'Unknown';
    
    var date = new Date(airDate);
    
    // Always format as "Dec 15, 2023" regardless of release status
    // The "Aired:" vs "Airing:" label handles the future/past distinction
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
};



// Enhanced TV episode playback with better error handling
FlyxTVApplication.prototype.playTVEpisode = function(id, season, episode, media) {
    var self = this;
    
    console.log('📺 Playing TV episode:', media.title, 'S' + season + 'E' + episode, '(ID:', id, ')');
    
    // Show enhanced loading state
    this.setStreamingLoadingState(true, 'Extracting episode stream for S' + season + 'E' + episode + '...');
    
    // Return promise for better error handling
    return window.apiClient.getTVEpisodeStream(id, season, episode)
        .then(function(streamInfo) {
            if (streamInfo && streamInfo.streamUrl) {
                console.log('✅ TV episode stream extracted successfully');
                
                // Add episode info to stream data
                streamInfo.episodeInfo = {
                    season: season,
                    episode: episode,
                    title: media.title + ' - S' + season + 'E' + episode
                };
                
                // Fetch subtitles if IMDB ID is available  
                if (media.imdb_id || (media.subtitle_ready && media.subtitle_ready.imdb_id)) {
                    var imdbId = media.imdb_id || media.subtitle_ready.imdb_id;
                    console.log('📺 Fetching subtitles for TV episode IMDB ID:', imdbId, 'S' + season + 'E' + episode);
                    
                    self.setStreamingLoadingState(true, 'Fetching episode subtitles...');
                    
                    return window.apiClient.getSubtitles(imdbId, 'eng', season, episode)
                        .then(function(subtitleInfo) {
                            if (subtitleInfo && subtitleInfo.success && subtitleInfo.subtitles) {
                                console.log('✅ Episode subtitles loaded:', subtitleInfo.totalCount, 'subtitles available');
                                streamInfo.subtitles = subtitleInfo.subtitles;
                                streamInfo.subtitleInfo = subtitleInfo;
                            } else {
                                console.log('📝 No subtitles available for this episode');
                                streamInfo.subtitles = [];
                            }
                            
                            self.setStreamingLoadingState(false);
                            self.hideModalForMediaPlayer();
                            self.launchMediaPlayer(streamInfo, media);
                            return streamInfo;
                        })
                        .catch(function(subtitleError) {
                            console.warn('❌ Error fetching episode subtitles:', subtitleError.message);
                            streamInfo.subtitles = [];
                            self.setStreamingLoadingState(false);
                            self.hideModalForMediaPlayer();
                            self.launchMediaPlayer(streamInfo, media);
                            return streamInfo;
                        });
                } else {
                    console.log('📝 No IMDB ID available, skipping subtitle fetch for episode');
                    self.setStreamingLoadingState(false);
                    streamInfo.subtitles = [];
                    self.hideModalForMediaPlayer();
                    self.launchMediaPlayer(streamInfo, media);
                    return streamInfo;
                }
            } else {
                self.setStreamingLoadingState(false);
                var errorMsg = 'No streaming source available for this episode.';
                self.showError(errorMsg);
                throw new Error(errorMsg);
            }
        })
        .catch(function(error) {
            self.setStreamingLoadingState(false);
            console.error('❌ Error getting TV episode stream:', error);
            var errorMsg = 'Failed to extract episode stream. Please try again.';
            self.showError(errorMsg);
            throw error;
        });
};

// Enhanced movie playback with better error handling  
FlyxTVApplication.prototype.playMovie = function(id, media) {
    var self = this;
    
    console.log('🎬 Playing movie:', media.title, '(ID:', id, ')');
    
    // Show loading state
    this.setStreamingLoadingState(true, 'Extracting movie stream...');
    
    // Return promise for better error handling
    return window.apiClient.getMovieStream(id)
        .then(function(streamInfo) {
            if (streamInfo && streamInfo.streamUrl) {
                console.log('✅ Movie stream extracted successfully');
                
                // Fetch subtitles if IMDB ID is available
                if (media.imdb_id || (media.subtitle_ready && media.subtitle_ready.imdb_id)) {
                    var imdbId = media.imdb_id || media.subtitle_ready.imdb_id;
                    console.log('🎬 Fetching subtitles for movie IMDB ID:', imdbId);
                    
                    self.setStreamingLoadingState(true, 'Fetching subtitles...');
                    
                    return window.apiClient.getSubtitles(imdbId, 'eng')
                        .then(function(subtitleInfo) {
                            if (subtitleInfo && subtitleInfo.success && subtitleInfo.subtitles) {
                                console.log('✅ Subtitles loaded:', subtitleInfo.totalCount, 'subtitles available');
                                streamInfo.subtitles = subtitleInfo.subtitles;
                                streamInfo.subtitleInfo = subtitleInfo;
                            } else {
                                console.log('📝 No subtitles available for this movie');
                                streamInfo.subtitles = [];
                            }
                            
                            self.setStreamingLoadingState(false);
                            self.hideModalForMediaPlayer();
                            self.launchMediaPlayer(streamInfo, media);
                            return streamInfo;
                        })
                        .catch(function(subtitleError) {
                            console.warn('❌ Error fetching subtitles:', subtitleError.message);
                            streamInfo.subtitles = [];
                            self.setStreamingLoadingState(false);
                            self.hideModalForMediaPlayer();
                            self.launchMediaPlayer(streamInfo, media);
                            return streamInfo;
                        });
                } else {
                    console.log('📝 No IMDB ID available, skipping subtitle fetch');
                    self.setStreamingLoadingState(false);
                    streamInfo.subtitles = [];
                    self.hideModalForMediaPlayer();
                    self.launchMediaPlayer(streamInfo, media);
                    return streamInfo;
                }
            } else {
                self.setStreamingLoadingState(false);
                var errorMsg = 'No streaming source available for this movie.';
                self.showError(errorMsg);
                throw new Error(errorMsg);
            }
        })
        .catch(function(error) {
            self.setStreamingLoadingState(false);
            console.error('❌ Error getting movie stream:', error);
            var errorMsg = 'Failed to extract movie stream. Please try again.';
            self.showError(errorMsg);
            throw error;
        });
};

// Backward compatibility - legacy playMedia function
FlyxTVApplication.prototype.playMedia = function(id, mediaType) {
    console.log('🔄 Legacy playMedia called, redirecting to enhanced methods');
    
    if (mediaType === 'tv') {
        // Default to Season 1, Episode 1 for legacy calls
        this.playTVEpisode(id, 1, 1, { id: id, mediaType: mediaType, title: 'TV Show' });
    } else {
        this.playMovie(id, { id: id, mediaType: mediaType, title: 'Movie' });
    }
};

// Enhanced streaming loading state
FlyxTVApplication.prototype.setStreamingLoadingState = function(isLoading, message) {
    var modal = document.getElementById('media-modal');
    var modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalContent) return;
    
    if (isLoading) {
        // Create streaming-specific loading overlay
        var loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'streaming-loading-overlay';
        loadingOverlay.className = 'streaming-loading-overlay';
        loadingOverlay.innerHTML = 
            '<div class="streaming-loading-content">' +
            '<div class="streaming-loader-spinner"></div>' +
            '<h3 class="streaming-loading-title">Preparing Stream</h3>' +
            '<p class="streaming-loading-message">' + (message || 'Extracting stream...') + '</p>' +
            '<div class="streaming-progress-bar">' +
            '<div class="streaming-progress-fill"></div>' +
            '</div>' +
            '</div>';
        
        modal.appendChild(loadingOverlay);
        
        // Animate progress bar
        var progressFill = loadingOverlay.querySelector('.streaming-progress-fill');
        if (progressFill) {
            var progress = 0;
            var progressInterval = setInterval(function() {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90; // Don't complete until real completion
                progressFill.style.width = progress + '%';
            }, 500);
            
            loadingOverlay.setAttribute('data-progress-interval', progressInterval);
        }
    } else {
        // Remove loading overlay
        var existingOverlay = document.getElementById('streaming-loading-overlay');
        if (existingOverlay) {
            var progressInterval = existingOverlay.getAttribute('data-progress-interval');
            if (progressInterval) {
                clearInterval(parseInt(progressInterval));
            }
            existingOverlay.remove();
        }
    }
};

FlyxTVApplication.prototype.launchMediaPlayer = function(streamInfo, media) {
    console.log('🚀 Launching enhanced media player with REAL functionality:', {
        streamUrl: streamInfo.streamUrl ? streamInfo.streamUrl.substring(0, 100) + '...' : 'none',
        hasSubtitles: !!streamInfo.subtitles,
        subtitleCount: streamInfo.subtitles ? streamInfo.subtitles.length : 0,
        server: streamInfo.server,
        mediaTitle: media ? media.title : 'Unknown',
        imdbId: media ? (media.imdb_id || 'none') : 'none'
    });
    
    // Enhanced stream info with media metadata and REAL subtitle data
    var enhancedStreamInfo = {
        streamUrl: streamInfo.streamUrl,
        title: media ? media.title : 'Media Player',
        poster: media ? media.poster : '',
        subtitles: streamInfo.subtitles || [],
        subtitleInfo: streamInfo.subtitleInfo || null,
        server: streamInfo.server || 'vidsrc.xyz',
        quality: streamInfo.quality || 'HD',
        mediaType: media ? media.mediaType : 'movie',
        // Add episode info if available
        episodeInfo: streamInfo.episodeInfo || null,
        // Add VM-server metadata
        vmInfo: {
            requestId: streamInfo.requestId,
            extractionTime: streamInfo.vmResponseTime,
            streamSource: streamInfo.server
        },
        // Add subtitle metadata
        subtitleMeta: {
            source: streamInfo.subtitleInfo ? streamInfo.subtitleInfo.source : 'none',
            language: streamInfo.subtitleInfo ? streamInfo.subtitleInfo.language : 'none',
            totalCount: streamInfo.subtitleInfo ? streamInfo.subtitleInfo.totalCount : 0,
            hasRealSubtitles: !!(streamInfo.subtitles && streamInfo.subtitles.length > 0)
        },
        // Add media metadata for subtitle context
        mediaMetadata: {
            imdbId: media ? (media.imdb_id || media.subtitle_ready?.imdb_id) : null,
            tmdbId: media ? media.id : null,
            originalTitle: media ? media.title : null,
            year: media ? media.year : null,
            type: media ? media.mediaType : 'movie'
        }
    };
    
    if (window.tvMediaPlayer) {
        console.log('✅ Launching TV Media Player with complete stream info');
        window.tvMediaPlayer.loadMedia(enhancedStreamInfo);
    } else {
        console.warn('📱 TV Media Player not available, showing enhanced stream info');
        this.showStreamInfo(enhancedStreamInfo);
    }
};

// Enhanced fallback stream info display with subtitle information
FlyxTVApplication.prototype.showStreamInfo = function(streamInfo) {
    var self = this;
    var modal = document.getElementById('media-modal');
    var modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalContent) return;
    
    var html = '<div class="stream-info-display">';
    html += '<h2>🎬 Stream Ready with REAL Data</h2>';
    html += '<p><strong>Title:</strong> ' + streamInfo.title + '</p>';
    html += '<p><strong>Quality:</strong> ' + streamInfo.quality + '</p>';
    html += '<p><strong>Server:</strong> ' + streamInfo.server + '</p>';
    
    if (streamInfo.episodeInfo) {
        html += '<p><strong>Episode:</strong> S' + streamInfo.episodeInfo.season + 'E' + streamInfo.episodeInfo.episode + '</p>';
    }
    
    // Add subtitle information
    if (streamInfo.subtitleMeta && streamInfo.subtitleMeta.hasRealSubtitles) {
        html += '<div class="subtitle-info-section">';
        html += '<h3>📝 Subtitle Information</h3>';
        html += '<p><strong>Subtitles Available:</strong> ✅ Yes (' + streamInfo.subtitleMeta.totalCount + ' found)</p>';
        html += '<p><strong>Language:</strong> ' + streamInfo.subtitleMeta.language + '</p>';
        html += '<p><strong>Source:</strong> ' + streamInfo.subtitleMeta.source + '</p>';
        
        if (streamInfo.subtitles && streamInfo.subtitles.length > 0) {
            html += '<details class="subtitle-details">';
            html += '<summary><strong>View Available Subtitles</strong></summary>';
            html += '<ul class="subtitle-list">';
            for (var i = 0; i < Math.min(5, streamInfo.subtitles.length); i++) {
                var sub = streamInfo.subtitles[i];
                html += '<li>' + sub.languageName + ' (' + sub.format + ') - Quality: ' + sub.qualityScore + '/100</li>';
            }
            if (streamInfo.subtitles.length > 5) {
                html += '<li>... and ' + (streamInfo.subtitles.length - 5) + ' more</li>';
            }
            html += '</ul>';
            html += '</details>';
        }
        html += '</div>';
    } else {
        html += '<div class="subtitle-info-section">';
        html += '<h3>📝 Subtitle Information</h3>';
        html += '<p><strong>Subtitles Available:</strong> ❌ No subtitles found</p>';
        if (streamInfo.mediaMetadata && streamInfo.mediaMetadata.imdbId) {
            html += '<p><strong>IMDB ID:</strong> ' + streamInfo.mediaMetadata.imdbId + '</p>';
            html += '<p><em>Note: Subtitles were searched using real OpenSubtitles API</em></p>';
        } else {
            html += '<p><em>No IMDB ID available for subtitle search</em></p>';
        }
        html += '</div>';
    }
    
    // Add VM server information
    if (streamInfo.vmInfo) {
        html += '<div class="vm-info-section">';
        html += '<h3>🚀 Stream Extraction Info</h3>';
        html += '<p><strong>Extraction Server:</strong> ' + streamInfo.vmInfo.streamSource + '</p>';
        html += '<p><strong>Request ID:</strong> ' + (streamInfo.vmInfo.requestId || 'N/A') + '</p>';
        if (streamInfo.vmInfo.extractionTime) {
            html += '<p><strong>Extraction Time:</strong> ' + streamInfo.vmInfo.extractionTime + 'ms</p>';
        }
        html += '</div>';
    }
    
    html += '<p><strong>Stream URL:</strong><br><code style="word-break: break-all; font-size: 12px;">' + streamInfo.streamUrl + '</code></p>';
    
    html += '<div class="stream-actions">';
    html += '<button id="open-stream-btn" class="action-btn primary focusable" tabindex="0">Open Stream</button>';
    html += '<button id="close-stream-btn" class="action-btn secondary focusable" tabindex="0">Close</button>';
    html += '</div>';
    
    html += '</div>';
    
    modalContent.innerHTML = html;
    
    // Add event listeners for stream buttons
    var openStreamBtn = document.getElementById('open-stream-btn');
    var closeStreamBtn = document.getElementById('close-stream-btn');
    
    if (openStreamBtn) {
        openStreamBtn.addEventListener('click', function() {
            window.open(streamInfo.streamUrl, '_blank');
        });
    }
    
    if (closeStreamBtn) {
        closeStreamBtn.addEventListener('click', function() {
            self.closeModal();
        });
    }
    
    // Update navigation
    if (window.simpleNavigation) {
        setTimeout(function() {
            window.simpleNavigation.setModalMode(true);
        }, 100);
    }
};

// ==================== HOMEPAGE & MODAL STATE MANAGEMENT ====================
// Store homepage focus state before opening modal + modal state before launching media player

FlyxTVApplication.prototype.storeHomepageFocusState = function() {
    console.log('🏠 Storing homepage focus state...');
    
    // Only store if we're currently on the home page and have a focused element
    if (this.currentPage !== 'home' || !window.simpleNavigation || !window.simpleNavigation.currentFocus) {
        console.log('🏠 Not on home page or no focus - skipping homepage state storage');
        return;
    }
    
    var currentFocus = window.simpleNavigation.currentFocus;
    
    // Only store if the focused element is a media card (not nav buttons or other elements)
    if (!currentFocus.classList.contains('media-card')) {
        console.log('🏠 Focused element is not a media card - skipping homepage state storage');
        return;
    }
    
    // Find the position of this card within its section for better restoration
    var sectionId = this.findParentSectionId(currentFocus);
    var cardPosition = this.findCardPositionInSection(currentFocus, sectionId);
    
    this.storedHomepageState = {
        focusedElement: {
            className: currentFocus.className,
            id: currentFocus.id,
            tagName: currentFocus.tagName,
            mediaId: currentFocus.getAttribute('data-media-id'),
            mediaTitle: currentFocus.getAttribute('data-media-title'),
            mediaType: currentFocus.getAttribute('data-media-type'),
            sectionId: sectionId,
            cardPosition: cardPosition
        },
        currentPage: this.currentPage,
        timestamp: Date.now()
    };
    
    console.log('🏠 Stored homepage focus state:', {
        mediaId: this.storedHomepageState.focusedElement.mediaId,
        mediaTitle: this.storedHomepageState.focusedElement.mediaTitle,
        mediaType: this.storedHomepageState.focusedElement.mediaType,
        sectionId: this.storedHomepageState.focusedElement.sectionId,
        cardPosition: this.storedHomepageState.focusedElement.cardPosition,
        className: this.storedHomepageState.focusedElement.className,
        currentPage: this.storedHomepageState.currentPage
    });
};

FlyxTVApplication.prototype.findParentSectionId = function(element) {
    var current = element;
    var maxLevels = 10;
    var level = 0;
    
    while (current && level < maxLevels) {
        // Look for content section container
        if (current.classList && current.classList.contains('content-section')) {
            return current.id || current.getAttribute('data-section-id');
        }
        
        // Look for specific grid containers
        if (current.id && (
            current.id.includes('grid') || 
            current.id.includes('trending') || 
            current.id.includes('popular')
        )) {
            return current.id;
        }
        
        current = current.parentElement;
        level++;
    }
    
    console.warn('⚠️ Could not find parent section ID for element:', element.className);
    return 'unknown-section';
};

FlyxTVApplication.prototype.findCardPositionInSection = function(cardElement, sectionId) {
    if (!sectionId || sectionId === 'unknown-section') {
        return -1;
    }
    
    var sectionElement = document.getElementById(sectionId);
    if (!sectionElement) {
        return -1;
    }
    
    var cardsInSection = sectionElement.querySelectorAll('.media-card');
    for (var i = 0; i < cardsInSection.length; i++) {
        if (cardsInSection[i] === cardElement) {
            console.log('🎯 Found card position in section:', i, 'of', cardsInSection.length);
            return i;
        }
    }
    
    return -1;
};

FlyxTVApplication.prototype.restoreHomepageFocusState = function() {
    console.log('🏠 Restoring homepage focus state...');
    
    if (!this.storedHomepageState) {
        console.log('🏠 No stored homepage state found - using default focus');
        this.setDefaultHomepageFocus();
        return;
    }
    
    // Only restore if we're on the home page
    if (this.currentPage !== 'home') {
        console.log('🏠 Not on home page - skipping homepage focus restoration');
        return;
    }
    
    var state = this.storedHomepageState;
    console.log('🏠 Attempting to restore focus to:', {
        mediaId: state.focusedElement.mediaId,
        mediaTitle: state.focusedElement.mediaTitle,
        sectionId: state.focusedElement.sectionId
    });
    
    setTimeout(() => {
        var targetElement = null;
        
        // Try to find the exact element by media ID
        if (state.focusedElement.mediaId) {
            targetElement = document.querySelector(`[data-media-id="${state.focusedElement.mediaId}"]`);
            if (targetElement) {
                console.log('🎯 Found exact media card by ID:', state.focusedElement.mediaId);
            }
        }
        
        // Fallback: try to find by media title in the same section
        if (!targetElement && state.focusedElement.mediaTitle && state.focusedElement.sectionId) {
            var sectionElement = document.getElementById(state.focusedElement.sectionId);
            if (sectionElement) {
                var cardsInSection = sectionElement.querySelectorAll('.media-card');
                for (var i = 0; i < cardsInSection.length; i++) {
                    var card = cardsInSection[i];
                    var cardTitle = card.getAttribute('data-media-title');
                    if (cardTitle === state.focusedElement.mediaTitle) {
                        targetElement = card;
                        console.log('🎯 Found media card by title in section:', cardTitle);
                        break;
                    }
                }
            }
        }
        
        // Fallback: try to find card by position in the stored section
        if (!targetElement && state.focusedElement.sectionId && state.focusedElement.cardPosition >= 0) {
            var sectionElement = document.getElementById(state.focusedElement.sectionId);
            if (sectionElement) {
                var cardsInSection = sectionElement.querySelectorAll('.media-card');
                if (cardsInSection.length > state.focusedElement.cardPosition) {
                    var cardByPosition = cardsInSection[state.focusedElement.cardPosition];
                    if (cardByPosition && window.simpleNavigation.focusableElements.indexOf(cardByPosition) !== -1) {
                        targetElement = cardByPosition;
                        console.log('🎯 Found card by position in section:', state.focusedElement.cardPosition);
                    }
                }
            }
        }
        
        // Final fallback: find first card in the stored section
        if (!targetElement && state.focusedElement.sectionId) {
            var sectionElement = document.getElementById(state.focusedElement.sectionId);
            if (sectionElement) {
                var firstCard = sectionElement.querySelector('.media-card');
                if (firstCard && window.simpleNavigation.focusableElements.indexOf(firstCard) !== -1) {
                    targetElement = firstCard;
                    console.log('🎯 Found first card in stored section:', state.focusedElement.sectionId);
                }
            }
        }
        
        // Final fallback: use default homepage focus
        if (!targetElement) {
            console.log('🏠 Could not restore specific focus - using default');
            this.setDefaultHomepageFocus();
            return;
        }
        
        // Set focus to the found element
        if (window.simpleNavigation && window.simpleNavigation.focusableElements.indexOf(targetElement) !== -1) {
            console.log('✅ Restoring homepage focus to:', targetElement.getAttribute('data-media-title') || targetElement.className);
            window.simpleNavigation.setFocus(targetElement);
        } else {
            console.log('🏠 Target element not focusable - using default focus');
            this.setDefaultHomepageFocus();
        }
        
        // Clear stored state after restoration
        this.storedHomepageState = null;
    }, 200);
};

FlyxTVApplication.prototype.setDefaultHomepageFocus = function() {
    console.log('🏠 Setting default homepage focus...');
    
    if (!window.simpleNavigation) {
        console.warn('⚠️ simpleNavigation not available for default focus');
        return;
    }
    
    // Find the first media card in the first visible section
    var sections = document.querySelectorAll('.content-section');
    for (var i = 0; i < sections.length; i++) {
        var section = sections[i];
        if (!this.isVisible(section)) continue;
        
        var firstCard = section.querySelector('.media-card');
        if (firstCard && window.simpleNavigation.focusableElements.indexOf(firstCard) !== -1) {
            console.log('🎯 Setting default focus to first card in section:', section.id);
            window.simpleNavigation.setFocus(firstCard);
            return;
        }
    }
    
    console.warn('⚠️ Could not find any media cards for default focus');
};

FlyxTVApplication.prototype.isVisible = function(element) {
    if (!element) return false;
    var style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetHeight > 0 && element.offsetWidth > 0;
};

FlyxTVApplication.prototype.storeModalState = function(media, focusType, focusElement) {
    console.log('💾 Storing modal state for:', media.title, 'Focus type:', focusType);
    
    this.storedModalState = {
        media: media,
        focusType: focusType || 'play-button',
        focusElement: focusElement || null,
        selectedSeason: this.currentSelectedSeason || 1,
        modalContent: null,
        timestamp: Date.now()
    };
    
    // Store the current modal HTML content for exact restoration
    var modalContent = document.getElementById('modal-content');
    if (modalContent) {
        // CRITICAL: Make sure we don't store any loading overlays in the content
        var cleanContent = modalContent.cloneNode(true);
        var loadingOverlays = cleanContent.querySelectorAll('#streaming-loading-overlay, .streaming-loading-overlay, .loading-state, .loading-indicator');
        for (var i = 0; i < loadingOverlays.length; i++) {
            console.log('🗑️ Removing loading overlay from stored content:', loadingOverlays[i].className);
            loadingOverlays[i].remove();
        }
        
        this.storedModalState.modalContent = cleanContent.innerHTML;
        console.log('💾 Stored clean modal content length:', cleanContent.innerHTML.length);
    } else {
        console.warn('❌ No modal content found to store');
    }
    
    // Store focus element details if it exists
    if (window.simpleNavigation && window.simpleNavigation.currentFocus) {
        var currentFocus = window.simpleNavigation.currentFocus;
        this.storedModalState.focusElement = {
            className: currentFocus.className,
            id: currentFocus.id,
            tagName: currentFocus.tagName,
            dataAttributes: {
                season: currentFocus.getAttribute('data-season'),
                episode: currentFocus.getAttribute('data-episode'),
                control: currentFocus.getAttribute('data-control')
            }
        };
        console.log('💾 Stored focus element:', this.storedModalState.focusElement);
    } else {
        console.warn('❌ No current focus found to store');
    }
    
    console.log('💾 Complete stored state:', {
        title: this.storedModalState.media.title,
        mediaType: this.storedModalState.media.mediaType,
        selectedSeason: this.storedModalState.selectedSeason,
        focusType: this.storedModalState.focusType,
        hasContent: !!this.storedModalState.modalContent,
        hasFocusElement: !!this.storedModalState.focusElement
    });
};

FlyxTVApplication.prototype.restoreModalState = function() {
    console.log('🔄 Restoring modal state...');
    
    if (!this.storedModalState) {
        console.warn('❌ No stored modal state found - falling back to close modal');
        this.closeModal();
        return;
    }
    
    var state = this.storedModalState;
    console.log('🔄 Restoring modal for:', state.media.title, 'Focus:', state.focusType, 'Season:', state.selectedSeason);
    console.log('🔄 State details:', {
        mediaType: state.media.mediaType,
        hasModalContent: !!state.modalContent,
        focusElement: state.focusElement
    });
    
    var modal = document.getElementById('media-modal');
    var modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalContent) {
        console.warn('❌ Modal elements not found');
        return;
    }
    
    // Show the modal
    modal.style.display = 'flex';
    console.log('✅ Modal display set to flex');
    
    // CRITICAL: Clear any streaming loading overlays and states first
    console.log('🗑️ Aggressively clearing all loading states before modal restoration');
    this.setStreamingLoadingState(false);
    
    // Remove any streaming overlays from modal
    var streamingOverlays = modal.querySelectorAll('#streaming-loading-overlay, .streaming-loading-overlay');
    for (var i = 0; i < streamingOverlays.length; i++) {
        console.log('🗑️ Removing streaming overlay:', streamingOverlays[i].className);
        streamingOverlays[i].remove();
    }
    
    // Clear any other loading states that might interfere
    var loadingElements = modal.querySelectorAll('.loading-state, .loading-indicator, .episode-loader-spinner');
    for (var j = 0; j < loadingElements.length; j++) {
        console.log('🗑️ Removing loading element:', loadingElements[j].className);
        loadingElements[j].remove();
    }
    
    // Restore the exact modal content
    if (state.modalContent) {
        modalContent.innerHTML = state.modalContent;
        console.log('✅ Modal content restored from stored HTML');
        
        // Re-setup event handlers for TV shows
        if (state.media.mediaType === 'tv') {
            setTimeout(() => {
                // Set the current season before setting up handlers
                this.currentSelectedSeason = state.selectedSeason;
                this.setupSeasonEpisodeHandlers(state.media);
                // Don't call switchToSeason again since the content is already restored
            }, 100);
        } else {
            // Re-setup movie play button
            setTimeout(() => {
                this.setupMoviePlayButton(state.media);
            }, 100);
        }
    } else {
        // Fallback to regenerating content
        console.log('🔄 Regenerating modal content...');
        modalContent.innerHTML = this.createMediaDetailsHTML(state.media);
        
        if (state.media.mediaType === 'tv') {
            setTimeout(() => {
                // Set the current season before setting up handlers
                this.currentSelectedSeason = state.selectedSeason;
                this.setupSeasonEpisodeHandlers(state.media);
                this.switchToSeason(state.selectedSeason, state.media);
            }, 100);
        } else {
            // Re-setup movie play button
            setTimeout(() => {
                this.setupMoviePlayButton(state.media);
            }, 100);
        }
    }
    
    // Restore navigation mode and focus
    if (window.simpleNavigation) {
        setTimeout(() => {
            console.log('🔒 Modal restored - reactivating modal navigation mode');
            window.simpleNavigation.setModalMode(true);
            
            // FINAL CHECK: Ensure no loading overlays snuck back in
            this.setStreamingLoadingState(false);
            var finalCheck = document.getElementById('streaming-loading-overlay');
            if (finalCheck) {
                console.log('🗑️ FINAL CLEANUP: Removing streaming overlay that appeared during restoration');
                finalCheck.remove();
            }
            
            // Restore specific focus
            this.restoreModalFocus(state);
        }, 300);
    }
    
    // Clear stored state after restoration
    this.storedModalState = null;
};

FlyxTVApplication.prototype.restoreModalFocus = function(state) {
    console.log('🎯 Restoring focus to:', state.focusType, state.focusElement);
    
    if (!window.simpleNavigation) return;
    
    // Wait for DOM elements to be ready
    setTimeout(() => {
        var targetElement = null;
        
        // Try to find the exact element that was focused
        if (state.focusElement) {
            var focus = state.focusElement;
            
            // Try by ID first
            if (focus.id) {
                targetElement = document.getElementById(focus.id);
            }
            
            // Try by class and data attributes for episode cards
            if (!targetElement && focus.dataAttributes.season && focus.dataAttributes.episode) {
                targetElement = document.querySelector(
                    `.episode-card[data-season="${focus.dataAttributes.season}"][data-episode="${focus.dataAttributes.episode}"]`
                );
            }
            
            // Try by class and data attributes for season tabs
            if (!targetElement && focus.dataAttributes.season && focus.className.includes('season-tab')) {
                targetElement = document.querySelector(
                    `.season-tab[data-season="${focus.dataAttributes.season}"]`
                );
            }
            
            // Try by class name
            if (!targetElement && focus.className) {
                var elements = document.querySelectorAll('.' + focus.className.split(' ')[0]);
                if (elements.length > 0) {
                    targetElement = elements[0];
                }
            }
        }
        
        // Fallback based on focus type
        if (!targetElement) {
            switch (state.focusType) {
                case 'episode-card':
                    targetElement = document.querySelector('.episode-card');
                    break;
                case 'season-tab':
                    targetElement = document.querySelector('.season-tab.active') || 
                                  document.querySelector('.season-tab');
                    break;
                case 'play-button':
                default:
                    targetElement = document.getElementById('play-movie-btn') ||
                                  document.querySelector('.season-tab') ||
                                  document.querySelector('.episode-card');
                    break;
            }
        }
        
        if (targetElement && window.simpleNavigation.focusableElements.indexOf(targetElement) !== -1) {
            console.log('✅ Restoring focus to:', targetElement.className, targetElement.id);
            // CRITICAL: Set focus WITHOUT triggering any events
            if (window.simpleNavigation.setFocusWithoutEvents) {
                window.simpleNavigation.setFocusWithoutEvents(targetElement);
            } else {
                // Fallback: manually set focus classes without triggering events
                console.warn('⚠️ setFocusWithoutEvents not available, using manual fallback');
                if (window.simpleNavigation.currentFocus) {
                    window.simpleNavigation.currentFocus.classList.remove('simple-focused', 'tv-focused');
                }
                window.simpleNavigation.currentFocus = targetElement;
                targetElement.classList.add('simple-focused');
                if (targetElement.classList.contains('focusable')) {
                    targetElement.classList.add('tv-focused');
                }
            }
        } else {
            console.log('🎯 Target element not found or not focusable, setting default focus');
            var firstFocusable = document.querySelector('.focusable');
            if (firstFocusable) {
                // CRITICAL: Set focus WITHOUT triggering any events
                if (window.simpleNavigation.setFocusWithoutEvents) {
                    window.simpleNavigation.setFocusWithoutEvents(firstFocusable);
                } else {
                    // Fallback: manually set focus classes without triggering events
                    console.warn('⚠️ setFocusWithoutEvents not available, using manual fallback');
                    if (window.simpleNavigation.currentFocus) {
                        window.simpleNavigation.currentFocus.classList.remove('simple-focused', 'tv-focused');
                    }
                    window.simpleNavigation.currentFocus = firstFocusable;
                    firstFocusable.classList.add('simple-focused');
                    if (firstFocusable.classList.contains('focusable')) {
                        firstFocusable.classList.add('tv-focused');
                    }
                }
            }
        }
    }, 100);
};

FlyxTVApplication.prototype.setupMoviePlayButton = function(media) {
    var self = this;
    setTimeout(() => {
        var moviePlayBtn = document.getElementById('play-movie-btn');
        
        if (moviePlayBtn && !moviePlayBtn.disabled) {
            moviePlayBtn.addEventListener('click', function() {
                console.log('🎬 Movie play button clicked for:', media.title);
                
                // Check if movie is released
                var isReleased = self.isContentReleased(media.release_date);
                if (!isReleased) {
                    console.log('🔒 Movie not released yet - blocking playback');
                    self.showError('This movie hasn\'t been released yet. Please check back on the release date.');
                    return;
                }
                
                self.storeModalState(media, 'play-button', this);
                self.playMovie(media.id, media);
            });
        } else if (moviePlayBtn && moviePlayBtn.disabled) {
            // Add click handler for disabled button to show error message
            moviePlayBtn.addEventListener('click', function() {
                console.log('🔒 Disabled movie play button clicked');
                self.showError('This movie hasn\'t been released yet. Please check back on the release date.');
            });
        }
    }, 100);
};

// Hide modal temporarily for media player (instead of closing it)
FlyxTVApplication.prototype.hideModalForMediaPlayer = function() {
    console.log('👁️ Hiding modal for media player (not closing)');
    console.log('👁️ Current stored state exists:', !!this.storedModalState);
    
    // CRITICAL: Clear streaming loading state before hiding
    console.log('🗑️ Clearing streaming loading state before hiding modal');
    this.setStreamingLoadingState(false);
    
    var modal = document.getElementById('media-modal');
    if (modal) {
        modal.style.display = 'none';
        console.log('👁️ Modal hidden successfully');
    }
    
    // Deactivate modal navigation mode temporarily
    if (window.simpleNavigation) {
        window.simpleNavigation.setModalMode(false);
        console.log('👁️ Modal navigation mode deactivated');
    }
};

FlyxTVApplication.prototype.closeModal = function() {
    console.log('🔓 closeModal() called');
    var modal = document.getElementById('media-modal');
    if (modal) {
        console.log('🔓 Modal found - hiding modal and deactivating navigation mode');
        modal.style.display = 'none';
    } else {
        console.warn('❌ Modal element not found!');
    }
    
    // Clear any stored modal state when explicitly closing
    this.storedModalState = null;
    
    // Deactivate modal navigation mode immediately
    if (window.simpleNavigation) {
        console.log('🔓 Modal closed - deactivating modal navigation mode');
        window.simpleNavigation.setModalMode(false);
    } else {
        console.warn('❌ simpleNavigation not available!');
    }
    
    // CRITICAL: Restore homepage focus state when modal is closed
    this.restoreHomepageFocusState();
};

FlyxTVApplication.prototype.setLoadingState = function(isLoading) {
    this.isLoading = isLoading;
    
    // Update UI loading indicators
    var loadingElements = document.querySelectorAll('.loading-indicator');
    for (var i = 0; i < loadingElements.length; i++) {
        loadingElements[i].style.display = isLoading ? 'block' : 'none';
    }
};

FlyxTVApplication.prototype.showError = function(message) {
    var self = this;
    var errorToast = document.getElementById('error-toast');
    var errorMessage = document.getElementById('error-message');
    
    if (errorToast && errorMessage) {
        errorMessage.textContent = message;
        errorToast.style.display = 'block';
        
        // Auto-hide after 5 seconds
        clearTimeout(this.errorTimeout);
        this.errorTimeout = setTimeout(function() {
            self.hideError();
        }, 5000);
    }
    
    console.error('App Error:', message);
};

FlyxTVApplication.prototype.hideError = function() {
    var errorToast = document.getElementById('error-toast');
    if (errorToast) {
        errorToast.style.display = 'none';
    }
    
    clearTimeout(this.errorTimeout);
};

FlyxTVApplication.prototype.handleColorKey = function(color) {
    console.log('Color key pressed:', color);
    
    switch (color) {
        case 'red':
            // Red key - could be used for favorites
            break;
        case 'green':
            // Green key - could be used for settings
            break;
        case 'yellow':
            // Yellow key - could be used for info
            break;
        case 'blue':
            // Blue key - could be used for help
            break;
    }
};

FlyxTVApplication.prototype.handleBackNavigation = function() {
    console.log('🔙 Back navigation requested');
    
    // PRIORITY 1: Check if we have stored modal state to restore (after media player)
    if (this.storedModalState) {
        console.log('🔄 BACK NAVIGATION - Found stored modal state, restoring instead of going home');
        this.restoreModalState();
        return;
    }
    
    // PRIORITY 2: Navigate to home if not already there
    if (this.currentPage !== 'home') {
        console.log('📄 Not on home page - navigating to home');
        this.navigateToPage('home');
        return;
    }
    
    // NEVER EXIT THE APP - just ignore on home page
    console.log('🔙 On home page - ignoring back button (app will not close)');
};

FlyxTVApplication.prototype.handleAppPause = function() {
    console.log('App paused');
    // Handle app pause logic
};

FlyxTVApplication.prototype.handleAppResume = function() {
    console.log('App resumed');
    // Handle app resume logic
};

FlyxTVApplication.prototype.handleAppRelaunch = function(params) {
    console.log('App relaunched with params:', params);
    // Handle app relaunch logic
};

FlyxTVApplication.prototype.loadHomePage = function() {
    var self = this;
    
    console.log('📺 Loading enhanced home page with new sections...');
    
    // Show loading states for all grids
    this.showGridLoadingState('trending-today-grid');
    this.showGridLoadingState('popular-movies-usa-grid');
    this.showGridLoadingState('popular-shows-usa-grid');
    this.showGridLoadingState('trending-anime-grid');
    
    // Load all sections in parallel for better performance
    Promise.all([
        window.apiClient.getTrendingToday(),
        window.apiClient.getPopularMoviesUSA(),
        window.apiClient.getPopularShowsUSA(), 
        window.apiClient.getTrendingAnime()
    ]).then(function(results) {
        console.log('✅ All home page sections loaded successfully');
        
        // Populate each grid with its respective data
        self.populateGrid('trending-today-grid', results[0]);
        self.populateGrid('popular-movies-usa-grid', results[1]);
        self.populateGrid('popular-shows-usa-grid', results[2]);
        self.populateGrid('trending-anime-grid', results[3]);
        
    }).catch(function(error) {
        console.error('❌ Error loading home page sections:', error);
        
        // Load fallback data for each section
        self.populateGrid('trending-today-grid', []);
        self.populateGrid('popular-movies-usa-grid', []);
        self.populateGrid('popular-shows-usa-grid', []);
        self.populateGrid('trending-anime-grid', []);
    });
    
    // Initialize search functionality
    this.initializeAdvancedSearch();
};

FlyxTVApplication.prototype.showGridLoadingState = function(gridId) {
    var grid = document.getElementById(gridId);
    if (grid) {
        grid.innerHTML = '<div class="loading-state"><div class="loader-spinner"></div><p>Loading...</p></div>';
    }
};

// === ENHANCED SEARCH FUNCTIONALITY ===

FlyxTVApplication.prototype.initializeAdvancedSearch = function() {
    var self = this;
    
    console.log('🔍 Initializing advanced search functionality...');
    
    // Load genres for the filter dropdown
    this.loadGenres();
    
    // Set up search event handlers
    this.setupAdvancedSearchHandlers();
};

FlyxTVApplication.prototype.loadGenres = function() {
    var self = this;
    var genreFilter = document.getElementById('genre-filter');
    var mediaTypeFilter = document.getElementById('media-type-filter');
    
    if (!genreFilter || !mediaTypeFilter) return;
    
    function updateGenres() {
        var mediaType = mediaTypeFilter.value === 'all' ? 'movie' : mediaTypeFilter.value;
        
        window.apiClient.getGenres(mediaType)
            .then(function(genres) {
                // Clear existing options except "All Genres"
                genreFilter.innerHTML = '<option value="">All Genres</option>';
                
                // Add genre options
                genres.forEach(function(genre) {
                    var option = document.createElement('option');
                    option.value = genre.id;
                    option.textContent = genre.name;
                    genreFilter.appendChild(option);
                });
                
                console.log('✅ Loaded', genres.length, 'genres for', mediaType);
            })
            .catch(function(error) {
                console.warn('❌ Failed to load genres:', error.message);
            });
    }
    
    // Load initial genres
    updateGenres();
    
    // Update genres when media type changes
    mediaTypeFilter.addEventListener('change', updateGenres);
};

FlyxTVApplication.prototype.setupAdvancedSearchHandlers = function() {
    var self = this;
    
    var searchInput = document.getElementById('search-input');
    var searchButton = document.getElementById('search-button');
    var clearFiltersBtn = document.getElementById('clear-filters-btn');
    var mediaTypeFilter = document.getElementById('media-type-filter');
    var genreFilter = document.getElementById('genre-filter');
    var searchTypeFilter = document.getElementById('search-type-filter');
    
    if (!searchInput || !searchButton) {
        console.warn('❌ Search elements not found');
        return;
    }
    
    // Main search function
    function performAdvancedSearch() {
        var query = searchInput.value.trim();
        var mediaType = mediaTypeFilter.value;
        var genreId = genreFilter.value;
        var searchType = searchTypeFilter.value;
        
        if (!query && !genreId) {
            self.clearSearchResults();
            return;
        }
        
        console.log('🔍 Performing advanced search:', {
            query: query,
            mediaType: mediaType,
            genreId: genreId,
            searchType: searchType
        });
        
        self.setLoadingState(true);
        
        var searchPromise;
        
        if (genreId && !query) {
            // Genre-only search
            searchPromise = window.apiClient.searchByGenre(genreId, mediaType === 'all' ? 'movie' : mediaType);
        } else if (searchType === 'cast' || searchType === 'crew') {
            // Cast/crew search
            searchPromise = window.apiClient.searchByCastCrew(query, mediaType === 'all' ? undefined : mediaType);
        } else if (mediaType !== 'all') {
            // Media type specific search
            searchPromise = window.apiClient.searchByMediaType(query, mediaType);
        } else {
            // Regular multi-search
            searchPromise = window.apiClient.searchContent(query);
        }
        
        searchPromise
            .then(function(results) {
                // Filter by genre if both query and genre are provided
                if (query && genreId && results.length > 0) {
                    results = results.filter(function(item) {
                        return item.genres && item.genres.some(function(genre) {
                            return genre.id == genreId;
                        });
                    });
                }
                
                self.displaySearchResults(results);
            })
            .catch(function(error) {
                console.error('Search failed:', error);
                self.showError('Search failed. Please try again.');
            })
            .finally(function() {
                self.setLoadingState(false);
            });
    }
    
    // Event listeners
    searchButton.addEventListener('click', performAdvancedSearch);
    
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            performAdvancedSearch();
        }
    });
    
    // Auto-search when filters change (if there's a query)
    mediaTypeFilter.addEventListener('change', function() {
        if (searchInput.value.trim() || genreFilter.value) {
            performAdvancedSearch();
        }
    });
    
    genreFilter.addEventListener('change', function() {
        if (searchInput.value.trim() || this.value) {
            performAdvancedSearch();
        }
    });
    
    searchTypeFilter.addEventListener('change', function() {
        if (searchInput.value.trim()) {
            performAdvancedSearch();
        }
    });
    
    // Clear filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            searchInput.value = '';
            mediaTypeFilter.value = 'all';
            genreFilter.value = '';
            searchTypeFilter.value = 'title';
            self.clearSearchResults();
            
            // Show search placeholder
            var searchResults = document.getElementById('search-results');
            if (searchResults) {
                searchResults.innerHTML = 
                    '<div class="search-placeholder">' +
                    '<h3>🔍 Start searching to discover amazing content</h3>' +
                    '<p>Use the search bar above or select filters to find movies, TV shows, or search by cast and crew.</p>' +
                    '</div>';
            }
        });
    }
    
    console.log('✅ Advanced search handlers initialized');
};

// NEW SMOOTH TRANSITION HELPER METHODS
FlyxTVApplication.prototype.fadeOutContent = function(element, callback) {
    if (!element) {
        if (callback) callback();
        return;
    }
    
    // Apply fade out styles
    element.style.transition = 'opacity 0.2s ease-out';
    element.style.opacity = '0';
    
    // Wait for fade out to complete, then execute callback
    setTimeout(function() {
        if (callback) callback();
    }, 200);
};

FlyxTVApplication.prototype.fadeInContent = function(element) {
    if (!element) return;
    
    // Apply fade in styles
    element.style.transition = 'opacity 0.3s ease-in';
    element.style.opacity = '0';
    
    // Trigger fade in after a small delay
    setTimeout(function() {
        element.style.opacity = '1';
    }, 50);
    
    // Clean up transition styles after animation
    setTimeout(function() {
        element.style.transition = '';
    }, 350);
};

// FlyxApp will be set globally in index.html 