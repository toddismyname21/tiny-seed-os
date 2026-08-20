# Agentic Team 2026 Update: Claude Code Multi-Agent Coordination

**Research Date:** 2026-02-24
**Purpose:** Comprehensive update on multi-agent Claude Code patterns since Feb 12, 2026
**Scope:** Agent Teams (Swarms), Cowork, claude-flow, CLAUDE.md patterns, coordination mechanisms, and optimal team structures for Tiny Seed OS

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Claude Code Agent Teams (Swarms) Deep Dive](#2-claude-code-agent-teams-swarms-deep-dive)
3. [Cowork and Claude Desktop Agent Mode](#3-cowork-and-claude-desktop-agent-mode)
4. [claude-flow (Third-Party Orchestrator)](#4-claude-flow-third-party-orchestrator)
5. [Best CLAUDE.md and System Prompt Patterns for Agent Roles](#5-best-claudemd-and-system-prompt-patterns-for-agent-roles)
6. [February 2026 New Developments](#6-february-2026-new-developments)
7. [Real Production Multi-Claude Setups](#7-real-production-multi-claude-setups)
8. [Optimal Team Structure for Tiny Seed OS](#8-optimal-team-structure-for-tiny-seed-os)
9. [File-Based vs API-Based vs MCP Coordination](#9-file-based-vs-api-based-vs-mcp-coordination)
10. [Ready-to-Use Prompt Templates for Each Role](#10-ready-to-use-prompt-templates-for-each-role)
11. [Migration Plan: Current System to Agent Teams](#11-migration-plan-current-system-to-agent-teams)
12. [Sources](#12-sources)

---

## 1. Executive Summary

### What Has Changed Since Feb 12, 2026

The landscape has shifted significantly in 12 days:

| Area | Feb 12 State | Feb 24 State |
|------|-------------|-------------|
| **Official Multi-Agent** | Subagents only (within single session) | **Agent Teams (Swarms)** launched with Opus 4.6 on Feb 5 |
| **Coordination** | File-based INBOX/OUTBOX (custom) | Built-in shared task list + mailbox messaging |
| **Team Lead Pattern** | Manual PM_Architect terminal | Official "Team Lead" role with delegate mode |
| **Verification** | Custom governor/verification scripts | **TeammateIdle** and **TaskCompleted** hooks |
| **Agent Definition** | Copy-paste prompts per terminal | `.claude/agents/` directory with YAML frontmatter |
| **Isolation** | Git worktrees (manual) | `isolation: worktree` in agent config (declarative) |
| **Memory** | Custom `.pm_memory.json` | Official `memory: user/project/local` per subagent |
| **Cowork** | Not available | Desktop agent mode in research preview |
| **claude-flow** | Existed but early | v2.0 with MCP protocol, swarm intelligence |

### The Big Takeaway

**Anthropic has built most of what Tiny Seed OS was trying to build manually.** The custom INBOX/OUTBOX file coordination, the PM_Architect terminal, the verification pipeline, the Governor system -- all of these now have official (or near-official) equivalents. The path forward is to adopt the native Agent Teams system and layer Tiny Seed OS-specific configuration on top, rather than maintaining custom coordination infrastructure.

### Key Recommendations

1. **Adopt Agent Teams** (native) over custom INBOX/OUTBOX coordination
2. **Reduce CLAUDE.md from 942 lines to under 200** -- use pointers, not content
3. **Move agent definitions to `.claude/agents/`** as Markdown files with YAML frontmatter
4. **Use hooks for verification gates** instead of custom governor scripts
5. **Keep 3-4 agents max** for Tiny Seed OS's scope (down from current 5+)
6. **Use subagents for quick tasks**, Agent Teams for parallel implementation work

---

## 2. Claude Code Agent Teams (Swarms) Deep Dive

### What Are Agent Teams?

Agent Teams (also called "Swarms") are Anthropic's official multi-agent coordination system for Claude Code, released February 5, 2026 with Opus 4.6. They replace the need for manual multi-terminal coordination.

### How to Enable

```json
// In ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Architecture

| Component | Role |
|-----------|------|
| **Team Lead** | Main Claude Code session that creates the team, spawns teammates, coordinates work |
| **Teammates** | Separate Claude Code instances, each with its own context window |
| **Task List** | Shared list of work items with dependency tracking |
| **Mailbox** | File-based messaging system for inter-agent communication |

Storage locations:
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`
- Inboxes: `~/.claude/<teamName>/inboxes/<agentName>.json` (JSONL format)

### Key Operations (TeammateTool)

TeammateTool provides 13 operations:

| Operation | Purpose |
|-----------|---------|
| `spawnTeam` | Create a new team and spawn teammates |
| `discoverTeams` | Find existing teams |
| `requestJoin` | Join an existing team |
| `approveJoin` | Approve a join request |
| `requestShutdown` | Ask a teammate to shut down |
| `message` | Send to one specific teammate |
| `broadcast` | Send to all teammates (use sparingly -- costs scale with team size) |
| `shutdown_request` | Send shutdown signal |
| `shutdown_response` | Respond to shutdown signal |
| `plan_approval_response` | Approve or reject a teammate's plan |
| `TaskCreate` | Create a new task |
| `TaskUpdate` | Update task status |
| `TaskList` | List all tasks |

### Task States

Tasks flow through: **pending** -> **in progress** -> **completed**

Tasks support dependency tracking. A pending task with unresolved dependencies cannot be claimed until those dependencies are completed. Teammates self-claim the next available unblocked task when they finish their current one. File locking prevents race conditions.

### Display Modes

| Mode | Description | Requirements |
|------|-------------|-------------|
| **In-process** (default) | All teammates in main terminal. Shift+Down to cycle. | Any terminal |
| **Split panes** | Each teammate gets its own pane | tmux or iTerm2 |
| **Auto** (default setting) | Uses split panes in tmux, in-process otherwise | Depends |

Configure in settings.json:
```json
{ "teammateMode": "in-process" }
```

Or per-session: `claude --teammate-mode in-process`

### Delegate Mode

Press Shift+Tab after starting a team to lock the lead into coordination-only mode. The lead can ONLY:
- Spawn teammates
- Send messages
- Manage the task list
- Shut down workers

It CANNOT write code, run tests, or do implementation work. This prevents the common problem where the lead starts implementing instead of coordinating.

**Known Bug (Feb 2026):** Delegate mode can cause teammates to inherit the lead's restricted tool access. If teammates suddenly cannot read files or write code, this is the cause.

### Plan Approval Workflow

For complex or risky tasks, you can require teammates to plan before implementing:

```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

The teammate works in read-only plan mode until the lead approves. If rejected, the teammate revises and resubmits.

### Quality Gate Hooks

Two critical hooks for verification:

**TeammateIdle Hook** -- Runs when a teammate is about to go idle:
```json
{
  "hooks": {
    "TeammateIdle": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/verify-teammate-work.sh"
      }]
    }]
  }
}
```
Exit code 2 = teammate receives stderr as feedback and continues working.

**TaskCompleted Hook** -- Runs when a task is being marked complete:
```json
{
  "hooks": {
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/verify-task-complete.sh"
      }]
    }]
  }
}
```
Exit code 2 = task stays open, stderr fed back as feedback.

### Best Practices from Official Docs

1. **Start with 3-5 teammates** for most workflows
2. **5-6 tasks per teammate** keeps everyone productive
3. **Give rich context in spawn prompts** -- teammates get CLAUDE.md but NOT the lead's conversation history
4. **Avoid file conflicts** -- each teammate should own different files
5. **Monitor and steer** -- check in on progress, redirect approaches that are not working
6. **Wait for teammates** -- sometimes the lead starts implementing itself; tell it to wait

### Limitations (Current)

- No session resumption with in-process teammates
- Task status can lag (teammates forget to mark complete)
- Shutdown can be slow (teammates finish current tool call first)
- One team per session
- No nested teams (teammates cannot spawn their own teams)
- Lead is fixed for team lifetime
- Permissions set at spawn time for all teammates
- Split panes require tmux or iTerm2 (not VS Code terminal, Windows Terminal, or Ghostty)

### Agent Teams vs Subagents

| | Subagents | Agent Teams |
|---|-----------|-------------|
| **Context** | Own context, results return to caller | Own context, fully independent |
| **Communication** | Report results back only | Message each other directly |
| **Coordination** | Main agent manages all | Shared task list, self-coordination |
| **Best for** | Focused tasks where only result matters | Complex work needing discussion |
| **Token cost** | Lower (results summarized) | Higher (each is a separate instance) |
| **Use when** | Quick focused workers | Teammates need to share findings and coordinate |

### Token Cost Reality

- Solo session: ~200k tokens
- Team of 3: ~800k tokens
- Team of 5: ~1.2M+ tokens
- Multi-agent systems use approximately 15x more tokens than single chats

**Best recipe:** Plan first with Plan Mode (cheap), then hand the plan to a team for parallel execution (expensive but fast).

---

## 3. Cowork and Claude Desktop Agent Mode

### What Is Cowork?

Cowork is a research preview that brings Claude Code's agentic capabilities to Claude Desktop for knowledge work beyond coding. It uses the same agentic architecture that powers Claude Code but is accessible without opening a terminal.

### How It Works

1. Claude analyzes your request and creates a plan
2. Breaks complex work into subtasks when needed
3. Executes work in a virtual machine (VM) environment
4. Coordinates multiple workstreams in parallel
5. Delivers finished outputs directly to your file system

### Sub-Agent Coordination in Cowork

Cowork can spawn sub-agents -- independent Claude instances that each get their own context -- to work on different parts of a task simultaneously. The lead agent:
- Understands the overall task
- Decomposes into subtasks
- Delegates to specialized subagents
- Maintains oversight
- Monitors progress
- Handles coordination between subagents
- Synthesizes results

### Relevance to Tiny Seed OS

Cowork is primarily for non-coding knowledge work (document writing, research, analysis). For the Tiny Seed OS codebase, **Agent Teams in Claude Code** is the correct tool. However, Cowork could be useful for:
- Generating marketing content plans
- Drafting business documents
- Research tasks that do not involve code changes

---

## 4. claude-flow (Third-Party Orchestrator)

### What Is It?

claude-flow is a third-party npm package by ruvnet that provides an orchestration layer on top of Claude Code. It is described as "the leading agent orchestration platform for Claude" and uses MCP protocol for coordination.

### Installation

```bash
npm install -g @anthropic-ai/claude-code
claude --dangerously-skip-permissions
npm install -g claude-flow@alpha
claude-flow --version
claude-flow init
```

Or one-line install:
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/claude-flow@main/scripts/install.sh | bash
```

### Key Features

- **Swarm Intelligence:** Agents organize into swarms led by queens that coordinate work
- **MCP Integration:** Uses MCP tools as the "brain" that plans and coordinates
- **SPARC Modes:** Development modes for different tasks
- **Fault-Tolerant Consensus:** Continues working even when some agents fail
- **60+ Specialized Agents:** Pre-built agent types

### Usage

```bash
# Create mesh topology
claude-flow hive init --topology mesh --agents 3

# SPARC development mode
claude-flow sparc run dev "build REST API"

# Orchestrate with parallel agents
claude-flow orchestrate "create a hello world API with tests" --agents 3 --parallel
```

### Assessment for Tiny Seed OS

**Not recommended as primary solution.** Reasons:
1. Anthropic's native Agent Teams provides the core functionality needed
2. claude-flow adds another dependency and abstraction layer
3. The "60+ specialized agents" and "swarm intelligence" features are overkill for a farm tech startup
4. Native Agent Teams integrates better with CLAUDE.md, hooks, and the Claude Code ecosystem
5. claude-flow requires `--dangerously-skip-permissions` which raises security concerns

**However**, claude-flow's SPARC development modes and MCP coordination protocol are worth studying for patterns that could be applied to the native Agent Teams setup.

---

## 5. Best CLAUDE.md and System Prompt Patterns for Agent Roles

### The Core Problem with Tiny Seed OS's CLAUDE.md

The current CLAUDE.md is **942 lines**. This is a critical problem.

Industry consensus (from HumanLayer, Anthropic official docs, and community practitioners) is:

> "An over-specified CLAUDE.md where important rules get lost in noise is a common problem. Your CLAUDE.md file should contain as few instructions as possible -- ideally only ones which are universally applicable to your task."

Claude Code's system prompt already contains ~50 individual instructions. Adding 942 lines means the agent is processing ~1,000+ instructions. Research shows:

- Important rules get lost in the noise
- Claude may ignore instructions when the file is too long
- Context tokens spent on CLAUDE.md are tokens NOT spent on actual work
- Each teammate independently loads CLAUDE.md, multiplying the waste

### The Solution: Pointers, Not Content

**Before (bad):**
```markdown
# CLAUDE.md (942 lines)
## Step 0: Read context snapshot...
## Step 1: Identify your role...
## Step 2: Check configuration...
[... 900 more lines of instructions ...]
```

**After (good):**
```markdown
# CLAUDE.md (~100 lines)

## Build & Test
- Run tests: `npm test`
- Lint: `npm run lint`
- Deploy Apps Script: `clasp push && clasp deploy -i AKfycby...`

## API Configuration
- Use `web_app/api-config.js` for all API URLs. Never hardcode.
- Main API: `https://script.google.com/macros/s/AKfycby.../exec`

## Code Style
- ES modules (import/export), not CommonJS
- No demo/sample data fallbacks -- show errors instead
- Check for duplicates before creating new files

## Key References
- System manifest: @claude_sessions/pm_architect/SYSTEM_MANIFEST.md
- Change log: @CHANGE_LOG.md
- Agent roles: @claude_sessions/pm_architect/CLAUDE_ROLES.md
- Deployment protocol: @claude_sessions/pm_architect/DEPLOYMENT_PROTOCOL.md

## Critical Rules
- NEVER create new Morning Brief, Approval, or Email Processing systems
- NEVER deploy without updating CHANGE_LOG.md
- Always verify HTML/JS element references: `./scripts/validate-element-refs.sh`
- External website changes require explicit user approval before publish
```

### The 4-Block Pattern for Agent Prompts

The optimal structure for agent system prompts is:

```
You are: [role - one line]
Goal: [what success looks like]
Constraints: [list]
If unsure: Say so explicitly
Output format: [structure]
```

### Agent-Specific CLAUDE.md Files

Instead of one massive CLAUDE.md, use the official subagent system:

```
.claude/
  agents/
    pm-architect.md      # PM coordinator agent
    backend-builder.md   # Apps Script builder
    frontend-builder.md  # HTML/CSS/JS builder
    verifier.md          # Quality verification agent
```

Each agent file is a focused Markdown file with YAML frontmatter. This is FAR better than the current TERMINAL_QUICK_START_GUIDES.md approach because:

1. Agents are loaded automatically by Claude Code
2. Each agent gets only its relevant context
3. Tool access can be restricted per agent
4. Models can be specified per agent (e.g., Haiku for read-only tasks)
5. Hooks can be scoped to specific agents
6. Memory can persist across sessions

### Community Pattern: Documentation Pointers

```markdown
# CLAUDE.md

## Reference Documentation
The following files contain detailed instructions. Read them when relevant:
- `docs/api-conventions.md` - REST API patterns
- `docs/testing-guide.md` - How to write and run tests
- `docs/deployment.md` - Deployment procedures

DO NOT read all of these at session start. Only read the ones relevant to your current task.
```

This pattern keeps CLAUDE.md lean while maintaining access to detailed docs.

### Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Fix |
|-------------|-------------|-----|
| 942-line CLAUDE.md | Rules get lost in noise | Prune to <200 lines, use pointers |
| Copying code examples into CLAUDE.md | They become stale | Use `@file:line` references |
| "NEVER do X" x 14 | Diminishing impact | Consolidate to 3-5 critical rules |
| Detailed file inventories | Claude can read the filesystem | Let Claude discover via Glob/Grep |
| Repeating the same rule | Wastes tokens | State once, clearly |
| Session context at bottom | Stale between sessions | Use dynamic context (hooks/scripts) |

---

## 6. February 2026 New Developments

### Since the Feb 12 Research

| Date | Feature | Significance |
|------|---------|-------------|
| Feb 5 | **Agent Teams launched** with Opus 4.6 | Built-in multi-agent coordination |
| Feb 5 | **Opus 4.6 model** | Better agentic reasoning, improved tool use |
| Feb ~10 | **Custom subagents** `.claude/agents/` | Markdown files with YAML frontmatter |
| Feb ~15 | **Plugins marketplace** | `/plugin` to browse and install |
| Feb 19 | **v2.1.49** | Fixed Ctrl+C/ESC for background agents |
| Feb 20 | **v2.1.50** | `WorktreeCreate`/`WorktreeRemove` hooks, `isolation: worktree` |
| Feb 20 | **Persistent memory for subagents** | `memory: user/project/local` scope |
| Feb 24 | **v2.1.52** | Bug fixes, stability improvements |

### Key New Capabilities

**1. Agent Definition Files (`.claude/agents/`)**

```markdown
---
name: backend-builder
description: Apps Script backend developer for Google Sheets integration
tools: Read, Edit, Write, Bash, Grep, Glob
model: opus
memory: project
---

You are a backend developer specializing in Google Apps Script...
```

**2. Isolation via Worktrees**

Agents can now declaratively run in isolated git worktrees:
```yaml
---
name: experimental-refactor
isolation: worktree
---
```
The worktree is automatically cleaned up if the agent makes no changes.

**3. Persistent Agent Memory**

Agents can maintain knowledge across sessions:
```yaml
---
name: code-reviewer
memory: project
---
```
This creates `.claude/agent-memory/code-reviewer/` with a MEMORY.md file that persists across conversations.

**4. Skills System**

Skills are reusable prompt/workflow templates in `.claude/skills/`:
```markdown
# .claude/skills/fix-issue/SKILL.md
---
name: fix-issue
description: Fix a GitHub issue
disable-model-invocation: true
---
Analyze and fix the GitHub issue: $ARGUMENTS.
1. Use `gh issue view` to get details
2. Search codebase for relevant files
3. Implement fix
4. Write tests
5. Commit and push
```

Invoke with `/fix-issue 1234`.

**5. Plugin Ecosystem**

Plugins bundle skills, hooks, subagents, and MCP servers. Install via `/plugin` command. Code intelligence plugins give agents precise symbol navigation.

---

## 7. Real Production Multi-Claude Setups

### Case Study 1: incident.io (4-7 Concurrent Agents)

- Went from zero to 4-7 concurrent AI agents in four months
- CTO challenged team to maximize Claude spending
- Gamified with office leaderboard tracking token usage
- Reported 2-10x velocity improvements

### Case Study 2: Anthropic's C Compiler (16 Agents)

- 16 agents tasked with writing a Rust-based C compiler from scratch
- Nearly 2,000 Claude Code sessions
- $20,000 in API costs
- Produced a 100,000-line compiler that can build Linux 6.9 on x86, ARM, and RISC-V
- 2 billion input tokens consumed

### Case Study 3: Nx (Open Source, Git Worktrees)

- Deeply invested in Claude Code integration
- Published detailed git worktree workflow guides
- Maintains a comprehensive CLAUDE.md in their open-source repo
- Pattern: each Claude instance gets its own worktree for isolation

### Case Study 4: 12 Specialized Sub-Agents (React Project)

One developer split Claude Code into 12 specialized sub-agents for a React/TypeScript project:

- Each agent had: focused role, specific tools, deep project convention knowledge
- Example: A TypeScript types agent that knew the exact `const as const` enum pattern and `createSchema(t)` factory pattern
- Result: "A team of specialists that deeply know their domain, rather than one agent that tries to know everything"
- Key insight: Single agents suffer from context dilution, inconsistent patterns, lack of separation of concerns, and wasted context window

### Case Study 5: Anthropic Internal Teams

- Security Engineering: feeds Claude stack traces and documentation to trace control flow
- Many teams: Claude accelerates diagnosis by analyzing stack traces, docs, and system behavior in real-time
- Pattern: plan first (cheap), then execute with team (expensive but fast)

### Common Patterns Across All Teams

1. **Git worktrees for isolation** -- each agent works in its own copy
2. **Rich CLAUDE.md** but focused -- under 300 lines
3. **Writer/Reviewer pattern** -- one agent writes, another reviews in fresh context
4. **Plan Mode first** -- cheap research, then expensive parallel execution
5. **3-5 concurrent agents** -- sweet spot for coordination vs overhead

---

## 8. Optimal Team Structure for Tiny Seed OS

### Current State Assessment

The current system uses 5+ terminals with manual INBOX/OUTBOX coordination:
1. PM_Architect (coordinator)
2. Desktop_Claude (HTML)
3. Backend_Claude (Apps Script)
4. Mobile_Claude (mobile apps)
5. Social_Media_Claude (social media)

Plus planned but unimplemented: Verifier_Claude, UX_Design_Claude, Sales_Claude, Security_Claude

**Problems with current approach:**
- PM_Architect's 942-line CLAUDE.md overloads every session
- INBOX/OUTBOX files get stale and are rarely read
- No actual verification pipeline (documented but not implemented)
- Too many roles for the project's scope
- Custom coordination infrastructure that duplicates native capabilities

### Recommended Structure: 3+1 Agent Team

For a farm tech startup building a full-stack web app with Google Apps Script backend, the optimal team is:

#### Primary Team (Agent Teams / Swarms)

| Role | Agent Name | Scope | Model |
|------|-----------|-------|-------|
| **Team Lead** | `pm-coordinator` | Coordinates work, reviews, delegates. Does NOT write code. | opus |
| **Full-Stack Builder** | `fullstack-builder` | All code: HTML, CSS, JS, Apps Script | opus |
| **Quality Verifier** | `verifier` | Tests, validates, catches issues | sonnet |

#### On-Demand Subagents (Not always running)

| Role | Agent Name | When Used | Model |
|------|-----------|-----------|-------|
| **Research** | `researcher` | Investigating APIs, patterns, solutions | haiku |
| **Content Writer** | `content-writer` | Marketing copy, social media | sonnet |
| **Security Reviewer** | `security-reviewer` | Before external website changes, auth changes | opus |

### Why 3 + On-Demand, Not 8

1. **Token cost scales linearly**: 3 agents = ~600k tokens. 8 agents = ~1.6M+ tokens.
2. **Coordination overhead increases super-linearly**: more agents = more messages = more confusion
3. **Diminishing returns**: 3 focused agents outperform 5 scattered ones
4. **Tiny Seed OS is one codebase**: it does not have the scale to justify 8 specialized agents
5. **One owner (Todd) reviewing output**: more agents = more output to review = bottleneck

### Why Full-Stack Builder Instead of Frontend/Backend Split

The current frontend/backend split (Desktop_Claude + Backend_Claude) creates coordination problems:
- Frontend changes that need backend support create cross-agent dependencies
- The INBOX/OUTBOX system for coordinating these is slow and unreliable
- A single Full-Stack Builder that can read and modify both layers is faster and more reliable
- For rare cases where true parallel frontend+backend work is needed, the Team Lead can spawn a temporary teammate

### Agent Definition Files

These would live in `.claude/agents/`:

```
.claude/
  agents/
    pm-coordinator.md
    fullstack-builder.md
    verifier.md
    researcher.md
    content-writer.md
    security-reviewer.md
```

---

## 9. File-Based vs API-Based vs MCP Coordination

### Comparison Table

| Mechanism | How It Works | Pros | Cons | Best For |
|-----------|-------------|------|------|----------|
| **INBOX/OUTBOX files** (current) | Agents read/write markdown files in `claude_sessions/` | Simple, visible, no dependencies | Stale data, no real-time notification, manual polling | Legacy systems, simple handoffs |
| **Agent Teams (native)** | Built-in task list + mailbox messaging | Automatic delivery, dependency tracking, file locking | Experimental, limitations around resumption | Primary coordination mechanism |
| **MCP Servers** | External tools connected via protocol | Rich integrations (Notion, DB, APIs), structured data | Overhead per server, not available in background subagents | External service integration |
| **claude-flow** | MCP-based orchestration layer | Swarm intelligence, fault tolerance | Extra dependency, security concerns, overkill | Large-scale agent deployments |
| **Custom JSON files** (`.claude_intercom.json`) | Shared JSON state file | Flexible, custom schemas | Gets huge (40k+ tokens), no locking, no notifications | Avoid -- replace with native |

### What is Winning in Feb 2026

**Native Agent Teams is the clear winner** for within-project coordination. The reasons:

1. **Built by Anthropic**: designed to work with Claude Code's architecture
2. **File-based with locking**: works across processes safely
3. **Automatic message delivery**: no polling required
4. **Dependency tracking**: tasks automatically unblock
5. **Hooks integration**: TeammateIdle and TaskCompleted for quality gates

**MCP servers remain essential** for external integrations (databases, APIs, third-party services) but are NOT the right choice for agent-to-agent coordination within a single project.

### Recommendation for Tiny Seed OS

**Phase 1 (Immediate):** Switch from INBOX/OUTBOX to Agent Teams for coordination
**Phase 2 (Near-term):** Add MCP servers for external integrations (Google Sheets, Shopify)
**Phase 3 (If needed):** Consider claude-flow only if managing 10+ agents across multiple projects

The custom `.claude_intercom.json` (currently 40k+ tokens) and INBOX/OUTBOX files should be deprecated in favor of native Agent Teams communication.

---

## 10. Ready-to-Use Prompt Templates for Each Role

### PM Coordinator (`pm-coordinator.md`)

```markdown
---
name: pm-coordinator
description: Project coordinator for Tiny Seed Farm OS. Delegates work, reviews output, maintains system coherence. Use when starting a new work session or coordinating multi-step tasks.
tools: Read, Grep, Glob, Bash
model: opus
memory: project
---

You are the PM Coordinator for Tiny Seed Farm OS, a full-stack web application for a farm business.

## Your Role
- Coordinate work across teammates
- Break tasks into clear, independent work items
- Review completed work before marking tasks done
- Maintain system coherence and prevent duplication

## You MUST
- Read CHANGE_LOG.md before starting work to know current state
- Check claude_sessions/pm_architect/SYSTEM_MANIFEST.md before creating anything new
- Verify work is actually done before declaring it complete
- Update CHANGE_LOG.md after any modifications

## You MUST NOT
- Write code directly -- delegate to the fullstack-builder
- Deploy without verifying -- delegate to verifier first
- Create new files without checking for existing similar files
- Claim "100% functional" or "everything working" without evidence

## Key Context
- API endpoint: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
- API config: web_app/api-config.js (always use this, never hardcode URLs)
- Backend: apps_script/MERGED TOTAL.js (125k+ lines)
- Owner: Todd Wilson, todd@tinyseedfarmpgh.com

## Coordination Rules
- When assigning tasks, specify: which files to touch, expected output, verification criteria
- If a teammate claims done, verify with evidence (test output, screenshot, curl response)
- If unsure about system state, use STATUS_ABSTAIN rather than guessing
```

### Full-Stack Builder (`fullstack-builder.md`)

```markdown
---
name: fullstack-builder
description: Full-stack developer for Tiny Seed Farm OS. Implements features across HTML, CSS, JavaScript, and Google Apps Script. Use for any code implementation task.
tools: Read, Edit, Write, Bash, Grep, Glob
model: opus
memory: project
---

You are a full-stack developer for Tiny Seed Farm OS.

## Your Role
- Implement features across the entire stack
- Frontend: HTML files in web_app/, root-level HTML
- Backend: Google Apps Script in apps_script/
- Fix bugs, add features, refactor code

## Technical Stack
- Frontend: Vanilla HTML/CSS/JS (no frameworks), served via GitHub Pages
- Backend: Google Apps Script (apps_script/*.js), deployed via clasp
- API: Single endpoint, action-based routing
- Data: Google Sheets as database

## You MUST
- Use web_app/api-config.js for API URLs -- NEVER hardcode
- Search for existing similar functions before creating new ones
- Keep HTML/JS in sync -- if you remove HTML elements, update the JS that references them
- Run ./scripts/validate-element-refs.sh after modifying HTML files
- Update CHANGE_LOG.md after completing work

## You MUST NOT
- Create demo/sample data fallbacks -- show real errors instead
- Create new Morning Brief, Approval, or Email Processing systems (duplicates exist)
- Create new dashboard files (14+ already exist -- enhance existing ones)
- Deploy Apps Script without the -i flag: `clasp deploy -i AKfycbyT60f...`

## Deployment
- Frontend: git push (auto-deploys to GitHub Pages)
- Backend: `clasp push && clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"`

## When Done
- List all files modified
- Describe what changed and why
- Provide verification evidence (test output, screenshot, curl response)
```

### Verifier (`verifier.md`)

```markdown
---
name: verifier
description: Quality verification agent. Reviews code changes, runs tests, validates deployments. Use after any implementation work to verify correctness.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are a quality verification agent for Tiny Seed Farm OS.

## Your Role
- Independently verify that implemented work actually functions correctly
- Run validation scripts and report results
- Check for orphaned HTML/JS references
- Verify API endpoints respond correctly
- Ensure no regressions were introduced

## Verification Checklist

### For Code Changes
1. Run `./scripts/validate-element-refs.sh [filename]` for any modified HTML
2. Run `./scripts/validate-api-urls.sh` to check API URL consistency
3. Verify no hardcoded API URLs were introduced
4. Check for duplicate functions or files

### For UI Changes
- Verify HTML renders without JS errors
- Check mobile responsiveness if applicable
- Confirm all referenced elements exist

### For API Changes
- Test endpoint with curl: `curl -s "API_URL?action=ACTION" | head -100`
- Verify response format matches what frontend expects

### For Deployments
- Verify live endpoint responds after deploy
- Check for caching issues (add ?v=X to bypass)
- Confirm CHANGE_LOG.md was updated

## Output Format
For each item verified:
- PASS: [description] -- [evidence]
- FAIL: [description] -- [what went wrong]
- STATUS_ABSTAIN: [description] -- [why verification is not possible]

## You MUST NOT
- Fix bugs yourself -- report them back to the builder
- Approve work without evidence
- Say "looks good" without actually testing
```

### Researcher (`researcher.md`)

```markdown
---
name: researcher
description: Research agent for investigating APIs, patterns, and solutions. Read-only. Use when exploring options before implementation.
tools: Read, Grep, Glob, Bash
model: haiku
---

You are a research agent for Tiny Seed Farm OS.

## Your Role
- Investigate APIs, libraries, and implementation patterns
- Read documentation and existing code to understand current state
- Provide concise summaries with specific recommendations
- You are READ-ONLY -- you do not modify any files

## Output Format
1. What was researched
2. Key findings (bulleted, concise)
3. Specific recommendations with rationale
4. Links to relevant documentation or examples
```

### Content Writer (`content-writer.md`)

```markdown
---
name: content-writer
description: Marketing and social media content writer. Creates posts, descriptions, and marketing copy. Use for non-code content creation.
tools: Read, Write, Bash
model: sonnet
---

You are a content writer for Tiny Seed Farm, a small organic farm in Rochester, PA.

## Your Role
- Write social media posts, marketing copy, and content descriptions
- Match the farm's authentic, personal voice
- Create content based on real farm activities and products

## You MUST
- Only use VERIFIED facts about the farm
- Ask if you are unsure about any detail
- Show all content to the user before publishing
- Never fabricate stories, names, or details

## Brand Voice
- Authentic, warm, personal
- Short paragraphs (3-5 sentences max)
- Clear calls to action
- Mobile-friendly formatting

## Key Facts
- Owner: Todd Wilson
- Location: 257 Zeigler Rd, Rochester, PA 15074
- Products: CSA vegetables, flower subscriptions, farmers market sales
- Service area: Pittsburgh metro and surrounding areas
```

### Security Reviewer (`security-reviewer.md`)

```markdown
---
name: security-reviewer
description: Security review agent. Reviews code for vulnerabilities, validates external website changes. Use before any production deployment or external website change.
tools: Read, Grep, Glob, Bash
model: opus
---

You are a security reviewer for Tiny Seed Farm OS.

## Your Role
- Review code for security vulnerabilities
- Validate external website changes before publishing
- Check for exposed secrets, API keys, or credentials
- Verify input validation and authentication flows

## External Website Changes (Shopify, etc.)
Before ANY publish:
1. Verify all content has been confirmed by the user
2. Check for placeholder text, fake names, or made-up details
3. Ensure old content has been logged for rollback
4. Confirm explicit user approval exists

## Code Security Checks
- No exposed API keys or secrets in committed code
- Input validation on all user-facing endpoints
- Proper authentication checks
- No SQL injection or XSS vulnerabilities
- Secure cookie handling
```

---

## 11. Migration Plan: Current System to Agent Teams

### Phase 1: Immediate (Today)

1. **Slim down CLAUDE.md** from 942 lines to ~150 lines using pointers
2. **Create `.claude/agents/` directory** with the 6 agent definitions above
3. **Enable Agent Teams** in settings.json
4. **Add verification hooks** for TeammateIdle and TaskCompleted

### Phase 2: This Week

1. **Create `.claude/skills/`** for common workflows:
   - `deploy-apps-script` -- clasp push and deploy
   - `verify-html` -- validate element references
   - `check-duplicates` -- search for existing similar files
2. **Deprecate INBOX/OUTBOX** -- stop using `claude_sessions/*/INBOX.md` and `OUTBOX.md`
3. **Deprecate `.claude_intercom.json`** -- replace with native Agent Teams messaging
4. **Move detailed docs** out of CLAUDE.md into `docs/` with pointer references

### Phase 3: Next 2 Weeks

1. **Add persistent memory** to key agents (`memory: project`)
2. **Evaluate plugins** for code intelligence and additional tooling
3. **Set up TaskCompleted hooks** with actual test scripts
4. **Train on the new workflow**: Plan Mode -> Agent Team spawn -> Verify -> Deploy
5. **Archive old coordination infrastructure**: TERMINAL_QUICK_START_GUIDES.md, Governor system files

### What to Keep from the Current System

| Current Component | Keep? | Reason |
|-------------------|-------|--------|
| CLAUDE.md | **Slim down** | Still needed, but at 150 lines not 942 |
| CHANGE_LOG.md | **Keep** | Valuable audit trail |
| SYSTEM_MANIFEST.md | **Keep** | Reference for avoiding duplication |
| validate-element-refs.sh | **Keep** | Use in hooks |
| validate-api-urls.sh | **Keep** | Use in hooks |
| pre-flight-check.sh | **Keep** | Use in hooks |
| INBOX/OUTBOX files | **Deprecate** | Replaced by Agent Teams mailbox |
| .claude_intercom.json | **Deprecate** | Replaced by Agent Teams messaging |
| TERMINAL_QUICK_START_GUIDES.md | **Deprecate** | Replaced by .claude/agents/ |
| Governor system | **Evaluate** | Hooks may replace most functionality |
| .pm_memory.json | **Evaluate** | Native agent memory may replace |

---

## 12. Sources

### Official Documentation
- [Orchestrate teams of Claude Code sessions](https://code.claude.com/docs/en/agent-teams) -- Official Agent Teams documentation
- [Create custom subagents](https://code.claude.com/docs/en/sub-agents) -- Official subagent documentation
- [Best Practices for Claude Code](https://code.claude.com/docs/en/best-practices) -- Official best practices
- [Getting started with Cowork](https://support.claude.com/en/articles/13345190-getting-started-with-cowork) -- Cowork documentation

### Community Guides and Analysis
- [Claude Code Swarm Orchestration Skill](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea) -- Kieran Klaassen's comprehensive TeammateTool guide
- [Claude Code Swarms - Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/) -- Practical analysis of Agent Teams
- [Claude Code Agent Teams: The Complete Guide 2026](https://claudefa.st/blog/guide/agents/agent-teams) -- Community complete guide
- [How to Set Up and Use Claude Code Agent Teams](https://darasoba.medium.com/how-to-set-up-and-use-claude-code-agent-teams-and-actually-get-great-results-9a34f8648f6d) -- Medium guide
- [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) -- HumanLayer's CLAUDE.md best practices
- [How to Write a Good CLAUDE.md File](https://www.builder.io/blog/claude-md-guide) -- Builder.io guide

### Real-World Case Studies
- [Claude Code in Production: Case Studies](https://blog.starmorph.com/blog/claude-code-production-case-studies) -- incident.io, Nx, Anthropic case studies
- [How Anthropic teams use Claude Code](https://www.anthropic.com/news/how-anthropic-teams-use-claude-code) -- Anthropic internal usage
- [Building a C Compiler with AI Agents](https://www.anthropic.com/engineering/building-c-compiler) -- 16-agent compiler project
- [How I Turned Claude Code Into a Multi-Agent Dev Team](https://dev.to/matkarimov099/how-i-split-claude-code-into-12-specialized-sub-agents-for-my-react-project-3jh8) -- 12 specialized sub-agents

### Third-Party Tools
- [claude-flow on GitHub](https://github.com/ruvnet/claude-flow) -- Third-party orchestration platform
- [claude-flow on npm](https://www.npmjs.com/package/claude-flow) -- npm package
- [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) -- 100+ subagent collection
- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) -- Curated skills, hooks, and plugins

### Release Notes
- [Claude Code Releases on GitHub](https://github.com/anthropics/claude-code/releases) -- Official changelog
- [Claude Code February 2026 Updates](https://releasebot.io/updates/anthropic/claude-code) -- Aggregated release notes

### Agent Architecture Research
- [Claude Code Agent Teams Controls: Delegate Mode, Hooks & More](https://claudefa.st/blog/guide/agents/agent-teams-controls) -- Delegate mode and hooks
- [Claude Code's Hidden Multi-Agent System](https://paddo.dev/blog/claude-code-hidden-swarm/) -- Under-the-hood analysis
- [From Tasks to Swarms: Agent Teams in Claude Code](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/) -- Architecture deep dive
- [Claude Code multiple agent systems: Complete 2026 guide](https://www.eesel.ai/blog/claude-code-multiple-agent-systems-complete-2026-guide) -- Comprehensive systems guide
- [Claude Code system prompts](https://github.com/Piebald-AI/claude-code-system-prompts) -- All built-in system prompts
- [The Agentic Startup](https://github.com/rsmdt/the-startup) -- Commands, skills, and agents collection

---

## Appendix A: Quick Reference Card

### Enable Agent Teams
```json
// ~/.claude/settings.json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

### Create an Agent Team
```
Create an agent team with 3 teammates:
- A fullstack-builder for implementation
- A verifier for quality checks
- A researcher for investigating unknowns
```

### Key Keyboard Shortcuts (In-Process Mode)
- `Shift+Down` -- Cycle through teammates
- `Shift+Tab` -- Toggle delegate mode (lead coordination only)
- `Enter` -- View a teammate's session
- `Escape` -- Interrupt current turn
- `Ctrl+T` -- Toggle task list
- `Ctrl+B` -- Background a running task

### Directory Structure
```
.claude/
  agents/           # Agent definitions (YAML frontmatter + Markdown)
  skills/           # Reusable workflow templates
  settings.json     # Agent Teams config, hooks, permissions
  agent-memory/     # Persistent agent memory (when memory: project)
```

### Verification Hooks
```json
{
  "hooks": {
    "TeammateIdle": [{ "hooks": [{ "type": "command", "command": "./scripts/verify-work.sh" }] }],
    "TaskCompleted": [{ "hooks": [{ "type": "command", "command": "./scripts/verify-task.sh" }] }]
  }
}
```

---

*This research document supersedes the following earlier documents for multi-agent coordination:*
- *docs/research/AGENTIC_TEAM_STRUCTURE.md (Feb 12) -- Builder/Verifier/Deployer pattern*
- *docs/research/CLAUDE_COMMUNITY_AGENT_PATTERNS.md (Feb 12) -- Community patterns*
- *claude_sessions/TERMINAL_QUICK_START_GUIDES.md (Feb 14) -- Manual terminal coordination*

*Those documents remain valid for historical context but the recommendations in THIS document should take precedence.*
