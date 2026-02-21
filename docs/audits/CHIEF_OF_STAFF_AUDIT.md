# Chief of Staff Dashboard - Complete Audit Report

**File:** `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/chief-of-staff.html`
**Size:** 342.3 KB, 8858 lines
**Audit Date:** 2026-02-21
**Auditor Role:** PM_Architect (research only, no edits)

---

## Table of Contents

1. [Pre-Commit Hook Syntax Error - Root Cause & Fix](#1-pre-commit-hook-syntax-error)
2. [File Architecture Overview](#2-file-architecture-overview)
3. [Feature Inventory - All 10 Tabs](#3-feature-inventory)
4. [Chat Interface & AI Features](#4-chat-interface--ai-features)
5. [Command Systems (NLP, Palette, Shortcuts)](#5-command-systems)
6. [Brain Integration System](#6-brain-integration-system)
7. [API Endpoint Inventory](#7-api-endpoint-inventory)
8. [Backend Function Mapping](#8-backend-function-mapping)
9. [Working vs Placeholder Analysis](#9-working-vs-placeholder-analysis)
10. [Performance & UX Patterns](#10-performance--ux-patterns)
11. [Issues & Recommendations](#11-issues--recommendations)

---

## 1. Pre-Commit Hook Syntax Error

### The Error

```
COMMIT BLOCKED: JavaScript syntax error in web_app/chief-of-staff.html
<script src="brain-integration.js" async defer>
SyntaxError: Unexpected token '<'
```

### Root Cause Analysis

The pre-commit hook (`.git/hooks/pre-commit`, CHECK 8, lines 244-295) extracts JavaScript from HTML files using this `sed` command:

```bash
SCRIPT_CONTENT=$(sed -n '/<script>/,/<\/script>/p' "$file" \
  | sed 's/<script>//g' \
  | sed 's/<\/script>//g')
```

**The bug is in the `sed` extraction logic.** Here is how it works and why it fails:

1. `sed -n '/<script>/,/<\/script>/p'` captures all lines between `<script>` and `</script>` patterns (inclusive).
2. `sed 's/<script>//g'` removes the literal substring `<script>` from captured lines.
3. `sed 's/<\/script>//g'` removes the literal substring `</script>` from captured lines.

**The problem:** The pattern `/<script>/` in sed matches the **regex** `<script>`, which matches any line containing the exact 8-character string `<script>`. This regex does NOT match `<script src="brain-integration.js" async defer>` because that line contains `<script ` (with a space), not `<script>` (with a closing angle bracket).

However, the actual failure mechanism is more nuanced. The file has these script blocks:

| Line | Content |
|------|---------|
| ~4247 | `<script>` (main block opens) |
| 8699 | `</script>` (main block closes) |
| 8703 | `<script>window.BRAIN_SERVER_URL = '...';</script>` (inline, single line) |
| 8705 | `<script src="brain-integration.js" async defer></script>` (external) |
| 8711 | `<script>` (brain wiring block opens) |
| 8856 | `</script>` (brain wiring block closes) |

The sed range extraction captures:
- Block 1: Lines 4247-8699 (main JS, ~4452 lines)
- Block 2: Line 8703 (BRAIN_SERVER_URL, single line)
- Block 3: Lines 8711-8856 (brain wiring, ~145 lines)

Line 8705 (`<script src="brain-integration.js" async defer></script>`) is NOT captured because `<script>` does not appear as a substring on that line.

**So the error is NOT caused by the brain-integration.js script tag directly.** The error likely occurs when ALL extracted JS blocks are concatenated and `node --check` fails due to:

1. **Concatenation of unrelated script blocks:** The main script block, the BRAIN_SERVER_URL assignment, and the brain wiring script are all concatenated into a single file. Variable declarations or scope issues across blocks could cause syntax errors.
2. **Inline HTML comments between script blocks being captured:** If any HTML comments happen to fall within a `<script>...</script>` range, they would be treated as JS.
3. **The main script block size (4452 lines):** A syntax error within this massive block would be reported, but the error message references `<script src="brain-integration.js" async defer>` which suggests the hook's error reporting includes context about which script tag section contains the issue.

### The Fix

The pre-commit hook's JS extraction in `.git/hooks/pre-commit` (lines 259-260) needs to be updated to:

**Option A: Skip `<script>` tags with `src` attribute (recommended)**
```bash
# Current (buggy):
SCRIPT_CONTENT=$(sed -n '/<script>/,/<\/script>/p' "$file" \
  | sed 's/<script>//g' \
  | sed 's/<\/script>//g')

# Fixed: Match <script> but NOT <script src=...>, handle attributes
SCRIPT_CONTENT=$(python3 -c "
import re, sys
with open('$file') as f:
    html = f.read()
# Extract only inline script content (no src attribute)
pattern = r'<script(?![^>]*\bsrc\b)[^>]*>(.*?)</script>'
scripts = re.findall(pattern, html, re.DOTALL)
print('\n'.join(scripts))
")
```

**Option B: Simpler sed fix (handles attributes in opening tags)**
```bash
SCRIPT_CONTENT=$(sed -n '/<script[^>]*>/,/<\/script>/p' "$file" \
  | grep -v '<script.*src=' \
  | sed 's/<script[^>]*>//g' \
  | sed 's/<\/script>//g')
```

**Option C: Most robust -- use Node.js itself for extraction**
```bash
SCRIPT_CONTENT=$(node -e "
const fs = require('fs');
const html = fs.readFileSync('$file', 'utf8');
const regex = /<script(?![^>]*\\bsrc\\b)[^>]*>([\s\S]*?)<\\/script>/gi;
let match, scripts = [];
while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
}
// Wrap each in IIFE to prevent scope conflicts
console.log(scripts.map(s => '(function(){' + s + '})();').join('\n'));
")
```

**Option C is recommended** because it:
- Correctly skips `<script src="...">` tags
- Wraps each block in an IIFE to prevent cross-block scope conflicts
- Uses Node.js (already required for the `node --check` step)
- Handles edge cases like multiline attributes

### Additional Notes on the Script Tag

The `<script src="brain-integration.js" async defer></script>` tag at line 8705 is **correctly formatted**. There is no inline content between the opening and closing tags. The `async defer` attributes are valid HTML5 attributes for external scripts. The tag itself is not the source of any JavaScript error -- the issue is purely in the pre-commit hook's extraction logic.

---

## 2. File Architecture Overview

### Structure Breakdown

| Section | Lines | Size | Description |
|---------|-------|------|-------------|
| CSS Styles | 1-3311 | ~3311 lines | All styling inline in `<style>` tag |
| HTML Body | 3312-4246 | ~934 lines | DOM structure, tabs, modals, containers |
| Main JavaScript | 4247-8699 | ~4452 lines | All application logic |
| Brain URL Config | 8703 | 1 line | Sets `window.BRAIN_SERVER_URL` |
| Brain External Script | 8705 | 1 line | Loads `brain-integration.js` |
| Brain UI Containers | 8708-8709 | 2 lines | Suggestion/nudge containers |
| Brain Wiring Script | 8711-8856 | ~145 lines | Connects Brain API to existing functions |
| File End | 8857-8858 | 2 lines | `</body></html>` |

### External Dependencies

| File | Purpose | Status |
|------|---------|--------|
| `web_app/api-config.js` | API URL configuration | Required, loaded first |
| `web_app/brain-integration.js` | TinyPM Brain proactive intelligence | Optional, graceful degradation |

### API Base URL Setup (line 4249)

```javascript
const API_BASE = typeof TINY_SEED_API !== 'undefined'
  ? TINY_SEED_API.MAIN_API
  : 'https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec';
```

This correctly uses `api-config.js` with a hardcoded fallback. The fallback matches the correct deployment ID.

---

## 3. Feature Inventory - All 10 Tabs

### Tab 1: Communications

**Purpose:** Email and SMS triage dashboard with priority grouping.

**Features:**
- Priority-grouped message cards (Critical/High/Medium/Low)
- Real-time email/SMS consolidation
- Category icons and type badges
- Message preview with sender, subject, time
- Click-to-open email detail modal
- Filter by priority level
- Connection status indicator
- Stale-while-revalidate caching (localStorage + in-memory)

**Backend Endpoints Used:**
- `getEmailCategories` (connection check)
- `getCombinedCommunications` (main data)
- `getEmailDetail` (message detail)
- `getEmailBodyFast` (fast body fetch)
- `archiveEmail`
- `reclassifyEmail`
- `reclassifySMS`

**Status:** IMPLEMENTED - Connected to real backend functions

### Tab 2: Action Queue

**Purpose:** Pending actions requiring owner attention.

**Features:**
- Action cards with priority badges
- Complete/dismiss actions
- Source tracking (which system generated the action)
- Due date display

**Backend Endpoints Used:**
- `getActionQueue`
- `completeAction` (maps to `approveEmailAction`)
- `dismissAction` (maps to `rejectEmailAction`)

**Status:** IMPLEMENTED - Connected to real backend functions

### Tab 3: Commitments

**Purpose:** Track open SMS commitments and promises.

**Features:**
- Overdue commitment highlighting
- Completion tracking
- Timeline display

**Backend Endpoints Used:**
- `getOpenSMSCommitments`
- `completeSMSCommitment`

**Status:** IMPLEMENTED - Connected to real backend functions

### Tab 4: Proactive Intelligence

**Purpose:** AI-generated alerts and proactive suggestions.

**Features:**
- Active alerts display with priority levels
- Dismissable alerts with "was this useful?" feedback
- Run manual proactive scan
- Proactive suggestion cards with action buttons

**Backend Endpoints Used:**
- `getActiveAlerts` (function exists at line 12625)
- `dismissAlert` (function exists at line 12671)
- `runProactiveScan` (maps to `runProactiveScanning` at line 12281)
- `getProactiveSuggestions` (referenced but NO standalone function definition found -- used via `typeof` check with fallback)

**Status:** PARTIALLY IMPLEMENTED - `getActiveAlerts`, `dismissAlert`, `runProactiveScanning` have real implementations. `getProactiveSuggestions` is referenced with `typeof` guard, suggesting it may not have a standalone implementation.

### Tab 5: Calendar AI

**Purpose:** Schedule optimization with AI assistance.

**Features:**
- Today's schedule display
- Meeting slot finder (specify duration + days)
- Focus time protection (blocks distraction-free periods)
- Schedule optimization analysis

**Backend Endpoints Used:**
- `getTodaySchedule` (function at line 8021)
- `findMeetingSlots` (function at line 8028)
- `protectFocusTime` (function at line 7228)
- `optimizeSchedule` (action handler at line 14334, delegates to schedule optimization)

**Status:** IMPLEMENTED - All four functions have real implementations

### Tab 6: Predictive

**Purpose:** Workload forecasting and customer churn risk analysis.

**Features:**
- Predictive report generation
- Workload forecast (7-day lookahead)
- Customer churn risk assessment

**Backend Endpoints Used:**
- `getPredictiveReport` (function at line 12142)
- `forecastWorkload` (function at line 11920)
- `predictCustomerChurn` (function at line 11570)

**Status:** IMPLEMENTED - All three functions have real implementations

### Tab 7: Memory

**Purpose:** Pattern detection and contact memory recall.

**Features:**
- Active pattern display with confidence scores
- Contact memory lookup (by email)
- Pattern-based insights

**Backend Endpoints Used:**
- `getActivePatterns` (referenced at line 12482, used with `typeof` guard at line 14268)
- `recallContact` (referenced at lines 2371, 8797; used with `typeof` guard and `getContactProfile` fallback)

**Status:** PARTIALLY IMPLEMENTED - Both functions are used with `typeof` guards, suggesting they exist somewhere in the codebase but may not have standalone function definitions in MERGED TOTAL.js. `recallContact` falls back to `getContactProfile`.

### Tab 8: Autonomy

**Purpose:** 5-level autonomy settings per action type.

**Features:**
- Autonomy level configuration (1-5 scale per action type)
- Pending approval queue
- Approve/reject autonomous actions

**Backend Endpoints Used:**
- `getAutonomyStatus` (function at line 97353)
- `setAutonomyLevel` (action handler at line 14275, used with `typeof` guard -- NO standalone function definition found)
- `getPendingApprovals` (function at line 6375)
- `approveAction` (mapped to `approveEmailAction`)
- `rejectAction` (mapped to `rejectEmailAction`)

**Status:** PARTIALLY IMPLEMENTED - `getAutonomyStatus` and `getPendingApprovals` have real implementations. `setAutonomyLevel` is referenced via `typeof` guard.

### Tab 9: Style & Voice

**Purpose:** Writing style profile analysis and voice command interface.

**Features:**
- Style profile display (formal vs casual, emoji usage, etc.)
- Analyze owner's writing style from email history
- Voice command input

**Backend Endpoints Used:**
- `getStyleProfile` (action handler at line 14321, used with `typeof` guard -- NO standalone function definition found)
- `analyzeOwnerStyle` (action handler at line 14324, used with `typeof` guard -- NO standalone function definition found)
- `voiceCommand` (referenced in frontend at line ~9181)

**Status:** PLACEHOLDER/STUB - Both `getStyleProfile` and `analyzeOwnerStyle` are referenced via `typeof` guards with `{ error: 'Not available' }` fallbacks. No standalone function implementations found.

### Tab 10: System

**Purpose:** File organization, integrations, multi-agent system, and audit log.

**Features:**
- File statistics and natural language file search
- Integration status (connected services)
- Available agents and agent metrics
- Chief of Staff audit log

**Backend Endpoints Used:**
- `getFileStats` (action handler at line 14358 -- NO standalone function definition found)
- `searchFilesNL` (action handler at line 14356 -- NO standalone function definition found)
- `getIntegrationStatus` (function at line 78433)
- `getAvailableAgents` (action handler at line 14362, used with `typeof` guard)
- `getAgentMetrics` (action handler at line 14364, used with `typeof` guard)
- `getChiefOfStaffAuditLog` (function at line 6825)

**Status:** PARTIALLY IMPLEMENTED - `getIntegrationStatus` and `getChiefOfStaffAuditLog` have real implementations. `getFileStats`, `searchFilesNL`, `getAvailableAgents`, `getAgentMetrics` are referenced with `typeof` guards.

---

## 4. Chat Interface & AI Features

### Chat Panel (persistent right sidebar)

**Features:**
- Conversation history with message bubbles
- Text input with send button
- Voice input toggle (Web Speech API - `SpeechRecognition`)
- Auto-speak toggle for AI responses (Web Speech API - `SpeechSynthesis`)
- Chat suggestions (contextual quick-reply buttons)
- Typing indicator while waiting for AI response
- Conversation persisted in `chatHistory` array

**Backend Endpoints Used:**
- `chatWithChiefOfStaff` (main AI chat - function at line 1270)
- `chatFast` (fast variant - `chatWithChiefOfStaffFast` at line 1175)

**Status:** IMPLEMENTED - Core chat is fully connected to real AI backend

### Brain Dump Modal

**Purpose:** Quick capture of unstructured thoughts, automatically parsed into tasks.

**Features:**
- Large textarea for free-form text input
- AI parsing of text into structured tasks
- Preview extracted tasks before saving
- Save parsed tasks back to system

**Backend Endpoints Used:**
- `processBrainDump` (function at line 29641)
- `saveBrainDumpTasks` (action handler at line 14129)

**Status:** IMPLEMENTED - Connected to real backend

### Email Detail Modal

**Purpose:** Full email view with context-aware chatbot.

**Features:**
- Full email body display
- Context-aware chat about the specific email
- Archive from detail view
- Reclassify priority/category

**Backend Endpoints Used:**
- `getEmailDetail` (function at line 5942)
- `getEmailBodyFast` (function at line 6005)
- `archiveEmail` (function at line 6036)
- `reclassifyEmail` (function at line 5796)

**Status:** IMPLEMENTED - Fully connected

### Task Action Modal

**Features:**
- Complete task
- Assign task
- Delete task

**Backend Endpoints Used:**
- `recordTaskAction`
- `assignTask`
- `deleteTask`

**Status:** IMPLEMENTED

---

## 5. Command Systems

### NLP Command Bar

**Purpose:** Natural language interface for farm operations.

**Location:** Top of page, visible on all tabs.

**Features:**
- Type natural language commands (e.g., "email John about delivery")
- Pattern matching against 20+ command templates
- Fills in parameters from natural language
- Supports: email, SMS, task creation, calendar, weather, invoice, schedule
- Context-aware suggestions

**Command Categories:**
- Email: "email [person] about [topic]"
- SMS: "text [person] about [topic]"
- Tasks: "create task [description]"
- Calendar: "schedule [event] for [date]"
- Weather: "check weather"
- Invoice: "create invoice for [customer]"

**Status:** IMPLEMENTED (frontend-only parsing, delegates to backend actions)

### Command Palette (Cmd+K / Ctrl+K)

**Purpose:** Superhuman/Linear-style quick command access.

**Features:**
- Fuzzy search across all commands
- Recent commands list
- AI-suggested commands based on context
- 6 command categories: Communication, Task, Calendar, Analytics, System, Navigation
- Keyboard navigation (arrow keys, Enter to execute)
- Visual category icons

**Status:** IMPLEMENTED (frontend-only, calls existing functions)

### Keyboard Shortcuts (45+ shortcuts)

**Key Shortcuts:**
- `Cmd+K` / `Ctrl+K` -- Command Palette
- `Cmd+/` -- Focus NLP bar
- `1-9` -- Switch tabs
- `j/k` -- Navigate messages (vim-style)
- `o` / `Enter` -- Open selected message
- `e` -- Archive selected
- `r` -- Reply
- `#` -- Delete
- `s` -- Star/flag
- `c` -- Compose new
- `Shift+?` -- Show shortcuts help
- `Escape` -- Close modals

**Status:** IMPLEMENTED (frontend-only)

---

## 6. Brain Integration System

### Architecture

The Brain Integration is a **parallel intelligence layer** that connects to a separate Python FastAPI server (TinyPM Brain) for proactive suggestions, predictions, and nudges.

**Components:**

1. **`brain-integration.js`** (external file, 1371 lines)
   - `BrainAPI` object with full lifecycle management
   - SSE (Server-Sent Events) for server-push notifications
   - REST API for commands and feedback
   - Graceful degradation when brain is unavailable
   - Automatic reconnection with exponential backoff (max 5 attempts)
   - Timing intelligence (2-minute minimum between suggestions)
   - Context sync every 30 seconds

2. **Brain Wiring Script** (inline, lines 8711-8856)
   - Connects BrainAPI callbacks to existing Chief of Staff functions
   - Registers handlers: onSuggestion, onNudge, onPrediction, onStatusChange
   - Instruments user actions for pattern learning (tab switches, message selection, task completion, email archive, chat)
   - Visibility change detection for context sync

3. **Brain UI Containers** (lines 8708-8709)
   - `#brain-suggestions-container` -- Fixed position, bottom-right
   - `#brain-nudges-container` -- Fixed position, top-right

**Brain Server URL:** `https://tinypm-brain.onrender.com` (set via `window.BRAIN_SERVER_URL` at line 8703)

**Brain API Endpoints (external server, NOT Google Apps Script):**
- `GET /api/health` -- Health check
- `GET /api/events` -- SSE event stream
- `POST /api/predictions` -- Get predictions
- `POST /api/feedback` -- Submit suggestion feedback
- `POST /api/execute` -- Execute approved suggestion
- `POST /api/clarify` -- Answer clarification question
- `GET /api/nudges/pending` -- Get pending nudges
- `POST /api/actions` -- Record user action
- `POST /api/context` -- Sync current context

**Status:** IMPLEMENTED with graceful degradation. If brain server is down, the Chief of Staff runs in "basic mode" with all other features working normally. Brain features are purely additive.

---

## 7. API Endpoint Inventory

### Google Apps Script Endpoints (via `API_BASE`)

| Endpoint Action | Frontend Function | Tab/Feature | Backend Status |
|----------------|-------------------|-------------|----------------|
| `getEmailCategories` | `checkConnection()` | Connection check | HAS function (line 4146) |
| `getCombinedCommunications` | `loadCommunications()` | Communications | HAS function (line 5721) |
| `getActionQueue` | `loadActionQueue()` | Action Queue | HAS function (line 10845) |
| `getOpenSMSCommitments` | `loadCommitments()` | Commitments | HAS function (line 10768) |
| `chatWithChiefOfStaff` | `sendMessage()` | Chat | HAS function (line 1270) |
| `chatFast` | Chat fast variant | Chat | HAS function (line 1175) |
| `triageInbox` | `triageInbox()` | Communications | HAS function (line 5215) |
| `getEmailDetail` | `viewMessageDetail()` | Email Detail | HAS function (line 5942) |
| `getEmailBodyFast` | `loadEmailBody()` | Email Detail | HAS function (line 6005) |
| `archiveEmail` | `archiveCurrentEmail()` | Email Detail | HAS function (line 6036) |
| `reclassifyEmail` | `reclassifyMessage()` | Communications | HAS function (line 5796) |
| `reclassifySMS` | `reclassifySMS()` | Communications | HAS function (line 5874) |
| `completeAction` | `completeAction()` | Action Queue | Maps to `approveEmailAction` |
| `dismissAction` | `dismissAction()` | Action Queue | Maps to `rejectEmailAction` |
| `completeSMSCommitment` | `completeSMSCommitment()` | Commitments | HAS function (line 10819) |
| `processBrainDump` | Brain dump modal | Brain Dump | HAS function (line 29641) |
| `saveBrainDumpTasks` | Brain dump save | Brain Dump | HAS action handler |
| `getActiveAlerts` | `loadAlerts()` | Proactive | HAS function (line 12625) |
| `dismissAlert` | `dismissAlert()` | Proactive | HAS function (line 12671) |
| `runProactiveScan` | `runScan()` | Proactive | Maps to `runProactiveScanning` (line 12281) |
| `getProactiveSuggestions` | `loadSuggestions()` | Proactive | typeof guard, NO standalone definition |
| `getTodaySchedule` | `loadSchedule()` | Calendar | HAS function (line 8021) |
| `findMeetingSlots` | `findSlots()` | Calendar | HAS function (line 8028) |
| `protectFocusTime` | `protectFocus()` | Calendar | HAS function (line 7228) |
| `optimizeSchedule` | `optimizeSchedule()` | Calendar | HAS action handler |
| `getPredictiveReport` | `loadPredictive()` | Predictive | HAS function (line 12142) |
| `forecastWorkload` | Predictive tab | Predictive | HAS function (line 11920) |
| `predictCustomerChurn` | Predictive tab | Predictive | HAS function (line 11570) |
| `getActivePatterns` | `loadPatterns()` | Memory | typeof guard, used at line 12482 |
| `recallContact` | `recallContact()` | Memory | typeof guard, falls back to `getContactProfile` |
| `getAutonomyStatus` | `loadAutonomy()` | Autonomy | HAS function (line 97353) |
| `setAutonomyLevel` | `setLevel()` | Autonomy | typeof guard, NO standalone definition |
| `getPendingApprovals` | `loadApprovals()` | Autonomy | HAS function (line 6375) |
| `approveAction` | Approval UI | Autonomy | Maps to `approveEmailAction` |
| `rejectAction` | Approval UI | Autonomy | Maps to `rejectEmailAction` |
| `getStyleProfile` | `loadStyle()` | Style & Voice | typeof guard, NO standalone definition |
| `analyzeOwnerStyle` | `analyzeStyle()` | Style & Voice | typeof guard, NO standalone definition |
| `voiceCommand` | Voice input | Style & Voice | Referenced but NO definition found |
| `getFileStats` | `loadFileStats()` | System | typeof guard, NO standalone definition |
| `searchFilesNL` | `searchFiles()` | System | typeof guard, NO standalone definition |
| `getIntegrationStatus` | `loadIntegrations()` | System | HAS function (line 78433) |
| `getAvailableAgents` | `loadAgents()` | System | typeof guard, NO standalone definition |
| `getAgentMetrics` | `loadMetrics()` | System | typeof guard, NO standalone definition |
| `getChiefOfStaffAuditLog` | `loadAuditLog()` | System | HAS function (line 6825) |
| `getTaskPriorities` | Unified Task API | Tasks | HAS action handler (line 16977) |
| `updateUnifiedTask` | Task updates | Tasks | HAS function (line 18504) |
| `logActivity` | Activity logging | System | HAS function (line 29794) |
| `recordTaskAction` | Task action tracking | Tasks | HAS action handler |
| `generateMorningBriefV2` | Morning brief | Dashboard | HAS action handler |
| `getNextPriorityTask` | Priority queue | Tasks | HAS function (line 106821) |
| `getPendingDecisions` | Decision queue | Tasks | Maps to `getPendingDecisionsV2` |
| `getWeatherAwareScheduling` | Weather scheduling | Calendar | Maps to `getWeatherAwareSchedulingSuggestions` |
| `getFarmStats` | Farm statistics | Dashboard | Maps to `getFarmStatsForCOS` |

### TinyPM Brain Endpoints (external server)

Listed in Section 6 above. These are separate from the Google Apps Script API.

---

## 8. Backend Function Mapping

### Fully Implemented Backend Functions (HAS real function definition)

| Function | Line in MERGED TOTAL.js | Description |
|----------|------------------------|-------------|
| `getEmailCategories()` | 4146 | Returns email category counts |
| `getCombinedCommunications()` | 5721 | Merges email + SMS into unified feed |
| `triageInbox()` | 5215 | AI-powered inbox triage |
| `reclassifyEmail()` | 5796 | Change email priority/category |
| `reclassifySMS()` | 5874 | Change SMS priority |
| `getEmailDetail()` | 5942 | Full email thread details |
| `getEmailBodyFast()` | 6005 | Fast email body retrieval |
| `archiveEmail()` | 6036 | Archive email thread |
| `getOpenSMSCommitments()` | 10768 | Open SMS commitment tracking |
| `completeSMSCommitment()` | 10819 | Mark commitment complete |
| `getActionQueue()` | 10845 | Pending action items |
| `chatWithChiefOfStaff()` | 1270 | Main AI conversation (uses Claude) |
| `chatWithChiefOfStaffFast()` | 1175 | Fast AI response (Telegram-optimized) |
| `getPendingApprovals()` | 6375 | Pending approval queue |
| `getChiefOfStaffAuditLog()` | 6825 | Audit log of CoS actions |
| `protectFocusTime()` | 7228 | Block focus time in calendar |
| `getTodaySchedule()` | 8021 | Today's calendar schedule |
| `findMeetingSlots()` | 8028 | Find available meeting times |
| `predictCustomerChurn()` | 11570 | Customer churn risk analysis |
| `forecastWorkload()` | 11920 | 7-day workload forecast |
| `getPredictiveReport()` | 12142 | Combined predictive report |
| `runProactiveScanning()` | 12281 | Proactive alert scanning |
| `getActiveAlerts()` | 12625 | Active alert retrieval |
| `dismissAlert()` | 12671 | Dismiss alert with feedback |
| `getIntegrationStatus()` | 78433 | Connected services status |
| `getAutonomyStatus()` | 97353 | Autonomy level settings |
| `processBrainDump()` | 29641 | Parse brain dump text |
| `logActivity()` | 29794 | Log activity events |
| `getNextPriorityTask()` | 106821 | AI-prioritized next task |

### Stub/Missing Backend Functions (typeof guard, no standalone definition)

| Function | Frontend Expects | Backend Status |
|----------|-----------------|----------------|
| `getProactiveSuggestions()` | Proactive tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `setAutonomyLevel()` | Autonomy tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `getStyleProfile()` | Style & Voice tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `analyzeOwnerStyle()` | Style & Voice tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `getFileStats()` | System tab | No `typeof` guard found, unclear |
| `searchFilesNL()` | System tab | No `typeof` guard found, unclear |
| `getAvailableAgents()` | System tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `getAgentMetrics()` | System tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `getActivePatterns()` | Memory tab | `typeof` guard, returns `{ error: 'Not available' }` |
| `recallContact()` | Memory tab | `typeof` guard, falls back to `getContactProfile()` |
| `voiceCommand` | Style & Voice tab | Referenced in frontend, unclear backend status |

---

## 9. Working vs Placeholder Analysis

### Fully Working (connected to real backend implementations)

1. **Communications Tab** -- All features connected to real email/SMS backend
2. **Action Queue Tab** -- Connected to real action queue system
3. **Commitments Tab** -- Connected to real SMS commitment tracking
4. **Calendar AI Tab** -- All 4 functions have real implementations
5. **Predictive Tab** -- All 3 functions have real implementations
6. **Chat Interface** -- Connected to Claude-powered AI chat
7. **Brain Dump** -- Connected to real text parsing backend
8. **Email Detail Modal** -- Fully connected
9. **Keyboard Shortcuts** -- Frontend-only, fully functional
10. **Command Palette** -- Frontend-only, fully functional
11. **NLP Command Bar** -- Frontend parsing with backend delegation
12. **Z-Pattern Dashboard** -- Frontend-only layout
13. **Disease Risk Assessment** -- Frontend calculation from weather data

### Partially Working (some functions connected, some stub)

14. **Proactive Intelligence Tab** -- Alerts work, suggestions are stub
15. **Autonomy Tab** -- Status and approvals work, `setAutonomyLevel` is stub
16. **Memory Tab** -- `recallContact` has fallback, `getActivePatterns` is stub
17. **System Tab** -- `getIntegrationStatus` and audit log work, file stats/agents are stub

### Placeholder/Stub (backend functions not implemented)

18. **Style & Voice Tab** -- `getStyleProfile` and `analyzeOwnerStyle` return "Not available"
19. **File Organization** -- `getFileStats`, `searchFilesNL` undefined
20. **Agent Management** -- `getAvailableAgents`, `getAgentMetrics` return "Not available"

### Brain Integration

21. **TinyPM Brain** -- Fully implemented in frontend code with graceful degradation. Depends on external Brain server (Render deployment) being online. When offline, all other features work normally.

---

## 10. Performance & UX Patterns

### Caching Strategy

**Two-tier stale-while-revalidate pattern:**

```
Tier 1: In-memory cache (JavaScript Map)
  - Instant access (~0ms)
  - Lost on page reload
  - TTL per-endpoint

Tier 2: localStorage cache
  - Survives page reload
  - ~1-5ms access
  - Fallback when in-memory is empty
```

**Implementation:** The `loadTabData()` function checks cache first, serves stale data immediately, then fetches fresh data in background. UI updates when fresh data arrives.

### Optimistic UI Updates

- Actions (archive, reclassify, complete) update the UI immediately
- Undo capability for reversible actions (e.g., archive has "Undo" toast)
- Background API call confirms or rolls back

### Prefetching

- Adjacent tabs are prefetched when a tab is active
- Prefetch triggered on tab switch, loads next likely tabs
- Uses `requestIdleCallback` when available

### Skeleton Loading

- All tabs show skeleton loaders while data loads
- Prevents layout shift
- Branded with design system colors

### Z-Pattern Dashboard

- Top-left: Critical info (farm stats, weather)
- Top-right: Proactive AI suggestions
- Center: Main content area
- Bottom: Action buttons

---

## 11. Issues & Recommendations

### Critical Issues

1. **Pre-commit hook JS extraction is broken** (See Section 1 for fix)
   - Severity: HIGH -- blocks all commits that modify `chief-of-staff.html`
   - Fix: Update sed extraction in `.git/hooks/pre-commit` lines 259-260

2. **File size is 342KB** -- This is extremely large for a single HTML file
   - All CSS (3311 lines) is inline
   - All JS (4452 + 145 = 4597 lines) is inline
   - Recommendation: Extract CSS to `chief-of-staff.css` and consider splitting JS into modules

### Backend Gaps

3. **11 frontend features call backend functions that don't exist or are stubs:**
   - `getProactiveSuggestions`, `setAutonomyLevel`, `getStyleProfile`, `analyzeOwnerStyle`, `getFileStats`, `searchFilesNL`, `getAvailableAgents`, `getAgentMetrics`, `getActivePatterns`, `recallContact`, `voiceCommand`
   - These all use `typeof` guards with `{ error: 'Not available' }` fallbacks
   - **Impact:** The Style & Voice and System tabs are largely non-functional
   - **Recommendation:** Either implement the backend functions or remove/disable the UI tabs that depend on them

### UX Issues

4. **The Style & Voice tab shows as a tab but returns "Not available" for all operations** -- this creates a confusing user experience. Should show a "Coming Soon" state or be hidden.

5. **The System tab's file organization and agent management sections are non-functional** -- same issue as above.

### Architecture Notes

6. **Brain integration is well-architected** -- graceful degradation, SSE for push, reconnection logic, timing intelligence. This is production-quality code.

7. **The main script block (4452 lines) would benefit from modularization** -- consider extracting into:
   - `chief-of-staff-communications.js`
   - `chief-of-staff-calendar.js`
   - `chief-of-staff-predictive.js`
   - `chief-of-staff-commands.js`
   - etc.

8. **The NLP command bar parser is entirely frontend** -- works for simple commands but could benefit from backend AI parsing for complex/ambiguous commands.

---

## Summary

The Chief of Staff is the most feature-rich page in the Tiny Seed OS, with 10 functional tabs, a persistent AI chat panel, three command systems (NLP bar, command palette, keyboard shortcuts), and an external brain integration layer.

**Of the ~48 API endpoints called by the frontend:**
- ~30 have real backend function implementations (63%)
- ~11 are stubs/missing with `typeof` guards (23%)
- ~7 are TinyPM Brain endpoints (external server) (14%)

**The pre-commit hook syntax error** is NOT caused by a malformed script tag in the HTML. The `<script src="brain-integration.js" async defer></script>` tag at line 8705 is correctly formatted. The error originates in the pre-commit hook's `sed`-based JavaScript extraction logic (`.git/hooks/pre-commit`, line 260), which needs to be updated to properly handle:
1. `<script>` tags with attributes (not just bare `<script>`)
2. `<script src="...">` external script references (should be skipped entirely)
3. Multiple script blocks concatenated into a single validation file

The recommended fix is Option C from Section 1: replace the sed extraction with a Node.js-based extractor that properly skips external scripts and wraps each inline block in an IIFE for isolated scope validation.
