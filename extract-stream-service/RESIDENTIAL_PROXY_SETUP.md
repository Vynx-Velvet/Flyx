# 🌐 Residential Proxy Setup Guide for Google Cloud

Your VM server is failing because **Google Cloud datacenter IPs are immediately blocked by Cloudflare**. No amount of browser stealth will work - you need residential proxies that appear to come from real home connections.

## 🚨 Critical Issue: Datacenter IP Detection

Cloudflare immediately flags and blocks all Google Cloud, AWS, Azure, and other datacenter IPs. The solution is residential proxies.

## 🛠️ Quick Setup

### Step 1: Get Residential Proxies

**Recommended Providers:**
- **Bright Data (formerly Luminati)** - Premium quality, expensive
- **Smartproxy** - Good balance of quality/price  
- **IPRoyal** - Budget-friendly residential proxies
- **Oxylabs** - Enterprise-grade
- **Proxy-Cheap** - Very affordable residential IPs

### Step 2: Configure Environment Variables

Set these environment variables on your Google Cloud VM:

```bash
# Multiple proxies (comma-separated)
export PROXIES="proxy1.example.com:8001,proxy2.example.com:8001,proxy3.example.com:8001"

# Proxy authentication (if all proxies use same credentials)
export PROXY_USERNAME="your-username"  
export PROXY_PASSWORD="your-password"

# Alternative: Combined auth string
export PROXY_AUTH="username:password"

# Or proxies with embedded auth
export PROXIES="username:password@proxy1.com:8001,username:password@proxy2.com:8001"
```

### Step 3: Restart VM Server

```bash
cd /path/to/extract-stream-service
node vm-server.js
```

## 📋 Example Configurations

### Smartproxy Example
```bash
export PROXIES="gate.smartproxy.com:10001,gate.smartproxy.com:10002,gate.smartproxy.com:10003"
export PROXY_USERNAME="sp12345678"
export PROXY_PASSWORD="your-password"
```

### Bright Data Example  
```bash
export PROXIES="zproxy.lum-superproxy.io:22225"
export PROXY_USERNAME="brd-customer-hl_abc123-zone-residential"
export PROXY_PASSWORD="your-password"
```

### IPRoyal Example
```bash
export PROXIES="residential.iproyal.com:12321"
export PROXY_USERNAME="username"
export PROXY_PASSWORD="password"
```

## 🔧 Proxy Requirements

✅ **Must be residential IPs** (not datacenter)  
✅ **HTTP/HTTPS proxy support**  
✅ **Sticky sessions** (same IP for duration)  
✅ **US/EU locations** (for best results)  
✅ **High success rate** (>95%)

❌ **Datacenter proxies won't work**  
❌ **Free proxies are unreliable**  
❌ **VPN services typically don't work**

## 🎯 Testing Your Setup

The server will log proxy status:

```
✅ Using residential proxies: 3/3 healthy proxies available
🔄 Using residential proxy: proxy1.com:8001
✅ Proxy authentication configured
```

Or warnings if misconfigured:

```
⚠️ NO RESIDENTIAL PROXIES CONFIGURED! Google Cloud IPs will be blocked
❌ ALL RESIDENTIAL PROXIES EXHAUSTED! Server cannot bypass Cloudflare
```

## 💰 Cost Considerations

**Typical residential proxy costs:**
- Budget: $3-5/GB (IPRoyal, Proxy-Cheap)
- Mid-range: $8-12/GB (Smartproxy, Storm Proxies)  
- Premium: $15+/GB (Bright Data, Oxylabs)

**For extraction service:** ~1GB/month should handle moderate usage

## 🚀 Performance Tips

1. **Use 3-5 proxies minimum** for rotation
2. **Choose proxies in same country** as your target audience  
3. **Enable sticky sessions** when possible
4. **Monitor proxy health** - replace bad IPs quickly
5. **Use premium providers** for best Cloudflare bypass rates

## 🔄 Proxy Rotation

The server automatically:
- Rotates between available proxies
- Tracks failure rates per proxy  
- Blacklists failed proxies temporarily
- Resets proxy health periodically

## ❗ Without Residential Proxies

**You will see:**
```
[req_xxx] ERROR: Failed to solve Cloudflare challenge
[req_xxx] ERROR: Extraction failed Failed after 3 attempts
```

**This is expected** - Google Cloud IPs are 100% blocked by Cloudflare.

## 🆘 Support

If you continue to have issues after setting up residential proxies:

1. Verify your proxy credentials are correct
2. Test proxies with a simple HTTP request first  
3. Check proxy provider's documentation for specific formats
4. Ensure proxies support HTTPS (not just HTTP)
5. Try different residential IP locations

The server logs will show exactly what's happening with each proxy attempt.