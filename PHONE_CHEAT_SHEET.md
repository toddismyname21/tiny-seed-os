# PHONE CHEAT SHEET - Remote Access

## Quick Reference Card - Print This or Screenshot It

---

## CONNECT TO MAC FROM PHONE

### Step 1: Open Termius App

### Step 2: Tap "Mac" Host
(Or create new host with these settings)

| Setting | Value |
|---------|-------|
| Hostname | `100.86.0.110` (Tailscale IP) |
| Username | `samanthapollack` |
| Password | Your Mac login password |

### Step 3: You're Connected
You'll see: `samanthapollack@Samanthas-MBP ~ %`

---

## WORK WITH CLAUDE SESSIONS

### See All Sessions
```
tmux list-sessions
```

### Connect to a Session
```
tmux attach -t pm
```

Other sessions:
- `tmux attach -t backend`
- `tmux attach -t ux-design`
- `tmux attach -t field-ops`
- `tmux attach -t financial`
- `tmux attach -t sales-crm`
- `tmux attach -t inventory`
- `tmux attach -t grants`
- `tmux attach -t security`
- `tmux attach -t social-media`
- `tmux attach -t mobile`
- `tmux attach -t accounting`
- `tmux attach -t business`
- `tmux attach -t don-kb`

### Start Claude (if not running)
```
claude
```

### Give Claude Instructions
```
Check your INBOX: /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/INBOX.md
```

### Detach (Keep Session Running)
Press: `Ctrl+B` then `D`

### Disconnect SSH
```
exit
```

---

## INBOX PATHS (Copy/Paste)

| Session | INBOX Path |
|---------|------------|
| PM | `claude_sessions/pm_architect/INBOX.md` |
| Backend | `claude_sessions/backend/INBOX.md` |
| UX Design | `claude_sessions/ux_design/INBOX.md` |
| Field Ops | `claude_sessions/field_operations/INBOX.md` |
| Financial | `claude_sessions/financial/INBOX.md` |
| Sales CRM | `claude_sessions/sales_crm/INBOX.md` |
| Inventory | `claude_sessions/inventory_traceability/INBOX.md` |
| Grants | `claude_sessions/grants_funding/INBOX.md` |
| Security | `claude_sessions/security/INBOX.md` |
| Social Media | `claude_sessions/social_media/INBOX.md` |
| Mobile | `claude_sessions/mobile_employee/INBOX.md` |
| Accounting | `claude_sessions/accounting_compliance/INBOX.md` |
| Business | `claude_sessions/business_foundation/INBOX.md` |
| Don KB | `claude_sessions/don_knowledge_base/INBOX.md` |

---

## TROUBLESHOOTING

### Can't Connect?
1. Make sure Tailscale is running on phone AND Mac
2. Check Mac is awake (not sleeping)
3. Verify Remote Login is ON (System Settings → Sharing)

### Session Crashed?
```
tmux list-sessions
```
If session is gone, recreate:
```
cd /Users/samanthapollack/Documents/TIny_Seed_OS
./start-all-claudes.sh
```

### Stuck in tmux?
Press: `Ctrl+B` then `D` to detach

### Need to Kill a Session?
```
tmux kill-session -t backend
```

---

## KEY COMMANDS

| What | Command |
|------|---------|
| List sessions | `tmux list-sessions` |
| Attach | `tmux attach -t NAME` |
| Detach | `Ctrl+B` then `D` |
| Start Claude | `claude` |
| Exit SSH | `exit` |

---

## EMERGENCY RESTART (Run on Mac)

```
cd /Users/samanthapollack/Documents/TIny_Seed_OS
./start-all-claudes.sh
caffeinate -s &
```

---

## CONTACT INFO

| Item | Value |
|------|-------|
| Mac Local IP | `192.168.40.245` |
| Tailscale IP | `100.86.0.110` |
| Username | `samanthapollack` |

---

*Keep this handy. Screenshot it or print it.*
