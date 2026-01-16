# INBOX: Inventory Claude
## From: PM_Architect

**Updated:** 2026-01-15
**URGENT UPDATE:** 2026-01-16 - OVERNIGHT DIRECTIVE

---

## OVERNIGHT MISSION (Owner is sleeping - WORK AUTONOMOUSLY)

### PRIMARY ASSIGNMENT: INVENTORY APP + ACCOUNTING CATEGORIES

Owner needs to do inventory SOON. Build a system where they can walk around the farm, take pictures, and document everything.

#### Task 1: Inventory App Design

Create `/claude_sessions/inventory_traceability/INVENTORY_APP_SPEC.md`:

**Mobile-first inventory capture:**
- Walk around farm with phone
- Take photo of item/area
- Add notes (quantity, condition, location)
- Categorize automatically or manually
- Timestamp and GPS (if available)

**Standard format for inventory items:**
```
| Field | Required | Example |
|-------|----------|---------|
| Photo | Yes | [attached] |
| Item Name | Yes | "50 Gallon Sprayer" |
| Category | Yes | Equipment |
| Sub-category | No | Pest Control |
| Quantity | Yes | 1 |
| Condition | Yes | Good/Fair/Poor |
| Location | Yes | Tool Shed |
| Est. Value | No | $200 |
| Notes | No | "Needs new nozzle" |
| Date Captured | Auto | 2026-01-16 |
```

#### Task 2: Accounting Category Integration

**Coordinate with Accounting_Compliance Claude's categories:**

Map inventory to accounting categories:
- Seeds & Transplants → Inventory:Seeds
- Tools & Equipment → Fixed Assets:Equipment
- Pest & Disease Control → Inventory:Supplies
- Soil Amendments → Inventory:Amendments
- etc.

Create `/claude_sessions/inventory_traceability/CATEGORY_MAPPING.md`:
- Full mapping of inventory items to accounting categories
- Depreciation considerations for equipment
- COGS vs Capital expenditure guidance

#### Task 3: Inventory Checklist

Create `/claude_sessions/inventory_traceability/INVENTORY_CHECKLIST.md`:

**Areas to inventory:**
- [ ] Tool shed(s)
- [ ] Greenhouse
- [ ] Equipment storage
- [ ] Cold storage / cooler
- [ ] Wash/pack area
- [ ] Field equipment
- [ ] Irrigation supplies
- [ ] Seeds in storage
- [ ] Soil amendments
- [ ] Pest control supplies
- [ ] Packaging materials
- [ ] Office supplies
- [ ] Safety equipment

**For each area:**
- What to look for
- Categories to apply
- Common items to expect

#### Task 4: Quick Start Guide

Create `/claude_sessions/inventory_traceability/QUICK_START_INVENTORY.md`:

Owner should be able to pick up phone and start immediately:
1. Open [app/URL]
2. Go to first location
3. Take photo
4. Fill fields
5. Submit
6. Move to next item

Make it dead simple.

#### Deliverable: MORNING INVENTORY BRIEF

Create `/claude_sessions/inventory_traceability/MORNING_INVENTORY_BRIEF.md`:
- App design summary
- Category mapping overview
- Checklist ready to use
- Estimated time to complete full inventory
- What owner needs to do first

---

### SECONDARY ASSIGNMENT (If blocked on primary)

If you can't build the app interface or hit permissions:

**Inventory Management Research**
- Best practices for farm inventory
- What other farms track
- Useful metrics and reports
- Integration with accounting software

---

### URGENCY NOTE

Owner said: "I NEED TO DO INVENTORY SOOOON"

Prioritize making something USABLE over making something PERFECT.

---

### CHECK-IN PROTOCOL

Write to your OUTBOX when:
1. App spec complete
2. Category mapping done
3. Checklist ready
4. Morning brief finished

**PM_Architect will check your OUTBOX.**

---

*Inventory Claude - Make inventory capture fast and painless*
