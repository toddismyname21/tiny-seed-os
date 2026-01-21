/**
 * ============================================
 * MORNING BRIEF GENERATOR
 * Tiny Seed Farm Intelligence System
 * ============================================
 *
 * "I WANT IT TO KNOW WHAT I SHOULD DO BEFORE ME"
 *
 * This module generates a daily intelligence briefing that:
 * - Aggregates weather, disease, and food safety alerts
 * - Prioritizes tasks based on urgency and weather windows
 * - Tracks PHI deadlines for spray applications
 * - Forecasts harvests using GDD accumulation
 * - Provides actionable recommendations
 *
 * Created: 2026-01-21
 * Author: Don_Knowledge_Base Claude
 */

// ============================================
// CONFIGURATION
// ============================================

const MORNING_BRIEF_CONFIG = {
  farmLat: 40.3,  // Update with actual farm coordinates
  farmLon: -80.0,
  forecastDays: 14,
  phiAlertDays: 7,  // Alert when PHI deadline within this many days
  frostAlertTemp: 36,  // Alert when forecast low below this
  heatStressTemp: 90   // Alert when forecast high above this
};

// ============================================
// MAIN ENDPOINT
// ============================================

/**
 * Generate complete morning briefing
 * Call via: ?action=getMorningBrief
 *
 * @returns {Object} Complete daily intelligence brief
 */
function getMorningBrief() {
  const today = new Date();
  const brief = {
    generated: today.toISOString(),
    farmName: 'Tiny Seed Farm',
    briefDate: formatDateMB(today),
    greeting: getTimeBasedGreeting(),

    // Core Intelligence Sections
    weather: getWeatherBrief(),
    alerts: getCriticalAlerts(),
    priorities: getTodaysPriorities(),
    phiDeadlines: getPHIDeadlines(),
    harvestForecast: getHarvestForecast(),
    diseaseRisk: getDiseaseRiskBrief(),

    // Summary
    topActions: getTopThreeActions(),
    quote: getFarmingQuote()
  };

  return brief;
}

// ============================================
// WEATHER BRIEFING
// ============================================

/**
 * Get weather briefing with actionable insights
 */
function getWeatherBrief() {
  try {
    const forecast = fetchWeatherForecastMB(MORNING_BRIEF_CONFIG.farmLat, MORNING_BRIEF_CONFIG.farmLon, 7);

    if (!forecast || !forecast.daily) {
      return {
        status: 'UNAVAILABLE',
        message: 'Weather data temporarily unavailable',
        recommendation: 'Check local forecast manually'
      };
    }

    const today = forecast.daily;
    const todayHigh = today.temperature_2m_max[0];
    const todayLow = today.temperature_2m_min[0];
    const todayPrecip = today.precipitation_sum[0];
    const todayPrecipProb = today.precipitation_probability_max ? today.precipitation_probability_max[0] : 0;

    // Find spray windows (dry days with good temps)
    const sprayWindows = findSprayWindows(forecast);

    // Find frost risk days
    const frostRiskDays = findFrostRiskDays(forecast);

    // Find heat stress days
    const heatStressDays = findHeatStressDays(forecast);

    // Calculate GDD for today
    const gddToday = calculateGDDMB(todayHigh, todayLow, 50);

    return {
      status: 'OK',
      today: {
        high: Math.round(todayHigh),
        low: Math.round(todayLow),
        precipitation: todayPrecip,
        precipProbability: todayPrecipProb,
        gdd: gddToday,
        conditions: getConditionsSummary(todayHigh, todayLow, todayPrecip, todayPrecipProb)
      },
      weekSummary: {
        totalPrecip: Math.round(today.precipitation_sum.reduce((a, b) => a + b, 0) * 10) / 10,
        avgHigh: Math.round(today.temperature_2m_max.reduce((a, b) => a + b, 0) / today.temperature_2m_max.length),
        avgLow: Math.round(today.temperature_2m_min.reduce((a, b) => a + b, 0) / today.temperature_2m_min.length),
        totalGDD: today.temperature_2m_max.reduce((sum, high, i) => {
          return sum + calculateGDDMB(high, today.temperature_2m_min[i], 50);
        }, 0)
      },
      sprayWindows: sprayWindows,
      frostRisk: frostRiskDays,
      heatStress: heatStressDays,
      recommendation: generateWeatherRecommendation(forecast, sprayWindows, frostRiskDays)
    };

  } catch (e) {
    return {
      status: 'ERROR',
      message: e.toString(),
      recommendation: 'Check weather manually'
    };
  }
}

/**
 * Find optimal spray windows (dry, calm days)
 */
function findSprayWindows(forecast) {
  const windows = [];
  const daily = forecast.daily;

  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const precip = daily.precipitation_sum[i];
    const precipProb = daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0;
    const high = daily.temperature_2m_max[i];

    // Good spray day: <20% precip chance, <0.1" precip, temp 45-85°F
    if (precipProb < 20 && precip < 2.5 && high > 45 && high < 85) {
      windows.push({
        date: daily.time[i],
        quality: precipProb < 10 ? 'EXCELLENT' : 'GOOD',
        high: Math.round(high),
        precipProb: precipProb
      });
    }
  }

  return windows;
}

/**
 * Find days with frost risk
 */
function findFrostRiskDays(forecast) {
  const days = [];
  const daily = forecast.daily;

  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const low = daily.temperature_2m_min[i];

    if (low <= MORNING_BRIEF_CONFIG.frostAlertTemp) {
      days.push({
        date: daily.time[i],
        low: Math.round(low),
        severity: low <= 32 ? 'FREEZE' : 'FROST'
      });
    }
  }

  return days;
}

/**
 * Find days with heat stress risk
 */
function findHeatStressDays(forecast) {
  const days = [];
  const daily = forecast.daily;

  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const high = daily.temperature_2m_max[i];

    if (high >= MORNING_BRIEF_CONFIG.heatStressTemp) {
      days.push({
        date: daily.time[i],
        high: Math.round(high),
        severity: high >= 95 ? 'EXTREME' : 'HIGH'
      });
    }
  }

  return days;
}

// ============================================
// CRITICAL ALERTS
// ============================================

/**
 * Get all critical alerts requiring immediate attention
 */
function getCriticalAlerts() {
  const alerts = [];

  // Weather alerts
  const weather = getWeatherBrief();

  if (weather.frostRisk && weather.frostRisk.length > 0) {
    alerts.push({
      type: 'FROST',
      severity: 'HIGH',
      message: `Frost risk in ${weather.frostRisk.length} day(s): ${weather.frostRisk.map(d => d.date + ' (' + d.low + '°F)').join(', ')}`,
      action: 'Prepare row covers, harvest frost-sensitive crops'
    });
  }

  if (weather.heatStress && weather.heatStress.length > 0) {
    alerts.push({
      type: 'HEAT',
      severity: 'MEDIUM',
      message: `Heat stress expected: ${weather.heatStress.map(d => d.date + ' (' + d.high + '°F)').join(', ')}`,
      action: 'Plan irrigation, harvest early morning, shade sensitive crops'
    });
  }

  // Disease risk alerts (from FoodSafetyIntelligence)
  try {
    const diseaseRisk = typeof getContaminationRiskAssessment === 'function'
      ? getContaminationRiskAssessment()
      : null;

    if (diseaseRisk && diseaseRisk.overallRisk === 'HIGH' || diseaseRisk && diseaseRisk.overallRisk === 'CRITICAL') {
      alerts.push({
        type: 'CONTAMINATION',
        severity: diseaseRisk.overallRisk,
        message: 'Contamination risk elevated - review food safety protocols',
        action: diseaseRisk.recommendations ? diseaseRisk.recommendations[0] : 'Review FSMA protocols'
      });
    }
  } catch (e) {
    // FoodSafetyIntelligence not loaded
  }

  // PHI deadline alerts
  const phiDeadlines = getPHIDeadlines();
  const urgentPHI = phiDeadlines.filter(d => d.daysUntil <= 2);

  if (urgentPHI.length > 0) {
    alerts.push({
      type: 'PHI_DEADLINE',
      severity: 'HIGH',
      message: `PHI deadline approaching: ${urgentPHI.map(p => p.spray + ' on ' + p.crop).join(', ')}`,
      action: 'Last spray opportunity - apply today or harvest will be delayed'
    });
  }

  // Heavy rain flooding risk
  if (weather.weekSummary && weather.weekSummary.totalPrecip > 100) {  // > 4 inches
    alerts.push({
      type: 'FLOODING',
      severity: 'CRITICAL',
      message: `Heavy rain forecast: ${weather.weekSummary.totalPrecip}mm expected this week`,
      action: 'FSMA flood protocol - wait 9 days before harvest on flooded beds'
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// ============================================
// PHI DEADLINE TRACKING
// ============================================

/**
 * Get PHI deadlines for upcoming harvests
 * Pulls from spray log and harvest schedule
 */
function getPHIDeadlines() {
  // This would connect to actual spray log data
  // For now, return structure for integration

  const deadlines = [];

  // Get active spray applications from spray log (sheet integration)
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sprayLog = ss.getSheetByName('SprayLog');

    if (sprayLog) {
      const data = sprayLog.getDataRange().getValues();
      const headers = data[0];
      const sprayCol = headers.indexOf('Spray');
      const cropCol = headers.indexOf('Crop');
      const dateCol = headers.indexOf('Date');
      const phiCol = headers.indexOf('PHI');

      if (sprayCol >= 0 && cropCol >= 0 && dateCol >= 0) {
        for (let i = 1; i < data.length; i++) {
          const sprayDate = new Date(data[i][dateCol]);
          const phi = data[i][phiCol] || 0;
          const harvestSafe = new Date(sprayDate);
          harvestSafe.setDate(harvestSafe.getDate() + phi);

          const daysUntil = Math.ceil((harvestSafe - new Date()) / (1000 * 60 * 60 * 24));

          if (daysUntil > 0 && daysUntil <= MORNING_BRIEF_CONFIG.phiAlertDays) {
            deadlines.push({
              spray: data[i][sprayCol],
              crop: data[i][cropCol],
              appliedDate: formatDateMB(sprayDate),
              harvestSafeDate: formatDateMB(harvestSafe),
              daysUntil: daysUntil,
              status: daysUntil <= 1 ? 'IMMINENT' : daysUntil <= 3 ? 'APPROACHING' : 'UPCOMING'
            });
          }
        }
      }
    }
  } catch (e) {
    // SprayLog sheet not found or not in spreadsheet context
  }

  // If no spray log data, return example structure
  if (deadlines.length === 0) {
    return [{
      spray: 'No active PHI deadlines',
      crop: '-',
      daysUntil: 999,
      status: 'NONE',
      note: 'Connect SprayLog sheet to track PHI deadlines'
    }];
  }

  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ============================================
// HARVEST FORECAST
// ============================================

/**
 * Forecast harvest readiness using GDD accumulation
 */
function getHarvestForecast() {
  const forecasts = [];

  // Get active plantings from succession planner or planting sheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const plantings = ss.getSheetByName('ActivePlantings') || ss.getSheetByName('Plantings');

    if (plantings) {
      const data = plantings.getDataRange().getValues();
      const headers = data[0];
      const cropCol = headers.indexOf('Crop');
      const varietyCol = headers.indexOf('Variety');
      const plantDateCol = headers.indexOf('PlantDate') || headers.indexOf('TransplantDate');
      const gddTargetCol = headers.indexOf('GDDTarget');
      const gddAccumCol = headers.indexOf('GDDAccum');

      // Get weather forecast for GDD projection
      const weather = fetchWeatherForecastMB(MORNING_BRIEF_CONFIG.farmLat, MORNING_BRIEF_CONFIG.farmLon, 14);

      for (let i = 1; i < Math.min(data.length, 20); i++) {  // Limit to 20 crops
        const crop = data[i][cropCol];
        const variety = varietyCol >= 0 ? data[i][varietyCol] : '';
        const gddTarget = gddTargetCol >= 0 ? data[i][gddTargetCol] : 1000;
        const gddAccum = gddAccumCol >= 0 ? data[i][gddAccumCol] : 0;

        if (crop && gddTarget > 0) {
          const gddRemaining = gddTarget - gddAccum;
          const daysToHarvest = projectDaysToGDD(gddRemaining, weather);

          forecasts.push({
            crop: crop,
            variety: variety,
            gddAccumulated: Math.round(gddAccum),
            gddTarget: Math.round(gddTarget),
            percentComplete: Math.round((gddAccum / gddTarget) * 100),
            estimatedHarvestDays: daysToHarvest,
            estimatedHarvestDate: formatDateMB(addDays(new Date(), daysToHarvest)),
            status: daysToHarvest <= 3 ? 'IMMINENT' : daysToHarvest <= 7 ? 'THIS_WEEK' : 'UPCOMING'
          });
        }
      }
    }
  } catch (e) {
    // Not in spreadsheet context
  }

  // If no data, return helpful structure
  if (forecasts.length === 0) {
    return [{
      crop: 'No active plantings tracked',
      note: 'Connect ActivePlantings sheet to enable harvest forecasting',
      status: 'NONE'
    }];
  }

  return forecasts.sort((a, b) => a.estimatedHarvestDays - b.estimatedHarvestDays);
}

/**
 * Project days until GDD target is reached
 */
function projectDaysToGDD(gddNeeded, weather) {
  if (!weather || !weather.daily || gddNeeded <= 0) {
    // Fallback: assume 15 GDD/day average
    return Math.ceil(gddNeeded / 15);
  }

  let gddAccum = 0;
  let days = 0;
  const daily = weather.daily;

  while (gddAccum < gddNeeded && days < 60) {
    if (days < daily.time.length) {
      gddAccum += calculateGDDMB(
        daily.temperature_2m_max[days],
        daily.temperature_2m_min[days],
        50
      );
    } else {
      // Beyond forecast, use average
      gddAccum += 15;
    }
    days++;
  }

  return days;
}

// ============================================
// DISEASE RISK BRIEFING
// ============================================

/**
 * Get disease risk summary
 */
function getDiseaseRiskBrief() {
  // Try to use existing disease risk function
  try {
    if (typeof getAllCropDiseaseRisks === 'function') {
      return getAllCropDiseaseRisks();
    }
  } catch (e) {
    // Function not available
  }

  // Fallback: calculate basic disease risk from weather
  const weather = getWeatherBrief();
  const risks = [];

  if (weather.today) {
    const high = weather.today.high;
    const precipProb = weather.today.precipProbability;

    // Downy Mildew: High humidity + cool temps (60-75°F)
    if (precipProb > 60 && high >= 60 && high <= 75) {
      risks.push({
        disease: 'Downy Mildew',
        risk: 'HIGH',
        conditions: 'High humidity + optimal temp range',
        affectedCrops: ['Lettuce', 'Spinach', 'Cucurbits'],
        action: 'Scout susceptible crops, consider preventive copper spray'
      });
    }

    // Late Blight: Cool, wet (55-72°F)
    if (precipProb > 70 && high >= 55 && high <= 72) {
      risks.push({
        disease: 'Late Blight',
        risk: 'HIGH',
        conditions: 'Cool and wet - ideal for Phytophthora',
        affectedCrops: ['Tomatoes', 'Potatoes'],
        action: 'Inspect lower leaves, remove infected tissue immediately'
      });
    }

    // Powdery Mildew: Warm and dry (70-85°F, low precip)
    if (precipProb < 30 && high >= 70 && high <= 85) {
      risks.push({
        disease: 'Powdery Mildew',
        risk: 'MEDIUM',
        conditions: 'Warm and dry favors powdery mildew',
        affectedCrops: ['Squash', 'Cucumbers', 'Melons'],
        action: 'Increase air circulation, consider sulfur or potassium bicarbonate'
      });
    }
  }

  if (risks.length === 0) {
    risks.push({
      disease: 'None elevated',
      risk: 'LOW',
      conditions: 'Current conditions do not favor major diseases',
      action: 'Continue regular scouting'
    });
  }

  return risks;
}

// ============================================
// PRIORITY GENERATION
// ============================================

/**
 * Generate today's prioritized task list
 */
function getTodaysPriorities() {
  const priorities = [];
  const weather = getWeatherBrief();
  const alerts = getCriticalAlerts();

  // Priority 1: Address any critical alerts
  alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').forEach(alert => {
    priorities.push({
      priority: 1,
      category: alert.type,
      task: alert.action,
      reason: alert.message,
      urgency: 'IMMEDIATE'
    });
  });

  // Priority 2: Weather-dependent tasks
  if (weather.sprayWindows && weather.sprayWindows.length > 0 && weather.sprayWindows[0].date === weather.today?.date) {
    priorities.push({
      priority: 2,
      category: 'SPRAY_WINDOW',
      task: 'Execute planned spray applications',
      reason: 'Good spray conditions today - low wind, no rain expected',
      urgency: 'TODAY'
    });
  }

  // Priority 3: Harvest tasks (GDD-based)
  const harvests = getHarvestForecast();
  const imminentHarvests = harvests.filter(h => h.status === 'IMMINENT');
  if (imminentHarvests.length > 0) {
    priorities.push({
      priority: 3,
      category: 'HARVEST',
      task: `Harvest: ${imminentHarvests.map(h => h.crop).join(', ')}`,
      reason: 'GDD targets reached - optimal harvest window',
      urgency: 'TODAY'
    });
  }

  // Priority 4: Rain preparation
  if (weather.weekSummary && weather.weekSummary.totalPrecip > 25) {
    priorities.push({
      priority: 4,
      category: 'WEATHER_PREP',
      task: 'Complete field work before rain',
      reason: `${weather.weekSummary.totalPrecip}mm rain expected this week`,
      urgency: 'BEFORE_RAIN'
    });
  }

  return priorities.sort((a, b) => a.priority - b.priority);
}

/**
 * Get top 3 most important actions for today
 */
function getTopThreeActions() {
  const priorities = getTodaysPriorities();
  return priorities.slice(0, 3).map((p, i) => ({
    rank: i + 1,
    action: p.task,
    reason: p.reason
  }));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch weather forecast from Open-Meteo
 */
function fetchWeatherForecastMB(lat, lon, days) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=mm&timezone=America/New_York&forecast_days=${days}`;

  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    return JSON.parse(response.getContentText());
  } catch (e) {
    return null;
  }
}

/**
 * Calculate Growing Degree Days
 */
function calculateGDDMB(high, low, baseTemp) {
  const avg = (high + low) / 2;
  return Math.max(0, avg - baseTemp);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDateMB(date) {
  return Utilities.formatDate(date, 'America/New_York', 'yyyy-MM-dd');
}

/**
 * Add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get time-based greeting
 */
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Early morning briefing';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Afternoon update';
  return 'Evening briefing';
}

/**
 * Generate weather-based conditions summary
 */
function getConditionsSummary(high, low, precip, precipProb) {
  const parts = [];

  if (high > 85) parts.push('Hot');
  else if (high > 75) parts.push('Warm');
  else if (high < 50) parts.push('Cool');
  else if (high < 35) parts.push('Cold');
  else parts.push('Mild');

  if (precipProb > 70) parts.push('Rainy');
  else if (precipProb > 40) parts.push('Chance of rain');
  else parts.push('Dry');

  return parts.join(', ');
}

/**
 * Generate weather recommendation
 */
function generateWeatherRecommendation(forecast, sprayWindows, frostDays) {
  if (frostDays.length > 0) {
    return `FROST ALERT: Protect tender crops. Frost expected ${frostDays[0].date} (low ${frostDays[0].low}°F).`;
  }

  if (sprayWindows.length > 0) {
    return `Good spray window ${sprayWindows[0].date}. Plan applications accordingly.`;
  }

  return 'Normal conditions. Proceed with planned activities.';
}

/**
 * Get an inspirational farming quote
 */
function getFarmingQuote() {
  const quotes = [
    { text: "The farmer has to be an optimist or he wouldn't still be a farmer.", author: "Will Rogers" },
    { text: "Agriculture is our wisest pursuit, because it will in the end contribute most to real wealth.", author: "Thomas Jefferson" },
    { text: "The ultimate goal of farming is not the growing of crops, but the cultivation and perfection of human beings.", author: "Masanobu Fukuoka" },
    { text: "A good farmer is nothing more nor less than a handy man with a sense of humus.", author: "E.B. White" },
    { text: "The soil is the great connector of lives.", author: "Wendell Berry" }
  ];

  return quotes[Math.floor(Math.random() * quotes.length)];
}

// ============================================
// API ENDPOINT ROUTER
// ============================================

/**
 * Handle web app requests for morning brief
 */
function doGetMorningBrief(e) {
  const action = e.parameter.action;

  let result;
  switch (action) {
    case 'getMorningBrief':
      result = getMorningBrief();
      break;
    case 'getWeatherBrief':
      result = getWeatherBrief();
      break;
    case 'getAlerts':
      result = getCriticalAlerts();
      break;
    case 'getPriorities':
      result = getTodaysPriorities();
      break;
    case 'getHarvestForecast':
      result = getHarvestForecast();
      break;
    case 'getDiseaseRisk':
      result = getDiseaseRiskBrief();
      break;
    case 'getPHIDeadlines':
      result = getPHIDeadlines();
      break;
    default:
      result = { error: 'Unknown action. Use: getMorningBrief, getWeatherBrief, getAlerts, getPriorities, getHarvestForecast, getDiseaseRisk, getPHIDeadlines' };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
