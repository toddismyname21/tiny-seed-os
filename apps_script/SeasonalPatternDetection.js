/**
 * SEASONAL PATTERN DETECTION SYSTEM
 * Created: 2026-02-03 by Backend_Claude
 * Purpose: Detect and learn from seasonal task patterns, compare year-over-year, generate reminders
 * Integrates with: PLANNING_2026, PLANNING_2025, Morning Brief, Proactive Alerts
 *
 * This file is part of Tiny Seed Farm OS.
 * All functions are accessible via the main API router in MERGED TOTAL.js
 */

/**
 * Get ISO week number from a date
 * @param {Date} date - The date to get week number for
 * @returns {number} Week number (1-53)
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Get date range for a specific week of year
 * @param {number} year - The year
 * @param {number} week - The week number (1-53)
 * @returns {Object} {start: Date, end: Date}
 */
function getWeekDateRange(year, week) {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7;
  const dayOfWeek = jan1.getDay();
  const daysToMonday = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;

  const start = new Date(year, 0, 1 + daysToMonday + daysOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
}

/**
 * Get tasks for a specific week of a specific year
 * @param {number} year - The year to query
 * @param {number} weekNum - The week number (1-53)
 * @returns {Array} Tasks from that week
 */
function getTasksForWeek(year, weekNum) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const tasks = [];
    const dateRange = getWeekDateRange(year, weekNum);

    // Try year-specific task sheet first, then general
    const taskSheetNames = [
      'TASKS_' + year,
      'Tasks_' + year,
      'TASK_ASSIGNMENTS',
      'TASKS',
      'Tasks'
    ];

    let taskSheet = null;
    for (const name of taskSheetNames) {
      taskSheet = ss.getSheetByName(name);
      if (taskSheet && taskSheet.getLastRow() > 1) break;
    }

    if (taskSheet && taskSheet.getLastRow() > 1) {
      const data = taskSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase());

      const dateCol = headers.findIndex(h => h.includes('date') || h.includes('due'));
      const taskCol = headers.findIndex(h => h.includes('task') || h.includes('description') || h.includes('title'));
      const typeCol = headers.findIndex(h => h.includes('type') || h.includes('task_type'));
      const cropCol = headers.findIndex(h => h.includes('crop'));
      const statusCol = headers.findIndex(h => h.includes('status'));
      const batchCol = headers.findIndex(h => h.includes('batch'));

      for (let i = 1; i < data.length; i++) {
        const taskDate = new Date(data[i][dateCol]);
        if (!isNaN(taskDate) && taskDate >= dateRange.start && taskDate <= dateRange.end) {
          if (taskDate.getFullYear() === year) {
            tasks.push({
              date: taskDate.toISOString().split('T')[0],
              task: taskCol >= 0 ? data[i][taskCol] : '',
              taskType: typeCol >= 0 ? data[i][typeCol] : '',
              crop: cropCol >= 0 ? data[i][cropCol] : '',
              status: statusCol >= 0 ? data[i][statusCol] : '',
              batchId: batchCol >= 0 ? data[i][batchCol] : '',
              year: year,
              week: weekNum
            });
          }
        }
      }
    }

    return tasks;
  } catch (e) {
    Logger.log('getTasksForWeek error: ' + e.toString());
    return [];
  }
}

/**
 * Get planting activities for a specific week
 * @param {number} year - The year
 * @param {number} weekNum - The week number
 * @returns {Array} Planting activities
 */
function getPlantingsForWeek(year, weekNum) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const plantings = [];
    const dateRange = getWeekDateRange(year, weekNum);

    const sheetName = 'PLANNING_' + year;
    let planSheet = ss.getSheetByName(sheetName);
    if (!planSheet) planSheet = ss.getSheetByName('PLANNING');

    if (planSheet && planSheet.getLastRow() > 1) {
      const data = planSheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase());

      const ghSowCol = headers.findIndex(h => h.includes('gh_sow') || h.includes('plan_gh_sow'));
      const directSowCol = headers.findIndex(h => h.includes('direct') && h.includes('sow'));
      const transplantCol = headers.findIndex(h => h.includes('transplant'));
      const harvestCol = headers.findIndex(h => h.includes('harvest'));
      const cropCol = headers.findIndex(h => h === 'crop' || h.includes('crop_name'));
      const varietyCol = headers.findIndex(h => h.includes('variety'));
      const batchCol = headers.findIndex(h => h.includes('batch'));

      for (let i = 1; i < data.length; i++) {
        const row = data[i];

        const activities = [
          { type: 'ghSow', colIdx: ghSowCol },
          { type: 'directSow', colIdx: directSowCol },
          { type: 'transplant', colIdx: transplantCol },
          { type: 'harvest', colIdx: harvestCol }
        ];

        for (const activity of activities) {
          if (activity.colIdx >= 0) {
            const actDate = new Date(row[activity.colIdx]);
            if (!isNaN(actDate) && actDate >= dateRange.start && actDate <= dateRange.end) {
              if (actDate.getFullYear() === year) {
                plantings.push({
                  date: actDate.toISOString().split('T')[0],
                  activityType: activity.type,
                  crop: cropCol >= 0 ? row[cropCol] : '',
                  variety: varietyCol >= 0 ? row[varietyCol] : '',
                  batchId: batchCol >= 0 ? row[batchCol] : '',
                  year: year,
                  week: weekNum
                });
              }
            }
          }
        }
      }
    }

    return plantings;
  } catch (e) {
    Logger.log('getPlantingsForWeek error: ' + e.toString());
    return [];
  }
}

/**
 * Get Seasonal Patterns for a specific week of year
 * Returns what tasks and activities typically happen during this week based on historical data
 *
 * @param {Object} params - Parameters {weekOfYear: number (1-53)}
 * @returns {Object} Seasonal patterns for the specified week
 */
function getSeasonalPatterns(params = {}) {
  const startTime = Date.now();

  try {
    const now = new Date();
    const weekNum = params.weekOfYear || params.week || getWeekNumber(now);
    const currentYear = now.getFullYear();

    const historicalYears = [];
    for (let y = currentYear - 1; y >= currentYear - 3; y--) {
      historicalYears.push(y);
    }

    const patterns = {
      weekOfYear: weekNum,
      weekDateRange: getWeekDateRange(currentYear, weekNum),
      tasksByType: {},
      plantingsByType: {},
      cropActivity: {},
      yearlyComparison: [],
      commonTasks: [],
      recommendations: []
    };

    for (const year of historicalYears) {
      const tasks = getTasksForWeek(year, weekNum);
      const plantings = getPlantingsForWeek(year, weekNum);

      const yearSummary = {
        year: year,
        taskCount: tasks.length,
        plantingCount: plantings.length,
        taskTypes: {},
        crops: []
      };

      for (const task of tasks) {
        const taskType = task.taskType || 'general';
        if (!patterns.tasksByType[taskType]) {
          patterns.tasksByType[taskType] = { count: 0, years: [], examples: [] };
        }
        patterns.tasksByType[taskType].count++;
        if (!patterns.tasksByType[taskType].years.includes(year)) {
          patterns.tasksByType[taskType].years.push(year);
        }
        if (patterns.tasksByType[taskType].examples.length < 3) {
          patterns.tasksByType[taskType].examples.push(task.task);
        }

        yearSummary.taskTypes[taskType] = (yearSummary.taskTypes[taskType] || 0) + 1;

        if (task.crop) {
          if (!patterns.cropActivity[task.crop]) {
            patterns.cropActivity[task.crop] = { taskCount: 0, plantingCount: 0, years: [] };
          }
          patterns.cropActivity[task.crop].taskCount++;
          if (!patterns.cropActivity[task.crop].years.includes(year)) {
            patterns.cropActivity[task.crop].years.push(year);
          }
        }
      }

      for (const planting of plantings) {
        const actType = planting.activityType;
        if (!patterns.plantingsByType[actType]) {
          patterns.plantingsByType[actType] = { count: 0, years: [], crops: [] };
        }
        patterns.plantingsByType[actType].count++;
        if (!patterns.plantingsByType[actType].years.includes(year)) {
          patterns.plantingsByType[actType].years.push(year);
        }
        if (!patterns.plantingsByType[actType].crops.includes(planting.crop) && planting.crop) {
          patterns.plantingsByType[actType].crops.push(planting.crop);
        }

        if (planting.crop) {
          yearSummary.crops.push(planting.crop);
          if (!patterns.cropActivity[planting.crop]) {
            patterns.cropActivity[planting.crop] = { taskCount: 0, plantingCount: 0, years: [] };
          }
          patterns.cropActivity[planting.crop].plantingCount++;
          if (!patterns.cropActivity[planting.crop].years.includes(year)) {
            patterns.cropActivity[planting.crop].years.push(year);
          }
        }
      }

      yearSummary.crops = [...new Set(yearSummary.crops)];
      patterns.yearlyComparison.push(yearSummary);
    }

    for (const [taskType, data] of Object.entries(patterns.tasksByType)) {
      if (data.years.length >= 2) {
        patterns.commonTasks.push({
          taskType: taskType,
          frequency: data.years.length + ' of ' + historicalYears.length + ' years',
          avgCount: Math.round(data.count / data.years.length),
          examples: data.examples
        });
      }
    }

    if (patterns.commonTasks.length > 0) {
      patterns.recommendations.push({
        type: 'RECURRING_TASKS',
        message: `Week ${weekNum} typically has ${patterns.commonTasks.length} recurring task type(s)`,
        action: 'Review and schedule these tasks if not already planned'
      });
    }

    for (const [actType, data] of Object.entries(patterns.plantingsByType)) {
      if (data.years.length >= 2 && data.crops.length > 0) {
        patterns.recommendations.push({
          type: 'PLANTING_ACTIVITY',
          message: `${actType} activities typically occur this week for: ${data.crops.slice(0, 5).join(', ')}`,
          action: 'Verify these are in your planning schedule'
        });
      }
    }

    return {
      success: true,
      patterns: patterns,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime
    };

  } catch (error) {
    Logger.log('getSeasonalPatterns error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Compare current week to the same week last year
 * Shows what was done last year vs what's planned/done this year
 *
 * @param {Object} params - Parameters {currentWeek: number (optional)}
 * @returns {Object} Year-over-year comparison
 */
function compareToLastYear(params = {}) {
  const startTime = Date.now();

  try {
    const now = new Date();
    const currentWeek = params.currentWeek || params.week || getWeekNumber(now);
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    const lastYearTasks = getTasksForWeek(lastYear, currentWeek);
    const thisYearTasks = getTasksForWeek(currentYear, currentWeek);
    const lastYearPlantings = getPlantingsForWeek(lastYear, currentWeek);
    const thisYearPlantings = getPlantingsForWeek(currentYear, currentWeek);

    const taskGaps = [];
    const plantingGaps = [];

    const lastYearTaskKeys = new Set();
    for (const task of lastYearTasks) {
      const key = `${task.taskType || 'general'}_${task.crop || 'no-crop'}`;
      lastYearTaskKeys.add(key);
    }

    const thisYearTaskKeys = new Set();
    for (const task of thisYearTasks) {
      const key = `${task.taskType || 'general'}_${task.crop || 'no-crop'}`;
      thisYearTaskKeys.add(key);
    }

    for (const task of lastYearTasks) {
      const key = `${task.taskType || 'general'}_${task.crop || 'no-crop'}`;
      if (!thisYearTaskKeys.has(key)) {
        const gapExists = taskGaps.some(g => g.key === key);
        if (!gapExists) {
          taskGaps.push({
            key: key,
            taskType: task.taskType || 'general',
            crop: task.crop,
            lastYearDate: task.date,
            lastYearTask: task.task,
            status: 'NOT_SCHEDULED'
          });
        }
      }
    }

    const lastYearPlantingKeys = new Set();
    for (const planting of lastYearPlantings) {
      const key = `${planting.activityType}_${planting.crop || 'no-crop'}`;
      lastYearPlantingKeys.add(key);
    }

    const thisYearPlantingKeys = new Set();
    for (const planting of thisYearPlantings) {
      const key = `${planting.activityType}_${planting.crop || 'no-crop'}`;
      thisYearPlantingKeys.add(key);
    }

    for (const planting of lastYearPlantings) {
      const key = `${planting.activityType}_${planting.crop || 'no-crop'}`;
      if (!thisYearPlantingKeys.has(key)) {
        const gapExists = plantingGaps.some(g => g.key === key);
        if (!gapExists) {
          plantingGaps.push({
            key: key,
            activityType: planting.activityType,
            crop: planting.crop,
            variety: planting.variety,
            lastYearDate: planting.date,
            status: 'NOT_SCHEDULED'
          });
        }
      }
    }

    const comparison = {
      week: currentWeek,
      dateRange: {
        lastYear: getWeekDateRange(lastYear, currentWeek),
        thisYear: getWeekDateRange(currentYear, currentWeek)
      },
      lastYear: {
        year: lastYear,
        taskCount: lastYearTasks.length,
        plantingCount: lastYearPlantings.length,
        taskTypes: [...new Set(lastYearTasks.map(t => t.taskType || 'general'))],
        crops: [...new Set([...lastYearTasks, ...lastYearPlantings].map(t => t.crop).filter(c => c))]
      },
      thisYear: {
        year: currentYear,
        taskCount: thisYearTasks.length,
        plantingCount: thisYearPlantings.length,
        taskTypes: [...new Set(thisYearTasks.map(t => t.taskType || 'general'))],
        crops: [...new Set([...thisYearTasks, ...thisYearPlantings].map(t => t.crop).filter(c => c))]
      },
      gaps: {
        tasks: taskGaps,
        plantings: plantingGaps,
        totalGaps: taskGaps.length + plantingGaps.length
      },
      insights: []
    };

    if (comparison.thisYear.taskCount < comparison.lastYear.taskCount) {
      comparison.insights.push({
        type: 'FEWER_TASKS',
        message: `This year has ${comparison.lastYear.taskCount - comparison.thisYear.taskCount} fewer tasks than last year`,
        severity: comparison.lastYear.taskCount - comparison.thisYear.taskCount > 5 ? 'HIGH' : 'LOW'
      });
    }

    if (taskGaps.length > 0) {
      comparison.insights.push({
        type: 'MISSING_TASKS',
        message: `${taskGaps.length} task type(s) from last year are not scheduled this year`,
        severity: taskGaps.length > 3 ? 'HIGH' : 'MEDIUM'
      });
    }

    if (plantingGaps.length > 0) {
      comparison.insights.push({
        type: 'MISSING_PLANTINGS',
        message: `${plantingGaps.length} planting activity(ies) from last year not found this year`,
        severity: plantingGaps.length > 2 ? 'HIGH' : 'MEDIUM'
      });
    }

    if (taskGaps.length === 0 && plantingGaps.length === 0) {
      comparison.insights.push({
        type: 'ON_TRACK',
        message: 'All activities from last year appear to be covered this year',
        severity: 'GOOD'
      });
    }

    return {
      success: true,
      comparison: comparison,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime
    };

  } catch (error) {
    Logger.log('compareToLastYear error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Generate Seasonal Reminders - Proactive "this time last year" alerts
 * Integrates with the Morning Brief and proactive alerts system
 *
 * @param {Object} params - Optional parameters {lookAheadDays: number}
 * @returns {Object} Array of seasonal reminders
 */
function generateSeasonalReminders(params = {}) {
  const startTime = Date.now();

  try {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();

    const reminders = [];

    const comparison = compareToLastYear({ currentWeek: currentWeek });

    if (comparison.success && comparison.comparison) {
      for (const gap of comparison.comparison.gaps.tasks || []) {
        reminders.push({
          id: 'SEASONAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'SEASONAL_TASK',
          icon: 'history',
          priority: 'MEDIUM',
          title: 'Last Year: ' + (gap.taskType || 'Task'),
          message: gap.crop
            ? `You had "${gap.lastYearTask}" for ${gap.crop} around ${gap.lastYearDate} last year`
            : `You completed "${gap.lastYearTask}" around ${gap.lastYearDate} last year`,
          lastYearDate: gap.lastYearDate,
          taskType: gap.taskType,
          crop: gap.crop,
          action: {
            type: 'createTask',
            template: 'seasonal_reminder',
            data: {
              taskType: gap.taskType,
              crop: gap.crop,
              suggestedDate: now.toISOString().split('T')[0]
            }
          },
          category: 'SEASONAL',
          dismissible: true,
          createdAt: now.toISOString()
        });
      }

      for (const gap of comparison.comparison.gaps.plantings || []) {
        let title = 'Last Year: ';
        switch (gap.activityType) {
          case 'ghSow': title += 'Greenhouse Sowing'; break;
          case 'directSow': title += 'Direct Sowing'; break;
          case 'transplant': title += 'Transplanting'; break;
          case 'harvest': title += 'Harvesting'; break;
          default: title += gap.activityType;
        }

        reminders.push({
          id: 'SEASONAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          type: 'SEASONAL_PLANTING',
          icon: 'eco',
          priority: gap.activityType === 'harvest' ? 'HIGH' : 'MEDIUM',
          title: title,
          message: `${gap.crop || 'Crop'} ${gap.variety ? '(' + gap.variety + ')' : ''} - ${gap.activityType} was done around ${gap.lastYearDate} last year`,
          lastYearDate: gap.lastYearDate,
          activityType: gap.activityType,
          crop: gap.crop,
          variety: gap.variety,
          action: {
            type: 'reviewPlanning',
            data: {
              crop: gap.crop,
              activityType: gap.activityType
            }
          },
          category: 'SEASONAL',
          dismissible: true,
          createdAt: now.toISOString()
        });
      }
    }

    const nextWeek = currentWeek + 1 > 52 ? 1 : currentWeek + 1;
    const nextWeekComparison = compareToLastYear({ currentWeek: nextWeek });

    if (nextWeekComparison.success && nextWeekComparison.comparison) {
      const nextWeekGaps = [
        ...(nextWeekComparison.comparison.gaps.tasks || []),
        ...(nextWeekComparison.comparison.gaps.plantings || [])
      ];

      if (nextWeekGaps.length > 0) {
        reminders.push({
          id: 'SEASONAL_NEXT_WEEK_' + Date.now(),
          type: 'SEASONAL_UPCOMING',
          icon: 'event',
          priority: 'LOW',
          title: 'Coming Up Next Week',
          message: `${nextWeekGaps.length} activity(ies) from last year may need scheduling for week ${nextWeek}`,
          weekNumber: nextWeek,
          gapCount: nextWeekGaps.length,
          action: {
            type: 'viewSeasonalPatterns',
            data: { weekOfYear: nextWeek }
          },
          category: 'SEASONAL',
          dismissible: true,
          createdAt: now.toISOString()
        });
      }
    }

    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    reminders.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

    return {
      success: true,
      reminders: reminders,
      count: reminders.length,
      week: currentWeek,
      year: currentYear,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime
    };

  } catch (error) {
    Logger.log('generateSeasonalReminders error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      reminders: [],
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Detect if a seasonal task was missed
 * Alert if a task type that typically happens in a specific week wasn't done
 *
 * @param {Object} params - {taskType: string, expectedWeek: number, cropId: string (optional)}
 * @returns {Object} Detection result with alert if missed
 */
function detectMissedSeasonalTask(params = {}) {
  const startTime = Date.now();

  try {
    if (!params.taskType) {
      return { success: false, error: 'taskType is required' };
    }

    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    const expectedWeek = params.expectedWeek || currentWeek;
    const taskType = params.taskType.toLowerCase();
    const cropId = params.cropId || params.crop;

    const weeksPassed = currentWeek - expectedWeek;
    if (weeksPassed < 0) {
      return {
        success: true,
        missed: false,
        reason: 'Expected week has not yet arrived',
        expectedWeek: expectedWeek,
        currentWeek: currentWeek
      };
    }

    const thisYearTasks = getTasksForWeek(currentYear, expectedWeek);

    let taskFound = false;
    let matchingTask = null;

    for (const task of thisYearTasks) {
      const typeMatch = (task.taskType || 'general').toLowerCase().includes(taskType);
      const cropMatch = !cropId || (task.crop && task.crop.toLowerCase().includes(cropId.toLowerCase()));

      if (typeMatch && cropMatch) {
        taskFound = true;
        matchingTask = task;
        break;
      }
    }

    const historicalPattern = getSeasonalPatterns({ weekOfYear: expectedWeek });
    let isRecurringSeasonal = false;

    if (historicalPattern.success && historicalPattern.patterns) {
      const patterns = historicalPattern.patterns;
      if (patterns.tasksByType && patterns.tasksByType[taskType]) {
        isRecurringSeasonal = patterns.tasksByType[taskType].years.length >= 2;
      }
    }

    const result = {
      success: true,
      taskType: taskType,
      cropId: cropId,
      expectedWeek: expectedWeek,
      currentWeek: currentWeek,
      weeksPassed: weeksPassed,
      found: taskFound,
      missed: !taskFound && weeksPassed > 0,
      isRecurringSeasonal: isRecurringSeasonal,
      matchingTask: matchingTask,
      responseTimeMs: Date.now() - startTime
    };

    if (result.missed && isRecurringSeasonal) {
      result.alert = {
        type: 'MISSED_SEASONAL_TASK',
        icon: 'warning',
        priority: weeksPassed > 2 ? 'HIGH' : 'MEDIUM',
        title: `Missed Seasonal: ${taskType}`,
        message: cropId
          ? `${taskType} for ${cropId} was expected in week ${expectedWeek} but not found (${weeksPassed} week(s) ago)`
          : `${taskType} was expected in week ${expectedWeek} but not found (${weeksPassed} week(s) ago)`,
        action: {
          type: 'createTask',
          template: 'missed_seasonal',
          data: {
            taskType: taskType,
            crop: cropId,
            originalWeek: expectedWeek,
            urgency: 'HIGH'
          }
        }
      };
    }

    return result;

  } catch (error) {
    Logger.log('detectMissedSeasonalTask error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Get Seasonal Benchmarks - Historical performance metrics by crop and task type
 * Shows how long tasks typically take, quantities produced, etc. by season
 *
 * @param {Object} params - {cropId: string (optional), taskType: string (optional)}
 * @returns {Object} Seasonal benchmark data
 */
function getSeasonalBenchmarks(params = {}) {
  const startTime = Date.now();

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const now = new Date();
    const currentYear = now.getFullYear();
    const cropId = params.cropId || params.crop;
    const taskType = params.taskType;

    const benchmarks = {
      byMonth: {},
      byWeek: {},
      byTaskType: {},
      byCrop: {},
      summary: {}
    };

    const completedTasks = [];

    for (let year = currentYear - 1; year >= currentYear - 3; year--) {
      const taskSheetNames = ['TASKS_' + year, 'TASK_ASSIGNMENTS', 'TASKS', 'TIMELOG'];

      for (const sheetName of taskSheetNames) {
        const sheet = ss.getSheetByName(sheetName);
        if (sheet && sheet.getLastRow() > 1) {
          const data = sheet.getDataRange().getValues();
          const headers = data[0].map(h => String(h).toLowerCase());

          const dateCol = headers.findIndex(h => h.includes('date') || h.includes('completed'));
          const typeCol = headers.findIndex(h => h.includes('type') || h.includes('task_type'));
          const cropCol = headers.findIndex(h => h.includes('crop'));
          const durationCol = headers.findIndex(h => h.includes('duration') || h.includes('minutes') || h.includes('time_spent'));
          const quantityCol = headers.findIndex(h => h.includes('quantity') || h.includes('amount') || h.includes('yield'));
          const statusCol = headers.findIndex(h => h.includes('status'));

          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const taskDate = new Date(row[dateCol]);
            const status = statusCol >= 0 ? String(row[statusCol]).toLowerCase() : '';

            if (isNaN(taskDate) || (status && !status.includes('complete') && !status.includes('done'))) {
              continue;
            }

            const taskCrop = cropCol >= 0 ? row[cropCol] : '';
            const taskTaskType = typeCol >= 0 ? row[typeCol] : '';

            if (cropId && taskCrop && !taskCrop.toLowerCase().includes(cropId.toLowerCase())) {
              continue;
            }
            if (taskType && taskTaskType && !taskTaskType.toLowerCase().includes(taskType.toLowerCase())) {
              continue;
            }

            completedTasks.push({
              date: taskDate,
              month: taskDate.getMonth() + 1,
              week: getWeekNumber(taskDate),
              year: taskDate.getFullYear(),
              taskType: taskTaskType || 'general',
              crop: taskCrop || 'unspecified',
              duration: durationCol >= 0 ? parseFloat(row[durationCol]) || 0 : 0,
              quantity: quantityCol >= 0 ? parseFloat(row[quantityCol]) || 0 : 0
            });
          }
          break;
        }
      }
    }

    for (const task of completedTasks) {
      const monthKey = task.month;
      if (!benchmarks.byMonth[monthKey]) {
        benchmarks.byMonth[monthKey] = {
          month: monthKey,
          monthName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthKey - 1],
          taskCount: 0,
          totalDuration: 0,
          totalQuantity: 0,
          avgDuration: 0,
          taskTypes: {}
        };
      }
      benchmarks.byMonth[monthKey].taskCount++;
      benchmarks.byMonth[monthKey].totalDuration += task.duration;
      benchmarks.byMonth[monthKey].totalQuantity += task.quantity;

      if (!benchmarks.byMonth[monthKey].taskTypes[task.taskType]) {
        benchmarks.byMonth[monthKey].taskTypes[task.taskType] = 0;
      }
      benchmarks.byMonth[monthKey].taskTypes[task.taskType]++;
    }

    for (const monthKey in benchmarks.byMonth) {
      const m = benchmarks.byMonth[monthKey];
      m.avgDuration = m.taskCount > 0 ? Math.round(m.totalDuration / m.taskCount) : 0;
    }

    for (const task of completedTasks) {
      const typeKey = task.taskType;
      if (!benchmarks.byTaskType[typeKey]) {
        benchmarks.byTaskType[typeKey] = {
          taskType: typeKey,
          taskCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          peakMonths: {},
          crops: new Set()
        };
      }
      benchmarks.byTaskType[typeKey].taskCount++;
      benchmarks.byTaskType[typeKey].totalDuration += task.duration;
      benchmarks.byTaskType[typeKey].crops.add(task.crop);

      if (!benchmarks.byTaskType[typeKey].peakMonths[task.month]) {
        benchmarks.byTaskType[typeKey].peakMonths[task.month] = 0;
      }
      benchmarks.byTaskType[typeKey].peakMonths[task.month]++;
    }

    for (const typeKey in benchmarks.byTaskType) {
      const t = benchmarks.byTaskType[typeKey];
      t.avgDuration = t.taskCount > 0 ? Math.round(t.totalDuration / t.taskCount) : 0;
      t.crops = [...t.crops];

      const monthCounts = Object.entries(t.peakMonths).sort((a, b) => b[1] - a[1]);
      t.peakMonthsList = monthCounts.slice(0, 3).map(([m, count]) => ({
        month: parseInt(m),
        monthName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m) - 1],
        count: count
      }));
    }

    for (const task of completedTasks) {
      const cropKey = task.crop;
      if (!benchmarks.byCrop[cropKey]) {
        benchmarks.byCrop[cropKey] = {
          crop: cropKey,
          taskCount: 0,
          totalDuration: 0,
          avgDuration: 0,
          taskTypes: {},
          activeMonths: new Set()
        };
      }
      benchmarks.byCrop[cropKey].taskCount++;
      benchmarks.byCrop[cropKey].totalDuration += task.duration;
      benchmarks.byCrop[cropKey].activeMonths.add(task.month);

      if (!benchmarks.byCrop[cropKey].taskTypes[task.taskType]) {
        benchmarks.byCrop[cropKey].taskTypes[task.taskType] = 0;
      }
      benchmarks.byCrop[cropKey].taskTypes[task.taskType]++;
    }

    for (const cropKey in benchmarks.byCrop) {
      const c = benchmarks.byCrop[cropKey];
      c.avgDuration = c.taskCount > 0 ? Math.round(c.totalDuration / c.taskCount) : 0;
      c.activeMonths = [...c.activeMonths].sort((a, b) => a - b);
    }

    benchmarks.summary = {
      totalTasksAnalyzed: completedTasks.length,
      yearsOfData: [...new Set(completedTasks.map(t => t.year))].length,
      uniqueTaskTypes: Object.keys(benchmarks.byTaskType).length,
      uniqueCrops: Object.keys(benchmarks.byCrop).length,
      busiestMonth: Object.entries(benchmarks.byMonth)
        .sort((a, b) => b[1].taskCount - a[1].taskCount)[0]?.[1] || null,
      mostCommonTaskType: Object.entries(benchmarks.byTaskType)
        .sort((a, b) => b[1].taskCount - a[1].taskCount)[0]?.[0] || null
    };

    return {
      success: true,
      filters: { cropId, taskType },
      benchmarks: benchmarks,
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime
    };

  } catch (error) {
    Logger.log('getSeasonalBenchmarks error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Store Seasonal Baseline - Save task summary for future comparison
 * Creates a snapshot of what was done in a specific week for year-over-year analysis
 *
 * @param {Object} params - {year: number, week: number, taskSummary: object (optional)}
 * @returns {Object} Storage result
 */
function storeSeasonalBaseline(params = {}) {
  const startTime = Date.now();

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const now = new Date();
    const year = params.year || now.getFullYear();
    const week = params.week || getWeekNumber(now);

    let baselineSheet = ss.getSheetByName('SEASONAL_BASELINES');
    if (!baselineSheet) {
      baselineSheet = ss.insertSheet('SEASONAL_BASELINES');
      baselineSheet.appendRow([
        'Baseline_ID', 'Year', 'Week', 'Created_At',
        'Task_Count', 'Planting_Count', 'Task_Types', 'Crops_Active',
        'Summary_JSON', 'Notes'
      ]);

      baselineSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      baselineSheet.setFrozenRows(1);
    }

    let taskSummary = params.taskSummary;
    if (!taskSummary) {
      const tasks = getTasksForWeek(year, week);
      const plantings = getPlantingsForWeek(year, week);

      taskSummary = {
        taskCount: tasks.length,
        plantingCount: plantings.length,
        taskTypes: [...new Set(tasks.map(t => t.taskType || 'general'))],
        crops: [...new Set([...tasks, ...plantings].map(t => t.crop).filter(c => c))],
        tasks: tasks.slice(0, 20),
        plantings: plantings.slice(0, 20)
      };
    }

    const existingData = baselineSheet.getDataRange().getValues();
    const headers = existingData[0];
    const yearCol = headers.indexOf('Year');
    const weekCol = headers.indexOf('Week');

    let existingRow = -1;
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][yearCol] === year && existingData[i][weekCol] === week) {
        existingRow = i + 1;
        break;
      }
    }

    const baselineId = 'BL_' + year + '_W' + week + '_' + Date.now();
    const rowData = [
      baselineId,
      year,
      week,
      now.toISOString(),
      taskSummary.taskCount || 0,
      taskSummary.plantingCount || 0,
      (taskSummary.taskTypes || []).join(', '),
      (taskSummary.crops || []).join(', '),
      JSON.stringify(taskSummary),
      params.notes || ''
    ];

    if (existingRow > 0) {
      baselineSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
      return {
        success: true,
        action: 'UPDATED',
        baselineId: baselineId,
        year: year,
        week: week,
        summary: {
          taskCount: taskSummary.taskCount,
          plantingCount: taskSummary.plantingCount,
          taskTypes: taskSummary.taskTypes?.length || 0,
          cropsActive: taskSummary.crops?.length || 0
        },
        timestamp: now.toISOString(),
        responseTimeMs: Date.now() - startTime
      };
    } else {
      baselineSheet.appendRow(rowData);
      return {
        success: true,
        action: 'CREATED',
        baselineId: baselineId,
        year: year,
        week: week,
        summary: {
          taskCount: taskSummary.taskCount,
          plantingCount: taskSummary.plantingCount,
          taskTypes: taskSummary.taskTypes?.length || 0,
          cropsActive: taskSummary.crops?.length || 0
        },
        timestamp: now.toISOString(),
        responseTimeMs: Date.now() - startTime
      };
    }

  } catch (error) {
    Logger.log('storeSeasonalBaseline error: ' + error.toString());
    return {
      success: false,
      error: error.toString(),
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Get stored seasonal baselines
 * @param {Object} params - {year: number (optional), limit: number (optional)}
 * @returns {Object} Baseline data
 */
function getSeasonalBaselines(params = {}) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const baselineSheet = ss.getSheetByName('SEASONAL_BASELINES');

    if (!baselineSheet || baselineSheet.getLastRow() <= 1) {
      return {
        success: true,
        baselines: [],
        message: 'No seasonal baselines found. Use storeSeasonalBaseline to create them.'
      };
    }

    const data = baselineSheet.getDataRange().getValues();
    const headers = data[0];

    const baselines = [];
    const yearFilter = params.year;
    const limit = params.limit || 52;

    for (let i = 1; i < data.length && baselines.length < limit; i++) {
      const row = data[i];
      const baseline = {};
      headers.forEach((h, idx) => {
        baseline[h] = row[idx];
      });

      if (baseline.Summary_JSON) {
        try {
          baseline.summaryData = JSON.parse(baseline.Summary_JSON);
        } catch (e) {
          baseline.summaryData = null;
        }
      }

      if (yearFilter && baseline.Year !== yearFilter) {
        continue;
      }

      baselines.push(baseline);
    }

    return {
      success: true,
      baselines: baselines,
      count: baselines.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('getSeasonalBaselines error: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Auto-store current week's baseline (for scheduled trigger)
 * Can be set up as a weekly time-driven trigger
 */
function autoStoreWeeklyBaseline() {
  const now = new Date();
  const result = storeSeasonalBaseline({
    year: now.getFullYear(),
    week: getWeekNumber(now),
    notes: 'Auto-generated weekly baseline'
  });

  Logger.log('autoStoreWeeklyBaseline: ' + JSON.stringify(result));
  return result;
}

/**
 * Get seasonal reminders for Morning Brief integration
 * Returns a simplified format suitable for the morning brief
 */
function getSeasonalRemindersForBrief() {
  const reminders = generateSeasonalReminders();

  if (!reminders.success || !reminders.reminders || reminders.reminders.length === 0) {
    return {
      success: true,
      hasReminders: false,
      count: 0,
      topReminders: []
    };
  }

  return {
    success: true,
    hasReminders: true,
    count: reminders.count,
    topReminders: reminders.reminders.slice(0, 3).map(r => ({
      title: r.title,
      message: r.message,
      priority: r.priority
    })),
    allReminders: reminders.reminders
  };
}
