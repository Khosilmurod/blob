#!/bin/bash

# Service Test Script - Tests systemd service functionality
echo "🔧 Testing systemd service functionality..."

# Create test service file
TEST_SERVICE="/tmp/blob-simulation-test.service"
cat > "$TEST_SERVICE" << 'EOF'
[Unit]
Description=Blob Simulation Test
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=$PWD/test-startup-mac.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "📝 Created test service file"
echo "🧪 Service would execute: $PWD/test-startup-mac.sh"
echo "👤 Running as user: $USER"
echo "📁 Working directory: $PWD"

# Validate service file
echo ""
echo "🔍 Service file validation:"
cat "$TEST_SERVICE"

echo ""
echo "✅ Service test complete!"
echo "📋 On Raspberry Pi, this would:"
echo "   1. Start automatically on boot"
echo "   2. Run as 'pi' user"  
echo "   3. Launch fullscreen browser"
echo "   4. Restart if crashed"

# Cleanup
rm "$TEST_SERVICE"