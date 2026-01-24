# LOAN READINESS DASHBOARD - QUICK START GUIDE
## Tiny Seed Farm LLC
### Financial Claude | 2026-01-24

---

## WHAT IS THIS?

A complete loan application preparation system that:
- Tracks your readiness with a 0-100 score
- Shows which documents you have and which you need
- Generates professional loan packages in one click
- Calculates debt consolidation savings
- Provides Farm Credit lender contacts

---

## HOW TO ACCESS

**URL:** `web_app/loan-readiness.html`

**Who can access:** Admin users only (requires authentication)

---

## QUICK START (5 MINUTES)

### Step 1: Open the Dashboard
Navigate to `web_app/loan-readiness.html` in your browser

### Step 2: Review Your Readiness Score
- See your current score (0-100)
- Check which category needs work:
  - Personal Documents (4 items)
  - Business Documents (5 items)
  - Farm-Specific (3 items)

### Step 3: Check Off Items You Have
Click each document you've already gathered:
- Government ID
- Social Security Number
- Personal Tax Returns (2024, 2025)
- Business Tax Returns (2024, 2025)
- Business Plan Summary

**Note:** Some items auto-check if data exists in the system:
- Balance Sheet (if Plaid connected)
- Debt Schedule (if debts tracked)
- Cash Flow Projection (if data exists)
- Asset Schedule (if assets tracked)

### Step 4: Use the Debt Consolidation Calculator
1. Enter your total credit card debt
2. Enter average current APR (usually 18-29%)
3. Enter Farm Credit consolidation rate (usually 6-12%)
4. Enter desired loan term (typically 5 years)
5. See your potential savings!

### Step 5: Generate Loan Package
When ready to apply:
1. Click "Generate Complete Package" button
2. Download the HTML file
3. Open in browser
4. Print to PDF
5. Submit to lender

---

## THE 12 REQUIRED DOCUMENTS

### Personal (You must gather these)
1. ☐ Government ID (driver's license or passport)
2. ☐ Social Security Number
3. ☐ Personal Tax Returns (2 years: 2024, 2025)
4. ☐ Business Tax Returns (2 years: 2024, 2025)
5. ☐ Business Plan Summary

### Business (System can generate these)
6. ☑ Balance Sheet (Generate → from financial data)
7. ☑ Debt Schedule (Generate → from tracked debts)
8. ☑ Cash Flow Projection (Generate → from historical data)
9. ☑ Year-to-Date P&L (Generate → from Plaid data)

### Farm-Specific (System can generate these)
10. ☑ Asset Schedule (Generate → from equipment tracking)
11. ☑ Proof of Farm Income (Generate → from sales records)
12. ☑ Production Records (Generate → from planning data)

---

## FARM CREDIT CONTACT INFORMATION

### AgCredit
- **Phone:** 800-837-3678
- **Website:** agcredit.net
- **Serves:** Northwest & Central Ohio

### Farm Credit Mid-America
- **Phone:** 800-444-3276
- **Website:** e-farmcredit.com
- **Serves:** Ohio, Kentucky, Indiana, Tennessee

### What to Say When You Call
> "Hi, I'm a small vegetable farm owner. I'm interested in discussing an operating loan for my CSA season and possibly consolidating some business debt. Can I schedule a consultation?"

---

## LOAN PACKAGE CONTENTS

When you click "Generate Complete Package," you get:

### 1. Executive Summary
- Total Assets
- Total Liabilities
- Net Worth
- Debt-to-Asset Ratio

### 2. Balance Sheet
- Cash & Bank Accounts
- Equipment
- Vehicles
- Inventory
- Total Assets vs Total Liabilities
- Owner's Equity

### 3. Asset Schedule
- Every piece of equipment with:
  - Purchase date
  - Purchase price
  - Current value
  - Category
- Total current asset value

### 4. Debt Schedule
- Every debt with:
  - Creditor name
  - Type (credit card, loan, etc.)
  - Current balance
  - APR
  - Minimum payment
  - Status
- Total debt summary

### 5. Professional Formatting
- Clean, professional design
- Prints perfectly to PDF
- Ready for lender submission
- Includes farm name and date

---

## DEBT CONSOLIDATION CALCULATOR

### Example Calculation

**Current Situation:**
- Total Debt: $30,000
- Average APR: 24%
- Minimum Payment: ~$900/month
- Total Interest (10 years): ~$24,000

**After Consolidation (5-year loan at 8%):**
- Monthly Payment: $608
- Total Interest: $6,480
- **SAVINGS: $17,500**

### Your Numbers
Use the calculator on the dashboard to see YOUR potential savings!

---

## READINESS SCORE GUIDE

**80-100:** Excellent - Ready to apply now
- All documents gathered
- Strong financial position
- Lender will be impressed

**50-79:** Good - Nearly ready
- Missing a few documents
- Gather remaining items this week
- Should be ready soon

**0-49:** Needs Work - Start gathering documents
- Multiple documents missing
- Focus on personal items first
- Use checklist to track progress

---

## FREQUENTLY ASKED QUESTIONS

### Q: Do I need 100% to apply for a loan?
**A:** No, but 80%+ is recommended. Some items (like business plan) are nice-to-have but not always required.

### Q: What if I don't have 2 years of business tax returns?
**A:** Talk to the lender. First-year farmers can often use alternative documentation.

### Q: How long does the loan application process take?
**A:** Typically 2-4 weeks from application to approval.

### Q: What interest rate can I expect?
**A:** Farm Credit rates typically 6-12% for operating loans, much better than credit cards at 18-29%.

### Q: Can I consolidate personal and business debt together?
**A:** Sometimes. Discuss with the lender. Farm Credit focuses on farm business debt.

### Q: What if my readiness score is low?
**A:** Don't panic! The dashboard shows exactly what you need. Gather items one by one.

---

## TIPS FOR LENDER MEETING

### Before the Meeting
1. Generate and print your loan package
2. Review all numbers for accuracy
3. Prepare to explain your farm business model
4. Know your monthly cash flow pattern
5. Have questions ready about loan terms

### During the Meeting
1. Be honest about your financial situation
2. Show the professional package (impressive!)
3. Explain seasonal cash flow patterns
4. Ask about payment flexibility during off-season
5. Discuss debt consolidation if applicable
6. Get timeline for approval decision

### After the Meeting
1. Send thank-you email
2. Provide any requested additional documents
3. Follow up if you don't hear back in 1 week
4. Track application status in your notes

---

## TECHNICAL NOTES

### Data Sources
The dashboard pulls real data from:
- DEBTS sheet (via getDebts)
- BANK_ACCOUNTS sheet (via getBankAccounts)
- ASSETS sheet (via getAssets - coming soon)
- Plaid connected accounts
- Financial tracking systems

### Persistence
Your checked items are saved in your browser's local storage. They'll be there when you come back.

### Updates
The readiness score updates in real-time as you check items off the list.

---

## RELATED DOCUMENTS

| Document | Location | Purpose |
|----------|----------|---------|
| Loan Readiness Overview | `LOAN_READINESS.md` | Detailed loan preparation guide |
| Debt Schedule Template | `DEBT_SCHEDULE_TEMPLATE.md` | Manual debt tracking template |
| FSA Microloan Guide | `FSA_MICROLOAN_GUIDE.md` | USDA FSA loan information |
| Financial Dashboard | `web_app/financial-dashboard.html` | Full financial management |

---

## SUPPORT

### If the Dashboard Isn't Working
1. Check that you're logged in as admin
2. Verify internet connection
3. Clear browser cache and reload
4. Check browser console for errors

### If Data Isn't Loading
1. Verify Plaid is connected (Settings tab in financial dashboard)
2. Check that debts are tracked (Debt Destroyer tab)
3. Ensure assets are entered (Assets tab)

### If Package Won't Download
1. Check browser popup blocker
2. Try different browser (Chrome recommended)
3. Verify backend API is responding

---

## VERSION HISTORY

**v1.0 (2026-01-24)** - Initial Release
- 12-item document checklist
- 0-100 readiness score
- Debt consolidation calculator
- One-click package generation
- Farm Credit contacts

---

*Ready to get that loan? Open the dashboard and let's make it happen!*

**Dashboard URL:** `web_app/loan-readiness.html`
