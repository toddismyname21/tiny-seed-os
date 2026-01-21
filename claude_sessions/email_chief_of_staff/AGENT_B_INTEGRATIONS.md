# AGENT B: INTEGRATIONS

**Mission:** Connect email system to Calendar, CRM, Finance, and Inventory
**Priority:** P1 - After Agent A completes foundation
**Estimated Effort:** 1 week

---

## YOUR RESPONSIBILITIES

1. Link emails to customer records (SALES_Customers)
2. Link emails to orders (Master_Order_Log)
3. Create calendar events from email content
4. Create tasks from email requests
5. Trigger invoice creation from email
6. Build customer email timeline

---

## DEPENDENCIES ON AGENT A

You need these working before starting:
- EMAIL_INBOX_STATE sheet populated
- EMAIL_ACTIONS approval queue
- processEmailThread() function
- suggestAction() function

---

## FUNCTIONS TO IMPLEMENT

### Customer Linking

```javascript
/**
 * Link email thread to customer record
 * @param {string} threadId
 * @param {string} customerId - Optional, auto-detect if not provided
 */
function linkEmailToCustomer(threadId, customerId = null) {
  // 1. Get email from EMAIL_INBOX_STATE
  // 2. If no customerId, search SALES_Customers by:
  //    - Email address match
  //    - Name similarity
  //    - Phone number (if in email)
  // 3. Update Related_Customer_ID in EMAIL_INBOX_STATE
  // 4. Return link result
}

/**
 * Get all emails for a customer
 * @param {string} customerId
 */
function getCustomerEmailHistory(customerId) {
  // 1. Query EMAIL_INBOX_STATE by Related_Customer_ID
  // 2. Sort by date descending
  // 3. Return timeline with summaries
}

/**
 * Auto-detect customer from email content
 * Uses Claude to extract customer info
 */
function detectCustomerFromEmail(emailData) {
  // Extract: name, email, phone, order references
  // Match against SALES_Customers
  // Return confidence + matched customer
}
```

### Order Linking

```javascript
/**
 * Link email to order
 * @param {string} threadId
 * @param {string} orderId - Optional, auto-detect if not provided
 */
function linkEmailToOrder(threadId, orderId = null) {
  // 1. If no orderId, search email content for:
  //    - "order #123"
  //    - "order number 123"
  //    - "confirmation 123"
  // 2. Match against Master_Order_Log
  // 3. Update Related_Order_ID in EMAIL_INBOX_STATE
}

/**
 * Get all emails for an order
 * @param {string} orderId
 */
function getOrderEmailHistory(orderId) {
  // Query EMAIL_INBOX_STATE by Related_Order_ID
}
```

### Calendar Integration

```javascript
/**
 * Create calendar event from email
 * Goes through approval queue
 * @param {string} threadId
 */
function createCalendarEventFromEmail(threadId) {
  // 1. Get email content
  // 2. Use Claude to extract:
  //    - Event title
  //    - Date/time
  //    - Location
  //    - Attendees
  //    - Description
  // 3. Create pending action in EMAIL_ACTIONS
  // 4. Return suggested event for approval
}

/**
 * Execute calendar event creation (after approval)
 * @param {string} actionId
 */
function executeCalendarEventCreation(actionId) {
  // 1. Get action details
  // 2. Create Google Calendar event
  // 3. Update action status to EXECUTED
  // 4. Link back to email thread
}
```

### Task Integration

```javascript
/**
 * Create task from email
 * Goes through approval queue
 * @param {string} threadId
 */
function createTaskFromEmail(threadId) {
  // 1. Get email content
  // 2. Use Claude to extract:
  //    - Task title
  //    - Due date
  //    - Priority
  //    - Assigned to
  //    - Description
  // 3. Create pending action
  // 4. Return suggested task for approval
}

/**
 * Execute task creation (after approval)
 * @param {string} actionId
 */
function executeTaskCreation(actionId) {
  // Create in TASKS_2026 or appropriate task sheet
}
```

### Invoice Integration

```javascript
/**
 * Create invoice from email
 * Goes through approval queue
 * @param {string} threadId
 */
function createInvoiceFromEmail(threadId) {
  // 1. Get email + linked customer
  // 2. Extract:
  //    - Items/services
  //    - Amounts
  //    - Payment terms
  // 3. Create pending action
}

/**
 * Execute invoice creation (after approval)
 * Integrates with QuickBooks if connected
 */
function executeInvoiceCreation(actionId) {
  // Create invoice via existing financial endpoints
}
```

### CRM Sync

```javascript
/**
 * Update CRM from email interaction
 * @param {string} threadId
 */
function syncEmailWithCRM(threadId) {
  // 1. Get email + linked customer
  // 2. Update SALES_Customers:
  //    - Last_Contact_Date
  //    - Contact_Count++
  //    - Notes (append summary)
  // 3. Create pending action for new customer
}

/**
 * Create new customer from email
 * Requires approval
 */
function createCustomerFromEmail(threadId) {
  // Extract customer data
  // Create pending action
}
```

---

## API ENDPOINTS TO REGISTER

```javascript
// Agent B: Integrations
case 'linkEmailToCustomer':
  return jsonResponse(linkEmailToCustomer(data.threadId, data.customerId));
case 'linkEmailToOrder':
  return jsonResponse(linkEmailToOrder(data.threadId, data.orderId));
case 'createCalendarEventFromEmail':
  return jsonResponse(createCalendarEventFromEmail(data.threadId));
case 'createTaskFromEmail':
  return jsonResponse(createTaskFromEmail(data.threadId));
case 'createInvoiceFromEmail':
  return jsonResponse(createInvoiceFromEmail(data.threadId));
case 'getCustomerEmailHistory':
  return jsonResponse(getCustomerEmailHistory(e.parameter.customerId));
case 'getOrderEmailHistory':
  return jsonResponse(getOrderEmailHistory(e.parameter.orderId));
case 'syncEmailWithCRM':
  return jsonResponse(syncEmailWithCRM(data.threadId));
```

---

## EXTRACTION PROMPT

Use this for Claude to extract structured data:

```
You are extracting structured data from an email for Tiny Seed Farm.

Given the email content, extract any of the following if present:

{
  "customer": {
    "name": "Full name",
    "email": "email@address.com",
    "phone": "phone number",
    "company": "company name if mentioned"
  },
  "order": {
    "orderNumber": "order number if mentioned",
    "items": ["item 1", "item 2"],
    "amount": "dollar amount if mentioned"
  },
  "event": {
    "title": "meeting/event name",
    "dateTime": "ISO date or natural language",
    "location": "location if mentioned",
    "attendees": ["person 1", "person 2"]
  },
  "task": {
    "title": "task description",
    "dueDate": "due date if mentioned",
    "priority": "urgent/high/normal",
    "assignedTo": "person if mentioned"
  },
  "invoice": {
    "amount": "amount",
    "items": ["service/item"],
    "paymentTerms": "net 30, etc."
  }
}

Return only the fields that are clearly present. Use null for uncertain values.
Confidence should be 0.0-1.0 for each extracted field.
```

---

## EXISTING SYSTEMS TO INTEGRATE

| System | Sheet | Key Column | Integration |
|--------|-------|------------|-------------|
| CRM | SALES_Customers | Customer_ID, Email | Link by email match |
| Orders | Master_Order_Log | Order_ID | Link by order # in email |
| Calendar | Google Calendar API | Event ID | Create events |
| Tasks | TASKS_2026 | Task_ID | Create tasks |
| Invoices | QuickBooks or INVOICES | Invoice_ID | Create invoices |

---

## ACCEPTANCE TESTS

| Test | Input | Expected Output |
|------|-------|-----------------|
| Customer link (known) | Email from existing customer | Related_Customer_ID set |
| Customer link (new) | Email from unknown sender | Pending action to create customer |
| Order link | Email with "order #123" | Related_Order_ID set |
| Calendar extraction | Email with "meeting Thursday 2pm" | Pending calendar action with parsed data |
| Task extraction | Email with "please send invoice" | Pending task action created |
| Customer history | customerId | All related emails returned |

---

## FILE TO CREATE

Create: `apps_script/EmailIntegrations.js`

---

## HANDOFF TO AGENT C

When you complete:
1. Customer linking working
2. Order linking working
3. Calendar creation queued
4. Task creation queued
5. CRM sync operational

Agent C will add:
- Security scanning for all actions
- Audit logging for integrations

---

*Agent B - Ready to integrate!*
