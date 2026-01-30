#!/bin/bash
# Tiny Seed Farm - Morning Briefing Generator

PROJECT_DIR="/Users/samanthapollack/Documents/TIny_Seed_OS"
BRIEFING_FILE="$PROJECT_DIR/claude_sessions/pm_architect/MORNING_BRIEFING.md"
OUTBOX_DIR="$PROJECT_DIR/claude_sessions"

echo "# MORNING BRIEFING - $(date '+%Y-%m-%d')" > "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"
echo "**Generated:** $(date '+%H:%M:%S')" >> "$BRIEFING_FILE"
echo "" >> "$BRIEFING_FILE"

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
      echo '```' >> "$BRIEFING_FILE"
      tail -30 "$outbox" >> "$BRIEFING_FILE"
      echo '```' >> "$BRIEFING_FILE"
      echo "" >> "$BRIEFING_FILE"
    fi
  fi
done

if [ "$PROGRESS_FOUND" = false ]; then
  echo "*No progress logged in the last 24 hours.*" >> "$BRIEFING_FILE"
fi

echo "" >> "$BRIEFING_FILE"
echo "---" >> "$BRIEFING_FILE"
echo "*End of Morning Briefing*" >> "$BRIEFING_FILE"

echo "Morning briefing generated: $BRIEFING_FILE"

# Notify if progress was made
if [ "$PROGRESS_FOUND" = true ]; then
  /Users/samanthapollack/Documents/TIny_Seed_OS/notify-owner.sh "Morning Briefing Ready - Progress made overnight!" "normal"
fi
