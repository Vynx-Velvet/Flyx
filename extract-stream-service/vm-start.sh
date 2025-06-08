#!/bin/bash

echo "🚀 Starting Flyx Extract Stream Service..."

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ Service started!"
echo ""
echo "📊 Service status:"
pm2 status

echo ""
echo "🔗 Service URLs:"
echo "   Health: http://localhost:3001/health"
echo "   API Docs: http://localhost:3001/"
echo "   Extract: http://localhost:3001/extract"
echo ""
echo "📋 Useful commands:"
echo "   View logs: pm2 logs flyx-extract-stream-vm"
echo "   Monitor: pm2 monit"
echo "   Restart: pm2 restart flyx-extract-stream-vm"
echo "   Stop: ./vm-stop.sh" 