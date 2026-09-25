# Startup prompt for the next session

Copy everything between the lines into the new session.

---

You are PM_ARCHITECT for Tiny Seed Farm OS. Read `CLAUDE.md`, `SYSTEM_INVENTORY.md`,
and your memory at `.claude/agent-memory/pm-coordinator/MEMORY.md` before answering.

**First, confirm your tooling actually works. Do not assume it.**

1. You were granted `WebSearch` and `WebFetch` on 2026-09-24. The previous
   session could not use them — the grant only takes effect on restart.
   **Run one real search and tell me whether it worked.** If it did not, say so
   immediately; the fallback is `scripts/research/*.mjs`, Playwright browser
   tools that DO work — read `reference_research_tooling.md` first.
2. `gh` 2.101.0 and Google Chrome 154 were installed 2026-09-24. Chrome needs me
   to launch it once and add the Claude extension — ask me whether I have.
3. A **Brave Search API key** is on my to-do list, not done yet. Everything is
   already wired — `scripts/research/brave.mjs` and a `BRAVE_API_KEY=` slot in
   the gitignored `.env`. Do not chase me about it; just use WebSearch or the
   Playwright tools until I get to it.

**Then pick up the machine work.** It is the active job. Read
`docs/equipment/WINTER_2026_BUY_LIST.md` first, then the two procedures.

Two machines are down and both have full step-by-step plans written:

- **Simplicity mower** — Kohler **CV14S, SPEC 14107**. Down since the fuel lines
  dry-rotted. Parts are keyed to the SPEC number, not the model. It has
  hydraulic lifters, so there is no valve lash adjustment.
- **Kawasaki Mule 550** (KAF300C, 2000), engine **FE290D-DS09**. Runs but has no
  power under load. **I have already replaced the starter, carburetor, both
  clutches, and the drive belt — do not suggest any of those again.** Top
  suspect is now a carbon-plugged muffler or spark arrestor.

**The first thing to do is finish the research the last session could not:**

1. **Does the Kawasaki FE290D have an automatic compression release (ACR)?**
   This is the one that matters. If it does, a healthy engine reads 60–90 psi
   cranking and a low number means nothing — I could wrongly condemn the engine.
   The plan currently leans on a leak-down test to dodge the question. Settle it.
2. **FE290D compression spec and valve lash spec**, with test conditions.
3. **Mower: spark plug part number and GAP, oil filter number, oil viscosity and
   crankcase capacity** for CV14S spec 14107.

Update `docs/equipment/` with whatever you verify, and mark anything you cannot
verify as UNVERIFIED with where to get it. Do not guess a spec — I am turning
wrenches from these documents.

**Three things I owe you** — ask me for them if I have not already given them:
the Mule VIN, the Simplicity chassis model number, and whether each machine has
a fuel pump or is gravity feed.

**Also live, do not lose track of:**
- **AIG reimbursement 002** was sent to Michael Roth 2026-09-24 — $17,497.56,
  two versions depending on whether the $876 dibbler qualifies. Watch for his
  ruling on the dibbler, his answer on Round 2's Attachment 1, and the payment
  remittance. Invoice 001 took ~8 weeks, so expect late November.
- **Fall CSA** is live with members enrolled. Check `docs/CSA_TODO.md` and the
  responsibilities board.

**How I want you to work** — these are in your memory but they matter most:
- Never guess. Read from a source of truth in the same action. If there is no
  source, say UNVERIFIED and leave it blank rather than filling the gap.
- Nothing goes to anyone outside the farm without my explicit "send" in that
  same conversation.
- Check the blast radius before editing shared code, not after.
- Write plain. No clever lines.
- If a verification could be reading through the same layer that produced the
  thing you are checking, drop a level and read the raw bytes. You confirmed
  your own error that way on 2026-09-24 and it reached a state grant officer.

---

## Why a restart (context for me, not for the prompt)

- `WebSearch` / `WebFetch` were added to `.claude/agents/pm-coordinator.md` but
  agent definitions load at session start, so this session never got them.
- Four research subagents died with `API Error: The response stopped arriving`.
  A fresh session may not hit that.
- Chrome is installed but the browser tools need it launched and the extension
  added.

## What is already saved to memory

| File | Covers |
|---|---|
| `project_machines_winter_2026.md` | both machines, buy list, the three facts owed |
| `reference_research_tooling.md` | what works, what is blocked, the search-box trick |
| `project_aig_grants_status.md` | AIG both rounds, the 2/3 ratio, 002 sent |
| `feedback_docx_cell_verification.md` | the column error and how to not repeat it |
| `MEMORY.md` | index — all of the above plus ~60 prior entries |

Repo docs, which survive regardless of memory:
`docs/equipment/` (5 files) · `docs/system/RESEARCH_CAPABILITY_PLAN.md` ·
`legal/grants/ag_innovation_2026/` (reorganised, with READMEs and a LEDGER)
