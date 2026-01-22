# TINY SEED FARM - AUTOMATIC SMS CAPTURE SYSTEM
## Complete Setup Guide - Works First Time, Every Time

---

# WHAT THIS DOES

When you complete this setup, your Mac will:

1. **Capture EVERY text message** - incoming AND outgoing
2. **Send them to AI for analysis** - automatically, in real-time
3. **Extract commitments** - "I'll bring tomatoes Tuesday" becomes a tracked promise
4. **Score priority** - VIP customers with complaints get flagged IMMEDIATELY
5. **Detect churn signals** - AI spots unhappy customers before they leave
6. **Run 24/7** - starts on boot, survives crashes, never stops

**NOTHING SLIPS THROUGH THE CRACKS.**

---

# REQUIREMENTS

- Mac computer (Intel or Apple Silicon)
- macOS 10.15 or later (Catalina, Big Sur, Monterey, Ventura, Sonoma)
- Messages app signed into your iMessage/Apple ID
- Internet connection
- 10 minutes of your time (one-time setup)

---

# SETUP INSTRUCTIONS

## Step 1: Open Terminal

**On your Mac:**

1. Press `Cmd + Space` to open Spotlight
2. Type `Terminal`
3. Press `Enter`

A black window with text will appear. This is Terminal.

---

## Step 2: Install Homebrew (if you don't have it)

Copy and paste this ENTIRE command into Terminal, then press Enter:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

- It will ask for your password (the one you use to log into your Mac)
- When you type your password, nothing will appear on screen - this is normal
- Press Enter after typing your password
- Wait for it to complete (may take a few minutes)

**If you already have Homebrew, this step will tell you and that's fine.**

---

## Step 3: Install Python 3

Copy and paste this command:

```bash
brew install python3
```

Wait for it to complete.

**Verify it worked:**
```bash
python3 --version
```

You should see something like `Python 3.11.6` (or similar version 3.x)

---

## Step 4: Navigate to the SMS System Folder

Copy and paste this command:

```bash
cd ~/Documents/TIny_Seed_OS/sms_system
```

**Verify you're in the right place:**
```bash
ls
```

You should see:
- `imessage_monitor.py`
- `install.sh`
- `com.tinyseedfarm.imessage-monitor.plist`
- `SETUP_GUIDE.md`

---

## Step 5: Run the Installer

Copy and paste this command:

```bash
./install.sh
```

The installer will:
1. Check for Python 3 ✓
2. Install the `requests` library ✓
3. Create log directories ✓
4. Install the Launch Agent ✓
5. Check for Full Disk Access (see next step) ✓

---

## Step 6: Grant Full Disk Access (CRITICAL)

**This is the most important step.** The system needs permission to read your messages.

### On macOS Sonoma (14) or Ventura (13):

1. Click the **Apple menu** (top left corner)
2. Click **System Settings**
3. Click **Privacy & Security** in the sidebar
4. Scroll down and click **Full Disk Access**
5. Click the **lock icon** (bottom left) and enter your password
6. Click the **+** button
7. Press `Cmd + Shift + G` and paste this path:
   ```
   /usr/local/bin/python3
   ```
   (Or `/opt/homebrew/bin/python3` if you have Apple Silicon Mac)
8. Click **Go**, then click **Open**
9. The checkbox next to Python should now be ON

### On macOS Monterey (12) or earlier:

1. Click the **Apple menu**
2. Click **System Preferences**
3. Click **Security & Privacy**
4. Click the **Privacy** tab
5. Click **Full Disk Access** in the list
6. Click the **lock** and enter your password
7. Click **+** and add the Python path as above

### IMPORTANT: After granting permission:

**QUIT TERMINAL COMPLETELY:**
1. Click `Terminal` in the menu bar
2. Click `Quit Terminal`
3. Open Terminal again (Cmd + Space, type Terminal, Enter)

---

## Step 7: Verify the System is Running

Copy and paste this command:

```bash
launchctl list | grep tinyseedfarm
```

You should see a line containing `com.tinyseedfarm.imessage-monitor`

**Check the logs:**
```bash
tail -f ~/Library/Logs/TinySeedFarm/imessage-monitor.log
```

You should see something like:
```
2026-01-22 08:30:00 | INFO     | ═══════════════════════════════════════════════
2026-01-22 08:30:00 | INFO     | TINY SEED FARM - iMESSAGE MONITOR
2026-01-22 08:30:00 | INFO     | ═══════════════════════════════════════════════
2026-01-22 08:30:00 | INFO     | Full Disk Access: GRANTED
2026-01-22 08:30:00 | INFO     | Monitoring for new messages...
```

Press `Ctrl + C` to stop watching the logs.

---

## Step 8: Test It

1. **Send yourself a text message** (or have someone text you)
2. **Watch the logs:**
   ```bash
   tail -f ~/Library/Logs/TinySeedFarm/imessage-monitor.log
   ```
3. You should see the message appear with AI analysis:
   ```
   📥 [+14125551234] Hey, can you bring tomatoes to the market?
      → Priority: 65 | INQUIRY | NEUTRAL
   ```

**IT'S WORKING!**

---

# TROUBLESHOOTING

## "Full Disk Access not granted" error

1. Did you add Python to Full Disk Access? Check System Settings.
2. Did you QUIT and REOPEN Terminal after granting permission?
3. Try finding your exact Python path:
   ```bash
   which python3
   ```
   Add THAT path to Full Disk Access.

## "Database not found" error

1. Open the Messages app on your Mac
2. Make sure you're signed into iMessage (Messages → Settings → iMessage)
3. Send at least one message so the database is created

## Monitor not starting

Check for errors:
```bash
cat ~/Library/Logs/TinySeedFarm/imessage-monitor-error.log
```

Force restart:
```bash
launchctl stop com.tinyseedfarm.imessage-monitor
launchctl start com.tinyseedfarm.imessage-monitor
```

## Nothing happening when I text

1. Make sure you're watching the RIGHT log file
2. The first run may take a moment to initialize
3. Check if the webhook is working:
   ```bash
   curl "https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec?action=getSMSDashboard"
   ```

---

# USEFUL COMMANDS

Save these for reference:

```bash
# View live logs
tail -f ~/Library/Logs/TinySeedFarm/imessage-monitor.log

# Check if running
launchctl list | grep tinyseedfarm

# Stop the monitor
launchctl stop com.tinyseedfarm.imessage-monitor

# Start the monitor
launchctl start com.tinyseedfarm.imessage-monitor

# Restart the monitor
launchctl stop com.tinyseedfarm.imessage-monitor && launchctl start com.tinyseedfarm.imessage-monitor

# View error logs
tail -50 ~/Library/Logs/TinySeedFarm/imessage-monitor-error.log

# Complete uninstall
launchctl unload ~/Library/LaunchAgents/com.tinyseedfarm.imessage-monitor.plist
rm ~/Library/LaunchAgents/com.tinyseedfarm.imessage-monitor.plist
```

---

# HOW THE AI PROCESSES YOUR MESSAGES

When a message comes in, the system:

## 1. Builds Customer 360 Context
- Looks up the sender in your customer database
- Gets their purchase history and lifetime value
- Checks CSA membership status
- Reviews their recent orders
- Calculates churn risk

## 2. AI Analysis (Claude)
- **Intent**: What do they want? (inquiry, complaint, order, scheduling)
- **Sentiment**: How do they feel? (positive, negative, frustrated)
- **Urgency**: How fast do you need to respond? (0-100 scale)
- **Summary**: One-sentence summary of the message

## 3. Commitment Detection
If you or they made a promise, the AI extracts:
- What was promised
- Who promised it (you or them)
- When it's due
- Priority based on customer value

## 4. Priority Scoring
Weighted formula for response priority:
- Customer lifetime value: 30%
- Message urgency: 25%
- Churn risk: 20%
- Negative sentiment: 15%
- Deal at risk: 10%

## 5. Auto-Escalation
Automatically flags when:
- VIP customer + negative sentiment
- Churn risk > 70%
- Overdue commitments exist
- Complaint detected

---

# WHAT YOU GET

## Dashboard Access

View your SMS intelligence at:
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec?action=getSMSDashboard
```

## Commitment Tracking

See all open commitments:
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec?action=getSMSCommitments
```

## Mobile Log App

Beautiful mobile interface for manual logging:
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec?action=getCommitmentApp
```

---

# THE CHIEF OF STAFF HAS ACCESS TO EVERYTHING

All SMS intelligence is stored in Google Sheets:
- `COS_SMS_Log` - Every message with AI analysis
- `COS_SMS_Commitments` - Promise tracking
- `COS_SMS_Contacts` - Contact intelligence
- `COS_SMS_ActionQueue` - What you should do
- `COS_SMS_Insights` - Business intelligence

The Chief of Staff module can:
- See all messages in real-time
- Track overdue commitments
- Surface urgent issues
- Generate daily briefings
- Recommend actions

**NOTHING SLIPS THROUGH THE CRACKS.**

---

# FINAL CHECKLIST

- [ ] Homebrew installed
- [ ] Python 3 installed
- [ ] Ran `./install.sh`
- [ ] Granted Full Disk Access to Python
- [ ] Quit and reopened Terminal
- [ ] Verified monitor is running (`launchctl list | grep tinyseedfarm`)
- [ ] Tested with a real text message
- [ ] Saw the message in the logs

**You're done. The system is working. Go run your farm.**

---

*System designed and built: 2026-01-22*
*Enterprise-grade SMS Intelligence for Tiny Seed Farm*
*NOTHING SLIPS THROUGH THE CRACKS.*
