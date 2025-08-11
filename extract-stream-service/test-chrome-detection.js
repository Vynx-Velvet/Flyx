#!/usr/bin/env node

/**
 * Test Chrome detection and Puppeteer setup on Windows
 */

const fs = require('fs');
const puppeteer = require('puppeteer-core');

console.log('🔍 Chrome Detection Test');
console.log('========================\n');

console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test Chrome paths on Windows
if (process.platform === 'win32') {
    const windowsPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
    ];
    
    console.log('\n🔍 Checking Chrome installation paths:');
    
    let foundChrome = null;
    for (const path of windowsPaths) {
        if (path && fs.existsSync(path)) {
            console.log(`✅ Found: ${path}`);
            if (!foundChrome) foundChrome = path;
        } else {
            console.log(`❌ Not found: ${path}`);
        }
    }
    
    if (foundChrome) {
        console.log(`\n🎯 Using Chrome: ${foundChrome}`);
        
        // Test Puppeteer launch
        console.log('\n🧪 Testing Puppeteer launch...');
        
        (async () => {
            try {
                const browser = await puppeteer.launch({
                    executablePath: foundChrome,
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-web-security'
                    ]
                });
                
                console.log('✅ Puppeteer launched successfully!');
                
                const page = await browser.newPage();
                await page.goto('https://example.com', { timeout: 10000 });
                
                const title = await page.title();
                console.log(`✅ Page loaded: ${title}`);
                
                await browser.close();
                console.log('✅ Browser closed successfully!');
                
                console.log('\n🎉 Chrome detection and Puppeteer test passed!');
                console.log('💡 The enhanced VM server should work now.');
                
            } catch (error) {
                console.log('❌ Puppeteer test failed:', error.message);
                console.log('\n💡 Troubleshooting:');
                console.log('   1. Make sure Chrome is installed');
                console.log('   2. Try installing Chrome from: https://www.google.com/chrome/');
                console.log('   3. Or install Chromium');
            }
        })();
        
    } else {
        console.log('\n❌ Chrome not found!');
        console.log('\n💡 Install Chrome from: https://www.google.com/chrome/');
        console.log('   Or try using regular Puppeteer (downloads Chromium):');
        console.log('   npm install puppeteer');
        
        // Test with regular puppeteer
        console.log('\n🧪 Testing with bundled Chromium...');
        
        try {
            const puppeteerRegular = require('puppeteer');
            
            (async () => {
                try {
                    const browser = await puppeteerRegular.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });
                    
                    console.log('✅ Bundled Chromium works!');
                    
                    const page = await browser.newPage();
                    await page.goto('https://example.com', { timeout: 10000 });
                    
                    const title = await page.title();
                    console.log(`✅ Page loaded: ${title}`);
                    
                    await browser.close();
                    console.log('✅ Bundled Chromium test passed!');
                    
                } catch (error) {
                    console.log('❌ Bundled Chromium failed:', error.message);
                }
            })();
            
        } catch (error) {
            console.log('❌ Regular puppeteer not available');
            console.log('💡 Install with: npm install puppeteer');
        }
    }
    
} else {
    console.log('This test is designed for Windows. On Linux/Mac, Chrome should be at /usr/bin/google-chrome-stable');
}