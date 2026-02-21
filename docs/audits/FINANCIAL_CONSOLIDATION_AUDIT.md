# Financial Systems Consolidation Audit

**Date:** 2026-02-20
**Auditor:** PM_Architect (Claude)
**Scope:** All 5 financial-related HTML pages in Tiny Seed OS
**Purpose:** Map every feature, find overlap, and recommend consolidation

---

## Table of Contents

1. [Page Inventory](#1-page-inventory)
2. [Detailed Feature Map Per Page](#2-detailed-feature-map-per-page)
3. [API Endpoint Inventory](#3-api-endpoint-inventory)
4. [Overlap Matrix](#4-overlap-matrix)
5. [Unique Features Per Page](#5-unique-features-per-page)
6. [Consolidation Recommendation](#6-consolidation-recommendation)
7. [Risk Assessment](#7-risk-assessment)
8. [Migration Action Plan](#8-migration-action-plan)

---

## 1. Page Inventory

| # | File | Title | Lines | Size Category |
|---|------|-------|-------|---------------|
| 1 | `web_app/accounting.html` | Accounting Hub | 2,715 | Medium |
| 2 | `web_app/financial-dashboard.html` | Tiny Seed Financial Command Center | 8,147 | Very Large |
| 3 | `web_app/loan-readiness.html` | Unified Loan Command Center | 19,147 | Massive |
| 4 | `web_app/quickbooks-dashboard.html` | QuickBooks Dashboard | 1,423 | Small |
| 5 | `web_app/wealth-builder.html` | Wealth Builder - Investment Dashboard | 1,680 | Small |

**Total: 33,112 lines of HTML/CSS/JS across 5 pages.**

---

## 2. Detailed Feature Map Per Page

### 2A. Accounting Hub (`accounting.html`) - 10 Tabs

| Tab | Features |
|-----|----------|
| **Dashboard** | Receipt count, YTD expenses, unverified count, pending docs stats; Recent receipts table (5 rows); Accountant email analysis |
| **Action Items** | 5 consolidated DGPerry accountant action items (hardcoded); Critical/high/completed/total task counts; All 57 extracted tasks table with priority/status filter; Task completion toggle with localStorage |
| **Banking** | Plaid bank connection (Connect Bank Account button); Connected bank accounts table (institution, name, type, balance, last synced); Recent transactions table (30 days); Refresh balances per account |
| **Receipts** | Drag-drop file upload zone (JPG, PNG, PDF); Receipt table with filters (category, verified status, vendor search); Add Receipt modal (date, amount, vendor, category, tax, payment method, card type, enterprise, organic checkbox, notes); OCR receipt processing; Verify receipt button |
| **Accountant Docs** | DGPerry documents table; Import emails button; Email history table |
| **Reports** | P&L Statement generator (date range); Schedule F Report generator (tax year); Report output with print/export |
| **Loan Readiness** | Loan type selection (FSA, Farm Credit, USDA); Farm info summary (pre-filled); Document checklist per loan type; Generate loan package button; Loan package output with Balance Sheet, P&L, Cash Flow, Schedule F, farm info, checklist |
| **Labor Costs** | Total hours, total cost, avg $/hour, crops tracked stats; Labor cost by crop table (batch ID, crop, variety, hours, direct/indirect/total cost, efficiency); Recent time entries table |
| **Grants** | Grant tracking table; Add Grant modal (name, agency, amount, dates, reporting frequency, notes) |
| **Categories** | Expense categories table (Schedule F line items) |

### 2B. Financial Command Center (`financial-dashboard.html`) - 12 Tabs

| Tab | Features |
|-----|----------|
| **Overview** | Net worth display (total assets, debt, monthly income, monthly expenses); Connect bank account button (Plaid); Emergency fund with progress bar; Investment portfolio stat; Total debt remaining; Round-up savings stat; Priority actions; Financial health score with chart |
| **Debt Destroyer** | Total debt, monthly minimum, credit utilization, accounts tracked stats; Payoff strategy selector (Avalanche vs Snowball); Debt table (account, balance, APR, min payment, payoff, actions); Add Debt modal; Payoff timeline; Debt-free date projection; Equipment wishlist with smart purchase planning; Smart recommendations / Today's Action Items |
| **Banking & Bills** | Total cash, monthly expenses, income, cash flow stats; Bank accounts (Plaid + manual); Bank statement upload (CSV, PDF, OFX, QFX); Upcoming bills table; Scan bill (OCR); Quick receipt capture (camera + upload); Recent transactions table; Loan Application Package generator (Balance Sheet, Asset Schedule, Depreciation, Debt Schedule) |
| **Investments** | Alpaca connection (commission-free investing); Plaid investment account tracking (Fidelity, Schwab, Vanguard); Portfolio holdings display |
| **Change Investing (Round-Ups)** | Round-up savings concept; Settings for round-up multiplier |
| **Wishlist** | Equipment purchase planning with smart affordability analysis; Wishlist item cards with safe-to-buy / wait / not-ready status |
| **Assets** | Farm asset tracking (equipment, vehicles, inventory); Asset depreciation (MACRS); Current value vs original value |
| **Payment Plans** | Create payment plans for debts; Payment schedule preview |
| **Team & Retirement** | Employee management; Retirement planning |
| **Settings** | Configuration options |
| **Marketing** | Marketing budget display; Marketing spend tracking; Marketing analytics (connects to MCC API endpoints) |
| **Documents** | Document management for financial files |

### 2C. Loan Command Center (`loan-readiness.html`) - 10 Tabs

| Tab | Features |
|-----|----------|
| **Overview** | Financial metrics grid (revenue, expenses, net income, debt ratio, current ratio, working capital); Lender readiness cards (Horizon Farm Credit, USDA-FSA, PA First Industries, Beginning Farmer); Readiness scores per lender; Missing items lists |
| **Document Vault** | Premium document vault with expandable categories; Document readiness score; Upload documents (drag-drop, multiple formats incl. Excel); Document status tracking (uploaded/missing/expired); "I Have This" quick-mark; Document info expandable tooltips with lender-specific tips; Priority badges per document |
| **Lenders** | Lender-specific checklists (Horizon, USDA-FSA, PA First Industries, Beginning Farmer, Custom); Add custom lender with web scraping of requirements; Lender requirement checkboxes; Generate lender-specific loan package |
| **Applications** | Application tracker table (lender, type, amount, status, submitted date, next step); Start new application modal; Application status badges (not started, in progress, submitted, approved, denied) |
| **Calculator** | Loan payment calculator (amount, rate, term); Monthly payment, total interest, total paid results |
| **Contacts** | Lender CRM (contact management for loan officers) |
| **Farm Profile** | Detailed farm profile for loan applications; Farm bio data entry and storage |
| **Grants** | Full grant tracking system with: Add/edit/delete grants; Grant web scraping (auto-populate from grant URLs); Grant document requirements with vault integration; Grant contacts CRM; Grant strategy AI generation; Grant videos and quick links; Application strength calculator; Bulk default grants (EQIP, VAPG, PA First Industries, etc.) |
| **Business Plan Generator** | Sales data parser (CSV, Excel, PDF uploads); Multi-format detection (Shopify, QuickBooks, Square, generic); Product categorization (CSA, Flower, Partner, Market, Wholesale, Direct); Year-by-year revenue breakdown; Correction modal for re-categorizing products; Parser AI chat assistant; Rule-based correction system; Generate AI business plan; Generate AI marketing plan |
| **Analytics** | Revenue analytics KPIs; Category breakdown table; Goals tracking; SWOT analysis (AI-generated); Revenue chart (bar, line, doughnut); Customer channel chart; Export data functionality; Improvement plans |

### 2D. QuickBooks Dashboard (`quickbooks-dashboard.html`) - No Tabs (Single Page)

| Section | Features |
|---------|----------|
| **Connection Banner** | QuickBooks connection status; Connect/Setup buttons |
| **Summary Cards** | Cash on Hand, Credit Card Balance, Accounts Receivable, Accounts Payable, Net Cash Position |
| **Account Balances** | Account list from QuickBooks (bank, credit) |
| **Profit & Loss (YTD)** | Income, Expenses, Net Income from QuickBooks |
| **Open Invoices (A/R)** | AR aging chart (current, 1-30, 31-60, 61-90, 90+ days); Overdue invoices list |
| **Open Bills (A/P)** | AP aging chart; Overdue bills list |
| **Setup Wizard** | QuickBooks credential entry (Company ID, Client ID, Client Secret); Redirect URI instructions; Scope requirements |

### 2E. Wealth Builder (`wealth-builder.html`) - No Tabs (Single Page)

| Section | Features |
|---------|----------|
| **Header** | Financial status badge (normal/cautionary/elevated/critical) |
| **Quick Stats** | 4 stat cards (similar to financial-dashboard) |
| **Allocation Chart** | Portfolio allocation doughnut chart with legend |
| **Season Indicator** | Farm seasonal cash flow timeline (Winter/Spring/Summer/Fall) |
| **Growth Signal Panel** | Offensive/Defensive mode badge; Momentum assets |
| **Action Items** | Priority-ranked action list |
| **Trade Table** | Recent/recommended trades |

---

## 3. API Endpoint Inventory

### Accounting Hub API Calls (27 unique endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getExpenseCategories` | GET | Load expense categories |
| `getReceipts` | GET | Load all receipts |
| `getAccountantDocs` | GET | Load accountant documents |
| `getAccountantEmails` | GET | Load email history |
| `getGrants` | GET | Load grants |
| `getLaborByCrop` | GET | Load labor cost data |
| `getTimelog` | GET | Load time entries |
| `getPlaidItems` | GET | Check Plaid connections |
| `getPlaidAccounts` | GET | Get Plaid accounts |
| `createPlaidLinkToken` | GET | Initialize Plaid Link |
| `exchangePlaidPublicToken` | POST | Complete Plaid connection |
| `getPlaidTransactions` | GET | Get bank transactions |
| `refreshPlaidBalances` | GET | Refresh account balances |
| `disconnectPlaidItem` | POST | Remove bank connection |
| `uploadReceiptImage` | POST | Upload receipt with image |
| `saveReceipt` | POST | Save receipt manually |
| `verifyReceipt` | POST | Mark receipt verified |
| `saveGrant` | POST | Save new grant |
| `importAccountantEmails` | GET | Import DGPerry emails |
| `analyzeAccountantEmailPatterns` | GET | Analyze email patterns |
| `generateProfitLossStatement` | GET | Generate P&L |
| `generateScheduleFReport` | GET | Generate Schedule F |
| `initializeAccountingModule` | GET | Initialize accounting sheets |
| `getAccountantTasks` | GET | Load extracted tasks |
| `updateAccountantTask` | POST | Update task status |
| `generateLoanPackage` | GET | Generate loan docs |

### Financial Dashboard API Calls (18 unique endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getWishlist` | GET | Load wishlist items |
| `getAssets` | GET | Load farm assets |
| `getBills` | GET | Load bills |
| `getAlpacaConfig` | GET | Check Alpaca connection |
| `getPaymentPlans` | GET | Load payment plans |
| `createPlaidLinkToken` | GET | Initialize Plaid Link |
| `exchangePlaidPublicToken` | POST | Complete Plaid connection |
| `getPlaidInvestmentHoldings` | GET | Get investment data |
| `getPlaidAccounts` | GET | Get bank accounts |
| `getPlaidTransactions` | GET | Get transactions |
| `refreshPlaidBalances` | GET | Refresh balances |
| `getMarketingBudget` | GET | Marketing budget |
| `getMarketingSpend` | GET | Marketing spend data |
| `getMarketingAnalytics` | GET | Marketing analytics |
| `getShopifyPaymentsBalance` | GET | Shopify balance |
| `getShopifyCapitalLoan` | GET | Shopify capital |
| `getPayPalFinancialSummary` | GET | PayPal data |
| `generateLoanPackage` | GET | Generate loan docs |

### Loan Command Center API Calls (18 unique endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getLoanFinancialSummary` | GET | Financial summary for loans |
| `getDebts` | GET | Load debts |
| `getBankAccounts` | GET | Load bank accounts |
| `getLoanDocuments` | GET | Load vault documents |
| `getLoanApplications` | GET | Load applications |
| `scrapeLenderRequirements` | POST | Scrape lender website |
| `getParserCorrectionRules` | GET | Load parser rules |
| `saveParserCorrectionRule` | POST | Save correction rule |
| `deleteParserCorrectionRule` | POST | Delete correction rule |
| `uploadLoanDocument` | POST | Upload document to vault |
| `saveLoanApplication` | GET | Save application |
| `generateLenderLoanPackage` | GET | Generate lender package |
| `getLenderReadiness` | GET | Check readiness score |
| `getFarmSalesData` | GET | Load sales data |
| `saveFarmSalesData` | POST | Save parsed sales |
| `generateFarmBusinessPlan` | POST | AI business plan |
| `generateFarmMarketingPlan` | POST | AI marketing plan |
| `parserAssistant` | POST | AI parser chat |
| `scrapeGrantRequirements` | POST | Scrape grant website |
| `generateGrantStrategy` | POST | AI grant strategy |
| `saveCustomLenders` | POST | Save custom lenders |
| `parseUniversalDocument` | POST | Parse uploaded doc |

### QuickBooks Dashboard API Calls (4 unique endpoints)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `getQuickBooksConnectionStatus` | GET | Check QB connection |
| `getQuickBooksAuthUrl` | GET | Get OAuth URL |
| `getQuickBooksDashboard` | GET | Full QB dashboard data |
| `saveQuickBooksCredentials` | POST | Save QB credentials |

### Wealth Builder API Calls

No backend API calls found - this page appears to be a static/demo investment dashboard that does not connect to the backend.

---

## 4. Overlap Matrix

### Feature Overlap Table

| Feature | Accounting | Financial Dashboard | Loan Readiness | QuickBooks | Wealth Builder |
|---------|:----------:|:-------------------:|:--------------:|:----------:|:--------------:|
| **Plaid bank connection** | YES | YES | - | - | - |
| **Bank account display** | YES | YES | partial | YES (via QB) | - |
| **Bank transactions** | YES | YES | - | - | - |
| **Receipt upload/capture** | YES | YES | - | - | - |
| **P&L / Income reports** | YES | - | - | YES | - |
| **Loan package generation** | YES | YES | YES | - | - |
| **Grant tracking** | YES | - | YES | - | - |
| **Expense categories** | YES | - | - | - | - |
| **Accountant email/docs** | YES | - | - | - | - |
| **Action items/tasks** | YES | YES | - | - | - |
| **Debt tracking/destroyer** | - | YES | YES (partial) | - | - |
| **Asset tracking** | - | YES | - | - | - |
| **Investment tracking** | - | YES | - | - | YES |
| **Wishlist/equipment planning** | - | YES | - | - | - |
| **Payment plans** | - | YES | - | - | - |
| **Marketing spend** | - | YES | - | - | - |
| **Document vault** | - | - | YES | - | - |
| **Lender management** | - | - | YES | - | - |
| **Application tracker** | - | - | YES | - | - |
| **Loan calculator** | - | - | YES | - | - |
| **Sales data parser** | - | - | YES | - | - |
| **Business/marketing plan AI** | - | - | YES | - | - |
| **Farm profile** | - | - | YES | - | - |
| **Analytics dashboard** | - | - | YES | - | - |
| **QuickBooks connection** | - | - | - | YES | - |
| **AR/AP aging** | - | - | - | YES | - |
| **Labor cost tracking** | YES | - | - | - | - |
| **Seasonal cash flow** | - | - | - | - | YES |
| **Portfolio allocation** | - | - | - | - | YES |
| **Employee/retirement** | - | YES | - | - | - |

### Critical Overlaps (Exact Duplicates)

| Overlap | Pages | Severity |
|---------|-------|----------|
| **Plaid bank connection** | Accounting + Financial Dashboard | HIGH - Two separate Plaid integrations, same `createPlaidLinkToken` and `exchangePlaidPublicToken` calls |
| **Loan package generation** | Accounting + Financial Dashboard + Loan Readiness | HIGH - Three separate `generateLoanPackage` implementations |
| **Grant tracking** | Accounting (basic) + Loan Readiness (advanced) | MEDIUM - Accounting has simple grant table; Loan Readiness has full CRM with scraping, docs, strategy |
| **Bank account display** | Accounting + Financial Dashboard + QuickBooks | MEDIUM - Three pages showing bank accounts from different sources |
| **Receipt upload** | Accounting + Financial Dashboard | MEDIUM - Both have receipt upload with OCR |
| **Transactions display** | Accounting + Financial Dashboard | MEDIUM - Both show Plaid transactions |
| **Debt tracking** | Financial Dashboard (full) + Loan Readiness (summary) | LOW - Different depth levels |

---

## 5. Unique Features Per Page

### Features ONLY in Accounting Hub
- Accountant email import and analysis (DGPerry correspondence)
- Accountant action items (tax organizer, bank feed, sign docs, year-end, invoices)
- Expense categories management (Schedule F mapping)
- Labor cost / activity-based costing per crop
- Module initialization
- Receipt verification workflow

### Features ONLY in Financial Dashboard
- Net worth calculation and display
- Debt Destroyer with Avalanche/Snowball strategies
- Emergency fund tracking with progress bar
- Financial health score
- Equipment wishlist with smart purchase planning
- Change investing / round-ups concept
- Asset tracking with depreciation (MACRS)
- Payment plan creation
- Employee & retirement management
- Shopify Payments balance integration
- PayPal integration
- Alpaca investment trading connection
- Marketing budget/spend/analytics (overlaps with MCC)

### Features ONLY in Loan Readiness
- Document vault (premium UX with expandable categories)
- Lender management (Horizon, USDA-FSA, PA First Industries, Beginning Farmer, Custom)
- Web scraping of lender requirements
- Application tracker with status workflow
- Loan payment calculator
- Lender CRM / contacts
- Farm profile data entry
- Universal sales data parser (CSV, Excel, PDF; Shopify, QuickBooks, Square formats)
- Product categorization engine with correction rules
- AI parser chat assistant
- AI business plan generator
- AI marketing plan generator
- Grant web scraping and AI strategy generation
- Grant document management with vault integration
- Grant contacts CRM
- Revenue analytics with charts
- SWOT analysis generation

### Features ONLY in QuickBooks Dashboard
- QuickBooks OAuth connection flow
- QuickBooks credential setup wizard
- AR/AP aging charts (visual breakdown by days overdue)
- Keyboard shortcuts (R=refresh, P=print, A=accounting, H=home)
- Print-optimized CSS styles

### Features ONLY in Wealth Builder
- Seasonal cash flow timeline (Winter/Spring/Summer/Fall multipliers)
- Portfolio allocation chart (doughnut)
- Growth signal panel (offensive/defensive mode)
- Momentum asset tracking

---

## 6. Consolidation Recommendation

### Proposed Structure: 3 Pages Instead of 5

#### PAGE 1: "Financial Command Center" (Merge: Financial Dashboard + Wealth Builder + QuickBooks)

**Why merge these three:**
- Financial Dashboard already has 12 tabs and covers personal/business wealth
- Wealth Builder is a tiny (1,680 line) static page that duplicates investment tracking
- QuickBooks Dashboard (1,423 lines) is just a connection status + summary that could be a tab

**Proposed tabs for the merged page:**
1. **Overview** - Net worth, health score, priority actions (from Financial Dashboard)
2. **Banking** - Plaid accounts + QuickBooks accounts + transactions + receipt capture (merge Banking tabs)
3. **Debt & Bills** - Debt Destroyer + Bills + AR/AP aging from QuickBooks (merge Debt + QB invoice/bill data)
4. **Investments** - Alpaca + Plaid investments + allocation chart + seasonal timeline (merge Investments + Wealth Builder)
5. **Assets & Wishlist** - Farm assets + equipment wishlist + depreciation (keep from Financial Dashboard)
6. **Payment Plans** - Payment plan management (keep from Financial Dashboard)
7. **Team** - Employees & retirement (keep from Financial Dashboard)
8. **Marketing** - Marketing budget/spend (keep, or consider moving to MCC entirely)
9. **Documents** - Financial document management (keep from Financial Dashboard)
10. **Settings** - QuickBooks setup wizard + Plaid config + Alpaca config (merge all connection configs)

**What gets removed:**
- `wealth-builder.html` - Absorbed entirely into Investments tab
- `quickbooks-dashboard.html` - Absorbed into Banking tab (connection) and Debt & Bills tab (AR/AP aging)

**Lines saved:** ~3,100 (wealth-builder + quickbooks-dashboard)

---

#### PAGE 2: "Accounting Hub" (Keep, but REMOVE duplicate features)

**Why keep separate:**
- Accounting Hub has a distinct purpose: expense tracking, receipt management, tax reporting, accountant communication
- It is the "bookkeeper's workspace" vs the "owner's financial overview"

**Proposed tabs (trimmed from 10 to 7):**
1. **Dashboard** - Receipt stats, recent receipts, accountant analysis (keep)
2. **Action Items** - Accountant tasks from DGPerry (keep)
3. **Receipts** - Upload, categorize, verify receipts (keep)
4. **Accountant Docs** - Email import, document tracking (keep)
5. **Reports** - P&L, Schedule F generation (keep)
6. **Labor Costs** - Activity-based costing (keep - unique feature)
7. **Categories** - Schedule F expense categories (keep)

**What gets REMOVED from Accounting Hub:**
- **Banking tab** - REMOVE (duplicate of Financial Command Center)
- **Loan Readiness tab** - REMOVE (duplicate of Loan Command Center)
- **Grants tab** - REMOVE (inferior duplicate of Loan Readiness grants)

**Lines saved:** ~200 (HTML for removed tabs) + significant JS cleanup

---

#### PAGE 3: "Loan & Grant Command Center" (Keep loan-readiness.html, already comprehensive)

**Why keep separate:**
- This is by far the most feature-rich page (19,147 lines)
- It has a completely unique purpose: preparing loan applications and tracking grants
- The sales parser, business plan generator, and document vault are deeply integrated
- Its grant system is far superior to the basic one in Accounting Hub

**Proposed tabs (keep all 10):**
1. **Overview** - Financial metrics, lender readiness cards
2. **Document Vault** - Premium document upload and tracking
3. **Lenders** - Lender-specific checklists and requirements
4. **Applications** - Application status tracking
5. **Calculator** - Loan payment calculator
6. **Contacts** - Lender CRM
7. **Farm Profile** - Farm bio for applications
8. **Grants** - Full grant management with scraping and strategy
9. **Business Plan** - Sales parser + AI plan generation
10. **Analytics** - Revenue analytics and SWOT

**No changes needed** - this page is already well-organized and mostly unique.

---

### Summary of Consolidation

| Current | Proposed | Action |
|---------|----------|--------|
| `financial-dashboard.html` | **Financial Command Center** | Absorb wealth-builder and quickbooks-dashboard |
| `wealth-builder.html` | DELETED | Features moved to Financial Command Center > Investments tab |
| `quickbooks-dashboard.html` | DELETED | Connection moved to Settings, data merged into Banking + Debt tabs |
| `accounting.html` | **Accounting Hub** (trimmed) | Remove Banking, Loan Readiness, and Grants tabs |
| `loan-readiness.html` | **Loan & Grant Command Center** | Keep as-is |

**Result: 5 pages reduced to 3 pages, with zero feature loss.**

---

## 7. Risk Assessment

### What Breaks If We Merge

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Plaid integration in 2 places** | HIGH | Ensure merged Banking tab uses single Plaid init flow; test token exchange carefully |
| **Links from other pages** | MEDIUM | 13+ pages link to these financial pages (index.html, admin.html, farm-operations.html, MCC, etc.) - all need URL updates |
| **`apps_script/FinancialDashboard.html`** | LOW | Separate Apps Script page exists - may need parallel update |
| **localStorage for task completion** | LOW | Accounting Hub stores task completion in localStorage - will continue working |
| **auth-guard.js role mapping** | LOW | `auth-guard.js` maps `financial-dashboard.html` and `wealth-builder.html` to Admin role - needs update |
| **Financial Dashboard size** | MEDIUM | Already 8,147 lines; absorbing QB + WB adds ~3,100 more lines. Consider lazy-loading tabs |
| **Loan Readiness is massive** | LOW | At 19,147 lines, consider code-splitting or lazy-loading for the sales parser JS |
| **Marketing tab in Financial Dashboard** | LOW | This overlaps with the Marketing Command Center page - consider removing entirely |

### Pages That Link to Financial Pages

| Source Page | Links To |
|-------------|----------|
| `web_app/index.html` | wealth-builder, accounting, financial-dashboard, loan-readiness |
| `index.html` (root) | wealth-builder, financial-dashboard, accounting, quickbooks-dashboard |
| `farm-operations.html` | financial-dashboard |
| `web_app/admin.html` | financial-dashboard |
| `web_app/marketing-command-center.html` | financial-dashboard |
| `web_app/quickbooks-dashboard.html` | accounting |
| `web_app/financial-dashboard.html` | wealth-builder |
| `apps_script/FinancialDashboard.html` | wealth-builder |

---

## 8. Migration Action Plan

### Phase 1: Remove Wealth Builder (LOW RISK)
1. Copy seasonal timeline + portfolio allocation + growth signal into Financial Dashboard's Investments tab
2. Update all links from `wealth-builder.html` to `financial-dashboard.html#investments`
3. Delete `wealth-builder.html`
4. Update `auth-guard.js` role mapping

### Phase 2: Absorb QuickBooks Dashboard (MEDIUM RISK)
1. Add QuickBooks connection status to Financial Dashboard > Settings tab
2. Add QB setup wizard modal to Financial Dashboard
3. Merge AR/AP aging charts into Financial Dashboard > Debt & Bills tab
4. Add QB P&L data to the existing Financial Dashboard overview
5. Update all links from `quickbooks-dashboard.html` to `financial-dashboard.html`
6. Delete `quickbooks-dashboard.html`

### Phase 3: Trim Accounting Hub (LOW RISK)
1. Remove Banking tab (HTML + JS for Plaid in accounting.html)
2. Remove Loan Readiness tab (HTML + JS for loan package in accounting.html)
3. Remove Grants tab (HTML + JS for basic grant tracking in accounting.html)
4. Add cross-links: "For banking, visit Financial Command Center" etc.
5. Test remaining 7 tabs work correctly

### Phase 4: Clean Up
1. Remove dead CSS for deleted sections
2. Remove unused JS functions
3. Consolidate shared API helper functions into a shared JS file
4. Update SYSTEM_MANIFEST.md
5. Update CHANGE_LOG.md
6. Run link validation across all pages

---

## Appendix A: Line Count Breakdown

| Component | Accounting | Fin Dashboard | Loan Readiness | QuickBooks | Wealth Builder |
|-----------|:----------:|:-------------:|:--------------:|:----------:|:--------------:|
| CSS | ~650 | ~1,250 | ~1,000 | ~740 | ~500 |
| HTML | ~700 | ~2,100 | ~4,000 | ~180 | ~200 |
| JavaScript | ~1,350 | ~4,800 | ~14,150 | ~500 | ~980 |
| **Total** | **2,715** | **8,147** | **19,147** | **1,423** | **1,680** |

## Appendix B: Shared API Endpoints (Used by Multiple Pages)

| Endpoint | Used By |
|----------|---------|
| `createPlaidLinkToken` | Accounting, Financial Dashboard |
| `exchangePlaidPublicToken` | Accounting, Financial Dashboard |
| `getPlaidAccounts` | Accounting, Financial Dashboard |
| `getPlaidTransactions` | Accounting, Financial Dashboard |
| `refreshPlaidBalances` | Accounting, Financial Dashboard |
| `generateLoanPackage` | Accounting, Financial Dashboard, Loan Readiness |
| `getGrants` / grant management | Accounting (basic), Loan Readiness (advanced) |

---

## Appendix C: Decision Summary

**The core problem:** 5 separate pages with overlapping Plaid integrations, overlapping loan package generation, overlapping grant tracking, and overlapping bank account displays. Users must navigate to multiple pages to manage finances.

**The solution:** Consolidate to 3 pages with clear boundaries:
1. **Financial Command Center** = Owner's financial overview (net worth, banking, debt, investments, assets)
2. **Accounting Hub** = Bookkeeper's workspace (receipts, tax reports, accountant communication, labor costs)
3. **Loan & Grant Command Center** = Funding readiness (lenders, documents, applications, grants, business plans)

**Zero features lost. Two pages eliminated. Clear separation of concerns.**
