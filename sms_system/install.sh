#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# TINY SEED FARM - iMESSAGE MONITOR INSTALLER
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script installs the automatic iMessage capture system.
# Run it ONCE on your Mac and the system will:
#   - Capture ALL incoming and outgoing text messages
#   - Send them to the Chief of Staff AI for analysis
#   - Run automatically on every startup
#   - Never miss a message
#
# Usage: ./install.sh
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Banner
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "           TINY SEED FARM - iMESSAGE MONITOR INSTALLER"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "This will set up automatic text message capture on your Mac."
echo "All messages will be sent to the Chief of Staff AI for analysis."
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Get script directory (where this install.sh lives)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MONITOR_SCRIPT="$SCRIPT_DIR/imessage_monitor.py"
PLIST_TEMPLATE="$SCRIPT_DIR/com.tinyseedfarm.imessage-monitor.plist"

# Check that required files exist
if [ ! -f "$MONITOR_SCRIPT" ]; then
    log_error "imessage_monitor.py not found in $SCRIPT_DIR"
    exit 1
fi

if [ ! -f "$PLIST_TEMPLATE" ]; then
    log_error "com.tinyseedfarm.imessage-monitor.plist not found in $SCRIPT_DIR"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Check for Python 3
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 1: Checking for Python 3..."

PYTHON_PATH=""

# Try common Python locations
for python_cmd in "/usr/local/bin/python3" "/opt/homebrew/bin/python3" "$(which python3 2>/dev/null)" "/usr/bin/python3"; do
    if [ -x "$python_cmd" ]; then
        version=$("$python_cmd" --version 2>&1 | cut -d' ' -f2)
        major_version=$(echo "$version" | cut -d'.' -f1)
        if [ "$major_version" -ge 3 ]; then
            PYTHON_PATH="$python_cmd"
            log_success "Found Python $version at $PYTHON_PATH"
            break
        fi
    fi
done

if [ -z "$PYTHON_PATH" ]; then
    log_error "Python 3 not found!"
    echo ""
    echo "Please install Python 3 first:"
    echo "  Option 1: brew install python3"
    echo "  Option 2: Download from https://www.python.org/downloads/"
    echo ""
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Install Python dependencies
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 2: Installing Python dependencies..."

"$PYTHON_PATH" -m pip install --upgrade pip --quiet 2>/dev/null || true
"$PYTHON_PATH" -m pip install requests --quiet

if "$PYTHON_PATH" -c "import requests" 2>/dev/null; then
    log_success "Python 'requests' library installed"
else
    log_error "Failed to install 'requests' library"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Create log directory
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 3: Creating log directory..."

LOG_DIR="$HOME/Library/Logs/TinySeedFarm"
mkdir -p "$LOG_DIR"
log_success "Log directory created at $LOG_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Create LaunchAgents directory
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 4: Setting up LaunchAgents..."

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$LAUNCH_AGENTS_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Configure and install plist
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 5: Installing Launch Agent..."

PLIST_DEST="$LAUNCH_AGENTS_DIR/com.tinyseedfarm.imessage-monitor.plist"

# Unload existing if present
if launchctl list | grep -q "com.tinyseedfarm.imessage-monitor"; then
    log_info "Stopping existing monitor..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Create configured plist
sed -e "s|SCRIPT_PATH_PLACEHOLDER|$MONITOR_SCRIPT|g" \
    -e "s|LOG_PATH_PLACEHOLDER|$LOG_DIR|g" \
    -e "s|WORKING_DIR_PLACEHOLDER|$SCRIPT_DIR|g" \
    -e "s|/usr/local/bin/python3|$PYTHON_PATH|g" \
    "$PLIST_TEMPLATE" > "$PLIST_DEST"

# Validate plist
if plutil -lint "$PLIST_DEST" > /dev/null 2>&1; then
    log_success "Launch Agent installed at $PLIST_DEST"
else
    log_error "Invalid plist file generated"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: Make script executable
# ═══════════════════════════════════════════════════════════════════════════════
log_info "Step 6: Making script executable..."
chmod +x "$MONITOR_SCRIPT"
log_success "Script is now executable"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: Check Full Disk Access
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
log_info "Step 7: Checking Full Disk Access permission..."

# Test if we can read the Messages database
MESSAGES_DB="$HOME/Library/Messages/chat.db"
CAN_READ=false

if [ -f "$MESSAGES_DB" ]; then
    if head -c 1 "$MESSAGES_DB" > /dev/null 2>&1; then
        CAN_READ=true
        log_success "Full Disk Access appears to be granted"
    fi
fi

if [ "$CAN_READ" = false ]; then
    echo ""
    log_warning "═══════════════════════════════════════════════════════════════"
    log_warning "FULL DISK ACCESS REQUIRED - MANUAL STEP NEEDED"
    log_warning "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "The monitor needs Full Disk Access to read your messages."
    echo ""
    echo "Please do the following:"
    echo ""
    echo "  1. Open System Settings (Apple menu → System Settings)"
    echo "  2. Click 'Privacy & Security' in the sidebar"
    echo "  3. Scroll down and click 'Full Disk Access'"
    echo "  4. Click the lock icon and enter your password"
    echo "  5. Click the + button"
    echo "  6. Navigate to and add:"
    echo ""
    echo "     $PYTHON_PATH"
    echo ""
    echo "  7. Also add Terminal.app:"
    echo "     /Applications/Utilities/Terminal.app"
    echo ""
    echo "  8. IMPORTANT: Quit and reopen Terminal after granting permission!"
    echo ""
    log_warning "═══════════════════════════════════════════════════════════════"
    echo ""
    read -p "Press ENTER after granting Full Disk Access (or Ctrl+C to exit)..."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: Load the Launch Agent
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
log_info "Step 8: Starting the iMessage Monitor..."

launchctl load "$PLIST_DEST"

# Wait a moment for it to start
sleep 2

# Check if running
if launchctl list | grep -q "com.tinyseedfarm.imessage-monitor"; then
    log_success "iMessage Monitor is now running!"
else
    log_warning "Monitor may not have started. Check logs for errors."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# DONE!
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "                          INSTALLATION COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "The iMessage Monitor is now:"
echo "  ✓ Installed and running"
echo "  ✓ Set to start automatically on login"
echo "  ✓ Sending ALL messages to Chief of Staff AI"
echo ""
echo "USEFUL COMMANDS:"
echo ""
echo "  View live logs:"
echo "    tail -f $LOG_DIR/imessage-monitor.log"
echo ""
echo "  Check if running:"
echo "    launchctl list | grep tinyseedfarm"
echo ""
echo "  Stop the monitor:"
echo "    launchctl stop com.tinyseedfarm.imessage-monitor"
echo ""
echo "  Start the monitor:"
echo "    launchctl start com.tinyseedfarm.imessage-monitor"
echo ""
echo "  Uninstall completely:"
echo "    launchctl unload $PLIST_DEST"
echo "    rm $PLIST_DEST"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "Send a test text message to verify it's working!"
echo "Then check: tail -f $LOG_DIR/imessage-monitor.log"
echo ""
echo "NOTHING SLIPS THROUGH THE CRACKS."
echo ""
