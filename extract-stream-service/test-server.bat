@echo off
echo 🧪 Testing Enhanced VM Server...
echo ================================
echo.
echo First checking if server is running...
node test-enhanced-vm.js --health
echo.
echo Testing movie extraction (Fight Club)...
node test-enhanced-vm.js --movie 550
pause