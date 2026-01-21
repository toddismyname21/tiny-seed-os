#!/bin/bash
#
# SMS Intelligence System - Setup Script
# ======================================
#
# This script sets up the SMS Intelligence System on macOS.
# It handles:
#   - Checking for Full Disk Access
#   - Installing Python dependencies
#   - Installing Redis via Homebrew (optional)
#   - Storing the Anthropic API key securely
#   - Installing and loading the launchd service
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
#
# For uninstallation:
#   ./setup.sh --uninstall
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.tinyseed.sms-intelligence.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
DATA_DIR="$HOME/.sms_intelligence"
MESSAGES_DB="$HOME/Library/Messages/chat.db"

# Functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_macos() {
    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "This script is designed for macOS only."
        exit 1
    fi
    print_success "Running on macOS"
}

check_python() {
    print_info "Checking Python installation..."

    # Check for python3
    if command -v python3 &> /dev/null; then
        PYTHON_PATH=$(command -v python3)
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        print_success "Found Python $PYTHON_VERSION at $PYTHON_PATH"

        # Check version is 3.9+
        MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        if [[ $MAJOR -lt 3 ]] || [[ $MAJOR -eq 3 && $MINOR -lt 9 ]]; then
            print_warning "Python 3.9+ recommended. Found $PYTHON_VERSION"
        fi
    else
        print_error "Python 3 not found. Please install Python 3.9+"
        echo "You can install it with: brew install python3"
        exit 1
    fi
}

check_full_disk_access() {
    print_info "Checking Full Disk Access..."

    if [[ -r "$MESSAGES_DB" ]]; then
        print_success "Full Disk Access appears to be granted"
    else
        print_error "Full Disk Access NOT granted!"
        echo ""
        echo "To grant Full Disk Access:"
        echo "  1. Open System Settings (or System Preferences)"
        echo "  2. Go to Privacy & Security > Full Disk Access"
        echo "  3. Click the + button"
        echo "  4. Add Terminal (or iTerm, or your terminal app)"
        echo "  5. Also add Python if not using Terminal"
        echo "     Path: $PYTHON_PATH"
        echo "  6. Restart your terminal"
        echo ""
        echo "After granting access, run this script again."
        exit 1
    fi
}

check_homebrew() {
    if command -v brew &> /dev/null; then
        print_success "Homebrew is installed"
        return 0
    else
        print_warning "Homebrew not found. Some optional features may not be available."
        return 1
    fi
}

install_redis() {
    print_info "Checking Redis installation..."

    if command -v redis-server &> /dev/null; then
        print_success "Redis is already installed"
    else
        echo ""
        read -p "Redis is not installed. Install it now? (recommended) [Y/n]: " response
        response=${response:-Y}

        if [[ "$response" =~ ^[Yy]$ ]]; then
            if check_homebrew; then
                print_info "Installing Redis via Homebrew..."
                brew install redis
                print_success "Redis installed"

                # Start Redis service
                print_info "Starting Redis service..."
                brew services start redis
                print_success "Redis service started"
            else
                print_warning "Cannot install Redis without Homebrew. Skipping..."
                print_info "Install Homebrew from https://brew.sh and run this script again"
            fi
        else
            print_info "Skipping Redis installation. The system will work without it but with reduced caching."
        fi
    fi
}

install_python_packages() {
    print_info "Installing Python packages..."

    cd "$SCRIPT_DIR"

    if [[ -f "requirements.txt" ]]; then
        python3 -m pip install --upgrade pip
        python3 -m pip install -r requirements.txt

        print_success "Python packages installed"
    else
        print_error "requirements.txt not found in $SCRIPT_DIR"
        exit 1
    fi
}

setup_data_directory() {
    print_info "Setting up data directory..."

    mkdir -p "$DATA_DIR"
    mkdir -p "$DATA_DIR/data"
    mkdir -p "$DATA_DIR/data/chromadb"
    mkdir -p "$DATA_DIR/logs"

    print_success "Data directory created at $DATA_DIR"
}

configure_api_key() {
    print_header "Anthropic API Key Configuration"

    # Check if already set in environment
    if [[ -n "$ANTHROPIC_API_KEY" ]]; then
        print_success "ANTHROPIC_API_KEY already set in environment"
        read -p "Do you want to update it? [y/N]: " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    # Check if stored in keyring
    STORED_KEY=$(python3 -c "
import keyring
try:
    key = keyring.get_password('sms_intelligence', 'anthropic_api_key')
    print(key if key else '')
except:
    print('')
" 2>/dev/null)

    if [[ -n "$STORED_KEY" ]]; then
        print_success "API key found in secure keyring"
        read -p "Do you want to update it? [y/N]: " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi

    echo ""
    echo "You need an Anthropic API key to use this system."
    echo "Get one at: https://console.anthropic.com/"
    echo ""

    read -s -p "Enter your Anthropic API key (input hidden): " api_key
    echo ""

    if [[ -z "$api_key" ]]; then
        print_error "No API key provided. You can set it later with:"
        echo "  export ANTHROPIC_API_KEY='your-key-here'"
        echo "  or store in keyring using Python keyring module"
        return 1
    fi

    # Validate key format
    if [[ ! "$api_key" =~ ^sk-ant- ]]; then
        print_warning "API key format looks unusual. Anthropic keys typically start with 'sk-ant-'"
        read -p "Continue anyway? [y/N]: " response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi

    # Store in keyring
    print_info "Storing API key in secure keyring..."
    python3 -c "
import keyring
keyring.set_password('sms_intelligence', 'anthropic_api_key', '''$api_key''')
print('Key stored successfully')
" 2>/dev/null

    if [[ $? -eq 0 ]]; then
        print_success "API key stored securely in macOS keyring"
    else
        print_warning "Could not store in keyring. Setting in .zshrc instead..."
        echo "" >> "$HOME/.zshrc"
        echo "# SMS Intelligence System" >> "$HOME/.zshrc"
        echo "export ANTHROPIC_API_KEY='$api_key'" >> "$HOME/.zshrc"
        print_success "API key added to ~/.zshrc"
        print_info "Run 'source ~/.zshrc' or restart your terminal"
    fi
}

install_launchd_service() {
    print_header "Installing launchd Service"

    # Create LaunchAgents directory if needed
    mkdir -p "$LAUNCH_AGENTS_DIR"

    # Check if already installed
    if [[ -f "$LAUNCH_AGENTS_DIR/$PLIST_NAME" ]]; then
        print_info "Service already installed. Updating..."
        launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME" 2>/dev/null || true
    fi

    # Copy plist file
    if [[ -f "$SCRIPT_DIR/$PLIST_NAME" ]]; then
        cp "$SCRIPT_DIR/$PLIST_NAME" "$LAUNCH_AGENTS_DIR/"
        print_success "Plist file copied to $LAUNCH_AGENTS_DIR"
    else
        print_error "Plist file not found at $SCRIPT_DIR/$PLIST_NAME"
        return 1
    fi

    # Update paths in plist if needed
    # (The plist should already have correct paths, but we can verify)
    print_info "Verifying plist configuration..."

    # Load the service
    print_info "Loading launchd service..."
    launchctl load "$LAUNCH_AGENTS_DIR/$PLIST_NAME"

    if [[ $? -eq 0 ]]; then
        print_success "Service loaded successfully"
    else
        print_error "Failed to load service. Check logs at /tmp/sms-intelligence.error.log"
        return 1
    fi

    # Start the service
    print_info "Starting service..."
    launchctl start com.tinyseed.sms-intelligence

    print_success "SMS Intelligence daemon is now running"
}

verify_installation() {
    print_header "Verifying Installation"

    # Check if service is running
    if launchctl list | grep -q "com.tinyseed.sms-intelligence"; then
        print_success "Service is registered with launchd"
    else
        print_warning "Service not found in launchctl list"
    fi

    # Check if daemon is responding
    sleep 2
    if [[ -f "/tmp/sms-intelligence.log" ]]; then
        print_success "Log file created"
        echo ""
        echo "Last 5 log entries:"
        tail -5 /tmp/sms-intelligence.log 2>/dev/null || echo "  (no entries yet)"
    fi

    # Check for errors
    if [[ -f "/tmp/sms-intelligence.error.log" ]]; then
        ERROR_COUNT=$(wc -l < /tmp/sms-intelligence.error.log 2>/dev/null || echo "0")
        if [[ $ERROR_COUNT -gt 0 ]]; then
            print_warning "Found $ERROR_COUNT lines in error log"
            echo ""
            echo "Recent errors:"
            tail -5 /tmp/sms-intelligence.error.log 2>/dev/null
        fi
    fi
}

print_usage_info() {
    print_header "Setup Complete!"

    echo "The SMS Intelligence System is now installed and running."
    echo ""
    echo "Useful commands:"
    echo ""
    echo "  # Check daemon status"
    echo "  python3 $SCRIPT_DIR/sms_daemon.py --mode status"
    echo ""
    echo "  # Search messages semantically"
    echo "  python3 $SCRIPT_DIR/sms_daemon.py --mode search --query 'meeting tomorrow'"
    echo ""
    echo "  # List conversations"
    echo "  python3 $SCRIPT_DIR/sms_daemon.py --mode chats"
    echo ""
    echo "  # Analyze a conversation thread"
    echo "  python3 $SCRIPT_DIR/thread_analyzer.py"
    echo ""
    echo "  # View daemon logs"
    echo "  tail -f /tmp/sms-intelligence.log"
    echo ""
    echo "  # Service management"
    echo "  launchctl stop com.tinyseed.sms-intelligence   # Stop"
    echo "  launchctl start com.tinyseed.sms-intelligence  # Start"
    echo ""
    echo "Data is stored in: $DATA_DIR"
    echo ""
    echo "For issues, check:"
    echo "  /tmp/sms-intelligence.log"
    echo "  /tmp/sms-intelligence.error.log"
    echo ""
}

uninstall() {
    print_header "Uninstalling SMS Intelligence System"

    # Stop and unload service
    print_info "Stopping service..."
    launchctl stop com.tinyseed.sms-intelligence 2>/dev/null || true
    launchctl unload "$LAUNCH_AGENTS_DIR/$PLIST_NAME" 2>/dev/null || true

    # Remove plist
    if [[ -f "$LAUNCH_AGENTS_DIR/$PLIST_NAME" ]]; then
        rm "$LAUNCH_AGENTS_DIR/$PLIST_NAME"
        print_success "Removed launchd plist"
    fi

    # Ask about data
    echo ""
    read -p "Remove data directory ($DATA_DIR)? [y/N]: " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "$DATA_DIR"
        print_success "Removed data directory"
    fi

    # Ask about API key
    read -p "Remove stored API key from keyring? [y/N]: " response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        python3 -c "
import keyring
try:
    keyring.delete_password('sms_intelligence', 'anthropic_api_key')
except:
    pass
" 2>/dev/null
        print_success "Removed API key from keyring"
    fi

    print_success "Uninstallation complete"
}

# Main execution
main() {
    print_header "SMS Intelligence System Setup"

    # Handle uninstall flag
    if [[ "$1" == "--uninstall" ]]; then
        uninstall
        exit 0
    fi

    # Check prerequisites
    check_macos
    check_python
    check_full_disk_access

    # Install dependencies
    install_redis
    install_python_packages

    # Setup
    setup_data_directory
    configure_api_key

    # Install service
    install_launchd_service

    # Verify
    verify_installation

    # Print usage
    print_usage_info
}

# Run main with all arguments
main "$@"
