// ═══════════════════════════════════════════════════════════════════════════
// FOOD SAFETY INTELLIGENCE MODULE
// ═══════════════════════════════════════════════════════════════════════════
// Expert food safety guidance embedded in all recommendations
// FSMA Produce Safety Rule compliant
// Created: 2026-01-17 by Don_Knowledge_Base Claude
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OMRI-Approved Spray Database with PHI/REI
 * PHI = Pre-Harvest Interval (days)
 * REI = Restricted Entry Interval (hours)
 */
const OMRI_SPRAY_DATABASE = {
  // Insecticides
  'Bt (Bacillus thuringiensis)': {
    type: 'Insecticide',
    phi: 0,
    reiHours: 4,
    targets: ['Caterpillars', 'Cabbage looper', 'Imported cabbageworm', 'Tomato hornworm'],
    notes: 'Safe for beneficials when dry. Target specific to caterpillars.',
    omriListed: true
  },
  'Spinosad': {
    type: 'Insecticide',
    phi: 1,  // 1-7 days depending on crop
    reiHours: 4,
    targets: ['Thrips', 'Leafminers', 'Colorado potato beetle', 'Caterpillars'],
    notes: 'TOXIC TO BEES when wet. Apply evening after bee activity.',
    omriListed: true,
    beeWarning: true
  },
  'Pyrethrin': {
    type: 'Insecticide',
    phi: 0,
    reiHours: 12,
    targets: ['Aphids', 'Flea beetles', 'Cucumber beetles', 'Most soft-bodied insects'],
    notes: 'Broad spectrum - also kills beneficials. Use as last resort.',
    omriListed: true
  },
  'Neem Oil': {
    type: 'Insecticide/Fungicide',
    phi: 0,
    reiHours: 4,
    targets: ['Aphids', 'Whiteflies', 'Mites', 'Powdery mildew'],
    notes: 'Do not apply in temps above 90°F. May burn sensitive crops.',
    omriListed: true
  },
  'Insecticidal Soap': {
    type: 'Insecticide',
    phi: 0,
    reiHours: 4,
    targets: ['Aphids', 'Mites', 'Whiteflies', 'Soft-bodied insects'],
    notes: 'Contact kill only - must hit pest directly. Safe for beneficials.',
    omriListed: true
  },

  // Fungicides
  'Copper (Kocide 3000-O)': {
    type: 'Fungicide/Bactericide',
    phi: 0,
    reiHours: 48,
    targets: ['Bacterial leaf spot', 'Downy mildew', 'Late blight', 'Anthracnose'],
    notes: 'Do not apply within 2 weeks of sulfur. Can accumulate in soil.',
    omriListed: true
  },
  'Copper (Cueva)': {
    type: 'Fungicide/Bactericide',
    phi: 0,
    reiHours: 4,
    targets: ['Bacterial diseases', 'Fungal diseases'],
    notes: 'Copper soap formulation - lower REI than other coppers.',
    omriListed: true
  },
  'Sulfur': {
    type: 'Fungicide/Miticide',
    phi: 0,
    reiHours: 24,
    targets: ['Powdery mildew', 'Mites', 'Rust'],
    notes: 'Do not apply within 2 weeks of oil sprays. Do not use in temps above 85°F.',
    omriListed: true
  },
  'Regalia': {
    type: 'Biofungicide',
    phi: 0,
    reiHours: 4,
    targets: ['Powdery mildew', 'Downy mildew', 'Bacterial diseases'],
    notes: 'Plant defense activator - best as preventative.',
    omriListed: true
  },
  'Serenade': {
    type: 'Biofungicide',
    phi: 0,
    reiHours: 4,
    targets: ['Botrytis', 'Powdery mildew', 'Bacterial spot'],
    notes: 'Bacillus subtilis - preventative use recommended.',
    omriListed: true
  }
};

/**
 * FSMA Compliance Thresholds
 */
const FSMA_THRESHOLDS = {
  exemptBelow: 25000,           // Fully exempt below $25K
  qualifiedExemptBelow: 500000, // Qualified exemption below $500K
  smallBusiness: 250000,        // Small business threshold
  verySmallBusiness: 25000      // Very small business threshold
};

/**
 * Manure Application Intervals (USDA NOP)
 */
const MANURE_INTERVALS = {
  rawManureContactWithSoil: 120,    // Days if edible portion contacts soil
  rawManureNoContact: 90,           // Days if edible portion doesn't contact soil
  compostedManure: 0                // Properly composted has no interval
};

/**
 * Water Quality Risk Factors
 */
const WATER_RISK_FACTORS = {
  surfaceWater: 'HIGH',          // Ponds, streams - highest risk
  shallowWell: 'MEDIUM',         // Less than 50 feet
  deepWell: 'LOW',               // Greater than 50 feet
  municipalWater: 'LOW',         // Treated water
  rainwaterCollection: 'MEDIUM'  // Depends on collection system
};

// ═══════════════════════════════════════════════════════════════════════════
// FOOD SAFETY INTEGRATED RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get food safety recommendation for spray application
 * Integrates with disease risk engine
 *
 * @param {Object} params - { spray: string, crop: string, harvestDate: string }
 * @returns {Object} Spray guidance with PHI/REI and food safety warnings
 */
function getSprayGuidance(params) {
  try {
    const { spray, crop, harvestDate } = params;

    const sprayData = OMRI_SPRAY_DATABASE[spray];
    if (!sprayData) {
      // Try partial match
      const matchedSpray = Object.keys(OMRI_SPRAY_DATABASE).find(s =>
        spray.toLowerCase().includes(s.toLowerCase()) ||
        s.toLowerCase().includes(spray.toLowerCase())
      );
      if (matchedSpray) {
        return getSprayGuidance({ ...params, spray: matchedSpray });
      }
      return {
        success: false,
        error: `Unknown spray: ${spray}. Available: ${Object.keys(OMRI_SPRAY_DATABASE).join(', ')}`
      };
    }

    const today = new Date();
    const harvest = harvestDate ? new Date(harvestDate) : null;
    const daysToHarvest = harvest ? Math.ceil((harvest - today) / (1000 * 60 * 60 * 24)) : null;

    // Calculate spray deadline
    const lastSprayDate = harvest ?
      new Date(harvest.getTime() - sprayData.phi * 24 * 60 * 60 * 1000) : null;

    // Calculate re-entry time
    const reentryTime = new Date(today.getTime() + sprayData.reiHours * 60 * 60 * 1000);

    // Generate warnings
    const warnings = [];
    const alerts = [];

    // PHI warning
    if (daysToHarvest !== null && daysToHarvest < sprayData.phi) {
      alerts.push({
        type: 'PHI_VIOLATION',
        severity: 'CRITICAL',
        message: `CANNOT SPRAY - Harvest in ${daysToHarvest} days but PHI is ${sprayData.phi} days. Spraying would violate federal law.`
      });
    } else if (daysToHarvest !== null && daysToHarvest <= sprayData.phi + 2) {
      warnings.push({
        type: 'PHI_CLOSE',
        severity: 'WARNING',
        message: `Last chance to spray - harvest in ${daysToHarvest} days, PHI is ${sprayData.phi} days.`
      });
    }

    // Bee warning for spinosad
    if (sprayData.beeWarning) {
      warnings.push({
        type: 'BEE_TOXIC',
        severity: 'WARNING',
        message: 'TOXIC TO BEES when wet. Apply in evening after bee activity ceases. Allow to dry before morning.'
      });
    }

    // Weather integration
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=40.7020&longitude=-80.2887&current=temperature_2m&daily=temperature_2m_max,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=2';

    let weatherWarnings = [];
    try {
      const response = UrlFetchApp.fetch(weatherUrl);
      const weather = JSON.parse(response.getContentText());

      const currentTemp = weather.current.temperature_2m;
      const maxTemp = weather.daily.temperature_2m_max[0];
      const rainChance = weather.daily.precipitation_probability_max[0];

      // Temperature warnings for specific sprays
      if (spray.toLowerCase().includes('neem') && maxTemp > 90) {
        weatherWarnings.push(`High temp (${maxTemp}°F) - Neem may burn foliage. Spray early morning or wait.`);
      }
      if (spray.toLowerCase().includes('sulfur') && maxTemp > 85) {
        weatherWarnings.push(`High temp (${maxTemp}°F) - Sulfur may cause phytotoxicity. Do not spray.`);
      }

      // Rain warning
      if (rainChance > 50) {
        weatherWarnings.push(`${rainChance}% rain chance - spray may wash off. Consider waiting or using spreader-sticker.`);
      }

    } catch (e) {
      Logger.log('Weather fetch error: ' + e.toString());
    }

    return {
      success: true,
      spray: spray,
      crop: crop,
      sprayData: sprayData,
      timing: {
        phi: sprayData.phi,
        reiHours: sprayData.reiHours,
        daysToHarvest: daysToHarvest,
        lastSprayDate: lastSprayDate ? lastSprayDate.toISOString().split('T')[0] : null,
        reentryAllowedAt: reentryTime.toISOString(),
        canSprayToday: alerts.length === 0
      },
      alerts: alerts,
      warnings: warnings,
      weatherWarnings: weatherWarnings,
      guidance: generateSprayGuidance(sprayData, daysToHarvest, alerts, warnings),
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getSprayGuidance error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate human-readable spray guidance
 */
function generateSprayGuidance(sprayData, daysToHarvest, alerts, warnings) {
  const guidance = [];

  if (alerts.some(a => a.type === 'PHI_VIOLATION')) {
    guidance.push('❌ DO NOT SPRAY - Would violate pre-harvest interval requirements.');
    guidance.push('Consider: manual pest removal, row cover, or accept some damage.');
    return guidance.join('\n');
  }

  guidance.push(`✓ ${sprayData.type} application permitted.`);
  guidance.push(`→ Re-entry interval: ${sprayData.reiHours} hours`);
  guidance.push(`→ Pre-harvest interval: ${sprayData.phi} days`);

  if (sprayData.notes) {
    guidance.push(`⚠ Note: ${sprayData.notes}`);
  }

  if (daysToHarvest && daysToHarvest <= 7) {
    guidance.push(`📅 Harvest in ${daysToHarvest} days - document this application carefully for traceability.`);
  }

  return guidance.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTAMINATION RISK ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assess contamination risk based on weather and conditions
 * @param {Object} params - { field: string (optional) }
 * @returns {Object} Contamination risk assessment
 */
function getContaminationRiskAssessment(params) {
  try {
    const risks = [];

    // Get weather data including precipitation history
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=40.7020&longitude=-80.2887' +
      '&daily=precipitation_sum,temperature_2m_max,temperature_2m_min' +
      '&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=3&past_days=7';

    const response = UrlFetchApp.fetch(weatherUrl);
    const weather = JSON.parse(response.getContentText());

    // Check for recent heavy rainfall (flooding risk)
    const recentPrecip = weather.daily.precipitation_sum.slice(0, 7);
    const totalRecentPrecip = recentPrecip.reduce((a, b) => a + (b || 0), 0);
    const maxDailyPrecip = Math.max(...recentPrecip.filter(p => p !== null));

    // Flooding risk
    if (totalRecentPrecip > 4 || maxDailyPrecip > 2) {
      risks.push({
        type: 'FLOODING_RISK',
        severity: totalRecentPrecip > 6 ? 'CRITICAL' : 'HIGH',
        message: `Heavy precipitation (${totalRecentPrecip.toFixed(1)}" in 7 days). Check low-lying fields for standing water.`,
        action: 'CRITICAL: If flood water contacted edible portions, crop is ADULTERATED per FDA and cannot be sold. Inspect immediately.',
        guidance: [
          'Walk fields to check for standing water or debris lines',
          'Do not harvest any produce that was contacted by flood water',
          'If in doubt, do not harvest - contaminated produce cannot be made safe',
          'Document findings with photos and notes'
        ]
      });
    }

    // Standing water / high moisture risk for pathogens
    if (totalRecentPrecip > 2) {
      const avgTemp = weather.daily.temperature_2m_max.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      if (avgTemp > 60 && avgTemp < 85) {
        risks.push({
          type: 'PATHOGEN_GROWTH',
          severity: 'MEDIUM',
          message: `Warm wet conditions (${avgTemp.toFixed(0)}°F, ${totalRecentPrecip.toFixed(1)}" rain) favor bacterial growth.`,
          action: 'Extended cool-down period recommended post-harvest.',
          guidance: [
            'Harvest in early morning when temps are coolest',
            'Get produce into cooler within 1 hour of harvest',
            'Ensure cooler is at 34-38°F',
            'Do not harvest from wet foliage if possible'
          ]
        });
      }
    }

    // Wildlife intrusion risk (seasonal)
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 10) {
      risks.push({
        type: 'WILDLIFE',
        severity: 'LOW',
        message: 'Active wildlife season - deer, birds, and other animals may enter fields.',
        action: 'Regular field scouting for animal evidence.',
        guidance: [
          'Scout for deer droppings, especially in leafy greens',
          'Check for bird damage on fruiting crops',
          'Do not harvest produce with visible animal contact',
          'Maintain perimeter fencing where possible'
        ]
      });
    }

    // Temperature abuse risk
    const highTemps = weather.daily.temperature_2m_max.slice(0, 3);
    const maxTemp = Math.max(...highTemps);
    if (maxTemp > 85) {
      risks.push({
        type: 'TEMPERATURE_ABUSE',
        severity: maxTemp > 95 ? 'HIGH' : 'MEDIUM',
        message: `High temperatures (${maxTemp}°F) increase spoilage and pathogen risk.`,
        action: 'Accelerate post-harvest cooling. Reduce field holding time.',
        guidance: [
          'Harvest in early morning (before 10am)',
          'Never leave harvested produce in direct sun',
          'Use insulated totes or shade covers',
          'Ice-water dunk for rapid cooling where appropriate',
          'Target cooler temp of 34°F for leafy greens'
        ]
      });
    }

    // Sort by severity
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      success: true,
      weatherSummary: {
        totalPrecip7Days: totalRecentPrecip.toFixed(2),
        maxDailyPrecip: maxDailyPrecip.toFixed(2),
        forecastHighs: highTemps
      },
      risks: risks,
      criticalCount: risks.filter(r => r.severity === 'CRITICAL').length,
      highCount: risks.filter(r => r.severity === 'HIGH').length,
      overallRisk: risks.length > 0 ? risks[0].severity : 'LOW',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getContaminationRiskAssessment error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HARVEST FOOD SAFETY GUIDANCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate food safety checklist for harvest day
 * @param {Object} params - { crop: string, quantity: string (optional) }
 * @returns {Object} Harvest food safety guidance
 */
function getHarvestFoodSafetyGuidance(params) {
  try {
    const crop = params.crop || 'general';
    const today = new Date();

    // Get contamination risk
    const contamRisk = getContaminationRiskAssessment({});

    // Crop-specific guidance
    const leafyGreens = ['Lettuce', 'Spinach', 'Kale', 'Arugula', 'Chard', 'Salanova'];
    const fruiting = ['Tomato', 'Pepper', 'Cucumber', 'Squash', 'Eggplant'];
    const roots = ['Carrot', 'Beet', 'Radish', 'Turnip', 'Potato'];

    let cropCategory = 'general';
    if (leafyGreens.some(lg => crop.toLowerCase().includes(lg.toLowerCase()))) {
      cropCategory = 'leafyGreens';
    } else if (fruiting.some(f => crop.toLowerCase().includes(f.toLowerCase()))) {
      cropCategory = 'fruiting';
    } else if (roots.some(r => crop.toLowerCase().includes(r.toLowerCase()))) {
      cropCategory = 'roots';
    }

    const checklist = {
      preHarvest: [
        '☐ Check field for standing water or flood evidence',
        '☐ Scout for animal intrusion (droppings, tracks, damage)',
        '☐ Verify PHI compliance for any recent spray applications',
        '☐ Confirm workers have completed food safety training'
      ],
      duringHarvest: [
        '☐ Ensure all workers wash hands before starting',
        '☐ Use clean, sanitized harvest containers',
        '☐ Do not harvest damaged or diseased produce',
        '☐ Keep harvested produce shaded and off ground'
      ],
      postHarvest: [
        '☐ Transfer to cooler within 1 hour of harvest',
        '☐ Record harvest lot, date, field, and quantity',
        '☐ Verify cooler temperature (target: 34-38°F)',
        '☐ Sanitize all harvest equipment before storage'
      ]
    };

    // Add crop-specific items
    if (cropCategory === 'leafyGreens') {
      checklist.duringHarvest.push('☐ Harvest dry foliage when possible (reduces bacterial spread)');
      checklist.postHarvest.push('☐ Consider ice-water dunk for rapid cooling');
      checklist.postHarvest.push('☐ Target cooler humidity 95%+ for leafy greens');
    } else if (cropCategory === 'fruiting') {
      checklist.duringHarvest.push('☐ Handle gently to prevent bruising (entry point for pathogens)');
      checklist.duringHarvest.push('☐ Sort out damaged fruit in field - do not box');
    } else if (cropCategory === 'roots') {
      checklist.preHarvest.push('☐ Verify soil was not flooded in last 14 days');
      checklist.duringHarvest.push('☐ Minimize soil contact with edible portion during harvest');
      checklist.postHarvest.push('☐ Do not wash until ready to sell (extends storage)');
    }

    // Add weather-based warnings
    const weatherWarnings = [];
    if (contamRisk.success && contamRisk.risks.length > 0) {
      contamRisk.risks.forEach(risk => {
        weatherWarnings.push({
          type: risk.type,
          severity: risk.severity,
          message: risk.message,
          guidance: risk.guidance
        });
      });
    }

    return {
      success: true,
      crop: crop,
      cropCategory: cropCategory,
      date: today.toISOString().split('T')[0],
      checklist: checklist,
      weatherWarnings: weatherWarnings,
      criticalAlerts: contamRisk.criticalCount || 0,
      overallRisk: contamRisk.overallRisk || 'LOW',
      traceabilityReminder: 'RECORD: Harvest date, field/bed, lot number, quantity, worker(s), destination. Required for recall response.',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getHarvestFoodSafetyGuidance error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATED SMART RECOMMENDATION WITH FOOD SAFETY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get smart planting recommendation with integrated food safety
 * Wraps the succession planner with food safety context
 *
 * @param {Object} params - { crop, targetHarvestStart, targetHarvestEnd, overlapFactor }
 * @returns {Object} Succession plan with embedded food safety guidance
 */
function getSmartPlanWithFoodSafety(params) {
  try {
    // Generate base succession plan (from SmartSuccessionPlanner.js)
    // If function exists, call it; otherwise provide basic response
    let successionPlan;
    if (typeof generateSmartSuccessionPlan === 'function') {
      successionPlan = generateSmartSuccessionPlan(params);
    } else {
      return {
        success: false,
        error: 'SmartSuccessionPlanner not loaded. Ensure SmartSuccessionPlanner.js is deployed.'
      };
    }

    if (!successionPlan.success) {
      return successionPlan;
    }

    // Enhance each lot with food safety guidance
    successionPlan.schedule = successionPlan.schedule.map(lot => {
      const harvestDate = new Date(lot.targetHarvest);

      // Calculate last spray date for common sprays
      const sprayDeadlines = {};
      ['Bt (Bacillus thuringiensis)', 'Spinosad', 'Copper (Kocide 3000-O)'].forEach(spray => {
        const sprayData = OMRI_SPRAY_DATABASE[spray];
        if (sprayData) {
          const deadline = new Date(harvestDate.getTime() - sprayData.phi * 24 * 60 * 60 * 1000);
          sprayDeadlines[spray] = {
            lastSprayDate: deadline.toISOString().split('T')[0],
            phi: sprayData.phi,
            reiHours: sprayData.reiHours
          };
        }
      });

      return {
        ...lot,
        foodSafety: {
          sprayDeadlines: sprayDeadlines,
          preHarvestReminders: [
            `Check PHI compliance 7 days before harvest (${new Date(harvestDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]})`,
            'Scout for contamination risk day before harvest',
            'Verify lot traceability documentation ready'
          ],
          traceabilityFields: ['Field', 'Bed', 'Lot Number', 'Plant Date', 'Harvest Date', 'Spray Applications', 'Worker(s)']
        }
      };
    });

    // Add overall food safety summary
    successionPlan.foodSafetySummary = {
      fsmaCompliance: 'Ensure workers have completed PSA food safety training',
      recordKeeping: 'Maintain records for 2 years (3 years for qualified exempt farms)',
      recallReadiness: 'Each lot must be traceable from seed to customer within 24 hours',
      keyDates: {
        waterAssessmentDue: 'Annual - before growing season',
        workerTrainingRefresh: 'Annual refresher recommended'
      }
    };

    return successionPlan;

  } catch (error) {
    Logger.log('getSmartPlanWithFoodSafety error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API ENDPOINTS & TEST FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test spray guidance
 */
function testSprayGuidance() {
  const result = getSprayGuidance({
    spray: 'Spinosad',
    crop: 'Lettuce',
    harvestDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 5 days from now
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test contamination risk
 */
function testContaminationRisk() {
  const result = getContaminationRiskAssessment({});
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Test harvest guidance
 */
function testHarvestGuidance() {
  const result = getHarvestFoodSafetyGuidance({ crop: 'Spinach' });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Get all OMRI spray data
 */
function getOMRISprayDatabase() {
  return {
    success: true,
    sprays: Object.entries(OMRI_SPRAY_DATABASE).map(([name, data]) => ({
      name: name,
      ...data
    })),
    generatedAt: new Date().toISOString()
  };
}
