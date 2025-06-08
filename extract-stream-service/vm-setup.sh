#!/bin/bash

echo "🚀 Setting up Flyx Extract Stream Service for Google VM"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📥 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Google Chrome
echo "🌐 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# Install additional dependencies for Puppeteer
echo "🔧 Installing additional dependencies..."
sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Create directories
echo "📁 Creating directories..."
mkdir -p logs

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cp vm-package.json package.json
npm install

# Install PM2 globally
echo "🔄 Installing PM2 globally..."
sudo npm install -g pm2

# Setup PM2 startup
echo "⚙️ Setting up PM2 startup..."
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# Make scripts executable
chmod +x vm-setup.sh
chmod +x vm-start.sh
chmod +x vm-stop.sh

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start the service: ./vm-start.sh"
echo "   2. Test the service: curl http://localhost:3001/health"
echo "   3. View logs: pm2 logs flyx-extract-stream-vm"
echo "   4. Stop the service: ./vm-stop.sh"
echo ""
echo "📋 Service endpoints:"
echo "   Health: http://YOUR_VM_IP:3001/health"
echo "   Extract: http://YOUR_VM_IP:3001/extract?mediaType=movie&movieId=123456" 