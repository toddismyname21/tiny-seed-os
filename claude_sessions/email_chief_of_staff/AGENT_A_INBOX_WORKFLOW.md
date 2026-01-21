# AGENT A: INBOX & WORKFLOW ENGINE

**Mission:** Build the core email triage and workflow state machine
**Priority:** P0 - Start Immediately
**Estimated Effort:** 1 week

---

## YOUR RESPONSIBILITIES

1. Create Gmail thread processing with full body access
2. Implement AI-powered email classification
3. Build workflow state machine (NEW → RESOLVED)
4. Implement follow-up tracking and reminders
5. Create approval queue system

---

## SHEETS TO CREATE

### 1. EMAIL_INBOX_STATE

```javascript
const EMAIL_INBOX_STATE_HEADERS = [
  'Thread_ID',        // Gmail thread ID (PK)
  'Message_ID',       // Latest message ID
  'Subject',          // Email subject
  'From',             // Sender email
  'From_Name',        // Sender display name
  'To',               // Recipients
  'Received_At',      // When received
  'Category',         // CUSTOMER, VENDOR, INTERNAL, MARKETING, PERSONAL
  'Priority',         // CRITICAL, HIGH, MEDIUM, LOW
  'Status',           // NEW, TRIAGED, AWAITING_RESPONSE, AWAITING_THEM, RESOLVED, ARCHIVED
  'Assigned_To',      // User ID
  'Due_Date',         // Response deadline
  'Follow_Up_Date',   // Next follow-up
  'Related_Customer_ID',
  'Related_Vendor_ID',
  'Related_Order_ID',
  'Tags',             // JSON array
  'AI_Summary',       // Claude-generated summary
  'AI_Suggested_Action',
  'AI_Confidence',    // 0.0-1.0
  'Workflow_State',   // JSON state data
  'Created_At',
  'Updated_At',
  'Resolved_At',
  'Resolution_Notes'
];
```

### 2. EMAIL_ACTIONS

```javascript
const EMAIL_ACTIONS_HEADERS = [
  'Action_ID',        // UUID (PK)
  'Thread_ID',        // FK to EMAIL_INBOX_STATE
  'Action_Type',      // REPLY, FORWARD, CREATE_TASK, CREATE_EVENT, UPDATE_CRM, SEND_INVOICE
  'Action_Status',    // PENDING_APPROVAL, APPROVED, EXECUTED, REJECTED, EXPIRED
  'Suggested_By',     // Which agent
  'Suggested_At',
  'Draft_Content',    // Email draft or action details
  'Approval_Required',// Boolean
  'Approved_By',
  'Approved_At',
  'Executed_At',
  'Execution_Result', // JSON
  'Expiry_Time',
  'Notes'
];
```

### 3. EMAIL_FOLLOWUPS (Enhanced)

```javascript
const EMAIL_FOLLOWUPS_HEADERS = [
  'Followup_ID',      // UUID (PK)
  'Thread_ID',        // FK to EMAIL_INBOX_STATE
  'Type',             // WAITING_RESPONSE, SCHEDULED_SEND, REMINDER, ESCALATION
  'Due_Date',
  'Reminder_Count',
  'Max_Reminders',
  'Escalate_To',
  'Status',           // ACTIVE, SNOOZED, COMPLETED, ESCALATED
  'Created_At',
  'Last_Reminder_At',
  'Completed_At'
];
```

---

## FUNCTIONS TO IMPLEMENT

### Core Processing

```javascript
/**
 * Process a single email thread with full body access
 * @param {string} threadId - Gmail thread ID
 * @returns {Object} Processed email with AI analysis
 */
function processEmailThread(threadId) {
  // 1. Get full thread from Gmail API
  // 2. Extract all messages, bodies, attachments
  // 3. Call Claude for classification + summary
  // 4. Create/update EMAIL_INBOX_STATE row
  // 5. Suggest actions based on content
  // 6. Return processed result
}

/**
 * Triage all new emails in inbox
 * @returns {Object} Summary of processed emails
 */
function triageInbox() {
  // 1. Get unprocessed threads (not in EMAIL_INBOX_STATE)
  // 2. Process each with processEmailThread()
  // 3. Apply workflow rules
  // 4. Return summary
}

/**
 * Classify email using Claude AI
 * @param {Object} emailData - Processed email data
 * @returns {Object} Classification result
 */
function classifyEmail(emailData) {
  // Use Claude to determine:
  // - Category (CUSTOMER, VENDOR, INTERNAL, MARKETING, PERSONAL)
  // - Priority (CRITICAL, HIGH, MEDIUM, LOW)
  // - Suggested action
  // - Summary
}
```

### Workflow State Machine

```javascript
/**
 * Transition email to new state
 * @param {string} threadId
 * @param {string} newStatus
 * @param {Object} metadata
 */
function transitionEmailState(threadId, newStatus, metadata) {
  // Valid transitions:
  // NEW → TRIAGED
  // TRIAGED → AWAITING_RESPONSE | AWAITING_REVIEW
  // AWAITING_REVIEW → TRIAGED
  // AWAITING_RESPONSE → AWAITING_THEM | RESOLVED
  // AWAITING_THEM → RESOLVED | AWAITING_RESPONSE (if they respond)
  // Any → ARCHIVED
}

/**
 * Get emails by workflow status
 * @param {Object} params - Filter params
 */
function getEmailsByStatus(params) {
  // Filter EMAIL_INBOX_STATE by status
}
```

### Follow-up System

```javascript
/**
 * Create follow-up reminder
 * @param {string} threadId
 * @param {Object} options
 */
function createFollowUp(threadId, options) {
  // Create EMAIL_FOLLOWUPS row
  // Set due date, max reminders, escalation
}

/**
 * Check and process overdue follow-ups
 * Runs hourly via trigger
 */
function checkOverdueFollowups() {
  // 1. Find ACTIVE followups past due date
  // 2. Increment reminder count
  // 3. Send reminder or escalate
  // 4. Update last reminder timestamp
}

/**
 * Get emails awaiting external response
 */
function getAwaitingResponse() {
  // Return emails in AWAITING_THEM status
}
```

### Action Queue

```javascript
/**
 * Suggest an action for approval
 * @param {string} threadId
 * @param {string} actionType
 * @param {Object} draft
 */
function suggestAction(threadId, actionType, draft) {
  // Create EMAIL_ACTIONS row with PENDING_APPROVAL status
  // Set expiry time (24h default)
}

/**
 * Get pending approvals
 */
function getPendingApprovals() {
  // Return EMAIL_ACTIONS with PENDING_APPROVAL status
}

/**
 * Approve an action
 * @param {string} actionId
 * @param {string} approvedBy
 */
function approveAction(actionId, approvedBy) {
  // Update status to APPROVED
  // Execute the action
  // Log result
}

/**
 * Check for expired actions
 * Runs hourly via trigger
 */
function expireOldActions() {
  // Find PENDING_APPROVAL past expiry_time
  // Set status to EXPIRED
}
```

---

## API ENDPOINTS TO REGISTER

Add to doGet/doPost router:

```javascript
// Agent A: Inbox & Workflow
case 'triageEmail':
  return jsonResponse(processEmailThread(e.parameter.threadId));
case 'triageInbox':
  return jsonResponse(triageInbox());
case 'getEmailsByStatus':
  return jsonResponse(getEmailsByStatus(e.parameter));
case 'updateEmailStatus':
  return jsonResponse(transitionEmailState(data.threadId, data.status, data.metadata));
case 'assignEmail':
  return jsonResponse(assignEmail(data.threadId, data.assignTo));
case 'setFollowUp':
  return jsonResponse(createFollowUp(data.threadId, data.options));
case 'resolveEmail':
  return jsonResponse(resolveEmail(data.threadId, data.notes));
case 'getOverdueFollowups':
  return jsonResponse(getOverdueFollowups());
case 'getAwaitingResponse':
  return jsonResponse(getAwaitingResponse());
case 'getPendingApprovals':
  return jsonResponse(getPendingApprovals());
case 'approveAction':
  return jsonResponse(approveAction(data.actionId, data.approvedBy));
case 'rejectAction':
  return jsonResponse(rejectAction(data.actionId, data.reason));
```

---

## CLASSIFICATION PROMPT

Use this system prompt for Claude classification:

```
You are the Email Triage AI for Tiny Seed Farm, a small organic vegetable and flower farm.

Given an email thread, analyze and return JSON:

{
  "category": "CUSTOMER" | "VENDOR" | "INTERNAL" | "MARKETING" | "PERSONAL",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "2-3 sentence summary",
  "suggestedAction": "What should be done next",
  "confidence": 0.0-1.0,
  "extractedData": {
    "customerName": "if detected",
    "orderNumber": "if mentioned",
    "deadline": "if mentioned",
    "amount": "if mentioned"
  },
  "tags": ["relevant", "tags"]
}

Priority Rules:
- CRITICAL: Payment issues, legal, urgent deadlines within 24h
- HIGH: Customer complaints, vendor confirmations, time-sensitive
- MEDIUM: General inquiries, routine orders
- LOW: Marketing, newsletters, FYI only
```

---

## TRIGGERS TO CREATE

```javascript
function setupEmailWorkflowTriggers() {
  // Triage new emails every 5 minutes
  ScriptApp.newTrigger('triageInbox')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Check follow-ups every hour
  ScriptApp.newTrigger('checkOverdueFollowups')
    .timeBased()
    .everyHours(1)
    .create();

  // Expire old actions every hour
  ScriptApp.newTrigger('expireOldActions')
    .timeBased()
    .everyHours(1)
    .create();
}
```

---

## ACCEPTANCE TESTS

| Test | Input | Expected Output |
|------|-------|-----------------|
| New email processing | Gmail thread ID | EMAIL_INBOX_STATE row created, AI analysis complete |
| Customer detection | Email from known customer | Related_Customer_ID populated |
| Priority classification | Email with "URGENT" | Priority = CRITICAL |
| Follow-up creation | setFollowUp(threadId, {dueDate}) | EMAIL_FOLLOWUPS row created |
| State transition | NEW → TRIAGED | Status updated, timestamp logged |
| Action suggestion | Customer inquiry | REPLY action suggested |
| Action approval | approveAction(id) | Action executed, result logged |
| Overdue detection | Follow-up past due | Reminder triggered |

---

## EXISTING CODE TO LEVERAGE

Located in `apps_script/MERGED TOTAL.js`:

| Function | Line | Purpose |
|----------|------|---------|
| `gatherEmailContext()` | 40905 | Gets 50 threads - EXTEND THIS |
| `askClaudeEmail()` | 40823 | Claude integration - REUSE |
| `autoSortInbox()` | 32030 | Label rules - INTEGRATE |
| `EMAIL_RULES` | ~32000 | 8 labels defined - EXTEND |

---

## FILE TO CREATE

Create: `apps_script/EmailWorkflowEngine.js`

This will contain all Agent A functions. Then merge into MERGED TOTAL.js via clasp.

---

## HANDOFF TO AGENT B

When you complete:
1. All sheets created with init functions
2. Core triage working
3. Workflow state machine tested
4. Follow-up system operational

Pass control to Agent B (Integrations) with:
- threadId → customer linking
- threadId → order linking
- Action queue → calendar/task creation

---

*Agent A - Start building!*
