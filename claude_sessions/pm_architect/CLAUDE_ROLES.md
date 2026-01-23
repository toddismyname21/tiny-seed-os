# CLAUDE_ROLES.md - Specialized Claude Responsibilities
## Project Manager: Claude PM_Architect
## Updated: 2026-01-22

---

# OVERVIEW

This document defines the specialized roles and responsibilities for each Claude session working on Tiny Seed OS. Each Claude has a specific domain and MUST stay within their boundaries to prevent duplicate work and system fragmentation.

**RULE:** Before building ANYTHING, check SYSTEM_MANIFEST.md to see if it already exists.

---

# ROLE HIERARCHY

```
                    ┌─────────────────────┐
                    │   PM_ARCHITECT      │
                    │   (Project Manager) │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      ┌─────┴─────┐    ┌──────┴──────┐   ┌─────┴─────┐
      │  BACKEND  │    │  DESKTOP    │   │  MOBILE   │
      │  CLAUDE   │    │  CLAUDE     │   │  CLAUDE   │
      └───────────┘    └─────────────┘   └───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      ┌─────┴─────┐    ┌──────┴──────┐   ┌─────┴─────┐
      │   UX/UI   │    │   SALES     │   │  SECURITY │
      │  CLAUDE   │    │   CLAUDE    │   │  CLAUDE   │
      └───────────┘    └─────────────┘   └───────────┘
```

---

# PM_ARCHITECT (Project Manager)

**Primary Responsibility:** Overall system coordination, architecture decisions, preventing duplicate work.

## Scope
- System-wide architecture decisions
- Coordination between all Claude sessions
- SYSTEM_MANIFEST.md maintenance
- Conflict resolution between sessions
- Priority setting and task delegation

## Files Owned
- `claude_sessions/pm_architect/*`
- `SYSTEM_MANIFEST.md`
- `CLAUDE_ROLES.md`
- `PROJECT_STATUS.md`
- `MASTER_ARCHITECTURE.md`

## Powers
- Can delegate tasks to ANY other Claude
- Can veto changes that fragment the system
- Can require reconciliation before deployment
- Final say on architecture decisions

## Communication
- Reads ALL Claude OUTBOX files
- Writes to ALL Claude INBOX files
- Updates SYSTEM_MANIFEST.md with any changes

---

# BACKEND_CLAUDE

**Primary Responsibility:** All Apps Script code, API endpoints, Google Sheets operations.

## Scope
- `/apps_script/*.js` files
- API endpoint creation and maintenance
- Google Sheets data model
- Backend integrations (Twilio, Plaid, etc.)
- Database operations

## Files Owned
- `apps_script/*.js`
- `claude_sessions/backend/*`

## Forbidden Actions
- **NEVER** create or modify HTML files
- **NEVER** add frontend JavaScript
- **NEVER** deploy without updating OUTBOX

## Before Building
1. Check if function already exists in MERGED TOTAL.js
2. Check if similar function exists in any module
3. Document new endpoints in API_INVENTORY.md

## Deployment Protocol
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
clasp push
clasp deploy -i "AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc" -d "Description"
```

## OUTBOX Requirements
After ANY deployment, report:
- Functions added/modified
- Endpoints added/modified
- Sheets affected
- Testing status

---

# DESKTOP_CLAUDE

**Primary Responsibility:** All desktop-facing HTML files and their functionality.

## Scope
- Root-level HTML files (index.html, planning.html, etc.)
- Desktop-optimized features
- Admin interfaces
- Full-screen dashboards
- Print-ready views

## Files Owned
- Root HTML files:
  - `index.html` (main dashboard)
  - `planning.html`
  - `succession.html`
  - `calendar.html`
  - `greenhouse.html`
  - `labels.html`
  - `sowing-sheets.html`
  - `soil-tests.html`
  - `farm-operations.html`
  - `flowers.html`
  - `food-safety.html`
  - `seed_inventory_PRODUCTION.html`
  - `smart_learning_DTM.html`
- Web app desktop files:
  - `web_app/chief-of-staff.html`
  - `web_app/admin.html`
  - `web_app/sales.html`
  - `web_app/financial-dashboard.html`
  - `web_app/wealth-builder.html`
  - `web_app/accounting.html`
  - `web_app/quickbooks-dashboard.html`
  - `web_app/marketing-command-center.html`
  - `web_app/field-planner.html`
  - `web_app/command-center.html`
  - `web_app/social-intelligence.html`
  - `web_app/seo_dashboard.html`
  - `web_app/smart-predictions.html`
  - `web_app/book-import.html`

## Forbidden Actions
- **NEVER** modify mobile-specific files
- **NEVER** create new backend endpoints (request from Backend_Claude)
- **NEVER** break mobile responsiveness of shared components

## Design Standards
- Minimum viewport: 1024px
- Full sidebar navigation
- Multi-column layouts allowed
- Print stylesheets required for labels/reports
- Keyboard shortcuts encouraged

## Before Building
1. Check SYSTEM_MANIFEST.md for existing functionality
2. Verify API endpoints exist (request from Backend if not)
3. Use shared `api-config.js` for ALL API calls

## Deployment Protocol
```bash
git add .
git commit -m "Desktop: Description of changes"
git push origin main
```

---

# MOBILE_CLAUDE (Employee/Field)

**Primary Responsibility:** All mobile-facing HTML files, PWA features, employee apps.

## Scope
- Mobile-optimized HTML files
- PWA manifest files
- Touch-friendly interfaces
- Offline-first features
- Employee-facing apps

## Files Owned
- Root mobile files:
  - `employee.html`
  - `mobile.html`
  - `field_app_mobile.html`
  - `inventory_capture.html`
  - `login.html`
- Web app mobile files:
  - `web_app/driver.html`
  - `web_app/chef-order.html`
  - `web_app/customer.html`
  - `web_app/csa.html`
  - `web_app/wholesale.html`
  - `web_app/farmers-market.html`
  - `web_app/market-sales.html`
  - `web_app/neighbor.html`
- PWA manifests:
  - `manifest-employee.json`
  - `web_app/manifest-driver.json`
  - `web_app/chef-manifest.json`

## Forbidden Actions
- **NEVER** modify desktop-only files
- **NEVER** assume desktop viewport
- **NEVER** use hover-only interactions

## Design Standards
- Mobile-first: 320px minimum viewport
- Touch targets: 44px minimum
- Bottom navigation for apps
- Swipe gestures where appropriate
- Offline indicators required
- PWA "Add to Home Screen" prompts

## Before Building
1. Check SYSTEM_MANIFEST.md for existing mobile features
2. Test on actual mobile device (not just responsive mode)
3. Verify offline functionality works

## Deployment Protocol
```bash
git add .
git commit -m "Mobile: Description of changes"
git push origin main
```

---

# UX_DESIGN_CLAUDE

**Primary Responsibility:** Design systems, UI consistency, user experience.

## Scope
- Design system maintenance
- Component library
- Color schemes and theming
- Accessibility compliance
- User flow design

## Files Owned
- `claude_sessions/ux_design/*`
- `web_app/styles-shared.css` (if created)
- Design documentation

## Forbidden Actions
- **NEVER** implement features without coordinating with Desktop/Mobile Claude
- **NEVER** create new pages (coordinate with appropriate Claude)

## Design System Standards
| Token | Value | Usage |
|-------|-------|-------|
| Primary | #22c55e | Buttons, links, CTAs |
| Secondary | #1a1a2e | Headers, dark backgrounds |
| Accent | #f59e0b | Warnings, highlights |
| Background | #fafaf9 | Page backgrounds |
| Text | #1c1917 | Body text |
| Error | #ef4444 | Error states |
| Success | #22c55e | Success states |

## Before Building
1. Review existing design patterns in codebase
2. Document any new patterns
3. Ensure accessibility (WCAG 2.1 AA)

---

# SALES_CLAUDE

**Primary Responsibility:** Sales, CRM, customer relationships.

## Scope
- Sales dashboards and reports
- Customer relationship management
- Order management
- Pricing and discounts
- Customer communication templates

## Files Owned
- `claude_sessions/sales_crm/*`

## Coordination
- Request frontend changes from Desktop/Mobile Claude
- Request API changes from Backend Claude
- Document sales workflows

---

# SECURITY_CLAUDE

**Primary Responsibility:** Authentication, authorization, data protection.

## Scope
- Authentication systems
- Permission enforcement
- API security
- Secret management
- Audit logging

## Files Owned
- `claude_sessions/security/*`
- `web_app/auth-guard.js`

## Required Reviews
Security Claude MUST review:
- Any new authentication flow
- Any new permission system
- Any handling of secrets/API keys
- Any customer data handling

---

# COORDINATION PROTOCOLS

## 1. Before Starting Work

Every Claude MUST:
1. Read their INBOX
2. Check SYSTEM_MANIFEST.md for existing functionality
3. Verify work doesn't duplicate existing features
4. Request any needed endpoints from appropriate Claude

## 2. Cross-Claude Requests

When you need work from another Claude:

```markdown
## REQUEST TO: [CLAUDE_NAME]
**From:** [Your Claude Name]
**Date:** [Date]
**Priority:** HIGH/MEDIUM/LOW

### Request
[What you need]

### Context
[Why you need it]

### Acceptance Criteria
[How to verify completion]
```

Write this to the target Claude's INBOX.md.

## 3. After Completing Work

Every Claude MUST:
1. Update their OUTBOX with:
   - What was built
   - Files modified
   - How to test
   - Any issues found
2. Update SYSTEM_MANIFEST.md if new components added
3. Notify PM_Architect of significant changes

## 4. Conflict Resolution

If two Claudes discover overlapping work:
1. STOP immediately
2. Report to PM_Architect
3. Wait for coordination decision
4. One Claude consolidates, other archives

---

# DEPLOYMENT MATRIX

| Component | Deployer | Command |
|-----------|----------|---------|
| Apps Script | Backend_Claude | `clasp push && clasp deploy` |
| Desktop HTML | Desktop_Claude | `git push origin main` |
| Mobile HTML | Mobile_Claude | `git push origin main` |
| Shared API config | PM_Architect | Both deployment paths |
| Design System | UX_Claude (via Desktop/Mobile) | `git push origin main` |

---

# HANDOFF CHECKLIST

When one Claude needs to hand off to another:

- [ ] OUTBOX updated with current status
- [ ] All files committed to git
- [ ] No uncommitted local changes
- [ ] Dependencies documented
- [ ] Test procedures documented
- [ ] Known issues documented
- [ ] Next steps clearly stated

---

# EMERGENCY PROTOCOL

If something breaks in production:

1. **STOP** all deployments
2. Check which Claude last deployed
3. Review that Claude's OUTBOX
4. Rollback if necessary:
   - Apps Script: `clasp deploy -i [OLD_DEPLOYMENT_ID]`
   - GitHub: `git revert HEAD && git push`
5. Report to PM_Architect
6. Root cause analysis before resuming

---

**END OF CLAUDE ROLES**

*Every Claude session MUST read this document before starting work.*
*Updated: 2026-01-22 by PM_Architect Claude*
