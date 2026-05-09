# Day 12-13 Spec — Soft Launch + Production Cutover

**Status:** DRAFT — operational runbook
**Plan reference:** `docs/CSA_MIGRATION_PLAN_2026.md` Days 12-13

---

## Day 12 — Soft Launch

### Goal

Real members from the existing Spring 2026 CSA test the new portal end-to-end on production URL but with reduced expectations. We collect bugs, fix critical ones, hold blockers for cutover.

### Pre-launch checklist (must all be ✅)

- [ ] Days 5-11 all shipped + verified
- [ ] Cloudflare DNS migration complete; Resend verified; emails send from `hello@tinyseedfarm.com`
- [ ] Supabase: 303+ members migrated; 0 orphan FKs
- [ ] Magic link login works end-to-end (verified by PM)
- [ ] /dashboard, /onboarding/*, /box, /account/* all return 200 for authenticated members
- [ ] Admin role flag set on `todd@tinyseedfarmpgh.com`
- [ ] /admin pages render for Todd
- [ ] vercel.json security headers present on all pages
- [ ] Lighthouse mobile ≥ 90 perf, ≥ 95 accessibility on key pages
- [ ] `notification_log` is being populated (test entry exists)
- [ ] `audit_log` triggers fire (test mutation captured)
- [ ] Backup: latest Supabase snapshot tagged for restore (Pro tier auto-backups daily; verify timestamp)

### Tester selection (Todd + PM together)

3-5 friendly Spring 2026 members. Criteria:
- Active member (status='active', current Spring season)
- Mix of share types (1 vegetable, 1 flower, 1 flex)
- Mix of pickup vs home delivery
- Non-tech-savvy mixed with tech-savvy (we want both perspectives)
- People who'll respond quickly + give honest feedback

Names tracked in: `docs/csa-soft-launch-testers.md` (created together by Todd + PM, NOT auto-picked)

### Soft launch workflow

1. **Email each tester individually** (NOT a mass email). Subject: "Hi [name], can you try our new CSA portal?" Body explains we're rebuilding the portal, asks them to log in at `csa.tinyseedfarm.com`, click around, and reply with anything that confuses or breaks.
2. **Pin email to inbox + monitor** for replies. Log every issue in a Google Sheet or GitHub issue.
3. **Categorize issues:**
   - 🔴 P0: Cannot log in / cannot see their share / shows wrong data
   - 🟡 P1: Confusing UX, broken minor feature, performance issue
   - 🟢 P2: Cosmetic, edge case, "nice to have"
4. **Fix all P0s same day**. P1s by end of Day 13. P2s post-cutover.

### Day 12 also includes

- Final smoke test: the PM logs in as a member with sample data + walks through every flow personally
- Verify `/admin/reports` numbers match what's in the live Sheets system (cross-check 5 metrics: active members, members by stop, members by share type, total amount_paid this season, churn-flagged members)
- Confirm Sentry is capturing errors (intentionally trigger an error: visit a non-existent route, check Sentry dashboard within 5 min)

---

## Day 13 — Production Cutover

### Goal

Live CSA members start using the new portal. Old Apps Script CSA endpoints get a redirect notice. Old Sheets-based portal is the fallback if something catastrophic happens.

### Pre-cutover checklist (must all be ✅)

- [ ] All P0 issues from soft launch fixed
- [ ] Most P1 issues fixed (any open ones tracked + acceptable to ship without)
- [ ] Final reconciliation: row counts in Supabase ↔ Sheets match (run the verification queries from migration script)
- [ ] Final Supabase backup taken (manual snapshot via Supabase dashboard)
- [ ] Apps Script CSA endpoints **modified to redirect**: the `csa.html` from the old portal at `/web_app/csa.html` and root `/csa.html` should be replaced with a redirect to `https://csa.tinyseedfarm.com/login`

### Cutover execution

#### Step 1: Lock Sheets (10 min)

In Apps Script, edit the CSA-related write functions to short-circuit:
- `createCSAMember` / `updateCSAMember` / `customizeCSABox` / `scheduleVacationHold` / `cancelVacationHold` / `updateCSAMemberPreferences` / `saveCSAMemberPreference`
- Each function: log "DEPRECATED — write to Supabase" + return `{ success: false, error: 'CSA system has moved. Please use https://csa.tinyseedfarm.com' }`
- This prevents the OLD portal (still served from `app.tinyseedfarm.com/web_app/csa.html`) from accepting any new writes
- Read functions (getCSAMembers etc.) remain functional for admin tools that haven't been migrated

#### Step 2: Final data sync (5 min)

```bash
cd /Users/samanthapollack/Documents/TIny_Seed_OS
source scripts/migrate-csa/.venv/bin/activate
source .env.csa
python3 scripts/migrate-csa/sheets_to_supabase.py
# Verify counts match — should be very close to last run since dual-write window has been syncing
```

#### Step 3: Replace old CSA portal pages with redirect

Edit `web_app/csa.html` (the OLD member portal) — replace entire content with a redirect HTML that says "We've moved! → https://csa.tinyseedfarm.com" + auto-redirect via meta refresh + JS.

Edit `customer.html` similarly for the "My CSA Share" sub-section.

Push to main branch (the OLD GitHub Pages site at `app.tinyseedfarm.com`).

#### Step 4: Send announcement email (Todd + PM together draft)

Subject: "Your Tiny Seed Farm CSA portal has a new home"

Body (PM drafts, Todd reviews + sends from his email):

```
Hi [first_name],

We've upgraded your CSA member portal. It's faster, cleaner, and works better
on phones.

Your new home: https://csa.tinyseedfarm.com

Just like before, you'll log in with your email — we'll send you a one-time
sign-in link. Your membership, share details, vacation holds, and preferences
are all there.

A few things you can do right away:
  - Update your dietary preferences
  - Schedule a vacation hold
  - Customize your weekly box

If anything looks off or you have trouble logging in, just reply to this email
and I'll fix it personally.

Thanks for being part of Tiny Seed Farm!

— Todd
```

Sent via Resend (Day 10 system) to all `members.status = 'active'` for the current season. Expect 280-300 emails.

#### Step 5: Monitor (rolling 24-48 hours)

- Watch Sentry for new errors
- Watch `notification_log` for bounce/complaint spikes
- Watch `audit_log` for unexpected mutations
- Reply quickly to every email reply from members

### Apps Script kept alive — until WHEN

Per Todd's decision (locked 2026-05-08): **keep Apps Script CSA endpoints alive INDEFINITELY** until Todd confirms the new system is fully working in production. NOT a fixed 7-day window.

Realistic expectation: 14-30 days post-cutover. After that:
- Apps Script CSA write functions get DELETED
- Apps Script CSA read functions get the same redirect-deprecation treatment
- Old `csa.html` page in repo gets archived to `docs/archive/`

### Day 14 — Buffer

Whatever bugs surfaced, whatever members reported. Final polish. Final CHANGE_LOG entry that says "CSA migration COMPLETE."

If buffer day is uneventful: pre-spec the next phase (Recipe integration — Phase 4 differentiator from the dropped-AI-moat decision).

---

## Rollback plan

If catastrophic failure on Day 13 (e.g., RLS misconfiguration causing data leakage, magic link emails not sending, dashboard showing wrong member's data):

1. **Within 1 hour of detection:** revert the announcement (email "We're temporarily moving back to the old portal — sorry for the confusion")
2. **Restore old Apps Script writes** by reverting the deprecation patch to the write functions
3. **Restore the OLD `web_app/csa.html`** (uncomment / unrestrict)
4. **Members continue using the old portal** for the rest of the day
5. **Triage the issue** — what went wrong? RLS? Migration script? Data corruption?
6. **Fix in csa-migration branch + re-soft-launch** before another cutover attempt

The new portal CAN coexist with the old at `csa.tinyseedfarm.com` indefinitely while the old `app.tinyseedfarm.com/web_app/csa.html` is also live — there's no DNS conflict, just member confusion if both are advertised.

---

## Success criteria

The migration is "successful" when:
- 90%+ of active members have logged in to the new portal at least once within 14 days of cutover
- < 5% of members report a problem
- 0 data loss events
- Magic link delivery rate ≥ 98% (verified via Resend dashboard)
- Page load times < 2s p95 on mobile
- 0 RLS leak events in audit_log (members seeing other members' data)
- New Shopify CSA orders flow into Supabase reliably (no orphans in `audit_log`)

If any of those fall short, that's the Phase 2 work after migration "completion."
