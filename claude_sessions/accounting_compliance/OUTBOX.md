# OUTBOX: Accounting_Compliance Claude
## To: PM_Architect / Owner

**Updated:** 2026-01-16 @ 3:15 AM
**Status:** PHASE 1 + LOAN READINESS COMPLETE

---

## LATEST UPDATE: Loan Readiness Reports Added

### New Functions Deployed (v111)
- **`generateBalanceSheet()`** - Assets, liabilities, owner's equity, key ratios for lenders
- **`generateCashFlowStatement()`** - Operating/investing/financing activities + 12-month projection
- **`generateLoanPackage()`** - Complete document bundle for FSA, Farm Credit, or USDA loans

### Loan Package Includes:
- Balance Sheet with current ratio, debt-to-asset ratio, working capital
- P&L Statement
- Cash Flow Statement with seasonal projections
- Schedule F Report
- Farm Info (LLC, EIN, organic certification, etc.)
- Document checklist by loan type
- Next steps for application

### Test It:
```
?action=generateLoanPackage&loanType=FSA
?action=generateLoanPackage&loanType=FarmCredit
?action=generateLoanPackage&loanType=USDA
```

### Research Sources:
- [Farmers.gov](https://www.farmers.gov/loans)
- [FSA Farm Loan Programs](https://www.fsa.usda.gov/resources/farm-loan-programs)
- [Horizon Farm Credit](https://www.horizonfc.com/about/newsroom/farm-credit-loan-requirements-process-how-get-loan)

---

---

## BUILD COMPLETE (2026-01-16 Overnight Session)

### Owner Q&A Completed
Collected answers to all 17 questions:
- **Accountant:** DGPerry (6 email addresses for auto-import)
- **Organic Certified:** YES - OEFFA Ohio (core driver for building OS)
- **Grants:** PA Ag Innovation Grant (active, needs setup)
- **Loans:** None currently, wants debt consolidation research
- **GAP/FSMA:** Not certified but wants readiness
- **Receipts:** Digital/scattered → 100% capture going forward
- **Enterprise Tracking:** Built in with task timer coming

### Files Created

#### Backend (Google Apps Script)
- **`apps_script/AccountingModule.js`** - Standalone module file (reference)
- **Functions added to `MERGED TOTAL.js`**:
  - `initializeAccountingModule()` - Creates all sheets and Drive folders
  - `importAccountantEmails()` - Gmail auto-import from DGPerry
  - `analyzeAccountantEmailPatterns()` - Email pattern analysis
  - `saveReceipt()` / `uploadReceiptImage()` - Receipt management
  - `performOCR()` - Google Cloud Vision integration
  - `suggestCategory()` / `learnVendorCategory()` - Auto-categorization
  - `generateProfitLossStatement()` / `generateScheduleFReport()` - Reports
  - `saveGrant()` / `getGrants()` - Grant tracking
  - `logAuditEvent()` / `getAuditTrail()` - Audit logging

#### Frontend
- **`web_app/accounting.html`** - Full Accounting Hub with:
  - Dashboard with stats
  - Receipt upload (drag-drop, camera)
  - Receipt list with filtering
  - Accountant document hub
  - Email import and analysis
  - P&L and Schedule F report generation
  - Grant tracking interface
  - Category management view

#### Google Sheets (Created on Initialize)
- `RECEIPTS` - Receipt tracking
- `EXPENSE_CATEGORIES` - 57 categories mapped to Schedule F
- `COMPANY_CARDS` - Card tracking
- `REIMBURSEMENTS` - Reimbursement tracking
- `ACCOUNTANT_DOCS` - Documents from accountant
- `ACCOUNTANT_EMAILS` - Email import log
- `VENDOR_CATEGORIES` - Auto-categorization learning
- `GRANTS` - Grant tracking
- `GRANT_EXPENDITURES` - Grant expense allocation
- `FIXED_ASSETS` - Equipment/depreciation
- `AUDIT_TRAIL` - Compliance logging

#### Google Drive Structure (Created on Initialize)
```
Farm Receipts/
├── 2025/, 2026/, 2027/
│   └── 01-January ... 12-December/
Accountant Documents/
├── Incoming/
├── Outgoing/
├── Tax Returns/
└── Financial Statements/
```

### API Endpoints Added

**GET Endpoints:**
- `initializeAccountingModule`
- `getReceipts`
- `getExpenseCategories`
- `getAccountantEmails`
- `getAccountantDocs`
- `analyzeAccountantEmailPatterns`
- `getGrants`
- `getAuditTrailAccounting`
- `generateProfitLossStatement`
- `generateScheduleFReport`
- `suggestCategory`
- `getVendorCategories`

**POST Endpoints:**
- `saveReceipt`
- `uploadReceiptImage`
- `verifyReceipt`
- `importAccountantEmails`
- `setupEmailImportTrigger`
- `saveGrant`
- `addExpenseCategory`
- `updateReceipt`
- `deleteReceipt`
- `linkReceiptToGrant`

### Deployment Steps Required

1. **Copy AccountingModule.js functions to MERGED TOTAL.js** (DONE)
2. **Deploy new version of Apps Script**
   - Go to Google Sheets → Extensions → Apps Script
   - Deploy → Manage Deployments → Edit → New Version → Deploy
3. **Run Initialize**
   - Open `web_app/accounting.html`
   - Click "Initialize Module" button
   - This creates all sheets and Drive folders
4. **Import Accountant Emails**
   - Click "Import Emails" to pull DGPerry correspondence
   - Click "Refresh Analysis" to see communication patterns

### Still Pending (Delegated or Phase 2)

**Delegate to PM Claude:**
- Grant Tracking deep setup (PA Ag Innovation Grant details)
- Organic Compliance Module (coordinate with Field Operations)

**Phase 2:**
- Google Cloud Vision API key setup for full OCR
- Mobile receipt upload (coordinate with Mobile_Employee Claude)
- Loan application form library download
- Farm Credit / FSA deep dive research

---

## ORIGINAL RESEARCH (kept for reference)

## EXECUTIVE SUMMARY

I've completed the initial research phase for the Accounting & Compliance workstream. Below are my findings, proposed schemas, and questions requiring owner input before implementation.

### What Already Exists (Not My Domain)
- **Plaid Integration (LIVE)**: Bank account aggregation, transaction sync
- **QuickBooks Integration (CONFIGURED but DISABLED)**: Ready for enablement
- **Financial Dashboard**: Net worth tracking, debt management, investments
- **Google Sheets**: FIN_TRANSACTIONS, FIN_DEBTS, FIN_BANK_ACCOUNTS, FIN_BILLS

### What I'll Build
1. Receipt Management System (HIGH priority)
2. Accountant Document Hub (HIGH priority)
3. Farm-Specific Accounting Categories (HIGH priority)
4. Loan Readiness Reports (HIGH priority)
5. Audit Readiness System (HIGH priority)
6. AI Receipt Organizer (MEDIUM priority)
7. Year-End Financial Documents (MEDIUM priority)

---

## 1. FARM-SPECIFIC ACCOUNTING CATEGORIES

Based on IRS Schedule F and vegetable/flower farming best practices:

### INCOME Categories
| Category ID | Category Name | Schedule F Line | Description |
|-------------|---------------|-----------------|-------------|
| INC-001 | Sales of Produce | Line 1a | Fresh vegetables, herbs |
| INC-002 | Sales of Flowers | Line 1a | Cut flowers, bouquets, arrangements |
| INC-003 | Sales of Plants | Line 1a | Transplants, seedlings sold |
| INC-004 | CSA Revenue | Line 1a | Community Supported Agriculture shares |
| INC-005 | Farmers Market Sales | Line 1a | Direct-to-consumer market sales |
| INC-006 | Wholesale Revenue | Line 1a | Restaurant, grocery, florist sales |
| INC-007 | Agritourism Income | Line 8 | Farm tours, workshops, events |
| INC-008 | Agricultural Program Payments | Line 4a | USDA, FSA, state program payments |
| INC-009 | Crop Insurance Proceeds | Line 6 | Federal crop insurance payments |
| INC-010 | Grant Income | Line 8 | Research grants, conservation grants |
| INC-011 | Custom Services | Line 8 | Services performed for others |
| INC-012 | Rental Income | Line 8 | Equipment or land rental |

### EXPENSE Categories
| Category ID | Category Name | Schedule F Line | Description |
|-------------|---------------|-----------------|-------------|
| EXP-001 | Seeds & Transplants | Line 22 | Seed purchases, plug trays |
| EXP-002 | Soil Amendments | Line 22 | Compost, fertilizer, lime, minerals |
| EXP-003 | Pest & Disease Control | Line 6 | Organic pesticides, row cover, netting |
| EXP-004 | Irrigation Supplies | Line 22 | Drip tape, emitters, fittings |
| EXP-005 | Tools - Hand | Line 22 | Hoes, rakes, harvest knives |
| EXP-006 | Tools - Power | Line 12/14 | Tillers, mowers (depreciate if >$2500) |
| EXP-007 | Equipment - Major | Line 14 | Tractors, implements (depreciation) |
| EXP-008 | Fuel & Oil | Line 10 | Gas, diesel, equipment oil |
| EXP-009 | Vehicle Expenses | Line 10 | Farm truck, mileage, maintenance |
| EXP-010 | Labor - Wages | Line 22 | Employee wages |
| EXP-011 | Labor - Contract | Line 8 | 1099 contractors |
| EXP-012 | Labor - Payroll Tax | Line 22 | Employer FICA, FUTA |
| EXP-013 | Packaging & Supplies | Line 22 | Boxes, bags, rubber bands, labels |
| EXP-014 | Cooler Supplies | Line 22 | Ice, cooler maintenance |
| EXP-015 | Marketing & Advertising | Line 22 | Website, signage, ads |
| EXP-016 | Market Fees | Line 22 | Farmers market booth fees |
| EXP-017 | Delivery - Vehicle | Line 10 | Delivery truck expenses |
| EXP-018 | Delivery - Fuel | Line 10 | Delivery fuel costs |
| EXP-019 | Land Rent | Line 20a | Leased farmland |
| EXP-020 | Building Rent | Line 20b | Leased buildings/storage |
| EXP-021 | Property Taxes | Line 22 | Farm property taxes |
| EXP-022 | Utilities - Electric | Line 25 | Electric for irrigation, cooler |
| EXP-023 | Utilities - Water | Line 25 | Water bills |
| EXP-024 | Utilities - Propane/Heat | Line 25 | Greenhouse heating |
| EXP-025 | Insurance - Liability | Line 15 | Farm liability insurance |
| EXP-026 | Insurance - Crop | Line 15 | Federal crop insurance premiums |
| EXP-027 | Insurance - Workers Comp | Line 15 | Employee coverage |
| EXP-028 | Insurance - Vehicle | Line 15 | Farm vehicle insurance |
| EXP-029 | Professional Services | Line 22 | Accountant, lawyer fees |
| EXP-030 | Certifications | Line 22 | Organic, GAP, food safety |
| EXP-031 | Licenses & Permits | Line 22 | Business licenses, ag permits |
| EXP-032 | Repairs - Buildings | Line 16 | Greenhouse, barn repairs |
| EXP-033 | Repairs - Equipment | Line 16 | Tractor, implement repairs |
| EXP-034 | Repairs - Vehicles | Line 16 | Farm vehicle repairs |
| EXP-035 | Office Supplies | Line 22 | Paper, printer ink, etc. |
| EXP-036 | Software & Subscriptions | Line 22 | Farm software, apps |
| EXP-037 | Education & Training | Line 22 | Conferences, workshops, books |
| EXP-038 | Bank Fees & Interest | Line 11/18 | Loan interest, bank charges |
| EXP-039 | Conservation Expenses | Line 7 | Approved conservation practices |
| EXP-040 | Depreciation | Line 14 | Calculated depreciation |
| EXP-041 | Greenhouse Supplies | Line 22 | Pots, trays, heating mats |
| EXP-042 | Cover Crop Seed | Line 22 | Winter rye, clover, etc. |
| EXP-043 | Plastic Mulch & Landscape Fabric | Line 22 | Weed control materials |
| EXP-044 | Season Extension | Line 22 | Row cover, caterpillar tunnels |
| EXP-045 | Flower-Specific Supplies | Line 22 | Floral foam, ribbon, vases |

---

## 2. RECEIPT STORAGE SCHEMA

### Google Drive Folder Structure
```
📁 Farm Receipts (Root)
├── 📁 2026
│   ├── 📁 01-January
│   ├── 📁 02-February
│   ├── 📁 03-March
│   ├── 📁 04-April
│   ├── 📁 05-May
│   ├── 📁 06-June
│   ├── 📁 07-July
│   ├── 📁 08-August
│   ├── 📁 09-September
│   ├── 📁 10-October
│   ├── 📁 11-November
│   └── 📁 12-December
├── 📁 2025
│   └── ... (same structure)
└── 📁 Accountant Documents
    ├── 📁 Incoming (from accountant)
    └── 📁 Outgoing (reports to accountant)
```

### Receipt Tracking Sheet: `RECEIPTS`

| Column | Type | Description |
|--------|------|-------------|
| Receipt_ID | Text | Auto-generated: RCP-YYYYMMDD-001 |
| Date | Date | Transaction date |
| Vendor | Text | Store/vendor name |
| Amount | Currency | Receipt total |
| Tax_Amount | Currency | Sales tax if applicable |
| Category_ID | Text | Link to category (EXP-001, etc.) |
| Category_Name | Text | Display name |
| Payment_Method | Dropdown | Cash, Credit Card, Debit, Check, Company Card |
| Card_Type | Dropdown | Company, Personal (for reimbursement) |
| Reimbursement_Status | Dropdown | N/A, Pending, Reimbursed |
| Reimbursement_Date | Date | When reimbursed (if applicable) |
| Drive_File_ID | Text | Google Drive file ID for image |
| Drive_URL | URL | Direct link to receipt image |
| OCR_Raw_Text | Text | Extracted text from OCR |
| Submitted_By | Text | Employee who submitted |
| Submitted_Date | Datetime | When uploaded |
| Verified | Boolean | Owner/manager verified |
| Verified_By | Text | Who verified |
| Notes | Text | Additional notes |
| Enterprise | Text | Optional: Which crop/product line |
| Tax_Year | Number | 2026, 2025, etc. |

### Company Card Tracking Sheet: `COMPANY_CARDS`

| Column | Type | Description |
|--------|------|-------------|
| Card_ID | Text | Unique identifier |
| Card_Name | Text | "Farm Business Card", "Fuel Card" |
| Last_Four | Text | Last 4 digits |
| Card_Type | Text | Visa, Mastercard, etc. |
| Assigned_To | Text | Employee name or "Owner" |
| Monthly_Limit | Currency | Spending limit |
| Status | Dropdown | Active, Suspended, Closed |

### Reimbursement Tracking Sheet: `REIMBURSEMENTS`

| Column | Type | Description |
|--------|------|-------------|
| Reimbursement_ID | Text | Auto: RMB-YYYYMMDD-001 |
| Employee_ID | Text | Link to employee |
| Receipt_ID | Text | Link to receipt |
| Amount | Currency | Reimbursement amount |
| Submitted_Date | Date | When requested |
| Approved_By | Text | Manager who approved |
| Approved_Date | Date | When approved |
| Paid_Date | Date | When payment issued |
| Payment_Method | Dropdown | Check, Direct Deposit, Cash |
| Check_Number | Text | If paid by check |
| Status | Dropdown | Pending, Approved, Paid, Rejected |

---

## 3. LOAN READINESS REQUIREMENTS

### Farm Credit / FSA Documentation Checklist

Based on research from [Farmers.gov](https://www.farmers.gov/loans), [FSA.usda.gov](https://www.fsa.usda.gov/resources/farm-loan-programs), and [Horizon Farm Credit](https://www.horizonfc.com/about/newsroom/farm-credit-loan-requirements-process-how-get-loan):

**Required Documents - Must Generate:**
| Document | Data Source | Priority |
|----------|-------------|----------|
| 3 Years Tax Returns (Schedule F) | Existing | Owner provides |
| Balance Sheet | FIN_BANK_ACCOUNTS + FIN_DEBTS + Assets | HIGH |
| Profit & Loss Statement | FIN_TRANSACTIONS | HIGH |
| Cash Flow Statement | FIN_TRANSACTIONS | HIGH |
| Cash Flow Projection (12-month) | Historical data + planning | MEDIUM |
| Farm Business Plan | Manual + templates | MEDIUM |
| Enterprise Analysis by Crop | Receipts + Sales by crop | HIGH |

**Required Formats:**
- FSA Form 410-1 (Balance Sheet)
- FSA Form 431-2 (Farm Operating Plan)
- FSA Form 2038 (Loan Resolution)

**System Capabilities Needed:**
1. Generate Balance Sheet from existing data
2. Generate P&L Statement from transactions
3. Generate Cash Flow Statement
4. Export in PDF format for submission
5. Track document versions and submission dates

### Loan Types We Should Support

| Loan Type | Max Amount | Purpose | Key Documents |
|-----------|------------|---------|---------------|
| FSA Operating Loan | $400,000 | Seeds, equipment, labor | P&L, Cash Flow, Farm Plan |
| FSA Ownership Loan | $600,000 | Land purchase | Balance Sheet, Appraisal |
| FSA Microloan | $50,000 | Small/beginning farmers | Simplified requirements |
| Farm Credit Operating | Varies | Working capital | Financial statements |
| Farm Credit Real Estate | Varies | Land, buildings | Appraisal, title |

---

## 4. AUDIT READINESS REQUIREMENTS

Based on research from [PSU Extension](https://extension.psu.edu/get-your-farm-audited), [PA.gov](https://www.pa.gov/agencies/pda), and [USDA AMS](https://www.ams.usda.gov/services/auditing):

### Audit Types to Prepare For

**1. USDA GAP (Good Agricultural Practices) Audit**
- Food safety documentation
- Traceability records (field to sale)
- Water testing records
- Employee training records
- Note: PA Dept of Agriculture now directs to USDA AMS directly

**2. PA Department of Agriculture - FSMA Compliance**
- Produce safety records under 21 CFR Part 112
- Annual internal exemption audits
- Worker training documentation

**3. Grant Compliance Audits (2 CFR 200)**
- Expenditure tracking by grant
- Receipts tied to grant funds
- Progress reports
- Due within 120-276 days depending on audit type

**4. Financial Audits (Loan Compliance)**
- Documentation of how loan funds were used
- Repayment records
- Condition compliance

### Audit Trail System Design

**New Sheet: `AUDIT_TRAIL`**

| Column | Type | Description |
|--------|------|-------------|
| Log_ID | Text | Auto-generated |
| Timestamp | Datetime | When action occurred |
| User_ID | Text | Who performed action |
| Action_Type | Dropdown | Create, Update, Delete, Export, Login |
| Entity_Type | Text | Receipt, Transaction, Report, etc. |
| Entity_ID | Text | ID of affected record |
| Old_Value | Text | JSON of previous state |
| New_Value | Text | JSON of new state |
| IP_Address | Text | If available |
| Notes | Text | Additional context |

**Grant Tracking Sheet: `GRANTS`**

| Column | Type | Description |
|--------|------|-------------|
| Grant_ID | Text | Unique identifier |
| Grant_Name | Text | Program name |
| Funding_Agency | Text | USDA, PA Dept of Ag, etc. |
| Award_Amount | Currency | Total award |
| Start_Date | Date | Grant period start |
| End_Date | Date | Grant period end |
| Reporting_Frequency | Dropdown | Monthly, Quarterly, Annual |
| Next_Report_Due | Date | Upcoming deadline |
| Status | Dropdown | Active, Closed, Pending |

**Grant Expenditure Sheet: `GRANT_EXPENDITURES`**

| Column | Type | Description |
|--------|------|-------------|
| Expenditure_ID | Text | Auto-generated |
| Grant_ID | Text | Link to grant |
| Receipt_ID | Text | Link to receipt |
| Amount | Currency | Amount charged to grant |
| Category | Text | Allowable category |
| Date | Date | When expense occurred |
| Approved_By | Text | Who approved for grant |
| Notes | Text | How expense relates to grant |

---

## 5. YEAR-END FINANCIAL DOCUMENTS

### Reports to Generate On-Demand

**1. Profit & Loss Statement**
- Pull from: FIN_TRANSACTIONS, RECEIPTS
- Group by: Income categories, Expense categories
- Periods: Monthly, Quarterly, Annual, Custom range
- Format: PDF, Excel

**2. Cash Flow Statement**
- Pull from: FIN_BANK_ACCOUNTS, FIN_TRANSACTIONS
- Sections: Operating, Investing, Financing
- Periods: Monthly, Quarterly, Annual

**3. Balance Sheet**
- Pull from: FIN_BANK_ACCOUNTS (Assets), FIN_DEBTS (Liabilities)
- Need to add: Fixed Assets tracking (equipment, land)
- Formula: Assets - Liabilities = Equity

**4. Enterprise Analysis (by Crop/Product)**
- Pull from: RECEIPTS (expenses tagged by enterprise), Sales data
- Calculate: Revenue, COGS, Gross Margin per crop
- Example enterprises: Tomatoes, Salad Mix, Sunflowers, CSA, Wholesale

**New Sheet Needed: `FIXED_ASSETS`**

| Column | Type | Description |
|--------|------|-------------|
| Asset_ID | Text | Unique identifier |
| Asset_Name | Text | "John Deere 3032E Tractor" |
| Category | Dropdown | Land, Buildings, Equipment, Vehicles |
| Purchase_Date | Date | When acquired |
| Purchase_Price | Currency | Original cost |
| Useful_Life_Years | Number | For depreciation |
| Depreciation_Method | Dropdown | Straight-line, MACRS, Section 179 |
| Current_Value | Currency | Book value |
| Accumulated_Depreciation | Currency | Total depreciation taken |
| Location | Text | Where asset is |
| Status | Dropdown | Active, Sold, Disposed |
| Notes | Text | Serial numbers, etc. |

---

## 6. ACCOUNTANT DOCUMENT HUB

### Incoming Documents (From Accountant)

**Typical formats:**
- PDF statements and reports
- Excel spreadsheets with analysis
- Word documents with recommendations
- Scanned forms requiring signature

**Document Tracking Sheet: `ACCOUNTANT_DOCS`**

| Column | Type | Description |
|--------|------|-------------|
| Doc_ID | Text | Auto-generated |
| Document_Name | Text | Descriptive title |
| Document_Type | Dropdown | Tax Return, Statement, Letter, Form |
| Received_Date | Date | When received |
| From_Contact | Text | Accountant name |
| Drive_File_ID | Text | Google Drive link |
| Status | Dropdown | Pending Review, Reviewed, Action Needed, Complete |
| Action_Required | Text | What owner needs to do |
| Due_Date | Date | If signature/action needed by date |
| Completed_Date | Date | When action completed |
| Notes | Text | Owner notes |

### Outgoing Reports (To Accountant)

**Reports we can generate:**
- Monthly expense summary by category
- Receipt compilation (PDF of all receipts by month)
- P&L draft
- Bank reconciliation data
- Payroll summary (if applicable)

---

## 7. AI RECEIPT ORGANIZER (OCR Implementation)

### Technology Options

Based on research from [TabScanner](https://tabscanner.com), [SparkReceipt](https://sparkreceipt.com/blog/ocr-accounting/):

**Option A: Google Cloud Vision API** ✓ RECOMMENDED
- Works with Google Apps Script
- $1.50 per 1000 images
- High accuracy for receipts
- Already in Google ecosystem

**Option B: Tesseract.js (Free)**
- Open source
- Runs client-side
- Less accurate than Google Vision
- No API costs

### OCR Data Extraction Goals

From each receipt image, extract:
1. **Vendor Name** - Store/company
2. **Date** - Transaction date
3. **Total Amount** - Final total
4. **Tax Amount** - Sales tax
5. **Line Items** - Individual purchases (advanced)

### Auto-Categorization Logic

```javascript
// Vendor-to-Category mapping examples
const VENDOR_CATEGORIES = {
  "JOHNNY'S SEEDS": "EXP-001", // Seeds & Transplants
  "FEDCO": "EXP-001",
  "HARRIS SEEDS": "EXP-001",
  "TRACTOR SUPPLY": "EXP-006", // Tools
  "AGWAY": "EXP-002", // Soil Amendments
  "SHEETZ": "EXP-008", // Fuel
  "WAWA": "EXP-008",
  "LOWE'S": "EXP-006", // Tools/Supplies
  "HOME DEPOT": "EXP-006",
  // ... expandable
};
```

### Learning System

Store successful categorizations in sheet `VENDOR_CATEGORIES`:

| Vendor_Pattern | Category_ID | Confidence | Last_Updated |
|----------------|-------------|------------|--------------|
| johnny's seeds | EXP-001 | 0.95 | 2026-01-15 |
| fedco | EXP-001 | 0.90 | 2026-01-15 |

---

## 8. IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1)
1. Create all Google Sheets (RECEIPTS, COMPANY_CARDS, REIMBURSEMENTS, etc.)
2. Create Drive folder structure
3. Implement category dropdown using CATEGORIES reference sheet
4. Build basic receipt entry form in Apps Script

### Phase 2: Receipt Management UI (Week 2)
1. Create `accounting.html` - main accounting hub
2. Receipt upload interface (camera/file)
3. Receipt list with search/filter
4. Category assignment workflow
5. Reimbursement request workflow

### Phase 3: OCR Integration (Week 3)
1. Integrate Google Cloud Vision API
2. Extract vendor, amount, date from images
3. Implement auto-category suggestions
4. Build review/correction workflow

### Phase 4: Reporting (Week 4)
1. Profit & Loss Statement generator
2. Cash Flow Statement generator
3. Balance Sheet generator
4. Export to PDF functionality

### Phase 5: Loan/Audit Readiness (Week 5)
1. Grant tracking interface
2. Audit trail logging
3. Document hub for accountant
4. Loan application document package generator

---

## 9. QUESTIONS FOR OWNER

Before implementation, I need answers to:

### Accountant Information
1. **Who is your accountant?** (Name, firm, contact info)
2. **What format does your accountant prefer for documents?** (PDF, Excel, printed?)
3. **How often do you send documents to your accountant?** (Monthly, quarterly, year-end only?)
4. **Does your accountant use any specific software?** (QuickBooks, Xero, etc.)

### Banking & Cards
5. **Do you have company credit/debit cards?** How many?
6. **Do employees use personal cards for farm purchases?** (Need reimbursement tracking?)
7. **What banks do you use?** (Already connected via Plaid?)

### Loans & Grants
8. **Do you currently have any FSA or Farm Credit loans?**
9. **Are you planning to apply for loans in the next year?**
10. **What grants are you currently managing or planning to apply for?**

### Certifications & Audits
11. **Is the farm certified organic?** (If so, need organic audit trail)
12. **Do you have GAP certification?**
13. **Have you had any FSMA inspections?**

### Existing Receipts
14. **Where are current receipts stored?** (Box, folder, scattered?)
15. **How far back do you want to digitize?** (Current year only? 3 years?)

### Categories
16. **Review the category list above** - are there any you'd add or remove?
17. **Do you track expenses by crop/enterprise?** (e.g., "Tomato" vs "Sunflower" expenses)

---

## 10. COORDINATION NOTES

### For Mobile_Employee Claude
- I'll need a receipt photo upload endpoint
- Suggested flow: Employee takes photo → uploads to Drive → creates RECEIPTS row
- Need fields: Employee_ID, Photo, optional Category, optional Notes

### For Financial Claude
- My RECEIPTS data will complement FIN_TRANSACTIONS
- Should receipts auto-create transactions, or are they linked separately?
- Please share access to FIN_DEBTS for Balance Sheet generation

### For Sales_CRM Claude
- When QuickBooks is enabled, should receipts sync to QB as expenses?
- Need coordination on category mapping to QB Chart of Accounts

---

## 11. SOURCES

Research conducted using:
- [FarmRaise - Schedule F Guide](https://www.farmraise.com/blog/what-is-schedule-f-file-farm-tax-forms)
- [IRS Schedule F (Form 1040)](https://www.irs.gov/pub/irs-pdf/f1040sf.pdf)
- [Farmers.gov - Farm Loans](https://www.farmers.gov/loans)
- [FSA Farm Loan Programs](https://www.fsa.usda.gov/resources/farm-loan-programs)
- [Horizon Farm Credit](https://www.horizonfc.com/about/newsroom/farm-credit-loan-requirements-process-how-get-loan)
- [PSU Extension - Farm Audits](https://extension.psu.edu/get-your-farm-audited)
- [PA Dept of Agriculture](https://www.pa.gov/agencies/pda)
- [USDA Auditing & Accreditation](https://www.ams.usda.gov/services/auditing)
- [TabScanner - Receipt OCR](https://tabscanner.com)
- [SparkReceipt - OCR Accounting](https://sparkreceipt.com/blog/ocr-accounting/)

---

*Accounting_Compliance Claude - Research phase complete. Awaiting owner input on questions above before beginning implementation.*
