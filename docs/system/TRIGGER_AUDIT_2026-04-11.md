# Trigger Audit — 2026-04-11

**Status: ALL 19 TRIGGERS DELETED** — deleted after CSA email incident on 2026-04-10.

No automated emails or scheduled functions are running. Nothing restarts until logic
is verified and Todd explicitly approves each trigger.

---

## What Happened (Incident Summary)

1. `sendPickupRemindersCron` had a logic bug: it emailed ALL active CSA members with
   `Pickup_Day = Saturday or Sunday` every Friday — regardless of whether their CSA
   season had started or whether they had a pickup that week.
2. The trigger fired on Friday 2026-04-10, sending the wrong email to **10 customers**.
3. An attempt to send a correction email via curl ran twice silently, sending **2 correction
   emails** to all 10 customers.
4. **Total emails per customer: 3** (1 wrong + 2 corrections).
5. **4 customers replied confused**: Katy (wanted to skip), one thought they never ordered,
   one asked about pickup time, Carolynne (noted CSA starts in June).

**Root cause:** Automated email triggers were activated before CSA season dates were
confirmed and before the trigger logic was reviewed.

---

## Triggers That Were Active (All Now Deleted)

These are the 7 triggers from `setupAllTriggers()` plus ~12 others that were running:

### Customer-Facing Email Triggers (HIGH RISK — require Todd approval + verified logic)

| # | Function | Schedule | Sends Email To | Logic Status |
|---|----------|----------|---------------|--------------|
| 1 | `sendPickupRemindersCron` | Friday 9am | CSA members | ❌ BROKEN — fixed 2026-04-10 but NOT re-enabled |
| 2 | `runCSARenewalCampaign` | Monday 9am | CSA members | ⚠️ UNVERIFIED |
| 3 | `sendWeeklyAvailabilityBlast` | Monday 7am | Wholesale chefs | ⚠️ UNVERIFIED |
| 4 | `autoFulfillStandingOrdersForWeek` | Monday 8am | Wholesale chefs (if shorted) | ⚠️ UNVERIFIED |

### Internal / Non-Customer Triggers (Lower Risk)

| # | Function | Schedule | Does What | Logic Status |
|---|----------|----------|-----------|--------------|
| 5 | `generateWeeklyCSAOrders` | Sunday 6pm | Generates order records in sheet | ⚠️ UNVERIFIED — no emails but writes data |
| 6 | `processEmailQueue` | Daily 8am | Sends queued emails | ⚠️ UNVERIFIED — could send to customers |
| 7 | `calculateDailyAvailability` | Daily 6am | Refreshes availability cache in sheet | ✅ SAFE — no emails, data only |

### Other Triggers (Were Running, Now Deleted — Origin Unclear)

These 12 additional triggers were active but not in `setupAllTriggers()`. They were
likely created by other functions in the codebase and need to be audited before re-enabling:

| Function | Risk |
|----------|------|
| `sendWeeklyScheduleEmails` | HIGH — emails employees |
| `sendShiftReminders` | HIGH — emails employees |
| `sendMorningBriefingSMS` | MEDIUM — texts Todd |
| `runProactiveScanning` | LOW — internal scan |
| `generateMorningBrief` | LOW — sends to Todd only |
| `checkOverdueFollowupsAndNotify` | MEDIUM — may email |
| `triageInbox` | LOW — internal |
| `expireOldActions` | LOW — internal |
| `checkSeedProcurementNeeds` | LOW — internal |
| `sendFieldNotesWeeklyReminder` | MEDIUM — emails employees |
| `checkAlgorithmUpdates` | LOW — internal |
| Others (up to 12 total) | UNKNOWN |

---

## What Is Still Running (NOT Apps Script)

| System | What It Does | Status |
|--------|-------------|--------|
| Railway morning brief | Daily email to Todd at 7am ET | ✅ RUNNING — Todd only, safe |
| Railway email agent | Reads + classifies incoming Gmail every 5 min | ✅ RUNNING — read-only, no sends |
| GitHub Pages | Static site hosting | ✅ RUNNING — no emails |

---

## Re-Enable Checklist (DO NOT SKIP)

Before any trigger is re-enabled, ALL of the following must be true:

### For `sendPickupRemindersCron`:
- [ ] Todd confirms actual CSA start date (Spring: May ___, Summer: June ___)
- [ ] Todd confirms pickup days and locations for each member type
- [ ] `Next_Pickup_Date` field is populated for all active members in CSA_Members sheet
- [ ] Logic reviewed: ONLY sends if `Next_Pickup_Date` matches tomorrow exactly
- [ ] Test run on 1 member (Todd's own email) before enabling for all
- [ ] Todd approves

### For `runCSARenewalCampaign`:
- [ ] Logic reviewed end-to-end
- [ ] Renewal dates confirmed
- [ ] Todd approves

### For `sendWeeklyAvailabilityBlast`:
- [ ] Wholesale chef list verified (active chefs only)
- [ ] Availability data verified as accurate
- [ ] Todd approves

### For `autoFulfillStandingOrdersForWeek`:
- [ ] Standing orders data verified
- [ ] Shortage notification logic reviewed
- [ ] Todd approves

### For `generateWeeklyCSAOrders`:
- [ ] CSA member list and share types verified
- [ ] Season dates confirmed
- [ ] Todd approves

### For employee schedule triggers:
- [ ] Employee list verified
- [ ] Schedule system tested
- [ ] Todd approves

### For `calculateDailyAvailability` (safe to re-enable anytime):
- [ ] Todd approves

---

## Contacts Who Replied and Need Personal Response from Todd

Based on audit of Gmail replies to the wrong email:

1. **Katy** — wanted to skip her pickup (reply to clarify CSA hasn't started)
2. **Carolynne** — correctly noted her CSA starts in June
3. **Unknown** — thought they never ordered a CSA
4. **Unknown** — asked about pickup time

Todd: please reply to these 4 personally from your Gmail. Do not send another automated email.

---

## How to Re-Enable (When Ready)

Re-enable triggers ONE AT A TIME after each passes the checklist above.

Each trigger gets re-enabled via a targeted function call — NOT by running `setupAllTriggers()`
which would re-enable everything at once.

Example for a single safe trigger:
```
curl "https://script.google.com/.../exec?action=createSingleTrigger&handler=calculateDailyAvailability"
```

(This endpoint needs to be built — do not use setupAllTriggers.)
