# Multi-Agent Organization for Tiny Seed Farm (2026)

**Research date:** 2026-08-20
**Researcher:** RESEARCH_CLAUDE
**Scope:** How to split Tiny Seed Farm's AI-agent-assisted software work into domain-dedicated terminals (CSA, Wholesale, Grants, Flowers) operated by different humans (Todd + Loren, possibly more later), sharing one git monorepo and one production Supabase database, without the agents colliding.
**Method note:** This document is built from primary-source documentation (Anthropic's own Claude Code docs, Microsoft's Azure Architecture Center, Anthropic's and Cognition's own engineering blogs) fetched directly, plus a firsthand audit of this repository's actual structure (`apps/`, `.claude/`, `CHANGE_LOG.md`, git branches/worktrees). General web search was not reliably available in this research session (DuckDuckGo, Bing's non-JS endpoint, and several public SearXNG instances all returned bot-challenge pages or garbage results after the first query) — direct URL fetches to known, credible, dated sources were used instead. Where a claim rests on a single source or is genuinely unsettled in the field, that is flagged explicitly rather than smoothed over.

---

## Executive Summary

- **Your situation is not the "many ephemeral task agents" case most 2026 multi-agent literature is written for.** You want 3-4 *long-lived, human-owned* domain terminals, not a swarm. That points away from Anthropic's "Agent Teams" feature (which is single-session, single-owner, and explicitly *not* built for multiple humans coordinating) and toward the plainer combination of **git worktrees + scoped CLAUDE.md/permissions + cross-session messaging** — mechanisms Claude Code already ships, some of which this repo already uses informally.
- **Your codebase does not actually have clean domain boundaries yet.** `apps/grant-portal` and `loren/` are genuinely separate (worktree/branch isolation will work cleanly there today). But CSA and Wholesale are NOT separate: wholesale lives at `apps/csa-portal/src/pages/admin/wholesale/` inside the *same* Astro app, sharing `src/lib/database.types.ts`, `src/lib/quickbooks.ts`, the same Supabase schema, and the same Vercel deployment as CSA. Splitting CSA and Wholesale into separate terminals will isolate *most* file edits, but shared files and shared migrations remain a real collision surface that file-path isolation alone cannot solve — that risk has to be handled explicitly (see "The concrete architecture" below).
- **The two agents share a database, and that is the more dangerous collision, not the git repo.** Git conflicts are visible and blocking; two agents writing bad concurrent data to the same Supabase tables at the same time can silently corrupt state. This repo's own migrations already use the right primitive (`FOR UPDATE` row locks, idempotent upserts, unique-constraint-based dedup — see `swap_box_item`, migration 0015, `CHANGE_LOG.md:2918`) — the fix here is "keep doing that, systematically," not something new.
- **The published evidence on multi-agent systems is more cautionary than promotional.** Anthropic's own team reports 41-86.7%-range production failure rates are widely cited in this space (see internal `docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md`); Cognition AI (makers of Devin) published a widely-read essay arguing you should generally *not* build multi-agent systems for coding work because context can't be shared reliably between agents; and Anthropic's own engineering blog on their (successful) multi-agent Research system explicitly says **"most coding tasks involve fewer truly parallelizable tasks than research... and are not a good fit for multi-agent systems today"** (2025-06-13). None of this says "don't split by domain" — domain-per-terminal with a human anchor is a different, much lower-risk pattern than autonomous swarms — but it's a reason to keep the coordination mechanism boring and human-supervised rather than reaching for something fancier (group chat, magentic/planner agents, etc.).
- **Recommendation in one sentence:** give each domain its own **git worktree on its own long-lived branch**, scope each worktree's `.claude/` config (rules, CLAUDE.md excludes, permission allow/deny) to that domain's file paths, treat the small set of genuinely shared files (`database.types.ts`, `quickbooks.ts`, Supabase migrations, shared components, `AdminShell.astro` nav) as a named "shared zone" that requires a lightweight claim/announce step before editing, and let Todd's terminals talk to each other via Claude Code's native cross-session messaging — while treating Loren's setup as an out-of-band peer you coordinate with the way you already do (Slack/text/CHANGE_LOG), because native cross-session messaging is scoped to *your own* sessions, not another person's account.

---

## Key Findings

| # | Question | Finding | Confidence |
|---|----------|---------|------------|
| 1 | Best orchestration pattern for a few long-lived domain agents? | None of the "fancy" patterns (group chat, magentic/planner) fit. This maps to **orchestrator-worker only in the loose sense of "human as orchestrator, each terminal a durable worker on its own domain"** — not Anthropic's Agent Teams feature, which is a different, session-scoped thing. | High — grounded in Anthropic's own docs and Azure's pattern-selection guidance |
| 2 | Git concurrency control? | **Worktrees + branch-per-domain**, native to Claude Code (`claude --worktree <name>`), with hard enforcement (Claude Code blocks edits/commands that reach outside the worktree). Shared-file risk is not solved by worktrees and needs an explicit convention. | High for worktree mechanics; Medium for how well the farm will follow the shared-file convention in practice |
| 3 | Shared state architecture? | **Database is the source of truth, files/CLAUDE.md are context** — already true here. The right pattern for *cross-agent* handoffs is "write an artifact/record, pass a reference" (Anthropic calls this avoiding the "game of telephone"), which is what your `CHANGE_LOG.md` and Supabase migrations already do informally. | Medium-High |
| 4 | Domain boundaries / DDD? | Claude Code has real, documented primitives for this: `.claude/rules/` with `paths:` frontmatter (scope instructions to a subtree), `claudeMdExcludes` (hide another domain's CLAUDE.md from your context), and path-scoped `permissions.allow`/`deny` (hard-block edits outside your domain). None of these are in use yet in this repo beyond two generic rule files. | High (documented Anthropic behavior) |
| 5 | Multi-human handoff? | Native **cross-session messaging** (Claude Code v2.1.224+) works between *your own* sessions/machines, not across different Anthropic accounts — so it covers Todd's CSA↔Wholesale↔Grants terminals talking to each other, but not Todd↔Loren, which stays a human-mediated channel (CHANGE_LOG, active-locks.md, direct message). | High — explicit in Anthropic's docs |
| 6 | Claude Code native support? | Extensively documented and current: subagents, Agent Teams (session-scoped, human-count = 1), worktrees, cross-session messaging, CLAUDE.md hierarchy + rules + excludes, hooks (`TeammateIdle`/`TaskCreated`/`TaskCompleted`), path-scoped permissions. | High |
| 7 | Anti-patterns / post-mortems | Cognition AI's "Don't Build Multi-Agents" (2025) is the most cited cautionary essay in this space; Anthropic's own multi-agent research post-mortem-style "production reliability" section documents the same failure class (compounding errors, non-deterministic debugging, deployment-mid-flight hazards). Both are about *autonomous* multi-agent systems more than human-supervised domain terminals, so they temper enthusiasm without ruling out your plan. | Medium — strong sources, but not a direct match to your exact setup (few small farms publish postmortems) |

---

## 1. Orchestration patterns: what fits a small operation

Three real, current sources converge on the same message: **match the pattern to the coordination need, and default to the simplest one that works.**

Microsoft's Azure Architecture Center "AI Agent Orchestration Patterns" guide (last updated 2026-02-12) frames this as a complexity ladder and says explicitly: *"Use the lowest level of complexity that reliably meets your requirements."* Its five named patterns — Sequential, Concurrent, Group Chat, Handoff, Magentic (planner) — are all designed for *automated* coordination between agents that don't have a human sitting over each one. None of them describe "three humans, each running their own long-lived terminal, working on largely separate parts of one codebase." That's a simpler problem than any of the five patterns solve, and imposing one of them (e.g., building a "manager agent" to plan and dispatch work across CSA/Wholesale/Grants) would be *adding* coordination machinery to a problem that mostly needs boundaries, not choreography.
Source: [learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns), updated 2026-02-12.

The closest labeled pattern to what you actually want is what James Croft (Microsoft senior engineer) calls applying **Domain-Driven Design bounded contexts** to agent design, treating each agent as "a service" with a single responsibility, rather than picking an orchestration-flow pattern at all: *"We can treat each agent as operating within a bounded context, a clearly defined domain boundary with its own models, knowledge, and language."* His piece explicitly separates "what agents you need" (DDD boundaries) from "how they interact" (SOA-style loose coupling), and that's the right split for your case — CSA/Wholesale/Grants/Flowers are bounded contexts first; only *within* a context do orchestration patterns like sequential or handoff become relevant (e.g., if you ever build an automated "triage the CSA support inbox" flow).
Source: James Croft, "Applying Domain-Driven Design Principles to Multi-Agent AI Systems," jamescroft.co.uk, published 2026-04-08, updated 2026-05-04.

Anthropic's own account of building their multi-agent Research system (their most detailed public account of a *working* production multi-agent system) is direct about where multi-agent pays off and where it doesn't: *"multi-agent systems excel at valuable tasks that involve heavy parallelization, information that exceeds single context windows, and interfacing with numerous complex tools... most coding tasks involve fewer truly parallelizable tasks than research... and are not a good fit for multi-agent systems today."* They also report the token-cost reality plainly: agents use ~4x the tokens of a chat turn, and multi-agent systems ~15x. That's a real cost, not just a coordination risk, and it argues for **as few concurrently-running agents as the domain split actually requires**, not spinning up extra "helper" agents inside each domain terminal.
Source: Anthropic, "How we built our multi-agent research system," anthropic.com/engineering, published 2025-06-13.

**What this means for your farm:** CSA/Wholesale/Grants/Flowers as separate long-lived terminals is not really "multi-agent orchestration" in the sense the 2025-2026 literature means — it's closer to four separate single-agent sessions that happen to share a repo and a database. That's good news: you inherit almost none of the coordination-overhead problems (group-chat loops, planner-agent stalls, emergent miscommunication between agents mid-task) that the literature warns about, because there is no automated hand-off between them — a human runs each one. The problem you actually have to solve is narrower and more mechanical: **file/branch isolation, shared-file coordination, and database concurrency** — covered below.

Existing internal research worth reading alongside this: `docs/research/AGENTIC_TEAM_2026_UPDATE.md` (Agent Teams / Claude Code coordination mechanics as of Feb 2026) and `docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md` (failure-mode taxonomy and stats, cited from academic/industry surveys). This document does not repeat their content; it extends it toward the specific multi-human, shared-repo, shared-database question.

---

## 2. Concurrency and collision control for a shared repo

### What Claude Code actually supports today (documented, current)

Claude Code has a first-class, hard-enforced worktree feature — this is not a manual `git worktree add` workaround, it's a supported CLI mode:

```
claude --worktree csa        # starts a session in .claude/worktrees/csa/ on branch worktree-csa
claude --worktree wholesale  # separate terminal, separate branch, separate checkout
claude --worktree grants
```

Critically, isolation is **enforced by Claude Code itself, not just by convention**: once a session is in a worktree, Claude Code blocks (1) any Edit/Write/NotebookEdit targeting a path in the main checkout, (2) any Bash/PowerShell command whose working directory resolves to the main checkout, (3) any git command that redirects into the main checkout (`git -C`, `--git-dir`, `GIT_DIR`/`GIT_WORK_TREE`, or a `cd` before running git), and (4) any shell construct it can't statically verify stays inside the worktree (it refuses unparseable brace expansion/heredocs rather than risk it). This is a real safety net beyond "the agent was told to stay in its lane." The agent sees a tool error naming the worktree and explaining how to proceed, not a silent bypass.
Source: [docs.claude.com/en/docs/claude-code/worktrees](https://docs.claude.com/en/docs/claude-code/worktrees), "How Claude Code enforces isolation" (current docs, references behavior through v2.1.2xx).

Task-level locking already exists for the *narrower* Agent Teams case too — "Task claiming uses file locking to prevent race conditions when multiple teammates try to claim the same task simultaneously" — but that's for teammates inside one session, not your cross-terminal case (see §6).
Source: same, [docs.claude.com/en/docs/claude-code/agent-teams](https://docs.claude.com/en/docs/claude-code/agent-teams).

### What worktrees do NOT solve: shared files

Worktrees isolate *branches and working directories*. They do not, and cannot, isolate **files that two domains both need to touch**. In this repo, that set is small but real:

- `apps/csa-portal/src/lib/database.types.ts` — shared Supabase-generated types; both CSA and Wholesale code import from it. Confirmed currently modified on the `csa-migration` branch.
- `apps/csa-portal/src/lib/quickbooks.ts` — shared QuickBooks integration; wholesale invoicing and (per CHANGE_LOG) CSA-side integrations both touch it.
- `apps/csa-portal/src/components/AdminShell.astro` — shared nav shell; CHANGE_LOG already documents nav-link collisions being reasoned about explicitly (`CHANGE_LOG.md:1833`, `:2447`).
- `apps/csa-portal/supabase/migrations/*.sql` — the migration sequence is a single, strictly-ordered append-only log. Two domains adding migrations concurrently risk numbering collisions or, worse, both altering the same table in incompatible ways in the same week.

This is the actual DDD lesson from the Croft article, applied honestly rather than aspirationally: CSA and Wholesale are **not clean bounded contexts in this codebase today** — they're two subdomains sharing one "supporting/generic" layer (types, QuickBooks client, nav shell, migrations). DDD doesn't say "pretend the shared kernel doesn't exist" — it names this the **Shared Kernel** pattern and says explicitly that a shared kernel needs *deliberate, low-frequency, jointly-agreed changes*, precisely because both sides depend on it. The practical fix is not more git tooling; it's a **named convention**: before editing anything in the shared-kernel list, a terminal announces it (message the other terminal if it's you; drop a line in `active-locks.md` or `CHANGE_LOG.md` if it's Loren), makes the change small and additive where possible (new column/function rather than renaming), and the other side pulls before touching the same area. This repo already does an informal version of this — `CHANGE_LOG.md:2447`: *"Coordination: did NOT touch src/pages/account/index.astro (a concurrent build owns the hub link)"* — the recommendation is to make that instinct a documented, always-on rule rather than something one builder happened to notice.

### Documented failure modes worth naming explicitly

- **Stale worktrees / orphaned locks.** Claude Code's own docs describe a real failure mode: a non-interactive (`-p`) run doesn't clean up its worktree lock, and before v2.1.210 a lock left by a killed session stayed in place until manually released. Practical implication: if a domain terminal's session gets killed abnormally (crash, force-quit), check `git worktree list` and `git worktree unlock`/`remove` before assuming the worktree is free.
- **Session resumption doesn't restore in-process teammates** (Agent Teams limitation, not worktrees) — not directly relevant to your setup since you're not using Agent Teams across humans, but relevant if any domain terminal *itself* spins up subagents/teammates internally and gets `/resume`d after a restart.
- **Merge/collision from AI agents specifically has few published farm-scale or small-business case studies.** Most public "multi-agent coding collision" writing is either (a) Anthropic/Cognition-level engineering orgs running many ephemeral agents, or (b) generic git-worktree tutorials that don't involve AI agents at all. There is a real gap in the literature for "two humans, two long-lived AI-assisted terminals, one small production database" — treat the recommendations below as sound engineering practice extrapolated to your scale, not as a documented industry-standard playbook, because that playbook doesn't appear to exist yet in public writing as of this research date.

---

## 3. Shared state and memory: database as truth, files as context

The clearest documented articulation of the right shape here comes from Anthropic's own multi-agent engineering post, describing how they avoid what they call **"the game of telephone"**: *"Subagent output to a filesystem to minimize the 'game of telephone.' Direct subagent outputs can bypass the main coordinator for certain types of results... Subagents call tools to store their work in external systems, then pass lightweight references back to the coordinator."*
Source: anthropic.com/engineering/multi-agent-research-system, 2025-06-13, Appendix.

Translated to your setup: **Supabase (the production database) is the single source of truth for farm state — members, orders, deliveries, invoices, grant deadlines.** No domain terminal's private memory or CLAUDE.md should ever be treated as authoritative about live data; if a CSA terminal needs to know a wholesale customer's invoice status, it reads Supabase, not a note left by the Wholesale terminal. This is already how this repo is built (RLS-gated tables, `is_admin_caller()`, service-role writes) — the recommendation is to keep that discipline as the domain split happens, and specifically to **resist the temptation to let each domain terminal keep a "cache" of the other domain's state in files** (e.g., a CSA terminal's memory file listing "wholesale customers as of last week") because that's exactly the stale-context problem Cognition's essay warns about (see §7) — one agent acting on another agent's now-wrong assumptions.

Claude Code's own memory architecture supports this separation cleanly without extra tooling:
- **CLAUDE.md files** are instructions *you* write — project-wide (`./CLAUDE.md`), or scoped via `.claude/rules/` with `paths:` frontmatter so a rule only loads when Claude is working in a matching subtree.
- **Auto memory** is notes *Claude* writes about build commands, debugging insights, and preferences — and it is explicitly scoped "per repository, shared across worktrees," meaning a debugging insight the Wholesale terminal discovers (e.g., a QuickBooks quirk) *is* visible to the CSA terminal's auto memory too, by design, because they share the same repo memory store. That's usually a feature (shared learnings about shared infrastructure) but is worth knowing: memory is **not** worktree-isolated, only files are.
Source: [docs.claude.com/en/docs/claude-code/memory](https://docs.claude.com/en/docs/claude-code/memory), "CLAUDE.md vs auto memory" table.

For genuinely **blackboard-style shared state** — a lightweight, human-and-agent-readable single artifact that all domains post to and read from without needing a live message — this repo already has the right primitive and just needs to keep using it consistently: `CHANGE_LOG.md` (append-only, plain text, already the convention) and `.claude/rules/active-locks.md` (already exists, currently near-empty — see §4 for how to actually use it as a lease file).

---

## 4. Domain boundary design: DDD bounded contexts, mapped to real Claude Code mechanisms

This is the part of the request with the most concrete, actionable answer, because Claude Code ships three distinct mechanisms that map almost one-to-one onto "CODEOWNERS for agents":

| DDD/CODEOWNERS concept | Claude Code mechanism | Enforcement level | Where it lives |
|---|---|---|---|
| "This is your bounded context's vocabulary/rules" | `.claude/rules/<domain>.md` with `paths:` frontmatter (glob-scoped, loads only when Claude touches matching files) | Soft — shapes context, not a hard block | `.claude/rules/csa.md` (`paths: ["apps/csa-portal/src/pages/(admin/(box\|order\|route\|labels\|...)\|account\|order)/**"]`), etc. |
| "Don't even load the other team's context" | `claudeMdExcludes` in `.claude/settings.local.json` (glob, per-machine, merges across settings layers) | Soft — reduces noise/token spend, not a hard block | Each domain terminal's local settings exclude the other domains' `.claude/rules/*` |
| "You may not write outside your lane, period" | Path-scoped `permissions.allow` / `permissions.deny` (`Edit(...)`, `Read(...)`, `Bash(...)` rules, glob-matched) | **Hard** — Claude Code blocks the tool call regardless of what the model decides | `.claude/settings.local.json` per worktree: e.g., the Wholesale worktree denies `Edit(apps/csa-portal/src/pages/admin/box/**)`, `Edit(apps/csa-portal/src/pages/admin/route/**)`, etc. |
| "The shared kernel needs joint sign-off" | No native mechanism — this is a process convention (see §2) backed by the existing `active-locks.md` file | Human/social, not tool-enforced | `.claude/rules/active-locks.md` |

Anthropic's own docs are explicit that CLAUDE.md/rules are **context, not enforcement** ("Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer") — which is exactly why the permission allow/deny layer matters for domain boundaries you actually want to hold, versus the rules layer for domain knowledge you want the agent to *know*.
Source: [docs.claude.com/en/docs/claude-code/memory](https://docs.claude.com/en/docs/claude-code/memory), "CLAUDE.md vs auto memory."

One more real, useful detail: `.claude/rules/` supports **symlinks**, explicitly so a shared rules directory can be linked into multiple projects/worktrees — useful for the small set of rules *every* domain terminal should share (e.g., the security non-negotiables and deployment rules already in root `CLAUDE.md`) without copy-pasting them into four places and having them drift.
Source: [docs.claude.com/en/docs/claude-code/memory](https://docs.claude.com/en/docs/claude-code/memory), "Share rules across projects with symlinks."

**Where DDD boundaries are genuinely clean vs. not, in this repo, verified directly:**
- **Grants (`apps/grant-portal`)** — a fully separate Astro app, own `package.json`, own `supabase/` directory. Clean bounded context. Worktree/branch isolation will work with essentially no shared-file risk.
- **Flowers (`loren/`, plus `apps/csa-portal/src/pages/admin/floral/`)** — already partially isolated by convention (gitignored personal directory), but the `admin/floral` admin page lives inside the same shared csa-portal app as CSA/Wholesale, so it has the same shared-kernel exposure as Wholesale does.
- **CSA vs. Wholesale** — NOT separate apps. Wholesale is a subtree (`src/pages/admin/wholesale/`) inside the CSA portal, sharing types, the QuickBooks client, the nav shell, and every Supabase migration. This is the pairing that most needs the shared-kernel convention from §2, not just a worktree.

---

## 5. Human-in-the-loop with multiple humans operating different agents

Two genuinely different situations here, and the tooling only covers one of them:

**Todd's own multiple terminals (CSA/Wholesale/Grants).** Claude Code v2.1.224+ ships **cross-session messaging**: any of Todd's sessions can discover and message any other of Todd's sessions by name (`ListAgents`/`SendMessage`), on the same machine over a local socket, or across Todd's own machines/web sessions via Remote Control, routed through Anthropic's servers. This is exactly the "hand over a finding," "coordinate parallel worktrees," and "warn a session before you notice" use case the docs describe. It is opt-in-by-default with configurable inbound controls (`accept`/`hold`/`refuse`) so a receiving terminal can require your approval before a message from another terminal is even shown to the agent. A message can never grant permission or change config on the receiving session's behalf — it's just text the receiving Claude reads and can act on subject to its own normal permission prompts.
Source: [docs.claude.com/en/docs/claude-code/cross-session-messaging](https://docs.claude.com/en/docs/claude-code/cross-session-messaging), requires Claude Code v2.1.224+, macOS/Linux.

**Todd ↔ Loren.** The documentation is consistent and explicit throughout that this feature addresses "your other sessions" and "your other machines" — every code path described (local socket registration, Remote Control identity, mailbox files under `~/.claude/teams/`) is scoped to one Anthropic account. There is no documented mechanism for Todd's terminal to natively message Loren's terminal, because they are different people with (presumably) different logins. **This means the farm's existing informal channel — `loren/` as her private workspace, plus direct communication (text/Slack/in-person) plus shared, version-controlled files like `CHANGE_LOG.md` and `active-locks.md` — remains the correct mechanism for Todd↔Loren coordination.** Don't build or expect a native cross-account bridge; there isn't one as of this research date.

Where a human sits in the loop *within* a domain terminal, Agent Teams' **plan-approval gate** is a well-documented, directly reusable pattern even outside the Agent Teams feature itself: a teammate can be required to submit a plan and wait for approval before making any change, and *"the lead makes approval decisions autonomously... to influence the lead's judgment, give it criteria in your prompt, such as 'only approve plans that include test coverage' or 'reject plans that modify the database schema.'"* If a domain terminal itself ever spawns sub-work (e.g., Wholesale terminal delegates a QuickBooks sync fix to a subagent), gating any Supabase-migration-touching plan behind explicit approval is a cheap, already-built safety rail.
Source: [docs.claude.com/en/docs/claude-code/agent-teams](https://docs.claude.com/en/docs/claude-code/agent-teams), "Require plan approval for teammates."

The Azure Architecture Center guide's HITL section generalizes this well: *"Mandatory gates make the orchestration synchronous at that step... You can also scope HITL gates to specific tool invocations rather than full agent outputs so that the orchestration can proceed autonomously for low-risk actions."* Applied to the farm: routine CSA content edits don't need a human gate; anything touching Supabase migrations, QuickBooks writes, or Shopify (already a hard rule in root `CLAUDE.md`) should.
Source: learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns, "Human participation."

---

## 6. Claude Code native support — what's documented today (current, primary source)

Summarized precisely, all fetched directly from docs.claude.com during this research session:

- **Subagents** — single-session helpers, own context window, results return to caller, never talk to each other. Not what you want for domain terminals (they're ephemeral and session-bound), but the right tool *within* a domain terminal for e.g. "research how the QuickBooks OAuth flow works" without polluting the main context.
- **Agent Teams** (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, already enabled in this repo's `.claude/settings.local.json`) — experimental, one team per session, teammates share a task list and message each other, **lead is fixed for the session's lifetime, no nested teams, no session resumption for in-process teammates.** This is built for one human supervising several AI teammates within one sitting — it is **not** the mechanism for "Todd's CSA terminal and Loren's Flowers terminal," because it's inherently single-session/single-owner. Important finding: having this flag on doesn't give you what the farm actually needs; it's a different, narrower tool that happens to already be switched on.
- **Worktrees** (`claude --worktree <name>`) — the actual mechanism for what you want: durable, isolated, per-domain working directories with hard tool-level enforcement (see §2).
- **Cross-session messaging** (v2.1.224+) — the actual mechanism for Todd's terminals to talk to each other; not usable across Loren's separate account (see §5).
- **CLAUDE.md hierarchy** — five load-order scopes (managed policy → user `~/.claude/CLAUDE.md` → project `./CLAUDE.md` → local `./CLAUDE.local.md`), plus `.claude/rules/*.md` (optionally path-scoped), plus `claudeMdExcludes` to hide irrelevant ancestor files in a monorepo, plus symlink-shareable rules. This is the domain-boundary toolkit described in §4.
- **Permissions/settings scoping** — four precedence layers (managed > CLI flags > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`), array-valued keys like `permissions.allow`/`deny` **merge** across layers rather than override, so a domain terminal's local settings can *add* restrictions on top of the shared project settings without needing to redeclare everything.
- **Hooks** — `TeammateIdle`, `TaskCreated`, `TaskCompleted` (Agent-Teams-specific, exit code 2 to block/redirect) sit alongside this repo's existing general-purpose hooks (`pre-tool-guard`, `post-edit-validate`, `teammate-idle-check`, `task-completed-verify` per `MEMORY.md`). Since domain terminals won't be Agent-Teams teammates, the *Agent-Teams-specific* hooks won't fire for them — but the general hooks (PreToolUse etc.) apply to every session regardless, and are the right layer for hard rules like "block any Edit to `supabase/migrations/*` that isn't the highest existing number + 1."

All of the above is drawn directly from: [docs.claude.com/en/docs/claude-code/sub-agents](https://docs.claude.com/en/docs/claude-code/sub-agents), [.../agent-teams](https://docs.claude.com/en/docs/claude-code/agent-teams), [.../worktrees](https://docs.claude.com/en/docs/claude-code/worktrees), [.../cross-session-messaging](https://docs.claude.com/en/docs/claude-code/cross-session-messaging), [.../memory](https://docs.claude.com/en/docs/claude-code/memory), [.../settings](https://docs.claude.com/en/docs/claude-code/settings) — fetched 2026-08-20, describing behavior current through roughly Claude Code v2.1.23x. Version-gated features are called out by version number above; check `claude --version` against these before relying on a specific behavior, since this product ships fast.

---

## 7. Anti-patterns and what NOT to do

**Don't build a "manager agent" or automated handoff layer across domains.** This is the single clearest anti-pattern in the sourced material, and it comes from the team that builds a competing coding agent (Devin) writing candidly about their own failures: Cognition AI's "Don't Build Multi-Agents" argues that subagents "cannot not see what the other was doing," so their work "ends up being inconsistent with each other," and that even giving agents shared context doesn't fix it because "actions carry implicit decisions" that don't transfer. Their concrete example — two subagents building visually inconsistent halves of the same small game — is a direct analogy to what would happen if you let a "farm coordinator" agent silently split a CSA feature between a "CSA terminal" and a "Wholesale terminal" without a human deciding the split. Their prescription: *"I would argue that Principles 1 & 2 are so critical... that you should by default rule out any agent architectures that don't abide by them."* Your plan avoids this because a **human**, not an agent, decides which terminal owns which piece of work — keep it that way; don't automate the dispatch step later without solving the context-sharing problem first.
Source: Cognition AI (Walden Yan), "Don't Build Multi-Agents," cognition.ai/blog, 2025.

**Don't treat "Agent Teams enabled" as solving the multi-human problem.** As noted in §6, this feature is explicitly single-session/single-owner with no nested teams and a fixed lead — using it as your cross-terminal coordination layer would fight the tool's actual design.

**Don't let a domain terminal cache another domain's live data in its own memory or CLAUDE.md.** This directly recreates the stale-context failure mode from §3/§7 — one agent confidently acting on another agent's now-outdated understanding, which is precisely the "conflicting decisions carry bad results" failure Cognition describes and Anthropic's own "agents are stateful and errors compound" section echoes: *"minor system failures can be catastrophic for agents... we can't just restart from the beginning."* Read from Supabase, not from a sibling terminal's notes.

**Don't skip the shared-kernel convention because worktrees "handle isolation."** They don't, for the files listed in §2. This is the single most likely real collision in your setup, and it's the one general git-worktree marketing (including Anthropic's own docs, which are honestly about this) tends to undersell, because most worktree writing assumes cleanly separated modules.

**Don't run more concurrent agents than the domain split actually needs "for speed."** Anthropic's own cost data (agents ~4x a chat turn, multi-agent systems ~15x) plus the Azure guide's explicit warning against "creating unnecessary coordination complexity" both argue for exactly four terminals (CSA, Wholesale, Grants, Flowers) matching your four real domains, not extra helper agents layered on top "just in case."

**On the widely-cited "41-86.7% of multi-agent systems fail in production" statistic:** this figure appears across several of this repo's *existing* research documents (`AGENT_FAILURE_PREVENTION_PATTERNS.md`, `AGENTIC_TEAM_STRUCTURE.md`) and is treated there as sourced. This document did not independently re-verify the underlying primary study during this research session — flagging that explicitly rather than restating it as freshly confirmed. Treat it as directionally credible (it's consistent with what Cognition and Anthropic separately describe about coordination fragility) but not re-audited here.

---

## 8. Recommended architecture

```
Todd's machine                                Loren's machine (or her terminal on this machine)
┌─────────────────────────────────────┐      ┌──────────────────────────┐
│  csa-migration (or main) checkout    │      │  loren/ workspace         │
│                                       │      │  (already gitignored,     │
│  worktree: .claude/worktrees/csa/    │      │   already separate)       │
│    branch: worktree-csa              │      │                            │
│    .claude/settings.local.json:      │      │  git worktree: flowers     │
│      permissions.deny → wholesale/,  │      │    branch: worktree-flowers│
│      grant-portal/**                 │      │    scoped rules for        │
│    .claude/rules/csa.md (paths:)     │      │    admin/floral/**         │
│                                       │      └──────────────────────────┘
│  worktree: .claude/worktrees/        │                  ▲
│    wholesale/                        │                  │  human channel only:
│    branch: worktree-wholesale        │                  │  CHANGE_LOG.md,
│    permissions.deny → box/, route/,  │                  │  active-locks.md,
│    labels/, admin/members/**         │                  │  text/Slack
│                                       │
│  worktree: .claude/worktrees/grants/ │
│    branch: worktree-grants           │
│    (apps/grant-portal — clean        │
│     bounded context already)         │
│                                       │
│  ── cross-session messaging ──►      │  native, same-account,
│     (SendMessage / ListAgents)       │  works between the 3 above
└─────────────────────────────────────┘

        SHARED KERNEL (both CSA + Wholesale worktrees can touch,
        requires announce-before-edit convention, not tool-enforced):
          apps/csa-portal/src/lib/database.types.ts
          apps/csa-portal/src/lib/quickbooks.ts
          apps/csa-portal/src/components/AdminShell.astro
          apps/csa-portal/supabase/migrations/*.sql

        SOURCE OF TRUTH (never cached in agent memory as if live):
          Supabase production database — every domain reads it directly
```

### The coordination mechanism, precisely

1. **Start each domain terminal with `claude --worktree <domain>`** (or have Claude create one with "work in a worktree" — same mechanism). This gets you the hard tool-level isolation described in §2 for free, with no custom scripting.
2. **Per-worktree `.claude/settings.local.json`** adds `permissions.deny` rules (glob-matched `Edit(...)`/`Read(...)` patterns) for the other domains' page directories. This is the hard boundary. Start conservative (deny the obviously-not-yours directories) and loosen only if a legitimate cross-domain edit turns out to be common.
3. **Per-worktree `.claude/rules/<domain>.md`** with `paths:` frontmatter gives each terminal domain-specific vocabulary/conventions (e.g., a `csa.md` rule explaining flex orders and cutoff windows; a `wholesale.md` rule explaining chef pricing tiers and invoicing) without bloating the shared root `CLAUDE.md`.
4. **`.claude/settings.local.json` → `claudeMdExcludes`** in each worktree hides the other domains' rule files from context, keeping token spend down and reducing the chance the agent second-guesses itself based on irrelevant sibling-domain instructions.
5. **The shared-kernel list gets a real home in `.claude/rules/active-locks.md`** (which already exists and already has the right framing — "RULE: Do NOT modify any file listed as locked without confirming the lock is released first" — it's just currently unused). Extend it: any domain terminal that's about to touch a shared-kernel file adds a line (file + terminal + timestamp), removes it when done. This is a lease/claim file, exactly the pattern the request asked about — it already half-exists in this repo.
6. **Todd's own cross-terminal handoffs use native cross-session messaging** ("tell the Wholesale session the QuickBooks client's function signature changed") instead of the file-based INBOX/OUTBOX system this repo has already deprecated once (per `MEMORY.md`) — don't rebuild that.
7. **Todd↔Loren stays human-mediated**: `CHANGE_LOG.md` entries, the same `active-locks.md`, and direct communication. No native tooling bridges this; don't try to build one.
8. **Database concurrency stays a database problem, solved with database tools** — row locks (`FOR UPDATE`), idempotent upserts (`ON CONFLICT DO NOTHING`/`DO UPDATE`), unique constraints for dedup — exactly as this repo's migrations already do. Extend the existing standard (write it into a `.claude/rules/database.md` shared-kernel rule, symlinked into every domain worktree) rather than inventing a new one: *any migration touching a table another domain also writes to must use these primitives, no exceptions.*
9. **Keep the domain terminals to exactly four** (CSA, Wholesale, Grants, Flowers) matching real bounded contexts — resist adding a fifth "coordinator" agent per §7.

---

## Open Questions for Todd

1. **Do you want the CSA/Wholesale split to eventually become a real code split** (separate Astro app, like `grant-portal`), removing the shared-kernel risk at the source? That's a bigger refactor than this document's scope, but it's the actual long-term fix for the CSA/Wholesale entanglement — the recommendation above is the "keep it entangled but manage it" version, not the "fix it" version. This connects to the already-noted `memory/project_backend_migration.md` future backend migration — worth deciding whether to do the domain split before or after that migration.
2. **Should Loren's `loren/` workspace get its own worktree/branch**, or does her current gitignored-directory setup already give her what she needs? Her flower-admin pages (`admin/floral/**`) still live inside the shared csa-portal app, so she has the same shared-kernel exposure as Wholesale — worth confirming she's aware of that.
3. **How strict should the `permissions.deny` boundaries be on day one?** Starting conservative (deny broadly, loosen on friction) versus starting loose (allow broadly, tighten after a collision) is a real tradeoff — conservative costs a few "wait, I need to touch that file too" interruptions early; loose risks a real collision before the boundary gets written.
4. **Who owns the shared-kernel files' migration numbering** when two domain terminals are both mid-work? A simple rule (lowest-numbered pending migration merges first, others rebase) would remove ambiguity — worth deciding now rather than at the moment of an actual collision.

---

## Sources

- Microsoft Azure Architecture Center, "AI Agent Orchestration Patterns," learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns, last updated 2026-02-12. Fetched 2026-08-20.
- James Croft, "Applying Domain-Driven Design Principles to Multi-Agent AI Systems," jamescroft.co.uk/applying-domain-driven-design-principles-to-multi-agent-ai-systems, published 2026-04-08, last updated 2026-05-04. Fetched 2026-08-20.
- Anthropic, "How we built our multi-agent research system," anthropic.com/engineering/multi-agent-research-system, published 2025-06-13. Fetched 2026-08-20.
- Cognition AI (Walden Yan), "Don't Build Multi-Agents," cognition.ai/blog/dont-build-multi-agents, published 2025. Fetched 2026-08-20.
- Anthropic, Claude Code documentation (current as of fetch date, version-gated features noted inline): "Subagents" (docs.claude.com/en/docs/claude-code/sub-agents), "Agent teams" (.../agent-teams), "Worktrees" (.../worktrees), "Cross-session messaging" (.../cross-session-messaging), "Memory" (.../memory), "Settings" (.../settings). Fetched 2026-08-20.
- This repository, verified directly: `apps/csa-portal/`, `apps/grant-portal/`, `.gitignore` (line 88-91, Loren's workspace), `.claude/agents/`, `.claude/rules/`, `.claude/settings.local.json`, `CHANGE_LOG.md` (concurrency/collision references at lines 124, 511, 799, 866, 878, 941, 1427, 1833, 2151, 2192, 2304, 2306, 2402, 2434, 2447, 2918, 2928, 4464), `git worktree list`, `git branch -a`. Verified 2026-08-20.
- Existing internal research (referenced, not duplicated): `docs/research/AGENTIC_TEAM_2026_UPDATE.md`, `docs/research/AGENT_FAILURE_PREVENTION_PATTERNS.md`, `docs/research/ACADEMIC_AGENT_RESEARCH.md`, `docs/research/AGENTIC_TEAM_STRUCTURE.md`.

**Research limitation, stated plainly:** general web search (DuckDuckGo, Bing non-JS, five public SearXNG instances) was blocked or degraded by anti-bot measures for most of this session, after an initial handful of successful queries. Sources above were reached either from that initial search window or by fetching known, credible URLs directly. This is sufficient for the primary questions (Claude Code mechanics, orchestration pattern taxonomy, one strong DDD source, one strong anti-pattern source), but a broader search — particularly for real small-team/small-business post-mortems of concurrent-agent git collisions, which appear not to be well-documented publicly at any scale — was not possible in this session and would strengthen §2 and §7 further if redone when search access is available.

**Date researched:** 2026-08-20
