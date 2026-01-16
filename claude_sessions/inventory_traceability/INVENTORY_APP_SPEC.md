# Inventory App Specification
## Mobile-First Farm Inventory Capture

**Created:** 2026-01-16
**Purpose:** Walk around farm, take photos, document everything

---

## Core Concept

**Simple workflow:**
1. Open app on phone
2. Walk to item/area
3. Tap "Add Item"
4. Take photo
5. Fill quick form
6. Submit
7. Move to next

**Goal:** Capture entire farm inventory in one session (2-4 hours)

---

## Data Schema

| Field | Required | Type | Example |
|-------|----------|------|---------|
| Photo | Yes | Image | [camera capture] |
| Item Name | Yes | Text | "50 Gallon Sprayer" |
| Category | Yes | Dropdown | Equipment |
| Sub-category | No | Dropdown | Pest Control |
| Quantity | Yes | Number | 1 |
| Condition | Yes | Select | Good / Fair / Poor / Needs Repair |
| Location | Yes | Dropdown | Tool Shed |
| Est. Value | No | Currency | $200 |
| Serial/Model | No | Text | "Model ABC-123" |
| Purchase Date | No | Date | 2024-06-15 |
| Notes | No | Text | "Needs new nozzle" |
| Date Captured | Auto | Timestamp | 2026-01-16 10:32 AM |
| GPS | Auto | Coordinates | (if available) |

---

## Categories (Pre-defined)

### Primary Categories
1. **Equipment** - Tractors, tillers, mowers, sprayers
2. **Tools** - Hand tools, power tools, measuring
3. **Seeds & Transplants** - Inventory of planting materials
4. **Irrigation** - Hoses, drip tape, fittings, pumps
5. **Pest Control** - Sprayers, organic inputs, traps
6. **Soil Amendments** - Compost, fertilizers, minerals
7. **Packaging** - Boxes, bags, containers, labels
8. **Safety** - PPE, first aid, fire extinguishers
9. **Office** - Computers, printers, supplies
10. **Infrastructure** - Greenhouse parts, fencing, structures
11. **Vehicles** - Trucks, ATVs, trailers
12. **Other** - Miscellaneous items

### Location Options
- Tool Shed
- Greenhouse 1 / 2 / 3
- Equipment Barn
- Cold Storage / Cooler
- Wash/Pack Station
- Field Storage
- Office
- Personal Vehicle
- Other (specify)

---

## UI Design

### Home Screen
```
┌─────────────────────────────┐
│  🌱 Farm Inventory          │
│                             │
│  ┌───────────────────────┐  │
│  │   📷 ADD NEW ITEM     │  │
│  │   (big tap target)    │  │
│  └───────────────────────┘  │
│                             │
│  Today's Progress:          │
│  ████████░░░░░ 23 items     │
│                             │
│  [View All] [By Location]   │
└─────────────────────────────┘
```

### Add Item Screen
```
┌─────────────────────────────┐
│  ← Back       Add Item      │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │                       │  │
│  │    [Camera Preview]   │  │
│  │    📷 Tap to capture  │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Item Name *                │
│  ┌───────────────────────┐  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Category *      Qty *      │
│  [Equipment ▼]   [1    ]    │
│                             │
│  Condition *                │
│  ○ Good  ○ Fair  ○ Poor     │
│                             │
│  Location *                 │
│  [Tool Shed ▼]              │
│                             │
│  Est. Value        Notes    │
│  [$          ]   [        ] │
│                             │
│  ┌───────────────────────┐  │
│  │      ✓ SAVE ITEM      │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### After Save
```
┌─────────────────────────────┐
│        ✓ SAVED!             │
│                             │
│    "50 Gallon Sprayer"      │
│    added to Tool Shed       │
│                             │
│  ┌───────────────────────┐  │
│  │   📷 ADD ANOTHER      │  │
│  └───────────────────────┘  │
│                             │
│  [View All Items]           │
└─────────────────────────────┘
```

---

## Technical Implementation

### Option A: Google Form + Sheet (FASTEST)
- Create Google Form with camera upload
- Auto-populates Google Sheet
- Works on any phone immediately
- Export to accounting later

**Pros:** Ready in 30 minutes, no coding
**Cons:** Less polished UX, no offline

### Option B: Apps Script HTML (RECOMMENDED)
- Custom HTML served from Apps Script
- Matches existing Tiny Seed OS style
- Direct write to FARM_INVENTORY sheet
- Can add to existing system

**Pros:** Integrated, professional
**Cons:** 2-4 hours to build

### Option C: PWA with Offline (BEST UX)
- Progressive Web App
- Works offline, syncs later
- Camera API, GPS
- Install on home screen

**Pros:** Best experience
**Cons:** More complex, longer build

---

## Recommended: Option B

Build as Apps Script HTML page:
- File: `inventory_capture.html`
- Sheet: `FARM_INVENTORY`
- API: `addInventoryItem` (POST)

**Can reuse existing patterns from:**
- seed_inventory_PRODUCTION.html
- greenhouse.html
- mobile.html

---

## Sheet Schema: FARM_INVENTORY

| Column | Type | Notes |
|--------|------|-------|
| Item_ID | Auto | INV-001, INV-002... |
| Photo_URL | URL | Google Drive link |
| Item_Name | Text | Required |
| Category | Text | From dropdown |
| Sub_Category | Text | Optional |
| Quantity | Number | Default 1 |
| Condition | Text | Good/Fair/Poor/Needs Repair |
| Location | Text | From dropdown |
| Est_Value | Currency | Optional |
| Serial_Model | Text | Optional |
| Purchase_Date | Date | Optional |
| Notes | Text | Optional |
| Captured_Date | Timestamp | Auto |
| Captured_By | Text | User |
| GPS_Lat | Number | Auto if available |
| GPS_Lon | Number | Auto if available |
| Accounting_Category | Text | Auto-mapped |
| Depreciation_Type | Text | For equipment |

---

## Photo Handling

### Upload Flow
1. User taps camera icon
2. Phone camera opens (or file picker)
3. Photo captured/selected
4. Compressed to reasonable size (~500KB)
5. Uploaded to Google Drive (INVENTORY_PHOTOS folder)
6. URL stored in sheet

### Alternative: Base64
- Store directly in sheet (small photos only)
- Simpler but limited

### Recommended
- Google Drive folder for photos
- Sheet stores Drive URL
- Photos organized by date

---

## Offline Consideration

For initial version: **Online only is fine**

Owner will likely have cell signal on farm. Can add offline sync later if needed.

---

## Time Estimate to Build

| Component | Time |
|-----------|------|
| Sheet setup | 15 min |
| API endpoints | 30 min |
| HTML form | 1-2 hours |
| Photo upload | 1 hour |
| Testing | 30 min |
| **Total** | **3-4 hours** |

---

## Quick Win Alternative

If time is critical, use **Google Forms**:

1. Create form with:
   - Photo upload
   - Item name
   - Category dropdown
   - Quantity
   - Condition
   - Location
   - Notes

2. Link to Google Sheet

3. Share form link

**Ready in 30 minutes, owner can start immediately.**

---

*Spec complete. Recommend Option B (Apps Script) for integration, or Google Forms for immediate use.*
