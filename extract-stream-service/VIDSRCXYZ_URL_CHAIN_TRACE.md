# VidSrcXYZ URL Chain Manual Trace

## Test Data from vidsrcxyz.html

Based on the provided HTML file, we'll trace the extraction for:
- **Media**: Dexter: Resurrection (2025) S01E01
- **TMDB ID**: 33043892
- **Season**: 1  
- **Episode**: 1

## Step-by-Step Manual Trace

### Step 1: Initial VidSrc.xyz URL Construction

**Constructed URL:**
```
https://vidsrc.xyz/embed/tv?tmdb=33043892&season=1&episode=1
```

**Expected Result:** HTML page containing iframe with cloudnestra.com/rcp URL

### Step 2: Extract CloudNestra RCP URL from VidSrc Page

From the vidsrcxyz.html file (line 78), we have the iframe source:
```html
<iframe id="player_iframe" src="//cloudnestra.com/rcp/MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6Um5GSFpGRjBjbTRyVXpkMGRpdHFSa2t2Vkc0eVp6Z3dZMjUwTkd4NVJHWjJTM2RTTUV0c1pXSk9RelpSYzFremVWWnJWWFI1UldWU2NsVmtia2QyWVU5UFMxWmtiVGszUTFaa1F6QlhRV0pzYmt4Nk1UaGtVWGg1YlhKS2F6Tm5VM3BGWnpKaU1YbGtia3gzVURaNGNFdDVlVmRLY1RZck5rWnRibkZQWlVSRWRtUnRWVmMyY0ZZMFZFRnJWbEJ1VlRKaFZXWXlUV0YwYjJONkwydExVVEV6U1doUGQxVmhPRFZFWmtkSFVqWmlOVTlQVUZoaFVIVmhka05FUldObFVUaFVlVWRaWm10SlFWQk9VRVpqT1VoMFRsVnRjRllyUzFOWGNVTkdUMnhEVDNweFRVVXpSalpSZUhSbWQxQldNRGgyUjJwWldFOUxjRk5pZHl0T09VeENZMUppT1VNMWNrZDNiVE5aTVU1dkx6QlhhRFkzUjBKaGVESnlkbHBLTjI1MVNrZERWelJyVGtwR05VSnVUMDgxTDFodVlpODFjWGh3TUVGMmNWVmtMMmczTTJod04xWjVWMlowT0hCV1YzbHZlVTF3U1ZObmRuVmpVRnBNVkN0NVlVdHVSRUpPV25kaE1GUkZOelJxZGxkMlREVlFUeXRWTW5RM1l6aEJlRGhSY1hKaFNVUmFjMUJrT0Voc1RrVnFaMnRLUWtkYVZuUTNVMUZXYW5Cak9HTjNNR1ZQZUhGdVZEbFRTa293UW10cVUyZG9iVFZoY1RKNE9XdGtZM2xwUTJsT2VXWTFVbGczY0RkR01uZFNUekkwVlRnM1JEVjZhVGcxTjA5WlduVnNhM2hGY25kNWRUbHNSVTlPY2xSNmFFTklabWRuU2taT1RHMUVkaXRpUjNRdmJYTXZZMkpFTUdkbEszUlVWVWRaT1V0TVpVcEZjMDE2YWtGUE1WcHJOUzlhVWtkT1FuaEpaazFUU1VsRVJtcG9SMVZaZEU5WVIzUXJNSHBSTm5wYWJtVXJlbkZNU0ZNMloyVlhhM0E0ZDBsT2NpdHFNRU40TkRadmVVbEJjV3M1TUdGd2JsRjVPVGMyZEdONlQxaFhNMUJOZERndlNrTXlNR3NyT0ZGM2JGWnJiekZGTUZKWlVVeHZRV1EwWVVWME0xUnpTakUzY2tSQ1VIWXJZVGRqYW1RelRucHBZMkpWV20xRFUyOU9USFk1UjNkd2EyWk5ZbGhLZUZwcE5IQTBNRUZPV0dadEsxTnZlRFptU0daU1dXcHVOVXBFSzNsTlNtNHlZbE5IZVRJMGNXbG9aaXRvY2toQmRrRjNVR05PY25saGJqQmpVME15Y3pkek9XMWpkRUpITW5WQ1pESTBaMnQxVUZWRGRETjBVbTh3TDAxRGRFWlNha1ZQT1ZsRlNURmpPWFE0YlZCNlpWbzBNV2gyV21kNmVsVTFSamx5T1ZWdFFWZDZUMVZUSzFaNlVIaE9ZVkpqS3pVcldDOXZXV1V6VDFGQlUySnFRVkpCUTBSNVkyNUpWMVJZWW1aTE9Xc3ZiM05vV0hCdE5IbEtWblExY0RaSlN6RkdkSEJTUmpSTk1rTTFObXhYTUdSR1NtRklkR3A0YkdkRFdHeDZiVGN6ZWtsWFJFdDFZbGxMWVZrek4wSTVUMkZCT1VFd2NpOUhaMVV3WXpReGMzcHlka2hDTW1adk1EbFpSR3c1TlhacWNVZGFRWFJGWjNRclRHTlVlRmhHVTJsTFdrWkNaWEEzTldVeWExQjJOMFJFVlc4MVZ6SkVVVGQ0YkRNdmRUWlZPR1pUU1VOM1JIcFdXRXhYVGpKQ1NrRlJlbTVyZUU1NGRXaFVTSEUxY1V0T1dFVTNiVzVuUmxkd1prbHpXRWh1TW1ndlNGWjZOek5uVEVaT1MyUklRbmxuVFVKUVZHUmtSRTVGYnpSNlp6SmhaMGMzTDFsdllYTm1jVFpTVUdaeFFTOURObGdyV25GV2NUTnpORE5LWkhWUk1EbFpaelpHTVdrMmJGTmtVVWwxZDNCVlRpOXNiRXg0Ykc1dFNFMWpPRzluWWtvdmJ6aGpaR2RPVGpCSFowRTFXSGx3TTJrMmRFOUhLMjUxT1dORFRtWnlNR3BNV25CWmJqWlZRUzlPUml0U2VUaDViVFZ1UTJSRmVIazNiVXhJY1hsRFQyYzlQUT09"
```

**Decoded RCP URL:**
```
https://cloudnestra.com/rcp/MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6Um5GSFpGRjBjbTRyVXpkMGRpdHFSa2t2Vkc0eVp6Z3dZMjUwTkd4NVJHWjJTM2RTTUV0c1pXSk9RelpSYzFremVWWnJWWFI1UldWU2NsVmtia2QyWVU5UFMxWmtiVGszUTFaa1F6QlhRV0pzYmt4Nk1UaGtVWGg1YlhKS2F6Tm5VM3BGWnpKaU1YbGtia3gzVURaNGNFdDVlVmRLY1RZck5rWnRibkZQWlVSRWRtUnRWVmMyY0ZZMFZFRnJWbEJ1VlRKaFZXWXlUV0YwYjJONkwydExVVEV6U1doUGQxVmhPRFZFWmtkSFVqWmlOVTlQVUZoaFVIVmhka05FUldObFVUaFVlVWRaWm10SlFWQk9VRVpqT1VoMFRsVnRjRllyUzFOWGNVTkdUMnhEVDNweFRVVXpSalpSZUhSbWQxQldNRGgyUjJwWldFOUxjRk5pZHl0T09VeENZMUppT1VNMWNrZDNiVE5aTVU1dkx6QlhhRFkzUjBKaGVESnlkbHBLTjI1MVNrZERWelJyVGtwR05VSnVUMDgxTDFodVlpODFjWGh3TUVGMmNWVmtMMmczTTJod04xWjVWMlowT0hCV1YzbHZlVTF3U1ZObmRuVmpVRnBNVkN0NVlVdHVSRUpPV25kaE1GUkZOelJxZGxkMlREVlFUeXRWTW5RM1l6aEJlRGhSY1hKaFNVUmFjMUJrT0Voc1RrVnFaMnRLUWtkYVZuUTNVMUZXYW5Cak9HTjNNR1ZQZUhGdVZEbFRTa293UW10cVUyZG9iVFZoY1RKNE9XdGtZM2xwUTJsT2VXWTFVbGczY0RkR01uZFNUekkwVlRnM1JEVjZhVGcxTjA5WlduVnNhM2hGY25kNWRUbHNSVTlPY2xSNmFFTklabWRuU2taT1RHMUVkaXRpUjNRdmJYTXZZMkpFTUdkbEszUlVWVWRaT1V0TVpVcEZjMDE2YWtGUE1WcHJOUzlhVWtkT1FuaEpaazFUU1VsRVJtcG9SMVZaZEU5WVIzUXJNSHBSTm5wYWJtVXJlbkZNU0ZNMloyVlhhM0E0ZDBsT2NpdHFNRU40TkRadmVVbEJjV3M1TUdGd2JsRjVPVGMyZEdONlQxaFhNMUJOZERndlNrTXlNR3NyT0ZGM2JGWnJiekZGTUZKWlVVeHZRV1EwWVVWME0xUnpTakUzY2tSQ1VIWXJZVGRqYW1RelRucHBZMkpWV20xRFUyOU9USFk1UjNkd2EyWk5ZbGhLZUZwcE5IQTBNRUZPV0dadEsxTnZlRFptU0daU1dXcHVOVXBFSzNsTlNtNHlZbE5IZVRJMGNXbG9aaXRvY2toQmRrRjNVR05PY25saGJqQmpVME15Y3pkek9XMWpkRUpITW5WQ1pESTBaMnQxVUZWRGRETjBVbTh3TDAxRGRFWlNha1ZQT1ZsRlNURmpPWFE0YlZCNlpWbzBNV2gyV21kNmVsVTFSamx5T1ZWdFFWZDZUMVZUSzFaNlVIaE9ZVkpqS3pVcldDOXZXV1V6VDFGQlUySnFRVkpCUTBSNVkyNUpWMVJZWW1aTE9Xc3ZiM05vV0hCdE5IbEtWblExY0RaSlN6RkdkSEJTUmpSTk1rTTFObXhYTUdSR1NtRklkR3A0YkdkRFdHeDZiVGN6ZWtsWFJFdDFZbGxMWVZrek4wSTVUMkZCT1VFd2NpOUhaMVV3WXpReGMzcHlka2hDTW1adk1EbFpSR3c1TlhacWNVZGFRWFJGWjNRclRHTlVlRmhHVTJsTFdrWkNaWEEzTldVeWExQjJOMFJFVlc4MVZ6SkVVVGQ0YkRNdmRUWlZPR1pUU1VOM1JIcFdXRXhYVGpKQ1NrRlJlbTVyZUU1NGRXaFVTSEUxY1V0T1dFVTNiVzVuUmxkd1prbHpXRWh1TW1ndlNGWjZOek5uVEVaT1MyUklRbmxuVFVKUVZHUmtSRTVGYnpSNlp6SmhaMGMzTDFsdllYTm1jVFpTVUdaeFFTOURObGdyV25GV2NUTnpORE5LWkhWUk1EbFpaelpHTVdrMmJGTmtVVWwxZDNCVlRpOXNiRXg0Ykc1dFNFMWpPRzluWWtvdmJ6aGpaR2RPVGpCSFowRTFXSGx3TTJrMmRFOUhLMjUxT1dORFRtWnlNR3BNV25CWmJqWlZRUzlPUml0U2VUaDViVFZ1UTJSRmVIazNiVXhJY1hsRFQyYzlQUT09
```

**Base64 Decoded Hash:**
```
122a37a8c83af1175ac3f98edb12ded7:RnFHZFF0cm4rUzd0dit...
```

### Step 3: Fetch CloudNestra RCP Page

**HTTP Request:**
```http
GET https://cloudnestra.com/rcp/MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6Um5GSFpGRjBjbTRyVXpkMGRpdHFSa2t2Vkc0eVp6Z3dZMjUwTkd4NVJHWjJTM2RTTUV0c1pXSk9RelpSYzFremVWWnJWWFI1UldWU2NsVmtia2QyWVU5UFMxWmtiVGszUTFaa1F6QlhRV0pzYmt4Nk1UaGtVWGg1YlhKS2F6Tm5VM3BGWnpKaU1YbGtia3gzVURaNGNFdDVlVmRLY1RZck5rWnRibkZQWlVSRWRtUnRWVmMyY0ZZMFZFRnJWbEJ1VlRKaFZXWXlUV0YwYjJONkwydExVVEV6U1doUGQxVmhPRFZFWmtkSFVqWmlOVTlQVUZoaFVIVmhka05FUldObFVUaFVlVWRaWm10SlFWQk9VRVpqT1VoMFRsVnRjRllyUzFOWGNVTkdUMnhEVDNweFRVVXpSalpSZUhSbWQxQldNRGgyUjJwWldFOUxjRk5pZHl0T09VeENZMUppT1VNMWNrZDNiVE5aTVU1dkx6QlhhRFkzUjBKaGVESnlkbHBLTjI1MVNrZERWelJyVGtwR05VSnVUMDgxTDFodVlpODFjWGh3TUVGMmNWVmtMMmczTTJod04xWjVWMlowT0hCV1YzbHZlVTF3U1ZObmRuVmpVRnBNVkN0NVlVdHVSRUpPV25kaE1GUkZOelJxZGxkMlREVlFUeXRWTW5RM1l6aEJlRGhSY1hKaFNVUmFjMUJrT0Voc1RrVnFaMnRLUWtkYVZuUTNVMUZXYW5Cak9HTjNNR1ZQZUhGdVZEbFRTa293UW10cVUyZG9iVFZoY1RKNE9XdGtZM2xwUTJsT2VXWTFVbGczY0RkR01uZFNUekkwVlRnM1JEVjZhVGcxTjA5WlduVnNhM2hGY25kNWRUbHNSVTlPY2xSNmFFTklabWRuU2taT1RHMUVkaXRpUjNRdmJYTXZZMkpFTUdkbEszUlVWVWRaT1V0TVpVcEZjMDE2YWtGUE1WcHJOUzlhVWtkT1FuaEpaazFUU1VsRVJtcG9SMVZaZEU5WVIzUXJNSHBSTm5wYWJtVXJlbkZNU0ZNMloyVlhhM0E0ZDBsT2NpdHFNRU40TkRadmVVbEJjV3M1TUdGd2JsRjVPVGMyZEdONlQxaFhNMUJOZERndlNrTXlNR3NyT0ZGM2JGWnJiekZGTUZKWlVVeHZRV1EwWVVWME0xUnpTakUzY2tSQ1VIWXJZVGRqYW1RelRucHBZMkpWV20xRFUyOU9USFk1UjNkd2EyWk5ZbGhLZUZwcE5IQTBNRUZPV0dadEsxTnZlRFptU0daU1dXcHVOVXBFSzNsTlNtNHlZbE5IZVRJMGNXbG9aaXRvY2toQmRrRjNVR05PY25saGJqQmpVME15Y3pkek9XMWpkRUpITW5WQ1pESTBaMnQxVUZWRGRETjBVbTh3TDAxRGRFWlNha1ZQT1ZsRlNURmpPWFE0YlZCNlpWbzBNV2gyV21kNmVsVTFSamx5T1ZWdFFWZDZUMVZUSzFaNlVIaE9ZVkpqS3pVcldDOXZXV1V6VDFGQlUySnFRVkpCUTBSNVkyNUpWMVJZWW1aTE9Xc3ZiM05vV0hCdE5IbEtWblExY0RaSlN6RkdkSEJTUmpSTk1rTTFObXhYTUdSR1NtRklkR3A0YkdkRFdHeDZiVGN6ZWtsWFJFdDFZbGxMWVZrek4wSTVUMkZCT1VFd2NpOUhaMVV3WXpReGMzcHlka2hDTW1adk1EbFpSR3c1TlhacWNVZGFRWFJGWjNRclRHTlVlRmhHVTJsTFdrWkNaWEEzTldVeWExQjJOMFJFVlc4MVZ6SkVVVGQ0YkRNdmRUWlZPR1pUU1VOM1JIcFdXRXhYVGpKQ1NrRlJlbTVyZUU1NGRXaFVTSEUxY1V0T1dFVTNiVzVuUmxkd1prbHpXRWh1TW1ndlNGWjZOek5uVEVaT1MyUklRbmxuVFVKUVZHUmtSRTVGYnpSNlp6SmhaMGMzTDFsdllYTm1jVFpTVUdaeFFTOURObGdyV25GV2NUTnpORE5LWkhWUk1EbFpaelpHTVdrMmJGTmtVVWwxZDNCVlRpOXNiRXg0Ykc1dFNFMWpPRzluWWtvdmJ6aGpaR2RPVGpCSFowRTFXSGx3TTJrMmRFOUhLMjUxT1dORFRtWnlNR3BNV25CWmJqWlZRUzlPUml0U2VUaDViVFZ1UTJSRmVIazNiVXhJY1hsRFQyYzlQUT09 HTTP/1.1
Host: cloudnestra.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Referer: https://vidsrc.xyz/embed/tv?tmdb=33043892&season=1&episode=1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
```

**Expected Response:** HTML containing ProRCP URL or JavaScript that generates it

### Step 4: Extract ProRCP URL from RCP Response

**Search patterns in RCP response:**
```javascript
const prorcpPatterns = [
  /src:\s*['"]\/prorcp\/([^'"]+)['"]/g,
  /\/prorcp\/[A-Za-z0-9+\/=]+/g,
  /'\/prorcp\/([^']+)'/g,
  /"\/prorcp\/([^"]+)"/g,
  /https?:\/\/[^"'\s]*cloudnestra[^"'\s]*\/prorcp[^"'\s]*/g
];
```

**Expected ProRCP URL format:**
```
https://cloudnestra.com/prorcp/[BASE64_ENCODED_DATA]
```

### Step 5: Fetch CloudNestra ProRCP Page

**HTTP Request:**
```http
GET https://cloudnestra.com/prorcp/[EXTRACTED_DATA] HTTP/1.1
Host: cloudnestra.com  
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Referer: https://cloudnestra.com/rcp/MTIyYTM3YThjODNhZjExNzVhYzNmOThlZGIxMmRlZDc6...
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
```

**Expected Response:** HTML containing shadowlandschronicles.com URL or direct m3u8 URL

### Step 6: Extract Shadowlands or M3U8 URL from ProRCP Response

**Search patterns in ProRCP response:**
```javascript
// Look for shadowlandschronicles.com URLs first
const shadowlandsPatterns = [
  /https?:\/\/[^"'\s]*shadowlandschronicles\.com[^"'\s]*/g,
  /"(https?:\/\/[^"]*shadowlandschronicles\.com[^"]*)"/g,
  /'(https?:\/\/[^']*shadowlandschronicles\.com[^']*)'/g,
  /src="([^"]*shadowlandschronicles\.com[^"]*)"/g
];

// Look for direct m3u8 URLs if no shadowlands URL found
const m3u8Patterns = [
  /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
  /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
  /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
  /src="([^"]*\.m3u8[^"]*)"/g,
  /file:\s*["']([^"']*\.m3u8[^"']*)/g,
  /source:\s*["']([^"']*\.m3u8[^"']*)/g,
  /url:\s*["']([^"']*\.m3u8[^"']*)/g
];
```

### Step 7a: If Shadowlands URL Found - Fetch Final Page

**HTTP Request:**
```http
GET https://shadowlandschronicles.com/[EXTRACTED_PATH] HTTP/1.1
Host: shadowlandschronicles.com
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Referer: https://cloudnestra.com/prorcp/[DATA]
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Origin: https://cloudnestra.com
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
```

**Expected Response:** HTML containing final m3u8 URL

### Step 7b: Extract Final M3U8 URL

**Search patterns in Shadowlands response:**
```javascript
const finalM3u8Patterns = [
  /https?:\/\/[^"'\s]*\.m3u8[^"'\s]*/g,
  /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g,
  /'(https?:\/\/[^']*\.m3u8[^']*)'/g,
  /file:\s*["']([^"']*\.m3u8[^"']*)/g,
  /source:\s*["']([^"']*\.m3u8[^"']*)/g,
  /https?:\/\/[^"'\s]*master\.m3u8[^"'\s]*/g
];
```

### Step 8: Verify M3U8 URL Accessibility

**HTTP Request:**
```http
HEAD [EXTRACTED_M3U8_URL] HTTP/1.1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
Referer: https://shadowlandschronicles.com/[PATH]
```

**Expected Response:** 
- Status 200 OK: Stream is accessible
- Status 403 Forbidden: May need proxy or CORS headers
- Status 404 Not Found: Stream URL is invalid

### Step 9: Final M3U8 URL Format

**Expected Final Result:**
```
https://[CDN_SERVER]/[PATH]/master.m3u8
```

Or possibly:
```  
https://shadowlandschronicles.com/[PATH]/