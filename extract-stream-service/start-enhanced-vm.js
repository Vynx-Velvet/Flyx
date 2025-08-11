#!/usr/bin/env node

/**
 * Quick start script for Enhanced VM Server
 * Handles dependencies and provides helpful startup info
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Enhanced VM Server Startup');
console.log('==============================\n');

// Check if required files exist
const requiredFiles = [
    'vm-server-enhanced.js',
    'package.json'
];

console.log('📋 Checking required files...');
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing!`);
        process.exit(1);
    }
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
    console.log('\n📦 Installing dependencies...');
    console.log('This may take a moment...\n');
    
    const npm = spawn('npm', ['install'], { stdio: 'inherit' });
    
    npm.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Dependencies installed successfully!');
            startServer();
        } else {
            console.log('\n❌ Failed to install dependencies');
            process.exit(1);
        }
    });
} else {
    console.log('✅ Dependencies already installed');
    startServer();
}

function startServer() {
    console.log('\n🎯 Starting Enhanced VM Server...');
    console.log('===================================\n');
    
    // Show usage information
    console.log('📡 Server will be available at: http://localhost:3001');
    console.log('🎯 Available endpoints:');
    console.log('   POST /extract-stream - Enhanced extraction with full stealth');
    console.log('   POST /extract-fast   - Fast extraction with server rotation');
    console.log('   GET  /health         - Health check');
    console.log('   GET  /status         - Server capabilities');
    
    console.log('\n💡 Test the server:');
    console.log('   • Web Interface: open test-web-interface.html in browser');
    console.log('   • Command Line:  node test-enhanced-vm.js');
    console.log('   • cURL Example:  curl -X POST http://localhost:3001/extract-stream \\');
    console.log('                      -H "Content-Type: application/json" \\');
    console.log('                      -d \'{"mediaType":"movie","movieId":"550"}\'');
    
    console.log('\n🔧 Enhanced Features:');
    console.log('   ✅ Advanced user agent rotation with realistic fingerprints');
    console.log('   ✅ Behavioral simulation (mouse movements, scrolling, timing)');
    console.log('   ✅ Sandbox detection bypass for iframe access');
    console.log('   ✅ Enhanced localStorage with realistic user preferences');
    console.log('   ✅ Request throttling and pattern randomization');
    console.log('   ✅ Cloudflare challenge detection and handling');
    console.log('   ✅ Server hash rotation (CloudStream Pro, 2Embed, Superembed)');
    console.log('   ✅ Iframe chain navigation (vidsrc → cloudnestra → prorcp)');
    
    console.log('\n⚠️  Important Notes:');
    console.log('   • Requires Chrome/Chromium installed at /usr/bin/google-chrome-stable');
    console.log('   • Uses headless browser - extraction takes 10-30 seconds');
    console.log('   • Built-in request throttling prevents rate limiting');
    console.log('   • Press Ctrl+C to stop the server');
    
    console.log('\n' + '='.repeat(50));
    console.log('🚀 STARTING SERVER...');
    console.log('='.repeat(50) + '\n');
    
    // Start the enhanced VM server
    const server = spawn('node', ['vm-server-enhanced.js'], { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' }
    });
    
    // Handle server process events
    server.on('error', (error) => {
        console.error('\n❌ Failed to start server:', error.message);
        process.exit(1);
    });
    
    server.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ Server stopped gracefully');
        } else {
            console.log(`\n❌ Server stopped with code ${code}`);
        }
        process.exit(code);
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down Enhanced VM Server...');
        server.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
        console.log('\n\n🛑 Shutting down Enhanced VM Server...');
        server.kill('SIGTERM');
    });
}