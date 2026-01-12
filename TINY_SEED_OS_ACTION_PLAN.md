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

### PHASE 4: MOBILE & FIELD OPS (Days 22-35)
**Goal: Crew can log work from phones**

#### Week 5: GPS Auto-Detection
- [ ] Map bed coordinates (one-time setup)
- [ ] Auto-detect field/bed from location
- [ ] Pre-fill forms based on GPS

#### Week 6: Harvest Logging Mobile
- [ ] Touch-friendly interface
- [ ] QR code scanning
- [ ] Photo upload
- [ ] Offline mode with sync

#### Week 7: Kiosk Mode for Crew
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
