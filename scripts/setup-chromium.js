const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const CHROMIUM_VERSION = '131.0.6778.108';
const CHROMIUM_URL = `https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/1323751/chrome-linux.zip`;

async function downloadChromium() {
  console.log('🔄 Setting up Chromium for serverless deployment...');
  
  const binDir = path.join(__dirname, '..', 'bin');
  const chromiumPath = path.join(binDir, 'chromium');
  const zipPath = path.join(binDir, 'chromium.zip');
  
  // Create bin directory
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
  
  // Check if already exists
  if (fs.existsSync(chromiumPath)) {
    console.log('✅ Chromium executable already exists');
    return chromiumPath;
  }
  
  console.log('📥 Downloading Chromium...');
  
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    
    https.get(CHROMIUM_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status: ${response.statusCode}`));
        return;
      }
      
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers['content-length'], 10);
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = Math.round((downloadedBytes / totalBytes) * 100);
        process.stdout.write(`\r📥 Downloading... ${percent}%`);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        console.log('\n🔄 Extracting Chromium...');
        
        try {
          // Extract the zip file
          execSync(`cd "${binDir}" && unzip -o chromium.zip`, { stdio: 'inherit' });
          
          // Find and move the chromium executable
          const extractedDir = path.join(binDir, 'chrome-linux');
          const extractedChromium = path.join(extractedDir, 'chrome');
          
          if (fs.existsSync(extractedChromium)) {
            fs.renameSync(extractedChromium, chromiumPath);
            fs.chmodSync(chromiumPath, '755');
            
            // Clean up
            fs.unlinkSync(zipPath);
            execSync(`rm -rf "${extractedDir}"`, { stdio: 'inherit' });
            
            console.log('✅ Chromium setup complete!');
            console.log(`📍 Executable path: ${chromiumPath}`);
            resolve(chromiumPath);
          } else {
            reject(new Error('Could not find chromium executable in extracted files'));
          }
        } catch (error) {
          reject(new Error(`Extraction failed: ${error.message}`));
        }
      });
      
      file.on('error', reject);
    }).on('error', reject);
  });
}

// Add to package.json scripts
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.scripts['setup-chromium']) {
  packageJson.scripts['setup-chromium'] = 'node scripts/setup-chromium.js';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Added setup-chromium script to package.json');
}

if (require.main === module) {
  downloadChromium().catch(console.error);
}

module.exports = { downloadChromium }; 