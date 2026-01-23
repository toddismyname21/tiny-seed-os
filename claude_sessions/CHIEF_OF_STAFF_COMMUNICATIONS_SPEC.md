# CHIEF OF STAFF - COMMUNICATIONS FEATURE SPEC

## Owner Request
"I want to be able to tell the chief of staff to text someone or email someone, and it does it. I can give an overview of what I want to say and it calls, texts, or emails them. I want to be able to have alerts go out to the team for lunch or all hands tasks etc."

---

## FEATURE OVERVIEW

### 1. One-on-One Communication
- Owner types: "Text Maria that we're starting harvest at 6am tomorrow"
- Chief of Staff drafts message, shows preview, sends on approval
- Supports: SMS, Email, (future: Phone call via Twilio)

### 2. Team Alerts
- Owner types: "Tell the team lunch is ready" or "All hands to greenhouse 3"
- Chief of Staff sends to all active employees
- Supports: SMS blast, Email blast, or both

---

## USER INTERFACE (chief-of-staff.html)

### Communication Panel

```
┌─────────────────────────────────────────────────────────┐
│  📤 SEND MESSAGE                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  To: [Dropdown: Team Member / Whole Team / Custom]      │
│       ┌──────────────────────────────────────┐         │
│       │ 👤 Maria Santos                       │         │
│       │ 👤 Jake Thompson                      │         │
│       │ 👥 ALL TEAM (5 members)              │         │
│       │ 📧 Custom email/phone...             │         │
│       └──────────────────────────────────────┘         │
│                                                         │
│  Via: [SMS] [Email] [Both]                             │
│                                                         │
│  What do you want to say?                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Tell Maria we're starting harvest at 6am         │  │
│  │ tomorrow, bring extra water bottles              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Draft Message]                                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📝 DRAFT PREVIEW                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Hi Maria! Heads up - we're starting harvest at   │  │
│  │ 6am tomorrow. Please bring extra water bottles.  │  │
│  │ See you then! -Todd                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Edit Draft]  [✓ Send Now]                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Quick Team Alerts

```
┌─────────────────────────────────────────────────────────┐
│  🚨 QUICK ALERTS                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [🍽️ Lunch Ready]  [🤝 All Hands]  [⚠️ Weather Alert]  │
│                                                         │
│  [🚜 Equipment Issue]  [✅ End of Day]  [Custom...]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## BACKEND API ENDPOINTS

### 1. Get Team Contacts
```javascript
// GET action=getTeamContacts
// Returns all employees with contact info

Response:
{
  "success": true,
  "team": [
    {
      "id": "EMP-001",
      "name": "Maria Santos",
      "phone": "+14125551234",
      "email": "maria@example.com",
      "smsOptedIn": true,
      "emailOptedIn": true,
      "status": "active"
    },
    ...
  ]
}
```

### 2. Draft Message (AI-assisted)
```javascript
// POST action=draftMessage
{
  "intent": "Tell Maria we're starting harvest at 6am tomorrow",
  "recipient": "Maria Santos",
  "channel": "sms",  // or "email"
  "tone": "friendly"  // friendly, professional, urgent
}

Response:
{
  "success": true,
  "draft": "Hi Maria! Heads up - we're starting harvest at 6am tomorrow. See you then! -Todd",
  "characterCount": 78,
  "estimatedSegments": 1  // SMS segments
}
```

### 3. Send SMS
```javascript
// POST action=sendSMS
{
  "to": "+14125551234",  // or array for blast
  "message": "Hi Maria! Heads up...",
  "from": "owner"  // logs who sent it
}

Response:
{
  "success": true,
  "messageId": "SM123...",
  "to": "+14125551234",
  "status": "sent"
}
```

### 4. Send Email
```javascript
// POST action=sendOwnerEmail
{
  "to": "maria@example.com",  // or array for blast
  "subject": "Harvest Tomorrow - 6am Start",
  "body": "Hi Maria!\n\nHeads up - we're starting harvest at 6am tomorrow...",
  "from": "owner"
}

Response:
{
  "success": true,
  "messageId": "msg-abc123",
  "to": "maria@example.com",
  "status": "sent"
}
```

### 5. Send Team Alert
```javascript
// POST action=sendTeamAlert
{
  "message": "Lunch is ready! Meet at the barn.",
  "channels": ["sms"],  // or ["sms", "email"] for both
  "alertType": "lunch",  // lunch, allHands, weather, equipment, endOfDay, custom
  "urgent": false
}

Response:
{
  "success": true,
  "sent": 5,
  "failed": 0,
  "details": [
    { "name": "Maria Santos", "phone": "+1412...", "status": "sent" },
    ...
  ]
}
```

### 6. Get Communication History
```javascript
// GET action=getCommunicationHistory&limit=50
// Returns recent outbound messages

Response:
{
  "success": true,
  "messages": [
    {
      "id": "COM-001",
      "timestamp": "2026-01-22T18:30:00Z",
      "type": "sms",
      "to": "Maria Santos",
      "message": "Hi Maria! Heads up...",
      "status": "delivered",
      "sentBy": "owner"
    },
    ...
  ]
}
```

---

## BACKEND IMPLEMENTATION

### Location: `apps_script/ChiefOfStaffCommunications.js`

```javascript
/**
 * Chief of Staff Communications Module
 * Handles outbound SMS, Email, and Team Alerts
 */

// ═══════════════════════════════════════════════════════════════
// GET TEAM CONTACTS
// ═══════════════════════════════════════════════════════════════

function getTeamContacts() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('EMPLOYEES') || ss.getSheetByName('REF_Employees');

  if (!sheet) return { success: false, error: 'Employee sheet not found' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const team = data.slice(1)
    .filter(row => row[headers.indexOf('Status')] === 'Active')
    .map(row => ({
      id: row[headers.indexOf('Employee_ID')],
      name: row[headers.indexOf('Name')],
      phone: row[headers.indexOf('Phone')],
      email: row[headers.indexOf('Email')],
      smsOptedIn: row[headers.indexOf('SMS_Opted_In')] !== false,
      emailOptedIn: row[headers.indexOf('Email_Opted_In')] !== false,
      status: 'active'
    }));

  return { success: true, team };
}

// ═══════════════════════════════════════════════════════════════
// DRAFT MESSAGE WITH AI
// ═══════════════════════════════════════════════════════════════

function draftMessage(params) {
  const { intent, recipient, channel, tone = 'friendly' } = params;

  // Use Claude API or built-in logic to draft
  let draft;

  // Simple template-based drafting (can be enhanced with AI)
  const firstName = recipient.split(' ')[0];
  const signature = '-Todd';  // Owner's name

  if (channel === 'sms') {
    // Keep SMS short and direct
    draft = `Hi ${firstName}! ${intent}. ${signature}`;
  } else {
    // Email can be longer
    draft = `Hi ${firstName},\n\n${intent}.\n\nThanks!\n${signature}`;
  }

  return {
    success: true,
    draft,
    characterCount: draft.length,
    estimatedSegments: Math.ceil(draft.length / 160)
  };
}

// ═══════════════════════════════════════════════════════════════
// SEND SMS VIA TWILIO
// ═══════════════════════════════════════════════════════════════

function sendSMS(params) {
  const { to, message, from = 'owner' } = params;

  const props = PropertiesService.getScriptProperties();
  const accountSid = props.getProperty('TWILIO_ACCOUNT_SID');
  const authToken = props.getProperty('TWILIO_AUTH_TOKEN');
  const twilioNumber = props.getProperty('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !twilioNumber) {
    return { success: false, error: 'Twilio not configured' };
  }

  const recipients = Array.isArray(to) ? to : [to];
  const results = [];

  for (const phone of recipients) {
    try {
      const response = UrlFetchApp.fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'post',
          headers: {
            'Authorization': 'Basic ' + Utilities.base64Encode(accountSid + ':' + authToken)
          },
          payload: {
            To: phone,
            From: twilioNumber,
            Body: message
          }
        }
      );

      const result = JSON.parse(response.getContentText());
      results.push({ phone, status: 'sent', messageId: result.sid });

      // Log to COMMUNICATION_LOG sheet
      logCommunication('sms', phone, message, from, 'sent');

    } catch (error) {
      results.push({ phone, status: 'failed', error: error.message });
    }
  }

  return {
    success: true,
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    details: results
  };
}

// ═══════════════════════════════════════════════════════════════
// SEND EMAIL VIA GMAIL
// ═══════════════════════════════════════════════════════════════

function sendOwnerEmail(params) {
  const { to, subject, body, from = 'owner' } = params;

  const recipients = Array.isArray(to) ? to : [to];
  const results = [];

  for (const email of recipients) {
    try {
      GmailApp.sendEmail(email, subject, body, {
        name: 'Todd Wilson - Tiny Seed Farm'
      });

      results.push({ email, status: 'sent' });

      // Log to COMMUNICATION_LOG sheet
      logCommunication('email', email, `${subject}: ${body.substring(0, 100)}...`, from, 'sent');

    } catch (error) {
      results.push({ email, status: 'failed', error: error.message });
    }
  }

  return {
    success: true,
    sent: results.filter(r => r.status === 'sent').length,
    failed: results.filter(r => r.status === 'failed').length,
    details: results
  };
}

// ═══════════════════════════════════════════════════════════════
// SEND TEAM ALERT
// ═══════════════════════════════════════════════════════════════

function sendTeamAlert(params) {
  const { message, channels = ['sms'], alertType = 'custom', urgent = false } = params;

  // Get all active team members
  const { team } = getTeamContacts();

  if (!team || team.length === 0) {
    return { success: false, error: 'No team members found' };
  }

  // Add urgency prefix if needed
  const finalMessage = urgent ? `🚨 URGENT: ${message}` : message;

  const results = {
    sms: { sent: 0, failed: 0, details: [] },
    email: { sent: 0, failed: 0, details: [] }
  };

  // Send SMS if requested
  if (channels.includes('sms')) {
    const phones = team
      .filter(m => m.smsOptedIn && m.phone)
      .map(m => m.phone);

    if (phones.length > 0) {
      const smsResult = sendSMS({ to: phones, message: finalMessage, from: 'team_alert' });
      results.sms = smsResult;
    }
  }

  // Send Email if requested
  if (channels.includes('email')) {
    const emails = team
      .filter(m => m.emailOptedIn && m.email)
      .map(m => m.email);

    if (emails.length > 0) {
      const alertSubject = urgent ? `🚨 URGENT: Team Alert` : `Team Alert - ${alertType}`;
      const emailResult = sendOwnerEmail({
        to: emails,
        subject: alertSubject,
        body: finalMessage,
        from: 'team_alert'
      });
      results.email = emailResult;
    }
  }

  // Log the team alert
  logTeamAlert(alertType, message, channels, team.length);

  return {
    success: true,
    alertType,
    teamSize: team.length,
    channels,
    results
  };
}

// ═══════════════════════════════════════════════════════════════
// LOGGING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function logCommunication(type, recipient, message, sentBy, status) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('COMMUNICATION_LOG');

  if (!sheet) {
    sheet = ss.insertSheet('COMMUNICATION_LOG');
    sheet.appendRow(['Timestamp', 'Type', 'Recipient', 'Message', 'Sent_By', 'Status']);
  }

  sheet.appendRow([
    new Date().toISOString(),
    type,
    recipient,
    message.substring(0, 500),
    sentBy,
    status
  ]);
}

function logTeamAlert(alertType, message, channels, teamSize) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('TEAM_ALERTS_LOG');

  if (!sheet) {
    sheet = ss.insertSheet('TEAM_ALERTS_LOG');
    sheet.appendRow(['Timestamp', 'Alert_Type', 'Message', 'Channels', 'Team_Size']);
  }

  sheet.appendRow([
    new Date().toISOString(),
    alertType,
    message,
    channels.join(', '),
    teamSize
  ]);
}

function getCommunicationHistory(limit = 50) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('COMMUNICATION_LOG');

  if (!sheet) return { success: true, messages: [] };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const messages = data.slice(1)
    .map((row, i) => ({
      id: `COM-${i + 1}`,
      timestamp: row[0],
      type: row[1],
      to: row[2],
      message: row[3],
      sentBy: row[4],
      status: row[5]
    }))
    .reverse()
    .slice(0, limit);

  return { success: true, messages };
}
```

---

## API ROUTES TO ADD (MERGED TOTAL.js)

```javascript
// ============ CHIEF OF STAFF COMMUNICATIONS ============
case 'getTeamContacts':
  return jsonResponse(getTeamContacts());

case 'draftMessage':
  return jsonResponse(draftMessage(data));

case 'sendSMS':
  return jsonResponse(sendSMS(data));

case 'sendOwnerEmail':
  return jsonResponse(sendOwnerEmail(data));

case 'sendTeamAlert':
  return jsonResponse(sendTeamAlert(data));

case 'getCommunicationHistory':
  return jsonResponse(getCommunicationHistory(parseInt(e.parameter.limit) || 50));
```

---

## QUICK ALERT PRESETS

| Alert Type | Default Message | Channels |
|------------|-----------------|----------|
| `lunch` | "Lunch is ready! Meet at [location]." | SMS |
| `allHands` | "All hands needed at [location]. Please come now." | SMS |
| `weather` | "Weather alert: [details]. Adjust plans accordingly." | SMS + Email |
| `equipment` | "Equipment issue: [details]. See [person] for info." | SMS |
| `endOfDay` | "Great work today! See you tomorrow at [time]." | SMS |

---

## FRONTEND IMPLEMENTATION NOTES

### For chief-of-staff.html

1. Add "Communications" tab or integrate into existing view
2. Load team contacts on page load via `getTeamContacts`
3. Provide dropdown/autocomplete for recipient selection
4. Show character count for SMS (160 char = 1 segment)
5. Preview draft before sending
6. Show send confirmation with delivery status
7. Quick alert buttons for common messages

### Natural Language Processing

The owner can type naturally:
- "Text Maria about tomorrow's harvest at 6am"
- "Email the team about the new delivery schedule"
- "Send everyone a lunch alert"

The system parses:
- **Recipient**: Maria / team / everyone
- **Channel**: text/SMS, email, or both
- **Intent**: The message content

---

## TWILIO CONFIGURATION REQUIRED

Set these script properties:
```
TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER = +1234567890
```

---

## TESTING CHECKLIST

- [ ] Send SMS to single recipient
- [ ] Send SMS to multiple recipients
- [ ] Send email to single recipient
- [ ] Send email to multiple recipients
- [ ] Send team alert (SMS only)
- [ ] Send team alert (Email only)
- [ ] Send team alert (Both)
- [ ] Verify logging to COMMUNICATION_LOG
- [ ] Verify logging to TEAM_ALERTS_LOG
- [ ] Test draft message generation
- [ ] Test quick alert presets

---

## ASSIGNMENT

**Backend Claude**: Build `ChiefOfStaffCommunications.js` and add routes to MERGED TOTAL.js
**Desktop Claude**: Add Communications UI to `chief-of-staff.html`

---

*Spec created by PM_Architect - 2026-01-22*
