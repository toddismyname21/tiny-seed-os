# Technical Specifications: Smart Farm Features
## Production-Ready Implementation Guide

**Created:** 2026-01-17
**For:** Tiny Seed OS Development
**Status:** READY FOR IMPLEMENTATION

---

## Overview

This document provides exact technical specifications for building Level 5 (Prescriptive) intelligence into Tiny Seed OS. These are not concepts - these are buildable features.

---

## Feature 1: Weather-Integrated Decision Engine

### API Integration: Open-Meteo

**Endpoint:** `https://api.open-meteo.com/v1/forecast`

**Parameters for Tiny Seed Farm (Rochester, PA):**
```javascript
const FARM_LAT = 40.7020;  // Update with exact coordinates
const FARM_LON = -80.2881;

const weatherParams = {
  latitude: FARM_LAT,
  longitude: FARM_LON,
  hourly: [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation_probability',
    'soil_temperature_0cm',
    'soil_moisture_0_1cm'
  ],
  daily: [
    'temperature_2m_max',
    'temperature_2m_min',
    'precipitation_sum',
    'precipitation_probability_max'
  ],
  timezone: 'America/New_York',
  forecast_days: 14
};
```

**Google Apps Script Function:**
```javascript
function fetchWeatherForecast() {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${FARM_LAT}&longitude=${FARM_LON}` +
    `&hourly=temperature_2m,relative_humidity_2m,soil_temperature_0cm` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=America/New_York&forecast_days=14`;

  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());

  // Store in Weather sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const weatherSheet = ss.getSheetByName('WEATHER_FORECAST');

  // Process and store data...
  return data;
}
```

---

### Growing Degree Day (GDD) Calculator

**Formula:**
```
GDD = MAX(0, (T_max + T_min) / 2 - T_base)
```

**Base Temperatures by Crop (°F):**
```javascript
const GDD_BASE_TEMPS = {
  // Cool Season
  'Lettuce': 40,
  'Spinach': 35,
  'Peas': 40,
  'Brassicas': 40,
  'Carrots': 40,

  // Warm Season
  'Tomatoes': 50,
  'Peppers': 55,
  'Squash': 50,
  'Beans': 50,
  'Corn': 50,
  'Cucumbers': 50,
  'Melons': 55
};
```

**GDD Accumulation Function:**
```javascript
function calculateGDD(cropType, startDate, endDate) {
  const baseTemp = GDD_BASE_TEMPS[cropType] || 50;
  const weatherData = getWeatherData(startDate, endDate);

  let totalGDD = 0;
  weatherData.forEach(day => {
    const avgTemp = (day.maxTemp + day.minTemp) / 2;
    const dailyGDD = Math.max(0, avgTemp - baseTemp);
    totalGDD += dailyGDD;
  });

  return totalGDD;
}
```

**GDD Requirements for Harvest (Example Crops):**
```javascript
const GDD_TO_HARVEST = {
  'Lettuce - Salanova': 700,
  'Lettuce - Romaine': 850,
  'Spinach': 600,
  'Tomato - Cherry': 1400,
  'Tomato - Slicing': 1600,
  'Pepper - Bell': 1800,
  'Cucumber': 1100,
  'Squash - Summer': 900,
  'Bean - Bush': 950,
  'Carrot': 1200
};
```

---

## Feature 2: Succession Planting Algorithm

### Core Logic

```javascript
function calculateSuccessionSchedule(params) {
  const {
    cropVariety,
    targetHarvestStart,
    targetHarvestEnd,
    harvestWindowDays,
    gddRequired,
    baseTemp
  } = params;

  const schedule = [];
  let currentTargetHarvest = new Date(targetHarvestStart);
  const endDate = new Date(targetHarvestEnd);

  // Overlap factor - ensures continuous supply
  const overlapFactor = 0.7;
  const successionInterval = harvestWindowDays * overlapFactor;

  while (currentTargetHarvest <= endDate) {
    // Calculate planting date using GDD
    const plantDate = calculatePlantDateFromGDD(
      currentTargetHarvest,
      gddRequired,
      baseTemp
    );

    // Check for frost/soil temp constraints
    const constraints = checkPlantingConstraints(plantDate, cropVariety);

    schedule.push({
      lot: `LOT-${schedule.length + 1}`,
      plantDate: plantDate,
      targetHarvest: currentTargetHarvest,
      estimatedGDD: gddRequired,
      constraints: constraints,
      adjustedPlantDate: constraints.adjustedDate || plantDate
    });

    // Move to next succession
    currentTargetHarvest.setDate(
      currentTargetHarvest.getDate() + successionInterval
    );
  }

  return schedule;
}
```

### Back-Calculation from Harvest Date

```javascript
function calculatePlantDateFromGDD(targetHarvest, gddNeeded, baseTemp) {
  // Get historical weather averages for the period
  const historicalData = getHistoricalWeatherAverages();

  let accumulatedGDD = 0;
  let daysBack = 0;
  let currentDate = new Date(targetHarvest);

  // Work backwards from harvest date
  while (accumulatedGDD < gddNeeded && daysBack < 200) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dayAvg = historicalData[getDayOfYear(currentDate)];
    const dailyGDD = Math.max(0, dayAvg - baseTemp);
    accumulatedGDD += dailyGDD;
    daysBack++;
  }

  return currentDate;
}
```

---

## Feature 3: Morning Brief Generator

### Data Aggregation Function

```javascript
function generateMorningBrief() {
  const today = new Date();
  const brief = {
    date: today,
    weather: {},
    priorityTasks: [],
    alerts: [],
    harvestReady: [],
    plantToday: [],
    financial: {}
  };

  // 1. Weather Summary
  brief.weather = {
    high: getWeatherForecast(today, 'max_temp'),
    low: getWeatherForecast(today, 'min_temp'),
    precipitation: getWeatherForecast(today, 'precip_chance'),
    frostRisk: checkFrostRisk(today),
    workability: assessFieldWorkability(today)
  };

  // 2. Priority Tasks (based on conditions)
  brief.priorityTasks = getPriorityTasks(today, brief.weather);

  // 3. Alerts (disease risk, irrigation needed, etc.)
  brief.alerts = getActiveAlerts();

  // 4. What's Ready to Harvest
  brief.harvestReady = getHarvestReadyCrops(today);

  // 5. What Needs Planting Today
  brief.plantToday = getPlantingDueToday(today);

  // 6. Financial Snapshot
  brief.financial = {
    yesterdaySales: getYesterdaySales(),
    pendingInvoices: getPendingInvoices(),
    weekProjection: getWeekSalesProjection()
  };

  return brief;
}
```

### Priority Task Algorithm

```javascript
function getPriorityTasks(date, weather) {
  const allTasks = getAllPendingTasks();
  const scored = [];

  allTasks.forEach(task => {
    let score = task.basePriority;

    // Weather adjustments
    if (task.type === 'harvest' && weather.precipitation > 60) {
      score += 50; // Harvest before rain
    }
    if (task.type === 'irrigation' && weather.precipitation > 40) {
      score -= 30; // Delay irrigation if rain coming
    }
    if (task.type === 'transplant' && weather.frostRisk) {
      score -= 100; // Don't transplant if frost risk
    }
    if (task.type === 'field_work' && weather.workability < 50) {
      score -= 50; // Field too wet
    }

    // Deadline adjustments
    const daysUntilDue = daysBetween(date, task.dueDate);
    if (daysUntilDue <= 0) score += 100; // Overdue
    if (daysUntilDue === 1) score += 50;  // Due tomorrow
    if (daysUntilDue <= 3) score += 25;   // Due soon

    // Customer impact
    if (task.affectsCustomerOrder) score += 40;

    scored.push({ task, score });
  });

  // Return top 5 by score
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => ({
      ...item.task,
      reasoning: generateTaskReasoning(item.task, weather)
    }));
}
```

### Reasoning Generator

```javascript
function generateTaskReasoning(task, weather) {
  const reasons = [];

  if (task.type === 'harvest' && weather.precipitation > 40) {
    reasons.push(`Rain expected (${weather.precipitation}% chance) - harvest before quality suffers`);
  }

  if (task.affectsCustomerOrder) {
    reasons.push(`Customer order depends on this - ${task.customerName} needs by ${task.deliveryDate}`);
  }

  if (task.gddStatus === 'optimal') {
    reasons.push(`GDD accumulation optimal today (${task.currentGDD}/${task.targetGDD})`);
  }

  if (task.soilTemp >= task.minSoilTemp) {
    reasons.push(`Soil temperature ${task.soilTemp}°F meets requirement (${task.minSoilTemp}°F)`);
  }

  return reasons.join('. ');
}
```

---

## Feature 4: Disease Risk Scoring

### Risk Calculation Model

```javascript
const DISEASE_CONDITIONS = {
  'Downy Mildew': {
    tempRange: [50, 75],
    humidityThreshold: 85,
    leafWetnessHours: 6,
    susceptibleCrops: ['Lettuce', 'Spinach', 'Basil']
  },
  'Powdery Mildew': {
    tempRange: [60, 80],
    humidityThreshold: 50, // Actually thrives in LOWER humidity
    susceptibleCrops: ['Squash', 'Cucumber', 'Pumpkin']
  },
  'Late Blight': {
    tempRange: [50, 78],
    humidityThreshold: 90,
    leafWetnessHours: 10,
    susceptibleCrops: ['Tomato', 'Potato']
  },
  'Botrytis': {
    tempRange: [55, 75],
    humidityThreshold: 93,
    susceptibleCrops: ['Strawberry', 'Lettuce', 'Tomato']
  }
};

function calculateDiseaseRisk(cropType, blockId) {
  const weather = getRecentWeather(7); // Last 7 days
  const forecast = getWeatherForecast(7); // Next 7 days
  const historicalOutbreaks = getHistoricalDiseaseData(blockId);

  const risks = [];

  Object.entries(DISEASE_CONDITIONS).forEach(([disease, conditions]) => {
    if (!conditions.susceptibleCrops.includes(cropType)) return;

    let riskScore = 0;

    // Check recent conditions
    const avgTemp = weather.avgTemp;
    const avgHumidity = weather.avgHumidity;
    const wetHours = weather.leafWetnessHours;

    // Temperature in range
    if (avgTemp >= conditions.tempRange[0] && avgTemp <= conditions.tempRange[1]) {
      riskScore += 25;
    }

    // Humidity threshold
    if (avgHumidity >= conditions.humidityThreshold) {
      riskScore += 30;
    }

    // Leaf wetness
    if (conditions.leafWetnessHours && wetHours >= conditions.leafWetnessHours) {
      riskScore += 25;
    }

    // Historical factor
    if (historicalOutbreaks[disease]) {
      riskScore += 20;
    }

    if (riskScore > 0) {
      risks.push({
        disease,
        riskScore,
        riskLevel: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
        conditions: {
          temp: avgTemp,
          humidity: avgHumidity,
          wetHours: wetHours
        },
        recommendation: getDiseaseRecommendation(disease, riskScore)
      });
    }
  });

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}
```

---

## Feature 5: Harvest Forecasting

### GDD-Based Prediction

```javascript
function forecastHarvest(plantingRecord) {
  const {
    cropVariety,
    plantDate,
    gddTarget,
    baseTemp
  } = plantingRecord;

  // Calculate GDD accumulated so far
  const today = new Date();
  const accumulatedGDD = calculateGDD(cropVariety, plantDate, today);

  // Estimate remaining GDD
  const remainingGDD = gddTarget - accumulatedGDD;

  if (remainingGDD <= 0) {
    return {
      status: 'READY',
      harvestDate: today,
      confidence: 'HIGH'
    };
  }

  // Use forecast to predict when we'll hit target
  const forecast = getWeatherForecast(30);
  let projectedGDD = accumulatedGDD;
  let daysUntilReady = 0;

  for (const day of forecast) {
    const dailyGDD = Math.max(0, ((day.maxTemp + day.minTemp) / 2) - baseTemp);
    projectedGDD += dailyGDD;
    daysUntilReady++;

    if (projectedGDD >= gddTarget) {
      const harvestDate = new Date(today);
      harvestDate.setDate(harvestDate.getDate() + daysUntilReady);

      return {
        status: 'PROJECTED',
        harvestDate: harvestDate,
        gddProgress: `${accumulatedGDD}/${gddTarget} (${Math.round(accumulatedGDD/gddTarget*100)}%)`,
        daysRemaining: daysUntilReady,
        confidence: daysUntilReady <= 7 ? 'HIGH' : 'MEDIUM'
      };
    }
  }

  // Beyond forecast range
  return {
    status: 'PROJECTED',
    harvestDate: estimateFromHistorical(plantingRecord),
    confidence: 'LOW',
    note: 'Beyond forecast range - using historical averages'
  };
}
```

---

## Feature 6: CSA Box Optimizer

### Box Composition Algorithm

```javascript
function optimizeCSABox(weekNumber, memberCount) {
  const available = getHarvestForecast(weekNumber);
  const previousBoxes = getPreviousBoxes(4); // Last 4 weeks
  const memberPrefs = getMemberPreferences();

  const boxContents = [];
  const targetValue = 30; // Target perceived value
  const targetItems = 8;  // Target item count

  // Categories for balance
  const categories = {
    'greens': { min: 2, max: 3 },
    'roots': { min: 1, max: 2 },
    'fruiting': { min: 1, max: 3 },
    'herbs': { min: 1, max: 2 },
    'alliums': { min: 0, max: 1 }
  };

  // Score each available item
  const scoredItems = available.map(item => {
    let score = 0;

    // Freshness bonus
    if (item.harvestDate === weekNumber) score += 20;

    // Variety penalty - was it in recent boxes?
    const weeksAgo = getLastIncluded(item.crop, previousBoxes);
    if (weeksAgo === 0) score -= 50; // Same week = bad
    if (weeksAgo === 1) score -= 30;
    if (weeksAgo === 2) score -= 10;
    if (weeksAgo >= 4) score += 10; // Haven't had in a while

    // Member preference bonus
    const prefScore = memberPrefs[item.crop] || 0;
    score += prefScore * 5;

    // Surplus handling - need to move it
    if (item.surplusLevel === 'HIGH') score += 15;

    return { ...item, score };
  });

  // Build box by category
  Object.entries(categories).forEach(([category, limits]) => {
    const categoryItems = scoredItems
      .filter(i => i.category === category)
      .sort((a, b) => b.score - a.score);

    let added = 0;
    for (const item of categoryItems) {
      if (added >= limits.min && boxContents.length >= targetItems) break;
      if (added >= limits.max) break;

      boxContents.push(item);
      added++;
    }
  });

  return {
    contents: boxContents,
    estimatedValue: calculateBoxValue(boxContents),
    variety: new Set(boxContents.map(i => i.category)).size,
    notes: generateBoxNotes(boxContents)
  };
}
```

---

## Implementation Checklist

### Immediate (Week 1-2)
- [ ] Add Open-Meteo API integration to Apps Script
- [ ] Create WEATHER_FORECAST sheet
- [ ] Implement GDD calculation function
- [ ] Add GDD tracking to PLANNING sheet

### Short-term (Week 3-4)
- [ ] Build succession planting calculator
- [ ] Implement Morning Brief generator
- [ ] Create automated email/notification system
- [ ] Add weather-based task scoring

### Medium-term (Month 2)
- [ ] Deploy disease risk scoring
- [ ] Implement harvest forecasting
- [ ] Build CSA box optimizer
- [ ] Create dashboard for prescriptive alerts

### Long-term (Month 3+)
- [ ] Train ML models on historical data
- [ ] Add IoT sensor integration
- [ ] Implement demand forecasting
- [ ] Build self-improving recommendation engine

---

*Technical Specification Document*
*Tiny Seed OS - Level 5 Intelligence*
