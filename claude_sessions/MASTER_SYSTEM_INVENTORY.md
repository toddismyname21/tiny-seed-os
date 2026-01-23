# MASTER SYSTEM INVENTORY - TINY SEED FARM OS
## MANDATORY READING FOR ALL CLAUDES

**Last Updated:** 2026-01-23
**Updated By:** PM_Architect Claude

---

## STOP! READ THIS FIRST!

Before you do ANYTHING, verify that:
1. You've read this ENTIRE document
2. You've checked if something already exists before building it
3. You understand the current API deployment

**CURRENT API DEPLOYMENT:**
```
Deployment ID: AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp
Live Site: https://app.tinyseedfarm.com
API Config: web_app/api-config.js (SINGLE SOURCE OF TRUTH)
```

---

# SECTION 1: MCP SERVER (40+ TOOLS)

**Location:** `/mcp-server/`

The MCP (Model Context Protocol) server gives Claude DIRECT access to farm operations. It has **40+ tools already built**.

## MCP Server Files
| File | Purpose |
|------|---------|
| `tiny-seed-mcp.js` | Main MCP server (40+ tools) |
| `shopify-direct-import.js` | Bypasses Apps Script timeout for CSA import |
| `shopify-financial.js` | Shopify Payments, Payouts, Capital |
| `shopify-capital-tracker.js` | Capital loan tracking from CSV |
| `shopify-discount.js` | Create/manage discount codes |
| `paypal-integration.js` | PayPal/Venmo integration |
| `create-neighbor-discounts.js` | Neighbor campaign discounts |

## MCP Tool Categories

### Email Tools
- `send_season_announcement` - Send 2026 season email
- `send_email` - Send custom email

### CSA Member Tools
- `get_csa_dashboard` - CSA retention dashboard with health scores
- `get_at_risk_members` - Members at risk of churning
- `get_member_health` - Health score for specific member
- `recalculate_health_scores` - Recalculate all health scores
- `get_churn_alerts` - All churn alerts by priority

### Farm Operations Tools
- `get_planning_data` - Crop planning data
- `get_greenhouse_tasks` - Greenhouse sowing tasks
- `get_harvest_predictions` - AI harvest predictions
- `get_weather` - Weather forecast
- `get_morning_brief` - Daily morning intelligence brief

### Shopify Tools
- `shopify_test_connection` - Test connection
- `shopify_get_locations` - Get POS locations
- `shopify_sync_orders` - Sync recent orders
- `shopify_get_order` - Get specific order
- `shopify_sync_products` - Sync products
- `shopify_sync_customers` - Sync customers
- `shopify_get_email_subscribers` - Email subscribers
- `shopify_register_csa_webhook` - Register CSA webhook
- `shopify_list_webhooks` - List webhooks
- `shopify_delete_webhook` - Delete webhook

### Shopify Financial Tools
- `shopify_get_payments_balance` - Pending payments balance
- `shopify_get_payouts` - Payout history
- `shopify_get_capital` - Capital loan info
- `shopify_get_financial_summary` - Complete financial summary
- `shopify_get_capital_loan` - Capital loan status from CSV
- `shopify_setup_capital_tracking` - Set up tracking triggers
- `shopify_calculate_daily_capital` - Calculate daily payment
- `shopify_reconcile_capital` - Reconcile with actual
- `shopify_capital_status` - Capital tracking status

### Shopify Discount Tools
- `shopify_list_discounts` - List discount codes
- `shopify_get_products` - Get products for discounts
- `shopify_create_neighbor_discounts` - Create NEIGHBOR campaign codes
- `shopify_delete_discount` - Delete price rule

### PayPal/Venmo Tools
- `paypal_test_connection` - Test connection
- `paypal_get_balance` - Account balance
- `paypal_get_transactions` - Transaction history
- `paypal_get_summary` - Financial summary

### Direct Import Tools
- `import_csa_from_shopify` - DIRECT import (bypasses timeout)

### QuickBooks Tools
- `quickbooks_test_connection` - Test connection
- `quickbooks_get_dashboard` - Financial dashboard
- `quickbooks_sync_shopify_order` - Sync order to invoice

### Farmers Market Tools
- `market_init` - Initialize module
- `market_get_locations` - Get market locations
- `market_get_upcoming` - Upcoming sessions
- `market_create_session` - Create new session
- `market_get_session` - Get session details
- `market_generate_harvest_plan` - Smart harvest plan
- `market_sync_shopify_sales` - Sync POS sales
- `market_get_dashboard` - Market dashboard
- `market_initiate_settlement` - Start settlement
- `market_complete_settlement` - Complete with reconciliation
- `market_get_analytics` - Performance analytics
- `market_morning_brief` - Market morning brief

### Sales & Customers Tools
- `get_sales_dashboard` - Sales overview
- `get_customers` - Customer list
- `get_pick_pack_list` - Pick/pack list

### Marketing Intelligence Tools
- `marketing_get_dashboard` - Marketing dashboard
- `marketing_get_customer_intelligence` - Customer CLV, churn risk
- `marketing_get_next_best_actions` - AI recommendations
- `marketing_get_attribution_report` - Multi-touch attribution

### Compliance Tools
- `compliance_get_dashboard` - Food safety dashboard
- `compliance_get_phi_deadlines` - Pre-harvest intervals
- `compliance_log_spray` - Log spray application

### SMS Tools
- `sms_get_dashboard` - SMS dashboard
- `sms_get_commitments` - Open commitments
- `sms_complete_commitment` - Complete commitment

### Financial Tools
- `financial_get_dashboard` - P&L summary

### Chief of Staff Tools (11 Modules)
- `cos_get_ultimate_brief` - Ultimate morning brief
- `cos_get_weather` - Farm-specific weather
- `cos_get_style_profile` - Todd's writing style
- `cos_apply_style` - Apply style to draft
- `cos_get_available_agents` - List 7 AI agents
- `cos_run_agent_task` - Run agent task
- `cos_get_autonomy_status` - Autonomy levels
- `cos_run_proactive_scan` - Proactive scanning
- `cos_get_active_alerts` - Active alerts
- `cos_recall_contact` - Memory recall
- `cos_search_files` - Natural language file search
- `cos_predict_churn` - Churn prediction
- `cos_forecast_workload` - Workload forecast
- `cos_parse_voice` - Voice command parsing
- `cos_verify_system` - System health check

### System Tools
- `health_check` - API health check
- `get_system_status` - Full system status

---

# SECTION 2: APPS SCRIPT BACKEND (31 MODULES)

**Location:** `/apps_script/`

## Core Files
| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `MERGED TOTAL.js` | 5000+ | Main deployment file with all routes | ACTIVE |

## Chief of Staff Modules (11 files)
| File | Purpose |
|------|---------|
| `ChiefOfStaff_Master.js` | Core email AI system |
| `ChiefOfStaff_Autonomy.js` | 29 actions, L0-L4 autonomy levels |
| `ChiefOfStaff_Calendar.js` | Calendar integration |
| `ChiefOfStaff_FileOrg.js` | File organization AI |
| `ChiefOfStaff_Integrations.js` | Third-party integrations |
| `ChiefOfStaff_Memory.js` | Contact memory system |
| `ChiefOfStaff_MultiAgent.js` | 7 specialized AI agents |
| `ChiefOfStaff_Predictive.js` | Predictive analytics |
| `ChiefOfStaff_ProactiveIntel.js` | Proactive intelligence |
| `ChiefOfStaff_SMS.js` | SMS integration |
| `ChiefOfStaff_StyleMimicry.js` | Writing style learning |
| `ChiefOfStaff_Voice.js` | Voice command parsing |

## Smart/Intelligence Modules
| File | Purpose |
|------|---------|
| `SmartLaborIntelligence.js` | Work orders, benchmarks, efficiency | **NEEDS MERGE** |
| `SmartFinancialSystem.js` | Financial intelligence |
| `SmartSuccessionPlanner.js` | Succession planning AI |
| `SmartAvailability.js` | Real-time availability engine |
| `FarmIntelligence.js` | Core farm AI |
| `FoodSafetyIntelligence.js` | Food safety AI |
| `PRODUCTION_INTELLIGENCE_UPGRADE.js` | Production improvements |

## Operations Modules
| File | Purpose |
|------|---------|
| `AccountingModule.js` | Accounting functions |
| `BookImportModule.js` | Book import functionality |
| `CropRotation.js` | Crop rotation planning |
| `FieldManagement.js` | Field management |
| `MarketModule.js` | Farmers market operations |
| `MorningBriefGenerator.js` | Generate morning briefs |
| `PHIDeadlineTracker.js` | Pre-harvest interval tracking |

## Communication Modules
| File | Purpose |
|------|---------|
| `ChefCommunications.js` | Chef/wholesale communications |
| `EmailWorkflowEngine.js` | Email workflow automation |
| `ClaudeCoordination.js` | Multi-Claude coordination API |

## Infrastructure
| File | Purpose |
|------|---------|
| `INTELLIGENT_ROUTING_SYSTEM.js` | Smart routing |

---

# SECTION 3: WEB APP HTML FILES (32 files)

**Location:** `/web_app/`

## Admin/Management Dashboards
| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main dashboard | Working |
| `admin.html` | Admin control panel | Needs API fix |
| `sales.html` | Sales management | Working |
| `command-center.html` | Operations overview | Working |
| `chief-of-staff.html` | AI assistant dashboard | Working |
| `financial-dashboard.html` | Financial overview | Partial |
| `quickbooks-dashboard.html` | QuickBooks integration | Needs API fix |
| `accounting.html` | Accounting functions | Partial |

## Customer-Facing
| File | Purpose | Status |
|------|---------|--------|
| `customer.html` | Customer portal | Needs API fix |
| `csa.html` | CSA member portal | Needs API fix |
| `wholesale.html` | Wholesale portal | Working |
| `chef-order.html` | Chef ordering | Working |
| `neighbor.html` | Neighbor landing page | Working |

## Operations
| File | Purpose | Status |
|------|---------|--------|
| `driver.html` | Driver app | Working |
| `field-planner.html` | Field planning | Partial |
| `farmers-market.html` | Market management | Working |
| `market-sales.html` | Market POS | Working |
| `food-safety.html` | Food safety logging | Needs API fix |
| `delivery-zone-checker.html` | Zone checking | Working |

## Analytics & Intelligence
| File | Purpose | Status |
|------|---------|--------|
| `smart-predictions.html` | AI predictions | Stub |
| `marketing-command-center.html` | Marketing hub | Needs API fix |
| `social-intelligence.html` | Social analytics | Stub |
| `seo_dashboard.html` | SEO analytics | Stub |
| `wealth-builder.html` | Financial planning | Stub |
| `ai-assistant.html` | General AI assistant | Working |

## Tools
| File | Purpose | Status |
|------|---------|--------|
| `book-import.html` | Import books | Partial |
| `labels.html` | Label printing | Working |
| `log-commitment.html` | SMS commitment logging | Working |
| `claude-coordination.html` | Claude team coordination | Working |
| `pm-monitor.html` | PM monitoring | Working |

## Legal
| File | Purpose | Status |
|------|---------|--------|
| `eula.html` | End user agreement | Complete |
| `privacy-policy.html` | Privacy policy | Complete |

---

# SECTION 4: ROOT HTML FILES

**Location:** `/` (root)

| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main landing/navigation | Working |
| `login.html` | Login page | Working |
| `employee.html` | Employee mobile app | Working |
| `mobile.html` | Mobile interface | Working |
| `planning.html` | Crop planning | Partial |
| `calendar.html` | Farm calendar | Partial |
| `succession.html` | Succession planning | Partial |
| `greenhouse.html` | Greenhouse management | Partial |
| `sowing-sheets.html` | Sowing sheets | Partial |
| `farm-operations.html` | Operations overview | Working |
| `seed_inventory_PRODUCTION.html` | Seed inventory | Working |
| `inventory_capture.html` | Inventory capture | Working |
| `labels.html` | Label printing | Working |
| `greenhouse_labels_PRODUCTION.html` | Greenhouse labels | Working |
| `soil-tests.html` | Soil testing | Stub |
| `smart_learning_DTM.html` | DTM learning | Partial |
| `bed_assignment_COMPLETE.html` | Bed assignments | Working |
| `track.html` | Tracking | Partial |
| `gantt_FINAL.html` | Gantt chart | Working |
| `gantt_CROP_VIEW_FINAL.html` | Crop Gantt view | Working |
| `visual_calendar_PRODUCTION.html` | Visual calendar | Working |
| `api_diagnostic.html` | API testing | Working |

---

# SECTION 5: CLAUDE SESSION STRUCTURE

**Location:** `/claude_sessions/`

## Claude Team Folders
| Folder | Claude Role |
|--------|-------------|
| `backend/` | Backend Claude |
| `desktop_web/` | Desktop Claude |
| `mobile_app/` | Mobile App Claude |
| `mobile_employee/` | Mobile Employee Claude |
| `email_chief_of_staff/` | Chief of Staff Claude |
| `financial/` | Financial Claude |
| `accounting_compliance/` | Accounting Compliance Claude |
| `sales_crm/` | Sales/CRM Claude |
| `inventory_traceability/` | Inventory Claude |
| `field_operations/` | Field Operations Claude |
| `route_delivery/` | Route Delivery Claude |
| `security/` | Security Claude |
| `social_media/` | Social Media Claude |
| `don_knowledge_base/` | Don Knowledge Claude |
| `grants_funding/` | Grant Funding Claude |
| `business_foundation/` | Business Foundation Claude |
| `ux_design/` | UX Design Claudes |
| `pm_architect/` | PM Architect Claude |
| `food_safety/` | Food Safety Claude |
| `seo/` | SEO Claude |

## Key System Files
| File | Purpose |
|------|---------|
| `MASTER_SYSTEM_INVENTORY.md` | THIS FILE - read first |
| `FULL_TEAM_DEPLOYMENT.md` | All Claude startup instructions |
| `SMART_CHIEF_OF_STAFF_SPEC.md` | Chief of Staff vision |
| `CHIEF_OF_STAFF_COMMUNICATIONS_SPEC.md` | SMS/Email spec |
| `COORDINATION_RULES.md` | How Claudes coordinate |
| `MCP_SERVER_ACCESS.md` | MCP usage guide |

---

# SECTION 6: KNOWN BROKEN ITEMS

## Backend (Needs MERGED TOTAL.js fixes)
| Issue | Fix Required |
|-------|--------------|
| SmartLaborIntelligence.js not merged | Copy functions to MERGED TOTAL.js |
| `getRetailProducts` missing | Add route or use `getWholesaleProducts` |
| `sendMagicLink` wrong name | Use `sendCustomerMagicLink` |
| `logComplianceEntry` missing | Add specific compliance functions |
| `submitCSADispute` missing | Add route |
| `postToAppFeed` missing | Add route or remove |
| `saveQuickBooksCredentials` missing | Add route |
| `configureClaudeAPI` missing | Add route |

## Frontend (Needs api-config.js usage)
Some files may still have hardcoded old API URLs. All should use:
```javascript
const api = new TinySeedAPI();
// OR
const apiUrl = TINY_SEED_API.MAIN_API;
```

---

# SECTION 7: CONFIGURATION FILES

| File | Purpose |
|------|---------|
| `web_app/api-config.js` | API URL configuration |
| `manifest.json` | PWA manifest |
| `manifest-employee.json` | Employee PWA manifest |
| `web_app/manifest-driver.json` | Driver PWA manifest |
| `web_app/chef-manifest.json` | Chef PWA manifest |
| `apps_script/.clasp.json` | Clasp deployment config |
| `apps_script/appsscript.json` | Apps Script settings |
| `.claude/settings.json` | Claude settings |
| `.claude/settings.local.json` | Local Claude settings |
| `mcp-server/package.json` | MCP server dependencies |

---

# SECTION 8: DEPLOYMENT COMMANDS

## Frontend (GitHub Pages)
```bash
git add .
git commit -m "Description"
git push origin main
```
Changes appear at https://app.tinyseedfarm.com within minutes.

## Backend (Apps Script)
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/apps_script
PATH="/opt/homebrew/bin:$PATH" clasp push
PATH="/opt/homebrew/bin:$PATH" clasp deploy -i "AKfycbxy5DlsDXGwulhRNIHiD7q7sHQbN9kResVkR5YPXF2Z2IzgahVE9i38v063s4scAWMp" -d "v###: Description"
```

## MCP Server
```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS/mcp-server
npm install
node tiny-seed-mcp.js
```

---

# SECTION 9: DO NOT DUPLICATE

These things ALREADY EXIST. Do NOT rebuild:

1. **MCP Server** - 40+ tools already built
2. **Chief of Staff System** - 11 modules exist
3. **Smart Labor Intelligence** - Exists (needs merge)
4. **Claude Coordination** - API + dashboard exists
5. **CSA Retention System** - Health scores, churn prediction exists
6. **Marketing Intelligence** - CLV, attribution exists
7. **Farmers Market Module** - Full module exists
8. **Food Safety/Compliance** - PHI tracking exists

---

# SECTION 10: MANDATORY ACTIONS FOR ALL CLAUDES

1. **READ THIS FILE COMPLETELY** before starting any work
2. **CHECK YOUR INBOX** at `claude_sessions/[your_folder]/INBOX.md`
3. **UPDATE YOUR OUTBOX** at `claude_sessions/[your_folder]/OUTBOX.md`
4. **USE api-config.js** - Never hardcode API URLs
5. **PUSH CHANGES** to GitHub after modifications
6. **REDEPLOY** if you change Apps Script

---

**Remember: NO SHORTCUTS. ONLY MAKE THE BEST POSSIBLE. STATE OF THE ART.**

*This inventory is the single source of truth. When in doubt, check here first.*
