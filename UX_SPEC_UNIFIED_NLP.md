# UX SPECIFICATION: Unified View & Natural Language Interface

**UX Research Team 4: Unified View & Natural Language**
**Created:** 2026-02-01
**Methodology:** Researcher/Builder/Critic
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Phase 1: Research Findings](#phase-1-research-findings)
3. [Phase 2: Design Specifications](#phase-2-design-specifications)
   - [Unified Dashboard](#unified-dashboard)
   - [Natural Language Interface](#natural-language-interface)
   - [Project Generation from Prompts](#project-generation-from-prompts)
   - [Visual WBS Builder](#visual-wbs-builder)
   - [Agentic Sync](#agentic-sync)
4. [Phase 3: Critical Analysis](#phase-3-critical-analysis)
5. [Implementation Roadmap](#implementation-roadmap)

---

## EXECUTIVE SUMMARY

This specification defines the UX for a unified task/calendar/project view with natural language interaction capabilities. The design synthesizes research from Notion's database views, Linear's project management approach, ChatGPT's conversational UI patterns, voice assistant UX principles, and WBS visualization tools.

**Core Design Principles:**
1. **Unified Context** - Tasks, calendar, and projects coexist in one view
2. **Natural Interaction** - Speak or type queries in plain English
3. **Intelligent Scaffolding** - AI generates project structures from descriptions
4. **Ambient Awareness** - Agentic sync keeps everything current without user effort
5. **Progressive Disclosure** - Powerful features without overwhelming complexity

---

## PHASE 1: RESEARCH FINDINGS

### 1.1 Notion's Unified Database Approach

**Key Insights:**
- Notion's September 2025 database redesign introduced multi-source databases that consolidate information from across workspaces into unified views
- Database row-level permissions enable granular access control
- Multiple view types (Kanban, Timeline, Calendar, List) provide flexibility
- The platform eliminates context-switching by combining notes, tasks, projects, wikis, and AI in one workspace
- Visual clarity comes from minimalism - simplified interfaces with clear hierarchy

**Applicable Patterns:**
- Database-first architecture where everything is a connected record
- View switching without data duplication
- Inline property editing
- Relation and rollup fields for cross-referencing

**Sources:**
- [Notion's New UI Design Update - The Organized Notebook](https://theorganizednotebook.com/blogs/blog/notion-new-ui-design-update-june-2025)
- [Notion AI Review 2025 - Max Productive](https://max-productive.ai/ai-tools/notion-ai/)

---

### 1.2 Linear's Project Management Views

**Key Insights:**
- Linear prioritizes speed above all - near-instant view switching and search
- Keyboard-first design with Cmd+K global command menu and "/" for instant filtering
- Clean, minimal interface avoiding clutter - no busy sidebars or excessive tabs
- Dynamic views based on filters - issues appear/disappear as they meet criteria
- Project Views separate from Issue Views, each with distinct filter sets
- Tight design-engineering collaboration with Figma screens shared in comments

**Applicable Patterns:**
- Command palette (Cmd/Ctrl+K) for rapid navigation
- Filter-based dynamic views rather than static folders
- Cycle-based project organization
- Inline issue creation and editing
- Keyboard shortcuts for every action

**Sources:**
- [Linear - Manage Design Projects](https://linear.app/method/manage-design-projects)
- [How to Use Linear - Morgen](https://www.morgen.so/blog-posts/linear-project-management)
- [Linear App Case Study - Eleken](https://www.eleken.co/blog-posts/linear-app-case-study)
- [How We Redesigned the Linear UI - Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)

---

### 1.3 Conversational UI Patterns (ChatGPT & Voice Assistants)

**Key Insights:**

**Conversation Design Patterns:**
1. **Linear Flow/Decision Tree** - Straightforward path with predefined choices
2. **Slot-filling/Form-filling** - Collect information one field at a time
3. **NLU/Intent Recognition** - Understand user intent from natural language
4. **Fallback/Error Handling** - Graceful recovery when input is unclear
5. **Handoff/Escalation** - Transfer to human or alternate support when needed
6. **Context Preservation** - Maintain conversation state across turns
7. **Personalization** - Adapt based on user preferences and history

**Voice Interface Principles:**
- Utterance -> Intent -> Slot filling -> Prompt flow
- Design for synonyms and flexible wording
- Maintain session memory for follow-up questions
- End-Focus Principle: new information at end of sentences
- Linear and ephemeral nature requires careful information chunking
- Verbal and non-verbal feedback cues (chimes, pauses)

**Agentic Capabilities:**
- ChatGPT's agentic system combines website interaction, deep research, and conversational fluency
- Tools should be atomic, model-friendly, with explicit inputs/outputs

**Sources:**
- [Conversation Design Patterns - Rastplatznotizen](https://twobenches.wordpress.com/2023/07/23/conversation-design-patterns-chatgpt/)
- [Introducing ChatGPT Agent - OpenAI](https://openai.com/index/introducing-chatgpt-agent/)
- [Voice User Interface Design - UXPin](https://www.uxpin.com/studio/blog/voice-user-interface/)
- [VUI Design Principles - Parallel HQ](https://www.parallelhq.com/blog/voice-user-interface-vui-design-principles)
- [Speaking the Same Language - Google Design](https://design.google/library/speaking-the-same-language-vui)

---

### 1.4 WBS Visualization Tools

**Key Insights:**
- WBS is a hierarchical, deliverable-oriented deconstruction of project scope
- **100% Rule** (Haugan): WBS must include exactly 100% of work needed, nothing more
- Common formats: Tree diagrams, flowcharts, outlines, Gantt charts
- Most WBS have 3 levels, but can add more as needed
- Modern tools (Miro, Lucidchart) integrate with project management platforms
- Drag-and-drop manipulation is essential for reorganization
- Data import from spreadsheets enables rapid WBS creation
- AI-powered insights help identify missing components

**Applicable Patterns:**
- Tree structure with collapsible nodes
- Horizontal hierarchical lists (Gantt-style)
- Integration with task management for actionable items
- Visual dependency mapping
- Progress rollup from leaves to root

**Sources:**
- [Work Breakdown Structure Guide - ProjectManager](https://www.projectmanager.com/guides/work-breakdown-structure)
- [WBS Creator - Miro](https://miro.com/project-management/work-breakdown-structure/)
- [WBS Software - Lucidchart](https://www.lucidchart.com/pages/examples/work-breakdown-structure-software)
- [WBS Examples - GanttPRO](https://blog.ganttpro.com/en/work-breakdown-structure-example-wbs/)
- [WBS Guide - Asana](https://asana.com/resources/work-breakdown-structure)

---

### 1.5 Unified Dashboard Design Patterns

**Key Insights:**
- Best dashboards limit to 5-6 cards in initial view
- Multiple view options (Timeline, Calendar, Gantt, Kanban) with one-click switching
- Drag-and-drop updates dates and dependencies automatically
- Color coding and icons for quick status identification
- Drill-down functionality for exploring detail
- Merge duplicate events from different sources
- Context-adaptive views (hourly planning vs. project-based)
- Consistency in color, fonts, and patterns across views

**Sources:**
- [Calendar UI Examples - Eleken](https://www.eleken.co/blog-posts/calendar-ui)
- [Dashboard Design Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Dashboard Design Principles 2025 - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Dashboard UX Design Tips - Digiteum](https://www.digiteum.com/dashboard-ux-design-tips-best-practices/)

---

### 1.6 Multi-Source Data Sync

**Key Insights:**
- Two-way sync eliminates context switching (Slack/GitHub/Gmail)
- Real-time sync keeps all team members aligned
- GitHub activity (commits, PRs, issues) can appear in designated channels
- Advanced approach: dump data into Git repo as local knowledge base
- Challenge: actual work context scattered across services
- Unified inbox approach reduces tool sprawl
- Workflow automation (n8n) enables custom sync rules

**Sources:**
- [GitHub Slack Integration - Unito](https://unito.io/integrations/github-slack/)
- [Slack Gmail Integration - Gmelius](https://gmelius.com/blog/slack-gmail-integration)
- [Auto-Sync Slack Gmail Drive Calendar to GitHub - Medium](https://medium.com/@hideyuda/how-to-auto-sync-slack-gmail-drive-and-calendar-to-github-for-better-ai-context-4e3ac397ee01)

---

## PHASE 2: DESIGN SPECIFICATIONS

### UNIFIED DASHBOARD

#### Design Philosophy

The Unified Dashboard embodies the principle of **"One View to Rule Them All"** - a single interface where tasks, calendar events, and project context coexist seamlessly. Users should never need to ask "where is that information?" because everything is accessible from the same screen.

---

#### 2.1 The "One View" Layout

**ASCII Wireframe - Default State:**

```
+-----------------------------------------------------------------------------------+
|  HEADER                                                                            |
|  +-----------------------------------------------------------------------------+  |
|  |  [=] Tiny Seed OS    | "Ask anything..." [Cmd+K]    | [bell] [sync] [avatar] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  VIEW TOGGLE BAR                                                             |  |
|  |  [Timeline]  [Board]  [List]  [Calendar]  [WBS]     | Density: [=] [::] [#]  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  SMART FILTER BAR                                                            |  |
|  |  [All] [My Tasks] [This Week] [Overdue] | Group by: [Project v] | [+ Filter] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +----------------------------------+------------------------------------------+  |
|  |  LEFT PANEL (Context)           |  MAIN CANVAS (Unified View)              |  |
|  |                                 |                                          |  |
|  |  TODAY - Wed, Feb 1             |  +------------------------------------+  |  |
|  |  +--------------------------+   |  |  9:00 AM - Team Standup           |  |  |
|  |  | 9:00 Team Standup        |   |  |  [Calendar] [30 min] [Video]      |  |  |
|  |  | 10:30 Review Designs     |   |  +------------------------------------+  |  |
|  |  | 2:00 Client Call         |   |                                          |  |
|  |  +--------------------------+   |  +------------------------------------+  |  |
|  |                                 |  |  [!] Review logo concepts          |  |  |
|  |  FOCUS TASKS                    |  |  [Task] [Brand Refresh] [Due: Today]|  |  |
|  |  +--------------------------+   |  |  "Client mentioned preferring..."  |  |  |
|  |  | [!] Review logo concepts |   |  +------------------------------------+  |  |
|  |  | [ ] Update wireframes    |   |                                          |  |
|  |  | [ ] Send meeting notes   |   |  +------------------------------------+  |  |
|  |  +--------------------------+   |  |  10:30 AM - Review Designs         |  |  |
|  |                                 |  |  [Calendar] [60 min] [Conference]  |  |  |
|  |  PROJECTS                       |  +------------------------------------+  |  |
|  |  +--------------------------+   |                                          |  |
|  |  | Brand Refresh    [||==] |   |  +------------------------------------+  |  |
|  |  | Mobile App v2    [|===] |   |  |  [ ] Update wireframes             |  |  |
|  |  | Q1 Planning      [||||] |   |  |  [Task] [Mobile App v2] [Due: Fri] |  |  |
|  |  +--------------------------+   |  +------------------------------------+  |  |
|  |                                 |                                          |  |
|  +----------------------------------+------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  ACTIVITY STREAM (collapsible)                                               |  |
|  |  [Slack] Sarah: "Updated the brand deck" 2m ago                             |  |
|  |  [GitHub] PR #234 merged: "Fix nav alignment" 15m ago                       |  |
|  |  [Gmail] Client replied: "Re: Logo Options" 1h ago                          |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

#### 2.2 View Toggle System

**Timeline View (Default)**
```
+-----------------------------------------------------------------------------------+
|  TIMELINE VIEW - Week of Feb 1-7                                 [<] [Today] [>]  |
+-----------------------------------------------------------------------------------+
|           |  Mon 1  |  Tue 2  |  Wed 3  |  Thu 4  |  Fri 5  |  Sat 6  |  Sun 7  |
+-----------+---------+---------+---------+---------+---------+---------+---------+
| Morning   | [=====] |         | [====]  | [==]    |         |         |         |
|           | Review  |         | Design  | Call    |         |         |         |
+-----------+---------+---------+---------+---------+---------+---------+---------+
| Afternoon | [Task]  | [=====] | [Task]  | [=====] | [Task]  |         |         |
|           | Logo    | Sprint  | Wires   | Present | Ship    |         |         |
+-----------+---------+---------+---------+---------+---------+---------+---------+
| Evening   |         |         |         |         | [Party] |         |         |
+-----------+---------+---------+---------+---------+---------+---------+---------+

Legend: [=====] = Calendar Event    [Task] = Task    [----] = Blocked Time
```

**Board View (Kanban)**
```
+-----------------------------------------------------------------------------------+
|  BOARD VIEW - Brand Refresh Project                                               |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+|
|  |  BACKLOG (5)    |  |  IN PROGRESS (3)|  |  REVIEW (2)     |  |  DONE (12)     ||
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+|
|  |                 |  |                 |  |                 |  |                 ||
|  | +-------------+ |  | +-------------+ |  | +-------------+ |  | +-------------+ ||
|  | | Research    | |  | | Logo v2     | |  | | Style guide | |  | | Competitor  | ||
|  | | competitors | |  | | [!] Today   | |  | | @Sarah      | |  | | analysis    | ||
|  | | @Mike       | |  | | 60% done    | |  | | Waiting     | |  | | [check]     | ||
|  | +-------------+ |  | +-------------+ |  | +-------------+ |  | +-------------+ ||
|  |                 |  |                 |  |                 |  |                 ||
|  | +-------------+ |  | +-------------+ |  | +-------------+ |  | +-------------+ ||
|  | | Font        | |  | | Color       | |  | | Mockups     | |  | | Moodboard   | ||
|  | | selection   | |  | | palette     | |  | | @Design     | |  | | [check]     | ||
|  | +-------------+ |  | | @Sarah      | |  | +-------------+ |  | +-------------+ ||
|  |                 |  | +-------------+ |  |                 |  |                 ||
|  | + Add task     |  | + Add task     |  | + Add task     |  |                 ||
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+|
+-----------------------------------------------------------------------------------+
```

**List View (Compact)**
```
+-----------------------------------------------------------------------------------+
|  LIST VIEW - All Tasks                                    [checkbox] Show subtasks|
+-----------------------------------------------------------------------------------+
|  Status    | Task                          | Project        | Due      | Assignee |
+-----------------------------------------------------------------------------------+
|  [!]       | Review logo concepts          | Brand Refresh  | Today    | @me      |
|  [ ]       |   - Compare with competitors  |                |          |          |
|  [ ]       |   - Get client feedback       |                |          |          |
|  [~]       | Update wireframes             | Mobile App v2  | Fri      | @me      |
|  [ ]       | Send meeting notes            | --             | Today    | @me      |
|  [check]   | Competitor analysis           | Brand Refresh  | Done     | @Mike    |
|  [check]   | Create moodboard              | Brand Refresh  | Done     | @Sarah   |
+-----------------------------------------------------------------------------------+
|  [+ Add task...]                                                                   |
+-----------------------------------------------------------------------------------+

Legend: [!] = Urgent    [~] = In Progress    [ ] = Not Started    [check] = Done
```

**Calendar View (Month)**
```
+-----------------------------------------------------------------------------------+
|  CALENDAR VIEW - February 2026                               [<] [Today] [>]      |
+-----------------------------------------------------------------------------------+
|     Mon     |     Tue     |     Wed     |     Thu     |     Fri     |  Weekend   |
+-----------------------------------------------------------------------------------+
|      1      |      2      |      3      |      4      |      5      |    6-7     |
|  [Standup]  |  [Sprint]   |  [Design]   |  [Client]   |  [SHIP!]    |            |
|  [2 tasks]  |  [1 task]   |  [3 tasks]  |  [Present]  |  [Party]    |            |
+-----------------------------------------------------------------------------------+
|      8      |      9      |      10     |      11     |      12     |   13-14    |
|             |             |             |             |             |            |
|             |             |             |             |             |            |
+-----------------------------------------------------------------------------------+

Click any day to see details. Drag tasks to reschedule.
```

---

#### 2.3 Information Density Controls

```
+-----------------------------------------------------------------------------------+
|  DENSITY CONTROLS                                                                  |
+-----------------------------------------------------------------------------------+

  [=] Compact Mode           [::] Comfortable Mode       [#] Expanded Mode
  +-------------------+      +--------------------+      +----------------------+
  | Logo review  Today|      | Logo review        |      | Review logo concepts |
  | Wireframes   Fri  |      | Brand Refresh      |      | Project: Brand Refr  |
  | Meeting notes Today|      | Due: Today  @me    |      | Due: Today, 5:00 PM  |
  +-------------------+      +--------------------+      | Assignee: @me        |
                             | Update wireframes  |      | Priority: High       |
  Best for: Power users      | Mobile App v2      |      | Tags: design, urgent |
  scanning many items        | Due: Fri  @me      |      | "Client mentioned    |
                             +--------------------+      |  they prefer..."     |
                                                         +----------------------+
                             Best for: Daily use
                                                         Best for: Detailed
                                                         planning sessions
```

---

#### 2.4 Smart Filtering and Grouping

**Filter Bar Design:**
```
+-----------------------------------------------------------------------------------+
|  SMART FILTER BAR                                                                  |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  QUICK FILTERS (preset):                                                           |
|  +------+ +----------+ +-----------+ +---------+ +----------+                      |
|  | All  | | My Tasks | | This Week | | Overdue | | Starred  |                      |
|  +------+ +----------+ +-----------+ +---------+ +----------+                      |
|                                                                                    |
|  GROUP BY:                           SORT BY:                                      |
|  +------------------+                +------------------+                          |
|  | Project        v |                | Due Date       v |                          |
|  +------------------+                +------------------+                          |
|  | None             |                | Due Date         |                          |
|  | Project          |                | Priority         |                          |
|  | Status           |                | Created          |                          |
|  | Assignee         |                | Alphabetical     |                          |
|  | Priority         |                | Custom           |                          |
|  | Date             |                +------------------+                          |
|  +------------------+                                                              |
|                                                                                    |
|  CUSTOM FILTERS:                                                                   |
|  +------------------------------------------------------------------------+       |
|  | + Add Filter                                                            |       |
|  |   [Status] [is] [In Progress]                              [x]         |       |
|  |   [AND]                                                                 |       |
|  |   [Due Date] [is before] [End of Week]                     [x]         |       |
|  +------------------------------------------------------------------------+       |
|                                                                                    |
|  [Save as View...]   [Clear All]                                                   |
+-----------------------------------------------------------------------------------+
```

**Saved Views Management:**
```
+-----------------------------------------------------------------------------------+
|  MY VIEWS                                                                          |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  DEFAULT VIEWS:                    CUSTOM VIEWS:                                   |
|  +-------------------+             +-------------------+                           |
|  | All Items         |             | Sprint Tasks      |  [pin] [edit] [x]        |
|  | My Tasks          |             | Client Facing     |  [pin] [edit] [x]        |
|  | This Week         |             | Blocked Items     |  [pin] [edit] [x]        |
|  +-------------------+             +-------------------+                           |
|                                                                                    |
|  [+ Create New View]                                                               |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

### NATURAL LANGUAGE INTERFACE

#### Design Philosophy

The Natural Language Interface transforms how users interact with their work data. Instead of navigating menus and filters, users simply ask questions or give commands in plain English. The system differentiates between "Show me..." queries (read operations) and "Do..." commands (write operations).

---

#### 2.5 "Ask Anything" Search Bar

**Command Palette Design (Cmd+K):**
```
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [magnifying glass]  Ask anything or search...                     [Cmd+K]  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  RECENT QUERIES                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [clock] "What did the client say about the logo?"                          |  |
|  |  [clock] "Show me overdue tasks"                                            |  |
|  |  [clock] "When is the next sprint planning?"                                |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  SUGGESTED QUERIES                                                                 |
|  +-----------------------------------------------------------------------------+  |
|  |  [sparkle] "What's blocking the mobile app release?"                        |  |
|  |  [sparkle] "Summarize yesterday's Slack discussions"                        |  |
|  |  [sparkle] "What tasks are due this week?"                                  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  QUICK ACTIONS                                                                     |
|  +-----------------------------------------------------------------------------+  |
|  |  [+] Create task      [calendar] Add event      [project] New project       |  |
|  |  [search] Find...     [filter] Filter...        [help] Help                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Active Query State:**
```
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [magnifying glass]  What did the client say about the logo?        [Enter] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [sparkle] AI is searching across Slack, Gmail, and project notes...        |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [||||||||||||--------------------]  Searching 3 sources...           |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.6 Query Suggestions and Autocomplete

**Autocomplete Behavior:**
```
+-----------------------------------------------------------------------------------+
|  AUTOCOMPLETE SYSTEM                                                               |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  User types: "show me tasks"                                                       |
|  +-----------------------------------------------------------------------------+  |
|  |  show me tasks|                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|  |  COMPLETIONS                                                                 |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [check] show me tasks assigned to me                                 |  |  |
|  |  |  [check] show me tasks due this week                                  |  |  |
|  |  |  [check] show me tasks for [Brand Refresh]                            |  |  |
|  |  |  [check] show me tasks that are blocked                               |  |  |
|  |  |  [check] show me tasks marked as urgent                               |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  User types: "what did"                                                            |
|  +-----------------------------------------------------------------------------+  |
|  |  what did|                                                                   |  |
|  +-----------------------------------------------------------------------------+  |
|  |  COMPLETIONS                                                                 |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [magnifying glass] what did the client say about...                  |  |  |
|  |  |  [magnifying glass] what did Sarah work on yesterday?                 |  |  |
|  |  |  [magnifying glass] what did we decide about [topic]?                 |  |  |
|  |  |  [magnifying glass] what did I miss in the meeting?                   |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Intent Detection Indicators:**
```
+-----------------------------------------------------------------------------------+
|  INTENT INDICATORS                                                                 |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  READ QUERIES (Show me...):                                                        |
|  +-----------------------------------------------------------------------------+  |
|  |  [eye] "Show me tasks due this week"                                        |  |
|  |  [eye] "What's the status of the Brand Refresh project?"                    |  |
|  |  [eye] "Who's working on the mobile app?"                                   |  |
|  |  [eye] "When did the client last email us?"                                 |  |
|  +-----------------------------------------------------------------------------+  |
|  Icon: [eye] = Read operation, no changes will be made                            |
|                                                                                    |
|  WRITE COMMANDS (Do...):                                                           |
|  +-----------------------------------------------------------------------------+  |
|  |  [pencil] "Create a task to review the designs"                             |  |
|  |  [pencil] "Schedule a meeting with Sarah tomorrow at 2pm"                   |  |
|  |  [pencil] "Mark the logo task as complete"                                  |  |
|  |  [pencil] "Move the sprint to next week"                                    |  |
|  +-----------------------------------------------------------------------------+  |
|  Icon: [pencil] = Write operation, will modify data                               |
|                                                                                    |
|  CONFIRMATION REQUIRED for write operations:                                       |
|  +-----------------------------------------------------------------------------+  |
|  |  [warning] "Schedule a meeting with Sarah tomorrow at 2pm"                  |  |
|  |                                                                              |  |
|  |  This will:                                                                  |  |
|  |  - Create calendar event: "Meeting with Sarah"                              |  |
|  |  - Date: Tomorrow (Feb 2) at 2:00 PM                                        |  |
|  |  - Duration: 30 minutes (default)                                           |  |
|  |  - Invitees: Sarah (sarah@company.com)                                      |  |
|  |                                                                              |  |
|  |  [Confirm]  [Edit Details]  [Cancel]                                        |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.7 Response Presentation

**Card-Based Response:**
```
+-----------------------------------------------------------------------------------+
|  QUERY: "What did the client say about the logo?"                                  |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [sparkle] AI Response                                           [copy] [pin]|  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  Based on emails and Slack messages from the past 2 weeks:                   |  |
|  |                                                                              |  |
|  |  The client (John from Acme Corp) provided feedback on the logo:             |  |
|  |                                                                              |  |
|  |  KEY POINTS:                                                                 |  |
|  |  - Prefers the green color variant over blue                                 |  |
|  |  - Asked if we could make the icon "more dynamic"                            |  |
|  |  - Wants to see how it looks on dark backgrounds                             |  |
|  |  - Timeline: Needs final version by Feb 10                                   |  |
|  |                                                                              |  |
|  |  SOURCES:                                                                    |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [Gmail] Re: Logo Options - Jan 30, 2026                              |  |  |
|  |  |  "I think I prefer the green one, but can we see it more dynamic?"    |  |  |
|  |  |  [View full email ->]                                                 |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [Slack] #brand-refresh - Jan 28, 2026                                |  |  |
|  |  |  "Client called - they want dark mode mockups"                        |  |  |
|  |  |  [View thread ->]                                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  FOLLOW-UP SUGGESTIONS:                                                      |  |
|  |  [+ Create task: "Create dark mode logo mockups"]                           |  |
|  |  [+ Create task: "Make logo more dynamic"]                                  |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**List Response:**
```
+-----------------------------------------------------------------------------------+
|  QUERY: "Show me overdue tasks"                                                    |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  Found 4 overdue tasks                                  [Sort: Due Date v]  |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [!] Finalize Q4 report                                    3 days ago|  |  |
|  |  |  Project: Finance    Assignee: @me    Priority: High                 |  |  |
|  |  |  [Mark Done] [Reschedule] [View]                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [!] Review contractor invoices                            2 days ago|  |  |
|  |  |  Project: Operations    Assignee: @me    Priority: Medium            |  |  |
|  |  |  [Mark Done] [Reschedule] [View]                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [!] Send client update                                    1 day ago |  |  |
|  |  |  Project: Brand Refresh    Assignee: @me    Priority: High           |  |  |
|  |  |  [Mark Done] [Reschedule] [View]                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  QUICK ACTIONS:                                                             |  |
|  |  [Reschedule all to today]  [Create reminder]  [Export list]               |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Highlighted Response:**
```
+-----------------------------------------------------------------------------------+
|  QUERY: "When is the next sprint planning?"                                        |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |      +---------------------------------------------------------------+      |  |
|  |      |                                                               |      |  |
|  |      |   SPRINT PLANNING                                             |      |  |
|  |      |                                                               |      |  |
|  |      |   Tuesday, February 4                                         |      |  |
|  |      |   10:00 AM - 11:30 AM                                         |      |  |
|  |      |   Conference Room B / Zoom                                    |      |  |
|  |      |                                                               |      |  |
|  |      |   Attendees: You, Sarah, Mike, Alex                           |      |  |
|  |      |                                                               |      |  |
|  |      |   [Add to Calendar]  [View Agenda]  [Join Zoom]               |      |  |
|  |      |                                                               |      |  |
|  |      +---------------------------------------------------------------+      |  |
|  |                                                                              |  |
|  |  RELATED:                                                                    |  |
|  |  - Previous sprint planning notes (Jan 21)                                  |  |
|  |  - Sprint backlog (23 items)                                                |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.8 Command Differentiation

**Command Reference Guide:**
```
+-----------------------------------------------------------------------------------+
|  NATURAL LANGUAGE COMMAND REFERENCE                                                |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  QUERY COMMANDS (Read-only):                                                       |
|  +-----------------------------------------------------------------------------+  |
|  |  Pattern              | Example                         | Response Type     |  |
|  +-----------------------+---------------------------------+-------------------+  |
|  |  "Show me..."         | "Show me tasks for Mobile App"  | Filtered list     |  |
|  |  "What is..."         | "What is the project status?"   | Summary card      |  |
|  |  "When is..."         | "When is the deadline?"         | Highlighted date  |  |
|  |  "Who is..."          | "Who is working on this?"       | Person card       |  |
|  |  "Where is..."        | "Where is the design file?"     | Link/location     |  |
|  |  "How many..."        | "How many tasks are overdue?"   | Count card        |  |
|  |  "Find..."            | "Find emails about budget"      | Search results    |  |
|  |  "Summarize..."       | "Summarize yesterday's meeting" | AI summary        |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  ACTION COMMANDS (Write operations):                                               |
|  +-----------------------------------------------------------------------------+  |
|  |  Pattern              | Example                         | Action            |  |
|  +-----------------------+---------------------------------+-------------------+  |
|  |  "Create..."          | "Create a task to review docs"  | New task          |  |
|  |  "Add..."             | "Add meeting tomorrow at 3pm"   | New event         |  |
|  |  "Schedule..."        | "Schedule call with client"     | New event         |  |
|  |  "Mark..."            | "Mark logo task as done"        | Status change     |  |
|  |  "Move..."            | "Move sprint to next week"      | Reschedule        |  |
|  |  "Assign..."          | "Assign wireframes to Sarah"    | Assignment change |  |
|  |  "Delete..."          | "Delete the cancelled meeting"  | Removal (confirm) |  |
|  |  "Update..."          | "Update due date to Friday"     | Field change      |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  COMPOSITE COMMANDS:                                                               |
|  +-----------------------------------------------------------------------------+  |
|  |  "Create a project for the new website with tasks for design, dev, launch"  |  |
|  |  -> Opens Project Generator with pre-filled description                     |  |
|  |                                                                              |  |
|  |  "Schedule weekly standup every Monday at 9am for the next month"           |  |
|  |  -> Creates recurring event with preview                                    |  |
|  |                                                                              |  |
|  |  "Show me what's blocking the release and create tasks to fix them"         |  |
|  |  -> Shows blockers, offers task creation for each                           |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

### PROJECT GENERATION FROM PROMPTS

#### Design Philosophy

Project Generation transforms natural language descriptions into structured project scaffolds. Using AI scaffolding principles, the system breaks down user descriptions into deliverables, tasks, and dependencies - then presents a preview for approval before creation.

---

#### 2.9 Natural Language Project Description Input

**Project Generator Entry Point:**
```
+-----------------------------------------------------------------------------------+
|  NEW PROJECT                                                            [x close] |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [sparkle]  Describe your project in plain English                          |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  +---------------------------------------------------------------------------+|
|  |  |                                                                           ||
|  |  |  We need to rebrand our company. This includes a new logo, updated       ||
|  |  |  brand guidelines, website refresh, and marketing materials. The         ||
|  |  |  client wants to launch in Q2. We'll need design, development, and       ||
|  |  |  copywriting resources.                                                  ||
|  |  |                                                                           ||
|  |  |                                                                           ||
|  |  +---------------------------------------------------------------------------+|
|  |                                                                              |  |
|  |  [Generate Project Scaffold ->]                                              |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  OR START FROM TEMPLATE:                                                           |
|  +-----------------------------------------------------------------------------+  |
|  |  [Software Launch]  [Marketing Campaign]  [Event Planning]  [+ More...]     |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Processing State:**
```
+-----------------------------------------------------------------------------------+
|  GENERATING PROJECT SCAFFOLD                                                       |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [sparkle]  AI is analyzing your description...                             |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [check] Identified key deliverables                                  |  |  |
|  |  |  [check] Determined project phases                                    |  |  |
|  |  |  [loading] Creating task breakdown...                                 |  |  |
|  |  |  [ ] Mapping dependencies                                             |  |  |
|  |  |  [ ] Estimating timeline                                              |  |  |
|  |  |  [ ] Suggesting best practices                                        |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.10 AI-Generated Project Scaffold Preview

**Scaffold Preview:**
```
+-----------------------------------------------------------------------------------+
|  PROJECT SCAFFOLD PREVIEW                                          [Edit] [Reset] |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  PROJECT: Company Rebrand                                                          |
|  Duration: ~12 weeks    Phases: 4    Tasks: 28    Dependencies: 15                |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  PHASE 1: DISCOVERY & STRATEGY (Weeks 1-2)                        [expand] |  |
|  +-----------------------------------------------------------------------------+  |
|  |  +-- Research & Analysis                                                    |  |
|  |  |   +-- Competitive analysis                               [2d] [@design] |  |
|  |  |   +-- Brand audit                                        [3d] [@design] |  |
|  |  |   +-- Stakeholder interviews                             [1w] [@pm]     |  |
|  |  |                                                                          |  |
|  |  +-- Strategy Development                                                   |  |
|  |      +-- Define brand positioning                           [3d] [@design] |  |
|  |      +-- Create brand strategy doc                          [2d] [@pm]     |  |
|  |      +-- Client approval checkpoint                         [--] [GATE]    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  PHASE 2: VISUAL IDENTITY (Weeks 3-5)                            [expand]  |  |
|  +-----------------------------------------------------------------------------+  |
|  |  +-- Logo Design                                                            |  |
|  |  |   +-- Initial concepts (3 directions)                    [1w] [@design] |  |
|  |  |   +-- Client review & feedback                           [--] [GATE]    |  |
|  |  |   +-- Refinement & final selection                       [3d] [@design] |  |
|  |  |   +-- Logo variations & lockups                          [2d] [@design] |  |
|  |  |                                                                          |  |
|  |  +-- Brand Guidelines                                                       |  |
|  |      +-- Color palette definition                           [1d] [@design] |  |
|  |      +-- Typography selection                               [1d] [@design] |  |
|  |      +-- Photography/illustration style                     [2d] [@design] |  |
|  |      +-- Guidelines document                                [3d] [@design] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  PHASE 3: APPLICATION (Weeks 6-9)                               [collapsed] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  PHASE 4: LAUNCH (Weeks 10-12)                                  [collapsed] |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  AI SUGGESTIONS:                                                            |  |
|  |  [lightbulb] Added approval gates between phases (industry best practice)   |  |
|  |  [lightbulb] Suggested 12-week timeline based on similar projects           |  |
|  |  [lightbulb] Included buffer time for client feedback rounds                |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  [Approve & Create Project]    [Edit in WBS Builder]    [Start Over]              |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.11 Edit/Approve Workflow

**Quick Edit Mode:**
```
+-----------------------------------------------------------------------------------+
|  EDIT SCAFFOLD                                                                     |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  PHASE 2: VISUAL IDENTITY                                         [editing] |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  +-- Logo Design                                                            |  |
|  |  |   +-- +-------------------------------------------------------+          |  |
|  |  |   |   | Initial concepts (3 directions)           [1w]        |          |  |
|  |  |   |   +-------------------------------------------------------+          |  |
|  |  |   |         ^                                                            |  |
|  |  |   |         | Click to edit inline                                       |  |
|  |  |   |                                                                      |  |
|  |  |   +-- [+ Add subtask...]                                                 |  |
|  |  |                                                                          |  |
|  |  +-- [+ Add work package...]                                                |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  INLINE EDIT POPOVER:                                                              |
|  +-----------------------------------------------------------------------+        |
|  |  Task: [Initial concepts (3 directions)________________]              |        |
|  |  Duration: [5] [days v]     Assignee: [@design____________ v]         |        |
|  |  Dependencies: [Brand strategy doc (must finish first) v] [+ Add]     |        |
|  |  Notes: [Start with mood board review_____________________]           |        |
|  |                                                                       |        |
|  |  [Save]  [Delete Task]  [Cancel]                                      |        |
|  +-----------------------------------------------------------------------+        |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Approval Confirmation:**
```
+-----------------------------------------------------------------------------------+
|  CREATE PROJECT                                                                    |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  You're about to create:                                                    |  |
|  |                                                                              |  |
|  |  PROJECT: Company Rebrand                                                   |  |
|  |  +---------------------------------------------------------------------+    |  |
|  |  |  4 Phases                                                           |    |  |
|  |  |  28 Tasks                                                           |    |  |
|  |  |  15 Dependencies                                                    |    |  |
|  |  |  Est. Duration: 12 weeks                                            |    |  |
|  |  |  Start Date: Today (Feb 1, 2026)                                    |    |  |
|  |  |  Target End: April 24, 2026                                         |    |  |
|  |  +---------------------------------------------------------------------+    |  |
|  |                                                                              |  |
|  |  NOTIFICATIONS:                                                             |  |
|  |  [ ] Notify team members about new assignments                              |  |
|  |  [x] Add project to dashboard                                               |  |
|  |  [ ] Schedule kickoff meeting                                               |  |
|  |                                                                              |  |
|  |  [Create Project]    [Back to Edit]    [Cancel]                             |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.12 Template Suggestions

**Template Gallery:**
```
+-----------------------------------------------------------------------------------+
|  PROJECT TEMPLATES                                                    [Search...] |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  RECENTLY USED:                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [icon] Sprint Planning     [icon] Feature Launch     [icon] Bug Bash       |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  SOFTWARE DEVELOPMENT:                                                             |
|  +-------------------+  +-------------------+  +-------------------+               |
|  | [icon]            |  | [icon]            |  | [icon]            |               |
|  | Feature Launch    |  | Product Roadmap   |  | Bug Fix Sprint    |               |
|  | 4 phases, 18 tasks|  | 3 phases, 12 tasks|  | 2 phases, 8 tasks |               |
|  | ~6 weeks          |  | Ongoing           |  | ~2 weeks          |               |
|  +-------------------+  +-------------------+  +-------------------+               |
|                                                                                    |
|  MARKETING & DESIGN:                                                               |
|  +-------------------+  +-------------------+  +-------------------+               |
|  | [icon]            |  | [icon]            |  | [icon]            |               |
|  | Brand Refresh     |  | Campaign Launch   |  | Website Redesign  |               |
|  | 4 phases, 28 tasks|  | 3 phases, 15 tasks|  | 5 phases, 32 tasks|               |
|  | ~12 weeks         |  | ~8 weeks          |  | ~16 weeks         |               |
|  +-------------------+  +-------------------+  +-------------------+               |
|                                                                                    |
|  OPERATIONS:                                                                       |
|  +-------------------+  +-------------------+  +-------------------+               |
|  | [icon]            |  | [icon]            |  | [icon]            |               |
|  | Event Planning    |  | Hiring Process    |  | Quarterly Review  |               |
|  | 4 phases, 24 tasks|  | 5 phases, 20 tasks|  | 2 phases, 10 tasks|               |
|  | ~10 weeks         |  | ~6 weeks          |  | ~2 weeks          |               |
|  +-------------------+  +-------------------+  +-------------------+               |
|                                                                                    |
|  [+ Create Custom Template]   [Import from File]                                   |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

### VISUAL WBS BUILDER

#### Design Philosophy

The Visual WBS (Work Breakdown Structure) Builder provides a graphical interface for creating, editing, and visualizing project hierarchies. It follows the 100% rule - ensuring the WBS captures all work needed without scope creep - while making complex project structures intuitive to manipulate.

---

#### 2.13 Hierarchy Visualization

**Tree View (Default):**
```
+-----------------------------------------------------------------------------------+
|  WBS BUILDER - Company Rebrand                              [Tree] [Org] [Outline]|
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  TOOLBAR:                                                                          |
|  [+ Phase] [+ Package] [+ Task]  |  [Expand All] [Collapse]  |  [Zoom -][=][+]    |
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |                        +------------------+                                  |  |
|  |                        | Company Rebrand  |                                  |  |
|  |                        | 100%             |                                  |  |
|  |                        +--------+---------+                                  |  |
|  |                                 |                                            |  |
|  |        +------------+-----------+-----------+------------+                   |  |
|  |        |            |                       |            |                   |  |
|  |  +-----+-----+ +----+-----+          +------+-----+ +----+-----+            |  |
|  |  | Discovery | | Visual   |          | Application| | Launch   |            |  |
|  |  | 15%       | | Identity |          | 35%        | | 25%      |            |  |
|  |  +-----+-----+ | 25%      |          +------+-----+ +----+-----+            |  |
|  |        |       +----+-----+                 |            |                   |  |
|  |        |            |                       |            |                   |  |
|  |   +----+----+  +----+----+            +-----+-----+  +---+---+              |  |
|  |   |Research |  |Logo     |            |Website    |  |Press  |              |  |
|  |   |Strategy |  |Guidelines|            |Materials |  |Launch |              |  |
|  |   +---------+  +---------+            +-----------+  +-------+              |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  PROPERTIES PANEL:                                                                 |
|  +-----------------------------------------------------------------------------+  |
|  |  Selected: Visual Identity                                                   |  |
|  |  Weight: 25%    Children: 2    Tasks: 8    Status: In Progress              |  |
|  |  [Edit] [Add Child] [Delete]                                                |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Org Chart View:**
```
+-----------------------------------------------------------------------------------+
|  WBS BUILDER - Company Rebrand                              [Tree] [Org] [Outline]|
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                        COMPANY REBRAND                                |  |  |
|  |  |                        Progress: 45%                                  |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +----------------+  +----------------+  +----------------+  +------------+  |  |
|  |  | DISCOVERY      |  | VISUAL         |  | APPLICATION    |  | LAUNCH     |  |  |
|  |  | [=====-----]   |  | [========--]   |  | [====------]   |  | [----------]|  |  |
|  |  | 100%           |  | 80%            |  | 40%            |  | 0%         |  |  |
|  |  +----------------+  +----------------+  +----------------+  +------------+  |  |
|  |  |                |  |                |  |                |  |            |  |  |
|  |  | - Research [x] |  | - Logo [~]     |  | - Website [ ]  |  | - Press [ ]|  |  |
|  |  | - Strategy [x] |  | - Guidelines[~]|  | - Materials[ ] |  | - Event [ ]|  |  |
|  |  | - Interviews[x]|  | - Colors [x]   |  | - Templates[ ] |  | - PR [ ]   |  |  |
|  |  +----------------+  +----------------+  +----------------+  +------------+  |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  Legend: [x] Complete  [~] In Progress  [ ] Not Started  [--] Blocked             |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Outline View:**
```
+-----------------------------------------------------------------------------------+
|  WBS BUILDER - Company Rebrand                              [Tree] [Org] [Outline]|
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  #    | Item                              | Weight | Status      | Owner    |  |
|  +-------+-----------------------------------+--------+-------------+----------+  |
|  |  1    | Company Rebrand                   | 100%   | In Progress | @pm      |  |
|  |  1.1  |   Discovery & Strategy            | 15%    | Complete    | @pm      |  |
|  |  1.1.1|     Research & Analysis           | 8%     | Complete    | @design  |  |
|  |  1.1.2|     Strategy Development          | 7%     | Complete    | @pm      |  |
|  |  1.2  |   Visual Identity                 | 25%    | In Progress | @design  |  |
|  |  1.2.1|     Logo Design                   | 15%    | In Progress | @design  |  |
|  |  1.2.2|     Brand Guidelines              | 10%    | In Progress | @design  |  |
|  |  1.3  |   Application                     | 35%    | Not Started | @dev     |  |
|  |  1.3.1|     Website Refresh               | 20%    | Not Started | @dev     |  |
|  |  1.3.2|     Marketing Materials           | 15%    | Not Started | @design  |  |
|  |  1.4  |   Launch                          | 25%    | Not Started | @pm      |  |
|  |  1.4.1|     Press & PR                    | 10%    | Not Started | @mktg    |  |
|  |  1.4.2|     Launch Event                  | 15%    | Not Started | @pm      |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  TOTALS: 4 Phases | 8 Packages | 28 Tasks | Weight: 100%                          |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.14 Drag-Drop Task Organization

**Drag Interaction:**
```
+-----------------------------------------------------------------------------------+
|  DRAG-DROP BEHAVIOR                                                                |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  BEFORE DRAG:                                                                      |
|  +------------------+     +------------------+                                      |
|  | Discovery        |     | Visual Identity  |                                      |
|  +------------------+     +------------------+                                      |
|  | - Research       |     | - Logo           |                                      |
|  | - Strategy       |     | - Guidelines     |                                      |
|  | - Interviews     |     |                  |                                      |
|  +------------------+     +------------------+                                      |
|                                                                                    |
|  DURING DRAG (moving "Strategy" to Visual Identity):                               |
|  +------------------+     +------------------+                                      |
|  | Discovery        |     | Visual Identity  |                                      |
|  +------------------+     +==================+                                      |
|  | - Research       |     | - Logo           |                                      |
|  | - [dragging...] -+---->| +- - - - - - -+  |  <- Drop zone highlighted           |
|  | - Interviews     |     | - Guidelines     |                                      |
|  +------------------+     +------------------+                                      |
|                          [Strategy_____]  <- Ghost element following cursor        |
|                                                                                    |
|  AFTER DROP:                                                                       |
|  +------------------+     +------------------+                                      |
|  | Discovery        |     | Visual Identity  |                                      |
|  +------------------+     +------------------+                                      |
|  | - Research       |     | - Logo           |                                      |
|  | - Interviews     |     | - Strategy [NEW] |  <- Moved item                      |
|  +------------------+     | - Guidelines     |                                      |
|                           +------------------+                                      |
|                                                                                    |
|  [Undo move] appears for 5 seconds after drop                                      |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Multi-Select Drag:**
```
+-----------------------------------------------------------------------------------+
|  MULTI-SELECT DRAG                                                                 |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  Hold Shift+Click to select multiple items:                                        |
|                                                                                    |
|  +------------------+                                                              |
|  | Discovery        |                                                              |
|  +------------------+                                                              |
|  | [x] Research     |  <- Selected (blue highlight)                               |
|  | [x] Strategy     |  <- Selected (blue highlight)                               |
|  | [ ] Interviews   |                                                              |
|  +------------------+                                                              |
|                                                                                    |
|  Drag to move all selected items together.                                         |
|  Badge shows count: [2 items]                                                      |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.15 Auto-Expand from Project Prompt

**AI Expansion Flow:**
```
+-----------------------------------------------------------------------------------+
|  AUTO-EXPAND                                                                       |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  STEP 1: User creates high-level item                                              |
|  +------------------------------------------+                                      |
|  |  [+] Website Refresh                     |                                      |
|  |      (no subtasks)                       |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STEP 2: AI suggests expansion                                                     |
|  +------------------------------------------+                                      |
|  |  [~] Website Refresh                     |                                      |
|  |  +------------------------------------+  |                                      |
|  |  | [sparkle] Expand this item?        |  |                                      |
|  |  |                                    |  |                                      |
|  |  | AI can break this into:            |  |                                      |
|  |  | - Design mockups                   |  |                                      |
|  |  | - Development                      |  |                                      |
|  |  | - Content migration                |  |                                      |
|  |  | - QA & testing                     |  |                                      |
|  |  | - Launch                           |  |                                      |
|  |  |                                    |  |                                      |
|  |  | [Expand]  [Customize]  [No thanks] |  |                                      |
|  |  +------------------------------------+  |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
|  STEP 3: After expansion                                                           |
|  +------------------------------------------+                                      |
|  |  [-] Website Refresh                     |                                      |
|  |      +-- Design mockups                  |                                      |
|  |      |   +-- Homepage                    |                                      |
|  |      |   +-- Product pages               |                                      |
|  |      |   +-- Mobile responsive           |                                      |
|  |      +-- Development                     |                                      |
|  |      |   +-- Frontend build              |                                      |
|  |      |   +-- CMS integration             |                                      |
|  |      |   +-- Performance optimization    |                                      |
|  |      +-- Content migration               |                                      |
|  |      +-- QA & testing                    |                                      |
|  |      +-- Launch                          |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.16 Dependencies Visualization

**Dependency Map View:**
```
+-----------------------------------------------------------------------------------+
|  DEPENDENCY MAP - Company Rebrand                                     [Show: All] |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  WEEK 1-2          WEEK 3-5              WEEK 6-9          WEEK 10-12       |  |
|  |                                                                              |  |
|  |  +--------+                                                                  |  |
|  |  |Research|---+                                                              |  |
|  |  +--------+   |                                                              |  |
|  |               |    +-----------+                                             |  |
|  |  +--------+   +--->|Logo Design|---+                                         |  |
|  |  |Strategy|------->+-----------+   |                                         |  |
|  |  +--------+   |                    |    +----------+                         |  |
|  |               |    +-----------+   +--->| Website  |---+                     |  |
|  |               +--->|Guidelines |------->+----------+   |    +--------+       |  |
|  |                    +-----------+   |                   +--->| Launch |       |  |
|  |                                    |    +----------+   |    +--------+       |  |
|  |                                    +--->| Materials|---+                     |  |
|  |                                         +----------+                         |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  LEGEND:                                                                           |
|  ----> Finish-to-Start (must complete before next begins)                         |
|  ====> Start-to-Start (can start at same time)                                    |
|  [!] Critical path (delays here delay entire project)                             |
|                                                                                    |
|  CRITICAL PATH: Research -> Strategy -> Logo -> Website -> Launch (10 weeks)      |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Add Dependency Interaction:**
```
+-----------------------------------------------------------------------------------+
|  ADD DEPENDENCY                                                                    |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  CLICK+DRAG to create dependency:                                                  |
|                                                                                    |
|  +--------+                    +--------+                                          |
|  | Logo   | ==================>| Website|                                          |
|  | Design | (dragging line)    | Refresh|                                          |
|  +---[o]--+                    +--[o]---+                                          |
|       ^                            ^                                               |
|       |                            |                                               |
|   Connection                   Drop here                                           |
|   point                        to link                                             |
|                                                                                    |
|  DEPENDENCY OPTIONS (after drop):                                                  |
|  +------------------------------------------+                                      |
|  |  Logo Design -> Website Refresh          |                                      |
|  |                                          |                                      |
|  |  Type: [Finish-to-Start v]               |                                      |
|  |  Lag:  [0] days                          |                                      |
|  |                                          |                                      |
|  |  [Create Dependency]  [Cancel]           |                                      |
|  +------------------------------------------+                                      |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

### AGENTIC SYNC

#### Design Philosophy

Agentic Sync creates ambient awareness by automatically pulling relevant information from connected services (Slack, GitHub, Gmail) without requiring user action. The system surfaces what matters while keeping users in control of their data and privacy.

---

#### 2.17 Connected Services Indicator

**Connection Status Bar:**
```
+-----------------------------------------------------------------------------------+
|  HEADER SYNC INDICATOR                                                             |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  Normal state (all connected):                                                     |
|  +-----------------------------------------------------------------------------+  |
|  |  [sync icon: rotating]  All services synced                         [gear]  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  Expanded state (click to expand):                                                 |
|  +-----------------------------------------------------------------------------+  |
|  |  CONNECTED SERVICES                                          [Manage...]    |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  [check] Slack          Last sync: 2 min ago       [pause] [settings]       |  |
|  |          3 workspaces connected                                             |  |
|  |                                                                              |  |
|  |  [check] GitHub         Last sync: 5 min ago       [pause] [settings]       |  |
|  |          2 organizations connected                                          |  |
|  |                                                                              |  |
|  |  [check] Gmail          Last sync: 1 min ago       [pause] [settings]       |  |
|  |          todd@company.com                                                   |  |
|  |                                                                              |  |
|  |  [check] Google Calendar Last sync: 30 sec ago     [pause] [settings]       |  |
|  |          2 calendars syncing                                                |  |
|  |                                                                              |  |
|  |  [x] Notion             Not connected              [+ Connect]              |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  Error state:                                                                      |
|  +-----------------------------------------------------------------------------+  |
|  |  [warning] Slack sync issue                                [Retry] [Dismiss]|  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.18 "Syncing from..." Activity Feed

**Activity Stream Design:**
```
+-----------------------------------------------------------------------------------+
|  ACTIVITY STREAM (bottom of dashboard, collapsible)                   [expand][x] |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  Collapsed state:                                                                  |
|  +-----------------------------------------------------------------------------+  |
|  |  [Slack] Sarah: "Updated the brand deck" | [GitHub] PR merged | [+3 more]   |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  Expanded state:                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  ACTIVITY FEED                                              [Filter: All v] |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  TODAY                                                                       |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [Slack icon]  2 min ago                                              |  |  |
|  |  |  Sarah in #brand-refresh: "Updated the brand deck with new colors"    |  |  |
|  |  |  [View in Slack] [Link to task]                                       |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [GitHub icon]  15 min ago                                            |  |  |
|  |  |  PR #234 merged: "Fix navigation alignment issue"                     |  |  |
|  |  |  by @mikeDev in tiny-seed-os/web-app                                  |  |  |
|  |  |  [View PR] [View related task]                                        |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [Gmail icon]  1 hour ago                                             |  |  |
|  |  |  Client replied: "Re: Logo Options - I prefer the green direction"    |  |  |
|  |  |  From: john@acmecorp.com                                              |  |  |
|  |  |  [View email] [Create task from this]                                 |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [Calendar icon]  2 hours ago                                         |  |  |
|  |  |  Meeting added: "Sprint Planning" - Tomorrow at 10am                  |  |  |
|  |  |  Invited: You, Sarah, Mike, Alex                                      |  |  |
|  |  |  [View event] [Prepare agenda]                                        |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  YESTERDAY                                                                   |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [GitHub icon]  Yesterday at 4:32 PM                                  |  |  |
|  |  |  Issue #89 closed: "Mobile nav doesn't collapse"                      |  |  |
|  |  |  [...]                                                                |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Filter Options:**
```
+-----------------------------------------------------------------------------------+
|  ACTIVITY FILTER                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +---------------------------+                                                     |
|  |  Filter Activity          |                                                     |
|  +---------------------------+                                                     |
|  |  [x] All                  |                                                     |
|  |  [ ] Slack only           |                                                     |
|  |  [ ] GitHub only          |                                                     |
|  |  [ ] Gmail only           |                                                     |
|  |  [ ] Calendar only        |                                                     |
|  +---------------------------+                                                     |
|  |  [ ] Mentions only        |                                                     |
|  |  [ ] High priority        |                                                     |
|  +---------------------------+                                                     |
|  |  Time range: [Today v]    |                                                     |
|  +---------------------------+                                                     |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.19 Conflict Resolution UI

**Conflict Detection:**
```
+-----------------------------------------------------------------------------------+
|  SYNC CONFLICT DETECTED                                                            |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [warning] Conflict: Meeting time changed in both systems                   |  |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  "Sprint Planning" was modified in multiple places:                         |  |
|  |                                                                              |  |
|  |  +------------------------------+  +------------------------------+         |  |
|  |  |  GOOGLE CALENDAR             |  |  TINY SEED OS                |         |  |
|  |  +------------------------------+  +------------------------------+         |  |
|  |  |  Time: Tuesday 10:00 AM      |  |  Time: Tuesday 11:00 AM      |         |  |
|  |  |  Duration: 90 min            |  |  Duration: 60 min            |         |  |
|  |  |  Modified: 10 min ago        |  |  Modified: 5 min ago         |         |  |
|  |  |  By: Sarah                   |  |  By: You                     |         |  |
|  |  +------------------------------+  +------------------------------+         |  |
|  |                                                                              |  |
|  |  RESOLUTION:                                                                 |  |
|  |  ( ) Keep Google Calendar version (10:00 AM, 90 min)                        |  |
|  |  (*) Keep Tiny Seed OS version (11:00 AM, 60 min)                           |  |
|  |  ( ) Keep both as separate events                                           |  |
|  |  ( ) Merge (I'll specify details)                                           |  |
|  |                                                                              |  |
|  |  [ ] Apply this resolution to future conflicts for this event               |  |
|  |                                                                              |  |
|  |  [Resolve Conflict]    [Skip for Now]    [View History]                     |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Batch Conflict Resolution:**
```
+-----------------------------------------------------------------------------------+
|  MULTIPLE CONFLICTS DETECTED (3)                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  [1/3] Meeting: Sprint Planning                                              |  |
|  |  Time conflict between Google Calendar and Tiny Seed OS                     |  |
|  |  [Keep GCal] [Keep TSO] [Skip]                                              |  |
|  +-----------------------------------------------------------------------------+  |
|  |  [2/3] Task: Update wireframes                                               |  |
|  |  Due date conflict between Slack reminder and Tiny Seed OS                  |  |
|  |  [Keep Slack] [Keep TSO] [Skip]                                             |  |
|  +-----------------------------------------------------------------------------+  |
|  |  [3/3] Event: Client Call                                                    |  |
|  |  Duplicate detected from Gmail invite                                       |  |
|  |  [Merge] [Keep Both] [Skip]                                                 |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  [Resolve All with Defaults]    [Review Each]    [Skip All]                       |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

#### 2.20 Privacy Controls for Synced Data

**Privacy Settings Panel:**
```
+-----------------------------------------------------------------------------------+
|  SYNC PRIVACY SETTINGS                                                    [Save]  |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  DATA SYNC CONTROLS                                                                |
|  +-----------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  SLACK                                                                       |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Channels to sync:                                                    |  |  |
|  |  |  [x] #brand-refresh                                                   |  |  |
|  |  |  [x] #mobile-app                                                      |  |  |
|  |  |  [ ] #general (excluded)                                              |  |  |
|  |  |  [ ] #random (excluded)                                               |  |  |
|  |  |  [+ Add channel...]                                                   |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Data retention: [30 days v]                                          |  |  |
|  |  |  [x] Index message content for search                                 |  |  |
|  |  |  [ ] Include file attachments                                         |  |  |
|  |  |  [x] Show in activity feed                                            |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  GMAIL                                                                       |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Sync scope:                                                          |  |  |
|  |  |  ( ) All emails                                                       |  |  |
|  |  |  (*) Only labeled emails [Work, Clients, Projects]                    |  |  |
|  |  |  ( ) Only specific senders                                            |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [ ] Index full email body (more accurate search)                     |  |  |
|  |  |  [x] Index subject and sender only (more private)                     |  |  |
|  |  |  [ ] Include attachments                                              |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  |  GITHUB                                                                      |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  Repositories to sync:                                                |  |  |
|  |  |  [x] tiny-seed-os/web-app                                             |  |  |
|  |  |  [x] tiny-seed-os/mobile                                              |  |  |
|  |  |  [ ] personal/experiments (excluded)                                  |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |  [x] Issues and PRs                                                   |  |  |
|  |  |  [x] Commits and branches                                             |  |  |
|  |  |  [ ] Code content                                                     |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |                                                                              |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  DATA MANAGEMENT                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |  [Download My Data]  [Delete All Synced Data]  [View Audit Log]             |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

**Sync Visibility Toggle:**
```
+-----------------------------------------------------------------------------------+
|  QUICK PRIVACY TOGGLES (in activity stream header)                                 |
+-----------------------------------------------------------------------------------+
|                                                                                    |
|  +-----------------------------------------------------------------------------+  |
|  |  Show in activity:  [Slack: ON]  [GitHub: ON]  [Gmail: OFF]  [Cal: ON]      |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                    |
|  Clicking a toggle immediately hides/shows that source in the feed.               |
|  Gmail set to OFF = emails won't appear in stream until turned back on.           |
|                                                                                    |
+-----------------------------------------------------------------------------------+
```

---

## PHASE 3: CRITICAL ANALYSIS

### Critic Evaluation

#### 3.1 Is the Unified View Overwhelming or Empowering?

**Assessment: EMPOWERING (with caveats)**

**Strengths:**
1. Progressive disclosure prevents information overload - users see what they need
2. View toggles let users choose their preferred mental model (timeline vs board vs list)
3. Information density controls accommodate both power users and casual users
4. Left panel provides context without cluttering the main canvas
5. Smart filters reduce cognitive load by hiding irrelevant items

**Risks:**
1. First-time users may feel lost without onboarding
2. Too many view options could create decision paralysis
3. Activity stream could become noisy without good defaults

**Mitigations:**
1. Implement guided onboarding that introduces one feature at a time
2. Set intelligent defaults (Timeline view, Comfortable density)
3. Activity stream collapsed by default, with smart notification badges

**Rating: 8/10**

---

#### 3.2 Is NLP Accurate Enough to Trust?

**Assessment: CONDITIONAL TRUST**

**Strengths:**
1. Clear visual differentiation between read (eye icon) and write (pencil icon) operations
2. Confirmation required for all write operations prevents accidental changes
3. Source citations in responses let users verify AI claims
4. Fallback suggestions when intent is unclear
5. Recent/suggested queries reduce need for free-form typing

**Risks:**
1. Ambiguous queries may produce incorrect results
2. Users may over-trust AI summaries without checking sources
3. Write commands could misinterpret user intent

**Mitigations:**
1. Always show confidence indicators for uncertain interpretations
2. Sources prominently displayed and clickable for verification
3. Preview all write operations before execution
4. "Did you mean...?" clarification when multiple interpretations possible

**Rating: 7/10** (accuracy depends heavily on underlying LLM quality)

---

#### 3.3 Component Ratings Summary

| Component | Rating | Strengths | Improvement Needed |
|-----------|--------|-----------|-------------------|
| **Unified Dashboard** | 8/10 | Flexible views, good density controls | Needs onboarding flow |
| **View Toggle System** | 9/10 | Comprehensive options, instant switching | Could add custom view builder |
| **Smart Filtering** | 8/10 | Powerful filters, saved views | Complex filter builder may intimidate |
| **NLP Search Bar** | 7/10 | Intuitive command palette, good suggestions | Accuracy depends on AI model |
| **Query Response Cards** | 8/10 | Clear presentation, actionable follow-ups | Long responses need better pagination |
| **Command Differentiation** | 9/10 | Clear read/write distinction, confirmations | None |
| **Project Generation** | 8/10 | AI scaffolding is powerful, good preview | May over-generate for simple projects |
| **Template System** | 7/10 | Good starting point | Needs more diverse templates |
| **WBS Tree View** | 9/10 | Clear hierarchy, multiple views | Could add more visualization options |
| **Drag-Drop Organization** | 8/10 | Intuitive, supports multi-select | Needs undo for accidental drops |
| **Auto-Expand** | 7/10 | Smart suggestions | May feel too "magic" for control-oriented users |
| **Dependency Visualization** | 8/10 | Clear critical path | Complex projects may get cluttered |
| **Agentic Sync Indicator** | 8/10 | Good visibility into sync status | Needs better error recovery |
| **Activity Stream** | 7/10 | Comprehensive, filterable | Could get noisy, needs smart prioritization |
| **Conflict Resolution** | 9/10 | Clear choices, batch handling | None |
| **Privacy Controls** | 9/10 | Granular, comprehensive | None |

**Overall System Rating: 8/10**

---

#### 3.4 Key Recommendations

1. **Onboarding is Critical**: The unified view's power becomes overwhelming without proper introduction. Implement a progressive onboarding that unlocks features over time.

2. **Default to Safety**: NLP write commands should always require confirmation. Never auto-execute destructive actions.

3. **Trust but Verify**: AI responses should always cite sources. Users need a path to verify claims.

4. **Noise Reduction**: Activity stream and sync notifications need smart prioritization based on user behavior and context.

5. **Escape Hatches**: Every AI-assisted feature should have a manual override. Users should never feel trapped by automation.

6. **Performance is UX**: Following Linear's example, ensure all view switches, searches, and filters feel instant (<100ms perceived latency).

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)
- Implement unified dashboard layout with view toggles
- Build basic filter and sort functionality
- Create component library for cards, buttons, forms
- Establish data model for tasks/calendar/projects unification

### Phase 2: Natural Language (Weeks 5-8)
- Implement command palette (Cmd+K)
- Build NLP intent recognition for read queries
- Create response card templates
- Add query history and suggestions

### Phase 3: Project Generation (Weeks 9-12)
- Build project prompt input interface
- Integrate AI scaffolding for project breakdown
- Implement scaffold preview and edit workflow
- Create template gallery

### Phase 4: WBS Builder (Weeks 13-16)
- Build tree, org chart, and outline views
- Implement drag-drop with multi-select
- Add auto-expand AI suggestions
- Create dependency visualization and editing

### Phase 5: Agentic Sync (Weeks 17-20)
- Build OAuth connections for Slack, GitHub, Gmail
- Implement two-way sync with conflict detection
- Create activity stream with filters
- Add privacy controls and data management

### Phase 6: Polish & Integration (Weeks 21-24)
- Cross-feature integration testing
- Performance optimization
- Onboarding flow creation
- User testing and iteration

---

## APPENDIX: DESIGN TOKENS

```css
/* Unified View Design Tokens */
:root {
    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    --space-2xl: 48px;

    /* Component Sizes */
    --sidebar-width: 260px;
    --sidebar-collapsed: 60px;
    --header-height: 64px;
    --left-panel-width: 280px;
    --activity-stream-height: 200px;

    /* Card Dimensions */
    --card-border-radius: 12px;
    --card-padding: 16px;
    --card-gap: 16px;

    /* Button Sizes */
    --btn-height-sm: 32px;
    --btn-height-md: 40px;
    --btn-height-lg: 48px;

    /* Transitions */
    --transition-fast: 100ms ease;
    --transition-normal: 200ms ease;
    --transition-slow: 300ms ease;

    /* Z-Index Layers */
    --z-dropdown: 100;
    --z-modal: 200;
    --z-command-palette: 300;
    --z-toast: 400;

    /* NLP-Specific */
    --query-bar-height: 48px;
    --suggestion-item-height: 40px;
    --response-card-max-height: 60vh;

    /* WBS-Specific */
    --wbs-node-width: 160px;
    --wbs-node-height: 80px;
    --wbs-node-gap: 40px;
    --wbs-line-color: var(--border);
    --wbs-critical-color: var(--danger);
}
```

---

## APPENDIX: INTERACTION SPECIFICATIONS

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + N` | New task |
| `Cmd/Ctrl + Shift + N` | New project |
| `Cmd/Ctrl + /` | Toggle sidebar |
| `1-5` | Switch views (Timeline/Board/List/Calendar/WBS) |
| `F` | Open filters |
| `G` | Open grouping |
| `Esc` | Close modal/palette |
| `Enter` | Confirm action |
| `Tab` | Next suggestion |
| `Shift + Tab` | Previous suggestion |

### Touch Gestures (Mobile)

| Gesture | Action |
|---------|--------|
| Swipe left on task | Quick actions menu |
| Swipe right on task | Complete task |
| Long press | Multi-select mode |
| Pinch | Zoom in/out (WBS) |
| Two-finger swipe | Pan (WBS) |
| Pull down | Refresh sync |

---

*End of UX Specification: Unified View & Natural Language Interface*
*Version 1.0 - February 2026*
