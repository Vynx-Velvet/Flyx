#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting HTML Parsing VM Server');
console.log('===================================');

// Start the HTML parsing VM server
const serverProcess = spawn('node', ['vm-server-html-parsing.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3001
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down HTML Parsing VM Server...');
    serverProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down HTML Parsing VM Server...');
    serverProcess.kill('SIGTERM');
    process.exit(0);
});

serverProcess.on('close', (code) => {
    console.log(`\n📊 HTML Parsing VM Server exited with code ${code}`);
    process.exit(code);
});

serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start HTML Parsing VM Server: ${error.message}`);
    process.exit(1);
});