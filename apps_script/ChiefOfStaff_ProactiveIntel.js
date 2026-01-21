// ═══════════════════════════════════════════════════════════════════════════
// CHIEF-OF-STAFF: PROACTIVE INTELLIGENCE
// Anticipates needs BEFORE you ask - knows what you should do before you do
// Created: 2026-01-21
// ═══════════════════════════════════════════════════════════════════════════

const PROACTIVE_ALERTS_SHEET = 'COS_PROACTIVE_ALERTS';
const PROACTIVE_RULES_SHEET = 'COS_PROACTIVE_RULES';

const PROACTIVE_ALERTS_HEADERS = [
  'Alert_ID', 'Alert_Type', 'Priority', 'Title', 'Message', 'Action_Suggested',
  'Data', 'Created_At', 'Expires_At', 'Status', 'Dismissed_By', 'Dismissed_At',
  'Action_Taken', 'Was_Useful'
];

const PROACTIVE_RULES_HEADERS = [
  'Rule_ID', 'Rule_Name', 'Rule_Type', 'Trigger_Condition', 'Action',
  'Priority', 'Enabled', 'Last_Triggered', 'Trigger_Count', 'Success_Count',
  'Created_At', 'Updated_At'
];

// ═══════════════════════════════════════════════════════════════════════════
// PROACTIVE SYSTEM INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initializeProactiveSystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  createSheetWithHeaders(ss, PROACTIVE_ALERTS_SHEET, PROACTIVE_ALERTS_HEADERS, '#D32F2F');
  createSheetWithHeaders(ss, PROACTIVE_RULES_SHEET, PROACTIVE_RULES_HEADERS, '#C62828');

  // Initialize default proactive rules
  initializeDefaultRules();

  return { success: true, message: 'Proactive intelligence system initialized' };
}

function initializeDefaultRules() {
  const defaultRules = [
    {
      name: 'Overdue Follow-up Alert',
      type: 'FOLLOW_UP',
      trigger: 'email_awaiting_response > 48h',
      action: 'Create alert to follow up',
      priority: 'HIGH'
    },
    {
      name: 'Customer At Risk',
      type: 'RELATIONSHIP',
      trigger: 'no_contact_with_customer > 30d AND total_orders > 2',
      action: 'Suggest reaching out to maintain relationship',
      priority: 'MEDIUM'
    },
    {
      name: 'Payment Reminder Due',
      type: 'FINANCIAL',
      trigger: 'invoice_unpaid > 25d',
      action: 'Send payment reminder',
      priority: 'HIGH'
    },
    {
      name: 'Vendor Order Needed',
      type: 'INVENTORY',
      trigger: 'seed_inventory < reorder_point',
      action: 'Suggest reorder from vendor',
      priority: 'MEDIUM'
    },
    {
      name: 'Weather Impact',
      type: 'FARMING',
      trigger: 'frost_warning AND greenhouse_open',
      action: 'Alert to protect crops',
      priority: 'CRITICAL'
    },
    {
      name: 'Busy Week Ahead',
      type: 'WORKLOAD',
      trigger: 'emails_this_week > avg_weekly * 1.5',
      action: 'Suggest scheduling focus time',
      priority: 'LOW'
    },
    {
      name: 'Unanswered Customer',
      type: 'CUSTOMER_SERVICE',
      trigger: 'customer_email_unanswered > 24h',
      action: 'Prioritize response',
      priority: 'HIGH'
    },
    {
      name: 'CSA Season Reminder',
      type: 'SEASONAL',
      trigger: 'date = csa_renewal_period AND members_not_renewed > 0',
      action: 'Send renewal reminders',
      priority: 'MEDIUM'
    }
  ];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PROACTIVE_RULES_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    defaultRules.forEach(rule => {
      createProactiveRule(rule);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROACTIVE SCANNING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all proactive checks - THE BRAIN
 * Call this every 15-30 minutes
 */
function runProactiveScanning() {
  const results = {
    scannedAt: new Date().toISOString(),
    alertsCreated: 0,
    checksRun: [],
    errors: []
  };

  try {
    // Check 1: Overdue follow-ups
    const followups = checkOverdueItems();
    results.checksRun.push({ check: 'overdue_followups', alerts: followups.alertsCreated });
    results.alertsCreated += followups.alertsCreated;

    // Check 2: Customers at risk
    const customers = checkCustomersAtRisk();
    results.checksRun.push({ check: 'customers_at_risk', alerts: customers.alertsCreated });
    results.alertsCreated += customers.alertsCreated;

    // Check 3: Unanswered emails (urgent)
    const unanswered = checkUnansweredEmails();
    results.checksRun.push({ check: 'unanswered_emails', alerts: unanswered.alertsCreated });
    results.alertsCreated += unanswered.alertsCreated;

    // Check 4: Workload prediction
    const workload = predictWorkload();
    results.checksRun.push({ check: 'workload_prediction', alerts: workload.alertsCreated });
    results.alertsCreated += workload.alertsCreated;

    // Check 5: Pattern-based suggestions
    const patterns = checkPatternBasedAlerts();
    results.checksRun.push({ check: 'pattern_alerts', alerts: patterns.alertsCreated });
    results.alertsCreated += patterns.alertsCreated;

    // Check 6: Calendar conflicts
    const calendar = checkCalendarConflicts();
    results.checksRun.push({ check: 'calendar_conflicts', alerts: calendar.alertsCreated });
    results.alertsCreated += calendar.alertsCreated;

  } catch (error) {
    results.errors.push(error.toString());
  }

  // Log to audit
  logChiefOfStaffAudit({
    agent: 'PROACTIVE',
    action: 'SCAN_COMPLETE',
    output: results
  });

  return { success: true, data: results };
}

/**
 * Check for overdue follow-ups
 */
function checkOverdueItems() {
  let alertsCreated = 0;

  // Check follow-ups from workflow engine
  const overdue = getOverdueFollowups();

  if (overdue.success && overdue.data) {
    overdue.data.forEach(item => {
      // Check if alert already exists
      if (!alertExists('FOLLOW_UP', item.threadid)) {
        createProactiveAlert({
          type: 'FOLLOW_UP',
          priority: 'HIGH',
          title: 'Overdue Follow-up',
          message: `No response received for ${item.overdueby || 'several days'}. Thread needs attention.`,
          actionSuggested: 'Send follow-up or close thread',
          data: { threadId: item.threadid, followupId: item.followupid }
        });
        alertsCreated++;
      }
    });
  }

  return { alertsCreated };
}

/**
 * Check for customers at risk of churning
 */
function checkCustomersAtRisk() {
  let alertsCreated = 0;

  // Get contacts that haven't been contacted in 30+ days with previous interactions
  const atRiskContacts = recallAllContacts({ atRisk: true });

  if (atRiskContacts.success && atRiskContacts.data) {
    atRiskContacts.data.slice(0, 5).forEach(contact => { // Limit to 5
      if (!alertExists('RELATIONSHIP', contact.email)) {
        const daysSince = Math.round((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24));
        createProactiveAlert({
          type: 'RELATIONSHIP',
          priority: 'MEDIUM',
          title: 'Customer At Risk',
          message: `No contact with ${contact.name || contact.email} in ${daysSince} days. They had ${contact.total_interactions} previous interactions.`,
          actionSuggested: 'Consider reaching out with a check-in email',
          data: { email: contact.email, name: contact.name, daysSince }
        });
        alertsCreated++;
      }
    });
  }

  return { alertsCreated };
}

/**
 * Check for unanswered customer emails
 */
function checkUnansweredEmails() {
  let alertsCreated = 0;

  // Get emails in NEW or TRIAGED status older than 24h
  const emails = getEmailsByStatus({ status: 'NEW,TRIAGED' });

  if (emails.success && emails.data) {
    const now = new Date();
    const threshold = 24 * 60 * 60 * 1000; // 24 hours

    emails.data.forEach(email => {
      const receivedAt = new Date(email.receivedat);
      const age = now - receivedAt;

      if (age > threshold && email.category === 'CUSTOMER') {
        if (!alertExists('CUSTOMER_SERVICE', email.threadid)) {
          const hoursOld = Math.round(age / (60 * 60 * 1000));
          createProactiveAlert({
            type: 'CUSTOMER_SERVICE',
            priority: email.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title: 'Customer Waiting',
            message: `${email.fromname || email.from} has been waiting ${hoursOld} hours for a response. Subject: "${email.subject}"`,
            actionSuggested: 'Respond to customer email',
            data: { threadId: email.threadid, subject: email.subject, from: email.from }
          });
          alertsCreated++;
        }
      }
    });
  }

  return { alertsCreated };
}

/**
 * Predict workload and suggest actions
 */
function predictWorkload() {
  let alertsCreated = 0;

  // Count emails by day for the past 2 weeks
  const emails = getEmailsByStatus({ status: 'NEW,TRIAGED,AWAITING_RESPONSE,AWAITING_THEM,RESOLVED', limit: 500 });

  if (emails.success && emails.data) {
    const dailyCounts = {};
    const now = new Date();
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    emails.data.forEach(email => {
      const date = new Date(email.receivedat);
      if (date >= twoWeeksAgo) {
        const dayKey = date.toISOString().split('T')[0];
        dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
      }
    });

    const counts = Object.values(dailyCounts);
    const avgDaily = counts.reduce((a, b) => a + b, 0) / (counts.length || 1);

    // Check today's count
    const todayKey = now.toISOString().split('T')[0];
    const todayCount = dailyCounts[todayKey] || 0;

    if (todayCount > avgDaily * 1.5 && todayCount > 10) {
      if (!alertExists('WORKLOAD', todayKey)) {
        createProactiveAlert({
          type: 'WORKLOAD',
          priority: 'LOW',
          title: 'High Volume Day',
          message: `Today's email volume (${todayCount}) is ${Math.round(((todayCount / avgDaily) - 1) * 100)}% above average (${Math.round(avgDaily)}). Consider scheduling extra email time.`,
          actionSuggested: 'Block 30 minutes for focused email processing',
          data: { todayCount, avgDaily: Math.round(avgDaily) }
        });
        alertsCreated++;
      }
    }
  }

  return { alertsCreated };
}

/**
 * Check pattern-based alerts from memory
 */
function checkPatternBasedAlerts() {
  let alertsCreated = 0;

  const patterns = getActivePatterns(0.7);

  if (patterns.success && patterns.data) {
    patterns.data.forEach(pattern => {
      if (pattern.recommended_action && pattern.auto_action_enabled) {
        // Check if this pattern suggests we should take action now
        const daysSinceLast = Math.round((new Date() - new Date(pattern.last_occurred)) / (1000 * 60 * 60 * 24));

        // If pattern hasn't been addressed in a while, suggest action
        if (daysSinceLast > 3 && pattern.confidence > 0.7) {
          if (!alertExists('PATTERN', pattern.pattern_id)) {
            createProactiveAlert({
              type: 'PATTERN',
              priority: 'LOW',
              title: pattern.pattern_name,
              message: pattern.description || 'Recurring pattern detected',
              actionSuggested: pattern.recommended_action,
              data: { patternId: pattern.pattern_id, confidence: pattern.confidence }
            });
            alertsCreated++;
          }
        }
      }
    });
  }

  return { alertsCreated };
}

/**
 * Check for calendar conflicts
 */
function checkCalendarConflicts() {
  let alertsCreated = 0;

  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events = calendar.getEvents(now, tomorrow);

    // Check for overlapping events
    for (let i = 0; i < events.length - 1; i++) {
      const event1 = events[i];
      const event2 = events[i + 1];

      if (event1.getEndTime() > event2.getStartTime()) {
        const conflictKey = event1.getId() + ':' + event2.getId();
        if (!alertExists('CALENDAR_CONFLICT', conflictKey)) {
          createProactiveAlert({
            type: 'CALENDAR_CONFLICT',
            priority: 'MEDIUM',
            title: 'Schedule Conflict',
            message: `"${event1.getTitle()}" overlaps with "${event2.getTitle()}" at ${event2.getStartTime().toLocaleTimeString()}`,
            actionSuggested: 'Reschedule one of the events',
            data: {
              event1: { title: event1.getTitle(), time: event1.getStartTime().toISOString() },
              event2: { title: event2.getTitle(), time: event2.getStartTime().toISOString() }
            }
          });
          alertsCreated++;
        }
      }
    }

    // Check for days with no focus time
    const workStart = 6;
    const workEnd = 18;
    let meetingMinutes = 0;

    events.forEach(e => {
      if (!e.isAllDayEvent()) {
        meetingMinutes += (e.getEndTime() - e.getStartTime()) / (1000 * 60);
      }
    });

    const workMinutes = (workEnd - workStart) * 60;
    if (meetingMinutes > workMinutes * 0.7) {
      if (!alertExists('NO_FOCUS_TIME', now.toISOString().split('T')[0])) {
        createProactiveAlert({
          type: 'WORKLOAD',
          priority: 'MEDIUM',
          title: 'Heavy Meeting Day',
          message: `Tomorrow has ${Math.round(meetingMinutes / 60)} hours of meetings (${Math.round(meetingMinutes / workMinutes * 100)}% of work day). Limited focus time available.`,
          actionSuggested: 'Consider rescheduling non-critical meetings or doing email tonight',
          data: { meetingHours: Math.round(meetingMinutes / 60) }
        });
        alertsCreated++;
      }
    }

  } catch (error) {
    // Calendar access might fail, that's ok
  }

  return { alertsCreated };
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a proactive alert
 */
function createProactiveAlert(alertData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);

  if (!sheet) {
    initializeProactiveSystem();
    sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);
  }

  const alertId = 'ALERT-' + Utilities.getUuid().substring(0, 8);
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const rowData = [
    alertId,
    alertData.type,
    alertData.priority || 'MEDIUM',
    alertData.title,
    alertData.message,
    alertData.actionSuggested || '',
    JSON.stringify(alertData.data || {}),
    now.toISOString(),
    expires.toISOString(),
    'ACTIVE',
    '', // Dismissed by
    '', // Dismissed at
    '', // Action taken
    null // Was useful
  ];

  sheet.appendRow(rowData);

  return { success: true, alertId };
}

/**
 * Get active alerts
 */
function getActiveAlerts(priority = null) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const statusCol = headers.indexOf('Status');
  const priorityCol = headers.indexOf('Priority');
  const expiresCol = headers.indexOf('Expires_At');
  const now = new Date();

  const alerts = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (row[statusCol] !== 'ACTIVE') continue;
    if (new Date(row[expiresCol]) < now) continue;
    if (priority && row[priorityCol] !== priority) continue;

    const alert = {};
    headers.forEach((h, idx) => {
      let value = row[idx];
      if (h === 'Data') {
        try { value = JSON.parse(value || '{}'); } catch(e) { value = {}; }
      }
      alert[h.toLowerCase()] = value;
    });

    alerts.push(alert);
  }

  // Sort by priority
  const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  alerts.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

  return { success: true, data: alerts, count: alerts.length };
}

/**
 * Dismiss an alert
 */
function dismissAlert(alertId, userId, actionTaken = '', wasUseful = null) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);

  if (!sheet) return { success: false, error: 'System not initialized' };

  const row = findAlertById(sheet, alertId);
  if (!row) return { success: false, error: 'Alert not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  const dismissedByCol = headers.indexOf('Dismissed_By') + 1;
  const dismissedAtCol = headers.indexOf('Dismissed_At') + 1;
  const actionCol = headers.indexOf('Action_Taken') + 1;
  const usefulCol = headers.indexOf('Was_Useful') + 1;

  sheet.getRange(row, statusCol).setValue('DISMISSED');
  sheet.getRange(row, dismissedByCol).setValue(userId || 'USER');
  sheet.getRange(row, dismissedAtCol).setValue(new Date().toISOString());
  sheet.getRange(row, actionCol).setValue(actionTaken);
  sheet.getRange(row, usefulCol).setValue(wasUseful);

  return { success: true, message: 'Alert dismissed' };
}

/**
 * Check if alert already exists for this item
 */
function alertExists(type, identifier) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PROACTIVE_ALERTS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) return false;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const typeCol = headers.indexOf('Alert_Type');
  const dataCol = headers.indexOf('Data');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][typeCol] === type && data[i][statusCol] === 'ACTIVE') {
      try {
        const alertData = JSON.parse(data[i][dataCol] || '{}');
        if (JSON.stringify(alertData).includes(identifier)) {
          return true;
        }
      } catch(e) {}
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROACTIVE RULES
// ═══════════════════════════════════════════════════════════════════════════

function createProactiveRule(ruleData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(PROACTIVE_RULES_SHEET);

  if (!sheet) {
    initializeProactiveSystem();
    sheet = ss.getSheetByName(PROACTIVE_RULES_SHEET);
  }

  const ruleId = 'RULE-' + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  const rowData = [
    ruleId,
    ruleData.name,
    ruleData.type,
    ruleData.trigger,
    ruleData.action,
    ruleData.priority || 'MEDIUM',
    true, // Enabled
    '', // Last triggered
    0, // Trigger count
    0, // Success count
    now,
    now
  ];

  sheet.appendRow(rowData);
  return { success: true, ruleId };
}

// ═══════════════════════════════════════════════════════════════════════════
// MORNING INTELLIGENCE BRIEF
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the Morning Intelligence Brief
 * The proactive "what you should do today" summary
 */
function generateMorningBrief() {
  const brief = {
    generatedAt: new Date().toISOString(),
    greeting: getTimeBasedGreeting(),
    summary: {},
    criticalAlerts: [],
    priorityActions: [],
    insights: [],
    schedule: [],
    suggestions: []
  };

  // Run proactive scanning first
  runProactiveScanning();

  // Get active alerts
  const alerts = getActiveAlerts();
  if (alerts.success && Array.isArray(alerts.data)) {
    brief.criticalAlerts = alerts.data.filter(a => a.priority === 'CRITICAL');
    brief.summary.totalAlerts = alerts.count || 0;
    brief.summary.criticalCount = brief.criticalAlerts.length;
  } else {
    brief.criticalAlerts = [];
    brief.summary.totalAlerts = 0;
    brief.summary.criticalCount = 0;
  }

  // Get email status
  const emails = getEmailsByStatus({ status: 'NEW,TRIAGED' });
  if (emails.success && Array.isArray(emails.data)) {
    brief.summary.inboxCount = emails.count || 0;
    brief.summary.urgentEmails = emails.data.filter(e => e.priority === 'CRITICAL' || e.priority === 'HIGH').length;

    // Top priority emails
    brief.priorityActions = emails.data
      .filter(e => e.priority === 'CRITICAL' || e.priority === 'HIGH')
      .slice(0, 5)
      .map(e => ({
        type: 'EMAIL',
        priority: e.priority,
        subject: e.subject,
        from: e.fromname || e.from,
        summary: e.aisummary,
        threadId: e.threadid
      }));
  } else {
    brief.summary.inboxCount = 0;
    brief.summary.urgentEmails = 0;
    brief.priorityActions = [];
  }

  // Get pending approvals
  const approvals = getPendingApprovals();
  if (approvals.success && Array.isArray(approvals.data)) {
    brief.summary.pendingApprovals = approvals.count || 0;

    approvals.data.slice(0, 3).forEach(a => {
      brief.priorityActions.push({
        type: 'APPROVAL',
        priority: 'MEDIUM',
        description: a.actiontype + ': ' + (a.draftcontent || '').substring(0, 50),
        actionId: a.actionid,
        expiresIn: a.timeRemaining
      });
    });
  } else {
    brief.summary.pendingApprovals = 0;
  }

  // Get overdue follow-ups
  const overdue = getOverdueFollowups();
  if (overdue.success && Array.isArray(overdue.data)) {
    brief.summary.overdueCount = overdue.count || 0;

    overdue.data.slice(0, 3).forEach(f => {
      brief.priorityActions.push({
        type: 'FOLLOW_UP',
        priority: 'HIGH',
        description: 'Overdue by ' + f.overdueby,
        threadId: f.threadid
      });
    });
  } else {
    brief.summary.overdueCount = 0;
  }

  // Get proactive suggestions
  const suggestions = getProactiveSuggestions();
  if (suggestions.success) {
    brief.suggestions = suggestions.data;
  }

  // Get today's calendar
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59);

    const events = calendar.getEvents(now, endOfDay);
    brief.schedule = events.map(e => ({
      title: e.getTitle(),
      startTime: e.getStartTime().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: e.getEndTime().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      allDay: e.isAllDayEvent()
    }));
    brief.summary.meetingsToday = events.length;
  } catch(e) {
    brief.schedule = [];
  }

  // Generate insights
  brief.insights = generateInsights(brief);

  return { success: true, data: brief };
}

/**
 * Get time-based greeting
 */
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Generate insights from data
 */
function generateInsights(brief) {
  const insights = [];

  if (brief.summary.criticalCount > 0) {
    insights.push({
      type: 'WARNING',
      message: `${brief.summary.criticalCount} critical item(s) need immediate attention`
    });
  }

  if (brief.summary.overdueCount > 3) {
    insights.push({
      type: 'TREND',
      message: `Multiple overdue follow-ups (${brief.summary.overdueCount}). Consider blocking time to clear backlog.`
    });
  }

  if (brief.summary.meetingsToday > 4) {
    insights.push({
      type: 'SCHEDULE',
      message: `Busy day with ${brief.summary.meetingsToday} meetings. Limited time for email.`
    });
  }

  if (brief.summary.pendingApprovals > 5) {
    insights.push({
      type: 'BACKLOG',
      message: `${brief.summary.pendingApprovals} actions waiting for approval. Quick review recommended.`
    });
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function findAlertById(sheet, alertId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === alertId) return i + 2;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRIGGERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Setup proactive scanning triggers
 */
function setupProactiveTriggers() {
  const triggers = ScriptApp.getProjectTriggers();

  // Remove existing proactive triggers
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'runProactiveScanning') {
      ScriptApp.deleteTrigger(trigger);
    }
    if (trigger.getHandlerFunction() === 'generateMorningBrief') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Proactive scanning every 30 minutes
  ScriptApp.newTrigger('runProactiveScanning')
    .timeBased()
    .everyMinutes(30)
    .create();

  // Morning brief at 6 AM
  ScriptApp.newTrigger('generateMorningBrief')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  return { success: true, message: 'Proactive triggers created' };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST
// ═══════════════════════════════════════════════════════════════════════════

function testProactiveIntelligence() {
  Logger.log('=== TESTING PROACTIVE INTELLIGENCE ===');

  Logger.log('1. Initializing...');
  initializeProactiveSystem();

  Logger.log('2. Running proactive scan...');
  const scan = runProactiveScanning();
  Logger.log('   Alerts created: ' + scan.data.alertsCreated);

  Logger.log('3. Getting active alerts...');
  const alerts = getActiveAlerts();
  Logger.log('   Active alerts: ' + alerts.count);

  Logger.log('4. Generating morning brief...');
  const brief = generateMorningBrief();
  Logger.log('   ' + brief.data.greeting);
  Logger.log('   Inbox: ' + brief.data.summary.inboxCount);
  Logger.log('   Critical: ' + brief.data.summary.criticalCount);

  Logger.log('=== PROACTIVE INTELLIGENCE TEST COMPLETE ===');

  return { success: true };
}
