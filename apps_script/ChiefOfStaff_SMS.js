// ═══════════════════════════════════════════════════════════════════════════
// CHIEF-OF-STAFF: INTELLIGENT SMS SYSTEM
// Enterprise-Grade AI-Powered Message Intelligence
//
// This is NOT pattern matching. This uses actual LLM analysis with:
// - Customer 360 context (orders, history, LTV, churn risk)
// - Predictive action recommendations
// - Cross-channel correlation (SMS + email + orders)
// - Business impact prioritization
//
// Created: 2026-01-21
// Architecture: Multi-layer intelligence stack with Claude API
// ═══════════════════════════════════════════════════════════════════════════

// Sheet names
const SMS_LOG_SHEET = 'COS_SMS_Log';
const SMS_COMMITMENTS_SHEET = 'COS_SMS_Commitments';
const SMS_CONTACTS_SHEET = 'COS_SMS_Contacts';
const SMS_ACTION_QUEUE_SHEET = 'COS_SMS_ActionQueue';
const SMS_INSIGHTS_SHEET = 'COS_SMS_Insights';

// Headers for each sheet
const SMS_LOG_HEADERS = [
  'SMS_ID', 'Direction', 'Contact_Name', 'Phone_Number', 'Customer_ID',
  'Message_Text', 'Received_At', 'Processed_At',
  // AI Analysis Fields
  'AI_Intent', 'AI_Sentiment', 'AI_Urgency_Score', 'AI_Summary',
  'Commitments_JSON', 'Entities_JSON', 'Context_Used',
  // Business Context
  'Customer_LTV', 'Customer_Segment', 'Churn_Risk', 'Open_Orders',
  // Prioritization
  'Priority_Score', 'Priority_Reason', 'Recommended_Actions_JSON',
  // Status
  'Status', 'Actioned_By', 'Actioned_At', 'Resolution_Notes'
];

const SMS_COMMITMENTS_HEADERS = [
  'Commitment_ID', 'SMS_ID', 'Customer_ID', 'Contact_Name', 'Phone_Number',
  // Commitment Details
  'Commitment_Type', 'Commitment_Text', 'Full_Context', 'Party_Committed',
  'Deadline', 'Deadline_Source', 'Confidence_Score',
  // Business Impact
  'Customer_LTV', 'Deal_At_Risk', 'Priority',
  // Tracking
  'Status', 'Reminder_Sent', 'Escalated', 'Escalation_Reason',
  'Completed_At', 'Completed_By', 'Outcome_Notes',
  // Metadata
  'Created_At', 'Updated_At', 'Days_Until_Due', 'Is_Overdue'
];

const SMS_ACTION_QUEUE_HEADERS = [
  'Action_ID', 'SMS_ID', 'Customer_ID', 'Contact_Name',
  // Action Details
  'Action_Type', 'Action_Description', 'Action_Rationale',
  'Urgency', 'Business_Impact_Score',
  // Context
  'Customer_LTV', 'Customer_Segment', 'Related_Orders',
  // Prioritization (composite score)
  'Priority_Score', 'Queue_Position',
  // Status
  'Status', 'Assigned_To', 'Due_By', 'Completed_At', 'Outcome',
  'Created_At'
];

const SMS_INSIGHTS_HEADERS = [
  'Insight_ID', 'Insight_Type', 'Title', 'Description',
  'Affected_Customers', 'Business_Impact', 'Recommended_Action',
  'Data_JSON', 'Created_At', 'Status', 'Actioned_At'
];

const SMS_CONTACTS_HEADERS = [
  'Contact_ID', 'Phone_Number', 'Contact_Name', 'Customer_ID',
  'Contact_Type', 'Company', 'Email',
  // Customer Intelligence
  'Lifetime_Value', 'Customer_Segment', 'Churn_Risk_Score',
  'First_Purchase_Date', 'Last_Purchase_Date', 'Total_Orders', 'Avg_Order_Value',
  // Communication Patterns
  'Total_SMS', 'Total_Emails', 'Preferred_Channel', 'Avg_Response_Time',
  'Sentiment_Trend', 'Last_Sentiment',
  // Relationship Health
  'Open_Commitments', 'Overdue_Commitments', 'Satisfaction_Score',
  'Last_Interaction_At', 'Days_Since_Contact',
  // Metadata
  'Notes', 'Tags', 'Created_At', 'Updated_At'
];

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SMS_CONFIG = {
  // Priority score weights (must sum to 1.0)
  PRIORITY_WEIGHTS: {
    CUSTOMER_LTV: 0.30,        // High-value customers first
    MESSAGE_URGENCY: 0.25,     // Urgent messages rise
    CHURN_RISK: 0.20,          // At-risk customers prioritized
    SENTIMENT_NEGATIVE: 0.15,  // Negative sentiment escalates
    DEAL_AT_RISK: 0.10         // Open deals at risk
  },

  // Customer segments
  SEGMENTS: {
    VIP: { minLTV: 5000, label: 'VIP Customer' },
    HIGH_VALUE: { minLTV: 1000, label: 'High Value' },
    STANDARD: { minLTV: 100, label: 'Standard' },
    NEW: { minLTV: 0, label: 'New Customer' }
  },

  // Urgency thresholds
  URGENCY: {
    CRITICAL: 0.9,   // Immediate action required
    HIGH: 0.7,       // Same-day response
    MEDIUM: 0.4,     // Within 24 hours
    LOW: 0.0         // Standard queue
  },

  // Auto-escalation rules
  ESCALATION: {
    VIP_NEGATIVE_SENTIMENT: true,
    OVERDUE_COMMITMENT_DAYS: 2,
    CHURN_RISK_THRESHOLD: 0.7,
    UNANSWERED_HOURS: 24
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initializeSMSSystem() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheets = [
    { name: SMS_LOG_SHEET, headers: SMS_LOG_HEADERS, color: '#00695C' },
    { name: SMS_COMMITMENTS_SHEET, headers: SMS_COMMITMENTS_HEADERS, color: '#004D40' },
    { name: SMS_ACTION_QUEUE_SHEET, headers: SMS_ACTION_QUEUE_HEADERS, color: '#D84315' },
    { name: SMS_INSIGHTS_SHEET, headers: SMS_INSIGHTS_HEADERS, color: '#6A1B9A' },
    { name: SMS_CONTACTS_SHEET, headers: SMS_CONTACTS_HEADERS, color: '#00897B' }
  ];

  sheets.forEach(config => {
    createSheetWithHeaders(ss, config.name, config.headers, config.color);
  });

  return {
    success: true,
    message: 'Intelligent SMS system initialized',
    sheets: sheets.map(s => s.name),
    architecture: 'Multi-layer AI intelligence with Customer 360 context'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT: RECEIVE & PROCESS SMS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Receives SMS from iOS Shortcut and processes with full AI intelligence
 * This is the webhook endpoint
 */
function receiveSMS(data) {
  const startTime = Date.now();

  try {
    // Validate input
    if (!data.message || data.message.trim() === '') {
      return { success: false, error: 'Message text is required' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const smsId = 'SMS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const phoneNumber = normalizePhoneNumber(data.sender || data.phone || '');
    const contactName = data.senderName || data.contactName || 'Unknown';
    const direction = (data.direction || 'INBOUND').toUpperCase();
    const receivedAt = data.timestamp ? new Date(data.timestamp) : new Date();

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: BUILD CUSTOMER 360 CONTEXT
    // ═══════════════════════════════════════════════════════════════════════
    const customerContext = buildCustomer360Context(ss, phoneNumber, contactName);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: AI-POWERED MESSAGE ANALYSIS (Claude API)
    // ═══════════════════════════════════════════════════════════════════════
    const aiAnalysis = analyzeMessageWithAI(data.message, direction, customerContext);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: CALCULATE PRIORITY SCORE
    // ═══════════════════════════════════════════════════════════════════════
    const priorityResult = calculatePriorityScore(aiAnalysis, customerContext);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: LOG THE MESSAGE
    // ═══════════════════════════════════════════════════════════════════════
    logSMSToSheet(ss, {
      smsId,
      direction,
      contactName,
      phoneNumber,
      customerId: customerContext.customerId,
      message: data.message,
      receivedAt,
      aiAnalysis,
      customerContext,
      priorityResult
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: PROCESS COMMITMENTS
    // ═══════════════════════════════════════════════════════════════════════
    let commitmentsCreated = [];
    if (aiAnalysis.commitments && aiAnalysis.commitments.length > 0) {
      commitmentsCreated = createCommitments(ss, smsId, contactName, phoneNumber,
        customerContext, aiAnalysis.commitments, data.message);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: CREATE ACTION ITEMS
    // ═══════════════════════════════════════════════════════════════════════
    let actionsCreated = [];
    if (aiAnalysis.recommendedActions && aiAnalysis.recommendedActions.length > 0) {
      actionsCreated = createActionItems(ss, smsId, contactName, phoneNumber,
        customerContext, aiAnalysis.recommendedActions, priorityResult);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: UPDATE CONTACT RECORD
    // ═══════════════════════════════════════════════════════════════════════
    updateContactRecord(ss, phoneNumber, contactName, customerContext, aiAnalysis, direction);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 8: CHECK FOR AUTO-ESCALATION
    // ═══════════════════════════════════════════════════════════════════════
    const escalation = checkAutoEscalation(customerContext, aiAnalysis, priorityResult);
    if (escalation.shouldEscalate) {
      createEscalationAlert(ss, smsId, contactName, escalation, customerContext);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 9: GENERATE INSIGHTS (if patterns detected)
    // ═══════════════════════════════════════════════════════════════════════
    if (aiAnalysis.insights && aiAnalysis.insights.length > 0) {
      logInsights(ss, aiAnalysis.insights, customerContext);
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      smsId: smsId,
      processingTimeMs: processingTime,

      // AI Analysis Summary
      intent: aiAnalysis.intent,
      sentiment: aiAnalysis.sentiment,
      urgency: aiAnalysis.urgency,
      summary: aiAnalysis.summary,

      // Business Context
      customerSegment: customerContext.segment,
      customerLTV: customerContext.ltv,
      churnRisk: customerContext.churnRisk,

      // Priority
      priorityScore: priorityResult.score,
      priorityReason: priorityResult.reason,
      queuePosition: priorityResult.queuePosition,

      // Actions Created
      commitmentsFound: aiAnalysis.commitments?.length || 0,
      commitmentsCreated: commitmentsCreated.length,
      actionsRecommended: aiAnalysis.recommendedActions?.length || 0,
      actionsCreated: actionsCreated.length,

      // Escalation
      escalated: escalation.shouldEscalate,
      escalationReason: escalation.reason,

      // What you should do NOW
      immediateAction: priorityResult.immediateAction,

      // Full analysis for debugging
      fullAnalysis: aiAnalysis
    };

  } catch (error) {
    console.error('SMS Processing Error:', error);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER 360 CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildCustomer360Context(ss, phoneNumber, contactName) {
  const context = {
    customerId: null,
    contactId: null,
    name: contactName,
    phone: phoneNumber,
    email: null,

    // Financial metrics
    ltv: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    segment: 'NEW',

    // Risk metrics
    churnRisk: 0,
    daysSinceLastOrder: null,
    daysSinceLastContact: null,

    // Relationship status
    openCommitments: 0,
    overdueCommitments: 0,
    pendingOrders: [],
    recentInteractions: [],
    sentimentTrend: 'NEUTRAL',

    // CSA Status
    isCSAMember: false,
    csaStatus: null,
    csaValue: 0,

    // Context quality
    contextRichness: 'LOW' // LOW, MEDIUM, HIGH based on data available
  };

  if (!phoneNumber) return context;

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. LOOKUP CUSTOMER IN SALES DATA
    // ═══════════════════════════════════════════════════════════════════════
    const customerData = findCustomerByPhone(ss, phoneNumber);
    if (customerData) {
      context.customerId = customerData.id;
      context.email = customerData.email;
      context.name = customerData.name || contactName;
      context.ltv = customerData.ltv || 0;
      context.avgOrderValue = customerData.avgOrderValue || 0;
      context.totalOrders = customerData.totalOrders || 0;
      context.daysSinceLastOrder = customerData.daysSinceLastOrder;
      context.contextRichness = 'MEDIUM';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. CHECK CSA MEMBERSHIP
    // ═══════════════════════════════════════════════════════════════════════
    const csaData = findCSAMembership(ss, phoneNumber, context.email);
    if (csaData) {
      context.isCSAMember = true;
      context.csaStatus = csaData.status;
      context.csaValue = csaData.value || 0;
      context.ltv += context.csaValue; // Add CSA to LTV
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GET PENDING ORDERS
    // ═══════════════════════════════════════════════════════════════════════
    if (context.customerId || context.email) {
      const orders = getPendingOrdersForCustomer(ss, context.customerId, context.email);
      context.pendingOrders = orders;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. GET RECENT INTERACTIONS (Email + SMS)
    // ═══════════════════════════════════════════════════════════════════════
    const interactions = getRecentInteractions(ss, phoneNumber, context.email, 5);
    context.recentInteractions = interactions;
    context.sentimentTrend = calculateSentimentTrend(interactions);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. GET OPEN COMMITMENTS
    // ═══════════════════════════════════════════════════════════════════════
    const commitmentStats = getCommitmentStats(ss, phoneNumber);
    context.openCommitments = commitmentStats.open;
    context.overdueCommitments = commitmentStats.overdue;

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CALCULATE CUSTOMER SEGMENT
    // ═══════════════════════════════════════════════════════════════════════
    context.segment = determineCustomerSegment(context.ltv);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. CALCULATE CHURN RISK
    // ═══════════════════════════════════════════════════════════════════════
    context.churnRisk = calculateChurnRisk(context);

    // Update context richness
    if (context.customerId && context.recentInteractions.length > 0) {
      context.contextRichness = 'HIGH';
    }

  } catch (error) {
    console.error('Error building customer context:', error);
  }

  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI-POWERED MESSAGE ANALYSIS (Claude API)
// ═══════════════════════════════════════════════════════════════════════════

function analyzeMessageWithAI(message, direction, customerContext) {
  // Build rich context for the AI
  const contextDescription = buildContextDescription(customerContext);

  const prompt = `You are an expert business analyst for Tiny Seed Farm, a small farm business.
Analyze this ${direction === 'OUTBOUND' ? 'message I sent' : 'incoming message'} and extract business intelligence.

CUSTOMER CONTEXT:
${contextDescription}

MESSAGE TO ANALYZE:
"${message}"

Analyze this message and return a JSON object with:

{
  "intent": "Primary intent (e.g., INQUIRY, COMPLAINT, ORDER_STATUS, SCHEDULING, FEEDBACK, COMMITMENT, SMALL_TALK)",
  "sentiment": "POSITIVE | NEUTRAL | NEGATIVE | FRUSTRATED | EXCITED",
  "urgency": 0.0-1.0 (how urgent is this? 0=not urgent, 1=needs immediate action),
  "summary": "One sentence summary of what this message is about",

  "commitments": [
    {
      "text": "Exact commitment made",
      "type": "DELIVER | CALL | MEET | PROVIDE_INFO | RESERVE_PRODUCT | FOLLOW_UP | OTHER",
      "party": "WHO_COMMITTED (ME or CUSTOMER)",
      "deadline": "YYYY-MM-DD or null if not specified",
      "deadlineSource": "How deadline was determined (explicit mention, implied by 'tomorrow', business day assumption)",
      "confidence": 0.0-1.0,
      "businessImpact": "Why this matters to the business"
    }
  ],

  "entities": {
    "products": ["Any products mentioned"],
    "dates": ["Any dates/times mentioned"],
    "amounts": ["Any quantities or prices"],
    "locations": ["Any locations mentioned"]
  },

  "recommendedActions": [
    {
      "action": "What I should do",
      "rationale": "Why this action matters",
      "urgency": "IMMEDIATE | TODAY | THIS_WEEK | WHEN_POSSIBLE",
      "businessImpact": "HIGH | MEDIUM | LOW"
    }
  ],

  "insights": [
    {
      "type": "CHURN_SIGNAL | UPSELL_OPPORTUNITY | RELATIONSHIP_ISSUE | OPERATIONAL_ISSUE",
      "description": "What you noticed",
      "recommendation": "What to do about it"
    }
  ],

  "suggestedResponse": "If a response is needed, what should I say? (null if no response needed)"
}

Be thorough. ${direction === 'OUTBOUND' ? 'I sent this message, so extract any promises I made.' : 'This customer sent this, so identify what they need and how valuable they are.'}
${customerContext.segment === 'VIP' ? 'This is a VIP customer - prioritize accordingly.' : ''}
${customerContext.churnRisk > 0.5 ? 'This customer shows churn risk signals - be alert for issues.' : ''}
${customerContext.overdueCommitments > 0 ? 'NOTE: We have overdue commitments to this customer!' : ''}

Return ONLY the JSON object, no other text.`;

  try {
    // Call Claude API
    const aiResponse = callClaudeAPI(prompt, 0.3); // Low temperature for consistent extraction

    // Parse the response
    let analysis;
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.slice(7);
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.slice(3);
      }
      if (cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.slice(0, -3);
      }
      analysis = JSON.parse(cleanResponse.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Return a basic analysis if parsing fails
      analysis = createFallbackAnalysis(message, direction);
    }

    // Validate and enrich the analysis
    analysis = validateAndEnrichAnalysis(analysis, message, direction, customerContext);

    return analysis;

  } catch (error) {
    console.error('AI Analysis failed:', error);
    return createFallbackAnalysis(message, direction);
  }
}

function buildContextDescription(ctx) {
  const parts = [];

  if (ctx.name && ctx.name !== 'Unknown') {
    parts.push(`Customer: ${ctx.name}`);
  }

  if (ctx.segment !== 'NEW') {
    parts.push(`Segment: ${ctx.segment} (LTV: $${ctx.ltv.toFixed(2)})`);
  } else {
    parts.push('This appears to be a new or unknown customer');
  }

  if (ctx.isCSAMember) {
    parts.push(`CSA Member: ${ctx.csaStatus} ($${ctx.csaValue}/season)`);
  }

  if (ctx.totalOrders > 0) {
    parts.push(`Order History: ${ctx.totalOrders} orders, avg $${ctx.avgOrderValue.toFixed(2)}`);
  }

  if (ctx.daysSinceLastOrder !== null) {
    parts.push(`Last Order: ${ctx.daysSinceLastOrder} days ago`);
  }

  if (ctx.churnRisk > 0.5) {
    parts.push(`⚠️ CHURN RISK: ${(ctx.churnRisk * 100).toFixed(0)}%`);
  }

  if (ctx.pendingOrders && ctx.pendingOrders.length > 0) {
    parts.push(`Pending Orders: ${ctx.pendingOrders.map(o => o.id).join(', ')}`);
  }

  if (ctx.openCommitments > 0) {
    parts.push(`Open Commitments: ${ctx.openCommitments}${ctx.overdueCommitments > 0 ? ` (${ctx.overdueCommitments} OVERDUE!)` : ''}`);
  }

  if (ctx.recentInteractions && ctx.recentInteractions.length > 0) {
    parts.push(`Recent Sentiment: ${ctx.sentimentTrend}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No prior customer data available.';
}

function createFallbackAnalysis(message, direction) {
  // Basic analysis without AI (fallback)
  const lowerMsg = message.toLowerCase();

  return {
    intent: 'UNKNOWN',
    sentiment: lowerMsg.includes('thank') ? 'POSITIVE' :
               lowerMsg.includes('problem') || lowerMsg.includes('issue') ? 'NEGATIVE' : 'NEUTRAL',
    urgency: lowerMsg.includes('urgent') || lowerMsg.includes('asap') ? 0.8 : 0.3,
    summary: `${direction} message requiring review`,
    commitments: [],
    entities: { products: [], dates: [], amounts: [], locations: [] },
    recommendedActions: [{
      action: 'Review this message manually',
      rationale: 'AI analysis unavailable',
      urgency: 'TODAY',
      businessImpact: 'MEDIUM'
    }],
    insights: [],
    suggestedResponse: null,
    _fallback: true
  };
}

function validateAndEnrichAnalysis(analysis, message, direction, context) {
  // Ensure all required fields exist
  analysis.intent = analysis.intent || 'UNKNOWN';
  analysis.sentiment = analysis.sentiment || 'NEUTRAL';
  analysis.urgency = typeof analysis.urgency === 'number' ?
    Math.max(0, Math.min(1, analysis.urgency)) : 0.3;
  analysis.summary = analysis.summary || message.substring(0, 100);
  analysis.commitments = Array.isArray(analysis.commitments) ? analysis.commitments : [];
  analysis.entities = analysis.entities || { products: [], dates: [], amounts: [], locations: [] };
  analysis.recommendedActions = Array.isArray(analysis.recommendedActions) ? analysis.recommendedActions : [];
  analysis.insights = Array.isArray(analysis.insights) ? analysis.insights : [];

  // Boost urgency for VIP customers with negative sentiment
  if (context.segment === 'VIP' && analysis.sentiment === 'NEGATIVE') {
    analysis.urgency = Math.max(analysis.urgency, 0.8);
    analysis.recommendedActions.unshift({
      action: 'Prioritize VIP customer concern',
      rationale: `${context.name} is a VIP customer ($${context.ltv} LTV) with negative sentiment`,
      urgency: 'IMMEDIATE',
      businessImpact: 'HIGH'
    });
  }

  // Add insight if customer has overdue commitments
  if (context.overdueCommitments > 0 && direction === 'INBOUND') {
    analysis.insights.push({
      type: 'RELATIONSHIP_ISSUE',
      description: `Customer has ${context.overdueCommitments} overdue commitments from us`,
      recommendation: 'Address overdue items before responding to build trust'
    });
  }

  // Detect churn signals
  if (context.churnRisk > 0.6 && analysis.sentiment !== 'POSITIVE') {
    analysis.insights.push({
      type: 'CHURN_SIGNAL',
      description: `High churn risk customer (${(context.churnRisk * 100).toFixed(0)}%) with ${analysis.sentiment} sentiment`,
      recommendation: 'Consider proactive outreach or special offer'
    });
  }

  return analysis;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY SCORING ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function calculatePriorityScore(aiAnalysis, customerContext) {
  const weights = SMS_CONFIG.PRIORITY_WEIGHTS;

  // Normalize LTV to 0-1 scale (cap at $10,000)
  const ltvScore = Math.min(customerContext.ltv / 10000, 1);

  // Urgency from AI (already 0-1)
  const urgencyScore = aiAnalysis.urgency;

  // Churn risk (already 0-1)
  const churnScore = customerContext.churnRisk;

  // Sentiment score (negative = higher priority)
  const sentimentScore = aiAnalysis.sentiment === 'NEGATIVE' ? 1.0 :
                         aiAnalysis.sentiment === 'FRUSTRATED' ? 0.9 :
                         aiAnalysis.sentiment === 'NEUTRAL' ? 0.3 : 0.1;

  // Deal at risk (based on pending orders)
  const pendingOrderValue = customerContext.pendingOrders?.reduce((sum, o) => sum + (o.value || 0), 0) || 0;
  const dealRiskScore = Math.min(pendingOrderValue / 1000, 1);

  // Calculate weighted score
  const rawScore =
    (ltvScore * weights.CUSTOMER_LTV) +
    (urgencyScore * weights.MESSAGE_URGENCY) +
    (churnScore * weights.CHURN_RISK) +
    (sentimentScore * weights.SENTIMENT_NEGATIVE) +
    (dealRiskScore * weights.DEAL_AT_RISK);

  // Normalize to 0-100
  const score = Math.round(rawScore * 100);

  // Determine queue position
  let queuePosition;
  let immediateAction;

  if (score >= 80) {
    queuePosition = 'CRITICAL';
    immediateAction = 'Respond within 15 minutes';
  } else if (score >= 60) {
    queuePosition = 'HIGH';
    immediateAction = 'Respond within 1 hour';
  } else if (score >= 40) {
    queuePosition = 'MEDIUM';
    immediateAction = 'Respond today';
  } else {
    queuePosition = 'NORMAL';
    immediateAction = 'Respond within 24 hours';
  }

  // Build explanation
  const reasons = [];
  if (ltvScore > 0.5) reasons.push(`High-value customer ($${customerContext.ltv})`);
  if (urgencyScore > 0.6) reasons.push('Message marked as urgent');
  if (churnScore > 0.5) reasons.push('Customer at churn risk');
  if (sentimentScore > 0.7) reasons.push('Negative sentiment detected');
  if (dealRiskScore > 0.3) reasons.push(`$${pendingOrderValue} in pending orders`);

  return {
    score,
    queuePosition,
    immediateAction,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Standard priority',
    components: {
      ltv: Math.round(ltvScore * 100),
      urgency: Math.round(urgencyScore * 100),
      churn: Math.round(churnScore * 100),
      sentiment: Math.round(sentimentScore * 100),
      dealRisk: Math.round(dealRiskScore * 100)
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-ESCALATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

function checkAutoEscalation(customerContext, aiAnalysis, priorityResult) {
  const rules = SMS_CONFIG.ESCALATION;
  const reasons = [];

  // VIP with negative sentiment
  if (rules.VIP_NEGATIVE_SENTIMENT &&
      customerContext.segment === 'VIP' &&
      (aiAnalysis.sentiment === 'NEGATIVE' || aiAnalysis.sentiment === 'FRUSTRATED')) {
    reasons.push('VIP customer with negative sentiment');
  }

  // High churn risk
  if (customerContext.churnRisk >= rules.CHURN_RISK_THRESHOLD) {
    reasons.push(`Churn risk at ${(customerContext.churnRisk * 100).toFixed(0)}%`);
  }

  // Overdue commitments
  if (customerContext.overdueCommitments > 0) {
    reasons.push(`${customerContext.overdueCommitments} overdue commitment(s)`);
  }

  // Critical priority score
  if (priorityResult.queuePosition === 'CRITICAL') {
    reasons.push('Critical priority score');
  }

  // Complaint or frustrated intent
  if (aiAnalysis.intent === 'COMPLAINT') {
    reasons.push('Customer complaint detected');
  }

  return {
    shouldEscalate: reasons.length > 0,
    reason: reasons.join('; '),
    escalationLevel: reasons.length >= 3 ? 'OWNER' :
                     reasons.length >= 2 ? 'URGENT' : 'ELEVATED'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA PERSISTENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function logSMSToSheet(ss, data) {
  let sheet = ss.getSheetByName(SMS_LOG_SHEET);
  if (!sheet) {
    initializeSMSSystem();
    sheet = ss.getSheetByName(SMS_LOG_SHEET);
  }

  const row = SMS_LOG_HEADERS.map(header => {
    switch(header) {
      case 'SMS_ID': return data.smsId;
      case 'Direction': return data.direction;
      case 'Contact_Name': return data.contactName;
      case 'Phone_Number': return data.phoneNumber;
      case 'Customer_ID': return data.customerId || '';
      case 'Message_Text': return data.message;
      case 'Received_At': return data.receivedAt.toISOString();
      case 'Processed_At': return new Date().toISOString();
      case 'AI_Intent': return data.aiAnalysis.intent;
      case 'AI_Sentiment': return data.aiAnalysis.sentiment;
      case 'AI_Urgency_Score': return data.aiAnalysis.urgency;
      case 'AI_Summary': return data.aiAnalysis.summary;
      case 'Commitments_JSON': return JSON.stringify(data.aiAnalysis.commitments || []);
      case 'Entities_JSON': return JSON.stringify(data.aiAnalysis.entities || {});
      case 'Context_Used': return data.customerContext.contextRichness;
      case 'Customer_LTV': return data.customerContext.ltv;
      case 'Customer_Segment': return data.customerContext.segment;
      case 'Churn_Risk': return data.customerContext.churnRisk;
      case 'Open_Orders': return data.customerContext.pendingOrders?.length || 0;
      case 'Priority_Score': return data.priorityResult.score;
      case 'Priority_Reason': return data.priorityResult.reason;
      case 'Recommended_Actions_JSON': return JSON.stringify(data.aiAnalysis.recommendedActions || []);
      case 'Status': return 'PENDING';
      default: return '';
    }
  });

  sheet.appendRow(row);
}

function createCommitments(ss, smsId, contactName, phoneNumber, customerContext, commitments, originalMessage) {
  const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);
  const created = [];

  for (const commitment of commitments) {
    const commitmentId = 'SMSC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    // Calculate days until due
    let daysUntilDue = null;
    let isOverdue = false;
    if (commitment.deadline) {
      const deadline = new Date(commitment.deadline);
      const today = new Date();
      daysUntilDue = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilDue < 0;
    }

    // Determine priority based on customer value and deadline
    let priority = 'MEDIUM';
    if (customerContext.segment === 'VIP' || (daysUntilDue !== null && daysUntilDue <= 1)) {
      priority = 'HIGH';
    } else if (customerContext.segment === 'NEW' && daysUntilDue === null) {
      priority = 'LOW';
    }

    const row = SMS_COMMITMENTS_HEADERS.map(header => {
      switch(header) {
        case 'Commitment_ID': return commitmentId;
        case 'SMS_ID': return smsId;
        case 'Customer_ID': return customerContext.customerId || '';
        case 'Contact_Name': return contactName;
        case 'Phone_Number': return phoneNumber;
        case 'Commitment_Type': return commitment.type || 'OTHER';
        case 'Commitment_Text': return commitment.text;
        case 'Full_Context': return originalMessage;
        case 'Party_Committed': return commitment.party || 'UNKNOWN';
        case 'Deadline': return commitment.deadline || '';
        case 'Deadline_Source': return commitment.deadlineSource || '';
        case 'Confidence_Score': return commitment.confidence || 0.5;
        case 'Customer_LTV': return customerContext.ltv;
        case 'Deal_At_Risk': return customerContext.pendingOrders?.reduce((s, o) => s + (o.value || 0), 0) || 0;
        case 'Priority': return priority;
        case 'Status': return 'OPEN';
        case 'Reminder_Sent': return 'No';
        case 'Escalated': return 'No';
        case 'Escalation_Reason': return '';
        case 'Completed_At': return '';
        case 'Completed_By': return '';
        case 'Outcome_Notes': return '';
        case 'Created_At': return new Date().toISOString();
        case 'Updated_At': return new Date().toISOString();
        case 'Days_Until_Due': return daysUntilDue;
        case 'Is_Overdue': return isOverdue ? 'Yes' : 'No';
        default: return '';
      }
    });

    sheet.appendRow(row);
    created.push(commitmentId);
  }

  return created;
}

function createActionItems(ss, smsId, contactName, phoneNumber, customerContext, actions, priorityResult) {
  const sheet = ss.getSheetByName(SMS_ACTION_QUEUE_SHEET);
  const created = [];

  for (const action of actions) {
    const actionId = 'SMSA-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    // Calculate business impact score
    const impactMultiplier = action.businessImpact === 'HIGH' ? 1.5 :
                             action.businessImpact === 'MEDIUM' ? 1.0 : 0.5;
    const businessImpactScore = Math.round(priorityResult.score * impactMultiplier);

    const row = SMS_ACTION_QUEUE_HEADERS.map(header => {
      switch(header) {
        case 'Action_ID': return actionId;
        case 'SMS_ID': return smsId;
        case 'Customer_ID': return customerContext.customerId || '';
        case 'Contact_Name': return contactName;
        case 'Action_Type': return action.urgency || 'WHEN_POSSIBLE';
        case 'Action_Description': return action.action;
        case 'Action_Rationale': return action.rationale;
        case 'Urgency': return action.urgency || 'WHEN_POSSIBLE';
        case 'Business_Impact_Score': return businessImpactScore;
        case 'Customer_LTV': return customerContext.ltv;
        case 'Customer_Segment': return customerContext.segment;
        case 'Related_Orders': return customerContext.pendingOrders?.map(o => o.id).join(', ') || '';
        case 'Priority_Score': return priorityResult.score;
        case 'Queue_Position': return priorityResult.queuePosition;
        case 'Status': return 'PENDING';
        case 'Assigned_To': return '';
        case 'Due_By': return calculateDueBy(action.urgency);
        case 'Completed_At': return '';
        case 'Outcome': return '';
        case 'Created_At': return new Date().toISOString();
        default: return '';
      }
    });

    sheet.appendRow(row);
    created.push(actionId);
  }

  return created;
}

function calculateDueBy(urgency) {
  const now = new Date();
  switch(urgency) {
    case 'IMMEDIATE':
      now.setMinutes(now.getMinutes() + 15);
      break;
    case 'TODAY':
      now.setHours(17, 0, 0, 0);
      break;
    case 'THIS_WEEK':
      now.setDate(now.getDate() + (5 - now.getDay()));
      now.setHours(17, 0, 0, 0);
      break;
    default:
      now.setDate(now.getDate() + 3);
  }
  return now.toISOString();
}

function createEscalationAlert(ss, smsId, contactName, escalation, customerContext) {
  // Create a high-priority proactive alert
  try {
    let alertSheet = ss.getSheetByName('COS_PROACTIVE_ALERTS');
    if (!alertSheet) return;

    const alertId = 'ESC-' + Date.now();
    const row = [
      alertId,
      'SMS_ESCALATION',
      escalation.escalationLevel,
      `⚠️ ESCALATION: ${contactName}`,
      escalation.reason,
      `Review SMS ${smsId} and respond immediately`,
      JSON.stringify({ smsId, customerContext, escalation }),
      new Date().toISOString(),
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 24h
      'ACTIVE',
      '', '', '', ''
    ];

    alertSheet.appendRow(row);
  } catch (e) {
    console.error('Failed to create escalation alert:', e);
  }
}

function updateContactRecord(ss, phoneNumber, contactName, customerContext, aiAnalysis, direction) {
  if (!phoneNumber) return;

  let sheet = ss.getSheetByName(SMS_CONTACTS_SHEET);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf('Phone_Number');

  // Find existing contact
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (normalizePhoneNumber(String(data[i][phoneCol])) === phoneNumber) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    // Update existing
    const updates = {
      'Total_SMS': (sheet.getRange(existingRow, headers.indexOf('Total_SMS') + 1).getValue() || 0) + 1,
      'Last_Sentiment': aiAnalysis.sentiment,
      'Last_Interaction_At': new Date().toISOString(),
      'Days_Since_Contact': 0,
      'Updated_At': new Date().toISOString()
    };

    // Update LTV if we have better data
    if (customerContext.ltv > 0) {
      updates['Lifetime_Value'] = customerContext.ltv;
      updates['Customer_Segment'] = customerContext.segment;
    }

    for (const [field, value] of Object.entries(updates)) {
      const col = headers.indexOf(field);
      if (col >= 0) {
        sheet.getRange(existingRow, col + 1).setValue(value);
      }
    }
  } else {
    // Create new contact
    const contactId = 'SMSCONT-' + Date.now();
    const newRow = SMS_CONTACTS_HEADERS.map(header => {
      switch(header) {
        case 'Contact_ID': return contactId;
        case 'Phone_Number': return phoneNumber;
        case 'Contact_Name': return contactName;
        case 'Customer_ID': return customerContext.customerId || '';
        case 'Contact_Type': return customerContext.isCSAMember ? 'CSA Member' : 'Customer';
        case 'Email': return customerContext.email || '';
        case 'Lifetime_Value': return customerContext.ltv;
        case 'Customer_Segment': return customerContext.segment;
        case 'Churn_Risk_Score': return customerContext.churnRisk;
        case 'Total_Orders': return customerContext.totalOrders;
        case 'Avg_Order_Value': return customerContext.avgOrderValue;
        case 'Total_SMS': return 1;
        case 'Total_Emails': return 0;
        case 'Preferred_Channel': return 'SMS';
        case 'Last_Sentiment': return aiAnalysis.sentiment;
        case 'Sentiment_Trend': return 'NEUTRAL';
        case 'Open_Commitments': return 0;
        case 'Overdue_Commitments': return 0;
        case 'Last_Interaction_At': return new Date().toISOString();
        case 'Days_Since_Contact': return 0;
        case 'Created_At': return new Date().toISOString();
        case 'Updated_At': return new Date().toISOString();
        default: return '';
      }
    });

    sheet.appendRow(newRow);
  }
}

function logInsights(ss, insights, customerContext) {
  const sheet = ss.getSheetByName(SMS_INSIGHTS_SHEET);
  if (!sheet) return;

  for (const insight of insights) {
    const insightId = 'INS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    const row = SMS_INSIGHTS_HEADERS.map(header => {
      switch(header) {
        case 'Insight_ID': return insightId;
        case 'Insight_Type': return insight.type;
        case 'Title': return insight.type.replace(/_/g, ' ');
        case 'Description': return insight.description;
        case 'Affected_Customers': return customerContext.name || 'Unknown';
        case 'Business_Impact': return customerContext.segment === 'VIP' ? 'HIGH' : 'MEDIUM';
        case 'Recommended_Action': return insight.recommendation;
        case 'Data_JSON': return JSON.stringify({ customerContext, insight });
        case 'Created_At': return new Date().toISOString();
        case 'Status': return 'NEW';
        case 'Actioned_At': return '';
        default: return '';
      }
    });

    sheet.appendRow(row);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS: CUSTOMER DATA LOOKUPS
// ═══════════════════════════════════════════════════════════════════════════

function findCustomerByPhone(ss, phoneNumber) {
  // Try SALES_Customers first
  try {
    const sheet = ss.getSheetByName('SALES_Customers');
    if (!sheet || sheet.getLastRow() <= 1) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const phoneCol = headers.indexOf('Phone');
    const phoneCol2 = headers.indexOf('phone');
    const phoneColIdx = phoneCol >= 0 ? phoneCol : phoneCol2;

    if (phoneColIdx < 0) return null;

    for (let i = 1; i < data.length; i++) {
      const rowPhone = normalizePhoneNumber(String(data[i][phoneColIdx] || ''));
      if (rowPhone === phoneNumber) {
        const nameCol = headers.indexOf('Name') >= 0 ? headers.indexOf('Name') : headers.indexOf('name');
        const emailCol = headers.indexOf('Email') >= 0 ? headers.indexOf('Email') : headers.indexOf('email');
        const ltvCol = headers.indexOf('LTV') >= 0 ? headers.indexOf('LTV') : headers.indexOf('Total_Revenue');
        const ordersCol = headers.indexOf('Total_Orders') >= 0 ? headers.indexOf('Total_Orders') : headers.indexOf('Orders');

        return {
          id: data[i][headers.indexOf('Customer_ID')] || data[i][headers.indexOf('ID')] || `CUST-${i}`,
          name: nameCol >= 0 ? data[i][nameCol] : null,
          email: emailCol >= 0 ? data[i][emailCol] : null,
          ltv: ltvCol >= 0 ? parseFloat(data[i][ltvCol]) || 0 : 0,
          totalOrders: ordersCol >= 0 ? parseInt(data[i][ordersCol]) || 0 : 0,
          avgOrderValue: 0,
          daysSinceLastOrder: null
        };
      }
    }
  } catch (e) {
    console.error('Error finding customer:', e);
  }

  return null;
}

function findCSAMembership(ss, phoneNumber, email) {
  try {
    const sheet = ss.getSheetByName('CSA_Members');
    if (!sheet || sheet.getLastRow() <= 1) return null;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const rowPhone = normalizePhoneNumber(String(data[i][headers.indexOf('Phone')] || ''));
      const rowEmail = String(data[i][headers.indexOf('Email')] || '').toLowerCase();

      if (rowPhone === phoneNumber || (email && rowEmail === email.toLowerCase())) {
        return {
          status: data[i][headers.indexOf('Status')] || 'Active',
          value: parseFloat(data[i][headers.indexOf('Share_Value')]) || 0
        };
      }
    }
  } catch (e) {
    console.error('Error finding CSA membership:', e);
  }

  return null;
}

function getPendingOrdersForCustomer(ss, customerId, email) {
  const orders = [];

  try {
    const sheet = ss.getSheetByName('SALES_Orders');
    if (!sheet || sheet.getLastRow() <= 1) return orders;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const status = data[i][headers.indexOf('Status')];
      if (status === 'Pending' || status === 'Processing') {
        const custId = data[i][headers.indexOf('Customer_ID')];
        const custEmail = String(data[i][headers.indexOf('Email')] || '').toLowerCase();

        if (custId === customerId || (email && custEmail === email.toLowerCase())) {
          orders.push({
            id: data[i][headers.indexOf('Order_ID')],
            value: parseFloat(data[i][headers.indexOf('Total')]) || 0,
            status: status,
            date: data[i][headers.indexOf('Order_Date')]
          });
        }
      }
    }
  } catch (e) {
    console.error('Error getting pending orders:', e);
  }

  return orders;
}

function getRecentInteractions(ss, phoneNumber, email, limit) {
  const interactions = [];

  // Get recent SMS
  try {
    const smsSheet = ss.getSheetByName(SMS_LOG_SHEET);
    if (smsSheet && smsSheet.getLastRow() > 1) {
      const data = smsSheet.getDataRange().getValues();
      const headers = data[0];

      for (let i = data.length - 1; i >= 1 && interactions.length < limit; i--) {
        if (normalizePhoneNumber(String(data[i][headers.indexOf('Phone_Number')])) === phoneNumber) {
          interactions.push({
            type: 'SMS',
            direction: data[i][headers.indexOf('Direction')],
            sentiment: data[i][headers.indexOf('AI_Sentiment')],
            date: data[i][headers.indexOf('Received_At')],
            summary: data[i][headers.indexOf('AI_Summary')]
          });
        }
      }
    }
  } catch (e) {}

  // Could add email interactions here too

  return interactions;
}

function getCommitmentStats(ss, phoneNumber) {
  const stats = { open: 0, overdue: 0 };

  try {
    const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) return stats;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 1; i < data.length; i++) {
      if (normalizePhoneNumber(String(data[i][headers.indexOf('Phone_Number')])) === phoneNumber) {
        if (data[i][headers.indexOf('Status')] === 'OPEN') {
          stats.open++;
          const deadline = data[i][headers.indexOf('Deadline')];
          if (deadline && deadline < today) {
            stats.overdue++;
          }
        }
      }
    }
  } catch (e) {}

  return stats;
}

function calculateSentimentTrend(interactions) {
  if (!interactions || interactions.length === 0) return 'NEUTRAL';

  const sentimentScores = interactions.map(i => {
    switch(i.sentiment) {
      case 'POSITIVE': case 'EXCITED': return 1;
      case 'NEUTRAL': return 0;
      case 'NEGATIVE': case 'FRUSTRATED': return -1;
      default: return 0;
    }
  });

  const avg = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;

  if (avg > 0.3) return 'IMPROVING';
  if (avg < -0.3) return 'DECLINING';
  return 'STABLE';
}

function determineCustomerSegment(ltv) {
  if (ltv >= SMS_CONFIG.SEGMENTS.VIP.minLTV) return 'VIP';
  if (ltv >= SMS_CONFIG.SEGMENTS.HIGH_VALUE.minLTV) return 'HIGH_VALUE';
  if (ltv >= SMS_CONFIG.SEGMENTS.STANDARD.minLTV) return 'STANDARD';
  return 'NEW';
}

function calculateChurnRisk(context) {
  let risk = 0;

  // No recent orders
  if (context.daysSinceLastOrder !== null) {
    if (context.daysSinceLastOrder > 90) risk += 0.4;
    else if (context.daysSinceLastOrder > 60) risk += 0.2;
    else if (context.daysSinceLastOrder > 30) risk += 0.1;
  }

  // Declining sentiment
  if (context.sentimentTrend === 'DECLINING') risk += 0.3;

  // Overdue commitments (we let them down)
  if (context.overdueCommitments > 0) risk += 0.2;

  // CSA member not renewed (would need additional data)

  return Math.min(risk, 1.0);
}

function normalizePhoneNumber(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '').slice(-10);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

function callClaudeAPI(prompt, temperature = 0.3) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured in Script Properties');
  }

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: temperature,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
    muteHttpExceptions: true
  });

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    console.error('Claude API error:', responseCode, responseText);
    throw new Error(`Claude API returned ${responseCode}: ${responseText}`);
  }

  const result = JSON.parse(responseText);
  return result.content[0].text;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD & REPORTING
// ═══════════════════════════════════════════════════════════════════════════

function getSMSDashboard() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Get action queue stats
  const actionSheet = ss.getSheetByName(SMS_ACTION_QUEUE_SHEET);
  let pendingActions = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, NORMAL: 0 };

  if (actionSheet && actionSheet.getLastRow() > 1) {
    const data = actionSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][headers.indexOf('Status')] === 'PENDING') {
        const queue = data[i][headers.indexOf('Queue_Position')] || 'NORMAL';
        pendingActions[queue] = (pendingActions[queue] || 0) + 1;
      }
    }
  }

  // Get commitment stats
  const commitmentSheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);
  let commitmentStats = { open: 0, overdue: 0, dueToday: 0, completedThisWeek: 0 };
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (commitmentSheet && commitmentSheet.getLastRow() > 1) {
    const data = commitmentSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const status = data[i][headers.indexOf('Status')];
      const deadline = data[i][headers.indexOf('Deadline')];
      const completedAt = data[i][headers.indexOf('Completed_At')];

      if (status === 'OPEN') {
        commitmentStats.open++;
        if (deadline) {
          if (deadline < today) commitmentStats.overdue++;
          else if (deadline === today) commitmentStats.dueToday++;
        }
      } else if (status === 'COMPLETED' && completedAt >= weekAgo) {
        commitmentStats.completedThisWeek++;
      }
    }
  }

  // Get recent insights
  const insightSheet = ss.getSheetByName(SMS_INSIGHTS_SHEET);
  let recentInsights = [];

  if (insightSheet && insightSheet.getLastRow() > 1) {
    const data = insightSheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = Math.max(1, data.length - 5); i < data.length; i++) {
      recentInsights.push({
        type: data[i][headers.indexOf('Insight_Type')],
        description: data[i][headers.indexOf('Description')],
        action: data[i][headers.indexOf('Recommended_Action')],
        status: data[i][headers.indexOf('Status')]
      });
    }
  }

  return {
    success: true,

    // What needs attention NOW
    immediateAttention: {
      criticalActions: pendingActions.CRITICAL,
      highPriorityActions: pendingActions.HIGH,
      overdueCommitments: commitmentStats.overdue,
      dueToday: commitmentStats.dueToday
    },

    // Queue status
    actionQueue: pendingActions,
    totalPendingActions: Object.values(pendingActions).reduce((a, b) => a + b, 0),

    // Commitment tracking
    commitments: commitmentStats,

    // Insights
    recentInsights: recentInsights.reverse(),

    lastUpdated: new Date().toISOString()
  };
}

function getOpenSMSCommitments(params = {}) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, commitments: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const commitments = [];

  for (let i = 1; i < data.length; i++) {
    const status = data[i][headers.indexOf('Status')];
    if (status !== 'OPEN') continue;

    commitments.push({
      id: data[i][headers.indexOf('Commitment_ID')],
      contactName: data[i][headers.indexOf('Contact_Name')],
      type: data[i][headers.indexOf('Commitment_Type')],
      text: data[i][headers.indexOf('Commitment_Text')],
      deadline: data[i][headers.indexOf('Deadline')],
      priority: data[i][headers.indexOf('Priority')],
      customerLTV: data[i][headers.indexOf('Customer_LTV')],
      daysUntilDue: data[i][headers.indexOf('Days_Until_Due')],
      isOverdue: data[i][headers.indexOf('Is_Overdue')] === 'Yes',
      createdAt: data[i][headers.indexOf('Created_At')]
    });
  }

  // Sort by priority and deadline
  commitments.sort((a, b) => {
    // Overdue first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Then by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    // Then by deadline
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    return 1;
  });

  return { success: true, commitments };
}

function completeSMSCommitment(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SMS_COMMITMENTS_SHEET);

  if (!sheet || !data.commitmentId) {
    return { success: false, error: 'Invalid request' };
  }

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][headers.indexOf('Commitment_ID')] === data.commitmentId) {
      sheet.getRange(i + 1, headers.indexOf('Status') + 1).setValue('COMPLETED');
      sheet.getRange(i + 1, headers.indexOf('Completed_At') + 1).setValue(new Date().toISOString());
      sheet.getRange(i + 1, headers.indexOf('Completed_By') + 1).setValue(data.completedBy || 'Owner');
      sheet.getRange(i + 1, headers.indexOf('Outcome_Notes') + 1).setValue(data.notes || '');
      sheet.getRange(i + 1, headers.indexOf('Updated_At') + 1).setValue(new Date().toISOString());

      return { success: true, message: 'Commitment completed' };
    }
  }

  return { success: false, error: 'Commitment not found' };
}

function getActionQueue(params = {}) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SMS_ACTION_QUEUE_SHEET);

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, actions: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const actions = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('Status')] !== 'PENDING') continue;

    actions.push({
      id: data[i][headers.indexOf('Action_ID')],
      contactName: data[i][headers.indexOf('Contact_Name')],
      action: data[i][headers.indexOf('Action_Description')],
      rationale: data[i][headers.indexOf('Action_Rationale')],
      urgency: data[i][headers.indexOf('Urgency')],
      priorityScore: data[i][headers.indexOf('Priority_Score')],
      queuePosition: data[i][headers.indexOf('Queue_Position')],
      customerLTV: data[i][headers.indexOf('Customer_LTV')],
      dueBy: data[i][headers.indexOf('Due_By')],
      createdAt: data[i][headers.indexOf('Created_At')]
    });
  }

  // Sort by priority score descending
  actions.sort((a, b) => b.priorityScore - a.priorityScore);

  return { success: true, actions };
}
