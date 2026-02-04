# SATELLITE INTEGRATION RESEARCH REPORT
## Tiny Seed Farm OS - Precision Agriculture via Remote Sensing
### Researcher: Claude PM_Architect | Date: 2026-02-03

---

# EXECUTIVE SUMMARY

This research report presents a comprehensive plan for integrating satellite imagery and APIs into Tiny Seed Farm OS to enable **predictive, proactive farm management** - the owner's mandate: *"I want it to be so smart that it knows what I should do before me."*

## Key Findings

1. **Optimal API Selection**: Agromonitoring API (free tier) + Google Earth Engine (free for research/small farms) provide the best cost-to-value ratio for Phase 1 implementation
2. **Multi-Agent Architecture**: A Supervisor Pattern with 6 specialized agents can interpret satellite data and generate actionable recommendations autonomously
3. **Implementation Timeline**: 3-phase approach over 2 day, starting with NDVI monitoring and Smart Scouting
4. **Estimated Cost**: $0-100/month for Phase 1 (free tiers), scaling to $200-500/month with commercial features
5. **Integration Path**: Leverages existing `REF_Fields` sheet and field management infrastructure

## The Vision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SATELLITE-POWERED PREDICTIVE FARMING                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SATELLITE DATA ──▶ AI AGENTS ──▶ PROACTIVE ALERTS ──▶ FARMER ACTION        │
│                                                                              │
│  "Your tomato field shows 15% NDVI drop in the northeast corner.            │
│   Based on weather data and historical patterns, this indicates             │
│   early water stress. Recommended action: Scout Block 3, Rows 15-20         │
│   tomorrow morning. If confirmed, increase irrigation by 20%."              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 1: SATELLITE API COMPARISON

## API Provider Matrix

| Provider | Cost | Resolution | Revisit | NDVI | API Ease | Best For |
|----------|------|------------|---------|------|----------|----------|
| **Agromonitoring** | Free (1000 ha) / $29+/mo | 10-30m | 3-5 days | Yes | Excellent | Small farms, prototyping |
| **Google Earth Engine** | Free (research) | 10-30m | 3-5 days | Yes | Moderate | Analysis, historical data |
| **Sentinel Hub** | Trial 30 days / $25+/mo | 10-20m | 5 days | Yes | Good | Custom analysis |
| **OneSoil** | Free | 10m | 3-5 days | Yes | App-only | Field boundaries, basic NDVI |
| **NASA Earthdata** | Free | 250m-30m | 1-16 days | Yes | Complex | Historical archives |
| **EOSDA Crop Monitoring** | $9-299/mo | 3-10m | 3-4 days | Yes | Good | Full-service platform |
| **Planet Labs** | $$$$ | 3m daily | Daily | Yes | Excellent | High-frequency monitoring |

## Detailed Provider Analysis

### 1. Agromonitoring API (OpenWeatherMap) - RECOMMENDED FOR PHASE 1

**Pricing Tiers:**
- Free: Up to 1,000 hectares, basic features
- Starter ($29/mo): 5,000 hectares, all vegetation indices
- Professional ($99/mo): 25,000 hectares, historical data, analytics

**Key Features:**
- Satellite imagery from Sentinel-2 and Landsat 8
- NDVI, EVI, NRI, DSWI, NDWI, NDMI indices
- Current and forecast weather integration
- Accumulated temperature and precipitation
- Soil moisture data
- Polygon-based field management

**API Endpoints:**
```javascript
// Create polygon (field)
POST https://api.agromonitoring.com/agro/1.0/polygons
{
  "name": "Tomato Field A",
  "geo_json": {
    "type": "Feature",
    "properties": {},
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[-73.2, 41.2], [-73.2, 41.3], [-73.3, 41.3], [-73.3, 41.2], [-73.2, 41.2]]]
    }
  }
}

// Get satellite imagery
GET https://api.agromonitoring.com/agro/1.0/image/search?polyid={id}&start={unix}&end={unix}

// Get NDVI statistics
GET https://api.agromonitoring.com/agro/1.0/ndvi?polyid={id}

// Get weather forecast
GET https://api.agromonitoring.com/agro/1.0/weather/forecast?polyid={id}
```

**Integration Complexity:** LOW - REST API, JSON responses, polygon-based

### 2. Google Earth Engine - RECOMMENDED FOR ANALYSIS

**Pricing:** Free for research, education, and non-profit use

**Key Features:**
- 80+ petabytes of satellite data
- Sentinel-2, Landsat, MODIS archives
- JavaScript and Python APIs
- Cloud-based processing
- Time-series analysis
- Machine learning integration

**Sample Code (Python):**
```python
import ee
ee.Initialize()

# Define field boundary
field = ee.Geometry.Polygon([
    [[-73.2, 41.2], [-73.2, 41.3], [-73.3, 41.3], [-73.3, 41.2]]
])

# Get Sentinel-2 imagery
sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR') \
    .filterBounds(field) \
    .filterDate('2026-01-01', '2026-02-01') \
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

# Calculate NDVI
def add_ndvi(image):
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    return image.addBands(ndvi)

ndvi_collection = sentinel2.map(add_ndvi)

# Get mean NDVI for field
stats = ndvi_collection.mean().reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=field,
    scale=10
)
```

**Integration Complexity:** MODERATE - Requires GEE account, Python SDK

### 3. Sentinel Hub (Copernicus Data Space)

**Pricing:**
- Trial: 30 days free, 30,000 requests, 300 PU/minute
- Exploration: $25/month, basic access
- Enterprise: Custom pricing

**Key Features:**
- Direct Sentinel-2 access
- Custom script capability (evalscript)
- Process API for on-the-fly calculations
- Statistical API for time-series

**Sample evalscript (NDVI):**
```javascript
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08"],
    output: { bands: 1 }
  }
}

function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04)
  return [ndvi]
}
```

**Integration Complexity:** MODERATE - Custom scripts, Processing Units billing

### 4. EOSDA Crop Monitoring

**Pricing:**
- Free Trial: Limited features
- Basic ($9/mo): 1 user, basic monitoring
- Professional ($99/mo): Full features, API access
- Enterprise ($299+/mo): Custom integration

**Key Features:**
- NDVI, NDRE, MSAVI, ReCl, NDMI indices
- Field boundary detection (90% accuracy)
- Scouting and task management
- Weather risk management
- Growth stage tracking
- VRA map export (ISOBUS compatible)

**Integration Complexity:** LOW - Well-documented REST API

### 5. OneSoil

**Pricing:** Free for farmers

**Key Features:**
- Automatic field boundary detection
- NDVI, CCCI, NDRE, MSAVI indices
- Productivity zone mapping
- VRA map generation
- Cloud-free NDVI technology (in development)
- Export to GeoJSON, KML, SHP

**Limitations:**
- No formal API (app/web only)
- Limited programmatic access
- Best for manual monitoring

**Integration Complexity:** HIGH - Would require scraping or partnership

---

# PART 2: VEGETATION INDEX FORMULAS

## Core Indices for Crop Health Monitoring

### NDVI - Normalized Difference Vegetation Index
**Purpose:** General vegetation health, chlorophyll activity
**Formula:** `NDVI = (NIR - RED) / (NIR + RED)`
**Sentinel-2 Bands:** `(B8 - B4) / (B8 + B4)`
**Value Range:** -1 to +1
**Interpretation:**
| NDVI Value | Condition |
|------------|-----------|
| < 0 | Water, bare soil |
| 0 - 0.2 | Bare soil, stressed vegetation |
| 0.2 - 0.4 | Sparse vegetation, early growth |
| 0.4 - 0.6 | Moderate vegetation |
| 0.6 - 0.8 | Healthy, dense vegetation |
| > 0.8 | Very dense, peak vegetation |

### NDMI - Normalized Difference Moisture Index
**Purpose:** Water stress detection, leaf moisture content
**Formula:** `NDMI = (NIR - SWIR) / (NIR + SWIR)`
**Sentinel-2 Bands:** `(B8 - B11) / (B8 + B11)`
**Value Range:** -1 to +1
**Interpretation:**
| NDMI Value | Condition |
|------------|-----------|
| < -0.2 | Severe water stress |
| -0.2 - 0 | Moderate water stress |
| 0 - 0.2 | Adequate moisture |
| 0.2 - 0.4 | Good moisture |
| > 0.4 | High moisture content |

### NDRE - Normalized Difference Red Edge Index
**Purpose:** Chlorophyll content in dense canopy crops
**Formula:** `NDRE = (NIR - RedEdge) / (NIR + RedEdge)`
**Sentinel-2 Bands:** `(B8 - B5) / (B8 + B5)` or `(B8 - B6) / (B8 + B6)`
**Value Range:** -1 to +1
**Best For:** Corn, wheat, and dense crops where NDVI saturates

### ReCl - Red Edge Chlorophyll Index
**Purpose:** Precise chlorophyll quantification
**Formula:** `ReCl = (B7 / B5) - 1` or `(NIR / RedEdge) - 1`
**Sentinel-2 Bands:** `(B7 / B5) - 1`
**Value Range:** 0 to 10+
**Best For:** Nitrogen status assessment, fertilizer optimization

### NDTI - Normalized Difference Tillage Index
**Purpose:** Detect tillage activity, crop residue
**Formula:** `NDTI = (SWIR1 - SWIR2) / (SWIR1 + SWIR2)`
**Sentinel-2 Bands:** `(B11 - B12) / (B11 + B12)`
**Interpretation:** Low values = bare/tilled soil, High values = crop residue present

### Additional Indices

**SAVI (Soil Adjusted Vegetation Index):**
```
SAVI = ((NIR - RED) / (NIR + RED + L)) * (1 + L)
Where L = 0.5 (soil brightness correction)
Sentinel-2: ((B8 - B4) / (B8 + B4 + 0.5)) * 1.5
```
*Best for: Sparse vegetation, early season*

**EVI (Enhanced Vegetation Index):**
```
EVI = 2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))
Sentinel-2: 2.5 * ((B8 - B4) / (B8 + 6*B4 - 7.5*B2 + 1))
```
*Best for: High biomass areas, reduces atmospheric effects*

**GNDVI (Green Normalized Difference Vegetation Index):**
```
GNDVI = (NIR - GREEN) / (NIR + GREEN)
Sentinel-2: (B8 - B3) / (B8 + B3)
```
*Best for: Chlorophyll/nitrogen estimation*

---

# PART 3: ALERT SYSTEM DESIGN

## Alert Types and Threshold Logic

### 1. Tillage & Harvest Detection Alert
**Trigger:** NDVI drops >40% within 5 days
**Logic:**
```javascript
function detectTillageOrHarvest(currentNDVI, previousNDVI, daysDiff) {
  if (daysDiff > 5) return null; // Data too old

  const ndviChange = ((previousNDVI - currentNDVI) / previousNDVI) * 100;

  if (ndviChange > 40) {
    return {
      alertType: 'TILLAGE_HARVEST_DETECTED',
      severity: 'INFO',
      message: `Field shows ${ndviChange.toFixed(1)}% NDVI reduction - possible tillage or harvest`,
      recommendation: 'Verify field activity in system',
      automatedAction: 'UPDATE_FIELD_STATUS'
    };
  }
  return null;
}
```

### 2. Weed Outbreak Alert
**Trigger:** NDVI > 0.25 on fallow/harvested fields
**Logic:**
```javascript
function detectWeedOutbreak(currentNDVI, fieldStatus, daysPostHarvest) {
  // Only check fallow or recently harvested fields
  if (!['fallow', 'harvested', 'between_crops'].includes(fieldStatus)) return null;

  // Allow regrowth grace period
  if (daysPostHarvest < 14) return null;

  if (currentNDVI > 0.25) {
    const severity = currentNDVI > 0.4 ? 'HIGH' : 'MEDIUM';
    return {
      alertType: 'WEED_OUTBREAK',
      severity: severity,
      message: `Unexpected vegetation (NDVI: ${currentNDVI.toFixed(2)}) detected on ${fieldStatus} field`,
      recommendation: 'Scout field for weed pressure, consider cultivation or cover crop termination',
      automatedAction: 'CREATE_SCOUTING_TASK'
    };
  }
  return null;
}
```

### 3. Water Stress Alert
**Trigger:** NDMI drops below -0.1 or decreases >20% week-over-week
**Logic:**
```javascript
function detectWaterStress(currentNDMI, previousNDMI, cropType, growthStage) {
  // Adjust thresholds by crop and stage
  const thresholds = {
    tomatoes: { critical: -0.2, warning: -0.1 },
    lettuce: { critical: -0.1, warning: 0 },
    corn: { critical: -0.2, warning: -0.1 },
    default: { critical: -0.15, warning: -0.05 }
  };

  const t = thresholds[cropType] || thresholds.default;
  const weeklyChange = ((previousNDMI - currentNDMI) / Math.abs(previousNDMI)) * 100;

  if (currentNDMI < t.critical || weeklyChange > 30) {
    return {
      alertType: 'WATER_STRESS_CRITICAL',
      severity: 'HIGH',
      ndmi: currentNDMI,
      weeklyChange: weeklyChange,
      recommendation: 'Immediate irrigation needed. Check soil moisture sensors.',
      automatedAction: 'ADJUST_IRRIGATION_SCHEDULE'
    };
  } else if (currentNDMI < t.warning || weeklyChange > 20) {
    return {
      alertType: 'WATER_STRESS_WARNING',
      severity: 'MEDIUM',
      ndmi: currentNDMI,
      recommendation: 'Monitor closely. Consider supplemental irrigation.',
      automatedAction: 'CREATE_SCOUTING_TASK'
    };
  }
  return null;
}
```

### 4. Rapid Change Alert (Hail, Wind, Pest Damage)
**Trigger:** NDVI drops >25% between consecutive satellite passes
**Logic:**
```javascript
function detectRapidChange(currentNDVI, previousNDVI, daysDiff, weatherEvents) {
  if (daysDiff > 7) return null;

  const changePerDay = ((previousNDVI - currentNDVI) / previousNDVI) * 100 / daysDiff;

  if (changePerDay > 5) { // >5% per day is abnormal
    // Cross-reference with weather data
    const possibleCauses = [];
    if (weatherEvents.hail) possibleCauses.push('hail damage');
    if (weatherEvents.highWind) possibleCauses.push('wind damage');
    if (weatherEvents.heavyRain) possibleCauses.push('flooding/erosion');
    if (possibleCauses.length === 0) possibleCauses.push('possible pest/disease outbreak');

    return {
      alertType: 'RAPID_VEGETATION_CHANGE',
      severity: 'HIGH',
      totalChange: ((previousNDVI - currentNDVI) / previousNDVI * 100).toFixed(1),
      ratePerDay: changePerDay.toFixed(2),
      possibleCauses: possibleCauses,
      recommendation: 'Immediate scouting required. Document damage for insurance if applicable.',
      automatedAction: 'CREATE_URGENT_SCOUTING_TASK'
    };
  }
  return null;
}
```

### 5. Growth Anomaly Alert
**Trigger:** Field performance deviates >15% from historical average
**Logic:**
```javascript
function detectGrowthAnomaly(currentNDVI, historicalNDVI, dayOfYear, cropType) {
  const expected = getHistoricalExpectedNDVI(cropType, dayOfYear, historicalNDVI);
  const deviation = ((currentNDVI - expected.mean) / expected.mean) * 100;

  if (Math.abs(deviation) > 15) {
    const direction = deviation > 0 ? 'above' : 'below';
    const severity = Math.abs(deviation) > 25 ? 'HIGH' : 'MEDIUM';

    return {
      alertType: deviation > 0 ? 'GROWTH_ABOVE_EXPECTED' : 'GROWTH_BELOW_EXPECTED',
      severity: severity,
      deviation: deviation.toFixed(1),
      expected: expected.mean.toFixed(2),
      actual: currentNDVI.toFixed(2),
      recommendation: deviation < -15
        ? 'Investigate: nutrient deficiency, pest pressure, or environmental stress'
        : 'Excellent growth! Consider harvest timing or market opportunities.',
      automatedAction: 'UPDATE_YIELD_FORECAST'
    };
  }
  return null;
}
```

## Alert Priority Matrix

| Alert Type | Severity | Response Time | Automated Action |
|------------|----------|---------------|------------------|
| Rapid Change (Hail) | CRITICAL | 2 hours | Create urgent task + SMS |
| Water Stress Critical | HIGH | 24 hours | Adjust irrigation + scout |
| Weed Outbreak High | HIGH | 48 hours | Create scouting task |
| Growth Below Expected | MEDIUM | 72 hours | Update forecast |
| Water Stress Warning | MEDIUM | 72 hours | Monitor + optional scout |
| Tillage Detected | INFO | N/A | Log activity |

---

# PART 4: MULTI-AGENT ARCHITECTURE

## Supervisor Pattern for Satellite Intelligence

```
                              ┌─────────────────────────────────────┐
                              │   SATELLITE INTELLIGENCE CONTROLLER │
                              │         (LLM Orchestrator)          │
                              │                                     │
                              │  • Interprets satellite data        │
                              │  • Routes to specialist agents      │
                              │  • Synthesizes recommendations      │
                              │  • Manages state & context          │
                              └──────────────┬────────────────────┬─┘
                                             │                    │
          ┌──────────────────────────────────┼────────────────────┼────────────────────────────────┐
          │                                  │                    │                                │
          ▼                                  ▼                    ▼                                ▼
┌─────────────────────┐        ┌─────────────────────┐ ┌─────────────────────┐      ┌─────────────────────┐
│  DIAGNOSIS AGENT    │        │ REMEDIATION AGENT   │ │  RISK ASSESSOR      │      │ SUSTAINABILITY      │
│                     │        │                     │ │                     │      │    OPTIMIZER        │
│ • Analyze imagery   │        │ • Generate action   │ │ • Budget impact     │      │                     │
│ • Identify anomalies│        │   plans             │ │ • Weather risks     │      │ • Water efficiency  │
│ • Classify issues   │        │ • Prioritize tasks  │ │ • Market timing     │      │ • Input reduction   │
│ • Confidence scores │        │ • Resource needs    │ │ • Probability calc  │      │ • Carbon tracking   │
└─────────────────────┘        └─────────────────────┘ └─────────────────────┘      └─────────────────────┘
          │                                  │                    │                                │
          └──────────────────────────────────┴────────────────────┴────────────────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
               ┌─────────────────────┐         ┌─────────────────────┐
               │  COMPLIANCE AGENT   │         │   SENTINEL AGENT    │
               │                     │         │                     │
               │ • GDPR data privacy │         │ • Audit logging     │
               │ • Regulatory rules  │         │ • Anomaly detection │
               │ • Certification     │         │ • Security events   │
               │   requirements      │         │ • Data integrity    │
               └─────────────────────┘         └─────────────────────┘
```

## Agent Specifications

### 1. Satellite Intelligence Controller (Central Brain)

**Role:** Orchestrates all satellite-related operations, interprets data, and generates human-readable insights.

**Capabilities:**
- Parse incoming satellite imagery metadata
- Route queries to appropriate specialist agents
- Maintain conversation context and field state
- Generate natural language summaries
- Prioritize and sequence multi-agent workflows

**Integration:**
```javascript
// MCP Tool Definition for Satellite Controller
const satelliteControllerTool = {
  name: "satellite_controller",
  description: "Central orchestrator for satellite-based farm intelligence",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["analyze_field", "check_alerts", "generate_recommendation",
               "compare_historical", "forecast_yield", "create_vra_map"]
      },
      fieldId: { type: "string" },
      dateRange: { type: "object" },
      urgency: { type: "string", enum: ["routine", "priority", "urgent"] }
    }
  }
};
```

### 2. Diagnosis Specialist Agent

**Role:** Analyzes satellite imagery to identify anomalies, classify issues, and provide confidence scores.

**Input Data:**
- NDVI, NDMI, NDRE, ReCl time-series
- Historical baseline data
- Weather correlation data
- Crop calendar/growth stage

**Output:**
```json
{
  "fieldId": "FIELD_001",
  "analysisDate": "2026-02-03",
  "findings": [
    {
      "type": "WATER_STRESS",
      "location": { "zone": "NE_QUADRANT", "coordinates": [...] },
      "severity": "MODERATE",
      "confidence": 0.87,
      "evidence": {
        "ndmiDrop": -0.18,
        "ndviImpact": -0.12,
        "affectedArea": "0.8 acres"
      }
    }
  ],
  "overallHealth": "FAIR",
  "trendDirection": "DECLINING",
  "recommendedActions": ["SCOUT", "IRRIGATION_REVIEW"]
}
```

### 3. Remediation Planner Agent

**Role:** Generates step-by-step action plans based on diagnosis results.

**Capabilities:**
- Create prioritized task lists
- Estimate resource requirements
- Calculate optimal timing
- Generate GPS waypoints for scouting
- Create VRA prescription maps

**Output Example:**
```json
{
  "actionPlan": {
    "priority": "HIGH",
    "estimatedCost": "$125",
    "laborHours": 3,
    "steps": [
      {
        "sequence": 1,
        "action": "SCOUT_FIELD",
        "location": { "lat": 41.234, "lng": -73.456 },
        "notes": "Check for pest damage in NE corner",
        "assignee": "FIELD_TEAM",
        "deadline": "2026-02-04T10:00:00Z"
      },
      {
        "sequence": 2,
        "action": "ADJUST_IRRIGATION",
        "zone": "ZONE_3",
        "adjustment": "+20% runtime",
        "duration": "3 days",
        "requires": "SCOUT_CONFIRMATION"
      }
    ]
  }
}
```

### 4. Risk Assessor Agent

**Role:** Evaluates proposed actions against budget, weather, and market constraints.

**Analysis Types:**
- Budget impact assessment
- Weather window viability
- Market timing optimization
- Probability of success
- Downside risk quantification

**Decision Support:**
```json
{
  "proposedAction": "APPLY_FOLIAR_SPRAY",
  "riskAssessment": {
    "budgetImpact": {
      "cost": "$450",
      "percentOfMonthlyBudget": 12,
      "verdict": "ACCEPTABLE"
    },
    "weatherWindow": {
      "nextDryPeriod": "2026-02-05 to 2026-02-07",
      "windSpeed": "8 mph",
      "verdict": "FAVORABLE"
    },
    "probabilityOfSuccess": 0.78,
    "alternativeOptions": [
      { "action": "DELAY_3_DAYS", "successProb": 0.82, "savings": "$0" },
      { "action": "REDUCE_RATE", "successProb": 0.65, "savings": "$120" }
    ],
    "recommendation": "PROCEED_AS_PLANNED"
  }
}
```

### 5. Sustainability Optimizer Agent

**Role:** Monitors resource efficiency and environmental impact.

**Metrics Tracked:**
- Water usage per acre
- Input reduction opportunities
- Carbon sequestration estimates
- Biodiversity indicators
- Certification compliance

### 6. Compliance & Privacy Agent

**Role:** Ensures data handling meets regulatory requirements.

**Responsibilities:**
- GDPR compliance for location data
- Data retention policies
- Third-party data sharing consent
- Audit trail maintenance
- Certification documentation

### 7. Sentinel Agents

**Role:** Security monitoring and anomaly detection.

**Functions:**
- Monitor for unauthorized data access
- Detect unusual query patterns
- Maintain audit logs
- Alert on data integrity issues

## Agent Communication Protocols

### Model Context Protocol (MCP) for External APIs

```javascript
// MCP Server for Satellite APIs
const satelliteMCPServer = {
  tools: [
    {
      name: "fetch_ndvi",
      description: "Get NDVI data for a field from satellite imagery",
      inputSchema: {
        type: "object",
        properties: {
          fieldId: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" }
        },
        required: ["fieldId"]
      }
    },
    {
      name: "create_vra_map",
      description: "Generate variable rate application prescription map",
      inputSchema: {
        type: "object",
        properties: {
          fieldId: { type: "string" },
          applicationType: { type: "string", enum: ["fertilizer", "seed", "pesticide"] },
          baseRate: { type: "number" },
          variationPercent: { type: "number" }
        }
      }
    }
  ],
  resources: [
    {
      uri: "satellite://fields/{fieldId}/imagery",
      name: "Field Satellite Imagery",
      mimeType: "image/tiff"
    },
    {
      uri: "satellite://fields/{fieldId}/timeseries",
      name: "Vegetation Index Time Series",
      mimeType: "application/json"
    }
  ]
};
```

### Agent-to-Agent (A2A) Protocol

```javascript
// Inter-agent message format
const agentMessage = {
  messageId: "MSG_20260203_001",
  from: "DIAGNOSIS_AGENT",
  to: "REMEDIATION_AGENT",
  timestamp: "2026-02-03T14:30:00Z",
  type: "DIAGNOSIS_COMPLETE",
  priority: "HIGH",
  payload: {
    fieldId: "FIELD_001",
    diagnosis: { /* diagnosis results */ },
    requestedAction: "GENERATE_ACTION_PLAN"
  },
  context: {
    conversationId: "CONV_123",
    previousMessages: ["MSG_001", "MSG_002"]
  }
};
```

---

# PART 5: DATA ARCHITECTURE

## Database Schema for Satellite Layers

### Google Sheets Structure (Extending Existing)

```
SATELLITE_READINGS
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Reading_ID │ Field_ID │ Date │ Source │ NDVI │ NDMI │ NDRE │ ReCl │ Cloud_Cover │ Quality │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ SAT_001    │ FIELD_A  │ 2026-02-01 │ Sentinel-2 │ 0.72 │ 0.18 │ 0.45 │ 2.3 │ 5% │ HIGH │
│ SAT_002    │ FIELD_A  │ 2026-02-06 │ Sentinel-2 │ 0.68 │ 0.12 │ 0.42 │ 2.1 │ 12% │ GOOD │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

SATELLITE_ALERTS
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Alert_ID │ Field_ID │ Timestamp │ Type │ Severity │ Details │ Status │ Resolved_By │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ALT_001  │ FIELD_A  │ 2026-02-06 │ WATER_STRESS │ MEDIUM │ {"ndmi": -0.12} │ ACKNOWLEDGED │ Todd │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

SATELLITE_ZONES
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Zone_ID │ Field_ID │ Zone_Name │ Polygon_GeoJSON │ Area_Acres │ Productivity_Class │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE_001 │ FIELD_A │ NE_High │ {"type":"Polygon",...} │ 0.5 │ HIGH │
│ ZONE_002 │ FIELD_A │ SW_Low │ {"type":"Polygon",...} │ 0.3 │ LOW │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

VRA_PRESCRIPTIONS
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ RX_ID │ Field_ID │ Created │ Type │ Base_Rate │ Zones_JSON │ File_Format │ Downloaded │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RX_001 │ FIELD_A │ 2026-02-03 │ nitrogen │ 50 lbs/acre │ [...] │ ISOXML │ true │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Extended REF_Fields Schema

Add columns to existing `REF_Fields` sheet:

| Column | Type | Description |
|--------|------|-------------|
| Polygon_ID | String | Agromonitoring API polygon ID |
| GeoJSON | JSON | Field boundary coordinates |
| Last_Satellite_Reading | Date | Most recent imagery date |
| Current_NDVI | Number | Latest NDVI value |
| NDVI_Trend | String | UP/DOWN/STABLE |
| Current_NDMI | Number | Latest NDMI value |
| Alert_Status | String | CLEAR/WARNING/CRITICAL |

## API Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            TINY SEED OS - SATELLITE DATA FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    EXTERNAL APIs
                    ┌─────────────────────────────────────────────────┐
                    │ Agromonitoring │ Earth Engine │ Weather APIs   │
                    └────────┬─────────────┬─────────────┬───────────┘
                             │             │             │
                             ▼             ▼             ▼
                    ┌─────────────────────────────────────────────────┐
                    │          SATELLITE_SERVICE.js (Apps Script)      │
                    │                                                  │
                    │  • fetchLatestImagery()                         │
                    │  • calculateVegetationIndices()                 │
                    │  • detectChanges()                              │
                    │  • generateAlerts()                             │
                    │  • exportVRAMap()                               │
                    └────────────────────┬────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
        ┌───────────────────────────┐           ┌───────────────────────────┐
        │  GOOGLE SHEETS             │           │  MULTI-AGENT SYSTEM        │
        │                           │           │                           │
        │  • SATELLITE_READINGS     │◄─────────►│  • Diagnosis Agent        │
        │  • SATELLITE_ALERTS       │           │  • Remediation Agent      │
        │  • SATELLITE_ZONES        │           │  • Risk Assessor          │
        │  • VRA_PRESCRIPTIONS      │           │  • Controller (LLM)       │
        │  • REF_Fields (extended)  │           │                           │
        └───────────────────────────┘           └───────────────────────────┘
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────┐
                    │              FRONTEND DASHBOARDS                 │
                    │                                                  │
                    │  • Satellite Map View (Leaflet.js)              │
                    │  • NDVI Time Series Charts (Chart.js)           │
                    │  • Alert Feed                                   │
                    │  • VRA Map Download                             │
                    │  • Scouting GPS Waypoints                       │
                    └─────────────────────────────────────────────────┘
```

---

# PART 6: VRA MAP GENERATION

## Variable Rate Application Workflow

### Step 1: Zone Classification

```javascript
function classifyProductivityZones(ndviHistory, fieldPolygon) {
  // Get 3-5 year NDVI history
  const historicalData = getHistoricalNDVI(fieldPolygon, 5);

  // Calculate mean and standard deviation per pixel
  const pixelStats = historicalData.reduce((acc, reading) => {
    reading.pixels.forEach((pixel, idx) => {
      if (!acc[idx]) acc[idx] = { values: [] };
      acc[idx].values.push(pixel.ndvi);
    });
    return acc;
  }, {});

  // Classify into productivity zones
  const zones = Object.entries(pixelStats).map(([idx, data]) => {
    const mean = average(data.values);
    const stdDev = standardDeviation(data.values);

    let productivityClass;
    if (mean > 0.7 && stdDev < 0.1) productivityClass = 'HIGH_STABLE';
    else if (mean > 0.7) productivityClass = 'HIGH_VARIABLE';
    else if (mean > 0.5 && stdDev < 0.1) productivityClass = 'MEDIUM_STABLE';
    else if (mean > 0.5) productivityClass = 'MEDIUM_VARIABLE';
    else productivityClass = 'LOW';

    return { pixelIndex: idx, mean, stdDev, productivityClass };
  });

  return clusterZones(zones); // Merge adjacent pixels into polygons
}
```

### Step 2: Rate Calculation

```javascript
function calculateVariableRates(zones, applicationType, baseRate) {
  const rateMultipliers = {
    fertilizer: {
      'HIGH_STABLE': 1.0,      // Full rate
      'HIGH_VARIABLE': 1.1,    // Slight boost to stabilize
      'MEDIUM_STABLE': 0.85,   // Reduce to avoid excess
      'MEDIUM_VARIABLE': 0.95, // Near base rate
      'LOW': 0.7               // Reduced rate, investigate cause
    },
    seed: {
      'HIGH_STABLE': 1.1,      // Higher population in productive areas
      'HIGH_VARIABLE': 1.0,
      'MEDIUM_STABLE': 0.95,
      'MEDIUM_VARIABLE': 0.9,
      'LOW': 0.8               // Lower population, less competition
    },
    pesticide: {
      // Uniform base rate unless specific pest zones identified
      'HIGH_STABLE': 1.0,
      'HIGH_VARIABLE': 1.0,
      'MEDIUM_STABLE': 1.0,
      'MEDIUM_VARIABLE': 1.0,
      'LOW': 1.0
    }
  };

  return zones.map(zone => ({
    ...zone,
    rate: baseRate * (rateMultipliers[applicationType][zone.productivityClass] || 1.0)
  }));
}
```

### Step 3: Export Formats

```javascript
// ISOBUS (ISOXML) format for John Deere, Case IH, AGCO
function exportISOXML(prescriptionData, fieldBoundary) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ISO11783_TaskData>
  <TreatmentZone>
    <TreatmentZoneCode>TZ001</TreatmentZoneCode>
    <TreatmentZonePolygon>
      ${prescriptionData.zones.map(z => `
      <PolygonZone>
        <Points>${z.polygon.coordinates.map(c => `<Point lat="${c[1]}" lon="${c[0]}"/>`).join('')}</Points>
        <Rate unit="${prescriptionData.unit}">${z.rate}</Rate>
      </PolygonZone>`).join('')}
    </TreatmentZonePolygon>
  </TreatmentZone>
</ISO11783_TaskData>`;
  return xml;
}

// Shapefile format (via GeoJSON conversion)
function exportShapefile(prescriptionData) {
  const geojson = {
    type: "FeatureCollection",
    features: prescriptionData.zones.map(z => ({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: z.polygon.coordinates },
      properties: {
        zone_id: z.id,
        productivity: z.productivityClass,
        rate: z.rate,
        unit: prescriptionData.unit
      }
    }))
  };

  // Convert GeoJSON to Shapefile using shp-write library
  return shpwrite.zip(geojson);
}
```

---

# PART 7: YIELD FORECASTING

## Biomass-Based Yield Prediction Model

### Algorithm Overview

```javascript
function forecastYield(fieldId, cropType, currentDate) {
  // Get current satellite data
  const currentData = getSatelliteReading(fieldId, currentDate);

  // Get historical yields for same crop
  const historicalYields = getHistoricalYields(fieldId, cropType, 5); // 5 years

  // Get historical NDVI curves for reference
  const historicalNDVI = getHistoricalNDVICurves(fieldId, cropType, 5);

  // Calculate current biomass estimate from NDVI
  const estimatedBiomass = ndviToBiomass(currentData.ndvi, cropType);

  // Compare to historical trajectory
  const expectedBiomass = getExpectedBiomass(
    historicalNDVI,
    currentDate,
    cropType
  );

  // Calculate deviation
  const deviationPercent = ((estimatedBiomass - expectedBiomass) / expectedBiomass) * 100;

  // Project yield based on correlation
  const yieldCorrelation = getYieldCorrelation(cropType); // Typically 0.7-0.9 for NDVI

  const baseYield = average(historicalYields.map(h => h.yield));
  const projectedYield = baseYield * (1 + (deviationPercent / 100) * yieldCorrelation);

  // Confidence interval
  const stdDev = standardDeviation(historicalYields.map(h => h.yield));

  return {
    fieldId: fieldId,
    cropType: cropType,
    forecastDate: currentDate,
    projectedYield: projectedYield,
    unit: 'lbs/acre',
    confidenceInterval: {
      low: projectedYield - 1.96 * stdDev,
      high: projectedYield + 1.96 * stdDev
    },
    comparedToAverage: deviationPercent.toFixed(1) + '%',
    dataQuality: currentData.cloudCover < 10 ? 'HIGH' : 'MODERATE',
    lastUpdated: currentDate
  };
}

// NDVI to Biomass conversion (crop-specific)
function ndviToBiomass(ndvi, cropType) {
  const coefficients = {
    tomatoes: { a: 2850, b: 0.5 },   // Biomass = a * NDVI^b
    lettuce: { a: 1200, b: 0.7 },
    corn: { a: 4500, b: 0.6 },
    peppers: { a: 2400, b: 0.55 },
    default: { a: 2000, b: 0.6 }
  };

  const c = coefficients[cropType] || coefficients.default;
  return c.a * Math.pow(ndvi, c.b);
}
```

---

# PART 8: SMART SCOUTING INTEGRATION

## GPS Waypoint Generation

```javascript
function generateScoutingWaypoints(fieldId, alertType) {
  const field = getFieldData(fieldId);
  const latestImagery = getLatestImagery(fieldId);

  // Identify problem areas
  const problemAreas = analyzeImageryForProblems(latestImagery, alertType);

  // Generate optimal scouting route
  const waypoints = problemAreas.map((area, idx) => ({
    waypointId: `WP_${fieldId}_${idx + 1}`,
    latitude: area.centroid.lat,
    longitude: area.centroid.lng,
    sequence: idx + 1,
    description: area.description,
    priority: area.severity,
    ndviReading: area.ndvi,
    areaAffected: area.acreage + ' acres',
    possibleCauses: area.possibleCauses,
    observations: [] // To be filled by scout
  }));

  // Optimize route (traveling salesman approximation)
  const optimizedRoute = optimizeRoute(waypoints);

  return {
    fieldId: fieldId,
    scoutingTaskId: generateTaskId(),
    generatedDate: new Date().toISOString(),
    totalWaypoints: waypoints.length,
    estimatedTime: calculateScoutingTime(waypoints),
    waypoints: optimizedRoute,
    exportFormats: {
      googleMaps: generateGoogleMapsUrl(optimizedRoute),
      gpx: generateGPXFile(optimizedRoute),
      kml: generateKMLFile(optimizedRoute)
    }
  };
}

function generateGoogleMapsUrl(waypoints) {
  const coords = waypoints.map(w => `${w.latitude},${w.longitude}`).join('/');
  return `https://www.google.com/maps/dir/${coords}`;
}
```

## Integration with Tiny Seed TASKS

```javascript
function createScoutingTask(scoutingData) {
  // Create task in existing TASKS sheet
  const taskData = {
    action: 'FIELD_SCOUTING',
    task_type: 'field_work',
    crop: scoutingData.cropType,
    location: scoutingData.fieldId,
    notes: `Satellite-detected issue: ${scoutingData.alertType}\n` +
           `Waypoints: ${scoutingData.waypoints.length}\n` +
           `Priority areas: ${scoutingData.waypoints.filter(w => w.priority === 'HIGH').length}`,
    due_date: scoutingData.deadline,
    priority: scoutingData.priority,
    satellite_data: JSON.stringify({
      waypoints: scoutingData.waypoints,
      maps_url: scoutingData.exportFormats.googleMaps
    })
  };

  // Use existing task creation API
  return createTask(taskData);
}
```

---

# PART 9: IMPLEMENTATION ROADMAP

## Phase 1: Foundation (Weeks 1-4) - NDVI Maps + Smart Scouting

### Week 1: API Setup
- [ ] Create Agromonitoring API account (free tier)
- [ ] Create Google Earth Engine account
- [ ] Add field boundaries as polygons (from REF_Fields coordinates)
- [ ] Test API connectivity

### Week 2: Backend Development
- [ ] Create `SatelliteService.js` in Apps Script
- [ ] Implement `fetchLatestNDVI()` function
- [ ] Implement `storeReading()` to Google Sheets
- [ ] Create scheduled trigger for daily fetch

### Week 3: Frontend Development
- [ ] Add satellite tab to field-planner.html
- [ ] Integrate Leaflet.js for map display
- [ ] Add NDVI layer overlay
- [ ] Create NDVI trend chart (Chart.js)

### Week 4: Smart Scouting
- [ ] Implement problem area detection
- [ ] Generate GPS waypoints
- [ ] Create scouting task integration
- [ ] Test end-to-end workflow

**Deliverables:**
- NDVI visualization on field maps
- Historical NDVI charts
- Basic scouting waypoint generation
- Integration with TASKS sheet

## Phase 2: Alerts & Change Detection (Weeks 5-8)

### Week 5: Alert Engine
- [ ] Implement threshold detection functions
- [ ] Create SATELLITE_ALERTS sheet
- [ ] Build alert prioritization logic

### Week 6: Change Detection
- [ ] Implement time-series comparison
- [ ] Add NDMI water stress detection
- [ ] Create tillage/harvest detection

### Week 7: Notification System
- [ ] Integrate with existing notification system
- [ ] Add satellite alerts to Morning Brief
- [ ] Create SMS integration for critical alerts

### Week 8: Testing & Refinement
- [ ] Test alert accuracy with historical data
- [ ] Tune thresholds for farm conditions
- [ ] Document alert handling procedures

**Deliverables:**
- Automated alert generation
- Alert dashboard widget
- SMS for critical alerts
- Morning brief integration

## Phase 3: VRA & Yield Forecasting (Weeks 9-12)

### Week 9: Productivity Zones
- [ ] Implement zone classification algorithm
- [ ] Create SATELLITE_ZONES sheet
- [ ] Visualize zones on map

### Week 10: VRA Maps
- [ ] Implement rate calculation logic
- [ ] Create ISOXML export
- [ ] Create Shapefile export
- [ ] Add download UI

### Week 11: Yield Forecasting
- [ ] Implement biomass estimation
- [ ] Create yield prediction model
- [ ] Integrate with existing planning views

### Week 12: Multi-Agent Integration
- [ ] Connect to LangGraph agent framework
- [ ] Implement diagnosis agent
- [ ] Implement remediation agent
- [ ] Test agent orchestration

**Deliverables:**
- VRA prescription map generation
- Exportable prescription files
- Yield forecasting dashboard
- Basic multi-agent functionality

---

# PART 10: COST ESTIMATES

## Monthly Operating Costs by Phase

| Phase | Component | Free Tier | Paid Tier |
|-------|-----------|-----------|-----------|
| **Phase 1** | Agromonitoring API | $0 (up to 1000 ha) | $29/mo |
| | Google Earth Engine | $0 (research use) | $0 |
| | Leaflet.js | $0 (open source) | $0 |
| | **Phase 1 Total** | **$0/month** | **$29/month** |
| **Phase 2** | SMS Notifications (Twilio) | ~$5/mo | ~$15/mo |
| | Additional API calls | Included | Included |
| | **Phase 2 Total** | **$5/month** | **$44/month** |
| **Phase 3** | Higher resolution (Planet) | N/A | $500+/mo |
| | ML inference (if cloud) | ~$10/mo | ~$50/mo |
| | **Phase 3 Total** | **$15/month** | **$594/month** |

## One-Time Development Costs

| Component | Estimated Hours | Notes |
|-----------|-----------------|-------|
| API Integration | 20 hrs | Agromonitoring + GEE setup |
| Backend Development | 40 hrs | SatelliteService.js |
| Frontend Development | 30 hrs | Map views, charts |
| Alert System | 20 hrs | Thresholds, notifications |
| VRA Generation | 25 hrs | Zone calculation, exports |
| Multi-Agent System | 40 hrs | LangGraph integration |
| Testing & Documentation | 25 hrs | |
| **Total** | **200 hours** | |

---

# PART 11: RECOMMENDATIONS

## Immediate Actions (This Week)

1. **Sign up for Agromonitoring API** - Free tier is sufficient for Tiny Seed's acreage
2. **Export field boundaries** from REF_Fields as GeoJSON polygons
3. **Create first polygon** in Agromonitoring dashboard to test data flow

## Short-Term (Phase 1 Priority)

1. **Start with NDVI only** - Most universally useful index
2. **Focus on visual display first** - Map view with NDVI overlay
3. **Build scouting integration** - High-impact, low-complexity feature
4. **Use existing TASKS system** - No need for new task infrastructure

## Medium-Term Considerations

1. **Calibrate thresholds** - Adjust alert thresholds based on actual farm conditions
2. **Build historical baseline** - Collect 1+ year of data before comparing to "normal"
3. **Integrate weather data** - Agromonitoring includes weather; use it for context

## Long-Term Vision

1. **Multi-agent orchestration** - Full Supervisor Pattern implementation
2. **Yield prediction models** - Train on Tiny Seed's specific crop/location data
3. **VRA prescription generation** - When/if variable rate equipment is used
4. **Planet Labs integration** - If daily imagery becomes necessary

## Key Success Factors

1. **Start simple** - NDVI visualization + basic alerts provide immediate value
2. **Iterate based on use** - Let actual farming needs drive feature development
3. **Maintain data quality** - Cloud-filtered imagery, validated readings
4. **Human-in-the-loop** - Agents suggest, humans decide (for now)

---

# APPENDIX A: APPS SCRIPT IMPLEMENTATION TEMPLATE

```javascript
// SatelliteService.js - Template for Tiny Seed OS

const AGROMONITORING_API_KEY = 'your_api_key_here';
const AGROMONITORING_BASE_URL = 'https://api.agromonitoring.com/agro/1.0';

/**
 * Create a polygon (field) in Agromonitoring
 */
function createAgroPolygon(fieldData) {
  const payload = {
    name: fieldData.fieldName,
    geo_json: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [fieldData.coordinates]
      }
    }
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  const url = `${AGROMONITORING_BASE_URL}/polygons?appid=${AGROMONITORING_API_KEY}`;
  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}

/**
 * Fetch latest satellite imagery for a polygon
 */
function fetchSatelliteImagery(polygonId) {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (30 * 24 * 60 * 60); // 30 days ago

  const url = `${AGROMONITORING_BASE_URL}/image/search?polyid=${polygonId}&start=${startDate}&end=${endDate}&appid=${AGROMONITORING_API_KEY}`;
  const response = UrlFetchApp.fetch(url);
  const images = JSON.parse(response.getContentText());

  // Filter for low cloud cover
  return images.filter(img => img.dc < 20); // dc = data coverage (inverse of cloud)
}

/**
 * Get NDVI statistics for a polygon
 */
function getNDVIStats(polygonId) {
  const url = `${AGROMONITORING_BASE_URL}/ndvi?polyid=${polygonId}&appid=${AGROMONITORING_API_KEY}`;
  const response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}

/**
 * Store satellite reading in Google Sheets
 */
function storeReading(fieldId, data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('SATELLITE_READINGS');

  if (!sheet) {
    sheet = ss.insertSheet('SATELLITE_READINGS');
    sheet.appendRow([
      'Reading_ID', 'Field_ID', 'Date', 'Source',
      'NDVI', 'NDMI', 'NDRE', 'ReCl', 'Cloud_Cover', 'Quality'
    ]);
  }

  const readingId = 'SAT_' + Date.now();
  sheet.appendRow([
    readingId,
    fieldId,
    new Date(data.dt * 1000).toISOString(),
    'Agromonitoring',
    data.ndvi,
    data.ndmi || '',
    data.ndre || '',
    data.recl || '',
    data.cl + '%',
    data.cl < 10 ? 'HIGH' : data.cl < 20 ? 'GOOD' : 'FAIR'
  ]);

  return readingId;
}

/**
 * Daily scheduled function to fetch all fields
 */
function dailySatelliteFetch() {
  const fields = getFields({ includePolygonIds: true });

  fields.forEach(field => {
    if (field.polygonId) {
      try {
        const imagery = fetchSatelliteImagery(field.polygonId);
        if (imagery.length > 0) {
          const latest = imagery[imagery.length - 1];
          storeReading(field.fieldId, latest);

          // Check for alerts
          checkForAlerts(field, latest);
        }
      } catch (e) {
        console.error(`Error fetching satellite data for ${field.fieldId}: ${e.message}`);
      }
    }
  });
}

/**
 * Create trigger for daily fetch
 */
function setupSatelliteTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'dailySatelliteFetch') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger at 6 AM daily
  ScriptApp.newTrigger('dailySatelliteFetch')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}
```

---

# APPENDIX B: FRONTEND MAP COMPONENT TEMPLATE

```html
<!-- Satellite Map Component for field-planner.html -->
<div id="satellite-panel" class="card">
  <div class="card-header">
    <h2>Satellite Monitoring</h2>
    <select id="satellite-index-select">
      <option value="ndvi">NDVI (Vegetation Health)</option>
      <option value="ndmi">NDMI (Water Stress)</option>
      <option value="ndre">NDRE (Chlorophyll)</option>
    </select>
  </div>
  <div class="card-body">
    <div id="satellite-map" style="height: 400px;"></div>
    <div id="ndvi-chart" style="height: 200px; margin-top: 16px;"></div>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
// Initialize Leaflet map
const satelliteMap = L.map('satellite-map').setView([40.5, -79.9], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(satelliteMap);

// Add satellite imagery overlay
let ndviLayer = null;

async function loadNDVIOverlay(fieldId) {
  const response = await fetch(`${API_URL}?action=getSatelliteImagery&fieldId=${fieldId}&index=ndvi`);
  const data = await response.json();

  if (ndviLayer) satelliteMap.removeLayer(ndviLayer);

  ndviLayer = L.imageOverlay(data.imageUrl, data.bounds).addTo(satelliteMap);
  satelliteMap.fitBounds(data.bounds);
}

// NDVI time series chart
let ndviChart = null;

async function loadNDVIChart(fieldId) {
  const response = await fetch(`${API_URL}?action=getSatelliteTimeSeries&fieldId=${fieldId}`);
  const data = await response.json();

  const ctx = document.getElementById('ndvi-chart').getContext('2d');

  if (ndviChart) ndviChart.destroy();

  ndviChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.dates,
      datasets: [{
        label: 'NDVI',
        data: data.values,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 1,
          title: { display: true, text: 'NDVI Value' }
        }
      }
    }
  });
}
</script>
```

---

# APPENDIX C: GLOSSARY

| Term | Definition |
|------|------------|
| **NDVI** | Normalized Difference Vegetation Index - measures plant health via chlorophyll activity |
| **NDMI** | Normalized Difference Moisture Index - detects water stress in vegetation |
| **NDRE** | Normalized Difference Red Edge Index - chlorophyll content for dense canopy |
| **ReCl** | Red Edge Chlorophyll Index - precise chlorophyll quantification |
| **NDTI** | Normalized Difference Tillage Index - detects bare soil vs crop residue |
| **VRA** | Variable Rate Application - precision application of inputs |
| **ISOBUS** | ISO 11783 standard for agricultural equipment communication |
| **Sentinel-2** | EU satellite constellation, 10m resolution, 5-day revisit |
| **Landsat** | NASA satellite, 30m resolution, 16-day revisit |
| **GEE** | Google Earth Engine - cloud platform for satellite analysis |
| **MCP** | Model Context Protocol - standard for AI tool integration |
| **A2A** | Agent-to-Agent communication protocol |

---

# REFERENCES

## Primary Sources

- [Sentinel Hub Agriculture](https://www.sentinel-hub.com/explore/industries-and-showcases/agriculture/)
- [Agromonitoring API Documentation](https://agromonitoring.com/api)
- [Google Earth Engine Developers](https://developers.google.com/earth-engine)
- [EOSDA Crop Monitoring](https://eos.com/products/crop-monitoring/)
- [OneSoil Platform](https://onesoil.ai/en)
- [Planet Labs Products](https://www.planet.com/products/)
- [NASA Earthdata](https://www.earthdata.nasa.gov/)

## Technical References

- [Sentinel-2 Vegetation Indices](https://custom-scripts.sentinel-hub.com/)
- [Variable Rate Technology Guide (IFAS)](https://edis.ifas.ufl.edu/publication/AE607)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Multi-Agent LLM Systems in Agriculture](https://www.sciopen.com/article/10.12133/j.smartag.SA202503026)

## Research Papers

- "Wheat yield estimation using remote sensing data based on machine learning approaches" - Frontiers in Plant Science
- "Improvement of pasture biomass modelling using high-resolution satellite imagery and machine learning" - Science Direct
- "Agentic AI: A Comprehensive Survey of Architectures, Applications, and Future Directions" - arXiv

---

**END OF RESEARCH REPORT**

*Generated: 2026-02-03 by Claude PM_Architect*
*For: Tiny Seed Farm OS Satellite Integration Initiative*
*Status: RESEARCH COMPLETE - Ready for Implementation Planning*
