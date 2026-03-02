# CLAUDE.md — Tiny Seed Farm OS

These rules are loaded at session start. They are NON-NEGOTIABLE.

---

## Core Rules (PM_ARCHITECT Accountability)

1. **No background agents during active user interaction** — work WITH the user directly
2. **Verify before claiming done** — never trust "done" without evidence
3. **System health check at session start** — know the state before working
4. **Be honest about broken things** — never say "100% functional" without proof
5. **Know the system before user asks** — proactively identify issues
6. **Respond immediately** — don't let agents run 6+ minutes while user waits

---

## STEP 0: READ SYSTEM INVENTORY (MANDATORY)

Read `SYSTEM_INVENTORY.md` — this is the ONE authoritative inventory of everything in Tiny Seed OS. It maps every page, every backend module, every integration. If you skip this, you WILL make false claims about what exists or doesn't exist.

Also read `/tmp/TINYSEED_CONTEXT_SNAPSHOT.md` (backup: `CONTEXT_SNAPSHOT.md`) for session continuity.

**If you don't know something, SAY SO.** Do not guess. Do not assume. Verify or ask.

## STEP 0B: LOAD PM RULES

Read `.pm_rules.json` for enforceable rules: NO_DUPLICATE_FILES, READ_BEFORE_EDIT, NO_HALLUCINATION, VERIFY_BEFORE_DONE, CHECK_MANIFEST, UPDATE_CHANGELOG, DEPLOY_BOTH.

---

## AGENT TEAMS COORDINATION

Agents coordinate via Claude Code's **native Agent Teams**, NOT file-based INBOX/OUTBOX.

| Mechanism | Purpose |
|-----------|---------|
| `TaskCreate` / `TaskList` | Shared task board for all agents |
| `SendMessage` | Direct messages between agents |
| `TeamCreate` / `TeamDelete` | Create and clean up teams |
| `TeammateIdle` hook | Validates work before agent goes idle |
| `TaskCompleted` hook | Runs verification before task closes |

Agent definitions (8 agents with YAML frontmatter): `.claude/agents/*.md`
Skills: `.claude/skills/` (`/deploy-backend`, `/deploy-frontend`, `/verify-html`, `/pre-work-check`)

**DEPRECATED:** `claude_sessions/*/INBOX.md`, `claude_sessions/*/OUTBOX.md`, `tinypm/.claude_intercom.json`

---

## STEP 2: CHECK CONFIGURATION

Before declaring anything "missing": check `tinypm/.env` and `claude_sessions/SYSTEM_STATUS.md`.

## STEP 3: CHECK MANIFEST BEFORE BUILDING

Read `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` before creating ANY new file or function.

## STEP 4: CHECK FOR DUPLICATES

Before adding ANY function or HTML file, search for similar existing ones.
Run `Glob **/*[keyword]*.html` before creating ANY new `.html` file.

**Do NOT create new:** Morning Brief (4 exist), Approval System (2 exist), Email Processing (3 exist), or any dashboard (14 exist — see `docs/CLAUDE_MD_REFERENCE.md`).

## STEP 5: LOG YOUR CHANGES

After completing ANY work, update `CHANGE_LOG.md` (date, role, files, why).

---

## STEP 6: SYSTEM INTEGRATION CHECK (Mandatory)

**Before modifying ANY system, answer:** "What other systems read or write the same data?"

1. Check `DATA_CONTRACTS.md` for affected metrics/endpoints
2. Grep `MERGED TOTAL.js` for affected sheet names
3. Grep all HTML files for affected API action names
4. If changing a sheet schema → verify ALL frontend consumers
5. If changing an API response → verify ALL frontend callers

### Cross-System Verification Matrix
| If you change... | Also verify... |
|------------------|---------------|
| PLANNING_2026 schema | calendar.html, planning.html, index.html, succession.html, greenhouse.html |
| UNIFIED_TASKS schema | task-assignment.html, manager-dashboard.html, index.html, employee.html |
| Any customer sheet | wholesale.html, chef-order.html, csa.html, customer.html, sales.html |
| Morning brief response | index.html, chief-of-staff.html, manager-dashboard.html |
| Employee/USERS schema | employee.html, admin.html, employee-management.html, schedule.html |
| Task completion logic | ALL pages that show task counts/stats |

---

## STEP 7: VERIFICATION BEFORE "DONE"

**No agent may declare "done" without passing verification gates.**

| Task Type | Required Verification |
|-----------|----------------------|
| Bug fix | Test execution + output captured |
| UI change | Screenshot or DOM verification |
| API change | curl response captured |
| Deployment | Live endpoint verification |
| File creation | File exists + parses correctly |

**DEPLOYED ≠ DONE.** The USER must verify functionality works.

---

## STEP 8: SECURITY AUDIT PROTOCOL

**Full protocol:** `docs/system/AUDIT_PROTOCOL.md`

### Gate 1: Pre-Commit (Automatic)
The pre-commit hook (`scripts/pre-commit-hook.sh`) enforces 13 checks including:
- Hardcoded secrets detection (blocks commit)
- Banned JS patterns: `eval()`, `new Function()`, `setTimeout(string)` (blocks commit)
- innerHTML injection warnings
- SRI hash verification on CDN resources
- CSP meta tag checks

### Gate 2: Weekly Full Audit
Run: `./scripts/security-audit.sh`
- Pass 1: Context build (entry points, data flows, trust boundaries)
- Pass 2: Security sweep (OWASP Top 10 focused on our stack)
- Pass 3: Red team checklist (manual adversarial testing)

### Gate 3: PR Auto-Review
`.github/workflows/security-review.yml` — Anthropic Claude reviews every PR automatically.

### Non-Negotiable Architecture Rules
- Server-side price lookup (never trust client prices)
- Server-side quantity validation
- LockService on all Sheets writes
- Formula injection prevention (`'` prefix on user values)
- No secrets in git history
- Whitelist the `action` parameter

---

## FORBIDDEN ACTIONS

1. **NEVER** create a new file without checking SYSTEM_MANIFEST.md first
2. **NEVER** add demo/sample data fallbacks (show errors instead)
3. **NEVER** hardcode API URLs (use `api-config.js`)
4. **NEVER** touch files outside your role's scope
5. **NEVER** deploy without updating CHANGE_LOG.md
6. **NEVER** skip the duplicate check
7. **NEVER** create a new Morning Brief, Approval system, or dashboard
8. **NEVER** run `clasp deploy` without the `-i` flag
9. **NEVER** use any API URL other than the one in `api-config.js`
10. **NEVER** remove HTML elements without updating the JavaScript that references them
11. **NEVER** change frontend without checking the associated backend
12. **NEVER** create a new HTML file without searching for existing files first

---

## EXTERNAL WEBSITE CHANGES (Shopify, etc.)

**NEVER PUBLISH WITHOUT HUMAN APPROVAL.** Full rules: `docs/system/EXTERNAL_SITE_RULES.md`

---

## API URL & DEPLOYMENT

```
Deployment ID: AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm
Full URL: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
```

```html
<script src="web_app/api-config.js"></script>
<script>const API_URL = TINY_SEED_API.MAIN_API;</script>
```

```bash
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "Description"
```

NEVER run bare `clasp deploy` (creates NEW deployment, breaks everything). Validate: `./scripts/validate-api-urls.sh`

---

## KEY URLS

| Resource | URL |
|----------|-----|
| API Endpoint | `https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec` |
| Google Sheet | `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc` |
| GitHub Pages | `https://toddismyname21.github.io/tiny-seed-os/` |

---

## QUICK REFERENCE FILES

| File | Purpose |
|------|---------|
| `CHANGE_LOG.md` | Central change tracking |
| `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` | Complete system inventory |
| `claude_sessions/CLAUDE_INTEGRATION_STANDARDS.md` | Coding standards + frontend/backend sync |
| `.claude/agents/*.md` | Agent role definitions (8 agents with YAML frontmatter) |
| `docs/CLAUDE_MD_REFERENCE.md` | Extended tables: dashboards, UX audit, preflight scripts, verification tools |
| `docs/system/EXTERNAL_SITE_RULES.md` | Shopify/external site rules |
| `docs/system/SESSION_CONTEXT.md` | Owner info, CSA stops, key files |
| `docs/system/GOVERNOR_PROTOCOL.md` | Governor system tracking |
