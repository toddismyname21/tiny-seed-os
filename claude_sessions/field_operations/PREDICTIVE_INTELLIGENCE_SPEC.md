# PREDICTIVE INTELLIGENCE SPECIFICATION
## Tiny Seed Farm - State of the Art System

**Created:** 2026-01-17
**Purpose:** Build system that knows what you should do before you do
**Principle:** NO SHORTCUTS. ONLY THE BEST.

---

## RESEARCH SOURCES

### Growing Degree Day Models
- [Oregon State Extension - Vegetable DD Models](https://extension.oregonstate.edu/catalog/em-9305-vegetable-degree-day-models-introduction-farmers-gardeners)
- [Climate Smart Farming GDD Calculator](http://climatesmartfarming.org/tools/csf-growing-degree-day-calculator/)
- [NDAWN Sunflower GDD](https://ndawn.ndsu.nodak.edu/help-sunflower-growing-degree-days.html)
- [Arable GDD Guide](https://www.arable.com/blog/a-guide-to-growing-degree-days-gdd-linking-temperature-and-crop-growth-stages/)

### Precision Agriculture & AI
- [StartUs Insights - AI in Agriculture 2025-2030](https://www.startus-insights.com/innovators-guide/ai-in-agriculture-strategic-guide/)
- [Farmonaut - Agriculture Scheduling Software 2025](https://farmonaut.com/precision-farming/agriculture-scheduling-software-5-powerful-tools-for-2025)
- [Tend Farm Management Software](https://www.tend.com/)

### Disease Prediction Models
- [METOS Disease Models - Tomato](https://metos.global/en/disease-models-tomato/)
- [PMC - Deep Learning Disease Prediction](https://pmc.ncbi.nlm.nih.gov/articles/PMC10720067/)
- [Springer - Meteorological Factor-Based Early Blight Prediction](https://link.springer.com/article/10.1007/s40003-023-00691-6)

### Weather API
- [Open-Meteo Free Weather API](https://open-meteo.com/)

---

## GDD DATABASE (Research-Backed Values)

### VEGETABLES - GDD to Harvest

| Crop | Base °F | Upper °F | GDD Transplant | GDD Direct Seed | Method | Source |
|------|---------|----------|----------------|-----------------|--------|--------|
| **Tomato** | 45 | 92 | 1,844-2,010 | - | Single Sine | OSU |
| **Pepper (Sweet)** | 52 | 100 | 1,211-1,447 | - | Single Sine | OSU |
| **Cucumber** | 50 | 90 | 805 | 964-1,211 | Single Sine | OSU |
| **Snap Beans** | 40 | 90 | - | 1,630-1,805 | Single Sine | OSU |
| **Sweet Corn** | 44 | 86 | 1,934-2,014 | 1,444-1,883 | Corn GDD | OSU |
| **Broccoli** | 32 | 70 | 2,103-2,383 | - | Single Sine | OSU |
| **Lettuce** | 40 | 85 | 800-1,000 | 900-1,100 | Simple Avg | Est |
| **Carrots** | 40 | 90 | - | 1,400-1,800 | Simple Avg | Est |
| **Beets** | 40 | 90 | - | 1,000-1,400 | Simple Avg | Est |

### FLOWERS - Days to Bloom (GDD limited data)

| Flower | Base °F | Days to Bloom | GDD Estimate | Notes |
|--------|---------|---------------|--------------|-------|
| **Sunflower** | 44 | 55-90 | 1,500-2,500 | Research-backed |
| **Zinnia** | 50 | 70-90 | 1,400-1,800 | Estimated |
| **Dahlia** | 50 | 70-90 | 1,400-1,800 | From tuber |
| **Cosmos** | 50 | 75-90 | 1,500-1,800 | Estimated |
| **Snapdragon** | 45 | 100-120 | 2,000-2,400 | Estimated |
| **Lisianthus** | 60 | 120-150 | 2,400-3,000 | Long season |

---

## DISEASE RISK ALGORITHMS

### Late Blight (Phytophthora infestans)
**Disease Severity Value (DSV) Calculation:**

```
Temperature Range | Hours Relative Humidity ≥90% | DSV
------------------|------------------------------|----
45-53°F           | 16-18 hrs                    | 1
45-53°F           | 19-21 hrs                    | 2
45-53°F           | 22-24 hrs                    | 3
54-59°F           | 13-15 hrs                    | 1
54-59°F           | 16-18 hrs                    | 2
54-59°F           | 19-21 hrs                    | 3
54-59°F           | 22-24 hrs                    | 4
60-80°F           | 10-12 hrs                    | 1
60-80°F           | 13-15 hrs                    | 2
60-80°F           | 16-18 hrs                    | 3
60-80°F           | 19-24 hrs                    | 4
```

**Risk Thresholds:**
- DSV 0-10: LOW risk
- DSV 11-17: MODERATE risk - Scout
- DSV 18+: HIGH risk - Spray recommended

### Early Blight (Alternaria solani)
**Favorable Conditions:**
- Temperature: 59-81°F (optimal 75°F)
- Relative Humidity: >90%
- Leaf wetness: >12 hours

**Risk Score (0-100):**
```
Score = (Temp_Factor × 0.3) + (Humidity_Factor × 0.4) + (Wetness_Factor × 0.3)

Where:
- Temp_Factor: 100 if 68-81°F, scaled down outside
- Humidity_Factor: (RH - 60) × 2.5 (capped at 100)
- Wetness_Factor: (Leaf_Wet_Hours / 24) × 100
```

---

## TASK PRIORITIZATION ALGORITHM

### Priority Score Formula
```
Priority = (Urgency × 0.35) + (Weather_Impact × 0.25) + (Crop_Value × 0.20) + (Perishability × 0.20)

Where:
- Urgency: Days until optimal window closes (inverted scale)
- Weather_Impact: How much weather affects this task (0-100)
- Crop_Value: Economic value per unit area
- Perishability: How quickly quality degrades if delayed
```

### Urgency Calculation
```
If days_remaining <= 0: Urgency = 100 (OVERDUE)
If days_remaining <= 1: Urgency = 90
If days_remaining <= 3: Urgency = 70
If days_remaining <= 7: Urgency = 50
If days_remaining > 7: Urgency = 30
```

### Weather Impact Factors
| Task Type | Weather Factor | Notes |
|-----------|----------------|-------|
| Transplant | 85 | Rain/cold delays critical |
| Harvest | 75 | Quality degrades in rain |
| Spray | 95 | Rain negates spray |
| Irrigation | 60 | Rain reduces need |
| Cultivation | 70 | Wet soil = compaction |
| Seeding | 80 | Soil temp/moisture critical |

---

## WEATHER INTEGRATION

### Open-Meteo API Endpoints

**Current + 16-day Forecast:**
```
https://api.open-meteo.com/v1/forecast?
  latitude={lat}&longitude={lon}&
  daily=temperature_2m_max,temperature_2m_min,precipitation_sum,
        precipitation_probability_max,relative_humidity_2m_mean,
        windspeed_10m_max&
  hourly=temperature_2m,relative_humidity_2m,precipitation&
  timezone=America/New_York&
  forecast_days=16
```

**Historical (for GDD accumulation):**
```
https://archive-api.open-meteo.com/v1/archive?
  latitude={lat}&longitude={lon}&
  start_date={start}&end_date={end}&
  daily=temperature_2m_max,temperature_2m_min&
  timezone=America/New_York
```

### Farm Coordinates (Tiny Seed Farm - PA)
- Latitude: 40.0 (approximate - needs exact)
- Longitude: -76.5 (approximate - needs exact)

---

## PREDICTION ENGINE LOGIC

### 1. Harvest Date Prediction

```javascript
function predictHarvestDate(planting) {
  const crop = getCropGDDData(planting.crop);
  const plantDate = new Date(planting.actual_transplant || planting.actual_seed);

  // Get accumulated GDD since planting
  const accumulatedGDD = calculateAccumulatedGDD(plantDate, new Date(), crop.base_temp, crop.upper_temp);

  // Get forecasted GDD for next 16 days
  const forecastGDD = getForecastGDD(crop.base_temp, crop.upper_temp);

  // Calculate days remaining
  const gddNeeded = crop.gdd_to_harvest - accumulatedGDD;
  const avgDailyGDD = forecastGDD.avgPerDay;
  const daysRemaining = Math.ceil(gddNeeded / avgDailyGDD);

  return {
    predicted_date: addDays(new Date(), daysRemaining),
    confidence: calculateConfidence(forecastGDD.variance),
    gdd_accumulated: accumulatedGDD,
    gdd_remaining: gddNeeded,
    gdd_percent: (accumulatedGDD / crop.gdd_to_harvest) * 100
  };
}
```

### 2. Task Generation Logic

```javascript
function generateDailyTasks(date) {
  const tasks = [];

  // 1. Check plantings approaching harvest
  const harvestTasks = getPlantingsNearHarvest(date, 7); // 7 day window
  harvestTasks.forEach(p => {
    tasks.push({
      type: 'HARVEST',
      crop: p.crop,
      location: p.location,
      priority: calculatePriority(p, date),
      reason: `GDD ${p.gdd_percent}% complete, est. harvest ${p.predicted_date}`,
      est_time: p.estimated_harvest_time
    });
  });

  // 2. Check disease risk
  const diseaseRisk = calculateDiseaseRisk(date);
  if (diseaseRisk.late_blight > 17) {
    tasks.push({
      type: 'SCOUT_SPRAY',
      crop: 'Tomatoes/Potatoes',
      priority: 95,
      reason: `Late blight DSV ${diseaseRisk.late_blight} - HIGH RISK`,
      action: 'Scout immediately, spray if detected'
    });
  }

  // 3. Check weather-delayed tasks
  const forecast = getWeatherForecast(date, 3);
  const delayedTasks = getDelayedTasks();
  delayedTasks.forEach(t => {
    const canDo = checkWeatherWindow(t, forecast);
    if (canDo) {
      t.priority = Math.min(100, t.priority + 20); // Boost delayed tasks
      t.reason += ' (DELAYED - Weather window open)';
      tasks.push(t);
    }
  });

  // 4. Sort by priority
  tasks.sort((a, b) => b.priority - a.priority);

  return tasks;
}
```

### 3. Prescriptive Daily Brief

```javascript
function generateMorningBrief(date) {
  const weather = getWeatherForecast(date, 1)[0];
  const tasks = generateDailyTasks(date);
  const alerts = generateAlerts(date);

  return {
    date: date,
    weather_summary: {
      high: weather.temp_max,
      low: weather.temp_min,
      precip_chance: weather.precip_prob,
      conditions: weather.summary
    },
    must_do_today: tasks.filter(t => t.priority >= 80),
    should_do_today: tasks.filter(t => t.priority >= 50 && t.priority < 80),
    can_wait: tasks.filter(t => t.priority < 50),
    alerts: alerts,
    labor_hours_estimated: tasks.reduce((sum, t) => sum + (t.est_time || 30), 0) / 60
  };
}
```

---

## DATA STRUCTURES

### CROP_GDD_DATA (Google Sheet or Code)
```
Crop, Base_Temp_F, Upper_Temp_F, GDD_Transplant, GDD_Direct, Method, Category
Tomato, 45, 92, 1927, null, single_sine, Vegetable
Pepper, 52, 100, 1329, null, single_sine, Vegetable
Cucumber, 50, 90, 805, 1088, single_sine, Vegetable
...
```

### PREDICTIONS (New Google Sheet)
```
Batch_ID, Crop, Plant_Date, GDD_Accumulated, GDD_Target, Percent_Complete,
Predicted_Harvest, Confidence, Last_Updated, Alert_Status
```

### DISEASE_RISK_LOG
```
Date, Late_Blight_DSV, Early_Blight_Score, Downy_Mildew_Risk,
Alert_Sent, Notes
```

---

## IMPLEMENTATION PLAN

### Phase 1: GDD Engine (Backend)
1. Create `CROP_GDD_DATA` sheet with all crop parameters
2. Build `calculateGDD()` function
3. Build `getHistoricalWeather()` function (Open-Meteo archive)
4. Build `getForecastWeather()` function (Open-Meteo forecast)
5. Build `predictHarvestDate()` function

### Phase 2: Disease Risk (Backend)
1. Build `calculateLateBrightDSV()` function
2. Build `calculateEarlyBlightRisk()` function
3. Build `getDiseaseAlerts()` function
4. Create `DISEASE_RISK_LOG` sheet

### Phase 3: Task Intelligence (Backend)
1. Build `calculateTaskPriority()` function
2. Build `generateDailyTasks()` function
3. Build `checkWeatherWindow()` function
4. Build `generateMorningBrief()` function

### Phase 4: Dashboard (Frontend)
1. Create `smart-predictions.html`
2. Morning Brief view
3. Harvest predictions view
4. Disease risk view
5. Weather-task calendar

---

## SUCCESS METRICS

| Metric | Target | How Measured |
|--------|--------|--------------|
| Harvest prediction accuracy | ±3 days | Compare predicted vs actual |
| Disease alerts before outbreak | 100% | Track alerts vs infection |
| Task completion rate | 90%+ | Morning brief tasks done |
| Labor efficiency gain | 20%+ | Hours worked vs output |

---

*Specification complete. Ready to build.*
