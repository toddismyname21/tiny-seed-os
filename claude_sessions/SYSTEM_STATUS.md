# SYSTEM STATUS - LIVE VIEW
## Last Updated: 2026-01-22 @ 11:50 PM

---

## DEPLOYMENT INFO

| Item | Value |
|------|-------|
| **Live Site** | https://app.tinyseedfarm.com |
| **API Deployment ID** | AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp |
| **API Version** | v201 |
| **Google Sheet ID** | 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc |

---

## CURRENT WORK IN PROGRESS

| Task | Assigned To | Status | INBOX Location |
|------|-------------|--------|----------------|
| Merge SmartLaborIntelligence.js | Backend Claude | PENDING | `claude_sessions/backend/INBOX.md` |
| Fix 13 broken endpoints | Backend Claude | PENDING | `claude_sessions/backend/INBOX.md` |
| Desktop HTML audit | Desktop Claude | PENDING | `claude_sessions/desktop_web/INBOX.md` |
| Mobile HTML audit | Mobile Claude | PENDING | `claude_sessions/mobile_app/INBOX.md` |
| Chief of Staff improvements | PM_Architect + Owner | IN PROGRESS | Direct collaboration |

---

## SYSTEM HEALTH

### API Status
- **Connection Test**: WORKING
- **Morning Brief**: WORKING
- **Smart Labor endpoints**: NOT WORKING (not merged)
- **13 endpoints**: BROKEN (see audit report)

### Frontend Status
- **api-config.js**: UPDATED with correct deployment ID
- **GitHub Pages**: DEPLOYED at app.tinyseedfarm.com

---

## BLOCKING ISSUES

### CRITICAL: SmartLaborIntelligence.js NOT MERGED

**Impact:** All Smart Labor features are broken
- Work orders don't load
- Task check-in/check-out doesn't work
- Efficiency tracking doesn't work
- Employee messaging doesn't work

**Fix Required:** Backend Claude must merge SmartLaborIntelligence.js into MERGED TOTAL.js and redeploy

### HIGH: 13 Broken API Endpoints

See full list in `claude_sessions/DESKTOP_AUDIT_REPORT.md`

Key broken endpoints:
- `getRetailProducts` - customer.html broken
- `sendMagicLink` - customer login broken
- `logComplianceEntry` - food-safety.html broken
- `submitCSADispute` - CSA portal broken

---

## AUDIT REPORTS

| Report | Location | Generated |
|--------|----------|-----------|
| Desktop Audit | `claude_sessions/DESKTOP_AUDIT_REPORT.md` | 2026-01-22 |
| Mobile Audit | `claude_sessions/MOBILE_AUDIT_REPORT.md` | 2026-01-22 |

---

## WHAT'S WORKING

| Component | URL | Status |
|-----------|-----|--------|
| Main Dashboard | /index.html | WORKING |
| Employee App | /employee.html | PARTIAL (no work orders) |
| Driver App | /web_app/driver.html | WORKING |
| Chef Ordering | /web_app/wholesale.html | WORKING |
| CSA Portal | /web_app/csa.html | PARTIAL (disputes broken) |
| Sales Dashboard | /web_app/sales.html | WORKING |
| Financial Dashboard | /web_app/financial-dashboard.html | WORKING |
| Chief of Staff | /web_app/chief-of-staff.html | WORKING (needs cache clear) |

---

## WHAT'S BROKEN

| Component | Issue | Waiting On |
|-----------|-------|------------|
| Smart Labor Intelligence | Functions not merged | Backend Claude |
| Customer Portal Login | Wrong endpoint name | Backend Claude |
| Food Safety Logging | Endpoint not routed | Backend Claude |
| CSA Disputes | Endpoint not routed | Backend Claude |

---

## COORDINATION SYSTEM

The Claude Coordination System is available for multi-Claude communication:

- **Dashboard**: `web_app/claude-coordination.html`
- **Guide**: `claude_sessions/CLAUDE_COORDINATION_GUIDE.md`
- **Backend**: `apps_script/ClaudeCoordination.js`

### How to Use
1. Open another Claude Code window
2. Read the relevant INBOX.md for your role
3. Work on assigned tasks
4. Update OUTBOX.md when done

---

## NEXT STEPS

1. **Backend Claude**: Merge SmartLaborIntelligence.js, fix broken endpoints, redeploy
2. **Desktop Claude**: Complete audit, update any files with hardcoded API URLs
3. **Mobile Claude**: Complete audit, verify PWA functionality
4. **PM_Architect**: Work with owner on Chief of Staff once backend is fixed

---

*This file is the LIVE status view. Update it as work progresses.*
