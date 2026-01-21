/**
 * ========================================
 * CHIEF OF STAFF - MASTER ORCHESTRATOR
 * ========================================
 *
 * THE BRAIN - Coordinates all 10 state-of-the-art modules
 *
 * Modules:
 * 1. Memory - Persistent context
 * 2. StyleMimicry - Email voice matching
 * 3. ProactiveIntel - Anticipation engine
 * 4. Voice - Hands-free interface
 * 5. MultiAgent - Specialized AI agents
 * 6. FileOrg - Document management
 * 7. Integrations - WhatsApp, QuickBooks, Weather
 * 8. Calendar - Smart scheduling
 * 9. Predictive - Pattern forecasting
 * 10. Autonomy - Trust-based automation
 *
 * @author Claude PM_Architect
 * @version 1.0.0 STATE-OF-THE-ART
 * @date 2026-01-21
 */

// ==========================================
// SYSTEM INITIALIZATION
// ==========================================

/**
 * Initialize the COMPLETE Chief of Staff system
 * Run this once to set up everything
 */
function initializeChiefOfStaffComplete() {
  const results = {
    timestamp: new Date().toISOString(),
    modules: {}
  };

  // 1. Core email system
  try {
    if (typeof initializeChiefOfStaffSheets === 'function') {
      results.modules.core = initializeChiefOfStaffSheets();
    } else {
      results.modules.core = { status: 'function_not_found' };
    }
  } catch (e) {
    results.modules.core = { error: e.message };
  }

  // 2. Memory system
  try {
    if (typeof initializeMemorySystem === 'function') {
      results.modules.memory = initializeMemorySystem();
    } else {
      results.modules.memory = { status: 'pending_deployment' };
    }
  } catch (e) {
    results.modules.memory = { error: e.message };
  }

  // 3. File organization
  try {
    if (typeof initializeFileOrganization === 'function') {
      results.modules.files = initializeFileOrganization();
    } else {
      results.modules.files = { status: 'pending_deployment' };
    }
  } catch (e) {
    results.modules.files = { error: e.message };
  }

  // 4. Calendar AI
  try {
    if (typeof initializeCalendarAI === 'function') {
      results.modules.calendar = initializeCalendarAI();
    } else {
      results.modules.calendar = { status: 'pending_deployment' };
    }
  } catch (e) {
    results.modules.calendar = { error: e.message };
  }

  // 5. Predictive analytics
  try {
    if (typeof initializePredictiveAnalytics === 'function') {
      results.modules.predictive = initializePredictiveAnalytics();
    } else {
      results.modules.predictive = { status: 'pending_deployment' };
    }
  } catch (e) {
    results.modules.predictive = { error: e.message };
  }

  // 6. Autonomy system
  try {
    if (typeof initializeAutonomySystem === 'function') {
      results.modules.autonomy = initializeAutonomySystem();
    } else {
      results.modules.autonomy = { status: 'pending_deployment' };
    }
  } catch (e) {
    results.modules.autonomy = { error: e.message };
  }

  // Count successes
  results.summary = {
    total: 6,
    initialized: Object.values(results.modules).filter(m => m.success || m.status === 'pending_deployment').length,
    errors: Object.values(results.modules).filter(m => m.error).length
  };

  return results;
}

// ==========================================
// MASTER MORNING BRIEF
// ==========================================

/**
 * Generate THE ULTIMATE morning brief
 * Combines all system insights
 */
function generateUltimateMorningBrief() {
  const brief = {
    generated_at: new Date().toISOString(),
    greeting: getTimeBasedGreeting(),
    sections: {}
  };

  // 1. Proactive Alerts (most important)
  try {
    if (typeof generateMorningBrief === 'function') {
      brief.sections.proactive = generateMorningBrief();
    }
  } catch (e) {
    brief.sections.proactive = { error: e.message };
  }

  // 2. Email Overview
  try {
    if (typeof getDailyBrief === 'function') {
      brief.sections.email = getDailyBrief();
    }
  } catch (e) {
    brief.sections.email = { error: e.message };
  }

  // 3. Calendar Overview
  try {
    if (typeof optimizeTodaySchedule === 'function') {
      brief.sections.calendar = optimizeTodaySchedule();
    }
  } catch (e) {
    brief.sections.calendar = { error: e.message };
  }

  // 4. Weather & Field Recommendations
  try {
    if (typeof getWeatherRecommendations === 'function') {
      brief.sections.weather = getWeatherRecommendations();
    }
  } catch (e) {
    brief.sections.weather = { error: e.message };
  }

  // 5. Workload Forecast
  try {
    if (typeof forecastWorkload === 'function') {
      brief.sections.workload = forecastWorkload(3);
    }
  } catch (e) {
    brief.sections.workload = { error: e.message };
  }

  // 6. Churn Risk Alerts
  try {
    if (typeof predictCustomerChurn === 'function') {
      const churn = predictCustomerChurn();
      brief.sections.churn = {
        highRiskCount: churn.highRisk || 0,
        topAtRisk: (churn.customers || []).slice(0, 3)
      };
    }
  } catch (e) {
    brief.sections.churn = { error: e.message };
  }

  // 7. Pending Approvals
  try {
    if (typeof getPendingApprovals === 'function') {
      const approvals = getPendingApprovals();
      const approvalsData = Array.isArray(approvals?.data) ? approvals.data :
                           Array.isArray(approvals) ? approvals : [];
      brief.sections.approvals = {
        count: approvalsData.length || approvals?.count || 0,
        urgent: approvalsData.filter(a => a.priority === 'high' || a.priority === 'HIGH').length
      };
    }
  } catch (e) {
    brief.sections.approvals = { error: e.message };
  }

  // Generate spoken summary
  brief.spoken_summary = generateSpokenBrief(brief);

  // Generate priority actions
  brief.priority_actions = generatePriorityActions(brief);

  return brief;
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function generateSpokenBrief(brief) {
  let spoken = brief.greeting + ' Here\'s your daily brief. ';

  // Critical items
  if (brief.sections.proactive?.critical?.length > 0) {
    spoken += `You have ${brief.sections.proactive.critical.length} critical items requiring attention. `;
  }

  // Emails
  if (brief.sections.email?.stats) {
    const stats = brief.sections.email.stats;
    spoken += `${stats.pending_emails || 0} emails need review. `;
  }

  // Approvals
  if (brief.sections.approvals?.count > 0) {
    spoken += `${brief.sections.approvals.count} actions awaiting your approval. `;
  }

  // Calendar
  if (brief.sections.calendar?.summary) {
    spoken += `You have ${brief.sections.calendar.summary.meetings || 0} meetings today. `;
  }

  // Weather
  if (brief.sections.weather?.summary) {
    spoken += brief.sections.weather.summary + ' ';
  }

  // Churn
  if (brief.sections.churn?.highRiskCount > 0) {
    spoken += `${brief.sections.churn.highRiskCount} customers at high churn risk. `;
  }

  return spoken;
}

function generatePriorityActions(brief) {
  const actions = [];

  // From proactive alerts
  if (brief.sections.proactive?.critical) {
    for (const alert of brief.sections.proactive.critical.slice(0, 3)) {
      actions.push({
        priority: 1,
        action: alert.suggested_action || alert.description,
        source: 'proactive'
      });
    }
  }

  // Urgent approvals
  if (brief.sections.approvals?.urgent > 0) {
    actions.push({
      priority: 2,
      action: `Review ${brief.sections.approvals.urgent} urgent approval(s)`,
      source: 'approvals'
    });
  }

  // High churn customers
  if (brief.sections.churn?.topAtRisk?.length > 0) {
    actions.push({
      priority: 3,
      action: `Reach out to at-risk customer: ${brief.sections.churn.topAtRisk[0].name}`,
      source: 'churn'
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

// ==========================================
// UNIFIED PROCESSING PIPELINE
// ==========================================

/**
 * Process an incoming email through the FULL system
 */
function processEmailComplete(threadId) {
  const startTime = new Date();
  const results = {
    threadId: threadId,
    stages: {}
  };

  try {
    const thread = GmailApp.getThreadById(threadId);
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];

    // Stage 1: Gather context
    results.stages.context = {
      from: lastMessage.getFrom(),
      subject: thread.getFirstMessageSubject(),
      date: lastMessage.getDate()
    };

    // Stage 2: Memory lookup
    try {
      if (typeof recallContact === 'function') {
        results.stages.memory = recallContact(results.stages.context.from);
      }
    } catch (e) {}

    // Stage 3: Multi-agent processing
    try {
      if (typeof orchestrateTask === 'function') {
        results.stages.agents = orchestrateTask({
          type: 'email_process',
          threadId: threadId,
          email: results.stages.context
        });
      }
    } catch (e) {}

    // Stage 4: Check autonomy
    try {
      if (typeof checkActionPermission === 'function') {
        results.stages.autonomy = checkActionPermission('email_draft', {
          is_first_contact: !results.stages.memory,
          is_vip_customer: results.stages.memory?.is_vip
        });
      }
    } catch (e) {}

    // Stage 5: Generate styled response
    try {
      if (typeof applyStyleToDraft === 'function' && results.stages.agents?.synthesis?.draft) {
        results.stages.styled_draft = applyStyleToDraft(
          results.stages.agents.synthesis.draft,
          results.stages.memory?.contact_type || 'customer'
        );
      }
    } catch (e) {}

    // Stage 6: Process attachments
    try {
      if (typeof processEmailAttachments === 'function') {
        results.stages.attachments = processEmailAttachments(threadId);
      }
    } catch (e) {}

    // Stage 7: Update memory
    try {
      if (typeof rememberContact === 'function') {
        rememberContact({
          email: results.stages.context.from,
          last_interaction: new Date().toISOString(),
          last_subject: results.stages.context.subject
        });
      }
    } catch (e) {}

    results.success = true;
    results.duration_ms = new Date() - startTime;

  } catch (error) {
    results.success = false;
    results.error = error.message;
  }

  return results;
}

// ==========================================
// UNIFIED VOICE HANDLER
// ==========================================

/**
 * Handle voice command through all systems
 */
function handleVoiceCommandComplete(transcript) {
  // Use voice module
  if (typeof parseVoiceCommand === 'function') {
    const result = parseVoiceCommand(transcript);

    // Enhance with memory context
    if (result.success && typeof buildCompleteContext === 'function') {
      result.context = buildCompleteContext({});
    }

    return result;
  }

  return { success: false, error: 'Voice module not available' };
}

// ==========================================
// SCHEDULED JOBS
// ==========================================

/**
 * Run all scheduled maintenance tasks
 */
function runScheduledMaintenance() {
  const results = {
    timestamp: new Date().toISOString(),
    tasks: {}
  };

  // 1. Proactive scanning
  try {
    if (typeof runProactiveScanning === 'function') {
      results.tasks.proactive = runProactiveScanning();
    }
  } catch (e) {
    results.tasks.proactive = { error: e.message };
  }

  // 2. Collect daily metrics
  try {
    if (typeof collectDailyMetrics === 'function') {
      results.tasks.metrics = collectDailyMetrics();
    }
  } catch (e) {
    results.tasks.metrics = { error: e.message };
  }

  // 3. Detect patterns
  try {
    if (typeof detectSeasonalPatterns === 'function') {
      results.tasks.patterns = detectSeasonalPatterns();
    }
  } catch (e) {
    results.tasks.patterns = { error: e.message };
  }

  // 4. Protect focus time
  try {
    if (typeof protectFocusTime === 'function') {
      results.tasks.focus = protectFocusTime(7);
    }
  } catch (e) {
    results.tasks.focus = { error: e.message };
  }

  // 5. Sync QuickBooks
  try {
    if (typeof syncQuickBooksInvoices === 'function') {
      results.tasks.quickbooks = syncQuickBooksInvoices();
    }
  } catch (e) {
    results.tasks.quickbooks = { error: e.message };
  }

  return results;
}

/**
 * Set up all triggers
 */
function setupAllTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction().startsWith('cos_') ||
        trigger.getHandlerFunction().startsWith('runScheduled')) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Morning brief - 6 AM
  ScriptApp.newTrigger('cos_morningBrief')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // Proactive scanning - every 2 hours
  ScriptApp.newTrigger('cos_proactiveScan')
    .timeBased()
    .everyHours(2)
    .create();

  // Daily metrics - 11 PM
  ScriptApp.newTrigger('cos_dailyMetrics')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .create();

  // Weekly pattern detection - Sunday 3 AM
  ScriptApp.newTrigger('cos_weeklyPatterns')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(3)
    .create();

  return { success: true, triggers: ScriptApp.getProjectTriggers().length };
}

// Trigger handlers
function cos_morningBrief() {
  const brief = generateUltimateMorningBrief();
  // Could send email or notification here
  console.log('Morning brief generated:', JSON.stringify(brief.priority_actions));
}

function cos_proactiveScan() {
  if (typeof runProactiveScanning === 'function') {
    runProactiveScanning();
  }
}

function cos_dailyMetrics() {
  if (typeof collectDailyMetrics === 'function') {
    collectDailyMetrics();
  }
}

function cos_weeklyPatterns() {
  if (typeof detectSeasonalPatterns === 'function') {
    detectSeasonalPatterns();
  }
}

// ==========================================
// SYSTEM HEALTH & VERIFICATION
// ==========================================

/**
 * Run complete system verification
 */
function verifySystemComplete() {
  const verification = {
    timestamp: new Date().toISOString(),
    version: '1.0.0 STATE-OF-THE-ART',
    modules: {},
    sheets: {},
    api: {},
    score: 0,
    maxScore: 0
  };

  // Check modules
  const moduleChecks = [
    { name: 'Memory', func: 'initializeMemorySystem' },
    { name: 'StyleMimicry', func: 'analyzeOwnerStyle' },
    { name: 'ProactiveIntel', func: 'runProactiveScanning' },
    { name: 'Voice', func: 'parseVoiceCommand' },
    { name: 'MultiAgent', func: 'orchestrateTask' },
    { name: 'FileOrg', func: 'initializeFileOrganization' },
    { name: 'Integrations', func: 'getIntegrationStatus' },
    { name: 'Calendar', func: 'initializeCalendarAI' },
    { name: 'Predictive', func: 'initializePredictiveAnalytics' },
    { name: 'Autonomy', func: 'initializeAutonomySystem' }
  ];

  for (const check of moduleChecks) {
    verification.maxScore += 10;
    try {
      const exists = typeof eval(check.func) === 'function';
      verification.modules[check.name] = {
        exists: exists,
        status: exists ? 'ready' : 'not_deployed'
      };
      if (exists) verification.score += 10;
    } catch (e) {
      verification.modules[check.name] = {
        exists: false,
        status: 'error',
        error: e.message
      };
    }
  }

  // Check sheets
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = [
    'EMAIL_INBOX_STATE',
    'EMAIL_ACTIONS',
    'CHIEF_OF_STAFF_AUDIT',
    'COS_MEMORY_CONTACTS',
    'COS_STYLE_PROFILE',
    'COS_PROACTIVE_ALERTS',
    'COS_FILE_INDEX',
    'COS_CALENDAR_PREFS',
    'COS_PREDICTIONS',
    'COS_AUTONOMY_PERMISSIONS'
  ];

  for (const sheetName of requiredSheets) {
    verification.maxScore += 5;
    const exists = ss.getSheetByName(sheetName) !== null;
    verification.sheets[sheetName] = exists;
    if (exists) verification.score += 5;
  }

  // Check API endpoints
  const apiChecks = [
    'getMorningBrief',
    'getPendingApprovals',
    'triageInbox',
    'getProactiveSuggestions'
  ];

  for (const api of apiChecks) {
    verification.maxScore += 5;
    try {
      const exists = typeof eval(api) === 'function';
      verification.api[api] = exists;
      if (exists) verification.score += 5;
    } catch (e) {
      verification.api[api] = false;
    }
  }

  // Calculate percentage
  verification.percentage = Math.round((verification.score / verification.maxScore) * 100);
  verification.status = verification.percentage >= 80 ? 'OPERATIONAL' :
                       verification.percentage >= 50 ? 'PARTIAL' : 'NEEDS_SETUP';

  return verification;
}

/**
 * Get system status dashboard data
 */
function getSystemDashboard() {
  return {
    verification: verifySystemComplete(),
    brief: generateUltimateMorningBrief(),
    autonomy: typeof getAutonomyStatus === 'function' ? getAutonomyStatus() : null,
    predictions: typeof getPredictionAccuracy === 'function' ? getPredictionAccuracy() : null,
    integrations: typeof getIntegrationStatus === 'function' ? getIntegrationStatus() : null
  };
}

// ==========================================
// API ROUTER (Add to MERGED TOTAL.js)
// ==========================================

/**
 * Route API requests to Chief of Staff modules
 */
function routeChiefOfStaffAPI(action, params) {
  const routes = {
    // Master
    initializeComplete: () => initializeChiefOfStaffComplete(),
    getMorningBrief: () => generateUltimateMorningBrief(),
    processEmail: () => processEmailComplete(params.threadId),
    voiceCommand: () => handleVoiceCommandComplete(params.transcript),
    runMaintenance: () => runScheduledMaintenance(),
    verifySystem: () => verifySystemComplete(),
    getDashboard: () => getSystemDashboard(),

    // Memory
    rememberContact: () => rememberContact(params.data),
    recallContact: () => recallContact(params.email),
    getContext: () => buildCompleteContext(params),

    // Style
    analyzeStyle: () => analyzeOwnerStyle(params.maxEmails),
    getStylePrompt: () => getStylePrompt(),
    applyStyle: () => applyStyleToDraft(params.draft, params.type),

    // Proactive
    runProactive: () => runProactiveScanning(),
    getAlerts: () => getActiveAlerts(params.priority),

    // Voice
    parseVoice: () => parseVoiceCommand(params.transcript),

    // Agents
    runAgent: () => runAgentTask(params.agent, params.task),
    orchestrate: () => orchestrateTask(params.task),
    getAgents: () => getAvailableAgents(),

    // Files
    organizeFile: () => organizeFile(params.fileId),
    searchFiles: () => searchFilesNaturalLanguage(params.query),
    getFileStats: () => getFileOrganizationStats(),

    // Integrations
    sendSMS: () => sendSMS(params.to, params.message),
    sendWhatsApp: () => sendWhatsApp(params.to, params.message),
    getWeather: () => getCurrentWeather(),
    getWeatherForecast: () => getWeatherForecast(params.days),
    trackPackage: () => trackPackage(params.tracking),
    syncQuickBooks: () => syncQuickBooksInvoices(),
    getIntegrationStatus: () => getIntegrationStatus(),

    // Calendar
    getTodaySchedule: () => optimizeTodaySchedule(),
    findMeetingTimes: () => findMeetingTimes(params),
    scheduleTask: () => scheduleTask(params.task),
    protectFocus: () => protectFocusTime(params.days),

    // Predictive
    predictEmails: () => predictEmailVolume(params.days),
    predictChurn: () => predictCustomerChurn(),
    getWorkloadForecast: () => forecastWorkload(params.days),
    getPredictiveReport: () => getPredictiveReport(),

    // Autonomy
    checkPermission: () => checkActionPermission(params.action, params.context),
    executeAuto: () => executeWithAutonomy(params.action, params.params, params.context),
    setAutonomy: () => setAutonomyLevel(params.action, params.level),
    undoAction: () => undoAction(params.executionId),
    getAutonomyStatus: () => getAutonomyStatus()
  };

  const handler = routes[action];
  if (!handler) {
    return { success: false, error: `Unknown action: ${action}` };
  }

  try {
    return { success: true, data: handler() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
