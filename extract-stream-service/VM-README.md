# 🚀 Flyx Extract Stream Service - Google VM Edition

This is an exact replica of your Next.js `route.js` file, converted to work as a standalone Express server on your Google VM.

## 📋 Features

- **Exact Same Functionality** as your Next.js route
- **Advanced Stealth Puppeteer** with all fingerprint masking
- **Comprehensive Logging** with request tracking
- **Stream Extraction** from vidsrc.xyz, embed.su, and shadowlandschronicles
- **Anti-Bot Bypass** capabilities
- **Progressive Stream Detection** with retry logic
- **PM2 Process Management** for production reliability

## 🔧 Quick Setup

### 1. Upload Files to Your VM
```bash
# Upload these files to your VM:
# - vm-server.js
# - vm-package.json
# - ecosystem.config.js
# - vm-setup.sh
# - vm-start.sh
# - vm-stop.sh
```

### 2. Run Setup Script
```bash
chmod +x vm-setup.sh
./vm-setup.sh
```

### 3. Start the Service
```bash
./vm-start.sh
```

### 4. Test the Service
```bash
curl http://localhost:3001/health
```

## 🌐 API Endpoints

### Health Check
```bash
GET http://YOUR_VM_IP:3001/health
```

### Extract Stream (Movie)
```bash
GET http://YOUR_VM_IP:3001/extract?mediaType=movie&movieId=123456&server=vidsrc.xyz
```

### Extract Stream (TV Show)
```bash
GET http://YOUR_VM_IP:3001/extract?mediaType=tv&movieId=123456&seasonId=1&episodeId=1&server=vidsrc.xyz
```

### Direct URL Extract
```bash
GET http://YOUR_VM_IP:3001/extract?url=https://vidsrc.xyz/embed/movie?tmdb=123456
```

## 📊 Management Commands

### View Service Status
```bash
pm2 status
```

### View Live Logs
```bash
pm2 logs flyx-extract-stream-vm
```

### Monitor Resources
```bash
pm2 monit
```

### Restart Service
```bash
pm2 restart flyx-extract-stream-vm
```

### Stop Service
```bash
./vm-stop.sh
```

## 🔄 Integration with Your Frontend

Update your frontend to point to the VM instead of the Next.js API:

```javascript
// Before (Next.js API)
const response = await fetch('/api/extract-stream?mediaType=movie&movieId=123456');

// After (VM API)
const response = await fetch('http://YOUR_VM_IP:3001/extract?mediaType=movie&movieId=123456');
```

## 🛡️ Security & Performance

### Firewall Configuration
```bash
# Allow port 3001 for the API
sudo ufw allow 3001/tcp

# Or restrict to specific IPs
sudo ufw allow from YOUR_FRONTEND_IP to any port 3001
```

### Performance Tuning
The service includes:
- **Memory limits** (1GB max per PM2 process)
- **Auto-restart** on crashes
- **Log rotation** to prevent disk overflow
- **Process monitoring** with PM2

### Environment Variables
Set these in your environment if needed:
```bash
export NODE_ENV=production
export PORT=3001
```

## 📁 File Structure

```
extract-stream-service/
├── vm-server.js           # Main server file (Express + Puppeteer)
├── vm-package.json        # Dependencies
├── ecosystem.config.js    # PM2 configuration
├── vm-setup.sh           # Installation script
├── vm-start.sh           # Start script
├── vm-stop.sh            # Stop script
├── VM-README.md          # This file
└── logs/                 # Log files (created automatically)
    ├── err.log           # Error logs
    ├── out.log           # Standard output
    └── combined.log      # Combined logs
```

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check if Chrome is installed
google-chrome --version

# Check Node.js version
node --version

# Check if port is available
sudo netstat -tlnp | grep :3001
```

### Streams Not Found
```bash
# Check logs for specific errors
pm2 logs flyx-extract-stream-vm --lines 50

# Test with a known working movie ID
curl "http://localhost:3001/extract?mediaType=movie&movieId=550&server=vidsrc.xyz"
```

### High Memory Usage
```bash
# Restart the service to clear memory
pm2 restart flyx-extract-stream-vm

# Monitor memory usage
pm2 monit
```

## 📈 Monitoring & Logs

### Real-time Monitoring
```bash
# View all PM2 processes
pm2 status

# Monitor specific service
pm2 show flyx-extract-stream-vm

# Resource monitoring
pm2 monit
```

### Log Analysis
```bash
# View recent logs
pm2 logs flyx-extract-stream-vm --lines 100

# Follow logs in real-time
pm2 logs flyx-extract-stream-vm --follow

# View specific log file
tail -f logs/combined.log
```

## 🚀 Advanced Configuration

### Custom Port
Edit `ecosystem.config.js`:
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 8080  // Change to your preferred port
}
```

### Multiple Instances
```javascript
instances: 2,  // Run 2 instances for load balancing
```

### Custom Chrome Path
Edit `vm-server.js` if needed:
```javascript
executablePath: '/usr/bin/google-chrome',  // Custom Chrome path
```

## 🔒 Production Considerations

1. **HTTPS**: Use a reverse proxy (nginx) for HTTPS
2. **Rate Limiting**: Implement rate limiting for production use
3. **CORS**: Configure CORS for your specific domains
4. **Monitoring**: Set up external monitoring for uptime
5. **Backups**: Regular backups of your configuration

## 📞 Support

This VM server provides **identical functionality** to your Next.js route with the following improvements:
- ✅ **Standalone operation** (no Next.js dependency)
- ✅ **Better process management** with PM2
- ✅ **Enhanced logging** and monitoring
- ✅ **Production-ready** configuration
- ✅ **Easy deployment** and management

The API responses are **exactly the same format** as your original Next.js API route, ensuring seamless integration with your existing frontend. 