# MEGA MISSION: Complete Financial Dashboard - THE FULL BUILD

**Date:** 2026-01-22
**From:** PM Claude
**Priority:** CRITICAL - TOMORROW'S #1 FOCUS

---

## OWNER DIRECTIVE (VERBATIM)

> "I WANT THE FINANCIAL DASHBOARD DONE ALL THE WAY THROUGH. THAT MEANS ACCESSING ALL OF THE FINANCIAL RESEARCH AND APPLYING IT NOW."
>
> "NO SHORTCUTS. ONLY MAKE THE BEST POSSIBLE. I NEED YOU TO DO MORE RESEARCH SO THIS CAN BE AS SMART AS POSSIBLE. I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME. I WANT TO DO ITS BIDDING BECAUSE IT IS WHAT IS BEST FOR TINY SEED FARM."
>
> "STATE OF THE ART TOP OF THE LINE PRODUCTION READY TOOLS"
>
> "I really want to see that financial health score increase. I WANT THAT SCORE TO BE GROUNDED IN THE LATEST RESEARCH."

---

## YOUR RESEARCH - USE IT NOW

All research is complete. Time to BUILD:

| Research File | Location | Use For |
|--------------|----------|---------|
| Wealth Builder Action Plan | `/TINY_SEED_WEALTH_BUILDER_ACTION_PLAN.md` | Investment algorithms, debt strategies, SEP-IRA |
| Backtesting Research | `/BACKTESTING_RESEARCH.md` | Validate algorithms, metrics |

**KEY FINDINGS FROM RESEARCH:**
- **Debt Strategy:** Avalanche + bi-weekly payments + 15/3 rule
- **Investment Platform:** Alpaca (commission-free, API access)
- **Portfolio Split:** 75% Safe / 25% Growth
- **Round-ups:** From farm orders → invest spare change
- **SEP-IRA:** Manual contributions (no API), 3-of-5 rule for employees

---

## THE COMPLETE BUILD LIST

### 1. DEBT DESTROYER TAB

**CLEAR ALL FAKE DATA** - Owner is frustrated with fake data

**ADD WISHLIST FEATURE:**
- Farm equipment/purchases wishlist
- Items over $1,000 tracked
- System alerts when it's "safe" to purchase or finance
- Algorithm: Check cash reserves, upcoming expenses, debt payoff timeline

```
WISHLIST ITEM
├── Name: "New delivery van"
├── Estimated Cost: $25,000
├── Priority: High / Medium / Low
├── Finance or Cash: [Algorithm decides]
├── Status: "Wait - pay off $5K more debt first"
└── Safe to Buy Date: [Projected]
```

### 2. BANKING & BILLS TAB

**BILL UPLOAD FEATURE:**
- Upload button for bills (PDF, image)
- Camera capture for admin app (take photo of bill)
- AI/OCR parses:
  - Vendor name
  - Amount due
  - Due date
  - Account number
- Auto-categorizes by expense type

**RECEIPT UPLOAD (SAME):**
- Photo → AI parses → Expense recorded
- Integrates with expense tracking

**Technologies to use:**
- Google Cloud Vision API (OCR)
- Or: Tesseract.js for client-side
- Or: Built-in Apps Script blob handling

### 3. ASSET & INVENTORY TRACKING (LOAN-READY)

**OWNER SAYS: "ESPECIALLY FOR MY LOAN APPLICATIONS"**

This needs to be EASY and generate loan-ready reports.

**EQUIPMENT & ASSETS:**
| Field | Purpose |
|-------|---------|
| Asset Name | "John Deere Tractor" |
| Category | Equipment / Vehicle / Infrastructure / Tools |
| Purchase Date | For depreciation |
| Purchase Price | Original cost |
| Current Value | Depreciated or market value |
| Condition | Excellent / Good / Fair / Poor |
| Serial Number | For insurance/loans |
| Photo | Visual documentation |
| Location | Where it's stored |

**INVENTORY TRACKING:**
| Field | Purpose |
|-------|---------|
| Item | Seeds, supplies, packaging |
| Quantity | Current stock |
| Unit Cost | Per item |
| Total Value | Qty × Cost |
| Reorder Point | When to buy more |
| Supplier | Where to reorder |

**EASY INPUT OPTIONS:**
1. **Quick Add Form** - Simple form for fast entry
2. **Photo Capture** - Take photo, AI extracts details
3. **Barcode/QR Scan** - Scan equipment tags
4. **Bulk Import** - CSV upload for existing lists

**LOAN APPLICATION REPORTS:**
Generate these with ONE CLICK:
```
ASSET SCHEDULE (for loan applications)
├── Total Equipment Value: $XX,XXX
├── Total Vehicle Value: $XX,XXX
├── Total Inventory Value: $XX,XXX
├── Other Assets: $XX,XXX
├── TOTAL ASSETS: $XXX,XXX
│
├── Depreciation Schedule (5-year, 7-year)
├── Equipment List with Serial Numbers
└── PDF Export for bank submission
```

**BALANCE SHEET GENERATION:**
- Assets (from tracking above)
- Liabilities (from Plaid + manual)
- Owner's Equity (calculated)
- **Export as PDF for loan officer**

**Net Worth Calculation:**
```
NET WORTH = Total Assets - Total Liabilities

Assets:
├── Cash & Bank Accounts (Plaid)
├── Investment Accounts (Alpaca)
├── Equipment (depreciated value)
├── Inventory (current value)
├── Vehicles
└── Other Assets

Liabilities:
├── Credit Card Debt (Plaid)
├── Loans
└── Outstanding Bills
```

**API ENDPOINTS FOR ASSETS:**
```javascript
case 'addAsset':
case 'updateAsset':
case 'getAssets':
case 'getAssetsByCategory':
case 'addInventoryItem':
case 'updateInventory':
case 'getInventory':
case 'generateAssetSchedule':    // For loans
case 'generateBalanceSheet':     // For loans
case 'exportLoanPackage':        // PDF bundle
```

### 4. INVESTMENTS - START NOW

**Owner says: "I WANT INVESTMENTS TO START NOW"**

**Alpaca Integration:**
1. Connect to Alpaca API
2. Implement 75/25 Safe/Growth allocation
3. Auto-invest monthly (on 1st or 15th)
4. Track portfolio performance

**Round-Up Investing (Change Investing):**
```javascript
// Every farm order:
orderTotal = $47.63
roundUp = $48.00 - $47.63 = $0.37
// Pool round-ups until $5, then invest
```

**Monthly Profit Investing:**
- Calculate monthly profit
- Invest X% automatically
- Owner specified: "ONCE A MONTH"

### 5. CUSTOMER PAYMENT PLANS

**NEW FEATURE: In-House Payment Plans**

For customers who don't want to pay all at once:

```
PAYMENT PLAN STRUCTURE
├── Total Amount: $500 (CSA share)
├── Down Payment: 20% ($100)
├── Remaining: $400
├── Installments: 4 payments of $105 ($420 total)
├── Interest Rate: 5% simple (or calculate)
├── Due Date: Before end of season
└── Final Payment Due: October 1, 2026
```

**Rules:**
- Slight interest on payments (5%? 3%? Owner to decide)
- All payments must complete before season ends
- Auto-reminder emails for upcoming payments
- Track payment status in customer record

### 6. FINANCIAL HEALTH SCORE

**Make it SMART - grounded in research**

Score components (weighted):
```
FINANCIAL HEALTH SCORE (0-100)
├── Debt-to-Income Ratio (25%)
│   └── Lower is better
├── Emergency Fund (20%)
│   └── 3-6 months expenses = 100%
├── Debt Payoff Progress (20%)
│   └── % of debt eliminated
├── Investment Growth (15%)
│   └── On track to goals?
├── Cash Flow (10%)
│   └── Income vs expenses ratio
└── Bill Payment Timeliness (10%)
    └── % paid on time
```

**PRESCRIPTIVE - Tell owner what to do:**
- "Pay extra $200 to Chase this month - saves $45 interest"
- "Emergency fund low - pause extra debt payments this month"
- "Safe to purchase wishlist item: Greenhouse heater ($1,200)"
- "Investment allocation drifted 7% - rebalance this week"

---

## BACK BURNER (Owner directive)

**DO NOT WORK ON:**
- Team retirement features
- Marketing features

**FOCUS ON:** Everything above

---

## INTEGRATION POINTS

| System | How to Connect |
|--------|---------------|
| Plaid | Already connected - use for balances |
| Alpaca | New - set up API connection |
| Shopify | Pull order data for round-ups |
| QuickBooks | Sync expenses/income |
| Google Cloud Vision | OCR for bill/receipt parsing |

---

## FILES TO MODIFY/CREATE

| File | Action |
|------|--------|
| `apps_script/MERGED TOTAL.js` | Add new API endpoints |
| `apps_script/FinancialDashboard.html` | Update UI with all features |
| `apps_script/AccountingModule.js` | Add payment plan logic |
| NEW: `apps_script/AlpacaIntegration.js` | Investment automation |
| NEW: `apps_script/OCRProcessor.js` | Bill/receipt parsing |

---

## API ENDPOINTS TO ADD

```javascript
// Wishlist
case 'addWishlistItem':
case 'getWishlist':
case 'checkWishlistAffordability':

// Bill/Receipt Upload
case 'uploadBill':
case 'uploadReceipt':
case 'parseBillImage':

// Asset Tracking
case 'addAsset':
case 'getAssets':
case 'calculateNetWorth':

// Investments
case 'getAlpacaPortfolio':
case 'executeInvestment':
case 'getRoundUpPool':
case 'investRoundUps':

// Payment Plans
case 'createPaymentPlan':
case 'getPaymentPlans':
case 'recordPayment':
case 'getOverduePayments':

// Financial Health
case 'getFinancialHealthScore':
case 'getFinancialRecommendations':
```

---

## SUCCESS CRITERIA

1. **Debt Destroyer** - No fake data, wishlist working, purchase recommendations
2. **Banking & Bills** - Upload bills/receipts with AI parsing
3. **Net Worth** - Live asset tracking, total calculated
4. **Investments** - Alpaca connected, auto-invest working, round-ups pooling
5. **Payment Plans** - Customers can pay in installments with interest
6. **Health Score** - Research-grounded, prescriptive recommendations
7. **SMART** - System tells owner what to do, not the other way around

---

## OWNER'S VISION

> "I WANT IT TO BE SO SMART THAT IT KNOWS WHAT I SHOULD DO BEFORE ME. I WANT TO DO ITS BIDDING BECAUSE IT IS WHAT IS BEST FOR TINY SEED FARM."

**This is a prescriptive financial system.** It doesn't just report - it DIRECTS.

Every morning the owner should see:
- "Pay $150 extra to Chase today (bi-weekly payment)"
- "Don't buy the greenhouse heater yet - 3 more months"
- "$47.50 in round-ups ready to invest"
- "Financial health: 67/100 - up 3 points from last week"

---

## DELIVERABLES

1. Fully functional Financial Dashboard with ALL features above
2. Document all new API endpoints
3. Test each feature
4. Report completion to OUTBOX.md

---

**BUILD THE SMARTEST FINANCIAL SYSTEM. MAKE IT PRESCRIPTIVE. NO SHORTCUTS.**

*PM Claude*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
