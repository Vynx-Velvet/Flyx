@echo off
title VidSrc.cc M3U8 Extraction Service

echo 🚀 Starting VidSrc.cc M3U8 Extraction Service...

REM Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js to run this service.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm to run this service.
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Install browser for Puppeteer if not already installed
echo 🌍 Installing Chrome browser for Puppeteer...
npx puppeteer browsers install chrome

REM Start the service
echo 🎬 Starting the service...
npm start

pause