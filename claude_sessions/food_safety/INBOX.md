# INBOX: Food_Safety Claude
## Assignment from PM_Architect

**Created:** 2026-01-16
**Priority:** HIGH
**Owner Request:** "I need to be able to have reports to present to inspectors at the drop of a dime"

---

## YOUR MISSION

Build a comprehensive GAP (Good Agricultural Practices) and FSMA (Food Safety Modernization Act) compliance system integrated into Tiny Seed OS.

**Goal:** One-click inspector-ready reports that can be generated instantly.

---

## CONTEXT

### Farm Details:
- **Farm:** Tiny Seed Farm LLC
- **Location:** 257 Zeigler Road, Rochester, PA 15074 (Beaver County)
- **Zone:** 6b
- **Certification:** OEFFA Certified Organic (#3839)
- **Size:** 6 acres (expanding to 10 in 2026)
- **Products:** 100+ vegetable varieties, cut flowers
- **Sales Channels:** CSA, farmers markets, wholesale restaurants, home delivery

### What Already Exists:
1. **Harvest logging** with lot numbers (`HARVEST_LOG` sheet)
2. **Seed lot traceability** with supplier tracking
3. **Farm inventory system** with photos
4. **Wildlife/pest logging** in employee app
5. **GPS tagging** on harvest records

### What's Missing:
1. Water testing logs
2. Worker training records
3. Pre-harvest inspection checklists
4. Cleaning/sanitization logs
5. Temperature monitoring logs
6. Corrective action documentation
7. **One-click compliance reports**

---

## DELIVERABLES

### Phase 1: Research (First Session)
- [ ] Research GAP certification requirements for PA produce farms
- [ ] Research FSMA Produce Safety Rule requirements
- [ ] Identify which rules apply to Tiny Seed's size/revenue
- [ ] Document all required record-keeping
- [ ] Create `GAP_FSMA_REQUIREMENTS.md`

### Phase 2: Data Model (Second Session)
- [ ] Design sheets for all compliance logs
- [ ] Create `COMPLIANCE_SHEET_SCHEMA.md`
- [ ] Identify integration points with existing systems

### Phase 3: Build (Sessions 3-4)
- [ ] Build compliance logging pages
- [ ] Build backend API endpoints
- [ ] Build **Inspector Report Generator**

### Phase 4: Reports (Session 5)
- [ ] One-click "Full Compliance Report" (PDF-ready)
- [ ] Traceback report (lot → customer in <30 seconds)
- [ ] Mock recall simulation test

---

## KEY COMPLIANCE AREAS TO RESEARCH

### GAP (Good Agricultural Practices):
1. **Worker Health & Hygiene**
   - Training documentation
   - Handwashing stations
   - Illness/injury policy

2. **Water Quality**
   - Agricultural water testing
   - Post-harvest water testing
   - Test frequency requirements

3. **Soil Amendments**
   - Compost application records
   - Application-to-harvest intervals

4. **Field Sanitation**
   - Wildlife intrusion
   - Animal exclusion
   - Adjacent land use

5. **Harvest & Post-Harvest**
   - Container cleanliness
   - Cooling procedures
   - Storage temps

6. **Traceability**
   - One-step back (inputs)
   - One-step forward (customers)
   - Lot coding system

### FSMA Produce Safety Rule:
1. **Covered vs Exempt** - Determine if Tiny Seed is covered
2. **Qualified Exemption** - <$500K and >50% direct sales?
3. **Agricultural Water** - Testing requirements
4. **Biological Soil Amendments** - Application standards
5. **Domesticated & Wild Animals** - Monitoring & assessment
6. **Worker Training** - Requirements & documentation
7. **Equipment & Tools** - Cleaning standards

---

## RESOURCES TO CHECK

### PA-Specific:
- PA Department of Agriculture GAP program
- Penn State Extension food safety resources
- PA Preferred certification (if applicable)

### Federal:
- FDA FSMA Produce Safety Rule
- USDA Harmonized GAP/GHP Audit

### Organic-Specific:
- OEFFA compliance overlap
- NOP organic handling requirements

---

## EXISTING FILES TO REVIEW

```
/apps_script/MERGED TOTAL.js - Look for:
  - HARVEST_LOG functions
  - SEED_INVENTORY functions
  - Employee app logging

/employee.html - Wildlife sighting feature
/harvest tracking endpoints
/seed_track.html - Lot traceability
```

---

## INTEGRATION REQUIREMENTS

The compliance system must integrate with:
1. **Employee app** - Workers log activities
2. **Harvest logging** - Link lots to compliance checks
3. **Seed inventory** - Input traceability
4. **Sales/orders** - Output traceability (who bought what lot)
5. **Mobile-friendly** - Inspectors may want to see on tablet

---

## REPORT OUTPUT REQUIREMENTS

**Inspector Report** should include:
1. Farm identification & certifications
2. Water testing records (last 12 months)
3. Worker training records
4. Pre-harvest inspection logs
5. Cleaning/sanitization logs
6. Corrective actions taken
7. Traceability demonstration
8. Any non-conformances and resolutions

**Format:**
- Web view (printable)
- PDF export
- Date range selectable
- One-click generation

---

## QUESTIONS TO ANSWER

1. Is Tiny Seed covered under FSMA or qualified exempt?
2. What specific GAP audit does PA require for wholesale?
3. What records must be kept and for how long?
4. What are the testing frequencies for water?
5. What training is required and how often?

---

## SUCCESS CRITERIA

**The system is complete when:**
1. Owner can generate full compliance report in <30 seconds
2. Any lot can be traced from seed to customer in <1 minute
3. All required logs have mobile-friendly entry points
4. Mock audit passes without missing records

---

*Food_Safety Claude - This is critical infrastructure. Restaurants and larger buyers will require this.*

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
