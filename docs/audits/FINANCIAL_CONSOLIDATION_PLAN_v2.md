# Financial Systems Consolidation Plan v2

**Date:** 2026-02-21
**Auditor:** Desktop_Claude (comprehensive line-by-line audit)
**Scope:** Complete code-level audit of all 5 financial HTML pages
**Target:** Consolidate from 5 pages to 3 pages
**Status:** RESEARCH ONLY - No HTML files modified

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Feature Inventory per File](#2-complete-feature-inventory-per-file)
3. [Complete API Endpoint Inventory](#3-complete-api-endpoint-inventory)
4. [External Integration Inventory](#4-external-integration-inventory)
5. [JavaScript Function Inventory](#5-javascript-function-inventory)
6. [Working vs Stub/Placeholder Assessment](#6-working-vs-stubplaceholder-assessment)
7. [CSS/UX Quality Assessment](#7-cssux-quality-assessment)
8. [Feature Disposition Matrix](#8-feature-disposition-matrix)
9. [Gap Analysis](#9-gap-analysis)
10. [Consolidation Architecture](#10-consolidation-architecture)
11. [Migration Risk Register](#11-migration-risk-register)

---

## 1. Executive Summary

### Current State: 5 Pages, 33,112 Lines

| File | Lines | Tabs | API Calls | Status |
|------|-------|------|-----------|--------|
| `accounting.html` | 2,715 | 10 | 27 | Production (backend connected) |
| `financial-dashboard.html` | 8,147 | 12 | ~30 | Hybrid (some backend, some localStorage) |
| `loan-readiness.html` | 19,147 | 10 | ~25 | Hybrid (backend + massive frontend logic) |
| `quickbooks-dashboard.html` | 1,423 | 1 | 4 | Production (QuickBooks connected) |
| `wealth-builder.html` | 1,680 | 1 | 0 | STATIC DEMO (no backend at all) |

### Target State: 3 Pages

| Target Page | Absorbs | Estimated Lines | Purpose |
|-------------|---------|-----------------|---------|
| **Accounting Hub** (`accounting.html`) | QuickBooks dashboard | ~3,500 | Bookkeeper workspace: receipts, banking, reports, accountant tools |
| **Financial Command Center** (`financial-dashboard.html`) | Wealth Builder | ~9,000 | Owner's financial HQ: net worth, debt, investments, bills, assets, marketing |
| **Loan & Grant Center** (`loan-readiness.html`) | (standalone) | ~19,000 | Loan readiness, grant tracking, business plan, analytics |

### Key Overlaps Found

| Feature | Present In | Action |
|---------|-----------|--------|
| Plaid bank connection | accounting.html, financial-dashboard.html | MERGE to financial-dashboard (owner scope) |
| Loan package generation | accounting.html, financial-dashboard.html, loan-readiness.html | MERGE to loan-readiness (most complete) |
| Grant tracking | accounting.html, loan-readiness.html | MERGE to loan-readiness (most complete) |
| Bank account display | accounting.html, financial-dashboard.html | KEEP both (different audiences) |
| Receipt upload/OCR | accounting.html, financial-dashboard.html | KEEP in accounting, DROP from financial |
| Transaction display | accounting.html, financial-dashboard.html | KEEP both (different views) |
| P&L generation | accounting.html, quickbooks-dashboard.html | MERGE - QB version is read-only display, accounting version generates |
| Document vault | financial-dashboard.html, loan-readiness.html | MERGE to loan-readiness (most complete) |

---

## 2. Complete Feature Inventory per File

### 2A. `accounting.html` (2,715 lines, 10 tabs)

**External Dependencies:** tiny-seed-design-system.css, auth-guard.js, api-config.js, Plaid SDK (cdn.plaid.com/link/v2/stable/link-initialize.js), Font Awesome 6.4, Inter font

#### Tab: Dashboard
- 4 stat cards: Total Receipts, YTD Expenses, Unverified, Pending Docs
- Recent Receipts table (5 rows, loaded from API)
- Accountant email analysis summary

#### Tab: Action Items
- 5 hardcoded DGPerry accountant action items with localStorage completion tracking
- Critical/High/Completed/Total task stat counters
- All tasks table (57 tasks) with priority/status filter
- Checkbox toggle with restoreCheckboxStates() persistence

#### Tab: Banking (Plaid)
- Connect Bank Account button (Plaid Link SDK flow)
- Connected bank accounts table (institution, name, type, balance, last synced)
- Recent transactions table (30-day window)
- Refresh balances per account
- Disconnect bank button

#### Tab: Receipts
- Drag-drop file upload zone (JPG, PNG, PDF)
- Receipt table with filters (category, verified status, vendor search)
- Add Receipt modal (date, amount, vendor, category, tax deductible checkbox, payment method, card type, enterprise, organic, notes)
- OCR receipt processing via uploadReceiptImage API
- Verify receipt button

#### Tab: Accountant Docs
- DGPerry documents table
- Import Emails button (importAccountantEmails)
- Email history table (analyzeAccountantEmailPatterns)

#### Tab: Reports
- P&L Statement generator with date range inputs
- Schedule F Report generator with tax year selector
- Report output area with print/export buttons
- renderReport() formats and displays generated data

#### Tab: Loan Readiness (OVERLAPS loan-readiness.html)
- Loan type selector (FSA Direct Operating, FSA Direct Farm Ownership, Farm Credit Standard, Farm Credit Microloan, USDA Beginning Farmer)
- Each loan type has hardcoded document checklist with requirements
- Farm info summary (pre-filled)
- Generate Loan Package button
- Package output: Balance Sheet, P&L, Cash Flow, Schedule F, farm info, document checklist

#### Tab: Labor Costs
- 4 stats: total hours, total cost, avg $/hour, crops tracked
- Labor cost by crop table (batch, crop, variety, hours, direct/indirect/total cost, efficiency)
- Recent time entries table
- Reset stats button

#### Tab: Grants (OVERLAPS loan-readiness.html)
- Grants table with add/edit/delete
- Add Grant modal (name, source, amount, deadline, status, notes)
- Grant statuses: Applied, Received, Pending, Denied

#### Tab: Categories
- Expense categories table loaded from API
- Category management (display only, no add/edit in UI)

---

### 2B. `financial-dashboard.html` (8,147 lines, 12 tabs)

**External Dependencies:** tiny-seed-design-system.css, auth-guard.js, api-config.js, Chart.js 4.x, Plaid SDK, Font Awesome 6.4, Inter font

#### Tab: Overview
- Net Worth display (calculated from all sources)
- 4 stat cards: Emergency Fund (with months covered + progress bar), Investment Portfolio, Total Debt, Round-Up Savings
- Priority Actions section (RecommendationsEngine generates prescriptive recommendations)
- Financial Health Score (radar chart via Chart.js) with 5 axes: Emergency Fund, Debt-to-Income, Savings Rate, Investment Growth, Cash Flow
- Financial Health Score algorithm (weighted scoring: emergency fund +/-15, credit utilization +/-15, net worth +/-10, cash flow +/-10)

#### Tab: Debt Destroyer
- Stats: Total Debt, Monthly Minimum, Credit Utilization %, Accounts Tracked
- Avalanche/Snowball strategy selector with recalculatePayoff()
- Debt table (auto-populated from Plaid credit accounts)
- Shopify Capital loan auto-added with progress bar
- DebtPayoffCalculator class (avalanche and snowball algorithms with timeline projection)
- Add Debt modal (manual entry)
- Payoff timeline projection

#### Tab: Banking & Bills
- Stats: Total Cash, Monthly Expenses, Income, Cash Flow
- Plaid Bank Connection (same SDK flow as accounting.html)
- Bank statement upload (CSV import)
- Manual Account Add modal
- Upcoming Bills table (BillOCR manager with localStorage + API sync)
- Scan Bill button -> Upload Bill modal with OCR processing (handleBillImageUpload)
- Camera capture for bills (openCameraCapture)
- Quick Receipt Capture (camera + file upload, handleReceiptUpload)
- Recent Transactions table (from Plaid, analyzeTransactions for income/expense breakdown)
- Refresh Balances button
- Shopify Payments pending balance display
- PayPal Business balance display

#### Tab: Investments
- Alpaca API connection setup modal (API key, secret, account type, monthly amount, round-up threshold, strategy, seasonal)
- Plaid Investment account connection
- 75/25 Safe/Growth strategy display
- Portfolio allocation doughnut chart (Chart.js, hardcoded 10-holding data)
- Holdings list with ticker, percentage
- Dual Momentum signal display
- Link to wealth-builder.html for algorithm details
- Plaid investment holdings display with gain/loss per holding

#### Tab: Change Investing (Round-Ups)
- Round-up savings concept display
- Settings: round-up amount, threshold, destination account
- Monthly/weekly/daily contribution options
- *Mostly UI mockup - limited backend*

#### Tab: Wishlist
- WishlistManager object (localStorage + API sync)
- Smart Affordability Algorithm (5-factor weighted scoring):
  - Cash Available (30% weight)
  - Emergency Fund Protection (25% weight)
  - Debt Situation (20% weight)
  - Cash Flow Health (15% weight)
  - Priority (10% weight)
- Status classification: Safe to Buy / Wait - Almost Ready / Not Yet
- Smart recommendations engine with contextual advice
- Financing analysis for items > $5K
- Add Wishlist Item modal (name, category, cost, priority, method, notes, target date)
- Wishlist cards with affordability score, cash-after-purchase, months-to-save

#### Tab: Assets
- AssetManager object (localStorage + API sync)
- MACRS depreciation calculator (5-year, 7-year rates)
- Straight-line 10-year depreciation
- Asset schedule generator by category
- Balance sheet generator
- Loan package export from Assets tab
- Add Asset modal (name, category, purchase price, purchase date, current value, condition, serial number, location, depreciation method)
- Farm assets table
- Balance sheet summary (Assets - Liabilities = Equity)

#### Tab: Payment Plans
- PaymentPlanManager (localStorage + API sync)
- Customer payment plan creation with installment calculator
- Interest calculation (simple interest)
- Down payment percentage options
- Payment schedule generation
- Overdue payment tracking
- Record payment function
- Two different payment plan modals (paymentPlanModal and addPaymentPlanModal - DUPLICATE)

#### Tab: Team & Retirement
- SEP-IRA contribution display
- Team members list
- Incentive pool tracking
- Achievement milestones grid
- *Mostly hardcoded UI - limited backend*

#### Tab: Settings
- Google Sheets ID configuration
- Apps Script URL configuration
- Notification preferences
- Financial settings (categories, defaults)
- Import/Export data
- *Basic configuration UI*

#### Tab: Marketing
- Budget/Spent/ROI/Posts stat cards
- Spend by category breakdown (Social Ads, Subscription, Print, Photography)
- Recent marketing spend history
- Marketing fund allocation with auto-percentage from revenue
- Quick Actions
- Add Marketing Spend modal
- Allocate Marketing Funds modal
- loadMarketingData() fetches: getMarketingBudget, getMarketingSpend, getMarketingAnalytics

#### Tab: Documents
- DocumentVault object with 4 hardcoded business documents:
  - PA Subsistence Certificate (2026-01-30)
  - EIN Confirmation Letter CP 575 (2017)
  - USDA Organic Certificate OEFFA #3839 (2025)
  - Articles of Organization (2017-02-07)
- Document categories: legal, tax, banking, insurance/compliance
- Category filter with counts
- Open/Download document functions (from business_docs/founding/)
- *Very basic compared to loan-readiness Document Vault*

#### Unified Financial State Manager (FinancialState)
- Central state object that all tabs read/write
- Sources: plaidAccounts, plaidTransactions, shopifyPayments, shopifyCapital, paypalBalance, paypalTransactions
- Calculated totals: assets, debt, netWorth, cash, investments, emergencyFund, creditLimit, creditUsed, monthlyIncome, monthlyExpenses
- recalculateTotals() processes all sources
- refreshAllUI() updates every tab's display
- calculateHealthScore() weighted algorithm

#### Prescriptive Recommendations Engine
- Emergency Fund recommendations (danger/warning based on months covered)
- Debt Attack recommendations (extra payment, 15/3 Rule timing)
- Cash Flow recommendations (invest surplus or negative alert)
- Wishlist Safe Purchase suggestions
- Credit Utilization warnings
- Seasonal Farm Advice (winter planning, spring investment)

---

### 2C. `loan-readiness.html` (19,147 lines, 10 tabs)

**External Dependencies:** tiny-seed-design-system.css, auth-guard.js, api-config.js, SheetJS (xlsx.full.min.js), Chart.js, correction-modal.css, lender-crm.css, Font Awesome 6.4, Inter font

#### Tab: Overview
- 6 Financial Health metric cards: Net Worth, Debt-to-Asset Ratio, Debt Service Coverage Ratio, Current Ratio, Working Capital, Total Cash Available
- Lender Readiness at a Glance (4 built-in lenders + custom lenders)
- Quick Actions: Upload Document, Generate Complete Package, Start New Application

#### Tab: Document Vault (MOST COMPLETE version)
- Document Readiness Score card with breakdown (critical/high/medium/low)
- 16 document types organized by priority:
  - Critical: Personal Financial Statement, 3 years Tax Returns, Current Year P&L, Balance Sheet, Bank Statements
  - High: Business Plan, Organic Certificate, Farm Business Records, Entity Documents
  - Medium: Equipment List, Land Lease, Environmental Plan, Market Contracts
  - Low: Photos, References, Insurance
- Each document has: upload/replace, mark as "have", remove, expandable info section
- Priority badges (critical/high/medium/low)
- Lender tooltip showing what each lender looks for
- Upload modal with file upload + base64 encoding
- Excel file preview and parsing (SheetJS)
- Document sync with backend (getLoanDocuments API)
- Cross-references with lender requirements

#### Tab: Lender Checklists
- 4 built-in lenders: Horizon Farm Credit, USDA-FSA, PA First Industries, Beginning Farmer
- Custom lender support (add, edit, delete)
- Lender requirement scraping via AI (scrapeLenderRequirements API)
- Per-lender document checklist with completion tracking
- Lender readiness percentage calculator
- Single lender detailed view
- URL-based requirement scraping for custom lenders

#### Tab: Applications
- Application tracker table (lender, type, amount, status, deadline, last updated)
- New Application modal with lender dropdown
- Application statuses: Not Started, In Progress, Submitted, Approved, Denied
- Generate Package per lender (generateLenderLoanPackage API)
- Lender readiness check (getLenderReadiness API)

#### Tab: Calculator
- Debt consolidation calculator
- Inputs: Total debt, Current APR, Farm Credit APR, Loan term
- Outputs: Current/New monthly payment, Monthly savings, Total interest current/new, Total interest savings

#### Tab: Contacts (Lender CRM)
- Full CRM system with search, filters (All/Partners/Active/Warm/Cold)
- CRM stats: Total Lenders, Active Relationships, Pending Follow-ups, Avg Relationship Score
- Lender Profile modal with 5 sub-tabs:
  - Overview: Basic info, relationship status, referral source, best time, personality notes
  - Interactions: Log calls, emails, meetings, notes with timestamps
  - Loans: Track loan products and status
  - Preferences: Communication preferences
  - Strategy: Relationship strategy notes
- Relationship scoring algorithm (recency, interactions, response, history)
- Photo upload for lender contacts
- Legacy contact cards for Horizon, USDA FSA, PA Next Generation

#### Tab: Farm Profile
- Comprehensive farm profile form in modal:
  - Basic Info: Farm name, owners, location, founded year, acres, certifications
  - Farm Story: Mission statement, history, what makes us unique, community impact
  - Capabilities: Crops grown, markets served, staff size, equipment, infrastructure
  - Financial Highlights: Revenue range, growth trend, key metrics
  - Key Achievements: Year + description, add/remove
- Profile data used for grant applications and business plan generation
- Pull from Profile buttons in grant bio

#### Tab: Grants (MOST COMPLETE version)
- Grant cards with colored headers by category (federal/state/foundation/local)
- Per-grant: amount, deadline, status, checklist, progress bar, notes
- Edit Grant modal with 9 sub-tabs:
  - Details: Name, source, category, institution, amount, deadline, status, link, focus areas, eligibility, standard/custom required documents, application steps
  - Grant Bio: Per-grant customized messaging (why good fit, relevant experience, mission alignment, outcomes, talking points) with "Pull from Profile" buttons
  - Documents: Required documents with vault integration, auto-check from vault, shared document badges
  - Uploads: File upload with drag-drop (PDF, Excel, Word, images), Google Drive folder link, application strength indicator
  - Videos: YouTube/video links with type classification (farm tour, product demo, testimonial, etc.)
  - Links: Quick links with type (program website, application portal, FAQ, etc.), refresh from website feature
  - Contacts: Program contacts with interaction history, communication best practices
  - AI Strategy: AI-generated application strategy via generateGrantStrategy API
  - Archive: (hidden tab for archived grants)
- Grant website scraping (scrapeGrantRequirements API) for auto-populating requirements
- Grant discovery links by category (federal, state, foundation, local)
- Add/Edit/Delete grants with full CRUD
- Application strength calculator

#### Tab: AI Plan Generator
- **Universal Sales Data Parser** (massive feature):
  - Drag-drop upload zone for any sales file (CSV, Excel, PDF)
  - Multi-file support with file cards showing processing status
  - Real-time processing indicator with 5 steps
  - Format detection: Shopify Sales by Product, Shopify Orders, Shopify POS, QuickBooks Sales, QuickBooks P&L, Square, Generic CSV
  - SheetJS Excel parsing with sheet selection and preview
  - Smart categorization engine with 10+ categories: CSA (Summer/Spring/Fall/Thanksgiving), Flower Subscriptions (Standard/Full Bloom/Petite/Dahlia), Partner Add-ons (Mushrooms/Bread/Cheese/Coffee), Flower Sales, Farm Events, Farmers Markets (by location), Wholesale, Direct Sales
  - AI categorization with confidence scoring
  - Correction modal for reclassifying products
  - Custom parser rules (keyword, regex, source-file based) with save/load/export/import
  - Year filter with multi-year comparison
  - Revenue trend chart (Chart.js bar chart) with insights
  - Bulk operations: recategorize, adjust amounts, exclude products
  - AI Parser Chat assistant for natural language queries about sales data
  - Product refinement panel with inline editing
  - Save/Load sales data to backend (saveFarmSalesData / getFarmSalesData)

- **AI Business Plan Generator**:
  - Pulls sales data from parser
  - Sends to generateFarmBusinessPlan API endpoint
  - Formatted output with copy/download
  - formatPlanContent() renders markdown-like sections

- **AI Marketing Plan Generator**:
  - Pulls sales data from parser
  - Sends to generateFarmMarketingPlan API endpoint
  - Formatted output with copy/download

#### Tab: Farm Analytics
- Revenue analytics KPIs with year-over-year comparison
- Category-level breakdown table (CSA, Flowers, Market, Wholesale, Partner)
- Revenue goals with progress tracking
- SWOT analysis (auto-generated or manual)
- Revenue chart (Chart.js bar/line, switchable views)
- Customer metrics chart
- Category breakdown chart (stacked bar)
- Export data functionality
- Edit analytics data modal
- Edit goals modal
- Add improvement plan
- AI-powered SWOT regeneration
- Pull Data feature (pulls from parsed sales data, financial dashboard, etc.)
- Full analytics report generation

---

### 2D. `quickbooks-dashboard.html` (1,423 lines, 1 page)

**External Dependencies:** tiny-seed-design-system.css, auth-guard.js, api-config.js, Font Awesome 6.4, Inter font

#### Features (single page, no tabs)
- QuickBooks connection status banner (connected/not connected)
- Connect to QuickBooks button (OAuth flow via getQuickBooksAuthUrl)
- Setup Wizard modal (Company ID, Client ID, Client Secret)
- 5 summary cards: Cash on Hand, Credit Card Balance, Accounts Receivable, Accounts Payable, Net Cash Position
- Account Balances list (renderAccounts from QB data)
- Profit & Loss YTD display (renderProfitLoss)
- AR Aging chart (visual segment bar: Current, 1-30, 31-60, 61-90, 90+)
- AP Aging chart (same segment bar format)
- Open Invoices table
- Open Bills table
- Keyboard shortcuts: R (refresh), P (print), A (go to accounting), H (home), ? (help)
- Print-optimized CSS with @media print

---

### 2E. `wealth-builder.html` (1,680 lines, 1 page with 5 spec sub-tabs)

**External Dependencies:** tiny-seed-design-system.css, auth-guard.js, api-config.js, investment_algorithm.js, Chart.js, Font Awesome 6.4, Inter font

#### Features (100% STATIC/DEMO - NO API CALLS)
- Header with "OFFENSIVE" risk status badge
- 4 stat cards (ALL HARDCODED):
  - Portfolio Value: $47,250
  - Monthly Contribution: $1,500
  - Growth Mode: OFFENSIVE
  - Emergency Reserve: 8.2 months
- Allocation Chart (Chart.js doughnut, 10 holdings: VTI 15%, VXUS 7.5%, BND 15%, TIP 11.25%, GOVT 7.5%, GLD 5.625%, DBC 3.75%, SHY 7.5%, QQQ 12.5%, MTUM 12.5%)
- Growth Signal Panel (hardcoded: "OFFENSIVE" mode, QQQ/MTUM momentum, VTI signal)
- Recommended Trades table (4 hardcoded BUY trades)
- Risk Gauge with animated needle (updateRiskNeedle function)
- Seasonal Contribution Calendar (Winter 0.25x, Planting 0.75x, Growing 1.0x, Harvest 1.5x)
- Action Items list (hardcoded)
- Algorithm Specification section with 5 sub-tabs:
  - Overview: 75/25 Safe-to-Growth split explanation
  - Safe Strategy: All-Weather portfolio details
  - Growth Strategy: Dual Momentum logic
  - Pseudocode: Complete algorithm in pseudocode
  - Signal Formulas: Mathematical signal calculation formulas
- Mobile-first CSS with touch targets, safe-area-insets
- Print styles

---

## 3. Complete API Endpoint Inventory

### 3A. accounting.html API Calls (27 endpoints)

| Action Parameter | HTTP Method | Purpose |
|-----------------|-------------|---------|
| `getExpenseCategories` | GET | Load expense categories |
| `getReceipts` | GET | Load all receipts |
| `getAccountantDocs` | GET | Load accountant documents |
| `getAccountantEmails` | GET | Load accountant emails |
| `getGrants` | GET | Load grants |
| `getLaborByCrop` | GET | Load labor cost by crop |
| `getTimelog` | GET | Load recent time entries |
| `getPlaidItems` | GET | List Plaid connections |
| `getPlaidAccounts` | GET | Get bank account data |
| `createPlaidLinkToken` | GET | Start Plaid Link flow |
| `exchangePlaidPublicToken` | GET | Exchange Plaid token |
| `getPlaidTransactions` | GET | Get 30-day transactions |
| `refreshPlaidBalances` | GET | Force balance refresh |
| `disconnectPlaidItem` | GET | Remove Plaid connection |
| `uploadReceiptImage` | POST | Upload receipt image for OCR |
| `saveReceipt` | POST | Save receipt record |
| `verifyReceipt` | POST | Mark receipt as verified |
| `saveGrant` | POST | Save grant record |
| `importAccountantEmails` | POST | Import emails from accountant |
| `analyzeAccountantEmailPatterns` | POST | AI email analysis |
| `generateProfitLossStatement` | POST | Generate P&L report |
| `generateScheduleFReport` | POST | Generate Schedule F |
| `initializeAccountingModule` | POST | Initialize module setup |
| `getAccountantTasks` | GET | Load accountant tasks |
| `updateAccountantTask` | POST | Update task status |
| `generateLoanPackage` | GET | Generate loan package |

### 3B. financial-dashboard.html API Calls (~30 endpoints)

| Action Parameter | HTTP Method | Purpose |
|-----------------|-------------|---------|
| `createPlaidLinkToken` | GET | Start Plaid Link flow |
| `exchangePlaidPublicToken` | GET | Exchange Plaid token |
| `getPlaidAccounts` | GET | Get bank account data |
| `getPlaidTransactions` | GET | Get 30-day transactions |
| `refreshPlaidBalances` | GET | Force balance refresh |
| `getPlaidInvestmentHoldings` | GET | Get investment holdings |
| `getWishlist` | GET | Load wishlist items |
| `saveWishlist` | POST | Save wishlist |
| `getAssets` | GET | Load farm assets |
| `saveAssets` | POST | Save assets |
| `getBills` | GET | Load bills |
| `saveBills` | POST | Save bills |
| `getAlpacaConfig` | GET | Load Alpaca settings |
| `saveAlpacaConfig` | POST | Save Alpaca settings |
| `getPaymentPlans` | GET | Load payment plans |
| `savePaymentPlans` | POST | Save payment plans |
| `getMarketingBudget` | GET | Load marketing budget |
| `getMarketingSpend` | GET | Load marketing spend |
| `getMarketingAnalytics` | GET | Load marketing analytics |
| `logMarketingSpend` | POST | Record marketing expense |
| `logMarketingActivity` | POST | Log marketing activity |
| `getShopifyPaymentsBalance` | GET | Shopify pending payouts |
| `getShopifyCapitalLoan` | GET | Shopify Capital loan status |
| `getPayPalFinancialSummary` | GET | PayPal balance + transactions |
| `generateLoanPackage` | GET | Generate loan package |
| `saveLoanPackageToHTML` | GET | Save loan package to Drive |

### 3C. loan-readiness.html API Calls (~25 endpoints)

| Action Parameter | HTTP Method | Purpose |
|-----------------|-------------|---------|
| `getLoanFinancialSummary` | GET | Financial metrics for overview |
| `getDebts` | GET | Load debt data |
| `getBankAccounts` | GET | Load bank accounts |
| `getLoanDocuments` | GET | Load uploaded documents |
| `getLoanApplications` | GET | Load applications |
| `uploadLoanDocument` | POST | Upload document to vault |
| `saveLoanApplication` | POST | Save application |
| `generateLenderLoanPackage` | GET | Generate lender-specific package |
| `getLenderReadiness` | GET | Check readiness score |
| `scrapeLenderRequirements` | POST | AI scrape lender website |
| `saveCustomLenders` | POST | Save custom lenders |
| `getParserCorrectionRules` | GET | Load parser rules |
| `saveParserCorrectionRule` | POST | Save correction rule |
| `deleteParserCorrectionRule` | POST | Delete correction rule |
| `saveFarmSalesData` | POST | Save parsed sales data |
| `getFarmSalesData` | GET | Load saved sales data |
| `generateFarmBusinessPlan` | POST | AI business plan generation |
| `generateFarmMarketingPlan` | POST | AI marketing plan generation |
| `scrapeGrantRequirements` | POST | AI scrape grant website |
| `generateGrantStrategy` | POST | AI grant application strategy |
| `parseUniversalDocument` | POST | AI document parsing |
| `parserAssistant` | POST | AI parser chat assistant |

### 3D. quickbooks-dashboard.html API Calls (4 endpoints)

| Action Parameter | HTTP Method | Purpose |
|-----------------|-------------|---------|
| `getQuickBooksConnectionStatus` | GET | Check QB connection |
| `getQuickBooksAuthUrl` | GET | Get OAuth URL |
| `getQuickBooksDashboard` | GET | Load all QB data |
| `saveQuickBooksCredentials` | POST | Save QB API credentials |

### 3E. wealth-builder.html API Calls (0 endpoints)

**Zero API calls. Entire page is hardcoded static demo data.**

---

## 4. External Integration Inventory

| Integration | Used In | Status | Notes |
|-------------|---------|--------|-------|
| **Plaid (Banking)** | accounting.html, financial-dashboard.html | Working | Duplicate implementation; financial-dashboard is more complete (includes investments) |
| **Plaid (Investments)** | financial-dashboard.html | Working | connectInvestmentsWithPlaid(), displayPlaidInvestments() |
| **QuickBooks OAuth** | quickbooks-dashboard.html | Working | OAuth flow via getQuickBooksAuthUrl |
| **Alpaca (Trading)** | financial-dashboard.html | Stub | Config saved but no actual trade execution; calculateAllocation() and calculateMomentumSignal() return defaults |
| **Shopify Payments** | financial-dashboard.html | Working | getShopifyPaymentsBalance, getShopifyCapitalLoan |
| **PayPal Business** | financial-dashboard.html | Working | getPayPalFinancialSummary for balance + transactions |
| **Chart.js** | financial-dashboard.html, wealth-builder.html, loan-readiness.html | Working | Radar, doughnut, bar, line charts |
| **SheetJS (XLSX)** | loan-readiness.html | Working | Excel file parsing for sales data import |
| **AI/Claude** | loan-readiness.html | Working | Business plan, marketing plan, grant strategy, parser assistant, lender/grant web scraping |
| **Google Drive** | financial-dashboard.html, loan-readiness.html | Partial | saveLoanPackageToHTML; grant Drive folder links |

---

## 5. JavaScript Function Inventory

### 5A. accounting.html Functions (48 functions)

**Navigation:** switchTab(tabId)
**API Helper:** apiCall(action, params, method)
**Data Loading:** loadCategories(), loadReceipts(), loadDashboard(), loadAccountantDocs(), loadGrants(), loadLaborByCrop(), loadRecentTimelog(), loadBankAccounts(), loadTransactions(), loadAccountantTasks(), loadTaskBadge()
**Rendering:** populateCategoryDropdowns(), renderReceiptsTable(), renderRecentReceipts(), renderCategoriesTable(), renderAccountantDocsTable(), renderEmailsTable(), renderGrantsTable(), renderBankAccountsTable(), renderLaborByCropTable(), renderTimelogTable(), renderReport(), renderAllTasksTable(), renderLoanChecklist(), renderLoanPackage()
**Banking (Plaid):** connectBank(), refreshTransactions(), refreshBalances(), disconnectBank()
**Modals:** openAddReceiptModal(), openAddGrantModal(), closeModal()
**CRUD:** saveReceipt(), verifyReceipt(), saveGrant(), importEmails(), analyzeEmails()
**Reports:** generatePL(), generateScheduleF(), printReport()
**Loan:** selectLoanType(), generateLoanPackage()
**Tasks:** updateTaskStats(), filterTasks(), updateTaskStatus(), toggleTask(), restoreCheckboxStates()
**Labor:** updateLaborStats(), resetLaborStats()
**Utility:** filterReceipts(), formatDate(), showAlert(), initializeModule()

### 5B. financial-dashboard.html Functions (~85 functions)

**Navigation:** showTab(tabId)
**State Management:** FinancialState (object with update, recalculateTotals, refreshAllUI, calculateHealthScore, formatCurrency, updateElement)
**API Helpers:** fetchFromSheet(endpoint, params), saveToSheet(endpoint, data)
**Plaid Banking:** connectBankWithPlaid(), handlePlaidSuccess(), loadConnectedAccounts(), displayPlaidAccounts(), updateFinancialTotals(), showNoAccountsMessage(), refreshPlaidBalances()
**Plaid Investments:** connectInvestmentsWithPlaid(), handlePlaidInvestmentSuccess(), loadPlaidInvestments(), refreshPlaidInvestments(), displayPlaidInvestments()
**Transactions:** loadTransactionsAndAnalyze(), analyzeTransactions(), refreshTransactions(), displayTransactionsTable()
**Debt Destroyer:** selectStrategy(), recalculatePayoff(), saveDebt(), editDebt(), updateDebtDestroyer(), showNoDebtMessage(), DebtPayoffCalculator class (avalanche, snowball, calculatePayoff)
**Banking:** saveAccount(), saveBill(), handleBankUpload()
**Bills/OCR:** BillOCR object (load, save, add, displayBills, markPaid, extractFromImage, parseExtractedText), handleBillImageUpload(), resetBillUpload(), saveExtractedBill(), handleReceiptUpload(), openCameraCapture(), openReceiptCapture()
**Wishlist:** WishlistManager object (load, save, add, remove, markPurchased, analyzeAffordability, getRecommendation, analyzeFinancing, analyzeAndDisplay, updateSummary, renderItem), saveWishlistItem()
**Assets:** AssetManager object (load, save, add, calculateDepreciation, calculateMACRS, generateAssetSchedule, generateBalanceSheet), saveAsset()
**Recommendations:** RecommendationsEngine object (generate, display), refreshRecommendations()
**Alpaca:** AlpacaManager object (load, save, updateUI, calculateAllocation, calculateMomentumSignal), connectAlpaca()
**Payment Plans:** PaymentPlanManager object (load, save, add, generatePaymentSchedule, getOverduePayments, recordPayment), createPaymentPlan(), updatePaymentPreview(), savePaymentPlan()
**Marketing:** loadMarketingData(), updateMarketingBudgetDisplay(), updateMarketingSpendDisplay(), updateMarketingAnalyticsDisplay(), getCategoryIcon(), getCategoryColor(), formatDate(), saveMarketingSpend(), allocateMarketingFunds()
**Shopify:** loadShopifyFinancialData(), updateShopifyPendingBalance(), addShopifyCapitalLoan(), addShopifyCapitalToDebt(), displayShopifyPayouts()
**PayPal:** loadPayPalData(), displayPayPalBalance(), displayPayPalTransactions()
**Loan Package:** generateAndDownloadLoanPackage(), saveLoanPackageToDrive(), generateLoanPackage(), generateAssetReport(), generateBalanceSheetHTML(), printLoanPackage()
**Documents:** DocumentVault object (getByCategory, getCounts), openDocument(), downloadDocument(), filterDocuments(), updateDocumentCounts()
**Modal/UI:** openModal(), closeModal(), syncData(), showNotification()
**Charts:** healthChart (radar), allocationPieChart (doughnut), holdings list population

### 5C. loan-readiness.html Functions (~200+ functions)

**Core:** loadAllData(), setupTabs(), renderAll()
**Financial:** loadFinancials(), loadFinancialsFromExisting(), renderFinancialMetrics()
**Documents:** loadDocuments(), renderVault(), calculateDocumentReadinessScore(), getAllDocsSortedByPriority(), toggleDocInfo(), openUploadModal(), uploadDocument(), uploadSpecificDoc(), markDocumentAsHave(), removeDocument(), syncDocuments(), updateDocCountBadge(), isDocumentUploaded(), handleVaultFileSelection(), parseVaultExcelFile(), selectExcelSheet(), renderExcelPreview(), fileToBase64()
**Lenders:** loadCustomLenders(), saveCustomLenders(), getAllLenders(), selectLender(), renderSingleLenderView(), renderLenderSelector(), renderLenderChecklists(), calculateLenderReadiness(), toggleLenderRequirement(), openAddLenderModal(), saveCustomLender(), deleteCustomLender(), editCustomLender(), saveCustomLenderEdit(), scrapeLenderRequirements(), getAffectedLenderIds(), highlightAffectedLenders()
**Applications:** loadApplications(), renderApplications(), startNewApplication(), populateAppLenderDropdown(), createApplication(), editApplication(), generatePackage()
**Calculator:** calculateSavings()
**Sales Parser:** initSalesDataParser(), handleSalesFileDrop(), handleSalesDragOver(), handleSalesDragLeave(), handleSalesFileSelect(), handleFileUpload(), parseFile(), detectFileFormat(), parseCSVFile(), parseExcelFile(), detectAndParseExcelFormat(), parseQuickBooksCustomerSummary(), parseQuickBooksProductSummary(), parseGenericProductSales(), parseGenericTwoColumn(), parsePDFFile(), parseCSVLine(), categorizeSalesData(), categorizeProducts(), applyRulesToProduct(), matchesRule(), calculateRuleConfidence(), calculateAIConfidence(), generateCategoryExplanation(), displayParsedData(), displayProductsList(), displayMarketsBreakdown(), displayWholesaleBreakdown(), updateYearFilterOptions(), displayYearBreakdownSummary(), filterByYear(), displayYearData(), setInputValue(), updateCategoryTotal(), toggleSalesCategory(), showManualEntry(), addMarketRow(), resetSalesDisplay(), mergeAllYears(), mergeResults(), mergeAllParsedData(), showProcessingIndicator(), updateProcessingStep(), updateParsingStats(), saveSalesData(), loadSalesData(), applyLoadedSalesData(), updateLastUpdatedIndicator(), showImportSuccess(), addFileCard(), updateFileCard(), deleteUploadedFile(), clearAllUploadedFiles(), clearAllSalesData(), calculateTotalRevenue(), getSalesDataForPlan()
**Parser Rules:** loadParserRules(), saveParserRule(), deleteParserRule(), openRulesModal(), renderRulesList(), toggleRuleActive(), deleteRuleConfirm(), exportRules(), importRules()
**Correction Modal:** openCorrectionModal(), closeCorrectionModal(), selectCategory(), generateAIReasoning(), generateCategorySuggestions(), toggleRuleOptions(), updateRulePreview(), extractKeywords(), submitCorrection(), makeProductClickable(), testCorrectionModal()
**Refinement Panel:** populateRefinementPanel(), extractYear(), updateRefinementYearFilter(), filterParsedProducts(), renderRefinementTable(), getCategoryIcon(), updateRefinementSummary(), sortRefinementTable(), toggleProductSelection(), toggleSelectAllProducts(), updateBulkActionsBar(), clearBulkSelection(), updateProductAmount(), toggleExcludeProduct(), showBulkEditOptions(), bulkRecategorize(), bulkAdjustAmount(), bulkExclude()
**Parser Chat:** toggleParserChat(), sendParserMessage(), addChatMessage(), showTypingIndicator(), hideTypingIndicator(), askParserAI(), gatherParserContext(), processParserQuestionLocally(), detectProductPatterns(), getCategoryDisplayName(), applyParserSuggestion(), openBulkContextModal(), showRecategorizationSuggestions()
**Revenue Chart:** showRevenueTrendChart(), toggleChartType(), exportRevenueChart(), generateRevenueInsights()
**AI Plans:** generateBusinessPlan(), generateMarketingPlan(), formatPlanContent(), copyBusinessPlan(), copyMarketingPlan(), downloadBusinessPlan(), downloadMarketingPlan()
**Grants:** loadGrants(), saveGrants(), renderGrants(), renderGrantCard(), calculateGrantStrengthForCard(), quickRefreshGrant(), toggleGrantChecklistItem(), updateGrantMetrics(), filterGrants(), showImportGrantsInfo(), resetGrantsToDefault(), openAddGrantModal(), closeAddGrantModal(), saveNewGrant(), editGrant(), closeEditGrantModal(), saveEditedGrant(), deleteGrant(), openGrantDatabase(), scanGrantWebsite(), rescanGrantWebsite(), switchEditGrantTab(), renderGrantDocuments(), goToVaultForDoc(), addGrantDocRequirement(), renderGrantContacts(), addGrantContact(), editGrantContactItem(), closeGrantContactModal(), saveGrantContact(), deleteGrantContact(), addGrantInteraction(), renderGrantStrategy(), renderStrategyContent(), generateGrantStrategy(), autoCheckVaultDocuments(), updateAllGrantsWithDocument(), setupGrantUploadZone(), handleGrantFileUpload(), getFileType(), renderGrantUploadedDocs(), viewGrantDocument(), editDocDescription(), deleteGrantDocument(), saveGrantDriveLink(), toggleAddVideoForm(), saveGrantVideo(), getVideoThumbnail(), renderGrantVideos(), deleteGrantVideo(), toggleAddLinkForm(), saveGrantLink(), renderGrantQuickLinks(), deleteGrantLink(), refreshGrantFromWebsite(), applyGrantChanges(), calculateApplicationStrength(), loadGrantBio(), saveGrantBioData()
**Analytics:** loadAnalyticsData(), saveAnalyticsDataToStorage(), initializeAnalytics(), renderAnalyticsKPIs(), renderCategoryTable(), renderGoals(), updateGoalDisplay(), renderSWOT(), renderCharts(), renderRevenueChart(), renderCustomerChart(), setChartView(), renderCategoryChart(), updateExportData(), openEditAnalyticsModal(), saveAnalyticsData(), openEditGoalsModal(), saveGoalsData(), openAddImprovementModal(), saveImprovementPlan(), renderImprovementPlans(), regenerateSWOT(), pullData(), generateFullAnalyticsReport(), refreshAnalytics()
**Utility:** showNotification(), formatCurrency(), formatMoney(), formatFileSize(), parseMoneyValue(), parseCurrency(), sleep(), isExcelFile(), isProduceItem(), isValidYear(), extractValidYear(), extractProductYear(), escapeHtml(), getDocName(), isExpired(), toggleCategory(), closeModal(), getCategoryStatus(), createEmptyResult(), renderProductWithBadge(), renderRuleStatsBanner()

### 5D. quickbooks-dashboard.html Functions (16 functions)

formatCurrency(), formatDate(), apiCall(), checkConnection(), connectQuickBooks(), loadDashboard(), renderAccounts(), renderProfitLoss(), renderAgingChart(), renderInvoices(), renderBills(), refreshDashboard(), toggleKeyboardHelp(), openSetupWizard(), closeSetupWizard(), saveQuickBooksCredentials()

### 5E. wealth-builder.html Functions (3 functions + chart init)

showSpec(tabId), updateRiskNeedle(), keyboard shortcut handler, Chart.js doughnut initialization

---

## 6. Working vs Stub/Placeholder Assessment

### FULLY WORKING (Backend Connected)
| Feature | File | Evidence |
|---------|------|----------|
| Plaid bank connection | accounting.html | Full SDK flow, token exchange, account display |
| Receipt upload/OCR | accounting.html | uploadReceiptImage API, file handling |
| P&L generation | accounting.html | generateProfitLossStatement API |
| Schedule F generation | accounting.html | generateScheduleFReport API |
| Labor cost tracking | accounting.html | getLaborByCrop, getTimelog APIs |
| Accountant email import | accounting.html | importAccountantEmails API |
| QuickBooks connection | quickbooks-dashboard.html | OAuth flow, full dashboard render |
| QB AR/AP aging | quickbooks-dashboard.html | getQuickBooksDashboard returns aging data |
| Plaid banking + investments | financial-dashboard.html | Full SDK flow, investment holdings |
| Shopify Payments/Capital | financial-dashboard.html | getShopifyPaymentsBalance, getShopifyCapitalLoan |
| PayPal integration | financial-dashboard.html | getPayPalFinancialSummary |
| Marketing budget tracking | financial-dashboard.html | 3 marketing API endpoints |
| Document upload to vault | loan-readiness.html | uploadLoanDocument with base64 encoding |
| Sales data parser | loan-readiness.html | Full CSV/Excel parsing with SheetJS |
| AI business plan generation | loan-readiness.html | generateFarmBusinessPlan API |
| Grant web scraping | loan-readiness.html | scrapeGrantRequirements API |

### HYBRID (Backend + localStorage)
| Feature | File | Notes |
|---------|------|-------|
| Wishlist management | financial-dashboard.html | localStorage primary, API sync secondary |
| Asset tracking | financial-dashboard.html | localStorage primary, API sync secondary |
| Bill tracking | financial-dashboard.html | localStorage primary, API sync secondary |
| Payment plans | financial-dashboard.html | localStorage primary, API sync secondary |
| Alpaca config | financial-dashboard.html | localStorage primary, API sync secondary |
| Grants data | loan-readiness.html | localStorage with API sync on load |
| Lender CRM | loan-readiness.html | localStorage based, no direct API |
| Farm Profile | loan-readiness.html | localStorage only |
| Analytics data | loan-readiness.html | localStorage, manual refresh from parser |

### STUB/PLACEHOLDER
| Feature | File | Notes |
|---------|------|-------|
| Bill OCR extraction | financial-dashboard.html | extractFromImage() returns empty promise with setTimeout; parseExtractedText() has pattern matching but extractFromImage never calls it |
| Receipt OCR (banking tab) | financial-dashboard.html | handleReceiptUpload() shows "Add to expenses manually for now" |
| Alpaca trading | financial-dashboard.html | Config saved but no trade API calls; calculateMomentumSignal() returns static 'VTI' |
| Change Investing (Round-ups) | financial-dashboard.html | UI mockup only, no actual round-up processing |
| Team & Retirement | financial-dashboard.html | Hardcoded UI, no backend connection |
| Settings page | financial-dashboard.html | Configuration UI but no save-to-backend |
| Debt strategy recalculation | financial-dashboard.html | recalculatePayoff() logs to console only |

### 100% STATIC/DEMO (No Backend)
| Feature | File | Notes |
|---------|------|-------|
| ALL of wealth-builder.html | wealth-builder.html | Every data point hardcoded; $47,250 portfolio, 10 holdings, 4 trades, all static |

---

## 7. CSS/UX Quality Assessment

### Design System Compliance

| File | Uses design-system.css | Custom CSS Lines | WCAG Focus | Reduced Motion | Print Styles | Mobile |
|------|----------------------|-----------------|------------|----------------|-------------|--------|
| accounting.html | Yes | ~650 | focus-visible | Yes | No | Basic responsive |
| financial-dashboard.html | Yes | ~800 | focus-visible | Yes | No | Good (grid breakpoints) |
| loan-readiness.html | Yes | ~4,800 | focus-visible | Partial | No | Good (mobile vault) |
| quickbooks-dashboard.html | Yes | ~400 | focus-visible | No | Yes (full) | Good (responsive grid) |
| wealth-builder.html | Yes | ~350 | focus-visible | Yes | Yes (full) | Excellent (mobile-first, safe-area-insets) |

### UX Quality Rankings

1. **loan-readiness.html** - Best UX: document vault with expandable info, lender tooltips, priority badges, drag-drop uploads, processing indicators, AI chat assistant, application strength meter
2. **financial-dashboard.html** - Good UX: unified state manager, prescriptive recommendations, smart wishlist algorithm, auto-populated debt from Plaid, seasonal farm advice
3. **quickbooks-dashboard.html** - Clean UX: simple focused page, keyboard shortcuts, print-ready, clear connection status
4. **wealth-builder.html** - Good visual design but STATIC: nice risk gauge animation, seasonal calendar, algorithm spec tabs
5. **accounting.html** - Functional but older UX: basic tab navigation, simple tables, functional but not polished

### Known CSS Issues
- financial-dashboard.html has two different Payment Plan modals (paymentPlanModal and addPaymentPlanModal) with overlapping field IDs
- wealth-builder.html investment_algorithm.js is referenced but file not verified
- loan-readiness.html has 4,800+ lines of CSS (should use more design system classes)

---

## 8. Feature Disposition Matrix

### Legend
- **KEEP** = Stay in current page
- **MOVE** = Relocate to different page
- **MERGE** = Combine with better version elsewhere
- **DROP** = Remove entirely (dead code or duplicate)
- **ABSORB** = Page being eliminated, features absorbed

---

### accounting.html -> Accounting Hub

| Feature | Disposition | Destination | Notes |
|---------|------------|-------------|-------|
| Dashboard stats | KEEP | accounting.html | |
| Action Items (DGPerry) | KEEP | accounting.html | Bookkeeper-specific |
| Banking (Plaid) | KEEP (simplified) | accounting.html | Keep read-only view; primary Plaid management in financial-dashboard |
| Receipts | KEEP | accounting.html | Core bookkeeper function |
| Accountant Docs | KEEP | accounting.html | Unique to this page |
| Reports (P&L, Schedule F) | KEEP | accounting.html | Core bookkeeper function |
| **Loan Readiness tab** | **DROP** | -- | **Inferior duplicate of loan-readiness.html; remove entire tab** |
| Labor Costs | KEEP | accounting.html | Unique farm bookkeeping |
| **Grants tab** | **DROP** | -- | **Inferior duplicate of loan-readiness.html grants; remove entire tab** |
| Categories | KEEP | accounting.html | |
| QuickBooks data | **ABSORB** | accounting.html | **Add new QB Integration tab from quickbooks-dashboard.html** |

### financial-dashboard.html -> Financial Command Center

| Feature | Disposition | Destination | Notes |
|---------|------------|-------------|-------|
| Overview (net worth, health score) | KEEP | financial-dashboard.html | |
| Debt Destroyer | KEEP | financial-dashboard.html | Unique and valuable |
| Banking & Bills | KEEP | financial-dashboard.html | Primary Plaid management |
| Investments | KEEP | financial-dashboard.html | Plaid + Alpaca |
| Change Investing (Round-ups) | KEEP (stub) | financial-dashboard.html | Future feature |
| Wishlist (smart affordability) | KEEP | financial-dashboard.html | Unique algorithm |
| Assets (MACRS depreciation) | KEEP | financial-dashboard.html | Unique and valuable |
| Payment Plans | KEEP | financial-dashboard.html | Fix duplicate modal issue |
| Team & Retirement | KEEP (stub) | financial-dashboard.html | Future feature |
| Settings | KEEP | financial-dashboard.html | |
| Marketing | KEEP | financial-dashboard.html | Unique |
| **Documents (basic vault)** | **DROP** | -- | **Inferior to loan-readiness vault; just link to it** |
| FinancialState manager | KEEP | financial-dashboard.html | Critical architecture |
| RecommendationsEngine | KEEP | financial-dashboard.html | |
| Wealth Builder algorithm spec | **ABSORB** | financial-dashboard.html | **Add as expandable section in Investments tab** |
| Wealth Builder charts | **ABSORB** | financial-dashboard.html | **Merge allocation chart into Investments tab** |
| Loan Package generation | **SIMPLIFY** | financial-dashboard.html | Keep quick-generate button but link to loan-readiness for full package |
| Shopify/PayPal integrations | KEEP | financial-dashboard.html | |

### loan-readiness.html -> Loan & Grant Center

| Feature | Disposition | Destination | Notes |
|---------|------------|-------------|-------|
| Overview (financial metrics) | KEEP | loan-readiness.html | |
| Document Vault | KEEP | loan-readiness.html | Most complete version |
| Lender Checklists | KEEP | loan-readiness.html | |
| Applications tracker | KEEP | loan-readiness.html | |
| Calculator | KEEP | loan-readiness.html | |
| Contacts (Lender CRM) | KEEP | loan-readiness.html | |
| Farm Profile | KEEP | loan-readiness.html | |
| Grants (full system) | KEEP | loan-readiness.html | Most complete version |
| AI Plan Generator | KEEP | loan-readiness.html | |
| Farm Analytics | KEEP | loan-readiness.html | |

### quickbooks-dashboard.html -> ELIMINATE

| Feature | Disposition | Destination | Notes |
|---------|------------|-------------|-------|
| QB connection status | **ABSORB** | accounting.html | New "QuickBooks" tab |
| QB summary cards | **ABSORB** | accounting.html | |
| Account balances | **ABSORB** | accounting.html | |
| P&L YTD display | **ABSORB** | accounting.html | Complements existing P&L generator |
| AR/AP aging charts | **ABSORB** | accounting.html | Unique and valuable |
| Open invoices/bills | **ABSORB** | accounting.html | |
| Setup wizard | **ABSORB** | accounting.html | |
| Keyboard shortcuts | **ABSORB** | accounting.html | Enhance overall UX |
| Print styles | **ABSORB** | accounting.html | |

### wealth-builder.html -> ELIMINATE

| Feature | Disposition | Destination | Notes |
|---------|------------|-------------|-------|
| Portfolio allocation chart | **ABSORB** | financial-dashboard.html Investments tab | Already partially duplicated there |
| Risk gauge | **ABSORB** | financial-dashboard.html Investments tab | Nice visual |
| Seasonal contribution calendar | **ABSORB** | financial-dashboard.html Investments tab | Unique |
| Algorithm spec (5 sub-tabs) | **ABSORB** | financial-dashboard.html Investments tab | As expandable "Learn More" section |
| Recommended trades table | **DROP** | -- | Static hardcoded data, no backend |
| Hardcoded stat cards | **DROP** | -- | Will be replaced by live Plaid/Alpaca data |

---

## 9. Gap Analysis

### Missing Features for a Complete Farm Financial System

| Feature | Priority | Which Page Should Have It | Current Status |
|---------|----------|--------------------------|----------------|
| **Invoicing (AP/AR)** | HIGH | Accounting Hub | QuickBooks shows AR/AP but no create-invoice flow exists |
| **Budget vs Actual** | HIGH | Financial Command Center | No budget creation or tracking against actuals |
| **Seasonal Cash Flow Forecasting** | HIGH | Financial Command Center | Seasonal advice exists but no cash flow projection chart |
| **Tax Prep Workspace** | MEDIUM | Accounting Hub | Schedule F exists but no estimated tax payment tracker, no 1099 tracking |
| **Payroll Integration** | MEDIUM | Accounting Hub | Labor costs tab exists but no payroll processing or tax withholding |
| **Equipment Depreciation Schedule** | LOW | Financial Command Center | MACRS calculator exists in AssetManager; needs better report output |
| **Multi-Year Financial Comparison** | MEDIUM | Loan & Grant Center | Analytics has year-over-year but needs formal 3-year comparison for lenders |
| **Automated Bill Pay Reminders** | LOW | Financial Command Center | Bills tracked but no SMS/email reminder system |
| **Cash Flow Statement** | HIGH | Accounting Hub | P&L and Balance Sheet exist but no formal Cash Flow Statement |
| **Vendor Management** | LOW | Accounting Hub | Receipts have vendors but no vendor directory or payment terms |
| **Bank Reconciliation** | MEDIUM | Accounting Hub | Transactions displayed but no formal reconciliation workflow |
| **Crop Profitability Analysis** | MEDIUM | Accounting Hub | Labor costs per crop exist but no revenue-per-crop to calculate actual profit |
| **Insurance Tracker** | LOW | Loan & Grant Center | Document vault has insurance category but no policy/premium tracking |
| **Loan Amortization Schedule** | LOW | Loan & Grant Center | Calculator exists but no saved amortization schedules |
| **Financial Goal Setting** | LOW | Financial Command Center | RecommendationsEngine gives advice but no formal goal setting/tracking |

### Features That Should Be Connected But Are Not

| Feature A | Feature B | Gap |
|-----------|-----------|-----|
| Labor Costs (accounting) | Crop Analytics (loan-readiness) | Labor data not feeding into analytics |
| Plaid Transactions (financial-dashboard) | Receipt Matching (accounting) | No auto-matching of bank transactions to receipts |
| Sales Parser (loan-readiness) | Financial Dashboard (financial-dashboard) | Parsed revenue data not feeding FinancialState |
| Asset Depreciation (financial-dashboard) | Schedule F (accounting) | Depreciation not auto-populating tax reports |
| Shopify Capital (financial-dashboard) | Debt Calculator (loan-readiness) | Capital loan not showing in consolidation calculator |
| Grant Awards (loan-readiness) | Revenue Tracking (loan-readiness analytics) | Awarded grants not tracked as revenue |

---

## 10. Consolidation Architecture

### Phase 1: Quick Wins (Low Risk)
1. **Delete wealth-builder.html** - Move algorithm spec and charts into financial-dashboard.html Investments tab
2. **Add cross-links** - Accounting Hub links to "Full Loan Center" for loan features, Financial Command Center links to "Document Vault" in loan center
3. **Remove Loan Readiness tab from accounting.html** - Replace with link to loan-readiness.html
4. **Remove Grants tab from accounting.html** - Replace with link to loan-readiness.html grants

### Phase 2: QuickBooks Absorption (Medium Risk)
1. **Add "QuickBooks" tab to accounting.html** - Port all features from quickbooks-dashboard.html
2. **Keep quickbooks-dashboard.html temporarily** with deprecation notice until QB tab is verified
3. **Port keyboard shortcuts** from QB dashboard to accounting page
4. **Port print styles** from QB dashboard

### Phase 3: Feature Deduplication (Medium Risk)
1. **Simplify Plaid in accounting.html** - Read-only view, link to financial-dashboard for management
2. **Remove Documents tab from financial-dashboard.html** - Replace with link to loan-readiness vault
3. **Fix duplicate Payment Plan modals** in financial-dashboard.html (paymentPlanModal vs addPaymentPlanModal)
4. **Consolidate loan package generation** - Remove from accounting.html and financial-dashboard.html; keep only in loan-readiness.html with cross-links

### Phase 4: Data Integration (High Risk, High Value)
1. **Connect Sales Parser to FinancialState** - Parsed revenue feeds into financial dashboard
2. **Connect Labor Costs to Analytics** - Farm analytics gets labor data
3. **Connect Asset Depreciation to Schedule F** - Auto-populate tax reports
4. **Unified document system** - Single document vault in loan-readiness serves all pages

### Estimated Effort

| Phase | Effort | Risk | Pages Modified |
|-------|--------|------|----------------|
| Phase 1 | 2-3 hours | Low | financial-dashboard, accounting |
| Phase 2 | 4-6 hours | Medium | accounting, quickbooks-dashboard |
| Phase 3 | 3-4 hours | Medium | accounting, financial-dashboard |
| Phase 4 | 8-12 hours | High | All 3 remaining pages |

---

## 11. Migration Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking Plaid flow during deduplication | HIGH | Test Plaid in staging before removing any Plaid code |
| Losing QB functionality during absorption | HIGH | Keep quickbooks-dashboard.html live until QB tab in accounting is verified working |
| localStorage data loss during consolidation | MEDIUM | Export all localStorage keys before migration; provide data migration script |
| URL/bookmark breakage when pages are removed | LOW | Add redirects from old pages to new locations |
| API endpoint confusion (different pages call same endpoint differently) | MEDIUM | Document all action parameters used per page before consolidation |
| Losing static wealth-builder algorithm docs | LOW | Ensure algorithm spec content is fully ported before deletion |
| Financial-dashboard FinancialState breaking if Plaid flow changes | HIGH | FinancialState.update() is tightly coupled to Plaid response format; test thoroughly |
| Grant data in localStorage overwritten during page consolidation | MEDIUM | Different pages may use different localStorage keys for similar data; audit keys first |

### localStorage Keys to Audit Before Migration

| Key | File | Purpose |
|-----|------|---------|
| `tsf_wishlist` | financial-dashboard.html | Wishlist items |
| `tsf_assets` | financial-dashboard.html | Farm assets |
| `tsf_bills` | financial-dashboard.html | Bills/utilities |
| `tsf_alpaca_config` | financial-dashboard.html | Alpaca settings |
| `tsf_payment_plans` | financial-dashboard.html | Customer payment plans |
| `tinyseed_grants` | loan-readiness.html | Grant data |
| `tinyseed_lender_crm` | loan-readiness.html | Lender CRM contacts |
| `tinyseed_farm_profile` | loan-readiness.html | Farm profile data |
| `tinyseed_analytics` | loan-readiness.html | Analytics data |
| `tinyseed_parser_rules` | loan-readiness.html | Sales parser rules |
| Various task checkboxes | accounting.html | DGPerry task completion |

---

## Appendix: File-Level Summary for Quick Reference

### Files to KEEP (3):
1. `/web_app/accounting.html` - Accounting Hub (enhanced with QB features)
2. `/web_app/financial-dashboard.html` - Financial Command Center (enhanced with wealth-builder features)
3. `/web_app/loan-readiness.html` - Loan & Grant Center (standalone, most complete)

### Files to ELIMINATE (2):
1. `/web_app/quickbooks-dashboard.html` - Features absorbed into accounting.html
2. `/web_app/wealth-builder.html` - Features absorbed into financial-dashboard.html

### External Files Referenced:
- `/web_app/tiny-seed-design-system.css` - Shared design system
- `/web_app/api-config.js` - Centralized API URL
- `/web_app/auth-guard.js` - Authentication
- `/web_app/investment_algorithm.js` - Referenced by wealth-builder.html
- `/web_app/correction-modal.css` - Used by loan-readiness.html
- `/web_app/lender-crm.css` - Used by loan-readiness.html
- `/config/sales_parser_config.json` - Sales parser configuration
- `/config/product_name_mappings.json` - Product categorization mappings
- `/config/parser_prompts.json` - AI prompt templates

---

*End of Financial Systems Consolidation Plan v2*
*Total pages audited: 5 (33,112 lines)*
*Total functions cataloged: ~350+*
*Total API endpoints documented: ~86*
*Total external integrations: 10*
