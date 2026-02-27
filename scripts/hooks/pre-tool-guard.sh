#!/bin/bash
# Pre-tool guard: blocks dangerous Bash commands before execution
# Hook type: command (PreToolUse on Bash)
# Input: JSON on stdin with tool_input.command field

# Read the tool input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Guard 1: Block bare `clasp deploy` without -i flag
# Allows: clasp deploy -i <id>, clasp deployments, clasp push
if echo "$COMMAND" | grep -qE '^\s*(PATH=.*\s+)?clasp deploy(\s|$)' && ! echo "$COMMAND" | grep -q '\-i '; then
  echo "BLOCKED: bare 'clasp deploy' without -i flag creates a NEW deployment and breaks everything."
  echo "Use: clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d \"description\""
  exit 2
fi

# Guard 2: Block rm -rf on root or home
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)'; then
  echo "BLOCKED: destructive rm -rf on root/home directory"
  exit 2
fi

# Guard 3: Block force push to main/master
if echo "$COMMAND" | grep -qE 'git push.*--force.*(main|master)'; then
  echo "BLOCKED: force push to main/master. Use a feature branch instead."
  exit 2
fi

# All clear
exit 0
