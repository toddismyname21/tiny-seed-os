#!/bin/bash
# CONTEXT SNAPSHOT GENERATOR
# Runs hourly to create a summary file for Claude sessions
# Generated: 2026-02-12

OUTPUT_FILE="/Users/samanthapollack/Documents/TIny_Seed_OS/CONTEXT_SNAPSHOT.md"
PROJECT_ROOT="/Users/samanthapollack/Documents/TIny_Seed_OS"

cd "$PROJECT_ROOT"

cat > "$OUTPUT_FILE" << 'HEADER'
# CONTEXT SNAPSHOT
## Auto-generated for Claude session context
## READ THIS FIRST before any work

HEADER

# Add timestamp
echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Git status summary
echo "---" >> "$OUTPUT_FILE"
echo "## GIT STATUS" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
git status --short 2>/dev/null | head -20 >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Recent commits
echo "## RECENT COMMITS (Last 10)" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
git log --oneline -10 2>/dev/null >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# GitHub Pages status
echo "## GITHUB PAGES STATUS" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
gh run list --limit 3 2>/dev/null || echo "gh CLI not available" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Recent CHANGE_LOG entries (last 100 lines)
echo "## RECENT CHANGES (from CHANGE_LOG.md)" >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
head -150 "$PROJECT_ROOT/CHANGE_LOG.md" 2>/dev/null | tail -100 >> "$OUTPUT_FILE"
echo "\`\`\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Current session status if exists
if [ -f "$PROJECT_ROOT/docs/CURRENT_SESSION_STATUS.md" ]; then
    echo "## CURRENT SESSION STATUS" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$PROJECT_ROOT/docs/CURRENT_SESSION_STATUS.md" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Key system info
echo "---" >> "$OUTPUT_FILE"
echo "## KEY SYSTEM INFO" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**API Endpoint:** \`https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Deployment ID:** \`AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm\`" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Owner:** Todd Wilson (todd@tinyseedfarmpgh.com)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Active tasks
echo "## ACTIVE TASKS" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
if [ -f "$PROJECT_ROOT/tinypm/tasks.json" ]; then
    echo "Tasks from tinypm:" >> "$OUTPUT_FILE"
    cat "$PROJECT_ROOT/tinypm/tasks.json" 2>/dev/null | head -50 >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# Remind about key files
echo "---" >> "$OUTPUT_FILE"
echo "## KEY FILES TO READ" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "1. \`CLAUDE.md\` - Mandatory rules" >> "$OUTPUT_FILE"
echo "2. \`AGENTIC_TEAM_CONFIGURATION.md\` - Team architecture" >> "$OUTPUT_FILE"
echo "3. \`claude_sessions/pm_architect/SYSTEM_MANIFEST.md\` - Full system inventory" >> "$OUTPUT_FILE"
echo "4. \`CHANGE_LOG.md\` - Recent changes" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "---" >> "$OUTPUT_FILE"
echo "*Snapshot complete. Claude should read this file at session start.*" >> "$OUTPUT_FILE"

echo "Context snapshot generated: $OUTPUT_FILE"
