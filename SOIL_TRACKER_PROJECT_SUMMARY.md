# Soil Test Tracker Enhancement Project
## Project Summary - Last Updated: 2026-01-13

### Project Location
- **Main File**: `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/soil-tests.html`
- **Backend**: `/Users/samanthapollack/Documents/TIny_Seed_OS/web_app/APPS_SCRIPT_CODE.gs`
- **Google Sheet (Production)**: `128O56X_FN9_U-s0ENHBBRyLpae_yvWHPYbBheVlR3Vc`

---

## VISION: 40-Year Farm Learning System

This system is designed to become smarter over time by:
1. **Tracking all farm actions** - soil tests, amendments, plantings, harvests
2. **Recording outcomes** - yield quality, quantity, issues encountered
3. **Analyzing correlations** - what worked, what didn't, under what conditions
4. **Generating insights** - recommendations that improve with each season
5. **Adapting to microclimate** - learning your farm's unique conditions

---

## Implementation Status

### COMPLETED Features

#### Phase 1: Core Calculator Enhancements
- **Crop Nutritional Database** (50+ crops with N-P-K-pH requirements)
- **Crop selector** with grouped dropdown by category
- **Three calculator modes** (Efficient, Cost Effective, Inventory)
- **pH warnings** for crop compatibility
- **Plan Amendment workflow** with task creation

#### Phase 2: Farm Learning Infrastructure

##### Nutrient Groups (Lines 1756-1794)
```javascript
NUTRIENT_GROUPS = {
  heavyFeeders: { crops: [tomato, pepper, corn, celery, broccoli...], N: 100-200 },
  moderateFeeders: { crops: [lettuce, carrot, beet, onion...], N: 60-100 },
  lightFeeders: { crops: [radish, herbs, fennel...], N: 20-60 },
  nitrogenFixers: { crops: [beans, peas...], N: 0-40, soilBuilder: true }
}
```

##### Season Length Classifications (Lines 1800-1841)
- **Quick** (21-45 days): radish, arugula, lettuce - succession every 2 weeks
- **Short** (45-70 days): beans, cucumbers, beets - succession every 3 weeks
- **Medium** (70-100 days): carrots, broccoli, peppers - 1-2 plantings/season
- **Long** (100-150 days): tomatoes, winter squash, garlic - single planting
- **Perennial** (multi-year): asparagus, rhubarb

##### FarmLearning System (Lines 1848-2318)
Core learning database with methods:
- `recordSoilTest()` - Store soil test with field zone context
- `recordAmendment()` - Track amendment applications
- `recordCropPlanting()` - Log plantings with nutrient/season classification
- `recordYield()` - Capture harvest data with quality ratings
- `recordObservation()` - Document pests, diseases, weather events
- `analyzeYieldCorrelations()` - Automatically generate insights
- `getSmartRecommendations()` - AI-powered suggestions based on history
- `analyzeSoilTrend()` - Track soil health over multiple years
- `findSuccessfulAmendments()` - Identify what worked for specific crops
- `exportAllData()` / `importData()` - Backup/restore farm knowledge

##### FieldZoneManager (Lines 2324-2401)
Field zone management with:
- Zone attributes: name, acreage, soil type, drainage, sun exposure, microclimate
- Nutrient profile assignment (heavy/moderate/light feeders, N-fixers)
- Current and planned crops tracking
- Automatic stats calculation per zone

#### Phase 3: User Interface

##### Tabs (10 total)
1. **Current Tests** - Active soil test cards
2. **Archived** - Historical tests
3. **Compare** - Side-by-side test comparison
4. **Amendment Calculator** - Smart recommendations with crop/field awareness
5. **Plant Doctor** - Deficiency diagnosis, quick-fix recommendations, side-dressing tasks
6. **Amendments Database** - 70+ products with OMRI filtering
7. **Field Zones** - Zone management with nutrient grouping
8. **USDA Organic** - Compliance records with CSV export & Google Sheets sync
9. **Amendment History** - Planned/applied amendments tracking
10. **Farm Insights** - Learning dashboard with stats and insights

---

## Current File Structure (~6850 lines)

```
Lines 1-525:        HTML structure, CSS, tabs navigation
Lines 526-713:      Modals (detail, manual entry)
Lines 714-1162:     PDF parsing, data loading
Lines 1166-1330:    Test rendering, cards
Lines 1331-1625:    Compare view, tab switching, manual entry
Lines 1626-1750:    K_TARGETS, CROP_NUTRITION, CROP_CATEGORIES
Lines 1752-2401:    NUTRIENT_GROUPS, SEASON_LENGTH, FarmLearning, FieldZoneManager
Lines 2402-3087:    AMENDMENTS_DATABASE (70+ products)
Lines 3088-3310:    calculateTargets(), calculateDeficits(), calculateAmendments()
Lines 3311-3765:    Amendment Calculator UI (crop selector, modes, plan amendment)
Lines 3766-3925:    Amendments Database tab
Lines 3926-4260:    USDA Organic Compliance tab
Lines 4261-4360:    Amendment History tab
Lines 4362-4650:    Field Zones tab
Lines 4662-4841:    Farm Insights dashboard
Lines 4843-4858:    Utilities
```

---

## Data Storage Architecture

### localStorage Keys
| Key | Purpose |
|-----|---------|
| `plannedAmendments` | Planned/applied amendment records |
| `complianceRecords` | USDA organic compliance records |
| `farmLearn_soilHistory` | All soil tests with zone context |
| `farmLearn_amendmentHistory` | Amendment application records |
| `farmLearn_cropHistory` | Planting records with classifications |
| `farmLearn_yieldHistory` | Harvest data with quality ratings |
| `farmLearn_observations` | Pest, disease, weather observations |
| `farmLearn_fieldZones` | Field zone definitions |
| `farmLearn_insights` | System-generated insights |
| `farmLearn_microclimate` | Microclimate data |
| `farmLearn_lastModified` | Last data update timestamp |

---

## Smart Recommendation Logic

The system generates recommendations by:

1. **Analyzing Soil Trends** - Compare current vs historical tests
2. **Identifying Successful Patterns** - What amendments led to quality yields
3. **Checking Nutrient Group Conflicts** - Warn if too many different feeders planned
4. **Correlating Yields** - Link harvest quality to pre-planting conditions
5. **Learning from History** - Each recorded outcome improves future suggestions

Example insight generation:
```javascript
// When yield is recorded, system automatically:
// 1. Finds related soil test before planting
// 2. Finds amendments applied before planting
// 3. Creates correlation insight
// 4. Stores for future recommendations
```

---

## Remaining Tasks

### Backend Integration
- [x] Add `getSoilTests` endpoint to Apps Script
- [x] Add `saveSoilTest` endpoint
- [ ] Add `saveFieldZone` endpoint
- [ ] Add `syncFarmLearning` endpoint for cloud backup
- [x] Create SoilTests sheet in Google Sheets (auto-created on first use)
- [ ] Create FieldZones sheet
- [ ] Create FarmLearning sheet
- [x] Add `syncComplianceRecords` endpoint for organic compliance
- [x] Create ORGANIC_COMPLIANCE sheet (auto-created on first use)

### Feature Enhancements
- [x] Add product costs to AMENDMENTS_DATABASE for cost-effective mode
- [ ] Connect inventory system for products-on-hand mode
- [ ] Add yield entry form to Field Zones
- [ ] Add weather data integration (local station or API)
- [ ] Add crop rotation recommendations
- [ ] Add cover crop integration
- [ ] Add seasonal planning calendar view

---

## Progress Log

### 2026-01-13 - Session 7

**AEA Foliar Program System:**
- Comprehensive research on Advancing Eco Agriculture products, methodology, and Plant Health Pyramid
- Added new "Foliar Program" tab to web app navigation
- `AEA_PRODUCTS` database with 15 products across 3 tiers:
  - Tier 1 (Essential): BioCoat Gold, Spectrum, Rejuvenate, MacroPak, MicroPak
  - Tier 2 (Functional): Accelerate, SeaStim, Pinion, PhotoMag, Micro5000
  - Tier 3 (Targeted): ReBound Boron/Manganese/Iron, HoloCal, Holo-K
- `FOLIAR_RECIPES` with 6 standard tank mix recipes:
  - Base Nutrition Mix, Fruiting Crop Mix, Vegetative Crop Mix
  - Disease Prevention Mix, Cut Flower Mix, Stress Recovery Mix
- `CRITICAL_POINTS` database for spray timing windows (CPIs)
- `PLANT_HEALTH_PYRAMID` with 4 levels of plant immunity
- Schedule generation system:
  - Generate bi-weekly spray schedules
  - Select fields, duration (4-16 weeks), spray day
  - Full season program option rotates through recipes
- Quick Spray Task for one-off applications
- SOP generation for each spray task with:
  - Products and rates table
  - Pre-spray checklist (weather, water quality, equipment)
  - Mixing instructions
  - Best practices
  - Post-spray checklist
- Task completion records in FarmLearning system
- LocalStorage: `foliarSchedule`, `foliarTasks`

---

### 2026-01-13 - Session 6

**Plant Tissue Testing System:**
- Added complete tissue testing workflow following Penn State Extension recommendations
- Tissue Tests tab with Submit New Sample, Upload Results PDF, and drop zone
- Tissue sample submission generates printable PDF with:
  - Sample ID, collection date, crop, field zone, lot number
  - Mailing label for Penn State AASL
  - Sample tag for paper bag
  - Submission checklist
  - Penn State form reference links

**TISSUE_SUFFICIENCY Database (18 crops):**
- Vegetables (12): Tomato, Pepper, Lettuce, Cucumber, Broccoli, Cabbage, Carrot, Beet, Onion, Sweet Corn, Squash, Bean, Potato, Spinach, Celery
- Florals (6): Zinnia, Dahlia, Sunflower, Snapdragon, Lisianthus, Celosia, Ranunculus, Anemone
- Each crop includes: plantPart, growthStage, and sufficiency ranges for N, P, K, Ca, Mg, S, B, Zn, Mn, Fe, Cu
- Source: A&L Labs, Ohio State Extension, UMass Extension, Haifa Group

**Penn State Lab Integration:**
- Added `PENN_STATE_LAB` constant with address, phone, email, costs
- Regular analysis: $17 (N, P, K, Ca, Mg)
- With micronutrients: $23 (+ Fe, Mn, Zn, Cu, B)
- Pending samples tracking with Reprint Label, Enter Results, Cancel options

**Tissue Test PDF Upload & Parsing:**
- Added `handleTissuePdfUpload()` for uploading Penn State results PDFs
- Added `parsePennStateTissueReport()` with regex patterns for:
  - Sample ID, test date extraction
  - Macronutrients (% format): N, P, K, Ca, Mg, S
  - Micronutrients (ppm format): B, Zn, Mn, Fe, Cu
- Added `parseAlternativeTissueFormat()` for tabular layouts
- Added `showTissuePdfPreview()` modal for reviewing/editing extracted data
- Can link uploaded results to pending samples automatically
- `fillFromPendingSample()` auto-fills crop, field, lot number

**LocalStorage Keys Added:**
- `tissueTests` - Completed tissue analysis results
- `pendingTissueSamples` - Samples awaiting lab results

---

### 2026-01-13 - Session 5

**API & Field Configuration:**
- Updated `API_URL` to production endpoint: `https://script.google.com/macros/s/AKfycbxmiizjT_T2KI6ZZqAgDt49-8AvTPmq3penl4gSO2qPETMHVFtm0i90C47zGkwJ92vb/exec`
- Added `FARM_FIELDS` constant with 24 fields from production CSV:
  - Vegetable production fields (15 fields, ~5.0 acres)
  - Floral production fields (3 fields, ~0.6 acres)
  - Perennial production fields (2 fields, ~0.18 acres)
  - Fallow/rotation fields (4 fields, ~1.0 acres)
  - Each field includes: acreage, dimensions, bed count, production type
- Added `getFieldAcreage()` and `getFieldsByProduction()` helper functions

**Floral Crop Nutrition Database:**
- Added 24 cut flower crops to `CROP_NUTRITION`:
  - Annual heavy feeders: Zinnia, Sunflower, Dahlia, Lisianthus, Snapdragon, Celosia
  - Annual light feeders: Cosmos, Marigold, Statice, Strawflower, Gomphrena
  - Perennial cut flowers: Peony, Lily, Ranunculus, Anemone, Delphinium
  - Foliage/filler crops: Eucalyptus, Dusty Miller, Bupleurum
- Added 'floral' category to `CROP_CATEGORIES`
- Source: UMass Extension, University of Maryland Extension, Utah State University

**Recommended vs Actual Amendment Tracking:**
- Modified `markAmendmentCompleted()` to open edit modal instead of auto-completing
- Added `showEditAmendmentModal()` with editable fields for each amendment:
  - Shows recommended amount
  - Allows entering actual applied amount
  - Captures reason for any variance
  - Records application notes/conditions
- Added `saveActualAmendment()` function that:
  - Preserves original recommended amounts
  - Records actual amounts applied
  - Calculates variance percentage
  - Stores variance reasons
  - Syncs to Google Sheets compliance records
  - Records in FarmLearning system for analysis
- Updated `renderAmendmentHistory()` to display:
  - Recommended vs actual with color-coded variance
  - Variance percentage with (+/-) indicators
  - Variance reasons in italic
  - Application notes section

**PDF Learning Document Generator:**
- Added `generateAmendmentPDF()` function that creates printable learning documents
- PDF includes:
  - Header with location, crop, date, area
  - Soil test results if available (pH, OM, P, K, Ca, Mg)
  - Each amendment with recommended vs actual amounts
  - "WHY THIS AMENDMENT?" explanation boxes
  - Release speed and timing information
  - Scientific explanation of how each amendment works
  - Variance notes if amounts were adjusted
  - "What to Watch For" timeline (1-2 weeks, 3-4 weeks, etc.)
- Added helper functions:
  - `findAmendmentKey()` - maps material names to bioavailability keys
  - `getAmendmentExplanation()` - returns educational text for each amendment type

**Scientific Citations Added:**
- Added comprehensive source documentation to `AMENDMENT_BIOAVAILABILITY`:
  - Clemson Extension HGIC 1252: Organic fertilizer release times
  - NC State Extension: Lime reaction timing (6-24 months)
  - Ohio State NRCS 333: Gypsum persistence (~1 year)
  - University of Georgia AESL: 24 organic fertilizers tested (25-93% N availability)
  - Oregon State Extension: Blood meal vs feather meal release rates
  - SARE Research: Potassium solubilization mechanisms

### 2026-01-13 - Session 4

**Amendment Bioavailability System:**
- Added `AMENDMENT_BIOAVAILABILITY` database (~40 products) with:
  - `releaseSpeed`: immediate, fast, medium_fast, medium, slow, very_slow
  - `daysToAvailable`: days until peak nutrient availability
  - `daysToFullEffect`: days until full effect
  - `persistenceYears`: how long amendment shows in soil tests
  - `waterSoluble`: boolean for foliar/fertigation use
  - `canSideDress`: boolean for mid-season application
  - `foliarRate`: rate for foliar spray when applicable
- Added `RELEASE_SPEEDS` lookup for color-coded UI display
- Added `getQuickFixAmendments()` function for fast-acting options
- Added `checkRecentSlowReleaseApplications()` to warn about pending slow-release effects

**Nutrient Deficiency Symptoms Database:**
- Added `DEFICIENCY_SYMPTOMS` for 12 nutrients (N, P, K, Ca, Mg, S, Fe, Mn, B, Zn, Cu)
- Each entry includes:
  - Visual symptoms list
  - Nutrient mobility (affects diagnosis - old vs new leaves)
  - Common conditions causing deficiency
  - Quick-fix amendments with rates and speeds
  - Foliar spray options for fastest correction
  - "Don't confuse with" for differential diagnosis
- Added `analyzeSymptoms()` function for diagnosis scoring

**Side-Dressing Schedules:**
- Added `SIDE_DRESSING_SCHEDULES` for 12 heavy-feeding crops:
  - Tomato, Pepper, Sweet Corn, Broccoli, Cabbage, Cauliflower
  - Celery, Melon, Watermelon, Potato, Leek
- Each schedule includes:
  - Multiple feeding stages (timing in days from transplant)
  - Specific amendments with rates and purposes
  - Foliar spray options where applicable
  - Watch-for symptoms for each crop
- Added `generateSideDressingTasks()` function for task integration

**Plant Doctor Tab (New):**
- Visual Symptom Checker with 10 common symptoms
- Photo upload for AI-assisted analysis (framework in place)
- Diagnosis results with:
  - Most likely deficiency with confidence score
  - Mobile vs immobile nutrient explanation
  - Quick-fix options with release speeds
  - Foliar spray options
  - "Also consider" alternatives
  - "Don't confuse with" warnings
- Side-Dressing Schedule Generator:
  - Select crop, planting date, field zone
  - Preview feeding schedule with dates
  - Generate tasks stored in localStorage
- Amendment Release Speed Reference guide

### 2026-01-13 - Session 3

**Cost-Effective Calculator Mode:**
- Added AMENDMENT_COSTS database with ~40 products (price per 50lb bag, cost per lb)
- Implemented `calculateAmendmentsCostEffective()` function that:
  - Chooses cheapest options per nutrient based on pH needs
  - Uses multi-nutrient products like K-Mag when beneficial
  - Calculates total estimated cost per acre
  - Returns TOTAL ESTIMATED COST row in recommendations
- Wired up cost-effective mode to Amendment Calculator UI
- Added cost column to recommendations table when in cost-effective mode
- Updated "Plan Amendment" workflow to use cost-effective calculations when selected

**Google Sheets Backend Sync:**
- Added ORGANIC_COMPLIANCE, SOIL_TESTS, FIELD_ZONES tabs to Apps Script CONFIG
- Implemented `saveComplianceRecord()`, `syncComplianceRecords()`, `getComplianceRecords()` endpoints
- Implemented `saveSoilTest()`, `getSoilTests()` endpoints
- Added auto-sync to Sheets when amendments are marked as "Applied"
- Added `syncComplianceRecordsToSheets()` frontend function
- Added "Sync to Sheets" button on USDA Organic Compliance tab
- Added sync status indicator showing synced/pending records

**UI Polish:**
- Made tabs scrollable on mobile with smooth scrolling
- Added responsive styles for smaller screens
- Added info toast style
- Updated header with "Farm Learning System - Building 40 Years of Knowledge" subtitle
- Fixed template literal nesting issues in recommendation table
- Created `buildRecommendationRow()` helper function for cleaner code

### 2026-01-13 - Session 2 (Continued)

**Farm Learning System Implementation:**
- Added NUTRIENT_GROUPS constant (heavy/moderate/light feeders, N-fixers)
- Added SEASON_LENGTH classifications (quick/short/medium/long/perennial)
- Built FarmLearning database object with:
  - Data recording functions for all farm actions
  - Analysis functions for correlations and trends
  - Smart recommendation engine
  - Export/import for data backup
- Built FieldZoneManager for zone CRUD operations
- Added Field Zones management tab with:
  - Zone creation/editing with nutrient profiles
  - Current crops assignment
  - Microclimate notes
  - Performance statistics display
- Added Farm Insights dashboard with:
  - Summary statistics (years, tests, amendments, yields)
  - System-generated insights display
  - Field zone performance comparison
  - Data export/import functionality
  - Getting started guide

**Earlier in Session:**
- Added CROP_NUTRITION database (50+ crops)
- Enhanced Amendment Calculator with crop selection
- Added three calculator modes
- Added "Plan This Amendment" workflow
- Added USDA Organic Compliance tab
- Added Amendment History tab

### 2026-01-13 - Session 1
- Initial project exploration
- Created project summary

---

## Design Philosophy

### Smart Planting Groups
Group crops by nutrient needs in the same field zones:
- Heavy feeders together (tomatoes, corn, brassicas)
- Moderate feeders together (lettuce, carrots, onions)
- Light feeders together (herbs, radishes)
- Nitrogen fixers for soil building (beans, peas)

### Season-Aware Planning
- Quick crops for succession planting in gaps
- Short season crops between long season harvests
- Perennials in dedicated permanent beds

### Learning Over Time
Every action recorded contributes to farm knowledge:
- Soil Test → Baseline conditions
- Amendment → Treatment applied
- Planting → What was grown
- Yield → Outcome measurement
- Observation → Environmental context

Over 40 years, this creates a comprehensive dataset of what works on YOUR farm.

---

## Notes
- **PRESERVE ALL EXISTING FEATURES** - Don't break what works
- All new data stored in localStorage until backend endpoints ready
- Export farm data regularly for backup
- System designed for long-term (40+ years) data accumulation
- Microclimate notes are critical for local adaptation

Now let me compile this research into a comprehensive analysis and then build the system into your web app.

  ---  SO I ADDED THIS BECAUSE I HAD TO CLEAR OUR LAST CONVERSATION. HOPEFULLY THIS PROVIDES ENOUGH CONTEXT--
  Advancing Eco Agriculture (AEA) Analysis & Recommendations

  Executive Summary

  Based on extensive research, AEA products represent a paradigm shift from reactive pest/disease management to proactive plant health optimization. The system is built on solid science (John Kempf's Plant Health Pyramid) and has been validated on 4+ million acres worldwide. For your 7-acre diversified vegetable and flower farm, this approach could:

  1. Reduce pesticide dependency by 80-100% within 2-3 seasons
  2. Increase yields 15-40% through optimized photosynthesis
  3. Improve crop quality (Brix, shelf life, flavor)
  4. Build soil biology that compounds benefits year over year

  ---
  The Science: Plant Health Pyramid
  ┌───────┬───────────────────────────────────────┬──────────────────────┬────────────┐
  │ Level │            Immunity Gained            │  Required Minerals   │  Timeline  │
  ├───────┼───────────────────────────────────────┼──────────────────────┼────────────┤
  │ 1     │ Soil-borne fungi (fusarium, pythium)  │ Mg, Fe, Mn, N, P     │ 2-4 weeks  │
  ├───────┼───────────────────────────────────────┼──────────────────────┼────────────┤
  │ 2     │ Sucking/larval insects (aphids,       │ Mg, S, Mo, B         │ 24-48      │
  │       │ hornworms)                            │                      │ hours      │
  ├───────┼───────────────────────────────────────┼──────────────────────┼────────────┤
  │ 3     │ Airborne pathogens (powdery mildew,   │ Functional soil      │ 1-2        │
  │       │ rust)                                 │ biology              │ seasons    │
  ├───────┼───────────────────────────────────────┼──────────────────────┼────────────┤
  │ 4     │ Chewing insects (beetles), nematodes  │ Diverse microbiome   │ 2-3        │
  │       │                                       │                      │ seasons    │
  └───────┴───────────────────────────────────────┴──────────────────────┴────────────┘
  Key Insight: Levels 1-2 are achievable through foliar nutrition alone. Levels 3-4 require building soil biology - a longer investment but with compounding returns.

  ---
  Recommended AEA Product Stack for Your Farm

  TIER 1: ESSENTIAL (Start Here - ~$300-400/season)
  ┌────────────┬────────────┬───────────┬─────────────┬──────────────────────────────┐
  │  Product   │  Purpose   │   Rate    │  Frequency  │        Why Essential         │
  ├────────────┼────────────┼───────────┼─────────────┼──────────────────────────────┤
  │ BioCoat    │ Seed       │ 1g/lb     │ At planting │ 30-50% better germination,   │
  │ Gold       │ treatment  │ seed      │             │ stronger seedlings           │
  ├────────────┼────────────┼───────────┼─────────────┼──────────────────────────────┤
  │ Spectrum   │ Soil       │ 1-2       │ 2-3x/season │ Restores beneficial microbes │
  │            │ inoculant  │ gal/acre  │             │                              │
  ├────────────┼────────────┼───────────┼─────────────┼──────────────────────────────┤
  │ Rejuvenate │ Microbial  │ 1-2       │ With        │ Feeds the biology you're     │
  │            │ food       │ gal/acre  │ Spectrum    │ adding                       │
  ├────────────┼────────────┼───────────┼─────────────┼──────────────────────────────┤
  │ MacroPak   │ Macro      │ 2 qt/acre │ Bi-weekly   │ N-P-K-Ca-Mg-S in             │
  │            │ foliar     │           │             │ plant-available forms        │
  ├────────────┼────────────┼───────────┼─────────────┼──────────────────────────────┤
  │ MicroPak   │ Micro      │ 1 pt/acre │ Bi-weekly   │ B-Co-Cu-Fe-Mo-Mn-Zn          │
  │            │ foliar     │           │             │                              │
  └────────────┴────────────┴───────────┴─────────────┴──────────────────────────────┘
  TIER 2: FUNCTIONAL (Add in Year 2 - ~$200-300 additional)
  ┌────────────┬─────────────────────┬─────────────┬──────────────────────────────────┐
  │  Product   │       Purpose       │    Rate     │              Timing              │
  ├────────────┼─────────────────────┼─────────────┼──────────────────────────────────┤
  │ Accelerate │ Flowering support   │ 2-4         │ 1-2 weeks pre-bloom, then        │
  │            │                     │ gal/acre    │ bi-weekly                        │
  ├────────────┼─────────────────────┼─────────────┼──────────────────────────────────┤
  │ SeaStim    │ Vegetative crops    │ 2 qt/acre   │ Bi-weekly on leafy greens        │
  ├────────────┼─────────────────────┼─────────────┼──────────────────────────────────┤
  │ Pinion     │ Disease prevention  │ 2-3 qt/acre │ Monthly preventative             │
  ├────────────┼─────────────────────┼─────────────┼──────────────────────────────────┤
  │ PhotoMag   │ Photosynthesis      │ 2 qt/acre   │ Before/after stress events       │
  │            │ boost               │             │                                  │
  └────────────┴─────────────────────┴─────────────┴──────────────────────────────────┘
  TIER 3: TARGETED (Based on Sap Analysis)
  ┌───────────────────┬─────────────────────────────────────────┐
  │      Product      │               When to Use               │
  ├───────────────────┼─────────────────────────────────────────┤
  │ ReBound Boron     │ Fruit set issues, hollow stem           │
  ├───────────────────┼─────────────────────────────────────────┤
  │ ReBound Manganese │ Interveinal chlorosis, poor germination │
  ├───────────────────┼─────────────────────────────────────────┤
  │ ReBound Iron      │ Yellowing new leaves                    │
  ├───────────────────┼─────────────────────────────────────────┤
  │ HoloCal           │ Blossom end rot, tip burn               │
  ├───────────────────┼─────────────────────────────────────────┤
  │ Holo-K            │ Poor fruit quality, weak stems          │
  └───────────────────┴─────────────────────────────────────────┘
  ---
  The Compelling Argument

  Why This Matters for a 40-Year Farm

  1. Soil Biology Compounds: Every application of Spectrum + Rejuvenate builds microbial populations. Year 1 you're establishing. Year 5 you're maintaining. Year 20 the soil does most of the work.
  2. Break the Pesticide Cycle: Pesticides kill soil biology → weaker plants → more pests → more pesticides. AEA breaks this by building plant immunity from the inside out.
  3. Labor Efficiency: Healthy plants need less intervention. Less scouting for pests, less responding to disease outbreaks, less emergency applications.
  4. Quality Premium: Higher Brix = longer shelf life, better flavor, potential premium pricing.
  5. Cost Reduction Over Time: Year 1 you're investing in biology. By Year 3-5, reduced fertilizer needs (30-40% less) and eliminated pesticide costs often offset the AEA product cost entirely.

  Real Results from AEA Growers

  - 59% reduction in powdery mildew severity (Pinion trials)
  - 39% more pods per plant in soybeans with Accelerate
  - Apple growers reporting scab immunity after 2 seasons
  - 10,000+ growers on 4 million acres worldwide

  ---
  Practical Implementation: Your SOP System

  The Weekly Spray Schedule

  For a 7-acre farm with limited time, here's a realistic spray protocol:

  SPRAY DAY: Every Tuesday Evening (after 5 PM)
  ┌────────┬────────────────────────────────────────────────────┬─────────────────┐
  │  Week  │                      Tank Mix                      │  Target Crops   │
  ├────────┼────────────────────────────────────────────────────┼─────────────────┤
  │ Week 1 │ MacroPak (4 parts) + MicroPak (1 part) + Micro5000 │ All crops       │
  ├────────┼────────────────────────────────────────────────────┼─────────────────┤
  │ Week 2 │ Accelerate + MicroPak + Pinion                     │ Fruiting crops  │
  ├────────┼────────────────────────────────────────────────────┼─────────────────┤
  │ Week 3 │ MacroPak (4 parts) + MicroPak (1 part) + Micro5000 │ All crops       │
  ├────────┼────────────────────────────────────────────────────┼─────────────────┤
  │ Week 4 │ SeaStim + MicroPak + Pinion                        │ Leafy/Veg crops │
  └────────┴────────────────────────────────────────────────────┴─────────────────┘
  Repeat cycle throughout growing season

  Critical Points of Influence (CPIs)

  These are the "don't miss" spray windows:
  ┌───────────────┬───────────────────┬──────────────────────┬────────────────────┐
  │      CPI      │      Timing       │       Products       │      Purpose       │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Germination   │ Seed treatment    │ BioCoat Gold         │ Strong start       │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Transplant    │ Day of transplant │ Spectrum drench      │ Root establishment │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Pre-Bloom     │ 1-2 weeks before  │ Accelerate + Boron   │ Flower set         │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Fruit Set     │ At petal fall     │ HoloCal + Accelerate │ Prevent BER        │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Fruit Fill    │ Mid-development   │ PhotoMag + K         │ Size and quality   │
  ├───────────────┼───────────────────┼──────────────────────┼────────────────────┤
  │ Stress Events │ Before/after      │ PhotoMag             │ Recovery           │
  └───────────────┴───────────────────┴──────────────────────┴────────────────────┘
  ---
  Now let me build this into your web app with a complete foliar/fertigation scheduling system.

⏺ Read(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Read 20 lines

⏺ Update(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Added 1 line                                                               
      548              <div class="tab" data-tab="fieldZones" onclick="switchTab
           ('fieldZones')">Field Zones</div>
      549              <div class="tab" data-tab="compliance" onclick="switchTab
           ('compliance')">USDA Organic</div>
      550              <div class="tab" data-tab="history" onclick="switchTab('h
           istory')">Amendment History</div>
      551 +            <div class="tab" data-tab="foliarProgram" onclick="switch
          +Tab('foliarProgram')">Foliar Program</div>                           
      552              <div class="tab" data-tab="insights" onclick="switchTab('
           insights')">Farm Insights</div>
      553          </div>
      554  

⏺ Now let me add the foliarProgram case to the renderTests function.

⏺ Read(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Read 30 lines

⏺ Update(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Added 3 lines                                                              
      1284              } else if (currentTab === 'tissueTests') {
      1285                  renderTissueTests();
      1286                  return;
      1287 +            } else if (currentTab === 'foliarProgram') {            
      1288 +                renderFoliarProgram();                              
      1289 +                return;                                             
      1290              }
      1291  
      1292              if (filteredTests.length === 0) {

⏺ Now I need to add the AEA products database and the complete foliar program system. Let me find the right location to add it.

⏺ Read(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Read 20 lines

⏺ Update(Documents/TIny_Seed_OS/web_app/soil-tests.html)
  ⎿  Added 1036 lines                                                           
      8360          }
      8361  
      8362          // ============================================
      8363 +        // FOLIAR PROGRAM - AEA Products & Scheduling               
      8364 +        // Based on Advancing Eco Agriculture methodology           
      8365 +        // ============================================             
      8366 +                                                                    
      8367 +        // AEA Products Database - Source: advancingecoag.com       
      8368 +        const AEA_PRODUCTS = {                                      
      8369 +            // ESSENTIALS - Foundation products                     
      8370 +            biocoatGold: {                                          
      8371 +                name: 'BioCoat Gold',                               
      8372 +                category: 'seed_treatment',                         
      8373 +                purpose: 'Seed germination catalyst with mycorrhizal
           + inoculant',                                                        
      8374 +                ratePerAcre: '1 gram per pound of seed',            
      8375 +                ratePerSqFt: 'Mix with seed before planting',       
      8376 +                timing: 'At planting',                              
      8377 +                frequency: 'Once',                                  
      8378 +                organic: true,                                      
      8379 +                tier: 1,                                            
      8380 +                priceEstimate: 50, // per unit                      
      8381 +                benefits: ['30-50% better germination', 'Stronger se
           +edlings', 'Earlier root establishment']                             
      8382 +            },                                                      
      8383 +            spectrum: {                                             
      8384 +                name: 'Spectrum',                                   
      8385 +                category: 'soil_biology',                           
      8386 +                purpose: 'Soil inoculant with beneficial microorgani
           +sms',                                                               
      8387 +                ratePerAcre: '1-2 gal',                             
      8388 +                ratePerSqFt: '3-6 oz per 1000 sqft',                
      8389 +                timing: 'Soil prep, transplant, mid-season',        
      8390 +                frequency: '2-3x per season',                       
      8391 +                organic: true,                                      
      8392 +                tier: 1,                                            
      8393 +                priceEstimate: 45,                                  
      8394 +                benefits: ['Restores soil microbiome', 'Nutrient cyc
           +ling', 'Disease suppression']                                       
      8395 +            },                                                      
      8396 +            rejuvenate: {                                           
      8397 +                name: 'Rejuvenate',                                 
      8398 +                category: 'soil_biology',                           
      8399 +                purpose: 'Microbial food - feeds soil biology',     
      8400 +                ratePerAcre: '1-2 gal',                             
      8401 +                ratePerSqFt: '3-6 oz per 1000 sqft',                
      8402 +                timing: 'Apply with Spectrum',                      
      8403 +                frequency: '2-3x per season',                       
      8404 +                organic: true,                                      
      8405 +                tier: 1,                                            
      8406 +                priceEstimate: 40,                                  
      8407 +                benefits: ['Activates dormant biology', 'Increases m
           +icrobial diversity', 'Improves nutrient availability']              
      8408 +            },                                                      
      8409 +            macroPak: {                                             
      8410 +                name: 'MacroPak',                                   
      8411 +                category: 'foliar_nutrition',                       
      8412 +                purpose: 'Complete macronutrient formula (N-P-K-Ca-M
           +g-S)',                                                              
      8413 +                ratePerAcre: '2 qt foliar / 2 gal fertigation',     
      8414 +                ratePerSqFt: '1.5 oz foliar / 6 oz fertigation per 1
           +000 sqft',                                                          
      8415 +                timing: 'Throughout growing season',                
      8416 +                frequency: 'Bi-weekly',                             
      8417 +                organic: true,                                      
      8418 +                tier: 1,                                            
      8419 +                priceEstimate: 27,                                  
      8420 +                benefits: ['Complete macros', 'Supports photosynthes
           +is', 'Plant available forms']                                       
      8421 +            },                                                      
      8422 +            microPak: {                                             
      8423 +                name: 'MicroPak',                                   
      8424 +                category: 'foliar_nutrition',                       
      8425 +                purpose: 'Essential micronutrients (B-Co-Cu-Fe-Mo-Mn
           +-Zn)',                                                              
      8426 +                ratePerAcre: '1 pt foliar',                         
      8427 +                ratePerSqFt: '0.5 oz per 1000 sqft',                
      8428 +                timing: 'Throughout growing season',                
      8429 +                frequency: 'Bi-weekly',                             
      8430 +                organic: true,                                      
      8431 +                tier: 1,                                            
      8432 +                priceEstimate: 25,                                  
      8433 +                benefits: ['8 essential micros', 'Enzyme activation'
           +, 'Chlorophyll production']                                         
      8434 +            },                                                      
      8435 +            // FUNCTIONAL - Strategic timing products               
      8436 +            accelerate: {                                           
      8437 +                name: 'Accelerate',                                 
      8438 +                category: 'functional',                             
      8439 +                purpose: 'Flowering and fruiting support',          
      8440 +                ratePerAcre: '2-4 gal',                             
      8441 +                ratePerSqFt: '6-12 oz per 1000 sqft',               
      8442 +                timing: '1-2 weeks before bloom, then bi-weekly for 
           +continuous croppers',                                               
      8443 +                frequency: 'As needed during reproductive phase',   
      8444 +                organic: true,                                      
      8445 +                tier: 2,                                            
      8446 +                priceEstimate: 32,                                  
      8447 +                benefits: ['Better fruit set', 'Increased pod count'
           +, 'Quality improvement']                                            
      8448 +            },                                                      
      8449 +            seaStim: {                                              
      8450 +                name: 'SeaStim',                                    
      8451 +                category: 'functional',                             
      8452 +                purpose: 'Kelp-based vegetative growth support',    
      8453 +                ratePerAcre: '2 qt',                                
      8454 +                ratePerSqFt: '1.5 oz per 1000 sqft',                
      8455 +                timing: 'During vegetative growth',                 
      8456 +                frequency: 'Bi-weekly',                             
      8457 +                organic: true,                                      
      8458 +                tier: 2,                                            
      8459 +                priceEstimate: 35,                                  
      8460 +                benefits: ['Root development', 'Stress resistance', 
           +'Vegetative vigor']                                                 
      8461 +            },                                                      
      8462 +            pinion: {                                               
      8463 +                name: 'Pinion',                                     
      8464 +                category: 'disease_prevention',                     
      8465 +                purpose: 'Foliar disease prevention without disrupti
           +ng microbiome',                                                     
      8466 +                ratePerAcre: '2-3 qt preventative / 1 gal responsive
           +',                                                                  
      8467 +                ratePerSqFt: '1.5-3 oz per 1000 sqft',              
      8468 +                timing: '30 days after germination, then monthly',  
      8469 +                frequency: 'Monthly preventative or as needed',     
      8470 +                organic: true,                                      
      8471 +                tier: 2,                                            
      8472 +                priceEstimate: 20,                                  
      8473 +                benefits: ['59% reduction in powdery mildew', 'Broad
           + spectrum', 'Safe for beneficials']                                 
      8474 +            },                                                      
      8475 +            photoMag: {                                             
      8476 +                name: 'PhotoMag',                                   
      8477 +                category: 'functional',                             
      8478 +                purpose: 'Photosynthesis optimizer',                
      8479 +                ratePerAcre: '2 qt',                                
      8480 +                ratePerSqFt: '1.5 oz per 1000 sqft',                
      8481 +                timing: 'Before/after stress events, during fruit fi
           +ll',                                                                
      8482 +                frequency: 'As needed',                             
      8483 +                organic: true,                                      
      8484 +                tier: 2,                                            
      8485 +                priceEstimate: 30,                                  
      8486 +                benefits: ['3-4x photosynthesis increase', 'Stress r
           +ecovery', 'Sugar production']                                       
      8487 +            },                                                      
      8488 +            micro5000: {                                            
      8489 +                name: 'Micro5000 Organic',                          
      8490 +                category: 'biological',                             
      8491 +                purpose: 'Foliar microbial inoculant',              
      8492 +                ratePerAcre: '75 grams',                            
      8493 +                ratePerSqFt: '2 grams per 1000 sqft',               
      8494 +                timing: 'Add to foliar tank mixes',                 
      8495 +                frequency: 'Every spray',                           
      8496 +                organic: true,                                      
      8497 +                tier: 2,                                            
      8498 +                priceEstimate: 49,                                  
      8499 +                benefits: ['Leaf surface colonization', 'Nutrient so
           +lubilization', 'Disease competition']                               
      8500 +            },                                                      
      8501 +            // NUTRITIONAL - Targeted corrections                   
      8502 +            reboundBoron: {                                         
      8503 +                name: 'ReBound Boron',                              
      8504 +                category: 'micronutrient',                          
      8505 +                purpose: 'Chelated boron for fruit set and cell wall
           +s',                                                                 
      8506 +                ratePerAcre: '1-2 pt',                              
      8507 +                ratePerSqFt: '0.5-1 oz per 1000 sqft',              
      8508 +                timing: 'Pre-bloom, fruit set',                     
      8509 +                frequency: 'As indicated by sap/tissue analysis',   
      8510 +                organic: true,                                      
      8511 +                tier: 3,                                            
      8512 +                priceEstimate: 23,                                  
      8513 +                benefits: ['Better pollination', 'Strong cell walls'
           +, 'Prevents hollow stem']                                           
      8514 +            },                                                      
      8515 +            reboundManganese: {                                     
      8516 +                name: 'ReBound Manganese',                          
      8517 +                category: 'micronutrient',                          
      8518 +                purpose: 'Chelated manganese for photosynthesis',   
      8519 +                ratePerAcre: '1-2 pt',                              
      8520 +                ratePerSqFt: '0.5-1 oz per 1000 sqft',              
      8521 +                timing: 'When deficiency indicated',                
      8522 +                frequency: 'As needed',                             
      8523 +                organic: true,                                      
      8524 +                tier: 3,                                            
      8525 +                priceEstimate: 25,                                  
      8526 +                benefits: ['Chlorophyll production', 'Water splittin
           +g in photosynthesis', 'Enzyme activation']                          
      8527 +            },                                                      
      8528 +            reboundIron: {                                          
      8529 +                name: 'ReBound Iron',                               
      8530 +                category: 'micronutrient',                          
      8531 +                purpose: 'Chelated iron for chlorophyll',           
      8532 +                ratePerAcre: '1-2 pt',                              
      8533 +                ratePerSqFt: '0.5-1 oz per 1000 sqft',              
      8534 +                timing: 'When deficiency indicated',                
      8535 +                frequency: 'As needed',                             
      8536 +                organic: true,                                      
      8537 +                tier: 3,                                            
      8538 +                priceEstimate: 22,                                  
      8539 +                benefits: ['Chlorophyll assembly', 'Dark green folia
           +ge', 'Enzyme function']                                             
      8540 +            },                                                      
      8541 +            holoCal: {                                              
      8542 +                name: 'HoloCal',                                    
      8543 +                category: 'macronutrient',                          
      8544 +                purpose: 'Fast-acting bioavailable calcium',        
      8545 +                ratePerAcre: '2-4 qt',                              
      8546 +                ratePerSqFt: '1.5-3 oz per 1000 sqft',              
      8547 +                timing: 'Fruit development, high demand periods',   
      8548 +                frequency: 'Weekly during fruit fill',              
      8549 +                organic: true,                                      
      8550 +                tier: 3,                                            
      8551 +                priceEstimate: 40,                                  
      8552 +                benefits: ['Prevents BER', 'Cell wall strength', 'Sh
           +elf life improvement']                                              
      8553 +            },                                                      
      8554 +            holoK: {                                                
      8555 +                name: 'Holo-K',                                     
      8556 +                category: 'macronutrient',                          
      8557 +                purpose: 'Potassium for fruit quality',             
      8558 +                ratePerAcre: '2-4 qt',                              
      8559 +                ratePerSqFt: '1.5-3 oz per 1000 sqft',              
      8560 +                timing: 'Fruit sizing and ripening',                
      8561 +                frequency: 'Weekly during fruit fill',              
      8562 +                organic: true,                                      
      8563 +                tier: 3,                                            
      8564 +                priceEstimate: 53,                                  
      8565 +                benefits: ['Sugar transport', 'Fruit size', 'Color d
           +evelopment']                                                        
      8566 +            }                                                       
      8567 +        };                                                          
      8568 +                                                                    
      8569 +        // Standard Tank Mix Recipes                                
      8570 +        const FOLIAR_RECIPES = {                                    
      8571 +            baseNutrition: {                                        
      8572 +                name: 'Base Nutrition Mix',                         
      8573 +                description: 'Bi-weekly foundation spray for all cro
           +ps',                                                                
      8574 +                products: [                                         
      8575 +                    { product: 'macroPak', parts: 4 },              
      8576 +                    { product: 'microPak', parts: 1 },              
      8577 +                    { product: 'micro5000', parts: 1 }              
      8578 +                ],                                                  
      8579 +                waterRatio: '10:1 minimum dilution',                
      8580 +                timing: 'Every 2 weeks, evening application',       
      8581 +                crops: 'all'                                        
      8582 +            },                                                      
      8583 +            fruitingCrops: {                                        
      8584 +                name: 'Fruiting Crop Mix',                          
      8585 +                description: 'For tomatoes, peppers, squash, cucumbe
           +rs during flowering/fruiting',                                      
      8586 +                products: [                                         
      8587 +                    { product: 'accelerate', parts: 4 },            
      8588 +                    { product: 'microPak', parts: 1 },              
      8589 +                    { product: 'micro5000', parts: 1 }              
      8590 +                ],                                                  
      8591 +                waterRatio: '10:1 minimum dilution',                
      8592 +                timing: 'Bi-weekly during reproductive phase',      
      8593 +                crops: ['tomato', 'pepper', 'squash', 'cucumber', 'm
           +elon', 'eggplant']                                                  
      8594 +            },                                                      
      8595 +            vegetativeCrops: {                                      
      8596 +                name: 'Vegetative Crop Mix',                        
      8597 +                description: 'For leafy greens, brassicas, root crop
           +s',                                                                 
      8598 +                products: [                                         
      8599 +                    { product: 'seaStim', parts: 4 },               
      8600 +                    { product: 'microPak', parts: 1 },              
      8601 +                    { product: 'micro5000', parts: 1 }              
      8602 +                ],                                                  
      8603 +                waterRatio: '10:1 minimum dilution',                
      8604 +                timing: 'Bi-weekly during growth',                  
      8605 +                crops: ['lettuce', 'spinach', 'kale', 'broccoli', 'c
           +abbage', 'carrot', 'beet']                                          
      8606 +            },                                                      
      8607 +            diseasePreventative: {                                  
      8608 +                name: 'Disease Prevention Mix',                     
      8609 +                description: 'Monthly preventative for disease-prone
           + crops',                                                            
      8610 +                products: [                                         
      8611 +                    { product: 'pinion', parts: 2 },                
      8612 +                    { product: 'macroPak', parts: 2 },              
      8613 +                    { product: 'microPak', parts: 1 }               
      8614 +                ],                                                  
      8615 +                waterRatio: '10:1 minimum dilution',                
      8616 +                timing: 'Monthly, starting 30 days after germination
           +',                                                                  
      8617 +                crops: ['tomato', 'squash', 'cucumber', 'zinnia', 'd
           +ahlia']                                                             
      8618 +            },                                                      
      8619 +            floralProduction: {                                     
      8620 +                name: 'Cut Flower Mix',                             
      8621 +                description: 'For dahlias, zinnias, sunflowers, lisi
           +anthus',                                                            
      8622 +                products: [                                         
      8623 +                    { product: 'accelerate', parts: 3 },            
      8624 +                    { product: 'macroPak', parts: 2 },              
      8625 +                    { product: 'microPak', parts: 1 }               
      8626 +                ],                                                  
      8627 +                waterRatio: '10:1 minimum dilution',                
      8628 +                timing: 'Bi-weekly from bud initiation through harve
           +st',                                                                
      8629 +                crops: ['dahlia', 'zinnia', 'sunflower', 'lisianthus
           +', 'snapdragon', 'celosia']                                         
      8630 +            },                                                      
      8631 +            stressRecovery: {                                       
      8632 +                name: 'Stress Recovery Mix',                        
      8633 +                description: 'After hail, frost, heat stress, transp
           +lant shock',                                                        
      8634 +                products: [                                         
      8635 +                    { product: 'photoMag', parts: 2 },              
      8636 +                    { product: 'seaStim', parts: 2 },               
      8637 +                    { product: 'micro5000', parts: 1 }              
      8638 +                ],                                                  
      8639 +                waterRatio: '10:1 minimum dilution',                
      8640 +                timing: 'Within 24 hours of stress event',          
      8641 +                crops: 'all'                                        
      8642 +            }                                                       
      8643 +        };                                                          
      8644 +                                                                    
      8645 +        // Critical Points of Influence - Key spray windows         
      8646 +        const CRITICAL_POINTS = {                                   
      8647 +            seedTreatment: {                                        
      8648 +                name: 'Seed Treatment',                             
      8649 +                daysFromPlanting: 0,                                
      8650 +                products: ['biocoatGold'],                          
      8651 +                priority: 'essential',                              
      8652 +                description: 'Coat seeds before planting for 30-50% 
           +better germination'                                                 
      8653 +            },                                                      
      8654 +            transplant: {                                           
      8655 +                name: 'Transplant Drench',                          
      8656 +                daysFromPlanting: 0,                                
      8657 +                products: ['spectrum', 'rejuvenate'],               
      8658 +                priority: 'essential',                              
      8659 +                description: 'Root zone drench at transplant establi
           +shes beneficial biology'                                            
      8660 +            },                                                      
      8661 +            earlyVegetative: {                                      
      8662 +                name: 'Early Vegetative',                           
      8663 +                daysFromPlanting: 14,                               
      8664 +                products: ['macroPak', 'microPak', 'seaStim'],      
      8665 +                priority: 'important',                              
      8666 +                description: 'Build strong plant structure and root 
           +system'                                                             
      8667 +            },                                                      
      8668 +            preBloom: {                                             
      8669 +                name: 'Pre-Bloom',                                  
      8670 +                daysFromPlanting: null, // varies by crop           
      8671 +                weeksBefore: 2,                                     
      8672 +                products: ['accelerate', 'reboundBoron', 'microPak']
           +,                                                                   
      8673 +                priority: 'critical',                               
      8674 +                description: 'Set up flower initiation and pollinati
           +on success'                                                         
      8675 +            },                                                      
      8676 +            fruitSet: {                                             
      8677 +                name: 'Fruit Set',                                  
      8678 +                daysFromPlanting: null,                             
      8679 +                weeksAfterBloom: 1,                                 
      8680 +                products: ['holoCal', 'accelerate', 'reboundBoron'],
      8681 +                priority: 'critical',                               
      8682 +                description: 'Prevent BER and ensure strong cell dev
           +elopment'                                                           
      8683 +            },                                                      
      8684 +            fruitFill: {                                            
      8685 +                name: 'Fruit Fill',                                 
      8686 +                daysFromPlanting: null,                             
      8687 +                products: ['photoMag', 'holoK', 'holoCal'],         
      8688 +                priority: 'important',                              
      8689 +                description: 'Maximize size, sugar content, and qual
           +ity'                                                                
      8690 +            },                                                      
      8691 +            stressEvent: {                                          
      8692 +                name: 'Stress Recovery',                            
      8693 +                daysFromPlanting: null,                             
      8694 +                products: ['photoMag', 'seaStim'],                  
      8695 +                priority: 'responsive',                             
      8696 +                description: 'Apply within 24 hours of frost, hail, 
           +or heat stress'                                                     
      8697 +            }                                                       
      8698 +        };                                                          
      8699 +                                                                    
      8700 +        // Plant Health Pyramid Levels                              
      8701 +        const PLANT_HEALTH_PYRAMID = {                              
      8702 +            level1: {                                               
      8703 +                name: 'Complete Photosynthesis',                    
      8704 +                immunity: 'Soil-borne fungi (fusarium, pythium, vert
           +icillium)',                                                         
      8705 +                minerals: ['Mg', 'Fe', 'Mn', 'N', 'P'],             
      8706 +                products: ['macroPak', 'microPak', 'reboundManganese
           +', 'reboundIron'],                                                  
      8707 +                achievableIn: '2-4 weeks',                          
      8708 +                description: 'Plants produce 3-4x more sugars throug
           +h proper photosynthesis'                                            
      8709 +            },                                                      
      8710 +            level2: {                                               
      8711 +                name: 'Complete Protein Synthesis',                 
      8712 +                immunity: 'Sucking/larval insects (aphids, hornworms
           +, whiteflies)',                                                     
      8713 +                minerals: ['Mg', 'S', 'Mo', 'B'],                   
      8714 +                products: ['macroPak', 'reboundBoron'],             
      8715 +                achievableIn: '24-48 hours after application',      
      8716 +                description: 'All nitrogen converts to complete prot
           +eins - insects starve'                                              
      8717 +            },                                                      
      8718 +            level3: {                                               
      8719 +                name: 'Lipid Synthesis',                            
      8720 +                immunity: 'Airborne pathogens (powdery mildew, rust,
           + fire blight)',                                                     
      8721 +                minerals: ['Requires functional soil biology'],     
      8722 +                products: ['spectrum', 'rejuvenate', 'pinion'],     
      8723 +                achievableIn: '1-2 seasons',                        
      8724 +                description: 'Plants build protective waxy coatings 
           +on leaves'                                                          
      8725 +            },                                                      
      8726 +            level4: {                                               
      8727 +                name: 'Secondary Metabolites',                      
      8728 +                immunity: 'Chewing insects (beetles, stink bugs), ne
           +matodes',                                                           
      8729 +                minerals: ['Diverse soil microbiome required'],     
      8730 +                products: ['spectrum', 'rejuvenate', 'micro5000'],  
      8731 +                achievableIn: '2-3 seasons',                        
      8732 +                description: 'Plants produce defensive compounds (fl
           +avanols, phytoalexins)'                                             
      8733 +            }                                                       
      8734 +        };                                                          
      8735 +                                                                    
      8736 +        // LocalStorage for foliar schedule                         
      8737 +        let foliarSchedule = JSON.parse(localStorage.getItem('foliar
           +Schedule') || '[]');                                                
      8738 +        let foliarTasks = JSON.parse(localStorage.getItem('foliarTas
           +ks') || '[]');                                                      
      8739 +                                                                    
      8740 +        function renderFoliarProgram() {                            
      8741 +            const container = document.getElementById('testsContaine
           +r');                                                                
      8742 +            const today = new Date();                               
      8743 +            const thisWeek = foliarTasks.filter(t => {              
      8744 +                const taskDate = new Date(t.scheduledDate);         
      8745 +                const diffDays = Math.ceil((taskDate - today) / (100
           +0 * 60 * 60 * 24));                                                 
      8746 +                return diffDays >= 0 && diffDays <= 7 && t.status !=
           += 'completed';                                                      
      8747 +            });                                                     
      8748 +                                                                    
      8749 +            container.innerHTML = `                                 
      8750 +                <div style="background: white; border-radius: 1rem; 
           +padding: 1.5rem; margin-bottom: 1.5rem;">                           
      8751 +                    <div style="display: flex; justify-content: spac
           +e-between; align-items: center; flex-wrap: wrap; gap: 1rem;">       
      8752 +                        <div>                                       
      8753 +                            <h3 style="margin-bottom: 0.5rem;">Folia
           +r & Fertigation Program</h3>                                        
      8754 +                            <p style="color: #64748b; font-size: 0.8
           +75rem;">                                                            
      8755 +                                Build plant health systematically us
           +ing AEA methodology. Spray schedules, tank mixes, and SOPs.         
      8756 +                            </p>                                    
      8757 +                        </div>                                      
      8758 +                        <div style="display: flex; gap: 0.75rem; fle
           +x-wrap: wrap;">                                                     
      8759 +                            <button onclick="showGenerateScheduleMod
           +al()" class="btn btn-success" style="padding: 0.75rem 1.5rem;">     
      8760 +                                + Generate Schedule                 
      8761 +                            </button>                               
      8762 +                            <button onclick="showQuickSprayModal()" 
           +class="btn btn-primary" style="padding: 0.75rem 1.5rem; background: 
           +#7c3aed;">                                                          
      8763 +                                Quick Spray Task                    
      8764 +                            </button>                               
      8765 +                        </div>                                      
      8766 +                    </div>                                          
      8767 +                </div>                                              
      8768 +                                                                    
      8769 +                <!-- This Week's Tasks -->                          
      8770 +                <div style="background: linear-gradient(135deg, #fef
           +3c7 0%, #fde68a 100%); border-radius: 1rem; padding: 1.5rem; margin-
           +bottom: 1.5rem;">                                                   
      8771 +                    <h4 style="color: #92400e; margin-bottom: 1rem;"
           +>This Week's Spray Tasks (${thisWeek.length})</h4>                  
      8772 +                    ${thisWeek.length === 0 ? `                     
      8773 +                        <p style="color: #78350f; font-style: italic
           +;">No spray tasks scheduled this week. Generate a schedule or add a 
           +quick task.</p>                                                     
      8774 +                    ` : `                                           
      8775 +                        <div style="display: grid; gap: 0.75rem;">  
      8776 +                            ${thisWeek.map(task => `                
      8777 +                                <div style="background: white; borde
           +r-radius: 0.5rem; padding: 1rem; display: flex; justify-content: spa
           +ce-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">    
      8778 +                                    <div>                           
      8779 +                                        <strong style="color: #1e293
           +b;">${task.name}</strong>                                           
      8780 +                                        <div style="font-size: 0.875
           +rem; color: #64748b;">                                              
      8781 +                                            ${task.fields.join(', ')
           +} | ${formatDate(task.scheduledDate)}                               
      8782 +                                        </div>                      
      8783 +                                        <div style="font-size: 0.75r
           +em; color: #7c3aed; margin-top: 0.25rem;">                          
      8784 +                                            ${task.products.map(p =>
           + AEA_PRODUCTS[p]?.name || p).join(' + ')}                           
      8785 +                                        </div>                      
      8786 +                                    </div>                          
      8787 +                                    <div style="display: flex; gap: 
           +0.5rem;">                                                           
      8788 +                                        <button onclick="viewSprayTa
           +sk('${task.id}')" class="btn btn-secondary" style="padding: 0.375rem
           + 0.75rem; font-size: 0.75rem;">                                     
      8789 +                                            View SOP                
      8790 +                                        </button>                   
      8791 +                                        <button onclick="completeSpr
           +ayTask('${task.id}')" class="btn btn-success" style="padding: 0.375r
           +em 0.75rem; font-size: 0.75rem;">                                   
      8792 +                                            Complete                
      8793 +                                        </button>                   
      8794 +                                    </div>                          
      8795 +                                </div>                              
      8796 +                            `).join('')}                            
      8797 +                        </div>                                      
      8798 +                    `}                                              
      8799 +                </div>                                              
      8800 +                                                                    
      8801 +                <!-- Tank Mix Recipes -->                           
      8802 +                <div style="background: white; border-radius: 1rem; 
           +padding: 1.5rem; margin-bottom: 1.5rem;">                           
      8803 +                    <h4 style="color: #7c3aed; margin-bottom: 1rem;"
           +>Standard Tank Mix Recipes</h4>                                     
      8804 +                    <p style="color: #64748b; font-size: 0.875rem; m
           +argin-bottom: 1rem;">Pre-configured recipes based on AEA recommendat
           +ions. Click to view full SOP.</p>                                   
      8805 +                    <div style="display: grid; grid-template-columns
           +: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">               
      8806 +                        ${Object.entries(FOLIAR_RECIPES).map(([key, 
           +recipe]) => `                                                       
      8807 +                            <div style="border: 1px solid #e2e8f0; b
           +order-radius: 0.5rem; padding: 1rem; cursor: pointer;" onclick="show
           +RecipeDetail('${key}')">                                            
      8808 +                                <h5 style="color: #1e293b; margin-bo
           +ttom: 0.5rem;">${recipe.name}</h5>                                  
      8809 +                                <p style="color: #64748b; font-size:
           + 0.875rem; margin-bottom: 0.5rem;">${recipe.description}</p>        
      8810 +                                <div style="display: flex; flex-wrap
           +: wrap; gap: 0.25rem;">                                             
      8811 +                                    ${recipe.products.map(p => `    
      8812 +                                        <span style="background: #f0
           +fdf4; color: #166534; padding: 0.125rem 0.5rem; border-radius: 0.25r
           +em; font-size: 0.75rem;">                                           
      8813 +                                            ${AEA_PRODUCTS[p.product
           +]?.name || p.product}                                               
      8814 +                                        </span>                     
      8815 +                                    `).join('')}                    
      8816 +                                </div>                              
      8817 +                            </div>                                  
      8818 +                        `).join('')}                                
      8819 +                    </div>                                          
      8820 +                </div>                                              
      8821 +                                                                    
      8822 +                <!-- Plant Health Pyramid -->                       
      8823 +                <div style="background: linear-gradient(135deg, #f0f
           +df4 0%, #dcfce7 100%); border-radius: 1rem; padding: 1.5rem; margin-
           +bottom: 1.5rem;">                                                   
      8824 +                    <h4 style="color: #166534; margin-bottom: 1rem;"
           +>Plant Health Pyramid (John Kempf / AEA)</h4>                       
      8825 +                    <p style="color: #14532d; font-size: 0.875rem; m
           +argin-bottom: 1rem;">Build immunity systematically. Levels 1-2 throu
           +gh nutrition, Levels 3-4 through soil biology.</p>                  
      8826 +                    <div style="display: grid; gap: 1rem;">         
      8827 +                        ${Object.entries(PLANT_HEALTH_PYRAMID).map((
           +[level, data], idx) => `                                            
      8828 +                            <div style="background: white; border-ra
           +dius: 0.5rem; padding: 1rem; border-left: 4px solid ${idx === 0 ? '#
           +22c55e' : idx === 1 ? '#84cc16' : idx === 2 ? '#eab308' : '#f97316'}
           +;">                                                                 
      8829 +                                <div style="display: flex; justify-c
           +ontent: space-between; align-items: start; flex-wrap: wrap; gap: 0.5
           +rem;">                                                              
      8830 +                                    <div>                           
      8831 +                                        <strong style="color: #1e293
           +b;">Level ${idx + 1}: ${data.name}</strong>                         
      8832 +                                        <div style="color: #64748b; 
           +font-size: 0.875rem; margin-top: 0.25rem;">                         
      8833 +                                            <strong>Immunity:</stron
           +g> ${data.immunity}                                                 
      8834 +                                        </div>                      
      8835 +                                        <div style="color: #64748b; 
           +font-size: 0.875rem;">                                              
      8836 +                                            <strong>Key Minerals:</s
           +trong> ${Array.isArray(data.minerals) ? data.minerals.join(', ') : d
           +ata.minerals}                                                       
      8837 +                                        </div>                      
      8838 +                                    </div>                          
      8839 +                                    <span style="background: ${idx <
           + 2 ? '#dcfce7' : '#fef9c3'}; color: ${idx < 2 ? '#166534' : '#854d0e
           +'}; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75
           +rem;">                                                              
      8840 +                                        ${data.achievableIn}        
      8841 +                                    </span>                         
      8842 +                                </div>                              
      8843 +                                <p style="color: #475569; font-size:
           + 0.875rem; margin-top: 0.5rem; font-style: italic;">${data.descripti
           +on}</p>                                                             
      8844 +                            </div>                                  
      8845 +                        `).join('')}                                
      8846 +                    </div>                                          
      8847 +                </div>                                              
      8848 +                                                                    
      8849 +                <!-- AEA Products Database -->                      
      8850 +                <div style="background: white; border-radius: 1rem; 
           +padding: 1.5rem; margin-bottom: 1.5rem;">                           
      8851 +                    <h4 style="color: #7c3aed; margin-bottom: 1rem;"
           +>AEA Products Reference</h4>                                        
      8852 +                    <div style="display: flex; gap: 0.5rem; margin-b
           +ottom: 1rem; flex-wrap: wrap;">                                     
      8853 +                        <button onclick="filterAEAProducts('all')" c
           +lass="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size
           +: 0.875rem;">All</button>                                           
      8854 +                        <button onclick="filterAEAProducts(1)" class
           +="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.
           +875rem;">Tier 1 (Essential)</button>                                
      8855 +                        <button onclick="filterAEAProducts(2)" class
           +="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.
           +875rem;">Tier 2 (Functional)</button>                               
      8856 +                        <button onclick="filterAEAProducts(3)" class
           +="btn btn-secondary" style="padding: 0.375rem 0.75rem; font-size: 0.
           +875rem;">Tier 3 (Targeted)</button>                                 
      8857 +                    </div>                                          
      8858 +                    <div id="aeaProductsList" style="display: grid; 
           +gap: 0.75rem;">                                                     
      8859 +                        ${renderAEAProductsList('all')}             
      8860 +                    </div>                                          
      8861 +                </div>                                              
      8862 +                                                                    
      8863 +                <!-- Critical Points of Influence -->               
      8864 +                <div style="background: white; border-radius: 1rem; 
           +padding: 1.5rem; margin-bottom: 1.5rem;">                           
      8865 +                    <h4 style="color: #7c3aed; margin-bottom: 1rem;"
           +>Critical Points of Influence (CPIs)</h4>                           
      8866 +                    <p style="color: #64748b; font-size: 0.875rem; m
           +argin-bottom: 1rem;">These are the "don't miss" spray windows for ma
           +ximum impact.</p>                                                   
      8867 +                    <div style="overflow-x: auto;">                 
      8868 +                        <table style="width: 100%; border-collapse: 
           +collapse; font-size: 0.875rem;">                                    
      8869 +                            <thead>                                 
      8870 +                                <tr style="background: #f8fafc;">   
      8871 +                                    <th style="padding: 0.75rem; tex
           +t-align: left; border-bottom: 2px solid #e2e8f0;">CPI</th>          
      8872 +                                    <th style="padding: 0.75rem; tex
           +t-align: left; border-bottom: 2px solid #e2e8f0;">Timing</th>       
      8873 +                                    <th style="padding: 0.75rem; tex
           +t-align: left; border-bottom: 2px solid #e2e8f0;">Products</th>     
      8874 +                                    <th style="padding: 0.75rem; tex
           +t-align: left; border-bottom: 2px solid #e2e8f0;">Priority</th>     
      8875 +                                </tr>                               
      8876 +                            </thead>                                
      8877 +                            <tbody>                                 
      8878 +                                ${Object.entries(CRITICAL_POINTS).ma
           +p(([key, cpi]) => `                                                 
      8879 +                                    <tr style="border-bottom: 1px so
           +lid #e2e8f0;">                                                      
      8880 +                                        <td style="padding: 0.75rem;
           + font-weight: 600;">${cpi.name}</td>                                
      8881 +                                        <td style="padding: 0.75rem;
           + color: #64748b;">                                                  
      8882 +                                            ${cpi.daysFromPlanting !
           +== null ? 'Day ' + cpi.daysFromPlanting :                           
      8883 +                                              cpi.weeksBefore ? cpi.
           +weeksBefore + ' weeks before bloom' :                               
      8884 +                                              cpi.weeksAfterBloom ? 
           +cpi.weeksAfterBloom + ' week after bloom' : 'As needed'}            
      8885 +                                        </td>                       
      8886 +                                        <td style="padding: 0.75rem;
           +">                                                                  
      8887 +                                            ${cpi.products.map(p => 
           +`<span style="background: #f0fdf4; color: #166534; padding: 0.125rem
           + 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; margin-right:
           + 0.25rem;">${AEA_PRODUCTS[p]?.name || p}</span>`).join('')}         
      8888 +                                        </td>                       
      8889 +                                        <td style="padding: 0.75rem;
           +">                                                                  
      8890 +                                            <span style="background:
           + ${cpi.priority === 'essential' ? '#fee2e2' : cpi.priority === 'crit
           +ical' ? '#fef3c7' : cpi.priority === 'important' ? '#dbeafe' : '#f3f
           +4f6'};                                                              
      8891 +                                                         color: ${cp
           +i.priority === 'essential' ? '#991b1b' : cpi.priority === 'critical'
           + ? '#92400e' : cpi.priority === 'important' ? '#1e40af' : '#374151'}
           +;                                                                   
      8892 +                                                         padding: 0.
           +25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; text-trans
           +form: uppercase;">                                                  
      8893 +                                                ${cpi.priority}     
      8894 +                                            </span>                 
      8895 +                                        </td>                       
      8896 +                                    </tr>                           
      8897 +                                `).join('')}                        
      8898 +                            </tbody>                                
      8899 +                        </table>                                    
      8900 +                    </div>                                          
      8901 +                </div>                                              
      8902 +                                                                    
      8903 +                <!-- Spray History -->                              
      8904 +                <div style="background: white; border-radius: 1rem; 
           +padding: 1.5rem;">                                                  
      8905 +                    <h4 style="color: #7c3aed; margin-bottom: 1rem;"
           +>Recent Spray Applications</h4>                                     
      8906 +                    ${foliarTasks.filter(t => t.status === 'complete
           +d').length === 0 ? `                                                
      8907 +                        <p style="color: #64748b; font-style: italic
           +;">No spray applications recorded yet.</p>                          
      8908 +                    ` : `                                           
      8909 +                        <div style="display: grid; gap: 0.5rem;">   
      8910 +                            ${foliarTasks.filter(t => t.status === '
           +completed').slice(-10).reverse().map(task => `                      
      8911 +                                <div style="display: flex; justify-c
           +ontent: space-between; align-items: center; padding: 0.75rem; backgr
           +ound: #f8fafc; border-radius: 0.375rem;">                           
      8912 +                                    <div>                           
      8913 +                                        <span style="font-weight: 50
           +0;">${task.name}</span>                                             
      8914 +                                        <span style="color: #64748b;
           + font-size: 0.875rem;"> - ${task.fields.join(', ')}</span>          
      8915 +                                    </div>                          
      8916 +                                    <span style="color: #10b981; fon
           +t-size: 0.875rem;">${formatDate(task.completedDate || task.scheduled
           +Date)}</span>                                                       
      8917 +                                </div>                              
      8918 +                            `).join('')}                            
      8919 +                        </div>                                      
      8920 +                    `}                                              
      8921 +                </div>                                              
      8922 +                                                                    
      8923 +                <!-- Generate Schedule Modal -->                    
      8924 +                <div id="foliarScheduleModal" style="display: none; 
           +position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100
           +0; justify-content: center; align-items: center; padding: 1rem;"></d
           +iv>                                                                 
      8925 +            `;                                                      
      8926 +        }                                                           
      8927 +                                                                    
      8928 +        function renderAEAProductsList(filter) {                    
      8929 +            const products = Object.entries(AEA_PRODUCTS).filter(([k
           +ey, p]) =>                                                          
      8930 +                filter === 'all' || p.tier === filter               
      8931 +            );                                                      
      8932 +                                                                    
      8933 +            return products.map(([key, product]) => `               
      8934 +                <div style="border: 1px solid #e2e8f0; border-radius
           +: 0.5rem; padding: 1rem;">                                          
      8935 +                    <div style="display: flex; justify-content: spac
           +e-between; align-items: start; flex-wrap: wrap; gap: 0.5rem;">      
      8936 +                        <div>                                       
      8937 +                            <strong style="color: #1e293b;">${produc
           +t.name}</strong>                                                    
      8938 +                            <span style="background: ${product.tier 
           +=== 1 ? '#dcfce7' : product.tier === 2 ? '#dbeafe' : '#fef3c7'};    
      8939 +                                         color: ${product.tier === 1
           + ? '#166534' : product.tier === 2 ? '#1e40af' : '#92400e'};         
      8940 +                                         padding: 0.125rem 0.5rem; b
           +order-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">   
      8941 +                                Tier ${product.tier}                
      8942 +                            </span>                                 
      8943 +                            ${product.organic ? '<span style="backgr
           +ound: #f0fdf4; color: #166534; padding: 0.125rem 0.5rem; border-radi
           +us: 0.25rem; font-size: 0.75rem; margin-left: 0.25rem;">OMRI</span>'
           + : ''}                                                              
      8944 +                        </div>                                      
      8945 +                        <span style="color: #64748b; font-size: 0.87
           +5rem;">~$${product.priceEstimate}/unit</span>                       
      8946 +                    </div>                                          
      8947 +                    <p style="color: #64748b; font-size: 0.875rem; m
           +argin: 0.5rem 0;">${product.purpose}</p>                            
      8948 +                    <div style="display: grid; grid-template-columns
           +: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem; color: #475569;">       
      8949 +                        <div><strong>Rate:</strong> ${product.ratePe
           +rAcre}/acre</div>                                                   
      8950 +                        <div><strong>Frequency:</strong> ${product.f
           +requency}</div>                                                     
      8951 +                    </div>                                          
      8952 +                    <div style="display: flex; flex-wrap: wrap; gap:
           + 0.25rem; margin-top: 0.5rem;">                                     
      8953 +                        ${product.benefits.map(b => `<span style="ba
           +ckground: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 0.25re
           +m; font-size: 0.7rem; color: #475569;">${b}</span>`).join('')}      
      8954 +                    </div>                                          
      8955 +                </div>                                              
      8956 +            `).join('');                                            
      8957 +        }                                                           
      8958 +                                                                    
      8959 +        function filterAEAProducts(tier) {                          
      8960 +            document.getElementById('aeaProductsList').innerHTML = r
           +enderAEAProductsList(tier);                                         
      8961 +        }                                                           
      8962 +                                                                    
      8963 +        function showGenerateScheduleModal() {                      
      8964 +            const modal = document.getElementById('foliarScheduleMod
           +al');                                                               
      8965 +            const fieldOptions = Object.keys(FARM_FIELDS).map(f =>  
      8966 +                `<label style="display: flex; align-items: center; g
           +ap: 0.5rem; padding: 0.25rem 0;">                                   
      8967 +                    <input type="checkbox" name="scheduleFields" val
           +ue="${f}"> ${f}                                                     
      8968 +                </label>`                                           
      8969 +            ).join('');                                             
      8970 +                                                                    
      8971 +            modal.innerHTML = `                                     
      8972 +                <div style="background: white; border-radius: 1rem; 
           +max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      8973 +                    <div style="background: linear-gradient(135deg, 
           +#7c3aed 0%, #5b21b6 100%); color: white; padding: 1.5rem; border-rad
           +ius: 1rem 1rem 0 0;">                                               
      8974 +                        <h3>Generate Spray Schedule</h3>            
      8975 +                        <p style="font-size: 0.875rem; opacity: 0.9;
           +">Create a bi-weekly spray schedule for your fields</p>             
      8976 +                    </div>                                          
      8977 +                    <div style="padding: 1.5rem;">                  
      8978 +                        <form onsubmit="generateFoliarSchedule(event
           +)">                                                                 
      8979 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      8980 +                                <label style="font-weight: 600;">Sch
           +edule Type</label>                                                  
      8981 +                                <select id="scheduleType" style="wid
           +th: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius:
           + 0.375rem;">                                                        
      8982 +                                    <option value="baseNutrition">Ba
           +se Nutrition (All Crops)</option>                                   
      8983 +                                    <option value="fruitingCrops">Fr
           +uiting Crops Program</option>                                       
      8984 +                                    <option value="vegetativeCrops">
           +Vegetative Crops Program</option>                                   
      8985 +                                    <option value="floralProduction"
           +>Cut Flower Program</option>                                        
      8986 +                                    <option value="full">Full Season
           + Program (Recommended)</option>                                     
      8987 +                                </select>                           
      8988 +                            </div>                                  
      8989 +                                                                    
      8990 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      8991 +                                <label style="font-weight: 600;">Sel
           +ect Fields</label>                                                  
      8992 +                                <div style="max-height: 150px; overf
           +low-y: auto; border: 1px solid #e2e8f0; border-radius: 0.375rem; pad
           +ding: 0.5rem;">                                                     
      8993 +                                    ${fieldOptions}                 
      8994 +                                </div>                              
      8995 +                            </div>                                  
      8996 +                                                                    
      8997 +                            <div style="display: grid; grid-template
           +-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">                
      8998 +                                <div class="form-group">            
      8999 +                                    <label style="font-weight: 600;"
           +>Start Date</label>                                                 
      9000 +                                    <input type="date" id="scheduleS
           +tartDate" value="${new Date().toISOString().slice(0, 10)}" style="wi
           +dth: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius
           +: 0.375rem;">                                                       
      9001 +                                </div>                              
      9002 +                                <div class="form-group">            
      9003 +                                    <label style="font-weight: 600;"
           +>Duration (weeks)</label>                                           
      9004 +                                    <select id="scheduleDuration" st
           +yle="width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border
           +-radius: 0.375rem;">                                                
      9005 +                                        <option value="4">4 weeks</o
           +ption>                                                              
      9006 +                                        <option value="8" selected>8
           + weeks</option>                                                     
      9007 +                                        <option value="12">12 weeks<
           +/option>                                                            
      9008 +                                        <option value="16">16 weeks 
           +(full season)</option>                                              
      9009 +                                    </select>                       
      9010 +                                </div>                              
      9011 +                            </div>                                  
      9012 +                                                                    
      9013 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9014 +                                <label style="font-weight: 600;">Spr
           +ay Day</label>                                                      
      9015 +                                <select id="sprayDay" style="width: 
           +100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.3
           +75rem;">                                                            
      9016 +                                    <option value="1">Monday</option
           +>                                                                   
      9017 +                                    <option value="2" selected>Tuesd
           +ay</option>                                                         
      9018 +                                    <option value="3">Wednesday</opt
           +ion>                                                                
      9019 +                                    <option value="4">Thursday</opti
           +on>                                                                 
      9020 +                                    <option value="5">Friday</option
           +>                                                                   
      9021 +                                </select>                           
      9022 +                            </div>                                  
      9023 +                                                                    
      9024 +                            <div style="display: flex; gap: 1rem; ju
           +stify-content: flex-end; margin-top: 1.5rem;">                      
      9025 +                                <button type="button" onclick="close
           +FoliarScheduleModal()" class="btn btn-secondary" style="padding: 0.7
           +5rem 1.5rem;">Cancel</button>                                       
      9026 +                                <button type="submit" class="btn btn
           +-success" style="padding: 0.75rem 1.5rem;">Generate Schedule</button
           +>                                                                   
      9027 +                            </div>                                  
      9028 +                        </form>                                     
      9029 +                    </div>                                          
      9030 +                </div>                                              
      9031 +            `;                                                      
      9032 +            modal.style.display = 'flex';                           
      9033 +        }                                                           
      9034 +                                                                    
      9035 +        function closeFoliarScheduleModal() {                       
      9036 +            document.getElementById('foliarScheduleModal').style.dis
           +play = 'none';                                                      
      9037 +        }                                                           
      9038 +                                                                    
      9039 +        function generateFoliarSchedule(event) {                    
      9040 +            event.preventDefault();                                 
      9041 +                                                                    
      9042 +            const scheduleType = document.getElementById('scheduleTy
           +pe').value;                                                         
      9043 +            const startDate = new Date(document.getElementById('sche
           +duleStartDate').value);                                             
      9044 +            const duration = parseInt(document.getElementById('sched
           +uleDuration').value);                                               
      9045 +            const sprayDay = parseInt(document.getElementById('spray
           +Day').value);                                                       
      9046 +            const selectedFields = Array.from(document.querySelector
           +All('input[name="scheduleFields"]:checked')).map(cb => cb.value);   
      9047 +                                                                    
      9048 +            if (selectedFields.length === 0) {                      
      9049 +                showToast('Please select at least one field', 'error
           +');                                                                 
      9050 +                return;                                             
      9051 +            }                                                       
      9052 +                                                                    
      9053 +            // Find first spray day                                 
      9054 +            let currentDate = new Date(startDate);                  
      9055 +            while (currentDate.getDay() !== sprayDay) {             
      9056 +                currentDate.setDate(currentDate.getDate() + 1);     
      9057 +            }                                                       
      9058 +                                                                    
      9059 +            const newTasks = [];                                    
      9060 +            const recipes = scheduleType === 'full' ?               
      9061 +                ['baseNutrition', 'fruitingCrops', 'vegetativeCrops'
           +, 'diseasePreventative'] :                                          
      9062 +                [scheduleType];                                     
      9063 +                                                                    
      9064 +            // Generate bi-weekly tasks                             
      9065 +            for (let week = 0; week < duration; week += 2) {        
      9066 +                const taskDate = new Date(currentDate);             
      9067 +                taskDate.setDate(taskDate.getDate() + (week * 7));  
      9068 +                                                                    
      9069 +                const recipeKey = recipes[Math.floor(week / 2) % rec
           +ipes.length];                                                       
      9070 +                const recipe = FOLIAR_RECIPES[recipeKey];           
      9071 +                                                                    
      9072 +                newTasks.push({                                     
      9073 +                    id: Date.now().toString() + '-' + week,         
      9074 +                    name: recipe.name,                              
      9075 +                    recipeKey: recipeKey,                           
      9076 +                    products: recipe.products.map(p => p.product),  
      9077 +                    fields: selectedFields,                         
      9078 +                    scheduledDate: taskDate.toISOString().slice(0, 1
           +0),                                                                 
      9079 +                    status: 'pending',                              
      9080 +                    notes: recipe.description,                      
      9081 +                    createdAt: new Date().toISOString()             
      9082 +                });                                                 
      9083 +            }                                                       
      9084 +                                                                    
      9085 +            foliarTasks = [...foliarTasks, ...newTasks];            
      9086 +            localStorage.setItem('foliarTasks', JSON.stringify(folia
           +rTasks));                                                           
      9087 +                                                                    
      9088 +            closeFoliarScheduleModal();                             
      9089 +            renderFoliarProgram();                                  
      9090 +            showToast(`Generated ${newTasks.length} spray tasks over
           + ${duration} weeks`, 'success');                                    
      9091 +        }                                                           
      9092 +                                                                    
      9093 +        function showQuickSprayModal() {                            
      9094 +            const modal = document.getElementById('foliarScheduleMod
           +al');                                                               
      9095 +            const fieldOptions = Object.keys(FARM_FIELDS).map(f =>  
      9096 +                `<label style="display: flex; align-items: center; g
           +ap: 0.5rem; padding: 0.25rem 0;">                                   
      9097 +                    <input type="checkbox" name="quickFields" value=
           +"${f}"> ${f}                                                        
      9098 +                </label>`                                           
      9099 +            ).join('');                                             
      9100 +                                                                    
      9101 +            const productOptions = Object.entries(AEA_PRODUCTS).map(
           +([key, p]) =>                                                       
      9102 +                `<label style="display: flex; align-items: center; g
           +ap: 0.5rem; padding: 0.25rem 0;">                                   
      9103 +                    <input type="checkbox" name="quickProducts" valu
           +e="${key}"> ${p.name} (${p.category})                               
      9104 +                </label>`                                           
      9105 +            ).join('');                                             
      9106 +                                                                    
      9107 +            modal.innerHTML = `                                     
      9108 +                <div style="background: white; border-radius: 1rem; 
           +max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      9109 +                    <div style="background: linear-gradient(135deg, 
           +#10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-rad
           +ius: 1rem 1rem 0 0;">                                               
      9110 +                        <h3>Quick Spray Task</h3>                   
      9111 +                        <p style="font-size: 0.875rem; opacity: 0.9;
           +">Create a one-time spray task</p>                                  
      9112 +                    </div>                                          
      9113 +                    <div style="padding: 1.5rem;">                  
      9114 +                        <form onsubmit="createQuickSprayTask(event)"
           +>                                                                   
      9115 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9116 +                                <label style="font-weight: 600;">Tas
           +k Name</label>                                                      
      9117 +                                <input type="text" id="quickTaskName
           +" placeholder="e.g., Pre-bloom Accelerate spray" style="width: 100%;
           + padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem
           +;">                                                                 
      9118 +                            </div>                                  
      9119 +                                                                    
      9120 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9121 +                                <label style="font-weight: 600;">Or 
           +Select Recipe</label>                                               
      9122 +                                <select id="quickRecipe" onchange="f
           +illQuickRecipe()" style="width: 100%; padding: 0.5rem; border: 1px s
           +olid #e2e8f0; border-radius: 0.375rem;">                            
      9123 +                                    <option value="">-- Custom Mix -
           +-</option>                                                          
      9124 +                                    ${Object.entries(FOLIAR_RECIPES)
           +.map(([k, r]) => `<option value="${k}">${r.name}</option>`).join('')
           +}                                                                   
      9125 +                                </select>                           
      9126 +                            </div>                                  
      9127 +                                                                    
      9128 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9129 +                                <label style="font-weight: 600;">Pro
           +ducts</label>                                                       
      9130 +                                <div style="max-height: 150px; overf
           +low-y: auto; border: 1px solid #e2e8f0; border-radius: 0.375rem; pad
           +ding: 0.5rem;">                                                     
      9131 +                                    ${productOptions}               
      9132 +                                </div>                              
      9133 +                            </div>                                  
      9134 +                                                                    
      9135 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9136 +                                <label style="font-weight: 600;">Fie
           +lds</label>                                                         
      9137 +                                <div style="max-height: 100px; overf
           +low-y: auto; border: 1px solid #e2e8f0; border-radius: 0.375rem; pad
           +ding: 0.5rem;">                                                     
      9138 +                                    ${fieldOptions}                 
      9139 +                                </div>                              
      9140 +                            </div>                                  
      9141 +                                                                    
      9142 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9143 +                                <label style="font-weight: 600;">Sch
           +eduled Date</label>                                                 
      9144 +                                <input type="date" id="quickDate" va
           +lue="${new Date().toISOString().slice(0, 10)}" style="width: 100%; p
           +adding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem;"
           +>                                                                   
      9145 +                            </div>                                  
      9146 +                                                                    
      9147 +                            <div class="form-group" style="margin-bo
           +ttom: 1rem;">                                                       
      9148 +                                <label style="font-weight: 600;">Not
           +es</label>                                                          
      9149 +                                <textarea id="quickNotes" rows="2" p
           +laceholder="Any special instructions..." style="width: 100%; padding
           +: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.375rem;"></tex
           +tarea>                                                              
      9150 +                            </div>                                  
      9151 +                                                                    
      9152 +                            <div style="display: flex; gap: 1rem; ju
           +stify-content: flex-end; margin-top: 1.5rem;">                      
      9153 +                                <button type="button" onclick="close
           +FoliarScheduleModal()" class="btn btn-secondary" style="padding: 0.7
           +5rem 1.5rem;">Cancel</button>                                       
      9154 +                                <button type="submit" class="btn btn
           +-success" style="padding: 0.75rem 1.5rem;">Create Task</button>     
      9155 +                            </div>                                  
      9156 +                        </form>                                     
      9157 +                    </div>                                          
      9158 +                </div>                                              
      9159 +            `;                                                      
      9160 +            modal.style.display = 'flex';                           
      9161 +        }                                                           
      9162 +                                                                    
      9163 +        function fillQuickRecipe() {                                
      9164 +            const recipeKey = document.getElementById('quickRecipe')
           +.value;                                                             
      9165 +            if (!recipeKey) return;                                 
      9166 +                                                                    
      9167 +            const recipe = FOLIAR_RECIPES[recipeKey];               
      9168 +            document.getElementById('quickTaskName').value = recipe.
           +name;                                                               
      9169 +                                                                    
      9170 +            // Uncheck all products first                           
      9171 +            document.querySelectorAll('input[name="quickProducts"]')
           +.forEach(cb => cb.checked = false);                                 
      9172 +                                                                    
      9173 +            // Check products in recipe                             
      9174 +            recipe.products.forEach(p => {                          
      9175 +                const cb = document.querySelector(`input[name="quick
           +Products"][value="${p.product}"]`);                                 
      9176 +                if (cb) cb.checked = true;                          
      9177 +            });                                                     
      9178 +        }                                                           
      9179 +                                                                    
      9180 +        function createQuickSprayTask(event) {                      
      9181 +            event.preventDefault();                                 
      9182 +                                                                    
      9183 +            const name = document.getElementById('quickTaskName').va
           +lue || 'Custom Spray';                                              
      9184 +            const products = Array.from(document.querySelectorAll('i
           +nput[name="quickProducts"]:checked')).map(cb => cb.value);          
      9185 +            const fields = Array.from(document.querySelectorAll('inp
           +ut[name="quickFields"]:checked')).map(cb => cb.value);              
      9186 +            const date = document.getElementById('quickDate').value;
      9187 +            const notes = document.getElementById('quickNotes').valu
           +e;                                                                  
      9188 +                                                                    
      9189 +            if (products.length === 0) {                            
      9190 +                showToast('Please select at least one product', 'err
           +or');                                                               
      9191 +                return;                                             
      9192 +            }                                                       
      9193 +            if (fields.length === 0) {                              
      9194 +                showToast('Please select at least one field', 'error
           +');                                                                 
      9195 +                return;                                             
      9196 +            }                                                       
      9197 +                                                                    
      9198 +            const task = {                                          
      9199 +                id: Date.now().toString(),                          
      9200 +                name: name,                                         
      9201 +                products: products,                                 
      9202 +                fields: fields,                                     
      9203 +                scheduledDate: date,                                
      9204 +                status: 'pending',                                  
      9205 +                notes: notes,                                       
      9206 +                createdAt: new Date().toISOString()                 
      9207 +            };                                                      
      9208 +                                                                    
      9209 +            foliarTasks.push(task);                                 
      9210 +            localStorage.setItem('foliarTasks', JSON.stringify(folia
           +rTasks));                                                           
      9211 +                                                                    
      9212 +            closeFoliarScheduleModal();                             
      9213 +            renderFoliarProgram();                                  
      9214 +            showToast('Spray task created!', 'success');            
      9215 +        }                                                           
      9216 +                                                                    
      9217 +        function viewSprayTask(taskId) {                            
      9218 +            const task = foliarTasks.find(t => t.id === taskId);    
      9219 +            if (!task) return;                                      
      9220 +                                                                    
      9221 +            // Calculate total area                                 
      9222 +            const totalAcres = task.fields.reduce((sum, f) => sum + 
           +(FARM_FIELDS[f]?.acreage || 0), 0);                                 
      9223 +            const totalSqFt = totalAcres * 43560;                   
      9224 +                                                                    
      9225 +            // Build product details with rates                     
      9226 +            const productDetails = task.products.map(pKey => {      
      9227 +                const product = AEA_PRODUCTS[pKey];                 
      9228 +                if (!product) return null;                          
      9229 +                return {                                            
      9230 +                    name: product.name,                             
      9231 +                    ratePerAcre: product.ratePerAcre,               
      9232 +                    totalAmount: `${product.ratePerAcre} x ${totalAc
           +res.toFixed(2)} acres`,                                             
      9233 +                    purpose: product.purpose                        
      9234 +                };                                                  
      9235 +            }).filter(Boolean);                                     
      9236 +                                                                    
      9237 +            const sopHtml = `                                       
      9238 +                <html>                                              
      9239 +                <head>                                              
      9240 +                    <title>Spray SOP - ${task.name}</title>         
      9241 +                    <style>                                         
      9242 +                        body { font-family: Arial, sans-serif; max-w
           +idth: 800px; margin: 0 auto; padding: 20px; }                       
      9243 +                        h1 { color: #7c3aed; border-bottom: 2px soli
           +d #7c3aed; padding-bottom: 10px; }                                  
      9244 +                        .header-info { background: #f8fafc; padding:
           + 15px; border-radius: 8px; margin-bottom: 20px; }                   
      9245 +                        .section { margin-bottom: 20px; }           
      9246 +                        .section h3 { color: #1e293b; margin-bottom:
           + 10px; }                                                            
      9247 +                        table { width: 100%; border-collapse: collap
           +se; margin-bottom: 15px; }                                          
      9248 +                        th, td { padding: 10px; border: 1px solid #e
           +2e8f0; text-align: left; }                                          
      9249 +                        th { background: #f1f5f9; }                 
      9250 +                        .checklist { list-style: none; padding: 0; }
      9251 +                        .checklist li { padding: 8px 0; border-botto
           +m: 1px solid #e2e8f0; }                                             
      9252 +                        .checklist li:before { content: "☐ "; font-s
           +ize: 1.2em; }                                                       
      9253 +                        .warning { background: #fef3c7; border-left:
           + 4px solid #f59e0b; padding: 10px; margin: 10px 0; }                
      9254 +                        @media print { body { padding: 0; } }       
      9255 +                    </style>                                        
      9256 +                </head>                                             
      9257 +                <body>                                              
      9258 +                    <h1>Spray Application SOP</h1>                  
      9259 +                                                                    
      9260 +                    <div class="header-info">                       
      9261 +                        <strong>Task:</strong> ${task.name}<br>     
      9262 +                        <strong>Scheduled Date:</strong> ${formatDat
           +e(task.scheduledDate)}<br>                                          
      9263 +                        <strong>Fields:</strong> ${task.fields.join(
           +', ')}<br>                                                          
      9264 +                        <strong>Total Area:</strong> ${totalAcres.to
           +Fixed(2)} acres (${Math.round(totalSqFt).toLocaleString()} sq ft)   
      9265 +                    </div>                                          
      9266 +                                                                    
      9267 +                    <div class="section">                           
      9268 +                        <h3>Products & Rates</h3>                   
      9269 +                        <table>                                     
      9270 +                            <tr>                                    
      9271 +                                <th>Product</th>                    
      9272 +                                <th>Rate/Acre</th>                  
      9273 +                                <th>Total Needed</th>               
      9274 +                                <th>Purpose</th>                    
      9275 +                            </tr>                                   
      9276 +                            ${productDetails.map(p => `             
      9277 +                                <tr>                                
      9278 +                                    <td><strong>${p.name}</strong></
           +td>                                                                 
      9279 +                                    <td>${p.ratePerAcre}</td>       
      9280 +                                    <td>${p.totalAmount}</td>       
      9281 +                                    <td>${p.purpose}</td>           
      9282 +                                </tr>                               
      9283 +                            `).join('')}                            
      9284 +                        </table>                                    
      9285 +                    </div>                                          
      9286 +                                                                    
      9287 +                    <div class="section">                           
      9288 +                        <h3>Pre-Spray Checklist</h3>                
      9289 +                        <ul class="checklist">                      
      9290 +                            <li>Check weather forecast - no rain exp
           +ected for 6+ hours</li>                                             
      9291 +                            <li>Temperature below 85°F (spray in eve
           +ning if hot)</li>                                                   
      9292 +                            <li>Wind speed below 10 mph</li>        
      9293 +                            <li>Test water quality (pH, bicarbonates
           +, chlorine)</li>                                                    
      9294 +                            <li>Clean sprayer tank and nozzles</li> 
      9295 +                            <li>Calibrate sprayer output</li>       
      9296 +                            <li>Gather all products and measure amou
           +nts</li>                                                            
      9297 +                        </ul>                                       
      9298 +                    </div>                                          
      9299 +                                                                    
      9300 +                    <div class="section">                           
      9301 +                        <h3>Mixing Instructions</h3>                
      9302 +                        <ol>                                        
      9303 +                            <li>Fill tank 1/3 full with clean water 
           +(rainwater preferred)</li>                                          
      9304 +                            <li>If using municipal water, add HumaCa
           +rb at 0.25% to neutralize chlorine</li>                             
      9305 +                            <li>Start agitation</li>                
      9306 +                            <li>Add products in this order: biologic
           +als first, then minerals, then oils</li>                            
      9307 +                            <li>Continue agitation while adding rema
           +ining water</li>                                                    
      9308 +                            <li>Maintain minimum 10:1 water dilution
           + ratio</li>                                                         
      9309 +                        </ol>                                       
      9310 +                    </div>                                          
      9311 +                                                                    
      9312 +                    <div class="warning">                           
      9313 +                        <strong>Best Practices:</strong><br>        
      9314 +                        • Apply in evening (after 5 PM) for best abs
           +orption<br>                                                         
      9315 +                        • Light mist - don't saturate to dripping<br
           +>                                                                   
      9316 +                        • Cover all leaf surfaces (top and bottom)<b
           +r>                                                                  
      9317 +                        • Plants absorb foliar nutrients within 2-6 
           +hours                                                               
      9318 +                    </div>                                          
      9319 +                                                                    
      9320 +                    <div class="section">                           
      9321 +                        <h3>Post-Spray</h3>                         
      9322 +                        <ul class="checklist">                      
      9323 +                            <li>Record actual application in farm re
           +cords</li>                                                          
      9324 +                            <li>Note any deviations from planned rat
           +es</li>                                                             
      9325 +                            <li>Clean sprayer thoroughly</li>       
      9326 +                            <li>Store products properly</li>        
      9327 +                            <li>Schedule next application (2 weeks)<
           +/li>                                                                
      9328 +                        </ul>                                       
      9329 +                    </div>                                          
      9330 +                                                                    
      9331 +                    ${task.notes ? `                                
      9332 +                        <div class="section">                       
      9333 +                            <h3>Notes</h3>                          
      9334 +                            <p>${task.notes}</p>                    
      9335 +                        </div>                                      
      9336 +                    ` : ''}                                         
      9337 +                                                                    
      9338 +                    <div style="margin-top: 30px; padding-top: 20px;
           + border-top: 2px solid #e2e8f0; font-size: 0.9em; color: #64748b;"> 
      9339 +                        Generated by Tiny Seed OS - Foliar Program<b
           +r>                                                                  
      9340 +                        Based on Advancing Eco Agriculture (AEA) met
           +hodology                                                            
      9341 +                    </div>                                          
      9342 +                </body>                                             
      9343 +                </html>                                             
      9344 +            `;                                                      
      9345 +                                                                    
      9346 +            const printWindow = window.open('', '_blank');          
      9347 +            printWindow.document.write(sopHtml);                    
      9348 +            printWindow.document.close();                           
      9349 +        }                                                           
      9350 +                                                                    
      9351 +        function completeSprayTask(taskId) {                        
      9352 +            const taskIndex = foliarTasks.findIndex(t => t.id === ta
           +skId);                                                              
      9353 +            if (taskIndex === -1) return;                           
      9354 +                                                                    
      9355 +            foliarTasks[taskIndex].status = 'completed';            
      9356 +            foliarTasks[taskIndex].completedDate = new Date().toISOS
           +tring().slice(0, 10);                                               
      9357 +                                                                    
      9358 +            localStorage.setItem('foliarTasks', JSON.stringify(folia
           +rTasks));                                                           
      9359 +                                                                    
      9360 +            // Record in FarmLearning                               
      9361 +            const task = foliarTasks[taskIndex];                    
      9362 +            task.products.forEach(pKey => {                         
      9363 +                const product = AEA_PRODUCTS[pKey];                 
      9364 +                if (product) {                                      
      9365 +                    FarmLearning.recordAmendment({                  
      9366 +                        date: task.completedDate,                   
      9367 +                        fieldZone: task.fields[0],                  
      9368 +                        material: product.name,                     
      9369 +                        rate: product.ratePerAcre,                  
      9370 +                        method: 'foliar',                           
      9371 +                        notes: 'AEA foliar program - ' + task.name  
      9372 +                    });                                             
      9373 +                }                                                   
      9374 +            });                                                     
      9375 +                                                                    
      9376 +            renderFoliarProgram();                                  
      9377 +            showToast('Spray task completed and recorded!', 'success
           +');                                                                 
      9378 +        }                                                           
      9379 +                                                                    
      9380 +        function showRecipeDetail(recipeKey) {                      
      9381 +            const recipe = FOLIAR_RECIPES[recipeKey];               
      9382 +            if (!recipe) return;                                    
      9383 +                                                                    
      9384 +            const productDetails = recipe.products.map(p => {       
      9385 +                const product = AEA_PRODUCTS[p.product];            
      9386 +                return product ? { ...product, parts: p.parts } : nu
           +ll;                                                                 
      9387 +            }).filter(Boolean);                                     
      9388 +                                                                    
      9389 +            alert(                                                  
      9390 +                recipe.name + '\n\n' +                              
      9391 +                recipe.description + '\n\n' +                       
      9392 +                'Products:\n' + productDetails.map(p => `- ${p.name}
           + (${p.parts} parts): ${p.purpose}`).join('\n') + '\n\n' +           
      9393 +                'Timing: ' + recipe.timing + '\n' +                 
      9394 +                'Dilution: ' + recipe.waterRatio                    
      9395 +            );                                                      
      9396 +        }                                                           
      9397 +                                                                    
      9398 +        // ============================================             
      9399          // FARM INSIGHTS TAB - Learning Dashboard
      9400          // ============================================
      9401  

⏺ Let me update the todo list and project summary.

⏺ Update(Documents/TIny_Seed_OS/SOIL_TRACKER_PROJECT_SUMMARY.md)
  ⎿  Added 30 lines                                                             
      174  
      175  ## Progress Log
      176  
      177 +### 2026-01-13 - Session 7                                           
      178 +                                                                     
      179 +**AEA Foliar Program System:**                                       
      180 +- Comprehensive research on Advancing Eco Agriculture products, metho
          +dology, and Plant Health Pyramid                                     
      181 +- Added new "Foliar Program" tab to web app navigation               
      182 +- `AEA_PRODUCTS` database with 15 products across 3 tiers:           
      183 +  - Tier 1 (Essential): BioCoat Gold, Spectrum, Rejuvenate, MacroPak,
          + MicroPak                                                            
      184 +  - Tier 2 (Functional): Accelerate, SeaStim, Pinion, PhotoMag, Micro
          +5000                                                                 
      185 +  - Tier 3 (Targeted): ReBound Boron/Manganese/Iron, HoloCal, Holo-K 
      186 +- `FOLIAR_RECIPES` with 6 standard tank mix recipes:                 
      187 +  - Base Nutrition Mix, Fruiting Crop Mix, Vegetative Crop Mix       
      188 +  - Disease Prevention Mix, Cut Flower Mix, Stress Recovery Mix      
      189 +- `CRITICAL_POINTS` database for spray timing windows (CPIs)         
      190 +- `PLANT_HEALTH_PYRAMID` with 4 levels of plant immunity             
      191 +- Schedule generation system:                                        
      192 +  - Generate bi-weekly spray schedules                               
      193 +  - Select fields, duration (4-16 weeks), spray day                  
      194 +  - Full season program option rotates through recipes               
      195 +- Quick Spray Task for one-off applications                          
      196 +- SOP generation for each spray task with:                           
      197 +  - Products and rates table                                         
      198 +  - Pre-spray checklist (weather, water quality, equipment)          
      199 +  - Mixing instructions                                              
      200 +  - Best practices                                                   
      201 +  - Post-spray checklist                                             
      202 +- Task completion records in FarmLearning system                     
      203 +- LocalStorage: `foliarSchedule`, `foliarTasks`                      
      204 +                                                                     
      205 +---                                                                  
      206 +                                                                     
      207  ### 2026-01-13 - Session 6
      208  
      209  **Plant Tissue Testing System:**

⏺ Summary: AEA Research & System Implementation Complete

  The Compelling Argument for AEA Products

  Based on my research from https://advancingecoag.com/, https://johnkempf.com/, and https://advancingecoag.com/marketgardens/:

  Why AEA for Your 40-Year Farm:

  1. Proven Results: 59% reduction in powdery mildew, 39% more pods per plant, 10,000+ growers on 4 million acres
  2. The Plant Health Pyramid - Build immunity systematically:
    - Level 1 (2-4 weeks): Resist soil fungi through photosynthesis optimization
    - Level 2 (24-48 hours!): Resist aphids/hornworms through complete protein synthesis
    - Level 3 (1-2 seasons): Resist powdery mildew through lipid synthesis
    - Level 4 (2-3 seasons): Resist beetles/nematodes through secondary metabolites
  3. Long-term ROI: Year 1 you invest in biology. By Year 3-5, reduced fertilizer (30-40% less) and eliminated pesticide costs offset product costs. The soil biology compounds.
  4. Time-Efficient: One spray day per week (Tuesday evenings). Bi-weekly applications. System generates tasks automatically.

  What I Built Into Your Web App

  New "Foliar Program" Tab includes:

  - This Week's Tasks - See what sprays are due
  - Generate Schedule - Create 4-16 week spray programs with one click
  - Quick Spray Task - Add one-off applications
  - Tank Mix Recipes - 6 pre-configured recipes for different crop types
  - Plant Health Pyramid - Visual reference with achievable timelines
  - AEA Products Database - All 15 products with rates, timing, benefits
  - Critical Points of Influence - The "don't miss" spray windows
  - SOP Generation - Printable checklists for each spray task
  - History Tracking - All applications recorded in FarmLearning

  Your Recommended Starting Stack (~$300-400/season)
  ┌───────────────────────┬────────────────────┬───────────────────────┐
  │        Product        │      Purpose       │         When          │
  ├───────────────────────┼────────────────────┼───────────────────────┤
  │ BioCoat Gold          │ Seed treatment     │ At planting           │
  ├───────────────────────┼────────────────────┼───────────────────────┤
  │ Spectrum + Rejuvenate │ Soil biology       │ Transplant + 2x more  │
  ├───────────────────────┼────────────────────┼───────────────────────┤
  │ MacroPak + MicroPak   │ Base nutrition     │ Bi-weekly foliar      │
  ├───────────────────────┼────────────────────┼───────────────────────┤
  │ Accelerate            │ Flowering/fruiting │ Pre-bloom + bi-weekly │
  ├───────────────────────┼────────────────────┼───────────────────────┤
  │ Pinion                │ Disease prevention │ Monthly               │
  └───────────────────────┴────────────────────┴───────────────────────┘
  The SOP System

  Each spray task generates a printable SOP with:
  - Products & exact rates for your field acreage
  - Pre-spray checklist (weather, water quality)
  - Mixing instructions (order matters!)
  - Best practices (evening application, light mist)
  - Post-spray checklist

  Sources:
  - https://advancingecoag.com/marketgardens/
  - https://advancingecoag.com/article/product-primer/
  - https://advancingecoag.com/plant-health-pyramid/
  - https://advancingecoag.com/article/market-gardens-5/
  - https://podcast.orchardpeople.com/episodes/fruit-tree-foliar-sprays-with-john-kempf/transcript

✻ Baked for 8m 27s

❯ Have we added in fertigation and foliar applications of nutrients?  The ability  
  to apply fertility this way can enhance and speed the time it takes to uptake    
  the needed nutrients.  There may be times where this makes more sense then       
  sidedressing.  Our greenhouse crops, especially fruiting crops like tomatoes and 
  cucumbers should have fertigation schedules.  Can you do a deep dive on          
  feritgation and foliar applications.  This can include but is not limited to     
  compost tea, fish emulsion, and other products available.  The roxbury farm      
  manual likely has some really great resources.As soon as we are done with the    
  soil amendment tab, we should get it connected and go through our current set up 
  systematically to make sure everything is conncected and working                 

⏺ Let me do a deep dive on fertigation and foliar applications, then check the Roxbury Farm manual for their protocols.

⏺ Web Search("fertigation schedule greenhouse tomatoes cucumbers organic NPK timing
            frequency")
  ⎿  Did 0 searches in 361ms                                                    


⏺ Web Search("foliar feeding vegetables fish emulsion kelp compost tea application
            rates")
  ⎿  Did 0 searches in 362ms                                                    


⏺ Search(pattern: "**/roxbury*/**/*")
  ⎿  Found 0 files 
  ⎿  You've hit your limit · resets 3pm (America/New_York)
     Opening your options…

❯ continue where we left off. 

⏺ Let me continue the research using different approaches and find the Roxbury Farm manual.

⏺ Search(pattern: "**/*[Rr]oxbury*")
  ⎿  Found 0 files 

⏺ Search(pattern: "**/*manual*", path: "Documents")
  ⎿  Found 0 files 

⏺ Search(pattern: "**/*.pdf", path: "Downloads")
  ⎿  Found 93 files (ctrl+o to expand)

⏺ Bash(find /Users/samanthapollack -iname "*roxbury*" -type f 2>/dev/null | head -20)
  ⎿  Running in the background (↓ to manage)

⏺ Read(Downloads/allcropsheets2022.pdf)
  ⎿  Read PDF (26MB)
  ⎿ API Error: 413 {"error":{"type":"request_too_large","message":"Request exceeds the 
    maximum size"}}


✻ Churned for 2m 49s

⏺ Background command "Search for Roxbury farm files" completed (exit code 0)
  ⎿ API Error: 413 {"error":{"type":"request_too_large","message":"Request exceeds the 
    maximum size"}}


❯ how is it going? 
  ⎿ API Error: 413 {"error":{"type":"request_too_large","message":"Request exceeds the 
    maximum size"}}


❯ Have we added in fertigation and foliar applications of nutrients?  The ability  
                                                                                   
  to apply fertility this way can enhance and speed the time it takes to uptake    
                                                                                   
  the needed nutrients.  There may be times where this makes more sense then       
                                                                                   
  sidedressing.  Our greenhouse crops, especially fruiting crops like tomatoes     
  and                                                                              
  cucumbers should have fertigation schedules.  Can you do a deep dive on          
                                                                                   
  feritgation and foliar applications.  This can include but is not limited to     
                                                                                   
  compost tea, fish emulsion, and other products available.  The roxbury farm      
                                                                                   
  manual likely has some really great resources.As soon as we are done with the    
                                                                                   
  soil amendment tab, we should get it connected and go through our current set    
  up                                                                               
  systematically to make sure everything is conncected and working                 
  Scour the web.  Again scholarly articles, and data driven edu and extension      
  research only                                                                    
  ⎿ API Error: 413 {"error":{"type":"request_too_large","message":"Request exceeds the 
    maximum size"}}


❯ /compact 
  ⎿  Error: Error during compaction: Error: API Error: 413
     {"error":{"type":"request_too_large","message":"Request exceeds the maximum size"}}


❯ /compact 
  ⎿  Error: Error during compaction: Error: API Error: 413
     {"error":{"type":"request_too_large","message":"Request exceeds the maximum size"}}

