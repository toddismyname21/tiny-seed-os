# SYSTEM_INVENTORY.md — Tiny Seed Farm OS
## THE ONE INVENTORY. READ THIS FIRST. EVERY SESSION.

**Last Updated:** 2026-03-01
**Updated By:** PM_Architect Claude (Opus 4.6)
**Replaces:** SYSTEM_MANIFEST.md, MASTER_SYSTEM_INVENTORY.md, VERIFIED_SYSTEM_INVENTORY.md, API_INVENTORY.md

---

## AGENT COORDINATION ARCHITECTURE

**Active System (2026-03-01):** Claude Code Native Agent Teams

| Component | Location | Purpose |
|-----------|----------|---------|
| Agent definitions (8) | `.claude/agents/*.md` | Agent roles with YAML frontmatter (name, tools, model, memory) |
| Skills (4) | `.claude/skills/*/SKILL.md` | Reusable workflows: deploy-backend, deploy-frontend, verify-html, pre-work-check |
| Hook scripts (4) | `scripts/hooks/*.sh` | pre-tool-guard, post-edit-validate, teammate-idle-check, task-completed-verify |
| Settings | `.claude/settings.local.json` | Hooks config, env vars, permissions, Agent Teams flag |

**Agent Roster:**

| Agent | Model | Tools | Role |
|-------|-------|-------|------|
| pm-coordinator | opus | Read, Grep, Glob, Bash, Agent | Coordination, architecture, quality gates |
| fullstack-builder | opus | Read, Edit, Write, Bash, Grep, Glob | Frontend + backend implementation |
| verifier | sonnet | Read, Grep, Glob, Bash | Quality verification (read-only) |
| audit-claude | sonnet | Read, Grep, Glob, Bash | Security audit (read-only) |
| ux-designer | sonnet | Read, Grep, Glob, Bash | Design system enforcement (read-only) |
| researcher | haiku | Read, Grep, Glob, Bash, WebSearch, WebFetch | Research and investigation |
| file-organizer | sonnet | Read, Edit, Write, Bash, Grep, Glob | File moves, renames, cleanup |
| integration-watcher | sonnet | Read, Grep, Glob, Bash | Cross-system impact analysis (read-only) |

**Deprecated (archived, not deleted):**

| Component | Location | Notes |
|-----------|----------|-------|
| INBOX/OUTBOX pairs (24) | `claude_sessions/*/INBOX.md`, `*/OUTBOX.md` | Replaced by Agent Teams TaskCreate/SendMessage |
| Intercom | `tinypm/.claude_intercom.json` (1.3 MB) | Replaced by Agent Teams messaging |

---

## HONEST CONTEXT DISCLAIMER

This inventory reflects what I KNOW as of Feb 28, 2026. Items marked ✅ were verified by reading actual code. Items marked ⚠️ are based on older inventories and may be stale. Items marked ❓ I have not personally verified. If you're a new session: READ this, but VERIFY before making claims to the user.

---

## SYSTEM SIZE

| Component | Size | Notes |
|-----------|------|-------|
| Backend: `apps_script/MERGED TOTAL.js` | **148,589 lines** | Single deployment file, **~600+ API action endpoints**, **~2,795 functions** |
| Backend: active auxiliary files (12) | ~11,200 lines | SatelliteService, ClaudeCoordination, NotificationBatching, SeasonalPatterns, ShopifySalesSync, etc. |
| Backend: stub files (30) | Merged | All ChiefOfStaff_*, SmartAvailability, SmartLabor, MarketModule, etc. — ALL MERGED into MERGED TOTAL |
| Backend: server-side HTML templates (14) | ~17,000 lines | ChiefOfStaffDashboard, FinancialDashboard, FieldMobileCapture, etc. |
| Frontend: HTML files (40+) | **276,022 lines total** | Single-file apps, some are massive platforms |
| Google Sheets | **216 unique sheet names** | The entire database |
| External API integrations | **18 services** | Anthropic, OpenAI, Meta/Instagram, Twilio, Ayrshare, Plaid, PayPal, Alpaca, Shopify, QuickBooks, SerpAPI, Pinterest, TikTok, PhotoRoom, Telegram, Google Calendar/Gmail/Drive, Open-Meteo |
| MCP Server (`mcp-server/`) | ~40+ tools | Shopify, PayPal, farm ops, Chief of Staff |

---

## FRONTEND — PAGES BY FUNCTIONAL AREA

### Mega-Pages (5,000+ lines — these are FULL APPLICATIONS, not "pages")

| File | Lines | What It Actually Is |
|------|-------|---------------------|
| `web_app/marketing-command-center.html` | 42,423 | ✅ Full marketing platform: content calendar, social posting, GBP, SEO, AI content generation, A/B testing, voice notes, competitor monitoring, email campaigns, CSA renewals, referrals |
| `employee.html` | 27,566 | ✅ Crew mobile app: time clock, task queue, harvest logging, scouting, treatments, IPM, hazard reporting, weed pressure, crew messaging, GPS tracking |
| `web_app/loan-readiness.html` | 19,174 | ⚠️ Loan readiness assessment tool |
| `soil-tests.html` | 13,623 | ✅ **13-tab unified farm systems platform**: soil tests, tissue tests (Penn State, 22 crops, 11 nutrients), amendment calculator (Albrecht method, 80+ products), amendment history, inventory (6 categories: SEED/AMENDMENT/FERTILIZER/PESTICIDE/BIOLOGICAL/SUPPLY), foliar spray programs (AEA), fertigation, IPM toolkit, plant doctor, USDA organic compliance, farm insights, field zones |
| `index.html` | 12,435 | ✅ Main dashboard: morning brief, task queue with AI priority, weather, harvest alerts, quick actions |
| `web_app/financial-dashboard.html` | 9,238 | ⚠️ Financial overview: P&L, debts, investments, bank accounts |
| `web_app/chief-of-staff.html` | 8,871 | ✅ AI command center: email triage, task management, proactive alerts, unified task API |
| `calendar.html` | 8,213 | ⚠️ Farm calendar: planting dates, task timeline |
| `web_app/sales.html` | 7,444 | ⚠️ Sales management: orders, customers, CSA, pick/pack, reports |
| `web_app/csa.html` | 5,882 | ⚠️ CSA member portal |
| `web_app/admin.html` | 5,473 | ✅ Admin panel: user management, social brain, standing orders, email campaigns, AI config |
| `web_app/driver.html` | 5,394 | ✅ Driver delivery app: route tracking, GPS, delivery proof, SMS notifications |

### Standard Pages (2,000-5,000 lines)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `web_app/seo_dashboard.html` | 4,351 | SEO analytics | ⚠️ |
| `web_app/greenhouse-dashboard.html` | 4,282 | ✅ Greenhouse: today's tasks, tray inventory, growth tracking, sales, reports, print engine |
| `seed_inventory_PRODUCTION.html` | 4,171 | ✅ Seed lot tracking with QR codes |
| `web_app/seedling-presale-2026.html` | 3,590 | ✅ Customer-facing presale ordering |
| `web_app/garage.html` | 3,240 | ✅ Fleet/equipment: parts inventory, manuals, service schedules |
| `labels.html` | 3,218 | ✅ Label printing (uses print-engine.js) |
| `web_app/manager-dashboard.html` | 3,069 | ✅ Manager AI dashboard: priority queue, workload, alerts |
| `web_app/seedling-admin.html` | 2,972 | ✅ Admin view for presale orders |
| `food-safety.html` | 2,912 | ✅ Compliance: food safety forms, task tracking |
| `farm-operations.html` | 2,909 | ⚠️ Field operations overview |
| `flowers.html` | 2,861 | ✅ Flower management: varieties, bulb inventory, task tracking |
| `web_app/wholesale.html` | 2,783 | ✅ Chef ordering portal |
| `planning.html` | 2,782 | ✅ Crop planning: succession wizard, bed assignments |
| `web_app/field-planner.html` | 2,623 | ✅ Visual bed assignment |
| `web_app/accounting.html` | 2,568 | ⚠️ Accounting: receipts, grants, expense categories |
| `web_app/customer.html` | 2,490 | ⚠️ Customer ordering portal |
| `web_app/satellite-map.html` | 2,485 | ✅ NDVI satellite monitoring |
| `web_app/schedule.html` | 2,435 | ✅ HR: time-off requests, scheduling |
| `web_app/chef-order.html` | 2,394 | ✅ Chef mobile ordering |
| `inventory_capture.html` | 2,366 | ✅ General inventory capture |
| `succession.html` | 2,358 | ✅ Succession planning wizard |
| `web_app/food-safety.html` | 2,138 | ⚠️ Food safety (staff version) |
| `web_app/task-assignment.html` | 2,122 | ✅ Task management: bulk ops, AI priority, at-risk |

### Smaller Pages (<2,000 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `web_app/farmers-market.html` | 1,833 | Market management |
| `sowing-sheets.html` | 1,823 | Sowing records |
| `web_app/market-sales.html` | 1,779 | Market POS |
| `greenhouse.html` | ~1,700 | Greenhouse tracking (older) |
| `web_app/ai-assistant.html` | ~1,500 | Claude AI chat |
| `web_app/social-intelligence.html` | ~1,400 | Social analytics |
| `web_app/employee-management.html` | ~1,200 | Employee admin |
| `web_app/employee-onboarding.html` | ~1,000 | Onboarding |
| `web_app/delivery-zone-checker.html` | ~900 | Delivery zones |
| `web_app/neighbor.html` | ~800 | Public landing page |
| `web_app/log-commitment.html` | ~700 | SMS commitment logging |
| `smart_learning_DTM.html` | ~600 | Days-to-maturity learning |
| `track.html` | ~500 | GPS tracking |
| `login.html` | ~400 | PIN authentication |
| Various legal, print, diagnostic | <400 | eula, privacy-policy, api_diagnostic |

---

## BACKEND — WHAT'S ACTUALLY IN MERGED TOTAL.js

### API Endpoints (~600+ total actions across doGet + doPost)

**Verified Feb 28 via code audit (all stub files confirmed MERGED into MERGED TOTAL.js):**
- Auth/Security: 12 actions
- AI Assistant: 6 actions
- Chief-of-Staff Workflow Engine: 35 actions
- Morning Brief System: 8 actions (5 generators — needs consolidation)
- Chief-of-Staff 2.0 Smart Priority: 8 actions
- Email Intelligence: 12 actions
- Memory System: 8 actions
- Autonomy System: 8 actions
- Proactive Intelligence: 7 actions
- AI Rule Enforcement: 5 actions
- Style Mimicry: 5 actions
- Calendar AI: 10 actions
- Predictive Analytics: 10 actions
- SMS Intelligence: 5 actions
- Voice Interface: 3 actions
- File Organization: 6 actions
- Multi-Agent System: 5 actions
- Planning & Production: 25 actions
- Task Management: 10 actions
- Predictive Intelligence (Farm): 6 actions
- Smart Availability Engine: 6 actions ✅ (IS MERGED — old inventory was wrong)
- Smart Labor Intelligence: 14 actions ✅ (IS MERGED — old inventory was wrong)
- Chef Management: 12 actions
- Pre-Harvest Inspection: 3 actions
- Compliance & Food Safety: 24 actions
- Inventory System: 16 actions
- Financial System: 40+ actions
- Plaid Banking: 8 actions
- PayPal: 5 actions
- Alpaca Markets (stock/crypto trading!): 20+ actions
- QuickBooks: 10 actions
- Shopify Integration: 25+ actions
- Sales Module: 20 actions
- CSA System: 20+ actions
- Wholesale: 8 actions
- Delivery & Routing: 25 actions
- Fleet & Garage: 20 actions
- Employee Mobile App: 20 actions
- Employee HR: 12 actions
- Marketing Intelligence: 30+ actions
- Social Listening: 12 actions
- SEO System: 20+ actions
- Marketing Automation: 12 actions
- Content Calendar: 8 actions
- Social Posting: 12 actions
- Irrigation: 12 actions
- Field Management: 12 actions
- Crop Rotation & Field Plan: 12 actions
- Wildlife Tracking: 6 actions
- SMS/Notifications: 15 actions
- Satellite & Scouting: 12 actions
- AI Priority Scoring: 6 actions
- Seasonal Patterns: 8 actions
- Farmers Market: 14 actions
- Weekly Cycle System: 8 actions
- Flower Operations: 8 actions
- Accounting: 15 actions
- Loan Readiness: 12 actions
- Claude Coordination: 15 actions
- Seed Inventory & Traceability: 5 actions
- Label Generation: 5 actions
- System/Diagnostics: 8 actions
- Feature Flags: 3 actions
- Weather & Integrations: 8 actions

### Google Sheets (data storage)

**Core Reference:**
REF_Crops, REF_Beds, REF_Fields, REF_CropProfiles, USERS/EMPLOYEES

**Operations:**
PLANNING_2026, HARVEST_LOG, UNIFIED_TASKS, TIMECLOCK, TASKS (legacy)

**Sales/CRM:**
WHOLESALE_CUSTOMERS, WHOLESALE_ORDERS, WHOLESALE_STANDING_ORDERS, CSA_MEMBERS

**Inventory (11 systems!):**
SEED_INVENTORY, TRAY_INVENTORY, FARM_INVENTORY, INVENTORY_PRODUCTS, INVENTORY_TRANSACTIONS, SOIL_AMENDMENTS, FOLIAR_APPLICATIONS, IPM_SPRAY_SCHEDULES, FERTIGATION_DATA, GARAGE_PartsInventory, FLOWER_INVENTORY

**Financial:**
TRANSACTIONS, ACCOUNTS, INVESTMENTS, DEBTS, BANK_ACCOUNTS, BILLS

**Other:**
SATELLITE_FIELDS, SATELLITE_READINGS, SATELLITE_ALERTS, TIME_OFF_REQUESTS, EMPLOYEE_HR_STATS, GARAGE_Manuals, GARAGE_ServiceSchedule, SCOUTING_REPORTS, HAZARD_REPORTS, DTM_LEARNING, CREW_MESSAGES

---

## WHAT'S BUILT BUT HAS NO FRONTEND

These have complete backend APIs but no dedicated UI page:

| System | Backend Status | What Exists | What's Missing |
|--------|---------------|-------------|----------------|
| **Harvest Planner** | ✅ Complete | recordHarvest, predictHarvestDate (GDD), getWeeklyHarvestPlan (demand-matched), pre-harvest compliance, HARVEST_LOG sheet | No dedicated harvest planning page. Logging exists in employee.html but no planner/calendar view |
| **Notes/Observations** | ✅ Built | Scouting reports with GPS, severity, hotspot clustering via saveScoutingReport | No standalone notes page. Reports submitted through employee.html |
| **Chief of Staff Advanced** | ✅ Built | Voice, Memory, Autonomy, Predictive, StyleMimicry, Calendar, FileOrg, SMS, MultiAgent (11 modules) | Frontend only uses basic email triage + task management. 80% of CoS features have no UI |

---

## WHAT'S NOT BUILT (confirmed gaps)

| System | Status | Notes |
|--------|--------|-------|
| Vendor Management | 0% | No VENDORS sheet, no UI, no backend |
| Purchase Orders | 0% | No PO tracking anywhere |
| Crop Library Browse UI | Partial | REF_Crops + REF_CropProfiles exist in backend. soil-tests.html has crop data. No dedicated browse page |

---

## INTEGRATIONS

| Integration | Status | Location |
|-------------|--------|----------|
| Google Sheets (database) | ✅ Working | All backend |
| Shopify (orders, products) | ✅ Working | MCP server + Apps Script |
| QuickBooks | ⚠️ Partial | Apps Script, needs OAuth flow |
| PayPal/Venmo | ✅ Working | MCP server |
| Twilio SMS | ✅ Working | Apps Script |
| Ayrshare (social) | ✅ Working | Apps Script |
| Plaid (banking) | ✅ Working | Apps Script |
| Agromonitoring (satellite) | ✅ Working | SatelliteService.js |
| Google Maps | ✅ Working | 4 HTML files (API key hardcoded — P0 security issue) |
| Penn State Lab | ✅ Working | soil-tests.html tissue testing |

---

## KNOWN ISSUES (from security audit Feb 28)

- **P0:** 4 hardcoded Google Maps API keys (track.html, farm-operations.html, employee.html, FieldMobileCapture.html)
- **P1:** 2,215 innerHTML assignments (tech debt, needs DOMPurify)
- **P2:** 0/31 CDN scripts have SRI hashes
- **P2:** 0/75 HTML files have CSP meta tags
- **P3:** 5 duplicate morning brief generators

---

## DEPLOYMENT

```
Live Site: https://app.tinyseedfarm.com (GitHub Pages)
API: https://script.google.com/macros/s/AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm/exec
Sheet ID: 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc
API Config: web_app/api-config.js (ONLY approved location for API URL)
```

```bash
# Frontend deploy
git add [files] && git commit -m "desc" && git push origin main

# Backend deploy
cd apps_script
clasp push
clasp deploy -i AKfycbyT60fyrNfmZkgK3z1-ojgISeZBAbBr9Zz50UtSjqSysE5JpB_cAIjp2KFucwREG4qm -d "description"
```

---

## STALE INVENTORIES (SUPERSEDED BY THIS FILE)

These files exist but are OLD and should NOT be trusted over this document:
- `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` — Feb 3 (says MERGED TOTAL is 88k lines; it's actually 148k)
- `claude_sessions/MASTER_SYSTEM_INVENTORY.md` — Jan 23 (calls soil-tests a "Stub"; it's 13,623 lines)
- `claude_sessions/VERIFIED_SYSTEM_INVENTORY.md` — Jan 23 (says 87 API endpoints broken; many fixed since)
- `claude_sessions/backend/API_INVENTORY.md` — Jan 16 (endpoint map still useful but line numbers are wrong now)

---

## HOW TO MAINTAIN THIS FILE

1. After ANY significant work, update the relevant section
2. Change the "Last Updated" date
3. Mark new items ✅ if you verified them, ⚠️ if you're uncertain
4. Do NOT create a new inventory file. Update THIS one.

---

*This is the ONE system inventory for Tiny Seed Farm OS. If it's not in here, verify before assuming it exists or doesn't exist.*
