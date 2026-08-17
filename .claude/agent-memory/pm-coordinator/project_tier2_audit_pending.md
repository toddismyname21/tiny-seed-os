---
name: Tier 2 Live Audit — Next Session
description: Tier 1 audit complete and deployed. Tier 2 live walkthrough is the immediate next task.
type: project
---

Tier 1 automated audit is fully complete as of 2026-04-05. All fixes deployed.

**Why:** Full OS audit in progress to verify everything functions as intended before farm season.

**Next session task: Tier 2 — Live site walkthrough**
User has remote control active and will click through the live site at:
https://toddismyname21.github.io/tiny-seed-os/

Walk through these 8 flows IN ORDER, fix issues as found:

| # | Flow | URL | What to verify |
|---|------|-----|----------------|
| 1 | Hub loads | index.html | Morning brief, weather, task count, pending badge |
| 2 | Employee login + time clock | employee.html | PIN login, clock in/out |
| 3 | Employee Management | web_app/employee-management.html | Employee list loads, pending tab works |
| 4 | Schedule | web_app/schedule.html | Week grid, create shift with Field Location |
| 5 | CSA portal | web_app/csa.html | Login, share info shows |
| 6 | Greenhouse dashboard | web_app/greenhouse-dashboard.html | Tasks load, tray inventory |
| 7 | Wholesale/chef order | web_app/wholesale.html | Products load, can place order |
| 8 | Financial dashboard | web_app/financial-dashboard.html | Numbers load, no blank panels |

**How to apply:** Start session by reading this file, then say "Ready for Tier 2 — open the hub and tell me what you see."
