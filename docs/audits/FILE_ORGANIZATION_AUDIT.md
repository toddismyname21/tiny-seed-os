## FILE ORGANIZATION AUDIT - TINY SEED OS

**Analysis Date:** 2026-02-24  
**Scope:** Complete directory structure review  
**Total Files Analyzed:** 2,000+ tracked and untracked files  
**Total Directories:** 40+ major directories

---

## EXECUTIVE SUMMARY

The Tiny Seed OS project has grown organically and now exhibits classic signs of fragmentation:

- **161 root-level files** (60 Markdown documents + 2 JavaScript files + 99 miscellaneous)
- **53 HTML files in web_app/** (mostly well-organized)
- **64 JavaScript files in apps_script/** (well-contained)
- **81+ untracked directories** with runtime data
- **143 documentation files in docs/**
- **Multiple backup copies** of production code
- **Heavy research duplication** in root-level files vs. docs/research/

**Critical Issues Found:**
1. Root directory contains 60+ Markdown files that should be in docs/
2. Backup directories exist but are orphaned (apps_script_backup_20260114, apps_script_live)
3. Research files scattered across root + docs/research/ + claude_sessions/
4. Claude session folders duplicated (both in root and inside tinypm/)
5. Untracked runtime data directories in tinypm/ (.budgets, .checkpoints, .memory, etc.)

---

## CURRENT STATE ANALYSIS

### 1. ROOT DIRECTORY CHAOS

**Files at root level (161 total):**

#### Documentation Files (60 Markdown)
- 28 AUDIT/BRAIN/BUILD/IMPL research files (duplicative)
- 7 daily PM update files (2026-01-17 series)
- 4 marketing/sales strategy files
- Misc scattered project status files

**Examples of root-level files that belong in docs/:**
- `AGENTIC_TEAM_CONFIGURATION.md` → `docs/pm_architect/`
- `AUDIT_APPS_SCRIPT.md` → `docs/audits/`
- `BACKTESTING_RESEARCH.md` → `docs/research/`
- `BRAIN_ANALYSIS_*.md` (3 files) → `docs/research/` + consolidate
- `BUILD_BRAIN_CORE.md` → `docs/research/`
- `IMPL_*.md` (8 files) → `docs/research/` + consolidate
- `RESEARCH_*.md` (3 files) → `docs/research/`

#### Data Files (PDFs, XLS, CSVs)
- 22 agricultural PDFs (growing guides, crop management, organic standards)
- 5 Excel files (seeder trials, planting calculators)
- 2 CSV exports
- 2 ZIP backup files

#### Miscellaneous Files
- offline.html (appears to be PWA offline fallback)
- install-prompt.js (PWA installation utility)
- 2 shell scripts for SMS system setup
- Multiple PDFs with no categorization

### 2. WEB_APP/ DIRECTORY (53 HTML files)

**Current Structure:**
- Root level: 46 HTML files (customers, admin, dashboards, integrations)
- Subdirectories:
  - `seo_content/` - 17 SEO landing pages (organized, good)
  - `eula/` - 2 EULA variant files

**Well-Organized:**
- `seo_content/neighborhoods/` - 16 location-specific landing pages ✓

**Naming Inconsistencies:**
- kebab-case (most files): `csa-location-finder.html` ✓
- camelCase (a few): `nearby.html` ✗
- Mixed: `CSAWelcomeEmail.html` in apps_script (Apps Script style) vs `csa.html` in web_app

**Potential Duplicates to Review:**
- `financial-dashboard.html` (web_app) vs `FinancialDashboard.html` (apps_script)
- `reports-dashboard.html` (web_app) - appears to be different from apps_script/ReportsDashboard.html
- `pm-dashboard.html` vs `pm-monitor.html` (check if both needed)
- `remote-dashboard.html` (purpose unclear)

**Backup Files:**
- `marketing-command-center-v3-backup.html` - should be versioned in git, not at root

### 3. APPS_SCRIPT/ DIRECTORY (64 files)

**Current Structure:**
- 42 .js files
- 8 .html files (forms, dashboards)
- 2 configuration files (.clasp.json, .claspignore)

**Well-Organized Core:**
- `MERGED TOTAL.js` - 88,000+ lines, central router ✓
- Specialty modules (Accounting, Market, Labor) ✓
- Intelligence systems (Farm, Financial, Food Safety) ✓

**Naming Inconsistencies:**
- PascalCase (AppName.js): `ChefCommunications.js`, `AccountingModule.js`
- snake_case (SHOUTING): `MERGED TOTAL.js`, `INTELLIGENT_ROUTING_SYSTEM.js`
- Mixed: `SmartSuccessionPlanner.js` (PascalCase), `SmartCSAIntelligence.js`

**Known Duplicates (from SYSTEM_MANIFEST.md):**
- 4 Morning Brief generators (need consolidation):
  - `getMorningBrief()` in MERGED TOTAL.js:~6200
  - `generateMorningBrief()` in MorningBriefGenerator.js
  - `getChiefMorningBrief()` in ChiefOfStaff_Master.js
  - `getFarmMorningBrief()` in FarmIntelligence.js
  - `generateMorningBriefV2()` in MERGED TOTAL.js:~85700

- 2 Approval Systems (potential sync issues)
- 3 Email Processing systems (Email Workflow, Chief of Staff Email, standard email handling)

**Backup Files:**
- `SmartLaborIntelligence.js.backup` - should be deleted or git-managed

**Dead/Obsolete Files:**
- `Form_Duplicate.html` - suggests form duplication issue
- `Wizard_Form.html` - check if used

### 4. DOCS/ DIRECTORY (143 Markdown files)

**Current Structure:**
```
docs/
├── quick-start/       (6 guides)
├── reference/         (3 PDFs)
├── audits/           (28 audit reports)
├── research/         (27 research documents)
├── STYLE_GUIDE.md
├── QUICK_START.md
├── API_REFERENCE.md
├── (100+ other MD files at root)
```

**Organization Issues:**
- 100+ .md files at docs/ root should be in subdirectories
- No clear categorization system
- Audit reports (28 files) well-organized in audits/ but could use date-based or feature-based subdirs
- Research (27 files) could use better categorization by topic

**Recommended Subdirectories Needed:**
- `docs/guides/` - User guides (Manager, Employee, Customer, Admin, Driver)
- `docs/specifications/` - Design specs (Chief of Staff, Proactive AI, SEO Automation, etc.)
- `docs/system/` - System design and architecture
- `docs/operations/` - Operational docs (Gmail Org, SMS Setup, Label Hardware Plan)
- `docs/planning/` - Strategic planning (Marketing, Goals, Improvement Roadmaps)

### 5. CLAUDE_SESSIONS/ DIRECTORY

**Current Structure:**
```
claude_sessions/
├── pm_architect/           (7 agents)
├── backend/
├── desktop_web/
├── ux_design/
├── mobile_employee/
├── social_media/
├── sales_crm/
├── field_operations/
├── inventory_traceability/
├── financial/
├── route_delivery/
├── food_safety/
├── security/
├── seo/
├── email_chief_of_staff/
├── (and more...)
```

**Issues:**
- 15+ agent folders, each with INBOX.md / OUTBOX.md
- INBOX/OUTBOX files are session communication logs, not documentation
- Lots of stale session data from 2026-01-15 through 2026-02-04
- Duplicate claude_sessions exists INSIDE tinypm/ (new copies)

**What Should Stay:**
- Active agent coordination files (recent)
- Core specs and system design docs

**What Should Move:**
- Feature specs → `docs/specifications/`
- Research docs → `docs/research/`
- System designs → `docs/system/`
- INBOX/OUTBOX (session logs) → Archive or delete

### 6. TINYPM/ DIRECTORY (265 MB)

**Python Agent System:**
- 85+ .py files (agents, controllers, utilities)
- 9 configuration files (.json, .yaml)
- Multiple untracked data directories:
  - `.budgets/` - Budget tracking data
  - `.checkpoints/` - Durable checkpoints
  - `.code_audits/` - Code audit results
  - `.email_*` - Email classification/rules (5 files)
  - `.kill_switch/` - Safety killswitch data
  - `.memory/` - Agent memory storage
  - `.messages/` - Agent inter-communication
  - `.oauth_tokens/` - OAuth credentials (SECURITY RISK)
  - `.pressure_field.json` - Pressure field state
  - `.risk_classifications.jsonl` - Risk assessment logs
  - `.rollbacks/` - Rollback data
  - `.task_states/` - Task state machine data
  - `.verification_evidence/` - Verification logs
  - `.voice_profile.json` - Voice data
  - `.web_server.pid` - Process ID file
  - `claude_sessions/` - Duplicate session folders

**Issues:**
- `.oauth_tokens/` should be .gitignored (SECURITY RISK)
- Runtime state directories should be .gitignored
- Duplicate claude_sessions/ folder suggests old development pattern
- No clear separation of concerns in .py files

**Recommendation:**
- Move runtime data to `.tinypm_state/` subdirectory
- Add comprehensive .gitignore for all untracked dirs
- Clean up old claude_sessions/ copy

### 7. SCRIPTS/ DIRECTORY (81 files)

**Current Organization:**
```
scripts/
├── audit/          (11 audit scripts)
├── (50+ individual .js files at root)
├── (25+ .sh files at root)
```

**Issues:**
- 50+ script files not organized by function
- Mix of:
  - Shopify management (30 scripts): fix_*, update_*, deploy_*
  - System auditing (11 scripts)
  - Data initialization (5 scripts)
  - System health checking (3 scripts)

**Naming Pattern:**
- All Shopify-related scripts clustered with `fix_` prefix but not in subdirectory
- Audit scripts properly in `audit/` subdirectory

**Recommended Reorganization:**
- `scripts/shopify/` - All Shopify management scripts (30 files)
- `scripts/audit/` - Already organized ✓
- `scripts/system/` - Health checks, initialization, monitoring
- `scripts/maintenance/` - Cleanup, migration, maintenance tasks

### 8. BACKUP & DEPRECATED DIRECTORIES

**Backup Directories (Not Tracked):**

1. **apps_script_backup_20260114_165630**
   - Contains partial backup (6 files): Forms + MERGED TOTAL.js
   - **Status:** Orphaned (contains no unique data, appears to be old snapshot)
   - **Action:** SAFE TO DELETE

2. **apps_script_live/**
   - Empty directory
   - **Status:** Stale
   - **Action:** SAFE TO DELETE

3. **data-2026-01-12-20-27-23-batch-0000/**
   - Contains: users.json, memories.json, projects.json, conversations.json
   - Also exists as: data-2026-01-12-20-27-23-batch-0000.zip
   - **Status:** Appears to be Claude export backup
   - **Action:** Can be archived or moved to docs/backups/

4. **Claude-Code-Remote/**
   - Full Git repo (9.4 MB)
   - Contains: webhook system, notification setup, MCP server, Telegram bot
   - **Status:** Appears to be remote agent infrastructure (not integrated)
   - **Action:** Review for active use; if not used, move to archive

5. **tinypm_for_tinyseed_os/**
   - Duplicate/older version of tinypm/
   - **Status:** Obsolete
   - **Action:** SAFE TO DELETE

### 9. RESEARCH & DOCUMENTATION DIRECTORIES

**Directories Identified:**
- `research/` (untracked)
- `shared_research/` (2 subdirectories)
- `docs/research/` (27 files, tracked)
- `claude_sessions/*/` (contains research docs scattered)

**Issues:**
- Research fragmented across 4+ locations
- 100+ research files total with possible duplication

---

## PRIORITY CLEANUP RECOMMENDATIONS

### PHASE 1: Safe Deletions (No Dependencies)
**Delete immediately - zero risk:**

1. `apps_script_backup_20260114_165630/` - Old backup, no unique content
2. `apps_script_live/` - Empty orphaned directory
3. `tinypm_for_tinyseed_os/` - Duplicate of tinypm/
4. `SmartLaborIntelligence.js.backup` - Should use Git versioning

**Estimated recovery:** 200 MB

### PHASE 2: Archive & Move (Requires Organization)
**Archive to docs/archive/ or move to appropriate location:**

1. **Root .md files → docs/**
   - 60 Markdown files should be organized into docs/ subdirectories
   - Keep: README.md, CLAUDE.md, CHANGE_LOG.md (core project files)
   - Move: All RESEARCH_, IMPL_, AUDIT_, BRAIN_ files to docs/

2. **PDFs Organization**
   - Agricultural PDFs → `docs/reference/agriculture/`
   - Equipment specs → `docs/reference/equipment/`
   - Keep in web_app/ for serving via web

3. **Data Files**
   - CSVs/XLS files → `data/samples/` or `docs/data-samples/`
   - Remove duplicates (2026-CropProfiles CSV variants)

4. **Backup ZIP files**
   - `data-2026-01-12-20-27-23-batch-0000.zip` → Move to `backups/` or delete

**Estimated recovery:** 100+ MB

### PHASE 3: Code Organization (Needs Review)
**Requires owner/PM review before deletion:**

1. **Duplicate HTML Dashboards**
   - Review purpose of each:
     - `financial-dashboard.html` (web_app)
     - `FinancialDashboard.html` (apps_script)
   - Review:
     - `pm-dashboard.html` vs `pm-monitor.html`
     - `reports-dashboard.html` vs `ReportsDashboard.html` (apps_script)

2. **Duplicate Morning Brief Systems** (SYSTEM_MANIFEST.md identifies 4)
   - Consolidate into single configurable system
   - Archive old implementations
   - Estimated impact: 2,000 lines of code cleanup

3. **Chief of Staff Backend Files** (12 files)
   - Currently disconnected from frontend
   - Decide: Connect or deprecate?
   - If deprecated: 3,000+ lines to archive

4. **Approval Systems** (2 implementations)
   - Determine which is canonical
   - Merge or deprecate one

5. **Email Processing Systems** (3 implementations)
   - Consolidate into single system

---

## PROPOSED DIRECTORY STRUCTURE

### ROOT LEVEL (Clean, Project Essentials Only)
```
/
├── README.md                 (Project overview)
├── CLAUDE.md                (Mandatory rules)
├── CHANGE_LOG.md            (Central log)
├── CONTEXT_SNAPSHOT.md      (Session context)
├── .pm_rules.json           (PM enforcement rules)
├── .gitignore
├── package.json
├── pyproject.toml
├── requirements.txt
│
├── apps_script/             (Backend - Google Apps Script)
├── web_app/                 (Frontend - HTML/JS/CSS)
├── scripts/                 (Automation & utilities)
├── tinypm/                  (PM agent system)
├── config/                  (Configuration files)
├── docs/                    (Documentation)
├── data/                    (Sample data, exports)
├── .claude/                 (Claude sessions)
└── [Keep: icons, privacy, eula, shareable]
```

### NEW SUBDIRECTORIES

#### docs/ (Reorganized)
```
docs/
├── README.md                (Docs index)
├── quick-start/
│   ├── DRIVER_QUICK_START.md
│   ├── CUSTOMER_QUICK_START.md
│   ├── ADMIN_QUICK_START.md
│   ├── EMPLOYEE_QUICK_START.md
│   ├── MANAGER_QUICK_START.md
│   └── SEO_DASHBOARD_GUIDE.md
│
├── guides/
│   ├── MANAGER_GUIDE.md
│   ├── EMPLOYEE_GUIDE.md
│   ├── SMS_SHORTCUT_SETUP.md
│   ├── GMAIL_INBOX_ORGANIZATION.md
│   ├── SOCIAL_MEDIA_API_SETUP_GUIDE.md
│   └── (other operational guides)
│
├── specifications/
│   ├── CHIEF_OF_STAFF_REDESIGN_SPEC.md
│   ├── PROACTIVE_AI_SPEC.md
│   ├── SEO_AUTOMATION_PLAN.md
│   ├── GOAL_SYSTEM_SPEC.md
│   ├── SMART_FARM_INTELLIGENCE_ARCHITECTURE.md
│   └── (other feature specs)
│
├── system/
│   ├── ARCHITECTURE_BEST_PRACTICES.md
│   ├── API_REFERENCE.md
│   ├── SYSTEM_INVENTORY.md
│   ├── STYLE_GUIDE.md
│   ├── OPERATORS_MANUAL.md
│   └── COMPLETE_SYSTEM_CAPABILITIES.md
│
├── planning/
│   ├── MARKETING_AUTOMATION_PLAN.md
│   ├── MARKETING_STRATEGY_2026.md
│   ├── SEO_DOMINATION_PLAN.md
│   ├── SEO_IMPROVEMENT_ROADMAP.md
│   ├── MASTER_UX_IMPROVEMENT_PLAN.md
│   └── (other roadmaps)
│
├── research/
│   ├── AGENTIC_TEAM_RESEARCH/
│   ├── AI_ML_RESEARCH/
│   ├── AGENT_AUTONOMY_RESEARCH/
│   ├── TECHNICAL_ANALYSIS/
│   └── (organized by topic)
│
├── audits/
│   ├── 2026-02/ (date-based)
│   │   ├── SYSTEM_AUDIT_2026-02-23.md
│   │   ├── PRODUCTION_PIPELINE_AUDIT_2026-02-23.md
│   │   └── (other Feb audits)
│   ├── 2026-01/
│   └── (date-based folders)
│
├── reference/
│   ├── agriculture/
│   │   ├── Crop_Management_Guide.pdf
│   │   ├── Organic_Standards.pdf
│   │   └── (farming PDFs)
│   ├── equipment/
│   └── charts/
│
└── data-samples/
    ├── Sample_Customers.csv
    ├── Sample_Crop_Profiles.csv
    └── (exported reference data)
```

#### scripts/ (Reorganized)
```
scripts/
├── README.md                (Script index)
├── audit/
│   ├── run-full-audit.sh
│   ├── duplicate-function-detector.js
│   ├── api-contract-validator.js
│   ├── dom-orphan-checker.sh
│   └── (11 existing audit scripts)
│
├── shopify/                 (NEW)
│   ├── fix_addon_collection.js
│   ├── fix_csa_collection_iframe.js
│   ├── update_home_delivery_page.js
│   ├── (30 shopify management scripts)
│   └── README.md
│
├── system/                  (NEW)
│   ├── check-site-health.sh
│   ├── generate_context_snapshot.sh
│   ├── validate-api-urls.sh
│   ├── validate-element-refs.sh
│   └── (system health scripts)
│
├── maintenance/             (NEW)
│   ├── cleanup_duplicate_comment.js
│   ├── init_sales_sheets.js
│   ├── check_addon_products.js
│   └── (maintenance/setup scripts)
│
└── [existing top-level scripts that don't fit categories]
```

### tinypm/ (Clean Up Runtime Data)
```
tinypm/
├── *.py                     (All agent files)
├── tinypm.yaml
├── .env
├── .pm_memory.json
├── .pm_chat.json
│
├── .tinypm_state/           (NEW - all runtime data)
│   ├── .budgets/
│   ├── .checkpoints/
│   ├── .email_ai_cache.json
│   ├── .memory/
│   ├── .messages/
│   ├── .task_states/
│   ├── .verification_evidence/
│   └── (move all runtime directories here)
│
├── .gitignore               (add .tinypm_state/)
└── (delete: old claude_sessions/ copy)
```

---

## FILES SAFE TO DELETE IMMEDIATELY

| File/Directory | Size | Reason | Safety |
|---|---|---|---|
| apps_script_backup_20260114_165630/ | 300 KB | Old backup, no unique content | SAFE - verify no custom code |
| apps_script_live/ | 0 KB | Empty orphaned directory | SAFE - empty |
| tinypm_for_tinyseed_os/ | 4.7 MB | Duplicate older version | SAFE - verify tinypm/ is current |
| SmartLaborIntelligence.js.backup | 50 KB | Should use Git versioning | SAFE - in Git history |
| Form_Duplicate.html | 10 KB | Suggests form duplication | REVIEW - check if referenced |
| data-2026-01-12-20-27-23-batch-0000.zip | 12 MB | Duplicate of unzipped folder | SAFE - keep folder, delete ZIP |

**Total Space Reclaimed: ~17 MB**

---

## FILES REQUIRING REVIEW BEFORE DELETION

| File | Reason for Review | Recommendation |
|---|---|---|
| claude_sessions/*/INBOX.md (15+ files) | Session logs - stale communication | ARCHIVE to docs/archive/sessions/ |
| Claude-Code-Remote/ | External webhook system - verify not in use | ARCHIVE or DELETE if not integrated |
| FLOWER FARMING/ | 213 MB of saved web pages | ARCHIVE to docs/reference/flowers/ |
| offline.html | PWA offline fallback | VERIFY - check if service-worker uses it |
| install-prompt.js | PWA installation | VERIFY - check if app.js includes it |
| Form_Duplicate.html | Suggests duplication | CODE REVIEW - search for references |
| Wizard_Form.html | Purpose unclear | CODE REVIEW - search for references |

---

## NAMING CONVENTION STANDARDIZATION

### Current Issues
1. **apps_script/**: PascalCase (AccountingModule.js) + SCREAMING_SNAKE (MERGED TOTAL.js)
2. **web_app/**: Primarily kebab-case (csa-location-finder.html)
3. **Inconsistent**: Some files use camelCase, some kebab-case, some PascalCase

### Recommendation
**Adopt kebab-case for ALL new frontend files:**
- ✓ `marketing-command-center.html` (good)
- ✓ `field-planner.html` (good)
- ✗ `CSAWelcomeEmail.html` should be → `csa-welcome-email.html` (but leave as-is in apps_script)

**Keep PascalCase for Apps Script files** (Google Apps Script convention):
- These serve a different ecosystem, converting would break internal references
- Current: `AccountingModule.js`, `ChefCommunications.js` (acceptable for backend)

**JavaScript files in web_app/:**
- Convert to kebab-case: `financial_api.js` → `financial-api.js`
- Files to rename: employee_gamification.js, debt_destroyer.js, change_investing.js, etc.

---

## DUPLICATE SYSTEM CONSOLIDATION PLAN

### 1. Morning Brief System (4 implementations)
**Current:**
- `getMorningBrief()` - Basic summary
- `generateMorningBrief()` - Comprehensive
- `getChiefMorningBrief()` - Executive summary  
- `getFarmMorningBrief()` - Farm-specific
- `generateMorningBriefV2()` - Enhanced

**Recommendation:**
- Consolidate into single `generateMorningBrief(options)` function
- Options: `{ detail: 'basic'|'comprehensive'|'executive'|'farm', format: 'text'|'html' }`
- Archive old implementations
- **Effort:** 2 hours consolidation

### 2. Chief of Staff Backend (12 disconnected files)
**Current:**
- ChiefOfStaff_Master.js, Voice, Memory, Autonomy, Calendar, etc.
- Built but no frontend exposure

**Recommendation:**
1. **Option A (Recommended):** Create unified `chief-of-staff.html` with tabs for each feature
2. **Option B:** Archive the 12 stub files, keep only in MERGED TOTAL.js
- **Effort:** 4-6 hours for unified UI

### 3. Approval Systems (2 implementations)
**Recommendation:**
- Audit which is actively used
- Merge duplicated logic
- Keep single canonical implementation
- **Effort:** 2 hours consolidation

---

## UNTRACKED DIRECTORIES TO .GITIGNORE

Add to root `.gitignore`:
```gitignore
# Runtime Data (TinyPM)
tinypm/.tinypm_state/
tinypm/.budgets/
tinypm/.checkpoints/
tinypm/.code_audits/
tinypm/.email_*/
tinypm/.kill_switch/
tinypm/.memory/
tinypm/.messages/
tinypm/.oauth_tokens/
tinypm/.rollbacks/
tinypm/.task_states/
tinypm/.verification_evidence/
tinypm/.web_server.pid

# Claude IDE state
.claude-flow/terminals/
.claude/

# Research/Data
shared_research/
owner_uploads/
don_docs/
browser_agent/
data-2026-01-12-20-27-23-batch-0000/
claude_export/

# Python/Node
node_modules/
__pycache__/
*.egg-info/
.pytest_cache/
venv/
.venv/

# OS Files
.DS_Store
.swarm/
.secrets/

# Backups (after cleanup)
apps_script_backup_*/
apps_script_live/
```

---

## IMPLEMENTATION ROADMAP

### Week 1: Safe Cleanup
- [ ] Delete: apps_script_backup, apps_script_live, tinypm_for_tinyseed_os (Phase 1)
- [ ] Move: Root .md files to docs/ (organize by category)
- [ ] Add: Comprehensive .gitignore
- [ ] Archive: tinypm runtime data to .tinypm_state/

### Week 2: Major Organization
- [ ] Create docs/ subdirectories (guides, specs, system, research, planning)
- [ ] Reorganize docs/audits/ by date
- [ ] Move PDFs to docs/reference/
- [ ] Reorganize scripts/ (shopify, system, maintenance subdirs)

### Week 3: Code Review & Consolidation
- [ ] Review duplicate dashboards (financial, reports, pm)
- [ ] Review Form_Duplicate.html and Wizard_Form.html usage
- [ ] Plan morning brief consolidation
- [ ] Plan Chief of Staff UI unification

### Week 4: Execution & Testing
- [ ] Execute consolidations
- [ ] Update git history (if using filter-branch)
- [ ] Test all frontend pages
- [ ] Test all API endpoints
- [ ] Update CLAUDE.md with new structure

---

## METRICS

| Metric | Before | After |
|---|---|---|
| Root-level files | 161 | <10 (CLAUDE.md, README.md, CHANGE_LOG.md, etc.) |
| Root-level .md files | 60 | 0 (moved to docs/) |
| Total directories | 40+ | 20-25 (consolidated) |
| docs/ subdirectories | 4 | 8+ (well-organized) |
| Untracked data dirs | 81 | 1 (.tinypm_state/) |
| Space on disk | 1.2 GB | ~1.0 GB (after cleanup) |
| Backup directories | 3 | 0 (deleted) |

---

## SECURITY & COMPLIANCE NOTES

1. **OAuth Tokens Exposure**: `tinypm/.oauth_tokens/` is untracked but contains credentials
   - Add to .gitignore immediately
   - Rotate all exposed tokens

2. **API Keys**: Check if any .json config files contain hardcoded API keys
   - Move to environment variables
   - Add to .gitignore

3. **Sensitive Data**: PDFs in root may contain sensitive information
   - Verify before archiving

---

## NEXT STEPS FOR OWNER

1. **Approve Phase 1 deletions** (apps_script_backup, apps_script_live, etc.)
2. **Prioritize consolidations** (Morning Brief, Chief of Staff, Approval Systems)
3. **Assign implementation** (recommend PM_Architect + Desktop_Claude)
4. **Timeline** (4 weeks for full reorganization)
