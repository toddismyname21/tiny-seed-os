# TINYPM CLAUDE RULES

## MANDATORY: READ BEFORE ANY WORK ON TINYPM

This file is the law for ANY Claude session working on TinyPM.
Violations cause fragmentation, duplicates, and wasted work.

---

## RULE 1: IDENTIFY YOURSELF

Before starting, declare which agent you are:

| Agent | Scope | Files You Touch |
|-------|-------|-----------------|
| **PM_Architect** | Coordination, planning | Documentation, plans, coordination files |
| **Backend_Agent** | Python code, API | `*.py` files, API endpoints |
| **Frontend_Agent** | Dashboard, UI | `web_dashboard.html`, CSS, JS |
| **Integration_Agent** | External services | `*_integration.py` files |
| **Research_Agent** | Research tasks | `/research/` folder only |

**If unclear, ASK before proceeding.**

---

## RULE 2: CHECK THE MANIFEST BEFORE BUILDING

**MANDATORY:** Before creating ANY new file or function:

```
Read: /Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/TINYPM_MANIFEST.md
```

This file tracks:
- Every Python file and its purpose
- Every function in each file
- What's working vs what's in progress
- What's planned vs what exists

**IF YOU BUILD SOMETHING THAT ALREADY EXISTS, YOU ARE CREATING FRAGMENTATION.**

---

## RULE 3: PRESERVE EXISTING CODE

These files are PRODUCTION-READY. Do NOT replace them:

| File | Status | Action |
|------|--------|--------|
| `app.py` | Working TUI | ENHANCE ONLY |
| `pm_orchestrator.py` | SOTA architecture | ENHANCE ONLY |
| `pm_brain.py` | Mem0-style memory | ENHANCE ONLY |
| `builder_autonomous.py` | Working builder | ENHANCE ONLY |
| `critic.py` | Working critic | ENHANCE ONLY |
| `daily-evolution.py` | Working evolution | ENHANCE ONLY |
| `web_server.py` | Full API server | ENHANCE ONLY |
| `web_dashboard.html` | Working dashboard | ENHANCE ONLY |
| `personas/*.md` | All 7 personas | DO NOT TOUCH |
| `board.json` | Real task data | DO NOT TOUCH |
| `.pm_memory.json` | Learned patterns | DO NOT TOUCH |
| `.pm_patterns.json` | Learned data | DO NOT TOUCH |

**ENHANCE means: Add new functions, don't rewrite existing ones.**

---

## RULE 4: COORDINATION PROTOCOL

### 4.1 Before Starting Work

1. Read `TINYPM_MANIFEST.md` - know what exists
2. Read `TINYPM_WORKLOG.md` - see what others are doing
3. Claim your task in `TINYPM_WORKLOG.md`
4. Check for conflicts with other agents

### 4.2 During Work

1. Work on ONE task at a time
2. Make small, incremental changes
3. Test before moving on
4. Update `TINYPM_WORKLOG.md` with progress

### 4.3 After Completing Work

1. Update `TINYPM_MANIFEST.md` with what you built
2. Update `TINYPM_WORKLOG.md` marking task complete
3. Document any new files/functions added
4. Note any issues or blockers discovered

---

## RULE 5: FILE NAMING CONVENTIONS

### New Python Files
```
# Integration files
calendar_integration.py
email_integration.py
supabase_sync.py

# Enhancement files (add to existing)
# DON'T create new files, enhance existing ones
```

### Research Files
```
/research/YYYY-MM-DD_topic_research.md
```

### State Files
```
.filename.json  # Hidden state files (dot prefix)
```

---

## RULE 6: FUNCTION NAMING CONVENTIONS

### In pm_brain.py
```python
# Memory functions
store_fact(), retrieve_fact(), add_context()

# Pattern functions
record_interaction(), predict_next_action()

# NEW: Add with consistent naming
score_confidence()  # Not get_confidence_score()
calibrate_trust()   # Not trust_calibration()
```

### In pm_orchestrator.py
```python
# Existing classes to enhance (don't create duplicates)
MemoryManager, ContextGatherer, SmartRouter, ProactiveEngine

# Add new methods to existing classes, don't create new classes
```

---

## RULE 7: NO DUPLICATE SYSTEMS

**KNOWN SYSTEMS - DO NOT RECREATE:**

| System | Location | Status |
|--------|----------|--------|
| Memory System | `pm_brain.py` | Working |
| Pattern Learning | `pm_brain.py` | Working |
| Proactive Suggestions | `pm_orchestrator.py` | Working |
| Smart Routing | `pm_orchestrator.py` | Working |
| Multi-Agent Comms | `pm_orchestrator.py` + shell scripts | Working |
| Task Management | `board.json` + API | Working |
| Daily Evolution | `daily-evolution.py` | Working |
| Auto-Responder | `web_server.py` | Working |

**Before creating ANY new system, search for existing implementation first.**

---

## RULE 8: CONTEXT HANDOFF

When your session ends or context runs low:

1. Write a summary to `TINYPM_WORKLOG.md`:
   - What you completed
   - What's in progress
   - What's blocked
   - What the next agent should do

2. Update `TINYPM_MANIFEST.md` with any new:
   - Files created
   - Functions added
   - APIs changed

3. Leave code in a working state (no half-finished functions)

---

## RULE 9: COMMUNICATION CHANNELS

### With Other TinyPM Agents
```
Write to: TINYPM_WORKLOG.md
Read from: TINYPM_WORKLOG.md
```

### With Tiny Seed OS PM
```
Write to: /claude_sessions/email_chief_of_staff/FROM_TINYPM_PM.md
Read from: FROM_TINY_SEED_OS_PM.md
```

### With User
```
Always be clear about what you're doing and why.
Ask before making architectural decisions.
```

---

## RULE 10: TESTING REQUIREMENTS

Before marking any work complete:

1. **Python files:** Must be syntactically valid (`python3 -m py_compile file.py`)
2. **API changes:** Test with curl or browser
3. **UI changes:** Test on mobile viewport
4. **Integrations:** Test with real credentials (or mock clearly)

---

## QUICK REFERENCE

| Task | First Step |
|------|------------|
| Add new feature | Check MANIFEST for existing implementation |
| Fix a bug | Read the file first, understand context |
| Create new file | Check if it should enhance existing file instead |
| Add integration | Create `*_integration.py`, don't modify core files |
| Research task | Output to `/research/`, update MANIFEST |

---

## ENFORCEMENT

**If you violate these rules:**
- Duplicate code wastes time and money
- Fragmentation makes the system unmaintainable
- Lost context means repeated work
- The user will lose trust

**FOLLOW THE RULES. NO EXCEPTIONS.**

---

*Created: 2026-01-30*
*TinyPM coordination protocol v1.0*
