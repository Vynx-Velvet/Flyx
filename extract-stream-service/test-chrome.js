const puppeteer = require('puppeteer');

async function testChrome() {
  console.log('🔍 Testing Chrome installation...');
  
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('✅ Chrome launched successfully!');
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    
    console.log('✅ Navigation successful!');
    
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    await browser.close();
    console.log('✅ Chrome test completed successfully!');
    
  } catch (error) {
    console.error('❌ Chrome test failed:', error.message);
    
    if (error.message.includes('Could not find Chrome')) {
      console.log('\n💡 Solution: Install Chrome for Puppeteer:');
      console.log('   npx puppeteer browsers install chrome');
    }
  }
}

testChrome();