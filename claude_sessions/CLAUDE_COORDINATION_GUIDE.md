# Claude Coordination System - Usage Guide

## Overview

The Claude Coordination System enables multiple Claude CLI sessions to communicate, coordinate tasks, and avoid duplicate work. This is critical for Tiny Seed Farm's multi-Claude architecture.

**Dashboard:** `web_app/claude-coordination.html`
**Backend:** `apps_script/ClaudeCoordination.js`
**API:** Endpoints via `MERGED TOTAL.js`

---

## For Every Claude Session: STARTUP PROTOCOL

When starting a new Claude session, **IMMEDIATELY** perform these steps:

### 1. Announce Your Presence
```javascript
// Call this API to register your session
POST action=coordinationAPI
{
  "coordinationAction": "registerSession",
  "role": "your_role_here",  // e.g., "backend", "mobile", "pm_architect"
  "context": "Brief description of what you're working on"
}
```

### 2. Check for Messages
```javascript
GET action=getClaudeMessages&role=your_role&unreadOnly=true
```

### 3. Check for Available Tasks
```javascript
GET action=getClaudeTasks&role=your_role
```

### 4. Get System Overview
```javascript
GET action=getCoordinationOverview&role=your_role
```

---

## Available Roles

| Role | Name | Responsibility |
|------|------|----------------|
| `pm_architect` | PM_Architect | Project coordination, system knowledge, can broadcast & assign tasks |
| `backend` | Backend_Claude | Apps Script & API development, NEVER creates HTML |
| `desktop` | Desktop_Claude | Desktop HTML interfaces |
| `mobile` | Mobile_Claude | Mobile apps, PWA, employee apps |
| `ux_design` | UX_Design_Claude | Design system, UI consistency |
| `sales` | Sales_Claude | Sales dashboards, CRM |
| `security` | Security_Claude | Authentication, permissions |
| `social_media` | Social_Media_Claude | Marketing, social media |
| `field_ops` | Field_Ops_Claude | Farm operations, scheduling |
| `inventory` | Inventory_Claude | Seed inventory, lot tracking |

---

## API Reference

### Messages

#### Send a Message
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "sendMessage",
  "from": "your_role",
  "to": "target_role",  // or "all" for broadcast
  "subject": "Subject line",
  "body": "Message content",
  "options": {
    "priority": "normal|urgent|critical",
    "type": "direct|broadcast|task|status|alert|handoff|request|response"
  }
}
```

#### Get Messages
```javascript
GET action=getClaudeMessages&role=your_role&unreadOnly=true&limit=20
```

#### Mark as Read
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "markRead",
  "messageId": "msg_xxx",
  "role": "your_role"
}
```

#### Acknowledge with Response
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "acknowledgeMessage",
  "messageId": "msg_xxx",
  "role": "your_role",
  "response": "Your reply here"
}
```

### Tasks

#### Create a Task
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "createTask",
  "createdBy": "your_role",
  "title": "Task title",
  "description": "Detailed description",
  "options": {
    "assignTo": "target_role",  // optional
    "urgency": 1-5,
    "impact": 1-5,
    "estimatedEffort": 1-5,
    "files": ["path/to/file1.js", "path/to/file2.html"],
    "dependencies": ["task_id_1"]  // optional
  }
}
```

#### Claim a Task
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "claimTask",
  "taskId": "task_xxx",
  "role": "your_role",
  "sessionId": "your_session_id"
}
```

#### Update Task Progress
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "updateTask",
  "taskId": "task_xxx",
  "role": "your_role",
  "note": "Progress update or notes",
  "status": "in_progress|completed|blocked|failed"  // optional
}
```

#### Get Available Tasks
```javascript
GET action=getClaudeTasks&role=your_role&myTasksOnly=true
```

### File Locking (CRITICAL)

Before editing any file, **ALWAYS** check and lock it:

#### Check File Availability
```javascript
GET action=checkFileAvailability&filePath=path/to/file.js
```

#### Lock a File
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "lockFile",
  "filePath": "path/to/file.js",
  "sessionId": "your_session_id",
  "reason": "Implementing feature X"
}
```

#### Release a File Lock
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "releaseFile",
  "filePath": "path/to/file.js",
  "sessionId": "your_session_id"
}
```

### Alerts

#### Create an Alert (Notifies Owner)
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "createAlert",
  "sourceRole": "your_role",
  "priority": "info|urgent|critical",
  "title": "Alert title",
  "message": "Alert details",
  "sendSms": true  // For urgent/critical, sends SMS to owner
}
```

### Session Management

#### Update Heartbeat (Call periodically)
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "heartbeat",
  "sessionId": "your_session_id"
}
```

#### End Session
```javascript
POST action=coordinationAPI
{
  "coordinationAction": "endSession",
  "sessionId": "your_session_id",
  "summary": "What was accomplished"
}
```

---

## Best Practices

### 1. Always Register on Start
Every Claude session MUST register itself when starting. This allows:
- Other sessions to know you're active
- PM_Architect to coordinate work
- Prevent duplicate work

### 2. Check Before Building
**BEFORE** creating or modifying any file:
1. Check `SYSTEM_MANIFEST.md` to see if it exists
2. Check file availability (might be locked)
3. Lock the file if you'll be editing it

### 3. Communicate Status
When working on a task:
- Mark it as `in_progress` when you start
- Add progress notes periodically
- Mark as `completed` when done
- If blocked, mark as `blocked` and create a message to PM_Architect

### 4. Handoffs
When your session is ending but work isn't complete:
1. Document progress in task notes
2. Send handoff message to relevant role
3. Release all file locks
4. End session with summary

### 5. Respond to Messages
When you receive messages:
- High priority: Address immediately
- Task assignments: Acknowledge and claim
- Questions: Respond promptly

---

## Message Templates

### Handoff Message
```
Subject: HANDOFF: [Task/Feature Name]
To: [next_role]

## Progress Made
- Completed X
- Implemented Y

## Remaining Work
- Still need to Z

## Files Involved
- path/to/file.js (modified)
- path/to/new-file.html (created)

## Notes for Next Session
[Important context]
```

### Request for Help
```
Subject: REQUEST: Need help with [topic]
To: [relevant_role]

## Problem
[Description]

## What I've Tried
- Attempted X
- Also tried Y

## What I Need
[Specific help needed]

## Files
- path/to/relevant/file.js:123 (line with issue)
```

### Status Update
```
Subject: STATUS: [Task Name] Progress
To: all

## Current Status
[Brief status]

## Completed
- Item 1
- Item 2

## Next Steps
- Upcoming item 1

## ETA
[If applicable]
```

---

## Priority Scoring

Tasks are automatically prioritized using weighted scoring:

| Factor | Weight | Description |
|--------|--------|-------------|
| Urgency | 30% | Time sensitivity (1-5) |
| Impact | 25% | Business impact (1-5) |
| Dependencies | 20% | Blocking other work (0-10) |
| Effort | 15% | Lower effort = higher priority (1-5) |
| Age | 10% | Older tasks get slight boost |

**Score > 60 = High Priority**
**Score 40-60 = Medium Priority**
**Score < 40 = Low Priority**

---

## SMS Alerts (Mobile Communication)

The system can send SMS alerts to the owner for:
- Critical errors
- Urgent messages between Claudes
- Tasks needing immediate attention
- System health issues

To trigger an SMS:
1. Use `sendSms: true` in createAlert
2. Set priority to `urgent` or `critical`

The owner can reply to SMS to acknowledge alerts (when configured).

---

## Troubleshooting

### Session Shows as "Stale"
- Session hasn't sent heartbeat in 30+ minutes
- May have crashed or context limit reached
- PM_Architect should check for handoff needs

### File Lock Not Releasing
- Locks auto-expire after 30 minutes
- Can force release if original session is ended
- Contact PM_Architect if persistent issue

### Messages Not Appearing
- Check you're registered with correct role
- Verify unreadOnly filter isn't hiding them
- Check coordination dashboard directly

---

## Quick Reference Card

```
STARTUP:
  1. registerSession(role, context)
  2. getClaudeMessages(role, unreadOnly=true)
  3. getCoordinationOverview(role)

BEFORE EDITING FILES:
  1. checkFileAvailability(path)
  2. lockFile(path, sessionId, reason)
  3. [Make your changes]
  4. releaseFile(path, sessionId)

WORKING ON TASKS:
  1. claimTask(taskId, role, sessionId)
  2. updateTask(taskId, role, "Progress note", "in_progress")
  3. [Do the work]
  4. updateTask(taskId, role, "Completed", "completed")

ENDING SESSION:
  1. Release all file locks
  2. Update any open tasks
  3. Send handoff message if needed
  4. endSession(sessionId, summary)
```

---

*This guide enables seamless coordination between multiple Claude sessions working on Tiny Seed Farm OS.*
