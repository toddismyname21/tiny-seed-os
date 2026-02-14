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

---

## From: PM_Architect
**Date:** 2026-02-12
**Type:** REQUEST
**Priority:**  MEDIUM
**Message ID:** `4de9ef0f-cd24-4790-b0e8-d945f96aa43c`
**Context:** `ctx-1770905431032-su0sxufy8`

### Test A2A Message

This is a test message to verify the A2A-Lite protocol is working correctly.

**Requested Action:** verify_protocol

**Confidence:** 90%

---

# 🚨 NEW PRIORITY TASKS - MCC BACKEND SUPPORT - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Context:** Marketing Command Center API improvements

---

## Task 1: Research Social Media Tagging APIs

**User Request:** "HOW CAN WE TAG FOLKS WITH THIS SYSTEM?"

**Research Required:**

### Instagram Graph API
- @mentions in caption: Supported?
- Photo tags (tag people in image): What endpoint?
- Collaborators (shared posts): Requirements?
- Location tags: What endpoint?

### Facebook Pages API
- @mentions in post: Format and permissions?
- Page tags: How to tag other pages?
- Location tags: What endpoint?

### TikTok API
- @mentions: Supported via API?
- Location tags: Available?

**Deliverables:**
1. Document which tagging features each API supports
2. Document required permissions/scopes
3. Create specification for implementation

---

## Task 2: Verify AI Caption Generation Uses Tone

**Context:** Priority 1 changes added tone dropdown to Quick Post frontend.

**Verify:**
1. Payload includes `tone` parameter
2. AI prompt template uses tone value
3. Response varies based on tone selection

**Location:** generateAICaption or generateAICaptionFromImage functions in MERGED TOTAL.js

---

## Task 3: Expose AI_INTELLIGENCE Functions to Frontend - COMPLETED

**Status:** DONE - Deployed v460 @627. All 3 endpoints live. See your OUTBOX for details.

---

# NEW TASK: Build Scheduled Post Publisher Trigger - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Goal:** Complete the SCHEDULE flow in MCC CREATE tab. Desktop_Claude is fixing the frontend to call your `schedulePost` endpoint. You need to build the backend piece that actually publishes posts when their scheduled time arrives.
**Depends on:** Desktop_Claude completing their frontend wiring (but you can build yours in parallel)

---

## CONTEXT

Your OUTBOX identified this broken flow. Here's the full picture:

```
CURRENT (broken):
User clicks SCHEDULE -> picks time -> nothing happens (Desktop_Claude fixing this)
                                                        |
                                                        v
                                            schedulePost endpoint saves to sheet
                                                        |
                                                        v
                                            SCHEDULED_POSTS sheet has row... forever
                                            (NOBODY PUBLISHES IT) <-- YOUR TASK
```

```
TARGET (working):
User clicks SCHEDULE -> picks time -> Desktop_Claude sends to schedulePost
                                                        |
                                                        v
                                            SCHEDULED_POSTS sheet: status = "scheduled"
                                                        |
                                                        v
                                            YOUR TRIGGER runs every 5 min
                                            Finds rows where scheduledFor <= now
                                            AND status === "scheduled"
                                                        |
                                                        v
                                            Calls postToInstagram / postToFacebook
                                            for each platform in the row
                                                        |
                                                        v
                                            Updates status to "published" + timestamp
```

---

## YOUR TASKS

### Task 1: Create `publishScheduledPosts()` function

This function should:
1. Read all rows from SCHEDULED_POSTS sheet where `Status === 'scheduled'`
2. Filter for rows where `Scheduled_For <= now` (the scheduled time has passed or arrived)
3. For each due post:
   a. Read `Platforms`, `Caption`, `Media_Urls` from the row
   b. Call the appropriate posting function for each platform (`postToInstagram`, `postToFacebook`, etc.)
   c. On success: Update row status to `"published"`, set `Published_At` = now
   d. On failure: Update row status to `"failed"`, set `Error` = error message, increment `Retry_Count`
   e. If `Retry_Count >= 3`, set status to `"permanently_failed"` (don't keep retrying forever)
4. Return summary: `{ processed: N, published: N, failed: N }`

### Task 2: Create time-based trigger

Create a setup function `setupScheduledPostTrigger()` that:
1. Deletes any existing triggers for `publishScheduledPosts` (prevent duplicates)
2. Creates a new time-driven trigger that runs `publishScheduledPosts()` every 5 minutes
3. Logs the trigger creation

```javascript
function setupScheduledPostTrigger() {
    // Delete existing triggers for this function
    ScriptApp.getProjectTriggers().forEach(t => {
        if (t.getHandlerFunction() === 'publishScheduledPosts') {
            ScriptApp.deleteTrigger(t);
        }
    });
    // Create new 5-minute trigger
    ScriptApp.newTrigger('publishScheduledPosts')
        .timeBased()
        .everyMinutes(5)
        .create();
}
```

### Task 3: Verify SCHEDULED_POSTS sheet structure

Confirm the sheet has these columns (create/add any missing):
- `Schedule_ID` (SCH_xxx)
- `Platforms` (comma-separated: instagram,facebook)
- `Caption`
- `Media_Urls` (comma-separated URLs)
- `Scheduled_For` (ISO datetime)
- `Status` (scheduled / publishing / published / failed / permanently_failed)
- `Created_At`
- `Created_By`
- `Published_At`
- `Error`
- `Retry_Count`
- `Campaign_ID` (optional)

---

## IMPORTANT NOTES

- The `schedulePost` endpoint you already built saves to this sheet - just verify the column names match
- Use the SAME posting functions that POST NOW uses (don't create duplicates)
- The trigger needs to be set up once by running `setupScheduledPostTrigger()` in the Apps Script editor (same as how Instagram credentials were set up)
- Add a `?action=getScheduledPosts` endpoint if it doesn't already exist, so the Calendar tab can show upcoming scheduled posts

## DEPLOYMENT

After implementing:
1. `clasp push`
2. `clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Add scheduled post publisher trigger"`
3. Run `setupScheduledPostTrigger()` once in Apps Script editor to activate

## DELIVERABLE
- Update your OUTBOX with implementation details
- Note any OWNER ACTIONS required (like running the setup function)
- Mark as IMPLEMENTED

---

*PM_Architect - 2026-02-14 - Complete the SCHEDULE flow end-to-end*

---

# URGENT: Execute Setup Functions - 2026-02-14

**From:** PM_Architect
**Priority:** CRITICAL
**Type:** Execute backend setup commands

---

## Context

You already built these functions AND exposed them as API routes (@628). They just need to be **executed once** to activate. Nobody has run them yet.

---

## Task 1: Activate Scheduled Post Auto-Publisher

**Function:** `setupScheduledPostTrigger()`
**API Route:** `?action=setupScheduledPostTrigger`

**What it does:** Creates a 5-minute time-driven trigger that runs `publishScheduledPosts()` automatically.

**Execute via:**
```bash
curl -L "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=setupScheduledPostTrigger"
```

**Verify:** Response should confirm trigger created. If there's an auth error, try `clasp run setupScheduledPostTrigger` instead.

---

## Task 2: Store Instagram/Meta API Credentials

**Function:** `setupInstagramCredentials_ONETIME()`

**What it does:** Stores Meta API access tokens and Instagram Business Account IDs in Script Properties so the posting functions can use them.

**Execute via:**
```bash
curl -L "https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec?action=setupInstagramCredentials_ONETIME"
```

**If no API route exists for this function:** Run it via `clasp run setupInstagramCredentials_ONETIME` or add a temporary route and redeploy.

---

## Deliverable

1. Run both setup functions
2. Verify each succeeded (capture response)
3. Test the schedule flow end-to-end: call `?action=publishScheduledPosts` manually and confirm it reads from the SCHEDULED_POSTS sheet
4. Report results in your OUTBOX

**This is the last piece needed to complete the MCC CREATE tab. Get it done.**

---

*PM_Architect - 2026-02-14 - Execute setup functions to complete schedule flow*

---

# NEW: Tagging API Support - 2026-02-14

**From:** PM_Architect
**Priority:** HIGH
**Context:** Desktop_Claude is building tagging UI. You need to provide these backend endpoints.

---

## Task 1: Facebook Places Search Endpoint

**Create:** `?action=searchFacebookPlaces`

**Parameters:** `query` (search text), `limit` (default 10)

**Implementation:**
```javascript
function searchFacebookPlaces(params) {
    var query = params.query || '';
    var limit = params.limit || 10;
    var token = getActivePageToken(); // Use any valid page token

    var url = 'https://graph.facebook.com/v24.0/search'
        + '?type=place'
        + '&q=' + encodeURIComponent(query)
        + '&fields=id,name,location,picture'
        + '&limit=' + limit
        + '&access_token=' + token;

    var result = JSON.parse(UrlFetchApp.fetch(url, {muteHttpExceptions: true}).getContentText());
    return { success: true, places: result.data || [] };
}
```

**Wire to router:** Add `case 'searchFacebookPlaces': return searchFacebookPlaces(params);`

---

## Task 2: Post Instagram First Comment Endpoint

**Create:** `?action=postInstagramComment`

**Parameters:** `mediaId` (the Instagram post ID), `comment` (text), `accountIndex`

**Implementation:**
Use Instagram Graph API: `POST /{media-id}/comments?message={comment}&access_token={token}`

This lets the frontend post hashtags as a first comment (industry best practice).

---

## Task 3: Add Location ID to postToInstagram

**Modify:** `postToInstagram()` to accept optional `locationId` parameter.

When creating the media container, if `locationId` is provided, include it:
```
POST /{ig-user-id}/media
  ?image_url=...
  &caption=...
  &location_id={locationId}    <-- ADD THIS
  &access_token=...
```

Same for `postToFacebook()` - add `place` parameter for location tagging.

---

## Task 4: Add User Tags to postToInstagram

**Modify:** `postToInstagram()` to accept optional `userTags` parameter.

When creating the media container for single images, if `userTags` is provided:
```
POST /{ig-user-id}/media
  ?image_url=...
  &caption=...
  &user_tags=[{"username":"tinyseedfleurs","x":0.5,"y":0.5}]
  &access_token=...
```

Note: `user_tags` requires `instagram_basic` and `instagram_manage_comments` permissions (already granted).

---

## DEPLOYMENT

After implementing all tasks:
1. `clasp push`
2. `clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Add tagging APIs: places search, first comment, location + user tags"`
3. Update OUTBOX with endpoint details

---

*PM_Architect - 2026-02-14 - Backend tagging API support*
