#!/bin/bash

# VidSrc.cc M3U8 Extraction Service Start Script

echo "🚀 Starting VidSrc.cc M3U8 Extraction Service..."

# Check if node is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js to run this service."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm is not installed. Please install npm to run this service."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install browser for Puppeteer if not already installed
echo "🌍 Installing Chrome browser for Puppeteer..."
npx puppeteer browsers install chrome

# Start the service
echo "🎬 Starting the service..."
npm start