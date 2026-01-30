#!/bin/bash
# Send notification to owner via Happy Coder

MESSAGE="$1"
PRIORITY="${2:-normal}"

# Log the notification
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$PRIORITY] $MESSAGE" >> /Users/samanthapollack/Documents/TIny_Seed_OS/notifications.log

# Append to PM OUTBOX for record
echo "" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "## [$(date '+%Y-%m-%d %H:%M:%S')] - NOTIFICATION" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "**Priority:** $PRIORITY" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md
echo "**Message:** $MESSAGE" >> /Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/pm_architect/OUTBOX.md

echo "Notification logged: $MESSAGE"
