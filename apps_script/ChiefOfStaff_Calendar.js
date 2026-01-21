/**
 * ========================================
 * CHIEF OF STAFF - CALENDAR AI
 * ========================================
 *
 * STATE-OF-THE-ART intelligent calendar management
 * Based on: Reclaim AI, Motion, Clara patterns
 *
 * Capabilities:
 * - Auto-schedule tasks based on priority
 * - Protect focus/field time automatically
 * - Smart meeting scheduling via email
 * - Time-blocking optimization
 * - Calendar-aware email responses
 * - Weather-aware scheduling
 * - Energy-level optimization
 *
 * @author Claude PM_Architect
 * @version 1.0.0
 * @date 2026-01-21
 */

// ==========================================
// TIME PREFERENCES CONFIGURATION
// ==========================================

const DEFAULT_PREFERENCES = {
  // Working hours
  workDayStart: 7, // 7 AM
  workDayEnd: 18, // 6 PM
  workDays: [1, 2, 3, 4, 5, 6], // Mon-Sat

  // Focus time
  focusTimeMin: 90, // Minimum focus block in minutes
  focusTimePreferred: 180, // Preferred focus block
  focusTimeMax: 4, // Max hours of focus per day

  // Meeting preferences
  meetingBufferBefore: 15, // Minutes before meetings
  meetingBufferAfter: 15, // Minutes after meetings
  preferredMeetingTimes: ['10:00', '14:00'], // Preferred meeting start times
  maxMeetingsPerDay: 3,

  // Farm-specific
  fieldWorkHours: { start: 8, end: 14 }, // Best field work hours
  marketDays: [3, 6], // Wed, Sat (farmers market)
  deliveryDays: [2, 4], // Tue, Thu

  // Energy patterns
  highEnergyHours: [8, 9, 10, 11], // Morning peak
  lowEnergyHours: [13, 14], // Post-lunch dip
  creativeHours: [9, 10, 16, 17] // Best for creative work
};

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize Calendar AI system
 */
function initializeCalendarAI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Create preferences sheet
  let prefsSheet = ss.getSheetByName('COS_CALENDAR_PREFS');
  if (!prefsSheet) {
    prefsSheet = ss.insertSheet('COS_CALENDAR_PREFS');
    prefsSheet.appendRow(['key', 'value', 'updated_at', 'source']);
    prefsSheet.getRange(1, 1, 1, 4).setFontWeight('bold');

    // Add default preferences
    for (const [key, value] of Object.entries(DEFAULT_PREFERENCES)) {
      prefsSheet.appendRow([key, JSON.stringify(value), new Date().toISOString(), 'default']);
    }
  }

  // Create scheduled tasks sheet
  let tasksSheet = ss.getSheetByName('COS_SCHEDULED_TASKS');
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet('COS_SCHEDULED_TASKS');
    tasksSheet.appendRow([
      'task_id', 'title', 'description', 'priority', 'duration_mins',
      'deadline', 'scheduled_start', 'scheduled_end', 'status',
      'energy_required', 'task_type', 'dependencies', 'created_at'
    ]);
    tasksSheet.getRange(1, 1, 1, 13).setFontWeight('bold');
  }

  // Create focus blocks sheet
  let focusSheet = ss.getSheetByName('COS_FOCUS_BLOCKS');
  if (!focusSheet) {
    focusSheet = ss.insertSheet('COS_FOCUS_BLOCKS');
    focusSheet.appendRow([
      'block_id', 'date', 'start_time', 'end_time', 'duration_mins',
      'type', 'protected', 'actual_focus_mins', 'interruptions'
    ]);
    focusSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  return {
    success: true,
    message: 'Calendar AI initialized',
    sheets: ['COS_CALENDAR_PREFS', 'COS_SCHEDULED_TASKS', 'COS_FOCUS_BLOCKS']
  };
}

/**
 * Get calendar preferences
 */
function getCalendarPreferences() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_CALENDAR_PREFS');

  if (!sheet) {
    return DEFAULT_PREFERENCES;
  }

  const data = sheet.getDataRange().getValues();
  const prefs = { ...DEFAULT_PREFERENCES };

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    const value = data[i][1];

    try {
      prefs[key] = JSON.parse(value);
    } catch (e) {
      prefs[key] = value;
    }
  }

  return prefs;
}

/**
 * Update calendar preference
 */
function setCalendarPreference(key, value, source = 'user') {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_CALENDAR_PREFS');

  if (!sheet) {
    initializeCalendarAI();
    sheet = ss.getSheetByName('COS_CALENDAR_PREFS');
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2, 1, 3).setValues([
        [JSON.stringify(value), new Date().toISOString(), source]
      ]);
      return { success: true, updated: true };
    }
  }

  // Add new preference
  sheet.appendRow([key, JSON.stringify(value), new Date().toISOString(), source]);
  return { success: true, added: true };
}

// ==========================================
// FOCUS TIME PROTECTION
// ==========================================

/**
 * Analyze calendar and protect focus time
 */
function protectFocusTime(days = 7) {
  const prefs = getCalendarPreferences();
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const results = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Skip non-work days
    if (!prefs.workDays.includes(date.getDay())) continue;

    // Get existing events
    const dayStart = new Date(date.setHours(prefs.workDayStart, 0, 0, 0));
    const dayEnd = new Date(date.setHours(prefs.workDayEnd, 0, 0, 0));
    const events = calendar.getEvents(dayStart, dayEnd);

    // Find gaps for focus time
    const gaps = findTimeGaps(events, dayStart, dayEnd, prefs);

    // Protect suitable gaps
    for (const gap of gaps) {
      if (gap.duration >= prefs.focusTimeMin) {
        const focusBlock = createFocusBlock(
          gap.start,
          Math.min(gap.duration, prefs.focusTimePreferred),
          getFocusType(gap.start, prefs)
        );

        results.push(focusBlock);
      }
    }
  }

  return {
    success: true,
    blocksCreated: results.length,
    blocks: results
  };
}

/**
 * Find time gaps between events
 */
function findTimeGaps(events, dayStart, dayEnd, prefs) {
  const gaps = [];
  let currentTime = new Date(dayStart);

  // Sort events by start time
  const sorted = events.sort((a, b) => a.getStartTime() - b.getStartTime());

  for (const event of sorted) {
    const eventStart = event.getStartTime();
    const eventEnd = event.getEndTime();

    // Add buffer after current time for previous event
    const gapStart = new Date(currentTime.getTime() + prefs.meetingBufferAfter * 60000);
    const gapEnd = new Date(eventStart.getTime() - prefs.meetingBufferBefore * 60000);

    if (gapEnd > gapStart) {
      const duration = (gapEnd - gapStart) / 60000; // in minutes
      gaps.push({
        start: gapStart,
        end: gapEnd,
        duration: duration
      });
    }

    currentTime = eventEnd;
  }

  // Gap after last event
  const finalGapStart = new Date(currentTime.getTime() + prefs.meetingBufferAfter * 60000);
  if (dayEnd > finalGapStart) {
    gaps.push({
      start: finalGapStart,
      end: dayEnd,
      duration: (dayEnd - finalGapStart) / 60000
    });
  }

  return gaps;
}

/**
 * Determine focus type based on time
 */
function getFocusType(startTime, prefs) {
  const hour = startTime.getHours();

  if (hour >= prefs.fieldWorkHours.start && hour < prefs.fieldWorkHours.end) {
    return 'field_work';
  }
  if (prefs.highEnergyHours.includes(hour)) {
    return 'deep_work';
  }
  if (prefs.creativeHours.includes(hour)) {
    return 'creative';
  }
  return 'admin';
}

/**
 * Create focus time block
 */
function createFocusBlock(start, durationMins, focusType) {
  const calendar = CalendarApp.getDefaultCalendar();
  const end = new Date(start.getTime() + durationMins * 60000);

  const titles = {
    field_work: '🌱 Field Work Time',
    deep_work: '🎯 Deep Focus',
    creative: '💡 Creative Time',
    admin: '📋 Admin Block'
  };

  const event = calendar.createEvent(titles[focusType] || '🎯 Focus Time', start, end, {
    description: 'Protected time block created by Chief of Staff Calendar AI.\nDo not schedule over this unless absolutely necessary.'
  });

  // Color code the event
  const colors = {
    field_work: CalendarApp.EventColor.GREEN,
    deep_work: CalendarApp.EventColor.BLUE,
    creative: CalendarApp.EventColor.YELLOW,
    admin: CalendarApp.EventColor.GRAY
  };

  event.setColor(colors[focusType] || CalendarApp.EventColor.BLUE);

  // Log to sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COS_FOCUS_BLOCKS');

  if (sheet) {
    sheet.appendRow([
      event.getId(),
      Utilities.formatDate(start, 'America/New_York', 'yyyy-MM-dd'),
      Utilities.formatDate(start, 'America/New_York', 'HH:mm'),
      Utilities.formatDate(end, 'America/New_York', 'HH:mm'),
      durationMins,
      focusType,
      'yes',
      '', // actual_focus_mins - filled later
      0  // interruptions
    ]);
  }

  return {
    id: event.getId(),
    title: event.getTitle(),
    start: start,
    end: end,
    type: focusType,
    duration: durationMins
  };
}

// ==========================================
// SMART TASK SCHEDULING
// ==========================================

/**
 * Schedule a task optimally
 */
function scheduleTask(task) {
  const prefs = getCalendarPreferences();
  const calendar = CalendarApp.getDefaultCalendar();

  // Find optimal time slot
  const optimalSlot = findOptimalSlot(task, prefs);

  if (!optimalSlot) {
    return {
      success: false,
      error: 'No suitable time slot found before deadline'
    };
  }

  // Create calendar event
  const event = calendar.createEvent(
    `📌 ${task.title}`,
    optimalSlot.start,
    optimalSlot.end,
    {
      description: task.description || 'Task scheduled by Chief of Staff Calendar AI'
    }
  );

  // Color based on priority
  const priorityColors = {
    critical: CalendarApp.EventColor.RED,
    high: CalendarApp.EventColor.ORANGE,
    medium: CalendarApp.EventColor.BLUE,
    low: CalendarApp.EventColor.GRAY
  };

  event.setColor(priorityColors[task.priority] || CalendarApp.EventColor.BLUE);

  // Save to tracking sheet
  saveScheduledTask(task, optimalSlot, event.getId());

  return {
    success: true,
    eventId: event.getId(),
    scheduledStart: optimalSlot.start,
    scheduledEnd: optimalSlot.end,
    reasoning: optimalSlot.reasoning
  };
}

/**
 * Find optimal time slot for a task
 */
function findOptimalSlot(task, prefs) {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const deadline = task.deadline ? new Date(task.deadline) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const duration = task.duration_mins || 60;

  const candidates = [];

  // Search up to deadline
  let searchDate = new Date(now);
  while (searchDate < deadline) {
    // Skip non-work days
    if (!prefs.workDays.includes(searchDate.getDay())) {
      searchDate = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
      continue;
    }

    // Get day's events
    const dayStart = new Date(searchDate);
    dayStart.setHours(prefs.workDayStart, 0, 0, 0);
    const dayEnd = new Date(searchDate);
    dayEnd.setHours(prefs.workDayEnd, 0, 0, 0);

    const events = calendar.getEvents(dayStart, dayEnd);
    const gaps = findTimeGaps(events, dayStart, dayEnd, prefs);

    for (const gap of gaps) {
      if (gap.duration >= duration) {
        const score = scoreTimeSlot(gap.start, task, prefs);
        candidates.push({
          start: gap.start,
          end: new Date(gap.start.getTime() + duration * 60000),
          score: score.total,
          reasoning: score.reasoning
        });
      }
    }

    searchDate = new Date(searchDate.getTime() + 24 * 60 * 60 * 1000);
  }

  // Sort by score and return best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

/**
 * Score a time slot for task fit
 */
function scoreTimeSlot(startTime, task, prefs) {
  let score = 100;
  const reasons = [];
  const hour = startTime.getHours();
  const dayOfWeek = startTime.getDay();

  // Energy match
  const energyRequired = task.energy_required || 'medium';
  if (energyRequired === 'high' && prefs.highEnergyHours.includes(hour)) {
    score += 20;
    reasons.push('Matches high-energy hours');
  } else if (energyRequired === 'high' && prefs.lowEnergyHours.includes(hour)) {
    score -= 30;
    reasons.push('Conflicts with low-energy period');
  }

  // Task type preferences
  const taskType = task.task_type || 'general';
  if (taskType === 'field_work') {
    if (hour >= prefs.fieldWorkHours.start && hour < prefs.fieldWorkHours.end) {
      score += 25;
      reasons.push('Optimal field work hours');
    } else {
      score -= 20;
      reasons.push('Outside field work hours');
    }
  }

  // Market day conflicts
  if (prefs.marketDays.includes(dayOfWeek) && taskType !== 'market') {
    score -= 10;
    reasons.push('Market day - limited availability');
  }

  // Priority urgency
  if (task.priority === 'critical') {
    // Prefer sooner slots
    const hoursUntil = (startTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      score += 15;
      reasons.push('Critical task scheduled soon');
    }
  }

  // Weather consideration (if available)
  if (taskType === 'field_work') {
    const weatherScore = getWeatherScoreForTime(startTime);
    score += weatherScore.adjustment;
    if (weatherScore.reason) reasons.push(weatherScore.reason);
  }

  return {
    total: score,
    reasoning: reasons.join('; ')
  };
}

/**
 * Get weather score adjustment for scheduling
 */
function getWeatherScoreForTime(startTime) {
  try {
    // Check if weather integration is available
    if (typeof getWeatherForecast === 'function') {
      const forecast = getWeatherForecast(3);
      if (forecast.success) {
        const date = Utilities.formatDate(startTime, 'America/New_York', 'yyyy-MM-dd');
        const dayForecast = forecast.forecast.find(f => f.date === date);

        if (dayForecast) {
          if (dayForecast.rain_chance > 50) {
            return { adjustment: -20, reason: 'Rain likely - poor for field work' };
          }
          if (dayForecast.high > 90) {
            const hour = startTime.getHours();
            if (hour >= 11 && hour <= 15) {
              return { adjustment: -15, reason: 'Hot afternoon - avoid peak heat' };
            }
          }
          if (dayForecast.rain_chance < 20 && dayForecast.high < 85) {
            return { adjustment: 10, reason: 'Ideal weather conditions' };
          }
        }
      }
    }
  } catch (e) {
    // Weather not available
  }

  return { adjustment: 0, reason: null };
}

/**
 * Save scheduled task to tracking sheet
 */
function saveScheduledTask(task, slot, eventId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('COS_SCHEDULED_TASKS');

  if (!sheet) {
    initializeCalendarAI();
    sheet = ss.getSheetByName('COS_SCHEDULED_TASKS');
  }

  const taskId = task.id || `TASK_${Date.now()}`;

  sheet.appendRow([
    taskId,
    task.title,
    task.description || '',
    task.priority || 'medium',
    task.duration_mins || 60,
    task.deadline || '',
    slot.start.toISOString(),
    slot.end.toISOString(),
    'scheduled',
    task.energy_required || 'medium',
    task.task_type || 'general',
    JSON.stringify(task.dependencies || []),
    new Date().toISOString()
  ]);

  return taskId;
}

// ==========================================
// MEETING SCHEDULING
// ==========================================

/**
 * Find available meeting times
 */
function findMeetingTimes(params) {
  const prefs = getCalendarPreferences();
  const calendar = CalendarApp.getDefaultCalendar();

  const duration = params.duration || 30;
  const searchDays = params.days || 5;
  const attendeeCount = params.attendees || 1;

  const options = [];
  const now = new Date();

  for (let d = 1; d <= searchDays; d++) {
    const date = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    // Skip non-work days
    if (!prefs.workDays.includes(date.getDay())) continue;

    // Get events
    const dayStart = new Date(date);
    dayStart.setHours(prefs.workDayStart, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(prefs.workDayEnd, 0, 0, 0);

    const events = calendar.getEvents(dayStart, dayEnd);

    // Count meetings this day
    const meetingCount = events.filter(e => !e.getTitle().includes('Focus')).length;
    if (meetingCount >= prefs.maxMeetingsPerDay) continue;

    // Find gaps
    const gaps = findTimeGaps(events, dayStart, dayEnd, prefs);

    for (const gap of gaps) {
      if (gap.duration >= duration) {
        // Check if preferred time slot
        const hour = gap.start.getHours();
        const timeStr = `${hour}:00`;
        const isPreferred = prefs.preferredMeetingTimes.some(t =>
          t.startsWith(`${hour}:`)
        );

        options.push({
          date: Utilities.formatDate(date, 'America/New_York', 'EEEE, MMMM d'),
          start: Utilities.formatDate(gap.start, 'America/New_York', 'h:mm a'),
          end: Utilities.formatDate(
            new Date(gap.start.getTime() + duration * 60000),
            'America/New_York',
            'h:mm a'
          ),
          startDateTime: gap.start,
          isPreferred: isPreferred,
          priority: isPreferred ? 1 : 2
        });
      }
    }
  }

  // Sort by priority then date
  options.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.startDateTime - b.startDateTime;
  });

  return {
    success: true,
    duration: duration,
    options: options.slice(0, 5) // Top 5 options
  };
}

/**
 * Generate meeting availability text for email
 */
function generateAvailabilityText(params) {
  const times = findMeetingTimes(params);

  if (!times.success || times.options.length === 0) {
    return "I'm currently booked solid. Let me check back with alternative times.";
  }

  let text = `Here are some times that work for me:\n\n`;

  for (let i = 0; i < times.options.length; i++) {
    const opt = times.options[i];
    text += `${i + 1}. ${opt.date} at ${opt.start}\n`;
  }

  text += `\nLet me know which works best for you, or suggest an alternative if none of these work.`;

  return text;
}

/**
 * Schedule meeting from email request
 */
function scheduleMeetingFromEmail(emailContext) {
  // Parse meeting request with AI
  const parsePrompt = `Parse this meeting request:

Email from: ${emailContext.from}
Subject: ${emailContext.subject}
Body: ${emailContext.body}

Extract:
- requested_duration (in minutes, default 30)
- preferred_dates (any specific dates mentioned)
- topic (brief description)
- urgency (low/medium/high)

Return JSON only.`;

  try {
    const parsed = JSON.parse(callClaudeForCalendar(parsePrompt));

    // Find suitable times
    const times = findMeetingTimes({
      duration: parsed.requested_duration || 30,
      days: 7
    });

    // Generate response draft
    const response = generateMeetingResponseDraft(emailContext, parsed, times);

    return {
      success: true,
      parsed: parsed,
      availableTimes: times.options,
      suggestedResponse: response
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate meeting response draft
 */
function generateMeetingResponseDraft(emailContext, parsed, times) {
  if (!times.success || times.options.length === 0) {
    return `Thanks for reaching out about ${parsed.topic || 'meeting'}. My calendar is quite full right now. Could you share a few times that work on your end?`;
  }

  const opt = times.options[0];
  return `Thanks for reaching out! I'd be happy to meet about ${parsed.topic || 'this'}.

How about ${opt.date} at ${opt.start}? That works well on my end.

If that doesn't work, here are a couple alternatives:
- ${times.options[1]?.date} at ${times.options[1]?.start || 'TBD'}
- ${times.options[2]?.date} at ${times.options[2]?.start || 'TBD'}

Let me know!`;
}

// ==========================================
// DAILY SCHEDULE OPTIMIZATION
// ==========================================

/**
 * Optimize today's schedule
 */
function optimizeTodaySchedule() {
  const prefs = getCalendarPreferences();
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();

  const dayStart = new Date(now);
  dayStart.setHours(prefs.workDayStart, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(prefs.workDayEnd, 0, 0, 0);

  const events = calendar.getEvents(dayStart, dayEnd);
  const recommendations = [];

  // Analyze schedule
  let totalMeetings = 0;
  let totalFocus = 0;
  let backToBack = 0;
  let lastEnd = null;

  for (const event of events) {
    const title = event.getTitle();
    const start = event.getStartTime();
    const end = event.getEndTime();
    const duration = (end - start) / (1000 * 60);

    if (title.includes('Focus') || title.includes('Field')) {
      totalFocus += duration;
    } else {
      totalMeetings++;
    }

    // Check back-to-back
    if (lastEnd && start - lastEnd < prefs.meetingBufferBefore * 60000) {
      backToBack++;
    }
    lastEnd = end;
  }

  // Generate recommendations
  if (totalMeetings > prefs.maxMeetingsPerDay) {
    recommendations.push({
      type: 'warning',
      message: `You have ${totalMeetings} meetings today, exceeding your ${prefs.maxMeetingsPerDay} meeting limit. Consider rescheduling non-critical ones.`
    });
  }

  if (totalFocus < prefs.focusTimeMin) {
    recommendations.push({
      type: 'action',
      message: `Only ${totalFocus} minutes of focus time today. Consider blocking time for focused work.`
    });
  }

  if (backToBack > 0) {
    recommendations.push({
      type: 'warning',
      message: `${backToBack} back-to-back meeting(s) without buffer. You may feel rushed.`
    });
  }

  // Weather-based
  if (typeof getWeatherRecommendations === 'function') {
    const weather = getWeatherRecommendations();
    if (weather.success && weather.recommendations) {
      for (const rec of weather.recommendations) {
        if (rec.type === 'warning') {
          recommendations.push({
            type: 'weather',
            message: rec.message
          });
        }
      }
    }
  }

  return {
    success: true,
    date: Utilities.formatDate(now, 'America/New_York', 'EEEE, MMMM d'),
    summary: {
      totalEvents: events.length,
      meetings: totalMeetings,
      focusMinutes: totalFocus,
      backToBackMeetings: backToBack
    },
    recommendations: recommendations,
    events: events.map(e => ({
      title: e.getTitle(),
      start: Utilities.formatDate(e.getStartTime(), 'America/New_York', 'h:mm a'),
      end: Utilities.formatDate(e.getEndTime(), 'America/New_York', 'h:mm a'),
      duration: (e.getEndTime() - e.getStartTime()) / (1000 * 60)
    }))
  };
}

/**
 * Get calendar overview for AI context
 */
function getCalendarContext(days = 3) {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = calendar.getEvents(now, end);

  const context = {
    timeframe: `Next ${days} days`,
    events: events.map(e => ({
      title: e.getTitle(),
      date: Utilities.formatDate(e.getStartTime(), 'America/New_York', 'EEE MMM d'),
      time: Utilities.formatDate(e.getStartTime(), 'America/New_York', 'h:mm a'),
      duration: Math.round((e.getEndTime() - e.getStartTime()) / (1000 * 60)) + ' min'
    })),
    busyDays: [],
    freeDays: []
  };

  // Analyze by day
  const byDay = {};
  for (const e of events) {
    const date = Utilities.formatDate(e.getStartTime(), 'America/New_York', 'yyyy-MM-dd');
    byDay[date] = (byDay[date] || 0) + 1;
  }

  for (const [date, count] of Object.entries(byDay)) {
    if (count >= 4) {
      context.busyDays.push(date);
    } else if (count <= 1) {
      context.freeDays.push(date);
    }
  }

  return context;
}

// ==========================================
// RECURRING TASK MANAGEMENT
// ==========================================

/**
 * Set up recurring task
 */
function createRecurringTask(task) {
  const calendar = CalendarApp.getDefaultCalendar();

  // Calculate recurrence
  const recurrence = CalendarApp.newRecurrence();

  switch (task.frequency) {
    case 'daily':
      recurrence.addDailyRule().times(task.occurrences || 30);
      break;
    case 'weekly':
      recurrence.addWeeklyRule().onWeekday(
        getRecurrenceDays(task.days || [1, 2, 3, 4, 5])
      );
      break;
    case 'monthly':
      recurrence.addMonthlyRule().onMonthDay(task.dayOfMonth || 1);
      break;
  }

  const start = task.startTime || new Date();
  const end = new Date(start.getTime() + (task.duration_mins || 60) * 60000);

  const eventSeries = calendar.createEventSeries(
    `🔄 ${task.title}`,
    start,
    end,
    recurrence,
    {
      description: task.description || 'Recurring task created by Chief of Staff'
    }
  );

  return {
    success: true,
    eventSeriesId: eventSeries.getId(),
    title: task.title,
    frequency: task.frequency,
    startTime: start
  };
}

function getRecurrenceDays(days) {
  const dayMap = {
    0: CalendarApp.Weekday.SUNDAY,
    1: CalendarApp.Weekday.MONDAY,
    2: CalendarApp.Weekday.TUESDAY,
    3: CalendarApp.Weekday.WEDNESDAY,
    4: CalendarApp.Weekday.THURSDAY,
    5: CalendarApp.Weekday.FRIDAY,
    6: CalendarApp.Weekday.SATURDAY
  };

  return days.map(d => dayMap[d]);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Call Claude for calendar operations
 */
function callClaudeForCalendar(prompt) {
  if (typeof askClaudeEmail === 'function') {
    return askClaudeEmail(prompt, 'haiku');
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) throw new Error('Claude API key not configured');

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = JSON.parse(response.getContentText());
  return result.content[0].text;
}

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Get today's schedule via API
 */
function getTodaySchedule() {
  return optimizeTodaySchedule();
}

/**
 * Find meeting times via API
 */
function findMeetingSlots(duration, days) {
  return findMeetingTimes({ duration: duration || 30, days: days || 5 });
}

/**
 * Schedule task via API
 */
function scheduleTaskAPI(taskData) {
  return scheduleTask(taskData);
}

/**
 * Protect focus time via API
 */
function protectFocus(days) {
  return protectFocusTime(days || 7);
}
