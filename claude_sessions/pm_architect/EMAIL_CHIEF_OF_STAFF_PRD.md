# EMAIL CHIEF-OF-STAFF: Production Specification

**Version:** 1.0
**Date:** 2026-01-20
**Author:** PM_Architect Claude
**Priority:** HIGHEST - Owner Priority Project

---

## EXECUTIVE SUMMARY

Transform the existing email AI assistant into a full-stack Chief-of-Staff that:
1. **Never lets anything slip** - Zero cracks in follow-ups
2. **Closes loops with approval gates** - Human-in-the-loop for actions
3. **Learns continuously** - Safe memory with versioning
4. **Command center UI** - Single pane of glass
5. **Expands to farm ops** - Voice, vision, IoT ready

---

## EXISTING INFRASTRUCTURE AUDIT

### What We Have

| Component | Location | Status |
|-----------|----------|--------|
| `askClaudeEmail(query)` | MERGED TOTAL.js:40823 | WORKING - Claude AI email queries |
| `gatherEmailContext()` | MERGED TOTAL.js:40905 | WORKING - Fetches 50 Gmail threads |
| `autoSortInbox()` | MERGED TOTAL.js:32030 | WORKING - 8 labels, hourly trigger |
| `parseEmailsForTasks()` | AccountingModule.js:2476 | WORKING - Accounting email extraction |
| `searchEmailsNatural()` | MERGED TOTAL.js:127 | WORKING - Natural language search |
| `getEmailSummary()` | MERGED TOTAL.js:129 | WORKING - Period summaries |
| EMAIL_RULES | MERGED TOTAL.js | 8 labels configured |
| EMAIL_FOLLOWUPS sheet | Exists | Basic structure |
| EMAIL_DEADLINES sheet | Exists | Basic structure |
| AI_INTERACTIONS sheet | Exists | Logs AI queries |
| AI_TASKS sheet | Exists | Task extraction |

### What's Missing (12 Gaps)

| Gap | Description | Priority |
|-----|-------------|----------|
| Email Body Access | Only snippets, not full threads | P0 |
| Semantic Triage | AI classification beyond rules | P0 |
| Workflow Engine | State machine for follow-ups | P0 |
| Approval Queues | Human-in-the-loop gates | P0 |
| Cross-System Links | Email ↔ Calendar/CRM/Finance | P1 |
| Response Templates | Smart reply drafting | P1 |
| Follow-up Automation | Auto-reminders for pending | P1 |
| Vendor Management | Supplier communication tracking | P1 |
| Customer Timeline | Email history per customer | P2 |
| Email Analytics | Volume, response time, patterns | P2 |
| Security Scanning | Phishing/spam detection | P2 |
| Learning System | Pattern recognition over time | P2 |

---

## ARCHITECTURE

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHIEF-OF-STAFF BRAIN                         │
│                  (Orchestrator / Router)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┬─────────────────┐
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│ INBOX   │     │ INTEGR. │     │ SECURITY│     │ LEARNING│
│ AGENT   │     │ AGENT   │     │ AGENT   │     │ AGENT   │
│ (A)     │     │ (B)     │     │ (C)     │     │ (E)     │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     └───────────────┴───────────────┴───────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │ COMMAND     │
                   │ CENTER UI   │
                   │ (D)         │
                   └─────────────┘
```

### Agent Responsibilities

| Agent | Responsibility | Autonomy Level |
|-------|----------------|----------------|
| **A: Inbox & Workflow** | Triage, classify, route, follow-ups | L2 (Read + Classify) |
| **B: Integrations** | Calendar sync, CRM links, Finance | L1 (Read + Suggest) |
| **C: Security** | Threat detection, audit trail, compliance | L2 (Auto-flag) |
| **D: Command Center** | UI, dashboards, approval queues | N/A (Frontend) |
| **E: Learning** | Pattern recognition, model updates | L1 (Suggest only) |

### Autonomy Levels

| Level | Name | Permissions | Examples |
|-------|------|-------------|----------|
| L0 | Read-Only | Read emails, no actions | Summarize, search |
| L1 | Suggest | Read + draft suggestions | "You might want to..." |
| L2 | Auto-Classify | Read + apply labels/tags | Triage, categorize |
| L3 | Auto-Draft | Create drafts for approval | Response templates |
| L4 | Full Autonomy | Send with pre-approval | Auto-reply templates |

---

## DATA SCHEMAS

### 1. EMAIL_INBOX_STATE (New Sheet)

Track workflow state for every email.

| Column | Type | Description |
|--------|------|-------------|
| Thread_ID | STRING | Gmail thread ID (PK) |
| Message_ID | STRING | Latest message ID |
| Subject | STRING | Email subject |
| From | STRING | Sender email |
| From_Name | STRING | Sender display name |
| To | STRING | Recipients |
| Received_At | DATETIME | When received |
| Category | ENUM | CUSTOMER, VENDOR, INTERNAL, MARKETING, PERSONAL |
| Priority | ENUM | CRITICAL, HIGH, MEDIUM, LOW |
| Status | ENUM | NEW, TRIAGED, AWAITING_RESPONSE, AWAITING_THEM, RESOLVED, ARCHIVED |
| Assigned_To | STRING | User ID |
| Due_Date | DATETIME | Response deadline |
| Follow_Up_Date | DATETIME | Next follow-up |
| Related_Customer_ID | STRING | Link to SALES_Customers |
| Related_Vendor_ID | STRING | Link to VENDORS |
| Related_Order_ID | STRING | Link to order |
| Tags | JSON | ["urgent", "payment", "delivery"] |
| AI_Summary | STRING | Claude-generated summary |
| AI_Suggested_Action | STRING | Recommended next step |
| AI_Confidence | FLOAT | 0.0-1.0 confidence score |
| Workflow_State | JSON | State machine data |
| Created_At | DATETIME | First processed |
| Updated_At | DATETIME | Last updated |
| Resolved_At | DATETIME | When resolved |
| Resolution_Notes | STRING | How it was resolved |

### 2. EMAIL_ACTIONS (New Sheet)

Queue of pending and completed actions.

| Column | Type | Description |
|--------|------|-------------|
| Action_ID | STRING | UUID (PK) |
| Thread_ID | STRING | FK to EMAIL_INBOX_STATE |
| Action_Type | ENUM | REPLY, FORWARD, CREATE_TASK, CREATE_EVENT, UPDATE_CRM, SEND_INVOICE |
| Action_Status | ENUM | PENDING_APPROVAL, APPROVED, EXECUTED, REJECTED, EXPIRED |
| Suggested_By | STRING | Which agent suggested |
| Suggested_At | DATETIME | When suggested |
| Draft_Content | STRING | Email draft or action details |
| Approval_Required | BOOLEAN | Needs human approval? |
| Approved_By | STRING | Who approved |
| Approved_At | DATETIME | When approved |
| Executed_At | DATETIME | When executed |
| Execution_Result | JSON | Result of action |
| Expiry_Time | DATETIME | Auto-reject if not approved by |
| Notes | STRING | Context |

### 3. EMAIL_FOLLOWUPS (Enhanced)

Track follow-up reminders.

| Column | Type | Description |
|--------|------|-------------|
| Followup_ID | STRING | UUID (PK) |
| Thread_ID | STRING | FK to EMAIL_INBOX_STATE |
| Type | ENUM | WAITING_RESPONSE, SCHEDULED_SEND, REMINDER, ESCALATION |
| Due_Date | DATETIME | When to remind |
| Reminder_Count | INT | How many times reminded |
| Max_Reminders | INT | Stop after N reminders |
| Escalate_To | STRING | Escalate if no response |
| Status | ENUM | ACTIVE, SNOOZED, COMPLETED, ESCALATED |
| Created_At | DATETIME | |
| Last_Reminder_At | DATETIME | |
| Completed_At | DATETIME | |

### 4. EMAIL_TEMPLATES (New Sheet)

Response templates for common scenarios.

| Column | Type | Description |
|--------|------|-------------|
| Template_ID | STRING | UUID (PK) |
| Name | STRING | Template name |
| Category | ENUM | CUSTOMER, VENDOR, INTERNAL |
| Trigger_Keywords | JSON | ["order", "payment"] |
| Subject_Template | STRING | Subject with {{variables}} |
| Body_Template | STRING | Body with {{variables}} |
| Variables | JSON | Required variables |
| Use_Count | INT | Times used |
| Success_Rate | FLOAT | % led to resolution |
| Created_By | STRING | |
| Created_At | DATETIME | |
| Updated_At | DATETIME | |

### 5. EMAIL_LEARNING (New Sheet)

Store learned patterns for continuous improvement.

| Column | Type | Description |
|--------|------|-------------|
| Pattern_ID | STRING | UUID (PK) |
| Pattern_Type | ENUM | CLASSIFICATION, PRIORITY, RESPONSE, ROUTING |
| Pattern_Data | JSON | The learned pattern |
| Confidence | FLOAT | 0.0-1.0 |
| Sample_Count | INT | How many samples trained on |
| Accuracy | FLOAT | Measured accuracy |
| Version | INT | Pattern version |
| Active | BOOLEAN | Currently in use? |
| Created_At | DATETIME | |
| Deprecated_At | DATETIME | When replaced |

### 6. CHIEF_OF_STAFF_AUDIT (New Sheet)

Complete audit trail.

| Column | Type | Description |
|--------|------|-------------|
| Audit_ID | STRING | UUID (PK) |
| Timestamp | DATETIME | When |
| Agent | ENUM | A, B, C, D, E, ORCHESTRATOR |
| Action | STRING | What happened |
| Thread_ID | STRING | Related email |
| User_ID | STRING | Related user |
| Input | JSON | Input to action |
| Output | JSON | Result |
| Confidence | FLOAT | AI confidence |
| Human_Override | BOOLEAN | Was AI overridden? |
| Override_Reason | STRING | Why overridden |

---

## API ENDPOINTS

### Agent A: Inbox & Workflow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `triageEmail` | POST | Classify and route single email |
| `triageInbox` | POST | Process all new emails |
| `getEmailsByStatus` | GET | Filter by workflow status |
| `updateEmailStatus` | POST | Change status |
| `assignEmail` | POST | Assign to user |
| `setFollowUp` | POST | Create follow-up reminder |
| `resolveEmail` | POST | Mark resolved with notes |
| `getOverdueFollowups` | GET | Emails past due date |
| `getAwaitingResponse` | GET | Waiting on external response |

### Agent B: Integrations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `linkEmailToCustomer` | POST | Connect email to CRM |
| `linkEmailToOrder` | POST | Connect to order |
| `createCalendarEventFromEmail` | POST | Parse and create event |
| `createTaskFromEmail` | POST | Extract and create task |
| `createInvoiceFromEmail` | POST | Parse and create invoice |
| `getCustomerEmailHistory` | GET | All emails for customer |
| `syncEmailWithCRM` | POST | Update CRM from email |

### Agent C: Security

| Endpoint | Method | Description |
|----------|--------|-------------|
| `scanEmailForThreats` | POST | Phishing/spam detection |
| `getAuditLog` | GET | Retrieve audit trail |
| `reportSuspiciousEmail` | POST | Flag for review |
| `getSecurityDashboard` | GET | Security metrics |

### Agent D: Command Center UI

| Endpoint | Method | Description |
|----------|--------|-------------|
| `getCommandCenterDashboard` | GET | Full dashboard data |
| `getPendingApprovals` | GET | Actions awaiting approval |
| `approveAction` | POST | Approve pending action |
| `rejectAction` | POST | Reject pending action |
| `getDailyBrief` | GET | Morning summary |
| `getAnalytics` | GET | Email metrics |

### Agent E: Learning

| Endpoint | Method | Description |
|----------|--------|-------------|
| `recordOutcome` | POST | Log action outcome |
| `getPatternSuggestions` | GET | Suggested patterns |
| `activatePattern` | POST | Enable learned pattern |
| `deactivatePattern` | POST | Disable pattern |
| `getModelMetrics` | GET | Learning performance |

### Orchestrator

| Endpoint | Method | Description |
|----------|--------|-------------|
| `processNewEmail` | POST | Full pipeline for new email |
| `getChiefOfStaffStatus` | GET | System health |
| `runMorningRoutine` | POST | Daily briefing + triage |
| `runEveningRoutine` | POST | End of day summary |

---

## WORKFLOW STATE MACHINE

### Email Lifecycle

```
┌─────────┐
│   NEW   │
└────┬────┘
     │ triageEmail()
     ▼
┌─────────┐     ┌─────────────────┐
│ TRIAGED │────►│ AWAITING_REVIEW │ (if needs human review)
└────┬────┘     └────────┬────────┘
     │                   │
     │ autoClassify()    │ humanReview()
     ▼                   ▼
┌──────────────────┐
│ AWAITING_RESPONSE│ (we need to reply)
└────────┬─────────┘
         │ sendReply()
         ▼
┌─────────────────┐
│ AWAITING_THEM   │ (waiting on external)
└────────┬────────┘
         │ responseReceived() OR followUp()
         ▼
┌──────────┐
│ RESOLVED │
└──────────┘
```

### Action Approval Flow

```
┌──────────────────┐
│ AI Suggests      │
│ Action           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ PENDING_APPROVAL │───────┐
└────────┬─────────┘       │
         │                 │ 24h timeout
         │ approve()       │
         ▼                 ▼
┌──────────────────┐  ┌─────────┐
│ APPROVED         │  │ EXPIRED │
└────────┬─────────┘  └─────────┘
         │
         │ execute()
         ▼
┌──────────────────┐
│ EXECUTED         │
└──────────────────┘
```

---

## UI WIREFRAMES: COMMAND CENTER

### 1. Dashboard Overview

```
┌────────────────────────────────────────────────────────────┐
│  CHIEF-OF-STAFF COMMAND CENTER              [User] [⚙️]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ INBOX: 47   │ │ PENDING: 5  │ │ OVERDUE: 3  │          │
│  │ 🔴 12 urgent│ │ ⏳ Actions  │ │ ⚠️ Follow-up│          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ MORNING BRIEF                            📅 Jan 20  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ • 3 customer emails need response (oldest: 2 days)  │  │
│  │ • Payment reminder due for CSA Member #142          │  │
│  │ • Seed order confirmation needed from Johnny's      │  │
│  │ • Follow up with Don re: greenhouse rental          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  [View Full Brief] [Triage Now] [Settings]                │
└────────────────────────────────────────────────────────────┘
```

### 2. Inbox Triage View

```
┌────────────────────────────────────────────────────────────┐
│  INBOX TRIAGE                    [Filter ▼] [Sort ▼]      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL  From: johnny@johnnyseeds.com           │  │
│  │ Subject: Order Confirmation #45892 - URGENT         │  │
│  │ "Your seed order requires confirmation by Jan 21"   │  │
│  │ AI: Confirm order + calendar event                  │  │
│  │ [Approve ✓] [Edit] [Reject ✗] [Snooze ⏰]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🟡 HIGH  From: sarah.m@gmail.com                    │  │
│  │ Subject: CSA Membership Question                    │  │
│  │ "I'd like to know about your share sizes..."        │  │
│  │ AI: Use Template "CSA Sizes Info" (95% match)       │  │
│  │ [Approve ✓] [Edit] [Reject ✗] [Snooze ⏰]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3. Approval Queue

```
┌────────────────────────────────────────────────────────────┐
│  PENDING APPROVALS (5)                    [Approve All]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. SEND REPLY - Customer Inquiry                         │
│     To: sarah.m@gmail.com                                  │
│     Draft: "Thank you for your interest in our CSA..."    │
│     Confidence: 95%    Expires: 6h                        │
│     [Approve] [Edit] [Reject]                             │
│                                                            │
│  2. CREATE TASK - Vendor Follow-up                        │
│     Task: "Follow up with Johnny's Seeds - Order #45892"  │
│     Due: Jan 21    Assign: Owner                          │
│     Confidence: 88%    Expires: 12h                       │
│     [Approve] [Edit] [Reject]                             │
│                                                            │
│  3. UPDATE CRM - New Customer                             │
│     Add: "Sarah Miller" to SALES_Customers                │
│     Email: sarah.m@gmail.com    Phone: (detected)         │
│     Confidence: 92%    Expires: 24h                       │
│     [Approve] [Edit] [Reject]                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4. Analytics Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  EMAIL ANALYTICS                          [This Week ▼]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Response Time          │  Volume by Category              │
│  ┌──────────────────┐  │  ┌──────────────────────────┐   │
│  │ Avg: 4.2 hours   │  │  │ Customer     ████████ 42 │   │
│  │ Target: 6 hours  │  │  │ Vendor       ████ 18      │   │
│  │ ✅ On track      │  │  │ Internal     ██ 8         │   │
│  └──────────────────┘  │  │ Marketing    █ 5          │   │
│                         │  └──────────────────────────┘   │
│  Follow-up Compliance   │                                  │
│  ┌──────────────────┐  │  AI Accuracy                     │
│  │ 94% on time      │  │  ┌──────────────────────────┐   │
│  │ 6% overdue       │  │  │ Classification  97%      │   │
│  └──────────────────┘  │  │ Priority        89%      │   │
│                         │  │ Suggestions     76%      │   │
│                         │  └──────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## ACCEPTANCE TESTS

### Agent A: Inbox & Workflow

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| A-001 | New email arrives | Status = NEW, AI summary generated |
| A-002 | triageEmail() on customer email | Category = CUSTOMER, linked to CRM |
| A-003 | triageEmail() on urgent email | Priority = CRITICAL, follow-up created |
| A-004 | Email waits 48h with no response | Escalation triggered |
| A-005 | Email marked resolved | Status = RESOLVED, audit logged |

### Agent B: Integrations

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| B-001 | Email mentions "order #123" | Linked to order in ORDERS sheet |
| B-002 | Email from known customer | Linked to CRM record |
| B-003 | Email says "meeting Thursday 2pm" | Calendar event created in queue |
| B-004 | Invoice request detected | Invoice draft created for approval |
| B-005 | Customer timeline requested | All related emails returned |

### Agent C: Security

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| C-001 | Phishing email received | Flagged, quarantined, admin notified |
| C-002 | Any action executed | Audit log entry created |
| C-003 | Suspicious sender pattern | Alert generated |
| C-004 | Audit log requested | Complete trail returned |

### Agent D: Command Center

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| D-001 | Dashboard loads | Shows inbox count, pending, overdue |
| D-002 | Morning brief requested | Prioritized summary generated |
| D-003 | Action approved | Status changes, action executed |
| D-004 | Action rejected | Status changes, logged |
| D-005 | Action expires | Auto-rejected, logged |

### Agent E: Learning

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| E-001 | User corrects classification | Pattern recorded for learning |
| E-002 | Template used successfully | Success rate incremented |
| E-003 | New pattern detected | Suggested for review |
| E-004 | Pattern accuracy drops | Auto-deactivated |

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Claude A - Inbox & Workflow)
**Estimated Effort:** 1 week

| Task | Deliverable |
|------|-------------|
| Create EMAIL_INBOX_STATE sheet | Schema + init function |
| Create EMAIL_ACTIONS sheet | Schema + init function |
| Create EMAIL_FOLLOWUPS enhanced sheet | Schema + migration |
| Implement triageEmail() | Single email processing |
| Implement triageInbox() | Batch processing |
| Implement workflow state machine | Status transitions |
| Implement follow-up reminders | Trigger-based |

### Phase 2: Integrations (Claude B)
**Estimated Effort:** 1 week

| Task | Deliverable |
|------|-------------|
| Create customer email history | Timeline query |
| Link emails to CRM records | Auto-linking |
| Link emails to orders | Pattern matching |
| Calendar event creation | Approval flow |
| Task creation from email | Approval flow |
| Invoice creation | Approval flow |

### Phase 3: Security & Audit (Claude C)
**Estimated Effort:** 3 days

| Task | Deliverable |
|------|-------------|
| Create CHIEF_OF_STAFF_AUDIT sheet | Schema + init |
| Implement audit logging | All actions logged |
| Implement threat detection | Basic phishing rules |
| Create security dashboard | Metrics endpoint |

### Phase 4: Command Center UI (Claude D)
**Estimated Effort:** 1 week

| Task | Deliverable |
|------|-------------|
| Create command-center.html | New page |
| Dashboard overview | Metrics cards |
| Inbox triage view | Email list + actions |
| Approval queue | Approve/reject flow |
| Analytics dashboard | Charts + metrics |
| Morning brief view | Prioritized summary |

### Phase 5: Learning System (Claude E)
**Estimated Effort:** 1 week

| Task | Deliverable |
|------|-------------|
| Create EMAIL_LEARNING sheet | Schema + init |
| Create EMAIL_TEMPLATES sheet | Schema + init |
| Implement outcome recording | Feedback loop |
| Implement pattern detection | Simple ML |
| Implement template matching | Similarity scoring |
| Create learning dashboard | Model metrics |

---

## AGENT DELEGATION MATRIX

| Agent | Assigned To | Files to Create/Modify |
|-------|-------------|------------------------|
| **A: Inbox & Workflow** | Claude A | EmailWorkflowEngine.js, MERGED TOTAL.js |
| **B: Integrations** | Claude B | EmailIntegrations.js, MERGED TOTAL.js |
| **C: Security** | Claude C | EmailSecurity.js, MERGED TOTAL.js |
| **D: Command Center** | Claude D | command-center.html, email-command.css |
| **E: Learning** | Claude E | EmailLearning.js, MERGED TOTAL.js |

---

## SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response Time | < 6 hours | Avg time to first response |
| Zero Slippage | 100% | No email goes unanswered |
| Follow-up Compliance | > 95% | Follow-ups done on time |
| AI Accuracy | > 90% | Classification accuracy |
| Approval Turnaround | < 30 min | Time to approve actions |
| User Satisfaction | > 4.5/5 | Feedback rating |

---

## TRIGGERS & SCHEDULES

| Trigger | Frequency | Function |
|---------|-----------|----------|
| New email check | Every 5 min | triageInbox() |
| Follow-up check | Every hour | checkOverdueFollowups() |
| Morning brief | Daily 6 AM | runMorningRoutine() |
| Evening summary | Daily 6 PM | runEveningRoutine() |
| Analytics update | Daily midnight | updateAnalytics() |
| Learning update | Weekly Sunday | updateLearningModels() |

---

## SECURITY CONSIDERATIONS

1. **No Auto-Send Without Approval** - All outgoing emails require human approval (L3+ actions)
2. **Audit Everything** - Every AI decision logged with confidence score
3. **Human Override** - Any AI decision can be reversed
4. **Expiring Actions** - Pending approvals expire after 24h
5. **Escalation Paths** - Overdue items escalate to owner
6. **Data Isolation** - Email content not stored in sheets, only metadata

---

## NEXT STEPS

1. **PM Claude**: Approve this PRD
2. **Claude A**: Begin Phase 1 implementation
3. **Claude B-E**: Standby for phase handoffs
4. **Owner**: Review and approve autonomy levels

---

*PRD Version 1.0 - Ready for implementation*
*PM_Architect Claude - 2026-01-20*
