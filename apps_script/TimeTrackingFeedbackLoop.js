// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// TIME TRACKING FEEDBACK LOOP SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// Date: 2026-02-03
// Author: Backend_Claude
// Purpose: Track actual vs estimated time and learn from it to improve future estimates
// Integrates with: UNIFIED_TASKS (Estimated_Minutes, Actual_Minutes, Efficiency_Pct), TIMELOG, LABOR_BENCHMARKS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

const TIME_LEARNING_SHEET = 'TIME_LEARNING';
const TIME_LEARNING_HEADERS = [
  'Learning_ID', 'Task_Type', 'Crop_ID', 'Field_ID', 'Estimated_Minutes', 'Actual_Minutes',
  'Efficiency_Pct', 'Deviation_Pct', 'Employee_ID', 'Weather_Condition', 'Season',
  'Notes', 'Learned_Estimate', 'Confidence_Level', 'Sample_Size', 'Created_At'
];

// Configuration for time learning
const TIME_LEARNING_CONFIG = {
  MIN_SAMPLES_FOR_LEARNING: 3,      // Need at least 3 samples before adjusting
  DEVIATION_THRESHOLD: 0.2,          // 20% deviation triggers learning
  CONFIDENCE_DECAY_DAYS: 90,         // Older data is weighted less
  MAX_ADJUSTMENT_PCT: 0.3,           // Don't adjust more than 30% at once
  WEIGHT_RECENT_SAMPLES: 0.6,        // Weight for recent samples vs historical
  WEIGHT_EMPLOYEE_SPECIFIC: 0.3,     // Weight for employee-specific performance
  WEIGHT_GENERAL_AVERAGE: 0.7        // Weight for general averages
};

/**
 * GET OR CREATE TIME LEARNING SHEET
 */
function getTimeLearningSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TIME_LEARNING_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(TIME_LEARNING_SHEET);
    sheet.getRange(1, 1, 1, TIME_LEARNING_HEADERS.length).setValues([TIME_LEARNING_HEADERS]);
    sheet.getRange(1, 1, 1, TIME_LEARNING_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('Created TIME_LEARNING sheet');
  }

  return sheet;
}

/**
 * RECORD TASK TIME - Log completion time for a task
 * This is the main entry point when a task is completed
 *
 * @param {string} taskId - The task ID
 * @param {number} actualMinutes - Actual minutes spent
 * @param {string} notes - Optional notes about the task
 * @returns {Object} Result with learning feedback
 */
function recordTaskTime(taskId, actualMinutes, notes) {
  const startTime = Date.now();

  try {
    if (!taskId) {
      return { success: false, error: 'Task ID is required' };
    }
    if (!actualMinutes || actualMinutes <= 0) {
      return { success: false, error: 'Valid actual minutes required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 1. Get task details from UNIFIED_TASKS
    const taskSheet = ss.getSheetByName('UNIFIED_TASKS');
    if (!taskSheet) {
      return { success: false, error: 'UNIFIED_TASKS sheet not found' };
    }

    const taskData = taskSheet.getDataRange().getValues();
    const taskHeaders = taskData[0];
    let taskRow = null;
    let taskRowIndex = -1;

    for (let i = 1; i < taskData.length; i++) {
      if (taskData[i][0] === taskId) {
        taskRow = taskData[i];
        taskRowIndex = i + 1; // 1-based for sheet operations
        break;
      }
    }

    if (!taskRow) {
      return { success: false, error: 'Task not found: ' + taskId };
    }

    // Extract task details
    const headerIndex = {};
    taskHeaders.forEach((h, i) => headerIndex[h] = i);

    const taskType = taskRow[headerIndex['Task_Type']] || 'general';
    const cropId = taskRow[headerIndex['Crop_ID']] || '';
    const fieldId = taskRow[headerIndex['Field_ID']] || '';
    const batchId = taskRow[headerIndex['Batch_ID']] || '';
    const assigneeId = taskRow[headerIndex['Assignee_ID']] || '';
    const estimatedMinutes = Number(taskRow[headerIndex['Estimated_Minutes']]) || 30;

    // 2. Calculate efficiency
    const efficiency = Math.round((estimatedMinutes / actualMinutes) * 100);
    const deviation = (actualMinutes - estimatedMinutes) / estimatedMinutes;

    // 3. Update UNIFIED_TASKS with actual time and efficiency
    const actualMinutesCol = headerIndex['Actual_Minutes'] + 1;
    const efficiencyCol = headerIndex['Efficiency_Pct'] + 1;
    const completedAtCol = headerIndex['Completed_At'] + 1;
    const statusCol = headerIndex['Status'] + 1;

    taskSheet.getRange(taskRowIndex, actualMinutesCol).setValue(actualMinutes);
    taskSheet.getRange(taskRowIndex, efficiencyCol).setValue(efficiency);

    // Also update status and completed_at if not already done
    const currentStatus = taskRow[headerIndex['Status']];
    if (currentStatus !== 'completed') {
      taskSheet.getRange(taskRowIndex, completedAtCol).setValue(new Date().toISOString());
      taskSheet.getRange(taskRowIndex, statusCol).setValue('completed');
    }

    // 4. Log to TIMELOG (integrating with existing system)
    let timelogResult = { success: false };
    if (typeof logTaskTime === 'function') {
      timelogResult = logTaskTime({
        taskId: taskId,
        batchId: batchId,
        cropId: cropId,
        fieldId: fieldId,
        taskType: taskType,
        durationMinutes: actualMinutes,
        employeeId: assigneeId,
        notes: notes || '',
        costType: 'DIRECT',
        benchmarkMinutes: estimatedMinutes
      });
    }

    // 5. Learn from this completion
    const learningResult = learnFromCompletion({
      taskId: taskId,
      taskType: taskType,
      cropId: cropId,
      fieldId: fieldId,
      estimatedMinutes: estimatedMinutes,
      actualMinutes: actualMinutes,
      efficiency: efficiency,
      deviation: deviation,
      employeeId: assigneeId,
      notes: notes
    });

    // 6. Generate feedback for the user
    const feedback = generateTimeFeedback(efficiency, deviation, taskType, learningResult);

    return {
      success: true,
      taskId: taskId,
      actualMinutes: actualMinutes,
      estimatedMinutes: estimatedMinutes,
      efficiency: efficiency,
      deviationPercent: Math.round(deviation * 100),
      feedback: feedback,
      learningApplied: learningResult.learned,
      newEstimate: learningResult.suggestedEstimate,
      timelogRecorded: timelogResult.success,
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('recordTaskTime error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * GET TASK TIME HISTORY - Historical times for a task type
 *
 * @param {string} taskType - The type of task (e.g., 'harvest', 'transplant')
 * @param {string} cropId - Optional crop ID for more specific history
 * @returns {Object} Historical time data
 */
function getTaskTimeHistory(taskType, cropId) {
  const startTime = Date.now();

  try {
    if (!taskType) {
      return { success: false, error: 'Task type is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const history = [];

    // 1. Check TIME_LEARNING sheet for aggregated learnings
    const learningSheet = ss.getSheetByName(TIME_LEARNING_SHEET);
    if (learningSheet && learningSheet.getLastRow() > 1) {
      const data = learningSheet.getDataRange().getValues();
      const headers = data[0];
      const headerIndex = {};
      headers.forEach((h, i) => headerIndex[h] = i);

      for (let i = 1; i < data.length; i++) {
        const rowType = String(data[i][headerIndex['Task_Type']] || '').toLowerCase();
        const rowCrop = data[i][headerIndex['Crop_ID']] || '';

        if (rowType === taskType.toLowerCase()) {
          if (!cropId || rowCrop === cropId) {
            history.push({
              learningId: data[i][headerIndex['Learning_ID']],
              taskType: rowType,
              cropId: rowCrop,
              fieldId: data[i][headerIndex['Field_ID']],
              estimatedMinutes: data[i][headerIndex['Estimated_Minutes']],
              actualMinutes: data[i][headerIndex['Actual_Minutes']],
              efficiency: data[i][headerIndex['Efficiency_Pct']],
              deviationPct: data[i][headerIndex['Deviation_Pct']],
              employeeId: data[i][headerIndex['Employee_ID']],
              learnedEstimate: data[i][headerIndex['Learned_Estimate']],
              confidenceLevel: data[i][headerIndex['Confidence_Level']],
              sampleSize: data[i][headerIndex['Sample_Size']],
              createdAt: data[i][headerIndex['Created_At']]
            });
          }
        }
      }
    }

    // 2. Also check LABOR_CHECKINS for raw time data
    const checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');
    const rawData = [];

    if (checkinsSheet && checkinsSheet.getLastRow() > 1) {
      const data = checkinsSheet.getDataRange().getValues();

      // LABOR_CHECKINS columns: [0]Checkin_ID, [1]Employee_ID, [2]Employee_Name, [3]Task_ID,
      // [4]Task_Type, [5]Batch_ID, [6]Estimated_End_Time, [7]Actual_End_Time,
      // [8]Estimated_Minutes, [9]Actual_Minutes, [10]Efficiency_Percent, ...

      for (let i = 1; i < data.length; i++) {
        const rowType = String(data[i][4] || '').toLowerCase();
        if (rowType === taskType.toLowerCase() && data[i][9]) {
          rawData.push({
            checkinId: data[i][0],
            employeeId: data[i][1],
            taskId: data[i][3],
            taskType: rowType,
            batchId: data[i][5],
            estimatedMinutes: data[i][8],
            actualMinutes: data[i][9],
            efficiency: data[i][10],
            completedAt: data[i][7]
          });
        }
      }
    }

    // 3. Calculate statistics
    const allActualMinutes = [
      ...history.map(h => h.actualMinutes),
      ...rawData.map(r => r.actualMinutes)
    ].filter(m => m > 0);

    const stats = allActualMinutes.length > 0 ? {
      count: allActualMinutes.length,
      average: Math.round(allActualMinutes.reduce((a, b) => a + b, 0) / allActualMinutes.length),
      min: Math.min(...allActualMinutes),
      max: Math.max(...allActualMinutes),
      median: calculateMedianTime(allActualMinutes),
      standardDeviation: calculateStdDevTime(allActualMinutes)
    } : null;

    return {
      success: true,
      taskType: taskType,
      cropId: cropId || 'all',
      learningHistory: history.slice(0, 50), // Last 50 learnings
      rawHistory: rawData.slice(-100),        // Last 100 raw entries
      statistics: stats,
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('getTaskTimeHistory error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * CALCULATE AVERAGE TIME - Smart average with context
 *
 * @param {string} taskType - Task type
 * @param {string} cropId - Optional crop ID
 * @param {string} fieldId - Optional field ID
 * @returns {Object} Calculated average with confidence
 */
function calculateAverageTime(taskType, cropId, fieldId) {
  const startTime = Date.now();

  try {
    if (!taskType) {
      return { success: false, error: 'Task type is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Collect all relevant time data
    const times = {
      exact: [],      // Exact match (type + crop + field)
      cropMatch: [],  // Type + crop match
      typeMatch: []   // Type only match
    };

    // 1. Check TIME_LEARNING for aggregated data
    const learningSheet = ss.getSheetByName(TIME_LEARNING_SHEET);
    if (learningSheet && learningSheet.getLastRow() > 1) {
      const data = learningSheet.getDataRange().getValues();
      const headers = data[0];
      const headerIndex = {};
      headers.forEach((h, i) => headerIndex[h] = i);

      for (let i = 1; i < data.length; i++) {
        const rowType = String(data[i][headerIndex['Task_Type']] || '').toLowerCase();
        const rowCrop = data[i][headerIndex['Crop_ID']] || '';
        const rowField = data[i][headerIndex['Field_ID']] || '';
        const actualMin = Number(data[i][headerIndex['Actual_Minutes']]) || 0;
        const sampleSize = Number(data[i][headerIndex['Sample_Size']]) || 1;
        const confidence = Number(data[i][headerIndex['Confidence_Level']]) || 50;

        if (rowType === taskType.toLowerCase() && actualMin > 0) {
          const weight = (confidence / 100) * sampleSize;

          if (cropId && fieldId && rowCrop === cropId && rowField === fieldId) {
            times.exact.push({ value: actualMin, weight: weight });
          } else if (cropId && rowCrop === cropId) {
            times.cropMatch.push({ value: actualMin, weight: weight });
          } else {
            times.typeMatch.push({ value: actualMin, weight: weight });
          }
        }
      }
    }

    // 2. Check LABOR_CHECKINS for raw data
    const checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');
    if (checkinsSheet && checkinsSheet.getLastRow() > 1) {
      const data = checkinsSheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const rowType = String(data[i][4] || '').toLowerCase();
        const actualMin = Number(data[i][9]) || 0;

        if (rowType === taskType.toLowerCase() && actualMin > 0) {
          times.typeMatch.push({ value: actualMin, weight: 1 });
        }
      }
    }

    // 3. Check LABOR_BENCHMARKS for baseline
    let benchmark = { minutes: 30, source: 'default' };
    if (typeof getBenchmark === 'function') {
      benchmark = getBenchmark(taskType, cropId || 'ALL', fieldId || 'ALL');
    }

    // 4. Calculate weighted average
    let averageMinutes = benchmark.minutes || 30;
    let confidence = 0;
    let source = 'benchmark';
    let sampleSize = 0;

    if (times.exact.length >= TIME_LEARNING_CONFIG.MIN_SAMPLES_FOR_LEARNING) {
      // Use exact match data
      averageMinutes = calculateWeightedAverageTime(times.exact);
      confidence = 90;
      source = 'exact_match';
      sampleSize = times.exact.length;
    } else if (times.cropMatch.length >= TIME_LEARNING_CONFIG.MIN_SAMPLES_FOR_LEARNING) {
      // Use crop match data
      averageMinutes = calculateWeightedAverageTime(times.cropMatch);
      confidence = 75;
      source = 'crop_match';
      sampleSize = times.cropMatch.length;
    } else if (times.typeMatch.length >= TIME_LEARNING_CONFIG.MIN_SAMPLES_FOR_LEARNING) {
      // Use type match data
      averageMinutes = calculateWeightedAverageTime(times.typeMatch);
      confidence = 60;
      source = 'type_match';
      sampleSize = times.typeMatch.length;
    } else if (times.typeMatch.length > 0) {
      // Have some data but not enough for confidence
      const dataAvg = calculateWeightedAverageTime(times.typeMatch);
      averageMinutes = Math.round((benchmark.minutes * 0.5) + (dataAvg * 0.5));
      confidence = 40;
      source = 'mixed';
      sampleSize = times.typeMatch.length;
    } else {
      confidence = 20;
      source = 'benchmark_only';
    }

    return {
      success: true,
      taskType: taskType,
      cropId: cropId || 'all',
      fieldId: fieldId || 'all',
      averageMinutes: Math.round(averageMinutes),
      confidence: confidence,
      source: source,
      sampleSize: sampleSize,
      benchmarkMinutes: benchmark.minutes,
      dataSummary: {
        exactMatches: times.exact.length,
        cropMatches: times.cropMatch.length,
        typeMatches: times.typeMatch.length
      },
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('calculateAverageTime error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * SUGGEST ESTIMATED TIME - AI-suggested estimate based on history
 *
 * @param {string} taskType - Task type
 * @param {Object} context - Context object { cropId, fieldId, employeeId, weather, scale }
 * @returns {Object} Suggested estimate with reasoning
 */
function suggestEstimatedTime(taskType, context) {
  const startTime = Date.now();

  try {
    if (!taskType) {
      return { success: false, error: 'Task type is required' };
    }

    context = context || {};
    const cropId = context.cropId || '';
    const fieldId = context.fieldId || '';
    const employeeId = context.employeeId || '';
    const scale = context.scale || 1; // Multiplier for larger tasks

    // 1. Get base average
    const baseAverage = calculateAverageTime(taskType, cropId, fieldId);
    let suggestedMinutes = baseAverage.success ? baseAverage.averageMinutes : 30;

    const factors = [];
    let adjustmentMultiplier = 1.0;

    // 2. Employee-specific adjustment
    if (employeeId) {
      const employeeHistory = getEmployeeTaskPerformance(employeeId, taskType);
      if (employeeHistory.success && employeeHistory.sampleSize >= 3) {
        const empEfficiency = employeeHistory.averageEfficiency;

        if (empEfficiency > 110) {
          // Employee is faster than average
          const adjustment = Math.min(0.85, empEfficiency / 100);
          adjustmentMultiplier *= adjustment;
          factors.push({
            factor: 'Employee Performance',
            adjustment: adjustment,
            reason: `${employeeHistory.employeeName} typically completes ${taskType} tasks ${Math.round((100 - adjustment * 100))}% faster than average`
          });
        } else if (empEfficiency < 90) {
          // Employee is slower than average
          const adjustment = Math.max(1.15, 100 / empEfficiency);
          adjustmentMultiplier *= adjustment;
          factors.push({
            factor: 'Employee Performance',
            adjustment: adjustment,
            reason: `${employeeHistory.employeeName} typically takes ${Math.round((adjustment - 1) * 100)}% longer on ${taskType} tasks`
          });
        }
      }
    }

    // 3. Scale adjustment
    if (scale && scale !== 1) {
      adjustmentMultiplier *= scale;
      factors.push({
        factor: 'Task Scale',
        adjustment: scale,
        reason: `Task is ${scale > 1 ? scale + 'x larger' : scale + 'x smaller'} than standard`
      });
    }

    // 4. Weather adjustment (if available)
    if (context.weather) {
      const weatherAdj = getWeatherTimeAdjustmentFactor(context.weather, taskType);
      if (weatherAdj !== 1.0) {
        adjustmentMultiplier *= weatherAdj;
        factors.push({
          factor: 'Weather Conditions',
          adjustment: weatherAdj,
          reason: weatherAdj > 1 ?
            `${context.weather} conditions may slow down work by ${Math.round((weatherAdj - 1) * 100)}%` :
            `${context.weather} conditions are optimal for ${taskType}`
        });
      }
    }

    // 5. Apply adjustments
    suggestedMinutes = Math.round(suggestedMinutes * adjustmentMultiplier);

    // 6. Ensure reasonable bounds
    suggestedMinutes = Math.max(5, Math.min(480, suggestedMinutes)); // Between 5 min and 8 hours

    return {
      success: true,
      suggestedMinutes: suggestedMinutes,
      taskType: taskType,
      baseEstimate: baseAverage.success ? baseAverage.averageMinutes : 30,
      confidence: baseAverage.confidence || 20,
      source: baseAverage.source || 'default',
      adjustmentFactors: factors,
      totalAdjustment: Math.round(adjustmentMultiplier * 100) / 100,
      context: {
        cropId: cropId || 'none',
        fieldId: fieldId || 'none',
        employeeId: employeeId || 'none',
        scale: scale
      },
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('suggestEstimatedTime error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      suggestedMinutes: 30, // Fallback default
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * GET EFFICIENCY REPORT - Employee efficiency metrics
 *
 * @param {string} employeeId - Employee ID (optional, all if not specified)
 * @param {Object} dateRange - { startDate, endDate } in YYYY-MM-DD format
 * @returns {Object} Efficiency report
 */
function getEfficiencyReport(employeeId, dateRange) {
  const startTime = Date.now();

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    dateRange = dateRange || {};

    const endDate = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
    const startDate = dateRange.startDate ? new Date(dateRange.startDate) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const report = {
      employees: [],
      summary: {
        totalTasks: 0,
        totalEstimatedMinutes: 0,
        totalActualMinutes: 0,
        overallEfficiency: 0,
        tasksOnTime: 0,
        tasksOverTime: 0
      },
      byTaskType: {},
      trends: [],
      recommendations: []
    };

    // 1. Gather data from LABOR_CHECKINS
    const checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');
    if (!checkinsSheet || checkinsSheet.getLastRow() < 2) {
      return {
        success: true,
        message: 'No time tracking data available',
        report: report,
        _timing: { total: Date.now() - startTime }
      };
    }

    const data = checkinsSheet.getDataRange().getValues();
    const employeeData = {};
    const taskTypeData = {};
    const dailyData = {};

    for (let i = 1; i < data.length; i++) {
      const completedAt = data[i][7]; // Actual_End_Time
      if (!completedAt) continue;

      const taskDate = new Date(data[i][14] || completedAt); // Created_At or completion
      if (taskDate < startDate || taskDate > endDate) continue;

      const empId = data[i][1];
      const empName = data[i][2] || empId;
      const taskType = data[i][4] || 'general';
      const estimated = Number(data[i][8]) || 30;
      const actual = Number(data[i][9]) || 0;
      const efficiency = Number(data[i][10]) || 0;

      // Filter by employee if specified
      if (employeeId && empId !== employeeId) continue;

      if (actual <= 0) continue;

      // Aggregate by employee
      if (!employeeData[empId]) {
        employeeData[empId] = {
          employeeId: empId,
          employeeName: empName,
          tasks: [],
          totalEstimated: 0,
          totalActual: 0,
          taskCount: 0
        };
      }
      employeeData[empId].tasks.push({
        taskType: taskType,
        estimated: estimated,
        actual: actual,
        efficiency: efficiency,
        date: taskDate
      });
      employeeData[empId].totalEstimated += estimated;
      employeeData[empId].totalActual += actual;
      employeeData[empId].taskCount++;

      // Aggregate by task type
      if (!taskTypeData[taskType]) {
        taskTypeData[taskType] = {
          taskType: taskType,
          totalEstimated: 0,
          totalActual: 0,
          taskCount: 0,
          efficiencies: []
        };
      }
      taskTypeData[taskType].totalEstimated += estimated;
      taskTypeData[taskType].totalActual += actual;
      taskTypeData[taskType].taskCount++;
      taskTypeData[taskType].efficiencies.push(efficiency);

      // Aggregate by date for trend
      const dateKey = Utilities.formatDate(taskDate, 'America/New_York', 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, tasks: 0, totalEfficiency: 0 };
      }
      dailyData[dateKey].tasks++;
      dailyData[dateKey].totalEfficiency += efficiency;

      // Update summary
      report.summary.totalTasks++;
      report.summary.totalEstimatedMinutes += estimated;
      report.summary.totalActualMinutes += actual;
      if (efficiency >= 100) {
        report.summary.tasksOnTime++;
      } else {
        report.summary.tasksOverTime++;
      }
    }

    // 2. Calculate employee summaries
    Object.values(employeeData).forEach(emp => {
      const avgEfficiency = emp.totalActual > 0 ?
        Math.round((emp.totalEstimated / emp.totalActual) * 100) : 0;

      report.employees.push({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        taskCount: emp.taskCount,
        totalEstimatedMinutes: emp.totalEstimated,
        totalActualMinutes: emp.totalActual,
        averageEfficiency: avgEfficiency,
        rating: avgEfficiency >= 110 ? 'Excellent' :
                avgEfficiency >= 95 ? 'Good' :
                avgEfficiency >= 80 ? 'Fair' : 'Needs Improvement'
      });
    });

    // Sort by efficiency
    report.employees.sort((a, b) => b.averageEfficiency - a.averageEfficiency);

    // 3. Calculate task type summaries
    Object.values(taskTypeData).forEach(tt => {
      const avgEfficiency = tt.efficiencies.length > 0 ?
        Math.round(tt.efficiencies.reduce((a, b) => a + b, 0) / tt.efficiencies.length) : 0;

      report.byTaskType[tt.taskType] = {
        taskCount: tt.taskCount,
        totalEstimatedMinutes: tt.totalEstimated,
        totalActualMinutes: tt.totalActual,
        averageEfficiency: avgEfficiency,
        estimatesAccurate: avgEfficiency >= 85 && avgEfficiency <= 115,
        suggestedAdjustment: avgEfficiency < 85 ? 'increase_estimate' :
                            avgEfficiency > 115 ? 'decrease_estimate' : 'accurate'
      };
    });

    // 4. Calculate overall efficiency
    report.summary.overallEfficiency = report.summary.totalActualMinutes > 0 ?
      Math.round((report.summary.totalEstimatedMinutes / report.summary.totalActualMinutes) * 100) : 0;

    // 5. Generate trend data
    report.trends = Object.values(dailyData)
      .map(d => ({
        date: d.date,
        taskCount: d.tasks,
        averageEfficiency: d.tasks > 0 ? Math.round(d.totalEfficiency / d.tasks) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Generate recommendations
    // Low efficiency employees
    const lowEfficiency = report.employees.filter(e => e.averageEfficiency < 80);
    if (lowEfficiency.length > 0) {
      report.recommendations.push({
        type: 'EMPLOYEE_TRAINING',
        priority: 'HIGH',
        message: `${lowEfficiency.length} employee(s) have efficiency below 80%`,
        details: lowEfficiency.map(e => e.employeeName).join(', '),
        action: 'Consider additional training or adjusting task estimates'
      });
    }

    // Inaccurate task estimates
    const inaccurateTypes = Object.entries(report.byTaskType)
      .filter(([type, data]) => !data.estimatesAccurate && data.taskCount >= 5);
    if (inaccurateTypes.length > 0) {
      report.recommendations.push({
        type: 'ESTIMATE_ADJUSTMENT',
        priority: 'MEDIUM',
        message: `${inaccurateTypes.length} task type(s) have inaccurate time estimates`,
        details: inaccurateTypes.map(([type, data]) =>
          `${type}: ${data.suggestedAdjustment === 'increase_estimate' ? 'taking longer' : 'faster'} than expected`
        ).join('; '),
        action: 'Review and adjust baseline estimates'
      });
    }

    return {
      success: true,
      employeeId: employeeId || 'all',
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      report: report,
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('getEfficiencyReport error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * UPDATE TASK ESTIMATE - Auto-update estimates based on learning
 *
 * @param {string} taskId - Task ID to update
 * @param {number} learnedEstimate - New estimated minutes based on learning
 * @returns {Object} Result
 */
function updateTaskEstimate(taskId, learnedEstimate) {
  const startTime = Date.now();

  try {
    if (!taskId) {
      return { success: false, error: 'Task ID is required' };
    }
    if (!learnedEstimate || learnedEstimate <= 0) {
      return { success: false, error: 'Valid learned estimate required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const taskSheet = ss.getSheetByName('UNIFIED_TASKS');

    if (!taskSheet) {
      return { success: false, error: 'UNIFIED_TASKS sheet not found' };
    }

    const data = taskSheet.getDataRange().getValues();
    const headers = data[0];
    const headerIndex = {};
    headers.forEach((h, i) => headerIndex[h] = i);

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === taskId) {
        const oldEstimate = data[i][headerIndex['Estimated_Minutes']] || 30;
        const estimatedCol = headerIndex['Estimated_Minutes'] + 1;

        taskSheet.getRange(i + 1, estimatedCol).setValue(Math.round(learnedEstimate));

        // Invalidate cache
        CacheService.getScriptCache().remove('unified_tasks_all_all_all_50_0');

        return {
          success: true,
          taskId: taskId,
          oldEstimate: oldEstimate,
          newEstimate: Math.round(learnedEstimate),
          changePercent: Math.round(((learnedEstimate - oldEstimate) / oldEstimate) * 100),
          _timing: { total: Date.now() - startTime }
        };
      }
    }

    return {
      success: false,
      error: 'Task not found: ' + taskId,
      _timing: { total: Date.now() - startTime }
    };

  } catch (error) {
    Logger.log('updateTaskEstimate error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      _timing: { total: Date.now() - startTime }
    };
  }
}

/**
 * LEARN FROM COMPLETION - Internal function to learn from task completion
 * This is the core learning logic that adjusts future estimates
 *
 * @param {Object} task - Task data with actual and estimated times
 * @returns {Object} Learning result
 */
function learnFromCompletion(task) {
  try {
    const { taskType, cropId, fieldId, estimatedMinutes, actualMinutes, efficiency, deviation, employeeId, notes } = task;

    // Only learn if deviation is significant
    if (Math.abs(deviation) < TIME_LEARNING_CONFIG.DEVIATION_THRESHOLD) {
      return {
        learned: false,
        reason: 'Deviation within acceptable range',
        deviation: deviation
      };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const learningSheet = getTimeLearningSheet();

    // Get existing learning data for this task type + crop combination
    const data = learningSheet.getDataRange().getValues();
    const headers = data[0];
    const headerIndex = {};
    headers.forEach((h, i) => headerIndex[h] = i);

    // Find existing learning record
    let existingRow = -1;
    let existingSampleSize = 0;
    let existingLearnedEstimate = 0;

    for (let i = 1; i < data.length; i++) {
      const rowType = String(data[i][headerIndex['Task_Type']] || '').toLowerCase();
      const rowCrop = data[i][headerIndex['Crop_ID']] || '';
      const rowField = data[i][headerIndex['Field_ID']] || '';

      if (rowType === taskType.toLowerCase() &&
          (cropId ? rowCrop === cropId : !rowCrop) &&
          (fieldId ? rowField === fieldId : !rowField)) {
        existingRow = i + 1;
        existingSampleSize = Number(data[i][headerIndex['Sample_Size']]) || 0;
        existingLearnedEstimate = Number(data[i][headerIndex['Learned_Estimate']]) || estimatedMinutes;
        break;
      }
    }

    // Calculate new learned estimate using exponential moving average
    const newSampleSize = existingSampleSize + 1;
    const weight = TIME_LEARNING_CONFIG.WEIGHT_RECENT_SAMPLES;
    let newLearnedEstimate;

    if (existingSampleSize >= TIME_LEARNING_CONFIG.MIN_SAMPLES_FOR_LEARNING) {
      // Weighted average with existing learned estimate
      newLearnedEstimate = (existingLearnedEstimate * (1 - weight)) + (actualMinutes * weight);

      // Apply maximum adjustment limit
      const maxChange = existingLearnedEstimate * TIME_LEARNING_CONFIG.MAX_ADJUSTMENT_PCT;
      if (Math.abs(newLearnedEstimate - existingLearnedEstimate) > maxChange) {
        newLearnedEstimate = existingLearnedEstimate + (maxChange * Math.sign(newLearnedEstimate - existingLearnedEstimate));
      }
    } else {
      // Not enough samples yet, use simple average
      newLearnedEstimate = existingSampleSize > 0 ?
        ((existingLearnedEstimate * existingSampleSize) + actualMinutes) / newSampleSize :
        actualMinutes;
    }

    // Calculate confidence level based on sample size and consistency
    const confidenceLevel = Math.min(95, 50 + (newSampleSize * 5));

    // Get current weather/season for context
    const now = new Date();
    const season = getSeasonForLearning(now);

    // Create or update learning record
    const learningId = 'TL-' + taskType.toUpperCase() + '-' + (cropId || 'ALL') + '-' + Date.now();

    if (existingRow > 0) {
      // Update existing record
      learningSheet.getRange(existingRow, headerIndex['Actual_Minutes'] + 1).setValue(actualMinutes);
      learningSheet.getRange(existingRow, headerIndex['Efficiency_Pct'] + 1).setValue(efficiency);
      learningSheet.getRange(existingRow, headerIndex['Deviation_Pct'] + 1).setValue(Math.round(deviation * 100));
      learningSheet.getRange(existingRow, headerIndex['Learned_Estimate'] + 1).setValue(Math.round(newLearnedEstimate));
      learningSheet.getRange(existingRow, headerIndex['Confidence_Level'] + 1).setValue(confidenceLevel);
      learningSheet.getRange(existingRow, headerIndex['Sample_Size'] + 1).setValue(newSampleSize);
    } else {
      // Create new record
      const newRow = [
        learningId,
        taskType,
        cropId || '',
        fieldId || '',
        estimatedMinutes,
        actualMinutes,
        efficiency,
        Math.round(deviation * 100),
        employeeId || '',
        '', // Weather_Condition (could be enhanced)
        season,
        notes || '',
        Math.round(newLearnedEstimate),
        confidenceLevel,
        1,
        new Date().toISOString()
      ];
      learningSheet.appendRow(newRow);
    }

    // Update LABOR_BENCHMARKS if we have enough confidence
    if (newSampleSize >= TIME_LEARNING_CONFIG.MIN_SAMPLES_FOR_LEARNING && confidenceLevel >= 70) {
      updateBenchmarkFromLearning(taskType, cropId, fieldId, newLearnedEstimate, confidenceLevel);
    }

    return {
      learned: true,
      suggestedEstimate: Math.round(newLearnedEstimate),
      previousEstimate: existingLearnedEstimate || estimatedMinutes,
      sampleSize: newSampleSize,
      confidenceLevel: confidenceLevel,
      deviation: deviation,
      reason: deviation > 0 ?
        'Task took longer than estimated, adjusting upward' :
        'Task completed faster than estimated, adjusting downward'
    };

  } catch (error) {
    Logger.log('learnFromCompletion error: ' + error.toString());
    return {
      learned: false,
      error: error.toString()
    };
  }
}

/**
 * Update LABOR_BENCHMARKS based on learning
 */
function updateBenchmarkFromLearning(taskType, cropId, fieldId, learnedMinutes, confidence) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('LABOR_BENCHMARKS');

    if (!sheet) {
      return; // Benchmarks sheet doesn't exist
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const headerIndex = {};
    headers.forEach((h, i) => headerIndex[h] = i);

    // Find matching benchmark
    for (let i = 1; i < data.length; i++) {
      const rowType = String(data[i][headerIndex['Task_Type']] || '').toLowerCase();
      const rowCrop = data[i][headerIndex['Crop']] || 'ALL';
      const rowLocation = data[i][headerIndex['Location']] || 'ALL';

      if (rowType === taskType.toLowerCase() &&
          rowCrop === (cropId || 'ALL') &&
          rowLocation === (fieldId || 'ALL')) {
        // Update the benchmark
        const minutesCol = headerIndex['Minutes_Per_Unit'] + 1;
        const updatedCol = headerIndex['Updated_At'] + 1;
        const notesCol = headerIndex['Notes'] + 1;

        const oldMinutes = data[i][headerIndex['Minutes_Per_Unit']];
        const newMinutes = Math.round(learnedMinutes);

        // Only update if significant change
        if (Math.abs(newMinutes - oldMinutes) >= 2) {
          sheet.getRange(i + 1, minutesCol).setValue(newMinutes);
          sheet.getRange(i + 1, updatedCol).setValue(new Date());
          sheet.getRange(i + 1, notesCol).setValue(
            `Auto-updated from learning (${confidence}% confidence). Previous: ${oldMinutes} min`
          );

          Logger.log(`Updated benchmark for ${taskType}/${cropId}: ${oldMinutes} -> ${newMinutes} minutes`);
        }
        return;
      }
    }

    // No matching benchmark found - could create one, but let's be conservative
    Logger.log(`No benchmark found to update for ${taskType}/${cropId}`);

  } catch (error) {
    Logger.log('updateBenchmarkFromLearning error: ' + error.toString());
  }
}

/**
 * Get employee's performance on a specific task type
 */
function getEmployeeTaskPerformance(employeeId, taskType) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const checkinsSheet = ss.getSheetByName('LABOR_CHECKINS');

    if (!checkinsSheet || checkinsSheet.getLastRow() < 2) {
      return { success: false, error: 'No data available' };
    }

    const data = checkinsSheet.getDataRange().getValues();
    const efficiencies = [];
    let employeeName = '';

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === employeeId &&
          String(data[i][4]).toLowerCase() === taskType.toLowerCase() &&
          data[i][10]) {
        efficiencies.push(Number(data[i][10]));
        if (!employeeName) employeeName = data[i][2];
      }
    }

    if (efficiencies.length === 0) {
      return { success: false, error: 'No matching data' };
    }

    return {
      success: true,
      employeeId: employeeId,
      employeeName: employeeName,
      taskType: taskType,
      sampleSize: efficiencies.length,
      averageEfficiency: Math.round(efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length),
      minEfficiency: Math.min(...efficiencies),
      maxEfficiency: Math.max(...efficiencies)
    };

  } catch (error) {
    Logger.log('getEmployeeTaskPerformance error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get weather-based time adjustment factor
 */
function getWeatherTimeAdjustmentFactor(weatherCondition, taskType) {
  const weather = String(weatherCondition).toLowerCase();
  const outdoorTasks = ['harvest', 'transplant', 'weed', 'spray', 'scout', 'irrigate'];
  const isOutdoor = outdoorTasks.includes(taskType.toLowerCase());

  if (!isOutdoor) return 1.0;

  // Weather impact factors
  if (weather.includes('rain') || weather.includes('storm')) {
    return 1.3; // 30% slower in rain
  }
  if (weather.includes('hot') || weather.includes('heat')) {
    return 1.15; // 15% slower in heat
  }
  if (weather.includes('cold') || weather.includes('frost')) {
    return 1.1; // 10% slower in cold
  }
  if (weather.includes('wind')) {
    return taskType === 'spray' ? 1.5 : 1.1; // Spraying much harder in wind
  }
  if (weather.includes('sunny') || weather.includes('clear')) {
    return 0.95; // 5% faster in ideal conditions
  }

  return 1.0;
}

/**
 * Get current season for learning (unique name to avoid conflicts)
 */
function getSeasonForLearning(date) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Generate feedback message based on efficiency
 */
function generateTimeFeedback(efficiency, deviation, taskType, learningResult) {
  let level, message, emoji;

  if (efficiency >= 120) {
    level = 'excellent';
    message = `Outstanding! You completed ${taskType} ${efficiency - 100}% faster than estimated.`;
    emoji = 'rocket';
  } else if (efficiency >= 100) {
    level = 'good';
    message = 'Great work! Right on time or better.';
    emoji = 'check';
  } else if (efficiency >= 85) {
    level = 'acceptable';
    message = 'Task complete. Slightly over the estimate.';
    emoji = 'thumbsup';
  } else if (efficiency >= 70) {
    level = 'concern';
    message = `Took ${Math.round(Math.abs(deviation) * 100)}% longer than expected. ${learningResult.learned ? 'Estimate being adjusted.' : ''}`;
    emoji = 'hourglass';
  } else {
    level = 'critical';
    message = 'Significantly over time. Please note any issues in the comments.';
    emoji = 'warning';
  }

  return {
    level: level,
    message: message,
    emoji: emoji,
    learningNote: learningResult.learned ?
      `Future estimates for ${taskType} are being adjusted based on this and previous completions.` : null
  };
}

/**
 * Helper: Calculate weighted average (unique name)
 */
function calculateWeightedAverageTime(items) {
  if (items.length === 0) return 0;
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return items.reduce((sum, i) => sum + i.value, 0) / items.length;
  return items.reduce((sum, i) => sum + (i.value * i.weight), 0) / totalWeight;
}

/**
 * Helper: Calculate median (unique name)
 */
function calculateMedianTime(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Helper: Calculate standard deviation (unique name)
 */
function calculateStdDevTime(values) {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.round(Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// END: TIME TRACKING FEEDBACK LOOP SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
