# Tiny Seed OS - Complete System Inventory

**Created:** 2026-01-16
**Purpose:** Unified desktop website and mobile app architecture

---

## Permission Tiers (Hierarchy)

| Tier | Role | Access Level |
|------|------|--------------|
| 1 | Admin | Full system access + financials |
| 2 | Manager | Planning, inventory, labels, sales |
| 3 | Field_Lead | Greenhouse, sowing, field operations |
| 4 | Employee | Dashboard, calendar, basic tracking |

---

## DESKTOP APPLICATION PAGES

### Admin Level (Tier 1)
| Page | Purpose | Location |
|------|---------|----------|
| admin.html | System administration | web_app/ |
| financial-dashboard.html | Financial overview | web_app/ |
| wealth-builder.html | Financial planning | web_app/ |

### Manager Level (Tier 2)
| Page | Purpose | Location |
|------|---------|----------|
| planning.html | Crop planning & scheduling | root |
| succession.html | Succession planting wizard | root |
| seed_inventory_PRODUCTION.html | Seed packet tracking | root |
| labels.html | Label printing | root |
| bed_assignment_COMPLETE.html | Field bed assignment | root |
| sales.html | Sales dashboard | web_app/ |
| marketing-command-center.html | Marketing & social | web_app/ |
| field-planner.html | Field planning | web_app/ |

### Field Lead Level (Tier 3)
| Page | Purpose | Location |
|------|---------|----------|
| greenhouse.html | Greenhouse seedling tracker | root |
| sowing-sheets.html | Sowing task sheets | root |
| gantt_FINAL.html | Field Gantt chart | root |
| gantt_CROP_VIEW_FINAL.html | Crop-view Gantt | root |
| greenhouse_labels_PRODUCTION.html | Greenhouse labels | root |
| field_app_mobile.html | Field kiosk | root |

### Employee Level (Tier 4)
| Page | Purpose | Location |
|------|---------|----------|
| index.html | Main dashboard | root |
| master_dashboard_FIXED.html | Alt dashboard (deprecate) | root |
| calendar.html | Visual calendar | root |
| visual_calendar_PRODUCTION.html | Production calendar | root |
| mobile.html | Mobile dashboard | root |
| smart_learning_DTM.html | DTM learning | root |
| farm-operations.html | Farm operations | root |
| track.html | Tracking | root |
| web_app/labels.html | Label viewer | web_app/ |

---

## MOBILE APPLICATION PAGES

### Employee Mobile App
| Page | Purpose |
|------|---------|
| employee.html | Main employee field app |
| mobile.html | Mobile dashboard |
| field_app_mobile.html | Field kiosk |

### Driver Mobile App
| Page | Purpose |
|------|---------|
| web_app/driver.html | Delivery driver app |

### Customer Portal
| Page | Purpose |
|------|---------|
| web_app/customer.html | Customer-facing portal |

---

## UNIFIED NAVIGATION STRUCTURE

### Desktop Sidebar (Proposed)

```
TINY SEED OS
├── Dashboard (index.html)
├── PLANNING
│   ├── Crop Calendar (calendar.html)
│   ├── Crop Plan (planning.html)
│   ├── Succession Wizard (succession.html)
│   ├── Bed Assignment (bed_assignment_COMPLETE.html)
│   └── Timeline Views
│       ├── Gantt - Fields (gantt_FINAL.html)
│       └── Gantt - Crops (gantt_CROP_VIEW_FINAL.html)
├── GROWING
│   ├── Greenhouse (greenhouse.html)
│   ├── Sowing Sheets (sowing-sheets.html)
│   ├── Seed Inventory (seed_inventory_PRODUCTION.html)
│   └── Soil Tests (soil-tests.html)
├── OPERATIONS
│   ├── Labels (labels.html)
│   ├── Farm Operations (farm-operations.html)
│   └── Tracking (track.html)
├── SALES & MARKETING
│   ├── Sales Dashboard (sales.html)
│   └── Marketing Center (marketing-command-center.html)
├── TEAM
│   ├── Employee App → (employee.html)
│   └── Driver App → (driver.html)
├── FINANCIALS (Admin only)
│   ├── Financial Dashboard (financial-dashboard.html)
│   └── Wealth Builder (wealth-builder.html)
└── SETTINGS
    └── Admin Panel (admin.html)
```

### Mobile Bottom Nav

```
┌─────────────────────────────────────────┐
│  🏠      📋      🥕      🔍      ⋯    │
│ Home   Tasks  Harvest  Scout   More   │
└─────────────────────────────────────────┘
```

---

## FILES TO CONSOLIDATE/DEPRECATE

| File | Action | Reason |
|------|--------|--------|
| master_dashboard_FIXED.html | DEPRECATE | Duplicate of index.html |
| visual_calendar_PRODUCTION.html | MERGE | Duplicate of calendar.html |
| succession_planner_CONNECTED.html | DEPRECATE | Old version |

---

## ENTRY POINTS

| Entry | URL | Purpose |
|-------|-----|---------|
| Desktop | /login.html → /index.html | Main desktop app |
| Employee Mobile | /employee.html | Field worker app |
| Driver | /web_app/driver.html | Delivery driver |
| Customer | /web_app/customer.html | Customer portal |

---

*This inventory is the source of truth for system architecture.*
