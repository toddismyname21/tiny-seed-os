# CLAUDE.md Reference Tables

Extended rules and inventories referenced from CLAUDE.md. Consult these when doing specific types of work.

---

## Dashboard Inventory (DO NOT DUPLICATE)

| Dashboard | Location |
|-----------|----------|
| SEO Dashboard | `web_app/seo_dashboard.html` |
| Chief of Staff | `apps_script/ChiefOfStaffDashboard.html` |
| Field Management | `apps_script/FieldManagementDashboard.html` |
| Financial Dashboard (Apps) | `apps_script/FinancialDashboard.html` |
| Financial Dashboard (Web) | `web_app/financial-dashboard.html` |
| Irrigation Dashboard | `apps_script/IrrigationDashboard.html` |
| Reports Dashboard | `apps_script/ReportsDashboard.html` |
| Routing Dashboard | `apps_script/IntelligentRoutingDashboard.html` |
| Manager Dashboard | `web_app/manager-dashboard.html` |
| PM Dashboard | `web_app/pm-dashboard.html` |
| QuickBooks Dashboard | `web_app/quickbooks-dashboard.html` |
| Remote Dashboard | `web_app/remote-dashboard.html` |
| TinyPM Dashboard | `tinypm/web_dashboard.html` |

---

## UX Preflight Audit (MANDATORY FOR ALL UI WORK)

**BEFORE creating or modifying ANY HTML/CSS/UI file, run the dynamic UX audit:**

```bash
./scripts/ux-preflight-audit.sh <filename.html>   # Single file
./scripts/ux-preflight-audit.sh --all              # All HTML files
./scripts/ux-preflight-audit.sh --stats            # View rules
./scripts/ux-preflight-audit.sh --thresholds       # View thresholds
```

### Dynamic Rule Engine
Rules live in `config/ux_audit_rules.json`. To evolve the system:
- **Add rules:** Append to the `rules` array in the JSON
- **Update thresholds:** Change values in the `thresholds` object
- **Deprecate rules:** Set `"active": false` on outdated rules
- **Track evolution:** Add entries to `evolution_log`

### Quick Reference (from 14+ research documents):
- **Nav items:** 3-5 mobile, 5-7 desktop, 5 tabs max
- **Touch targets:** 44px min standard, 60px field mode, 72px gloved
- **Colors:** Use CSS variables only, no hardcoded hex. Primary green = `#22c55e`
- **Progressive disclosure:** Hide 80%, show 20%. Never show everything at once
- **Speed:** <100ms interactions, <3s page load, skeleton screens not spinners
- **Mobile:** Bottom tab bar (4 max), single column, 16px+ input font
- **Content:** Plain English labels, helpful error messages, encouraging empty states
- **Accessibility:** 4.5:1 contrast, ARIA labels, focus indicators, keyboard navigation

**Full reference: `docs/UX_PREFLIGHT_CHECKLIST.md`**
**Rules engine: `config/ux_audit_rules.json`**

---

## Pre-Flight Scripts

```bash
./scripts/pm-preflight.sh create <filename>    # Before creating files
./scripts/pm-preflight.sh deploy               # Before deploying
./scripts/pm-preflight.sh delete <target>      # Before deleting (CONFIRM WITH USER)
./scripts/pm-context-snapshot.sh               # Generate fresh context
./scripts/pre-flight-check.sh <file> <action>  # Exit 0=proceed, 1=caution, 2=BLOCKED
```

---

## Frontend + Backend Sync

| If you change... | You MUST also check... |
|------------------|------------------------|
| HTML elements | Frontend JavaScript that references them |
| Frontend features | Apps Script functions that serve them |
| API response format | Frontend code that consumes it |
| Apps Script endpoints | Frontend code that calls them |

Validate with: `./scripts/validate-element-refs.sh <file>`

---

## Known Duplicate Systems — DO NOT CREATE ANOTHER

| System | Locations |
|--------|-----------|
| Morning Brief | 4 versions exist |
| Approval System | 2 versions exist |
| Email Processing | 3 versions exist |

---

## Verification Tools

| Tool | Purpose |
|------|---------|
| `scripts/pre-flight-check.sh` | Pre-commit verification for new files |
| `scripts/ux-preflight-audit.sh` | Dynamic UX audit (reads rules from JSON) |
| `config/ux_audit_rules.json` | UX rules engine (33 rules, 42 thresholds) |
| `docs/UX_PREFLIGHT_CHECKLIST.md` | Human-readable UX reference checklist |
| `scripts/validate-element-refs.sh` | HTML/JS reference validation |
| `scripts/validate-api-urls.sh` | API URL consistency check |
| `scripts/governor_helpers.js` | Governor helper functions |
