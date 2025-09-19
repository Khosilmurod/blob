#!/bin/bash

# Auto-open blob simulation in kiosk mode when desktop loads
# This script should be added to your desktop startup applications

# Wait a moment for desktop to fully load
sleep 3

# Check if server is running
if curl -s http://localhost:8080 > /dev/null; then
    echo "Blob simulation server detected. Opening in kiosk mode..."
    
    # Try different browsers in order of preference
    if command -v chromium-browser &> /dev/null; then
        chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --autoplay-policy=no-user-gesture-required http://localhost:8080 &
    elif command -v google-chrome &> /dev/null; then
        google-chrome --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --autoplay-policy=no-user-gesture-required http://localhost:8080 &
    elif command -v firefox &> /dev/null; then
        firefox --kiosk http://localhost:8080 &
    else
        echo "No suitable browser found."
    fi
else
    echo "Blob simulation server not running."
fi