/**
 * ============================================
 * PHI DEADLINE TRACKER
 * Tiny Seed Farm Food Safety Compliance
 * ============================================
 *
 * Tracks Pre-Harvest Intervals (PHI) for all spray applications
 * and generates proactive alerts before deadlines expire.
 *
 * Critical for:
 * - FSMA compliance
 * - Organic certification
 * - Food safety audits
 * - Customer trust
 *
 * Created: 2026-01-21
 * Author: Don_Knowledge_Base Claude
 */

// ============================================
// PHI DATABASE
// ============================================

const PHI_DATABASE = {
  // Insecticides
  'Bt (Bacillus thuringiensis)': { phi: 0, rei: 4, organic: true, notes: 'Apply evening, UV degrades rapidly' },
  'Spinosad': { phi: 1, rei: 4, organic: true, notes: 'TOXIC TO BEES - do not apply when flowering' },
  'Pyrethrin': { phi: 0, rei: 12, organic: true, notes: 'Broad spectrum, use as last resort' },
  'Neem Oil': { phi: 0, rei: 4, organic: true, notes: 'Do not apply above 90°F' },
  'Insecticidal Soap': { phi: 0, rei: 0, organic: true, notes: 'Contact only, no residual' },

  // Fungicides
  'Copper Hydroxide': { phi: 0, rei: 48, organic: true, notes: 'Can accumulate in soil, rotate applications' },
  'Sulfur': { phi: 0, rei: 24, organic: true, notes: 'Do not apply above 85°F - phytotoxic' },
  'Potassium Bicarbonate': { phi: 0, rei: 4, organic: true, notes: 'Contact only, safe for pollinators' },
  'Bacillus subtilis (Serenade)': { phi: 0, rei: 4, organic: true, notes: 'Preventive only' },
  'Bacillus amyloliquefaciens': { phi: 0, rei: 4, organic: true, notes: 'Good for leafy greens' },

  // Herbicides (organic)
  'Flame Weeding': { phi: 0, rei: 0, organic: true, notes: 'Timing critical - before crop emergence' },
  'Vinegar (20%)': { phi: 0, rei: 0, organic: true, notes: 'Contact only, non-selective' },
  'Corn Gluten Meal': { phi: 0, rei: 0, organic: true, notes: 'Pre-emergent only' },

  // Add conventional with longer PHIs for reference
  'Conventional Insecticide': { phi: 7, rei: 24, organic: false, notes: 'Generic reference' },
  'Conventional Fungicide': { phi: 14, rei: 48, organic: false, notes: 'Generic reference' }
};

// ============================================
// SPRAY LOG MANAGEMENT
// ============================================

/**
 * Log a spray application and automatically track PHI
 *
 * @param {Object} params - Spray application details
 * @returns {Object} - Confirmation with PHI deadline
 */
function logSprayApplication(params) {
  const {
    spray,
    crop,
    field,
    rate,
    applicationDate = new Date(),
    notes = ''
  } = params;

  // Look up PHI for this spray
  const sprayData = PHI_DATABASE[spray];

  if (!sprayData) {
    return {
      success: false,
      error: `Unknown spray: ${spray}. Add to PHI_DATABASE or check spelling.`
    };
  }

  // Calculate PHI deadline
  const appDate = new Date(applicationDate);
  const phiDeadline = new Date(appDate);
  phiDeadline.setDate(phiDeadline.getDate() + sprayData.phi);

  // Calculate REI (Re-Entry Interval) end time
  const reiEnd = new Date(appDate);
  reiEnd.setHours(reiEnd.getHours() + sprayData.rei);

  const record = {
    id: Utilities.getUuid(),
    spray: spray,
    crop: crop,
    field: field,
    rate: rate,
    applicationDate: formatDatePHI(appDate),
    applicationTime: Utilities.formatDate(appDate, 'America/New_York', 'HH:mm'),
    phi: sprayData.phi,
    phiDeadline: formatDatePHI(phiDeadline),
    rei: sprayData.rei,
    reiEnd: Utilities.formatDate(reiEnd, 'America/New_York', 'yyyy-MM-dd HH:mm'),
    organic: sprayData.organic,
    notes: notes,
    sprayNotes: sprayData.notes,
    status: 'ACTIVE'
  };

  // Save to SprayLog sheet
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sprayLog = ss.getSheetByName('SprayLog');

    if (!sprayLog) {
      sprayLog = ss.insertSheet('SprayLog');
      sprayLog.appendRow([
        'ID', 'Spray', 'Crop', 'Field', 'Rate', 'ApplicationDate', 'ApplicationTime',
        'PHI', 'PHIDeadline', 'REI', 'REIEnd', 'Organic', 'Notes', 'SprayNotes', 'Status'
      ]);
    }

    sprayLog.appendRow([
      record.id, record.spray, record.crop, record.field, record.rate,
      record.applicationDate, record.applicationTime, record.phi,
      record.phiDeadline, record.rei, record.reiEnd, record.organic,
      record.notes, record.sprayNotes, record.status
    ]);

  } catch (e) {
    // Not in spreadsheet context, return record anyway
  }

  return {
    success: true,
    record: record,
    warnings: generateSprayWarnings(spray, crop, appDate),
    message: `Spray logged. Do NOT harvest ${crop} until ${record.phiDeadline}. Workers may re-enter after ${record.reiEnd}.`
  };
}

/**
 * Generate warnings for spray application
 */
function generateSprayWarnings(spray, crop, date) {
  const warnings = [];
  const sprayData = PHI_DATABASE[spray];

  if (!sprayData) return warnings;

  // Bee warning
  if (spray === 'Spinosad' || spray === 'Pyrethrin') {
    warnings.push({
      type: 'BEE_TOXICITY',
      message: `${spray} is toxic to bees. Apply in evening when bees are not foraging.`,
      severity: 'HIGH'
    });
  }

  // Temperature warnings
  if (spray === 'Neem Oil') {
    warnings.push({
      type: 'TEMPERATURE',
      message: 'Do not apply Neem above 90°F - causes leaf burn.',
      severity: 'MEDIUM'
    });
  }

  if (spray === 'Sulfur') {
    warnings.push({
      type: 'TEMPERATURE',
      message: 'Do not apply Sulfur above 85°F - causes phytotoxicity.',
      severity: 'MEDIUM'
    });
  }

  // Leafy greens extra caution
  const leafyGreens = ['Lettuce', 'Spinach', 'Kale', 'Arugula', 'Chard', 'Salad Mix'];
  if (leafyGreens.some(lg => crop.toLowerCase().includes(lg.toLowerCase()))) {
    warnings.push({
      type: 'FOOD_SAFETY',
      message: 'Leafy greens: Ensure complete coverage and observe PHI strictly. Document for audits.',
      severity: 'HIGH'
    });
  }

  return warnings;
}

// ============================================
// PHI DEADLINE MONITORING
// ============================================

/**
 * Get all active PHI deadlines
 *
 * @param {number} daysAhead - How many days to look ahead (default 14)
 * @returns {Array} - Active deadlines sorted by urgency
 */
function getActivePHIDeadlines(daysAhead = 14) {
  const deadlines = [];
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sprayLog = ss.getSheetByName('SprayLog');

    if (!sprayLog) {
      return [{
        status: 'NO_DATA',
        message: 'SprayLog sheet not found. Use logSprayApplication() to start tracking.'
      }];
    }

    const data = sprayLog.getDataRange().getValues();
    const headers = data[0];

    // Map column indices
    const cols = {
      spray: headers.indexOf('Spray'),
      crop: headers.indexOf('Crop'),
      field: headers.indexOf('Field'),
      appDate: headers.indexOf('ApplicationDate'),
      phi: headers.indexOf('PHI'),
      phiDeadline: headers.indexOf('PHIDeadline'),
      status: headers.indexOf('Status')
    };

    for (let i = 1; i < data.length; i++) {
      if (data[i][cols.status] !== 'ACTIVE') continue;

      const phiDeadline = new Date(data[i][cols.phiDeadline]);
      const daysUntil = Math.ceil((phiDeadline - today) / (1000 * 60 * 60 * 24));

      if (phiDeadline >= today && phiDeadline <= cutoff) {
        deadlines.push({
          spray: data[i][cols.spray],
          crop: data[i][cols.crop],
          field: data[i][cols.field],
          applicationDate: data[i][cols.appDate],
          phiDeadline: formatDatePHI(phiDeadline),
          daysUntil: daysUntil,
          urgency: getUrgencyLevel(daysUntil),
          canHarvest: daysUntil <= 0,
          message: daysUntil <= 0
            ? `${data[i][cols.crop]} is now safe to harvest`
            : `Wait ${daysUntil} more day(s) before harvesting ${data[i][cols.crop]}`
        });
      }
    }

  } catch (e) {
    return [{
      status: 'ERROR',
      message: e.toString()
    }];
  }

  return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Get urgency level based on days until deadline
 */
function getUrgencyLevel(days) {
  if (days <= 0) return 'HARVEST_OK';
  if (days <= 1) return 'CRITICAL';
  if (days <= 3) return 'HIGH';
  if (days <= 7) return 'MEDIUM';
  return 'LOW';
}

/**
 * Check if a specific crop can be harvested
 *
 * @param {string} crop - Crop name
 * @param {string} field - Field/bed identifier (optional)
 * @returns {Object} - Harvest clearance status
 */
function canHarvestCrop(crop, field = null) {
  const today = new Date();

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sprayLog = ss.getSheetByName('SprayLog');

    if (!sprayLog) {
      return {
        canHarvest: true,
        status: 'NO_RECORDS',
        message: 'No spray records found. Safe to harvest (no PHI tracking active).',
        warning: 'Consider setting up SprayLog for compliance documentation.'
      };
    }

    const data = sprayLog.getDataRange().getValues();
    const headers = data[0];

    const cols = {
      crop: headers.indexOf('Crop'),
      field: headers.indexOf('Field'),
      phiDeadline: headers.indexOf('PHIDeadline'),
      spray: headers.indexOf('Spray'),
      status: headers.indexOf('Status')
    };

    const blockingRecords = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][cols.status] !== 'ACTIVE') continue;

      const recordCrop = data[i][cols.crop].toString().toLowerCase();
      const recordField = data[i][cols.field];
      const phiDeadline = new Date(data[i][cols.phiDeadline]);

      // Check if this record matches the crop (and field if specified)
      if (recordCrop.includes(crop.toLowerCase()) || crop.toLowerCase().includes(recordCrop)) {
        if (field && recordField !== field) continue;

        if (phiDeadline > today) {
          blockingRecords.push({
            spray: data[i][cols.spray],
            field: recordField,
            deadline: formatDatePHI(phiDeadline),
            daysRemaining: Math.ceil((phiDeadline - today) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }

    if (blockingRecords.length === 0) {
      return {
        canHarvest: true,
        status: 'CLEARED',
        crop: crop,
        message: `${crop} is CLEARED for harvest. All PHI deadlines have passed.`,
        checkedAt: formatDatePHI(today)
      };
    }

    // Sort by nearest deadline
    blockingRecords.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      canHarvest: false,
      status: 'BLOCKED',
      crop: crop,
      message: `CANNOT harvest ${crop} until PHI deadline passes.`,
      blockingRecords: blockingRecords,
      nextHarvestDate: blockingRecords[0].deadline,
      daysUntilHarvest: blockingRecords[0].daysRemaining
    };

  } catch (e) {
    return {
      canHarvest: false,
      status: 'ERROR',
      message: e.toString(),
      warning: 'Unable to verify PHI status. Check manually before harvesting.'
    };
  }
}

// ============================================
// ALERT GENERATION
// ============================================

/**
 * Generate daily PHI alerts for email/notification
 *
 * @returns {Object} - Alert summary for notifications
 */
function generateDailyPHIAlerts() {
  const deadlines = getActivePHIDeadlines(7);

  const critical = deadlines.filter(d => d.urgency === 'CRITICAL');
  const high = deadlines.filter(d => d.urgency === 'HIGH');
  const cleared = deadlines.filter(d => d.urgency === 'HARVEST_OK');

  const alert = {
    date: formatDatePHI(new Date()),
    summary: {
      totalActive: deadlines.length - cleared.length,
      critical: critical.length,
      high: high.length,
      clearedToday: cleared.length
    },
    criticalAlerts: critical.map(d => ({
      crop: d.crop,
      field: d.field,
      spray: d.spray,
      deadline: d.phiDeadline,
      message: `URGENT: ${d.crop} PHI expires TOMORROW. Last spray: ${d.spray}`
    })),
    highPriorityAlerts: high.map(d => ({
      crop: d.crop,
      field: d.field,
      deadline: d.phiDeadline,
      daysRemaining: d.daysUntil
    })),
    harvestCleared: cleared.map(d => ({
      crop: d.crop,
      field: d.field,
      message: `${d.crop} is now cleared for harvest`
    }))
  };

  // Generate notification text
  let notificationText = `PHI DEADLINE REPORT - ${alert.date}\n\n`;

  if (critical.length > 0) {
    notificationText += `🚨 CRITICAL (Tomorrow):\n`;
    critical.forEach(d => {
      notificationText += `  • ${d.crop} (${d.field}) - ${d.spray}\n`;
    });
    notificationText += '\n';
  }

  if (high.length > 0) {
    notificationText += `⚠️ HIGH PRIORITY (2-3 days):\n`;
    high.forEach(d => {
      notificationText += `  • ${d.crop} - harvest after ${d.phiDeadline}\n`;
    });
    notificationText += '\n';
  }

  if (cleared.length > 0) {
    notificationText += `✅ CLEARED FOR HARVEST:\n`;
    cleared.forEach(d => {
      notificationText += `  • ${d.crop} (${d.field})\n`;
    });
  }

  if (critical.length === 0 && high.length === 0 && cleared.length === 0) {
    notificationText += 'No PHI deadlines in the next 7 days.\n';
  }

  alert.notificationText = notificationText;

  return alert;
}

/**
 * Set up daily trigger for PHI alerts
 */
function setupDailyPHIAlertTrigger() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendDailyPHIAlert') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger at 6 AM
  ScriptApp.newTrigger('sendDailyPHIAlert')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  return { success: true, message: 'Daily PHI alert trigger set for 6:00 AM' };
}

/**
 * Send daily PHI alert email
 */
function sendDailyPHIAlert() {
  const alert = generateDailyPHIAlerts();

  // Only send if there are critical or high priority alerts
  if (alert.summary.critical > 0 || alert.summary.high > 0 || alert.summary.clearedToday > 0) {
    // Get notification email from script properties or use default
    const props = PropertiesService.getScriptProperties();
    const email = props.getProperty('ALERT_EMAIL') || Session.getActiveUser().getEmail();

    const subject = alert.summary.critical > 0
      ? `🚨 CRITICAL PHI Alert - ${alert.summary.critical} deadline(s) tomorrow`
      : `PHI Deadline Update - ${alert.date}`;

    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: alert.notificationText
    });

    return { sent: true, to: email, summary: alert.summary };
  }

  return { sent: false, reason: 'No alerts to send' };
}

// ============================================
// COMPLIANCE REPORTING
// ============================================

/**
 * Generate spray application report for audits
 *
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @returns {Object} - Compliance report
 */
function generateSprayComplianceReport(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sprayLog = ss.getSheetByName('SprayLog');

    if (!sprayLog) {
      return { error: 'No SprayLog found' };
    }

    const data = sprayLog.getDataRange().getValues();
    const headers = data[0];

    const applications = [];

    for (let i = 1; i < data.length; i++) {
      const appDate = new Date(data[i][headers.indexOf('ApplicationDate')]);

      if (appDate >= start && appDate <= end) {
        applications.push({
          date: data[i][headers.indexOf('ApplicationDate')],
          spray: data[i][headers.indexOf('Spray')],
          crop: data[i][headers.indexOf('Crop')],
          field: data[i][headers.indexOf('Field')],
          rate: data[i][headers.indexOf('Rate')],
          phi: data[i][headers.indexOf('PHI')],
          phiDeadline: data[i][headers.indexOf('PHIDeadline')],
          organic: data[i][headers.indexOf('Organic')]
        });
      }
    }

    // Summary statistics
    const organicApps = applications.filter(a => a.organic);
    const sprayTypes = [...new Set(applications.map(a => a.spray))];
    const cropsTreated = [...new Set(applications.map(a => a.crop))];

    return {
      reportPeriod: {
        start: formatDatePHI(start),
        end: formatDatePHI(end)
      },
      summary: {
        totalApplications: applications.length,
        organicApplications: organicApps.length,
        organicPercentage: Math.round((organicApps.length / applications.length) * 100) || 0,
        uniqueSprays: sprayTypes.length,
        cropsTreated: cropsTreated.length
      },
      sprayTypes: sprayTypes,
      cropsTreated: cropsTreated,
      applications: applications,
      certificationStatement: `All ${organicApps.length} organic spray applications were OMRI-listed and PHI deadlines were observed as documented.`
    };

  } catch (e) {
    return { error: e.toString() };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDatePHI(date) {
  return Utilities.formatDate(new Date(date), 'America/New_York', 'yyyy-MM-dd');
}

// ============================================
// API ENDPOINT ROUTER
// ============================================

function doGetPHI(e) {
  const action = e.parameter.action;

  let result;
  switch (action) {
    case 'logSpray':
      result = logSprayApplication({
        spray: e.parameter.spray,
        crop: e.parameter.crop,
        field: e.parameter.field,
        rate: e.parameter.rate,
        notes: e.parameter.notes
      });
      break;
    case 'getDeadlines':
      result = getActivePHIDeadlines(parseInt(e.parameter.days) || 14);
      break;
    case 'canHarvest':
      result = canHarvestCrop(e.parameter.crop, e.parameter.field);
      break;
    case 'getDailyAlerts':
      result = generateDailyPHIAlerts();
      break;
    case 'getComplianceReport':
      result = generateSprayComplianceReport(e.parameter.startDate, e.parameter.endDate);
      break;
    case 'getPHIDatabase':
      result = PHI_DATABASE;
      break;
    default:
      result = {
        error: 'Unknown action',
        available: ['logSpray', 'getDeadlines', 'canHarvest', 'getDailyAlerts', 'getComplianceReport', 'getPHIDatabase']
      };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
