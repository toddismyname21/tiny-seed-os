# AGENT C: SECURITY & AUDIT

**Mission:** Implement threat detection and complete audit trail
**Priority:** P1 - In parallel with Agent B
**Estimated Effort:** 3 days

---

## YOUR RESPONSIBILITIES

1. Create comprehensive audit logging
2. Implement phishing/spam detection
3. Create security dashboard
4. Ensure compliance with data handling
5. Enable human override tracking

---

## SHEET TO CREATE

### CHIEF_OF_STAFF_AUDIT

```javascript
const CHIEF_OF_STAFF_AUDIT_HEADERS = [
  'Audit_ID',         // UUID (PK)
  'Timestamp',        // When
  'Agent',            // A, B, C, D, E, ORCHESTRATOR, USER
  'Action',           // What happened
  'Thread_ID',        // Related email (if applicable)
  'Action_ID',        // Related action (if applicable)
  'User_ID',          // User who triggered (if applicable)
  'Input',            // JSON - what was the input
  'Output',           // JSON - what was the result
  'Confidence',       // AI confidence score (if AI action)
  'Human_Override',   // Boolean - was AI decision overridden?
  'Override_Reason',  // Why was it overridden?
  'IP_Address',       // If from web request
  'Session_ID'        // If tracked
];
```

---

## FUNCTIONS TO IMPLEMENT

### Audit Logging

```javascript
/**
 * Log any action in the Chief-of-Staff system
 * Call this from ALL other functions
 * @param {Object} entry
 */
function logChiefOfStaffAudit(entry) {
  const auditEntry = {
    Audit_ID: Utilities.getUuid(),
    Timestamp: new Date().toISOString(),
    Agent: entry.agent || 'UNKNOWN',
    Action: entry.action,
    Thread_ID: entry.threadId || '',
    Action_ID: entry.actionId || '',
    User_ID: entry.userId || '',
    Input: JSON.stringify(entry.input || {}),
    Output: JSON.stringify(entry.output || {}),
    Confidence: entry.confidence || null,
    Human_Override: entry.humanOverride || false,
    Override_Reason: entry.overrideReason || '',
    IP_Address: entry.ipAddress || '',
    Session_ID: entry.sessionId || ''
  };

  // Append to CHIEF_OF_STAFF_AUDIT sheet
}

/**
 * Get audit log with filters
 * @param {Object} params - Filters
 */
function getChiefOfStaffAuditLog(params) {
  // Filter by: agent, action, threadId, userId, dateRange
  // Return paginated results
}
```

### Threat Detection

```javascript
/**
 * Scan email for security threats
 * @param {Object} emailData - Processed email
 */
function scanEmailForThreats(emailData) {
  const threats = [];

  // Check for phishing indicators
  // - Mismatched sender/reply-to
  // - Suspicious links
  // - Urgency + financial request
  // - Known phishing patterns

  // Check for spam indicators
  // - Bulk sender characteristics
  // - Known spam domains

  // Check for data leakage risks
  // - SSN patterns
  // - Credit card patterns
  // - Bank account patterns

  return {
    threatLevel: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS',
    threats: threats,
    confidence: 0.0-1.0,
    recommendation: 'action to take'
  };
}

/**
 * Report suspicious email
 * @param {string} threadId
 * @param {string} reportedBy
 * @param {string} reason
 */
function reportSuspiciousEmail(threadId, reportedBy, reason) {
  // 1. Flag email in EMAIL_INBOX_STATE
  // 2. Log to audit
  // 3. Notify admin
  // 4. Quarantine if dangerous
}

/**
 * Phishing detection patterns
 */
const PHISHING_PATTERNS = [
  /urgent.*password/i,
  /verify.*account/i,
  /suspicious.*activity/i,
  /click.*link.*confirm/i,
  /winner.*prize/i,
  /bank.*update.*information/i
];

const SUSPICIOUS_DOMAINS = [
  // Add known bad domains
];
```

### Security Dashboard

```javascript
/**
 * Get security metrics for dashboard
 */
function getSecurityDashboard() {
  return {
    totalScanned: 0,           // Emails scanned today
    threatsDetected: 0,        // Threats found
    threatsByType: {},         // Breakdown
    falsePositives: 0,         // User-marked safe
    averageConfidence: 0.0,    // AI accuracy
    recentThreats: [],         // Last 10 threats
    auditSummary: {
      totalActions: 0,
      byAgent: {},
      humanOverrides: 0,
      overrideRate: 0.0
    }
  };
}
```

### Override Tracking

```javascript
/**
 * Record when human overrides AI decision
 * @param {string} actionId
 * @param {string} userId
 * @param {string} reason
 */
function recordHumanOverride(actionId, userId, reason) {
  // 1. Update EMAIL_ACTIONS with override info
  // 2. Log to CHIEF_OF_STAFF_AUDIT
  // 3. Feed back to learning system (Agent E)
}

/**
 * Get override analytics
 * For learning system improvement
 */
function getOverrideAnalytics() {
  // Which types of actions get overridden most?
  // Which agents have highest override rate?
  // Common override reasons?
}
```

---

## API ENDPOINTS TO REGISTER

```javascript
// Agent C: Security
case 'scanEmailForThreats':
  return jsonResponse(scanEmailForThreats(data.emailData));
case 'getChiefOfStaffAuditLog':
  return jsonResponse(getChiefOfStaffAuditLog(e.parameter));
case 'reportSuspiciousEmail':
  return jsonResponse(reportSuspiciousEmail(data.threadId, data.reportedBy, data.reason));
case 'getSecurityDashboard':
  return jsonResponse(getSecurityDashboard());
case 'recordHumanOverride':
  return jsonResponse(recordHumanOverride(data.actionId, data.userId, data.reason));
```

---

## INTEGRATION POINTS

### Call logChiefOfStaffAudit() from:

**Agent A:**
- processEmailThread() - Log email processed
- transitionEmailState() - Log state change
- approveAction() - Log approval
- rejectAction() - Log rejection

**Agent B:**
- linkEmailToCustomer() - Log link created
- createCalendarEventFromEmail() - Log event suggestion
- executeTaskCreation() - Log task created

**Agent D:**
- All user interactions - Log UI actions

**Agent E:**
- activatePattern() - Log pattern activation
- deactivatePattern() - Log pattern deactivation

---

## SECURITY RULES

### Autonomy Constraints

```javascript
const SECURITY_RULES = {
  // Never auto-send to external recipients without approval
  requireApprovalForExternal: true,

  // Never expose sensitive data in logs
  sensitiveFieldPatterns: [
    /password/i,
    /ssn/i,
    /credit.*card/i,
    /bank.*account/i
  ],

  // Flag emails from unknown senders with attachments
  flagUnknownWithAttachments: true,

  // Require 2 approvals for financial actions
  financialActionDoubleApproval: true,

  // Auto-expire pending actions after 24h
  actionExpiryHours: 24,

  // Rate limit: max actions per hour
  maxActionsPerHour: 50
};
```

---

## ACCEPTANCE TESTS

| Test | Input | Expected Output |
|------|-------|-----------------|
| Audit logging | Any action | Audit entry created |
| Phishing detection | Email with "verify account" | Threat flagged |
| Safe email | Normal customer email | threatLevel = SAFE |
| Override tracking | User changes AI classification | Override logged |
| Security dashboard | Request | Metrics returned |

---

## FILE TO CREATE

Create: `apps_script/EmailSecurity.js`

---

## HANDOFF NOTES

- This agent runs in parallel with Agent B
- Output feeds into Agent E (Learning) for model improvement
- Agent D (UI) will display security dashboard

---

*Agent C - Secure the system!*
