// ═══════════════════════════════════════════════════════════════════════════
// CHIEF-OF-STAFF: PERSISTENT MEMORY SYSTEM
// Long-term memory that NEVER forgets
// Created: 2026-01-21
// ═══════════════════════════════════════════════════════════════════════════

// Sheet names for memory system
const MEMORY_CONTACTS_SHEET = 'COS_MEMORY_CONTACTS';
const MEMORY_DECISIONS_SHEET = 'COS_MEMORY_DECISIONS';
const MEMORY_PATTERNS_SHEET = 'COS_MEMORY_PATTERNS';
const MEMORY_PREFERENCES_SHEET = 'COS_MEMORY_PREFERENCES';
const MEMORY_RELATIONSHIPS_SHEET = 'COS_MEMORY_RELATIONSHIPS';

// Headers for memory sheets
const MEMORY_CONTACTS_HEADERS = [
  'Contact_ID', 'Email', 'Name', 'Company', 'Type', 'First_Contact_Date',
  'Last_Contact_Date', 'Total_Interactions', 'Response_Time_Avg_Hours',
  'Topics_Discussed', 'Sentiment_History', 'Important_Dates', 'Notes',
  'Preferred_Contact_Method', 'Timezone', 'Communication_Style',
  'VIP_Status', 'Risk_Score', 'Last_Updated'
];

const MEMORY_DECISIONS_HEADERS = [
  'Decision_ID', 'Date', 'Context', 'Decision_Made', 'Reasoning',
  'Outcome', 'Outcome_Date', 'Was_Correct', 'Learnings',
  'Related_Contact_ID', 'Related_Thread_ID', 'Tags'
];

const MEMORY_PATTERNS_HEADERS = [
  'Pattern_ID', 'Pattern_Type', 'Pattern_Name', 'Description',
  'Frequency', 'Last_Occurred', 'Confidence', 'Data_Points',
  'Recommended_Action', 'Auto_Action_Enabled', 'Created_At', 'Updated_At'
];

const MEMORY_PREFERENCES_HEADERS = [
  'Preference_ID', 'Category', 'Key', 'Value', 'Source',
  'Confidence', 'Last_Used', 'Use_Count', 'Created_At', 'Updated_At'
];

const MEMORY_RELATIONSHIPS_HEADERS = [
  'Relationship_ID', 'Contact_ID', 'Relationship_Type', 'Strength',
  'Last_Interaction', 'Interaction_Count', 'Shared_Topics',
  'Trust_Level', 'Notes', 'Created_At', 'Updated_At'
];

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY SYSTEM INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all memory system sheets
 */
function initializeMemorySystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = {};

  results.contacts = createSheetWithHeaders(ss, MEMORY_CONTACTS_SHEET, MEMORY_CONTACTS_HEADERS, '#4A148C');
  results.decisions = createSheetWithHeaders(ss, MEMORY_DECISIONS_SHEET, MEMORY_DECISIONS_HEADERS, '#1A237E');
  results.patterns = createSheetWithHeaders(ss, MEMORY_PATTERNS_SHEET, MEMORY_PATTERNS_HEADERS, '#004D40');
  results.preferences = createSheetWithHeaders(ss, MEMORY_PREFERENCES_SHEET, MEMORY_PREFERENCES_HEADERS, '#BF360C');
  results.relationships = createSheetWithHeaders(ss, MEMORY_RELATIONSHIPS_SHEET, MEMORY_RELATIONSHIPS_HEADERS, '#3E2723');

  // Initialize with default preferences
  initializeDefaultPreferences();

  return {
    success: true,
    message: 'Memory system initialized - I will NEVER forget',
    results
  };
}

/**
 * Initialize default preferences
 */
function initializeDefaultPreferences() {
  const defaults = [
    { category: 'communication', key: 'response_urgency_hours', value: '24', source: 'system' },
    { category: 'communication', key: 'follow_up_default_days', value: '3', source: 'system' },
    { category: 'autonomy', key: 'auto_acknowledge_orders', value: 'false', source: 'system' },
    { category: 'autonomy', key: 'auto_schedule_meetings', value: 'false', source: 'system' },
    { category: 'schedule', key: 'work_start_hour', value: '6', source: 'system' },
    { category: 'schedule', key: 'work_end_hour', value: '18', source: 'system' },
    { category: 'schedule', key: 'focus_time_hours', value: '4', source: 'system' },
    { category: 'farming', key: 'growing_season_start', value: '03-15', source: 'system' },
    { category: 'farming', key: 'growing_season_end', value: '11-15', source: 'system' }
  ];

  defaults.forEach(pref => {
    setPreference(pref.category, pref.key, pref.value, pref.source, 0.5);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT MEMORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remember or update a contact
 */
function rememberContact(contactData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MEMORY_CONTACTS_SHEET);

  if (!sheet) {
    initializeMemorySystem();
    sheet = ss.getSheetByName(MEMORY_CONTACTS_SHEET);
  }

  const email = contactData.email?.toLowerCase();
  if (!email) return { success: false, error: 'Email required' };

  // Check if contact exists
  const existingRow = findContactByEmail(sheet, email);
  const now = new Date().toISOString();

  if (existingRow) {
    // Update existing contact
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const currentData = sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0];

    // Increment interaction count
    const interactionCol = headers.indexOf('Total_Interactions');
    const newInteractionCount = (parseInt(currentData[interactionCol]) || 0) + 1;

    // Update last contact date
    const lastContactCol = headers.indexOf('Last_Contact_Date') + 1;
    const totalInteractionsCol = interactionCol + 1;
    const lastUpdatedCol = headers.indexOf('Last_Updated') + 1;

    sheet.getRange(existingRow, lastContactCol).setValue(now);
    sheet.getRange(existingRow, totalInteractionsCol).setValue(newInteractionCount);
    sheet.getRange(existingRow, lastUpdatedCol).setValue(now);

    // Update other fields if provided
    if (contactData.topics) {
      const topicsCol = headers.indexOf('Topics_Discussed') + 1;
      const existingTopics = JSON.parse(currentData[headers.indexOf('Topics_Discussed')] || '[]');
      const newTopics = [...new Set([...existingTopics, ...contactData.topics])];
      sheet.getRange(existingRow, topicsCol).setValue(JSON.stringify(newTopics));
    }

    if (contactData.sentiment) {
      const sentimentCol = headers.indexOf('Sentiment_History') + 1;
      const existingSentiment = JSON.parse(currentData[headers.indexOf('Sentiment_History')] || '[]');
      existingSentiment.push({ date: now, sentiment: contactData.sentiment });
      // Keep last 20 sentiments
      const trimmedSentiment = existingSentiment.slice(-20);
      sheet.getRange(existingRow, sentimentCol).setValue(JSON.stringify(trimmedSentiment));
    }

    if (contactData.notes) {
      const notesCol = headers.indexOf('Notes') + 1;
      const existingNotes = currentData[headers.indexOf('Notes')] || '';
      const newNotes = existingNotes + '\n[' + now.split('T')[0] + '] ' + contactData.notes;
      sheet.getRange(existingRow, notesCol).setValue(newNotes.trim());
    }

    return {
      success: true,
      action: 'updated',
      contactId: currentData[0],
      interactionCount: newInteractionCount
    };
  } else {
    // Create new contact
    const contactId = 'CON-' + Utilities.getUuid().substring(0, 8);

    const rowData = [
      contactId,
      email,
      contactData.name || extractNameFromEmail(email),
      contactData.company || '',
      contactData.type || 'UNKNOWN',
      now, // First contact
      now, // Last contact
      1,   // Total interactions
      null, // Response time avg
      JSON.stringify(contactData.topics || []),
      JSON.stringify(contactData.sentiment ? [{ date: now, sentiment: contactData.sentiment }] : []),
      JSON.stringify(contactData.importantDates || []),
      contactData.notes || '',
      contactData.preferredMethod || 'EMAIL',
      contactData.timezone || 'America/New_York',
      contactData.communicationStyle || 'PROFESSIONAL',
      contactData.vip || false,
      0, // Risk score
      now
    ];

    sheet.appendRow(rowData);

    return {
      success: true,
      action: 'created',
      contactId: contactId
    };
  }
}

/**
 * Recall everything about a contact
 */
function recallContact(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_CONTACTS_SHEET);

  if (!sheet) return { success: false, error: 'Memory not initialized' };

  const row = findContactByEmail(sheet, email.toLowerCase());
  if (!row) return { success: true, data: null, message: 'No memory of this contact' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(row, 1, 1, headers.length).getValues()[0];

  const contact = {};
  headers.forEach((h, i) => {
    let value = data[i];
    // Parse JSON fields
    if (['Topics_Discussed', 'Sentiment_History', 'Important_Dates'].includes(h)) {
      try { value = JSON.parse(value || '[]'); } catch(e) { value = []; }
    }
    contact[h.toLowerCase()] = value;
  });

  // Calculate additional insights
  contact.insights = {
    daysSinceLastContact: Math.round((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24)),
    averageSentiment: calculateAverageSentiment(contact.sentiment_history),
    isAtRisk: contact.days_since_last_contact > 60 && contact.total_interactions > 3,
    topTopics: (contact.topics_discussed || []).slice(0, 5)
  };

  return { success: true, data: contact };
}

/**
 * Get all contacts with filters
 */
function recallAllContacts(filters = {}) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_CONTACTS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [], count: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const contacts = [];
  for (let i = 1; i < data.length; i++) {
    const contact = {};
    headers.forEach((h, idx) => {
      contact[h.toLowerCase()] = data[i][idx];
    });

    // Apply filters
    if (filters.type && contact.type !== filters.type) continue;
    if (filters.vip && !contact.vip_status) continue;
    if (filters.atRisk) {
      const daysSince = Math.round((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24));
      if (daysSince < 30) continue;
    }

    contacts.push(contact);
  }

  return { success: true, data: contacts, count: contacts.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// DECISION MEMORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remember a decision for future learning
 */
function rememberDecision(decisionData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MEMORY_DECISIONS_SHEET);

  if (!sheet) {
    initializeMemorySystem();
    sheet = ss.getSheetByName(MEMORY_DECISIONS_SHEET);
  }

  const decisionId = 'DEC-' + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  const rowData = [
    decisionId,
    now,
    decisionData.context || '',
    decisionData.decision || '',
    decisionData.reasoning || '',
    '', // Outcome - filled later
    '', // Outcome date
    null, // Was correct
    '', // Learnings
    decisionData.contactId || '',
    decisionData.threadId || '',
    JSON.stringify(decisionData.tags || [])
  ];

  sheet.appendRow(rowData);

  return { success: true, decisionId: decisionId };
}

/**
 * Record the outcome of a decision
 */
function recordDecisionOutcome(decisionId, outcome, wasCorrect, learnings) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_DECISIONS_SHEET);

  if (!sheet) return { success: false, error: 'Memory not initialized' };

  const row = findDecisionById(sheet, decisionId);
  if (!row) return { success: false, error: 'Decision not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const outcomeCol = headers.indexOf('Outcome') + 1;
  const outcomeDateCol = headers.indexOf('Outcome_Date') + 1;
  const wasCorrectCol = headers.indexOf('Was_Correct') + 1;
  const learningsCol = headers.indexOf('Learnings') + 1;

  sheet.getRange(row, outcomeCol).setValue(outcome);
  sheet.getRange(row, outcomeDateCol).setValue(new Date().toISOString());
  sheet.getRange(row, wasCorrectCol).setValue(wasCorrect);
  sheet.getRange(row, learningsCol).setValue(learnings);

  // If decision was wrong, create a pattern to avoid it
  if (!wasCorrect && learnings) {
    rememberPattern({
      type: 'DECISION_LEARNING',
      name: 'Learn from: ' + decisionId,
      description: learnings,
      recommendedAction: 'Avoid similar decision in: ' + outcome
    });
  }

  return { success: true, message: 'Outcome recorded and learned from' };
}

/**
 * Recall similar past decisions
 */
function recallSimilarDecisions(context, limit = 5) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_DECISIONS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [], message: 'No decision history yet' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const contextCol = headers.indexOf('Context');
  const outcomeCol = headers.indexOf('Outcome');
  const wasCorrectCol = headers.indexOf('Was_Correct');

  // Find decisions with similar context (simple keyword matching)
  const contextWords = context.toLowerCase().split(/\s+/);
  const matches = [];

  for (let i = 1; i < data.length; i++) {
    const pastContext = (data[i][contextCol] || '').toLowerCase();
    const matchScore = contextWords.filter(w => pastContext.includes(w)).length;

    if (matchScore > 0 && data[i][outcomeCol]) { // Only decisions with outcomes
      matches.push({
        score: matchScore,
        context: data[i][contextCol],
        decision: data[i][headers.indexOf('Decision_Made')],
        outcome: data[i][outcomeCol],
        wasCorrect: data[i][wasCorrectCol],
        learnings: data[i][headers.indexOf('Learnings')]
      });
    }
  }

  // Sort by relevance
  matches.sort((a, b) => b.score - a.score);

  return {
    success: true,
    data: matches.slice(0, limit),
    count: matches.length
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN MEMORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Remember a pattern for proactive suggestions
 */
function rememberPattern(patternData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MEMORY_PATTERNS_SHEET);

  if (!sheet) {
    initializeMemorySystem();
    sheet = ss.getSheetByName(MEMORY_PATTERNS_SHEET);
  }

  const patternId = 'PAT-' + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  const rowData = [
    patternId,
    patternData.type || 'GENERAL',
    patternData.name || '',
    patternData.description || '',
    1, // Frequency
    now, // Last occurred
    patternData.confidence || 0.5,
    JSON.stringify(patternData.dataPoints || []),
    patternData.recommendedAction || '',
    patternData.autoAction || false,
    now,
    now
  ];

  sheet.appendRow(rowData);

  return { success: true, patternId: patternId };
}

/**
 * Increment pattern frequency (pattern occurred again)
 */
function reinforcePattern(patternId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_PATTERNS_SHEET);

  if (!sheet) return { success: false, error: 'Memory not initialized' };

  const row = findPatternById(sheet, patternId);
  if (!row) return { success: false, error: 'Pattern not found' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const freqCol = headers.indexOf('Frequency') + 1;
  const lastCol = headers.indexOf('Last_Occurred') + 1;
  const confCol = headers.indexOf('Confidence') + 1;
  const updatedCol = headers.indexOf('Updated_At') + 1;

  const currentFreq = sheet.getRange(row, freqCol).getValue();
  const currentConf = sheet.getRange(row, confCol).getValue();

  // Increase frequency and confidence
  sheet.getRange(row, freqCol).setValue(currentFreq + 1);
  sheet.getRange(row, lastCol).setValue(new Date().toISOString());
  sheet.getRange(row, confCol).setValue(Math.min(0.99, currentConf + 0.05));
  sheet.getRange(row, updatedCol).setValue(new Date().toISOString());

  return { success: true, newFrequency: currentFreq + 1 };
}

/**
 * Get active patterns for proactive suggestions
 */
function getActivePatterns(minConfidence = 0.6) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_PATTERNS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const confCol = headers.indexOf('Confidence');

  const patterns = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][confCol] >= minConfidence) {
      const pattern = {};
      headers.forEach((h, idx) => {
        pattern[h.toLowerCase()] = data[i][idx];
      });
      patterns.push(pattern);
    }
  }

  return { success: true, data: patterns, count: patterns.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREFERENCES MEMORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Set a preference
 */
function setPreference(category, key, value, source = 'user', confidence = 0.8) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(MEMORY_PREFERENCES_SHEET);

  if (!sheet) {
    initializeMemorySystem();
    sheet = ss.getSheetByName(MEMORY_PREFERENCES_SHEET);
  }

  const now = new Date().toISOString();
  const existingRow = findPreference(sheet, category, key);

  if (existingRow) {
    // Update existing preference
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const valueCol = headers.indexOf('Value') + 1;
    const confCol = headers.indexOf('Confidence') + 1;
    const useCountCol = headers.indexOf('Use_Count') + 1;
    const lastUsedCol = headers.indexOf('Last_Used') + 1;
    const updatedCol = headers.indexOf('Updated_At') + 1;

    const currentCount = sheet.getRange(existingRow, useCountCol).getValue();

    sheet.getRange(existingRow, valueCol).setValue(value);
    sheet.getRange(existingRow, confCol).setValue(confidence);
    sheet.getRange(existingRow, useCountCol).setValue(currentCount + 1);
    sheet.getRange(existingRow, lastUsedCol).setValue(now);
    sheet.getRange(existingRow, updatedCol).setValue(now);

    return { success: true, action: 'updated' };
  } else {
    // Create new preference
    const prefId = 'PREF-' + Utilities.getUuid().substring(0, 8);

    const rowData = [
      prefId,
      category,
      key,
      value,
      source,
      confidence,
      now, // Last used
      1,   // Use count
      now, // Created
      now  // Updated
    ];

    sheet.appendRow(rowData);
    return { success: true, action: 'created', prefId: prefId };
  }
}

/**
 * Get a preference
 */
function getPreference(category, key, defaultValue = null) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_PREFERENCES_SHEET);

  if (!sheet) return defaultValue;

  const row = findPreference(sheet, category, key);
  if (!row) return defaultValue;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const valueCol = headers.indexOf('Value');

  return sheet.getRange(row, valueCol + 1).getValue();
}

/**
 * Get all preferences in a category
 */
function getPreferenceCategory(category) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_PREFERENCES_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: {} };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const catCol = headers.indexOf('Category');
  const keyCol = headers.indexOf('Key');
  const valueCol = headers.indexOf('Value');

  const prefs = {};
  for (let i = 1; i < data.length; i++) {
    if (data[i][catCol] === category) {
      prefs[data[i][keyCol]] = data[i][valueCol];
    }
  }

  return { success: true, data: prefs };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build complete context for AI decision making
 * This is the "brain dump" of everything relevant
 */
function buildCompleteContext(params = {}) {
  const context = {
    generated_at: new Date().toISOString(),
    preferences: {},
    relevant_contacts: [],
    recent_decisions: [],
    active_patterns: [],
    insights: {}
  };

  // Get all preferences
  const prefCategories = ['communication', 'autonomy', 'schedule', 'farming'];
  prefCategories.forEach(cat => {
    const prefs = getPreferenceCategory(cat);
    if (prefs.success) {
      context.preferences[cat] = prefs.data;
    }
  });

  // Get relevant contacts
  if (params.email) {
    const contact = recallContact(params.email);
    if (contact.success && contact.data) {
      context.relevant_contacts.push(contact.data);
    }
  }

  // Get recent decisions in similar context
  if (params.context) {
    const decisions = recallSimilarDecisions(params.context, 3);
    if (decisions.success) {
      context.recent_decisions = decisions.data;
    }
  }

  // Get active patterns
  const patterns = getActivePatterns(0.6);
  if (patterns.success) {
    context.active_patterns = patterns.data;
  }

  // Calculate insights
  context.insights = {
    total_contacts_remembered: countContacts(),
    total_decisions_logged: countDecisions(),
    patterns_active: patterns.data?.length || 0,
    memory_health: 'OPERATIONAL'
  };

  return { success: true, data: context };
}

/**
 * Get proactive suggestions based on memory
 */
function getProactiveSuggestions() {
  const suggestions = [];
  const now = new Date();

  // Check for contacts at risk (no contact in 30+ days)
  const atRiskContacts = recallAllContacts({ atRisk: true });
  if (atRiskContacts.success && atRiskContacts.data.length > 0) {
    atRiskContacts.data.slice(0, 3).forEach(c => {
      suggestions.push({
        type: 'CONTACT_AT_RISK',
        priority: 'MEDIUM',
        message: `No contact with ${c.name || c.email} in over 30 days`,
        action: `Consider reaching out to maintain relationship`,
        data: { email: c.email, name: c.name }
      });
    });
  }

  // Check for patterns with high confidence
  const patterns = getActivePatterns(0.8);
  if (patterns.success) {
    patterns.data.slice(0, 3).forEach(p => {
      if (p.recommended_action) {
        suggestions.push({
          type: 'PATTERN_DETECTED',
          priority: 'LOW',
          message: p.pattern_name,
          action: p.recommended_action,
          confidence: p.confidence
        });
      }
    });
  }

  return { success: true, data: suggestions, count: suggestions.length };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function findContactByEmail(sheet, email) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const emails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (emails[i][0]?.toLowerCase() === email.toLowerCase()) return i + 2;
  }
  return null;
}

function findDecisionById(sheet, decisionId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === decisionId) return i + 2;
  }
  return null;
}

function findPatternById(sheet, patternId) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === patternId) return i + 2;
  }
  return null;
}

function findPreference(sheet, category, key) {
  if (!sheet || sheet.getLastRow() <= 1) return null;
  const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === category && data[i][1] === key) return i + 2;
  }
  return null;
}

function extractNameFromEmail(email) {
  const local = email.split('@')[0];
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function calculateAverageSentiment(sentimentHistory) {
  if (!sentimentHistory || sentimentHistory.length === 0) return null;
  const sentimentValues = { positive: 1, neutral: 0, negative: -1 };
  const sum = sentimentHistory.reduce((acc, s) => acc + (sentimentValues[s.sentiment] || 0), 0);
  return sum / sentimentHistory.length;
}

function countContacts() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_CONTACTS_SHEET);
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

function countDecisions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(MEMORY_DECISIONS_SHEET);
  return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function testMemorySystem() {
  Logger.log('=== TESTING MEMORY SYSTEM ===');

  // 1. Initialize
  Logger.log('1. Initializing memory system...');
  const init = initializeMemorySystem();
  Logger.log('   ' + init.message);

  // 2. Remember a contact
  Logger.log('2. Remembering a contact...');
  const contact = rememberContact({
    email: 'test@example.com',
    name: 'Test User',
    type: 'CUSTOMER',
    topics: ['CSA', 'delivery'],
    sentiment: 'positive',
    notes: 'Test contact for memory system'
  });
  Logger.log('   Contact: ' + JSON.stringify(contact));

  // 3. Recall the contact
  Logger.log('3. Recalling contact...');
  const recalled = recallContact('test@example.com');
  Logger.log('   Recalled: ' + (recalled.data ? 'YES' : 'NO'));

  // 4. Remember a decision
  Logger.log('4. Remembering a decision...');
  const decision = rememberDecision({
    context: 'Customer asked about CSA share sizes',
    decision: 'Recommended regular share',
    reasoning: 'Family of 4 mentioned'
  });
  Logger.log('   Decision ID: ' + decision.decisionId);

  // 5. Set and get preference
  Logger.log('5. Testing preferences...');
  setPreference('test', 'favorite_color', 'green', 'user', 0.9);
  const pref = getPreference('test', 'favorite_color');
  Logger.log('   Preference: ' + pref);

  // 6. Build context
  Logger.log('6. Building complete context...');
  const context = buildCompleteContext({ email: 'test@example.com' });
  Logger.log('   Context contacts: ' + context.data.relevant_contacts.length);

  Logger.log('=== MEMORY SYSTEM TEST COMPLETE ===');

  return { success: true, message: 'Memory system operational - I NEVER forget' };
}
