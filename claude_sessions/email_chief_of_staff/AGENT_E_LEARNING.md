# AGENT E: LEARNING SYSTEM

**Mission:** Build continuous learning and pattern recognition
**Priority:** P2 - After core system operational
**Estimated Effort:** 1 week

---

## YOUR RESPONSIBILITIES

1. Create pattern recognition system
2. Build response template matching
3. Implement outcome tracking
4. Create model metrics dashboard
5. Enable safe pattern activation/deactivation
6. Versioning for all learned patterns

---

## SHEETS TO CREATE

### 1. EMAIL_LEARNING

```javascript
const EMAIL_LEARNING_HEADERS = [
  'Pattern_ID',       // UUID (PK)
  'Pattern_Type',     // CLASSIFICATION, PRIORITY, RESPONSE, ROUTING
  'Pattern_Name',     // Human-readable name
  'Pattern_Data',     // JSON - the actual pattern
  'Confidence',       // 0.0-1.0 current confidence
  'Sample_Count',     // How many samples trained on
  'Correct_Count',    // How many correct predictions
  'Accuracy',         // correct / sample
  'Version',          // Pattern version number
  'Active',           // Boolean - currently in use?
  'Created_At',
  'Updated_At',
  'Deprecated_At',    // When replaced by newer version
  'Deprecated_Reason' // Why deprecated
];
```

### 2. EMAIL_TEMPLATES

```javascript
const EMAIL_TEMPLATES_HEADERS = [
  'Template_ID',      // UUID (PK)
  'Name',             // Template name
  'Category',         // CUSTOMER, VENDOR, INTERNAL
  'Subcategory',      // More specific (e.g., "CSA Inquiry", "Order Confirmation")
  'Trigger_Keywords', // JSON array of trigger words
  'Subject_Template', // Subject with {{variables}}
  'Body_Template',    // Body with {{variables}}
  'Variables',        // JSON - required variables with descriptions
  'Use_Count',        // Times used
  'Success_Count',    // Times led to resolution
  'Success_Rate',     // success / use
  'Avg_Edit_Distance',// How much users typically edit before sending
  'Created_By',
  'Created_At',
  'Updated_At',
  'Active'            // Boolean
];
```

### 3. EMAIL_OUTCOMES

```javascript
const EMAIL_OUTCOMES_HEADERS = [
  'Outcome_ID',       // UUID (PK)
  'Thread_ID',        // FK to EMAIL_INBOX_STATE
  'Action_ID',        // FK to EMAIL_ACTIONS
  'Prediction_Type',  // What was predicted (classification, priority, etc.)
  'Predicted_Value',  // What AI predicted
  'Actual_Value',     // What actually happened / was chosen
  'Was_Correct',      // Boolean
  'Was_Overridden',   // Boolean - did human change it?
  'Override_Reason',  // Why overridden
  'Time_To_Resolution',// How long to resolve thread
  'User_Feedback',    // Optional user rating
  'Recorded_At'
];
```

---

## FUNCTIONS TO IMPLEMENT

### Pattern Learning

```javascript
/**
 * Record outcome of a prediction for learning
 * @param {Object} outcome
 */
function recordOutcome(outcome) {
  // 1. Store in EMAIL_OUTCOMES
  // 2. Update related pattern's accuracy if applicable
  // 3. Trigger pattern evaluation if enough new data
}

/**
 * Analyze outcomes and suggest new patterns
 * Runs weekly via trigger
 */
function analyzePatterns() {
  // 1. Look for repeated corrections/overrides
  // 2. Find common characteristics of misclassifications
  // 3. Generate suggested patterns
  // 4. Return for human review
}

/**
 * Get pattern suggestions for review
 */
function getPatternSuggestions() {
  // Return patterns that could be activated
  // Include confidence and sample count
}

/**
 * Activate a learned pattern
 * @param {string} patternId
 * @param {string} activatedBy
 */
function activatePattern(patternId, activatedBy) {
  // 1. Set Active = true
  // 2. Log to audit
  // 3. Deprecate older version of same pattern type
}

/**
 * Deactivate a pattern
 * @param {string} patternId
 * @param {string} reason
 */
function deactivatePattern(patternId, reason) {
  // 1. Set Active = false
  // 2. Set Deprecated_At, Deprecated_Reason
  // 3. Log to audit
}
```

### Template Matching

```javascript
/**
 * Find matching templates for an email
 * @param {Object} emailData
 */
function findMatchingTemplates(emailData) {
  // 1. Get active templates for email's category
  // 2. Score each by keyword match
  // 3. Use Claude for semantic similarity if needed
  // 4. Return top matches with confidence scores
}

/**
 * Create new template from successful response
 * @param {string} actionId - The approved action
 */
function createTemplateFromAction(actionId) {
  // 1. Get the action that was successful
  // 2. Extract variables from content
  // 3. Create template with placeholders
  // 4. Add to EMAIL_TEMPLATES (inactive until reviewed)
}

/**
 * Record template usage
 * @param {string} templateId
 * @param {boolean} wasSuccessful
 * @param {number} editDistance - How much was it edited
 */
function recordTemplateUsage(templateId, wasSuccessful, editDistance) {
  // Update template stats
}
```

### Model Metrics

```javascript
/**
 * Get learning system metrics
 */
function getModelMetrics() {
  return {
    classification: {
      totalPredictions: 0,
      accuracy: 0.0,
      byCategory: {},  // accuracy per category
      recentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    },
    priority: {
      totalPredictions: 0,
      accuracy: 0.0,
      byPriority: {},
      recentTrend: ''
    },
    templates: {
      totalTemplates: 0,
      activeTemplates: 0,
      avgSuccessRate: 0.0,
      topPerforming: [],
      underperforming: []
    },
    patterns: {
      totalPatterns: 0,
      activePatterns: 0,
      pendingSuggestions: 0
    },
    overrides: {
      totalOverrides: 0,
      overrideRate: 0.0,
      commonReasons: []
    }
  };
}

/**
 * Get accuracy trend over time
 * @param {string} metricType
 * @param {number} days
 */
function getAccuracyTrend(metricType, days) {
  // Return daily accuracy for chart
}
```

### Pattern Types

```javascript
/**
 * Classification pattern
 * Learn to categorize emails
 */
const CLASSIFICATION_PATTERN = {
  type: 'CLASSIFICATION',
  features: [
    'sender_domain',     // Domain patterns
    'subject_keywords',  // Subject line analysis
    'body_keywords',     // Body content analysis
    'has_order_number',  // Contains order reference
    'has_payment_ref',   // Contains payment reference
    'historical_sender'  // Previous emails from sender
  ]
};

/**
 * Priority pattern
 * Learn urgency indicators
 */
const PRIORITY_PATTERN = {
  type: 'PRIORITY',
  features: [
    'urgency_words',     // urgent, asap, deadline
    'sender_importance', // VIP customers, key vendors
    'response_deadline', // Detected deadlines
    'financial_amount',  // Large amounts = higher priority
    'waiting_time'       // How long already waiting
  ]
};

/**
 * Routing pattern
 * Learn who should handle what
 */
const ROUTING_PATTERN = {
  type: 'ROUTING',
  features: [
    'topic',             // Subject matter
    'complexity',        // Simple vs complex
    'required_expertise',// Technical, financial, etc.
    'historical_handler' // Who usually handles similar
  ]
};
```

---

## API ENDPOINTS TO REGISTER

```javascript
// Agent E: Learning
case 'recordOutcome':
  return jsonResponse(recordOutcome(data));
case 'getPatternSuggestions':
  return jsonResponse(getPatternSuggestions());
case 'activatePattern':
  return jsonResponse(activatePattern(data.patternId, data.activatedBy));
case 'deactivatePattern':
  return jsonResponse(deactivatePattern(data.patternId, data.reason));
case 'getModelMetrics':
  return jsonResponse(getModelMetrics());
case 'getAccuracyTrend':
  return jsonResponse(getAccuracyTrend(e.parameter.type, e.parameter.days));
case 'findMatchingTemplates':
  return jsonResponse(findMatchingTemplates(data.emailData));
case 'createTemplateFromAction':
  return jsonResponse(createTemplateFromAction(data.actionId));
case 'recordTemplateUsage':
  return jsonResponse(recordTemplateUsage(data.templateId, data.wasSuccessful, data.editDistance));
```

---

## TRIGGERS TO CREATE

```javascript
function setupLearningTriggers() {
  // Weekly pattern analysis - Sunday midnight
  ScriptApp.newTrigger('analyzePatterns')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(0)
    .create();

  // Daily accuracy check - 6 AM
  ScriptApp.newTrigger('checkModelHealth')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();
}

/**
 * Check model health
 * Alert if accuracy drops
 */
function checkModelHealth() {
  const metrics = getModelMetrics();

  // If classification accuracy drops below 85%, alert
  if (metrics.classification.accuracy < 0.85) {
    alertOwner('Classification accuracy dropped to ' +
      Math.round(metrics.classification.accuracy * 100) + '%');
  }

  // If override rate > 20%, patterns may need review
  if (metrics.overrides.overrideRate > 0.20) {
    alertOwner('Override rate is ' +
      Math.round(metrics.overrides.overrideRate * 100) + '% - consider reviewing patterns');
  }
}
```

---

## SAFETY MECHANISMS

### Pattern Versioning

```javascript
/**
 * All patterns are versioned
 * Never delete, only deprecate
 */
function createPatternVersion(existingPatternId, newPatternData) {
  // 1. Get existing pattern
  // 2. Increment version
  // 3. Create new pattern row
  // 4. Deprecate old version
  // Keep audit trail
}
```

### Rollback Capability

```javascript
/**
 * Rollback to previous pattern version
 * @param {string} patternId
 */
function rollbackPattern(patternId) {
  // 1. Deactivate current version
  // 2. Find previous version
  // 3. Reactivate previous version
  // 4. Log rollback
}
```

### Human Review Gate

```javascript
/**
 * New patterns require human activation
 * Auto-suggested patterns start as Active = false
 */
const PATTERN_ACTIVATION_RULES = {
  // Minimum samples before pattern can be activated
  minSamples: 20,

  // Minimum accuracy before pattern can be activated
  minAccuracy: 0.85,

  // Always require human approval
  requireHumanApproval: true,

  // Alert if active pattern drops below threshold
  deactivationThreshold: 0.70
};
```

---

## ACCEPTANCE TESTS

| Test | Input | Expected Output |
|------|-------|-----------------|
| Outcome recording | User overrides classification | EMAIL_OUTCOMES row created |
| Pattern suggestion | 20+ similar overrides | Pattern suggested for review |
| Pattern activation | Approve suggested pattern | Pattern Active = true |
| Template matching | Customer inquiry email | Top matching templates returned |
| Template creation | Successful reply approved | Template created (inactive) |
| Model metrics | Request | Accuracy stats returned |
| Health check | Accuracy drops | Alert triggered |
| Rollback | Request previous version | Old pattern reactivated |

---

## FILE TO CREATE

Create: `apps_script/EmailLearning.js`

---

## INTEGRATION POINTS

### Receives From:

- **Agent A**: Classification outcomes, state transitions
- **Agent C**: Human overrides with reasons
- **Agent D**: User feedback, template edits

### Sends To:

- **Agent A**: Active patterns for classification
- **Agent D**: Model metrics for dashboard
- **Agent C**: Pattern changes for audit

---

## INITIAL SEED TEMPLATES

Create these starter templates:

```javascript
const SEED_TEMPLATES = [
  {
    name: 'CSA Inquiry - Share Sizes',
    category: 'CUSTOMER',
    subcategory: 'CSA Inquiry',
    triggerKeywords: ['csa', 'share', 'size', 'membership', 'join'],
    subject: 'RE: {{original_subject}}',
    body: `Hi {{customer_name}},

Thank you for your interest in our CSA! We offer three share sizes:

• Small Share ($XX/week) - Perfect for 1-2 people
• Regular Share ($XX/week) - Great for 2-4 people
• Large Share ($XX/week) - Ideal for families of 4+

Each share includes a variety of seasonal vegetables harvested fresh from our fields.

The 2026 season runs from {{season_start}} to {{season_end}}.

Would you like more details about any specific share size?

Best,
Tiny Seed Farm`
  },
  {
    name: 'Order Confirmation',
    category: 'VENDOR',
    subcategory: 'Order',
    triggerKeywords: ['confirm', 'order', 'confirmation'],
    subject: 'RE: {{original_subject}}',
    body: `Hi,

I confirm receipt of order #{{order_number}}.

Please proceed with the order as specified.

Thank you,
Tiny Seed Farm`
  },
  {
    name: 'Delivery Schedule Question',
    category: 'CUSTOMER',
    subcategory: 'Delivery',
    triggerKeywords: ['delivery', 'pickup', 'when', 'schedule'],
    subject: 'RE: {{original_subject}}',
    body: `Hi {{customer_name}},

Our delivery/pickup schedule is:
• Tuesday: {{tuesday_locations}}
• Wednesday: {{wednesday_locations}}
• Saturday: Farm pickup 9am-12pm

Your current pickup day is {{customer_pickup_day}}.

Let me know if you need to make any changes!

Best,
Tiny Seed Farm`
  }
];
```

---

*Agent E - Make it learn!*
