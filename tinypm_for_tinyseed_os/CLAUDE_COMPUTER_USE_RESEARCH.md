# Claude Computer Use & Desktop Control - Complete Research Guide

**Research Date:** January 29, 2026
**Purpose:** Enable Claude to control browser, manipulate files, and interact with online portals

---

## Table of Contents

1. [Overview - Three Approaches](#overview---three-approaches)
2. [Option 1: Claude Cowork (RECOMMENDED for Non-Technical Users)](#option-1-claude-cowork-recommended-for-non-technical-users)
3. [Option 2: Claude Code + Chrome Integration](#option-2-claude-code--chrome-integration)
4. [Option 3: Computer Use API + Docker Container](#option-3-computer-use-api--docker-container)
5. [Option 4: MCP Filesystem Server](#option-4-mcp-filesystem-server)
6. [Security Considerations](#security-considerations)
7. [Recommended Setup for Your Needs](#recommended-setup-for-your-needs)
8. [Quick Start Commands](#quick-start-commands)

---

## Overview - Three Approaches

Claude offers several ways to control your computer and browser:

| Approach | Best For | Technical Level | Current Status |
|----------|----------|-----------------|----------------|
| **Claude Cowork** | File organization, document processing | Beginner | Available (macOS only) |
| **Claude Code + Chrome** | Browser automation from terminal | Intermediate | Beta (works now) |
| **Computer Use API + Docker** | Full desktop control in sandbox | Advanced | Beta (API access required) |
| **MCP Filesystem Server** | File access from Claude Desktop | Beginner-Intermediate | Stable |

---

## Option 1: Claude Cowork (RECOMMENDED for Non-Technical Users)

**Released:** January 12, 2026
**Status:** Available to Claude Pro ($20/month) and Claude Max subscribers
**Platform:** macOS only (uses Apple Virtualization Framework)

### What It Does

Claude Cowork is a general-purpose AI agent built into Claude Desktop that can:
- Organize files and folders autonomously
- Generate spreadsheets from receipt images
- Draft reports from scattered notes
- Work across multiple tasks simultaneously
- Read and write files in designated folders

### How to Access

1. **Download Claude Desktop** for macOS from [claude.ai/download](https://claude.ai/download)
2. **Subscribe** to Claude Pro ($20/month) or Claude Max
3. Open Claude Desktop
4. Click **"Cowork"** in the sidebar
5. Grant access to specific folders when prompted

### Key Features

- **Autonomous Workflow:** Formulates a plan, executes steps in parallel, checks its own work
- **Folder Sandboxing:** Only accesses folders you explicitly approve
- **Browser Integration:** Can connect to Chrome for web tasks
- **Connectors:** Links to external services (Google Docs, etc.)
- **Skills Integration:** Handles office formats (XLSX, PPTX, DOCX, PDF)

### Configuration

Cowork shares configuration with Claude Code:
- Settings file: `~/.claude/settings.json`
- Skills directory: `~/.claude/skills/`

### Security

- Claude can only read/edit folders you explicitly grant access to
- Path traversal attacks are blocked
- Symlinks to sensitive areas are ignored
- Claude asks before taking significant actions

### Sources

- [Anthropic Cowork Announcement](https://claude.com/blog/cowork-research-preview)
- [VentureBeat Coverage](https://venturebeat.com/technology/anthropic-launches-cowork-a-claude-desktop-agent-that-works-in-your-files-no)
- [Simon Willison's First Impressions](https://simonwillison.net/2026/Jan/12/claude-cowork/)

---

## Option 2: Claude Code + Chrome Integration

**Status:** Beta
**Platform:** macOS, Windows, Linux
**Requirements:** Claude Code CLI v2.0.73+, Chrome Extension v1.0.36+, Paid Claude plan

### What It Does

Controls Chrome browser directly from your terminal:
- Navigate pages, click, type, fill forms
- Read console logs and network requests
- Record GIFs of browser interactions
- Access authenticated web apps (Google Docs, Gmail, etc.)
- Chain browser actions with terminal commands

### Setup Instructions

#### Step 1: Install Prerequisites

```bash
# Update Claude Code (if using native installer, it auto-updates)
claude update

# Verify version
claude --version  # Should be 2.0.73 or higher
```

#### Step 2: Install Chrome Extension

1. Open Google Chrome
2. Go to [Chrome Web Store - Claude Extension](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn)
3. Click "Add to Chrome"
4. Verify version is 1.0.36 or higher

#### Step 3: Launch Claude Code with Chrome

```bash
# Start Claude Code with Chrome enabled
claude --chrome
```

#### Step 4: Verify Connection

Inside Claude Code, run:
```
/chrome
```

This shows connection status and available settings.

### Example Commands

```bash
# After starting `claude --chrome`, try:

# Navigate and search
"Go to docs.anthropic.com, search for 'MCP', and tell me the results"

# Test local web app
"Open localhost:3000, submit the login form with test data, check for errors"

# Extract data
"Go to the product page and extract all prices into a CSV"

# Automate form filling
"Read contacts.csv and fill in the CRM form for each contact"

# Record demo
"Record a GIF showing the checkout flow"
```

### Enable Chrome by Default

Inside Claude Code, run:
```
/chrome
```
Then select "Enabled by default"

**Note:** This increases context usage since browser tools are always loaded.

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not detected | 1. Verify extension v1.0.36+ installed 2. Restart Chrome 3. Run `/chrome` and select "Reconnect" |
| Browser not responding | Check for modal dialogs blocking the page |
| Permission errors | Restart Chrome after first-time setup |

### Sources

- [Claude Code Chrome Docs](https://code.claude.com/docs/en/chrome)
- [Claude for Chrome DataCamp Tutorial](https://www.datacamp.com/tutorial/claude-for-chrome-ai-powered-browser-assistance-automation)

---

## Option 3: Computer Use API + Docker Container

**Status:** Public Beta
**Requirements:** Anthropic API key, Docker installed
**Best For:** Full desktop automation in sandboxed environment

### What It Does

Claude controls a complete virtual desktop:
- See screenshots, move cursor, click, type
- Use any application (Firefox, LibreOffice, file managers)
- Execute bash commands
- Complete complex multi-step workflows

### Supported Models

| Model | Tool Version | Beta Flag |
|-------|--------------|-----------|
| Claude Opus 4.5 | `computer_20251124` | `computer-use-2025-11-24` |
| Claude Sonnet 4.5, 4, Haiku 4.5, Opus 4/4.1 | `computer_20250124` | `computer-use-2025-01-24` |

### Quick Start with Docker

#### Step 1: Get API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create or copy your API key

#### Step 2: Run the Container

```bash
# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Run the computer use demo
docker run \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -v $HOME/.anthropic:/home/computeruse/.anthropic \
  -p 5900:5900 \
  -p 8501:8501 \
  -p 6080:6080 \
  -p 8080:8080 \
  -it ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest
```

#### Step 3: Access the Interface

| URL | Purpose |
|-----|---------|
| `http://localhost:8080` | Combined chat + desktop interface |
| `http://localhost:8501` | Streamlit-only interface |
| `http://localhost:6080/vnc.html` | Desktop view only |
| `vnc://localhost:5900` | Direct VNC connection |

### Custom Resolution

```bash
docker run \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e WIDTH=1920 \
  -e HEIGHT=1080 \
  -v $HOME/.anthropic:/home/computeruse/.anthropic \
  -p 5900:5900 \
  -p 8501:8501 \
  -p 6080:6080 \
  -p 8080:8080 \
  -it ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest
```

### Alternative: AWS Bedrock

```bash
export AWS_PROFILE=your_profile
docker run \
  -e API_PROVIDER=bedrock \
  -e AWS_PROFILE=$AWS_PROFILE \
  -e AWS_REGION=us-west-2 \
  -v $HOME/.aws:/home/computeruse/.aws \
  -v $HOME/.anthropic:/home/computeruse/.anthropic \
  -p 5900:5900 -p 8501:8501 -p 6080:6080 -p 8080:8080 \
  -it ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest
```

### Alternative: Google Vertex AI

```bash
# First authenticate
gcloud auth application-default login

export VERTEX_REGION=us-central1
export VERTEX_PROJECT_ID=your_project_id

# Build custom image for Vertex
docker build . -t computer-use-demo

docker run \
  -e API_PROVIDER=vertex \
  -e CLOUD_ML_REGION=$VERTEX_REGION \
  -e ANTHROPIC_VERTEX_PROJECT_ID=$VERTEX_PROJECT_ID \
  -v $HOME/.config/gcloud/application_default_credentials.json:/home/computeruse/.config/gcloud/application_default_credentials.json \
  -p 5900:5900 -p 8501:8501 -p 6080:6080 -p 8080:8080 \
  -it computer-use-demo
```

### Available Actions

**Basic Actions (all versions):**
- `screenshot` - Capture current display
- `left_click` - Click at coordinates
- `type` - Type text
- `key` - Press key/combo (e.g., "ctrl+s")
- `mouse_move` - Move cursor

**Enhanced Actions (computer_20250124+):**
- `scroll` - Scroll with direction/amount control
- `left_click_drag` - Click and drag
- `right_click`, `middle_click`, `double_click`, `triple_click`
- `hold_key` - Hold key for duration
- `wait` - Pause between actions

**Opus 4.5 Only (computer_20251124):**
- `zoom` - View specific screen region at full resolution

### API Code Example

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[
        {
          "type": "computer_20250124",
          "name": "computer",
          "display_width_px": 1024,
          "display_height_px": 768,
          "display_number": 1,
        },
        {
          "type": "text_editor_20250728",
          "name": "str_replace_based_edit_tool"
        },
        {
          "type": "bash_20250124",
          "name": "bash"
        }
    ],
    messages=[{"role": "user", "content": "Save a picture of a cat to my desktop."}],
    betas=["computer-use-2025-01-24"]
)
print(response)
```

### Sources

- [Anthropic Computer Use Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/computer-use)
- [GitHub Quickstart Demo](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo)
- [Anthropic Announcement](https://www.anthropic.com/news/3-5-models-and-computer-use)

---

## Option 4: MCP Filesystem Server

**Status:** Stable
**Platform:** macOS, Windows
**Requirements:** Claude Desktop app, Node.js

### What It Does

Gives Claude Desktop direct access to read/write files in specified folders:
- Create and edit documents
- Organize folders
- Search through files
- Move and rename files

### Setup Instructions

#### Step 1: Install Node.js

```bash
# Check if installed
node --version

# If not, download from nodejs.org
```

#### Step 2: Configure Claude Desktop

1. Open Claude Desktop
2. Click **Claude menu > Settings** (not in-app settings)
3. Go to **Developer** tab
4. Click **Edit Config**

#### Step 3: Add Configuration

**macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/YOUR_USERNAME/Desktop",
        "/Users/YOUR_USERNAME/Downloads",
        "/Users/YOUR_USERNAME/Documents"
      ]
    }
  }
}
```

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\YOUR_USERNAME\\Desktop",
        "C:\\Users\\YOUR_USERNAME\\Downloads",
        "C:\\Users\\YOUR_USERNAME\\Documents"
      ]
    }
  }
}
```

**Replace `YOUR_USERNAME` with your actual username.**

#### Step 4: Restart Claude Desktop

Completely quit and reopen Claude Desktop.

#### Step 5: Verify

Look for the MCP server indicator in the bottom-right of the chat input. Click it to see available tools.

### Alternative: Desktop Extensions

Claude Desktop now supports one-click extensions:
1. Go to **Settings > Extensions**
2. Click "Browse extensions"
3. Find and install filesystem extension
4. Configure through the interface

### Sources

- [MCP Local Server Setup](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
- [Claude MCP Help Article](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

---

## Security Considerations

### General Principles

1. **Use Sandboxed Environments**
   - Docker containers for Computer Use API
   - Virtual machines for sensitive operations
   - Designated folders only for file access

2. **Limit Permissions**
   - Only grant access to directories you're comfortable with
   - Don't expose sensitive data (passwords, API keys, financial info)
   - Use read-only access when possible

3. **Prompt Injection Risks**
   - Claude may follow instructions found in web content
   - Malicious websites could try to redirect Claude's actions
   - Anthropic has defenses but they're not 100% effective

4. **Human Oversight**
   - Review actions before approval (especially financial transactions)
   - Claude asks for confirmation on significant actions
   - Monitor what Claude is doing in real-time

### Platform-Specific Security

| Platform | Security Measure |
|----------|-----------------|
| **Cowork** | Folder sandboxing, symlink blocking, path traversal protection |
| **Chrome Extension** | Site-level permissions, pause on login/CAPTCHA |
| **Computer Use API** | Runs in Docker container, isolated from host system |
| **MCP Filesystem** | Explicit directory allowlist, user permission level |

### What NOT to Do

- Don't give Claude access to your entire home directory
- Don't store passwords or API keys in accessible folders
- Don't let Claude perform financial transactions without oversight
- Don't use Computer Use for account creation on social platforms
- Don't run Computer Use outside of a container on your main system

---

## Recommended Setup for Your Needs

Based on your requirements (file organization + online portal manipulation):

### For File Organization

**Primary: Claude Cowork** (if on macOS with Pro/Max subscription)
- Easiest setup
- Built for file management
- Autonomous operation

**Alternative: MCP Filesystem Server**
- Works with any Claude Desktop
- More manual control
- Works on Windows too

### For Online Portal Manipulation

**Primary: Claude Code + Chrome Integration**
- Works with your existing Claude Code setup
- Controls your actual browser (with login states)
- Most practical for web automation

**Alternative: Computer Use API + Docker**
- More isolated/secure
- Requires API costs
- Best for sensitive operations

### Recommended Combined Setup

1. **Install Claude Desktop** for macOS
2. **Enable Cowork** for file management tasks
3. **Use Claude Code with `--chrome`** for browser automation
4. **Configure MCP Filesystem** as backup for file access

---

## Quick Start Commands

### Start Claude Code with Browser Control

```bash
claude --chrome
```

### Run Computer Use Docker Container

```bash
export ANTHROPIC_API_KEY=your_key
docker run \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -v $HOME/.anthropic:/home/computeruse/.anthropic \
  -p 5900:5900 -p 8501:8501 -p 6080:6080 -p 8080:8080 \
  -it ghcr.io/anthropics/anthropic-quickstarts:computer-use-demo-latest
```

### Test MCP Filesystem Server

```bash
npx -y @modelcontextprotocol/server-filesystem /Users/YOUR_USERNAME/Desktop /Users/YOUR_USERNAME/Downloads
```

---

## Additional Resources

- [Anthropic Computer Use Docs](https://platform.claude.com/docs/en/docs/build-with-claude/computer-use)
- [Claude Code Chrome Integration](https://code.claude.com/docs/en/chrome)
- [Claude Cowork Blog Post](https://claude.com/blog/cowork-research-preview)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Computer Use GitHub Demo](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo)
- [Claude Desktop Download](https://claude.ai/download)

---

## Summary

| Your Need | Best Solution | Setup Time |
|-----------|---------------|------------|
| Organize files on computer | Claude Cowork or MCP Filesystem | 5-10 minutes |
| Control browser / fill forms | Claude Code + Chrome | 5 minutes |
| Manipulate authenticated web apps | Claude Code + Chrome | 5 minutes |
| Full desktop automation (secure) | Computer Use API + Docker | 15-30 minutes |
| Everything combined | Cowork + Chrome Integration | 15 minutes |

**Easiest path forward:** If you're on macOS with a Claude Pro subscription, enable Cowork for files and use `claude --chrome` for browser tasks. This gives you the most capability with the least setup.
