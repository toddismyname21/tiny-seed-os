# INBOX: Accounting_Compliance Claude
## From: PM_Architect

**Created:** 2026-01-15

---

## YOUR DOMAIN

You own all accounting integration, receipt management, and compliance reporting for Tiny Seed Farm.

---

## ASSIGNED TASKS

### 1. Accountant Document Hub
**Priority: HIGH**

Build a hub where owner can:
- Upload documents from accounting firm
- Parse document data automatically
- Generate reports to accountant specifications
- Track document review status

**Research needed:**
- What document formats do accountants typically send? (PDF, Excel, CSV?)
- What parsing libraries work in Google Apps Script?
- What report formats do accountants need?

### 2. Receipt Management System
**Priority: HIGH**

Build system for:
- Digital storage of all receipts
- Automatic categorization by type
- Company card vs personal (reimbursement) tracking
- Search and filter by category, date, amount

**Storage:** Google Drive folder structure + tracking in Sheets

### 3. Farm-Specific Accounting Categories
**Priority: HIGH**

Create categories tailored to vegetable and flower farming:
- Seeds & Transplants
- Soil Amendments & Fertilizer
- Pest & Disease Control
- Tools & Equipment
- Fuel & Vehicle
- Labor
- Marketing & Sales
- Packaging & Supplies
- Land & Facilities
- Utilities
- Professional Services
- Insurance
- (Research more categories specific to ag)

### 4. AI Receipt Organizer
**Priority: MEDIUM**

Implement AI-assisted receipt categorization:
- OCR to extract vendor, amount, date
- Auto-suggest category based on vendor/description
- Learn from corrections over time

**Consider:** Google Cloud Vision API or similar

### 5. Loan Readiness Reports
**Priority: HIGH**

Be report-ready for:
- **Farm Credit** loans
- **FSA (Farm Service Agency)** loans
- **USDA** programs

**Research needed:**
- What financial reports do each require?
- What formats/templates?
- What data points are mandatory?

### 6. Audit Readiness
**Priority: HIGH**

Be audit-ready for:
- USDA programs
- PA Department of Agriculture
- Grant compliance
- Loan compliance

**Build:**
- Audit trail for all financial transactions
- Document organization by program
- Quick report generation for auditors

### 7. Year-End Financial Documents
**Priority: MEDIUM**

Generate on-demand:
- Profit/Loss Statement
- Cash Flow Statement
- Balance Sheet
- Enterprise Analysis (by crop/product line)

**Integration:** Pull data from existing financial tracking + new receipt system

---

## EXTRACTED FARM DATA (2026-01-16)

**PM_Architect parsed 74 owner documents. Here's what's relevant to your work:**

### Business Identity
| Field | Value | Status |
|-------|-------|--------|
| Legal Name | Tiny Seed Farm LLC | Verified |
| EIN/Tax ID | 81-5299411 | **USE THIS** |
| Entity Number | 6509546 | PA registration |
| Formation Date | February 7, 2017 | Verified |
| Address | 257 Zeigler Road, Rochester, PA 15074 | Verified |
| County | Beaver County | Verified |
| State | Pennsylvania | Verified |

### Entity Structure
- **Type:** Limited Liability Company
- **Owner:** Todd R Wilson (100%)
- **State of Formation:** Pennsylvania

### Certifications
- **Organic Certifier:** OEFFA
- **Operation Number:** 3839
- **Certified Acreage:** ~5.6 acres

### STILL NEEDED FOR ACCOUNTING
- [ ] Accountant name/firm
- [ ] Accountant contact info
- [ ] Preferred document format (PDF/Excel?)
- [ ] Reporting frequency
- [ ] Current bookkeeping software
- [ ] Bank account details
- [ ] Credit card information

---

## COORDINATION

- **Mobile_Employee Claude** is adding receipt photo upload to employee app
- **Financial Claude** owns the Financial Dashboard (Plaid integration)
- **Sales_CRM Claude** owns QuickBooks integration - coordinate with them

---

## FIRST STEPS

1. Research accountant document workflows
2. Design receipt storage schema (Sheets + Drive)
3. Draft farm accounting category list
4. Identify loan/audit reporting requirements

---

## WRITE TO OUTBOX

- Research findings
- Proposed schema designs
- Questions for owner (accountant contact info, loan types, etc.)
- Implementation plan

---

*Accounting_Compliance Claude - This is a major workstream. Take time to research properly before building.*
