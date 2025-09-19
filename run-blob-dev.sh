#!/bin/bash

# Blob Simulation - Development Server Script
# This script starts the development server for the blob simulation

# Set the project directory (adjust this path if needed)
PROJECT_DIR="/home/student334/Desktop/CES334/projects/blob"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_message "Starting Blob Simulation Development Server..."

# Change to the project directory
cd "$PROJECT_DIR" || {
    log_message "ERROR: Could not change to project directory: $PROJECT_DIR"
    exit 1
}

log_message "Changed to directory: $(pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_message "Node.js not found. Installing Node.js and npm..."
    
    # Update package list
    sudo apt update
    
    # Install Node.js and npm
    sudo apt install -y nodejs npm
    
    if ! command -v node &> /dev/null; then
        log_message "ERROR: Failed to install Node.js"
        exit 1
    fi
    
    log_message "Node.js installed successfully: $(node --version)"
    log_message "npm installed successfully: $(npm --version)"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    log_message "ERROR: package.json not found in $PROJECT_DIR"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    log_message "Installing npm dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        log_message "ERROR: Failed to install npm dependencies"
        exit 1
    fi
fi

# Kill any existing server processes on port 8080
log_message "Checking for existing processes on port 8080..."
pkill -f "http-server.*8080" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Start the development server in background
log_message "Starting development server with 'npm run dev'..."
/usr/bin/npm run dev &
SERVER_PID=$!

# Wait for server to start up
log_message "Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null; then
    log_message "Waiting a bit longer for server..."
    sleep 5
fi

# Try to open browser in kiosk mode (only if DISPLAY is available)
if [ -n "$DISPLAY" ]; then
    log_message "Opening browser in full-screen kiosk mode..."
    
    # Try different browsers in order of preference
    if command -v chromium-browser &> /dev/null; then
        log_message "Using Chromium browser..."
        chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --autoplay-policy=no-user-gesture-required http://localhost:8080 &
    elif command -v google-chrome &> /dev/null; then
        log_message "Using Google Chrome..."
        google-chrome --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --autoplay-policy=no-user-gesture-required http://localhost:8080 &
    elif command -v firefox &> /dev/null; then
        log_message "Using Firefox in fullscreen..."
        firefox --kiosk http://localhost:8080 &
    else
        log_message "No suitable browser found. Please open http://localhost:8080 manually."
    fi
else
    log_message "No display available. Server is running at http://localhost:8080"
    log_message "Browser will auto-open when you log in to the desktop."
fi

# Wait for the server process to finish
log_message "Server is running. Browser should open in kiosk mode. Press Ctrl+C to stop."
wait $SERVER_PID

# If we reach here, the server has stopped
log_message "Development server has stopped."