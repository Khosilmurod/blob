#!/bin/bash

# Test version for Mac - simulates Pi behavior
echo "🧪 Testing Blob Simulation startup (Mac version)..."

# Change to current directory (instead of /home/pi/blob-simulation)
cd "$(dirname "$0")"

# Kill any existing server processes
echo "🔄 Stopping existing servers..."
pkill -f "http-server" 2>/dev/null || true
pkill -f "serve" 2>/dev/null || true

# Wait a moment
sleep 2

# Start the web server in background
echo "🚀 Starting web server on port 8080..."
if command -v npx &> /dev/null; then
    npx http-server -c-1 -p 8080 &
else
    node_modules/.bin/http-server -c-1 -p 8080 &
fi

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test server is running
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Server is running successfully!"
    echo "🌐 Application available at: http://localhost:8080"
    echo "🖥️ On Pi, this would auto-launch in fullscreen mode"
    
    # On Mac, open in default browser instead of kiosk mode
    if command -v open &> /dev/null; then
        echo "🔓 Opening in default browser..."
        open http://localhost:8080
    fi
else
    echo "❌ Server failed to start"
    exit 1
fi

echo ""
echo "✅ Test completed! Server is running."
echo "Press Ctrl+C to stop the server."

# Keep script running so server stays active
wait