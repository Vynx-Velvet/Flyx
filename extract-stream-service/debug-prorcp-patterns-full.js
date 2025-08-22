import fetch from 'node-fetch';
import fs from 'fs';

async function saveFullCloudNestraHTML() {
    console.log('🔍 Saving full CloudNestra HTML for analysis...\n');
    
    const testUrl = 'https://cloudnestra.com/rcp/M2QyZmM1ZjkwNmI2MGRiMzg5ODE5Y2Q1YzhkYmQxMTM6VkZoMlJVMVhaRnBWVlRWMWJqUkVkVzFSVTJaMGRUSm9lRlJHUkZCdlYwNU9RM2xpVm5obU5qRm5aV1UwV0d4YVdHY3JaM1Y0TlN0clptY3hlbE5pY1V3eVJIaFhRemRCWkhOSE9VZFdaa2R0YzAwM00yRlRaekZUTkcxWFozVTVXa0pvYlhKVkx6aHRRaXN6Y0cxNFRYRlVRbGQxYkdWblZEWnBSRE5TVFVKV1JGSnFkRlJaUmtGbVRVeEpXRXhxVG5KNldVTndiM0JTVTJWMllpOTFjaTlJWTNOTWVXUlZSemx3UlhSNlZXNXVVVXhhTkZjeGNXMTFiMlprYTNwdlRqZG5UVVExVkVZMVVVZHJiV04wU1cxc1NHZFJVMnhXT0hodk1qWmxkVWgxY1RoVWRuSk9Na2xoZDA0ck1saDZaalYwVGpKYU1sWlhVSEpXUmtVNWJFeFFlRkpPY0hkWU56Rm1ibTVUYVZsRlMzQlBSM1pSTVZWak5qZFJVR1JDT0RGSGQyeHBWRTFKVldkTVdIaDJTVE5oY0VKUFdGcFBiVFpsU3pOdVpHSlpWSEpDTjFaV2JtRkVPSHA1TDA5aVpVeHBhR3M1VTBSNlQwWjRhek5QYnl0R1pITlVWMlpVWm05VVRURk1RbUpuVDBaRlRqRlZWRkpxUVRWTU1rOURhMlZ2WTBVeVRrTjNjazF4U0hSVGIyMUZXREptU1dkaGRHUm9WMHhwZGtwclpHWmtkVkZuV0UxNVlsUXlXbkpLUldGUk9FOU1MMHB5WW1RMUwyWldhV2hxUkZobmFYQllha05QTkRGWWFscElSM294U20wMFlUa3lXazVWU1d3eU5YWTFLMVpLY2podU5ucHhNa0ZRUTFRd2FWQnpUa3RRVDFrcmVWTTFhblFyV1hoeGNtOWlPVE5VWkZkVmRWQjBVRE40UXpsT1dHaEdWWEZ5Wm1kSlprSlZiM3BzT0d4UWRqWkpWRFp6ZVU1bFVYaGhPSGxTZDBKbWMwNVJUamxPT0M5SksyRnZjVFp5ZERSbVMwdEdURmN3TDJWWlpHMTZORU5MWjI1ckx6YzNjVXh1WjNSc1NXTklUelp6ZUhKWFNHUklkek5RYkhOcE4wdzBVMmRYV1ZVNFRqRXJkbVIyWWpsbFVuQlRWVTlWWkZCcVlqVXpNa3hIWVZkUlEzVmxlbUpDWjBac1JEbGtTbEI1Yld0UVZWTTBWRWRoZVRCblR5dHFURWRqWTB4WFoyRmtlaXN5VERKWlRGQm1VbGh1TTFrMVNXaE5XSE0wT0UxbldFbFBaemxtVDBJNE5VUnRaM1Z1UzNjeGJHUnZkbEIxZUVwWFdtTk1ZbEptSzFGd1owbHJlWEZ2TDFWRVMxbG9iRW81VjNsV01ubHRSbTlGY1dseWRHeG1UVVozY0N0NGRHWnpNbEk0UkhCa1MwdEVSRE5yYm1obVZVbzVWREU1WXpKaGVXbFpWelZtVkdKR2NtaDRjV1phT0dzM1ptWTBhRGxzTlVKUE5WWkJjRFJZTm5SellsSXpLMVp2S3pjMlNrVmxTRVp0YkVKWllVeFBZaloxVFRCd1RWWnpZM0kzZFV4TWJYaFJNbGw0VlNzelFrZFdibTFPT0cwMEx6QnVaVUZxV25Oa2VHdHNVWGROYkc5VVZHZG1jemhOYlhoT1JYSkpSbTVCYVdwbWFUZ3dSa0ZKZUZkbVdrdFlNRWxKSzNZMFZYTjVaRVYzU21Fd2NYQTNjQzlHY1RkUksycFhNREJ3YmxkWVlVRnlOM1V5YWpGbE1WbHlTVnBMZUU1UFJWWnhOMU1yUTFSSU0xcHpWbmN3UlUxMmJXdDJiQzg1TlZVdmRGWlhNRmg2YjFjNVlqSkxOMVZCWTAxM1JuRlZVMmxvWmpKTlJsTTBaMUZFTHpKVmRHTnlTSFZ6YlhkWWF6ZEVNbVE1ZDFGbVpVaFhXWEJoTmpWRlZXWlhhMDlLTjJWWlFWVTJRbFYxYVZZck5teFVUM1F5Wm5RelNHSnJZV014SzJGMWRERlBXSEJWYnpGMmVURkVWMUV6VkV4dFEwTXljMmRDTVU0eE9XSnpTazE1TVZCamJIQk1TMGx3WkVscWNXWnhZejA9';
    
    try {
        const response = await fetch(testUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Referer': 'https://vidsrc.xyz/embed/movie/1175942/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });
        
        if (!response.ok) {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            return;
        }
        
        const html = await response.text();
        
        // Save full HTML to file
        fs.writeFileSync('cloudnestra-current.html', html);
        console.log(`✅ Saved full HTML to cloudnestra-current.html (${html.length} bytes)`);
        
        // Print the full HTML for analysis
        console.log('\n📄 Full CloudNestra HTML Content:');
        console.log('='.repeat(80));
        console.log(html);
        console.log('='.repeat(80));
        
    } catch (error) {
        console.log(`❌ Fetch failed: ${error.message}`);
    }
}

// Run the debug
saveFullCloudNestraHTML();