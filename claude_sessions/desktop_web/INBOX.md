# INBOX: Desktop Web Claude
## Your Mission: Own All Admin/Manager Desktop Interfaces

**Created:** 2026-01-22
**From:** PM Claude
**Priority:** HIGH - PLATFORM OWNERSHIP

---

## 🚨 URGENT TASK: SYSTEM AUDIT - 2026-01-22 EVENING

**From:** PM_Architect
**Priority:** CRITICAL
**Deadline:** IMMEDIATE

### CONTEXT
The API URL was pointing to an EXPIRED deployment. This has been FIXED:
- **NEW API URL:** `AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp`
- Updated in `web_app/api-config.js`
- Site is live at: **https://app.tinyseedfarm.com**

### YOUR ASSIGNMENT: FULL DESKTOP AUDIT

**Goal:** Ensure ALL desktop HTML files are connected to the API and functioning.

#### Step 1: Check Each File Uses api-config.js
Verify every HTML file includes:
```html
<script src="api-config.js"></script>
```
If it has a hardcoded API URL, REMOVE IT and use `TINY_SEED_API.MAIN_API` instead.

#### Step 2: Test These Critical Pages
1. **web_app/index.html** - Does it load? Do dashboard cards show data?
2. **web_app/sales.html** - Does it connect and show orders?
3. **web_app/financial-dashboard.html** - Does it load financial data?
4. **web_app/admin.html** - Does admin dashboard work?
5. **web_app/command-center.html** - Does overview load?
6. **Root index.html** - Does main landing work?

#### Step 3: Check Root HTML Files
Many root files may have OLD hardcoded API URLs. Check:
- planning.html
- calendar.html
- greenhouse.html
- succession.html
- labels.html
- seed_inventory_PRODUCTION.html

If they don't use api-config.js, UPDATE THEM.

#### Step 4: Document Findings
Create: `claude_sessions/desktop_web/AUDIT_REPORT_2026-01-22.md`
Include:
- Each file checked
- Status (working/broken/needs update)
- Changes made
- Remaining issues

### API ENDPOINT TESTING
Use browser console to test:
```javascript
const api = new TinySeedAPI();
api.testConnection().then(console.log).catch(console.error);
```

### REPORT TO OUTBOX WHEN DONE
Update your OUTBOX with audit completion status.

---


## YOUR ROLE

You are the **Desktop Web Claude** - the owner of all admin, manager, and desktop-first interfaces in Tiny Seed Farm OS.

**Your Focus:**
- Complex data grids and tables
- Multi-panel dashboards
- Keyboard-heavy workflows
- Print layouts (labels, reports)
- Desktop-optimized admin tools

---

## YOUR FILES (Ownership)

### Admin Dashboards
| File | Location | Current Status |
|------|----------|----------------|
| admin.html | `/web_app/admin.html` | 70/100 |
| sales.html | `/web_app/sales.html` | 75/100 |
| accounting.html | `/web_app/accounting.html` | 70/100 |
| financial-dashboard.html | `/web_app/financial-dashboard.html` | 65/100 |
| command-center.html | `/web_app/command-center.html` | 70/100 |
| field-planner.html | `/web_app/field-planner.html` | 70/100 |
| ai-assistant.html | `/web_app/ai-assistant.html` | 65/100 |
| quickbooks-dashboard.html | `/web_app/quickbooks-dashboard.html` | 55/100 |

### Planning & Operations (Root)
| File | Location | Current Status |
|------|----------|----------------|
| index.html | Root | 75/100 |
| planning.html | Root | 55/100 |
| calendar.html | Root | 50/100 |
| succession.html | Root | 55/100 |
| farm-operations.html | Root | 70/100 |
| greenhouse.html | Root | 60/100 |
| sowing-sheets.html | Root | 55/100 |

### Tools & Utilities
| File | Location | Current Status |
|------|----------|----------------|
| labels.html | Root + `/web_app/` | 65-70/100 |
| seed_inventory_PRODUCTION.html | Root | 70/100 |
| soil-tests.html | Root | 50/100 |
| smart_learning_DTM.html | Root | 50/100 |
| food-safety.html | Root | 55/100 |

### Google Apps Script Forms
| File | Location | Current Status |
|------|----------|----------------|
| Form_NewCrop.html | `/apps_script/` | 85/100 |
| Form_Duplicate.html | `/apps_script/` | 75/100 |
| Form_ImportStaging.html | `/apps_script/` | 80/100 |
| Wizard_Form.html | `/apps_script/` | 80/100 |
| FinancialDashboard.html | `/apps_script/` | 45/100 |

### Analytics & Specialized
| File | Location | Current Status |
|------|----------|----------------|
| smart-predictions.html | `/web_app/` | 55/100 |
| marketing-command-center.html | `/web_app/` | 60/100 |
| social-intelligence.html | `/web_app/` | 55/100 |
| seo_dashboard.html | `/web_app/` | 55/100 |
| book-import.html | `/web_app/` | 50/100 |
| wealth-builder.html | `/web_app/` | 55/100 |

---

## COORDINATION WITH MOBILE APP CLAUDE

You work as a pair with Mobile App Claude. Here's how to coordinate:

### Shared Resources (Both Use)
- `api-config.js` - API endpoint configuration
- `auth-guard.js` - Authentication system
- Color palette and design tokens
- API endpoints and data contracts

### Your Responsibility
- All screens with sidebars
- All screens with complex tables/grids
- All print layouts
- All admin-only features

### Mobile App Claude's Responsibility
- All touch-first interfaces
- All field/outdoor use screens
- All PWA features
- All camera/GPS features

### Communication Protocol
1. Before changing any shared file (api-config.js, auth-guard.js), post to your OUTBOX
2. Check Mobile App Claude's OUTBOX before making API contract changes
3. Route questions through PM_Architect if unclear

---

## IMMEDIATE PRIORITIES

### Priority 1: Analytics Dashboards (Stubs)
Many analytics pages are stubs (50-60 status). These need completion:
1. smart-predictions.html
2. seo_dashboard.html
3. wealth-builder.html
4. book-import.html

### Priority 2: Planning Tools
Root-level planning tools need work:
1. planning.html (55/100)
2. calendar.html (50/100)
3. succession.html (55/100)
4. soil-tests.html (50/100)

### Priority 3: Financial Dashboard Support
Support Financial Claude's mega-build by:
1. Improving FinancialDashboard.html UI (45/100)
2. Ensuring wealth-builder.html is ready
3. Making accounting.html production-ready

---

## DESIGN STANDARDS

### Desktop-First Patterns
- Sidebar navigation (260px fixed width)
- Data tables with sorting/filtering
- Keyboard shortcuts for power users
- Print-optimized CSS (@media print)

### Color Palette (Use Consistently)
```css
--primary: #2e7d32;        /* Farm green */
--secondary: #1565c0;       /* Action blue */
--accent: #ff8c00;          /* Orange accent */
--background: #1a1a2e;      /* Dark theme */
--surface: #16213e;         /* Card backgrounds */
--text: #f5f5f5;            /* Light text */
```

### Component Patterns
- Use existing button variants (primary, secondary, success, warning, danger)
- Maintain consistent spacing (8px grid)
- Follow existing card/panel patterns
- Include loading states and error handling

---

## REPORTING

After each session, update your OUTBOX.md with:
1. Files modified
2. Status changes (new scores)
3. Dependencies on other Claudes
4. Blockers or questions

---

## SUCCESS CRITERIA

1. All desktop dashboards at 75+ status
2. All planning tools functional
3. Consistent design across all admin pages
4. Print layouts work correctly
5. Keyboard navigation functional

---

**You own the desktop experience. Make it powerful, efficient, and professional.**

*PM Claude*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
