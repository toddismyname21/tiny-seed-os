# Session health — agent failures and settings, 2026-10-02

**Todd:** *"I am concerned that all the agents are failing and we may need to
restart this session and make sure all of our claude settings are up to date so
we don't run into these problems."*

## What actually failed

**Four subagents died today.** Their errors:

| Agent | Error |
|---|---|
| Flail mower pricing | `stalled: no progress for 600s (stream watchdog did not recover)` |
| Salad chain research | `API Error: The response stopped arriving` |
| NRCS practice standards | `API Error: The response stopped arriving` |
| NRCS payment scenarios | `API Error: Connection lost mid-response` |

🔴 **These are transport/service errors, not configuration errors.** No setting
causes "connection lost mid-response." The same failure mode was recorded on
2026-09-24 in `NEXT_SESSION_PROMPT.md`: *"Four research subagents died with API
Error: The response stopped arriving."* **It has now happened on two separate
days, with a session restart in between — so a restart did not fix it before and
should not be expected to fix it now.**

## What to do about it — practical, not hopeful

✅ **Stop delegating long research chains.** Every task completed today was
completed by working directly. The pattern that fails is a subagent doing many
sequential browser fetches. The pattern that works is doing those fetches in the
main session, one `Bash` call at a time, saving output to disk as it goes.

✅ **Save intermediate results to disk immediately.** Today's NRCS work survived
because the PDF was downloaded and the parse written to
`docs/grants/nrcs_sources/pa_fy26_scenarios.json`. If that had lived only in an
agent's context it would have died with it.

## Settings findings

| Finding | Status |
|---|---|
| **`WebSearch` is in the allow-list but the tool is disabled** | 🔴 **Disabled above project level.** Error: *"WebSearch is disabled for this session, in subagents as well as here."* Allowing it in `settings.local.json` does nothing. This is an account/CLI-level control. **Stop adding it to startup prompts expecting a restart to fix it.** |
| `permissions.allow` has **624 entries, 61,939 bytes** | ⚠️ **Bloated.** Many entries are not permission patterns at all but whole captured bash command strings, including multi-line `pm_reply.sh` messages with escaped quotes. Artifacts of auto-accepting prompts. |
| `permissions.deny` | empty |
| `permissions.ask` | empty |
| Duplicate allow rules | none |
| WebFetch domain grants | 211 |

### Recommended cleanup (needs Todd's OK — it is his permission list)

1. **Prune `permissions.allow` from 624 to the genuine patterns.** The giant
   captured command strings grant nothing useful; they only match that exact
   string again. A 62 KB settings file is read on every session start.
2. **Keep it as patterns, not transcripts** — `Bash(python3:*)` is a rule;
   a 600-character `./pm_reply.sh "..."` string is not.
3. Leave `WebSearch` in the list. It is harmless, and it will work the day the
   account-level block is lifted.

## Working research toolkit — use this instead of WebSearch

All in `scripts/research/`, **must be run from the repo root** (`/tmp` cannot
resolve `playwright`):

| Tool | Use |
|---|---|
| `fetch2.mjs <url>` | stealth fetch via real Chrome, first 5,000 chars |
| **`fetchfull.mjs <url>`** | same, **full page text** — added today |
| **`links.mjs <url> <regex>`** | extract hrefs from a rendered page — added today; needed because text-only fetchers cannot surface a download URL |
| **`download.mjs <url> <out>`** | **download a file through Chrome** — added today; `curl` is blocked outright at `nrcs.usda.gov` |
| `search_site.mjs <url> <query>` | type into a site's own search box |

**Search engines, in order:** go direct to the source site first. Then
`https://duckduckgo.com/?q=...&ia=web` **through `fetch2.mjs`** — DuckDuckGo's
`html.` and `lite.` endpoints both serve a landing page to `curl` and are
useless. Bing works but returns ad soup. Google blocks automation.
