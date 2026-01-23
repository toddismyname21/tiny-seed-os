/**
 * SMART LABOR INTELLIGENCE SYSTEM
 * Tiny Seed Farm OS
 *
 * Prescriptive analytics engine that tells employees what to do,
 * tracks speed standards, monitors efficiency, and learns over time.
 *
 * Features:
 * - Speed standard/benchmark management
 * - Daily work order (prescription) generation
 * - End time check-in and tracking
 * - Efficiency alerts and coaching
 * - Employee communication
 * - Learning loop for continuous improvement
 *
 * Created: 2026-01-22
 * Based on: SMART_LABOR_INTELLIGENCE.md spec
 */

// ============================================================
// CONFIGURATION & CONSTANTS
// ============================================================

const LABOR_CONFIG = {
  // Default benchmarks by task type (minutes)
  // Based on UC Davis, Purdue, UMass Extension research
  DEFAULT_BENCHMARKS: {
    sow: 20,
    seed: 20,
    transplant: 30,
    harvest: 45,
    weed: 40,
    cultivate: 40,
    thin: 25,
    irrigate: 20,
    scout: 15,
    spray: 30,
    wash: 20,
    pack: 25,
    label: 15,
    deliver: 30,
    maintenance: 30,
    setup: 20,
    cleanup: 15,
    travel: 15,
    training: 60,
    admin: 30,
    default: 30
  },

  // Crop-specific harvest benchmarks (hours per acre) - UC Davis data
  HARVEST_HOURS_PER_ACRE: {
    'green onions': 300,
    'bell peppers': 200,
    'strawberries': 200,
    'asparagus': 150,
    'cucumbers': 150,
    'lettuce': 80,
    'tomatoes': 50,
    'kale': 30,
    'carrots': 25,
    'beans': 40,
    'zucchini': 35,
    'herbs': 60,
    'microgreens': 100,
    'flowers': 80,
    default: 50
  },

  // Wage rates by skill level (Cornell/UMass model)
  WAGE_RATES: {
    basic: 15,
    skilled: 20,
    specialist: 25,
    manager: 30
  },

  // Efficiency thresholds
  EFFICIENCY: {
    excellent: 110,    // >110% = faster than benchmark
    good: 95,          // 95-110% = on target
    acceptable: 80,    // 80-95% = slightly slow
    concern: 60,       // 60-80% = needs attention
    critical: 0        // <60% = serious issue
  },

  // Alert thresholds
  ALERTS: {
    overBenchmarkPercent: 125,  // Alert if 25% over time
    laborCostPercentTarget: 38, // USDA benchmark
    idleTimeMinutes: 30,        // Alert if no activity
    efficiencyDropPercent: 15   // Alert if efficiency drops
  },

  // Priority weights for task scoring
  PRIORITY_WEIGHTS: {
    urgency: 0.30,
    impact: 0.25,
    weather: 0.20,
    dependencies: 0.15,
    efficiency: 0.10
  }
};

// ============================================================
// SHEET INITIALIZATION
// ============================================================

/**
 * Initialize all sheets needed for Smart Labor Intelligence
 */
function initializeSmartLaborSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create LABOR_BENCHMARKS sheet
  let benchmarksSheet = ss.getSheetByName('LABOR_BENCHMARKS');
  if (!benchmarksSheet) {
    benchmarksSheet = ss.insertSheet('LABOR_BENCHMARKS');
    benchmarksSheet.appendRow([
      'Benchmark_ID', 'Task_Type', 'Crop', 'Location', 'Minutes_Per_Unit',
      'Unit_Type', 'Skill_Required', 'Notes', 'Source', 'Custom',
      'Created_At', 'Updated_At', 'Created_By'
    ]);
    benchmarksSheet.setFrozenRows(1);

    // Add default benchmarks
    const defaultBenchmarks = Object.entries(LABOR_CONFIG.DEFAULT_BENCHMARKS);
    defaultBenchmarks.forEach(([taskType, minutes]) => {
      benchmarksSheet.appendRow([
        `BM-${taskType.toUpperCase()}`,
        taskType,
        'ALL',
        'ALL',
        minutes,
        'task',
        'basic',
        'Default benchmark',
        'Extension Research',
        false,
        new Date(),
        new Date(),
        'System'
      ]);
    });
  }

  // Create WORK_PRESCRIPTIONS sheet
  let prescriptionsSheet = ss.getSheetByName('WORK_PRESCRIPTIONS');
  if (!prescriptionsSheet) {
    prescriptionsSheet = ss.insertSheet('WORK_PRESCRIPTIONS');
    prescriptionsSheet.appendRow([
      'Prescription_ID', 'Date', 'Employee_ID', 'Employee_Name',
      'Task_Sequence', 'Total_Estimated_Minutes', 'Priority_Score',
      'Weather_Context', 'Reasoning', 'Status', 'Actual_Minutes',
      'Followed', 'Outcome_Score', 'Created_At'
    ]);
    prescriptionsSheet.setFrozenRows(1);
  }

  // Create LABOR_CHECKINS sheet
  let checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');
  if (!checkinsSheet) {
    checkinsSheet = ss.insertSheet('LABOR_CHECKINS');
    checkinsSheet.appendRow([
      'Checkin_ID', 'Employee_ID', 'Employee_Name', 'Task_ID', 'Task_Type',
      'Batch_ID', 'Estimated_End_Time', 'Actual_End_Time', 'Estimated_Minutes',
      'Actual_Minutes', 'Efficiency_Percent', 'On_Time', 'Notes',
      'Alert_Sent', 'Created_At'
    ]);
    checkinsSheet.setFrozenRows(1);
  }

  // Create LABOR_ALERTS sheet
  let alertsSheet = ss.getSheetByName('LABOR_ALERTS');
  if (!alertsSheet) {
    alertsSheet = ss.insertSheet('LABOR_ALERTS');
    alertsSheet.appendRow([
      'Alert_ID', 'Type', 'Employee_ID', 'Employee_Name', 'Task_ID',
      'Message', 'Priority', 'Status', 'Acknowledged_At', 'Acknowledged_By',
      'Action_Taken', 'Created_At'
    ]);
    alertsSheet.setFrozenRows(1);
  }

  // Create LABOR_LEARNING sheet
  let learningSheet = ss.getSheetByName('LABOR_LEARNING');
  if (!learningSheet) {
    learningSheet = ss.insertSheet('LABOR_LEARNING');
    learningSheet.appendRow([
      'Episode_ID', 'Date', 'Employee_ID', 'Task_Type', 'Crop',
      'State_Before', 'Action_Taken', 'Outcome', 'Reward_Score',
      'State_After', 'Lesson_Learned', 'Created_At'
    ]);
    learningSheet.setFrozenRows(1);
  }

  return { success: true, message: 'Smart Labor sheets initialized' };
}

// ============================================================
// BENCHMARK MANAGEMENT
// ============================================================

/**
 * Get benchmark for a specific task
 */
function getBenchmark(taskType, crop = 'ALL', location = 'ALL') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_BENCHMARKS');

  if (!sheet) {
    return {
      minutes: LABOR_CONFIG.DEFAULT_BENCHMARKS[taskType.toLowerCase()] || 30,
      source: 'default'
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Look for specific match first (task + crop + location)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1].toLowerCase() === taskType.toLowerCase() &&
        (row[2] === crop || row[2] === 'ALL') &&
        (row[3] === location || row[3] === 'ALL')) {
      return {
        benchmarkId: row[0],
        minutes: row[4],
        unitType: row[5],
        skillRequired: row[6],
        source: row[9] ? 'custom' : 'default',
        notes: row[7]
      };
    }
  }

  // Fall back to default
  return {
    minutes: LABOR_CONFIG.DEFAULT_BENCHMARKS[taskType.toLowerCase()] || 30,
    source: 'default'
  };
}

/**
 * Set a custom benchmark (admin function)
 */
function setBenchmark(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LABOR_BENCHMARKS');

  if (!sheet) {
    initializeSmartLaborSheets();
    sheet = ss.getSheetByName('LABOR_BENCHMARKS');
  }

  const benchmarkId = `BM-${Date.now()}`;

  sheet.appendRow([
    benchmarkId,
    data.taskType || 'default',
    data.crop || 'ALL',
    data.location || 'ALL',
    data.minutes || 30,
    data.unitType || 'task',
    data.skillRequired || 'basic',
    data.notes || '',
    data.source || 'Admin',
    true, // Custom
    new Date(),
    new Date(),
    data.createdBy || 'Admin'
  ]);

  return {
    success: true,
    benchmarkId: benchmarkId,
    message: `Benchmark set: ${data.taskType} = ${data.minutes} minutes`
  };
}

/**
 * Get all benchmarks for admin display
 */
function getAllBenchmarks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_BENCHMARKS');

  if (!sheet) {
    return { benchmarks: [], defaults: LABOR_CONFIG.DEFAULT_BENCHMARKS };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const benchmarks = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    benchmarks.push({
      benchmarkId: row[0],
      taskType: row[1],
      crop: row[2],
      location: row[3],
      minutes: row[4],
      unitType: row[5],
      skillRequired: row[6],
      notes: row[7],
      source: row[8],
      isCustom: row[9],
      createdAt: row[10],
      updatedAt: row[11]
    });
  }

  return {
    benchmarks: benchmarks,
    defaults: LABOR_CONFIG.DEFAULT_BENCHMARKS,
    wageRates: LABOR_CONFIG.WAGE_RATES
  };
}

/**
 * Update an existing benchmark
 */
function updateBenchmark(benchmarkId, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_BENCHMARKS');

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === benchmarkId) {
      if (updates.minutes) sheet.getRange(i + 1, 5).setValue(updates.minutes);
      if (updates.notes) sheet.getRange(i + 1, 8).setValue(updates.notes);
      sheet.getRange(i + 1, 12).setValue(new Date()); // Updated_At
      sheet.getRange(i + 1, 10).setValue(true); // Mark as custom

      return { success: true, message: 'Benchmark updated' };
    }
  }

  return { success: false, error: 'Benchmark not found' };
}

// ============================================================
// DAILY PRESCRIPTION GENERATION
// ============================================================

/**
 * Generate daily work prescription for an employee
 * This tells them exactly what to do and in what order
 */
function generateDailyPrescription(employeeId, date = new Date()) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get employee info
  const employee = getEmployeeInfo(employeeId);
  if (!employee) {
    return { success: false, error: 'Employee not found' };
  }

  // Get weather context
  const weather = getWeatherContext(date);

  // Get all available tasks for today
  const availableTasks = getAvailableTasksForDate(date, employeeId);

  // Score and prioritize tasks
  const prioritizedTasks = availableTasks.map(task => ({
    ...task,
    priorityScore: calculateTaskPriority(task, weather, employee),
    reasoning: generateTaskReasoning(task, weather)
  })).sort((a, b) => b.priorityScore - a.priorityScore);

  // Select tasks that fit within available hours
  const workHours = employee.hoursToday || 8;
  const workMinutes = workHours * 60;
  let allocatedMinutes = 0;
  const assignedTasks = [];

  for (const task of prioritizedTasks) {
    const benchmark = getBenchmark(task.taskType, task.crop, task.location);
    const estimatedMinutes = benchmark.minutes * (task.quantity || 1);

    if (allocatedMinutes + estimatedMinutes <= workMinutes * 0.9) { // 90% capacity
      assignedTasks.push({
        ...task,
        estimatedMinutes: estimatedMinutes,
        benchmark: benchmark
      });
      allocatedMinutes += estimatedMinutes;
    }
  }

  // Optimize sequence (group by location, prioritize time-sensitive)
  const optimizedSequence = optimizeTaskSequence(assignedTasks);

  // Create prescription record
  const prescriptionId = `RX-${Date.now()}`;
  const prescriptionSheet = ss.getSheetByName('WORK_PRESCRIPTIONS');

  if (prescriptionSheet) {
    prescriptionSheet.appendRow([
      prescriptionId,
      date,
      employeeId,
      employee.name,
      JSON.stringify(optimizedSequence.map(t => ({
        taskId: t.taskId,
        taskType: t.taskType,
        crop: t.crop,
        location: t.location,
        estimatedMinutes: t.estimatedMinutes,
        priority: t.priorityScore,
        reasoning: t.reasoning
      }))),
      allocatedMinutes,
      optimizedSequence.reduce((sum, t) => sum + t.priorityScore, 0) / optimizedSequence.length,
      JSON.stringify(weather),
      generateOverallReasoning(optimizedSequence, weather),
      'pending',
      null,
      null,
      null,
      new Date()
    ]);
  }

  return {
    success: true,
    prescriptionId: prescriptionId,
    date: date,
    employee: {
      id: employeeId,
      name: employee.name,
      hoursToday: workHours
    },
    weather: weather,
    tasks: optimizedSequence,
    totalEstimatedMinutes: allocatedMinutes,
    summary: generatePrescriptionSummary(optimizedSequence, weather),
    unassignedCount: prioritizedTasks.length - assignedTasks.length
  };
}

/**
 * Get prescription for employee (employee-facing)
 */
function getMyWorkOrder(employeeId, date = new Date()) {
  const dateStr = Utilities.formatDate(date, 'America/New_York', 'yyyy-MM-dd');

  // Check for existing prescription
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('WORK_PRESCRIPTIONS');

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      const rowDate = Utilities.formatDate(new Date(row[1]), 'America/New_York', 'yyyy-MM-dd');
      if (row[2] === employeeId && rowDate === dateStr && row[9] !== 'completed') {
        return {
          success: true,
          prescriptionId: row[0],
          date: row[1],
          tasks: JSON.parse(row[4] || '[]'),
          totalEstimatedMinutes: row[5],
          weather: JSON.parse(row[7] || '{}'),
          reasoning: row[8],
          status: row[9]
        };
      }
    }
  }

  // Generate new prescription if none exists
  return generateDailyPrescription(employeeId, date);
}

/**
 * Calculate priority score for a task
 */
function calculateTaskPriority(task, weather, employee) {
  let score = 50; // Base score

  // Urgency (time sensitivity)
  if (task.dueDate) {
    const daysUntilDue = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue <= 0) score += 40; // Overdue
    else if (daysUntilDue <= 1) score += 30; // Due today
    else if (daysUntilDue <= 3) score += 15; // Due soon
  }

  // Weather factors
  if (weather) {
    if (weather.rainIn24h && task.taskType === 'harvest') score += 25;
    if (weather.rainIn24h && task.taskType === 'spray') score -= 50;
    if (weather.frostWarning && task.taskType === 'harvest') score += 40;
    if (weather.heatWave && task.taskType === 'irrigate') score += 30;
  }

  // Crop value
  if (task.cropValue === 'high') score += 15;
  if (task.cropValue === 'premium') score += 25;

  // Customer commitments
  if (task.isCSA) score += 20;
  if (task.isWholesale) score += 15;

  // Overripe/quality risk
  if (task.daysToOverripe && task.daysToOverripe <= 2) score += 35;

  // Employee skill match
  const skillMatch = employee.skills?.includes(task.taskType);
  if (skillMatch) score += 10;

  // Location efficiency (same field as last task)
  if (task.sameLocationAsLast) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate reasoning text for why this task is prioritized
 */
function generateTaskReasoning(task, weather) {
  const reasons = [];

  if (weather?.rainIn24h && task.taskType === 'harvest') {
    reasons.push('Harvest before rain arrives');
  }
  if (weather?.frostWarning) {
    reasons.push('Frost warning - protect/harvest tender crops');
  }
  if (task.daysToOverripe && task.daysToOverripe <= 2) {
    reasons.push(`Only ${task.daysToOverripe} days until quality drops`);
  }
  if (task.isCSA) {
    reasons.push('Required for CSA boxes');
  }
  if (task.isWholesale) {
    reasons.push('Customer order commitment');
  }
  if (task.dueDate && new Date(task.dueDate) <= new Date()) {
    reasons.push('Task is overdue');
  }

  return reasons.length > 0 ? reasons.join('. ') : 'Scheduled task';
}

/**
 * Optimize task sequence for efficiency
 */
function optimizeTaskSequence(tasks) {
  // Group by location first
  const byLocation = {};
  tasks.forEach(task => {
    const loc = task.location || 'other';
    if (!byLocation[loc]) byLocation[loc] = [];
    byLocation[loc].push(task);
  });

  // Sort each group by priority
  Object.keys(byLocation).forEach(loc => {
    byLocation[loc].sort((a, b) => b.priorityScore - a.priorityScore);
  });

  // Flatten with location grouping
  // Start with highest priority location group
  const locationGroups = Object.entries(byLocation)
    .map(([loc, tasks]) => ({
      location: loc,
      tasks: tasks,
      maxPriority: Math.max(...tasks.map(t => t.priorityScore))
    }))
    .sort((a, b) => b.maxPriority - a.maxPriority);

  const optimized = [];
  let sequence = 1;

  locationGroups.forEach(group => {
    group.tasks.forEach(task => {
      optimized.push({
        ...task,
        sequence: sequence++
      });
    });
  });

  return optimized;
}

/**
 * Generate overall reasoning summary
 */
function generateOverallReasoning(tasks, weather) {
  const reasons = [];

  if (weather?.rainIn24h) {
    reasons.push('Rain expected - prioritizing outdoor harvests and avoiding sprays');
  }
  if (weather?.frostWarning) {
    reasons.push('Frost warning - tender crops protected/harvested first');
  }
  if (weather?.heatWave) {
    reasons.push('Heat wave - irrigation prioritized, early morning harvest');
  }

  const criticalCount = tasks.filter(t => t.priorityScore > 80).length;
  if (criticalCount > 0) {
    reasons.push(`${criticalCount} critical tasks require immediate attention`);
  }

  return reasons.join('. ') || 'Standard work day - tasks ordered by priority and location efficiency';
}

/**
 * Generate human-readable summary
 */
function generatePrescriptionSummary(tasks, weather) {
  const byType = {};
  tasks.forEach(t => {
    byType[t.taskType] = (byType[t.taskType] || 0) + 1;
  });

  const typeList = Object.entries(byType)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  let summary = `Today: ${typeList}`;

  if (weather?.condition) {
    summary += ` | Weather: ${weather.condition}`;
  }

  return summary;
}

// ============================================================
// CHECK-IN SYSTEM
// ============================================================

/**
 * Employee checks in when starting a task with estimated end time
 */
function checkInTask(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LABOR_CHECKINS');

  if (!sheet) {
    initializeSmartLaborSheets();
    sheet = ss.getSheetByName('LABOR_CHECKINS');
  }

  const checkinId = `CHK-${Date.now()}`;
  const benchmark = getBenchmark(data.taskType, data.crop, data.location);
  const estimatedMinutes = data.estimatedMinutes || benchmark.minutes;

  const now = new Date();
  const estimatedEnd = new Date(now.getTime() + estimatedMinutes * 60000);

  sheet.appendRow([
    checkinId,
    data.employeeId,
    data.employeeName || '',
    data.taskId || '',
    data.taskType,
    data.batchId || '',
    estimatedEnd,
    null, // Actual end (filled on checkout)
    estimatedMinutes,
    null, // Actual minutes (filled on checkout)
    null, // Efficiency (filled on checkout)
    null, // On time (filled on checkout)
    data.notes || '',
    false,
    now
  ]);

  return {
    success: true,
    checkinId: checkinId,
    estimatedEndTime: estimatedEnd,
    estimatedMinutes: estimatedMinutes,
    benchmark: benchmark.minutes,
    message: `Checked in. Expected completion: ${Utilities.formatDate(estimatedEnd, 'America/New_York', 'h:mm a')}`
  };
}

/**
 * Employee checks out when completing a task
 */
function checkOutTask(checkinId, notes = '') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_CHECKINS');

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === checkinId) {
      const now = new Date();
      const startTime = new Date(data[i][14]); // Created_At
      const estimatedEnd = new Date(data[i][6]);
      const estimatedMinutes = data[i][8];

      const actualMinutes = Math.round((now - startTime) / 60000);
      const efficiency = Math.round((estimatedMinutes / actualMinutes) * 100);
      const onTime = now <= estimatedEnd;

      // Update row
      sheet.getRange(i + 1, 8).setValue(now); // Actual end
      sheet.getRange(i + 1, 10).setValue(actualMinutes);
      sheet.getRange(i + 1, 11).setValue(efficiency);
      sheet.getRange(i + 1, 12).setValue(onTime);
      if (notes) sheet.getRange(i + 1, 13).setValue(notes);

      // Check if alert needed
      const alertNeeded = efficiency < LABOR_CONFIG.EFFICIENCY.acceptable;
      if (alertNeeded) {
        createLaborAlert({
          type: 'efficiency_low',
          employeeId: data[i][1],
          employeeName: data[i][2],
          taskId: data[i][3],
          message: `Task completed at ${efficiency}% efficiency (${actualMinutes}min vs ${estimatedMinutes}min expected)`,
          priority: efficiency < LABOR_CONFIG.EFFICIENCY.concern ? 'high' : 'medium'
        });
      }

      // Record learning data
      recordLearning({
        employeeId: data[i][1],
        taskType: data[i][4],
        outcome: efficiency >= 100 ? 'success' : 'slow',
        rewardScore: efficiency >= 100 ? 10 : (efficiency >= 80 ? 5 : -5),
        lesson: efficiency >= 100
          ? 'Task completed efficiently'
          : `Consider reviewing technique for ${data[i][4]}`
      });

      return {
        success: true,
        actualMinutes: actualMinutes,
        estimatedMinutes: estimatedMinutes,
        efficiency: efficiency,
        onTime: onTime,
        feedback: generateEfficiencyFeedback(efficiency, data[i][4])
      };
    }
  }

  return { success: false, error: 'Check-in not found' };
}

/**
 * Get active check-ins for an employee
 */
function getActiveCheckins(employeeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_CHECKINS');

  if (!sheet) return { checkins: [] };

  const data = sheet.getDataRange().getValues();
  const checkins = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === employeeId && !data[i][7]) { // No actual end time = still active
      const estimatedEnd = new Date(data[i][6]);
      const now = new Date();
      const minutesRemaining = Math.round((estimatedEnd - now) / 60000);

      checkins.push({
        checkinId: data[i][0],
        taskId: data[i][3],
        taskType: data[i][4],
        batchId: data[i][5],
        estimatedEndTime: estimatedEnd,
        estimatedMinutes: data[i][8],
        minutesRemaining: minutesRemaining,
        isOvertime: minutesRemaining < 0,
        startedAt: data[i][14]
      });
    }
  }

  return { checkins: checkins };
}

/**
 * Generate efficiency feedback message
 */
function generateEfficiencyFeedback(efficiency, taskType) {
  if (efficiency >= LABOR_CONFIG.EFFICIENCY.excellent) {
    return {
      level: 'excellent',
      message: `Great job! You completed this ${efficiency - 100}% faster than expected.`,
      emoji: '⚡'
    };
  } else if (efficiency >= LABOR_CONFIG.EFFICIENCY.good) {
    return {
      level: 'good',
      message: 'Nice work! Right on target.',
      emoji: '✓'
    };
  } else if (efficiency >= LABOR_CONFIG.EFFICIENCY.acceptable) {
    return {
      level: 'acceptable',
      message: 'Task complete. Slightly over time.',
      emoji: '👍'
    };
  } else if (efficiency >= LABOR_CONFIG.EFFICIENCY.concern) {
    return {
      level: 'concern',
      message: `Took longer than expected. Benchmark for ${taskType} may need review.`,
      emoji: '⏱️'
    };
  } else {
    return {
      level: 'critical',
      message: 'Significantly over time. Please note any issues encountered.',
      emoji: '⚠️'
    };
  }
}

// ============================================================
// ALERTS & COMMUNICATION
// ============================================================

/**
 * Create a labor alert
 */
function createLaborAlert(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LABOR_ALERTS');

  if (!sheet) {
    initializeSmartLaborSheets();
    sheet = ss.getSheetByName('LABOR_ALERTS');
  }

  const alertId = `LA-${Date.now()}`;

  sheet.appendRow([
    alertId,
    data.type,
    data.employeeId,
    data.employeeName || '',
    data.taskId || '',
    data.message,
    data.priority || 'medium',
    'active',
    null,
    null,
    null,
    new Date()
  ]);

  return { success: true, alertId: alertId };
}

/**
 * Get active labor alerts
 */
function getLaborAlerts(filters = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_ALERTS');

  if (!sheet) return { alerts: [] };

  const data = sheet.getDataRange().getValues();
  const alerts = [];

  for (let i = 1; i < data.length; i++) {
    const alert = {
      alertId: data[i][0],
      type: data[i][1],
      employeeId: data[i][2],
      employeeName: data[i][3],
      taskId: data[i][4],
      message: data[i][5],
      priority: data[i][6],
      status: data[i][7],
      acknowledgedAt: data[i][8],
      acknowledgedBy: data[i][9],
      actionTaken: data[i][10],
      createdAt: data[i][11]
    };

    // Apply filters
    if (filters.status && alert.status !== filters.status) continue;
    if (filters.employeeId && alert.employeeId !== filters.employeeId) continue;
    if (filters.priority && alert.priority !== filters.priority) continue;

    alerts.push(alert);
  }

  // Sort by priority and date
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { alerts: alerts };
}

/**
 * Acknowledge a labor alert
 */
function acknowledgeLaborAlert(alertId, acknowledgedBy, actionTaken = '') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_ALERTS');

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === alertId) {
      sheet.getRange(i + 1, 8).setValue('acknowledged');
      sheet.getRange(i + 1, 9).setValue(new Date());
      sheet.getRange(i + 1, 10).setValue(acknowledgedBy);
      if (actionTaken) sheet.getRange(i + 1, 11).setValue(actionTaken);

      return { success: true, message: 'Alert acknowledged' };
    }
  }

  return { success: false, error: 'Alert not found' };
}

/**
 * Send message to employee (via their next prescription)
 */
function sendEmployeeMessage(employeeId, message, priority = 'normal') {
  // Store message to be shown on next prescription load
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('EMPLOYEE_MESSAGES');

  if (!sheet) {
    sheet = ss.insertSheet('EMPLOYEE_MESSAGES');
    sheet.appendRow(['Message_ID', 'Employee_ID', 'Message', 'Priority', 'Read', 'Created_At']);
    sheet.setFrozenRows(1);
  }

  const messageId = `MSG-${Date.now()}`;
  sheet.appendRow([
    messageId,
    employeeId,
    message,
    priority,
    false,
    new Date()
  ]);

  return { success: true, messageId: messageId };
}

/**
 * Get unread messages for employee
 */
function getEmployeeMessages(employeeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('EMPLOYEE_MESSAGES');

  if (!sheet) return { messages: [] };

  const data = sheet.getDataRange().getValues();
  const messages = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === employeeId && !data[i][4]) {
      messages.push({
        messageId: data[i][0],
        message: data[i][2],
        priority: data[i][3],
        createdAt: data[i][5]
      });
    }
  }

  return { messages: messages };
}

/**
 * Mark message as read
 */
function markMessageRead(messageId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('EMPLOYEE_MESSAGES');

  if (!sheet) return { success: false };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === messageId) {
      sheet.getRange(i + 1, 5).setValue(true);
      return { success: true };
    }
  }

  return { success: false };
}

// ============================================================
// LEARNING & IMPROVEMENT
// ============================================================

/**
 * Record a learning episode
 */
function recordLearning(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('LABOR_LEARNING');

  if (!sheet) {
    initializeSmartLaborSheets();
    sheet = ss.getSheetByName('LABOR_LEARNING');
  }

  const episodeId = `LE-${Date.now()}`;

  sheet.appendRow([
    episodeId,
    new Date(),
    data.employeeId,
    data.taskType,
    data.crop || '',
    JSON.stringify(data.stateBefore || {}),
    JSON.stringify(data.actionTaken || {}),
    data.outcome,
    data.rewardScore || 0,
    JSON.stringify(data.stateAfter || {}),
    data.lesson || '',
    new Date()
  ]);

  return { success: true, episodeId: episodeId };
}

/**
 * Get efficiency trends for employee
 */
function getEmployeeEfficiencyTrend(employeeId, days = 30) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_CHECKINS');

  if (!sheet) return { trend: [], average: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const data = sheet.getDataRange().getValues();
  const dataPoints = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === employeeId &&
        data[i][10] && // Has efficiency
        new Date(data[i][14]) >= cutoff) {
      dataPoints.push({
        date: data[i][14],
        taskType: data[i][4],
        efficiency: data[i][10]
      });
    }
  }

  // Calculate trend
  const average = dataPoints.length > 0
    ? Math.round(dataPoints.reduce((sum, d) => sum + d.efficiency, 0) / dataPoints.length)
    : 0;

  // Group by date for trend line
  const byDate = {};
  dataPoints.forEach(d => {
    const dateKey = Utilities.formatDate(new Date(d.date), 'America/New_York', 'yyyy-MM-dd');
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push(d.efficiency);
  });

  const trend = Object.entries(byDate).map(([date, efficiencies]) => ({
    date: date,
    averageEfficiency: Math.round(efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length)
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Determine if improving
  let improving = null;
  if (trend.length >= 7) {
    const recentAvg = trend.slice(-7).reduce((sum, t) => sum + t.averageEfficiency, 0) / 7;
    const olderAvg = trend.slice(0, 7).reduce((sum, t) => sum + t.averageEfficiency, 0) / Math.min(7, trend.length);
    improving = recentAvg > olderAvg;
  }

  return {
    trend: trend,
    average: average,
    improving: improving,
    taskCount: dataPoints.length
  };
}

/**
 * Get benchmark accuracy (how well are our benchmarks?)
 */
function getBenchmarkAccuracy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('LABOR_CHECKINS');

  if (!sheet) return { accuracy: {} };

  const data = sheet.getDataRange().getValues();
  const byTaskType = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][10]) { // Has efficiency
      const taskType = data[i][4];
      if (!byTaskType[taskType]) {
        byTaskType[taskType] = { efficiencies: [], count: 0 };
      }
      byTaskType[taskType].efficiencies.push(data[i][10]);
      byTaskType[taskType].count++;
    }
  }

  const accuracy = {};
  Object.entries(byTaskType).forEach(([taskType, data]) => {
    const avg = data.efficiencies.reduce((a, b) => a + b, 0) / data.count;
    accuracy[taskType] = {
      averageEfficiency: Math.round(avg),
      sampleSize: data.count,
      // If average efficiency is far from 100%, benchmark may need adjustment
      benchmarkAccurate: avg >= 85 && avg <= 115,
      suggestedAdjustment: avg < 85 ? 'increase' : (avg > 115 ? 'decrease' : 'accurate')
    };
  });

  return { accuracy: accuracy };
}

// ============================================================
// LABOR INTELLIGENCE DASHBOARD DATA
// ============================================================

/**
 * Get comprehensive labor intelligence dashboard data
 */
function getLaborIntelligenceDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get today's prescriptions
  const prescriptionsSheet = ss.getSheetByName('WORK_PRESCRIPTIONS');
  let todaysPrescriptions = 0;
  let completedPrescriptions = 0;

  if (prescriptionsSheet) {
    const today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
    const data = prescriptionsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDate = Utilities.formatDate(new Date(data[i][1]), 'America/New_York', 'yyyy-MM-dd');
      if (rowDate === today) {
        todaysPrescriptions++;
        if (data[i][9] === 'completed') completedPrescriptions++;
      }
    }
  }

  // Get active alerts
  const alerts = getLaborAlerts({ status: 'active' });

  // Get today's efficiency
  const checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');
  let todaysEfficiency = [];

  if (checkinsSheet) {
    const today = Utilities.formatDate(new Date(), 'America/New_York', 'yyyy-MM-dd');
    const data = checkinsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const rowDate = Utilities.formatDate(new Date(data[i][14]), 'America/New_York', 'yyyy-MM-dd');
      if (rowDate === today && data[i][10]) {
        todaysEfficiency.push({
          employeeName: data[i][2],
          taskType: data[i][4],
          efficiency: data[i][10]
        });
      }
    }
  }

  const avgEfficiency = todaysEfficiency.length > 0
    ? Math.round(todaysEfficiency.reduce((sum, e) => sum + e.efficiency, 0) / todaysEfficiency.length)
    : null;

  // Get benchmark accuracy
  const benchmarkAccuracy = getBenchmarkAccuracy();

  // Get all employees for prescription generation
  const employees = getAllEmployees();

  return {
    summary: {
      todaysPrescriptions: todaysPrescriptions,
      completedPrescriptions: completedPrescriptions,
      prescriptionCompletion: todaysPrescriptions > 0
        ? Math.round((completedPrescriptions / todaysPrescriptions) * 100)
        : 0,
      averageEfficiency: avgEfficiency,
      activeAlerts: alerts.alerts.length,
      highPriorityAlerts: alerts.alerts.filter(a => a.priority === 'high' || a.priority === 'critical').length
    },
    todaysEfficiency: todaysEfficiency,
    alerts: alerts.alerts.slice(0, 10),
    benchmarkAccuracy: benchmarkAccuracy.accuracy,
    employees: employees,
    recommendations: generateLaborRecommendations(avgEfficiency, alerts.alerts, benchmarkAccuracy.accuracy)
  };
}

/**
 * Generate smart recommendations
 */
function generateLaborRecommendations(avgEfficiency, alerts, benchmarkAccuracy) {
  const recommendations = [];

  // Efficiency-based recommendations
  if (avgEfficiency !== null) {
    if (avgEfficiency < 80) {
      recommendations.push({
        type: 'efficiency',
        priority: 'high',
        title: 'Low Efficiency Alert',
        message: `Today's average efficiency is ${avgEfficiency}%. Review task assignments and check for obstacles.`,
        action: 'Review task allocations'
      });
    } else if (avgEfficiency > 110) {
      recommendations.push({
        type: 'efficiency',
        priority: 'info',
        title: 'Excellent Performance',
        message: `Team is performing ${avgEfficiency - 100}% above benchmark. Consider if benchmarks need updating.`,
        action: 'Review benchmarks'
      });
    }
  }

  // Benchmark accuracy recommendations
  Object.entries(benchmarkAccuracy).forEach(([taskType, data]) => {
    if (!data.benchmarkAccurate && data.sampleSize >= 5) {
      recommendations.push({
        type: 'benchmark',
        priority: 'medium',
        title: `Adjust ${taskType} Benchmark`,
        message: `Average efficiency for ${taskType} is ${data.averageEfficiency}%. Consider ${data.suggestedAdjustment === 'increase' ? 'increasing' : 'decreasing'} the benchmark.`,
        action: `Update ${taskType} benchmark`
      });
    }
  });

  // Alert-based recommendations
  const efficiencyAlerts = alerts.filter(a => a.type === 'efficiency_low');
  if (efficiencyAlerts.length >= 3) {
    recommendations.push({
      type: 'training',
      priority: 'medium',
      title: 'Training Opportunity',
      message: `Multiple efficiency alerts today. Consider team training or technique review.`,
      action: 'Schedule training'
    });
  }

  return recommendations;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get employee info
 */
function getEmployeeInfo(employeeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Employees') || ss.getSheetByName('EMPLOYEES');

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase());

  for (let i = 1; i < data.length; i++) {
    const idIdx = headers.indexOf('employee_id') !== -1 ? headers.indexOf('employee_id') : 0;
    if (data[i][idIdx] === employeeId) {
      const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 1;
      const skillIdx = headers.indexOf('skill_level');
      const rateIdx = headers.indexOf('hourly_rate');

      return {
        id: employeeId,
        name: data[i][nameIdx],
        skillLevel: skillIdx !== -1 ? data[i][skillIdx] : 'basic',
        hourlyRate: rateIdx !== -1 ? data[i][rateIdx] : LABOR_CONFIG.WAGE_RATES.basic,
        hoursToday: 8
      };
    }
  }

  return null;
}

/**
 * Get all employees
 */
function getAllEmployees() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Employees') || ss.getSheetByName('EMPLOYEES');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase());
  const employees = [];

  const idIdx = headers.indexOf('employee_id') !== -1 ? headers.indexOf('employee_id') : 0;
  const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx]) {
      employees.push({
        id: data[i][idIdx],
        name: data[i][nameIdx]
      });
    }
  }

  return employees;
}

/**
 * Get weather context (stub - can integrate with real API)
 */
function getWeatherContext(date) {
  // Try to get from ChiefOfStaff_Integrations if available
  if (typeof getWeatherRecommendations === 'function') {
    try {
      const weather = getWeatherRecommendations();
      return {
        condition: weather.condition || 'clear',
        temperature: weather.temperature || 70,
        rainIn24h: weather.precipitation > 50,
        frostWarning: weather.temperature < 35,
        heatWave: weather.temperature > 90
      };
    } catch (e) {
      // Fall through to default
    }
  }

  // Default weather context
  return {
    condition: 'clear',
    temperature: 65,
    rainIn24h: false,
    frostWarning: false,
    heatWave: false
  };
}

/**
 * Get available tasks for a date
 */
function getAvailableTasksForDate(date, employeeId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tasks = [];

  // Check MASTER_LOG or Tasks sheet
  const masterLog = ss.getSheetByName('MASTER_LOG');
  if (masterLog) {
    const data = masterLog.getDataRange().getValues();
    const headers = data[0].map(h => h.toString().toLowerCase());

    const dateStr = Utilities.formatDate(date, 'America/New_York', 'yyyy-MM-dd');
    const statusIdx = headers.indexOf('status');
    const dateIdx = headers.indexOf('date') !== -1 ? headers.indexOf('date') : headers.indexOf('scheduled_date');
    const assigneeIdx = headers.indexOf('assigned_to') !== -1 ? headers.indexOf('assigned_to') : headers.indexOf('assignee');

    for (let i = 1; i < data.length; i++) {
      const rowDate = data[i][dateIdx] ? Utilities.formatDate(new Date(data[i][dateIdx]), 'America/New_York', 'yyyy-MM-dd') : '';
      const status = statusIdx !== -1 ? data[i][statusIdx] : '';
      const assignee = assigneeIdx !== -1 ? data[i][assigneeIdx] : '';

      if (rowDate === dateStr &&
          status !== 'completed' &&
          status !== 'cancelled' &&
          (!assignee || assignee === employeeId || assignee === 'all')) {
        tasks.push({
          taskId: data[i][0] || `TASK-${i}`,
          taskType: data[i][headers.indexOf('task_type')] || data[i][headers.indexOf('action')] || 'task',
          crop: data[i][headers.indexOf('crop')] || '',
          location: data[i][headers.indexOf('location')] || data[i][headers.indexOf('field')] || '',
          batchId: data[i][headers.indexOf('batch_id')] || '',
          quantity: 1,
          dueDate: data[i][dateIdx],
          notes: data[i][headers.indexOf('notes')] || ''
        });
      }
    }
  }

  // Also check Planning sheet for scheduled work
  const planning = ss.getSheetByName('PLANNING_2026') || ss.getSheetByName('Planning');
  if (planning && tasks.length < 5) {
    // Add scheduled plantings/harvests as tasks
    // This is simplified - would need more logic for real implementation
  }

  return tasks;
}

/**
 * Get morning brief with labor intelligence
 */
function getLaborMorningBrief(employeeId) {
  const prescription = getMyWorkOrder(employeeId);
  const messages = getEmployeeMessages(employeeId);
  const activeCheckins = getActiveCheckins(employeeId);
  const efficiencyTrend = getEmployeeEfficiencyTrend(employeeId, 7);

  return {
    greeting: generateGreeting(employeeId),
    messages: messages.messages,
    prescription: prescription,
    activeCheckins: activeCheckins.checkins,
    weeklyEfficiency: efficiencyTrend.average,
    improving: efficiencyTrend.improving,
    tips: generateDailyTips(efficiencyTrend, prescription)
  };
}

/**
 * Generate personalized greeting
 */
function generateGreeting(employeeId) {
  const employee = getEmployeeInfo(employeeId);
  const hour = new Date().getHours();

  let timeGreeting = 'Hello';
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  return `${timeGreeting}, ${employee?.name || 'team member'}!`;
}

/**
 * Generate daily tips based on performance
 */
function generateDailyTips(efficiencyTrend, prescription) {
  const tips = [];

  if (efficiencyTrend.improving === true) {
    tips.push('Your efficiency is improving - keep up the great work!');
  } else if (efficiencyTrend.improving === false) {
    tips.push('Try timing yourself on familiar tasks to find your rhythm.');
  }

  if (prescription.weather?.rainIn24h) {
    tips.push('Rain expected - prioritize outdoor tasks this morning.');
  }

  if (prescription.weather?.heatWave) {
    tips.push('Stay hydrated! Take breaks in the shade during peak heat.');
  }

  return tips;
}
