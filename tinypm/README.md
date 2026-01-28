# TinyPM - Terminal Project Manager

A beautiful TUI dashboard for managing tasks and launching Claude agents with persona injection.

## Quick Start

### Terminal Mode
```bash
cd ~/Documents/TIny_Seed_OS/tinypm
./start-terminal.sh
# or
python3 app.py
```

### Web Mode (Access from Phone)
```bash
cd ~/Documents/TIny_Seed_OS/tinypm
./start-web.sh
```
Then open `http://YOUR_MAC_IP:8000` on your phone.

### Add Alias (Optional)
Add to `~/.zshrc` or `~/.bashrc`:
```bash
alias pm="python3 ~/Documents/TIny_Seed_OS/tinypm/app.py"
alias pm-web="~/Documents/TIny_Seed_OS/tinypm/start-web.sh"
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New task |
| `e` | Edit selected task |
| `Enter` | Launch Claude agent |
| `d` | Toggle status (pending → in progress → done) |
| `x` | Delete task |
| `/` | Filter tasks |
| `1` | Show pending only |
| `2` | Show in progress only |
| `3` | Show done only |
| `0` | Show all |
| `q` | Quit |

## How It Works

### The Magic: Persona Injection

When you select a task and press Enter, TinyPM:

1. Reads the task's assigned role (e.g., "builder")
2. Loads the persona prompt from `personas/builder.md`
3. Constructs a "mega-prompt" with the task context
4. Launches Claude Code with that prompt pre-loaded

This means Claude starts working immediately with full context about:
- Who it is (Builder, Architect, QA, Chief of Staff)
- What the rules are (from the persona file)
- What task to work on (title, description, context files)
- Where the project is located

### Folder Structure

```
tinypm/
├── app.py              # Main application
├── board.json          # Task database
├── personas/           # Role definitions
│   ├── architect.md    # Plans, doesn't code
│   ├── builder.md      # Writes code
│   ├── qa.md           # Tests, audits
│   └── chief-of-staff.md  # Coordinates
├── start-terminal.sh   # Launch in terminal
├── start-web.sh        # Launch as web app
└── README.md           # This file
```

## Personas

### Architect
- Plans implementation, doesn't write code
- Checks for duplicates before proposing new files
- Outputs step-by-step plans for Builders

### Builder
- Writes production-quality code
- Follows CLAUDE.md rules
- Updates CHANGE_LOG.md after changes
- Never hardcodes API URLs

### QA
- Tests and audits, doesn't build features
- Checks for security vulnerabilities
- Verifies API connections
- Finds duplicate functions

### Chief of Staff
- Coordinates across the whole farm
- Knows everything about field plan, customers, finances
- Drafts communications in Todd's voice
- Surfaces issues proactively

## Adding Tasks

Tasks are stored in `board.json`. You can:
- Add via the UI (press `n`)
- Edit the JSON directly

### Task Structure
```json
{
  "id": "TASK-001",
  "title": "Short description",
  "description": "Detailed requirements...",
  "role": "builder",
  "priority": "high",
  "status": "pending",
  "context": [
    "web_app/file.html",
    "apps_script/file.js"
  ],
  "created": "2026-01-28",
  "updated": "2026-01-28"
}
```

## Phone Access

### Option A: Local WiFi
1. Run `./start-web.sh` on your Mac
2. Note the "Phone:" URL it shows
3. Open that URL in your phone's browser
4. Works when on the same WiFi

### Option B: Anywhere (Tailscale)
1. Install Tailscale on Mac and Phone
2. Run `./start-web.sh` on your Mac
3. Use the Tailscale IP from your phone
4. Works from anywhere in the world

## Integration with Tiny Seed OS

TinyPM is designed specifically for Tiny Seed Farm OS. The personas reference:
- `/Users/samanthapollack/Documents/TIny_Seed_OS` as project root
- `CLAUDE.md` for mandatory rules
- `SYSTEM_MANIFEST.md` for system inventory
- `CHANGE_LOG.md` for change tracking

## Troubleshooting

### "Claude CLI not found"
TinyPM saves the prompt to `.last-prompt.md`. You can run manually:
```bash
claude --system-prompt "$(cat .last-prompt.md)"
```

### Web mode won't start
Install textual-serve:
```bash
pip3 install textual-serve
```

### Colors look wrong
Your terminal might need True Color support. Try iTerm2 or the VS Code terminal.
