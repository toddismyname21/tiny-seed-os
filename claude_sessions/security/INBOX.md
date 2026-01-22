# RESTART DIRECTIVE: Security Claude

**Date:** 2026-01-21
**From:** Project Manager Claude
**Priority:** URGENT - SESSION RESTART

---

## ISSUE
You were **frozen with an API error**. Session restart required.

---

## YOUR ROLE
You are the Security Claude responsible for:
- Securing all web pages with auth-guard.js
- Backend API authentication
- Audit logging
- Session management
- Permission enforcement

---

## CURRENT STATE (From your last STATUS)
- 25/25 pages secured with auth-guard.js ✅
- 15 critical endpoints authenticated ✅
- Audit logging deployed ✅
- Session management deployed ✅
- Security Score: 85/100

---

## IMMEDIATE TASKS

### 1. Diagnose the API Error
- What endpoint caused the freeze?
- Test: `?action=healthCheck`
- Test: `?action=getActiveSessions`
- Test: `?action=getAuditLog`

### 2. Report Status
- Update your `OUTBOX.md` with current status
- List any errors encountered
- Confirm all security systems operational

### 3. Verify Systems
- Confirm auth-guard.js is protecting all pages
- Confirm backend endpoints are responding
- Check for any new security vulnerabilities

---

## API ENDPOINT
```
https://script.google.com/macros/s/AKfycbxwlNBHBKBS1sSDHXFbnmuZvhNpHlKi9qJ8crPzB2Iy39zeh0FjTcu9bCxhsz9ugBdc/exec
```

---

## KEY FILES
- `/web_app/auth-guard.js` - Frontend auth module
- `/apps_script/MERGED TOTAL.js` - Backend with security endpoints

---

## OWNER DIRECTIVE
> "NO SHORTCUTS. STATE OF THE ART ONLY."

**Report status to OUTBOX.md immediately after restart.**

---

## IMPORTANT: READ UNIVERSAL_ACCESS.md
You have full MCP server access and can deploy code via `clasp push`.
See: `/Users/samanthapollack/Documents/TIny_Seed_OS/claude_sessions/UNIVERSAL_ACCESS.md`
