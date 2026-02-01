#!/bin/bash
# Start TinyPM as a web app accessible from your phone
# Requires: pip install textual-serve

echo "═══════════════════════════════════════════════════"
echo "  TinyPM - Web Mode"
echo "═══════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

# Check if textual-serve is installed
if ! python3 -c "import textual_serve" 2>/dev/null; then
    echo "Installing textual-serve..."
    pip3 install textual-serve
fi

# Get local IP for phone access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo "Starting TinyPM web server..."
echo ""
echo "Access from:"
echo "  Local:  http://localhost:8000"
if [ -n "$LOCAL_IP" ]; then
    echo "  Phone:  http://${LOCAL_IP}:8000"
fi
echo ""
echo "Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════"
echo ""

# Start the web server using the Python API
python3 -c "
from textual_serve.server import Server
server = Server('python3 $(pwd)/app.py', host='0.0.0.0', port=8000, title='TinyPM - Tiny Seed Farm OS')
server.serve()
"
