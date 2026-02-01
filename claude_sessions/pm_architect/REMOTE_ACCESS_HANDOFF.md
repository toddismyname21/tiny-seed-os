# Remote Claude Code Access - Research Findings & Build Instructions

**From:** TinyPM Architect
**To:** Chief of Staff PM
**Date:** 2026-01-30
**Priority:** HIGH - User wants remote access to Chief of Staff too

---

## Executive Summary

User request: *"SHARE THE FINDINGS WITH CHIEF OF STAFF PM, I WANT TO BE ABLE TO ACCESS THEM REMOTELY TOO. IF THEY NEED TO BUILD A DASHBOARD IN THE TINY SEED OS TO MAKE THAT HAPPEN DIRECT THEM TO DO SO IN THE BUILD INSTRUCTIONS"*

This document contains:
1. Research findings on remote Claude Code access (3 research agents completed)
2. **BUILD INSTRUCTIONS** for a Remote Access Dashboard in Tiny Seed OS

---

## Part 1: Research Findings

### Research Agent 1: Claude Code Native Remote Options

**Official Capabilities:**
- `claude.ai/code` - Web interface for Claude Code (limited compared to CLI)
- `claude --remote "task"` - Execute tasks asynchronously from anywhere
- `claude --teleport` - Move active sessions between machines
- `claude --resume <session-id>` - Resume previous sessions

**Community Best Practice:**
The de facto standard for remote Claude Code access is:
```
SSH + tmux + Tailscale
```

This gives full terminal access with:
- Persistent sessions (tmux)
- Secure private network (Tailscale)
- Full Claude Code CLI features

### Research Agent 2: WebSocket Terminal Bridges

**Recommended Stack:**
```
Browser (xterm.js) <-> WebSocket <-> node-pty (or Python pty) <-> Claude Code CLI
```

**Production Examples:**
- Replit: Full IDE with terminal in browser
- GitHub Codespaces: VS Code + terminal over WebSocket
- Gitpod: Cloud development with real terminals

**Security Requirements:**
- TLS/SSL encryption (MANDATORY)
- JWT token authentication
- Rate limiting
- IP whitelisting option
- Session isolation

**Open Source References:**
- `claude-code-web` - WebSocket terminal for Claude
- `claude-code-server` - Server wrapper with auth

### Research Agent 3: Cloud Remote Access Solutions

**Recommended: Cloudflare Tunnel (FREE)**
- Unlimited bandwidth (unlike ngrok)
- Built-in TLS
- Custom domains
- No port forwarding needed

```bash
# Install
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Quick tunnel (instant, temporary URL)
cloudflared tunnel --url http://localhost:8765

# Named tunnel (persistent, custom domain)
cloudflared tunnel create my-claude-tunnel
cloudflared tunnel route dns my-claude-tunnel claude.mydomain.com
cloudflared tunnel run my-claude-tunnel
```

**Alternative: Tailscale (for team access)**
- Zero-config VPN
- Automatic HTTPS
- Perfect for internal team access

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Expose to Tailscale network
tailscale serve --bg https+insecure://localhost:8765
```

---

## Part 2: BUILD INSTRUCTIONS - Remote Access Dashboard

### What to Build

Create a Remote Access Dashboard page in Tiny Seed OS that:
1. Shows all active Claude sessions (TinyPM, Chief of Staff, etc.)
2. Allows connecting to any session from the browser
3. Uses xterm.js for terminal rendering
4. Authenticates via the existing Tiny Seed auth

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    TINY SEED OS WEB APP                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Remote Access Dashboard                      │  │
│  │  ┌───────────────┬───────────────┬───────────────┐       │  │
│  │  │ TinyPM        │ Chief of Staff│ Other Session │       │  │
│  │  │ ● Connected   │ ○ Available   │ ○ Available   │       │  │
│  │  │ [Open]        │ [Connect]     │ [Connect]     │       │  │
│  │  └───────────────┴───────────────┴───────────────┘       │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                   xterm.js Terminal                  │ │  │
│  │  │  $ claude                                            │ │  │
│  │  │  > Hello! How can I help you today?                  │ │  │
│  │  │  _                                                   │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (wss://)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Remote Terminal Bridge                        │
│                    (Running on host machine)                     │
│                                                                 │
│  Session: TinyPM         Session: Chief of Staff                │
│  ├── Claude Code CLI     ├── Claude Code CLI                    │
│  └── /tinypm context     └── /chief-of-staff context           │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create

#### 1. `web_app/remote-dashboard.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remote Access - Tiny Seed OS</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            min-height: 100vh;
        }
        .header {
            padding: 20px;
            background: rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 { font-size: 24px; }
        .sessions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .session-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .session-card:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-2px);
        }
        .session-card.active {
            border-color: #4ade80;
            background: rgba(74, 222, 128, 0.1);
        }
        .session-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .session-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: rgba(255,255,255,0.7);
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #f87171;
        }
        .status-dot.connected { background: #4ade80; }
        .status-dot.available { background: #fbbf24; }
        .terminal-container {
            margin: 20px;
            padding: 20px;
            background: #000;
            border-radius: 12px;
            display: none;
        }
        .terminal-container.visible { display: block; }
        #terminal { height: 500px; }
        .connection-form {
            max-width: 500px;
            margin: 40px auto;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
        }
        .form-group { margin-bottom: 16px; }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            color: white;
            font-size: 16px;
        }
        .btn {
            background: #4ade80;
            color: #000;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
        }
        .btn:hover { background: #22c55e; }
        .disconnect-btn {
            background: #f87171;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Remote Access Dashboard</h1>
        <div id="connection-status">Not Connected</div>
    </div>

    <div id="setup-form" class="connection-form">
        <h2>Connect to Remote Terminal</h2>
        <div class="form-group">
            <label>Bridge URL</label>
            <input type="text" id="bridge-url" placeholder="ws://localhost:8765" value="ws://localhost:8765">
        </div>
        <div class="form-group">
            <label>Access Token</label>
            <input type="password" id="access-token" placeholder="Enter your access token">
        </div>
        <button class="btn" onclick="connectToBridge()">Connect</button>
    </div>

    <div id="sessions-area" style="display:none;">
        <div class="sessions-grid" id="sessions-grid">
            <!-- Sessions populated by JS -->
        </div>

        <div class="terminal-container" id="terminal-container">
            <div id="terminal"></div>
            <button class="btn disconnect-btn" onclick="disconnect()">Disconnect</button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.9.0/lib/xterm-addon-web-links.min.js"></script>
    <script>
        let ws = null;
        let term = null;
        let fitAddon = null;
        let currentSessionId = null;

        function connectToBridge() {
            const url = document.getElementById('bridge-url').value;
            const token = document.getElementById('access-token').value;

            if (!token) {
                alert('Please enter an access token');
                return;
            }

            ws = new WebSocket(url);

            ws.onopen = () => {
                // Send auth message
                ws.send(JSON.stringify({
                    type: 'auth',
                    content: token,
                    timestamp: new Date().toISOString()
                }));
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                handleMessage(msg);
            };

            ws.onclose = () => {
                document.getElementById('connection-status').textContent = 'Disconnected';
                document.getElementById('setup-form').style.display = 'block';
                document.getElementById('sessions-area').style.display = 'none';
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                alert('Connection failed. Check URL and token.');
            };
        }

        function handleMessage(msg) {
            switch (msg.type) {
                case 'status':
                    if (msg.content === 'Connected to Remote Terminal Bridge') {
                        currentSessionId = msg.session_id;
                        document.getElementById('connection-status').textContent = 'Connected';
                        document.getElementById('setup-form').style.display = 'none';
                        document.getElementById('sessions-area').style.display = 'block';
                        initTerminal();
                    }
                    break;

                case 'output':
                    if (term) {
                        term.write(msg.content);
                    }
                    break;

                case 'error':
                    console.error('Server error:', msg.content);
                    if (term) {
                        term.write('\r\n\x1b[31m[ERROR] ' + msg.content + '\x1b[0m\r\n');
                    } else {
                        alert('Error: ' + msg.content);
                    }
                    break;

                case 'heartbeat':
                    ws.send(JSON.stringify({ type: 'heartbeat', content: 'pong' }));
                    break;
            }
        }

        function initTerminal() {
            if (term) return;

            term = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: '#000000',
                    foreground: '#ffffff',
                    cursor: '#ffffff'
                }
            });

            fitAddon = new FitAddon.FitAddon();
            term.loadAddon(fitAddon);
            term.loadAddon(new WebLinksAddon.WebLinksAddon());

            const container = document.getElementById('terminal');
            term.open(container);
            fitAddon.fit();

            document.getElementById('terminal-container').classList.add('visible');

            // Handle terminal input
            term.onData((data) => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'message',
                        content: data,
                        session_id: currentSessionId
                    }));
                }
            });

            // Handle resize
            window.addEventListener('resize', () => {
                if (fitAddon) fitAddon.fit();
            });

            term.focus();
        }

        function disconnect() {
            if (ws) {
                ws.close();
            }
            if (term) {
                term.dispose();
                term = null;
            }
            document.getElementById('terminal-container').classList.remove('visible');
        }

        // Save token to localStorage
        document.getElementById('access-token').addEventListener('change', (e) => {
            localStorage.setItem('remote_bridge_token', e.target.value);
        });

        // Load saved token
        const savedToken = localStorage.getItem('remote_bridge_token');
        if (savedToken) {
            document.getElementById('access-token').value = savedToken;
        }
    </script>
</body>
</html>
```

#### 2. Add Navigation Link

Add to your main navigation in the Chief of Staff or Tiny Seed OS:

```html
<a href="remote-dashboard.html" class="nav-item">
    <span class="nav-icon">🖥️</span>
    <span class="nav-text">Remote Access</span>
</a>
```

### Setup Instructions

#### Step 1: Start the Remote Terminal Bridge on the Host Machine

```bash
cd /path/to/tinypm
./start-remote-bridge.sh
```

This will:
- Install websockets if needed
- Generate an access token (SAVE THIS!)
- Start the WebSocket server on port 8765

#### Step 2: Expose via Cloudflare Tunnel (for internet access)

```bash
# Install cloudflared (macOS)
brew install cloudflare/cloudflare/cloudflared

# Quick tunnel (temporary URL)
cloudflared tunnel --url ws://localhost:8765

# You'll get a URL like: https://random-words.trycloudflare.com
```

#### Step 3: Update the Dashboard URL

In the dashboard, use the Cloudflare URL:
```
wss://random-words.trycloudflare.com
```

### Security Checklist

- [ ] Always use TLS (wss:// not ws://) in production
- [ ] Generate strong access tokens
- [ ] Set token expiry appropriately
- [ ] Enable IP whitelisting if possible
- [ ] Use Cloudflare Tunnel for public access
- [ ] Never commit tokens to git

### Multi-Session Support

To support multiple Claude sessions (TinyPM, Chief of Staff, etc.), modify the bridge to accept a `working_dir` parameter:

```python
# In remote_terminal_bridge.py, update create_session:
def create_session(self, working_dir: Optional[Path] = None, name: str = "default") -> str:
    """Create a named session with custom working directory."""
    # Store session name for UI display
    ...
```

Then in the dashboard, display session cards for each available context.

---

## Action Items for Chief of Staff PM

1. **CREATE** `web_app/remote-dashboard.html` using the code above
2. **ADD** navigation link to the dashboard from Chief of Staff
3. **TEST** with local WebSocket connection first
4. **SETUP** Cloudflare Tunnel for remote access
5. **DOCUMENT** the token in a secure location

---

## Questions?

Coordinate via the standard INBOX/OUTBOX system.

*Generated by TinyPM Architect - 2026-01-30*
