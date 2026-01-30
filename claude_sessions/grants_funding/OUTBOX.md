# OUTBOX: Grants_Funding Claude
## To: PM_Architect & Field_Operations Claude

**Updated:** 2026-01-24 (Session 9 - Intelligent Planting Algorithm Research)

---

# DEEP RESEARCH: INTELLIGENT PLANTING ALGORITHMS

## Research Assignment Complete

Per INBOX directive, I researched algorithms and approaches for an intelligent Field Planner that automatically assigns plantings to optimal locations. This research was conducted in parallel with Field_Operations Claude.

---

## 1. BEST ALGORITHMS FOUND

### A. Mixed-Integer Linear Programming (MILP)
**Best for: Hard constraints with clear optimization goals**

From [ScienceDirect research](https://www.sciencedirect.com/science/article/abs/pii/S0308521X24002002):
- Allocates farmland based on crop rotation, replanting limits, and spatial distribution
- Can handle multiple objectives simultaneously
- Studies achieved CNY 293-558 million cumulative profit optimization over 6 years
- Works well when constraints are well-defined

**Strengths:** Guaranteed optimal solution within constraints
**Weaknesses:** Struggles with non-linear dynamics, requires static parameters

### B. Genetic Algorithms (GA)
**Best for: Complex non-linear problems with many variables**

From [Nature - Hybrid SA-GA research](https://www.nature.com/articles/s41598-025-14188-5):
- Evolutionary search mimics natural selection
- Can escape local optima through mutation
- Handles dynamic constraints better than LP
- Studies show significant improvement in planting profitability

**Implementation approach:**
1. Encode planting plan as "chromosome" (e.g., bed assignments as genes)
2. Define fitness function (weighted score of all factors)
3. Generate population of random valid plans
4. Select best performers, crossover, mutate
5. Repeat until convergence

### C. Hybrid SA-GA (Simulated Annealing + Genetic Algorithm)
**Best for: Large-scale dynamic optimization**

From [Nature research](https://www.nature.com/articles/s41598-025-14188-5):
- Combines GA's global search with SA's local refinement
- Enhanced by neural network-driven real-time predictions
- Specifically designed for challenging terrain and complex constraints

### D. Constraint Satisfaction Problem (CSP) Solvers
**Best for: Many hard constraints with soft preferences**

From [Cambridge Core research](https://www.cambridge.org/core/journals/rairo-operations-research/article/abs/solving-the-crop-allocation-problemusing-hard-and-soft-constraints/928250B2BF7802F29B31EE47D2FD9993):
- Formalize as Weighted CSP (WCSP)
- Hard constraints = MUST follow (e.g., no nightshades after nightshades)
- Soft constraints = preferences with weights (e.g., prefer high-fertility beds)
- Solved using toulbar2 (WCSP) or SCIP (ILP) solvers

### E. Entropy-TOPSIS Multi-Objective Decision Analysis
**Best for: Balancing competing objectives**

From [PMC research](https://pmc.ncbi.nlm.nih.gov/articles/PMC10764956/):
- TOPSIS = Technique for Order Preference by Similarity to an Ideal Solution
- Defines positive ideal (best possible) and negative ideal (worst possible)
- Ranks options by distance from ideals
- Used for: yield, economics, soil health, C sequestration, biodiversity, GHG emissions

---

## 2. KEY FACTORS WITH RECOMMENDED WEIGHTS

Based on multiple research sources, here are the factors that matter for planting optimization:

### ROTATION FACTORS (Prevent Pest/Disease Buildup)

| Factor | Weight | Rationale |
|--------|--------|-----------|
| **Family rotation** | 25% | Same family = same pests/diseases |
| **Disease break years** | 20% | Some crops need 3-4 year breaks |
| **Pest pressure history** | 15% | Track actual pest occurrences per bed |

Research finding: [Strategic crop rotation reduces pest populations by up to 60%](https://farmonaut.com/blogs/crop-rotation-reduces-pest-pressure-basic-game-guide)

### SOIL HEALTH FACTORS

| Factor | Weight | Rationale |
|--------|--------|-----------|
| **Nitrogen status** | 15% | Heavy feeders vs. N-fixers vs. light feeders |
| **Soil organic matter** | 10% | Match crop needs to soil condition |
| **Root depth compatibility** | 5% | Alternate deep vs. shallow rooters |

Research finding: [Legume-based rotations provide 70-223 kg N/ha](https://pmc.ncbi.nlm.nih.gov/articles/PMC9395539/) from nitrogen fixation.

### PRODUCTIVITY FACTORS

| Factor | Weight | Rationale |
|--------|--------|-----------|
| **Bed fertility rating** | 5% | High-value crops to best beds |
| **Sun exposure** | 3% | Match crop light needs |
| **Water access** | 2% | Irrigation proximity |

### RECOMMENDED WEIGHT DISTRIBUTION

```
TOTAL = 100%

ROTATION/PEST MANAGEMENT:    60%
  - Family rotation:         25%
  - Disease break years:     20%
  - Pest history:            15%

SOIL HEALTH:                 30%
  - Nitrogen cycling:        15%
  - Organic matter:          10%
  - Root depth:               5%

PRODUCTIVITY:                10%
  - Bed fertility:            5%
  - Sun/water:                5%
```

### HARD CONSTRAINTS (Must Not Violate)

| Constraint | Rule |
|------------|------|
| Allium minimum break | 3 years (onion maggot, white rot) |
| Brassica minimum break | 3 years (clubroot) |
| Solanaceae minimum break | 4 years (early blight, verticillium) |
| Cucurbit minimum break | 2-3 years (bacterial wilt) |
| No same crop consecutive | Always enforce |

---

## 3. DATA STRUCTURES NEEDED

### A. Crop Master Record
```javascript
{
  cropId: "TOM-01",
  cropName: "Tomato",
  family: "Solanaceae",

  // Rotation constraints
  minRotationYears: 4,        // Years before replanting same family
  badPredecessors: ["potato", "pepper", "eggplant"],
  goodPredecessors: ["allium", "brassica", "legume"],

  // Nitrogen cycle
  nitrogenRole: "heavy_feeder",  // heavy_feeder | light_feeder | n_fixer | neutral
  nitrogenNeed: 150,             // lbs N/acre

  // Physical needs
  rootDepth: "deep",             // shallow | medium | deep
  sunRequirement: "full",        // full | partial | shade
  waterNeed: "high",             // low | medium | high

  // Growing info
  daysToMaturity: 75,
  harvestWindow: 45,
  successionPossible: false,

  // Companion info
  companions: ["basil", "carrot", "parsley"],
  antagonists: ["brassica", "fennel"],
  allelopathicNotes: "Tomato root exudates suppress brassica germination"
}
```

### B. Bed/Location Record
```javascript
{
  bedId: "F1-B01",
  fieldZone: "Field 1",
  bedNumber: 1,

  // Physical attributes
  lengthFt: 100,
  widthFt: 4,
  sqFt: 400,
  sunExposure: "full",           // full | partial | shade
  irrigationZone: "Zone-A",
  soilType: "sandy_loam",

  // Current status
  currentCrop: null,
  availableDate: "2026-03-15",

  // Soil health scores (1-10)
  fertilityScore: 8,
  organicMatterScore: 7,
  drainageScore: 9,

  // History (last 5 years)
  plantingHistory: [
    { year: 2025, crop: "lettuce", family: "Asteraceae", yield: "good" },
    { year: 2024, crop: "tomato", family: "Solanaceae", yield: "excellent" },
    { year: 2023, crop: "beans", family: "Fabaceae", yield: "good" },
    { year: 2022, crop: "brassica_mix", family: "Brassicaceae", yield: "fair" },
    { year: 2021, crop: "squash", family: "Cucurbitaceae", yield: "good" }
  ],

  // Pest/disease incidents
  pestHistory: [
    { year: 2024, pest: "aphids", severity: "low" },
    { year: 2022, pest: "cabbage_worm", severity: "high" }
  ]
}
```

### C. Planting Request Record
```javascript
{
  requestId: "PR-2026-001",
  cropId: "TOM-01",
  variety: "Cherokee Purple",

  // Quantities
  requestedBedFeet: 200,        // Total bed feet needed
  plantCount: 50,

  // Timing
  targetTransplantDate: "2026-05-15",
  harvestStartDate: "2026-07-29",
  harvestEndDate: "2026-09-15",

  // Succession info
  successionNumber: 1,
  isSuccession: false,

  // Preferences (soft constraints)
  preferredField: "Field 1",    // null = no preference
  preferredBeds: [],            // Empty = no preference
  avoidBeds: ["F2-B01"],        // Known problem spots

  // Assignment (filled by algorithm)
  assignedBeds: [],
  assignmentScore: null,
  assignmentNotes: []
}
```

### D. Assignment Result Record
```javascript
{
  assignmentId: "ASN-2026-001",
  requestId: "PR-2026-001",

  assignments: [
    {
      bedId: "F1-B03",
      bedFeet: 100,
      score: 87,
      factors: {
        rotationScore: 95,      // No solanaceae in 4 years
        nitrogenScore: 80,      // Had beans 2 years ago
        fertilityScore: 85,     // Good soil
        sunScore: 100,          // Full sun match
        proximityScore: 75      // Near other tomatoes
      },
      warnings: [],
      notes: ["Good rotation - beans in 2023 added nitrogen"]
    },
    {
      bedId: "F1-B04",
      bedFeet: 100,
      score: 82,
      factors: { ... },
      warnings: ["Tomatoes were here in 2024 - only 2 year break"],
      notes: []
    }
  ],

  overallScore: 84.5,
  generatedAt: "2026-01-24T10:30:00Z",
  algorithm: "weighted_scoring_v1"
}
```

### E. Crop Family Lookup
```javascript
const CROP_FAMILIES = {
  "Solanaceae": {
    crops: ["tomato", "pepper", "eggplant", "potato", "tomatillo"],
    minBreakYears: 4,
    commonPests: ["colorado_potato_beetle", "hornworm", "aphids"],
    commonDiseases: ["early_blight", "late_blight", "verticillium", "fusarium"]
  },
  "Brassicaceae": {
    crops: ["broccoli", "cabbage", "kale", "cauliflower", "kohlrabi", "radish", "turnip", "arugula"],
    minBreakYears: 3,
    commonPests: ["cabbage_worm", "flea_beetle", "aphids"],
    commonDiseases: ["clubroot", "black_rot", "downy_mildew"]
  },
  "Fabaceae": {
    crops: ["beans", "peas", "lentils", "soybeans"],
    minBreakYears: 2,
    nitrogenFixer: true,
    nFixationKgHa: { min: 50, max: 200 },
    commonPests: ["bean_beetle", "aphids"],
    commonDiseases: ["anthracnose", "rust"]
  },
  "Cucurbitaceae": {
    crops: ["cucumber", "squash", "zucchini", "melon", "watermelon", "pumpkin"],
    minBreakYears: 3,
    commonPests: ["cucumber_beetle", "squash_bug", "squash_vine_borer"],
    commonDiseases: ["powdery_mildew", "bacterial_wilt", "downy_mildew"]
  },
  "Allium": {
    crops: ["onion", "garlic", "leek", "shallot", "scallion", "chive"],
    minBreakYears: 3,
    commonPests: ["onion_maggot", "thrips"],
    commonDiseases: ["white_rot", "pink_root", "botrytis"]
  },
  "Asteraceae": {
    crops: ["lettuce", "endive", "radicchio", "artichoke", "sunflower"],
    minBreakYears: 2,
    commonPests: ["aphids", "slugs"],
    commonDiseases: ["downy_mildew", "lettuce_drop"]
  },
  "Apiaceae": {
    crops: ["carrot", "celery", "parsley", "parsnip", "dill", "cilantro", "fennel"],
    minBreakYears: 3,
    commonPests: ["carrot_rust_fly", "aphids", "parsleyworm"],
    commonDiseases: ["leaf_blight", "cavity_spot"]
  },
  "Amaranthaceae": {
    crops: ["beet", "chard", "spinach", "quinoa"],
    minBreakYears: 2,
    commonPests: ["leaf_miner", "flea_beetle"],
    commonDiseases: ["cercospora_leaf_spot", "downy_mildew"]
  }
};
```

---

## 4. RECOMMENDED APPROACH FOR TINY SEED FARM

### Phase 1: Weighted Scoring Algorithm (Start Here)

**Why:** Simplest to implement, easy to understand, provides immediate value.

```javascript
function calculateBedScore(crop, bed, weights) {
  let score = 0;
  let factors = {};

  // 1. Rotation Score (25%)
  const rotationScore = calculateRotationScore(crop, bed);
  factors.rotation = rotationScore;
  score += rotationScore * weights.rotation;

  // 2. Disease Break Score (20%)
  const diseaseScore = calculateDiseaseBreakScore(crop, bed);
  factors.diseaseBreak = diseaseScore;
  score += diseaseScore * weights.diseaseBreak;

  // 3. Pest History Score (15%)
  const pestScore = calculatePestHistoryScore(crop, bed);
  factors.pestHistory = pestScore;
  score += pestScore * weights.pestHistory;

  // 4. Nitrogen Cycle Score (15%)
  const nitrogenScore = calculateNitrogenScore(crop, bed);
  factors.nitrogen = nitrogenScore;
  score += nitrogenScore * weights.nitrogen;

  // 5. Soil Health Score (10%)
  const soilScore = bed.organicMatterScore * 10;
  factors.soilHealth = soilScore;
  score += soilScore * weights.soilHealth;

  // 6. Root Depth Alternation (5%)
  const rootScore = calculateRootDepthScore(crop, bed);
  factors.rootDepth = rootScore;
  score += rootScore * weights.rootDepth;

  // 7. Productivity Factors (10%)
  const productivityScore = calculateProductivityScore(crop, bed);
  factors.productivity = productivityScore;
  score += productivityScore * weights.productivity;

  return { score, factors };
}

function calculateRotationScore(crop, bed) {
  const family = crop.family;
  const history = bed.plantingHistory;

  // Find most recent planting of same family
  for (let i = 0; i < history.length; i++) {
    if (history[i].family === family) {
      const yearsAgo = i + 1;  // history[0] = last year
      const minYears = CROP_FAMILIES[family].minBreakYears;

      if (yearsAgo < minYears) {
        // Penalty: 0-50 based on how recent
        return Math.max(0, 50 - (minYears - yearsAgo) * 25);
      } else if (yearsAgo === minYears) {
        return 75;  // Just meeting minimum
      } else {
        return 100; // Exceeds minimum
      }
    }
  }

  return 100;  // Family never planted here = perfect
}

function calculateNitrogenScore(crop, bed) {
  const history = bed.plantingHistory;
  const cropNeed = crop.nitrogenRole;

  // Check if legume was recent predecessor
  const recentLegume = history.slice(0, 2).some(h =>
    CROP_FAMILIES["Fabaceae"].crops.includes(h.crop)
  );

  if (cropNeed === "heavy_feeder" && recentLegume) {
    return 100;  // Perfect: heavy feeder after nitrogen fixer
  } else if (cropNeed === "heavy_feeder" && !recentLegume) {
    return 60;   // OK but not ideal
  } else if (cropNeed === "n_fixer") {
    return 90;   // Legumes can go almost anywhere
  } else if (cropNeed === "light_feeder") {
    return 85;   // Light feeders are flexible
  }

  return 75;  // Default
}
```

### Phase 2: Add Hard Constraint Validation

Before scoring, validate that assignment is even possible:

```javascript
function validateHardConstraints(crop, bed) {
  const errors = [];
  const warnings = [];

  const family = crop.family;
  const minBreak = CROP_FAMILIES[family]?.minBreakYears || 2;

  // Check rotation violation
  for (let i = 0; i < minBreak - 1; i++) {
    if (bed.plantingHistory[i]?.family === family) {
      errors.push(`VIOLATION: ${family} planted ${i + 1} year(s) ago, requires ${minBreak} year break`);
    }
  }

  // Check antagonist plants
  if (crop.antagonists) {
    const lastCrop = bed.plantingHistory[0]?.crop;
    if (crop.antagonists.includes(lastCrop)) {
      warnings.push(`WARNING: ${lastCrop} (antagonist) was previous crop`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

### Phase 3: Optimization (Future Enhancement)

Once basic scoring works, add optimization:

1. **Greedy Assignment:** Assign highest-value crops first to best beds
2. **Simulated Annealing:** Start with greedy, then randomly swap to find better solutions
3. **Genetic Algorithm:** If needed for very complex multi-field optimization

### Implementation Order

| Phase | Feature | Complexity | Value |
|-------|---------|------------|-------|
| 1 | Weighted scoring for single crop | Low | High |
| 2 | Hard constraint validation | Low | High |
| 3 | Batch assignment (multiple crops) | Medium | High |
| 4 | What-if analysis | Medium | Medium |
| 5 | Optimization algorithm | High | Medium |
| 6 | ML yield prediction | Very High | Future |

---

## 5. COMMERCIAL SOLUTIONS ANALYSIS

### FarmOS
- **Open source** (Drupal-based)
- Tracks locations, events, assets
- Modular/extensible
- **No built-in planning algorithm** - manual assignment
- Source: [farmos.org](https://farmos.org/)

### Tend.com
- **AI-powered** crop planning
- Auto-populated crop database (spacing, DTM, yield)
- Organic/diversified farm focus
- Crop rotation planning built-in
- Sales + accounting integration
- Source: [tend.com](https://www.tend.com/)

### Farmbrite
- Crop + livestock management
- Soil health and rotation tools
- Satellite imagery integration
- 100+ pre-built reports
- API + Zapier integration
- $29-79/month
- Source: [farmbrite.com](https://www.farmbrite.com/)

### LiteFarm
- **Open source** sustainable farm software
- Free
- Source: [litefarm.org](https://www.litefarm.org/)

### Key Takeaway
**Tend.com** appears most sophisticated for planning algorithms. Consider studying their approach or even using their API if available.

---

## 6. OPEN SOURCE AI PROJECTS

### Curated Collection
**[awesome-agriculture](https://github.com/brycejohnston/awesome-agriculture)** - Comprehensive list including:
- FarmVibes.AI (Microsoft) - Multi-modal geospatial ML
- PlantCV - Plant phenotyping
- CropHarvest - 95,186 labeled satellite imagery datapoints

### Crop Recommendation Systems
- **[CropFusionAI](https://github.com/deepeshdm/CropFusionAI)** - Recommends from 22 crop classes
- **[AgriSens](https://github.com/ravikant-diwakar/AgriSens)** - ML crop recommendations + disease ID
- **[AGRI.AI](https://github.com/karthikreddy-7/AGRI.AI)** - Crop/fertilizer/disease recommendations

### Relevant Techniques
- Random Forest for crop classification
- CNN for disease detection from images
- Neural networks with R² of 0.92-0.97 for yield prediction
- LSTM for time-series weather/yield predictions

---

## 7. RECOMMENDED NEXT STEPS

### Immediate (This Week)
1. **Define crop family data** - Create the CROP_FAMILIES lookup
2. **Build bed history schema** - Add plantingHistory to bed records
3. **Implement basic scoring** - Start with rotation + nitrogen only

### Short-term (This Month)
4. **Add hard constraint validation** - Prevent violations
5. **Create assignment UI** - Show scores, factors, warnings
6. **Test with real data** - Use 2025 Tiny Seed planting records

### Medium-term (Q1 2026)
7. **Add batch optimization** - Assign multiple crops optimally
8. **Integrate with succession planner** - Time-based constraints
9. **Build learning system** - Track actual yields to improve scoring

---

## SOURCES

### Academic Papers
- [Multi-objective models for crop rotation planning](https://www.sciencedirect.com/science/article/abs/pii/S0308521X24002002) - ScienceDirect 2024
- [Scientific planning with Hybrid SA-GA](https://www.nature.com/articles/s41598-025-14188-5) - Nature 2025
- [Solving crop allocation with hard/soft constraints](https://www.cambridge.org/core/journals/rairo-operations-research/article/abs/solving-the-crop-allocation-problemusing-hard-and-soft-constraints/928250B2BF7802F29B31EE47D2FD9993) - Cambridge
- [Crop yield prediction review](https://www.sciencedirect.com/science/article/pii/S2405844024168673) - ScienceDirect 2024
- [Diversifying rotation improves soil health](https://pmc.ncbi.nlm.nih.gov/articles/PMC10764956/) - PMC
- [Legume rotation yield advantage](https://pmc.ncbi.nlm.nih.gov/articles/PMC9395539/) - PMC

### Companion Planting Science
- [Allelopathy in Agriculture](https://pmc.ncbi.nlm.nih.gov/articles/PMC4647110/) - PMC/Frontiers
- [Science of Companion Planting](https://ucanr.edu/blog/uc-master-gardeners-san-mateo-san-francisco-counties/article/better-together-new-science) - UC Agriculture
- [Companion Planting Resources](https://attra.ncat.org/publication/companion-planting-resources/) - ATTRA

### Commercial Software
- [FarmOS](https://farmos.org/) - Open source
- [Tend.com](https://www.tend.com/) - AI-powered
- [Farmbrite](https://www.farmbrite.com/) - Comprehensive
- [LiteFarm](https://www.litefarm.org/) - Open source

### Open Source Projects
- [awesome-agriculture](https://github.com/brycejohnston/awesome-agriculture) - GitHub collection
- [CropFusionAI](https://github.com/deepeshdm/CropFusionAI) - Crop recommendations
- [AgriSens](https://github.com/ravikant-diwakar/AgriSens) - Smart farming assistant

---

*Grants_Funding Claude - Research Complete*
*This research feeds into Field_Operations Claude's build of the Intelligent Field Planner*

---

---

# PREVIOUS SESSION STATUS (Grants Work)

## FRUITGUYS APPLICATION: READY TO SUBMIT ✅

**Deadline:** January 30, 2026 (**6 DAYS**)
**Amount Requested:** $5,000
**Files Ready:**
- `FRUITGUYS_APPLICATION_DRAFT.md` - All form responses
- `FRUITGUYS_BUDGET.html` - Professional PDF with logo
- `KRETSCHMANN_LANDOWNER_LETTER_DRAFT.md` - Template for Don

**Owner Actions:**
1. [ ] Get landowner letter from Don
2. [ ] Take farm photos
3. [ ] Submit by Jan 30

## PA AG INNOVATION: AWAITING ELIGIBILITY ANSWER

**Question:** Can Round 1 recipients apply for Round 2?
**Contact:** Michael Roth - 717-210-1217

## COMMUNITY NETWORKING ROADMAP: CREATED ✅

**File:** `COMMUNITY_NETWORKING_ROADMAP.md`
- 90-day action plan for building Extension/PASA relationships
- SARE ladder strategy (Farmer Grant 2026 → R&E Grant 2027)

---

## COMPLETE FILE INVENTORY

```
claude_sessions/grants_funding/
├── INBOX.md
├── OUTBOX.md                          ← You are here
├── GRANT_FUNDING_SUMMARY.md
├── GRANT_DATABASE.md
├── GRANT_READINESS.md
├── GRANT_CALENDAR_2026.md
├── EQIP_CONSULTATION_PREP.md
├── PA_AG_INNOVATION_PREP.md
├── PA_AG_INNOVATION_DRAFT.md
├── 2026_GRANT_ACTION_PLAN.md
├── GRANT_APPLICATION_CHECKLIST.md
├── COMMUNITY_PARTNERS.md
├── FRUITGUYS_WINNER_ANALYSIS.md
├── FRUITGUYS_APPLICATION_DRAFT.md     ✅ Ready
├── FRUITGUYS_BUDGET.html              ✅ Ready
├── KRETSCHMANN_LANDOWNER_LETTER_DRAFT.md ✅ Ready
└── COMMUNITY_NETWORKING_ROADMAP.md    ✅ Ready
```

---

*Grants_Funding Claude - Session 9*
*Research assignment: COMPLETE*
*FruitGuys: READY (6 days to deadline)*
