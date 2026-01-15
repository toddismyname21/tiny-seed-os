# TINY SEED OS - OPERATIONAL ACTION PLAN
**Generated: January 12, 2026**
**Deadline: March 10, 2026 (57 days remaining)**

---

## CURRENT STATE ANALYSIS

### What Exists

**Frontend (GitHub Pages)**
- URL: https://toddismyname21.github.io/tiny-seed-os/
- 11 HTML tools built: master, field, bed, seed, succession, gantt, greenhouse, yield, visual, smart, api
- Status: **SHOWING DEMO DATA** (not connected to real backend)

**Backend (Google Sheets + Apps Script)**
- Production Database: `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc`
- Sales Database: `1S7FNi11NItqeaWol_e6TUehQ9JwFFf0pgPj6G0DlYf4`
- Apps Script Project: `1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWe`

**Apps Script API Deployments:**
- `https://script.google.com/macros/s/AKfycbxmiizjT_T2KI6ZZqAgDt49-8AvTPmq3penl4gSO2qPETMHVFtm0i90C47zG.../exec`
- `https://script.google.com/macros/s/AKfycby7zkQ1rZoN8AhoezqnXMdktOHCE2FTYWE5uuWvbbC2KeNkadC9MyIgm5WQL.../exec`

**Features Already Built in Apps Script:**
- New Planting Wizard
- Duplicate & Move Plantings (bulk succession tool)
- Add New Crop Profile
- Auto-generate daily tasks
- QR code generation
- Weather logging (Open-Meteo API)
- Tray inventory management
- Field visual maps
- Price projections (multi-year)
- Session logging (project management)

---

## THE CORE PROBLEM

**HTML tools are NOT connecting to real Google Sheets data.**

Root causes:
1. API endpoint URLs in HTML files may be incorrect or placeholder values
2. Apps Script routing logic may be missing required action handlers
3. CORS/authentication configuration may be incomplete
4. Deployment version mismatch between Apps Script and what HTML is calling

---

## STEP-BY-STEP PLAN TO GET OPERATIONAL

### PHASE 1: DIAGNOSIS & CONNECTION (Days 1-3)
**Goal: Get ONE tool loading real data**

#### Step 1.1: Get the GitHub Repository Code
```bash
git clone https://github.com/toddismyname21/tiny-seed-os.git
cd tiny-seed-os
```
OR if you have access to the HTML files locally, share them here.

#### Step 1.2: Verify Apps Script API is Working
Test the API directly in browser:
```
https://script.google.com/macros/s/AKfycby7zkQ1rZoN8AhoezqnXMdktOHCE2FTYWE5uuWvbbC2KeNkadC9MyIgm5WQL.../exec?action=testConnection
```

Expected response: `{"status": "success", "message": "Connected"}`

#### Step 1.3: Check HTML API Configuration
In each HTML tool file, find the API_URL constant:
```javascript
const API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```
Verify it matches your current Apps Script deployment URL.

#### Step 1.4: Test One Tool End-to-End
1. Open browser dev tools (F12)
2. Go to https://toddismyname21.github.io/tiny-seed-os/master
3. Check Console tab for errors
4. Check Network tab for failed API calls
5. Document what errors appear

---

### PHASE 2: FIX API CONNECTION (Days 4-7)
**Goal: All 11 tools loading real data**

#### Step 2.1: Update Apps Script Router
Ensure `doGet(e)` function handles all required actions:
```javascript
function doGet(e) {
  var action = e.parameter.action;

  switch(action) {
    case 'testConnection':
      return jsonResponse({status: 'success'});
    case 'getPlantings':
      return getPlantings();
    case 'getCropProfiles':
      return getCropProfiles();
    case 'getBeds':
      return getBeds();
    // ... add all required actions
    default:
      return jsonResponse({error: 'Unknown action: ' + action});
  }
}
```

#### Step 2.2: Deploy New Version
1. Open Apps Script editor
2. Click Deploy > Manage deployments
3. Create NEW deployment (don't edit existing)
4. Copy the new URL
5. Update ALL HTML files with new URL

#### Step 2.3: Update HTML Files
For each of the 11 tools:
1. Find `const API_URL = ...`
2. Replace with new deployment URL
3. Commit and push to GitHub

---

### PHASE 3: CORE FEATURES (Days 8-21)
**Goal: Production planning ready for Spring 2026**

#### Week 2: Greenhouse Labels (HIGHEST PRIORITY)
- [ ] Connect label generator to PLANNING_2026 sheet
- [ ] Test with real seeding data
- [ ] Configure for your printer (Dymo/Brother/Zebra)
- [ ] Add batch printing

#### Week 3: Bulk Succession Planting
- [ ] "Plant X every N days, M times" wizard
- [ ] Visual timeline preview
- [ ] Auto-assign to alternating beds
- [ ] Clone from 2025 plan

#### Week 4: Visual Calendar
- [ ] Gantt-style timeline view
- [ ] Filter by crop/field/status
- [ ] Drag-and-drop scheduling

---

MOBILE & FIELD OPS 
**Goal: Crew can log work from phones**

 GPS Auto-Detection
- [ ] Map bed coordinates (one-time setup)
- [ ] Auto-detect field/bed from location
- [ ] Pre-fill forms based on GPS

 Harvest Logging Mobile
- [ ] Touch-friendly interface
- [ ] QR code scanning
- [ ] Photo upload
- [ ] Offline mode with sync

 Kiosk Mode for Crew
- [ ] Daily task list (read-only)
- [ ] Swipe to complete
- [ ] Hide financial data
- [ ] Time tracking

---

### PHASE 5: SALES & CUSTOMERS (Days 36-49)
**Goal: Customers can order online**

#### Week 8: Customer Onboarding
- [ ] First-order registration
- [ ] Phone/email lookup for repeat orders
- [ ] Payment method storage

#### Week 9: Flex CSA Portal
- [ ] Real-time balance display
- [ ] One-click ordering
- [ ] Order history

#### Week 10: Notifications
- [ ] SMS order reminders (Twilio)
- [ ] Delivery ETA notifications
- [ ] Flash sale campaigns

---

### PHASE 6: INTEGRATIONS & POLISH (Days 50-57)
**Goal: System is production-ready**

#### Final Week: Integration
- [ ] Shopify inventory sync
- [ ] QuickBooks invoice generation
- [ ] Route optimization (Google Maps)

#### Final Week: Testing
- [ ] Full system walkthrough
- [ ] Crew training
- [ ] Documentation

---

## IMMEDIATE NEXT STEPS (TODAY)

### You Need To:

1. **Share the GitHub repository access** OR share the HTML files directly
   - Either invite me as collaborator on https://github.com/toddismyname21/tiny-seed-os
   - Or copy/paste one HTML file here for me to diagnose

2. **Test the API endpoint** - Open this URL in your browser:
   ```
   https://script.google.com/macros/s/AKfycby7zkQ1rZoN8AhoezqnXMdktOHCE2FTYWE5uuWvbbC2KeNkadC9MyIgm5WQL.../exec?action=testConnection
   ```
   Tell me what response you get.

3. **Check browser console** - Go to your live site, press F12, click Console tab, and screenshot any red errors.

4. **Share Apps Script Code.gs** - Open your Google Sheets, go to Extensions > Apps Script, copy the Code.gs file, share it here.

---

## KEY RESOURCES IDENTIFIED

| Resource | URL/ID |
|----------|--------|
| GitHub Pages Site | https://toddismyname21.github.io/tiny-seed-os/ |
| Production Sheet | 128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc |
| Sales Sheet | 1S7FNi11NItqeaWol_e6TUehQ9JwFFf0pgPj6G0DlYf4 |
| Apps Script Project | 1OR_XstYXlvw-vCbE6cO_Cyt22QeowHWgYBKtZbLcu77bJANqSNqENWe |
| Farm Website | https://tinyseedfarm.com |

---

## SUCCESS CRITERIA - MARCH 10, 2026

By deadline, you will be able to:
- [ ] Plan entire 2026 season in 2 hours (vs 2 days)
- [ ] Print greenhouse labels in 30 seconds
- [ ] Log harvest in 10 seconds (vs 2 minutes)
- [ ] See real-time inventory across channels
- [ ] Generate pick lists with 1 click
- [ ] Crew logs work from phones
- [ ] $0/month subscription costs

---

## QUESTIONS I NEED ANSWERED

1. Can you access the GitHub repo? What's your GitHub username?
2. What printer do you have for labels? (Dymo, Brother, Zebra, Avery sheets?)
3. Are you comfortable editing Google Apps Script, or do you need me to write exact code to paste?
4. What's the #1 feature you need working THIS WEEK for spring prep?

---

*This plan is based on analysis of your Claude chat exports. Ready to start fixing the connection issues as soon as you share access to the code.*

I'm on it. Going to run deep research overnight on all fronts. Sleep well - you'll wake up to a comprehensive plan.

⏺ 5 Task agents launched (ctrl+o to expand)
   ├─ Research Plaid API banking
   │  ⎿  Running in the background (↓ to manage)
   ├─ Research investment APIs platforms
   │  ⎿  Running in the background (↓ to manage)
   ├─ Research debt payoff algorithms
   │  ⎿  Running in the background (↓ to manage)
   ├─ Research SEP-IRA automation
   │  ⎿  Running in the background (↓ to manage)
   └─ Research micro-investing algorithms
      ⎿  Running in the background (↓ to manage)

⏺ 5 research agents running in parallel now. Here's what's being researched overnight:
  Research Track: Banking APIs
  Focus: Plaid, PNC/Chase/Amex connectivity, payment
    capabilities
  ────────────────────────────────────────
  Research Track: Investment Platforms
  Focus: Alpaca, Schwab, automated investing APIs
  ────────────────────────────────────────
  Research Track: Debt Algorithms
  Focus: Avalanche vs snowball, optimal payment timing
  ────────────────────────────────────────
  Research Track: SEP-IRA Rules
  Focus: Contribution limits, employee eligibility,
    automation
  ────────────────────────────────────────
  Research Track: Micro-Investing
  Focus: Round-ups, profit %, compound growth projections
  ---
  When you wake up, you'll have:
  1. Full research report on each topic
  2. Recommended path forward for each pillar
  3. Specific platforms/APIs to use
  4. Clear next steps to start investing by end of next week

  ---
  Your $20k credit card debt mission is now TOP PRIORITY.

  The Debt Destroyer will know your cards, your APRs, your cash flow - and attack that debt intelligently so you don't have to think about it.

  Sleep well. Tomorrow we build your wealth machine. 🌱💰

✻ Baked for 1m 0s

⏺ Agent "Research investment APIs platforms" completed

⏺ Investment Platform Research Complete!

  Winner: Alpaca - Commission-free API, $1 minimums, fractional shares, excellent documentation.

  Key finding: Alpaca supports automated investing via API but does not support SEP-IRA (only Traditional/Roth IRA). For SEP-IRA, you'd need a traditional broker like Schwab/Fidelity with manual contributions.

  Waiting on 4 more research tracks to complete... I'll compile everything into a full report.

⏺ Agent "Research SEP-IRA automation" completed

⏺ SEP-IRA Research Complete!

  Key findings:
  - Solo 401(k) NOT available - you have employees, so you're disqualified
  - SEP-IRA limitation: Must contribute same % for ALL eligible employees
  - 3-of-5 rule: New employees won't be eligible for ~3 years (good for seasonal workers)
  - No API automation for SEP-IRA contributions at any major brokerage
  - If you want vesting control (employees earn it over time): Need a traditional 401(k) plan

  3 research tracks remaining...

⏺ Agent "Research Plaid API banking" completed

⏺ Plaid Banking API Research Complete!

  Critical finding: Plaid CANNOT make credit card payments directly.

  - ACH transfers only work bank-to-bank, not to credit cards
  - Plaid CAN: Monitor real-time balances, pull transactions, detect patterns
  - For payments: Must use credit card issuer's autopay OR bank bill pay

  Bank Support:
  Bank: Chase
  Status: ✅ Fully supported
  ────────────────────────────────────────
  Bank: PNC
  Status: ✅ Supported (requires annual re-auth)
  ────────────────────────────────────────
  Bank: Amex
  Status: ⚠️ Partial (2FA issues, balance/transactions work)
  Architecture for your Debt Destroyer:
  1. Plaid monitors all balances in real-time
  2. Dashboard shows debt status
  3. Algorithm calculates optimal payments
  4. Payments executed via issuer autopay OR manual trigger

  2 more research tracks running... (debt algorithms, micro-investing)

⏺ Agent "Research debt payoff algorithms" completed

⏺ Debt Payoff Algorithm Research Complete!

  This is gold. Key findings:

  Recommended Strategy for You: Avalanche + Smart Timing
  - Pay Chase first (24.99% APR is highest)
  - Split payments bi-weekly (reduces Average Daily Balance = less interest)
  - The "15/3 Rule": Pay 15 days before statement close, then 3 days before

  The Math:
  - Your $20K at ~22% avg APR = ~$4,400/year in interest
  - Avalanche saves $1,500-3,000 over snowball for your APR spread
  - Bi-weekly payments save an extra $100+/year

  Complete algorithm with Python code included - ready to implement in your dashboard.

  1 more research track to go... (micro-investing)

⏺ Agent "Research micro-investing algorithms" completed

⏺ ALL RESEARCH COMPLETE!

⏺ ---
  🌱 TINY SEED WEALTH BUILDER - COMPLETE RESEARCH REPORT

  Good Morning! Here's Your Financial System Blueprint:

  ---
  1. DEBT DESTROYER (Your $20K Credit Card Attack Plan)

  The Strategy: Avalanche + Smart Timing
  ┌───────┬──────────┬─────────────────────────────┐
  │ Card  │ Priority │             Why             │
  ├───────┼──────────┼─────────────────────────────┤
  │ Chase │ #1       │ Highest APR (likely 24.99%) │
  ├───────┼──────────┼─────────────────────────────┤
  │ PNC   │ #2       │ Medium APR                  │
  ├───────┼──────────┼─────────────────────────────┤
  │ Amex  │ #3       │ Lowest APR                  │
  └───────┴──────────┴─────────────────────────────┘
  Secret Weapon: Multiple Payments Per Month

  Credit cards charge interest on Average Daily Balance - pay bi-weekly and you'll save $100+/year extra.

  The 15/3 Rule

  - Pay 15 days before statement closes
  - Pay 3 days before statement closes
  - Lowers reported utilization AND reduces interest

  Can We Automate Payments?

  Plaid CANNOT make credit card payments (only reads data). Options:
  1. Set up autopay through each card issuer (Chase, Amex, PNC)
  2. Use Plaid for monitoring real-time balances
  3. Dashboard alerts you when to make extra payments

  ---
  2. INVESTMENT PLATFORM: ALPACA WINS
  ┌─────────────┬─────────────────────────┐
  │   Feature   │         Alpaca          │
  ├─────────────┼─────────────────────────┤
  │ Minimum     │ $1 (fractional shares)  │
  ├─────────────┼─────────────────────────┤
  │ Fees        │ $0 commission           │
  ├─────────────┼─────────────────────────┤
  │ API         │ Excellent documentation │
  ├─────────────┼─────────────────────────┤
  │ Auto-invest │ Yes (Rebalancing API)   │
  ├─────────────┼─────────────────────────┤
  │ Round-ups   │ Build custom with Plaid │
  └─────────────┴─────────────────────────┘
  Architecture:

  Farm Orders → Round-up calculated → Pool hits $5
                                          ↓
  Plaid monitors bank ← Monthly profit % calculated
                                          ↓
                      Alpaca API auto-invests
                                          ↓
                      VTI + VXUS + BND (3-fund portfolio)

  To start investing by end of next week:
  1. Sign up at https://alpaca.markets
  2. Fund with $100-500 to start
  3. I'll build the automation

  ---
  3. MICRO-INVESTING PROJECTIONS

  Round-Ups from Farm Orders

  - 200 orders/month × $0.50 avg = $100/month
  - Annual: $1,200 just from spare change

  At $150/month Total Investment (7% return):
  ┌───────┬────────────────┬────────────┬──────────┐
  │ Years │ You Contribute │ It Becomes │ Earnings │
  ├───────┼────────────────┼────────────┼──────────┤
  │ 10    │ $18,000        │ $26,000    │ $8,000   │
  ├───────┼────────────────┼────────────┼──────────┤
  │ 20    │ $36,000        │ $78,000    │ $42,000  │
  ├───────┼────────────────┼────────────┼──────────┤
  │ 30    │ $54,000        │ $183,000   │ $129,000 │
  └───────┴────────────────┴────────────┴──────────┘
  Your low-margin farm becomes a wealth machine.

  ---
  4. RETIREMENT (SEP-IRA)

  Key Findings:

  - Solo 401(k) NOT available - you have employees
  - SEP-IRA limit 2025: $70,000 or 25% of compensation
  - Catch: Must contribute same % for all eligible employees
  - 3-of-5 rule: Employees not eligible until worked 3 of last 5 years
  - No API automation - manual contributions to Vanguard/Fidelity/Schwab

  Recommendation:

  Open SEP-IRA at Vanguard or Fidelity ($0 fees). Contribute manually quarterly during profitable seasons.

  ---
  5. EMPLOYEE GAMIFICATION IDEAS

  Since you mentioned bonuses for milestones:
  - Harvest Volume Bonuses - Hit X lbs, get $Y
  - Perfect Attendance Streaks - Seasonal bonus
  - Delivery Completion Rate - Driver bonuses
  - Tenure Milestones - 1 year, 2 year celebrations
  - SEP-IRA eligibility after 3 years = major retention tool

  ---
  NEXT STEPS (When You're Ready)

  This Week:

  1. Open Alpaca account → https://alpaca.markets
  2. I'll build the Financial Dashboard with:
    - Real-time debt balances (manual entry to start, Plaid later)
    - Investment portfolio tracker
    - Debt Destroyer payment calculator
    - Compound growth projections

  Next Week:

  3. First investment via Alpaca ($100-500 to start)
  4. Connect Plaid for balance monitoring (optional)
  5. Automate round-ups from farm orders

  ---
  YOUR DEBT-FREE DATE (Estimated)

  With $600/month extra toward $20K debt:
  - Using Avalanche + bi-weekly payments
  - Debt-free in ~36-40 months (3-3.5 years)
  - Interest saved vs. minimums only: $8,000+

  ---
  Ready to build the dashboard when you wake up! 🚀

✻ Cooked for 39s



