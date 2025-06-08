#!/bin/bash

echo "🛑 Stopping Flyx Extract Stream Service..."

# Stop the PM2 process
pm2 stop flyx-extract-stream-vm

echo "✅ Service stopped!"
echo ""
echo "📊 Service status:"
pm2 status

echo ""
echo "📋 Useful commands:"
echo "   Start: ./vm-start.sh"
echo "   Restart: pm2 restart flyx-extract-stream-vm"
echo "   Delete: pm2 delete flyx-extract-stream-vm"
echo "   View logs: pm2 logs flyx-extract-stream-vm" 