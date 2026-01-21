# AGENT D: COMMAND CENTER UI

**Mission:** Build the single-pane-of-glass Command Center interface
**Priority:** P1 - After Agents A, B, C complete backend
**Estimated Effort:** 1 week

---

## YOUR RESPONSIBILITIES

1. Create command-center.html page
2. Build dashboard overview
3. Build inbox triage view
4. Build approval queue interface
5. Build analytics dashboard
6. Build morning brief view
7. Mobile-responsive design

---

## PAGE STRUCTURE

### command-center.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chief-of-Staff | Tiny Seed Farm</title>
  <script src="auth-guard.js" data-required-role="Manager"></script>
  <script src="api-config.js"></script>
  <link rel="stylesheet" href="command-center.css">
</head>
<body>
  <nav id="main-nav">
    <div class="nav-brand">Chief-of-Staff</div>
    <div class="nav-tabs">
      <button data-tab="dashboard" class="active">Dashboard</button>
      <button data-tab="inbox">Inbox</button>
      <button data-tab="approvals">Approvals <span class="badge" id="approval-count">0</span></button>
      <button data-tab="analytics">Analytics</button>
      <button data-tab="settings">Settings</button>
    </div>
    <div class="nav-user" id="user-info"></div>
  </nav>

  <main id="content">
    <!-- Tab content loaded dynamically -->
  </main>

  <script src="command-center.js"></script>
</body>
</html>
```

---

## TAB 1: DASHBOARD

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  GOOD MORNING, [NAME]                    [Date] [Weather]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   INBOX     │ │  PENDING    │ │  OVERDUE    │          │
│  │     47      │ │     5       │ │     3       │          │
│  │ 🔴 12 new   │ │ ⏳ Actions  │ │ ⚠️ Follow   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ TODAY'S PRIORITY                                     │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ 1. 🔴 Reply to Johnny's Seeds - Order confirmation  │  │
│  │ 2. 🟡 CSA member Sarah - membership question        │  │
│  │ 3. 🟡 Follow up with Don - greenhouse rental        │  │
│  │ 4. 🟢 Review vendor invoice from Green Valley       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ QUICK ACTIONS                                        │  │
│  │ [Triage Now] [View Approvals] [Send Daily Digest]   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### API Calls

```javascript
// Dashboard data
async function loadDashboard() {
  const [inbox, approvals, followups, brief] = await Promise.all([
    apiCall('getEmailsByStatus', { status: 'NEW,TRIAGED' }),
    apiCall('getPendingApprovals'),
    apiCall('getOverdueFollowups'),
    apiCall('getDailyBrief')
  ]);

  renderDashboard({ inbox, approvals, followups, brief });
}
```

---

## TAB 2: INBOX TRIAGE

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  INBOX                    [Filter ▼] [Sort ▼] [Search 🔍]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Filters: [All] [New] [Triaged] [Awaiting] [Resolved]     │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🔴 CRITICAL                                          │  │
│  │ From: johnny@johnnyseeds.com                         │  │
│  │ Subject: Order Confirmation #45892 - URGENT          │  │
│  │ Received: 2 hours ago                                │  │
│  │                                                       │  │
│  │ AI Summary: Seed order requires confirmation by      │  │
│  │ January 21st. Total: $847.50 for spring seeds.       │  │
│  │                                                       │  │
│  │ Suggested: [Reply with Confirmation] (95% confident) │  │
│  │                                                       │  │
│  │ [Open Thread] [Approve Reply] [Custom Reply] [Snooze]│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 🟡 HIGH                                              │  │
│  │ From: sarah.m@gmail.com                              │  │
│  │ Subject: CSA Membership Question                     │  │
│  │ Received: 5 hours ago                                │  │
│  │                                                       │  │
│  │ AI Summary: New potential customer asking about      │  │
│  │ share sizes and pricing for 2026 season.             │  │
│  │                                                       │  │
│  │ Suggested: [Use Template: CSA Info] (92% match)      │  │
│  │ Also: [Create Customer Record]                       │  │
│  │                                                       │  │
│  │ [Open Thread] [Approve Reply] [Custom Reply] [Snooze]│  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  [Load More...]                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Email Card Component

```javascript
function renderEmailCard(email) {
  return `
    <div class="email-card priority-${email.priority.toLowerCase()}">
      <div class="email-header">
        <span class="priority-badge">${getPriorityIcon(email.priority)}</span>
        <span class="category-tag">${email.category}</span>
      </div>
      <div class="email-from">From: ${email.from_name || email.from}</div>
      <div class="email-subject">${email.subject}</div>
      <div class="email-time">${formatTimeAgo(email.received_at)}</div>

      <div class="ai-summary">
        <strong>AI Summary:</strong> ${email.ai_summary}
      </div>

      ${email.ai_suggested_action ? `
        <div class="suggested-action">
          <span>Suggested:</span>
          <button class="btn-suggest" data-action="${email.suggested_action_id}">
            ${email.ai_suggested_action}
          </button>
          <span class="confidence">${Math.round(email.ai_confidence * 100)}% confident</span>
        </div>
      ` : ''}

      <div class="email-actions">
        <button onclick="openThread('${email.thread_id}')">Open Thread</button>
        <button onclick="approveAction('${email.suggested_action_id}')" class="btn-primary">Approve</button>
        <button onclick="customReply('${email.thread_id}')">Custom Reply</button>
        <button onclick="snoozeEmail('${email.thread_id}')">Snooze</button>
      </div>
    </div>
  `;
}
```

---

## TAB 3: APPROVAL QUEUE

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  PENDING APPROVALS (5)                   [Approve All ✓]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SEND REPLY                         Expires in 6h    │  │
│  │ To: sarah.m@gmail.com                               │  │
│  │ Subject: RE: CSA Membership Question                │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Draft Preview:                                       │  │
│  │ "Thank you for your interest in our CSA! We offer   │  │
│  │ three share sizes..."                                │  │
│  │ [View Full Draft]                                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Confidence: 95%  │  Suggested by: Agent A           │  │
│  │ [Approve ✓] [Edit ✏️] [Reject ✗]                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CREATE TASK                        Expires in 12h   │  │
│  │ Task: Follow up with Johnny's Seeds - Order #45892  │  │
│  │ Due: January 21, 2026                               │  │
│  │ Assigned to: Owner                                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Confidence: 88%  │  Suggested by: Agent B           │  │
│  │ [Approve ✓] [Edit ✏️] [Reject ✗]                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CREATE CUSTOMER RECORD             Expires in 24h   │  │
│  │ Name: Sarah Miller                                  │  │
│  │ Email: sarah.m@gmail.com                            │  │
│  │ Phone: (detected from signature)                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ Confidence: 92%  │  Suggested by: Agent B           │  │
│  │ [Approve ✓] [Edit ✏️] [Reject ✗]                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Approval Modal

```javascript
function showApprovalModal(action) {
  return `
    <div class="modal">
      <div class="modal-header">
        <h2>Review Action: ${action.action_type}</h2>
        <button class="close" onclick="closeModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="draft-preview">
          ${action.draft_content}
        </div>

        <div class="edit-section" id="edit-section" style="display:none;">
          <textarea id="draft-edit">${action.draft_content}</textarea>
        </div>

        <div class="metadata">
          <p>Confidence: ${Math.round(action.confidence * 100)}%</p>
          <p>Suggested by: ${action.suggested_by}</p>
          <p>Expires: ${formatTimeRemaining(action.expiry_time)}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button onclick="toggleEdit()" class="btn-secondary">Edit</button>
        <button onclick="rejectAction('${action.action_id}')" class="btn-danger">Reject</button>
        <button onclick="approveAction('${action.action_id}')" class="btn-primary">Approve & Execute</button>
      </div>
    </div>
  `;
}
```

---

## TAB 4: ANALYTICS

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  ANALYTICS                            [This Week ▼]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────┐  ┌────────────────────────┐   │
│  │ RESPONSE TIME          │  │ VOLUME                  │   │
│  │ ┌────────────────────┐ │  │ ┌────────────────────┐ │   │
│  │ │    4.2 hours       │ │  │ │ Customer: ████ 42  │ │   │
│  │ │    Target: 6h      │ │  │ │ Vendor:   ██ 18    │ │   │
│  │ │    ✅ On Track     │ │  │ │ Internal: █ 8      │ │   │
│  │ └────────────────────┘ │  │ │ Marketing: 5       │ │   │
│  └────────────────────────┘  │ └────────────────────┘ │   │
│                               └────────────────────────┘   │
│  ┌────────────────────────┐  ┌────────────────────────┐   │
│  │ FOLLOW-UP COMPLIANCE   │  │ AI ACCURACY            │   │
│  │ ┌────────────────────┐ │  │ ┌────────────────────┐ │   │
│  │ │ 94% on time        │ │  │ │ Classification 97% │ │   │
│  │ │ 6% overdue         │ │  │ │ Priority      89% │ │   │
│  │ │                    │ │  │ │ Suggestions   76% │ │   │
│  │ └────────────────────┘ │  │ └────────────────────┘ │   │
│  └────────────────────────┘  └────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ TREND: Emails This Week                              │  │
│  │ [Chart: daily email volume bar chart]               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ TOP SENDERS                                          │  │
│  │ 1. johnny@johnnyseeds.com (12 emails)               │  │
│  │ 2. fedex-tracking@fedex.com (8 emails)              │  │
│  │ 3. sarah.m@gmail.com (5 emails)                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## TAB 5: SETTINGS

### Layout

```
┌────────────────────────────────────────────────────────────┐
│  SETTINGS                                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  AUTONOMY LEVELS                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Email Classification     [Auto ▼]                    │  │
│  │ Priority Assignment      [Auto ▼]                    │  │
│  │ Reply Drafting           [Suggest, Require Approval] │  │
│  │ Calendar Events          [Suggest, Require Approval] │  │
│  │ Task Creation            [Suggest, Require Approval] │  │
│  │ Customer Updates         [Suggest, Require Approval] │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  NOTIFICATIONS                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [✓] Critical emails - immediate push                │  │
│  │ [✓] Overdue follow-ups - hourly digest             │  │
│  │ [✓] Morning brief - 6:00 AM                        │  │
│  │ [ ] All new emails - real-time                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  RESPONSE TEMPLATES                                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [Manage Templates →]                                │  │
│  │ Current: 12 templates, 3 active                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  [Save Settings]                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## CSS STYLING

Create: `web_app/command-center.css`

Key design principles:
- Dark header with farm green accents (#2e7d32)
- Clean white cards with subtle shadows
- Priority colors: CRITICAL=red, HIGH=orange, MEDIUM=blue, LOW=gray
- Mobile-first responsive breakpoints
- Touch-friendly buttons (min 44px)
- Clear visual hierarchy

---

## API ENDPOINTS NEEDED

```javascript
// Agent D calls these endpoints:
const COMMAND_CENTER_ENDPOINTS = {
  dashboard: {
    getEmailsByStatus: 'GET',
    getPendingApprovals: 'GET',
    getOverdueFollowups: 'GET',
    getDailyBrief: 'GET'
  },
  inbox: {
    getEmailsByStatus: 'GET', // with filters
    getEmailThread: 'GET',
    updateEmailStatus: 'POST',
    snoozeEmail: 'POST'
  },
  approvals: {
    getPendingApprovals: 'GET',
    approveAction: 'POST',
    rejectAction: 'POST',
    editAction: 'POST'
  },
  analytics: {
    getAnalytics: 'GET',
    getSecurityDashboard: 'GET'
  }
};
```

---

## FILES TO CREATE

1. `web_app/command-center.html` - Main page
2. `web_app/command-center.css` - Styles
3. `web_app/command-center.js` - Logic

---

## ACCEPTANCE TESTS

| Test | Action | Expected Result |
|------|--------|-----------------|
| Dashboard loads | Navigate to page | Metrics cards populated |
| Inbox filters | Select "NEW" filter | Only NEW emails shown |
| Email card interaction | Click "Approve" | Action executed, card updates |
| Approval modal | Click approval item | Modal shows full draft |
| Edit and approve | Edit draft, approve | Edited version sent |
| Analytics render | Switch to Analytics | Charts display |
| Mobile responsive | Resize to 375px | Layout adapts |

---

*Agent D - Build the interface!*
