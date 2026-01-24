# CHANGE_LOG.md - Central Change Tracking

## MANDATORY: All Claude sessions MUST log changes here

Every Claude session MUST add an entry after making ANY changes to the codebase.

---

## Format

```markdown
## [DATE] - [CLAUDE_ROLE]

### Files Created
- `path/to/file.ext` - Purpose

### Files Modified
- `path/to/file.ext` - What changed

### Functions Added
- `functionName()` in `file.js` - Purpose

### Functions Modified
- `functionName()` in `file.js` - What changed

### Reason
Brief explanation of why these changes were made.

### Duplicate Check
- [ ] Checked SYSTEM_MANIFEST.md
- [ ] Searched for similar functions
- [ ] No duplicates created

---
```

---

## CHANGE HISTORY

---

## 2026-01-24 - PM_Architect (Morning Brief & Invite Buttons Fixes)

### Files Modified
- `index.html` - Updated hardcoded API_URL to match canonical source in api-config.js
- `apps_script/MERGED TOTAL.js`:
  - Fixed `inviteEmployee()` to use `openById(SPREADSHEET_ID)` instead of `getActiveSpreadsheet()`
  - Fixed `inviteChef()` to use `openById(SPREADSHEET_ID)` instead of `getActiveSpreadsheet()`
  - Renamed duplicate `inviteChef()` at line ~75177 to `inviteChef_ChefComms()` to avoid conflict
  - Removed duplicate `case 'inviteChef':` statements (kept first one at line ~14070)
  - Added null checks to `getPredictiveTasks()` for `diseaseRisk.data.late_blight`
  - Added null check to `getChefProfile()` for `CHEF_COMM_CONFIG.SHEETS`

### Functions Modified
- `inviteEmployee()` - Web app context fix (openById instead of getActiveSpreadsheet)
- `inviteChef()` - Web app context fix (openById instead of getActiveSpreadsheet)
- `getPredictiveTasks()` - Null checks for disease risk data
- `getChefProfile()` - Null check for CHEF_COMM_CONFIG

### Reason
Morning Brief and invite buttons were broken on the main dashboard due to:
1. index.html using wrong API URL (different from api-config.js canonical source)
2. `inviteEmployee()` and `inviteChef()` using `getActiveSpreadsheet()` which returns null in web app context
3. Duplicate function and case statement conflicts
4. Missing null checks causing potential crashes

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md
- [x] Searched for similar functions
- [x] No duplicates created (removed existing duplicates)

---

## 2026-01-24 - Field_Operations_Claude (Employee Scheduling Calendar)

### Files Created
- `web_app/schedule.html` - Full employee scheduling calendar UI with weekly view, weather integration, and smart scheduling

### Files Modified
- `apps_script/MERGED TOTAL.js` - Added Employee Scheduling Module with 6 new API endpoints
- `claude_sessions/field_operations/OUTBOX.md` - Documented research, audit, and build results

### Functions Added
- `initScheduleSheet()` in `MERGED TOTAL.js` - Creates SCHEDULES sheet if not exists
- `getSchedules(startDate, endDate)` in `MERGED TOTAL.js` - Get shifts for date range
- `createSchedule(data)` in `MERGED TOTAL.js` - Create new shift
- `updateSchedule(data)` in `MERGED TOTAL.js` - Update existing shift
- `deleteSchedule(scheduleId)` in `MERGED TOTAL.js` - Delete shift
- `generateSmartSchedule(params)` in `MERGED TOTAL.js` - AI-powered bulk scheduling

### API Endpoints Added
- GET/POST: `getEmployees`, `getSchedules`, `createSchedule`, `updateSchedule`, `deleteSchedule`, `generateSmartSchedule`

### Reason
Owner directive: Build employee scheduling calendar for tomorrow morning. Researched best practices (Deputy, When I Work, 7shifts), audited existing SmartLaborIntelligence code, built calendar that integrates with existing EMPLOYEES/USERS data and weather forecast.

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md - No existing scheduling calendar
- [x] Searched for similar functions - Found SmartLaborIntelligence (REUSED, not duplicated)
- [x] No duplicates created - Built on top of existing getAllActiveEmployees() and getWeatherForecast()

---

## 2026-01-24 - Inventory_Traceability_Claude (CSA Portal Audit)

### Files Modified
- `web_app/csa.html` - Fixed stale fallback API URL (line 2826-2827)

### Reason
CSA Member Portal Audit per owner directive. Owner inviting CSA customers soon - portal must be FLAWLESS.

### Audit Completed
1. Researched best CSA platforms (Local Line, Farmigo, CSAware)
2. Verified all 13 CSA API endpoints exist in backend
3. Tested complete member journey (10 steps)
4. Fixed stale fallback API URL
5. Compared to industry standards

### Verdict
**CSA Member Portal is READY for customer invites.** Professional, feature-complete, matches industry standards.

### Duplicate Check
- [x] Checked MASTER_SYSTEM_INVENTORY.md
- [x] No duplicates created
- [x] Only fixed existing code

---

## 2026-01-24 - PM_Architect (Phone PM)

### Files Created
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/README.md` - Instructions for registering computer Claudes
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/BACKEND_CLAUDE.md` - Backend Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/UX_DESIGN_CLAUDE.md` - UX Design Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/FIELD_OPS_CLAUDE.md` - Field Ops Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/FINANCIAL_CLAUDE.md` - Financial Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/SALES_CRM_CLAUDE.md` - Sales/CRM Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/INVENTORY_CLAUDE.md` - Inventory Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/GRANTS_CLAUDE.md` - Grants Claude registration
- `claude_sessions/COMPUTER_CLAUDE_REGISTRATION/EMAIL_COS_CLAUDE.md` - Email Chief of Staff Claude registration
- `telegram_bot/claude-trigger.js` - Script to trigger Claude sessions by writing to their INBOXes

### Files Modified
- `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` - Added PHONE_PM_INSTRUCTIONS.md to Key Documentation Files table
- `telegram_bot/bot.js` - Added /trigger, /triggerall, /claudes commands for remote Claude control
- `telegram_bot/README.md` - Added documentation for new Claude control commands

### Reason
1. Created registration instructions folder so owner can send instructions to each computer Claude session
2. Added Telegram bot commands to trigger Claudes remotely - owner can now send /trigger backend from phone to wake a Claude

### New Telegram Commands
- `/trigger [name]` - Trigger specific Claude (backend, ux, field, etc.)
- `/triggerall` - Trigger ALL Claude sessions
- `/claudes` - List available session names

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md
- [x] Searched for similar documentation
- [x] No duplicates created

---

## 2026-01-23 - Coordination_Claude

### Files Created
- `claude_sessions/coordination/INBOX.md` - Session inbox for Coordination_Claude
- `claude_sessions/coordination/OUTBOX.md` - Session outbox for Coordination_Claude

### Files Modified
- `web_app/claude-coordination.html` - Complete premium UI upgrade

### Features Added
- 30-second auto-refresh with countdown timer and SVG progress ring
- System health indicator (green/yellow/red) based on sessions and alerts
- Send Message modal with from/to/priority/subject/body fields
- Create Task modal with title/description/assign/urgency/impact fields
- Premium UI: dark blue header, colored stat cards, toast notifications
- Keyboard shortcuts: ESC closes modals, click outside closes modals

### Reason
Upgraded Claude Coordination Dashboard from debug-quality to premium-quality per PM_Architect assignment. Dashboard is now fully operational for owner use.

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md
- [x] Searched for similar functions
- [x] No duplicates created

---

## 2026-01-23 - PM_Architect Claude

### Files Modified
- `web_app/claude-coordination.html` - Fixed API_URL to use TINY_SEED_API.MAIN_API from api-config.js
- `apps_script/MERGED TOTAL.js` - Added initializeCoordination GET endpoint for sheet initialization
- `apps_script/.claspignore` - Removed ClaudeCoordination.js from ignore list (was preventing deployment)

### Files Renamed
- `apps_script/SmartLaborIntelligence.js` -> `apps_script/SmartLaborIntelligence.js.backup` - Duplicate LABOR_CONFIG was causing Apps Script to fail

### Deployment
- v207 deployed with Claude Coordination System fully operational
- Created 6 new sheets: CLAUDE_MESSAGES, CLAUDE_SESSIONS, CLAUDE_TASKS, CLAUDE_FILE_LOCKS, CLAUDE_ACTIVITY, CLAUDE_ALERTS

### Reason
Made Claude Coordination Center fully operational. Fixed issues preventing ClaudeCoordination.js from being deployed, added missing GET endpoint for sheet initialization, fixed dashboard API reference.

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md
- [x] Searched for similar functions
- [x] No duplicates created

---

## 2026-01-23 - Social_Media_Claude (Phase 1 Audit)

### Files Created
- None

### Files Modified
- `web_app/social-intelligence.html` - Added api-config.js import, fixed WRONG hardcoded API URL (was using stale deployment ID)
- `web_app/neighbor.html` - Added api-config.js import, fixed WRONG hardcoded API URL
- `web_app/marketing-command-center.html` - Added api-config.js import, replaced hardcoded URL with centralized config
- `web_app/seo_dashboard.html` - Fixed undefined API_BASE_URL variable (changed to TINY_SEED_API.MAIN_API)
- `claude_sessions/social_media/OUTBOX.md` - Added Phase 1 Audit report

### Functions Added
- None

### Functions Modified
- None

### Reason
Phase 1 Audit per FULL_TEAM_DEPLOYMENT.md Section 13 (Social Media Claude). Audited:
- web_app/marketing-command-center.html
- web_app/social-intelligence.html
- web_app/seo_dashboard.html
- web_app/neighbor.html

Found 4 files with incorrect or hardcoded API URLs. All files now use `api-config.js` with `TINY_SEED_API.MAIN_API` for centralized API management.

### Duplicate Check
- [x] Checked MASTER_SYSTEM_INVENTORY.md
- [x] Searched for similar functions (no functions added)
- [x] No duplicates created

---

## 2026-01-23 - Inventory_Traceability_Claude (Phase 1 Audit)

### Files Created
- None

### Files Modified
- `seed_inventory_PRODUCTION.html` - Fixed API configuration and removed demo data fallback

### Functions Added
- `showLoadError(message)` in `seed_inventory_PRODUCTION.html` - Displays proper error UI when API fails

### Functions Removed
- `useDemoData()` in `seed_inventory_PRODUCTION.html` - REMOVED per policy (no demo data fallbacks)
- `init_old()` in `seed_inventory_PRODUCTION.html` - REMOVED (dead code)

### Reason
Phase 1 Audit per FULL_TEAM_DEPLOYMENT.md - Auditing inventory files for broken functionality and policy compliance.

### Changes Made
1. Added api-config.js script include (was missing)
2. Updated API_URL to use TINY_SEED_API with fallback pattern
3. Replaced demo data fallback with error display
4. Removed unused init_old function

### Duplicate Check
- [x] Checked MASTER_SYSTEM_INVENTORY.md
- [x] Searched for similar functions
- [x] No duplicates created

---

## 2026-01-22 - Inventory_Traceability_Claude (Grant Research)

### Files Created
- `claude_sessions/inventory_traceability/GRANT_RESEARCH_2026.md` - Comprehensive grant research with 21 funding opportunities

### Files Modified
- `claude_sessions/inventory_traceability/OUTBOX.md` - Added full mission report + 501(c)(3) analysis
- `claude_sessions/pm_architect/INBOX.md` - Added report to PM

### Functions Added
- None (research/documentation only)

### Reason
Owner directive: "LET'S REALLY GET IN THE KNOW WHERE WE CAN FIND THE DOUGH" - Researched foundation/private grants, climate programs, food access grants, equipment/infrastructure grants to complement Grants_Funding Claude's USDA/PA state focus.

### Results
- 21 NEW grant opportunities identified (beyond Grants_Funding Claude)
- Total potential funding: $282,000 - $545,000+
- 501(c)(3) analysis provided per owner request
- Recommended fiscal sponsorship + nonprofit formation strategy

### Duplicate Check
- [x] Checked Grants_Funding Claude's work first
- [x] No duplication of their USDA/PA state coverage
- [x] Added complementary foundation/climate/regional grants

---

## 2026-01-22 - Social_Media_Claude (UX/Design)

### Files Created
- `mcp-server/shopify-discount.js` - Shopify Price Rules API module for discount code creation
- `mcp-server/create-neighbor-discounts.js` - CLI tool to create NEIGHBOR campaign discounts
- `claude_sessions/social_media/CAMPAIGN_LAUNCH_GUIDE.md` - Complete campaign launch checklist

### Files Modified
- `web_app/neighbor.html` - Updated offer cards from 25% off to tiered $30/$15/$20 structure, changed promo code from NEIGHBOR25 to NEIGHBOR
- `claude_sessions/social_media/DIRECT_MAIL_CAMPAIGN_PLAN.md` - Updated offer section with new tiered discount table
- `claude_sessions/social_media/POSTCARD_DESIGN.md` - Updated wireframe with new $30/$15/$20 offer boxes
- `mcp-server/tiny-seed-mcp.js` - Added 4 new Shopify discount tools, imported shopify-discount module

### Functions Added
- `createNeighborDiscounts()` in `shopify-discount.js` - Creates all NEIGHBOR campaign discount codes
- `createPriceRule()` in `shopify-discount.js` - Creates Shopify price rules
- `createDiscountCode()` in `shopify-discount.js` - Creates discount codes for price rules
- `listDiscountCodes()` in `shopify-discount.js` - Lists existing discounts
- `deletePriceRule()` in `shopify-discount.js` - Deletes price rules

### MCP Tools Added
- `shopify_create_neighbor_discounts` - Creates all campaign codes
- `shopify_list_discounts` - Lists existing discounts
- `shopify_get_products` - Gets products for targeting
- `shopify_delete_discount` - Removes discounts

### Reason
Owner directive to change promo structure from 25% off to tiered "FREE WEEK" discounts:
- $30 off Veggie CSA ($600+)
- $15 off Veggie CSA ($300+)
- $20 off Floral CSA
- No discounts on add-ons
Also built Shopify API tools to automate discount code creation.

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md
- [x] Searched for existing discount/promo functions (none found)
- [x] No duplicates created

---

## 2026-01-22 - PM_Architect

### Files Created
- `claude_sessions/pm_architect/SYSTEM_MANIFEST.md` - Complete system inventory
- `claude_sessions/pm_architect/CLAUDE_ROLES.md` - Claude role definitions
- `claude_sessions/pm_architect/DEPLOYMENT_PROTOCOL.md` - Deployment rules
- `web_app/pm-monitor.html` - PM monitoring dashboard
- `CLAUDE.md` - Enforcement rules (auto-read by Claude Code)
- `CHANGE_LOG.md` - This file

### Files Modified
- `web_app/index.html` - Added working features section, PM Monitor, Chief of Staff cards

### Functions Added
- None (documentation only)

### Functions Modified
- None (documentation only)

### Reason
System unification initiative after discovering significant fragmentation:
- 4 Morning Brief generators
- 12 Chief of Staff backend modules disconnected from frontend
- 2 Approval systems not synced
- 10+ files with demo data fallbacks

### Duplicate Check
- [x] Checked SYSTEM_MANIFEST.md (created it)
- [x] Searched for similar functions
- [x] No duplicates created

---

## 2026-01-22 - Backend_Claude (Earlier Today)

### Files Created
- `apps_script/SmartAvailability.js` - Real-time inventory availability
- `apps_script/ChefCommunications.js` - Chef invitation system

### Files Modified
- `apps_script/MERGED TOTAL.js` - Added chef invitation endpoints

### Functions Added
- `inviteChef()` - Send chef invitation
- `sendChefMagicLink()` - Resend login link
- `verifyChefToken()` - Validate magic link
- `bulkInviteChefs()` - Batch invitations
- `getAllChefs()` - List all chefs
- `getRealtimeAvailability()` - Current inventory

### Reason
Chef ordering system and invitation workflow for wholesale customers.

### Duplicate Check
- [x] Checked for existing invitation systems
- [x] No duplicates created

---

## HOW TO USE THIS LOG

1. **Before deploying:** Add your entry to the TOP of the change history (newest first)
2. **Be specific:** List every file and function
3. **Check for duplicates:** BEFORE adding anything new
4. **Commit this file:** Include CHANGE_LOG.md in your git commit

---

## ALERTS

### Known Duplicate Systems (DO NOT ADD MORE)

| System | Count | Locations |
|--------|-------|-----------|
| Morning Brief | 4 | MERGED TOTAL.js, MorningBriefGenerator.js, ChiefOfStaff_Master.js, FarmIntelligence.js |
| Approval System | 2 | EmailWorkflowEngine.js, chief-of-staff.html |
| Email Processing | 3 | ChiefOfStaff_Master.js, EmailWorkflowEngine.js, various |

### Disconnected Backend (Connect, Don't Rebuild)

12 Chief of Staff modules exist in `/apps_script/` but are NOT connected to frontend:
- ChiefOfStaff_Voice.js
- ChiefOfStaff_Memory.js
- ChiefOfStaff_Autonomy.js
- ChiefOfStaff_ProactiveIntel.js
- ChiefOfStaff_StyleMimicry.js
- ChiefOfStaff_Calendar.js
- ChiefOfStaff_Predictive.js
- ChiefOfStaff_SMS.js
- ChiefOfStaff_FileOrg.js
- ChiefOfStaff_Integrations.js
- ChiefOfStaff_MultiAgent.js
- EmailWorkflowEngine.js

**Task:** Connect these to `web_app/chief-of-staff.html` - DO NOT rebuild them.

---

*This log is the single source of truth for all changes. Keep it updated.*
