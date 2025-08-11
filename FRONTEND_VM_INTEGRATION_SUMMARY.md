# Frontend Integration with Updated VM-Server

## 🔄 Changes Made

### 1. **VM-Server Updates** (`extract-stream-service/vm-server.js`)
- ✅ **Cross-platform Chrome detection** - Works on both Windows and Linux
- ✅ **Visual debugging mode** - Runs in visible mode on Windows for debugging
- ✅ **Enhanced server selection** - Automatically selects better servers (2Embed, Superembed) instead of default CloudStream Pro
- ✅ **Server toggle interaction** - Clicks the server dropdown toggle before selecting servers
- ✅ **Enhanced debugging** - Comprehensive request/response logging for troubleshooting
- ✅ **Improved error handling** - Better error messages with server switching suggestions

### 2. **Frontend API Updates**

#### **New API Route**: `app/api/extract-stream-progress/route.js`
- ✅ **Server-Sent Events proxy** - Bridges frontend with vm-server's streaming endpoint
- ✅ **Real-time progress updates** - Forwards progress events from vm-server to frontend
- ✅ **Error handling** - Proper error forwarding and timeout handling
- ✅ **Request logging** - Structured logging for debugging

#### **Updated Hook**: `app/components/UniversalMediaPlayer/hooks/useStream.js`
- ✅ **Enhanced server info handling** - Processes new server selection data from vm-server
- ✅ **Improved proxy logic** - Better detection of when to use stream proxy
- ✅ **Better error messages** - Shows server switching suggestions
- ✅ **Debug logging** - Logs server selection and extraction method info

### 3. **Environment Configuration**
- ✅ **Headless mode control** - Environment variables to control browser visibility
  - `FORCE_HEADLESS=true` - Force headless mode
  - `FORCE_VISIBLE=true` - Force visible mode
  - Default: Visible on Windows, headless on Linux

## 🚀 How to Test

### 1. **Start the VM-Server**
```bash
cd extract-stream-service
node vm-server.js
```

### 2. **Start the Frontend**
```bash
npm run dev
```

### 3. **Run Integration Tests**
```bash
node test-frontend-integration.js
```

### 4. **Test in Browser**
Navigate to your media player and try extracting a stream. You should see:
- Better server selection (2Embed, Superembed instead of CloudStream Pro)
- More reliable stream extraction
- Better error messages with server switching suggestions

## 🎯 Key Features Now Available

### **Server Selection Priority**
1. **2Embed** - First choice (most reliable)
2. **Superembed** - Second choice
3. **UpCloud** - Third choice
4. **CloudStream Pro** - Fallback (default, often unreliable)

### **Cross-Platform Support**
- **Windows**: Runs in visible mode for debugging
- **Linux**: Runs in headless mode for production
- **Chrome Detection**: Automatically finds Chrome installation

### **Enhanced Debugging**
- **Visual feedback**: Highlights clicked elements when running visibly
- **Comprehensive logging**: All requests/responses logged
- **Debug information**: Server selection details in API responses

### **Better Error Handling**
- **Server switching suggestions**: "Try switching to embed.su" messages
- **Detailed debug info**: Request/response counts and recent activity
- **Timeout handling**: Proper timeout management for long extractions

## 🔧 Environment Variables

```bash
# VM Server Configuration
VM_EXTRACTOR_URL=http://35.188.123.210:3001  # Production VM server
# VM_EXTRACTOR_URL=http://localhost:3001      # Local development

# Browser Mode Control (for vm-server)
FORCE_HEADLESS=true   # Force headless mode (overrides platform detection)
FORCE_VISIBLE=true    # Force visible mode (overrides platform detection)
# Default: Visible on Windows, headless on Linux
```

## 🐛 Troubleshooting

### **If streams aren't found:**
1. Check vm-server logs for server selection details
2. Try switching servers in the frontend
3. Check debug info in browser console
4. Run vm-server in visible mode on Windows to see what's happening

### **If server selection isn't working:**
1. Ensure `.serversToggle` element is being found and clicked
2. Check for server dropdown visibility
3. Verify server names match exactly ("2Embed", "Superembed", etc.)

### **If frontend can't connect to vm-server:**
1. Verify VM_EXTRACTOR_URL environment variable
2. Check vm-server is running on correct port
3. Test direct vm-server connection: `curl http://localhost:3001/health`

## 📊 API Response Format

The updated vm-server now returns enhanced information:

```json
{
  "success": true,
  "streamUrl": "https://example.com/stream.m3u8",
  "streamType": "hls",
  "server": "vidsrc.xyz",
  "serverHash": "2embed",
  "extractionMethod": "enhanced_interception",
  "requiresProxy": false,
  "debug": {
    "selectedStream": {
      "source": "2embed",
      "priority": 0,
      "isMaster": true
    },
    "serverAttempts": [...],
    "extractionTime": 15234,
    "server": "vidsrc.xyz",
    "debugInfo": {
      "totalRequests": 45,
      "totalResponses": 43,
      "recentRequests": [...],
      "recentResponses": [...]
    }
  }
}
```

## ✅ Integration Status

- ✅ **VM-Server**: Updated with enhanced server selection and debugging
- ✅ **Frontend API**: New streaming endpoint created
- ✅ **React Hook**: Updated to handle new response format
- ✅ **Stream Proxy**: Compatible with new server types
- ✅ **Error Handling**: Enhanced with server switching suggestions
- ✅ **Testing**: Integration test script created

The frontend is now fully compatible with the updated vm-server and should provide much more reliable stream extraction with better debugging capabilities.