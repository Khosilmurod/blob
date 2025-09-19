#!/bin/bash

# Raspberry Pi Installation Script for Blob Simulation
# Run with: chmod +x install-pi.sh && ./install-pi.sh

echo "🎨 Installing Blob Simulation on Raspberry Pi..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install required packages
echo "📦 Installing required packages..."
sudo apt install -y chromium-browser unclutter

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Make startup script executable
chmod +x start-simulation.sh

# Create systemd service
echo "⚙️ Setting up auto-start service..."
sudo cp blob-simulation.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable blob-simulation.service

# Configure auto-login (optional but recommended)
echo "⚙️ Configuring auto-login..."
sudo raspi-config nonint do_boot_behaviour B2

# Disable screen blanking
echo "⚙️ Disabling screen blanking..."
echo "xset s off" >> ~/.profile
echo "xset -dpms" >> ~/.profile
echo "xset s noblank" >> ~/.profile

echo "✅ Installation complete!"
echo ""
echo "🚀 To start manually: ./start-simulation.sh"
echo "🔄 To start on boot: sudo systemctl start blob-simulation"
echo "📋 To check status: sudo systemctl status blob-simulation"
echo "⏹️ To stop: sudo systemctl stop blob-simulation"
echo ""
echo "💡 Reboot to test auto-start: sudo reboot"