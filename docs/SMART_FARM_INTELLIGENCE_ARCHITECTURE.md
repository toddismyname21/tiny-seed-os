# Smart Farm Intelligence System Architecture

**Version:** 1.0
**Date:** 2026-02-11
**Status:** Design Document
**Author:** PM_Architect Claude

---

## Executive Summary

This document outlines the architecture for a Smart Farm Intelligence system that learns from historical data to provide actionable recommendations. The design is **modular**, integrating with existing Tiny Seed OS infrastructure while avoiding duplication of the many learning systems already in place.

### Existing Learning Infrastructure (DO NOT DUPLICATE)

Before building anything new, this audit identified the following existing intelligence systems:

| System | Location | Capability |
|--------|----------|------------|
| SeasonalPatternDetection.js | apps_script/ | Year-over-year task comparison, seasonal reminders |
| TimeTrackingFeedbackLoop.js | apps_script/ | Task time estimation learning, employee efficiency |
| SmartCSAIntelligence.js | apps_script/ | Member health scoring, churn prediction |
| FarmIntelligence.js | apps_script/ | Farm-wide recommendations |
| SmartSuccessionPlanner.js | apps_script/ | Succession planning AI |
| PRODUCTION_INTELLIGENCE_UPGRADE.js | apps_script/ | Yield predictions (PARTIAL) |
| getHarvestPredictions() | MERGED TOTAL.js | GDD-based harvest prediction |
| getHarvestReadyCrops() | MERGED TOTAL.js | Crops ready for harvest |
| VARIETY_REVIEWS sheet | Google Sheets | Variety rating system (exists) |
| TIME_LEARNING sheet | Google Sheets | Time estimate learning storage |
| SEASONAL_BASELINES sheet | Google Sheets | Seasonal baseline storage |

### What Does NOT Exist Yet

| Feature | Gap |
|---------|-----|
| Yield Prediction Engine | No historical yield storage or prediction model |
| Variety Performance Ranking | VARIETY_REVIEWS exists but no aggregation/ranking |
| Bed/Location Intelligence | Bed data exists but no crop-bed optimization |
| Succession Gap Analyzer | No harvest gap detection vs market demand |
| Risk Scoring Engine | No unified risk model |
| Revenue Optimizer | No profit/sq ft calculation or ranking |

---

## System Architecture

### 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                           SMART FARM INTELLIGENCE LAYER                            |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+|
|  | YIELD           |  | VARIETY         |  | BED/LOCATION    |  | SUCCESSION     ||
|  | PREDICTION      |  | PERFORMANCE     |  | INTELLIGENCE    |  | GAP            ||
|  | ENGINE          |  | TRACKER         |  |                 |  | ANALYZER       ||
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+|
|                                                                                   |
|  +-----------------+  +-----------------+  +---------------------------------------+|
|  | RISK            |  | REVENUE         |  | RECOMMENDATION                       ||
|  | SCORING         |  | OPTIMIZER       |  | ENGINE (ORCHESTRATOR)                ||
|  | ENGINE          |  |                 |  |                                      ||
|  +-----------------+  +-----------------+  +---------------------------------------+|
|                                                                                   |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                              DATA ACCESS LAYER                                     |
+-----------------------------------------------------------------------------------+
|  +-------------+  +-------------+  +-------------+  +-------------+  +------------+|
|  | PLANNING_   |  | HARVEST_    |  | BEDS        |  | WEATHER     |  | SALES      ||
|  | 2026        |  | LOG         |  |             |  | HISTORY     |  | DATA       ||
|  +-------------+  +-------------+  +-------------+  +-------------+  +------------+|
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                           LEARNING STORAGE LAYER                                   |
+-----------------------------------------------------------------------------------+
|  +------------------+  +------------------+  +------------------+  +---------------+|
|  | YIELD_MODELS     |  | VARIETY_         |  | BED_CROP_        |  | RISK_        ||
|  | (Predictions)    |  | PERFORMANCE      |  | RANKINGS         |  | HISTORY      ||
|  +------------------+  +------------------+  +------------------+  +---------------+|
|                                                                                   |
|  +------------------+  +------------------+  +------------------+  +---------------+|
|  | SUCCESSION_      |  | REVENUE_         |  | MODEL_           |  | FEEDBACK_    ||
|  | PATTERNS         |  | BENCHMARKS       |  | METADATA         |  | LOG          ||
|  +------------------+  +------------------+  +------------------+  +---------------+|
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                              API LAYER (MERGED TOTAL.js)                           |
+-----------------------------------------------------------------------------------+
|  getYieldPrediction()  |  getVarietyRankings()  |  getBedRecommendations()        |
|  getSuccessionGaps()   |  getRiskScore()        |  getRevenueOptimization()       |
|  recordActualYield()   |  submitFeedback()      |  getIntelligenceDashboard()     |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                              FRONTEND INTEGRATION                                  |
+-----------------------------------------------------------------------------------+
|  planning.html  |  succession.html  |  admin.html  |  chief-of-staff.html         |
|  (Bed/Yield)    |  (Gap Analysis)   |  (Analytics) |  (Recommendations)           |
+-----------------------------------------------------------------------------------+
```

---

## 2. Data Model for Learning Storage

### 2.1 YIELD_MODELS Sheet

Stores learned yield predictions and model accuracy.

| Column | Type | Description |
|--------|------|-------------|
| Model_ID | String | Unique identifier (e.g., YM_TOMATO_CHEROKEE_2026) |
| Crop | String | Crop name |
| Variety | String | Variety name (optional) |
| Bed_ID | String | Specific bed (optional, for location-specific models) |
| Season | String | spring/summer/fall/winter |
| Year | Number | Year of data |
| Predicted_Yield_Per_Ft | Number | Predicted lbs or units per row foot |
| Actual_Yield_Per_Ft | Number | Actual recorded yield (when available) |
| Variance_Pct | Number | (Actual - Predicted) / Predicted * 100 |
| Confidence_Level | Number | 0-100 based on sample size |
| Sample_Size | Number | Number of data points in model |
| Input_Features | JSON | Features used: {planting_date, dtm, weather_gdd, bed_type} |
| Model_Type | String | LINEAR, HISTORICAL_AVG, ML_REGRESSION |
| Last_Updated | DateTime | When model was last retrained |
| Notes | String | Any anomalies or exclusions |

### 2.2 VARIETY_PERFORMANCE Sheet

Aggregated variety performance metrics (extends existing VARIETY_REVIEWS).

| Column | Type | Description |
|--------|------|-------------|
| Performance_ID | String | Unique identifier |
| Crop | String | Crop name |
| Variety | String | Variety name |
| Source | String | Seed source |
| Years_Grown | Number | How many years grown |
| Avg_Yield_Per_Ft | Number | Average yield across all years |
| Yield_Consistency | Number | 0-100 (low variance = high consistency) |
| Avg_DTM | Number | Average days to maturity |
| Disease_Incidents | Number | Count of disease occurrences |
| Disease_Resistance_Score | Number | 0-100 |
| Quality_Score | Number | 0-100 based on reviews |
| Market_Value_Index | Number | Relative revenue per ft vs average |
| Grow_Again_Pct | Number | % of reviews marked "grow again" |
| Total_Beds_Grown | Number | Total beds grown across years |
| Total_Revenue | Number | Total revenue attributed to variety |
| Composite_Score | Number | Weighted combination of all metrics |
| Rank_Overall | Number | Rank within crop category |
| Rank_For_Bed_Type | String | JSON: {greenhouse: 2, field: 1} |
| Last_Calculated | DateTime | When metrics were last updated |

### 2.3 BED_CROP_RANKINGS Sheet

Optimal crop-bed pairings based on historical performance.

| Column | Type | Description |
|--------|------|-------------|
| Ranking_ID | String | Unique identifier |
| Bed_ID | String | Bed identifier |
| Bed_Name | String | Human-readable name |
| Bed_Type | String | greenhouse, field, high_tunnel |
| Soil_Type | String | If known |
| Sun_Exposure | String | full, partial, shade |
| Crop | String | Crop name |
| Variety | String | Best performing variety |
| Performance_Score | Number | 0-100 composite score |
| Yield_Multiplier | Number | Yield vs farm average (1.0 = average) |
| Times_Grown | Number | How many times grown in this bed |
| Last_Grown | Date | Last time this pairing was used |
| Rotation_Gap_Years | Number | Recommended gap before replanting |
| Rotation_Conflicts | JSON | Crops NOT to follow with |
| Recommended | Boolean | Currently recommended pairing |
| Confidence | Number | 0-100 based on data quality |

### 2.4 SUCCESSION_PATTERNS Sheet

Learned succession patterns and gap detection.

| Column | Type | Description |
|--------|------|-------------|
| Pattern_ID | String | Unique identifier |
| Crop | String | Crop name |
| Variety | String | Variety (optional) |
| Year | Number | Historical year |
| Week | Number | Week of year (1-52) |
| Expected_Harvest_Lbs | Number | Expected harvest volume |
| Actual_Harvest_Lbs | Number | Actual harvest volume |
| Market_Demand_Lbs | Number | From sales data |
| Gap_Type | String | SHORTAGE, SURPLUS, BALANCED |
| Gap_Amount | Number | +/- lbs difference |
| Revenue_Lost | Number | Estimated revenue from shortage |
| Storage_Cost | Number | Cost of surplus handling |
| Successions_Planted | Number | How many successions |
| Succession_Interval_Days | Number | Days between plantings |
| Recommended_Adjustment | String | ADD_SUCCESSION, REDUCE, NONE |
| Confidence | Number | Based on data quality |

### 2.5 RISK_HISTORY Sheet

Risk events for building predictive models.

| Column | Type | Description |
|--------|------|-------------|
| Risk_ID | String | Unique identifier |
| Date | Date | When risk occurred |
| Crop | String | Affected crop |
| Variety | String | Affected variety |
| Bed_ID | String | Where it occurred |
| Risk_Type | String | DISEASE, PEST, WEATHER, GERMINATION_FAILURE, OTHER |
| Risk_Severity | Number | 1-10 scale |
| Impact_Type | String | CROP_LOSS, YIELD_REDUCTION, QUALITY_DEGRADATION |
| Impact_Pct | Number | % of crop affected |
| Weather_Context | JSON | {temp, humidity, recent_rain} |
| Season | String | When it occurred |
| Week_Of_Year | Number | Week number |
| Preventable | Boolean | In hindsight, was it preventable? |
| Prevention_Notes | String | What could have been done |
| Resolution | String | How it was handled |

### 2.6 REVENUE_BENCHMARKS Sheet

Revenue and profitability tracking by crop.

| Column | Type | Description |
|--------|------|-------------|
| Benchmark_ID | String | Unique identifier |
| Crop | String | Crop name |
| Variety | String | Variety (optional) |
| Year | Number | Year of data |
| Avg_Price_Per_Lb | Number | Average selling price |
| Avg_Yield_Per_Ft | Number | From YIELD_MODELS |
| Revenue_Per_Ft | Number | Price * Yield |
| Labor_Cost_Per_Ft | Number | From TIME_LEARNING |
| Seed_Cost_Per_Ft | Number | From seed inventory |
| Other_Costs_Per_Ft | Number | Supplies, etc. |
| Profit_Per_Ft | Number | Revenue - All Costs |
| Profit_Margin | Number | Profit / Revenue |
| Market_Channel | String | CSA, wholesale, farmers_market |
| Season | String | When best sold |
| Demand_Rating | Number | 0-100 customer demand |
| Grow_Recommendation | String | INCREASE, MAINTAIN, REDUCE, ELIMINATE |
| Rank_By_Profit | Number | Ranking among all crops |

### 2.7 MODEL_METADATA Sheet

Tracks all learning models and their performance.

| Column | Type | Description |
|--------|------|-------------|
| Metadata_ID | String | Unique identifier |
| Model_Type | String | YIELD, VARIETY, BED, SUCCESSION, RISK, REVENUE |
| Model_Version | String | Version number |
| Training_Date | DateTime | When last trained |
| Training_Samples | Number | Data points used |
| Validation_Score | Number | Model accuracy metric |
| Active | Boolean | Currently in use |
| Parameters | JSON | Model hyperparameters |
| Notes | String | Training notes |

### 2.8 INTELLIGENCE_FEEDBACK Sheet

User feedback on recommendations.

| Column | Type | Description |
|--------|------|-------------|
| Feedback_ID | String | Unique identifier |
| Timestamp | DateTime | When feedback given |
| Recommendation_Type | String | YIELD, VARIETY, BED, SUCCESSION, RISK, REVENUE |
| Recommendation_ID | String | Reference to specific recommendation |
| User_ID | String | Who provided feedback |
| Accepted | Boolean | Was recommendation followed |
| Outcome | String | What actually happened |
| Rating | Number | 1-5 usefulness rating |
| Comments | String | User notes |
| Used_For_Training | Boolean | Has this been incorporated |

---

## 3. API Endpoint Specifications

### 3.1 Yield Prediction Engine

```javascript
/**
 * GET /api?action=getYieldPrediction
 *
 * @param {string} crop - Crop name (required)
 * @param {string} variety - Variety name (optional)
 * @param {string} bedId - Specific bed (optional)
 * @param {string} plantingDate - Planned planting date YYYY-MM-DD
 * @param {number} rowFeet - Number of row feet planted
 * @returns {Object} Yield prediction with confidence
 */
{
  success: true,
  prediction: {
    crop: "Tomato",
    variety: "Cherokee Purple",
    predicted_yield_lbs: 150,
    yield_per_ft: 2.5,
    confidence: 78,
    range: { low: 120, high: 180 },
    factors: [
      { name: "Historical Average", impact: "+0.0 lbs/ft" },
      { name: "Bed Performance", impact: "+0.3 lbs/ft" },
      { name: "Planting Date", impact: "-0.1 lbs/ft (late)" }
    ],
    comparable_batches: [
      { year: 2025, bed: "GH-1", yield: 145, notes: "Dry July" },
      { year: 2024, bed: "GH-2", yield: 162, notes: "Excellent" }
    ]
  },
  model_version: "YM_2.1",
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * POST /api?action=recordActualYield
 *
 * Records actual yield for model improvement
 *
 * @param {string} batchId - Batch identifier
 * @param {number} actualYieldLbs - Actual harvested amount
 * @param {string} qualityNotes - Any quality observations
 */
{
  success: true,
  variance: {
    predicted: 150,
    actual: 142,
    variance_pct: -5.3,
    model_will_update: true
  },
  message: "Yield recorded. Model confidence improved to 81%."
}
```

### 3.2 Variety Performance Tracker

```javascript
/**
 * GET /api?action=getVarietyRankings
 *
 * @param {string} crop - Filter by crop (optional)
 * @param {string} metric - Sort by: yield, quality, profit, composite (default: composite)
 * @param {number} limit - Number to return (default: 20)
 * @param {string} bedType - Filter by: greenhouse, field, all (default: all)
 * @returns {Array} Ranked varieties with metrics
 */
{
  success: true,
  crop: "Tomato",
  bedType: "all",
  metric: "composite",
  rankings: [
    {
      rank: 1,
      variety: "Cherokee Purple",
      source: "Johnny's",
      composite_score: 92,
      metrics: {
        yield_per_ft: 2.8,
        yield_score: 88,
        quality_score: 95,
        disease_resistance: 78,
        market_value: 94,
        consistency: 85
      },
      years_grown: 4,
      recommendation: "TOP_PERFORMER - Increase plantings",
      notes: "Consistent high quality, strong customer demand"
    },
    {
      rank: 2,
      variety: "Brandywine",
      source: "Seed Savers",
      composite_score: 84,
      // ... similar structure
    }
  ],
  total_varieties_analyzed: 12,
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * POST /api?action=submitVarietyReview
 *
 * Adds a variety performance review
 *
 * @param {string} crop - Crop name
 * @param {string} variety - Variety name
 * @param {number} yieldRating - 1-5
 * @param {number} qualityRating - 1-5
 * @param {number} diseaseResistance - 1-5
 * @param {boolean} growAgain - Would grow again
 * @param {string} notes - Observations
 */
```

### 3.3 Bed/Location Intelligence

```javascript
/**
 * GET /api?action=getBedRecommendations
 *
 * @param {string} crop - Crop to place (required)
 * @param {string} variety - Variety (optional)
 * @param {string} season - Target season (optional)
 * @returns {Array} Ranked bed recommendations
 */
{
  success: true,
  crop: "Lettuce",
  recommendations: [
    {
      rank: 1,
      bed_id: "GH-3",
      bed_name: "Greenhouse Row 3",
      score: 95,
      reasons: [
        "Historically 20% higher yield for lettuce",
        "Optimal sun exposure for spring",
        "Good rotation - no lettuce in 2 years"
      ],
      warnings: [],
      last_crop: "Spinach (2025)",
      rotation_safe: true
    },
    {
      rank: 2,
      bed_id: "HT-2",
      bed_name: "High Tunnel Bed 2",
      score: 82,
      reasons: [
        "Good temperature control",
        "Recent soil amendment"
      ],
      warnings: [
        "Lettuce grown here 2024 - borderline rotation"
      ],
      rotation_safe: true
    }
  ],
  beds_analyzed: 24,
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * GET /api?action=getCropRotationPlan
 *
 * @param {string} bedId - Specific bed (optional)
 * @param {number} years - Years to plan (default: 3)
 * @returns {Object} Multi-year rotation recommendations
 */
```

### 3.4 Succession Gap Analyzer

```javascript
/**
 * GET /api?action=getSuccessionGaps
 *
 * @param {string} crop - Filter by crop (optional)
 * @param {string} startDate - Analysis start YYYY-MM-DD (default: today)
 * @param {string} endDate - Analysis end YYYY-MM-DD (default: +12 weeks)
 * @returns {Object} Production gaps and recommendations
 */
{
  success: true,
  analysis_period: { start: "2026-02-11", end: "2026-05-05" },
  gaps: [
    {
      crop: "Lettuce",
      week: 12,
      week_start: "2026-03-16",
      gap_type: "SHORTAGE",
      expected_harvest_lbs: 25,
      projected_demand_lbs: 60,
      gap_lbs: -35,
      revenue_at_risk: 105,
      recommendation: {
        action: "ADD_SUCCESSION",
        details: "Plant 100 heads by Feb 20 to fill Week 12 gap",
        priority: "HIGH",
        confidence: 85
      }
    },
    {
      crop: "Kale",
      week: 14,
      gap_type: "SURPLUS",
      expected_harvest_lbs: 80,
      projected_demand_lbs: 40,
      gap_lbs: +40,
      handling_cost: 20,
      recommendation: {
        action: "FIND_MARKET",
        details: "40 lbs surplus - consider wholesale or farmers market",
        priority: "MEDIUM"
      }
    }
  ],
  summary: {
    total_gaps: 5,
    shortages: 3,
    surpluses: 2,
    total_revenue_at_risk: 285,
    total_handling_cost: 45
  },
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * GET /api?action=getSuccessionCalendar
 *
 * Visual calendar view of harvest projections vs demand
 */
```

### 3.5 Risk Scoring Engine

```javascript
/**
 * GET /api?action=getRiskScore
 *
 * @param {string} crop - Crop name (required)
 * @param {string} variety - Variety (optional)
 * @param {string} bedId - Where planted (optional)
 * @param {string} plantingDate - When planted YYYY-MM-DD
 * @returns {Object} Risk assessment with factors
 */
{
  success: true,
  risk_score: 42,
  risk_level: "MODERATE",
  risk_color: "#ffc107",
  factors: [
    {
      category: "WEATHER",
      score: 55,
      details: "Late frost risk next 2 weeks (35% probability)",
      weight: 0.25
    },
    {
      category: "DISEASE",
      score: 30,
      details: "No disease history for this variety in this bed",
      weight: 0.30
    },
    {
      category: "GERMINATION",
      score: 20,
      details: "High germination rate historically (95%)",
      weight: 0.15
    },
    {
      category: "ROTATION",
      score: 60,
      details: "Same family grown here 2 years ago - some risk",
      weight: 0.20
    },
    {
      category: "SEASON",
      score: 40,
      details: "Planting within normal window",
      weight: 0.10
    }
  ],
  mitigations: [
    {
      factor: "WEATHER",
      action: "Have row cover ready for frost protection",
      impact: "Could reduce weather risk to 35"
    },
    {
      factor: "ROTATION",
      action: "Consider bed GH-4 instead (no family conflict)",
      impact: "Would reduce rotation risk to 10"
    }
  ],
  historical_failures: [
    { year: 2024, crop: "Tomato", bed: "F-12", cause: "Early blight", severity: 6 }
  ],
  confidence: 75,
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * POST /api?action=recordRiskEvent
 *
 * Records a risk/failure event for future learning
 */
```

### 3.6 Revenue Optimizer

```javascript
/**
 * GET /api?action=getRevenueOptimization
 *
 * @param {number} availableSqFt - Total growing space available
 * @param {string} season - Target season
 * @param {string} channel - Market channel: csa, wholesale, farmers_market, all
 * @returns {Object} Optimal crop mix for maximum revenue
 */
{
  success: true,
  optimization: {
    available_sq_ft: 5000,
    season: "spring",
    channel: "all",
    projected_revenue: 12500,
    projected_costs: 4200,
    projected_profit: 8300,
    profit_margin: 66
  },
  recommendations: [
    {
      rank: 1,
      crop: "Salad Mix",
      variety: "Spring Mix",
      recommended_sq_ft: 1500,
      profit_per_sq_ft: 2.85,
      projected_revenue: 4275,
      projected_profit: 2850,
      confidence: 88,
      notes: "Highest margin, strong CSA demand"
    },
    {
      rank: 2,
      crop: "Tomato",
      variety: "Cherokee Purple",
      recommended_sq_ft: 1000,
      profit_per_sq_ft: 2.40,
      projected_revenue: 3200,
      projected_profit: 2400,
      confidence: 82,
      notes: "Premium prices, proven performer"
    },
    // ... more crops
  ],
  comparison_to_last_year: {
    revenue_change: "+12%",
    profit_change: "+18%",
    key_changes: [
      "Increased salad mix allocation (+200 sq ft)",
      "Reduced beet allocation (-100 sq ft) due to lower demand"
    ]
  },
  constraints_applied: [
    "CSA variety requirements met",
    "Minimum 8 crop families for rotation",
    "Labor capacity: 40 hrs/week"
  ],
  timestamp: "2026-02-11T14:30:00Z"
}

/**
 * GET /api?action=getProfitBySquareFoot
 *
 * @param {string} year - Year to analyze (default: current)
 * @returns {Array} All crops ranked by profit per square foot
 */
```

### 3.7 Intelligence Dashboard

```javascript
/**
 * GET /api?action=getIntelligenceDashboard
 *
 * Single endpoint for dashboard overview
 *
 * @returns {Object} All intelligence summaries
 */
{
  success: true,
  dashboard: {
    yield_predictions: {
      batches_in_ground: 45,
      predicted_total_harvest: "2,450 lbs",
      confidence_avg: 78,
      alerts: [
        { batch: "BATCH_2026_042", message: "Below expected yield trajectory" }
      ]
    },
    variety_insights: {
      top_performers: ["Cherokee Purple", "Butterhead Lettuce", "Lacinato Kale"],
      underperformers: ["Roma Tomato", "Detroit Beets"],
      new_trials: 3
    },
    bed_status: {
      total_beds: 24,
      optimal_matches: 18,
      rotation_warnings: 3,
      improvement_opportunities: 3
    },
    succession_health: {
      gaps_next_4_weeks: 2,
      surpluses_next_4_weeks: 1,
      revenue_at_risk: 285,
      action_items: 3
    },
    risk_overview: {
      high_risk_batches: 2,
      moderate_risk_batches: 8,
      low_risk_batches: 35,
      top_risk_factors: ["Late frost", "Aphid pressure"]
    },
    revenue_tracking: {
      ytd_revenue: 45000,
      ytd_profit: 28000,
      vs_last_year: "+15%",
      top_profit_crops: ["Salad Mix", "Microgreens", "Tomatoes"]
    }
  },
  last_model_update: "2026-02-10T06:00:00Z",
  next_scheduled_update: "2026-02-11T06:00:00Z",
  timestamp: "2026-02-11T14:30:00Z"
}
```

---

## 4. Frontend Integration Plan

### 4.1 Integration Points by Page

| Page | Intelligence Features | Priority |
|------|----------------------|----------|
| `planning.html` | Yield predictions, bed recommendations, risk scores | HIGH |
| `succession.html` | Gap analysis, succession calendar, demand matching | HIGH |
| `admin.html` | Intelligence dashboard, model health, all analytics | HIGH |
| `chief-of-staff.html` | Proactive recommendations, natural language queries | HIGH |
| `index.html` (Employee) | Today's risk alerts, harvest predictions | MEDIUM |
| `financial-dashboard.html` | Revenue optimization, profit rankings | MEDIUM |
| `smart_learning_DTM.html` | Yield model details, historical comparisons | MEDIUM |
| `seed_inventory_PRODUCTION.html` | Variety rankings when ordering seeds | LOW |

### 4.2 UI Components to Build

```
1. YIELD PREDICTION CARD
   - Shows when hovering/clicking a planned batch
   - Displays: predicted yield, confidence bar, range
   - "Learn more" expands to show factors

2. BED RECOMMENDATION WIDGET
   - Appears in planning workflow when selecting bed
   - Ranked list with scores and reasons
   - Quick-assign button

3. SUCCESSION GAP TIMELINE
   - Visual timeline showing harvest vs demand
   - Red zones for shortages, yellow for surplus
   - Click to see recommended actions

4. RISK BADGE
   - Color-coded badge (green/yellow/orange/red)
   - Shows score on hover
   - Click for full risk breakdown

5. REVENUE DASHBOARD PANEL
   - Profit/sq ft rankings table
   - Season-by-season comparison
   - "Optimize" button for recommendations

6. INTELLIGENCE ALERTS BANNER
   - Persistent banner showing top 3 actionable items
   - Quick-dismiss or quick-action buttons
   - Links to detailed views
```

### 4.3 Chief of Staff Natural Language Integration

The Chief of Staff AI should be able to answer:

```
- "Which variety of tomato should I plant?"
- "What's the best bed for lettuce right now?"
- "Do I have any production gaps coming up?"
- "What's my highest profit crop?"
- "Is it risky to plant peppers this early?"
- "How is my Cherokee Purple doing compared to last year?"
- "What should I plant to maximize revenue this spring?"
```

Add to `chatWithChiefOfStaff()` context injection:

```javascript
// Add to context gathering
context.yieldPredictions = getYieldPrediction({summary: true});
context.varietyTopPerformers = getVarietyRankings({limit: 5, metric: 'composite'});
context.successionGaps = getSuccessionGaps({weeks: 4});
context.riskAlerts = getRiskAlerts({threshold: 60});
context.profitRankings = getProfitBySquareFoot({limit: 5});
```

---

## 5. Implementation Phases

### Phase 1: Data Foundation (Week 1-2) - PRIORITY: CRITICAL

**Goal:** Create the storage infrastructure and data collection mechanisms.

**Tasks:**
1. Create all new sheets (YIELD_MODELS, VARIETY_PERFORMANCE, BED_CROP_RANKINGS, etc.)
2. Build data migration scripts to populate from existing:
   - PLANNING_2026 -> YIELD_MODELS (historical batches)
   - VARIETY_REVIEWS -> VARIETY_PERFORMANCE
   - BEDS -> BED_CROP_RANKINGS
   - HARVEST_LOG -> Historical yield data
3. Create `recordActualYield()` endpoint
4. Create `recordRiskEvent()` endpoint
5. Build MODEL_METADATA tracking

**Deliverables:**
- All storage sheets created with headers
- Historical data populated
- Basic CRUD operations working

### Phase 2: Yield Prediction Engine (Week 3-4) - PRIORITY: HIGH

**Goal:** Predict yields with confidence intervals.

**Tasks:**
1. Build `getYieldPrediction()` function
2. Implement historical average model
3. Add bed performance multiplier
4. Add seasonal adjustment
5. Build confidence scoring based on sample size
6. Create yield comparison to actuals
7. Build model update trigger (weekly)

**Deliverables:**
- Working yield prediction API
- Integration with planning.html
- Model accuracy tracking

### Phase 3: Variety Performance Tracker (Week 5-6) - PRIORITY: HIGH

**Goal:** Rank varieties by composite performance metrics.

**Tasks:**
1. Build `getVarietyRankings()` function
2. Aggregate yield data by variety
3. Calculate disease resistance scores
4. Calculate market value index
5. Build composite scoring algorithm
6. Create variety comparison view
7. Link to seed inventory for ordering insights

**Deliverables:**
- Working variety ranking API
- Variety comparison UI component
- Seed ordering integration

### Phase 4: Bed/Location Intelligence (Week 7-8) - PRIORITY: MEDIUM

**Goal:** Recommend optimal crop-bed pairings.

**Tasks:**
1. Build `getBedRecommendations()` function
2. Integrate existing rotation data
3. Calculate bed-specific yield multipliers
4. Build rotation safety checker
5. Create multi-year rotation planner
6. Add soil type/sun exposure factors

**Deliverables:**
- Bed recommendation API
- Integration with planning workflow
- Rotation conflict alerts

### Phase 5: Succession Gap Analyzer (Week 9-10) - PRIORITY: HIGH

**Goal:** Identify and fill production gaps.

**Tasks:**
1. Build `getSuccessionGaps()` function
2. Integrate sales data for demand forecasting
3. Build harvest projection model
4. Create gap detection algorithm
5. Generate actionable recommendations
6. Build succession calendar visualization

**Deliverables:**
- Gap analysis API
- succession.html integration
- Visual harvest calendar

### Phase 6: Risk Scoring Engine (Week 11-12) - PRIORITY: MEDIUM

**Goal:** Proactively identify high-risk plantings.

**Tasks:**
1. Build `getRiskScore()` function
2. Integrate weather data (existing)
3. Build disease history correlation
4. Add rotation risk factor
5. Create mitigation suggestions
6. Build risk alert system

**Deliverables:**
- Risk scoring API
- Risk badges on planning view
- Proactive alerts in Chief of Staff

### Phase 7: Revenue Optimizer (Week 13-14) - PRIORITY: MEDIUM

**Goal:** Maximize farm profitability.

**Tasks:**
1. Build `getRevenueOptimization()` function
2. Integrate labor costs from TIME_LEARNING
3. Calculate profit per square foot
4. Build optimization algorithm
5. Add constraint handling (rotation, labor, variety)
6. Create comparison to previous years

**Deliverables:**
- Revenue optimization API
- Profit rankings dashboard
- Planting mix recommendations

### Phase 8: Dashboard & Integration (Week 15-16) - PRIORITY: HIGH

**Goal:** Unified intelligence dashboard and full integration.

**Tasks:**
1. Build `getIntelligenceDashboard()` endpoint
2. Create intelligence dashboard UI in admin.html
3. Add intelligence context to Chief of Staff
4. Create feedback collection mechanism
5. Build model performance monitoring
6. Documentation and training

**Deliverables:**
- Complete intelligence dashboard
- Full Chief of Staff integration
- Feedback loop operational
- User documentation

---

## 6. Success Metrics

| Metric | Baseline | Target (6 months) | Target (12 months) |
|--------|----------|-------------------|-------------------|
| Yield Prediction Accuracy | N/A | +/- 20% | +/- 15% |
| Model Confidence Avg | N/A | 70% | 80% |
| Succession Gap Revenue Loss | Unknown | Reduce by 30% | Reduce by 50% |
| Risk Event Prediction Rate | N/A | 60% predicted | 75% predicted |
| User Acceptance Rate | N/A | 50% recommendations accepted | 70% accepted |
| Revenue per Sq Ft | Baseline year | +10% | +20% |

---

## 7. Technical Considerations

### 7.1 Performance

- Cache frequently accessed predictions (15-minute TTL)
- Run model updates during off-hours (6 AM trigger)
- Limit historical lookback to 3 years for speed
- Use batch operations for sheet reads

### 7.2 Data Quality

- Require minimum sample sizes for high confidence
- Flag anomalous data for human review
- Maintain data lineage in MODEL_METADATA
- Allow manual overrides with logging

### 7.3 Model Governance

- Version all models
- Track accuracy over time
- Auto-degrade confidence if accuracy drops
- Human review for major model changes

### 7.4 Integration with Existing Systems

- Do NOT duplicate existing SeasonalPatternDetection logic
- Leverage existing TIME_LEARNING for labor costs
- Use existing BEDS data structure
- Integrate with existing Chief of Staff AI context

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Insufficient historical data | Medium | High | Start with simple models, improve over time |
| User doesn't trust predictions | Medium | High | Show confidence levels, allow feedback |
| Overfitting to small dataset | High | Medium | Use regularization, limit complexity |
| Performance issues with large data | Low | Medium | Caching, pagination, async updates |
| Integration complexity | Medium | Medium | Phased rollout, extensive testing |

---

## 9. Appendix: Existing Functions to Leverage

These existing functions should be CALLED, not duplicated:

```javascript
// From SeasonalPatternDetection.js
getSeasonalPatterns(params)      // Historical task patterns
compareToLastYear(params)        // Year-over-year comparison
generateSeasonalReminders()      // Seasonal alerts

// From TimeTrackingFeedbackLoop.js
calculateAverageTime(taskType, cropId, fieldId)  // Labor time estimates
getEfficiencyReport(employeeId, dateRange)       // Labor efficiency

// From MERGED TOTAL.js
getHarvestPredictions(params)    // GDD-based predictions
getHarvestReadyCrops()           // Current harvest status
getWeather()                     // Weather data
getBeds()                        // Bed information
getVarietyReviews()              // Existing reviews

// From SmartCSAIntelligence.js
calculateMemberHealthScoreEnhanced()  // Customer health (for demand)
```

---

## 10. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-11 | 1.0 | Initial architecture design | PM_Architect |

---

**END OF DOCUMENT**
