# BACKEND CLAUDE - PRIORITY RESEARCH TASK

**From:** PM Orchestrator
**Date:** 2026-01-29
**Priority:** CRITICAL
**Type:** Deep Technical Research - LangGraph Critic Loop Architecture

---

## ⚠️ READ CAREFULLY: THIS IS RESEARCH, NOT FARM BACKEND

This task is about researching **LangGraph** and **multi-agent orchestration patterns** for our AI PM product (codename: "Council of Wizards").

**THIS IS NOT ABOUT FARM APIS OR CSA ENDPOINTS.**

---

## ENHANCED RESEARCH METHODOLOGY

**ULTRATHINK PROTOCOL - Apply Deep Reasoning:**

Before answering any section:
1. **Think step by step** through the analysis
2. **Consider all angles** - strengths, weaknesses, edge cases
3. **Verify claims** - don't assume from marketing copy
4. **Cross-reference sources** - minimum 2 sources per major claim
5. **State confidence levels** - High/Medium/Low for key assertions
6. **Analyze thoroughly** - depth over speed

**Do NOT rush. Quality matters more than speed.**

---

## THE PROBLEM WE'RE SOLVING

We have a multi-agent PM system (TinyPM) that currently has:
- **PM Orchestrator** - Coordinates everything
- **Builder** - Executes code tasks autonomously
- **Memory System** - Mem0-style learning

**THE GAP:** Builder executes and reports "done" with NO VERIFICATION. We need a Critic Loop.

Current flow:
```
Poll intercom → Get task → Execute via Claude CLI → Report "done"
```

Desired flow:
```
Poll intercom → Get task → Execute via Claude CLI → CRITIC VERIFIES → Report "done" OR retry
```

---

## WHAT YOU NEED TO RESEARCH

### Section 1: LangGraph Cyclic Graphs (CRITICAL)

**Questions to Answer:**
- How does LangGraph implement conditional cycles? (Builder → Critic → pass/retry → Done)
- What's the syntax for conditional edges based on output?
- How does state persist across cycle iterations?
- What happens if max retries exceeded?

**Sources to Check:**
- https://langchain-ai.github.io/langgraph/ (official docs)
- https://github.com/langchain-ai/langgraph (source code)
- https://github.com/langchain-ai/langgraph/tree/main/examples (examples)

**Confidence Requirement:** HIGH (with code examples)

### Section 2: Critic/Verifier Agent Patterns

**Questions to Answer:**
- What should a Critic agent actually check?
  - Did the file actually change?
  - Are there syntax errors?
  - Does the endpoint respond?
  - Do tests pass?
- How lightweight can verification be while still being useful?
- How do we avoid infinite retry loops?
- What's the optimal retry limit (2? 3? 5?)?

**Consider Different Approaches:**
- Static analysis (fast but shallow)
- Runtime testing (slow but thorough)
- Hybrid approach (which checks for which tasks?)

**Confidence Requirement:** MEDIUM (with reasoning)

### Section 3: Multi-Agent Handoff Patterns

**Questions to Answer:**
- How does Agent A pass work to Agent B in LangGraph?
- What's the state schema for handoffs?
- How do you handle errors when downstream agent fails?
- What's the pattern for "retry with feedback"?

**Code Pattern Needed:**
```python
# Example of what we need:
# 1. Builder produces output
# 2. Critic receives output + original task
# 3. Critic either approves OR provides feedback
# 4. If feedback, Builder receives feedback + retries
# 5. State tracks retry count
```

**Confidence Requirement:** HIGH (with working code)

### Section 4: Integration with Claude CLI

**Our Current Builder Implementation:**
```python
# In builder_autonomous.py
result = subprocess.run([
    claude, "-p", prompt,
    "--dangerously-skip-permissions"
], capture_output=True, text=True, timeout=timeout)
```

**Questions to Answer:**
- How would LangGraph nodes call Claude CLI?
- Should we use Claude API directly instead for the graph?
- What's the pattern for wrapping external CLI tools in LangGraph?
- Pros/cons of CLI vs API for multi-agent systems?

**Confidence Requirement:** MEDIUM (with recommendation)

### Section 5: Concrete Implementation Approach

**Deliverable Needed:**
A step-by-step plan for adding critic loop to our existing `builder_autonomous.py`

Options to evaluate:
1. **Full LangGraph** - Rewrite entire builder as LangGraph
2. **Hybrid** - Keep builder, add LangGraph critic loop
3. **Simple Python** - No LangGraph, just add critic check function

Recommend which approach fits our "NO SHORTCUTS, BEST POSSIBLE" philosophy.

---

## DELIVERABLE FORMAT

Save to: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/backend/LANGGRAPH_CRITIC_RESEARCH.md`

```markdown
# LangGraph Critic Loop - Implementation Research

## Date: 2026-01-29
## Analyst: Backend Claude
## Methodology: ULTRATHINK Protocol

---

## EXECUTIVE SUMMARY

**Key Finding 1:** [One sentence]
**Key Finding 2:** [One sentence]
**Key Finding 3:** [One sentence]
**Recommended Approach:** [One sentence]
**Confidence Level:** [High/Medium/Low]

---

## 1. LANGGRAPH CYCLIC GRAPHS

**How It Works:**
[Explanation with code examples]

**Code Pattern:**
```python
# Actual LangGraph code for cyclic graph
```

**Source:** [URL]
**Confidence:** [High/Medium/Low]

---

## 2. CRITIC/VERIFIER PATTERNS

**What to Check:**
| Check Type | Speed | Thoroughness | When to Use |
|------------|-------|--------------|-------------|
| ... | ... | ... | ... |

**Recommended Checks for TinyPM:**
1. [Check 1 - why]
2. [Check 2 - why]
3. [Check 3 - why]

**Retry Strategy:**
[How many retries, when to give up, how to provide feedback]

**Confidence:** [High/Medium/Low]

---

## 3. MULTI-AGENT HANDOFF

**State Schema:**
```python
# The state object structure for handoffs
```

**Handoff Pattern:**
```python
# Code showing builder → critic → conditional retry
```

**Error Handling:**
[What happens when downstream fails]

**Confidence:** [High/Medium/Low]

---

## 4. CLAUDE CLI INTEGRATION

**Option A: Keep CLI Calls**
- Pros: [...]
- Cons: [...]
- Code pattern: [...]

**Option B: Switch to API**
- Pros: [...]
- Cons: [...]
- Code pattern: [...]

**Recommendation:** [Which and why]

**Confidence:** [High/Medium/Low]

---

## 5. IMPLEMENTATION PLAN

**Recommended Approach:** [Full LangGraph / Hybrid / Simple Python]

**Why:** [Reasoning]

**Step-by-Step Implementation:**

### Phase 1: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Name]
- [ ] Task 1
- [ ] Task 2

### Phase 3: [Name]
- [ ] Task 1
- [ ] Task 2

**Estimated Complexity:** [Low/Medium/High]

---

## SOURCES

- [Source 1 with URL]
- [Source 2 with URL]
- [etc.]

---

## GAPS & UNKNOWNS

- [What couldn't be verified]
- [What needs testing]
- [What requires PM decision]
```

---

## RESEARCH SOURCES TO USE

| Source Type | Where to Look |
|-------------|---------------|
| **Official** | LangGraph docs, LangChain docs |
| **Code** | LangGraph GitHub examples |
| **Community** | Reddit r/LangChain, Discord |
| **Tutorials** | YouTube LangGraph tutorials |
| **Papers** | ArXiv multi-agent papers |

---

## QUALITY CHECKLIST

Before submitting, verify:
- [ ] All 5 sections researched thoroughly
- [ ] Code examples are ACTUAL code (not pseudo-code)
- [ ] Confidence levels stated for each section
- [ ] Sources with URLs for major claims
- [ ] Implementation plan is actionable
- [ ] Gaps/unknowns acknowledged

---

## COMMUNICATION

Send status update when starting and when complete:

```bash
python3 -c "
import json
from datetime import datetime
intercom = json.load(open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json'))
msg = {
    'id': intercom.get('next_id', 1),
    'type': 'update',
    'from': 'backend',
    'message': 'LangGraph Critic Research: [STATUS]',
    'timestamp': datetime.now().isoformat()
}
if 'backend_to_pm' not in intercom:
    intercom['backend_to_pm'] = []
intercom['backend_to_pm'].append(msg)
intercom['next_id'] = msg['id'] + 1
json.dump(intercom, open('/Users/samanthapollack/Documents/TIny_Seed_OS/tinypm/.claude_intercom.json', 'w'), indent=2)
print(f'Sent #{msg[\"id\"]}')
"
```

---

## CONTEXT: Why This Matters

Our vision is "Council of Wizards" - a multi-agent AI PM that:
- Has an **Overseer** (orchestrator with full context)
- Has a **Scribe** (memory that learns patterns)
- Has an **Artificer** (builder that executes)
- Has a **Mentor** (MISSING - this is the Critic)

The Critic/Mentor loop is the differentiator that makes our system actually reliable. Without it, we're just another "AI that hallucinates it finished."

**BEGIN NOW. Think deeply. Verify everything. State confidence levels.**
