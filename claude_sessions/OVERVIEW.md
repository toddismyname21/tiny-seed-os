# CLAUDE SESSIONS - AUTOMATED WORKFLOW
## Tiny Seed OS Development Team

**Project Manager:** PM_Architect
**Last Updated:** 2026-01-15

---

## HOW THE MAILBOX SYSTEM WORKS

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTOMATED LOOP                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   PM writes to ──► INBOX.md ──► Claude reads & works         │
│                                        │                     │
│                                        ▼                     │
│   PM reads from ◄── OUTBOX.md ◄── Claude writes updates      │
│                                                              │
│   Owner only approves BIG decisions (payments, integrations) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### For Each Claude:
1. **Read** your `INBOX.md` for instructions from PM
2. **Do** the work
3. **Write** your updates to `OUTBOX.md`
4. **Repeat** when PM updates your INBOX

### For PM:
1. **Scan** all `OUTBOX.md` files
2. **Analyze** and prepare responses
3. **Write** new instructions to each `INBOX.md`
4. **Flag** big decisions for Owner approval

### For Owner:
1. Tell each Claude: "check your inbox"
2. Tell PM: "scan outboxes"
3. Approve any flagged decisions
4. That's it!

---

## THE TEAM

### Core Development (9 sessions)
| Session | Folder | Domain |
|---------|--------|--------|
| Backend | `/backend/` | API, database, deployments |
| Security | `/security/` | Auth, permissions |
| Inventory | `/inventory_traceability/` | QR codes, seed tracking |
| Social_Media | `/social_media/` | Marketing, Ayrshare |
| Financial | `/financial/` | Plaid, dashboards |
| Sales_CRM | `/sales_crm/` | Shopify, QuickBooks, orders |
| Field_Operations | `/field_operations/` | Planning, crops, Gantt |
| Mobile_Employee | `/mobile_employee/` | Employee/driver apps |
| UX_Design | `/ux_design/` | UI polish, accessibility |

### New Expansion (4 sessions)
| Session | Folder | Domain |
|---------|--------|--------|
| Accounting_Compliance | `/accounting_compliance/` | Receipts, loans, audits, year-end |
| Grants_Funding | `/grants_funding/` | Grant search, community partners |
| Business_Foundation | `/business_foundation/` | Lease, founding docs, season audits |
| Don_Knowledge_Base | `/don_knowledge_base/` | 40 years of farming wisdom |

---

## STATUS AT A GLANCE

### Core Team
| Session | Status | Last Update |
|---------|--------|-------------|
| Backend | **CODE COMPLETE** - awaiting deploy | 2026-01-16 |
| Security | **COMPLETE** - 25/25 pages secured | 2026-01-15 |
| Inventory | **APP BUILT** - inventory_capture.html ready | 2026-01-16 |
| Social_Media | **COMPLETE** - neighbor landing page live | 2026-01-16 |
| Financial | **COMPLETE** - investment research done | 2026-01-16 |
| Sales_CRM | **INTEGRATION READY** - needs credentials | 2026-01-16 |
| Field_Operations | **VERIFIED** - needs deploy + test | 2026-01-16 |
| Mobile_Employee | **SPEC COMPLETE** - costing mode designed | 2026-01-16 |
| UX_Design | **PRIORITY DONE** - touch targets fixed | 2026-01-16 |

### New Team (All Active!)
| Session | Status | Last Update |
|---------|--------|-------------|
| Accounting_Compliance | **LIVE** - 57 DGPerry tasks tracked | 2026-01-16 |
| Grants_Funding | **RESEARCH DONE** - EQIP prep ready | 2026-01-16 |
| Business_Foundation | **3 PROPOSALS** - lease options ready | 2026-01-16 |
| Don_Knowledge_Base | **COMPLETE** - 247 emails processed | 2026-01-16 |

---

## NEXT ACTIONS NEEDED

### CRITICAL: Deploy Apps Script (Unblocks 5 Sessions)
1. Go to: https://script.google.com/
2. Open Tiny Seed OS project
3. Click "Deploy" > "Manage deployments"
4. Click pencil icon > "New version" > "Deploy"

### After Deploy: Test These
| Claude | Task |
|--------|------|
| Inventory | Test inventory_capture.html |
| Social_Media | Test neighbor signup form |
| Field_Operations | Test sowing-sheets.html with data |

### Owner One-Time Action
**Store Ayrshare API key:**
1. Open: https://script.google.com/
2. Run function: `storeAyrshareApiKey()`

### Owner Credentials Still Needed
- **Shopify**: Store name, API key, API secret, access token
- **QuickBooks**: Client ID, client secret, company ID

### Owner Review Needed
| Item | Location | Priority |
|------|----------|----------|
| DGPerry accountant tasks (57) | Accounting Hub | HIGH |
| Lease proposals (3) | `/business_docs/lease/MORNING_READING_LIST.md` | HIGH |
| Mobile costing mode spec | `/claude_sessions/mobile_employee/COSTING_MODE_SPEC.md` | MEDIUM |

### External Actions Needed
| Action | Why | Contact |
|--------|-----|---------|
| Call NRCS | EQIP 90% cost-share | Local NRCS office |
| Get letter from Don | Land control for EQIP | Don |
| Verify SAM.gov | Federal grants blocked if expired | sam.gov |

---

## OWNER APPROVAL REQUIRED FOR:

- Payment integrations (QuickBooks, Shopify ONLY)
- New third-party services
- Database schema changes
- Major UI redesigns
- New features not in original plan

---

## API URL (ALL CLAUDES USE THIS)
```
https://script.google.com/macros/s/AKfycbx8syGK5Bm60fypNO0yE60BYtTFJXxviaEtgrqENmF5GStB58UCEA4Shu_IF9r6kjf5/exec
```

---

## KEY RESOURCES
- `/MASTER_ARCHITECTURE.md` - Full system docs
- `/web_app/auth-guard.js` - Permission system
- `/docs/STYLE_GUIDE.md` - UI standards
- `/USER_MANUAL.md` - End user documentation
