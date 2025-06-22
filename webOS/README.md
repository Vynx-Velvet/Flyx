# Flyx TV - WebOS Application

This directory contains the WebOS TV version of the Flyx streaming application, specifically designed and optimized for LG Smart TVs running WebOS.

## 📁 Directory Structure

```
webOS/
├── appinfo.json                 # WebOS app metadata
├── index.html                   # Main HTML entry point
├── styles/
│   ├── main.css                # Main application styles
│   ├── components.css          # Component-specific styles
│   └── tv-optimized.css        # TV-specific optimizations
├── js/
│   ├── webos-adapter.js        # WebOS platform integration
│   ├── api-service.js          # API service for data fetching
│   ├── navigation.js           # TV navigation system
│   ├── media-player.js         # Video player component
│   └── app.js                  # Main application logic
├── assets/
│   ├── icon_80x80.png          # Small app icon (80x80)
│   ├── icon_130x130.png        # Large app icon (130x130)
│   ├── splash_1920x1080.png    # Splash screen (1920x1080)
│   ├── logo.png                # App logo
│   ├── placeholder-poster.jpg   # Placeholder for movie posters
│   └── placeholder-backdrop.jpg # Placeholder for backdrops
└── README.md                   # This file
```

## 🚀 Features

### TV-Optimized Interface
- **Large Screen Design**: Optimized for 1920x1080 and 4K displays
- **Remote Control Navigation**: Full support for LG Magic Remote
- **Spatial Navigation**: Intelligent focus management for TV interfaces
- **High Contrast Support**: Enhanced visibility for better TV viewing

### WebOS Integration
- **Native WebOS APIs**: Integration with WebOS TV platform services
- **App Lifecycle Management**: Proper handling of app pause/resume/relaunch
- **Remote Control Events**: Support for all WebOS remote control keys
- **TV-Specific Features**: Fullscreen support, screensaver integration

### Media Features
- **Video Player**: Custom video player optimized for TV viewing
- **Subtitle Support**: Multiple subtitle languages and tracks
- **Audio Controls**: Volume control, mute, audio track selection
- **Playback Controls**: Play, pause, seek, fast forward, rewind

### Content Discovery
- **Trending Content**: Today's and weekly trending movies/shows
- **Search Functionality**: Real-time search with TV-optimized input
- **Movie Details**: Comprehensive information display
- **Genre Filtering**: Browse by categories and genres

### Enhanced Media Experience (NEW!)
- **Season/Episode Selection**: TV shows now support full season and episode selection with detailed episode information
- **Enhanced Modal Design**: Beautiful, modern media details modal with backdrop blur, gradient overlays, and cast displays
- **Cast Gallery**: Visual cast cards with actor photos and character information from TMDB
- **VM-Server Streaming**: Direct integration with VM-Server for real-time stream extraction from vidsrc.xyz and embed.su
- **Smart Loading States**: Enhanced loading indicators with animated progress bars during stream extraction
- **Context-Aware Focus**: Intelligent focus management for TV show season/episode controls
- **Streaming Progress**: Real-time feedback during stream extraction with detailed progress information

## 🎨 Logo and Branding

The WebOS app features beautiful, custom Flyx branding with professional design elements:

### Logo Assets
- `assets/logo.svg` - Main horizontal logo with animated streaming particles
- `assets/icon.svg` - Square app icon with gradient background and play button
- `assets/splash.svg` - Full-screen splash screen with loading animation
- `assets/icon_80x80.png` - Small app icon for WebOS launcher
- `assets/icon_130x130.png` - Large app icon for WebOS system
- `assets/splash_1920x1080.png` - TV splash screen background
- `assets/logo.png` - General purpose brand logo

### Design Features
- **Purple Gradient Theme**: #6366f1 to #8b5cf6 color scheme
- **Streaming Elements**: Play button icon with flowing particles
- **TV-Optimized**: High contrast and visibility on all screen types
- **Animated Details**: Subtle animations for engaging user experience
- **Brand Consistency**: "Stream Beyond" tagline and unified visual language

### Converting SVG to PNG
For production deployment, convert the SVG logos to PNG format:

1. Open `assets/svg-to-png-converter.html` in your web browser
2. Right-click on each logo displayed and select "Save image as..."
3. Use the exact filenames shown (icon_80x80.png, icon_130x130.png, etc.)
4. Maintain the specified dimensions for optimal display quality
5. Replace the existing PNG files in the assets directory

The converter page provides:
- **Proper sizing**: Each logo rendered at the correct dimensions
- **Visual preview**: See exactly how logos will appear on TV
- **Easy conversion**: One-click save for each required format
- **Quality assurance**: Ensures logos meet WebOS requirements

## 🎮 Remote Control Support

### Navigation Keys
- **Arrow Keys**: Navigate between focusable elements
- **Enter/OK**: Activate selected element
- **Back**: Go back or close modals
- **Exit**: Exit the application

### Media Keys
- **Play**: Start video playback
- **Pause**: Pause video playback
- **Stop**: Stop playback and return to main interface
- **Fast Forward**: Skip forward 10 seconds
- **Rewind**: Skip backward 10 seconds

### Color Keys
- **Red**: Navigate to Home section
- **Green**: Navigate to Search section
- **Yellow**: Navigate to About section
- **Blue**: Show remote control help

### Number Keys
- **0-9**: Quick navigation to sections (when applicable)

## 🛠️ Development Setup

### Prerequisites
- WebOS TV SDK or WebOS TV IDE
- LG Developer Account (for app submission)
- Node.js (for development tools)

### Installation
1. Clone or copy the webOS directory to your development environment
2. Install WebOS TV SDK from LG Developer site
3. Replace placeholder assets with actual images:
   - `assets/icon_80x80.png` - 80x80 pixels PNG
   - `assets/icon_130x130.png` - 130x130 pixels PNG
   - `assets/splash_1920x1080.png` - 1920x1080 pixels PNG
   - `assets/logo.png` - App logo PNG

### Building the App
```bash
# Using WebOS TV CLI
ares-package .

# This will create a .ipk file for installation
```

### Testing
```bash
# Install on WebOS TV simulator
ares-install --device simulator com.flyx.tv.app_2.0.0_all.ipk

# Launch the app
ares-launch --device simulator com.flyx.tv.app
```

## 📱 App Configuration

### appinfo.json Properties
The `appinfo.json` file contains essential app metadata:

- **id**: `com.flyx.tv.app` - Unique app identifier
- **title**: `Flyx TV` - App display name
- **version**: `2.0.0` - App version
- **type**: `web` - Web application type
- **resolution**: `1920x1080` - Target display resolution
- **requiredMemory**: `50` - Minimum memory requirement (MB)

### Key Features Enabled
- **Remote Control Support**: `disableBackHistoryAPI: true`
- **Touch Support**: `supportTouchMode: "virtual"`
- **TV Optimization**: Custom virtual touch thresholds
- **Memory Management**: 50MB minimum requirement

## 🎯 TV-Specific Optimizations

### Focus Management
- Automatic spatial navigation between elements
- Visual focus indicators with scaling effects
- Focus history for back navigation
- Smart focus restoration after modal close

### Performance
- Efficient DOM updates and rendering
- Image lazy loading for movie posters
- API response caching (5-minute TTL)
- Optimized CSS animations for TV hardware

### Accessibility
- High contrast mode support
- Large touch targets (minimum 48px)
- Clear visual feedback for all interactions
- Screen reader compatible structure

## 🔧 API Integration

The WebOS app connects to the main Flyx application's API endpoints:

### Endpoints Used
- `/api/trending-movies` - Trending movie data
- `/api/trending-shows` - Trending TV show data
- `/api/search-movie` - Search functionality
- `/api/tmdb` - Movie/show details
- `/api/extract-stream` - Streaming URLs
- `/api/subtitles` - Subtitle data

### Data Flow
1. App loads and initializes WebOS adapter
2. API service fetches trending content
3. Content is displayed in TV-optimized grid layout
4. User navigation triggers additional API calls
5. Video player integrates with streaming endpoints

### VM-Server Streaming Integration (NEW!)
The WebOS app now features direct VM-Server integration for seamless streaming:

#### Stream Extraction Process:
1. **Movie Playback**: `getMovieStream(movieId)` → VM-Server extracts stream from vidsrc.xyz
2. **TV Episode Playback**: `getTVEpisodeStream(tvId, season, episode)` → VM-Server extracts episode stream
3. **Real-time Progress**: Loading overlay shows extraction progress with animated progress bar
4. **Fallback Handling**: Graceful fallback to demo streams if VM-Server unavailable
5. **Enhanced Metadata**: Stream info includes server source, quality, and extraction timing

#### VM-Server Endpoints:
- **Movie Streams**: `/api/extract-stream?mediaType=movie&movieId={id}&server=vidsrc.xyz`
- **TV Episodes**: `/api/extract-stream?mediaType=tv&movieId={id}&seasonId={season}&episodeId={episode}&server=vidsrc.xyz`
- **Progress Tracking**: Real-time stream extraction progress with request IDs
- **Quality Detection**: Automatic quality detection (HD/SD) from extracted streams

## 📋 Deployment Checklist

Before submitting to LG Content Store:

### Required Assets
- [ ] App icon 80x80 PNG
- [ ] App icon 130x130 PNG  
- [ ] Splash screen 1920x1080 PNG
- [ ] App logo PNG
- [ ] Store icon 400x400 PNG (for LG Seller Lounge)

### Testing Requirements
- [ ] Test on WebOS TV simulator
- [ ] Test on actual WebOS TV device
- [ ] Verify remote control navigation
- [ ] Test all app features and flows
- [ ] Performance testing on target hardware
- [ ] Memory usage verification

### App Store Requirements
- [ ] Complete app metadata in LG Seller Lounge
- [ ] App description and screenshots
- [ ] Privacy policy and terms of service
- [ ] Age rating and content classification
- [ ] Technical specifications verification

## 🐛 Troubleshooting

### Common Issues

**App doesn't start:**
- Check appinfo.json syntax
- Verify all required assets are present
- Check WebOS TV logs for errors

**Remote control not working:**
- Ensure WebOS adapter is initialized
- Check key event handlers in navigation.js
- Verify focus management is working

**API calls failing:**
- Check network connectivity
- Verify API endpoints are accessible
- Check CORS configuration on server

**Performance issues:**
- Monitor memory usage
- Check for memory leaks in JavaScript
- Optimize image sizes and formats

### Debug Mode
Enable debug logging by setting:
```javascript
console.log('Debug mode enabled');
// Add debug flags in webos-adapter.js
```

## 📄 License

This WebOS application is part of the Flyx project. Please refer to the main project license for terms and conditions.

## 🤝 Contributing

When contributing to the WebOS version:

1. Test changes on WebOS TV simulator
2. Ensure remote control navigation works
3. Verify TV-specific optimizations
4. Update this README if adding new features
5. Follow WebOS development best practices

## 📞 Support

For WebOS-specific issues:
- Check LG Developer documentation
- Review WebOS TV development guides
- Test on latest WebOS TV simulator
- Verify compatibility with target WebOS versions

---

**Note**: This WebOS application requires the main Flyx application to be running and accessible for API functionality. Ensure the main application is deployed and the API endpoints are reachable from the TV environment.

## Recent Updates (Navigation & UI Improvements)

### 🔥 **CRITICAL FIX: Navigation Button Arrow Navigation**
- **FIXED**: Home button → RIGHT arrow → Search button (no longer skips)
- **FIXED**: About button → LEFT arrow → Search button (no longer skips)  
- **FIXED**: Sequential navigation between nav buttons now works correctly
- **FIXED**: Initial focus prioritizes nav buttons over logo (no need to hover logo first)
- **FIXED**: Proper focus cleanup - buttons lose styling when moving to another button

### 🔍 **SEARCH PAGE NAVIGATION FIXED**
- **FIXED**: Search input field no longer jumps to logo or unexpected elements
- **FIXED**: Search button → LEFT arrow → Search input field (direct navigation)
- **FIXED**: Search input → RIGHT arrow → Search button (direct navigation)  
- **FIXED**: Nav buttons → DOWN arrow → Search input field (proper targeting)
- **FIXED**: Search elements → UP arrow → Nav buttons (back to header)
- **FIXED**: Enhanced visual feedback for search input and search button focus

### ✅ Fixed Remote Control Navigation
- **Search Button Focus**: Fixed issue where search button couldn't be focused
- **Enhanced Focus Detection**: Improved TV navigation system for better element detection
- **Spatial Navigation**: Added smart navigation between UI elements using remote control

### ✅ Horizontal Scrolling Media Categories  
- **Home Page Categories**: Converted from vertical grid to horizontal scrolling
- **Reduced Vertical Overflow**: Categories now scroll left-to-right instead of stacking vertically
- **Search Results**: Also converted to horizontal scrolling layout
- **Smooth Navigation**: Remote control left/right arrows navigate within media rows

### ✅ Enhanced TV-Optimized Styling
- **Focus Indicators**: Better visual feedback for focused elements
- **Remote Control Hints**: Visual indicators show available navigation
- **Improved Performance**: Optimized for TV rendering and remote control response

### 🔒 **FIXED: Modal Navigation Isolation**
- **Modal Lock**: When a modal is open, navigation is COMPLETELY restricted to modal elements only
- **Background Block**: No more accidental navigation to background elements while modal is active
- **Smart Focus Restore**: When modal closes, focus automatically returns to the element that opened it
- **Back Key Support**: BACK/Escape key properly closes modals and restores navigation
- **State Detection**: Automatic detection of modal open/close states with proper navigation switching

### 🎬 **FIXED: Standalone WebOS App & Enhanced Modals**
- **Complete Independence**: WebOS app now fetches TMDB data directly (no webapp dependency)
- **Direct VM-Server Integration**: Stream extraction calls VM-Server directly at http://35.188.123.210:3001
- **Enhanced Demo Fallbacks**: Rich demo data with proper TV show detection and season/episode support
- **Network Resilience**: Graceful fallback to demo data when network issues occur
- **Season/Episode Selection**: Full TV show support with season/episode dropdown controls
- **Enhanced Modal Design**: Beautiful backdrop blur, cast gallery, and modern UI components
- **Debug Logging**: Comprehensive console logging for troubleshooting network and modal issues

## Testing Navigation

### Remote Control Testing:
1. **Home Navigation**: 
   - Use UP/DOWN to navigate between header, hero section, and media categories
   - Use LEFT/RIGHT to scroll through media cards within each category
   
2. **Search Page**:
   - Navigate to Search button in header
   - Use DOWN arrow to reach search input field
   - Type to search, then navigate through horizontal results with LEFT/RIGHT
   
3. **Focus Behavior**:
   - All buttons should be focusable with clear visual indicators
   - Media cards should scale and highlight when focused
   - Navigation should be smooth and predictable

### Keyboard Testing (Dev Mode):
- Arrow Keys: ⬅️➡️⬆️⬇️ for navigation
- Enter: Activate focused element  
- Tab: Cycle through focusable elements

## File Structure

```
webOS/
├── index.html              # Main application entry
├── js/
│   ├── tv-navigation.js    # 🔄 Updated: Enhanced spatial navigation
│   ├── flyx-app.js        # 🔄 Updated: Search event handling
│   ├── api-client.js      # API communication
│   ├── media-player.js    # Video playback
│   └── webos-platform.js  # WebOS integration
├── styles/
│   ├── main.css           # 🔄 Updated: Horizontal scrolling layouts
│   ├── tv-optimized.css   # 🔄 Updated: Enhanced focus styles
│   └── components.css     # Component styles
└── assets/ 
    └── [images and icons]
```

## Key Improvements Made

### 1. TV Navigation System (`tv-navigation.js`)
- Enhanced element visibility detection
- Smart spatial navigation for horizontal media grids
- Improved focus management with `.tv-focused` class
- Better scroll handling for media cards

### 2. Layout Updates (`main.css`)
- Media grids converted from CSS Grid to Flexbox with horizontal scroll
- Hidden scrollbars with `scrollbar-width: none`
- Fixed width media cards (280px) for consistent layout
- Reduced vertical spacing to minimize overflow

### 3. Focus Styling (`tv-optimized.css`)
- Enhanced focus indicators for all interactive elements
- Specific styling for search button focus issues
- Navigation hints that appear when browsing media
- Improved contrast and visibility for TV screens

### 4. Search Functionality (`flyx-app.js`)
- Added `searchResultsLoaded` event for navigation updates
- Horizontal layout for search results
- Better error handling and user feedback

## WebOS Deployment

1. **Test in WebOS Simulator**: All navigation improvements work in WebOS TV Simulator
2. **Deploy to LG TV**: Package and install on LG WebOS TV
3. **Remote Control**: Full support for Magic Remote and standard TV remote

## Navigation Flow

```
Header Navigation (UP/DOWN between sections)
├── Logo (focusable, returns to home)
├── Nav Buttons (Home/Search/About)
└── Current Page Content
    ├── Hero Section (if home page)
    ├── Media Categories (horizontal scroll LEFT/RIGHT)
    │   ├── Trending Today
    │   ├── Trending This Week  
    │   └── Popular Shows
    └── Search Results (horizontal scroll LEFT/RIGHT)
```

The app now provides a smooth, TV-optimized experience with proper remote control navigation!

---

## 🚀 **Latest Updates: Standalone WebOS App (v2.0)**

### **🔧 JUST FIXED: Modal & Demo Data Issues**
- ✅ **User-Agent Header**: Removed browser-incompatible User-Agent header
- ✅ **Enhanced Demo Data**: TV shows now properly generate with season/episode selection
- ✅ **Modal TV Detection**: Fixed mediaType detection for proper season/episode controls
- ✅ **Network Fallbacks**: When API fails, enhanced demo data ensures full functionality
- ✅ **Debug Logging**: Added comprehensive logging to track modal and TV show detection

### **🎯 Complete Independence Achieved:**
- ✅ **Zero Webapp Dependency**: Direct TMDB API integration with authentication
- ✅ **Direct VM-Server Calls**: Stream extraction bypasses webapp completely  
- ✅ **Enhanced Modal System**: Season/episode selection with beautiful UI
- ✅ **Network Resilience**: Smart fallbacks and comprehensive error handling
- ✅ **Modal Navigation Lock**: Fixed background navigation during modal display

### **📡 API Architecture Transformation:**
```
OLD: WebOS → webapp (tv.vynx.cc) → TMDB/VM-Server
NEW: WebOS → TMDB (direct) + VM-Server (direct)
```

### **🎬 Stream Extraction Endpoints:**
```bash
# Direct VM-Server calls (no webapp middleware)
Movies:   http://35.188.123.210:3001/extract?mediaType=movie&movieId={id}&server=vidsrc.xyz
TV Shows: http://35.188.123.210:3001/extract?mediaType=tv&movieId={id}&seasonId={season}&episodeId={episode}&server=vidsrc.xyz
```

### **🎭 Enhanced TV Show Experience:**
1. **Browse Content** → Enhanced grid with demo/real data fallbacks
2. **Open Modal** → Beautiful backdrop with season/episode dropdowns for TV shows
3. **Select Episode** → Dropdown controls with TV navigation support
4. **Stream** → Direct VM-Server extraction with progress feedback
5. **Watch** → Seamless WebOS TV playback

### **🔍 Troubleshooting Network Issues:**
- **TMDB API Fails**: App automatically uses enhanced demo data with full TV show support
- **VM-Server Issues**: Graceful fallback to demo streams with proper metadata
- **Modal Problems**: Comprehensive debug logging shows mediaType detection process
- **Navigation Issues**: Modal lock system prevents background interference

**Result**: A bulletproof, completely standalone WebOS TV application that works perfectly even with network issues! 🎉 