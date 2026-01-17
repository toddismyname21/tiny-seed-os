// ═══════════════════════════════════════════════════════════════════════════
// SMART SUCCESSION PLANNER - Level 5 Prescriptive Intelligence
// ═══════════════════════════════════════════════════════════════════════════
// Calculates optimal planting dates from target harvest dates using GDD
// This is the brain that tells you WHEN to plant to hit your harvest windows
// ═══════════════════════════════════════════════════════════════════════════
// Created: 2026-01-17 by Don_Knowledge_Base Claude
// Based on research from 40+ sources on state-of-the-art farm intelligence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GDD requirements to harvest (from seed/transplant to first harvest)
 * Based on Don Kretschmann's 40 years of data + published research
 */
const VARIETY_GDD_DATA = {
  // Lettuces (most succession-planted)
  'Salanova': { gddToHarvest: 700, baseTemp: 40, harvestWindowDays: 10, daysInGreenhouse: 24 },
  'Romaine': { gddToHarvest: 850, baseTemp: 40, harvestWindowDays: 7, daysInGreenhouse: 28 },
  'Butterhead': { gddToHarvest: 750, baseTemp: 40, harvestWindowDays: 7, daysInGreenhouse: 28 },
  'Little Gem': { gddToHarvest: 800, baseTemp: 40, harvestWindowDays: 7, daysInGreenhouse: 28 },

  // Greens
  'Spinach': { gddToHarvest: 600, baseTemp: 35, harvestWindowDays: 14, daysInGreenhouse: 15 },
  'Kale': { gddToHarvest: 900, baseTemp: 40, harvestWindowDays: 21, daysInGreenhouse: 35 },
  'Swiss Chard': { gddToHarvest: 850, baseTemp: 40, harvestWindowDays: 30, daysInGreenhouse: 35 },
  'Arugula': { gddToHarvest: 500, baseTemp: 40, harvestWindowDays: 10, daysInGreenhouse: 14 },

  // Fruiting
  'Tomato - Cherry': { gddToHarvest: 1400, baseTemp: 50, harvestWindowDays: 45, daysInGreenhouse: 56 },
  'Tomato - Slicing': { gddToHarvest: 1600, baseTemp: 50, harvestWindowDays: 45, daysInGreenhouse: 56 },
  'Pepper - Bell': { gddToHarvest: 1800, baseTemp: 55, harvestWindowDays: 60, daysInGreenhouse: 85 },
  'Pepper - Hot': { gddToHarvest: 1900, baseTemp: 55, harvestWindowDays: 75, daysInGreenhouse: 110 },
  'Cucumber': { gddToHarvest: 1100, baseTemp: 50, harvestWindowDays: 30, daysInGreenhouse: 20 },
  'Squash - Summer': { gddToHarvest: 900, baseTemp: 50, harvestWindowDays: 30, daysInGreenhouse: 21 },

  // Roots
  'Carrot': { gddToHarvest: 1200, baseTemp: 40, harvestWindowDays: 21, daysInGreenhouse: 0 },
  'Beet': { gddToHarvest: 900, baseTemp: 40, harvestWindowDays: 14, daysInGreenhouse: 21 },
  'Radish': { gddToHarvest: 400, baseTemp: 40, harvestWindowDays: 7, daysInGreenhouse: 0 },
  'Turnip': { gddToHarvest: 600, baseTemp: 40, harvestWindowDays: 10, daysInGreenhouse: 14 },

  // Brassicas
  'Broccoli': { gddToHarvest: 1100, baseTemp: 40, harvestWindowDays: 7, daysInGreenhouse: 35 },
  'Cabbage': { gddToHarvest: 1300, baseTemp: 40, harvestWindowDays: 14, daysInGreenhouse: 42 },
  'Cauliflower': { gddToHarvest: 1400, baseTemp: 40, harvestWindowDays: 5, daysInGreenhouse: 42 },

  // Beans
  'Bean - Bush': { gddToHarvest: 950, baseTemp: 50, harvestWindowDays: 14, daysInGreenhouse: 0 },
  'Bean - Pole': { gddToHarvest: 1100, baseTemp: 50, harvestWindowDays: 30, daysInGreenhouse: 0 },

  // Herbs
  'Basil': { gddToHarvest: 800, baseTemp: 50, harvestWindowDays: 45, daysInGreenhouse: 45 },
  'Cilantro': { gddToHarvest: 500, baseTemp: 40, harvestWindowDays: 14, daysInGreenhouse: 21 },
  'Dill': { gddToHarvest: 600, baseTemp: 40, harvestWindowDays: 21, daysInGreenhouse: 0 }
};

/**
 * Get historical average temperatures by month for Rochester, PA area
 * Used when forecast doesn't extend far enough
 */
const HISTORICAL_MONTHLY_TEMPS_PA = {
  1: { avgHigh: 35, avgLow: 20 },
  2: { avgHigh: 38, avgLow: 22 },
  3: { avgHigh: 48, avgLow: 30 },
  4: { avgHigh: 60, avgLow: 40 },
  5: { avgHigh: 70, avgLow: 50 },
  6: { avgHigh: 78, avgLow: 58 },
  7: { avgHigh: 82, avgLow: 62 },
  8: { avgHigh: 80, avgLow: 60 },
  9: { avgHigh: 73, avgLow: 53 },
  10: { avgHigh: 61, avgLow: 42 },
  11: { avgHigh: 49, avgLow: 34 },
  12: { avgHigh: 38, avgLow: 24 }
};

/**
 * SMART SUCCESSION PLANNER
 * Given a crop and target harvest window, calculates optimal planting schedule
 *
 * @param {Object} params - Planning parameters
 * @param {string} params.crop - Crop type (e.g., 'Salanova', 'Spinach')
 * @param {string} params.targetHarvestStart - Start of desired harvest window (ISO date)
 * @param {string} params.targetHarvestEnd - End of desired harvest window (ISO date)
 * @param {number} params.overlapFactor - Overlap between successions (0.5-0.9, default 0.7)
 * @returns {Object} Succession schedule with planting dates and reasoning
 */
function generateSmartSuccessionPlan(params) {
  try {
    const crop = params.crop;
    const targetStart = new Date(params.targetHarvestStart);
    const targetEnd = new Date(params.targetHarvestEnd);
    const overlapFactor = params.overlapFactor || 0.7;

    // Get crop data
    let cropData = VARIETY_GDD_DATA[crop];
    if (!cropData) {
      // Try to find partial match
      const matchedCrop = Object.keys(VARIETY_GDD_DATA).find(k =>
        crop.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(crop.toLowerCase())
      );
      if (matchedCrop) {
        cropData = VARIETY_GDD_DATA[matchedCrop];
      } else {
        return {
          success: false,
          error: `Unknown crop: ${crop}. Available: ${Object.keys(VARIETY_GDD_DATA).join(', ')}`
        };
      }
    }

    const { gddToHarvest, baseTemp, harvestWindowDays, daysInGreenhouse } = cropData;
    const successionInterval = Math.round(harvestWindowDays * overlapFactor);

    // Fetch weather forecast
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=40.7020&longitude=-80.2887&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=16';
    let forecast = [];
    try {
      const response = UrlFetchApp.fetch(weatherUrl);
      const data = JSON.parse(response.getContentText());
      forecast = data.daily.time.map((date, i) => ({
        date: new Date(date),
        high: data.daily.temperature_2m_max[i],
        low: data.daily.temperature_2m_min[i]
      }));
    } catch (e) {
      Logger.log('Weather API error, using historical averages: ' + e.toString());
    }

    const schedule = [];
    let currentTargetHarvest = new Date(targetStart);
    let lotNumber = 1;

    while (currentTargetHarvest <= targetEnd) {
      // Back-calculate planting date from target harvest using GDD
      const plantingInfo = calculatePlantDateFromHarvestSSP(
        currentTargetHarvest,
        gddToHarvest,
        baseTemp,
        daysInGreenhouse,
        forecast
      );

      // Check constraints
      const constraints = checkPlantingConstraintsSSP(plantingInfo.plantDate, crop, baseTemp, forecast);

      const lot = {
        lotNumber: lotNumber,
        crop: crop,
        targetHarvest: currentTargetHarvest.toISOString().split('T')[0],

        // Key dates
        plantDate: plantingInfo.plantDate.toISOString().split('T')[0],
        greenhouseDate: daysInGreenhouse > 0 ? plantingInfo.greenhouseDate.toISOString().split('T')[0] : null,
        transplantDate: daysInGreenhouse > 0 ? plantingInfo.plantDate.toISOString().split('T')[0] : null,

        // GDD info
        gddRequired: gddToHarvest,
        estimatedDaysToHarvest: plantingInfo.estimatedDays,

        // Harvest window
        harvestWindowStart: currentTargetHarvest.toISOString().split('T')[0],
        harvestWindowEnd: new Date(currentTargetHarvest.getTime() + harvestWindowDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

        // Constraints and alerts
        constraints: constraints,
        confidence: plantingInfo.confidence,

        // Reasoning - this is the "why" that makes it prescriptive
        reasoning: generatePlantingReasoningSSP(plantingInfo, constraints, crop, forecast)
      };

      schedule.push(lot);

      // Move to next succession
      currentTargetHarvest = new Date(currentTargetHarvest.getTime() + successionInterval * 24 * 60 * 60 * 1000);
      lotNumber++;
    }

    return {
      success: true,
      crop: crop,
      targetWindow: {
        start: targetStart.toISOString().split('T')[0],
        end: targetEnd.toISOString().split('T')[0]
      },
      successionInterval: successionInterval,
      totalLots: schedule.length,
      schedule: schedule,
      summary: generateScheduleSummarySSP(schedule),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('generateSmartSuccessionPlan error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Calculate planting date by working backwards from target harvest using GDD
 */
function calculatePlantDateFromHarvestSSP(targetHarvest, gddNeeded, baseTemp, daysInGreenhouse, forecast) {
  let accumulatedGDD = 0;
  let daysBack = 0;
  let currentDate = new Date(targetHarvest);
  const maxDays = 180; // Safety limit

  // Work backwards accumulating GDD until we hit target
  while (accumulatedGDD < gddNeeded && daysBack < maxDays) {
    currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);

    // Try to get forecast data, fall back to historical
    let high, low;
    const forecastDay = forecast.find(f =>
      f.date.toDateString() === currentDate.toDateString()
    );

    if (forecastDay) {
      high = forecastDay.high;
      low = forecastDay.low;
    } else {
      // Use historical averages
      const month = currentDate.getMonth() + 1;
      const historical = HISTORICAL_MONTHLY_TEMPS_PA[month];
      high = historical.avgHigh;
      low = historical.avgLow;
    }

    const dailyGDD = Math.max(0, ((high + low) / 2) - baseTemp);
    accumulatedGDD += dailyGDD;
    daysBack++;
  }

  // This is the transplant/field date - for greenhouse starts, go back further
  const fieldDate = new Date(currentDate);
  const greenhouseDate = daysInGreenhouse > 0
    ? new Date(currentDate.getTime() - daysInGreenhouse * 24 * 60 * 60 * 1000)
    : null;

  // Determine confidence based on how much we relied on forecasts vs historical
  const forecastDays = forecast.filter(f => f.date <= targetHarvest && f.date >= currentDate).length;
  const confidence = forecastDays >= daysBack * 0.8 ? 'HIGH' :
                     forecastDays >= daysBack * 0.4 ? 'MEDIUM' : 'LOW';

  return {
    plantDate: fieldDate,
    greenhouseDate: greenhouseDate,
    estimatedDays: daysBack,
    accumulatedGDD: Math.round(accumulatedGDD),
    confidence: confidence,
    forecastDaysUsed: forecastDays
  };
}

/**
 * Check planting constraints (frost risk, soil temp, etc.)
 */
function checkPlantingConstraintsSSP(plantDate, crop, baseTemp, forecast) {
  const constraints = [];

  // Check for frost risk (if warm season crop)
  if (baseTemp >= 50) {
    const frostDate = new Date(plantDate);
    // Check forecast around plant date
    const nearbyForecast = forecast.filter(f => {
      const diff = Math.abs(f.date.getTime() - frostDate.getTime()) / (24 * 60 * 60 * 1000);
      return diff <= 7;
    });

    const frostRisk = nearbyForecast.some(f => f.low <= 36);
    if (frostRisk) {
      constraints.push({
        type: 'FROST_RISK',
        severity: 'HIGH',
        message: 'Frost risk within 7 days of planting - consider protection or delay'
      });
    }
  }

  // Check soil temperature for direct seeding
  const month = plantDate.getMonth() + 1;
  const avgSoilTemp = HISTORICAL_MONTHLY_TEMPS_PA[month].avgLow + 5; // Rough estimate

  if (avgSoilTemp < baseTemp) {
    constraints.push({
      type: 'SOIL_TEMP',
      severity: 'MEDIUM',
      message: `Soil likely below ${baseTemp}°F minimum - use row cover or delay`
    });
  }

  return constraints;
}

/**
 * Generate human-readable reasoning for why this planting date was chosen
 */
function generatePlantingReasoningSSP(plantingInfo, constraints, crop, forecast) {
  const reasons = [];

  reasons.push(`Plant ${plantingInfo.estimatedDays} days before target harvest to accumulate ${plantingInfo.accumulatedGDD} GDD`);

  if (plantingInfo.forecastDaysUsed > 0) {
    reasons.push(`Based on ${plantingInfo.forecastDaysUsed} days of weather forecast data`);
  } else {
    reasons.push('Using historical average temperatures (no forecast data for this period)');
  }

  if (constraints.length > 0) {
    const warnings = constraints.map(c => c.message);
    reasons.push(`CAUTION: ${warnings.join('; ')}`);
  }

  return reasons.join('. ');
}

/**
 * Generate summary of the succession schedule
 */
function generateScheduleSummarySSP(schedule) {
  const firstPlant = schedule.length > 0 ? schedule[0].plantDate : null;
  const lastPlant = schedule.length > 0 ? schedule[schedule.length - 1].plantDate : null;
  const highRiskLots = schedule.filter(s => s.constraints.some(c => c.severity === 'HIGH'));

  return {
    firstPlantDate: firstPlant,
    lastPlantDate: lastPlant,
    totalSuccessions: schedule.length,
    highRiskLots: highRiskLots.length,
    plantingSpanDays: firstPlant && lastPlant ?
      Math.round((new Date(lastPlant) - new Date(firstPlant)) / (24 * 60 * 60 * 1000)) : 0
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DISEASE RISK PREDICTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const DISEASE_CONDITIONS_DB = {
  'Downy Mildew': {
    tempRange: [50, 75],
    humidityThreshold: 85,
    leafWetnessHours: 6,
    susceptibleCrops: ['Lettuce', 'Spinach', 'Basil', 'Cucumber'],
    prevention: 'Improve air circulation, reduce overhead irrigation, apply copper-based fungicide preventatively'
  },
  'Powdery Mildew': {
    tempRange: [60, 80],
    humidityThreshold: 50,
    leafWetnessHours: 0,
    susceptibleCrops: ['Squash', 'Cucumber', 'Pumpkin', 'Melon'],
    prevention: 'Apply sulfur or potassium bicarbonate, ensure adequate spacing for airflow'
  },
  'Late Blight': {
    tempRange: [50, 78],
    humidityThreshold: 90,
    leafWetnessHours: 10,
    susceptibleCrops: ['Tomato', 'Potato'],
    prevention: 'Scout daily, remove infected tissue immediately, apply copper preventatively'
  },
  'Botrytis (Gray Mold)': {
    tempRange: [55, 75],
    humidityThreshold: 93,
    leafWetnessHours: 8,
    susceptibleCrops: ['Strawberry', 'Lettuce', 'Tomato', 'Bean'],
    prevention: 'Improve airflow, avoid evening irrigation, remove dead plant material'
  },
  'Alternaria (Early Blight)': {
    tempRange: [75, 90],
    humidityThreshold: 70,
    leafWetnessHours: 4,
    susceptibleCrops: ['Tomato', 'Potato', 'Pepper', 'Eggplant'],
    prevention: 'Mulch to prevent soil splash, stake plants for airflow, rotate crops'
  },
  'Bacterial Leaf Spot': {
    tempRange: [75, 86],
    humidityThreshold: 80,
    leafWetnessHours: 2,
    susceptibleCrops: ['Pepper', 'Tomato'],
    prevention: 'Avoid overhead irrigation, copper sprays, use resistant varieties'
  }
};

/**
 * Calculate disease risk for a specific crop based on weather
 * @param {Object} params - { crop: string, field: string (optional) }
 * @returns {Object} Disease risk assessment with recommendations
 */
function getDiseaseRiskAssessment(params) {
  try {
    const crop = params.crop;

    // Get weather data
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=40.7020&longitude=-80.2887' +
      '&hourly=temperature_2m,relative_humidity_2m,precipitation' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max' +
      '&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=7&past_days=3';

    const response = UrlFetchApp.fetch(weatherUrl);
    const weather = JSON.parse(response.getContentText());

    // Calculate averages from last 3 days + forecast
    const temps = weather.hourly.temperature_2m;
    const humidity = weather.hourly.relative_humidity_2m;

    const recentTemps = temps.slice(0, 72); // Last 3 days
    const recentHumidity = humidity.slice(0, 72);

    const avgTemp = recentTemps.reduce((a, b) => a + b, 0) / recentTemps.length;
    const avgHumidity = recentHumidity.reduce((a, b) => a + b, 0) / recentHumidity.length;
    const highHumidityHours = recentHumidity.filter(h => h >= 90).length;

    // Check each disease
    const risks = [];

    Object.entries(DISEASE_CONDITIONS_DB).forEach(([disease, conditions]) => {
      // Check if crop is susceptible
      const isSusceptible = conditions.susceptibleCrops.some(sc =>
        crop.toLowerCase().includes(sc.toLowerCase()) ||
        sc.toLowerCase().includes(crop.toLowerCase())
      );

      if (!isSusceptible) return;

      let riskScore = 0;
      const factors = [];

      // Temperature in range
      if (avgTemp >= conditions.tempRange[0] && avgTemp <= conditions.tempRange[1]) {
        riskScore += 30;
        factors.push(`Temperature ${Math.round(avgTemp)}°F in risk range (${conditions.tempRange[0]}-${conditions.tempRange[1]}°F)`);
      }

      // Humidity threshold
      if (avgHumidity >= conditions.humidityThreshold) {
        riskScore += 35;
        factors.push(`Humidity ${Math.round(avgHumidity)}% exceeds ${conditions.humidityThreshold}% threshold`);
      }

      // Leaf wetness / high humidity hours
      if (conditions.leafWetnessHours > 0 && highHumidityHours >= conditions.leafWetnessHours) {
        riskScore += 25;
        factors.push(`${highHumidityHours} hours of high humidity (>90%) exceeds ${conditions.leafWetnessHours} hour threshold`);
      }

      // Precipitation factor
      const recentPrecip = weather.daily.precipitation_sum.slice(0, 3).reduce((a, b) => a + (b || 0), 0);
      if (recentPrecip > 0.5) {
        riskScore += 10;
        factors.push(`Recent precipitation (${recentPrecip.toFixed(1)}") increases humidity and splashing`);
      }

      if (riskScore > 0) {
        risks.push({
          disease: disease,
          riskScore: riskScore,
          riskLevel: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
          factors: factors,
          prevention: conditions.prevention,
          action: riskScore >= 70 ? 'SCOUT TODAY - Immediate inspection recommended' :
                  riskScore >= 40 ? 'MONITOR - Scout within 48 hours' :
                  'WATCH - Normal monitoring'
        });
      }
    });

    // Sort by risk score
    risks.sort((a, b) => b.riskScore - a.riskScore);

    return {
      success: true,
      crop: crop,
      weatherConditions: {
        avgTemp: Math.round(avgTemp),
        avgHumidity: Math.round(avgHumidity),
        highHumidityHours: highHumidityHours,
        recentPrecip: weather.daily.precipitation_sum.slice(0, 3).reduce((a, b) => a + (b || 0), 0).toFixed(2)
      },
      risks: risks,
      highRiskCount: risks.filter(r => r.riskLevel === 'HIGH').length,
      overallRisk: risks.length > 0 ? risks[0].riskLevel : 'LOW',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getDiseaseRiskAssessment error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get disease risk for all active crops in the field
 * @returns {Object} Disease risk dashboard
 */
function getAllCropDiseaseRisks() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const planningSheet = ss.getSheetByName('PLANNING_2026');

    if (!planningSheet) {
      return { success: false, error: 'PLANNING_2026 sheet not found' };
    }

    const data = planningSheet.getDataRange().getValues();
    const headers = data[0];
    const cropIdx = headers.indexOf('Crop');
    const statusIdx = headers.indexOf('Status');

    // Get unique active crops
    const activeCrops = new Set();
    for (let i = 1; i < data.length; i++) {
      const status = data[i][statusIdx];
      const crop = data[i][cropIdx];
      if (crop && status && !['Harvested', 'Complete', 'Cancelled'].includes(status)) {
        activeCrops.add(crop);
      }
    }

    // Assess each crop
    const assessments = [];
    for (const crop of activeCrops) {
      const assessment = getDiseaseRiskAssessment({ crop: crop });
      if (assessment.success && assessment.risks.length > 0) {
        assessments.push({
          crop: crop,
          overallRisk: assessment.overallRisk,
          topRisk: assessment.risks[0],
          riskCount: assessment.risks.length
        });
      }
    }

    // Sort by risk level
    const riskOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
    assessments.sort((a, b) => riskOrder[a.overallRisk] - riskOrder[b.overallRisk]);

    return {
      success: true,
      assessments: assessments,
      summary: {
        totalCropsAssessed: activeCrops.size,
        highRiskCrops: assessments.filter(a => a.overallRisk === 'HIGH').length,
        mediumRiskCrops: assessments.filter(a => a.overallRisk === 'MEDIUM').length
      },
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getAllCropDiseaseRisks error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS FOR SMART FEATURES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test the smart succession planner
 * Example: generateSmartSuccessionPlan({crop: 'Salanova', targetHarvestStart: '2026-05-01', targetHarvestEnd: '2026-09-30'})
 */
function testSmartSuccessionPlan() {
  const result = generateSmartSuccessionPlan({
    crop: 'Salanova',
    targetHarvestStart: '2026-05-01',
    targetHarvestEnd: '2026-09-30',
    overlapFactor: 0.7
  });

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test disease risk assessment
 */
function testDiseaseRiskAssessment() {
  const result = getDiseaseRiskAssessment({ crop: 'Tomato' });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}
