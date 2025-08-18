# 9anime API Discovery & Server Loading Analysis

## 🎯 Critical API Discovery

The `/ajax/episode/list/{episodeId}` response reveals the **complete server loading mechanism** used by 9anime. This is a game-changer for our extraction strategy.

## 📊 API Response Analysis

### Episode List Structure
```json
{
  "status": true,
  "html": "...",
  "totalItems": 12
}
```

### Episode Data Extraction
Each episode contains:
```html
<a href="/watch/solo-leveling-18718?ep=123078" title="Arise" class="item ep-item"
   data-number="12"
   data-id="123078">
```

**Key Data Points:**
- `data-id="123078"` - Episode ID for server API calls
- `data-number="12"` - Episode number
- `href="/watch/solo-leveling-18718?ep=123078"` - Direct episode URL
- `title="Arise"` - Episode title`

## 🔧 Server Loading Mechanism Revealed

### Critical JavaScript Logic
```javascript
$('.ep-item').click(function (e) {
    e.preventDefault();
    var epId = $(this).data('id');
    
    // Clear current iframe
    $('#iframe-embed').hide();
    $('#iframe-embed').attr('src', '');
    $('#embed-loading').show();
    
    // Load servers for episode
    $.get('/ajax/episode/servers?episodeId=' + epId, function (res) {
        $('#servers-content').html(res.html);
        $('#embed-loading').hide();
        
        // Auto-select server based on preferences
        var currentSource = localStorage.getItem('currentSource');
        if (currentSource && $('.servers-' + currentSource).length > 0) {
            var currentServer = localStorage.getItem('currentServer');
            var svEl = $('.servers-' + currentSource + ' .server-item[data-server-id=' + currentServer + ']');
            if (currentServer && svEl.length > 0) {
                svEl.click();
            } else {
                $('.servers-' + currentSource + ' .server-item').first().click();
            }
        } else {
            // Default server selection logic
            if (parseInt(userSettings.enable_dub) === 1 && ($('.servers-mixed').length > 0 || $('.servers-dub').length > 0)) {
                if ($('.servers-mixed').length > 0) {
                    $('.servers-mixed .server-item').first().click();
                } else if ($('.servers-dub').length > 0) {
                    $('.servers-dub .server-item').first().click();
                }
            } else {
                if ($('.servers-sub').length > 0) {
                    $('.servers-sub .server-item').first().click();
                } else {
                    $('.server-item').first().click();
                }
            }
        }
    });
});
```

## 🚀 Complete API Flow Discovery

### 1. Episode Selection Flow
```
1. User clicks episode → Extract episodeId from data-id
2. Call /ajax/episode/servers?episodeId={episodeId}
3. Populate #servers-content with server options
4. Auto-select server based on preferences
5. Server click loads iframe with video
```

### 2. Server Categories Revealed
- `.servers-sub` - Subtitle servers
- `.servers-dub` - Dubbed servers  
- `.servers-mixed` - Mixed audio servers
- `data-server-id` - Individual server identifier

### 3. LocalStorage Integration
- `currentSource` - Preferred server type (sub/dub/mixed)
- `currentServer` - Specific server ID
- `watching.{movieId}` - Current episode tracking

## 🎯 Enhanced Extraction Strategy

### Direct API Integration
Instead of complex iframe navigation, we can:

1. **Extract Episode ID** from current page
2. **Call Server API** directly: `/ajax/episode/servers?episodeId={id}`
3. **Parse Server Response** to get available servers
4. **Simulate Server Click** to load video iframe
5. **Extract Stream URLs** from loaded iframe

### Implementation Code

```javascript
// Enhanced 9anime API-based extraction
async function extract9AnimeViaAPI(page, logger) {
  try {
    // Step 1: Extract episode ID from current page
    const episodeId = await page.evaluate(() => {
      // Try multiple methods to get episode ID
      const urlParams = new URLSearchParams(window.location.search);
      const epParam = urlParams.get('ep');
      if (epParam) return epParam;
      
      // Fallback: look for active episode
      const activeEpisode = document.querySelector('.ep-item.active');
      if (activeEpisode) return activeEpisode.getAttribute('data-id');
      
      // Fallback: extract from wrapper
      const wrapper = document.getElementById('wrapper');
      if (wrapper) return wrapper.getAttribute('data-id');
      
      return null;
    });
    
    if (!episodeId) {
      throw new Error('Could not extract episode ID');
    }
    
    logger.info('✅ Extracted episode ID', { episodeId });
    
    // Step 2: Call servers API directly
    const serversResponse = await page.evaluate(async (epId) => {
      const response = await fetch(`/ajax/episode/servers?episodeId=${epId}`);
      return await response.json();
    }, episodeId);
    
    if (!serversResponse.status) {
      throw new Error('Server API call failed');
    }
    
    logger.info('✅ Retrieved server data', { 
      hasHtml: !!serversResponse.html,
      htmlLength: serversResponse.html?.length 
    });
    
    // Step 3: Inject server HTML and extract server options
    await page.evaluate((html) => {
      const serversContent = document.getElementById('servers-content');
      if (serversContent) {
        serversContent.innerHTML = html;
      }
    }, serversResponse.html);
    
    // Step 4: Get available servers
    const servers = await page.evaluate(() => {
      const serverElements = document.querySelectorAll('.server-item');
      return Array.from(serverElements).map(el => ({
        id: el.getAttribute('data-server-id'),
        name: el.textContent?.trim(),
        category: el.closest('[class*="servers-"]')?.className,
        element: el
      }));
    });
    
    logger.info('✅ Found servers', { 
      count: servers.length,
      servers: servers.map(s => ({ id: s.id, name: s.name, category: s.category }))
    });
    
    // Step 5: Try servers in priority order
    const serverPriority = ['servers-sub', 'servers-mixed', 'servers-dub'];
    
    for (const category of serverPriority) {
      const categoryServers = servers.filter(s => s.category?.includes(category));
      
      if (categoryServers.length > 0) {
        logger.info(`🎯 Trying ${category} servers`, { count: categoryServers.length });
        
        for (const server of categoryServers) {
          try {
            // Click server to load iframe
            await page.evaluate((serverId) => {
              const serverEl = document.querySelector(`[data-server-id="${serverId}"]`);
              if (serverEl) {
                serverEl.click();
                return true;
              }
              return false;
            }, server.id);
            
            // Wait for iframe to load
            await page.waitForFunction(() => {
              const iframe = document.getElementById('iframe-embed');
              return iframe && iframe.src && iframe.src !== '';
            }, { timeout: 5000 });
            
            // Extract iframe src
            const iframeSrc = await page.evaluate(() => {
              const iframe = document.getElementById('iframe-embed');
              return iframe ? iframe.src : null;
            });
            
            if (iframeSrc && iframeSrc !== 'about:blank') {
              logger.info('✅ Server loaded successfully', { 
                serverId: server.id, 
                serverName: server.name,
                iframeSrc: iframeSrc.substring(0, 100) + '...'
              });
              
              return {
                success: true,
                episodeId,
                serverId: server.id,
                serverName: server.name,
                iframeSrc,
                extractionMethod: '9anime_api_direct'
              };
            }
            
          } catch (e) {
            logger.warn(`Server ${server.id} failed`, { error: e.message });
          }
        }
      }
    }
    
    throw new Error('No working servers found');
    
  } catch (error) {
    logger.error('9anime API extraction failed', error);
    return {
      success: false,
      error: error.message,
      extractionMethod: '9anime_api_direct'
    };
  }
}
```

## 🔍 Server Response Analysis

Based on the episode list response, the server API likely returns:

```json
{
  "status": true,
  "html": "<div class=\"servers-sub\">...</div><div class=\"servers-dub\">...</div>"
}
```

With server structure like:
```html
<div class="servers-sub">
  <div class="server-item" data-server-id="41">Server 1</div>
  <div class="server-item" data-server-id="28">Server 2</div>
</div>
<div class="servers-dub">
  <div class="server-item" data-server-id="35">Dub Server 1</div>
</div>
```

## 🎯 Key Advantages of API Approach

### 1. **Bypass Complex Iframe Navigation**
- No need to navigate through multiple iframe layers
- Direct access to server selection mechanism
- Faster and more reliable

### 2. **Leverage Site's Own Logic**
- Use 9anime's server selection preferences
- Automatic fallback to working servers
- Respect user preferences (sub/dub)

### 3. **Better Error Handling**
- Can try multiple servers programmatically
- Clear success/failure indicators
- Detailed logging of each attempt

### 4. **Performance Benefits**
- Fewer page interactions required
- Direct API calls are faster
- Reduced complexity in extraction logic

## 🚀 Implementation Priority

### Immediate Implementation:
1. **Episode ID Extraction** - Multiple fallback methods
2. **Server API Integration** - Direct `/ajax/episode/servers` calls
3. **Server Selection Logic** - Priority-based server trying
4. **Iframe Source Extraction** - Get final video URLs

### Future Enhancements:
1. **Episode Navigation** - Use episode list API for next/prev
2. **Quality Selection** - Parse server names for quality info
3. **Subtitle Detection** - Identify subtitle availability
4. **Caching Strategy** - Cache server responses for performance

This API discovery completely revolutionizes our 9anime extraction approach, making it much more reliable and efficient by working with the site's architecture rather than against it.