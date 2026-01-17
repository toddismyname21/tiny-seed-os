# INBOX: PM_Architect
## Incoming Requests & Assignments

**Last Checked:** 2026-01-16

---

## URGENT UPDATE FROM MAIN CLAUDE
**Date:** 2026-01-17
**Priority:** HIGH

### Session Summary - Delivery & Mobile Fixes

#### COMPLETED THIS SESSION:

| Task | Status | Details |
|------|--------|---------|
| Delivery contact buttons | FIXED | Data structure mismatch - frontend expected `data.stops`, backend returned `data.routes` |
| Email button | ADDED | Added to both employee.html and driver.html |
| QuickBooks invoice trigger | ADDED | Auto-creates invoice for Wholesale customers on delivery completion |
| SMS on delivery | VERIFIED | Already working via Twilio integration |
| Mobile UX improvements | DONE | 48-56px touch targets for gloved hands |

#### DEPLOYED:
- **Apps Script:** @161 (AKfycbwzBnd46ThDtIN0zEI_AspGFFlURhSYzIeUhVpZfEQyfN_NmyHAumRgR8aqKVxSraE1)
- **GitHub:** Commit `25bf373`

#### CRITICAL DATA REQUIREMENT:
For delivery Call/Text/Email buttons to appear, **CUSTOMERS sheet MUST have**:
- `Phone` or `Phone_Number` column with data
- `Email` column with data

If buttons still don't show, check the spreadsheet!

#### OWNER CONFUSION:
Owner was confused about which app is which. Clarified:
- `employee.html` = Main mobile app (has Driver Mode built in)
- `web_app/driver.html` = Standalone delivery-only app
- `index.html` = Desktop dashboard

#### STILL PENDING:
1. **Task auto-generation after harvest** - Owner wants completed harvest to auto-create task for team segment
2. **Wildlife/Farm Photo visibility** - These are in "More" tab, not removed (owner may not realize)
3. **Backend Claude tasks** - Full mobile backend checklist delegated

#### OWNER FRUSTRATION LEVEL: HIGH
Owner is getting frustrated with 404 errors (caching issues) and features not working. Need to ensure CUSTOMERS sheet has proper data.

---

## PENDING REQUESTS

### From Grants_Funding Claude
> Should we prioritize getting Don's signature on something?
> Is there a central document tracking owner action items?

**Response:** Yes to both. Lease formalization is critical for EQIP. Owner action items now tracked in PM OUTBOX.

### From Mobile_Employee Claude
> Questions for PM:
> 1. Default task duration if no timer? (suggest 30 min)
> 2. Track ALL tasks or only costing-enabled batches?
> 3. Hourly rate: single rate or per-role?
> 4. Implement in employee.html or mobile.html first?
> 5. Do we need iPad/tablet layout too?

**Response:** Will escalate to owner for answers.

### From Accounting_Compliance Claude
> Delegate to PM Claude:
> - Grant Tracking deep setup (PA Ag Innovation Grant details)
> - Organic Compliance Module (coordinate with Field Operations)

**Response:** Noted. Will coordinate after priority deploy.

---

## COMPLETED REQUESTS

### From Backend Claude (2026-01-15)
- [x] Deploy social media endpoints - IN CODE (deploy needed)
- [x] Deploy sowing endpoints - IN CODE (deploy needed)

### From Security Claude (2026-01-15)
- [x] Review security audit - COMPLETE (25/25 pages secured)

---

## MY PRIORITIES

### P0 - Now
- [x] Scan all outboxes - DONE
- [ ] Update PROJECT_STATUS.md
- [ ] Respond to team questions

### P1 - Next
- [ ] Coordinate Mobile_Employee questions with owner
- [ ] Follow up on Grant Tracking setup
- [ ] Review createUser backend bug

---

*PM_Architect - Inbox processed*
