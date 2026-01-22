# CSA Import System - Critical Issues Report

**Date:** 2026-01-21
**Status:** BROKEN - Needs Architecture Fix
**Priority:** HIGH

---

## Summary

The CSA member import from Shopify is fundamentally broken. Multiple attempts to fix it have failed due to architectural issues with Google Apps Script.

---

## Root Causes

### 1. Google Apps Script 30-Second Timeout
- Web app calls timeout after 30 seconds
- BUT the server keeps running after timeout
- This causes "ghost processes" that continue adding data
- Result: Uncontrollable duplicate records

### 2. Duplicate Detection Was Flawed
- Original: Used `email + share_type` as unique key
- Problem: Customer lookup by email failed because each import created NEW customer records
- Fix attempted: Changed to `Shopify Order ID + Share Type`
- Status: Deployed but untested due to ongoing chaos

### 3. No True Idempotency
- Import function creates records without checking if they exist
- Running import multiple times = multiple records
- No way to safely re-run or retry

### 4. Batch Processing Causes Cascading Failures
- Large imports split into batches
- Each batch is a separate server execution
- Batches can overlap, race, create duplicates

---

## Current State

| Item | Status |
|------|--------|
| CSA_Members Sheet | Has duplicates, data unreliable |
| Customers Sheet | Has duplicates, column alignment was broken |
| Import Function | Deployed v286 with idempotent fix (untested) |
| Cleanup Functions | Exist but timeout on large datasets |

---

## What Was Tried

1. **Added LockService** - Prevents concurrent runs, but doesn't help with ghost processes from timeouts
2. **Added dedupe functions** - Work but timeout on large datasets
3. **Batch delete** - Times out, partial completion
4. **Changed unique key** - From email to Shopify Order ID (v286)

---

## What Needs to Happen

### Option A: Fix Within Apps Script (Complex)
1. Use time-based triggers instead of web calls for imports
2. Process in small batches with state tracking
3. Store progress in PropertiesService
4. Auto-resume on next trigger

### Option B: Move Import Logic Outside (Recommended)
1. Use MCP server or external script for imports
2. Direct Sheets API access (no 30-second limit)
3. Full control over execution
4. Can use proper database patterns

### Option C: Manual One-Time Fix
1. Manually clear both sheets in Google Sheets UI
2. Run single import from Apps Script editor (6-minute limit, not 30-second)
3. Don't use web API for imports going forward

---

## Immediate Action Required

**STOP** using the web API for CSA imports. The 30-second timeout makes it unreliable.

**INSTEAD:**
1. Open Apps Script editor directly
2. Run `fullCSAImportFromShopify({maxItems: 100})` from there (has 6-minute limit)
3. Or implement Option B (external import)

---

## Files Modified

- `apps_script/MERGED TOTAL.js` - Multiple fixes attempted:
  - `createCustomerFromShopify` - Header-based insertion
  - `fullCSAImportFromShopify` - Lock + idempotent key
  - `dedupeCSAMembers` - Cleanup function
  - `dedupeCustomers` - Cleanup function
  - `clearShopifyCustomers` - Batch delete

---

## Lesson Learned

**Google Apps Script web apps are NOT suitable for long-running data imports.** The 30-second timeout combined with server-side continuation creates unmanageable state.

Future imports should use:
- Apps Script time-based triggers (6-minute limit)
- External scripts with Sheets API
- Shopify webhooks for real-time sync (already set up but needs testing)
