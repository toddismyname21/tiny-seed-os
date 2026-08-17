---
name: Schedule Notification Triggers — Unfinished
description: Employee schedule triggers need activation + 3 actions need PUBLIC_GET_ACTIONS whitelist + Twilio phone number update
type: project
---

Employee schedule notification system was built and deployed (2026-03-24) but 3 items remain unfinished:

1. **Activate triggers** — User must run `setupScheduleNotificationTriggers()` from Apps Script editor (script.google.com > Run). Creates two triggers: weekly Sunday 6pm (sendWeeklyScheduleEmails) + daily 6pm (sendShiftReminders).

2. **Add 3 actions to PUBLIC_GET_ACTIONS** in `apps_script/MERGED TOTAL.js` (~L14467): `setupScheduleNotificationTriggers`, `sendWeeklyScheduleEmails`, `sendShiftReminders`. Without this, the "Send Schedules" button on schedule.html gets auth errors. User hit `{"success":false,"error":"No token provided"}` when trying via URL.

3. **Update Twilio phone number** — Script Property `TWILIO_PHONE_NUMBER` needs to change from `+14128662259` to `+18773185491` in Apps Script > Project Settings > Script Properties.

**Why:** System is deployed but non-functional until these 3 steps complete. User was blocked by auth error on step 1.

**How to apply:** Next session with file access, fix #2 immediately (code change + clasp push + deploy). Remind user about #1 and #3 (manual steps).
