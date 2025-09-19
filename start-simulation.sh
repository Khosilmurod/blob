#!/bin/bash

# Blob Simulation - Raspberry Pi Auto-start Script
# This script starts the web server and launches the simulation

# Change to the project directory
cd /home/pi/blob-simulation

# Kill any existing server processes
pkill -f "http-server"
pkill -f "serve"

# Wait a moment
sleep 2

# Start the web server in background
node_modules/.bin/http-server -c-1 -p 8080 &

# Wait for server to start
sleep 5

# Launch Chromium in kiosk mode (fullscreen)
DISPLAY=:0 chromium-browser \
    --kiosk \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --autoplay-policy=no-user-gesture-required \
    --no-first-run \
    --disable-translate \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --disable-features=VizDisplayCompositor \
    http://localhost:8080