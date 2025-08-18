# 9anime Extraction Implementation

## Overview
Updated the VM extraction service to handle 9anime-style HTML structures with specialized extraction methods for different site types.

## Key Changes Made

### 1. Site Type Detection
- Added `detectSiteType()` function to identify site types based on URL patterns
- Supports: 9anime, vidsrc, and generic sites
- Routes to appropriate extraction methods based on detected type

### 2. 9anime-Specific Extraction (`handle9AnimeExtraction`)

#### Main Iframe Detection
- Looks for `#iframe-embed, iframe[id*="embed"], iframe[src*="embed"]`
- Handles the main video embed iframe found in 9anime pages
- Waits for content to load with optimized timeouts

#### Nested Content Analysis
- Scans for nested iframes within the main embed
- Detects video elements directly
- Processes multiple iframe layers if present

#### Interactive Elements
- Searches for play buttons: `.play-button, .fas.fa-play, button[class*="play"], .player-play`
- Implements click interactions to trigger video loading
- Re-scans for new content after interactions

### 3. 9anime Server Selection (`handle9AnimeServerSelection`)

#### Server Detection
- Finds `#servers-content` area
- Locates server items: `.server-item, .server-list .server, [data-server]`
- Attempts up to 3 different servers for reliability

#### Server Switching Logic
- Clicks on each server option
- Waits for iframe src to update
- Validates that new content loaded successfully
- Returns first working server configuration

### 4. Episode Navigation Support (`handle9AnimeEpisodeNavigation`)

#### Episode Information
- Extracts current episode info from breadcrumbs
- Detects episode list areas
- Identifies next/previous episode buttons

#### Navigation Controls
- Finds `.btn-next, .block-next, [onclick*="nextEpisode"]`
- Finds `.btn-prev, .block-prev, [onclick*="prevEpisode"]`
- Provides navigation status for frontend integration

### 5. Enhanced Video Center Clicking (`performVideocenterClick`)

#### Iframe Center Calculation
- Gets iframe bounding box dimensions
- Calculates precise center coordinates
- Performs targeted center clicks

#### Fallback Methods
- Direct iframe element clicking if center calculation fails
- Multiple click strategies for different iframe types
- Error handling for CORS-protected iframes

### 6. Updated Main Extraction Flow

#### Site-Aware Routing
```javascript
if (currentUrl.includes('9anime') || currentUrl.includes('9animetv')) {
  // 9anime-specific extraction
  const serverResult = await handle9AnimeServerSelection(page, logger);
  const centerClickResult = await performVideocenterClick(page, logger);
  iframeChainResult = await navigateIframeChain(page, logger);
} else if (currentUrl.includes('vidsrc.xyz')) {
  // vidsrc-specific extraction
} else {
  // generic extraction
}
```

#### Progress Updates
- Added specific progress messages for 9anime extraction steps
- Server selection progress tracking
- Video center interaction feedback
- Iframe chain navigation status

### 7. Generic Extraction Fallback (`handleGenericExtraction`)

#### Universal Detection
- Scans for any iframes on the page
- Detects video elements regardless of site structure
- Searches for play buttons with common selectors

#### Interaction Patterns
- Attempts play button clicks
- Re-scans for new content after interactions
- Handles dynamic content loading

## HTML Structure Analysis

### 9anime Page Structure
Based on the provided example.html:

```html
<div id="wrapper" data-id="18718">
  <div id="main-content">
    <div id="watch-block">
      <div class="player-wrap">
        <div class="wb_-playerarea">
          <iframe id="iframe-embed" src="" frameborder="0" scrolling="no" 
                  allow="autoplay; fullscreen" allowfullscreen></iframe>
        </div>
      </div>
    </div>
    <div class="player-servers">
      <div id="servers-content"></div>
    </div>
  </div>
</div>
```

### Key Elements Targeted
1. **Main Iframe**: `#iframe-embed` - Primary video container
2. **Server Area**: `#servers-content` - Server selection interface
3. **Episode Navigation**: `.btn-next, .btn-prev` - Episode controls
4. **Breadcrumb**: `.breadcrumb .active` - Current episode info

## Performance Optimizations

### Reduced Timeouts
- Main iframe search: Fast detection with 2000ms timeout
- Nested content: 1000ms fallback delays
- Play button interactions: 500ms response waits

### Parallel Processing
- Server selection runs before iframe navigation
- Video center clicking happens concurrently
- Multiple extraction methods attempted simultaneously

### Smart Fallbacks
- Generic extraction if 9anime-specific fails
- Multiple server attempts for reliability
- Various click methods for different iframe types

## Integration Points

### Frontend Integration
- Progress updates for each extraction phase
- Server selection status reporting
- Episode navigation information
- Error handling with specific failure reasons

### Existing System Compatibility
- Maintains backward compatibility with vidsrc extraction
- Preserves existing API endpoints and response formats
- Extends rather than replaces current functionality

## Testing Recommendations

### 9anime Testing
1. Test with different 9anime domains (9anime.to, 9animetv.to)
2. Verify server selection functionality
3. Test episode navigation detection
4. Validate iframe chain extraction

### Cross-Site Testing
1. Ensure vidsrc.xyz still works correctly
2. Test generic extraction on unknown sites
3. Verify site type detection accuracy
4. Check fallback mechanisms

### Performance Testing
1. Measure extraction speed improvements
2. Test timeout handling
3. Verify memory usage with multiple iframes
4. Check browser resource cleanup

## Error Handling

### Site-Specific Errors
- 9anime server selection failures
- Iframe access restrictions (CORS)
- Missing episode navigation elements
- Video center click failures

### Graceful Degradation
- Falls back to generic extraction if 9anime-specific fails
- Continues with available servers if some fail
- Provides partial results when possible
- Maintains extraction attempts even with errors

## Future Enhancements

### Additional Site Support
- Easy extension for other anime streaming sites
- Template for new site type implementations
- Configurable extraction patterns

### Advanced Features
- Automatic quality selection
- Subtitle preference handling
- Multi-language support detection
- Advanced anti-bot evasion

This implementation significantly improves the extraction service's ability to handle 9anime and similar anime streaming sites while maintaining compatibility with existing functionality.