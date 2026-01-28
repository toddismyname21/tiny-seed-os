# COMPLETE SETUP GUIDE: Multi-Agent Claude Coordination System

## Tiny Seed Farm OS - Step by Step

**Created:** 2026-01-24
**For:** Owner
**Goal:** Persistent Claude sessions with remote access, automatic notifications, and morning briefings

---

## OVERVIEW

By the end of this guide, you will have:
- 13 Claude sessions running persistently in tmux
- Remote access from phone via SSH + Happy Coder
- Work completion notifications to Happy Coder
- Automatic morning briefings
- PM coordination (Phone PM + Desktop PM)

**Estimated Setup Time:** 45-60 minutes

---

## PHASE 1: INSTALL DEPENDENCIES (10 minutes)

### Step 1.1: Open Terminal

Press `Cmd + Space`, type "Terminal", press Enter.

### Step 1.2: Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

If already installed, you'll see "Homebrew is already installed."

### Step 1.3: Install tmux

```bash
brew install tmux
```

**Verify installation:**
```bash
tmux -V
```
Should show: `tmux 3.x`

### Step 1.4: Install Redis

```bash
brew install redis
```

**Start Redis (runs in background):**
```bash
brew services start redis
```

**Verify Redis is running:**
```bash
redis-cli ping
```
Should respond: `PONG`

### Step 1.5: Install Claude-Flow

```bash
npm install -g claude-flow@v3alpha
```

**Verify installation:**
```bash
npx claude-flow@v3alpha --version
```

---

## PHASE 2: ENABLE REMOTE ACCESS (10 minutes)

### Step 2.1: Enable SSH on Mac

1. Open **System Settings** (click Apple menu → System Settings)
2. Click **General** in sidebar
3. Click **Sharing**
4. Turn ON **Remote Login**
5. Note the command shown (e.g., `ssh samanthapollack@Samanthas-MacBook.local`)

### Step 2.2: Get Your Mac's Local IP

```bash
ipconfig getifaddr en0
```

Write this down: `___.___.___.___ `

### Step 2.3: Install Tailscale (for access anywhere)

```bash
brew install tailscale
```

**Start Tailscale:**
```bash
sudo tailscale up
```

This opens a browser to log in. Create account or sign in with Google.

**Get your Tailscale IP:**
```bash
tailscale ip -4
```

Write this down: `100.___.___.___`

### Step 2.4: Install Tailscale on Phone

1. Go to App Store (iOS) or Play Store (Android)
2. Search "Tailscale"
3. Install and sign in with SAME account as Mac

Now your phone can reach your Mac from anywhere via the Tailscale IP.

### Step 2.5: Install SSH App on Phone

**Recommended: Termius**
1. Install Termius from App Store/Play Store
2. Open Termius
3. Tap + to add new host
4. Enter:
   - Alias: `Mac`
   - Hostname: `100.x.x.x` (your Tailscale IP)
   - Username: `samanthapollack`
   - Password: (your Mac password)
5. Save and connect to test

---

## PHASE 3: CREATE PERSISTENT CLAUDE SESSIONS (15 minutes)

### Step 3.1: Create the Startup Script

```bash
cat > /Users/samanthapollack/Documents/TIny_Seed_OS/start-all-claudes.sh << 'EOF'
#!/bin/bash
# Tiny Seed Farm - Start All Claude Sessions in tmux

PROJECT_DIR="/Users/samanthapollack/Documents/TIny_Seed_OS"

# Define all 13 Claude sessions
declare -A SESSIONS=(
  ["pm"]="PM Architect - Orchestrator"
  ["backend"]="Backend Claude"
  ["ux-design"]="UX Design Claude"
  ["field-ops"]="Field Operations Claude"
  ["financial"]="Financial Claude"
  ["sales-crm"]="Sales CRM Claude"
  ["inventory"]="Inventory Traceability Claude"
  ["grants"]="Grants Funding Claude"
  ["security"]="Security Claude"
  ["social-media"]="Social Media Claude"
  ["mobile"]="Mobile Employee Claude"
  ["accounting"]="Accounting Compliance Claude"
  ["business"]="Business Foundation Claude"
  ["don-kb"]="Don Knowledge Base Claude"
)

echo "========================================"
echo "  TINY SEED FARM - CLAUDE ARMY STARTUP"
echo "========================================"
echo ""

# Create each session
for session in "${!SESSIONS[@]}"; do
  if tmux has-session -t "$session" 2>/dev/null; then
    echo "✓ $session already running"
  else
    echo "Starting $session (${SESSIONS[$session]})..."
    tmux new-session -d -s "$session" -c "$PROJECT_DIR"
    # Don't auto-start claude - let owner send instructions
    echo "  Created: $session"
  fi
done

echo ""
echo "========================================"
echo "  ALL SESSIONS CREATED"
echo "========================================"
echo ""
echo "To connect to a session:"
echo "  tmux attach -t <session-name>"
echo ""
echo "To detach (keep running):"
echo "  Press Ctrl+B, then D"
echo ""
echo "To list all sessions:"
echo "  tmux list-sessions"
echo ""
echo "Available sessions:"
tmux list-sessions
EOF
```

### Step 3.2: Make Script Executable

```bash
chmod +x /Users/samanthapollack/Documents/TIny_Seed_OS/start-all-claudes.sh
```

### Step 3.3: Run the Script

```bash
/Users/samanthapollack/Documents/TIny_Seed_OS/start-all-claudes.sh
```

You should see all 14 sessions created.

### Step 3.4: Verify Sessions

```bash
tmux list-sessions
```

Should show:
```
pm: 1 windows (created ...)
backend: 1 windows (created ...)
ux-design: 1 windows (created ...)
... etc
```

### Step 3.5: Connect to PM Session and Start Claude

```bash
tmux attach -t pm
```

Now inside the tmux session, start Claude:
```bash
claude
```

Then tell Claude:
```
Check your INBOX: /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/INBOX.md
```

### Step 3.6: Detach from Session

Press `Ctrl+B`, then `D`

The session keeps running in background.

### Step 3.7: Repeat for Each Claude

Connect to each session and start Claude with their INBOX:

```bash
# Backend
tmux attach -t backend
# Then: claude
# Then: Check your INBOX: /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/backend/INBOX.md
# Detach: Ctrl+B, D

# UX Design
tmux attach -t ux-design
# Then: claude
# Then: Check your INBOX: /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/ux_design/INBOX.md
# Detach: Ctrl+B, D

# ... repeat for all
```

**Quick reference for all INBOXes:**

| Session | INBOX Path |
|---------|------------|
| pm | `claude_sessions/pm_architect/INBOX.md` |
| backend | `claude_sessions/backend/INBOX.md` |
| ux-design | `claude_sessions/ux_design/INBOX.md` |
| field-ops | `claude_sessions/field_operations/INBOX.md` |
| financial | `claude_sessions/financial/INBOX.md` |
| sales-crm | `claude_sessions/sales_crm/INBOX.md` |
| inventory | `claude_sessions/inventory_traceability/INBOX.md` |
| grants | `claude_sessions/grants_funding/INBOX.md` |
| security | `claude_sessions/security/INBOX.md` |
| social-media | `claude_sessions/social_media/INBOX.md` |
| mobile | `claude_sessions/mobile_employee/INBOX.md` |
| accounting | `claude_sessions/accounting_compliance/INBOX.md` |
| business | `claude_sessions/business_foundation/INBOX.md` |
| don-kb | `claude_sessions/don_knowledge_base/INBOX.md` |

---

## PHASE 4: SET UP HAPPY CODER NOTIFICATIONS (10 minutes)

### Step 4.1: Verify Happy Coder is Running

```bash
happy status
```

If not running:
```bash
happy daemon start
```

### Step 4.2: Create Notification Script

```bash
cat > /Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh << 'EOF'
#!/bin/bash
# Send notification to owner via Happy Coder

MESSAGE="$1"
PRIORITY="${2:-normal}"  # normal, urgent, critical

# Log the notification
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PRIORITY] $MESSAGE" >> /Users/samanthapollack/Documents/TIny_Seed_OS/notifications.log

# Send via Happy Coder (uses the connected session)
# Happy Coder will push to your phone
echo "$MESSAGE" | happy send --priority "$PRIORITY"

# Also append to PM OUTBOX for record
echo "" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "## [$(date '+%Y-%m-%d %H:%M:%S')] - NOTIFICATION SENT" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "**Priority:** $PRIORITY" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "**Message:** $MESSAGE" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
EOF
```

### Step 4.3: Make Executable

```bash
chmod +x /Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh
```

### Step 4.4: Test Notification

```bash
/Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh "Test notification from Tiny Seed Farm" "normal"
```

Check your Happy Coder app - you should receive it.

---

## PHASE 5: SET UP MORNING BRIEFING (10 minutes)

### Step 5.1: Create Morning Briefing Script

```bash
cat > /Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh << 'EOF'
#!/bin/bash
# Tiny Seed Farm - Morning Briefing Generator

PROJECT_DIR="/Users/samanthapollack/Documents/TIny_Seed_OS"
BRIEFING_FILE="$PROJECT_DIR/claude_sessions/pm_architect/MORNING_BRIEFING.md"
OUTBOX_DIR="$PROJECT_DIR/claude_sessions"

echo "# MORNING BRIEFING - $(date '+%Y-%m-%d')" > "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"
echo "**Generated:** $(date '+%H:%M:%S')" >> "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"

# Check each Claude's OUTBOX for updates since yesterday
echo "## OVERNIGHT PROGRESS" >> "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"

PROGRESS_FOUND=false

for outbox in "$OUTBOX_DIR"/*/OUTBOX.md; do
  if [ -f "$outbox" ]; then
    CLAUDE_NAME=$(basename $(dirname "$outbox"))

    # Check if file was modified in last 24 hours
    if [ $(find "$outbox" -mtime -1 2>/dev/null | wc -l) -gt 0 ]; then
      PROGRESS_FOUND=true
      echo "### $CLAUDE_NAME" >> "$BRIEFING_FILE"
      # Get last 20 lines of their outbox
      echo '```' >> "$BRIEFING_FILE"
      tail -20 "$outbox" >> "$BRIEFING_FILE"
      echo '```' >> "$BRIEFING_FILE"
      echo "" >> "$BRIEFING_FILE"
    fi
  fi
done

if [ "$PROGRESS_FOUND" = false ]; then
  echo "*No progress logged in the last 24 hours.*" >> "$BRIEFING_FILE"
  echo "" >> "$BRIEFING_FILE"
fi

# Check for pending tasks in INBOXes
echo "## PENDING TASKS" >> "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"

for inbox in "$OUTBOX_DIR"/*/INBOX.md; do
  if [ -f "$inbox" ]; then
    CLAUDE_NAME=$(basename $(dirname "$inbox"))
    # Count lines with "- [ ]" (unchecked tasks)
    PENDING=$(grep -c "\- \[ \]" "$inbox" 2>/dev/null || echo "0")
    if [ "$PENDING" -gt 0 ]; then
      echo "- **$CLAUDE_NAME**: $PENDING pending tasks" >> "$BRIEFING_FILE"
    fi
  fi
done

echo "" >> "$BRIEFING_FILE"
echo "---" >> "$BRIEFING_FILE"
echo "*End of Morning Briefing*" >> "$BRIEFING_FILE"

# Send notification if progress was made
if [ "$PROGRESS_FOUND" = true ]; then
  /Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh "Morning Briefing Ready - Progress was made overnight! Check MORNING_BRIEFING.md" "normal"
fi

echo "Morning briefing generated: $BRIEFING_FILE"
EOF
```

### Step 5.2: Make Executable

```bash
chmod +x /Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh
```

### Step 5.3: Schedule Morning Briefing with cron

```bash
# Open crontab editor
crontab -e
```

Add this line (runs at 6 AM every day):
```
0 6 * * * /Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh
```

Save and exit (in vim: press `Esc`, type `:wq`, press `Enter`)

**Alternative: Use launchd (more reliable on Mac)**

```bash
cat > ~/Library/LaunchAgents/com.tinyseedfarm.morningbriefing.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.tinyseedfarm.morningbriefing</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/morningbriefing.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/morningbriefing.err</string>
</dict>
</plist>
EOF
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.tinyseedfarm.morningbriefing.plist
```

### Step 5.4: Test Morning Briefing

```bash
/Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh
```

Check the file:
```bash
cat /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/MORNING_BRIEFING.md
```

---

## PHASE 6: CREATE WORK COMPLETION NOTIFIER (5 minutes)

### Step 6.1: Create Completion Watcher Script

```bash
cat > /Users/samanthapollack/Documents/TIny_Seed_OS/watch-completions.sh << 'EOF'
#!/bin/bash
# Watch for work completions and notify owner

PROJECT_DIR="/Users/samanthapollack/Documents/TIny_Seed_OS"
OUTBOX_DIR="$PROJECT_DIR/claude_sessions"
LAST_CHECK_FILE="/tmp/tinyseed-last-check"

# Create last check file if doesn't exist
touch "$LAST_CHECK_FILE"

while true; do
  for outbox in "$OUTBOX_DIR"/*/OUTBOX.md; do
    if [ -f "$outbox" ]; then
      CLAUDE_NAME=$(basename $(dirname "$outbox"))

      # Check if file was modified since last check
      if [ "$outbox" -nt "$LAST_CHECK_FILE" ]; then
        # Look for completion markers
        if tail -5 "$outbox" | grep -qi "complete\|done\|finished\|deployed"; then
          MESSAGE="[$CLAUDE_NAME] Work completed! Check their OUTBOX for details."
          /Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh "$MESSAGE" "normal"
        fi
      fi
    fi
  done

  # Update last check time
  touch "$LAST_CHECK_FILE"

  # Wait 5 minutes before checking again
  sleep 300
done
EOF
```

### Step 6.2: Make Executable

```bash
chmod +x /Users/samanthapollack/Documents/TIny_Seed_OS/watch-completions.sh
```

### Step 6.3: Run Watcher in Background

```bash
# Create a tmux session for the watcher
tmux new-session -d -s watcher "/Users/samanthapollack/Documents/TIny_Seed_OS/watch-completions.sh"
```

Now completions will be detected and sent to Happy Coder.

---

## PHASE 7: VERIFY EVERYTHING WORKS (5 minutes)

### Step 7.1: Check All tmux Sessions

```bash
tmux list-sessions
```

Should show 14+ sessions (13 Claudes + pm + watcher)

### Step 7.2: Test Remote Access

From your phone:
1. Open Termius (or SSH app)
2. Connect to your Mac via Tailscale IP
3. Run: `tmux list-sessions`
4. Attach to a session: `tmux attach -t pm`

### Step 7.3: Test Notification Flow

```bash
/Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh "System fully operational!" "normal"
```

Check Happy Coder app.

### Step 7.4: Test Morning Briefing

```bash
/Users/samanthapollack/Documents/TIny_Seed_OS/morning-briefing.sh
```

---

## PHASE 8: DAILY OPERATIONS

### Starting Fresh (After Reboot)

```bash
# Start Redis
brew services start redis

# Start Happy Coder daemon
happy daemon start

# Start all Claude sessions
/Users/samanthapollack/Documents/TIny_Seed_OS/start-all-claudes.sh

# Start the completion watcher
tmux new-session -d -s watcher "/Users/samanthapollack/Documents/TIny_Seed_OS/watch-completions.sh"
```

### Connecting to a Claude

```bash
tmux attach -t backend
```

### Detaching (Keep Running)

Press `Ctrl+B`, then `D`

### Checking Status

```bash
# List all sessions
tmux list-sessions

# Check a Claude's output without attaching
tmux capture-pane -t backend -p | tail -20
```

### From Phone

1. Open Termius
2. Connect to Mac
3. `tmux attach -t pm`
4. Give instructions to PM
5. Detach: `Ctrl+B, D`
6. Disconnect SSH

---

## QUICK REFERENCE CARD

### Key Commands

| Action | Command |
|--------|---------|
| List sessions | `tmux list-sessions` |
| Attach to session | `tmux attach -t <name>` |
| Detach | `Ctrl+B`, then `D` |
| Kill session | `tmux kill-session -t <name>` |
| Start all Claudes | `./start-all-claudes.sh` |
| Send notification | `./notify-owner.sh "message"` |
| Generate briefing | `./morning-briefing.sh` |

### Session Names

```
pm, backend, ux-design, field-ops, financial,
sales-crm, inventory, grants, security,
social-media, mobile, accounting, business, don-kb
```

### Files

| File | Purpose |
|------|---------|
| `start-all-claudes.sh` | Start all tmux sessions |
| `notify-owner.sh` | Send Happy Coder notification |
| `morning-briefing.sh` | Generate morning briefing |
| `watch-completions.sh` | Auto-notify on work completion |
| `MORNING_BRIEFING.md` | Daily briefing output |
| `notifications.log` | Notification history |

---

## TROUBLESHOOTING

### tmux session won't start
```bash
# Kill all sessions and restart
tmux kill-server
./start-all-claudes.sh
```

### Can't SSH from phone
1. Check Tailscale is running on both devices
2. Verify Remote Login is enabled on Mac
3. Check firewall settings

### Happy Coder not receiving notifications
```bash
# Check daemon is running
happy status

# Restart if needed
happy daemon restart
```

### Morning briefing not generating
```bash
# Check launchd status
launchctl list | grep tinyseed

# Check logs
cat /tmp/morningbriefing.log
cat /tmp/morningbriefing.err
```

---

## YOU'RE DONE!

You now have:
- ✅ 13 Claude sessions running persistently
- ✅ Remote access from phone via SSH + Tailscale
- ✅ Work completion notifications to Happy Coder
- ✅ Automatic 6 AM morning briefings
- ✅ PM coordination system

**To give instructions:**
1. SSH from phone (or use Happy Coder)
2. Attach to PM session: `tmux attach -t pm`
3. Tell PM what you want done
4. PM delegates to other Claudes
5. You get notified when work completes

**The system is now autonomous.**

---

*Setup Guide Complete - Tiny Seed Farm Multi-Agent System*
