# BACKEND CLAUDE - RESEARCH TASK

**From:** PM Orchestrator
**Date:** 2026-01-29
**Priority:** HIGH
**Type:** Research → Implementation Guidance

---

## TASK: LangGraph Critic Loop Implementation Research

We are building a multi-agent PM system (TinyPM) that currently has:
- **PM Orchestrator** - Coordinates everything
- **Builder** - Executes code tasks autonomously
- **Memory System** - Mem0-style learning

**THE GAP:** Builder executes and reports "done" with NO VERIFICATION. We need a Critic Loop.

---

## WHAT YOU NEED TO RESEARCH

### 1. LangGraph Cyclic Graphs
- How to implement: `Builder → Critic → (pass/retry) → Done`
- Code patterns for conditional edges (if critic rejects, send back to builder)
- State management between nodes

**Source:** https://langchain-ai.github.io/langgraph/

### 2. Critic/Verifier Patterns
- What should a Critic agent check?
  - Did the file actually change?
  - Syntax errors?
  - Does the endpoint respond?
  - Tests pass?
- Lightweight verification vs heavy testing
- How to avoid infinite retry loops

### 3. Multi-Agent Handoff Patterns
- How does Agent A pass work to Agent B?
- State schemas for handoffs
- Error handling when downstream agent fails

### 4. Integration with Claude CLI
- We use `subprocess.run([claude, "-p", prompt, "--dangerously-skip-permissions"])`
- How would LangGraph nodes call Claude CLI?
- Or should we use Claude API directly for the graph?

---

## SOURCE DOCUMENTS TO CHECK

1. **LangGraph Docs:** https://langchain-ai.github.io/langgraph/
2. **LangGraph GitHub:** https://github.com/langchain-ai/langgraph
3. **Multi-Agent Examples:** https://github.com/langchain-ai/langgraph/tree/main/examples
4. **Our Research Output:** `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/` - check for any `.md` files with SOTA research

---

## DELIVERABLE

Create a file: `tinypm/claude_sessions/backend/OUTBOX.md` with:

```markdown
# LangGraph Critic Loop - Implementation Guide

## 1. Architecture Recommendation
[Your recommendation for how to structure this]

## 2. Code Patterns
[Actual code examples we can adapt]

## 3. Critic Checks to Implement
[Specific verification steps]

## 4. Integration Approach
[How to integrate with our existing builder_autonomous.py]

## 5. Risks & Mitigations
[What could go wrong, how to handle]
```

---

## CONTEXT: Our Current Builder

Location: `/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/builder_autonomous.py`

Current flow:
```
Poll intercom → Get task → Execute via Claude CLI → Report "done"
```

Desired flow:
```
Poll intercom → Get task → Execute via Claude CLI → CRITIC VERIFIES → Report "done" OR retry
```

---

## NOTES

- We want this to be LIGHTWEIGHT - not a heavy testing framework
- Focus on practical verification: "Did something actually happen?"
- Consider: file change detection, syntax check, endpoint ping
- Don't over-engineer - we need this working, not perfect

**Report back to OUTBOX.md when complete.**

---

## INTERCOM PROTOCOL (Same as Builder)

You can communicate with the PM and other agents via the intercom system.

### To CHECK for messages to you:
```bash
python3 -c "
import json
intercom = json.load(open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json'))
for m in intercom.get('pm_to_backend', intercom.get('pm_to_builder', []))[-5:]:
    if not m.get('read'):
        print(f'#{m[\"id\"]} [{m.get(\"priority\",\"normal\")}]: {m[\"message\"][:100]}')
"
```

### To SEND a message to PM:
```bash
python3 -c "
import json
from datetime import datetime

intercom = json.load(open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json'))

msg = {
    'id': intercom.get('next_id', 1),
    'type': 'update',  # or 'done', 'question', 'blocker'
    'from': 'backend',
    'message': 'YOUR MESSAGE HERE',
    'timestamp': datetime.now().isoformat()
}

if 'backend_to_pm' not in intercom:
    intercom['backend_to_pm'] = []
intercom['backend_to_pm'].append(msg)
intercom['next_id'] = msg['id'] + 1

with open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json', 'w') as f:
    json.dump(intercom, f, indent=2)

print(f'Sent message #{msg[\"id\"]}')
"
```

### Message Types:
- `update` - Progress update
- `done` - Task complete
- `question` - Need clarification
- `blocker` - Stuck, need help

**Use intercom for quick updates. Use OUTBOX.md for full deliverables.**
